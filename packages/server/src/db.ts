import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { getServerEnv } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverEnv = getServerEnv();

/**
 * Get a database connection
 * @param readOnly - Whether to open the database in read-only mode
 * @returns Promise resolving to a Database instance
 */
export const getDbConnection = async (readOnly = true): Promise<Database> => {
  const dbPath = serverEnv.DB_PATH ?? path.join(__dirname, 'database.db');

  return open({
    filename: dbPath,
    driver: sqlite3.Database,
    mode: readOnly ? sqlite3.OPEN_READONLY : sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  });
};
