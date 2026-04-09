# ARCHITECTURE.md

## Обзор

Report Platform — прототип платформы для асинхронной генерации отчётов. Архитектура спроектирована так, чтобы добавление нового отчёта занимало минимум усилий: реализовать один интерфейс, зарегистрировать — и он автоматически появляется в API и UI.

```
┌─────────────┐     HTTP     ┌──────────────────┐     SQL      ┌────────────┐
│   React UI  │ ◄──────────► │  Express API     │ ◄──────────► │ PostgreSQL │
│  (nginx)    │   /api/*     │  (Node.js)       │   Drizzle    │            │
└─────────────┘              │                  │              └────────────┘
                             │  ┌─────────────┐ │
                             │  │ Report      │ │  External APIs
                             │  │ Registry    │ │  (Open-Meteo, ...)
                             │  └──────┬──────┘ │
                             │         │        │
                             │  ┌──────▼──────┐ │
                             │  │ Report      │ │  File system
                             │  │ Runner      │──►  (temp/)
                             │  └─────────────┘ │
                             └──────────────────┘
```

## Компоненты

### Backend (`server/`)

| Модуль | Ответственность |
|--------|----------------|
| `config/` | Валидация env-переменных через Zod |
| `db/` | Подключение PostgreSQL, схема Drizzle ORM |
| `logger/` | Структурированное логирование (Pino) |
| `middleware/` | Обработка ошибок (AppError → JSON) |
| `reports/` | **Определения отчётов** — ядро системы |
| `services/` | Report Runner (async execution), File Manager |
| `routes/` | HTTP API endpoints |

### Frontend (`client/`)

| Модуль | Ответственность |
|--------|----------------|
| `api/` | HTTP-клиент к backend API |
| `components/` | UI-компоненты (Layout, ReportCard, StatusBadge) |
| `pages/` | Страницы: каталог отчётов, страница отчёта |
| `types/` | TypeScript-типы, зеркалирующие API |

## Ключевой паттерн: Report Definition

Каждый отчёт — это объект, реализующий интерфейс `ReportDefinition`:

```typescript
interface ReportDefinition {
  id: string                          // уникальный ключ
  name: string                        // название для UI
  description: string                 // описание
  supportedFormats: OutputFormat[]     // ['xlsx'], ['pdf'], ['xlsx', 'pdf']
  parameters: ParameterDefinition[]   // параметры для формы
  generate(params, format): Promise<GenerationResult>  // генерация файла
}
```

Реестр отчётов (`reports/index.ts`) собирает все определения — API и UI получают список автоматически.

## Потоки данных

### Генерация отчёта (асинхронная)

```
1. UI → POST /api/runs {reportType, format, params}
2. Server:
   a. Создаёт запись в report_runs (status: pending)
   b. Возвращает 202 Accepted с ID запуска
   c. В фоне: status → running → генерация → completed/failed
3. UI:
   a. Получает ID, показывает статус "В очереди"
   b. Опрашивает GET /api/runs/:id каждые 2 сек
   c. Когда completed — показывает ссылку на скачивание
4. Скачивание: GET /api/runs/:id/download → файл
```

### Два реализованных отчёта

| Отчёт | Источник данных | Формат | Инструмент |
|-------|----------------|--------|-----------|
| Сводка погоды | Open-Meteo API (внешний) | XLSX | ExcelJS |
| Активность пользователей | PostgreSQL (внутренняя БД) | PDF | Puppeteer |

Они демонстрируют:
- **Разные источники**: внешний API vs. локальная БД
- **Разные форматы**: XLSX vs. PDF
- **Единый интерфейс**: оба реализуют `ReportDefinition`

## Как добавить новый отчёт

### Пошаговая инструкция

**1. Создать файл отчёта**

```bash
# server/src/reports/my-new-report.ts
```

**2. Реализовать ReportDefinition**

```typescript
import type { ReportDefinition } from './base.js'
import type { GenerationResult } from '../types/index.js'

export const myNewReport: ReportDefinition = {
  id: 'my-new-report',
  name: 'Мой новый отчёт',
  description: 'Описание для каталога',
  supportedFormats: ['xlsx'],
  parameters: [
    { name: 'dateFrom', label: 'Дата начала', type: 'date', required: true },
  ],

  async generate(params, format): Promise<GenerationResult> {
    // 1. Получить данные (БД, API, файл, ...)
    // 2. Сформировать файл (ExcelJS, Puppeteer, ...)
    // 3. Вернуть путь к файлу
    return { filePath, fileName, mimeType, fileSize }
  },
}
```

**3. Зарегистрировать в реестре**

```typescript
// server/src/reports/index.ts
import { myNewReport } from './my-new-report.js'

const REPORTS: ReportDefinition[] = [
  weatherReport,
  userActivityReport,
  myNewReport,  // ← добавить сюда
]
```

**4. Готово.** Отчёт автоматически появится:
- В API: `GET /api/reports`
- В UI: на главной странице
- Форма параметров сгенерируется по `parameters`

**Время добавления**: ~30 мин для простого отчёта, ~2-3 часа для сложного с инфографикой.

## Принятые решения и альтернативы

### 1. Асинхронная генерация через fire-and-forget + polling

