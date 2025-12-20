import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Run database migrations.
 * This should be called on app startup to ensure the database schema is up to date.
 */
export function runMigrations() {
  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'readrepeat.db');
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite);

  // Run migrations from the migrations folder
  const migrationsFolder = path.join(process.cwd(), 'src/lib/db/migrations');

  console.log('Running database migrations...');
  migrate(db, { migrationsFolder });
  console.log('Migrations complete.');

  sqlite.close();
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}
