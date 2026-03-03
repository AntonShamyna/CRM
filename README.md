# Cosmetics CRM API

Backend CRM для продаж косметики на Node.js + Express + Sequelize + MariaDB.

## Что реализовано
- Аутентификация администратора/менеджера по логину и паролю (`JWT`).
- Полный CRUD для:
  - менеджеров/админов (только админ),
  - клиентов,
  - товаров,
  - категорий,
  - методов оплаты,
  - способов доставки,
  - напоминаний.
- Заказы с:
  - автоматическим номером в формате `MM-XXX`,
  - позициями заказа,
  - расчетом суммы с учетом скидок клиента и товара,
  - статусами: `ACCEPTED`, `ASSEMBLED`, `IN_TRANSIT`, `DELIVERED`, `PAID`, `RETURNED`.
- Автоматизация при закрытии заказа (`PAID`/`RETURNED`):
  - добавление ID заказа в историю клиента,
  - увеличение счетчика заказов клиента,
  - помещение клиента в blacklist при `RETURNED`,
  - авто-напоминание на 4 недели.
- Аналитика:
  - месячная (проданные товары, сумма заказов, средний чек, ожидаемые поступления),
  - дневная (выручка и средний чек),
  - помесячная статистика по способам оплаты.

## Запуск
1. Установите зависимости:
   ```bash
   npm install
   ```
2. Скопируйте переменные окружения:
   ```bash
   cp .env.example .env
   ```
3. Создайте БД в MariaDB/MySQL и укажите доступ в `.env` (включая `DB_DIALECT`: `mariadb` или `mysql`).
4. Синхронизируйте БД:
   ```bash
   npm run db:sync
   ```
5. (Опционально) включите авто-синхронизацию схемы на старте (`DB_SYNC_ON_START=true`) только для dev-окружения.
6. Запустите сервер:
   ```bash
   npm run start
   ```

## Основные endpoint'ы
- `POST /api/auth/login`
- `GET/POST/PUT/DELETE /api/users` (только ADMIN)
- `GET/POST/PUT/DELETE /api/clients`
- `GET/POST/PUT/DELETE /api/products`
- `GET/POST/PUT/DELETE /api/categories`
- `GET/POST/PUT/DELETE /api/payment-methods`
- `GET/POST/PUT/DELETE /api/delivery-methods`
- `GET /api/orders`
- `POST /api/orders`
- `PATCH /api/orders/:id/status`
- `GET/POST/PUT/DELETE /api/reminders`
- `GET /api/analytics/monthly`
- `GET /api/analytics/daily`
- `GET /api/analytics/monthly-payments`

> После первого запуска автоматически создается администратор из `.env` (`ADMIN_LOGIN`/`ADMIN_PASSWORD`) и базовые методы оплаты/доставки.


## Важные замечания
- В production рекомендуется запускать `npm run db:sync` явно и держать `DB_SYNC_ON_START=false`.
- Ошибки API возвращают корректные HTTP-коды (`409` для конфликтов, `422` для валидации, `500` для внутренних ошибок).


## Troubleshooting подключения к БД
- Ошибка вида `Client does not support authentication protocol 'auth_gssapi_client'` означает несовместимый auth plugin пользователя БД.
- Создайте отдельного пользователя с паролем и поддерживаемым plugin (`mysql_native_password`/`caching_sha2_password`) и используйте его в `.env`.

Пример для MySQL:
```sql
CREATE USER IF NOT EXISTS 'crm_user'@'%' IDENTIFIED WITH mysql_native_password BY 'StrongPass123!';
GRANT ALL PRIVILEGES ON cosmetics_crm.* TO 'crm_user'@'%';
FLUSH PRIVILEGES;
```

Если пользователь уже существует:
```sql
ALTER USER 'crm_user'@'%' IDENTIFIED WITH mysql_native_password BY 'StrongPass123!';
FLUSH PRIVILEGES;
```

- Для MySQL в `.env` установите `DB_DIALECT=mysql`. Для MariaDB оставьте `DB_DIALECT=mariadb`.
- На Windows часто помогает использовать `DB_HOST=127.0.0.1` вместо `localhost` (чтобы избежать нежелательных способов аутентификации).
