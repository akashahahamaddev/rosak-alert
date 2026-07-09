# 🛠️ RosakAlert

Sistem laporan kerosakan ringkas untuk institusi pengajian. Pelajar snap gambar
kerosakan + isi lokasi, sistem urus & pantau mengikut bangunan secara automatik.

## Teknologi
- **Backend:** Node.js + Express + SQLite (`better-sqlite3`)
- **Frontend:** Vue 3 (via CDN, tiada langkah build)
- **Upload gambar:** Multer

## Jalankan

```bash
npm install
npm start
```

Buka http://localhost:3000

- `/` — borang laporan pelajar (mobile-friendly, snap gambar terus)
- `/admin.html` — panel pentadbir (senarai, tapis, kemas kini status, ringkasan ikut lokasi)

Untuk pembangunan dengan auto-reload: `npm run dev`

## API

| Kaedah | Laluan | Fungsi |
|--------|--------|--------|
| POST | `/api/reports` | Hantar laporan baru (multipart: `photo` + medan lokasi) |
| GET | `/api/reports?status=&building=` | Senarai laporan (boleh ditapis) |
| GET | `/api/stats` | Ringkasan ikut status & bangunan |
| PATCH | `/api/reports/:id` | Kemas kini status (`baru` / `dalam_proses` / `selesai`) |

## Data
- Pangkalan data SQLite disimpan dalam `data.db` (dicipta automatik).
- Gambar disimpan dalam folder `uploads/`.

## Nota keselamatan (untuk penambahbaikan)
Panel `/admin.html` belum ada log masuk. Untuk pengeluaran (production), tambah
pengesahan pentadbir sebelum guna secara terbuka.
