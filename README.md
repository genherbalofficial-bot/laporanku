# ModalCalc — Auto-Fill Harga Modal

Aplikasi web untuk upload laporan pesanan Shopee & TikTok yang otomatis mengisi
harga modal (COGS) berdasarkan varian produk (15ml, 30ml, 60ml, dll).

## Fitur

- **Upload Excel** — drag & drop file `.xlsx` dari Shopee atau TikTok
- **Deteksi varian otomatis** — mencari pola volume (15ml, 30ml, 60ml) di kolom
  Variasi → SKU → Nama Produk → default 30ml
- **Ringkasan keuangan** — total pendapatan, modal, dan laba
- **Export Excel** — download hasil dengan kolom modal sudah terisi
- **Riwayat upload** — semua laporan tersimpan di database
- **Pengaturan modal** — kelola harga modal per varian
- **Tanpa login** — single-user, langsung pakai

## Deploy ke Netlify

### Cara 1: Drag & Drop

1. Jalankan `npm install && npm run build` di komputer Anda
2. Folder `dist/` akan terbentuk
3. Drag folder `dist/` ke https://app.netlify.com/drop

### Cara 2: Git + Netlify (otomatis)

1. Push kode ini ke GitHub
2. Login ke Netlify → "Add new site" → "Import an existing project"
3. Pilih repo GitHub Anda
4. Netlify akan otomatis membaca `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Tambahkan environment variables di Netlify:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Klik **Deploy**

> **Penting:** Environment variables Supabase (`VITE_SUPABASE_URL` dan
> `VITE_SUPABASE_ANON_KEY`) harus ditambahkan di Netlify dashboard
> (Site settings → Environment variables) agar aplikasi bisa terhubung
> ke database. File `.env` tidak ikut terbawa ke Git (sudah di-gitignore).

## Pengembangan Lokal

```bash
npm install
npm run dev
```

## Teknologi

- Vite + React + TypeScript
- Tailwind CSS
- Supabase (database)
- xlsx (parsing Excel)
- lucide-react (ikon)
