# Harlem Menu App — PROJECT_CONTEXT

> Единый восстановленный контекст проекта по прошлым разговорам.
>
> Исторический контекст восстановлен по разговорам до merge PR #91 (26 июня 2026). Разделы 1–23 сохраняют историю решений; актуальная сверка с кодом находится в разделе 25.
> **Аудит репозитория: 7 октября 2026; синхронизация кода: 7 октября 2026.** Кодовый baseline `main` после PR #94: `83ca18c23ea3538c23968411afaecba69b224c4c`. PR #92, #93 и #94 смержены. Этот hash обозначает код до отдельного docs-only commit/PR; итоговый HEAD после сохранения документации указан в Git.

## 1. Что мы строим

**Harlem Digital Menu / Harlem Menu App** — интерактивное мобильное меню для Harlem Lounge.

Главная идея MVP:

1. Гость сканирует QR конкретного стола.
2. Открывает `/t/{tableId}`.
3. Просматривает меню.
4. Выбирает блюда/напитки и необходимые варианты.
5. Собирает корзину.
6. Отправляет заказ.
7. Видит состояние текущего визита/счёта.
8. Может вызвать персонал.
9. Персонал работает через `/staff`: получает заказы и вызовы, меняет статусы, управляет столами/сессиями и stop-list.

Проект задуман не как очередной PDF-каталог, а как рабочий guest → staff flow для реального заведения.

---

## 2. Репозиторий и известная инфраструктура

- GitHub repo: `AntonioMarreti/harlem-digital-menu`
- Локальная рабочая папка в более поздних разговорах: `~/projects/harlem-digital-menu`
- Ранее проект также находился в:
  `/Users/antonio/Desktop/work/Харлем/InteractiveAPP/harlem-digital-menu`
- Production на момент июньской разработки:
  `https://harlem-digital-menu.vercel.app`
- Hosting приложения: Vercel Free.
- База: Neon Postgres.
- ORM: Drizzle.
- Framework: Next.js App Router + React + TypeScript.
- Styling: Tailwind.
- Для staff notifications был добавлен Sonner.

### Домен

Обсуждался домен:

- основной сайт: `harlem-lounge.ru`
- он находился на shared hosting REG.RU (`server287.hosting.reg.ru`)
- перенос самого Next.js-приложения на этот shared hosting не считался хорошей идеей.

Предложенная схема:

- оставить существующий `harlem-lounge.ru` как есть;
- интерактивное меню разместить на `menu.harlem-lounge.ru`;
- направить subdomain DNS на среду, где реально может работать Next.js/API.

Для самостоятельного production hosting обсуждался VPS/VDS + SSH/root/Docker + Coolify. До необходимости миграции Vercel можно сохранять.

---

## 3. Основные пользовательские поверхности

### Guest

Главный маршрут:

`/t/[tableId]`

Guest flow включает:

- привязку визита к table session;
- категории меню;
- позиции меню;
- карточки/детали позиции;
- варианты и дополнения;
- корзину;
- отправку заказа;
- текущий счёт/заказы;
- вызов персонала;
- отдельную кальянную логику / hookah builder.

### Staff

Маршрут:

`/staff`

Staff dashboard включает:

- новые заказы;
- вызовы;
- открытые столы / table sessions;
- изменение статусов;
- управление столом/сессией;
- stop-list;
- recently closed sessions;
- touch-friendly действия;
- summary strip с приоритетными счётчиками.

### Admin

В раннем плане существовал admin/menu management, но в последнем подтверждённом состоянии полноценная админка всё ещё не была главным готовым production-потоком. Старый `/admin` рассматривался как placeholder/static и не должен считаться завершённой частью продукта без повторной проверки repo.

---

## 4. Модель визита и стола

Ключевая сущность — **table session**.

Смысл:

- один физический стол может использоваться разными гостями последовательно;
- заказы относятся не просто к столу, а к конкретной активной сессии визита;
- закрытая сессия сохраняется как история;
- новый визит получает новую active session;
- staff работает в основном с активными сессиями.

