# 🕹️ LYTARA
### Layanan Tracking Aktivitas dan Realisasi Akademik

Sistem presensi digital berbasis web untuk dosen — terhubung langsung ke Google Apps Script (GAS) sebagai backend dan Google Sheets sebagai database.

---

## 📁 Struktur File

```
/
├── index.html              # Aplikasi utama (dosen & admin)
├── leaderboard.html        # Papan peringkat kehadiran (layar publik)
├── leaderboard-tv.html     # Versi TV/display besar leaderboard
├── hrd.html                # Portal HRD (monitoring SDM)
│
└── js/
    ├── config.js           # Konstanta, variabel global, state sistem
    ├── api.js              # Komunikasi ke GAS (get, post, logout)
    ├── auth.js             # Login dosen, login admin, refresh data
    ├── helpers.js          # Utilitas umum (parseTanggal, jStr, stH, stS, tutupPaksa)
    ├── hadir.js            # Rekam presensi mulai & selesai, banner override
    ├── ganti.js            # Jadwal pengganti, manajemen dosen & jadwal
    ├── maju.js             # Pengajuan jadwal maju (kuliah lebih awal)
    ├── mk.js               # Master data mata kuliah
    ├── notif.js            # Notifikasi status ganti/maju, libur nasional
    ├── beranda.js          # Dashboard beranda dosen & admin
    ├── monitoring.js       # Panel monitoring admin, pengaturan sistem
    ├── rapor.js            # Rapor kinerja per dosen
    ├── report.js           # Laporan presensi, export Excel, leaderboard
    └── export-yayasan.js   # Laporan Evaluasi Dosen (export PDF untuk yayasan)
```

---

## 🖥️ Halaman Utama (`index.html`)

### Tab Dosen
| Tab | Deskripsi |
|---|---|
| **Beranda** | Ringkasan jadwal hari ini, notifikasi ganti/maju, banner libur nasional |
| **Presensi** | Rekam hadir & selesai, banner override saat sistem nonaktif |
| **Jadwal Pengganti** | Ajukan, pantau, dan batalkan jadwal pengganti |
| **Jadwal Maju** | Ajukan kuliah lebih awal dari jadwal normal |
| **Riwayat** | Riwayat presensi pribadi |
| **Rapor** | Ringkasan kinerja kehadiran per semester |

### Tab Admin
| Tab | Deskripsi |
|---|---|
| **Beranda Admin** | Dashboard harian, ringkasan agregat ketepatan waktu bulan ini |
| **Laporan** | Filter & export data presensi, export Excel, Laporan Evaluasi Dosen |
| **Data Dosen** | CRUD data dosen, reset password |
| **Jadwal** | CRUD jadwal mengajar per dosen |
| **Mata Kuliah** | Master data MK, import dari jadwal |
| **Monitoring** | Status kehadiran hari ini, tren keterlambatan, riwayat ganti |
| **Pengaturan** | Toggle sistem, kode override, pesan libur, pengumuman login, semester aktif |

---

## 🗂️ Deskripsi File JS

### `config.js`
Mendefinisikan semua variabel global yang diakses lintas file:

| Variabel | Tipe | Keterangan |
|---|---|---|
| `API` | `const` | URL endpoint Google Apps Script |
| `HARI` | `const` | Array nama hari kerja |
| `D, J, P, G, M, MK` | `let[]` | Data dosen, jadwal, presensi, ganti, maju, mata kuliah |
| `SISTEM_AKTIF` | `bool` | Status sistem presensi (true = aktif) |
| `PESAN_LIBUR` | `string` | Pesan banner saat sistem nonaktif |
| `PENGUMUMAN_LOGIN` | `string` | Pengumuman di halaman login |
| `SEMESTER_AKTIF` | `string` | Semester berjalan (misal: "2025/2026 Genap") |
| `TAHUN_AKADEMIK` | `string` | Tahun akademik aktif |
| `OVERRIDE_CODE` | `string` | Kode override presensi saat sistem nonaktif |
| `isAdmin` | `bool` | Status login sebagai admin |
| `currentUser` | `object` | Objek dosen yang sedang login |

---

### `api.js`
Komunikasi HTTP ke Google Apps Script.

| Fungsi | Keterangan |
|---|---|
| `get(params)` | GET request ke GAS |
| `post(body)` | POST request ke GAS |
| `setSB(status)` | Update indikator sinkronisasi (`ok` / `sy` / `er`) |
| `loadForLogin()` | Load data dosen untuk dropdown login |
| `doLogin()` | Proses login dosen |
| `logout()` | Hapus session & kembali ke halaman login |

> `doAdminLogin()` ditangani di `auth.js` (async via GAS), bukan di `api.js`.

---

### `auth.js`
Autentikasi & inisialisasi data setelah login.

