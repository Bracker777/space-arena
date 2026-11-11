# Space Arena — Lab 03

Асинхронний шар поверх гри з Lab 01–02: **екран завантаження → лобі → гра**. Ассети (спрайтшити, звуки, конфіг арен) завантажуються паралельно з реальним прогрес-баром, ретраями з backoff і обробкою збоїв. Звук іде через Web Audio, лобі отримує кімнати через HTTP, а симуляція спілкується з аудіо та HUD лише через події.

## Запуск

```bash
npm install
npm.cmd run dev
```

```bash
npm test          # node --test: withRetry / backoff / no retry on 4xx
npm run lint
npm run build
npm run gen:assets  # перегенерувати SVG-спрайтшити і WAV-звуки
```

| Клавіші | Дія |
| --- | --- |
| `WASD` / стрілки | політ |
| `Space` | вогонь |
| `M` | вимкнути звук |
| `Esc` | вийти в лобі |

URL-перемикачі для експериментів:

| Параметр | Що робить |
| --- | --- |
| `?latency=300` | кожен ассет відповідає через 300 мс (dev-middleware `/__slow/`) |
| `?seq=1` | послідовні `await` замість `Promise.all` |
| `?fail=404` | спрайтшит `fx` вказує на неіснуючий файл |
| `?fail=timeout` | `explosion.wav` «висить» 60 с |
| `?fail=abort` | гравець скасовує завантаження на 40 % |
| `?fail=badjson` | `arenas.json` обрізаний на середині |
| `?fail=flaky` | `ships.svg` двічі відповідає 503, потім 200 |
| `?lobby=timeout` / `500` / `badjson` | збої запиту `/api/rooms` |

Параметри можна комбінувати: `?fail=404,flaky&latency=200`.

## Структура (нове в Lab 03)

```text
public/assets/
├── manifest.json          # список ассетів + кадри спрайтшитів + налаштування лоадера
├── arenas.json            # конфіги арен (обов'язковий файл)
├── arenas-broken.json     # навмисно битий JSON для галереї збоїв
├── sprites/ships.svg, asteroids.svg, fx.svg   # спрайтшити (scripts/generate-sprites.mjs)
└── sounds/shoot.wav, hit.wav, explosion.wav, pickup.wav   # (scripts/generate-sounds.mjs)
server/dev-api.js          # Vite-плагін: /api/rooms, /__slow, /__flaky, ін'єкція збоїв
src/
├── main.js                # boot: loading → lobby → game
├── game.js                # одна партія: World + аудіо + HUD + меню респавну
├── assets/
│   ├── retry.js           # HttpError, BadJsonError, BadContentError, withRetry, backoff
│   └── loader.js          # fetchOk, fetchJson, loadJson, loadImage, loadAudio, loadAll
├── audio/audio.js         # AudioContext, decode, unlock по жесту, attach(world)
├── lobby/
│   ├── lobby.js           # class Lobby extends EventTarget — без DOM
│   └── lobby-view.js      # DOM лобі, лише слухає Lobby
├── ui/
│   ├── loading-screen.js  # прогрес-бар на канвасі, Cancel / Retry
│   ├── hud.js             # рахунок, «+20», спалах при влучанні — з подій
│   └── respawn-menu.js
├── puzzles.js             # 5 головоломок порядку виконання: `await __puzzles()`
└── sim/…                  # з Lab 02; жодного імпорту audio/HUD
tests/retry.test.mjs
```

## Пайплайн ассетів

**Що reject-иться, а що ні.** `fetch` відхиляє проміс лише тоді, коли відповіді немає зовсім: мережа, DNS, abort, таймаут. 404 і 500 — це нормальні відповіді (`response.ok === false`), тому `fetchOk` сам кидає `HttpError`. Тіло відповіді читається другим `await`, і вже там може вийти битий JSON (`BadJsonError`) або не той тип даних (`BadContentError`).

