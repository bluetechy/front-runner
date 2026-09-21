// Deliberately independent of the repository .env and developer credentials.
Object.assign(process.env, {
  NODE_ENV: 'test', API_PORT: '3000',
  POSTGRES_ADDRESS: '127.0.0.1', POSTGRES_PORT: '5432',
  POSTGRES_DATABASE: 'api_test', POSTGRES_USER: 'api_test', POSTGRES_PASSWORD: 'test-only',
  POSTGRES_POOL_SIZE: '2', POSTGRES_STATEMENT_TIMEOUT_MS: '1000',
  JWT_SECRET_KEY: 'test-only-secret-with-at-least-32-characters',
  HYDRA_BASE_URL: 'https://identity.example.test', HYDRA_NAMESPACE: 'test-employees',
  CORS_ORIGINS: '',
});