Это было принципиально важно из-за старой проблемы demo-стола, где тестовые заказы накапливались и создавали огромный «вечный счёт».

В hardening была добавлена защита от нескольких одновременно active sessions на одном столе.

---

## 5. Guest ordering

Подтверждённый базовый flow:

QR → table session → меню → корзина → submit order → staff dashboard.

### Корзина

PR #79 добавил сохранение guest cart в `localStorage`.

Важно: корзина scoped по `tableSessionId`, чтобы товары предыдущего визита не протекали в новую сессию.

### Защита отправки заказа

В раннем аудите были найдены критичные проблемы:

- клиент мог подменять цены/total;
- повторный submit мог создавать дубликаты;
- ownership table/session можно было обходить crafted request;
- stale QR после переноса стола мог обращаться не к той сессии.

Эти проблемы были закрыты в hardening PR #44–#57:

- server-side canonical pricing;
- backend idempotency;
- обязательный table context / ownership;
- unique active session;
- boundary validation;
- stale-session UX.

---

## 6. Staff calls

Guest может вызывать персонал с причинами вроде:

- waiter;
- coals;
- bill;
- help.

Hardening добавил:

- ownership-проверку для staff calls;
- validation/whitelist входных данных;
- ограничения boundary values.

PR #60:

- **Deduplicate active staff calls**
- squash commit: `f50a08e`
- если для той же `tableSessionId + reason` уже есть активный call со статусом `new`, новый дубль не создаётся.

### Физические кнопки Harlem

В Harlem Lounge у каждого стола есть физическая кнопка вызова персонала, предположительно передающая Bluetooth/радиосигнал на носимое устройство.

Обсуждалось, что интеграция с цифровым меню зависит от конкретного оборудования:

- закрытая готовая call-button система может вообще не иметь API;
- хороший вариант — внешний приёмник с USB/RS-232/LAN/webhook/relay;
- BLE sniffing рассматривался как потенциально нестабильный путь.

Это отдельная будущая интеграция, не часть подтверждённого готового MVP.

---

## 7. Staff dashboard

К середине июня staff dashboard уже был рабочей частью MVP.

### PR #62 — priority summary strip

- squash merge: `e08678a`
- быстрые summary-кнопки:
  - «Новые заказы»
  - «Вызовы»
  - «Столы»
- они переключают существующие dashboard tabs.
- Добавлены counts и accessibility/native button semantics.

### PR #76 — recently closed

- merge: `06a87ed`
- staff может видеть недавно закрытые сессии.

### PR #77 — touch-friendly actions

- merge: `b2f46b0`
- действия с заказами адаптированы для touch.

### PR #82 — Sonner staff toasts

Добавлены staff notifications/toasts.
Было предусмотрено подавление спама при initial load.
На момент обсуждения visual browser smoke ещё требовал проверки.

### PR #83 — summary-card pulses

- merge: `ce02654`
- визуальные pulse-индикаторы для summary cards.

---

## 8. Stop-list

Stop-list прошёл путь от раннего риска `isAvailable` до staff-managed production flow.

### PR #75

- merge: `5ee2f77`
- persistent staff-managed menu stop-list;
- DB + migration;
- staff UI;
- guest UI;
- backend validation.

Критичная деталь: backend должен отклонять stale cart, если товар успели поставить на стоп после того, как гость добавил его в корзину.

Миграции выполнялись отдельно и без seed (`run_seed=false`).

### PR #78

- merge: `4744f28`
- staff stop-list search.

### PR #87

- merge: `9740185`
- variant stop-list.

После #91 всё равно оставалась задача **повторно проверить variant stop-list на реальном guest flow**, особенно для новых вариантов меню.

---

## 9. Menu data, variants, add-ons и Drawer

К концу июня проект перешёл от простого списка позиций к более полноценному item details / choice UX.

### PR #84

- merge: `78b2f88`
- choice drawers для tea/cider.

### PR #89

