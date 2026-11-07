# Car Wash POS — Backend (Next.js API)

سیستم فروشات موتر شویی مدرن · REST API on Next.js (App Router) + SQLite.
Only 4 runtime dependencies: `next`, `react`, `react-dom`, `better-sqlite3`.

## What's included
- **The POS screen** (`public/index.html`, Dari / Solar Hijri) is served at `/` and talks to this API — everything is saved in SQLite.
- **The REST API** under `/api/*` (below).

## Run

```bash
npm install
cp .env.example .env.local      # set AUTH_SECRET (openssl rand -hex 32)
npm run dev                     # open http://localhost:3000  (API health: /api/health)
npm test                        # business-logic tests (needs Node 22+)
```
Production: `npm run build && npm start` with `AUTH_SECRET` set (and `COOKIE_SECURE=true` behind HTTPS).
The database file is created automatically at `./data/carwash.db` (change with `DATABASE_PATH`). **Back this file up.**

## Auth
First run: `POST /api/auth/setup` creates the admin (only works once). Then `POST /api/auth/login`.
A session is an HttpOnly cookie (`cw_token`, 12 h); `Authorization: Bearer <token>` also works. Changing the password
invalidates old sessions. 5 failed logins lock that user+IP for 30 s. Passwords are hashed with scrypt.
If the POS page is hosted on a different origin, set `ALLOWED_ORIGIN` (CORS with credentials) — or simply serve the page from this app's `public/` folder.

Errors are always `{ "error": { "code": "...", "message": "پیام دری" } }` with a proper HTTP status.

## Endpoints (all need login unless marked public)
| Area | Method & path | Notes |
|---|---|---|
| Snapshot | `GET /api/state` | everything the POS screen needs in one call |
| Health | `GET /api/health` | public |
| Auth | `GET /api/auth/status` · `POST /api/auth/setup` · `POST /api/auth/login` | public. body `{name,username,password}` / `{username,password}` |
| | `POST /api/auth/logout` · `GET /api/auth/me` · `POST /api/auth/password` | password: `{currentPassword,newPassword}` |
| Settings | `GET/PUT /api/settings` | `{biz,addr,tel}` |
| | `GET /api/vehicle-classes` | fixed: bike (موترسایکل), rickshaw (ریکشا), sedan (موتر) |
| Price list | `GET/PUT /api/catalog` | PUT replaces all: `{categories:[{name,emoji,items:[{name,price}]}]}` |
| Bills (bays) | `GET/POST /api/bays` · `GET/DELETE /api/bays/:id` | POST `{name,kind:'wash'\|'detail'}`; delete only when free |
| | `POST /api/bays/:id/checkin` | `{cls,plate?}` → assigns bill number |
| | `PUT /api/bays/:id/vehicle` · `PUT/DELETE /api/bays/:id/customer` | customer `{first,last,phone}` |
| | `POST /api/bays/:id/items` · `PATCH/DELETE /api/bays/:id/items/:itemId` | `{name,price,qty?}` / `{qty}` |
| | `PUT /api/bays/:id/order` | save the whole order screen: `{items:[{name,price,qty}],discount,vehicle:{cls,plate}}` |
| | `PUT /api/bays/:id/discount` · `POST /api/bays/:id/complete` · `POST /api/bays/:id/cancel` | discount `{amount}` |
| | `POST /api/bays/:id/pay` | `{amount?}` omit = full. Less than total = rest becomes a **due** (customer required) |
| Receipts | `GET /api/payments?date=YYYY-MM-DD` · `GET /api/payments/:id` | day = Asia/Kabul business day |
| Customers | `GET /api/customers?q=` | search by name/phone |
| Dues (باقیات) | `GET /api/dues` · `POST /api/dues/:invoiceNo/pay` | pay `{amount}` |
| Expenses | `GET/POST /api/expenses` · `PUT/PATCH/DELETE /api/expenses/:id` | `{title,date?,amount,type,description?}`; `?from=&to=` |
| | `GET/POST /api/expense-types` · `DELETE /api/expense-types/:id` | a new type used in an expense is created automatically |
| Investors | `GET/PUT /api/investors` · `GET /api/investors/share?year=1405&month=8` | PUT replaces `{investors:[{name,share,amount}]}` |
| Reports | `GET /api/reports/daily?date=` | |
| | `GET /api/reports/monthly?year=1405&month=8` · `GET /api/reports/yearly?year=1405` | **Solar Hijri** year/month (Afghan month names) |

Dates in requests/responses are Gregorian `YYYY-MM-DD` (storage format); responses also include `jalaliDay` (`1405/08/11`).

## Example
```bash
curl -c jar -H 'content-type: application/json' -d '{"name":"مجتبی کوهی","username":"mojtaba","password":"secret123"}' localhost:3000/api/auth/setup
curl -b jar -X POST -H 'content-type: application/json' -d '{"cls":"sedan","plate":"کرولا"}' localhost:3000/api/bays/1/checkin
curl -b jar -X POST -H 'content-type: application/json' -d '{"name":"پالش و موم","price":500}' localhost:3000/api/bays/1/items
curl -b jar -X POST -H 'content-type: application/json' -d '{}' localhost:3000/api/bays/1/pay
curl -b jar localhost:3000/api/reports/daily
```

## Layout
`src/app/api/**/route.js` thin HTTP handlers → `src/lib/services/*` (all business rules, unit-tested) → `src/lib/schema.js` (SQLite schema + seed data).