| Ситуація | Що відбувається у `fetch` | Наша помилка | Ретрай? |
| --- | --- | --- | --- |
| 404 / 403 | fulfilled, `ok: false` | `HttpError(404)` | ні: повтор нічого не змінить |
| 500 / 503 / 429 | fulfilled, `ok: false` | `HttpError(5xx)` | так |
| немає мережі / DNS | **rejected** `TypeError` | `TypeError` | так |
| таймаут `AbortSignal.timeout` | **rejected** | `TimeoutError` | так |
| гравець натиснув «Скасувати» | **rejected** | `AbortError` | ні, і зупиняємо все |
| 200, але JSON обрізаний | fulfilled; падає `JSON.parse` | `BadJsonError` | ні |
| 200, але HTML замість картинки | fulfilled | `BadContentError` | ні |

- **`withRetry(fn, { attempts, baseMs, signal })`** — експоненційний backoff з «equal jitter»: `cap = min(maxMs, baseMs·2^n)`, а затримка дорівнює `cap/2 + random·cap/2`. Jitter потрібен, щоб клієнти після спільного збою не повторювали запити одночасно. Пауза між спробами теж скасовується через `signal`. Тести в [tests/retry.test.mjs](tests/retry.test.mjs) перевіряють ретрай 5xx і мережі, відсутність ретраю на 4xx, битий JSON і неправильний вміст, ліміт спроб, abort посеред паузи та межі backoff.
- **`loadAll(manifest, { onProgress, signal, mode })`** — `Promise.all` над усіма файлами. Кожен проміс у `.then` збільшує лічильник `done` і викликає `onProgress`, тож прогрес-бар оновлюється по кожному файлу, а не стрибком у кінці. `Promise.all` сам не скасовує решту запитів, коли один падає, тому `loadAll` має власний `AbortController` і робить `abort()` у `catch`.
- **Обов'язкові та необов'язкові ассети.** `arenas.json` обов'язковий: без нього гри немає, і з'являється Retry. Спрайти й звуки необов'язкові: якщо котрийсь не завантажився, рендер малює векторні фігури з Lab 02, а звук просто мовчить. Лобі показує банер з тим, чого бракує.
- **Справжній 404.** За замовчуванням Vite (`appType: 'spa'`) відповідає на будь-який невідомий шлях `index.html` зі статусом 200, і відсутній спрайт виглядав би як «успіх». Тому у [vite.config.js](vite.config.js) стоїть `appType: 'mpa'`, а `loadImage` додатково перевіряє `blob.type`.

### Sequential vs concurrent

8 файлів (1 JSON, 3 SVG, 4 WAV) з `?latency=300` (кожна відповідь затримана на 300 мс), Chrome, dev-сервер:

| Режим | Запуск 1 | Запуск 2 |
| --- | --- | --- |
| `Promise.all` (concurrent) | 641 мс | 642 мс |
| `for … await` (`?seq=1`) | 2588 мс | 2565 мс |
| без затримки, concurrent | 47 мс | — |
| без затримки, sequential | 110 мс | — |

Послідовна версія коштує приблизно 8 × 300 мс, бо кожен `await` чекає, поки завершиться попередній запит. Паралельна мала б укластися в ~300 мс, але показує ~640. Причина в тому, що через HTTP/1.1 браузер відкриває не більше 6 з'єднань на один хост, тому 8 запитів ідуть двома хвилями: 6, а потім ще 2.

## Спрайти і звук

- Спрайтшити — це SVG з кількома кадрами. `drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)` вирізає кадр за прямокутником з `manifest.json` (`frames`). Для астероїдів є по 2 варіанти кожного розміру і окремі червоні «мисливці». Спрайти генерує `scripts/generate-sprites.mjs`, а звуки синтезує `scripts/generate-sounds.mjs` (PCM → WAV). Сторонніх файлів і ліцензій немає.
- **Web Audio**: `AudioContext` створюється одразу, але в стані `suspended`. `decodeAudioData` працює і на призупиненому контексті, тож звуки декодуються ще під час екрана завантаження. `resume()` викликається з першого `pointerdown`/`keydown` і з кліку «Join», бо браузер дозволяє запустити звук лише після жесту користувача. Кожен звук — це новий `AudioBufferSourceNode`, далі `GainNode`, `StereoPannerNode` (панорама залежить від x на арені) і master gain.
- **Шина подій.** `World` містить `events = new EventTarget()` (композиція), `emit(type, detail)` диспатчить `CustomEvent`. Симуляція шле `fired`, `hit`, `exploded`, `picked`, `score`, `died` і нічого не знає про слухачів: `grep import src/sim` не знаходить ні audio, ні HUD. `audio.attach(world)` і `createHud(world)` підписуються ззовні та повертають функції відписки, які `game.stop()` викликає при виході в лобі.

