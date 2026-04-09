-- ============================================================
-- Report Platform — init script
-- Executed automatically by PostgreSQL on first container start
-- ============================================================

-- 1. report_runs — async report generation runs
CREATE TABLE IF NOT EXISTS report_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    format TEXT NOT NULL,
    params JSONB DEFAULT '{}',
    file_path TEXT,
    file_name TEXT,
    file_size BIGINT,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- 2. user_activity — sample data source for "User Activity" report
CREATE TABLE IF NOT EXISTS user_activity (
    id SERIAL PRIMARY KEY,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    page TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Seed: 200 user activity records spread across 30 days
-- ============================================================
INSERT INTO user_activity (user_name, action, page, duration_ms, created_at)
SELECT
    (ARRAY['Иванов А.С.', 'Петрова М.В.', 'Сидоров К.Н.', 'Козлова Е.А.', 'Морозов Д.И.'])
        [1 + floor(random() * 5)::int],
    (ARRAY['Просмотр страницы', 'Клик по кнопке', 'Отправка формы', 'Скачивание файла', 'Поиск', 'Авторизация', 'Выход'])
        [1 + floor(random() * 7)::int],
    (ARRAY['/dashboard', '/reports', '/settings', '/profile', '/users', '/analytics', '/help'])
        [1 + floor(random() * 7)::int],
    (100 + floor(random() * 5000))::int,
    now() - (floor(random() * 30) || ' days')::interval - (floor(random() * 24) || ' hours')::interval
FROM generate_series(1, 200);
