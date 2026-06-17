import mysql from 'mysql2/promise';

async function checkAgents() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const [rows] = await connection.execute('SELECT id, chaveJ, senha, nomeAgente, dataNascimento FROM agentes LIMIT 5');
    console.log('Agentes no banco:');
    rows.forEach(row => {
      console.log(`- ChaveJ: ${row.chaveJ}, Senha: ${row.senha}, Nome: ${row.nomeAgente}, Data Nasc: ${row.dataNascimento}`);
    });
    await connection.end();
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

checkAgents();