- merge: `9e0b03a`
- guest visual foundation.

Это был крупный этап визуальной основы guest UI.

### PR #91

- merge commit: `736869ac97c38f6675373c7e3529017a228a9f02`
- рабочий commit перед merge упоминался как `0339843`.

Основные изменения:

- единый details/choice Drawer;
- `shortDescription`;
- использование существующих полных descriptions;
- активное состояние category tabs;
- более компактные metadata/spacing;
- add-on/choice UX внутри карточки позиции.

**Hookah builder PR #91 намеренно не менял.**

### Что осталось после PR #91

Нужно уточнить/доделать:

- `shortDescription` заполнен не для всех Craft Beery позиций;
- бизнес-правила tea add-ons;
- позиции, где в меню написано просто «в ассортименте», но пользователь не может выбрать конкретный вариант:
  - Rich;
  - соки;
  - чипсы;
  - гренки;
  - торт;
- проверить variant stop-list в реальном сценарии;
- пройти реальные order status transitions;
- кальянный flow;
- mixed Harlem + Craft Beery staff handling;
- очистить/нормализовать demo session/table.

---

## 10. Harlem + Craft Beery

Меню может содержать позиции с разным `source`, включая Harlem и Craft Beery.

Подтверждённая логика на июнь:

- смешанный guest order остаётся **одним заказом**;
- staff card разделяет/группирует позиции по `source`.

Открытый бизнес-вопрос:

- кто фактически передаёт Craft Beery часть;
- должен ли staff иметь отдельную очередь/чек/маршрут обработки;
- достаточно ли визуального разделения внутри одного заказа.

Это нельзя решать только кодом — нужен ответ владельца/сотрудников Harlem.

---

## 11. Hookah

Hookah builder был отдельной существующей частью guest flow.

Из раннего MVP:

- strength;
- taste profile;
- preferences/avoid;
- comment;
- staff должен видеть кальянный заказ и его параметры.

К концу июня hookah builder был намеренно оставлен отдельно от нового универсального Drawer.

Открытые вопросы:

- актуальные требования кальянщиков;
- какие настройки реально нужны гостю;
- какие статусы нужны staff;
- как hookah order должен сосуществовать с обычными Harlem/Craft Beery позициями;
- нужны ли отдельные staff filters/ownership rules.

Не стоит переделывать hookah flow без повторной сверки с реальным заведением.

---

## 12. Order statuses

В раннем аудите API разрешал произвольные переходы статусов.

Hardening PR #52 добавил server-side status transition rules.

Исторически обсуждался graph примерно:

`new -> accepted -> preparing -> delivered -> closed`

с ограниченным cancel на ранних стадиях.

Но после #91 всё равно оставалась задача **пройти реальный status flow глазами персонала**, потому что технически допустимый граф не гарантирует удобный operational flow в Harlem.

---

## 13. Security / hardening timeline

5 июня был сделан большой аудит. На тот момент MVP считался пригодным для контролируемого demo, но не для публичного pilot без hardening.

После этого PR #44–#57 закрыли основные риски.

Подтверждённое соответствие:

- **#44** — отключён публичный destructive session POST.
- **#45** — server-side totals / canonical pricing.
- **#46** — mandatory table context / ownership.
- **#47** — отключён/защищён public table-level bill.
- **#48** — staff-call ownership.
- **#49** — docs.
- **#50** — backend order idempotency.
- **#51** — DB constraint: одна active session на стол.
- **#52** — order status transitions.
- **#53** — boundary validation.
- **#54** — brute-force protection staff login.
- **#55** — stale-session UX.
- **#56** — staff empty-session UX.
- **#57** — structured safe server logs.

После #57:

- stable main: `f2b5d0baee705ca873f7a483bf810696db1e1775`
- production deploy успешно;
- working tree clean.

Подтверждён #57:

- merge `f2b5d0b`
- implementation commit `a0cb588` — `Add safe server event logs`.

### Docs refresh

PR #58:

