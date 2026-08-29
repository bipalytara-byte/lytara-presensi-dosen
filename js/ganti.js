/* ganti.js — Jadwal pengganti: form pengajuan, list, ACC admin
              + CRUD kelola dosen & kelola jadwal (admin)
   Fungsi: cekTgl, kirimGanti, setStatusGanti, renderG,
           renderD, openMD, addMk, rmMk, renderMk, saveDos, hapusDos,
           renderJ, openMJ, onJmd, saveJad, hapusJad
*/


// =====================================================
// GANTI PASSWORD — Mandiri oleh dosen sendiri
// =====================================================
function bukaGantiPassword() {
  if (!currentUser) return;
  document.getElementById('gp-lama').value = '';
  document.getElementById('gp-baru').value = '';
  document.getElementById('gp-konfirm').value = '';
  document.getElementById('gp-err').textContent = '';
  document.getElementById('gp-ok').style.display = 'none';
  document.getElementById('modal-ganti-pass').classList.add('open');
}

async function simpanGantiPassword() {
  var lama    = document.getElementById('gp-lama').value;
  var baru    = document.getElementById('gp-baru').value;
  var konfirm = document.getElementById('gp-konfirm').value;
  var err     = document.getElementById('gp-err');
  var ok      = document.getElementById('gp-ok');
  err.textContent = ''; ok.style.display = 'none';

  if (!lama)  { err.textContent = 'Masukkan password lama.'; return; }
  if (!baru)  { err.textContent = 'Masukkan password baru.'; return; }
  if (baru.length < 4) { err.textContent = 'Password baru minimal 4 karakter.'; return; }
  if (baru !== konfirm) { err.textContent = 'Konfirmasi password tidak cocok.'; return; }
  if (lama === baru) { err.textContent = 'Password baru tidak boleh sama dengan password lama.'; return; }

  var btn = document.getElementById('btn-simpan-gp');
  btn.disabled = true; btn.textContent = 'Memverifikasi...';
  setSB('sy');

  try {
    // Verifikasi password lama via GAS (server-side auth V8.0)
    var cek = await get({ action: 'doLogin', id: currentUser.id, pass: lama });
    if (!cek.success) {
      err.textContent = '❌ Password lama salah.';
      document.getElementById('gp-lama').value = '';
      document.getElementById('gp-lama').focus();
      btn.disabled = false; btn.textContent = 'Simpan Password Baru';
      setSB('ok');
      return;
    }

    // Password lama benar — simpan password baru
    btn.textContent = 'Menyimpan...';
    await post({ action: 'resetPassword', dosenId: currentUser.id, passwordBaru: baru });
    setSB('ok');
    ok.style.display = 'block';
    document.getElementById('gp-lama').value = '';
    document.getElementById('gp-baru').value = '';
    document.getElementById('gp-konfirm').value = '';
    setTimeout(function(){ cm('modal-ganti-pass'); }, 1800);
  } catch(e) {
    setSB('er');
    err.textContent = 'Gagal menyimpan: ' + e.message;
  }
  btn.disabled = false; btn.textContent = 'Simpan Password Baru';
}

// Reset password oleh admin (dari kelola dosen) — tetap ada
// [V10] resetPasswordDosen() dihapus dari sini — definisi tunggal ada di auth.js.
//       Versi lama masih memanggil DOSEN_PASS yang sudah tidak ada.

// Dosen tandai kelas pengganti sudah terlaksana
async function tandaiTerlaksana(id) {
  var g = G.find(function(x){ return x.id === id; });
  if (!g) return;
  if (!confirm(
    '✅ Tandai kelas pengganti ini sudah terlaksana?\n\n'
    + '📚 ' + g.mk + '\n'
    + '📅 Tanggal: ' + g.ganti + '\n'
    + '⏰ Jam: ' + g.jam + '\n\n'
    + 'Setelah ditandai, kamu bisa mengajukan jadwal pengganti baru untuk MK ini.'
  )) return;

  setSB('sy');
  try {
    await post({ action: 'updateStatusGanti', id: id, status: 'Terlaksana', alasan: '' });
    var idx = G.findIndex(function(x){ return x.id === id; });
    if (idx > -1) { G[idx].statusAcc = 'Terlaksana'; G[idx].alasanTolak = ''; }
    setSB('ok');
    renderG();
    cekNotifGanti();
    // Update banner beranda jika ada
    if (typeof renderInfoMekanismeGanti === 'function') renderInfoMekanismeGanti();
    alert('✅ Kelas pengganti berhasil ditandai sudah terlaksana.\nTerima kasih sudah melaporkan!');
  } catch(e) {
    setSB('er');
    alert('Gagal: ' + e.message);
  }
}

function cekTgl(){
  var a=document.getElementById('gasli').value,b=document.getElementById('gganti').value;
  document.getElementById('terr').style.display=(a&&b&&new Date(b)<=new Date(a))?'block':'none';
}

