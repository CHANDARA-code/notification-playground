import type { SchemaModule } from '@model/loader';

let activeSchema: SchemaModule | null = null;

export function setSchema(module: SchemaModule) {
  activeSchema = module;
}

export function getSchema(): SchemaModule {
  if (!activeSchema) {
    throw new Error('Database schema has not been initialized.');
  }
  return activeSchema;
}

export function getDevicesTable() {
  return getSchema().devices;
}

export function getNotificationsTable() {
  return getSchema().notifications;
}

export function getPushConfigsTable() {
  return getSchema().pushConfigs;
}
