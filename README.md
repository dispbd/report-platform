# Report Platform

Платформа асинхронной генерации отчётов. Позволяет быстро добавлять новые отчёты, запускать их генерацию и скачивать результат.

## Быстрый старт

```bash
docker compose up --build
```

Одна команда. PostgreSQL автоматически создаст таблицы и заполнит демо-данными (200 записей активности пользователей) при первом запуске.

> **Примечание:** Если порт 5432 уже занят (другой PostgreSQL), остановите его или измените порт в `docker-compose.yml`.

Приложение будет доступно:
- **UI**: http://localhost:3000
- **API**: http://localhost:3001
- **Health check**: http://localhost:3001/api/health

Для полного сброса данных:
```bash
docker compose down -v   # удалит volume с данными
docker compose up --build
```

## Локальная разработка

### Требования
- Node.js 22+
- Docker (для PostgreSQL)

### Запуск БД
```bash
docker compose up postgres -d
```

### Сервер
```bash
cd server
cp .env.example .env
npm install
npx drizzle-kit push   # создать таблицы
npm run db:seed         # заполнить демо-данными
npm run dev             # запустить в dev-режиме
```

### Клиент
```bash
cd client
npm install
npm run dev
```

Клиент запустится на http://localhost:3000 с прокси API-запросов на :3001 (через Next.js rewrites).

## Стек технологий

| Компонент | Технология |
|-----------|-----------|
| Backend | Express.js 5, TypeScript |
| Database | PostgreSQL 17, Drizzle ORM |
| PDF generation | Puppeteer (headless Chrome) |
| XLSX generation | ExcelJS |
| Frontend | Next.js 15, React 19, TailwindCSS v4 |
| Infrastructure | Docker Compose |

## API

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/health` | Health check |
| GET | `/api/reports` | Список доступных отчётов |
| GET | `/api/reports/:id` | Информация об отчёте |
| POST | `/api/runs` | Запустить генерацию отчёта |
| GET | `/api/runs` | Список всех запусков |
| GET | `/api/runs/:id` | Статус запуска |
| GET | `/api/runs/:id/download` | Скачать результат |

### Пример: запуск генерации
```bash
curl -X POST http://localhost:3001/api/runs \
  -H "Content-Type: application/json" \
  -d '{"reportType": "weather-summary", "format": "xlsx", "params": {}}'
```
