# Инструкция по настройке Firebase

## Проблема: "Missing or insufficient permissions"

Эта ошибка означает, что правила безопасности Firestore не настроены.

## Решение:

### Шаг 1: Перейдите в Firebase Console
1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект: `sunset-43c80`
3. В левом меню нажмите "Firestore Database"

### Шаг 2: Создайте правила безопасности
1. Нажмите на вкладку "Rules" (Правила)
2. Удалите текущие правила
3. Вставьте следующие правила:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Правила для точек продаж
    match /points/{pointId} {
      allow read: if true;
      allow write: if true;
    }

    // Правила для активных смен
    match /activeShifts/{shiftId} {
      allow read: if true;
      allow write: if true;
    }

    // Правила для закрытых смен
    match /closedShifts/{shiftId} {
      allow read: if true;
      allow write: if true;
    }

    // Правила для заказов
    match /orders/{orderId} {
      allow read: if true;
      allow write: if true;
    }

    // Правила для расписания
    match /schedule/{slotId} {
      allow read: if true;
      allow write: if true;
    }

    // Правила для пользователей
    match /users/{userId} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

### Шаг 3: Опубликуйте правила
1. Нажмите кнопку "Publish" (Опубликовать)
2. Подтвердите публикацию

## Альтернатива: Использовать LocalStorage

Если вы не хотите настраивать Firebase, приложение автоматически переключится на LocalStorage.

Приложение покажет сообщение в консоли:
- ✅ "Firebase initialized successfully" - если Firebase работает
- 🔄 "Falling back to LocalStorage" - если переключается на LocalStorage

## Проверка работы

После настройки правил:
1. Перезагрузите приложение
2. Откройте консоль браузера (F12)
3. Должно появиться сообщение: "✅ Firebase initialized successfully"

## Тестирование функций

### Вход в админку:
- Логин: `Admin`
- Пароль: `Admin`

### Создание точки:
1. Войдите в админку
2. Перейдите в раздел "Управление точками"
3. Нажмите "Добавить"
4. Заполните форму

### Запись в график:
1. Перейдите во вкладку "График"
2. Найдите свободную смену
3. Нажмите "Записаться"
4. Введите ФИО

## Troubleshooting

### Ошибка продолжает появляться:
1. Проверьте, что правила опубликованы (вкладка Rules должна показывать "Published")
2. Проверьте, что выбрали правильный проект (sunset-43c80)
3. Попробуйте очистить кэш браузера

### Данные не сохраняются:
1. Проверьте консоль на наличие ошибок
2. Приложение автоматически использует LocalStorage как резерв
3. LocalStorage данные сохраняются локально в браузере