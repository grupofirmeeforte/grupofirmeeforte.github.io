import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function applyMigration() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    const sqlFile = path.join(process.cwd(), 'drizzle/0006_amazing_trish_tilby.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s);
    
    for (const statement of statements) {
      if (statement) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await connection.execute(statement);
      }
    }
    
    console.log('✅ Migration applied successfully!');
    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

applyMigration();
