# HargaPangan API
 
Backend untuk aplikasi **HargaPangan**: memantau harga sembako, menemukan pasar terdekat, melihat jadwal pasar murah, dan menerima laporan harga dari warga. Dibangun dengan Node.js, Express, TypeScript, Prisma, dan PostgreSQL (Supabase).
 
- Demo: `<isi link demo>`
- API: `<isi URL backend>/api/v1`
- Frontend: `<isi link repo frontend>`
## Fitur
 
- Ringkasan harga hari ini beserta tren naik/turun mingguan
- Riwayat harga 7 dan 30 hari per komoditas
- Pasar terdekat berdasarkan koordinat, lengkap dengan harga dan status buka
- Daftar lokasi per komoditas, diurutkan dari yang termurah
- Jadwal pasar murah
- Laporan harga dari warga, dengan validasi rentang wajar dan pembatasan frekuensi
## Sumber Data dan Transparansi
 
| Data | Sumber | Label di aplikasi |
| --- | --- | --- |
| Harga acuan kota | PIHPS Nasional, Bank Indonesia | Harga acuan kota (PIHPS BI) |
| Harga per pasar | Estimasi dari harga acuan dikali faktor jenis lokasi | Estimasi |
| Harga laporan warga | Laporan pengguna | Laporan warga |
| Lokasi pasar | OpenStreetMap | - |
| Event pasar murah | Data contoh untuk demo | Berawalan `[Contoh]` |
 
Harga per pasar yang berlabel **Estimasi** bukan hasil survei. Laporan warga memakai median laporan 72 jam terakhir. Data peta: © kontributor OpenStreetMap (ODbL).
 
## Persyaratan
 
- Node.js 22 atau lebih baru
- npm 10 atau lebih baru
- Project Supabase (PostgreSQL)
## Menjalankan Secara Lokal
 
```bash
git clone <url-repo>
cd backend
npm install
cp .env.example .env     # PowerShell: Copy-Item .env.example .env
```
 
Isi `.env` (jangan pernah di-commit):
 
| Variabel | Keterangan |
| --- | --- |
| `DATABASE_URL` | Supabase transaction pooler, port 6543 |
| `DIRECT_URL` | Supabase session pooler, port 5432 (dipakai migrasi) |
| `CORS_ORIGIN` | Origin frontend, pisahkan dengan koma. Default `http://localhost:5173` |
| `PORT` | Opsional, default 3000 |
| `NODE_ENV` | `development` atau `production` |
 
Password database yang berisi karakter khusus (`@`, `#`, `/`, `:`) harus di-URL-encode.
 
Siapkan database dan data awal:
 
```bash
npx prisma migrate dev --name init   # buat tabel
npm run seed                          # isi data
npm run dev
```
 
Server berjalan di `http://localhost:3000`. Cek dengan `curl http://localhost:3000/api/v1/health`.
 
> **Peringatan:** `npm run seed` mengosongkan semua tabel (termasuk laporan warga) lalu mengisi ulang dari awal. Jangan dijalankan di database yang sudah berisi laporan asli.
 
### Data seed
 
Seed membaca dua file di `prisma/data/`:
 
- `pihps.csv`: kolom `commodity,unit,date,price`
- `osm-markets.json`: hasil Overpass API untuk pasar dan supermarket
Seed mengisi 10 komoditas, pasar tradisional dan supermarket dari OSM, harga PIHPS, harga estimasi per pasar, dan beberapa event contoh.
 
## Scripts
 
| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server dev dengan auto-reload (tsx) |
| `npm run build` | `prisma generate` lalu kompilasi TypeScript ke `dist/` |
| `npm start` | Menjalankan hasil build |
| `npm run seed` | Mengisi database (menghapus data lama) |
| `npm test` | Menjalankan unit test (Vitest) |
| `npm run lint` | Cek lint |
| `npm run format` | Format kode dengan Prettier |
 
## Endpoint
 
Base URL: `/api/v1`. Semua respons berbentuk `{ "success": true, "data": ... }`, atau `{ "success": false, "error": { "code", "message", "details" } }` saat gagal.
 
| Method | Path | Fungsi |
| --- | --- | --- |
| GET | `/health` | Cek status server |
| GET | `/prices/summary` | Harga hari ini, `topRisers`, `topFallers` |
| GET | `/commodities` | Daftar komoditas |
| GET | `/commodities/:id` | Detail komoditas dan harga acuan |
| GET | `/commodities/:id/history?days=7\|30` | Riwayat harga dengan min, max, rata-rata |
| GET | `/commodities/:id/markets` | Harga per lokasi, termurah dulu |
| GET | `/markets/nearby?lat=&lon=&radius=` | Pasar terdekat dengan `topPrices` dan `isOpenNow` |
| GET | `/markets/:id` | Detail pasar dan semua harganya |
| GET | `/events` | Jadwal pasar murah |
| GET | `/events/:id` | Detail event |
| POST | `/reports` | Kirim laporan harga warga |
 
Spesifikasi lengkap ada di dokumen *API Contract: HargaPangan v1*.
 
### Aturan laporan harga
 
`POST /reports` dengan body `{ "marketId": 1, "commodityId": 1, "price": 85000 }`.
 
| Status | Kode | Penyebab |
| --- | --- | --- |
| 201 | - | Laporan tersimpan |
| 400 | `VALIDATION_ERROR` | Format salah atau harga di bawah 100 |
| 422 | `PRICE_OUT_OF_RANGE` | Harga di luar 50%-200% dari harga acuan kota |
| 429 | `RATE_LIMITED` | Lebih dari 5 request per jam dari satu IP |
 
## Struktur Proyek
 
```
prisma/
├── schema.prisma     # Model database
├── seed.ts           # Data awal
└── data/             # pihps.csv, osm-markets.json
src/
├── app.ts            # Setup Express
├── index.ts          # Entry point
├── routes/           # Definisi route
├── controllers/      # Handler request
├── services/         # Logika bisnis dan query
├── algorithms/       # trend, median, geo, jam buka
├── middlewares/      # Error handler, rate limit
├── config/           # Env dan koneksi Prisma
└── utils/            # Helper (response, validasi, tanggal)
tests/                # Unit test
```
 
## Deploy (Render atau Railway)
 
| Setting | Isi |
| --- | --- |
| Branch | `main` |
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Environment | `DATABASE_URL`, `DIRECT_URL`, `NODE_ENV=production`, `CORS_ORIGIN=<url frontend>` |
 
Catatan:
 
- Jangan isi `PORT`, platform mengisinya sendiri.
- Aplikasi memakai `trust proxy` agar rate limit membaca IP pengguna dengan benar di balik proxy.
- Paket gratis bisa "tidur" saat tidak dipakai. Buka `/api/v1/health` beberapa menit sebelum demo.
## Alur Git
 
1. Jangan push langsung ke `main`.
2. Buat branch per tugas: `feat/<nama>`, `fix/<nama>`, `chore/<nama>`.
3. Buka Pull Request, tunggu CI hijau, dan minta minimal satu review.
4. Format commit: `feat:`, `fix:`, `chore:`, `docs:`.
```bash
git checkout main
git pull origin main
git checkout -b feat/nama-fitur
```