| Fungsi | Keterangan |
|---|---|
| `doAdminLogin()` | Login admin via PIN yang divalidasi GAS |
| `loadThenShow()` | Load semua data (dosen, jadwal, presensi, ganti, maju, MK, settings) lalu tampilkan app |
| `refreshDataLokal()` | Refresh semua data dari GAS tanpa reload halaman |
| `resetPasswordDosen()` | Reset password dosen oleh admin |

---

### `helpers.js`
Fungsi utilitas umum.

| Fungsi | Keterangan |
|---|---|
| `parseTanggal(str)` | Parse string DD/MM/YYYY ke timestamp |
| `getHariInRange(start, end)` | Kembalikan array nama hari dalam rentang tanggal |
| `jStr(v)` | Normalisasi format jam ke HH:MM |
| `stH(jam)` | Hitung status ketepatan hadir (green/yellow/red) |
| `stS(jamSelesai)` | Hitung status ketepatan selesai |
| `tutupPaksa(id)` | Tutup paksa sesi presensi (otorisasi Token WK I) |
| `onModeChange()` | Update hint mode perkuliahan di form rekam |

---

### `hadir.js`
Inti fitur rekam presensi.

| Fungsi | Keterangan |
|---|---|
| `fillJadwalDosen()` | Isi dropdown jadwal hari ini (termasuk jadwal ganti & maju yang disetujui) |
| `rekam()` | Validasi & mulai proses rekam hadir |
| `eksekusiRekam()` | Kirim data presensi ke GAS setelah konfirmasi |
| `rekamSelesai()` | Rekam waktu selesai mengajar |
| `renderBannerHadirNonaktif()` | Tampilkan banner saat sistem nonaktif + input kode override |
| `cekOverrideCode()` | Validasi kode override yang diinput dosen |
| `renderRiwayatSaya()` | Tampilkan riwayat presensi dosen yang login |
| `renderHari()` | Render jadwal mingguan dosen |

---

### `ganti.js`
Manajemen jadwal pengganti & data master.

| Fungsi | Keterangan |
|---|---|
| `kirimGanti()` | Ajukan jadwal pengganti |
| `setStatusGanti(id, status)` | ACC atau tolak pengajuan (admin) |
| `ajukanBatalGanti(id)` | Dosen ajukan pembatalan ganti |
| `accBatalGanti(id)` | Admin setujui pembatalan |
| `tandaiTerlaksana(id)` | Tandai jadwal ganti sudah terlaksana |
| `renderG()` | Render daftar pengajuan ganti |
| `renderD()` | Render tabel dosen (admin) |
| `saveDos()` | Simpan data dosen baru/edit |
| `hapusDos(id)` | Hapus data dosen |
| `renderJ()` | Render tabel jadwal (admin) |

---

### `maju.js`
Pengajuan jadwal maju (kuliah lebih awal).

| Fungsi | Keterangan |
|---|---|
| `kirimMaju()` | Ajukan jadwal maju |
| `setStatusMaju(id, status)` | ACC atau tolak pengajuan maju (admin) |
| `renderM()` | Render daftar pengajuan maju |
| `renderRiwayatMaju()` | Render riwayat maju untuk panel admin |

---

### `mk.js`
Master data Mata Kuliah.

| Fungsi | Keterangan |
|---|---|
| `renderMK()` | Render tabel MK dengan filter nama/prodi/tahun |
| `openMMK(id)` | Buka modal tambah/edit MK |
| `saveMMK()` | Simpan data MK |
| `hapusMK(id)` | Hapus MK (dengan cek penggunaan di jadwal) |
| `importMkDariJadwal()` | Import MK unik dari data jadwal ke master |
| `fillDropdownMK(elId)` | Isi dropdown MK di form lain |

---

### `notif.js`
Sistem notifikasi dosen.

| Fungsi | Keterangan |
|---|---|
| `cekNotifMaju()` | Cek & render notif status pengajuan ganti/maju |
| `getLiburDalamRentang(start, end)` | Ambil daftar libur nasional dalam rentang tanggal |
| `cekJadwalBenturanLibur()` | Deteksi jadwal dosen yang bertabrakan dengan libur nasional |
| `renderNotifLiburBeranda()` | Render banner libur nasional H-2 di beranda |
| `renderNotifLiburHadir()` | Render banner libur di halaman presensi |
| `LIBUR_NASIONAL` | Data libur nasional Indonesia 2025–2026 |

---

### `beranda.js`
Dashboard beranda.

| Fungsi | Keterangan |
|---|---|
| `fillBerandaAdmin()` | Render dashboard admin: stat harian, ringkasan ketepatan waktu bulan ini, alert pending |
| `fillBerandaDosen()` | Render dashboard dosen: jadwal hari ini, resume sesi aktif |
| `renderBannerHadirNonaktif()` | Banner sistem nonaktif (dipanggil dari sini juga) |
| `pg(page, btn)` | Navigasi antar halaman/tab |

