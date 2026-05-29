/* mk.js — Master data Mata Kuliah
   Fungsi: renderMK, openMMK, saveMMK, hapusMK,
           importMkDariJadwal, fillDropdownMK
*/

var PRODI_LIST = [
  'S1 Teknik Informatika',
  'S1 Sistem Informasi',
  'D3 Manajemen Informatika'
];

// =====================================================
// RENDER TABEL MATA KULIAH
// =====================================================
function renderMK() {
  var el = document.getElementById('mk-list');
  if (!el) return;

  // Filter
  var qNama  = (document.getElementById('mk-cari')  ? document.getElementById('mk-cari').value  : '').toLowerCase();
  var qProdi = (document.getElementById('mk-prodi') ? document.getElementById('mk-prodi').value : 'all');
  var qTahun = (document.getElementById('mk-tahun') ? document.getElementById('mk-tahun').value : 'all');

  var data = MK.filter(function(m){
    if (qNama  && m.nama.toLowerCase().indexOf(qNama) === -1 && m.kode.toLowerCase().indexOf(qNama) === -1) return false;
    if (qProdi !== 'all' && m.prodi !== qProdi) return false;
    if (qTahun !== 'all' && m.tahunAkademik !== qTahun) return false;
    return true;
  });

  // Update counter
  var cnt = document.getElementById('mk-cnt');
  if (cnt) cnt.textContent = MK.length + ' mata kuliah' + (data.length < MK.length ? ' · '+data.length+' ditampilkan' : '');

  // Update dropdown filter tahun akademik
  var selTahun = document.getElementById('mk-tahun');
  if (selTahun) {
    var tahunList = [];
    MK.forEach(function(m){ if(m.tahunAkademik && tahunList.indexOf(m.tahunAkademik) === -1) tahunList.push(m.tahunAkademik); });
    tahunList.sort().reverse();
    var oldVal = selTahun.value;
    selTahun.innerHTML = '<option value="all">Semua Tahun Akademik</option>';
    tahunList.forEach(function(t){ var o=document.createElement('option');o.value=t;o.textContent=t;selTahun.appendChild(o); });
    selTahun.value = oldVal;
  }

  if (!data.length) {
    el.innerHTML = '<p class="empty">Belum ada mata kuliah' + (qNama||qProdi!=='all'||qTahun!=='all' ? ' yang sesuai filter.' : '. Klik Import atau Tambah untuk mulai.') + '</p>';
    return;
  }

  // Group by prodi
  var grouped = {};
  PRODI_LIST.forEach(function(p){ grouped[p] = []; });
  grouped['Lainnya'] = [];
  data.forEach(function(m){
    if (grouped[m.prodi]) grouped[m.prodi].push(m);
    else grouped['Lainnya'].push(m);
  });

  var html = '';
  var allGroups = PRODI_LIST.concat(['Lainnya']);
  allGroups.forEach(function(prodi){
    var items = grouped[prodi];
    if (!items || !items.length) return;
    html += '<div style="margin-bottom:16px">'
      + '<div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;padding:4px 0;border-bottom:1px solid #f0f0ee">'
      + prodi + ' <span style="font-weight:400;color:#aaa">('+items.length+')</span></div>'
      + '<div class="card" style="padding:0;overflow:hidden;margin-bottom:0">'
      + '<table style="width:100%;border-collapse:collapse;background:#fff">'
      + '<thead><tr style="background:#f8f8f7">'
      + '<th style="text-align:left;padding:8px 10px;font-size:11px;color:#888;font-weight:600;border-bottom:1px solid #f0f0ee">Kode</th>'
      + '<th style="text-align:left;padding:8px 10px;font-size:11px;color:#888;font-weight:600;border-bottom:1px solid #f0f0ee">Nama MK</th>'
      + '<th style="text-align:left;padding:8px 10px;font-size:11px;color:#888;font-weight:600;border-bottom:1px solid #f0f0ee">Tahun Akademik</th>'
      + '<th style="padding:8px 10px;border-bottom:1px solid #f0f0ee"></th>'
      + '</tr></thead><tbody>';

    items.sort(function(a,b){ return a.kode.localeCompare(b.kode); }).forEach(function(m){
      var hasKode = m.kode && m.kode.trim();
      html += '<tr style="border-bottom:0.5px solid #f0f0ee;background:#fff">'
        + '<td style="padding:9px 10px;font-weight:700;color:'+(hasKode?'#185fa5':'#aaa')+';white-space:nowrap;font-size:13px">'
        + (hasKode ? m.kode : '<span style="font-style:italic;font-weight:400;font-size:12px">Belum ada</span>') + '</td>'
        + '<td style="padding:9px 10px;color:#1a1a1a;font-size:13px">' + m.nama + '</td>'
        + '<td style="padding:9px 10px;color:#888;font-size:12px">' + (m.tahunAkademik||'–') + '</td>'
        + '<td style="padding:9px 10px;white-space:nowrap">'
        + '<div class="bg">'
        + '<button class="btn btn-warn btn-sm" onclick="openMMK(\''+m.id+'\')">Edit</button>'
        + '<button class="btn btn-danger btn-sm" onclick="hapusMK(\''+m.id+'\')">Hapus</button>'
        + '</div></td>'
        + '</tr>';
    });
    html += '</tbody></table></div></div>';
  });

  el.innerHTML = html;
}