- docs-only;
- commit `615dadfee9af3cc2aa8931ceb0029782545f379f`;
- обновлялись:
  - `README.md`
  - `docs/BACKEND_PLAN.md`
  - `docs/IMPLEMENTATION_PLAN.md`
  - `docs/PRODUCT.md`
- старые планы должны рассматриваться как historical, а не как описание текущей реализации.

---

## 14. Performance / API cleanup

### PR #61

`Filter table-session orders in SQL`

- squash merge: `69d273c`
- development commit: `c03fb51`

Изменены только guest session-level orders/bill routes.

Было:

- загрузить больше строк;
- отфильтровать в памяти.

Стало:

- SQL `where(eq(orders.tableSessionId, tableSessionId))`.

Сохранены:

- validation;
- joins;
- sorting;
- API response shapes;
- bill rules;
- `items.options`.

Без UI/schema/migration changes.

---

## 15. Guest UX polish timeline

### PR #79

- merge: `2df7cb3`
- localStorage cart, scoped by `tableSessionId`.

### PR #80

- tap feedback на guest controls;
- `active:scale-95` + transition.

### PR #81

- one-shot bounce/pop при изменении количества;
- примерно 180–250ms.

### PR #82

- Sonner staff toasts.

### PR #83

- summary-card pulses;
- merge `ce02654`.

### PR #84

- tea/cider choice drawers;
- merge `78b2f88`.

### PR #87

- variant stop-list;
- merge `9740185`.

### PR #89

- guest visual foundation;
- merge `9e0b03a`.

### PR #91

- unified item details / choice Drawer;
- shortDescription;
- active tabs;
- compact metadata/spacing;
- merge `736869a...`.

Восстановлено по Git diff (подробности в разделе 25): #85 — варианты вкуса для лимонадов; #86 — компактный promo-блок дневного кальяна; #88 — свайп между категориями; #90 — скрытие технического ID заказа у гостя.

---

## 16. Визуальный аудит guest UI

К 25–26 июня отдельный guest visual audit считался в основном закрытым.

Обсуждались и исправлялись:

- лишние/чужие outlines;
- прозрачность;
- фон;
- scrollbar;
- safe-area;
- misleading CTA;
- iPhone hover/touch behavior;
- spacing around categories;
- активные tabs;
- metadata density.

После этого оставались не столько косметические, сколько продуктовые/данные задачи:

- descriptions;
- assortment variants;
- hookah;
- mixed-source staff flow;
- real iPhone recheck;
- demo session.

---

## 17. Известные проверки и рабочие правила разработки

Для Harlem выработался строгий safe workflow.

Перед изменениями:

1. Проверить working tree.
2. Убедиться, что текущая ветка ожидаемая.
3. Для начала новой задачи обычно перейти на clean `main`.
4. Проверить `HEAD == origin/main`.
5. Только после этого создавать ветку/вносить fix.

### Нельзя без отдельного разрешения

- читать/выводить secrets;
- запускать seed;
- запускать migrations;
- делать production actions;
- менять production DB;
- «заодно» чистить реальные данные.

### `.local/`

Локальные owner/business notes находились в `.local/`, в частности упоминался:

`.local/OWNER_QUESTIONS.md`

`/.local` не должен коммититься.

### UI automation

Когда browser sub-agent Antigravity не запускался из-за инфраструктуры, разрешалось использовать Playwright/Puppeteer **только как UI automation**.

Не подменять UI smoke прямыми:

- API/fetch;
- curl;
- SQL;
- seed;
- migrations.

---

## 18. Demo / test data

Demo table/session периодически загрязнялся тестовыми заказами.

Важно различать:

- проверку кода;
- очистку тестовых данных;
- production actions.

Нельзя автоматически сбрасывать/seed-ить DB ради удобства.

Один из хвостов после #91: привести demo table/session к чистому состоянию безопасным способом.

---

## 19. Что сознательно отложено

Не надо преждевременно раздувать MVP.

Исторически отложены:

- iiko / POS integration;
- booking;
- payments;
- loyalty;
- analytics;
- music integrations;
- полноценный admin/menu CMS;
- realtime вместо polling;
- sophisticated guest identity;
- QR/domain management UI.

### Guest menu search (historical decision)

До PR #92 поиск обсуждался как отложенная возможность. Решение заменено: PR #92 добавил поиск по меню, PR #93 расширил поисковые синонимы и iOS-настройки поля, PR #94 дополнил aliases трёх лимонадов. Всё это находится в `main`. См. раздел 25.

---

## 20. Polling / realtime

В раннем подтверждённом состоянии guest и staff обновлялись polling-механизмом (исторически около 10 секунд).

Для MVP это считалось приемлемым.

Realtime/push — возможный будущий upgrade, особенно перед полноценной загруженной сменой, но не причина переписывать рабочий flow заранее.

---

## 21. Owner questions / бизнес-вопросы

В код нельзя зашивать догадки по вопросам, которые должен решить Harlem.

Ключевые вопросы:

1. Как staff должен обрабатывать смешанный Harlem + Craft Beery заказ?
2. Нужна ли Craft Beery отдельная очередь/чек?
3. Кто физически передаёт Craft Beery позиции?
4. Какие реальные статусы заказа используются персоналом?
5. Какие tea add-ons разрешены и как считаются?
6. Что именно подразумевается под каждой позицией «в ассортименте»?
7. Какие варианты должны иметь собственный stop-list?
8. Как кальянщики хотят видеть hookah orders?
9. Нужно ли интегрироваться с существующими физическими call buttons?
10. Как защищаться от заказов по старому/сфотографированному QR вне заведения перед настоящим pilot?

---

## 22. Что обязательно показать перед pilot

Из предыдущих обсуждений важными demo/smoke сценариями считались:

### Guest → Staff

- открыть QR;
- создать/получить table session;
- добавить обычную позицию;
- выбрать variant;
- выбрать add-on;
- отправить заказ;
- увидеть заказ в staff;
- пройти корректные статусы.

### Stop-list

- staff ставит безопасную тестовую позицию на стоп;
- guest видит `На стопе`;
- добавить нельзя;
- stale cart корректно отклоняется backend;
- staff возвращает `Доступен`;
- состояние возвращается без побочных эффектов.

### Variant stop-list

Повторить то же самое на конкретном варианте.

### Table lifecycle

- новый визит;
- заказ;
- счёт;
- закрытие;
- recently closed;
- следующий визит не наследует старый счёт/корзину.

### Calls

- waiter;
- coals;
- bill;
- help;
- дубль одинакового активного вызова не плодится.

### Mixed source

- Harlem + Craft Beery в одной корзине;
- понятное отображение staff;
- подтверждённый реальный operational flow.

### Hookah

- реальный вариант кальянного заказа;
- staff понимает параметры без дополнительных объяснений.

---

## 23. Исторический snapshot до текущего аудита

### 17 июня

Stable main:

`4744f28`

Это соответствовало PR #78.

Готово к этому моменту:

- guest QR/order flow;
- staff dashboard;
- hookah builder;
- calls;
- persistent stop-list;
- backend stale-cart validation;
- recently closed;
- touch-friendly staff actions;
- stop-list search.

### 19–26 июня

После этого прошла серия UX/menu PR #79–#91.

### 26 июня 2026

Последнее подтверждённое состояние **восстановленной истории до аудита репозитория**:

**PR #91 merged**
merge commit:

`736869ac97c38f6675373c7e3529017a228a9f02`

После него открыты:

- incomplete `shortDescription`;
- tea add-on rules;
- ассортимент variants;
- real order-status flow;
- variant stop-list verification;
- hookah flow;
- mixed Harlem/Craft Beery handling;
- clean demo table/session.

---

## 24. Как использовать этот файл

В начале нового чата достаточно сказать:

> Работаем над Harlem Menu App. Используй `PROJECT_CONTEXT.md` как историю и сверку архитектуры от 07.10.2026, а `CURRENT_STATE.md` как краткую точку входа. Перед кодовыми изменениями проверь ветку и фактическое состояние repo.