async function kirimGanti(){
  if(!currentUser){alert('Hanya dosen yang bisa mengajukan jadwal pengganti.');return;}
  var mk=document.getElementById('gmk').value,asli=document.getElementById('gasli').value;
  var ganti=document.getElementById('gganti').value;
  
  var jMulai=document.getElementById('gjam_mulai').value;
  var jSelesai=document.getElementById('gjam_selesai').value;
  
  if(!mk||!asli||!ganti||!jMulai||!jSelesai){alert('Lengkapi field wajib (Mata kuliah, Tanggal, Jam Mulai & Selesai).');return;}
  if(new Date(ganti)<=new Date(asli)){alert('Tanggal pengganti harus setelah tanggal asli.');return;}

  // ── LOCK: cek apakah ada jadwal ganti MK ini yang sudah Disetujui tapi belum presensi ──
  var today0Lock = new Date(); today0Lock.setHours(0,0,0,0);
  var gantiDisetujui = G.filter(function(g){
    return g.dosenId === currentUser.id && g.mk === mk
      && (g.statusAcc === 'Disetujui' || g.statusAcc === 'Menunggu Batal');
    // Terlaksana, Dibatalkan, Ditolak → tidak mengunci
  });
  for(var i=0; i<gantiDisetujui.length; i++){
    var gd = gantiDisetujui[i];

    // Tanggal ganti sudah lewat? Kalau sudah lewat, skip — tidak perlu lock
    var tglGantiDate = gd.ganti ? new Date(gd.ganti+'T00:00:00') : null;
    if(tglGantiDate && tglGantiDate < today0Lock) continue;

    // Cek apakah sudah ada presensi untuk jadwal ganti ini (cocok MK + tanggal)
    var parts0 = gd.ganti ? gd.ganti.split('-') : [];
    var tglGantiFormatted0 = parts0.length === 3 ? parts0[2]+'/'+parts0[1]+'/'+parts0[0] : '';
    var sudahPresensi = tglGantiFormatted0 && P.some(function(p){
      return p.dosenId === currentUser.id && p.mk === mk && p.tanggal === tglGantiFormatted0;
    });

    if(!sudahPresensi){
      var pesanLock = gd.statusAcc === 'Menunggu Batal'
        ? '🔒 Pengajuan jadwal pengganti untuk MK "'+mk+'" terkunci.\n\nAnda sudah mengajukan pembatalan jadwal pengganti ('+gd.ganti+') dan sedang menunggu ACC Admin.\n\nTunggu hingga Admin menyetujui pembatalan sebelum mengajukan ulang.'
        : '🔒 Pengajuan jadwal pengganti untuk MK "'+mk+'" terkunci.\n\nSudah ada jadwal pengganti yang disetujui ('+gd.ganti+') namun belum dilaksanakan.\n\nJika tidak bisa melaksanakan, ajukan Pembatalan terlebih dahulu dan tunggu ACC Admin.';
      alert(pesanLock);
      return;
    }
  }
  
  var jamGabung = jMulai + ' - ' + jSelesai;
  
  var rec={
    id:Date.now().toString(), dosenId:currentUser.id, dosen:currentUser.nama, mk:mk, asli:asli, ganti:ganti, jam:jamGabung,
    mode:document.getElementById('gmode').value, tempat:document.getElementById('gtempat').value,
    ket:document.getElementById('gket').value, diajukan:new Date().toLocaleDateString('id-ID'),
    bukti:document.getElementById('gbukti').value, statusAcc:'Menunggu', alasanTolak:''
  };
  setSB('sy');
  try{
    await post({action:'saveGanti',data:rec});
    G.push(rec);setSB('ok');renderG();
    ['gmk','gasli','gganti','gjam_mulai','gjam_selesai','gtempat','gket','gbukti'].forEach(function(id){document.getElementById(id).value='';});
    alert('Jadwal pengganti berhasil diajukan dan menunggu ACC Admin!');
  }catch(e){setSB('er');alert('Gagal: '+e.message);}
}

async function setStatusGanti(id, status) {
  var alasan = '';
  if (status === 'Ditolak') {
    alasan = prompt('Masukkan alasan penolakan (opsional):');
    if (alasan === null) return;
  } else {
    if (!confirm('Setujui pengajuan jadwal pengganti ini?')) return;
  }
  
  setSB('sy');
  try {
    await post({action:'updateStatusGanti', id:id, status:status, alasan:alasan});
    var idx = G.findIndex(function(g){return g.id === id;});
    if (idx > -1) { G[idx].statusAcc = status; G[idx].alasanTolak = alasan; }
    setSB('ok'); renderG(); cekNotifGanti();
  } catch(e) { setSB('er'); alert('Gagal: ' + e.message); }
}

// Dosen mengajukan request pembatalan jadwal pengganti yang sudah disetujui
async function ajukanBatalGanti(id) {
  var g = G.find(function(x){ return x.id === id; });
  if (!g) return;
  if (!confirm('Ajukan pembatalan jadwal pengganti ini?\n\n📚 ' + g.mk + '\n📅 Tanggal ganti: ' + g.ganti + '\n\nSetelah diajukan, Admin perlu menyetujui pembatalan sebelum Anda bisa mengajukan jadwal pengganti baru untuk MK ini.')) return;

  setSB('sy');
  try {
    await post({action:'updateStatusGanti', id:id, status:'Menunggu Batal', alasan:''});
    var idx = G.findIndex(function(x){ return x.id === id; });
    if (idx > -1) G[idx].statusAcc = 'Menunggu Batal';
    setSB('ok'); renderG(); cekNotifGanti();
    alert('✅ Pengajuan pembatalan berhasil dikirim.\nMenunggu persetujuan Admin.');
  } catch(e) { setSB('er'); alert('Gagal: ' + e.message); }
}

// Admin menyetujui pembatalan jadwal pengganti
async function accBatalGanti(id) {
  var alasan = prompt('Alasan pembatalan (opsional, akan ditampilkan ke dosen):') ;
  if (alasan === null) return; // batal klik
  if (!confirm('Setujui pembatalan jadwal pengganti ini?\nDosen akan bisa mengajukan jadwal pengganti baru untuk MK tersebut.')) return;

  setSB('sy');
  try {
    await post({action:'updateStatusGanti', id:id, status:'Dibatalkan', alasan:alasan});
    var idx = G.findIndex(function(x){ return x.id === id; });
    if (idx > -1) { G[idx].statusAcc = 'Dibatalkan'; G[idx].alasanTolak = alasan; }
    setSB('ok'); renderG(); cekNotifGanti();
  } catch(e) { setSB('er'); alert('Gagal: ' + e.message); }
}