// =====================================================
// MODAL TAMBAH / EDIT MK
// =====================================================
function openMMK(id) {
  eMk = id || null;

  // Reset form
  ['mmk-kode','mmk-nama'].forEach(function(x){ document.getElementById(x).value = ''; });
  document.getElementById('mmk-prodi').value        = PRODI_LIST[0];
  document.getElementById('mmk-tahun').value        = TAHUN_AKADEMIK || '';
  document.getElementById('mmk-title').textContent  = id ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah';

  if (id) {
    var m = MK.find(function(x){ return x.id === id; });
    if (!m) return;
    document.getElementById('mmk-kode').value  = m.kode  || '';
    document.getElementById('mmk-nama').value  = m.nama  || '';
    document.getElementById('mmk-prodi').value = m.prodi || PRODI_LIST[0];
    document.getElementById('mmk-tahun').value = m.tahunAkademik || TAHUN_AKADEMIK || '';
  }

  document.getElementById('modal-mk').classList.add('open');
}

async function saveMMK() {
  if (!isAdmin) { alert('Hanya admin yang dapat mengubah data MK.'); return; }
  var kode  = document.getElementById('mmk-kode').value.trim();
  var nama  = document.getElementById('mmk-nama').value.trim();
  var prodi = document.getElementById('mmk-prodi').value;
  var tahun = document.getElementById('mmk-tahun').value.trim();

  if (!nama)  { alert('Nama mata kuliah wajib diisi.'); return; }
  if (!prodi) { alert('Prodi wajib dipilih.'); return; }

  var data = {
    id:            eMk || ('mk' + Date.now()),
    kode:          kode,
    nama:          nama,
    prodi:         prodi,
    tahunAkademik: tahun || TAHUN_AKADEMIK || ''
  };

  var btn = document.getElementById('btn-save-mk');
  btn.disabled = true; btn.textContent = 'Menyimpan...';
  setSB('sy');
  try {
    await post({ action: 'saveMataKuliah', data: data });
    if (eMk) {
      var idx = MK.findIndex(function(m){ return m.id === eMk; });
      if (idx > -1) MK[idx] = data;
    } else {
      MK.push(data);
    }
    setSB('ok');
    cm('modal-mk');
    renderMK();
  } catch(e) { setSB('er'); alert('Gagal: ' + e.message); }
  btn.disabled = false; btn.textContent = 'Simpan';
}

async function hapusMK(id) {
  if (!isAdmin) { alert('Hanya admin yang dapat menghapus data.'); return; }
  var m = MK.find(function(x){ return x.id === id; });
  if (!m) return;

  // Cek apakah MK ini masih dipakai di jadwal
  var dipakaiDiJadwal = J.filter(function(j){ return j.mk === m.nama; }).length;
  var pesan = 'Hapus mata kuliah "' + m.nama + '"?';
  if (dipakaiDiJadwal > 0) {
    pesan += '\n\n⚠️ MK ini masih dipakai di ' + dipakaiDiJadwal + ' jadwal. Data jadwal tidak ikut terhapus.';
  }
  if (!confirm(pesan)) return;

  setSB('sy');
  try {
    await post({ action: 'deleteMataKuliah', id: id });
    MK = MK.filter(function(m){ return m.id !== id; });
    setSB('ok');
    renderMK();
  } catch(e) { setSB('er'); alert('Gagal: ' + e.message); }
}