## Лобі

`class Lobby extends EventTarget` ([lobby.js](src/lobby/lobby.js)) не має DOM. Він шле події `loading`, `roomsChanged`, `error`, `joined`, `stopped`.

- `start()` створює `AbortController`, одразу викликає `refresh()`, а потім повторює його через `setInterval` кожні 3 с.
- Кожен запит має сигнал `AbortSignal.any([controller.signal, AbortSignal.timeout(2000)])`, тобто окремий таймаут і загальне скасування.
- `stop()` (Join, вихід з лобі) очищає інтервал і робить `abort()` запиту, який ще в дорозі. Такий abort не вважається помилкою: `refresh` перевіряє `signal.aborted` і нічого не показує.
- [lobby-view.js](src/lobby/lobby-view.js) лише рендерить список, ім'я (зберігається в `localStorage`), статус і кнопку Join. При помилці лобі не падає, а показує «✗ сервер не відповів вчасно — повтор за 3 с» і пробує знову на наступному тіку.
- `/api/rooms` віддає Vite-middleware ([server/dev-api.js](server/dev-api.js)), де кількість гравців змінюється кожні 4 с. У Lab 4 його замінить справжній сервер.

## Головоломки порядку виконання

Усі п'ять перевірені в Chrome: виклик `await __puzzles()` у консолі виводить фактичний порядок. Правило: спершу виконується синхронний код, далі **вся** черга мікрозадач (`.then`, продовження після `await`), і лише потім наступна задача (`setTimeout`) або кадр (`requestAnimationFrame`).

**1. `await` віддає керування навіть на синхронній функції**

```js
log('A')
async function f() { log('B'); await g(); log('C') }
async function g() { log('D') }
f()
Promise.resolve().then(() => log('E'))
log('F')
```

Вивід: `A, B, D, F, C, E`. `g()` виконується синхронно всередині `f()` (D), але `await` ставить продовження `C` у мікрочергу раніше, ніж туди потрапляє `.then` з `E`, і обидва виконуються вже після синхронного `F`.

**2. `setTimeout` всередині `.then`**

```js
setTimeout(() => log('T1'), 0)
Promise.resolve().then(() => {
  log('P1')
  setTimeout(() => log('T2'), 0)
  Promise.resolve().then(() => log('P2'))
})
log('S')
```

Вивід: `S, P1, P2, T1, T2`. Мікрозадача `P2`, додана під час виконання мікрозадачі, все одно виконується до будь-якого таймера. `T2` ставиться в чергу задач після `T1`.

**3. `requestAnimationFrame`**

```js
requestAnimationFrame(() => {
  log('raf 1')
  Promise.resolve().then(() => log('micro in raf'))
  setTimeout(() => log('timeout from raf'), 0)
})
requestAnimationFrame(() => log('raf 2'))
```

Вивід: `raf 1, micro in raf, raf 2, timeout from raf`. Після **кожного** rAF-колбека черга мікрозадач спорожнюється, а обидва колбеки виконуються в одному кадрі, ще до будь-якої нової задачі. Тому таймер іде останнім.

**4. Два ланцюжки чергуються**

```js
const p = Promise.resolve()
;(async () => { await p; log('A1'); await p; log('A2') })()
p.then(() => log('B1')).then(() => log('B2'))
```

Вивід: `A1, B1, A2, B2`. Кожен `await` або `.then` займає рівно один мікротік, тому два ланцюжки йдуть «через одного», а не один після іншого.

