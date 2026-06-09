/* export-yayasan.js — Laporan Ketepatan Waktu untuk Yayasan
   v2.0 — Perubahan:
   - FIX: normalisasi nama MK (case-insensitive) saat grouping BAB III
   - FIX: flag anomali data keterlambatan > 120 mnt
   - TAMBAH: narasi penjelasan bahasa awam tiap bab
   - TAMBAH: BAB V — halaman profil per dosen (peringkat individu)
   - TAMBAH: ringkasan kesimpulan & rekomendasi di penutup
*/

function exportLaporanYayasan() {
  if (!isAdmin) { alert('Hanya admin yang dapat mengekspor laporan yayasan.'); return; }

  var start = document.getElementById('r-start') ? document.getElementById('r-start').value : '';
  var end   = document.getElementById('r-end')   ? document.getElementById('r-end').value   : '';
  var df    = document.getElementById('rd')      ? document.getElementById('rd').value      : 'all';

  var labelPeriode = (start || end)
    ? ((start ? _fmtTgl(start) : 'Awal Data') + ' – ' + (end ? _fmtTgl(end) : 'Akhir Data'))
    : 'Semua Periode';

  var data = P.slice();
  if (start) { var ts0 = new Date(start).setHours(0,0,0,0);   data = data.filter(function(p){ return parseTanggal(p.tanggal) >= ts0; }); }
  if (end)   { var ts1 = new Date(end).setHours(23,59,59,999); data = data.filter(function(p){ return parseTanggal(p.tanggal) <= ts1; }); }
  if (df !== 'all') data = data.filter(function(p){ return p.dosenId === df; });
  var ds = df !== 'all' ? D.filter(function(d){ return d.id === df; }) : D.slice();

  if (data.length === 0) { alert('Tidak ada data presensi pada periode / filter yang dipilih.'); return; }

  // ── BAB 1: Agregat ──────────────────────────────────────────────────
  var nTotal    = data.length;
  var nTepat    = data.filter(function(p){ return p.color === 'green';  }).length;
  var nLambat   = data.filter(function(p){ return p.color === 'yellow'; }).length;
  var nSangat   = data.filter(function(p){ return p.color === 'red';    }).length;
  var nLuring   = data.filter(function(p){ return !p.modeKuliah || p.modeKuliah.indexOf('Luring') > -1; }).length;
  var nSinkron  = data.filter(function(p){ return p.modeKuliah && p.modeKuliah.indexOf('Sinkronus') > -1 && p.modeKuliah.indexOf('Asinkronus') === -1; }).length;
  var nAsinkron = data.filter(function(p){ return p.modeKuliah && p.modeKuliah.indexOf('Asinkronus') > -1; }).length;
  var pTepat    = _pct(nTepat, nTotal);
  var pLambat   = _pct(nLambat, nTotal);
  var pSangat   = _pct(nSangat, nTotal);

  // ── BAB 2: Ranking per Dosen ─────────────────────────────────────────
  var rankingDosen = ds.map(function(d) {
    var dd = data.filter(function(p){ return p.dosenId === d.id; });
    if (dd.length === 0) return null;
    var t = dd.filter(function(p){ return p.color === 'green';  }).length;
    var l = dd.filter(function(p){ return p.color === 'yellow'; }).length;
    var s = dd.filter(function(p){ return p.color === 'red';    }).length;
    var lambatSesi = dd.filter(function(p){ return p.color === 'yellow' || p.color === 'red'; });
    var totalMenitLambat = lambatSesi.reduce(function(acc, p){ return acc + (Number(p.diff) || 0); }, 0);
    // Deteksi anomali: sesi dengan diff > 120 mnt
    var anomali = lambatSesi.filter(function(p){ return (Number(p.diff) || 0) > 120; });
    var mLuring   = dd.filter(function(p){ return !p.modeKuliah || p.modeKuliah.indexOf('Luring') > -1; }).length;
    var mSinkron  = dd.filter(function(p){ return p.modeKuliah && p.modeKuliah.indexOf('Sinkronus') > -1 && p.modeKuliah.indexOf('Asinkronus') === -1; }).length;
    var mAsinkron = dd.filter(function(p){ return p.modeKuliah && p.modeKuliah.indexOf('Asinkronus') > -1; }).length;
    // Per-MK breakdown (untuk BAB V profil dosen)
    var mkBreakdown = {};
    dd.forEach(function(p) {
      var k = (p.mk || '(Tanpa MK)').trim();
      if (!mkBreakdown[k]) mkBreakdown[k] = { mk: k, total: 0, tepat: 0, lambat: 0, sangat: 0, totalMnt: 0 };
      mkBreakdown[k].total++;
      if (p.color === 'green')  mkBreakdown[k].tepat++;
      if (p.color === 'yellow') { mkBreakdown[k].lambat++; mkBreakdown[k].totalMnt += Number(p.diff)||0; }
      if (p.color === 'red')    { mkBreakdown[k].sangat++; mkBreakdown[k].totalMnt += Number(p.diff)||0; }
    });
    return {
      id:        d.id,
      nama:      d.nama,
      nip:       d.nip || '—',
      total:     dd.length,
      tepat:     t,
      lambat:    l,
      sangat:    s,
      pTepat:    _pct(t, dd.length),
      pLambat:   _pct(l + s, dd.length),
      avgLambat: lambatSesi.length > 0 ? Math.round(totalMenitLambat / lambatSesi.length) : 0,
      anomali:   anomali,
      mLuring:   mLuring,  mSinkron:  mSinkron,  mAsinkron: mAsinkron,
      pLuringD:  _pct(mLuring, dd.length),
      pSinkronD: _pct(mSinkron, dd.length),
      pAsinkronD:_pct(mAsinkron, dd.length),
      mkBreakdown: Object.values(mkBreakdown).sort(function(a,b){ return (b.lambat+b.sangat)-(a.lambat+a.sangat); })
    };
  }).filter(Boolean);

  var rankingTerbaik = rankingDosen.slice().sort(function(a, b){
    return b.pTepat - a.pTepat || b.tepat - a.tepat;
  });
  // Tambahkan nomor ranking ke tiap dosen
  rankingTerbaik.forEach(function(d, i){ d.ranking = i + 1; });
  // Buat lookup ranking by id
  var rankingMap = {};
  rankingTerbaik.forEach(function(d){ rankingMap[d.id] = d.ranking; });

  // ── BAB 3: Rekap per MK — FIX: normalisasi nama MK ──────────────────
  var mkMap = {};
  var mkNamaAsli = {}; // simpan nama asli (kapitalisasi pertama kali muncul)
  data.forEach(function(p) {
    var keyNorm = (p.mk || '(Tidak Ada Nama MK)').trim().toLowerCase();
    if (!mkNamaAsli[keyNorm]) mkNamaAsli[keyNorm] = (p.mk || '(Tidak Ada Nama MK)').trim();
    if (!mkMap[keyNorm]) mkMap[keyNorm] = { mk: mkNamaAsli[keyNorm], total: 0, tepat: 0, lambat: 0, sangat: 0, dosenSet: {} };
    mkMap[keyNorm].total++;
    if (p.color === 'green')  mkMap[keyNorm].tepat++;
    if (p.color === 'yellow') mkMap[keyNorm].lambat++;
    if (p.color === 'red')    mkMap[keyNorm].sangat++;
    mkMap[keyNorm].dosenSet[p.dosenId] = true;
  });
  var mkList = Object.values(mkMap).sort(function(a, b){ return (b.lambat + b.sangat) - (a.lambat + a.sangat); });

  // ── BAB 4: Detail Keterlambatan per Dosen ────────────────────────────
  var detailPerDosen = ds.map(function(d) {
    var dd = data.filter(function(p){ return p.dosenId === d.id && (p.color === 'yellow' || p.color === 'red'); });
    if (dd.length === 0) return null;
    var mkDetail = {};
    dd.forEach(function(p) {
      var k = (p.mk || '(Tidak Ada Nama MK)').trim();
      if (!mkDetail[k]) mkDetail[k] = { mk: k, count: 0, totalMnt: 0, mLuring: 0, mSinkron: 0, mAsinkron: 0, anomaliList: [] };
      mkDetail[k].count++;
      var mnt = Number(p.diff) || 0;
      mkDetail[k].totalMnt += mnt;
      if (mnt > 120) mkDetail[k].anomaliList.push({ tanggal: p.tanggal, mnt: mnt });
      if (!p.modeKuliah || p.modeKuliah.indexOf('Luring') > -1) mkDetail[k].mLuring++;
      else if (p.modeKuliah.indexOf('Asinkronus') > -1)         mkDetail[k].mAsinkron++;
      else if (p.modeKuliah.indexOf('Sinkronus') > -1)          mkDetail[k].mSinkron++;
    });
    var allDd = data.filter(function(p){ return p.dosenId === d.id; });
    var modeSemua = {
      luring:   allDd.filter(function(p){ return !p.modeKuliah || p.modeKuliah.indexOf('Luring') > -1; }).length,
      sinkron:  allDd.filter(function(p){ return p.modeKuliah && p.modeKuliah.indexOf('Sinkronus') > -1 && p.modeKuliah.indexOf('Asinkronus') === -1; }).length,
      asinkron: allDd.filter(function(p){ return p.modeKuliah && p.modeKuliah.indexOf('Asinkronus') > -1; }).length,
      total:    allDd.length
    };
    var items = Object.values(mkDetail).sort(function(a, b){ return b.count - a.count; });
    items.forEach(function(i){ i.avgMnt = i.count > 0 ? Math.round(i.totalMnt / i.count) : 0; });
    return { nama: d.nama, nip: d.nip || '—', items: items, totalLambat: dd.length, modeSemua: modeSemua };
  }).filter(Boolean).sort(function(a, b){ return b.totalLambat - a.totalLambat; });

  // ── Hitung total anomali untuk catatan ──────────────────────────────
  var totalAnomali = rankingDosen.reduce(function(s, d){ return s + d.anomali.length; }, 0);

  // ── Tanggal cetak ─────────────────────────────────────────────────
  var tglCetak = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  var institusi = 'Program Studi — ' + (SEMESTER_AKTIF || 'Semester Aktif');

  // ════════════════════════════════════════════════════════════════════
  // BUILD HTML
  // ════════════════════════════════════════════════════════════════════
  var html = '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">';
  html += '<title>Laporan Ketepatan Waktu Dosen — ' + labelPeriode + '</title>';
  html += '<style>' + _cssLaporan() + '</style></head><body>';

  // ── SAMPUL ──────────────────────────────────────────────────────────
  html += '<div class="cover page-break">';
  html += '<div class="cover-logo">🕹️</div>';
  html += '<div class="cover-sistem">LYTARA — Layanan Tracking Aktivitas dan Realisasi Akademik</div>';
  html += '<div class="cover-judul">Laporan Evaluasi<br>Ketepatan Waktu Dosen</div>';
  html += '<div class="cover-sub">Laporan resmi untuk keperluan evaluasi yayasan</div>';
  html += '<table class="cover-meta"><tbody>';
  html += '<tr><td>Periode</td><td>:</td><td><b>' + labelPeriode + '</b></td></tr>';
  html += '<tr><td>Institusi</td><td>:</td><td>' + institusi + '</td></tr>';
  html += '<tr><td>Total Dosen</td><td>:</td><td>' + rankingDosen.length + ' dosen (dengan data presensi)</td></tr>';
  html += '<tr><td>Total Sesi</td><td>:</td><td>' + nTotal + ' sesi presensi</td></tr>';
  html += '<tr><td>Dicetak pada</td><td>:</td><td>' + tglCetak + '</td></tr>';
  html += '<tr><td>Dicetak oleh</td><td>:</td><td>Admin LYTARA</td></tr>';
  html += '</tbody></table>';
  // Peringatan anomali di sampul jika ada
  if (totalAnomali > 0) {
    html += '<div style="margin-top:24px;padding:12px 20px;background:#fff8e6;border:1.5px solid #f9c84a;border-radius:10px;font-size:11px;color:#7a4f00;max-width:380px;text-align:left">';
    html += '⚠️ <b>Catatan:</b> Ditemukan ' + totalAnomali + ' sesi dengan durasi keterlambatan >120 menit. ';
    html += 'Data tersebut kemungkinan merupakan anomali teknis (lupa rekam selesai). Lihat detail di BAB IV.';
    html += '</div>';
  }
  html += '<div class="cover-footer">Dokumen ini digenerate otomatis oleh sistem LYTARA v6.0 · Bersifat rahasia</div>';
  html += '</div>';

  // ── PANDUAN MEMBACA (halaman baru, sebelum BAB I) ────────────────────
  html += '<div class="section page-break">';
  html += '<div class="bab">PANDUAN MEMBACA LAPORAN</div>';
  html += '<div class="bab-judul" style="color:#555;border-color:#ccc">Cara Membaca Laporan Ini</div>';
  html += '<p class="narasi">Laporan ini disusun untuk memberikan gambaran objektif tentang kedisiplinan kehadiran dosen dalam memulai perkuliahan. Data diambil langsung dari sistem presensi digital LYTARA yang digunakan oleh seluruh dosen.</p>';

  html += '<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px">';

  html += _panduanBox('📊 BAB I — Ringkasan Keseluruhan',
    'Menampilkan gambaran besar kondisi seluruh dosen dalam satu periode. Cocok untuk melihat "kondisi umum" secara cepat. ' +
    'Tiga angka utama yang perlu diperhatikan: <b>% Tepat Waktu</b>, <b>% Terlambat</b>, dan <b>% Sangat Terlambat</b>.');

  html += _panduanBox('🏆 BAB II — Peringkat Dosen',
    'Daftar seluruh dosen diurutkan dari yang paling disiplin (peringkat 1) hingga yang perlu perhatian. ' +
    '<b>Predikat</b> diberikan berdasarkan persentase tepat waktu: ' +
    '<b>Sangat Baik</b> (≥90%), <b>Baik</b> (75–89%), <b>Cukup</b> (60–74%), <b>Perlu Perhatian</b> (&lt;60%). ' +
    'Kolom <b>Rata Mnt</b> adalah rata-rata menit keterlambatan — semakin kecil semakin baik.');

  html += _panduanBox('📚 BAB III — Rekapitulasi per Mata Kuliah',
    'Menunjukkan mata kuliah mana yang paling sering mengalami keterlambatan. ' +
    'Urutan dari yang paling banyak keterlambatannya. Berguna untuk mengidentifikasi apakah masalah keterlambatan berpola pada mata kuliah tertentu.');

  html += _panduanBox('🔍 BAB IV — Detail Keterlambatan per Dosen',
    'Hanya berisi dosen yang pernah terlambat. Menjelaskan secara rinci: di mata kuliah apa, berapa kali, dan rata-rata berapa menit. ' +
    'Jika ada tanda <b>⚠️ Data Perlu Dicek</b>, artinya durasi keterlambatan tidak wajar (>120 menit) dan kemungkinan terjadi kesalahan teknis, bukan keterlambatan nyata.');

  html += _panduanBox('👤 BAB V — Profil Lengkap per Dosen',
    'Satu halaman khusus untuk setiap dosen, menampilkan ringkasan kinerja, peringkat, rincian per mata kuliah, ' +
    'dan grafik distribusi ketepatan waktu. Berguna untuk evaluasi individual atau bahan diskusi dengan dosen bersangkutan.');

  html += '</div>';

  // Legenda status
  html += '<h3 class="sub-judul">Legenda Status Ketepatan Waktu</h3>';
  html += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">';
  html += _legendaBox('✅ Tepat Waktu', 'Hadir tepat waktu atau kurang dari 1 menit setelah jam mulai jadwal.', '#eaf3de', '#27500a', '#97c459');
  html += _legendaBox('⏱ Terlambat', 'Terlambat antara 1 hingga 15 menit dari jam mulai jadwal. Perlu mendapat perhatian.', '#faeeda', '#633806', '#fac775');
  html += _legendaBox('🚨 Sangat Terlambat', 'Terlambat lebih dari 15 menit. Termasuk kategori pelanggaran disiplin yang perlu ditindaklanjuti.', '#fcebeb', '#791f1f', '#f09595');
  html += '</div>';
  html += '</div>';

  // ── BAB I: Ringkasan Agregat ─────────────────────────────────────────
  html += '<div class="section page-break">';
  html += '<div class="bab">BAB I</div>';
  html += '<div class="bab-judul">Ringkasan Agregat Keseluruhan</div>';

  html += '<div class="narasi-box">';
  html += '<b>Apa artinya angka ini?</b> Pada periode ' + labelPeriode + ', tercatat <b>' + nTotal + ' sesi perkuliahan</b> dari <b>' + rankingDosen.length + ' dosen</b>. ';
  if (pTepat >= 90) {
    html += 'Secara keseluruhan kondisi <b style="color:#27500a">sangat baik</b> — ' + pTepat + '% dosen hadir tepat waktu. ';
  } else if (pTepat >= 75) {
    html += 'Secara keseluruhan kondisi <b style="color:#185fa5">baik</b> — ' + pTepat + '% dosen hadir tepat waktu. ';
  } else {
    html += 'Kondisi ketepatan waktu <b style="color:#a32d2d">perlu perhatian</b> — hanya ' + pTepat + '% dosen yang hadir tepat waktu. ';
  }
  html += 'Dari total sesi, <b>' + (nLambat + nSangat) + ' sesi</b> (' + (pLambat + pSangat) + '%) mengalami keterlambatan.';
  html += '</div>';

  html += '<div class="stat-row">';
  html += _statBox('✅ Tepat Waktu',      nTepat,  pTepat  + '%', '#eaf3de', '#27500a', '#97c459', 'Hadir sesuai atau sebelum batas toleransi');
  html += _statBox('⏱ Terlambat',        nLambat, pLambat + '%', '#faeeda', '#633806', '#fac775', 'Terlambat 1–15 menit dari jam jadwal');
  html += _statBox('🚨 Sangat Terlambat', nSangat, pSangat + '%', '#fcebeb', '#791f1f', '#f09595', 'Terlambat lebih dari 15 menit');
  html += '</div>';

  html += '<div class="prog-wrap">';
  html += '<div style="background:#639922;width:' + pTepat  + '%" class="prog-seg"></div>';
  html += '<div style="background:#BA7517;width:' + pLambat + '%" class="prog-seg"></div>';
  html += '<div style="background:#E24B4A;width:' + pSangat + '%" class="prog-seg"></div>';
  html += '</div>';
  html += '<div class="prog-legend">';
  html += '<span class="leg-item"><span class="leg-dot" style="background:#639922"></span>Tepat Waktu (' + pTepat + '%)</span>';
  html += '<span class="leg-item"><span class="leg-dot" style="background:#BA7517"></span>Terlambat (' + pLambat + '%)</span>';
  html += '<span class="leg-item"><span class="leg-dot" style="background:#E24B4A"></span>Sangat Terlambat (' + pSangat + '%)</span>';
  html += '</div>';

  html += '<h3 class="sub-judul">1.2 Mode Perkuliahan</h3>';
  html += '<div class="narasi-box">Mode perkuliahan menunjukkan metode yang digunakan dosen saat mengajar. <b>Luring</b> berarti tatap muka di kelas, <b>Daring Sinkronus</b> berarti online langsung (Zoom/GMeet), dan <b>Daring Asinkronus</b> berarti penugasan mandiri tanpa tatap muka langsung.</div>';
  html += '<table class="tbl"><thead><tr><th>Mode</th><th>Jumlah Sesi</th><th>Persentase</th></tr></thead><tbody>';
  html += '<tr><td>🏫 Luring / Tatap Muka</td><td class="tc">' + nLuring + '</td><td class="tc">' + _pct(nLuring, nTotal) + '%</td></tr>';
  html += '<tr><td>💻 Daring Sinkronus (Online Real-time)</td><td class="tc">' + nSinkron + '</td><td class="tc">' + _pct(nSinkron, nTotal) + '%</td></tr>';
  html += '<tr><td>📝 Daring Asinkronus (Penugasan Mandiri)</td><td class="tc">' + nAsinkron + '</td><td class="tc">' + _pct(nAsinkron, nTotal) + '%</td></tr>';
  html += '<tr class="total-row"><td><b>Total</b></td><td class="tc"><b>' + nTotal + '</b></td><td class="tc"><b>100%</b></td></tr>';
  html += '</tbody></table>';
  html += '</div>';

  // ── BAB II: Peringkat Dosen ──────────────────────────────────────────
  html += '<div class="section page-break">';
  html += '<div class="bab">BAB II</div>';
  html += '<div class="bab-judul">Peringkat Ketepatan Waktu Per Dosen</div>';

  html += '<div class="narasi-box">';
  html += 'Tabel ini mengurutkan seluruh dosen dari yang paling disiplin (peringkat #1) hingga yang paling perlu perhatian. ';
  html += 'Kolom <b>% Tepat</b> adalah angka terpenting — semakin tinggi semakin baik. ';
  html += 'Kolom <b>Rata Mnt</b> menunjukkan rata-rata keterlambatan dalam menit untuk sesi yang terlambat saja (bukan semua sesi). ';
  html += 'Tanda "—" pada Rata Mnt artinya dosen tersebut <b>tidak pernah terlambat sama sekali</b> pada periode ini.';
  html += '</div>';

  // Ringkasan predikat
  var jSangatBaik    = rankingTerbaik.filter(function(d){ return d.pTepat >= 90; }).length;
  var jBaik          = rankingTerbaik.filter(function(d){ return d.pTepat >= 75 && d.pTepat < 90; }).length;
  var jCukup         = rankingTerbaik.filter(function(d){ return d.pTepat >= 60 && d.pTepat < 75; }).length;
  var jPerluPerhatian= rankingTerbaik.filter(function(d){ return d.pTepat < 60; }).length;

  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">';
  html += _miniStat('Sangat Baik (≥90%)',    jSangatBaik,     '#eaf3de', '#27500a');
  html += _miniStat('Baik (75–89%)',          jBaik,           '#e6f1fb', '#185fa5');
  html += _miniStat('Cukup (60–74%)',         jCukup,          '#faeeda', '#633806');
  html += _miniStat('Perlu Perhatian (<60%)', jPerluPerhatian, '#fcebeb', '#a32d2d');
  html += '</div>';

  html += '<table class="tbl"><thead><tr>';
  html += '<th style="width:30px">No.</th><th>Nama Dosen</th>';
  html += '<th class="tc">Total Sesi</th><th class="tc">✅ Tepat</th>';
  html += '<th class="tc">⏱ Terlambat</th><th class="tc">🚨 Sangat</th>';
  html += '<th class="tc">% Tepat</th><th class="tc">% Terlambat</th>';
  html += '<th class="tc">Rata Mnt</th><th>Mode Perkuliahan</th><th>Predikat</th>';
  html += '</tr></thead><tbody>';

  rankingTerbaik.forEach(function(d, i) {
    var predikat   = d.pTepat >= 90 ? 'Sangat Baik' : d.pTepat >= 75 ? 'Baik' : d.pTepat >= 60 ? 'Cukup' : 'Perlu Perhatian';
    var predikatBg = d.pTepat >= 90 ? '#eaf3de' : d.pTepat >= 75 ? '#e6f1fb' : d.pTepat >= 60 ? '#faeeda' : '#fcebeb';
    var predikatTx = d.pTepat >= 90 ? '#27500a' : d.pTepat >= 75 ? '#185fa5' : d.pTepat >= 60 ? '#633806' : '#791f1f';
    var medal = i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : '';
    var anomaliWarn = d.anomali.length > 0
      ? ' <span style="background:#fff8e6;color:#7a4f00;border:1px solid #f9c84a;border-radius:4px;padding:0px 4px;font-size:9px">⚠️ ada anomali data</span>' : '';
    html += '<tr>';
    html += '<td class="tc">' + (i + 1) + '</td>';
    html += '<td><b>' + medal + d.nama + '</b>' + anomaliWarn + '<br><span style="font-size:10px;color:#888">' + d.nip + '</span></td>';
    html += '<td class="tc">' + d.total + '</td>';
    html += '<td class="tc" style="color:#27500a;font-weight:600">' + d.tepat + '</td>';
    html += '<td class="tc" style="color:#633806">' + d.lambat + '</td>';
    html += '<td class="tc" style="color:#791f1f">' + d.sangat + '</td>';
    html += '<td class="tc"><b style="color:' + (d.pTepat>=80?'#27500a':d.pTepat>=60?'#633806':'#a32d2d') + '">' + d.pTepat + '%</b></td>';
    html += '<td class="tc" style="color:' + (d.pLambat>30?'#a32d2d':'#555') + '">' + d.pLambat + '%</td>';
    html += '<td class="tc">' + (d.avgLambat > 0 ? d.avgLambat + ' mnt' : '—') + '</td>';
    html += '<td><div style="display:flex;flex-direction:column;gap:2px">'
      + (d.mLuring   > 0 ? '<span style="background:#eaf3de;color:#27500a;border-radius:3px;padding:1px 4px;font-size:9px;white-space:nowrap">🏫 ' + d.mLuring + 'x (' + d.pLuringD + '%)</span>' : '')
      + (d.mSinkron  > 0 ? '<span style="background:#e6f1fb;color:#185fa5;border-radius:3px;padding:1px 4px;font-size:9px;white-space:nowrap">💻 ' + d.mSinkron + 'x (' + d.pSinkronD + '%)</span>' : '')
      + (d.mAsinkron > 0 ? '<span style="background:#faeeda;color:#633806;border-radius:3px;padding:1px 4px;font-size:9px;white-space:nowrap">📝 ' + d.mAsinkron + 'x (' + d.pAsinkronD + '%)</span>' : '')
      + '</div></td>';
    html += '<td><span style="background:' + predikatBg + ';color:' + predikatTx + ';padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;white-space:nowrap">' + predikat + '</span></td>';
    html += '</tr>';
  });

  var avgTepat = rankingTerbaik.length > 0 ? Math.round(rankingTerbaik.reduce(function(s,d){ return s+d.pTepat; },0)/rankingTerbaik.length) : 0;
  html += '<tr class="total-row"><td colspan="2"><b>Rata-Rata Keseluruhan</b></td>';
  html += '<td class="tc"><b>' + nTotal + '</b></td><td class="tc"><b>' + nTepat + '</b></td>';
  html += '<td class="tc"><b>' + nLambat + '</b></td><td class="tc"><b>' + nSangat + '</b></td>';
  html += '<td class="tc"><b>' + avgTepat + '%</b></td><td colspan="4"></td></tr>';
  html += '</tbody></table></div>';

  // ── BAB III: Rekap per MK ────────────────────────────────────────────
  html += '<div class="section page-break">';
  html += '<div class="bab">BAB III</div>';
  html += '<div class="bab-judul">Rekapitulasi Ketepatan Waktu per Mata Kuliah</div>';
  html += '<div class="narasi-box">Tabel ini menunjukkan mata kuliah yang paling sering mengalami keterlambatan (urutan dari atas ke bawah). ';
  html += 'Mata kuliah yang berwarna <span style="background:#fff8f8;padding:1px 5px;border-radius:3px;color:#a32d2d">merah muda</span> memiliki jumlah keterlambatan yang cukup tinggi (lebih dari 3 kali) dan sebaiknya mendapat perhatian lebih. ';
  html += 'Kolom <b>Jml Dosen</b> menunjukkan berapa dosen yang mengajar mata kuliah tersebut pada periode ini.</div>';

  html += '<table class="tbl"><thead><tr>';
  html += '<th style="width:28px">No.</th><th>Mata Kuliah</th>';
  html += '<th class="tc">Jml Dosen</th><th class="tc">Total Sesi</th>';
  html += '<th class="tc">✅ Tepat</th><th class="tc">⏱ Terlambat</th>';
  html += '<th class="tc">🚨 Sangat</th><th class="tc">% Tepat</th>';
  html += '</tr></thead><tbody>';
  mkList.forEach(function(m, i) {
    var pT = _pct(m.tepat, m.total);
    var nDosen = Object.keys(m.dosenSet).length;
    var rowBg = (m.lambat + m.sangat) > 3 ? 'background:#fff8f8' : '';
    html += '<tr style="' + rowBg + '">';
    html += '<td class="tc">' + (i+1) + '</td><td><b>' + m.mk + '</b></td>';
    html += '<td class="tc">' + nDosen + '</td><td class="tc">' + m.total + '</td>';
    html += '<td class="tc" style="color:#27500a">' + m.tepat + '</td>';
    html += '<td class="tc" style="color:#633806">' + m.lambat + '</td>';
    html += '<td class="tc" style="color:#791f1f">' + m.sangat + '</td>';
    html += '<td class="tc"><b style="color:' + (pT>=80?'#27500a':pT>=60?'#633806':'#a32d2d') + '">' + pT + '%</b></td>';
    html += '</tr>';
  });
  html += '</tbody></table></div>';

  // ── BAB IV: Detail Keterlambatan per Dosen ───────────────────────────
  html += '<div class="section page-break">';
  html += '<div class="bab">BAB IV</div>';
  html += '<div class="bab-judul">Detail Keterlambatan per Dosen dan Mata Kuliah</div>';
  html += '<div class="narasi-box">Bagian ini hanya menampilkan dosen yang pernah terlambat minimal 1 kali. ';
  html += 'Urutan dari dosen dengan keterlambatan terbanyak. ';
  html += 'Perhatian khusus: jika ada baris bertanda <b>⚠️ Periksa Data</b>, durasi keterlambatannya melebihi 120 menit yang kemungkinan besar merupakan kesalahan teknis (dosen lupa merekam selesai), bukan keterlambatan nyata. ';
  html += 'Data ini sebaiknya diverifikasi ulang sebelum dijadikan dasar tindakan formal.</div>';

  if (detailPerDosen.length === 0) {
    html += '<div style="padding:20px;text-align:center;background:#eaf3de;border-radius:8px;color:#27500a;font-weight:600">✅ Tidak ada catatan keterlambatan pada periode ini.</div>';
  } else {
    detailPerDosen.forEach(function(d, di) {
      html += '<div style="margin-bottom:20px;break-inside:avoid">';
      html += '<div class="dosen-header">';
      html += '<div class="dosen-no">' + (di+1) + '</div>';
      html += '<div style="flex:1"><div class="dosen-nama">' + d.nama + '</div>';
      html += '<div class="dosen-nip">NIP: ' + d.nip + ' · Total ' + d.totalLambat + 'x keterlambatan</div>';
      html += '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:5px">';
      if (d.modeSemua.luring   > 0) html += '<span style="background:#eaf3de;color:#27500a;border-radius:4px;padding:1px 6px;font-size:10px">🏫 Luring ' + d.modeSemua.luring + 'x (' + _pct(d.modeSemua.luring,d.modeSemua.total) + '%)</span>';
      if (d.modeSemua.sinkron  > 0) html += '<span style="background:#e6f1fb;color:#185fa5;border-radius:4px;padding:1px 6px;font-size:10px">💻 Sinkronus ' + d.modeSemua.sinkron + 'x (' + _pct(d.modeSemua.sinkron,d.modeSemua.total) + '%)</span>';
      if (d.modeSemua.asinkron > 0) html += '<span style="background:#faeeda;color:#633806;border-radius:4px;padding:1px 6px;font-size:10px">📝 Asinkronus ' + d.modeSemua.asinkron + 'x (' + _pct(d.modeSemua.asinkron,d.modeSemua.total) + '%)</span>';
      html += '</div></div></div>';

      html += '<table class="tbl" style="margin-top:8px">';
      html += '<thead><tr><th>Mata Kuliah</th><th class="tc">Jml Terlambat</th><th class="tc">Rata-rata Menit</th><th>Mode saat Terlambat</th><th>Keterangan</th></tr></thead><tbody>';
      d.items.forEach(function(item) {
        var hasAnomali = item.anomaliList && item.anomaliList.length > 0;
        var ketText = hasAnomali
          ? '⚠️ Periksa Data — ada ' + item.anomaliList.length + 'x durasi >120 mnt (kemungkinan lupa rekam selesai)'
          : item.avgMnt > 15 ? '🚨 Rata-rata sangat terlambat (' + item.avgMnt + ' mnt)'
          : item.avgMnt > 0  ? 'Terlambat rata-rata ' + item.avgMnt + ' mnt'
          : '—';
        var rowBg = hasAnomali ? 'background:#fff8e6' : item.count >= 3 ? 'background:#fff8f8' : '';
        var ketColor = hasAnomali ? 'color:#7a4f00;font-weight:600' : 'color:#555';
        var modeBadges = '';
        if (item.mLuring   > 0) modeBadges += '<span style="background:#eaf3de;color:#27500a;border-radius:3px;padding:1px 4px;font-size:9px;margin-right:2px">🏫 ' + item.mLuring + 'x</span>';
        if (item.mSinkron  > 0) modeBadges += '<span style="background:#e6f1fb;color:#185fa5;border-radius:3px;padding:1px 4px;font-size:9px;margin-right:2px">💻 ' + item.mSinkron + 'x</span>';
        if (item.mAsinkron > 0) modeBadges += '<span style="background:#faeeda;color:#633806;border-radius:3px;padding:1px 4px;font-size:9px">📝 ' + item.mAsinkron + 'x</span>';
        html += '<tr style="' + rowBg + '">';
        html += '<td>' + item.mk + '</td>';
        html += '<td class="tc"><b>' + item.count + 'x</b></td>';
        html += '<td class="tc">' + (item.avgMnt > 0 ? item.avgMnt + ' mnt' : '—') + '</td>';
        html += '<td>' + (modeBadges || '—') + '</td>';
        html += '<td style="font-size:10px;' + ketColor + '">' + ketText + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table></div>';
    });
  }
  html += '</div>';

  // ── BAB V: Profil Lengkap per Dosen ─────────────────────────────────
  html += '<div class="section page-break">';
  html += '<div class="bab">BAB V</div>';
  html += '<div class="bab-judul">Profil Kinerja Individual Per Dosen</div>';
  html += '<div class="narasi-box">Setiap halaman berikut menyajikan profil lengkap satu dosen: peringkat keseluruhan, distribusi ketepatan waktu, rincian per mata kuliah, dan mode perkuliahan yang digunakan. Halaman ini dapat digunakan sebagai lampiran untuk evaluasi individual.</div>';
  html += '</div>';

  // Satu halaman per dosen (urut berdasarkan ranking)
  rankingTerbaik.forEach(function(d, i) {
    var predikat   = d.pTepat >= 90 ? 'Sangat Baik' : d.pTepat >= 75 ? 'Baik' : d.pTepat >= 60 ? 'Cukup' : 'Perlu Perhatian';
    var predikatBg = d.pTepat >= 90 ? '#eaf3de' : d.pTepat >= 75 ? '#e6f1fb' : d.pTepat >= 60 ? '#faeeda' : '#fcebeb';
    var predikatTx = d.pTepat >= 90 ? '#27500a' : d.pTepat >= 75 ? '#185fa5' : d.pTepat >= 60 ? '#633806' : '#791f1f';
    var medal      = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i+1);
    var isLastDosen = (i === rankingTerbaik.length - 1);

    html += '<div class="section ' + (isLastDosen ? '' : 'page-break') + '" style="border:1.5px solid #e5e5e3;border-radius:12px;padding:18px 20px;margin-bottom:20px">';

    // Header profil
    html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;gap:12px;flex-wrap:wrap">';
    html += '<div style="display:flex;align-items:center;gap:12px">';
    html += '<div style="width:48px;height:48px;border-radius:50%;background:' + predikatBg + ';border:2px solid ' + predikatTx + ';display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:' + predikatTx + ';flex-shrink:0">' + (i < 3 ? medal : (i+1)) + '</div>';
    html += '<div>';
    html += '<div style="font-size:16px;font-weight:800;color:#1a1a1a">' + d.nama + '</div>';
    html += '<div style="font-size:11px;color:#888;margin-top:2px">NIP: ' + d.nip + ' · Peringkat ' + (i+1) + ' dari ' + rankingTerbaik.length + ' dosen</div>';
    html += '</div></div>';
    html += '<span style="background:' + predikatBg + ';color:' + predikatTx + ';border:1.5px solid ' + predikatTx + ';padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700">' + predikat + '</span>';
    html += '</div>';

    // Stat 4 kotak
    html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">';
    html += _profilStat('Total Sesi', d.total, '#f8f8f7', '#555');
    html += _profilStat('✅ Tepat Waktu', d.tepat + ' (' + d.pTepat + '%)', '#eaf3de', '#27500a');
    html += _profilStat('⏱ Terlambat', d.lambat + ' (' + _pct(d.lambat, d.total) + '%)', '#faeeda', '#633806');
    html += _profilStat('🚨 Sangat Terlambat', d.sangat + ' (' + _pct(d.sangat, d.total) + '%)', '#fcebeb', '#791f1f');
    html += '</div>';

    // Progress bar ketepatan
    var pL = _pct(d.lambat, d.total);
    var pS = _pct(d.sangat, d.total);
    html += '<div style="margin-bottom:4px;font-size:10px;color:#888">Distribusi ketepatan waktu:</div>';
    html += '<div style="display:flex;height:12px;border-radius:20px;overflow:hidden;background:#f0f0ee;margin-bottom:6px">';
    html += '<div style="background:#639922;width:' + d.pTepat + '%"></div>';
    html += '<div style="background:#BA7517;width:' + pL + '%"></div>';
    html += '<div style="background:#E24B4A;width:' + pS + '%"></div>';
    html += '</div>';
    html += '<div style="display:flex;gap:12px;font-size:10px;color:#555;margin-bottom:14px;flex-wrap:wrap">';
    html += '<span>🟢 Tepat: <b>' + d.pTepat + '%</b></span>';
    html += '<span>🟠 Terlambat: <b>' + pL + '%</b></span>';
    html += '<span>🔴 Sangat Terlambat: <b>' + pS + '%</b></span>';
    if (d.avgLambat > 0) html += '<span style="' + (d.anomali.length>0?'color:#7a4f00':'') + '">⏱ Rata-rata menit terlambat: <b>' + d.avgLambat + ' mnt</b>' + (d.anomali.length>0?' ⚠️':'') + '</span>';
    html += '</div>';

    // Anomali warning
    if (d.anomali.length > 0) {
      html += '<div style="padding:8px 12px;background:#fff8e6;border:1px solid #f9c84a;border-radius:8px;font-size:10px;color:#7a4f00;margin-bottom:12px">';
      html += '⚠️ <b>Catatan Anomali Data:</b> Terdapat ' + d.anomali.length + ' sesi dengan durasi keterlambatan >120 menit pada dosen ini. ';
      html += 'Kemungkinan besar disebabkan lupa merekam selesai sehingga sistem menghitung selisih waktu yang tidak wajar. ';
      html += 'Harap verifikasi manual sebelum data ini digunakan untuk evaluasi formal.';
      html += '</div>';
    }

    // Mode perkuliahan
    html += '<div style="margin-bottom:12px">';
    html += '<div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:6px">Mode Perkuliahan</div>';
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap">';
    if (d.mLuring   > 0) html += '<span style="background:#eaf3de;color:#27500a;border-radius:6px;padding:4px 10px;font-size:11px">🏫 Luring: <b>' + d.mLuring + 'x (' + d.pLuringD + '%)</b></span>';
    if (d.mSinkron  > 0) html += '<span style="background:#e6f1fb;color:#185fa5;border-radius:6px;padding:4px 10px;font-size:11px">💻 Sinkronus: <b>' + d.mSinkron + 'x (' + d.pSinkronD + '%)</b></span>';
    if (d.mAsinkron > 0) html += '<span style="background:#faeeda;color:#633806;border-radius:6px;padding:4px 10px;font-size:11px">📝 Asinkronus: <b>' + d.mAsinkron + 'x (' + d.pAsinkronD + '%)</b></span>';
    html += '</div></div>';

    // Tabel per MK
    if (d.mkBreakdown && d.mkBreakdown.length > 0) {
      html += '<div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:6px">Rincian per Mata Kuliah</div>';
      html += '<table class="tbl" style="font-size:10px">';
      html += '<thead><tr><th>Mata Kuliah</th><th class="tc">Sesi</th><th class="tc">✅</th><th class="tc">⏱</th><th class="tc">🚨</th><th class="tc">% Tepat</th></tr></thead><tbody>';
      d.mkBreakdown.forEach(function(m) {
        var pMk = _pct(m.tepat, m.total);
        var hasLambat = (m.lambat + m.sangat) > 0;
        html += '<tr style="' + (hasLambat ? 'background:#fff8f8' : '') + '">';
        html += '<td>' + m.mk + '</td>';
        html += '<td class="tc">' + m.total + '</td>';
        html += '<td class="tc" style="color:#27500a">' + m.tepat + '</td>';
        html += '<td class="tc" style="color:#633806">' + m.lambat + '</td>';
        html += '<td class="tc" style="color:#791f1f">' + m.sangat + '</td>';
        html += '<td class="tc"><b style="color:' + (pMk>=80?'#27500a':pMk>=60?'#633806':'#a32d2d') + '">' + pMk + '%</b></td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
    }

    html += '</div>'; // end profil dosen
  });

  // ── PENUTUP ───────────────────────────────────────────────────────────
  html += '<div class="section page-break">';
  html += '<div class="bab">PENUTUP</div>';
  html += '<div class="bab-judul">Kesimpulan dan Rekomendasi</div>';

  // Kesimpulan otomatis berdasarkan data
  html += '<h3 class="sub-judul">Kesimpulan</h3>';
  html += '<div class="narasi-box" style="padding:14px 16px">';
  html += '<ol style="margin:0;padding-left:18px;line-height:2">';
  html += '<li>Pada periode <b>' + labelPeriode + '</b>, dari total <b>' + nTotal + ' sesi</b> perkuliahan yang tercatat, sebanyak <b>' + pTepat + '%</b> (' + nTepat + ' sesi) berlangsung tepat waktu.</li>';
  html += '<li>Terdapat <b>' + rankingDosen.length + ' dosen</b> yang aktif merekam presensi, dengan <b>' + jSangatBaik + ' dosen</b> berpredikat Sangat Baik, <b>' + jBaik + ' dosen</b> Baik, <b>' + jCukup + ' dosen</b> Cukup, dan <b>' + jPerluPerhatian + ' dosen</b> Perlu Perhatian.</li>';
  html += '<li>Mata kuliah dengan keterlambatan terbanyak adalah <b>' + (mkList[0] ? mkList[0].mk : '—') + '</b>' + (mkList[0] && (mkList[0].lambat+mkList[0].sangat)>0 ? ' (' + (mkList[0].lambat+mkList[0].sangat) + 'x terlambat)' : '') + '.</li>';
  if (totalAnomali > 0) {
    html += '<li>Ditemukan <b>' + totalAnomali + ' sesi anomali data</b> dengan durasi keterlambatan tidak wajar (>120 menit). Data ini perlu diverifikasi manual dan tidak seharusnya langsung digunakan sebagai dasar tindakan.</li>';
  }
  html += '</ol></div>';

  html += '<h3 class="sub-judul">Rekomendasi</h3>';
  html += '<div class="narasi-box" style="padding:14px 16px"><ol style="margin:0;padding-left:18px;line-height:2">';
  if (jPerluPerhatian > 0) {
    html += '<li>Dosen dengan predikat <b>Perlu Perhatian</b> (' + jPerluPerhatian + ' dosen) sebaiknya dipanggil untuk klarifikasi dan pembinaan oleh pimpinan program studi.</li>';
  }
  if (jCukup > 0) {
    html += '<li>Dosen berpredikat <b>Cukup</b> (' + jCukup + ' dosen) perlu mendapat perhatian dan monitoring lebih ketat pada periode berikutnya.</li>';
  }
  html += '<li>Penggunaan moda <b>Daring Asinkronus</b> yang berlebihan (&gt;50% dari total sesi per dosen) perlu dievaluasi karena dapat mengurangi kualitas interaksi pembelajaran.</li>';
  html += '<li>Sistem LYTARA disarankan terus digunakan dan dioptimalkan, terutama untuk memastikan dosen merekam <b>waktu selesai</b> agar data keterlambatan dapat dihitung dengan akurat.</li>';
  if (totalAnomali > 0) {
    html += '<li>Lakukan verifikasi manual pada ' + totalAnomali + ' sesi yang terindikasi anomali data sebelum laporan ini dijadikan dokumen resmi evaluasi.</li>';
  }
  html += '</ol></div>';

  html += '<div style="margin-top:50px;display:flex;justify-content:space-between;align-items:flex-end">';
  html += '<div style="font-size:11px;color:#aaa">LYTARA v6.0 · Laporan digenerate otomatis · ' + tglCetak + '</div>';
  html += '<div style="text-align:center;min-width:200px">';
  html += '<div style="font-size:11px;color:#555;margin-bottom:4px">Mengetahui,</div>';
  html += '<div style="margin-top:50px;border-top:1px solid #333;padding-top:4px;font-size:11px;color:#555">Admin / Pejabat yang Berwenang</div>';
  html += '</div></div>';
  html += '</div>';

  html += '</body></html>';

  var win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
  if (!win) { alert('Popup diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(function(){ win.print(); }, 700);
}

// ── Helpers ───────────────────────────────────────────────────────────
function _fmtTgl(str) {
  if (!str) return '';
  return new Date(str + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
function _pct(n, total) { return total > 0 ? Math.round(n / total * 100) : 0; }

function _statBox(label, count, pct, bg, tx, border, sub) {
  return '<div style="flex:1;min-width:140px;background:' + bg + ';border:1.5px solid ' + border + ';border-radius:10px;padding:14px 12px;text-align:center">'
    + '<div style="font-size:11px;font-weight:700;color:' + tx + ';margin-bottom:6px">' + label + '</div>'
    + '<div style="font-size:32px;font-weight:800;color:' + tx + ';line-height:1">' + pct + '</div>'
    + '<div style="font-size:13px;color:' + tx + ';margin-top:4px">' + count + ' sesi</div>'
    + '<div style="font-size:10px;color:' + tx + ';opacity:.7;margin-top:4px;line-height:1.4">' + sub + '</div>'
    + '</div>';
}

function _profilStat(label, val, bg, tx) {
  return '<div style="background:' + bg + ';border-radius:8px;padding:8px 10px;text-align:center">'
    + '<div style="font-size:13px;font-weight:700;color:' + tx + '">' + val + '</div>'
    + '<div style="font-size:9px;color:' + tx + ';opacity:.8;margin-top:2px">' + label + '</div>'
    + '</div>';
}

function _miniStat(label, val, bg, tx) {
  return '<div style="background:' + bg + ';border-radius:8px;padding:6px 12px;display:flex;align-items:center;gap:8px">'
    + '<span style="font-size:18px;font-weight:800;color:' + tx + '">' + val + '</span>'
    + '<span style="font-size:10px;color:' + tx + ';line-height:1.3">' + label + '</span>'
    + '</div>';
}

function _panduanBox(judul, isi) {
  return '<div style="background:#f8f8f7;border-left:3px solid #185fa5;border-radius:0 8px 8px 0;padding:10px 14px">'
    + '<div style="font-size:12px;font-weight:700;color:#185fa5;margin-bottom:4px">' + judul + '</div>'
    + '<div style="font-size:11px;color:#444;line-height:1.6">' + isi + '</div>'
    + '</div>';
}

function _legendaBox(label, desc, bg, tx, border) {
  return '<div style="flex:1;min-width:160px;background:' + bg + ';border:1px solid ' + border + ';border-radius:8px;padding:8px 12px">'
    + '<div style="font-size:11px;font-weight:700;color:' + tx + ';margin-bottom:3px">' + label + '</div>'
    + '<div style="font-size:10px;color:' + tx + ';opacity:.8;line-height:1.5">' + desc + '</div>'
    + '</div>';
}

function _cssLaporan() {
  return [
    '@page { size: A4; margin: 18mm 16mm 18mm 20mm; }',
    'body { font-family: "Segoe UI", Arial, sans-serif; font-size: 12px; color: #1a1a1a; background:#fff; line-height:1.5; }',
    'h1,h2,h3 { margin:0; }',
    '.cover { text-align:center; padding:60px 30px 40px; min-height:260mm; display:flex; flex-direction:column; align-items:center; justify-content:center; }',
    '.cover-logo { font-size:52px; margin-bottom:10px; }',
    '.cover-sistem { font-size:11px; color:#888; letter-spacing:.05em; text-transform:uppercase; margin-bottom:30px; }',
    '.cover-judul { font-size:30px; font-weight:800; color:#185fa5; line-height:1.25; margin-bottom:12px; }',
    '.cover-sub { font-size:13px; color:#555; margin-bottom:36px; }',
    '.cover-meta { border-collapse:collapse; font-size:12px; text-align:left; }',
    '.cover-meta td { padding:5px 10px; }',
    '.cover-meta td:first-child { color:#888; white-space:nowrap; }',
    '.cover-meta td:nth-child(2) { color:#aaa; padding:5px 6px; }',
    '.cover-footer { margin-top:40px; font-size:10px; color:#bbb; }',
    '.section { padding:0 0 24px; }',
    '.bab { font-size:10px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:.1em; margin-bottom:4px; }',
    '.bab-judul { font-size:18px; font-weight:800; color:#185fa5; margin-bottom:12px; padding-bottom:8px; border-bottom:2.5px solid #185fa5; }',
    '.sub-judul { font-size:13px; font-weight:700; color:#1a1a1a; margin:18px 0 8px; }',
    '.narasi { font-size:12px; color:#444; margin-bottom:14px; line-height:1.7; }',
    '.narasi-box { background:#f8f8f7; border-left:3px solid #ddd; border-radius:0 8px 8px 0; padding:10px 14px; font-size:11px; color:#444; line-height:1.7; margin-bottom:14px; }',
    '.stat-row { display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap; }',
    '.prog-wrap { display:flex; height:14px; border-radius:20px; overflow:hidden; background:#f0f0ee; margin-bottom:8px; }',
    '.prog-seg { height:100%; }',
    '.prog-legend { display:flex; gap:16px; font-size:11px; color:#555; margin-bottom:18px; flex-wrap:wrap; }',
    '.leg-item { display:flex; align-items:center; gap:5px; }',
    '.leg-dot { width:10px; height:10px; border-radius:50%; display:inline-block; flex-shrink:0; }',
    '.tbl { width:100%; border-collapse:collapse; font-size:11px; margin-bottom:14px; }',
    '.tbl th { background:#185fa5; color:#fff; padding:7px 8px; text-align:left; font-size:10px; font-weight:600; }',
    '.tbl td { padding:6px 8px; border-bottom:0.5px solid #e5e5e3; vertical-align:middle; }',
    '.tbl tr:nth-child(even) td { background:#f9f9f8; }',
    '.total-row td { background:#f0f0ee !important; font-weight:700; border-top:1.5px solid #ddd; }',
    '.tc { text-align:center; }',
    '.dosen-header { display:flex; align-items:center; gap:10px; background:#f0f7ff; border:1px solid #85b7eb; border-radius:8px; padding:10px 12px; }',
    '.dosen-no { width:28px; height:28px; border-radius:50%; background:#185fa5; color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center; font-size:11px; flex-shrink:0; }',
    '.dosen-nama { font-size:13px; font-weight:700; color:#185fa5; }',
    '.dosen-nip { font-size:10px; color:#888; margin-top:2px; }',
    '.page-break { page-break-after: always; }',
    '@media print { body { background:#fff; } .cover { min-height:auto; page-break-after:always; } }',
  ].join('\n');
}
