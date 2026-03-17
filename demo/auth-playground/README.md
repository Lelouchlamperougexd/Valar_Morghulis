# Auth Playground

Легкий фронт для тестирования auth flow твоего API:

- регистрация пользователя (`POST /v1/authentication/user`)
- регистрация компании (`POST /v1/authentication/company`)
- логин (`POST /v1/authentication/token`)
- админ-логин (`POST /v1/authentication/admin/token`)
- текущий пользователь (`GET /v1/authentication/me`)

## 1) Запусти backend

По умолчанию фронт ожидает API на:

`http://localhost:8080/v1`

## 2) Запусти статический сервер на 5173

Важно: в API по умолчанию CORS разрешает origin `http://localhost:5173`.

Вариант через Node.js:

```bash
npx serve demo/auth-playground -l 5173 -s
```

Вариант через Python:

```bash
cd demo/auth-playground
python -m http.server 5173
```

## 3) Открой страницу

- `http://localhost:5173`

## 4) Тестирование

1. Нажми "Зарегистрироваться" и выбери тип аккаунта.
2. Пройди шаг 2 и отправь форму.
3. Возьми `token` из ответа регистрации и нажми "Активировать" в блоке активации.
4. Нажми "Войти" для получения JWT.
5. Нажми "GET /authentication/me" для проверки токена.

## Примечания

- Токен из регистрации (`UserWithToken.token`) — это activation token, не JWT.
- Для защищенных endpoint-ов используй JWT, полученный через логин.
- Base URL можно менять прямо в блоке `API Console`.
- Пароль для регистрации должен содержать минимум 8 символов, включая строчную букву, заглавную букву, цифру и спецсимвол.
- Текущий backend работает через активационную ссылку с токеном, а не через 6-значный код.
- Playground пытается читать токен активации из URL: `?token=...`, `#/...token=...`, `/confirm/{token}` и `/activate/{token}`.
