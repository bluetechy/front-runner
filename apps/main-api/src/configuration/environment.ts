export function validateEnvironment(env: Record<string, unknown>) {
  const required = (name: string): string => {
    const value = env[name];
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
    return value;
  };
  const integer = (name: string, fallback: number, max: number) => {
    const value = Number(env[name] ?? fallback);
    if (!Number.isInteger(value) || value < 1 || value > max) throw new Error(`${name} is invalid`);
    return value;
  };
  const secret = required('JWT_SECRET_KEY');
  if (env.NODE_ENV === 'production' && secret.length < 32) throw new Error('JWT_SECRET_KEY must contain at least 32 characters');
  const hydraBase = env.HYDRA_BASE_URL;
  if (hydraBase) {
    const url = new URL(String(hydraBase));
    if (url.protocol !== 'https:') throw new Error('HYDRA_BASE_URL must use HTTPS');
    required('HYDRA_NAMESPACE');
  }
  return {
    ...env,
    NODE_ENV: env.NODE_ENV ?? 'development',
    API_PORT: integer('API_PORT', 3000, 65535),
    POSTGRES_PORT: integer('POSTGRES_PORT', 5432, 65535),
    POSTGRES_ADDRESS: required('POSTGRES_ADDRESS'),
    POSTGRES_DATABASE: required('POSTGRES_DATABASE'),
    POSTGRES_USER: required('POSTGRES_USER'),
    POSTGRES_PASSWORD: required('POSTGRES_PASSWORD'),
    POSTGRES_POOL_SIZE: integer('POSTGRES_POOL_SIZE', 10, 100),
    POSTGRES_STATEMENT_TIMEOUT_MS: integer('POSTGRES_STATEMENT_TIMEOUT_MS', 10000, 120000),
    JWT_SECRET_KEY: secret,
    CORS_ORIGINS: String(env.CORS_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean),
  };
}