После каждого крупного PR лучше обновлять:

- последний commit/main;
- «Что уже готово»;
- «Открытые задачи»;
- новые business decisions.

Тогда старые чаты перестанут быть критичной частью памяти проекта.

---

## 25. Аудит фактического репозитория — 7 октября 2026

### Git: аудит и последующая синхронизация

- PR #91: merge `736869ac97c38f6675373c7e3529017a228a9f02`.
- PR #92: `8f7c9ee` добавил категорию пива и guest-поиск; `01fb897` сделал кнопку поиска переключателем; merge в `main` — `d7ab699cd8d16d0d7b076ace12769f2d24b1cac9`.
- На момент статического аудита `0762d3d` и `17dd78a45309d80121f7c86a0d45d0ed5fd25476` были только в pushed-ветке `fix/guest-search-ios-and-aliases`. Затем они вошли в `main` через PR #93, merge `f34a1f365fe4a11620cb38d047d05d8ad39bcbc0`.
- Пропущенные aliases для `dr_18`–`dr_20` добавлены отдельным commit `0b900cb060cd9aa9fae22957bbda5c224014f287` и PR #94, merge `83ca18c23ea3538c23968411afaecba69b224c4c`. Локальный `main` был fast-forward до этого merge и совпал с `origin/main`.
- `0762d3d`: поле поиска стало 16 px (чтобы не вызывать автоматический zoom iOS Safari), добавлены `inputMode`, `enterKeyHint`, настройки автокоррекции и локальная карта beer aliases.
- `17dd78a`: aliases перенесены в `MenuItem.searchAliases`, добавлены напитки, пиво, сидр, чай/кофе и отдельные позиции Craft Beery; поиск нормализует `ё`, дефисы, апостроф и пробелы и требует совпадения всех слов запроса. Поиск остаётся клиентским, по статическому каталогу, сгруппированным по категориям. Результаты также показывают beer sections.
- `modify_mock.js` был untracked одноразовым helper. В исходном `17dd78a` из 48 намеченных item IDs совпадали 45; многострочные `dr_18`–`dr_20` были пропущены. После `0b900cb` совпали все 48; helper не запускали, не добавляли в Git и удалили как лишний локальный файл.

### Восстановленные PR до #91

- **#85**, `fe81688`: три лимонада `dr_18`–`dr_20` получили выбор вкуса через `choices`; guest action записывает вкус в заметку заказа. Старое описание со списком вкусов заменено выбором.
- **#86**, `75179dc`: promo дневного кальяна перенесён после карточек и уплотнён; логика цен заказа не менялась.
- **#88**, merge `fad200c`, реализация `2ebc9a6`: категории стали controlled tabs; горизонтальный свайп по содержимому переключает категорию, с исключением интерактивных элементов и прокруткой активного tab в видимую область.
- **#90**, merge `02536dc`, реализация `9da5b5b`: guest order sheet вместо короткого технического ID показывает человекочитаемый статус. Staff по-прежнему видит ID.

### Что реально делает текущий код

