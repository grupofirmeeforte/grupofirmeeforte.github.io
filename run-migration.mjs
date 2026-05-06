import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema.ts";

const DATABASE_URL = process.env.DATABASE_URL;

async function runMigration() {
  try {
    const connection = await mysql.createConnection(DATABASE_URL);
    const db = drizzle(connection, { schema });
    
    // Execute the migration
    const sql = `ALTER TABLE \`agentes\` MODIFY COLUMN \`dataNascimento\` varchar(10);`;
    await connection.execute(sql);
    
    console.log("✅ Migration applied successfully");
    await connection.end();
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

runMigration();
