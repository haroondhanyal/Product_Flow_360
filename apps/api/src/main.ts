import 'reflect-metadata';
import { Body, CanActivate, Controller, ExecutionContext, Get, HttpException, HttpStatus, Injectable, Module, Param, Post, Req, UseGuards } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import helmet from 'helmet';
import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { type LocalData, type Role, type StoredRecord, readLocalData, writeLocalData } from './local-store.js';

const ROLE_VALUES = ['Super Admin', 'Admin', 'Project Manager', 'Product Manager', 'QA Lead', 'QA Engineer', 'Developer', 'Viewer'] as const;
const ENTITY_VALUES = ['project', 'rfc', 'user-story', 'requirement', 'test-case', 'test-run', 'bug', 'document', 'comment', 'link'] as const;
type EntityType = typeof ENTITY_VALUES[number];
type Session = { sub: string; workspaceId: string; role: Role };
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(12).max(256) });
const entitySchema = z.object({ workspaceId: z.string().uuid(), projectId: z.string().uuid().nullable().optional(), title: z.string().trim().min(1).max(160), status: z.string().trim().min(1).max(80), payload: z.record(z.string(), z.unknown()).default({}) });

function assertEntity(value: string): EntityType {
  if (!ENTITY_VALUES.includes(value as EntityType)) throw new HttpException('Unsupported entity type.', HttpStatus.NOT_FOUND);
  return value as EntityType;
}
function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, hash] = stored.split('$');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;
  const derived = scryptSync(password, Buffer.from(salt, 'base64'), 64);
  const expected = Buffer.from(hash, 'base64');
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

@Injectable()
class DatabaseService {
  async read() { return readLocalData(); }
  async write(mutator: (data: LocalData) => void) { const data = await this.read(); mutator(data); await writeLocalData(data); return data; }
}

@Injectable()
class AuthService {
  constructor(private readonly database: DatabaseService, private readonly jwt: JwtService) {}
  async login(input: unknown) {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) throw new HttpException('Enter a valid email and password (minimum 12 characters).', HttpStatus.BAD_REQUEST);
    const data = await this.database.read();
    const user = data.users.find(candidate => candidate.active && candidate.email.toLowerCase() === parsed.data.email.toLowerCase());
    const member = user && data.memberships.find(candidate => candidate.userId === user.id);
    if (!user || !member || !verifyPassword(parsed.data.password, user.passwordHash)) throw new HttpException('Invalid credentials.', HttpStatus.UNAUTHORIZED);
    const payload: Session = { sub: user.id, workspaceId: member.workspaceId, role: member.role };
    return { accessToken: await this.jwt.signAsync(payload), tokenType: 'Bearer', expiresIn: '15m' };
  }
}

@Injectable()
class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: Session }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new HttpException('Bearer token required.', HttpStatus.UNAUTHORIZED);
    try { request.user = await this.jwt.verifyAsync<Session>(token); return true; }
    catch { throw new HttpException('Invalid or expired session.', HttpStatus.UNAUTHORIZED); }
  }
}

@Controller('health')
class HealthController {
  constructor(private readonly database: DatabaseService) {}
  @Get() async health() { await this.database.read(); return { status: 'ok', service: 'pf360-api', storage: 'local-file', at: new Date().toISOString() }; }
}

@Controller('auth')
class AuthController { constructor(private readonly auth: AuthService) {} @Post('login') login(@Body() body: unknown) { return this.auth.login(body); } }

@Controller('api')
@UseGuards(JwtGuard)
class EntityController {
  constructor(private readonly database: DatabaseService) {}
  @Get(':type') async list(@Param('type') type: string, @Req() request: { user: Session }) {
    const entityType = assertEntity(type);
    return (await this.database.read()).records.filter(record => record.workspaceId === request.user.workspaceId && record.entityType === entityType).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  @Post(':type') async create(@Param('type') type: string, @Body() body: unknown, @Req() request: { user: Session }) { return this.write(assertEntity(type), null, body, request.user); }
  @Post(':type/:id') async update(@Param('type') type: string, @Param('id') id: string, @Body() body: unknown, @Req() request: { user: Session }) { return this.write(assertEntity(type), id, body, request.user); }
  private async write(type: EntityType, id: string | null, body: unknown, user: Session) {
    if (user.role === 'Viewer') throw new HttpException('Viewer role is read-only.', HttpStatus.FORBIDDEN);
    const parsed = entitySchema.safeParse(body);
    if (!parsed.success) throw new HttpException(parsed.error.issues.map(issue => issue.message).join(' '), HttpStatus.BAD_REQUEST);
    if (parsed.data.workspaceId !== user.workspaceId) throw new HttpException('Workspace boundary violation.', HttpStatus.FORBIDDEN);
    let result: StoredRecord | undefined;
    await this.database.write(data => {
      const existing = id ? data.records.find(record => record.id === id && record.workspaceId === user.workspaceId && record.entityType === type) : undefined;
      if (id && !existing) throw new HttpException('Record not found.', HttpStatus.NOT_FOUND);
      const now = new Date().toISOString();
      result = existing ? { ...existing, projectId: parsed.data.projectId ?? null, title: parsed.data.title, status: parsed.data.status, payload: parsed.data.payload, updatedBy: user.sub, updatedAt: now } : { id: randomUUID(), workspaceId: user.workspaceId, projectId: parsed.data.projectId ?? null, entityType: type, title: parsed.data.title, status: parsed.data.status, payload: parsed.data.payload, createdBy: user.sub, updatedBy: user.sub, createdAt: now, updatedAt: now };
      if (existing) data.records[data.records.indexOf(existing)] = result; else data.records.push(result);
      data.audits.push({ id: randomUUID(), workspaceId: user.workspaceId, actorId: user.sub, entityId: result.id, action: existing ? 'updated' : 'created', before: existing?.payload ?? null, after: parsed.data, createdAt: now });
    });
    return { id: result!.id };
  }
}

@Module({ imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? 'not-valid-for-production', signOptions: { expiresIn: '15m' } })], controllers: [HealthController, AuthController, EntityController], providers: [DatabaseService, AuthService, JwtGuard] })
class AppModule {}

async function bootstrap() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET (at least 32 characters) is required.');
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({ origin: process.env.WEB_ORIGIN?.split(',') ?? false, credentials: true });
  await app.listen(Number(process.env.PORT ?? 4000), '0.0.0.0');
}
void bootstrap();
