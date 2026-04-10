// db.js — подключение к PostgreSQL
// Pool — это "пул соединений": вместо того чтобы открывать новое соединение
// на каждый запрос, держим несколько готовых соединений и переиспользуем их.
const { Pool } = require('pg')

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

// Проверяем соединение при запуске
pool.connect((err, client, release) => {
  if (err) {
    console.error('Ошибка подключения к PostgreSQL:', err.message)
    process.exit(1)
  }
  release()
  console.log('PostgreSQL подключён успешно')
})

module.exports = pool
