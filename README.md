# LYTARA — Layanan Tracking Aktivitas dan Realisasi Akademik

**Versi:** v4.5  
**Produksi:** Skuro Production  
**Live:** [bipalytara-byte.github.io/presensi-dosen-dev](https://bipalytara-byte.github.io/presensi-dosen-dev/)

---

## Struktur File

```
presensi-dosen-dev/
├── index.html              ← Shell utama (HTML + referensi semua file JS/CSS)
├── leaderboard.html        ← Halaman leaderboard publik
├── leaderboard-tv.html     ← Leaderboard mode TV / layar besar
├── css/
│   └── style.css           ← Semua styling / tampilan
└── js/
    ├── config.js           ← Konstanta, state global, URL Google Apps Script
    ├── api.js              ← Komunikasi ke Google Apps Script (get, post, refresh)
    ├── helpers.js          ← Fungsi utilitas kecil (parseTanggal, jStr, stH, dll)
    ├── auth.js             ← Login, logout, session management
    ├── hadir.js            ← Rekam presensi mulai & selesai mengajar
    ├── ganti.js            ← Jadwal pengganti + kelola dosen & jadwal (admin)
    ├── monitoring.js       ← Dashboard admin, alert absen, filter status kehadiran
    ├── report.js           ← Laporan, leaderboard, export Excel
    ├── maju.js             ← Pengajuan jadwal maju
    ├── rapor.js            ← Rapor evaluasi presensi per dosen, export PDF
    ├── notif.js            ← Notifikasi status pengajuan + libur nasional
    └── beranda.js          ← Halaman beranda dosen (fillAll, navigasi halaman)
```

> **Urutan load JS penting — jangan diubah.**  
> `config → api → helpers → auth → hadir → ganti → monitoring → report → maju → rapor → notif → beranda`

---

## Peta Fungsi per File

### `js/config.js`
- URL Google Apps Script (`API`)
- PIN admin (`PIN`)
- Password dosen (`DOSEN_PASS`)
- State global: `D` (dosen), `J` (jadwal), `P` (presensi), `G` (ganti), `M` (maju)
- Konstanta: `HARI`, `NAMA_HARI`

### `js/api.js`
- `get()` — ambil data dari GAS
- `post()` — kirim data ke GAS
- `setSB()` — update status bar (Tersinkron / Menyinkron / Error)
- `refreshDataLokal()` — tarik ulang semua data dari server

### `js/helpers.js`
- `parseTanggal(str)` — konversi string tanggal ke timestamp
- `getHariInRange(start, end)` — daftar hari dalam rentang tanggal
- `tutupPaksa(id)` — tutup paksa sesi (khusus WK I, butuh token)
- `jStr(v)` — format jam ke HH:MM
- `stH(jam)` — hitung status hadir (tepat / terlambat / sangat terlambat)
- `stS(js)` — hitung status selesai (tepat / pulang awal)
- `onModeChange()` — hint mode perkuliahan

### `js/auth.js`
- `doLogin()` — login dosen
- `doAdminLogin()` — login admin
- `logout()` — keluar
- `loadForLogin()` — load daftar dosen untuk dropdown login
- `loadThenShow()` — load semua data setelah login
- `updateUserUI()` — sesuaikan tampilan sesuai role (dosen/admin)
- `restoreSesi()` — restore sesi mengajar yang belum selesai

### `js/hadir.js`
- `fillJadwalDosen()` — isi dropdown pilih jadwal
- `onJadwal()` — handler saat jadwal dipilih
- `previewStatus()` — preview status hadir sebelum rekam
- `rekam()` — rekam mulai mengajar (tampilkan modal konfirmasi)
- `eksekusiRekam()` — simpan presensi setelah konfirmasi
- `rekamSelesai()` — rekam selesai mengajar
- `renderHari()` — tampilkan presensi hari ini
- `renderRiwayatSaya()` — tampilkan riwayat presensi dosen

### `js/ganti.js`
- `kirimGanti()` — ajukan jadwal pengganti
- `setStatusGanti()` — ACC / tolak pengajuan (admin)
- `renderG()` — tampilkan daftar pengajuan ganti
- `renderD()` — tampilkan daftar dosen (admin)
- `saveDos()` / `hapusDos()` — CRUD data dosen
- `renderJ()` — tampilkan daftar jadwal (admin)
- `saveJad()` / `hapusJad()` — CRUD data jadwal

### `js/monitoring.js`
- `renderDailyDashboard()` — dashboard ringkasan harian admin
- `renderAlertAbsen()` — alert dosen tidak hadir ≥ 2 minggu
- `filterStatusKehadiran()` — filter tepat / terlambat / sangat terlambat
- `renderDetailStatusKehadiran()` — detail list per status
- `renderRataLambat()` — rata-rata keterlambatan per dosen
- `renderTren()` — grafik tren bulanan
- `renderGantiAlert()` — alert pengajuan ganti pending
- `renderRiwayatGanti()` — riwayat jadwal pengganti per dosen

### `js/report.js`
- `renderR()` — render halaman laporan utama (admin)
- `exportExcel()` — export laporan ke file Excel
- `renderTop10()` — leaderboard top 10 dosen
- `donut()` — render chart donut canvas

### `js/maju.js`
- `kirimMaju()` — ajukan jadwal maju
- `setStatusMaju()` — ACC / tolak jadwal maju (admin)
- `renderM()` — tampilkan daftar pengajuan maju
- `renderRiwayatMaju()` — riwayat jadwal maju per dosen
- `cekNotifMaju()` — cek notifikasi status pengajuan maju/ganti

### `js/rapor.js`
- `renderRapor()` — render rapor evaluasi dosen
- `buildRaporHTML()` — bangun HTML rapor lengkap
- `calcGrade()` — hitung grade (A/B/C/D/E)
- `buildModeHTML()` — chart mode perkuliahan
- `buildTrenHTML()` — grafik tren bulanan di rapor
- `exportRaporPDF()` — export rapor ke PDF
- `filterBySemester()` — filter data per semester
- `buildSemesterSelect()` — isi dropdown semester

### `js/notif.js`
- `cekNotifGanti()` — cek & tampilkan notif status pengajuan
- `LIBUR_NASIONAL` — data libur nasional 2025–2026
- `cekJadwalBenturanLibur()` — deteksi jadwal yang bentrok libur
- `renderNotifLiburBeranda()` — banner H-2 libur di beranda dosen
- `renderNotifLiburHadir()` — banner pengingat di halaman presensi

### `js/beranda.js`
- `fillBerandaDosen()` — isi konten halaman beranda dosen
- `fillAll()` — render ulang semua komponen setelah data load
- `pg(page, btn)` — navigasi antar halaman
- `cm(id)` — tutup modal

---

## Panduan Update Fitur dengan Claude

### File yang perlu diupload ke Claude sesuai fitur:

| Mau update apa | Upload file ini |
|---|---|
| Notifikasi / libur nasional | `config.js` + `notif.js` |
| Rekam presensi | `config.js` + `hadir.js` |
| Jadwal pengganti | `config.js` + `ganti.js` |
| Jadwal maju | `config.js` + `maju.js` |
| Dashboard admin | `config.js` + `monitoring.js` |
| Laporan & export | `config.js` + `report.js` |
| Rapor dosen | `config.js` + `rapor.js` |
| Halaman beranda | `config.js` + `beranda.js` |
| Tampilan / warna | `css/style.css` |
| Fitur lintas modul | Upload semua file yang terkait |

> `config.js` **hampir selalu perlu ikut diupload** karena berisi state global dan konstanta yang dipakai semua modul.

---

## Branch

| Branch | Isi | Keterangan |
|---|---|---|
| `main` | Versi aktif (struktur split) | Yang live di GitHub Pages |
| `backup-monolitik` | index.html monolitik lama | Backup — jangan diubah |

### Cara rollback darurat
Jika website error, pergi ke **Settings → Pages** → ganti source branch ke `backup-monolitik` → Save. Website pulih dalam 1–2 menit.

---

## Google Apps Script

Backend menggunakan Google Apps Script. File: `KodeGS_V5.txt`

Sheet yang digunakan:
| Sheet | Isi |
|---|---|
| `Dosen` | Data dosen dan mata kuliah |
| `Jadwal` | Jadwal perkuliahan per dosen |
| `Presensi` | Rekam presensi masuk & selesai |
| `Jadwal_Pengganti` | Pengajuan jadwal pengganti |
| `Pengaturan` | Mode libur & pengaturan sistem |
| `Log` | Log error GAS |

---

*Terakhir diperbarui: Mei 2026*