---

### `monitoring.js`
Panel monitoring & pengaturan admin.

| Fungsi | Keterangan |
|---|---|
| `renderDailyDashboard()` | Dashboard ringkasan kehadiran hari ini |
| `renderAlertAbsen()` | Alert dosen yang belum hadir |
| `renderRataLambat(data)` | Statistik rata-rata keterlambatan per dosen |
| `renderTren()` | Grafik tren ketepatan waktu bulanan |
| `renderGantiAlert()` | Alert pengajuan ganti yang menunggu ACC |
| `renderRiwayatGanti()` | Riwayat lengkap pengajuan ganti (admin) |
| `renderPengaturanSistem()` | Panel pengaturan sistem lengkap |
| `toggleSistemPresensi()` | Toggle ON/OFF sistem presensi |
| `simpanOverrideCode()` | Aktifkan kode override presensi |
| `hapusOverrideCode()` | Hapus kode override |
| `simpanPesanLibur()` | Simpan pesan banner libur |
| `simpanPengumumanLogin()` | Simpan pengumuman di halaman login |
| `simpanSemesterAktif()` | Simpan semester & tahun akademik aktif |

---

### `rapor.js`
Rapor kinerja kehadiran per dosen.

| Fungsi | Keterangan |
|---|---|
| `renderRapor(dosenOverride)` | Render rapor dosen yang login (atau dosen tertentu jika admin) |
| `renderAdminRapor()` | Render rapor semua dosen (admin) |
| `calcGrade(...)` | Hitung grade kinerja (A/B/C/D) |
| `buildTrenHTML(myP)` | Bangun HTML grafik tren bulanan |
| `buildMkHTML(myP)` | Bangun HTML rekap per MK di rapor |
| `filterBySemester(...)` | Filter data presensi berdasarkan semester |

---

### `report.js`
Laporan presensi & export data.

| Fungsi | Keterangan |
|---|---|
| `renderR()` | Render laporan presensi dengan filter tanggal & dosen |
| `exportExcel()` | Export data presensi ke file Excel (.xlsx) |
| `renderTop10(data)` | Render top 10 dosen di leaderboard |
| `donut(id, sl, tot)` | Render donut chart ketepatan waktu |

---

### `export-yayasan.js`
Laporan Evaluasi Dosen untuk keperluan yayasan.

| Fungsi | Keterangan |
|---|---|
| `exportLaporanYayasan()` | Generate & buka jendela print laporan PDF lengkap |
| `_fmtTgl(str)` | Format tanggal YYYY-MM-DD ke format Indonesia |
| `_pct(n, total)` | Hitung persentase bulat |
| `_statBox(...)` | Helper render kotak statistik besar |
| `_profilStat(...)` | Helper render kotak stat profil dosen |
| `_miniStat(...)` | Helper render kotak ringkasan kecil |
| `_panduanBox(...)` | Helper render kotak panduan membaca |
| `_legendaBox(...)` | Helper render kotak legenda status |
| `_cssLaporan()` | CSS lengkap laporan (A4, print-friendly) |

**Isi laporan:**

| Bagian | Konten |
|---|---|
| Sampul | Judul, periode, institusi, total dosen & sesi, warning anomali data |
| Panduan | Cara membaca laporan + legenda status (untuk pembaca non-teknis) |
| BAB I | Agregat keseluruhan: % tepat/terlambat/sangat, progress bar, mode perkuliahan |
| BAB II | Peringkat dosen: ranking, predikat, mode perkuliahan per dosen |
| BAB III | Rekapitulasi per mata kuliah |
| BAB IV | Detail keterlambatan per dosen & MK + flag anomali data (>120 mnt) |
| BAB V | Profil individual per dosen: stat, progress bar, tabel per MK, riwayat tanggal mengajar |
| Penutup | Kesimpulan & rekomendasi otomatis + tanda tangan Admin LYTARA |

> Filter tanggal & dosen mengikuti filter aktif di halaman Laporan sebelum tombol diklik.

---

## 🔑 Fitur Khusus

### Override Code Presensi
Saat sistem dinonaktifkan (hari libur), admin dapat mengaktifkan **kode override** sementara agar dosen tertentu tetap bisa merekam presensi (misalnya kelas darurat yang disepakati bersama mahasiswa).

**Alur:**
```
Admin buat kode (4–8 karakter) di Pengaturan
  → Bagikan ke dosen yang mendapat izin via WA/chat
  → Dosen input kode di halaman Presensi
  → Form presensi terbuka untuk sesi tersebut
  → Admin hapus kode setelah semua selesai mengajar
```