// =====================================================
// IMPORT MK DARI JADWAL
// =====================================================
async function importMkDariJadwal() {
  if (!isAdmin) { alert('Hanya admin yang dapat melakukan import.'); return; }
  if (!TAHUN_AKADEMIK) {
    alert('⚠️ Tahun Akademik aktif belum diset!\nSilakan set di Pengaturan → Semester & Tahun Akademik terlebih dahulu.');
    return;
  }

  var jumlahJadwal = J.length;
  if (!jumlahJadwal) { alert('Belum ada data jadwal untuk diimport.'); return; }

  // Hitung MK unik di Jadwal yang belum ada di master
  var sudahAda = {};
  MK.forEach(function(m){ sudahAda[m.nama.trim().toLowerCase()] = true; });
  var mkBaru = [];
  var mkDilihat = {};
  J.forEach(function(j){
    var key = j.mk.trim().toLowerCase();
    if (!mkDilihat[key]) {
      mkDilihat[key] = true;
      if (!sudahAda[key]) mkBaru.push(j.mk.trim());
    }
  });

  if (mkBaru.length === 0) {
    alert('✅ Semua MK dari jadwal sudah ada di master.\nTidak ada yang perlu diimport.');
    return;
  }

  if (!confirm('Import ' + mkBaru.length + ' mata kuliah baru dari data jadwal?\n\n'
    + mkBaru.slice(0,8).map(function(m){ return '• ' + m; }).join('\n')
    + (mkBaru.length > 8 ? '\n• ... dan ' + (mkBaru.length-8) + ' lainnya' : '')
    + '\n\nTahun Akademik: ' + TAHUN_AKADEMIK
    + '\n\nSetelah import, lengkapi kode dan prodi di halaman Kelola MK.')) return;

  var btn = document.getElementById('btn-import-mk');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Mengimport...'; }
  setSB('sy');

  try {
    var r = await post({ action: 'importMkDariJadwal' });
    if (!r.success) throw new Error(r.error || 'Gagal import');

    // Refresh data MK dari server
    var fresh = await get({ action: 'getMataKuliah' });
    MK = fresh.data || [];
    setSB('ok');
    renderMK();
    alert('✅ ' + r.message + '\n\nSilakan lengkapi kolom Kode dan Prodi untuk setiap MK yang baru diimport.');
  } catch(e) {
    setSB('er');
    alert('Gagal import: ' + e.message);
  }

  if (btn) { btn.disabled = false; btn.textContent = '📥 Import dari Jadwal'; }
}

// =====================================================
// HELPER — Isi dropdown MK dari master
// Dipakai oleh form tambah jadwal dan form tambah dosen
// =====================================================
function fillDropdownMK(elId, filterProdi) {
  var sel = document.getElementById(elId);
  if (!sel) return;
  var current = sel.value;
  sel.innerHTML = '<option value="">— Pilih mata kuliah —</option>';

  var data = MK.slice();
  if (filterProdi) data = data.filter(function(m){ return m.prodi === filterProdi; });
  data.sort(function(a,b){ return a.nama.localeCompare(b.nama); });

  // Jika ada master MK, pakai itu
  if (data.length > 0) {
    // Group by prodi
    var grouped = {};
    data.forEach(function(m){
      var p = m.prodi || 'Lainnya';
      if (!grouped[p]) grouped[p] = [];
      grouped[p].push(m);
    });
    Object.keys(grouped).sort().forEach(function(prodi){
      var grp = document.createElement('optgroup');
      grp.label = prodi;
      grouped[prodi].forEach(function(m){
        var o = document.createElement('option');
        o.value = m.nama;
        o.textContent = (m.kode ? '['+m.kode+'] ' : '') + m.nama;
        grp.appendChild(o);
      });
      sel.appendChild(grp);
    });
  } else {
    // Fallback: pakai nama MK unik dari jadwal yang sudah ada
    var mkDariJadwal = [];
    var seen = {};
    J.forEach(function(j){
      if (!seen[j.mk]) { seen[j.mk] = true; mkDariJadwal.push(j.mk); }
    });
    mkDariJadwal.sort().forEach(function(nama){
      var o = document.createElement('option');
      o.value = nama; o.textContent = nama;
      sel.appendChild(o);
    });
  }

  // Restore nilai sebelumnya jika masih valid
  if (current) sel.value = current;
}
