import { migrate } from 'drizzle-orm/mysql2/migrator';
import { getDb } from './server/_core/db.mjs';

async function runMigration() {
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to database');
    process.exit(1);
  }

  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migration completed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
