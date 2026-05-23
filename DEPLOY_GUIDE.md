# Подробный гайд по деплою на Render

## Шаг 1: Подготовка проекта

Проект уже настроен:
- `.env` — содержит Firebase конфигурацию (добавлен в `.gitignore`, не попадёт в Git)
- `.env.example` — шаблон для других разработчиков
- `firebase.ts` — читает переменные из `import.meta.env`

## Шаг 2: Создание репозитория на GitHub

```bash
# Инициализация Git (если ещё не сделано)
git init

# Добавление всех файлов
git add .

# Коммит
git commit -m "Initial commit"

# Привязка к GitHub (замени username/repo на свои)
git remote add origin https://github.com/username/repo.git

# Пуш в main ветку
git push -u origin main
```

## Шаг 3: Создание Static Site на Render

1. Перейди на [render.com](https://render.com) и войди в аккаунт
2. Нажми **New +** → **Static Site**
3. Подключи свой GitHub аккаунт и выбери репозиторий

## Шаг 4: Настройка билда

Заполни поля:

| Поле | Значение |
|------|----------|
| **Name** | sunsets (или любое другое) |
| **Branch** | main |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

## Шаг 5: Добавление переменных окружения

Это критически важный шаг — без него Firebase не будет работать.

1. В настройках проекта на Render перейди в раздел **Environment**
2. Добавь каждую переменную из `.env`:

| Key | Value |
|-----|-------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyBxPXmlsp9rVwnT3gpfewS15cCWFFUM3q8` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `sunset-43c80.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `sunset-43c80` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `sunset-43c80.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `380253230795` |
| `VITE_FIREBASE_APP_ID` | `1:380253230795:web:5101925d33214be6656d4e` |
| `VITE_FIREBASE_MEASUREMENT_ID` | `G-S00LTYRMFM` |

> **Важно:** Не забудь нажать **Save Changes** после добавления переменных!

## Шаг 6: Деплой

1. Нажми **Create Static Site**
2. Render начнёт сборку автоматически
3. Дождись окончания (обычно 1-2 минуты)
4. Получишь URL вида `https://sunsets.onrender.com`

## Шаг 7: Проверка

1. Открой полученный URL в браузере
2. Проверь:
   - Загружается ли приложение
   - Работает ли авторизация
   - Подгружаются ли данные из Firestore

## Передеплой после изменений

Каждый пуш в `main` ветку автоматически запускает новый деплой:

```bash
git add .
git commit -m "Описание изменений"
git push origin main
```

Render сам пересоберёт и обновит сайт (обычно в течение 2-3 минут).

## Troubleshooting

### Ошибка "Firebase not initialized"
- Проверь, что все переменные окружения добавлены в Render
- Убедись, что названия переменных начинаются с `VITE_`

### Ошибка "Permission denied" в Firestore
- Проверь правила безопасности в Firebase Console
- Загрузи `firestore.rules` в Firebase

### Сборка падает с ошибкой TypeScript
- Проверь локально: `npm run build`
- Исправь ошибки перед пушем

## Альтернатива: Firebase Hosting

Если Render не подходит, можно использовать Firebase Hosting:

```bash
# Установка Firebase CLI
npm install -g firebase-tools

# Логин
firebase login

# Инициализация
firebase init hosting

# Сборка и деплой
npm run build
firebase deploy
```

Бесплатно до 1GB хранилища и 10GB трафика в месяц.
