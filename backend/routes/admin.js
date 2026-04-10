// admin.js — защищённые маршруты для управления товарами
const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const db = require('../db')
const requireAuth = require('../middleware/auth')

// --- Настройка multer (загрузка файлов) ---
// Файлы сохраняем в папку uploads/ рядом с backend/
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads')

// Создаём папку uploads если её нет
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    // Уникальное имя: timestamp + оригинальное имя
    const uniqueName = `${Date.now()}-${file.originalname}`
    cb(null, uniqueName)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // максимум 100 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.glb', '.jpg', '.jpeg', '.png', '.webp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error(`Формат файла не поддерживается: ${ext}`))
    }
  },
})

// --- Авторизация ---

// POST /api/admin/login — вход в админку
router.post('/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Введите логин и пароль' })
  }

  try {
    const result = await db.query(
      'SELECT id, username, password_hash FROM users WHERE username = $1',
      [username]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный логин или пароль' })
    }

    const user = result.rows[0]
    const passwordOk = await bcrypt.compare(password, user.password_hash)

    if (!passwordOk) {
      return res.status(401).json({ error: 'Неверный логин или пароль' })
    }

    // Создаём JWT-токен на 24 часа
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({ token })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// --- Управление товарами (требует авторизации) ---

// POST /api/admin/upload — загрузить файл (картинку или GLB)
router.post('/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не передан' })
  }
  // Возвращаем URL по которому файл будет доступен
  const fileUrl = `/uploads/${req.file.filename}`
  res.json({ url: fileUrl, filename: req.file.filename })
})

// POST /api/admin/products — создать товар
router.post('/products', requireAuth, async (req, res) => {
  const { name, description, image_url, model_url, model_config } = req.body

  if (!name || !model_url) {
    return res.status(400).json({ error: 'Название и модель обязательны' })
  }

  try {
    const result = await db.query(
      `INSERT INTO products (name, description, image_url, model_url, model_config)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description || '', image_url || null, model_url, model_config || null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// PUT /api/admin/products/:id — обновить товар
router.put('/products/:id', requireAuth, async (req, res) => {
  const { name, description, image_url, model_url, model_config } = req.body

  try {
    const result = await db.query(
      `UPDATE products
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           image_url = COALESCE($3, image_url),
           model_url = COALESCE($4, model_url),
           model_config = COALESCE($5, model_config)
       WHERE id = $6
       RETURNING *`,
      [name, description, image_url, model_url, model_config, req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// DELETE /api/admin/products/:id — удалить товар
router.delete('/products/:id', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM products WHERE id = $1 RETURNING id',
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' })
    }
    res.json({ message: 'Товар удалён', id: result.rows[0].id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// GET /api/admin/products — список всех товаров (с полными данными для редактирования)
router.get('/products', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM products ORDER BY created_at DESC'
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

module.exports = router