function renderG(){
  var w=document.getElementById('lgw'),el=document.getElementById('lg');
  
  var data = isAdmin ? G : (currentUser ? G.filter(function(g){return g.dosenId===currentUser.id;}) : []);
  
  if(!data.length){if(w)w.style.display='none';return;}
  w.style.display='block';
  
  el.innerHTML=data.slice().reverse().map(function(g){
    // Badge status
    var stBadge =
      g.statusAcc === 'Disetujui'     ? '<span class="badge green">✅ Disetujui</span>' :
      g.statusAcc === 'Terlaksana'    ? '<span class="badge green" style="background:#e6f1fb;color:#185fa5;border:1px solid #85b7eb">🎓 Terlaksana</span>' :
      g.statusAcc === 'Ditolak'       ? '<span class="badge red">❌ Ditolak</span>' :
      g.statusAcc === 'Menunggu Batal'? '<span class="badge yellow" style="background:#fef3c7;color:#92400e">⏳ Menunggu Batal</span>' :
      g.statusAcc === 'Dibatalkan'    ? '<span class="badge" style="background:#f5f5f3;color:#888;border:1px solid #e5e5e3">🚫 Dibatalkan</span>' :
                                        '<span class="badge yellow">⏳ Menunggu ACC</span>';

    // Cek apakah jadwal ganti ini sudah dipresensi
    // Robust: cek via tanggal AND via MK+dosenId (fallback untuk data lama tanpa sumberJadwal)
    var sudahPresensi = false;
    var tglGantiFormatted = '';
    var tglGantiDate = null;
    if(g.statusAcc === 'Disetujui' || g.statusAcc === 'Menunggu Batal') {
      var parts = g.ganti ? g.ganti.split('-') : [];
      tglGantiFormatted = parts.length === 3 ? parts[2]+'/'+parts[1]+'/'+parts[0] : '';
      tglGantiDate = parts.length === 3 ? new Date(g.ganti+'T00:00:00') : null;
      if(tglGantiFormatted) {
        sudahPresensi = P.some(function(p){
          return p.dosenId === g.dosenId && p.mk === g.mk && p.tanggal === tglGantiFormatted;
        });
      }
    }

    // Apakah tanggal ganti sudah lewat (hari ini atau sebelumnya)?
    var today0 = new Date(); today0.setHours(0,0,0,0);
    var tglGantiSudahLewat = tglGantiDate ? tglGantiDate < today0 : false;

    // Tombol aksi DOSEN
    var btnDosen = '';
    if(!isAdmin && currentUser && g.dosenId === currentUser.id) {
      if(g.statusAcc === 'Disetujui') {
        if(sudahPresensi) {
          // Sudah terdeteksi presensi otomatis → tuntas
          btnDosen = '<div style="margin-top:6px;font-size:11px;color:#27500a;background:#eaf3de;padding:4px 10px;border-radius:6px;display:inline-block">✅ Sudah dilaksanakan</div>';
        } else if(tglGantiSudahLewat) {
          // Tanggal sudah lewat, belum ada presensi terdeteksi → tampilkan tombol konfirmasi
          btnDosen = '<div style="margin-top:8px">'
            + '<button class="btn btn-sm btn-primary" style="font-size:11px;background:#185fa5;border-color:#185fa5" onclick="tandaiTerlaksana(\''+g.id+'\')">'
            + '🎓 Tandai Sudah Terlaksana</button>'
            + '<span style="font-size:10px;color:#888;margin-left:8px">Kelas sudah dilaksanakan? Konfirmasi di sini.</span>'
            + '</div>';
        } else {
          // Belum presensi, tanggal belum lewat → bisa ajukan pembatalan
          btnDosen = '<div style="margin-top:8px">'
            + '<button class="btn btn-sm btn-danger" style="font-size:11px" onclick="ajukanBatalGanti(\''+g.id+'\')">'
            + '🚫 Ajukan Pembatalan</button>'
            + '<span style="font-size:10px;color:#888;margin-left:8px">Tidak bisa hadir? Ajukan pembatalan agar bisa mengajukan ulang.</span>'
            + '</div>';
        }
      } else if(g.statusAcc === 'Terlaksana') {
        btnDosen = '<div style="margin-top:6px;font-size:11px;color:#185fa5;background:#e6f1fb;padding:4px 10px;border-radius:6px;display:inline-block">🎓 Sudah ditandai terlaksana oleh dosen</div>';
      } else if(g.statusAcc === 'Menunggu Batal') {
        btnDosen = '<div style="margin-top:6px;font-size:11px;color:#92400e;background:#fef3c7;padding:4px 10px;border-radius:6px;display:inline-block">⏳ Menunggu persetujuan Admin untuk pembatalan</div>';
      }
    }

    // Tombol aksi ADMIN
    var btnAdmin = '';
    if(isAdmin) {
      if(g.statusAcc === 'Menunggu') {
        btnAdmin = '<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #e5e5e3;display:flex;gap:8px">'
          + '<button class="btn btn-sm btn-primary" onclick="setStatusGanti(\''+g.id+'\', \'Disetujui\')">✅ Setujui</button>'
          + '<button class="btn btn-sm btn-danger" onclick="setStatusGanti(\''+g.id+'\', \'Ditolak\')">❌ Tolak</button>'
          + '</div>';
      } else if(g.statusAcc === 'Menunggu Batal') {
        btnAdmin = '<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #e5e5e3">'
          + '<div style="font-size:11px;color:#92400e;margin-bottom:6px;font-weight:600">🚫 Dosen mengajukan pembatalan jadwal pengganti ini</div>'
          + '<div style="display:flex;gap:8px">'
          + '<button class="btn btn-sm btn-danger" onclick="accBatalGanti(\''+g.id+'\')" style="font-size:11px">✅ ACC Pembatalan</button>'
          + '</div></div>';
      }
    }

    var buktiLink = g.bukti ? '<br><a href="'+g.bukti+'" target="_blank" style="color:#185fa5;text-decoration:none;font-weight:500">Lihat Lampiran Bukti ↗</a>' : '<br><span style="color:#aaa">Tidak ada lampiran bukti</span>';
    var tolakMsg = (g.statusAcc === 'Ditolak'||g.statusAcc === 'Dibatalkan') && g.alasanTolak ? '<div style="margin-top:4px;font-size:12px;color:#a32d2d;background:#fcebeb;padding:4px 8px;border-radius:4px">'+(g.statusAcc==='Dibatalkan'?'Alasan batal: ':'Alasan: ')+g.alasanTolak+'</div>' : '';

    // Highlight card jika Menunggu Batal (admin perlu action)
    var cardStyle = g.statusAcc === 'Menunggu Batal' && isAdmin
      ? 'border-left:3px solid #f59e0b;background:#fffbeb'
      : '';

    return '<div class="entry" style="'+cardStyle+'"><div class="em">'
      + '<div class="en" style="display:flex;justify-content:space-between;align-items:flex-start">'
      + '<span>'+g.mk+'<br><span style="font-size:12px;color:#888;font-weight:normal">'+g.dosen+'</span></span> '+stBadge
      + '</div>'
      + '<div class="es">Asli: '+g.asli+' → Ganti: '+g.ganti+' '+g.jam+' · <b>'+(g.mode==='daring'?'Daring':'Luring')+'</b>'+(g.tempat?' · '+g.tempat:'')+buktiLink+'</div>'
      + (g.ket?'<div class="es">Ket: '+g.ket+'</div>':'')
      + tolakMsg
      + btnDosen
      + btnAdmin
      + '</div></div>';
  }).join('');
}

