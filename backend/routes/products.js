// products.js — публичные маршруты для товаров (без авторизации)
const express = require('express')
const router = express.Router()
const db = require('../db')

// GET /api/products — список всех товаров
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, description, image_url, model_url, model_config FROM products ORDER BY created_at DESC'
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// GET /api/products/:id — один товар по id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, description, image_url, model_url, model_config FROM products WHERE id = $1',
      [req.params.id]
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

module.exports = router