- `/t/[tableId]` — серверная оболочка со статическими `categories/menuItems`; имя стола уточняется через `GET /api/tables/[tableId]/session`. API ищет table UUID/`qrSlug`, создаёт active session при отсутствии; неизвестный slug даёт 404 на bootstrap. Публичное открытие QR может создавать пустые сессии.
- Guest: категории и свайп, поиск, item details/choice Drawer; отдельный hookah builder; корзина в `localStorage` с ключом `harlem_cart:<tableSessionId>`; submit, bill, последний активный заказ и staff calls. При закрытии/переносе сессии есть сообщение и повторное получение/переход на новый стол. Bill/orders polling — 10 секунд; availability загружается один раз при открытии страницы.
- Меню — TypeScript-массив в `src/lib/mock-data.ts`, **не** таблица БД. Сейчас 108 позиций, включая 14 beer items в трёх секциях и 48 Craft Beery items. Поле `shortDescription` заполнено только у части каталога (16 позиций); у большинства Craft Beery позиций длинное `description`, но нет короткой строки в списке. Цена и source задаются в этом массиве.
- Tea 500/900 мл, сидр, лимонады и отдельная «Добавка к чаю» имеют `choices`; stop-list вариантов хранится ключами `<itemId>::<label>`, а общие чайные сорта — `tea::<label>`. Guest UI скрывает недоступные варианты; API заказа проверяет такой ключ, если `options.notes` начинается с «Сорт: » или «Вкус: ». Само значение выбора сервер не сверяет со списком `choices`, а для позиции с choices не требует выбор. Это ограничение защиты variant stop-list.
- Stop-list целой позиции и варианта хранится в `menu_item_availability`; staff `/staff` меняет его через защищённый PATCH, guest получает через публичный GET. При ошибке публичного availability API возвращается пустая карта (UI выглядит как «всё доступно»); сервер заказа отдельно проверяет availability перед записью.
- `POST /api/orders` требует active session и контекст стола, использует серверные цену/name/source и уникальный `(table_session_id, idempotency_key)`. Передача клиентского `totalAmount` не определяет итог. Вставка заказа и строк заказа выполняется отдельными операциями без видимой транзакции: если вторая запись не удастся, возможен заказ без items, для которого idempotent retry вернёт 503.
- `/staff` закрыт общим серверным `STAFF_ACCESS_CODE` и подписанной HttpOnly cookie (12 часов). Login rate limit хранится в памяти отдельного serverless instance, без глобального хранилища. Staff dashboard показывает заказы, вызовы, столы, недавно закрытые 5 сессий, stop-list и счётчики; обновление — polling 10 секунд, Sonner/pulse после первой загрузки. Один mixed-source order отображает Harlem/Craft Beery группами, но меняет **один общий** статус.
- Статусы заказа в БД/API: `new → accepted → preparing → delivered → closed`; отмена возможна из `new` и `accepted`. Staff UI предоставляет эти действия. Закрытие table session — отдельное staff действие, оно может скрыть ещё активные заказы из `/api/staff/orders` без смены их статуса; это риск для реальной смены. Staff calls: `new/handled/cancelled`, причины `waiter/coals/bill/help`, повтор активного вызова той же причины возвращает существующий call.
- БД в `src/db/schema.ts` и `drizzle/0000`–`0003`: `tables`, `table_sessions`, `guest_sessions`, `orders`, `order_items`, `staff_calls`, `menu_item_availability`; partial unique index допускает одну active session на стол. Нет таблиц menu, users, bookings, loyalty или QR-генерации. `seed-tables.ts` описывает `h01`–`h10`, но наличие и содержимое реальной БД в этом аудите не проверялись.
- `/admin` — незакрытый статический placeholder без CRUD и auth; QR/table management UI нет. Staff может видеть таблицы и переносить/закрывать сессии, но не создавать столы или QR. `next.config.mjs` пуст; Vercel используется согласно README, GitHub workflows для миграций и seed существуют, но не запускались. README и старые plans частично исторические; например README всё ещё относит menu availability toggle к отложенному, хотя staff stop-list работает.

### Существенные поправки к прежнему тексту

Формат: **в документации → в текущем коде → что исправить**.