**Catatan keamanan:**
- Kode tersimpan di GAS Settings (`overrideCode`)
- Session unlock tersimpan di `sessionStorage` — otomatis hilang saat logout atau tab ditutup
- Kode hanya berlaku selama belum dihapus admin

---

### Notifikasi Libur Nasional
Sistem mendeteksi otomatis jadwal dosen yang bertabrakan dengan libur nasional dan menampilkan peringatan:
- **H-2 hingga H-0** → banner kuning di beranda, ajak dosen ajukan pengganti
- **Sudah lewat, belum diganti** → banner merah di beranda & halaman presensi

Data libur nasional tersedia untuk tahun **2025 dan 2026** di `notif.js` (`LIBUR_NASIONAL`).

---

### Tutup Paksa Sesi (WK I)
Admin dengan Token WK I (`1990`) dapat menutup paksa sesi presensi yang masih terbuka. Status selesai dihitung otomatis berdasarkan jam jadwal selesai vs waktu tutup paksa.

---

## 🗄️ Struktur Data GAS

Data disimpan di Google Sheets melalui GAS dengan action berikut:

| Action | Keterangan |
|---|---|
| `getDosen` | Ambil semua data dosen |
| `getJadwal` | Ambil semua jadwal |
| `getPresensi` | Ambil semua data presensi |
| `getGanti` | Ambil semua pengajuan jadwal pengganti |
| `getMaju` | Ambil semua pengajuan jadwal maju |
| `getMataKuliah` | Ambil master data MK |
| `getSettings` | Ambil konfigurasi sistem (semester, toggle, kode override, dll.) |
| `saveSettings` | Simpan konfigurasi sistem |
| `savePresensi` | Simpan rekaman presensi baru |
| `updateSelesai` | Update waktu & status selesai |
| `saveGanti` | Simpan pengajuan jadwal pengganti |
| `updateStatusGanti` | Update status ACC/tolak pengajuan ganti |
| `saveMaju` | Simpan pengajuan jadwal maju |
| `updateStatusMaju` | Update status ACC/tolak pengajuan maju |
| `saveDosen` | Simpan data dosen baru/edit |
| `deleteDosen` | Hapus data dosen |
| `saveJadwal` | Simpan jadwal baru/edit |
| `deleteJadwal` | Hapus jadwal |
| `saveMataKuliah` | Simpan MK baru/edit |
| `deleteMataKuliah` | Hapus MK |
| `doAdminLogin` | Validasi PIN admin |

---

## 📊 Status Presensi

| `color` | Label | Keterangan |
|---|---|---|
| `green` | ✅ Tepat Waktu | Hadir ≤ 0 menit dari jam jadwal |
| `yellow` | ⏱ Terlambat | Terlambat 1–15 menit |
| `red` | 🚨 Sangat Terlambat | Terlambat > 15 menit |

---

## 📐 Konvensi Kode

- Semua variabel global didefinisikan di `config.js` (window scope)
- Tidak menggunakan module bundler — semua file dimuat via `<script src>` di `index.html`
- Urutan load script penting: `config` → `api` → `helpers` → `auth` → fitur-fitur → `beranda` → `export-yayasan`
- Format tanggal di database: `DD/MM/YYYY`
- Format tanggal di filter HTML input: `YYYY-MM-DD`
- Konversi dilakukan via `parseTanggal()` di `helpers.js`

---

## 🚀 Deployment

1. Deploy Google Apps Script sebagai Web App (akses: Anyone)
2. Salin URL endpoint ke variabel `API` di `config.js`
3. Host file HTML + folder `js/` di server statis (GitHub Pages, Netlify, atau web server kampus)
4. Buka `index.html` di browser

---

## 📋 Changelog

| Versi | Perubahan |
|---|---|
| v6.0 | Rilis awal sistem LYTARA |
| v6.1 | Tambah fitur Jadwal Maju, Master MK, import MK dari jadwal |
| v6.2 | Tambah notifikasi libur nasional H-2, banner terlambat ajukan ganti |
| v6.3 | Tambah summary card ketepatan waktu bulan ini di beranda admin |
| v6.4 | Tambah **Laporan Evaluasi Dosen** (export PDF 6 BAB untuk yayasan), fix bug normalisasi nama MK, flag anomali data >120 mnt |
| v6.5 | Laporan: tambah mode perkuliahan per dosen (BAB II & IV), panduan membaca, profil individual per dosen (BAB V), riwayat tanggal mengajar, tanda tangan, kesimpulan & rekomendasi otomatis |
| v6.6 | Tambah **Override Code** presensi saat sistem nonaktif, pisah blokir sistem (presensi vs pengajuan ganti/maju), banner kontekstual di halaman Presensi, fix bug `auth.js` missing catch, hapus fungsi `doAdminLogin` duplikat di `api.js` |

---

*LYTARA v6.6 — Sistem Presensi Digital Dosen*
