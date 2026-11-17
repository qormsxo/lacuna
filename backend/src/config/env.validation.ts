function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function requirePort(name: string): number {
  const raw = requireEnv(name);
  const port = Number(raw);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid port for ${name}: ${raw}`);
  }

  return port;
}

export function validateEnv(): void {
  requireEnv('NODE_ENV');
  requirePort('API_PORT');
  requireEnv('API_PREFIX');
  requireEnv('API_VERSION');
  requireEnv('CORS_ORIGIN');
  requireEnv('POSTGRES_HOST');
  requirePort('POSTGRES_PORT');
  requireEnv('POSTGRES_USER');
  requireEnv('POSTGRES_PASSWORD');
  requireEnv('POSTGRES_DB');
  requireEnv('TYPEORM_SYNCHRONIZE');
  requireEnv('TYPEORM_LOGGING');
}
