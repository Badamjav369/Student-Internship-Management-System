# Student Internship Management System (SIMS)

Оюутны дадлагын нэгдсэн удирдлагын веб систем. МУИС-ийн үйлдвэрлэлийн дадлагын бүх шатыг нэг дор удирдана: байгууллага сонгох, гурван талт гэрээ, ажлын төлөвлөгөө, дадлагын дэвтэр, тайлан, хамгаалалт, дүн.

Бакалаврын судалгааны ажил. **Ажиллаж буй хувилбар:** https://sims.badamjav070.workers.dev

| | |
|---|---|
| Дүр | 7: оюутан, удирдагч багш, дадлага удирдагч, байгууллагын төлөөлөгч, комиссын гишүүн, тэнхмийн эрхлэгч, админ |
| Frontend | HTML, CSS, JavaScript (ES modules), Web Components. Framework, bundler хэрэггүй |
| Backend | Cloudflare Workers, D1 (SQLite), R2 (файл) |
| Хэмжээ | 32 хүснэгт, 155 API үйлдэл, 1 227 автомат шалгалт |

## local орчинд турших

Хэрэгтэй зүйл: **Node.js 22.13+** (`node --version`) ба Git. Сан суулгах, Docker, акаунт хэрэггүй.

```bash
git clone https://github.com/Badamjav369/Student-Internship-Management-System.git
cd Student-Internship-Management-System
npm run dev
```

Хөтчөөр **http://localhost:5173** нээж, доорх демо хэрэглэгчээр нэвтэрнэ. Өгөгдөл `.data/` хавтаст хадгалагдана. Өгөгдлийг эхний төлөвт нь буцаах: `npm run dev:reset`.

Локалд Cloudflare-ийн оронд Node-ийн SQLite ашиглана, backend код нь Cloudflare дээрхтэй яг ижил. Урилга, нууц үг сэргээх холбоос зэрэг и-мэйл явуулахгүй, терминалд хэвлэгдэнэ.

### Демо хэрэглэгчид

Нууц үг бүгдэд `q123456`.

| Дүр | Хаяг |
|---|---|
| Админ | `admin@gmail.com` |
| Тэнхмийн эрхлэгч | `head@gmail.com` |
| Удирдагч багш | `supervisor1@gmail.com` … `supervisor5@gmail.com` (`supervisor1`–`4` нь комиссын гишүүн ч мөн) |
| Оюутан | `student1@gmail.com` … `student18@gmail.com` |
| Дадлага удирдагч | `mentor1@gmail.com` |
| Байгууллагын төлөөлөгч | `org1@gmail.com` |

Хоёр дүрийг зэрэг харахдаа хоёр хөтөч (эсвэл Incognito цонх) ашиглана. Удирдагч багш нэвтэрсний дараа хэрэглэгчийн цэснээс «Комиссын гишүүн» дүрд шилжинэ.

**Туршиж үзэх дамжлага:** `student9` гэрээний скан байршуулна → `head` баталгаажуулна → `student9` төлөвлөгөө илгээнэ → `mentor1` батална → `student9` дэвтэр бичнэ → `mentor1` хянана.

## Боломжууд

- **Улирал:** админ хугацаа, үнэлгээний шалгуур, загвар файлыг тохируулж улирлыг нээж, хаана.
- **Байгууллага ба газар сонголт:** байгууллага зар нийтэлнэ, оюутан өргөдөл өгнө эсвэл өөрөө газар санал болгоно. Админ болон эрхлэгч шийднэ.
- **Гурван талт гэрээ:** цаасан (скан), дэлгэц дээр зурсан эсвэл и-мэйл кодоор баталгаажуулна. Гэрээний хэш, цаг хадгалагдаж, HMAC-ээр лацлагдана.
- **Дадлагын явц:** ажлын төлөвлөгөө, өдөр тутмын дэвтэр, дадлага удирдагчийн хяналт, тайлан.
- **Хамгаалалт ба дүн:** комиссын хуваарь, гишүүн бүрийн оноо, байгууллагын үнэлгээ (10 + 45 + 45 = 100), эцсийн дүн, дүнгийн хуудас (хэвлэх, CSV/Excel). Оноо оруулсан хүн өөрөө батлахгүй.
- **Бусад:** мэдэгдэл, Excel-ээр оюутан бөөнөөр оруулах, байгууллага өөрөө бүртгүүлэх, нэгтгэл тайлан, гар утасны харагдац, гэрэл/харанхуй горим.

## Кодыг хаанаас үзэх вэ

| Сонирхол | Файл |
|---|---|
| Өгөгдлийн сангийн бүтэц (3NF, CHECK хязгаарлалт) | `migrations/0001_core.sql` |
| Дадлагын төлөв, шилжилтийн дүрэм | `server/modules/` (дүр бүрд нэг хавтас), `server/modules/access.js` |
| Нэвтрэлт, нууц үг, session | `server/modules/auth.js`, `server/lib/` |
| Гэрээний гарын үсэг, лац | `server/modules/contracts.js` |
| UI-ийн дахин ашиглах Web Components | `src/js/components/` |
| Дүр бүрийн хуудас | `src/js/pages/<дүр>/` |
| Автомат тест | `tests/e2e/` |

## Хавтасны бүтэц

