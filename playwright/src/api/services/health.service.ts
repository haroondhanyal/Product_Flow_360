import { BaseApiClient } from '../clients/base-api-client';
export class HealthService extends BaseApiClient { health() { return this.get('/health'); } }