1. «Guest menu search отложен» → поиск есть в `main` с PR #92, aliases/iOS-настройки вошли через #93, а три пропущенных aliases — через #94 → считать поиск реализованным в `main`.
2. «Пиво не описано» → отдельная категория с 14 позициями и секциями → добавить в каталог и сценарии проверки.
3. «#85/#86/#88/#90 неизвестны» → их diff описан выше → сохранить восстановленные детали.
4. «Variant stop-list» без границ валидации → UI/API проверяют availability по заметке, но API допускает отсутствующий/произвольный выбор → уточнить фактическую защиту и перед pilot проверить/усилить её.
5. «Session close освобождает стол» → также скрывает активные заказы из staff списка → описать этот риск и проверить operational rule.
6. «Admin/menu CMS/QR management» как будущие возможности → `/admin` лишь placeholder; реальные таблицы и QR не управляются UI → не считать их готовыми.
7. «Проект обновляется polling» → guest bill/orders и staff данные обновляются каждые 10 с, guest availability только при mount → указать точные границы обновления.
8. «Пилотные таблицы h01–h10» в README/plans → есть seed script, но состояние удалённой БД не определено по repo → не утверждать, что записи сейчас существуют.
9. `src/lib/mock-data.ts` экспортирует старый тип `OrderStatus` с `served`, тогда как фактические API/schema используют `delivered` и `cancelled` → считать тип историческим остатком, источником истины для статусов считать schema/API.

### Старые открытые вопросы после #91

| Вопрос | Статус по repo | Основание |
| --- | --- | --- |
| Недостающие `shortDescription` | STILL OPEN | Поле поддерживается, но заполнено лишь у части позиций, особенно Craft Beery. |
| Правила tea add-ons | PARTIALLY DONE | Отдельный товар `tea_4`, 40 ₽, с выбором добавки есть; допустимые сочетания/количество с чаем не подтверждены бизнесом и не связаны с чайным товаром. |
| «В ассортименте» variants | STILL OPEN | Rich, сок, чипсы, гренки и торт остаются без `choices`; вкусы лимонадов из #85 — отдельный закрытый пример. |
| Variant stop-list verification | PARTIALLY DONE | Реализация видна, но реальный end-to-end тест не проведён; сервер не валидирует choice label. |
| Реальный order-status flow | PARTIALLY DONE | Технический граф/API/UI есть; удобство и роли реальной смены не подтверждены. |
| Hookah flow | PARTIALLY DONE | Builder передаёт крепость/вкус/пожелания; требования кальянщиков и дневная цена/правила не проверены. |
| Harlem + Craft Beery operational flow | PARTIALLY DONE | Визуальная группировка есть; одна очередь/статус, передача части заказа остаётся бизнес-вопросом. |
| Demo table/session cleanup | CANNOT DETERMINE FROM CODE | Есть staff close/release, но фактические данные БД не читались. |
| iPhone guest UX | PARTIALLY DONE | Код содержит touch/swipe/safe-area и 16px поиск в ветке; проверки на реальном iPhone нет. |

### Приоритеты перед реальным pilot

- **Must fix before pilot:** защитить уже принятые активные заказы от исчезновения при закрытии table session; валидировать обязательный реальный choice на сервере и stop-list для него; устранить либо проверить сценарий частично записанного заказа при ошибке вставки order items; пройти безопасный сквозной smoke с реальной тестовой сессией, включая variant stop-list, mixed source, calls и статусы. Для этих пунктов пока зафиксирован риск, код в аудите не менялся.
- **Should fix soon:** обновлять guest availability во время долгой открытой страницы или ясно обрабатывать stale UI; заполнить полезные короткие описания; проверить поиск/Drawer/свайп на iPhone; уточнить состояние demo session без автоматической очистки; синхронизировать README и старые plans.
- **Can wait:** полноценная admin CMS, realtime/push, POS, payments, loyalty, booking, аналитика и физические call-button integrations, пока они не требуются pilot-сценарием.
- **Needs owner/business decision:** ассортимент и цены, правила tea add-ons, дневная цена/правила кальяна, staff роли и статусы, передача Craft Beery, правила закрытия счёта, допустимая защита публичного QR от удалённых заказов.

**Recommended next task:** отдельная небольшая задача на защиту закрытия table session при активных заказах, с согласованием того, когда персонал считает счёт готовым к закрытию. До изменения кода — подтвердить это правило с владельцем/сменой.

Проверки этого аудита: `npm run lint` и `npx tsc --noEmit --incremental false` прошли. Runtime, БД, migrations, seed, Vercel и iPhone не проверялись; выводы о них ограничены исходниками и Git history.
