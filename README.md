# Keep Coin 💰

Мультипользовательское PWA по учёту личных и семейных финансов.

**Стек:** React + Vite + Tailwind CSS | Flask (REST API) + Flask-SQLAlchemy + JWT.

## Реализовано сейчас

- Регистрация / авторизация / logout (JWT: access + refresh в httpOnly-cookies)
- Восстановление сессии, автообновление access-токена при 401
- Мультиязычность **ru / en** (i18next, переключатель в интерфейсе)
- Главный экран: приветствие, **карусель счетов**, виджет последних операций (со скелетонами/прелоадерами)
- **FAB** с долгим/коротким нажатием и выпадающим меню «Доход / Расход / Перевод»
- **Летающая скруглённая нижняя навигация** + настройки профиля по клику на имя в шапке
- PWA: манифест + Service Worker (Workbox), установка на устройство
- Тесты backend (pytest), валидация форм с переводимыми кодами ошибок

## Дизайн-система

- **Tailwind CSS** стилизует всё; тема вынесена в `tailwind.config.js` (цвета `brand`, `ink`; тени; анимации)
- **Модульность**: UI-компоненты отдельно (`src/components/ui`), фичи по папкам (`src/features/auth|dashboard`), layout отдельно. Новые фичи добавляются модулем, без нагромождения кода
- **Анимации и состояния**: fade/slide при переходах, прелоадеры (`Spinner`), скелетоны (`Skeleton`), toast-уведомления, микро-анимация нажатий
- Интерфейс mobile-first (ширина контейнера ~480px, UX как у нативного приложения)

## Запуск

### Backend (порт 5000)

```bash
cd backend
python -m venv .venv                          # один раз
.venv\Scripts\activate                        # Windows
pip install -r requirements-dev.txt
flask db upgrade                              # создать таблицы
flask run
```

### Frontend (порт 5173, проксирует /api → backend)

```bash
cd frontend
npm install
npm run dev
```

Открыть **http://localhost:5173**.

### Продакшн-сборка фронта

```bash
cd frontend
npm run build        # -> dist/ с PWA (sw.js, manifest)
```

### Тесты backend

```bash
cd backend
.venv\Scripts\python -m pytest tests -q
```

### Docker + CloudPub (бесплатный домен, автоматически)

Поднимает backend + frontend (Vite dev) и публикует приложение через CloudPub:
агент сам регистрирует ресурс, выдаёт поддомен `https://<random>.cloudpub.ru`
с бесплатным SSL и сохраняет адрес в volume (при перезапуске URL тот же).

```bash
# 1. Токен CloudPub (из личного кабинета) и SECRET_KEY
cp .env.example .env

# 2. Сборка и запуск
docker compose up -d --build

# 3. Получить выданный URL
docker compose logs -f cloudpub
```

Как это устроено:

- Туннелируется только `frontend:5173` (Vite dev). `/api/*` проксируется Vite
  на `backend:5000` внутри сети compose (`VITE_PROXY_TARGET`), поэтому JWT-куки
  остаются same-origin и CORS не нужен.
- `allowedHosts: true` в `vite.config.ts` — Vite не блокирует запросы с Host
  произвольного поддомена `*.cloudpub.ru`.
- Backend запускается gunicorn'ом (`--reload`), применяет миграции `flask db upgrade`
  на старте, БД — sqlite в volume `keep_coin_db`.
- CloudPub: `TOKEN` + `HTTP=frontend:5173`, `command: run`. На Windows/macOS
  (где `--net=host` не работает) агент ходит на сервис по имени контейнера.

## Структура

```
backend/
  app/
    config.py            # конфиги (sqlite для dev, прокурат на postgres)
    extensions.py        # db, migrate, jwt
    http_auth.py         # куки-токены, user_lookup
    models/              # SQLAlchemy-модели
    resources/           # Flask-blueprints (REST-маршруты)
    schemas/             # marshmallow-валидация (коды ошибок, не текст)
    services/            # бизнес-логика
  tests/                 # pytest
frontend/
  src/
    app/                 # провайдеры, роутер (protected/guest routes)
    components/ui/       # Button, Input, Card, Skeleton, Spinner, Toast
    components/layout/   # AuthLayout, AppShell, BottomNav, FloatingAction
    components/lang/     # LanguageToggle
    features/
      auth/              # авторизация: api, store, страницы, ошибки
      dashboard/         # главный экран: api, карусель счетов, операции
      profile/           # настройки профиля (имя, язык, выход)
    i18n/                # ru.ts / en.ts
    lib/                 # api-клиент (refresh), cn, ...
```

## Ближайшие шаги (первая итерация списка)

1. Финансы: счета (CRUD), категории, транзакции/переводы (backend + UI)
2. Курсы валют + мультивалюта в расчётах
3. Бюджеты с проверкой лимитов
4. Шаринг счетов между пользователями (второй пользователь, инвайты)
5. Push-уведомления «по времени» (VAPID + web-push + планировщик)
6. Деплой: Docker compose + Caddy (HTTPS обязателен для PWA push)