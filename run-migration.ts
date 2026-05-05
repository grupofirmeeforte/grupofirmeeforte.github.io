import { getDb } from './server/db';
import { sql } from 'drizzle-orm';

async function runMigration() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  try {
    // Adicionar coluna tokenSessao se não existir
    await db.execute(sql`ALTER TABLE sessoes ADD COLUMN tokenSessao VARCHAR(255) UNIQUE`);
    console.log('✓ Coluna tokenSessao adicionada');
  } catch (e: any) {
    if (e.message.includes('Duplicate column')) {
      console.log('✓ Coluna tokenSessao já existe');
    } else {
      console.error('✗ Erro:', e.message);
    }
  }
}

runMigration();
