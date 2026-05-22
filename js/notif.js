/* notif.js — Sistem notifikasi:
   1. Status pengajuan ganti / maju (cekNotifGanti / cekNotifMaju)
   2. Libur nasional H-2 dan banner terlambat (renderNotifLiburBeranda / renderNotifLiburHadir)
   Fungsi: cekNotifGanti, cekNotifMaju,
           LIBUR_NASIONAL (data), getLiburDalamRentang,
           hariDariDate, formatTglPanjang, dateToStr,
           cekJadwalBenturanLibur, renderNotifLiburBeranda, renderNotifLiburHadir
*/


function cekNotifGanti() { cekNotifMaju(); }

function switchDashTab(panel, btn) {
  // Panel
  document.querySelectorAll('.dash-panel').forEach(function(p){ p.style.display='none'; });
  var target = document.getElementById('dash-panel-'+panel);
  if (target) target.style.display = 'block';
  // Tab button styles
  document.querySelectorAll('.dash-tab').forEach(function(b){
    b.style.color = '#888';
    b.style.borderBottom = '2px solid transparent';
    b.style.fontWeight = '500';
  });
  btn.style.color = '#1a1a1a';
  btn.style.borderBottom = '2px solid #1a1a1a';
}
function cekNotifMaju() {
  var w = document.getElementById('notif-ganti');
  if(!w || !currentUser || isAdmin) return;

  var today = new Date();
  today.setHours(0,0,0,0);

  var notifG = G.filter(function(g) {
    return g.dosenId === currentUser.id &&
           (g.statusAcc === 'Disetujui' || g.statusAcc === 'Ditolak') &&
           new Date(g.ganti) >= today;
  });
  
  var notifM = M.filter(function(m) {
    return m.dosenId === currentUser.id &&
           (m.statusAcc === 'Disetujui' || m.statusAcc === 'Ditolak') &&
           new Date(m.tglRaw) >= today;
  });

  var all = [];
  notifG.forEach(function(g){
    var isAcc = g.statusAcc === 'Disetujui';
    var bg = isAcc ? '#eaf3de' : '#fcebeb';
    var border = isAcc ? '#97c459' : '#f09595';
    var color = isAcc ? '#27500a' : '#791f1f';
    var icon = isAcc ? '✅' : '❌';
    all.push('<div style="background:'+bg+'; border:1px solid '+border+'; color:'+color+'; padding:10px 14px; border-radius:8px; margin-bottom:8px; font-size:13px; font-weight:500;">' +
           icon + ' Jadwal <b>Pengganti</b> — <b>' + g.mk + '</b> (' + g.asli + ' → ' + g.ganti + ') telah <b>' + g.statusAcc + '</b>.' +
           (g.alasanTolak ? ' Alasan: ' + g.alasanTolak : '') +
           '</div>');
  });
  notifM.forEach(function(m){
    var isAcc = m.statusAcc === 'Disetujui';
    var bg = isAcc ? '#fef3c7' : '#fcebeb';
    var border = isAcc ? '#fde68a' : '#f09595';
    var color = isAcc ? '#92400e' : '#791f1f';
    var icon = isAcc ? '⏩' : '❌';
    all.push('<div style="background:'+bg+'; border:1px solid '+border+'; color:'+color+'; padding:10px 14px; border-radius:8px; margin-bottom:8px; font-size:13px; font-weight:500;">' +
           icon + ' Jadwal <b>Maju</b> — <b>' + m.mk + '</b> (' + m.tgl + ' · ' + m.jam + ') telah <b>' + m.statusAcc + '</b>.' +
           (m.alasanTolak ? ' Alasan: ' + m.alasanTolak : '') +
           '</div>');
  });

  if(all.length === 0) { w.style.display='none'; return; }
  w.innerHTML = all.join('');
  w.style.display = 'block';
}

// =====================================================
// FITUR: NOTIFIKASI LIBUR NASIONAL
// Daftar libur nasional Indonesia (format: MM-DD, berlaku tiap tahun)
// dan libur yang punya tanggal pasti (format: YYYY-MM-DD)
// =====================================================

