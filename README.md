# ИС «Аптека АнПро» — Руководство по запуску

## Структура проекта

```
AnPro/
├── backend/          # Flask API (Python)
│   ├── app.py        # Точка входа
│   ├── models.py     # Модели БД
│   ├── config.py     # Конфигурация
│   ├── init_db.py    # Инициализация БД с тестовыми данными
│   ├── requirements.txt
│   └── routes/       # API маршруты
│       ├── auth.py         — Авторизация
│       ├── users.py        — Управление пользователями
│       ├── warehouse.py    — Склад (компоненты, готовые ЛС, заявки)
│       ├── tech_cards.py   — Технологические карты
│       ├── orders.py       — Заказы и рецепты
│       └── inventory.py    — Инвентаризация и статистика
└── frontend/         # React SPA
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   └── components/
    │       ├── Login.jsx
    │       ├── Navigation.jsx
    │       ├── Prescriptions.jsx     — Приём рецептов
    │       ├── ProductionOrders.jsx  — Заказы в производстве
    │       ├── TechCards.jsx         — Технологические карты
    │       ├── Warehouse.jsx         — Склад
    │       ├── Inventory.jsx         — Инвентаризация
    │       ├── Statistics.jsx        — Статистика
    │       └── Users.jsx             — Пользователи
    └── package.json
```

## Требования

- Python 3.11+
- Node.js 18+ и npm

## Запуск Backend

```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate

# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt

# Первый запуск — инициализировать БД с тестовыми данными:
python init_db.py

# Запустить сервер:
python app.py
```

Сервер запустится на http://localhost:5000

## Запуск Frontend

```bash
cd frontend
npm install
npm start
```

Откроется http://localhost:3000

## Тестовые учётные записи

| Логин       | Пароль   | Роль                  |
|-------------|----------|-----------------------|
| admin       | admin123 | Администратор         |
| provizor1   | pass123  | Провизор              |
| provizor2   | pass123  | Провизор              |
| technolog   | pass123  | Провизор-технолог     |
| manager     | pass123  | Руководитель          |


## Функционал по ролям

**Провизор** — приём рецептов, просмотр заказов в производстве, выдача готовых лекарств, учёт необслуженных покупателей.

**Провизор-технолог** — управление заказами в производстве, ведение справочника технологий, отметка о наличии компонентов.

**Руководитель** — инвентаризация склада, просмотр отчётов (ниже нормы, просроченные), статистика использования медикаментов, экспорт в Excel.

**Администратор** — управление пользователями (создание, редактирование, деактивация).
