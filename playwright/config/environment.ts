const name = process.env.TEST_ENV ?? 'dev';
export const environment = {
  name,
  baseUrl: process.env.BASE_URL ?? 'http://127.0.0.1:3100',
  apiBaseUrl: process.env.API_BASE_URL ?? 'http://127.0.0.1:4000',
  userEmail: process.env.TEST_USER_EMAIL ?? 'admin@ptcl.com',
  userPassword: process.env.TEST_USER_PASSWORD ?? 'PTCLAdmin!2026',
};