var LIBUR_NASIONAL = (function() {
  var tahun = new Date().getFullYear();
  // Format: { tgl: Date, nama: string }
  // Libur tetap (sama tiap tahun)
  var tetap = [
    { bulTgl: '01-01', nama: 'Tahun Baru Masehi' },
    { bulTgl: '05-01', nama: 'Hari Buruh Internasional' },
    { bulTgl: '06-01', nama: 'Hari Lahir Pancasila' },
    { bulTgl: '08-17', nama: 'Hari Kemerdekaan RI' },
    { bulTgl: '12-25', nama: 'Hari Natal' },
    { bulTgl: '12-26', nama: 'Cuti Bersama Natal' },
  ];
  // Libur berdasarkan tahun (perkiraan / SKB resmi — update tiap tahun)
  // Tahun 2025
  var dinamis2025 = [
    { tgl: '2025-01-27', nama: 'Isra Miraj' },
    { tgl: '2025-01-28', nama: 'Cuti Bersama Isra Miraj' },
    { tgl: '2025-01-29', nama: 'Hari Raya Imlek' },
    { tgl: '2025-03-29', nama: 'Hari Raya Nyepi' },
    { tgl: '2025-03-31', nama: 'Hari Raya Idul Fitri' },
    { tgl: '2025-04-01', nama: 'Hari Raya Idul Fitri' },
    { tgl: '2025-04-18', nama: 'Wafat Isa Al Masih' },
    { tgl: '2025-05-12', nama: 'Hari Raya Waisak' },
    { tgl: '2025-05-29', nama: 'Kenaikan Isa Al Masih' },
    { tgl: '2025-06-06', nama: 'Hari Raya Idul Adha' },
    { tgl: '2025-06-27', nama: 'Tahun Baru Islam 1447 H' },
    { tgl: '2025-09-05', nama: 'Maulid Nabi Muhammad SAW' },
  ];
  // Tahun 2026
  var dinamis2026 = [
    { tgl: '2026-01-01', nama: 'Tahun Baru Masehi' },
    { tgl: '2026-01-17', nama: 'Isra Miraj' },
    { tgl: '2026-02-17', nama: 'Hari Raya Imlek' },
    { tgl: '2026-03-19', nama: 'Hari Raya Nyepi' },
    { tgl: '2026-03-20', nama: 'Wafat Isa Al Masih' },
    { tgl: '2026-03-21', nama: 'Hari Raya Idul Fitri' },
    { tgl: '2026-03-22', nama: 'Hari Raya Idul Fitri' },
    { tgl: '2026-05-01', nama: 'Hari Buruh Internasional' },
    { tgl: '2026-05-07', nama: 'Kenaikan Isa Al Masih' },
    { tgl: '2026-05-27', nama: 'Hari Raya Waisak' },
    { tgl: '2026-05-28', nama: 'Hari Raya Idul Adha' },
    { tgl: '2026-06-01', nama: 'Hari Lahir Pancasila' },
    { tgl: '2026-06-17', nama: 'Tahun Baru Islam 1448 H' },
    { tgl: '2026-08-17', nama: 'Hari Kemerdekaan RI' },
    { tgl: '2026-08-25', nama: 'Maulid Nabi Muhammad SAW' },
    { tgl: '2026-12-25', nama: 'Hari Natal' },
    { tgl: '2026-12-26', nama: 'Cuti Bersama Natal' },
  ];

  var hasil = [];
  // Libur tetap untuk tahun ini dan tahun depan
  [tahun, tahun + 1].forEach(function(y) {
    tetap.forEach(function(l) {
      var d = new Date(y + '-' + l.bulTgl + 'T00:00:00');
      if (!isNaN(d)) hasil.push({ tgl: d, nama: l.nama });
    });
  });
  // Libur dinamis
  (dinamis2025.concat(dinamis2026)).forEach(function(l) {
    var d = new Date(l.tgl + 'T00:00:00');
    if (!isNaN(d)) hasil.push({ tgl: d, nama: l.nama });
  });
  return hasil;
}());

// Kembalikan daftar libur dalam rentang [startDate, endDate] (inklusif)
function getLiburDalamRentang(startDate, endDate) {
  return LIBUR_NASIONAL.filter(function(l) {
    return l.tgl >= startDate && l.tgl <= endDate;
  });
}

