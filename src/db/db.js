const { Pool } = require('pg');

const pool = new Pool({
  user: 'apostas',               // Usuário do banco
  host: 'localhost',             // Host (local)
  database: 'plataformaApostas',       // Nome do banco de dados
  password: '',       // Senha do usuário
  port: 5432,                    // Porta padrão do PostgreSQL
});

pool.on('connect', () => {
  console.log('Conectado ao PostgreSQL');
});

// Exportar o pool para ser usado em outras partes da aplicação
module.exports = pool;
