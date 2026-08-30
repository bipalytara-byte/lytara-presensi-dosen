/* manual.js — Presensi Manual (darurat)
   Dipakai kalau sistem gagal saat dosen sedang mengajar.
   Dosen mengisi sendiri + unggah foto bukti. Presensi langsung
   dihitung, verifikasi WK I menyusul. Kalau ditolak, dicabut.

   Fungsi: bukaFormManual, kompresFoto, kirimPresensiManual,
           renderVerifikasiManual, verifikasiManual
*/

var _fotoManual = null;   // hasil kompresi, siap kirim

// =====================================================
// KOMPRESI FOTO DI BROWSER
// Foto HP 3–5 MB dikecilkan jadi ±200 KB sebelum dikirim.
// Menghemat kuota dosen, ruang Drive, dan waktu unggah.
// =====================================================
function kompresFoto(file, maksSisi, mutu) {
  maksSisi = maksSisi || 1280;
  mutu     = mutu || 0.7;
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onerror = function(){ reject(new Error('Gagal membaca file.')); };
    reader.onload = function(e) {
      var img = new Image();
      img.onerror = function(){ reject(new Error('File bukan gambar yang valid.')); };
      img.onload = function() {
        var w = img.width, h = img.height;
        if (w > h && w > maksSisi) { h = Math.round(h * maksSisi / w); w = maksSisi; }
        else if (h >= w && h > maksSisi) { w = Math.round(w * maksSisi / h); h = maksSisi; }

        var cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(cv.toDataURL('image/jpeg', mutu));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function ukuranKB(dataUrl) {
  var b64 = String(dataUrl).split(',')[1] || '';
  return Math.round(b64.length * 0.75 / 1024);
}

// =====================================================
// FORM DOSEN
// =====================================================
function bukaFormManual() {
  if (!currentUser) { alert('Hanya dosen yang bisa mengajukan presensi manual.'); return; }

  var sel = document.getElementById('pm-jadwal');
  sel.innerHTML = '<option value="">— Pilih mata kuliah —</option>';
  J.filter(function(j){ return j.dosenId === currentUser.id; }).forEach(function(j) {
    var o = document.createElement('option');
    o.value = j.id;
    o.textContent = j.mk + (j.kelas ? ' [' + j.kelas + ']' : '')
      + (j.polaJadwal === 'flex' ? ' · Flex' : ' · ' + j.hari + ' ' + j.jamMulai);
    sel.appendChild(o);
  });

  var n = new Date();
  document.getElementById('pm-tanggal').value = n.getFullYear() + '-'
    + String(n.getMonth()+1).padStart(2,'0') + '-' + String(n.getDate()).padStart(2,'0');
  document.getElementById('pm-mulai').value   = '';
  document.getElementById('pm-selesai').value = '';
  document.getElementById('pm-alasan').value  = '';
  document.getElementById('pm-mode').value    = 'Luring';
  document.getElementById('pm-file').value    = '';
  document.getElementById('pm-preview').innerHTML = '';
  _fotoManual = null;

  document.getElementById('modal-manual').classList.add('open');
}

async function pilihFotoManual(input) {
  var pv = document.getElementById('pm-preview');
  var f = input.files && input.files[0];
  if (!f) { _fotoManual = null; pv.innerHTML = ''; return; }

  pv.innerHTML = '<div style="font-size:11px;color:#888">Memproses foto…</div>';
  try {
    var hasil = await kompresFoto(f);
    _fotoManual = hasil;
    var asli = Math.round(f.size / 1024);
    pv.innerHTML = '<img src="' + hasil + '" style="max-width:100%;border-radius:8px;margin-top:6px"/>'
      + '<div style="font-size:11px;color:#27500a;margin-top:4px">'
      + '✅ Siap dikirim — ' + asli + ' KB dikecilkan jadi ' + ukuranKB(hasil) + ' KB</div>';
  } catch(e) {
    _fotoManual = null;
    pv.innerHTML = '<div style="font-size:11px;color:#a32d2d">❌ ' + e.message + '</div>';
  }
}

async function kirimPresensiManual() {
  var jadwalId = document.getElementById('pm-jadwal').value;
  var tanggal  = document.getElementById('pm-tanggal').value;
  var alasan   = document.getElementById('pm-alasan').value.trim();

  if (!jadwalId) { alert('Pilih mata kuliah dulu.'); return; }
  if (!tanggal)  { alert('Tanggal wajib diisi.'); return; }
  if (alasan.length < 10) { alert('Alasan wajib diisi, minimal 10 karakter.\n\nJelaskan apa yang terjadi — ini yang dibaca WK I saat verifikasi.'); return; }
  if (!_fotoManual) { alert('Foto bukti wajib diunggah.'); return; }

  // Kirim tanggal dalam format DD/MM/YYYY seperti presensi biasa
  var p = tanggal.split('-');
  var tglId = p[2] + '/' + p[1] + '/' + p[0];

  if (!confirm('Kirim pengajuan presensi manual?\n\n'
    + 'Presensi langsung tercatat, lalu diverifikasi WK I.\n'
    + 'Kalau ditolak, catatan ini akan dicabut.')) return;

  var btn = document.getElementById('btn-kirim-manual');
  btn.disabled = true; btn.textContent = 'Mengirim foto…';
  setSB('sy');
  try {
    var r = await postBesar({
      action: 'savePresensiManual',
      data: {
        dosenId: currentUser.id, dosen: currentUser.nama, jadwalId: jadwalId,
        tanggal: tglId,
        jamMulai:  document.getElementById('pm-mulai').value,
        jamSelesai:document.getElementById('pm-selesai').value,
        modeKuliah:document.getElementById('pm-mode').value,
        alasan: alasan, fotoBase64: _fotoManual
      }
    });
    if (!r.success) { setSB('er'); alert('❌ ' + r.error); }
    else {
      setSB('ok');
      cm('modal-manual');
      _fotoManual = null;
      alert('✅ Presensi manual terkirim.\n\nPresensi Anda sudah tercatat. '
          + 'WK I akan memverifikasi bukti yang Anda unggah.');
      if (typeof refreshDataLokal === 'function') refreshDataLokal();
    }
  } catch(e) { setSB('er'); alert('Gagal: ' + e.message); }
  btn.disabled = false; btn.textContent = 'Kirim Pengajuan';
}

// =====================================================
// PANEL VERIFIKASI (WK I / Ka BAAK)
// =====================================================
async function renderVerifikasiManual() {
  var el = document.getElementById('verif-manual-list');
  if (!el || !isAdmin) return;
  el.innerHTML = '<p class="empty">Memuat…</p>';
  try {
    var r = await get({ action:'getPresensiManual' });
    var data = (r.data || []).slice().reverse();
    if (!data.length) { el.innerHTML = '<p class="empty">Belum ada pengajuan presensi manual.</p>'; return; }

    var menunggu = data.filter(function(x){ return x.status === 'Menunggu'; });

    el.innerHTML = '<div style="font-size:12px;color:#888;margin-bottom:10px">'
        + data.length + ' pengajuan · <b style="color:#633806">' + menunggu.length + ' menunggu verifikasi</b></div>'
      + data.map(function(x){
        var bg = x.status === 'Disetujui' ? '#eaf3de' : x.status === 'Ditolak' ? '#fcebeb' : '#faeeda';
        var tx = x.status === 'Disetujui' ? '#27500a' : x.status === 'Ditolak' ? '#791f1f' : '#633806';
        var ic = x.status === 'Disetujui' ? '✅' : x.status === 'Ditolak' ? '❌' : '⏳';
        return '<div style="background:'+bg+';border-radius:8px;padding:10px 12px;margin-bottom:8px">'
          + '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:6px">'
            + '<div style="min-width:0">'
              + '<div style="font-size:13px;font-weight:700;color:#1a1a1a">' + x.dosen + '</div>'
              + '<div style="font-size:11px;color:#555">' + x.mk + (x.kelas ? ' · ' + x.kelas : '')
                + ' · ' + x.tanggal + (x.jamMulai ? ' · ' + x.jamMulai : '')
                + (x.jamSelesai ? '–' + x.jamSelesai : '') + '</div>'
            + '</div>'
            + '<span style="font-size:11px;font-weight:700;color:'+tx+';flex-shrink:0">' + ic + ' ' + x.status + '</span>'
          + '</div>'
          + '<div style="font-size:11px;color:#555;background:#fff;border-radius:6px;padding:6px 9px;margin-bottom:6px">'
            + '📝 ' + x.alasan + '</div>'
          + (x.buktiUrl
            ? '<a href="'+x.buktiUrl+'" target="_blank" style="font-size:11px;color:#185fa5;text-decoration:none">🖼️ Lihat foto bukti</a>'
            : '<span style="font-size:11px;color:#a32d2d">Tidak ada bukti</span>')
          + (x.diverifikasiOleh
            ? '<div style="font-size:10px;color:#888;margin-top:5px">Diverifikasi ' + x.diverifikasiOleh + ' · ' + x.diverifikasiPada
              + (x.catatanVerifikasi ? ' — ' + x.catatanVerifikasi : '') + '</div>'
            : '')
          + (x.status === 'Menunggu'
            ? '<div style="display:flex;gap:6px;margin-top:8px">'
              + '<button class="btn btn-sm" style="font-size:11px;background:#eaf3de;color:#27500a;border-color:#97c459" '
              + 'onclick="verifikasiManual(\'' + x.id + '\',\'Disetujui\')">✅ Setujui</button>'
              + '<button class="btn btn-danger btn-sm" style="font-size:11px" '
              + 'onclick="verifikasiManual(\'' + x.id + '\',\'Ditolak\')">❌ Tolak</button>'
            + '</div>'
            : '')
        + '</div>';
      }).join('');
  } catch(e) {
    el.innerHTML = '<p class="empty">Gagal memuat: ' + e.message + '</p>';
  }
}

async function verifikasiManual(id, status) {
  var catatan = '';
  if (status === 'Ditolak') {
    catatan = prompt('Alasan penolakan (akan terlihat oleh dosen):');
    if (catatan === null) return;
    if (!confirm('Tolak pengajuan ini?\n\n⚠️ Catatan presensinya akan DICABUT '
      + 'dan tidak lagi dihitung di rapor.')) return;
  } else {
    if (!confirm('Setujui presensi manual ini?')) return;
  }

  setSB('sy');
  try {
    var r = await post({ action:'verifikasiPresensiManual', id:id, status:status,
                         catatan:catatan, oleh:'Admin / WK I' });
    if (!r.success) { setSB('er'); alert('Gagal: ' + r.error); return; }
    setSB('ok');
    renderVerifikasiManual();
  } catch(e) { setSB('er'); alert('Gagal: ' + e.message); }
}
