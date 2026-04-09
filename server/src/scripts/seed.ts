import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { userActivity } from '../db/schema.js'

// ============================================================
// Seed script — fills user_activity with demo data
// Usage: npx tsx src/scripts/seed.ts
// ============================================================

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const client = postgres(DATABASE_URL)
const db = drizzle(client)

const users = ['Иванов А.С.', 'Петрова М.В.', 'Сидоров К.Н.', 'Козлова Е.А.', 'Морозов Д.И.']
const actions = [
  'Просмотр страницы',
  'Клик по кнопке',
  'Отправка формы',
  'Скачивание файла',
  'Поиск',
  'Авторизация',
  'Выход',
]
const pages = ['/dashboard', '/reports', '/settings', '/profile', '/users', '/analytics', '/help']

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function seed() {
  console.log('🌱 Seeding user_activity...')

  const rows = []
  const now = Date.now()

  for (let i = 0; i < 200; i++) {
    // Spread across last 30 days
    const daysAgo = Math.floor(Math.random() * 30)
    const hoursAgo = Math.floor(Math.random() * 24)
    const createdAt = new Date(now - daysAgo * 86400000 - hoursAgo * 3600000)

    rows.push({
      userName: randomItem(users),
      action: randomItem(actions),
      page: randomItem(pages),
      durationMs: Math.floor(Math.random() * 5000) + 100,
      createdAt,
    })
  }

  await db.insert(userActivity).values(rows)
  console.log(`✅ Inserted ${rows.length} activity records`)

  await client.end()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
