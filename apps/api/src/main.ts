import 'reflect-metadata';
import { Body, CanActivate, Controller, ExecutionContext, Get, HttpException, HttpStatus, Injectable, Module, Param, Post, Req, UseGuards } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import helmet from 'helmet';
import { Pool } from 'pg';
import { scryptSync, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const ROLE_VALUES = ['Super Admin', 'Admin', 'Project Manager', 'Product Manager', 'QA Lead', 'QA Engineer', 'Developer', 'Viewer'] as const;
const ENTITY_VALUES = ['project', 'rfc', 'user-story', 'requirement', 'test-case', 'test-run', 'bug', 'document', 'comment', 'link'] as const;
type Role = typeof ROLE_VALUES[number];
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
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });
  query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, values: unknown[] = []) { return this.pool.query<T>(sql, values); }
}

@Injectable()
class AuthService {
  constructor(private readonly database: DatabaseService, private readonly jwt: JwtService) {}
  async login(input: unknown) {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) throw new HttpException('Enter a valid email and password (minimum 12 characters).', HttpStatus.BAD_REQUEST);
    const result = await this.database.query<{id:string; password_hash:string; workspace_id:string; role:Role}>('select u.id, u.password_hash, m.workspace_id, m.role from app_user u join workspace_member m on m.user_id = u.id where lower(u.email) = lower($1) and u.active = true limit 1', [parsed.data.email]);
    const user = result.rows[0];
    if (!user || !verifyPassword(parsed.data.password, user.password_hash) || !ROLE_VALUES.includes(user.role)) throw new HttpException('Invalid credentials.', HttpStatus.UNAUTHORIZED);
    const payload: Session = { sub: user.id, workspaceId: user.workspace_id, role: user.role };
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
  @Get() async health() { await this.database.query('select 1'); return { status: 'ok', service: 'pf360-api', at: new Date().toISOString() }; }
}

@Controller('auth')
class AuthController { constructor(private readonly auth: AuthService) {} @Post('login') login(@Body() body: unknown) { return this.auth.login(body); } }

@Controller('api')
@UseGuards(JwtGuard)
class EntityController {
  constructor(private readonly database: DatabaseService) {}
  @Get(':type') async list(@Param('type') type: string, @Req() request: { user: Session }) {
    const entityType = assertEntity(type);
    const result = await this.database.query('select id, workspace_id as "workspaceId", project_id as "projectId", entity_type as "entityType", title, status, payload, created_at as "createdAt", updated_at as "updatedAt" from entity_record where workspace_id=$1 and entity_type=$2 order by updated_at desc', [request.user.workspaceId, entityType]);
    return result.rows;
  }
  @Post(':type') async create(@Param('type') type: string, @Body() body: unknown, @Req() request: { user: Session }) { return this.write(assertEntity(type), null, body, request.user); }
  @Post(':type/:id') async update(@Param('type') type: string, @Param('id') id: string, @Body() body: unknown, @Req() request: { user: Session }) { return this.write(assertEntity(type), id, body, request.user); }
  private async write(type: EntityType, id: string | null, body: unknown, user: Session) {
    if (user.role === 'Viewer') throw new HttpException('Viewer role is read-only.', HttpStatus.FORBIDDEN);
    const parsed = entitySchema.safeParse(body);
    if (!parsed.success) throw new HttpException(parsed.error.issues.map(issue => issue.message).join(' '), HttpStatus.BAD_REQUEST);
    if (parsed.data.workspaceId !== user.workspaceId) throw new HttpException('Workspace boundary violation.', HttpStatus.FORBIDDEN);
    const existing = id ? await this.database.query<{id:string; payload:unknown}>('select id,payload from entity_record where id=$1 and workspace_id=$2 and entity_type=$3', [id, user.workspaceId, type]) : undefined;
    if (id && !existing?.rows[0]) throw new HttpException('Record not found.', HttpStatus.NOT_FOUND);
    const result = id
      ? await this.database.query<{id:string}>('update entity_record set project_id=$1,title=$2,status=$3,payload=$4::jsonb,updated_by=$5,updated_at=now() where id=$6 returning id', [parsed.data.projectId ?? null, parsed.data.title, parsed.data.status, JSON.stringify(parsed.data.payload), user.sub, id])
      : await this.database.query<{id:string}>('insert into entity_record(workspace_id,project_id,entity_type,title,status,payload,created_by,updated_by) values($1,$2,$3,$4,$5,$6::jsonb,$7,$7) returning id', [user.workspaceId, parsed.data.projectId ?? null, type, parsed.data.title, parsed.data.status, JSON.stringify(parsed.data.payload), user.sub]);
    const recordId = result.rows[0].id;
    await this.database.query('insert into audit_event(workspace_id,actor_id,entity_id,action,before,after) values($1,$2,$3,$4,$5::jsonb,$6::jsonb)', [user.workspaceId, user.sub, recordId, id ? 'updated' : 'created', JSON.stringify(existing?.rows[0]?.payload ?? null), JSON.stringify(parsed.data)]);
    return { id: recordId };
  }
}

@Module({ imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? 'not-valid-for-production', signOptions: { expiresIn: '15m' } })], controllers: [HealthController, AuthController, EntityController], providers: [DatabaseService, AuthService, JwtGuard] })
class AppModule {}

async function bootstrap() {
  if (!process.env.DATABASE_URL || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('DATABASE_URL and JWT_SECRET (at least 32 characters) are required.');
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({ origin: process.env.WEB_ORIGIN?.split(',') ?? false, credentials: true });
  await app.listen(Number(process.env.PORT ?? 4000), '0.0.0.0');
}
void bootstrap();
