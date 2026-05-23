# Sunsets — Учет смен для точек продаж

Веб-приложение для управления сменами сотрудников на торговых точках. Позволяет открывать/закрывать смены, вести учет товаров и выручки.

## Стек

- React 19 + TypeScript
- Vite
- Tailwind CSS
- Firebase (Firestore + Auth)
- Framer Motion

## Быстрый старт

```bash
npm install
npm run dev
```

## Firebase настройка

1. Создай проект в [Firebase Console](https://console.firebase.google.com)
2. Включи Firestore Database и Authentication
3. Скопируй конфигурацию в `src/lib/firebase.ts`
4. Загрузи правила безопасности: `firestore.rules`

## Деплой на Render (Static Site)

1. Запушь код в GitHub
2. На Render: New → Static Site → подключи репозиторий
3. Настройки:
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Добавь переменные окружения Firebase (если используешь `.env`)
5. Create Static Site

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run dev` | Локальная разработка |
| `npm run build` | Сборка для продакшена |
| `npm run preview` | Предпросмотр сборки |

## Структура проекта

```
src/
  components/     # React компоненты
  lib/           # Firebase, БД, утилиты
  pages/         # Страницы приложения
  assets/        # Статические файлы
```

## Лицензия

MIT
