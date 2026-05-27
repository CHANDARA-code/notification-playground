export type SchemaModule = { schema: any; devices: any; notifications: any; pushConfigs: any; topics: any; deviceTopics: any };

export function loadSchema(client: string): SchemaModule {
  const normalized = client.toLowerCase();

  if (normalized === 'postgres' || normalized === 'pgsql' || normalized === 'pg') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('./pg');
  }

  if (normalized === 'sqlite') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('./sqlite');
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('./sqlite');
}