function renderD(){
  var q=(document.getElementById('cari').value||'').toLowerCase();
  var f=D.filter(function(d){return d.nama.toLowerCase().indexOf(q)>-1;});
  var cnt=document.getElementById('dcnt');if(cnt)cnt.textContent=D.length+' dosen';
  var el=document.getElementById('dl');
  if(!f.length){el.innerHTML='<p class="empty">Tidak ditemukan.</p>';return;}
  el.innerHTML=f.map(function(d){
    var jd=J.filter(function(j){return j.dosenId===d.id;});
    var waBadge = d.noWA
      ? '<span style="font-size:11px;background:#eaf3de;color:#27500a;border-radius:20px;padding:1px 8px;margin-left:4px">📱 WA terdaftar</span>'
      : '<span style="font-size:11px;background:#f5f5f3;color:#aaa;border-radius:20px;padding:1px 8px;margin-left:4px">📵 Belum ada WA</span>';
    return '<div class="dc"><div class="ch2"><div><div class="en">'+d.nama+waBadge+'</div>'+(d.nip?'<div class="es">NIP: '+d.nip+'</div>':'')+' </div><div class="bg"><button class="btn btn-warn btn-sm" onclick="openMD(\''+d.id+'\')">Edit</button><button class="btn btn-sm" style="background:#f0f7ff;color:#185fa5;border-color:#85b7eb" onclick="resetPasswordDosen(\''+d.id+'\',\''+d.nama.replace(/'/g,"\\'")+'\')" title="Reset password dosen">🔑 Reset PW</button><button class="btn btn-danger btn-sm" onclick="hapusDos(\''+d.id+'\')">Hapus</button></div></div><div style="margin-top:4px">'+( d.mk.length?d.mk.map(function(m){return'<span class="mk-tag">'+m+'</span>';}).join(''):'<span class="empty">Belum ada MK</span>')+'</div><div style="margin-top:6px;font-size:12px;color:#888">'+jd.length+' jadwal terdaftar</div></div>';
  }).join('');
}

function openMD(id){
  eDos=id||null;tempMk=[];
  document.getElementById('mn').value='';
  document.getElementById('mnip').value='';
  document.getElementById('mnowa').value='';
  document.getElementById('mki').value='';
  if(id){
    var d=D.find(function(x){return x.id===id;});if(!d)return;
    document.getElementById('mdt').textContent='Edit dosen';
    document.getElementById('mn').value=d.nama;
    document.getElementById('mnip').value=d.nip||'';
    document.getElementById('mnowa').value=d.noWA||'';
    tempMk=d.mk.slice();
  } else {
    document.getElementById('mdt').textContent='Tambah dosen baru';
  }
  renderMk();document.getElementById('mdos').classList.add('open');
}
function addMk(){var i=document.getElementById('mki'),v=i.value.trim();if(!v||tempMk.indexOf(v)>-1){i.value='';return;}tempMk.push(v);renderMk();i.value='';i.focus();}
function rmMk(i){tempMk.splice(i,1);renderMk();}
function renderMk(){document.getElementById('mkt').innerHTML=tempMk.map(function(m,i){return'<span class="mk-tag-rm">'+m+'<span class="mk-rm-btn" onclick="rmMk('+i+')">×</span></span>';}).join('');}
async function saveDos(){
  if(!isAdmin){alert('Hanya admin yang dapat mengubah data dosen.');return;}
  var nama=document.getElementById('mn').value.trim();if(!nama){alert('Nama wajib diisi.');return;}
  var btn=document.getElementById('bsd');btn.disabled=true;btn.textContent='Menyimpan...';
  var data={
    id:   eDos||('d'+Date.now()),
    nama: nama,
    nip:  document.getElementById('mnip').value.trim(),
    mk:   tempMk,
    noWA: document.getElementById('mnowa').value.trim()
  };
  setSB('sy');
  try{
    await post({action:'saveDosen',data:data});
    if(eDos){var idx=D.findIndex(function(d){return d.id===eDos;});if(idx>-1)D[idx]=data;}else D.push(data);
    setSB('ok');cm('mdos');renderD();fillAll();
  }catch(e){setSB('er');alert('Gagal: '+e.message);}
  btn.disabled=false;btn.textContent='Simpan';
}
async function hapusDos(id){
  if(!isAdmin){alert('Hanya admin yang dapat menghapus data.');return;}
  var d=D.find(function(x){return x.id===id;});if(!d)return;
  if(!confirm('Hapus "'+d.nama+'"?\nJadwal dosen ini juga dihapus.'))return;
  setSB('sy');
  try{
    await post({action:'deleteDosen',id:id});
    D=D.filter(function(x){return x.id!==id;});J=J.filter(function(j){return j.dosenId!==id;});
    setSB('ok');renderD();renderJ();fillAll();
  }catch(e){setSB('er');alert('Gagal: '+e.message);}
}

function renderJ(){
  var df  = document.getElementById('jfd').value;
  var hf  = document.getElementById('jfh').value;
  var tf  = document.getElementById('jtf') ? document.getElementById('jtf').value : 'semua';
  var data = J.slice();
  if (df !== 'all') data = data.filter(function(j){ return j.dosenId === df; });
  if (hf !== 'all') data = data.filter(function(j){ return j.hari === hf; });

  var cnt = document.getElementById('jcnt');
  if (cnt) cnt.textContent = J.length + ' jadwal (' +
    J.filter(function(j){ return j.tipe === 'paralel'; }).length + ' paralel)';

  var el = document.getElementById('jl');
  if (!data.length){ el.innerHTML = '<p class="empty">Belum ada jadwal.</p>'; return; }

  var today    = todayHari();
  var reguler  = data.filter(function(j){ return j.tipe !== 'paralel'; });
  var paralel  = data.filter(function(j){ return j.tipe === 'paralel'; });

  // Fungsi render tabel per grup hari
  function renderGrupHari(list, isParalel) {
    var gr = {}; HARI.forEach(function(h){ gr[h] = []; });
    list.forEach(function(j){ if(gr[j.hari]) gr[j.hari].push(j); });
    return HARI.map(function(h){
      var items = gr[h]; if(!items || !items.length) return '';
      var isT   = h === today;
      var rows  = items.sort(function(a,b){ return a.jamMulai.localeCompare(b.jamMulai); }).map(function(j){
        var d = D.find(function(x){ return x.id === j.dosenId; });

        // Hitung counter pertemuan untuk paralel
        var counterHtml = '';
        if (isParalel) {
          var counter = P.filter(function(p){ return p.jadwalId === j.id; }).length;
          var max     = j.maxPertemuan || 8;
          var pct     = Math.min(100, Math.round(counter / max * 100));
          var barColor= counter >= max ? '#a32d2d' : counter >= max - 1 ? '#f59e0b' : '#639922';
          counterHtml = '<div style="margin-top:4px;font-size:10px;color:#888">'
            + counter + '/' + max + ' pertemuan'
            + (counter >= max ? ' <span style="color:#a32d2d;font-weight:700">● SELESAI</span>' : '')
            + '</div>'
            + '<div style="height:4px;background:#f0f0ee;border-radius:4px;margin-top:2px;width:80px">'
            + '<div style="height:4px;border-radius:4px;background:'+barColor+';width:'+pct+'%"></div>'
            + '</div>';
        }

        // Badge tipe & status
        var tipeBadge = '';
        if (isParalel) {
          var bLabel = j.batch ? 'Batch '+j.batch : 'Paralel';
          var isAktif = j.statusParalel === 'aktif';
          tipeBadge = '<div style="margin-bottom:2px">'
            + '<span style="font-size:10px;background:#fef3c7;color:#92400e;border-radius:20px;padding:1px 7px;font-weight:600;margin-right:3px">👥 '+bLabel+'</span>'
            + (isAktif
              ? '<span style="font-size:10px;background:#eaf3de;color:#27500a;border-radius:20px;padding:1px 7px;font-weight:600">🟢 Aktif</span>'
              : '<span style="font-size:10px;background:#fcebeb;color:#a32d2d;border-radius:20px;padding:1px 7px;font-weight:600">🔴 Nonaktif</span>')
            + '</div>';
        }

        // Tombol toggle untuk paralel
        var btnToggle = '';
        if (isParalel) {
          var isAktif2 = j.statusParalel === 'aktif';
          btnToggle = '<button class="btn btn-sm" style="font-size:10px;background:'+(isAktif2?'#fcebeb':'#eaf3de')+';color:'+(isAktif2?'#a32d2d':'#27500a')+';border-color:'+(isAktif2?'#f09595':'#97c459')+'" onclick="toggleStatusParalel(\''+j.id+'\')">'
            + (isAktif2 ? '⏸ Nonaktifkan' : '▶ Aktifkan') + '</button>';
        }

        return '<tr style="border-bottom:0.5px solid #f0f0ee;background:#fff">'
          + '<td style="padding:9px 10px;font-size:13px;color:#1a1a1a"><div>'+tipeBadge+j.mk+'</div>'+counterHtml+'</td>'
          + '<td style="padding:9px 10px;font-size:13px;color:#555">'+(d ? d.nama.split(',')[0] : '-')+'</td>'
          + '<td style="padding:9px 10px;font-size:13px;color:#555">'+(j.kelas||'-')+'</td>'
          + '<td style="padding:9px 10px;font-size:13px;color:#555;white-space:nowrap">'+jStr(j.jamMulai)+(j.jamSelesai?' – '+jStr(j.jamSelesai):'')+'</td>'
          + '<td style="padding:9px 10px;font-size:13px;color:#555">'+j.ruang+'</td>'
          + '<td style="padding:9px 10px"><div class="bg">'
            + btnToggle
            + '<button class="btn btn-warn btn-sm" onclick="openMJ(\''+j.id+'\')">Edit</button>'
            + '<button class="btn btn-danger btn-sm" onclick="hapusJad(\''+j.id+'\')">Hapus</button>'
          + '</div></td>'
          + '</tr>';
      }).join('');
    return '<div class="jg">'
        + '<div class="jl"><span class="hb'+(isT?' ht':'')+'">'+h+(isT?' (hari ini)':'')+'</span></div>'
        + '<div class="card" style="padding:0;overflow:hidden;margin-bottom:0">'
        + '<table style="width:100%;border-collapse:collapse;background:#fff"><thead><tr style="background:#f8f8f7">'
        + '<th style="text-align:left;padding:8px 10px;font-size:11px;color:#888;font-weight:600;border-bottom:1px solid #f0f0ee">Mata Kuliah</th>'
        + '<th style="text-align:left;padding:8px 10px;font-size:11px;color:#888;font-weight:600;border-bottom:1px solid #f0f0ee">Dosen</th>'
        + '<th style="text-align:left;padding:8px 10px;font-size:11px;color:#888;font-weight:600;border-bottom:1px solid #f0f0ee">Kelas</th>'
        + '<th style="text-align:left;padding:8px 10px;font-size:11px;color:#888;font-weight:600;border-bottom:1px solid #f0f0ee">Waktu</th>'
        + '<th style="text-align:left;padding:8px 10px;font-size:11px;color:#888;font-weight:600;border-bottom:1px solid #f0f0ee">Ruang</th>'
        + '<th style="padding:8px 10px;border-bottom:1px solid #f0f0ee"></th>'
        + '</tr></thead><tbody>'+rows+'</tbody></table>'
        + '</div>'
        + '</div>';
    }).join('');
  }

  // Tab aktif — baca dari elemen tab
  var activeTab = tf;
  var htmlReguler = renderGrupHari(reguler, false);
  var htmlParalel = renderGrupHari(paralel, true);

  el.innerHTML =
    // Tab switcher
    '<div style="display:flex;gap:0;margin-bottom:12px;border-bottom:2px solid #f0f0ee">'
    + '<button onclick="switchTabJadwal(\'reguler\')" id="jtab-reguler" style="padding:8px 16px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:600;border-bottom:2px solid transparent;margin-bottom:-2px;color:#888">📚 Reguler ('+reguler.length+')</button>'
    + '<button onclick="switchTabJadwal(\'paralel\')" id="jtab-paralel" style="padding:8px 16px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:600;border-bottom:2px solid transparent;margin-bottom:-2px;color:#888">👥 Paralel ('+paralel.length+')</button>'
    + '</div>'
    // Panel reguler
    + '<div id="jpanel-reguler">'
    + (htmlReguler || '<p class="empty">Tidak ada jadwal reguler.</p>')
    + '</div>'
    // Panel paralel
    + '<div id="jpanel-paralel" style="display:none">'
    + (paralel.length > 0
        ? // ── Panel aksi massal ──
          '<div style="background:#fff;border:1px solid #e5e5e3;border-radius:10px;padding:12px 14px;margin-bottom:12px">'
          + '<div style="font-size:12px;font-weight:700;color:#1a1a1a;margin-bottom:8px">⚡ Aksi Massal per Batch</div>'
          + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
          + '<select id="batch-massal-sel" style="font-size:13px;padding:6px 10px;border:1px solid #ddd;border-radius:7px;min-width:110px">'
          + getBatchOptions(paralel)
          + '</select>'
          + '<button onclick="toggleStatusParalelBatch(\'aktif\')" style="padding:6px 14px;border-radius:7px;border:1px solid #97c459;background:#eaf3de;color:#27500a;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">🟢 Aktifkan Semua</button>'
          + '<button onclick="toggleStatusParalelBatch(\'nonaktif\')" style="padding:6px 14px;border-radius:7px;border:1px solid #f09595;background:#fcebeb;color:#a32d2d;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">🔴 Nonaktifkan Semua</button>'
          + '</div>'
          + '<div id="batch-massal-info" style="font-size:11px;color:#888;margin-top:6px"></div>'
          + '</div>'
          // ── Info ──
          + '<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:#92400e">'
          + '💡 <b>Jadwal Paralel</b> — Gunakan tombol <b>▶ Aktifkan / ⏸ Nonaktifkan</b> untuk mengontrol per jadwal, atau gunakan <b>Aksi Massal</b> di atas untuk mengatur seluruh batch sekaligus. '
          + 'Progress bar menunjukkan jumlah pertemuan yang sudah terekam.'
          + '</div>'
          + htmlParalel
        : '<p class="empty">Tidak ada jadwal paralel.</p>')
    + '</div>';

  // Set tab aktif
  switchTabJadwal(activeTab === 'paralel' ? 'paralel' : 'reguler');
}

function switchTabJadwal(tab) {
  var panels = ['reguler','paralel'];
  panels.forEach(function(t){
    var panel = document.getElementById('jpanel-'+t);
    var btn   = document.getElementById('jtab-'+t);
    if (!panel || !btn) return;
    var isActive = t === tab;
    panel.style.display = isActive ? 'block' : 'none';
    btn.style.color       = isActive ? '#1a1a1a' : '#888';
    btn.style.borderBottom = isActive ? '2px solid #1a1a1a' : '2px solid transparent';
    btn.style.fontWeight   = isActive ? '700' : '600';
  });
  // Simpan tab aktif ke filter tersembunyi
  var tf = document.getElementById('jtf');
  if (tf) tf.value = tab;
}

async function toggleStatusParalel(id) {
  var j = J.find(function(x){ return x.id === id; });
  if (!j) return;
  if (j.tipe !== 'paralel') { alert('Jadwal ini bukan tipe paralel.'); return; }

  var isAktif  = j.statusParalel === 'aktif';
  var newStatus = isAktif ? 'nonaktif' : 'aktif';
  var label    = j.mk + (j.kelas ? ' ['+j.kelas+']' : '') + ' · ' + j.hari
               + (j.batch ? ' · Batch '+j.batch : '');
  var konfirm  = isAktif
    ? '⏸ Nonaktifkan jadwal paralel ini?\n\n' + label + '\n\nDosen tidak bisa presensi untuk jadwal ini selama nonaktif.'
    : '▶ Aktifkan jadwal paralel ini?\n\n' + label + '\n\nDosen bisa presensi untuk jadwal ini.';
  if (!confirm(konfirm)) return;

  setSB('sy');
  try {
    await post({ action: 'updateStatusParalel', id: id, statusParalel: newStatus });
    j.statusParalel = newStatus;
    setSB('ok');
    renderJ();
    switchTabJadwal('paralel');
  } catch(e) {
    setSB('er');
    alert('Gagal: ' + e.message);
  }
}

// Kembalikan <option> unik batch dari data paralel
function getBatchOptions(paralelList) {
  var batches = [];
  paralelList.forEach(function(j){
    if (j.batch && batches.indexOf(j.batch) === -1) batches.push(j.batch);
  });
  batches.sort();
  if (!batches.length) return '<option value="">— Tidak ada batch —</option>';
  return batches.map(function(b){
    var count = paralelList.filter(function(j){ return j.batch === b; }).length;
    return '<option value="'+b+'">Batch '+b+' ('+count+' jadwal)</option>';
  }).join('');
}

// Toggle massal — aktifkan/nonaktifkan semua jadwal paralel dalam satu batch
async function toggleStatusParalelBatch(statusBaru) {
  var sel   = document.getElementById('batch-massal-sel');
  var info  = document.getElementById('batch-massal-info');
  if (!sel) return;
  var batch = sel.value;
  if (!batch) { alert('Pilih batch terlebih dahulu.'); return; }

  // Hitung jadwal yang akan terdampak
  var terdampak = J.filter(function(j){
    return j.tipe === 'paralel' && j.batch === batch;
  });
  if (!terdampak.length) { alert('Tidak ada jadwal paralel untuk Batch '+batch+'.'); return; }

  var aksiLabel = statusBaru === 'aktif' ? '🟢 Aktifkan' : '🔴 Nonaktifkan';
  var konfirm   = aksiLabel + ' SEMUA jadwal paralel Batch '+batch+'?\n\n'
    + terdampak.length + ' jadwal akan diupdate sekaligus.\n\n'
    + terdampak.slice(0,5).map(function(j){
        return '• ' + j.mk + (j.kelas?' ['+j.kelas+']':'') + ' · ' + j.hari;
      }).join('\n')
    + (terdampak.length > 5 ? '\n• ... dan ' + (terdampak.length-5) + ' jadwal lainnya' : '');
  if (!confirm(konfirm)) return;

  if (info) { info.textContent = '⏳ Memproses '+terdampak.length+' jadwal...'; info.style.color = '#888'; }
  setSB('sy');

  try {
    var r = await post({ action: 'updateStatusParalelBatch', batch: batch, statusParalel: statusBaru });
    if (!r.success) throw new Error(r.error || 'Gagal update');

    // Update data lokal J langsung tanpa fetch ulang
    terdampak.forEach(function(j){ j.statusParalel = statusBaru; });

    setSB('ok');
    var pesanOk = aksiLabel + ' Batch '+batch+' selesai — '+r.updated+' jadwal diupdate.';
    if (info) { info.textContent = '✅ ' + pesanOk; info.style.color = '#27500a'; }
    renderJ();
    switchTabJadwal('paralel');
    alert('✅ ' + pesanOk);
  } catch(e) {
    setSB('er');
    if (info) { info.textContent = '❌ Gagal: ' + e.message; info.style.color = '#a32d2d'; }
    alert('Gagal: ' + e.message);
  }
}
function openMJ(id){
  eJad=id||null;
  var jmd=document.getElementById('jmd');jmd.innerHTML='<option value="">— Pilih dosen —</option>';
  D.forEach(function(d){var o=document.createElement('option');o.value=d.id;o.textContent=d.nama;jmd.appendChild(o);});
  document.getElementById('jmm').innerHTML='<option value="">— Pilih mata kuliah —</option>';
  ['jmk','jms','jme','jmr','jmsem'].forEach(function(x){document.getElementById(x).value='';});
  document.getElementById('jmh').value='Senin';
  // Reset field paralel
  document.getElementById('jmtipe').value='reguler';
  if(document.getElementById('jmpola')) document.getElementById('jmpola').value='tetap';
  togglePolaJadwal();
  document.getElementById('jmbatch').value='';
  document.getElementById('jmstatus').value='aktif';
  toggleFieldParalel();

  if(id){
    var j=J.find(function(x){return x.id===id;});if(!j)return;
    document.getElementById('mjt').textContent='Edit jadwal';
    document.getElementById('jmd').value=j.dosenId;onJmd();
    setTimeout(function(){document.getElementById('jmm').value=j.mk;},50);
    document.getElementById('jmh').value=j.hari;document.getElementById('jmk').value=j.kelas||'';
    document.getElementById('jms').value=jStr(j.jamMulai);document.getElementById('jme').value=jStr(j.jamSelesai);
    document.getElementById('jmr').value=j.ruang;document.getElementById('jmsem').value=j.semester||'';
    // Isi field paralel
    document.getElementById('jmtipe').value=j.tipe||'reguler';
    if(document.getElementById('jmpola')) document.getElementById('jmpola').value=j.polaJadwal||'tetap';
    togglePolaJadwal();
    document.getElementById('jmbatch').value=j.batch||'';
    document.getElementById('jmstatus').value=j.statusParalel||'aktif';
    toggleFieldParalel();
  }else document.getElementById('mjt').textContent='Tambah jadwal perkuliahan';
  document.getElementById('mjad').classList.add('open');
}

function toggleFieldParalel(){
  var tipe  = document.getElementById('jmtipe').value;
  var wrap  = document.getElementById('wrap-paralel-fields');
  if (wrap) wrap.style.display = tipe === 'paralel' ? 'block' : 'none';
}
function onJmd(){
  var id=document.getElementById('jmd').value,mk=document.getElementById('jmm');
  mk.innerHTML='<option value="">— Pilih mata kuliah —</option>';
  var d=D.find(function(x){return x.id===id;});
  if(d)d.mk.forEach(function(m){var o=document.createElement('option');o.textContent=m;mk.appendChild(o);});
}
async function saveJad(){
  if(!isAdmin){alert('Hanya admin yang dapat mengubah jadwal.');return;}
  var did=document.getElementById('jmd').value,mk=document.getElementById('jmm').value;
  var jms=document.getElementById('jms').value,jmr=document.getElementById('jmr').value;
  if(!did||!mk||!jms||!jmr){alert('Lengkapi field wajib.');return;}

  var tipe         = document.getElementById('jmtipe').value || 'reguler';
  var batch        = tipe === 'paralel' ? (document.getElementById('jmbatch').value||'') : '';
  var statusParalel= tipe === 'paralel' ? (document.getElementById('jmstatus').value||'aktif') : '';
  var pola         = document.getElementById('jmpola') ? document.getElementById('jmpola').value : 'tetap';
  if (tipe === 'paralel' && pola === 'flex') {
    alert('Kelas paralel tidak bisa memakai pola Flex Class.');
    return;
  }
  // 16 = 14 tatap muka + UTS + UAS ; 8 = 7 tatap muka + UAS
  var maxPertemuan = tipe === 'paralel' ? 8 : 16;
  var maxTatapMuka = tipe === 'paralel' ? 7 : 14;

  var btn=document.getElementById('bsj');btn.disabled=true;btn.textContent='Menyimpan...';
  var data={
    id:eJad||('j'+Date.now()),dosenId:did,mk:mk,hari:document.getElementById('jmh').value,
    kelas:document.getElementById('jmk').value,jamMulai:jms,jamSelesai:document.getElementById('jme').value,
    ruang:jmr,semester:document.getElementById('jmsem').value,
    tipe:tipe, batch:batch, statusParalel:statusParalel,
    maxPertemuan:maxPertemuan, maxTatapMuka:maxTatapMuka, polaJadwal:pola
  };
  setSB('sy');
  try{
    await post({action:'saveJadwal',data:data});
    if(eJad){var idx=J.findIndex(function(j){return j.id===eJad;});if(idx>-1)J[idx]=data;}else J.push(data);
    setSB('ok');cm('mjad');renderJ();
    var cnt=document.getElementById('jcnt');if(cnt)cnt.textContent=J.length+' jadwal';
    // Setelah simpan, pindah ke tab yang sesuai
    if(tipe === 'paralel') switchTabJadwal('paralel');
  }catch(e){setSB('er');alert('Gagal: '+e.message);}
  btn.disabled=false;btn.textContent='Simpan';
}
async function hapusJad(id){
  if(!isAdmin){alert('Hanya admin yang dapat menghapus data.');return;}
  if(!confirm('Hapus jadwal ini?'))return;setSB('sy');
  try{await post({action:'deleteJadwal',id:id});J=J.filter(function(j){return j.id!==id;});setSB('ok');renderJ();}
  catch(e){setSB('er');alert('Gagal: '+e.message);}
}

// [V10] Tampilkan keterangan saat pola Flex Class dipilih.
function togglePolaJadwal() {
  var sel  = document.getElementById('jmpola');
  var hint = document.getElementById('hint-pola');
  if (!sel || !hint) return;
  hint.style.display = sel.value === 'flex' ? 'block' : 'none';
}