```
index.html, favicon.svg   Нэг хуудасны апп (SPA)
dev-server.mjs            Локал сервер (UI + backend)
src/
  styles/                 CSS: primitive → semantic → brand → components → pages (@layer)
  js/
    main.js, routes.js    Эхлэл, маршрут (hash router)
    core/, components/    Туслахууд, дахин ашиглах UI (Web Components)
    data/                 Backend-ийн API дуудлага (дүр бүрд нэг файл)
    pages/<дүр>/          Дүр бүрийн хуудас
server/
  index.js                Worker: /api/* маршрут, бусад нь статик файл
  lib/                    Нууц үг, session, шалгалт, файл, и-мэйл, Excel уншигч
  modules/<дүр>/          Дүр бүрийн API
migrations/               D1 өгөгдлийн сангийн бүтэц
scripts/                  Байршуулалт, демо өгөгдөл, шалгалтууд
tests/                    Playwright тестүүд
wrangler.toml             Cloudflare тохиргоо
```

## Тест

```bash
npm run check                                                  # статик шалгалт (синтакс, import), хэдхэн секунд
npm i --no-save playwright && npx playwright install chromium  # нэг удаа
npm test                                                       # бүх тест (~15 минут)
node tests/run.mjs student-flow                                # нэг тест
```

Хөтчийг нүдээр харж ажиллуулах: `HEADED=1 node tests/run.mjs student-flow` (PowerShell: `$env:HEADED=1; node tests/run.mjs student-flow`).

Тест нь дүр бүрийн ажлын урсгал (API + хөтөч) болон бүх дэлгэцийг 1280/390 px өргөнд, гэрэл/харанхуй горимд шалгана. Тест бүрийн өмнө демо өгөгдөлтэй локал сервер (порт 5174) шинээр асна.

## Түгээмэл асуудал

- **`node:sqlite` эсвэл `--watch-path` алдаа:** Node хувилбар хуучин байна. 22.13 буюу түүнээс дээш хувилбар суулгана.
- **Порт 5173 завгүй:** `PORT=5180 npm run dev` (PowerShell: `$env:PORT=5180; npm run dev`).
- **Өгөгдөл эвдэрсэн, төлөв будилсан:** `npm run dev:reset`.

## Cloudflare дээр байршуулах (заавал биш)

Локалд ажиллуулахад шаардлагагүй. Хэрэгтэй зүйл: Cloudflare бүртгэл, Dashboard дээр **R2** идэвхжүүлсэн (карт бүртгэнэ, 10 GB үнэгүй).

```bash
npm run cf:setup     # wrangler суулгах, нэвтрэх, D1, R2 үүсгэх, migration, өгөгдөл, deploy, SIGNING_SECRET
npm run cf:deploy    # дараагийн шинэчлэлт: шалгалт → migration → deploy
npm run cf:smoke -- https://<worker>.<account>.workers.dev   # байршуулсан сайтыг шалгах
npm run cf:logs      # Worker-ийн log
```

`cf:setup` дахин ажиллуулахад аюулгүй, хийгдсэн алхмыг алгасна. Өгөгдлийг **демо** (туршилтад) эсвэл **зөвхөн админ** (бодит ашиглалтад) гэж сонгоно.

### Тохиргоо

| Нэр | Төрөл | Тайлбар |
|---|---|---|
| `SIGNING_SECRET` | secret | Гэрээний гарын үсгийн баталгаа. Заавал. Нэг удаа өгөөд солихгүй |
| `MAIL_API_KEY` | secret | [Resend](https://resend.com) API түлхүүр. Байхгүй бол и-мэйл явахгүй, log-д бичигдэнэ |
| `MAIL_FROM` | var | Илгээгчийн хаяг. Resend-д баталгаажуулсан домэйнтой байх ёстой |
| `PASSWORD_ITERATIONS` | var | `50000` (Workers Free), `100000` (Workers Paid) |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET` | var, secret | Байгууллага бүртгүүлэх маягтын CAPTCHA (заавал биш) |

Secret-ийг `npx wrangler secret put <НЭР>`-ээр өгнө, `wrangler.toml`-д бичихгүй. Өөрийн домэйн холбохдоо `wrangler.toml`-ийн `[[routes]]` хэсгийг идэвхжүүлнэ.

### Өгөгдлийг шинэчлэх

Бүх өгөгдлийг устгаад демо өгөгдлөөр солих:

```bash
node scripts/seed.mjs --wipe --file .data/reseed.sql
npx wrangler d1 execute pm2-db --remote --file .data/reseed.sql
```

Бодит ашиглалтад зөвхөн анхны админ үүсгэх: `node scripts/seed.mjs --admin <и-мэйл> <нууц үг> > admin.sql`.

## Аюулгүй байдал

- Нууц үг PBKDF2-SHA256, session нь HttpOnly cookie.
- Буруу нууц үгийг 5 удаа оруулбал 15 минут түгжинэ.
- 5 минут идэвхгүй бол систем автоматаар гаргана (хөтөч болон сервер хоёулаа).
- Өөрчлөх хүсэлт бүр CSRF толгойтой, эрх нь маршрут бүр дээр шалгагдана.
- Файлыг татахад эрх шалгагдана.
- И-мэйл кодоор байгуулсан гэрээ нь хуулийн тоон гарын үсэг биш. Албан ёсны хувилбарт цаасан гэрээг ашиглана.