// Kembalikan nama hari Indonesia dari Date object
var NAMA_HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
function hariDariDate(d) { return NAMA_HARI[d.getDay()]; }

// Format tanggal ke "Senin, 12 Mei 2025"
function formatTglPanjang(d) {
  return NAMA_HARI[d.getDay()] + ', ' + d.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});
}

// Format Date ke string DD/MM/YYYY (untuk cross-check dengan data presensi)
function dateToStr(d) {
  var dd = d.getDate(), mm = d.getMonth()+1, yy = d.getFullYear();
  return (dd<10?'0':'')+dd+'/'+(mm<10?'0':'')+mm+'/'+yy;
}

/**
 * Cek jadwal dosen yang bertabrakan dengan libur nasional.
 * Mengembalikan array objek:
 *   { libur, jadwal[], tipeAlert: 'h2'|'terlambat', sudahDiganti: bool }
 *
 * 'h2'        = libur H-2 dan ada jadwal yang BELUM diganti (perlu segera ajukan)
 * 'terlambat' = libur sudah lewat, ada jadwal yg masuk hari libur, belum ada ganti
 */
function cekJadwalBenturanLibur() {
  if (!currentUser || isAdmin) return [];

  var today = new Date(); today.setHours(0,0,0,0);

  // Cari libur yang relevan: H-2 s/d 30 hari ke depan, + libur yg sudah lewat (≤ 30 hari lalu)
  var batasMulai = new Date(today); batasMulai.setDate(batasMulai.getDate() - 30);
  var batasMaju  = new Date(today); batasMaju.setDate(batasMaju.getDate() + 30);

  var liburRelevan = getLiburDalamRentang(batasMulai, batasMaju);
  var myJ = J.filter(function(j) { return j.dosenId === currentUser.id; });
  var myG = G.filter(function(g) { return g.dosenId === currentUser.id; });

  var hasil = [];

  liburRelevan.forEach(function(libur) {
    var hariLibur = hariDariDate(libur.tgl);
    // Jadwal dosen yang hari-nya = hari libur nasional
    var jadwalBentrok = myJ.filter(function(j) { return j.hari === hariLibur; });
    if (!jadwalBentrok.length) return;

    var selisih = Math.round((libur.tgl - today) / (1000 * 60 * 60 * 24)); // positif = akan datang

    // Tentukan tipe alert
    var tipe = null;
    if (selisih >= 0 && selisih <= 2) tipe = 'h2';          // H-0 sampai H-2
    else if (selisih < 0 && selisih >= -30) tipe = 'terlambat'; // sudah lewat, max 30 hari lalu
    if (!tipe) return;

    // Cek tiap jadwal: apakah sudah punya pengajuan ganti untuk tanggal libur tsb?
    var strTglLibur = dateToStr(libur.tgl);
    var jadwalBelumGanti = jadwalBentrok.filter(function(j) {
      // Cari ganti yang aslinya = tanggal libur dan mk cocok
      var sudah = myG.some(function(g) {
        // g.asli bisa format DD/MM/YYYY atau format lain
        var asliMatch = g.asli === strTglLibur ||
                        (parseTanggal(g.asli) && parseTanggal(g.asli) === libur.tgl.getTime());
        return asliMatch && g.mk === j.mk;
      });
      return !sudah;
    });

    if (!jadwalBelumGanti.length) return; // semua sudah diganti

    hasil.push({
      libur: libur,
      jadwal: jadwalBelumGanti,
      tipe: tipe,
      selisih: selisih,
      strTglLibur: strTglLibur
    });
  });

  // Urutkan: terlambat dulu (paling mendesak untuk sadar), lalu H-2 terdekat
  hasil.sort(function(a, b) {
    if (a.tipe === 'terlambat' && b.tipe !== 'terlambat') return -1;
    if (b.tipe === 'terlambat' && a.tipe !== 'terlambat') return 1;
    return a.selisih - b.selisih;
  });

  return hasil;
}