**5. `return promise` з `async` коштує два зайві тіки**

```js
async function one() { return 1 }
async function wrapped() { return Promise.resolve(2) }
wrapped().then((v) => log(`wrapped ${v}`))
one().then((v) => log(`one ${v}`))
Promise.resolve().then(() => log('x')).then(() => log('y')).then(() => log('z'))
```

Вивід: `one 1, x, y, wrapped 2, z`. Хоча `wrapped()` викликано першим, повернення thenable з `async` вимагає двох додаткових мікрозадач (PromiseResolveThenableJob і внутрішній `.then`), тож він обганяє лише `z`.

## Галерея збоїв

Кожен сценарій перевірено в браузері. Гра ніколи не падає: або стартує без ассета, або показує кнопку «Повторити». Нижче наведено фактичний вивід (консоль і стан екрана).

**404 спрайта** (`?fail=404`)

```text
sprites/fx | HttpError | HTTP 404 Not Found for http://localhost:5175/assets/sprites/fx-missing.svg
лобі: «Деякі ассети не завантажились — гра працює без них: sprites/fx: HTTP 404»
```

Ретраю не було, бо це 4xx. Кулі та pickup-и малюються векторами з Lab 02.

**Таймаут мережі** (`?fail=timeout`)

```text
екран: ↻ sounds/explosion   retry 1 after timeout · wait ~150 ms
[assets] concurrent: 3 sprites, 3 sounds in 8210 ms
sounds/explosion | TimeoutError | signal timed out
```

Було 3 спроби по 2.5 с плюс backoff, після чого гра стартувала без звуку вибуху. Решта 7 файлів завантажилась паралельно одразу, і повільний файл їх не затримав.

**Abort посеред завантаження** (`?fail=abort`, або кнопка «Скасувати»)

```text
[assets] load failed: AbortError: loading cancelled by the player
екран: «Завантаження скасовано», ✗ sounds/explosion cancelled, ✗ sounds/pickup cancelled, кнопка «Повторити»
після «Повторити»: лобі відкрилось, failures: 0
```

Abort не ретраїться: `isRetryable` перевіряє `signal.aborted`. Запити, які ще були в дорозі, скасовані через внутрішній контролер `loadAll`.

**Битий JSON** (`?fail=badjson`)

```text
[assets] load failed: BadJsonError: Invalid JSON in http://localhost:5175/assets/arenas-broken.json:
  Unterminated string in JSON at position 160 (line 8 column 26)
екран: «Не вдалося завантажити обов'язкові файли», ✗ data/arenas bad JSON · required, кнопка «Повторити»
```

Ретраю не було, бо той самий файл зламається так само. `arenas.json` обов'язковий, тому `Promise.all` відхиляється одразу, а решта запитів скасовується.

**Нестабільний сервер** (`?fail=flaky`)

```text
екран: ↻ sprites/ships   retry 1 after HTTP 503 · wait 216 ms
[assets] concurrent: 3 sprites, 4 sounds in 591 ms   (failures: 0)
```

Тут ретрай врятував ситуацію: дві відповіді 503, третя спроба успішна.

**Лобі** (`?lobby=…`)

```text
?lobby=timeout  → ✗ сервер не відповів вчасно (timeout) — повтор за 3 с
?lobby=500      → ✗ сервер повернув 500 — повтор за 3 с
?lobby=badjson  → ✗ сервер повернув зламаний JSON — повтор за 3 с
```

Retry в усіх цих випадках повторює завантаження **без** `?fail`: збої навмисно одноразові, щоб показати відновлення. У реальному житті Retry просто повторює ті самі запити.

## Що лишилось з Lab 01–02

Модель сутностей (`World` над `Map`, `Ship extends Entity`, колізії, homing/pickup як компоненти) і цикл з фіксованим кроком не змінились. Експерименти Lab 01 (`?exp=…`) і демо бага з `this` лишились у версії Lab 02, щоб не заважати новому порядку запуску (loading → лобі → гра).
