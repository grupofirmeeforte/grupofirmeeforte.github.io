import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL não configurada');
  process.exit(1);
}

async function runMigration() {
  let connection;
  try {
    connection = await mysql.createConnection(DATABASE_URL);
    
    console.log('Executando migração: Adicionar coluna isDuplicate...');
    
    // SQL de migração
    const sql = `
      ALTER TABLE \`consignados\` ADD COLUMN \`isDuplicate\` boolean NOT NULL DEFAULT false;
      CREATE INDEX \`idx_consignados_nrOperacao\` ON \`consignados\` (\`nrOperacao\`);
    `;
    
    // Executar cada comando separadamente
    await connection.execute('ALTER TABLE `consignados` ADD COLUMN `isDuplicate` boolean NOT NULL DEFAULT false');
    console.log('✅ Coluna isDuplicate adicionada');
    
    await connection.execute('CREATE INDEX `idx_consignados_nrOperacao` ON `consignados` (`nrOperacao`)');
    console.log('✅ Índice criado');
    
    console.log('✅ Migração concluída com sucesso!');
    
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️ Coluna isDuplicate já existe');
    } else if (error.code === 'ER_DUP_KEYNAME') {
      console.log('⚠️ Índice já existe');
    } else {
      console.error('❌ Erro na migração:', error.message);
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
