// auth.js — middleware для проверки JWT-токена
// Middleware — это функция, которая запускается ПЕРЕД обработчиком маршрута.
// Если токен неверный — отвечаем 401 и дальше не идём.
// Если токен верный — сохраняем данные пользователя в req.user и идём дальше.
const jwt = require('jsonwebtoken')

function requireAuth(req, res, next) {
  // Токен передаётся в заголовке: Authorization: Bearer <token>
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Токен не передан' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Токен недействителен или истёк' })
  }
}

module.exports = requireAuth
