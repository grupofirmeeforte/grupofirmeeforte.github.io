import { drizzle } from "drizzle-orm/mysql2/promise";
import mysql from "mysql2/promise";
import fs from "fs";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "grupo_firme_forte",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const db = drizzle(pool);

const sql = fs.readFileSync("drizzle/0007_optimal_meteorite.sql", "utf-8");
const statements = sql.split("-->").map(s => s.trim()).filter(s => s && !s.startsWith("statement-breakpoint"));

(async () => {
  try {
    for (const statement of statements) {
      console.log("Executando:", statement.substring(0, 50) + "...");
      await pool.query(statement);
    }
    console.log("✅ Migração aplicada com sucesso!");
  } catch (error) {
    console.error("❌ Erro:", error.message);
  }
  process.exit(0);
})();
