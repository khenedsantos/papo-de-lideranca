type EnvInput = Record<string, unknown>;

function assertString(value: unknown, key: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Environment variable ${key} is required.`);
  }

  return value;
}

export function validateEnv(config: EnvInput): EnvInput {
  const validated = {
    PORT: Number(config.PORT ?? 3000),
    DATABASE_URL: assertString(config.DATABASE_URL, 'DATABASE_URL'),
    JWT_SECRET: assertString(config.JWT_SECRET, 'JWT_SECRET'),
    JWT_EXPIRES_IN: assertString(config.JWT_EXPIRES_IN, 'JWT_EXPIRES_IN'),
    POSTGRES_DB: assertString(config.POSTGRES_DB ?? 'papo_de_lideranca', 'POSTGRES_DB'),
    POSTGRES_USER: assertString(config.POSTGRES_USER ?? 'postgres', 'POSTGRES_USER'),
    POSTGRES_PASSWORD: assertString(
      config.POSTGRES_PASSWORD ?? 'postgres',
      'POSTGRES_PASSWORD',
    ),
  };

  if (Number.isNaN(validated.PORT) || validated.PORT <= 0) {
    throw new Error('Environment variable PORT must be a positive number.');
  }

  return {
    ...config,
    ...validated,
  };
}

