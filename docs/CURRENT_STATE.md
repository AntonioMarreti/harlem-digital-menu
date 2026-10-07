# Harlem Digital Menu — CURRENT_STATE

> Краткий snapshot по аудиту от **7 октября 2026** и синхронизации кода от **7 октября 2026**. История решений и подробная сверка — в `docs/PROJECT_CONTEXT.md`, раздел 25. Состояние production/Neon не проверялось; Vercel check PR #94 прошёл, runtime smoke не проводился.

## Git и граница изменений

- Кодовый baseline `main` после PR #94 = `83ca18c23ea3538c23968411afaecba69b224c4c`; локальный `main` был fast-forward и совпал с `origin/main`. Отдельный docs-only commit/PR после этого baseline продвинет HEAD, не меняя код.
- PR #92 (`d7ab699`) добавил пиво и поиск; PR #93 (`f34a1f3`) смержил `0762d3d` и `17dd78a`; PR #94 (`83ca18c`) смержил отдельный commit `0b900cb` с aliases лимонадов. Все search fixes находятся в `main`; ветка `fix/guest-search-ios-and-aliases` больше не является незамерженным development state.
- `modify_mock.js` после сверки всех 48 записей с tracked-кодом удалён как одноразовый локальный helper; его не запускали и не добавляли в Git.

## Реализовано в текущем HEAD

- Next.js 14 App Router, React/TypeScript/Tailwind; Neon Postgres + Drizzle для сессий/заказов/вызовов/stop-list. Каталог, цены и источники товаров заданы статически в `src/lib/mock-data.ts`.
- Guest `/t/[tableId]`: QR по реальному table slug/UUID, active table session, категории и свайп, details/choice Drawer, отдельный hookah builder, корзина в `localStorage` по session ID, отправка заказа, счёт и последний активный заказ, вызов персонала. Bill/orders обновляются каждые 10 секунд.
- PR #92–#94 в `main`: категория пива (14 позиций; светлое/тёмное/безалкогольное), client-side поиск по названию, описаниям, категории, tags, choices и `searchAliases`. Кнопка поиска переключает поле; есть 16px/iOS настройки и нормализация `ё`, дефисов, апострофа и пробелов со совпадением всех слов. Aliases для `dr_18`–`dr_20` тоже добавлены.
- PR #85/#86/#88/#90, ранее не описанные: выбор вкуса лимонадов; компактный promo дневного кальяна; свайп между категориями; скрытие технического ID заказа у гостя.
- Staff `/staff`: общий access code и HttpOnly cookie, in-memory rate limit login; polling 10 секунд, заказы/вызовы/столы, summary, Sonner, stop-list позиции и варианта, перенос и закрытие сессий, 5 recently closed. Смешанный Harlem/Craft Beery заказ отображается по источникам, но остаётся одним заказом и имеет один статус.
- API пересчитывает цену по статическому каталогу, требует active session и table context, проверяет stop-list и использует уникальный idempotency key на сессию. Статусы: `new → accepted → preparing → delivered → closed`, отмена из `new` или `accepted`. Staff calls: `waiter/coals/bill/help`, активные дубли той же причины возвращают существующий вызов.
- Схема БД: `tables`, `table_sessions`, `guest_sessions`, `orders`, `order_items`, `staff_calls`, `menu_item_availability`; partial unique index ограничивает одну active session на стол. `/admin` остаётся статическим placeholder без CRUD/auth. QR generation/table management UI нет; script для seed `h01`–`h10` есть, но наличие записей в БД не проверено.

## Старые TODO после #91

| Вопрос | Статус | Основание |
| --- | --- | --- |
| Недостающие `shortDescription` | STILL OPEN | Поддержка есть, заполнена лишь у части каталога (16 позиций), включая немногие Craft Beery. |
| Tea add-on rules | PARTIALLY DONE | Товар «Добавка к чаю» с выбором и ценой 40 ₽ есть; бизнес-ограничения и связь с чайником не подтверждены. |
| «В ассортименте» variants | STILL OPEN | Rich, сок, чипсы, гренки и торт без `choices`. |
| Variant stop-list verification | PARTIALLY DONE | Код проверяет availability варианта по заметке; E2E не проведён, сервер не проверяет допустимость/обязательность выбора. |
| Order-status flow | PARTIALLY DONE | Технический граф и UI есть; сценарий смены не проверен с персоналом. |
| Hookah flow | PARTIALLY DONE | Builder есть; требования кальянщиков и правила дневной цены открыты. |
| Harlem + Craft Beery | PARTIALLY DONE | Группировка есть; передача/ответственность/очередь требуют решения владельца. |
| Demo table/session cleanup | CANNOT DETERMINE FROM CODE | БД не читали и ничего не очищали. |
| Guest UX на iPhone | PARTIALLY DONE | Кодовые правки есть; реального device smoke не было. |

## Новые риски и приоритет

### Must fix before pilot

1. Закрытие table session может скрыть ещё активные заказы из staff списка, не меняя их статуса. Нужны защитное правило и согласованный с персоналом момент закрытия.
2. Сервер заказа не требует choice у товара с вариантами и не сверяет выбранный label с каталогом. Формат заметки можно обойти, поэтому variant stop-list не защищает произвольный/пропущенный выбор.
3. Order и order_items вставляются отдельно: сбой второй операции может оставить заказ без строк; retry с тем же idempotency key не восстановит его. Нужен отдельный надёжный сценарий.
4. Провести контролируемый E2E перед пилотом: guest → staff, статусы, stop-list варианта/stale cart, calls, mixed-source и lifecycle стола. Аудит был только статическим.

### Should fix soon

- Guest availability загружается один раз: открытая страница не узнаёт об изменении stop-list до обновления, хотя submit перепроверяет сервер.
- Aliases для `dr_18`–`dr_20` закрыты в `0b900cb`/PR #94; повторно запускать удалённый helper не требуется.
- Заполнить короткие описания по подтверждённым данным; проверить поиск/свайп/Drawer на iPhone; проверить состояние demo session без автоматической очистки; привести README/plans к текущему stop-list/search.

### Can wait

Полноценная admin CMS, realtime/push, booking, loyalty, платежи, POS, сложная аналитика и интеграция с физическими кнопками, пока pilot не требует их.

### Needs owner/business decision

Реальные варианты «в ассортименте» и цены; правила добавок к чаю; кальянные опции/дневная цена; статусы и роли смены; передача Craft Beery; правило закрытия счёта; защита публичного QR от заказов вне заведения.

## Что делать следующим

**Рекомендуемая отдельная задача:** согласовать с владельцем/сменой критерий закрытия счёта, затем в небольшой ветке защитить закрытие table session при активных заказах. После этого отдельно проверить/усилить серверную валидацию вариантов.

Проверки аудита: `npm run lint` и `npx tsc --noEmit --incremental false` — успешно. Не запускались migrations, seed, runtime API, БД, deploy или browser/device smoke. Файлы приложения не изменялись.