// Render notif di BERANDA (H-2 peringatan)
function renderNotifLiburBeranda() {
  var el = document.getElementById('notif-libur-beranda');
  if (!el || !currentUser || isAdmin) return;

  var data = cekJadwalBenturanLibur();
  // Di beranda: tampilkan H-2 (dan juga terlambat sebagai pengingat)
  if (!data.length) { el.style.display = 'none'; return; }

  var html = data.map(function(item) {
    var isTerlambat = item.tipe === 'terlambat';
    var bannerCls = isTerlambat ? 'libur-banner libur-banner-terlambat' : 'libur-banner libur-banner-h2';
    var icon = isTerlambat ? '🔴' : '🟡';
    var labelWaktu = isTerlambat
      ? (item.selisih === 0 ? 'Hari ini' : Math.abs(item.selisih) + ' hari lalu')
      : (item.selisih === 0 ? 'Hari ini libur!' : 'H-' + item.selisih);
    var judul = isTerlambat
      ? icon + ' Pertemuan Belum Diganti!'
      : icon + ' Libur Nasional ' + labelWaktu + ' — Segera Jadwalkan Pengganti';
    var sub = isTerlambat
      ? 'Pertemuan pada hari libur ' + item.libur.nama + ' (' + formatTglPanjang(item.libur.tgl) + ') belum memiliki jadwal pengganti.'
      : 'Pada ' + formatTglPanjang(item.libur.tgl) + ' adalah hari libur nasional: <b>' + item.libur.nama + '</b>. Jadwal mengajar berikut terdampak:';
    var jadwalHtml = item.jadwal.map(function(j) {
      return '<div class="libur-jadwal-item">📚 <b>' + j.mk + '</b>'
        + (j.kelas ? ' · Kelas ' + j.kelas : '')
        + ' · ' + (j.jamMulai || '?') + '–' + (j.jamSelesai || '?')
        + ' · ' + j.ruang
        + '</div>';
    }).join('');
    var ctaCls = isTerlambat ? 'libur-cta libur-cta-red' : 'libur-cta';
    var ctaLabel = '🔄 Ajukan Jadwal Pengganti';
    return '<div class="' + bannerCls + '">'
      + '<div class="libur-banner-title">' + judul + '</div>'
      + '<div class="libur-banner-sub">' + sub + '</div>'
      + jadwalHtml
      + '<button class="' + ctaCls + '" onclick="pg(\'ganti\', document.getElementById(\'tab-ganti\'))">' + ctaLabel + '</button>'
      + '</div>';
  }).join('');

  el.innerHTML = html;
  el.style.display = 'block';
}

// Render banner pengingat di halaman PRESENSI (terlambat ajukan ganti)
function renderNotifLiburHadir() {
  var el = document.getElementById('notif-libur-hadir');
  if (!el || !currentUser || isAdmin) return;

  var data = cekJadwalBenturanLibur();
  // Di hadir: hanya tampilkan yang terlambat (sudah lewat belum diganti)
  var terlambat = data.filter(function(d) { return d.tipe === 'terlambat'; });
  if (!terlambat.length) { el.style.display = 'none'; return; }

  var html = terlambat.map(function(item) {
    var jadwalHtml = item.jadwal.map(function(j) {
      return '<div class="libur-jadwal-item">📚 <b>' + j.mk + '</b>'
        + (j.kelas ? ' · Kelas ' + j.kelas : '')
        + ' · ' + (j.jamMulai || '?') + '–' + (j.jamSelesai || '?')
        + '</div>';
    }).join('');
    return '<div class="libur-banner libur-banner-terlambat">'
      + '<div class="libur-banner-title">🔴 Pertemuan Belum Diganti</div>'
      + '<div class="libur-banner-sub">Pertemuan pada <b>' + formatTglPanjang(item.libur.tgl) + '</b> (' + item.libur.nama + ') belum ada jadwal penggantinya. Segera ajukan sebelum akhir semester.</div>'
      + jadwalHtml
      + '<button class="libur-cta libur-cta-red" onclick="pg(\'ganti\', document.getElementById(\'tab-ganti\'))">🔄 Ajukan Sekarang</button>'
      + '</div>';
  }).join('');

  el.innerHTML = html;
  el.style.display = 'block';
}

// Alias
function cekNotifGanti() { cekNotifMaju(); }
