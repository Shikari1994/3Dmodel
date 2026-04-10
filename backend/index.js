// index.js — точка входа бекенда
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')

const productRoutes = require('./routes/products')
const adminRoutes = require('./routes/admin')

const app = express()
const PORT = process.env.PORT || 3000

// --- CORS ---
// Разрешаем запросы только с нашего фронтенда (GitHub Pages)
// В разработке добавляем localhost
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Разрешаем запросы без origin (например, Postman или curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: origin ${origin} не разрешён`))
    }
  },
  credentials: true,
}))

// --- Парсинг JSON ---
app.use(express.json())

// --- Статическая отдача загруженных файлов ---
// Файлы из папки /uploads будут доступны по URL /uploads/filename
const uploadsDir = path.join(__dirname, '..', 'uploads')
app.use('/uploads', express.static(uploadsDir))

// --- Маршруты ---
app.use('/api/products', productRoutes)
app.use('/api/admin', adminRoutes)

// --- Проверочный маршрут ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// --- Запуск ---
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`)
})