**Выбрано**: Запись в БД (status: pending) → фоновое выполнение в том же процессе → клиент опрашивает статус.

**Альтернативы**:
- **Очередь сообщений (BullMQ/Redis, RabbitMQ)**: Надёжнее для продакшена, но оверхед для прототипа — добавляет Redis/RabbitMQ в инфраструктуру.
- **WebSocket / SSE**: Real-time уведомления вместо polling. Сложнее инфраструктурно, но приятнее для UX. Для прототипа polling на 2 сек достаточен.
- **Синхронная генерация**: Проще, но блокирует запрос. Неприемлемо при генерации PDF (5-30 сек).

**Почему так**: Минимальная сложность при сохранении асинхронности. Для продакшена — заменить на BullMQ + Redis.

### 2. Report Registry (паттерн реестра)

**Выбрано**: Статический массив в `reports/index.ts`, каждый отчёт — объект с `ReportDefinition`.

**Альтернативы**:
- **Автодискавери через файловую систему**: `fs.readdir('reports/')` + динамический `import()`. Красиво, но хрупко — ломает tree shaking, сложнее дебажить.
- **Конфигурация в БД**: Гибче (CRUD отчётов без деплоя), но усложняет бизнес-логику и тестирование.
- **Plugin system**: Каждый отчёт — npm-пакет. Максимальная изоляция, но оверхед для команды.

**Почему так**: Явная регистрация — TypeScript-safe, легко читается, IDE подсказывает. Добавление = 1 импорт + 1 строка в массив.

### 3. Express.js 5 + Drizzle ORM

**Выбрано**: Express 5 (последняя стабильная), Drizzle ORM (type-safe SQL).

**Альтернативы**:
- **Fastify**: Быстрее, схема-first валидация. Но Express знаком всем в команде, а для I/O-задач генерации разница в скорости не критична.
- **NestJS**: Полноценный фреймворк с DI. Оверхед для прототипа — слишком много boilerplate.
- **Prisma ORM**: Популярнее, но тяжелее (генерируемый клиент). Drizzle ближе к SQL, легче для простых запросов.

### 4. React + Vite вместо SvelteKit

**Выбрано**: React 19 + Vite + React Router.

**Альтернативы**:
- **SvelteKit**: Используется в основном проекте (OfferHub). Но задание требует показать более широкий стек.
- **Next.js**: Мощный, но SSR не нужен для внутреннего инструмента. Лишняя сложность.
- **Vue.js**: Хорошая альтернатива, но React шире распространён — проще нанимать.

### 5. PDF через Puppeteer, XLSX через ExcelJS

**Выбрано**: Puppeteer для PDF (HTML→PDF), ExcelJS для XLSX.

**Альтернативы**:
- **PDF**: jsPDF (клиентская), PDFKit (programmatic). Puppeteer тяжелее, но позволяет использовать HTML+CSS для вёрстки — быстрее для дизайнеров и разработчиков.
- **XLSX**: SheetJS (xlsx). ExcelJS поддерживает стилизацию, формулы и стриминг — более полноценен.

## Что не сделано и почему

### Не реализовано (заглушки и TODO для продакшена)

| Компонент | Что нужно | Почему не сделано |
|-----------|-----------|------------------|
| **Аутентификация** | JWT/OAuth2, middleware авторизации | Прототип — нет пользователей. Заготовка: `middleware/auth.ts` из OfferHub |
| **Очередь задач** | BullMQ + Redis для надёжной обработки | Для прототипа fire-and-forget достаточно. Заменить `reportRunner.ts` |
| **WebSocket/SSE** | Real-time обновление статуса вместо polling | Polling каждые 2 сек приемлем. Для 100+ юзеров — переход на SSE |
| **Ретраи при ошибках** | Exponential backoff для API-отчётов | Добавить в ReportRunner при внедрении очереди |
| **Rate limiting** | express-rate-limit для защиты от спама | Нет для прототипа, обязательно для продакшена |
| **Тесты** | Unit (vitest), E2E (playwright) | Структура подготовлена, но не реализовано для экономии времени |
| **Мониторинг** | Prometheus метрики, Grafana дашборды | Pino-логи достаточны для прототипа |
| **S3/MinIO для файлов** | Хранение отчётов в объектном хранилище | Локальный `./temp` с cleanup-ом для прототипа |
| **Пагинация** | Cursor/offset пагинация для списка запусков | Подходит при росте до 1000+ запусков |
| **i18n** | Многоязычный интерфейс | В OfferHub есть i18next — паттерн перенос за 1 час |
| **Права доступа** | RBAC: кто может запускать какие отчёты | Нужно когда будут разные роли пользователей |

### Что бы добавил для продакшена (приоритезировано)

1. **Очередь задач (BullMQ + Redis)** — критично при множестве пользователей
2. **Аутентификация (JWT + refresh tokens)** — обязательно
3. **S3 для хранения файлов** — масштабируемость и persistence
4. **Rate limiting + request validation** — безопасность
5. **SSE для статусов** — UX
6. **Тесты (unit + integration + e2e)** — качество
7. **CI/CD pipeline** — автоматизация деплоя
8. **Observability (метрики + трейсинг)** — операционная прозрачность
