// create-admin.js — скрипт для создания администратора
// Запускать ОДИН РАЗ: node create-admin.js
// После создания этот файл можно удалить с сервера
require('dotenv').config()
const bcrypt = require('bcryptjs')
const db = require('./db')

// Задай свои логин и пароль здесь:
const USERNAME = 'admin'
const PASSWORD = 'your_strong_password' // ЗАМЕНИ на свой пароль!

async function createAdmin() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10)

  try {
    await db.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO UPDATE SET password_hash = $2',
      [USERNAME, passwordHash]
    )
    console.log(`Администратор "${USERNAME}" создан успешно`)
  } catch (err) {
    console.error('Ошибка:', err.message)
  }

  process.exit(0)
}

createAdmin()
