-- setup-db.sql — создание таблиц в базе данных
-- Запускать ОДИН РАЗ на сервере командой:
-- psql -U site3d_user -d site3d_db -f setup-db.sql

-- Таблица пользователей (только для входа в админку)
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Таблица товаров / продуктов
CREATE TABLE IF NOT EXISTS products (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  description  TEXT DEFAULT '',
  image_url    VARCHAR(500),          -- путь к картинке: /uploads/filename.jpg
  model_url    VARCHAR(500) NOT NULL, -- путь к GLB: /uploads/filename.glb
  model_config JSONB,                 -- настройки 3D модели: explodeConfig, parts, cameras
  created_at   TIMESTAMP DEFAULT NOW()
);

-- Пример того что хранится в model_config:
-- {
--   "explodeConfig": { "explodeStyle": "plate", "spreadRatio": 0.01 },
--   "parts": { "MeshName": { "title": "...", "description": "...", "specs": [] } },
--   "initialCamera": { "direction": [0.9, 0.4, 0], "distance": 4.5 },
--   "explodedCamera": { "direction": [1, 0, 0], "distance": 3.1 }
-- }

-- Индекс для быстрой сортировки по дате
CREATE INDEX IF NOT EXISTS products_created_at_idx ON products (created_at DESC);
