import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'node:path';
import { ALL_ENTITIES } from './entities';

export function buildDataSourceOptions(database?: string): DataSourceOptions {
  return {
    type: 'better-sqlite3',
    database: database ?? process.env.DB_PATH ?? path.resolve(process.cwd(), 'data/app.sqlite'),
    entities: ALL_ENTITIES,
    synchronize: true,
    logging: ['error', 'warn'],
    prepareDatabase: (db) => {
      db.pragma('journal_mode = WAL');
      db.pragma('synchronous = NORMAL');
      db.pragma('foreign_keys = ON');
    },
  };
}

export const AppDataSource = new DataSource(buildDataSourceOptions());
