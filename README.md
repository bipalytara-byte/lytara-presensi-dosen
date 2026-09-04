# LYTARA Remastered v2.0

**Layanan Tracking Aktivitas dan Realisasi Akademik** — STMIK Bina Patria Magelang

Aplikasi pencatatan pelaksanaan perkuliahan oleh dosen: kapan kuliah dimulai,
kapan selesai, dengan moda apa dilaksanakan, dan apakah jumlah pertemuannya
terpenuhi. Yang dicatat adalah aktivitas **dosen**, bukan kehadiran mahasiswa
(presensi mahasiswa tetap di SIAKAD).

- Aplikasi: <https://mylytara.my.id>
- Panduan untuk pengguna non-teknis: `Panduan_Lytara.docx`

---

## Daftar isi

- [Arsitektur](#arsitektur)
- [Tiga model kelas](#tiga-model-kelas)
- [Struktur berkas](#struktur-berkas)
- [Struktur data](#struktur-data)
- [Dua nomor versi](#dua-nomor-versi)
- [Cara deploy](#cara-deploy)
- [Pekerjaan rutin tiap semester](#pekerjaan-rutin-tiap-semester)
- [Pengujian](#pengujian)
- [Masalah umum](#masalah-umum)
- [Utang teknis](#utang-teknis)

---

## Arsitektur

```
Browser (GitHub Pages, domain mylytara.my.id)
        │  fetch → /exec
        ▼
Google Apps Script (proyek standalone "LYTARA Backend V10")
        │  SpreadsheetApp.openById()
        ▼
Google Spreadsheet (database aktif + arsip semester lalu)
```

Tiga hal yang perlu diketahui sejak awal:

**Script berdiri sendiri.** Sejak V10 script tidak lagi menempel di
spreadsheet. Database dibuka lewat `openById()`, dan ID-nya ada di
`DB_ID_AKTIF` pada baris ~40 `Kode_GS_V10.gs`. Nilai itu hanya cadangan —
yang dipakai sehari-hari adalah ID di Script Properties (`DB_ID`) hasil
rollover lewat UI.

**Ada cache 3 menit.** `CacheService` menyimpan hasil baca agar ringan.
Semua penulisan lewat aplikasi membersihkan cache sendiri. Perubahan yang
dilakukan **langsung di spreadsheet** tidak, jadi butuh tombol
*Muat Ulang dari Spreadsheet* di Pengaturan.

**Ada warmer.** Trigger tiap 5 menit menjaga instance GAS tetap hangat
(07.00–17.00, Jumat–Sabtu sampai 22.00). Tanpa ini, permintaan pertama tiap
pagi lambat sekali. Pasang dengan `pasangWarmer()`.

---

## Tiga model kelas

Banyak aturan di dalam kode hanya masuk akal setelah memahami ini.

| Model | Total | Tatap muka | Ujian | Penjadwalan |
|---|---|---|---|---|
| Reguler | 16 | 14 | UTS + UAS | Jam tetap tiap minggu |
| Paralel | 8 | 7 | UAS saja | Jam tetap, dua batch per semester |
| Flex | 16 | 14 | UTS + UAS | Jam ditetapkan dosen tiap minggu |

Dua kolom yang membedakannya di sheet `Jadwal`:

- `tipe` → `reguler` | `paralel` (menentukan jumlah pertemuan)
- `polaJadwal` → `tetap` | `flex` (menentukan cara jam ditentukan)

Konsekuensi yang mudah terlewat:

- **Paralel tidak punya UTS.** Batch 1 berakhir di minggu UTS, batch 2 di
  minggu UAS — keduanya dicatat sebagai `UAS`. Lihat `tentukanJenisPertemuan()`.
- **Paralel tidak boleh flex.** Ditolak di importer maupun form.
- Kelas paralel ditentukan otomatis dari hari & jam saat impor: Jumat ≥ 16:30
  atau Sabtu ≥ 14:00. Ambangnya dapat diubah di sheet `Pengaturan`
  (`ambangParalelJumat`, `ambangParalelSabtu`).

### Flex Class

- Satu blok per minggu per jadwal, disimpan di sheet `Flex_Blok`.
- Ditetapkan paling lambat **H-1**; sesudah lewat hanya admin yang bisa mengubah.
- Nomor minggu dihitung dari `tglMulaiKuliah`, bukan dari urutan input.
- Moda **Sumbu A** dan metode **Sumbu B** wajib diisi (khusus flex).
- `Kompensasi Asinkronus` dibatasi **5×** per jadwal — hanya untuk minggu kuliah.
- Minggu ujian memakai moda tersendiri (`MODA_UJIAN`) dan tidak memakan kuota itu.

---

## Struktur berkas

```
index.html              halaman utama (semua tampilan & modal)
style.css               tema: navy #185fa5, hijau #639922
hrd.html                halaman HRD (berdiri sendiri)
leaderboard.html        papan peringkat
leaderboard-tv.html     papan peringkat untuk layar TV
Kode_GS_V10.gs          seluruh backend Apps Script
Panduan_Lytara.docx     panduan pengguna non-teknis

js/
  config.js             konstanta, state global, get/post/postBesar
  helpers.js            utilitas kecil, tutupPaksa
  auth.js               login, sesi, muat data awal, cek versi backend
  hadir.js              presensi mulai & selesai
  ganti.js              jadwal pengganti + kelola dosen & jadwal
  maju.js               jadwal maju
  flex.js               Flex Class
  manual.js             presensi manual darurat
  mk.js                 master mata kuliah
  monitoring.js         dashboard admin + kartu Pengaturan Sistem
  report.js             laporan, leaderboard, export Excel
  export-yayasan.js     Laporan Yayasan (BAB I–VI)
  rapor.js              rapor dosen
  notif.js              notifikasi & libur nasional
  beranda.js            beranda + navigasi halaman
```

> Tanpa bundler. Semua fungsi berada di lingkup global dan urutan
> `<script>` di `index.html` menentukan siapa menimpa siapa. Hati-hati
> membuat fungsi dengan nama yang sama di dua berkas.

**URL `/exec` ditulis di empat tempat**: `js/config.js`, `hrd.html`,
`leaderboard.html`, `leaderboard-tv.html`. Kalau membuat deployment baru,
keempatnya harus diganti.

---

## Struktur data

Sheet dan urutan kolomnya didefinisikan pada `HEADER` di `Kode_GS_V10.gs`.
Kode membaca berdasarkan **posisi kolom**, bukan nama — jangan menyisipkan
atau menukar kolom.

| Sheet | Isi |
|---|---|
| `Dosen` | id, nama, nip, mk, noWA, aktif, password |
| `Jadwal` | + `tipe`, `batch`, `statusParalel`, `maxPertemuan`, `maxTatapMuka`, `polaJadwal` |
| `MataKuliah` | id, kode, nama, prodi, tahunAkademik |
| `Presensi` | 24 kolom; tiga terakhir `minggu`, `jenisPertemuan`, `metodeSumbuB` |
| `Jadwal_Pengganti` | pengajuan kuliah pengganti |
| `Jadwal_Maju` | pengajuan kuliah lebih awal |
| `Flex_Blok` | blok waktu mingguan kelas flex |
| `Presensi_Manual` | pengajuan darurat + tautan foto bukti |
| `Libur_Nasional` | tanggal, nama — diedit manual tiap tahun |
| `Pengaturan` | kunci, nilai, diubah |
| `Import_Jadwal` | lembar kerja impor (boleh dihapus setelah dipakai) |

### Kunci di sheet `Pengaturan`

| Kunci | Contoh | Catatan |
|---|---|---|
| `semesterAktif` | `2026/2027 Ganjil` | ikut tercatat di tiap presensi |
| `tahunAkademik` | `2026/2027` | |
| `tglMulaiKuliah` | `2026-08-31` | dasar perhitungan minggu |
| `mingguUTS` / `mingguUAS` | `8` / `16` | |
| `mingguLibur` | `5, 12` | minggu tanpa perkuliahan |
| `liburAktif` / `pesanLibur` | | menghentikan presensi sementara |
| `overrideCode` | | izin presensi saat sistem nonaktif |
| `adminPin` | | **tidak pernah dikirim ke browser** |
| `tokenWki` | | dipakai untuk tutup paksa sesi |

`adminPin` dan `tokenWki` diverifikasi di server (`doAdminLogin`,
`verifyTokenWki`) dan sengaja dibuang dari `getSettingsPublik()`.

### Disimpan di Script Properties, bukan di sheet

| Kunci | Isi |
|---|---|
| `DB_ID` | ID database aktif (hasil rollover) |
| `DAFTAR_ARSIP` | JSON daftar arsip — bertahan melewati pergantian semester |
| `FOLDER_BUKTI_ID` | folder Drive untuk foto presensi manual |

---

## Dua nomor versi

Jangan tertukar:

- **Versi produk** — `LYTARA Remastered v2.0`, tertulis di footer dan judul.
  Nama rilis untuk pengguna.
- **Versi kode** — `KODE_VERSI` di `Kode_GS_V10.gs` dan `VERSI_DIHARAPKAN`
  di `js/config.js`. **Keduanya harus sama.** Kalau berbeda, aplikasi
  menampilkan pita merah di bawah layar.

Pemeriksa ini dibuat setelah berkali-kali frontend memanggil deployment lama
tanpa disadari. Gejalanya menyesatkan: fitur baru "tidak dikenal", atau data
semester lama muncul kembali. **Naikkan kedua angka setiap kali backend diubah.**

---

## Cara deploy

### Backend

1. Buka proyek Apps Script `LYTARA Backend V10`.
2. Tempel isi `Kode_GS_V10.gs`, lalu **Ctrl+S** (tidak tersimpan otomatis).
3. **Deploy → Manage deployments → ✏️ → Version: New version → Deploy.**

Gunakan **Manage deployments**, bukan *New deployment* — yang kedua membuat
URL baru dan mengharuskan keempat berkas frontend diganti.

Kesalahan paling sering: dropdown *Version* dibiarkan di versi lama. Tombol
Deploy tetap bisa ditekan tanpa pesan apa pun, dan tidak ada yang berubah.

### Frontend

Push ke repo (GitHub Pages). Setelahnya buka aplikasi dan pastikan pita merah
versi tidak muncul.

### Verifikasi

Pengaturan → **Status Sistem** → *Periksa Sekarang*. Periksa versi kode, nama
spreadsheet, dan semester aktif.

---

## Pekerjaan rutin tiap semester

Semuanya lewat UI, tidak perlu membuka Apps Script.

1. **Ganti Semester (rollover)** — siapkan spreadsheet baru berisi `Dosen` dan
   `MataKuliah`, lalu isi kartu Ganti Semester. Database lama otomatis masuk
   daftar arsip.
2. **Perbarui `DB_ID_AKTIF`** di baris ~40 `Kode_GS_V10.gs` agar cadangannya
   ikut menunjuk database baru, lalu redeploy. Kalau dilewat, sistem akan
   jatuh ke database salah bila Script Properties hilang.
3. **Rapikan Database** — meluruskan header dan membuang kolom/baris sisa.
4. **Kalender Akademik** — tanggal mulai, minggu UTS/UAS, minggu libur.
5. **Import Jadwal** — Buat Template → isi di spreadsheet → Cek Dulu → Import.
6. **Libur Nasional** — edit sheet `Libur_Nasional`. Data 2027 masih perkiraan
   dan wajib dikoreksi setelah SKB resmi terbit.
7. Pastikan status presensi **aktif** dan pesan libur lama sudah dihapus.

---

## Pengujian

Dari editor Apps Script:

| Fungsi | Kegunaan |
|---|---|
| `ujiSistem()` | ±40 pengujian otomatis aturan server; membuat data `[UJI]` lalu menghapusnya |
| `buatDataUji()` | membuat jadwal yang jamnya relatif terhadap jam sekarang, untuk menguji status tepat waktu / terlambat |
| `cekKesehatan()` | ringkasan sheet, semester, dan status warmer |
| `lihatDatabaseId()` | menampilkan ID yang dipakai dan daftar arsip |

Membersihkan data uji: Pengaturan → **🧪 Bersihkan Data Uji**.

`ujiSistem()` hanya menguji aturan di server. Tampilan, tombol, dan banner
tetap perlu diperiksa manual — gunakan daftar periksa di `Panduan_Lytara.docx`.

---

## Masalah umum

| Gejala | Penyebab biasanya |
|---|---|
| Pita merah "backend versi lama" | Deployment belum diperbarui, atau URL `/exec` menunjuk deployment lain |
| `Action tidak dikenal: xxx` | Sama seperti di atas |
| Data semester lama muncul kembali | `DB_ID` di Script Properties hilang, sistem jatuh ke `DB_ID_AKTIF` di kode |
| Perubahan di spreadsheet belum muncul | Cache 3 menit — tekan *Muat Ulang dari Spreadsheet* |
| 404 pada `googleusercontent.com/macros/echo` | Eksekusi gagal, biasanya izin Drive belum diberikan. Jalankan `folderBukti()` sekali |
| Flex Class menolak semua tanggal | `tglMulaiKuliah` belum diisi |
| Aplikasi lambat tiap pagi | Warmer mati — `pasangWarmer()` |

---

## Utang teknis

Diketahui dan belum dikerjakan:

- **Status presensi memakai jam perangkat.** `stH()`/`stS()` memakai jam
  browser, sehingga dapat diakali dengan mengubah jam HP. Perlu jam server.
- **Tidak ada escaping HTML.** Input dosen (nama MK, keterangan, alasan tolak)
  masuk ke `innerHTML` apa adanya.
- **Password dosen tersimpan sebagai teks biasa** di sheet `Dosen` kolom G.
- **Pemeriksaan "boleh presensi atau tidak" tersebar** di beberapa tempat pada
  `hadir.js`, masing-masing menghitung ulang. Sudah pernah menyebabkan bug
  berulang; layak disatukan seperti `ambilJamResmi()`.
- **Aturan minggu libur belum punya pengujian otomatis.**
- **Libur nasional 2027 masih perkiraan.**

---

## Riwayat singkat

| Versi | Perubahan besar |
|---|---|
| V10.0 | Script jadi standalone, notifikasi WhatsApp (Fonnte) dihapus, PIN & token pindah ke sheet, libur nasional pindah ke sheet |
| V10.5 | Kartu Status Sistem, arsip per-pengguna, rollover lewat UI |
| V11.0 | Import jadwal, penentuan kelas paralel otomatis |
| V11.3 | Flex Class, kalender akademik, pengujian otomatis |
| V11.6 | Moda ujian, pemisahan tatap muka & ujian di rapor, minggu libur |
| V11.7 | Laporan Yayasan: perbaikan penggolongan moda + BAB IV Flex Class |
| V12.0 | Jam selesai jadwal ditampilkan & diperbaiki untuk kelas flex |
