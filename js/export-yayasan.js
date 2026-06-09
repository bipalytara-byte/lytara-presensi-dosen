/* export-yayasan.js — Laporan Ketepatan Waktu untuk Yayasan
   Berisi:
   1. exportLaporanYayasan()  → buka jendela print (PDF-ready)
   Isi laporan:
     - Halaman sampul (judul, periode, institusi, tanggal cetak)
     - Bagian 1: Ringkasan Agregat (total sesi, % tepat/terlambat/sangat terlambat, mode)
     - Bagian 2: Peringkat Dosen (ranking tepat waktu, terlambat, jumlah sesi)
     - Bagian 3: Rekapitulasi per Mata Kuliah (keseluruhan & per dosen)
     - Bagian 4: Detail Keterlambatan per Dosen (MK apa saja, berapa kali)
*/

function exportLaporanYayasan() {
  if (!isAdmin) { alert('Hanya admin yang dapat mengekspor laporan yayasan.'); return; }

  // ── Ambil filter aktif ──────────────────────────────────────────────
  var start = document.getElementById('r-start') ? document.getElementById('r-start').value : '';
  var end   = document.getElementById('r-end')   ? document.getElementById('r-end').value   : '';
  var df    = document.getElementById('rd')      ? document.getElementById('rd').value      : 'all';

  var labelPeriode = (start || end)
    ? ((start ? _fmtTgl(start) : 'Awal Data') + ' – ' + (end ? _fmtTgl(end) : 'Akhir Data'))
    : 'Semua Periode';

  // ── Filter data ─────────────────────────────────────────────────────
  var data = P.slice();
  if (start) { var ts0 = new Date(start).setHours(0,0,0,0);   data = data.filter(function(p){ return parseTanggal(p.tanggal) >= ts0; }); }
  if (end)   { var ts1 = new Date(end).setHours(23,59,59,999); data = data.filter(function(p){ return parseTanggal(p.tanggal) <= ts1; }); }
  if (df !== 'all') data = data.filter(function(p){ return p.dosenId === df; });

  var ds = df !== 'all' ? D.filter(function(d){ return d.id === df; }) : D.slice();

  if (data.length === 0) {
    alert('Tidak ada data presensi pada periode / filter yang dipilih.');
    return;
  }

  // ── BAGIAN 1 : Agregat Keseluruhan ──────────────────────────────────
  var nTotal    = data.length;
  var nTepat    = data.filter(function(p){ return p.color === 'green';  }).length;
  var nLambat   = data.filter(function(p){ return p.color === 'yellow'; }).length;
  var nSangat   = data.filter(function(p){ return p.color === 'red';    }).length;
  var nLuring   = data.filter(function(p){ return !p.modeKuliah || p.modeKuliah.indexOf('Luring') > -1; }).length;
  var nSinkron  = data.filter(function(p){ return p.modeKuliah && p.modeKuliah.indexOf('Sinkronus') > -1 && p.modeKuliah.indexOf('Asinkronus') === -1; }).length;
  var nAsinkron = data.filter(function(p){ return p.modeKuliah && p.modeKuliah.indexOf('Asinkronus') > -1; }).length;

  var pTepat  = _pct(nTepat,  nTotal);
  var pLambat = _pct(nLambat, nTotal);
  var pSangat = _pct(nSangat, nTotal);

  // ── BAGIAN 2 : Peringkat Per Dosen ───────────────────────────────────
  var rankingDosen = ds.map(function(d) {
    var dd = data.filter(function(p){ return p.dosenId === d.id; });
    if (dd.length === 0) return null;
    var t  = dd.filter(function(p){ return p.color === 'green';  }).length;
    var l  = dd.filter(function(p){ return p.color === 'yellow'; }).length;
    var s  = dd.filter(function(p){ return p.color === 'red';    }).length;
    var totalMenitLambat = dd.reduce(function(acc, p){
      return acc + (p.color === 'yellow' || p.color === 'red' ? (Number(p.diff) || 0) : 0);
    }, 0);
    var mLuring   = dd.filter(function(p){ return !p.modeKuliah || p.modeKuliah.indexOf('Luring') > -1; }).length;
    var mSinkron  = dd.filter(function(p){ return p.modeKuliah && p.modeKuliah.indexOf('Sinkronus') > -1 && p.modeKuliah.indexOf('Asinkronus') === -1; }).length;
    var mAsinkron = dd.filter(function(p){ return p.modeKuliah && p.modeKuliah.indexOf('Asinkronus') > -1; }).length;
    return {
      nama:      d.nama,
      nip:       d.nip || '—',
      total:     dd.length,
      tepat:     t,
      lambat:    l,
      sangat:    s,
      pTepat:    _pct(t, dd.length),
      pLambat:   _pct(l + s, dd.length),
      avgLambat: (l + s) > 0 ? Math.round(totalMenitLambat / (l + s)) : 0,
      mLuring:   mLuring,
      mSinkron:  mSinkron,
      mAsinkron: mAsinkron,
      pLuringD:   _pct(mLuring,   dd.length),
      pSinkronD:  _pct(mSinkron,  dd.length),
      pAsinkronD: _pct(mAsinkron, dd.length)
    };
  }).filter(Boolean);

  // Urutkan: % tepat waktu tertinggi dulu (ranking terbaik)
  var rankingTerbaik = rankingDosen.slice().sort(function(a, b){
    return b.pTepat - a.pTepat || b.tepat - a.tepat;
  });

  // ── BAGIAN 3 : Rekap per Mata Kuliah ────────────────────────────────
  var mkMap = {};
  data.forEach(function(p) {
    var key = p.mk || '(Tidak Ada Nama MK)';
    if (!mkMap[key]) mkMap[key] = { mk: key, total: 0, tepat: 0, lambat: 0, sangat: 0, dosenSet: {} };
    mkMap[key].total++;
    if (p.color === 'green')  mkMap[key].tepat++;
    if (p.color === 'yellow') mkMap[key].lambat++;
    if (p.color === 'red')    mkMap[key].sangat++;
    mkMap[key].dosenSet[p.dosenId] = true;
  });
  var mkList = Object.values(mkMap).sort(function(a, b){ return (b.lambat + b.sangat) - (a.lambat + a.sangat); });

  // ── BAGIAN 4 : Detail Keterlambatan per Dosen & MK ──────────────────
  // Struktur: { dosenNama, nip, items: [{mk, total, tepat, lambat, sangat, pTepat, avgMnt}] }
  var detailPerDosen = ds.map(function(d) {
    var dd = data.filter(function(p){ return p.dosenId === d.id && (p.color === 'yellow' || p.color === 'red'); });
    if (dd.length === 0) return null;
    var mkDetail = {};
    dd.forEach(function(p) {
      var k = p.mk || '(Tidak Ada Nama MK)';
      if (!mkDetail[k]) mkDetail[k] = { mk: k, count: 0, totalMnt: 0, mLuring: 0, mSinkron: 0, mAsinkron: 0 };
      mkDetail[k].count++;
      mkDetail[k].totalMnt += Number(p.diff) || 0;
      if (!p.modeKuliah || p.modeKuliah.indexOf('Luring') > -1) mkDetail[k].mLuring++;
      else if (p.modeKuliah.indexOf('Asinkronus') > -1)         mkDetail[k].mAsinkron++;
      else if (p.modeKuliah.indexOf('Sinkronus') > -1)          mkDetail[k].mSinkron++;
    });
    // Mode keseluruhan dosen ini (semua sesi, bukan hanya terlambat)
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

  // ── Tanggal cetak ────────────────────────────────────────────────────
  var tglCetak = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  var institusi = 'Program Studi — ' + (SEMESTER_AKTIF || 'Semester Aktif');

  // ── BUILD HTML ───────────────────────────────────────────────────────
  var html = '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">';
  html += '<title>Laporan Ketepatan Waktu Dosen — ' + labelPeriode + '</title>';
  html += '<style>' + _cssLaporan() + '</style></head><body>';

  // ── Sampul ──────────────────────────────────────────────────────────
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
  html += '<div class="cover-footer">Dokumen ini digenerate otomatis oleh sistem LYTARA v6.0 · Bersifat rahasia</div>';
  html += '</div>';

  // ── BAB 1: Ringkasan Agregat ─────────────────────────────────────────
  html += '<div class="section page-break">';
  html += '<div class="bab">BAB I</div>';
  html += '<div class="bab-judul">Ringkasan Agregat Keseluruhan</div>';
  html += '<p class="narasi">Ringkasan berikut menggambarkan kondisi ketepatan waktu seluruh dosen pada periode <b>' + labelPeriode + '</b>. Data diambil dari sistem presensi digital LYTARA berdasarkan waktu rekam hadir dosen dibandingkan jadwal yang telah ditetapkan.</p>';

  // Stat 3 kotak besar
  html += '<div class="stat-row">';
  html += _statBox('✅ Tepat Waktu',   nTepat,  pTepat  + '%', '#eaf3de', '#27500a', '#97c459', 'Hadir sesuai atau sebelum batas toleransi');
  html += _statBox('⏱ Terlambat',     nLambat, pLambat + '%', '#faeeda', '#633806', '#fac775', 'Terlambat 1–15 menit dari jam jadwal');
  html += _statBox('🚨 Sangat Terlambat', nSangat, pSangat + '%', '#fcebeb', '#791f1f', '#f09595', 'Terlambat lebih dari 15 menit');
  html += '</div>';

  // Progress bar
  html += '<div class="prog-wrap">';
  html += '<div style="background:#639922;width:' + pTepat + '%" class="prog-seg" title="Tepat: ' + pTepat + '%"></div>';
  html += '<div style="background:#BA7517;width:' + pLambat + '%" class="prog-seg" title="Terlambat: ' + pLambat + '%"></div>';
  html += '<div style="background:#E24B4A;width:' + pSangat + '%" class="prog-seg" title="Sangat Terlambat: ' + pSangat + '%"></div>';
  html += '</div>';
  html += '<div class="prog-legend">';
  html += '<span class="leg-item"><span class="leg-dot" style="background:#639922"></span>Tepat Waktu (' + pTepat + '%)</span>';
  html += '<span class="leg-item"><span class="leg-dot" style="background:#BA7517"></span>Terlambat (' + pLambat + '%)</span>';
  html += '<span class="leg-item"><span class="leg-dot" style="background:#E24B4A"></span>Sangat Terlambat (' + pSangat + '%)</span>';
  html += '</div>';

  // Mode perkuliahan
  html += '<h3 class="sub-judul">1.2 Mode Perkuliahan</h3>';
  html += '<table class="tbl"><thead><tr><th>Mode</th><th>Jumlah Sesi</th><th>Persentase</th></tr></thead><tbody>';
  html += '<tr><td>🏫 Luring / Tatap Muka</td><td class="tc">' + nLuring + '</td><td class="tc">' + _pct(nLuring, nTotal) + '%</td></tr>';
  html += '<tr><td>💻 Daring Sinkronus (Online Real-time)</td><td class="tc">' + nSinkron + '</td><td class="tc">' + _pct(nSinkron, nTotal) + '%</td></tr>';
  html += '<tr><td>📝 Daring Asinkronus (Penugasan Mandiri)</td><td class="tc">' + nAsinkron + '</td><td class="tc">' + _pct(nAsinkron, nTotal) + '%</td></tr>';
  html += '<tr class="total-row"><td><b>Total</b></td><td class="tc"><b>' + nTotal + '</b></td><td class="tc"><b>100%</b></td></tr>';
  html += '</tbody></table>';
  html += '</div>'; // end section bab 1

  // ── BAB 2: Peringkat Dosen ───────────────────────────────────────────
  html += '<div class="section page-break">';
  html += '<div class="bab">BAB II</div>';
  html += '<div class="bab-judul">Peringkat Ketepatan Waktu Per Dosen</div>';
  html += '<p class="narasi">Tabel berikut menampilkan peringkat seluruh dosen berdasarkan persentase ketepatan waktu hadir, diurutkan dari yang terbaik. Dosen dengan persentase tepat waktu tertinggi mendapat peringkat 1.</p>';

  html += '<table class="tbl">';
  html += '<thead><tr>';
  html += '<th style="width:36px">No.</th>';
  html += '<th>Nama Dosen</th>';
  html += '<th class="tc">Total Sesi</th>';
  html += '<th class="tc">✅ Tepat</th>';
  html += '<th class="tc">⏱ Terlambat</th>';
  html += '<th class="tc">🚨 Sangat</th>';
  html += '<th class="tc">% Tepat</th>';
  html += '<th class="tc">% Terlambat</th>';
  html += '<th class="tc">Rata Mnt</th>';
  html += '<th>Mode Perkuliahan</th>';
  html += '<th>Predikat</th>';
  html += '</tr></thead><tbody>';

  rankingTerbaik.forEach(function(d, i) {
    var predikat = d.pTepat >= 90 ? 'Sangat Baik'
                 : d.pTepat >= 75 ? 'Baik'
                 : d.pTepat >= 60 ? 'Cukup'
                 : 'Perlu Perhatian';
    var predikatBg = d.pTepat >= 90 ? '#eaf3de' : d.pTepat >= 75 ? '#e6f1fb' : d.pTepat >= 60 ? '#faeeda' : '#fcebeb';
    var predikatTx = d.pTepat >= 90 ? '#27500a' : d.pTepat >= 75 ? '#185fa5' : d.pTepat >= 60 ? '#633806' : '#791f1f';
    var medal = i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : '';
    html += '<tr>';
    html += '<td class="tc">' + (i + 1) + '</td>';
    html += '<td><b>' + medal + d.nama + '</b><br><span style="font-size:10px;color:#888">' + d.nip + '</span></td>';
    html += '<td class="tc">' + d.total + '</td>';
    html += '<td class="tc" style="color:#27500a;font-weight:600">' + d.tepat + '</td>';
    html += '<td class="tc" style="color:#633806">' + d.lambat + '</td>';
    html += '<td class="tc" style="color:#791f1f">' + d.sangat + '</td>';
    html += '<td class="tc"><b style="color:' + (d.pTepat >= 80 ? '#27500a' : d.pTepat >= 60 ? '#633806' : '#a32d2d') + '">' + d.pTepat + '%</b></td>';
    html += '<td class="tc" style="color:' + (d.pLambat > 30 ? '#a32d2d' : '#555') + '">' + d.pLambat + '%</td>';
    html += '<td class="tc">' + (d.avgLambat > 0 ? d.avgLambat + ' mnt' : '—') + '</td>';
    html += '<td>'
      + '<div style="display:flex;flex-direction:column;gap:2px;font-size:10px">'
      + (d.mLuring   > 0 ? '<span style="background:#eaf3de;color:#27500a;border-radius:4px;padding:1px 5px;white-space:nowrap">🏫 Luring ' + d.mLuring + 'x (' + d.pLuringD + '%)</span>' : '')
      + (d.mSinkron  > 0 ? '<span style="background:#e6f1fb;color:#185fa5;border-radius:4px;padding:1px 5px;white-space:nowrap">💻 Sinkronus ' + d.mSinkron + 'x (' + d.pSinkronD + '%)</span>' : '')
      + (d.mAsinkron > 0 ? '<span style="background:#faeeda;color:#633806;border-radius:4px;padding:1px 5px;white-space:nowrap">📝 Asinkronus ' + d.mAsinkron + 'x (' + d.pAsinkronD + '%)</span>' : '')
      + '</div>'
      + '</td>';
    html += '<td><span style="background:' + predikatBg + ';color:' + predikatTx + ';padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;white-space:nowrap">' + predikat + '</span></td>';
    html += '</tr>';
  });

  // Baris ringkasan bawah
  var avgTepat = rankingTerbaik.length > 0
    ? Math.round(rankingTerbaik.reduce(function(s, d){ return s + d.pTepat; }, 0) / rankingTerbaik.length)
    : 0;
  html += '<tr class="total-row">';
  html += '<td colspan="2"><b>Rata-Rata Keseluruhan</b></td>';
  html += '<td class="tc"><b>' + nTotal + '</b></td>';
  html += '<td class="tc"><b>' + nTepat + '</b></td>';
  html += '<td class="tc"><b>' + nLambat + '</b></td>';
  html += '<td class="tc"><b>' + nSangat + '</b></td>';
  html += '<td class="tc"><b>' + avgTepat + '%</b></td>';
  html += '<td colspan="4"></td>';
  html += '</tr>';
  html += '</tbody></table>';
  html += '</div>'; // end bab 2

  // ── BAB 3: Rekap per Mata Kuliah ─────────────────────────────────────
  html += '<div class="section page-break">';
  html += '<div class="bab">BAB III</div>';
  html += '<div class="bab-judul">Rekapitulasi Ketepatan Waktu per Mata Kuliah</div>';
  html += '<p class="narasi">Tabel berikut merangkum data ketepatan waktu berdasarkan mata kuliah, diurutkan dari yang memiliki jumlah keterlambatan terbanyak. Data ini dapat digunakan untuk mengidentifikasi mata kuliah yang secara konsisten mengalami masalah ketepatan waktu pengajar.</p>';

  html += '<table class="tbl">';
  html += '<thead><tr>';
  html += '<th style="width:28px">No.</th>';
  html += '<th>Mata Kuliah</th>';
  html += '<th class="tc">Jml Dosen</th>';
  html += '<th class="tc">Total Sesi</th>';
  html += '<th class="tc">✅ Tepat</th>';
  html += '<th class="tc">⏱ Terlambat</th>';
  html += '<th class="tc">🚨 Sangat</th>';
  html += '<th class="tc">% Tepat</th>';
  html += '</tr></thead><tbody>';

  mkList.forEach(function(m, i) {
    var pT = _pct(m.tepat, m.total);
    var nDosen = Object.keys(m.dosenSet).length;
    var rowBg = (m.lambat + m.sangat) > 3 ? 'background:#fff8f8' : '';
    html += '<tr style="' + rowBg + '">';
    html += '<td class="tc">' + (i + 1) + '</td>';
    html += '<td><b>' + m.mk + '</b></td>';
    html += '<td class="tc">' + nDosen + '</td>';
    html += '<td class="tc">' + m.total + '</td>';
    html += '<td class="tc" style="color:#27500a">' + m.tepat + '</td>';
    html += '<td class="tc" style="color:#633806">' + m.lambat + '</td>';
    html += '<td class="tc" style="color:#791f1f">' + m.sangat + '</td>';
    html += '<td class="tc"><b style="color:' + (pT >= 80 ? '#27500a' : pT >= 60 ? '#633806' : '#a32d2d') + '">' + pT + '%</b></td>';
    html += '</tr>';
  });
  html += '</tbody></table>';
  html += '</div>'; // end bab 3

  // ── BAB 4: Detail Keterlambatan per Dosen ────────────────────────────
  html += '<div class="section page-break">';
  html += '<div class="bab">BAB IV</div>';
  html += '<div class="bab-judul">Detail Keterlambatan per Dosen dan Mata Kuliah</div>';
  html += '<p class="narasi">Bagian ini merinci dosen yang memiliki catatan keterlambatan beserta mata kuliah yang bersangkutan. Hanya dosen yang pernah terlambat minimal 1 kali yang ditampilkan. Data diurutkan dari dosen dengan jumlah keterlambatan terbanyak.</p>';

  if (detailPerDosen.length === 0) {
    html += '<div style="padding:20px;text-align:center;background:#eaf3de;border-radius:8px;color:#27500a;font-weight:600">✅ Tidak ada catatan keterlambatan pada periode ini.</div>';
  } else {
    detailPerDosen.forEach(function(d, di) {
      html += '<div style="margin-bottom:20px;break-inside:avoid">';
      html += '<div class="dosen-header">';
      html += '<div class="dosen-no">' + (di + 1) + '</div>';
      html += '<div style="flex:1"><div class="dosen-nama">' + d.nama + '</div>';
      html += '<div class="dosen-nip">NIP: ' + d.nip + ' · Total ' + d.totalLambat + 'x keterlambatan</div>';
      // Mode summary keseluruhan dosen ini
      html += '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:5px">';
      if (d.modeSemua.luring   > 0) html += '<span style="background:#eaf3de;color:#27500a;border-radius:4px;padding:1px 6px;font-size:10px">🏫 Luring ' + d.modeSemua.luring + 'x (' + _pct(d.modeSemua.luring, d.modeSemua.total) + '%)</span>';
      if (d.modeSemua.sinkron  > 0) html += '<span style="background:#e6f1fb;color:#185fa5;border-radius:4px;padding:1px 6px;font-size:10px">💻 Sinkronus ' + d.modeSemua.sinkron + 'x (' + _pct(d.modeSemua.sinkron, d.modeSemua.total) + '%)</span>';
      if (d.modeSemua.asinkron > 0) html += '<span style="background:#faeeda;color:#633806;border-radius:4px;padding:1px 6px;font-size:10px">📝 Asinkronus ' + d.modeSemua.asinkron + 'x (' + _pct(d.modeSemua.asinkron, d.modeSemua.total) + '%)</span>';
      html += '</div>';
      html += '</div></div>';

      html += '<table class="tbl" style="margin-top:8px">';
      html += '<thead><tr><th>Mata Kuliah</th><th class="tc">Jml Terlambat</th><th class="tc">Rata-rata Menit</th><th>Mode saat Terlambat</th><th>Keterangan</th></tr></thead>';
      html += '<tbody>';
      d.items.forEach(function(item) {
        var ket = item.avgMnt > 15 ? '⚠️ Rata-rata sangat terlambat'
                : item.avgMnt > 0  ? 'Terlambat ' + item.avgMnt + ' mnt rata-rata'
                : '—';
        var rowC = item.count >= 3 ? 'background:#fff8f8' : '';
        var modeBadges = '';
        if (item.mLuring   > 0) modeBadges += '<span style="background:#eaf3de;color:#27500a;border-radius:3px;padding:1px 4px;font-size:9px;margin-right:2px">🏫 ' + item.mLuring + 'x</span>';
        if (item.mSinkron  > 0) modeBadges += '<span style="background:#e6f1fb;color:#185fa5;border-radius:3px;padding:1px 4px;font-size:9px;margin-right:2px">💻 ' + item.mSinkron + 'x</span>';
        if (item.mAsinkron > 0) modeBadges += '<span style="background:#faeeda;color:#633806;border-radius:3px;padding:1px 4px;font-size:9px">📝 ' + item.mAsinkron + 'x</span>';
        html += '<tr style="' + rowC + '">';
        html += '<td>' + item.mk + '</td>';
        html += '<td class="tc"><b>' + item.count + 'x</b></td>';
        html += '<td class="tc">' + (item.avgMnt > 0 ? item.avgMnt + ' mnt' : '—') + '</td>';
        html += '<td>' + (modeBadges || '—') + '</td>';
        html += '<td style="font-size:10px;color:#555">' + ket + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
      html += '</div>';
    });
  }
  html += '</div>'; // end bab 4

  // ── Penutup ──────────────────────────────────────────────────────────
  html += '<div class="section" style="break-inside:avoid">';
  html += '<div class="bab">PENUTUP</div>';
  html += '<p class="narasi" style="margin-bottom:12px">Laporan ini disusun secara otomatis oleh sistem LYTARA berdasarkan data presensi yang telah direkam oleh dosen melalui aplikasi. Data yang ditampilkan mencerminkan kondisi nyata pada periode yang dipilih dan dapat dipertanggungjawabkan sesuai rekaman sistem.</p>';
  html += '<p class="narasi">Apabila terdapat kekeliruan data atau perbedaan catatan, harap menghubungi Bidang Akademik untuk verifikasi lebih lanjut sebelum laporan ini dijadikan dasar pengambilan keputusan resmi.</p>';
  html += '<div style="margin-top:40px;display:flex;justify-content:flex-end">';
  html += '<div style="text-align:center;min-width:200px">';
  html += '<div style="font-size:11px;color:#555;margin-bottom:4px">Dicetak pada</div>';
  html += '<div style="font-size:12px;font-weight:600">' + tglCetak + '</div>';
  html += '<div style="margin-top:50px;border-top:1px solid #333;padding-top:4px;font-size:11px;color:#555">Admin / Pejabat yang Berwenang</div>';
  html += '</div></div>';
  html += '</div>';

  html += '</body></html>';

  // ── Buka jendela print ───────────────────────────────────────────────
  var win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
  if (!win) { alert('Popup diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  // Tunda print agar CSS selesai di-render dulu
  setTimeout(function(){ win.print(); }, 600);
}

// ── Helper: format tanggal YYYY-MM-DD → "12 Januari 2025" ────────────
function _fmtTgl(str) {
  if (!str) return '';
  var d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Helper: hitung persentase bulat ──────────────────────────────────
function _pct(n, total) {
  return total > 0 ? Math.round(n / total * 100) : 0;
}

// ── Helper: satu kotak statistik besar ───────────────────────────────
function _statBox(label, count, pct, bg, tx, border, sub) {
  return '<div style="flex:1;min-width:140px;background:' + bg + ';border:1.5px solid ' + border + ';border-radius:10px;padding:14px 12px;text-align:center">'
    + '<div style="font-size:11px;font-weight:700;color:' + tx + ';margin-bottom:6px">' + label + '</div>'
    + '<div style="font-size:32px;font-weight:800;color:' + tx + ';line-height:1">' + pct + '</div>'
    + '<div style="font-size:13px;color:' + tx + ';margin-top:4px">' + count + ' sesi</div>'
    + '<div style="font-size:10px;color:' + tx + ';opacity:.7;margin-top:4px;line-height:1.4">' + sub + '</div>'
    + '</div>';
}

// ── CSS untuk laporan (print-friendly, A4) ────────────────────────────
function _cssLaporan() {
  return [
    '@page { size: A4; margin: 18mm 16mm 18mm 20mm; }',
    'body { font-family: "Segoe UI", Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; line-height: 1.5; }',
    'h1, h2, h3 { margin: 0; }',

    /* ── Sampul ── */
    '.cover { text-align:center; padding: 60px 30px 40px; min-height: 260mm; display:flex; flex-direction:column; align-items:center; justify-content:center; }',
    '.cover-logo { font-size: 52px; margin-bottom: 10px; }',
    '.cover-sistem { font-size: 11px; color: #888; letter-spacing:.05em; text-transform:uppercase; margin-bottom: 30px; }',
    '.cover-judul { font-size: 30px; font-weight: 800; color: #185fa5; line-height: 1.25; margin-bottom: 12px; }',
    '.cover-sub { font-size: 13px; color: #555; margin-bottom: 36px; }',
    '.cover-meta { border-collapse:collapse; font-size: 12px; text-align:left; }',
    '.cover-meta td { padding: 5px 10px; }',
    '.cover-meta td:first-child { color:#888; white-space:nowrap; }',
    '.cover-meta td:nth-child(2) { color:#aaa; padding:5px 6px; }',
    '.cover-footer { margin-top:40px; font-size:10px; color:#bbb; }',

    /* ── Section ── */
    '.section { padding: 0 0 24px; }',
    '.bab { font-size:10px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:.1em; margin-bottom:4px; }',
    '.bab-judul { font-size:18px; font-weight:800; color:#185fa5; margin-bottom:12px; padding-bottom:8px; border-bottom:2.5px solid #185fa5; }',
    '.sub-judul { font-size:13px; font-weight:700; color:#1a1a1a; margin:18px 0 8px; }',
    '.narasi { font-size:12px; color:#444; margin-bottom:14px; line-height:1.7; }',

    /* ── Stat boxes ── */
    '.stat-row { display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap; }',

    /* ── Progress bar ── */
    '.prog-wrap { display:flex; height:14px; border-radius:20px; overflow:hidden; background:#f0f0ee; margin-bottom:8px; }',
    '.prog-seg { height:100%; }',
    '.prog-legend { display:flex; gap:16px; font-size:11px; color:#555; margin-bottom:18px; flex-wrap:wrap; }',
    '.leg-item { display:flex; align-items:center; gap:5px; }',
    '.leg-dot { width:10px; height:10px; border-radius:50%; display:inline-block; flex-shrink:0; }',

    /* ── Tabel ── */
    '.tbl { width:100%; border-collapse:collapse; font-size:11px; margin-bottom:14px; }',
    '.tbl th { background:#185fa5; color:#fff; padding:7px 8px; text-align:left; font-size:10px; font-weight:600; }',
    '.tbl td { padding:6px 8px; border-bottom:0.5px solid #e5e5e3; vertical-align:middle; }',
    '.tbl tr:nth-child(even) td { background:#f9f9f8; }',
    '.tbl tr:hover td { background:#f0f7ff; }',
    '.total-row td { background:#f0f0ee !important; font-weight:700; border-top:1.5px solid #ddd; }',
    '.tc { text-align:center; }',

    /* ── Header dosen di bab 4 ── */
    '.dosen-header { display:flex; align-items:center; gap:10px; background:#f0f7ff; border:1px solid #85b7eb; border-radius:8px; padding:10px 12px; }',
    '.dosen-no { width:28px; height:28px; border-radius:50%; background:#185fa5; color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center; font-size:11px; flex-shrink:0; }',
    '.dosen-nama { font-size:13px; font-weight:700; color:#185fa5; }',
    '.dosen-nip { font-size:10px; color:#888; margin-top:2px; }',

    /* ── Page break ── */
    '.page-break { page-break-after: always; }',

    /* ── Print: sembunyikan elemen navigasi ── */
    '@media print {',
    '  body { background: #fff; }',
    '  .cover { min-height: auto; page-break-after: always; }',
    '}',
  ].join('\n');
}
