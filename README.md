# E-Voting OSIS SMADA 2026

Website pemilihan Ketua dan Wakil Ketua OSIS SMA Negeri 2 Sangatta Utara.

## Fitur

- Dashboard hasil polling real time dengan refresh otomatis setiap 1 menit.
- Persentase partisipasi Kelas 10, Kelas 11, Kelas 12, serta Guru dan Tenaga Kependidikan.
- Halaman bilik suara `/vote` dengan login NISN/NIP.
- Admin backend tersembunyi di `/admin-smada-2026`.
- Admin bisa mengelola pemilih, reset hak pilih, invalidasi suara, mengganti kandidat/foto, dan mengubah running text.
- Desain modern warna merah, putih, abu-abu, hitam, menggunakan font Google Sans fallback.

## Data pemilih

File Excel terlampir sudah diproses menjadi SQL seed dengan 873 pemilih.

## Setup Supabase

1. Buat project Supabase.
2. Buka SQL Editor.
3. Jalankan `supabase/schema-and-seed.sql`.
4. Ambil Project URL, publishable key, dan service role key.
5. Masukkan ke environment variables Vercel.

## Environment Variables

Lihat `.env.example`.

> Jangan pernah memasukkan `SUPABASE_SERVICE_ROLE_KEY` ke variable `NEXT_PUBLIC_*` karena itu rahasia server.

## Link penting

- Halaman utama: `/`
- Bilik suara: `/vote`
- Backend admin: `/admin-smada-2026`

## Deploy Vercel

Hubungkan repo GitHub ke Vercel atau gunakan Vercel CLI. Pastikan semua env vars sudah terisi sebelum production deploy.
