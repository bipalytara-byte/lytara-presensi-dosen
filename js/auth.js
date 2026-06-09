/* auth.js — Login, logout, session management
   Fungsi: showLogin, hideLogin, swapLogin, togglePass, doLogin,
           doAdminLogin, logout, loadForLogin, loadThenShow,
           updateUserUI, restoreSesi, showSelesai,
           showAppLoading, hideAppLoading, showLoadError,
           updateLoadStep, getWithTimeout, getWithRetry, retryLoad,
           resetPasswordDosen, jalankanMigrasiPassword
*/


function showLogin(){document.getElementById('login-screen').classList.add('show');}
function hideLogin(){document.getElementById('login-screen').classList.remove('show');}

function swapLogin(v) {
  document.getElementById('login-err').textContent='';
  if(v === 'admin') {
    document.getElementById('login-dosen-view').style.display = 'none';
    document.getElementById('login-admin-view').style.display = 'block';
  } else {
    document.getElementById('login-dosen-view').style.display = 'block';
    document.getElementById('login-admin-view').style.display = 'none';
  }
}

async function loadForLogin(){
  try {
    var results = await Promise.all([
      get({action:'getDosen'}),
      get({action:'getSettings'})
    ]);
    D = results[0].data || [];
    var cfg = results[1].data || {};
    SISTEM_AKTIF     = cfg.liburAktif === true ? false : true;
    PESAN_LIBUR      = cfg.pesanLibur      || '';
    PENGUMUMAN_LOGIN = cfg.pengumumanLogin || '';
    OVERRIDE_CODE    = cfg.overrideCode    || '';
}

function tampilkanPengumumanLogin() {
  var el = document.getElementById('papan-pengumuman-login');
  if (!el) return;
  var teks = PENGUMUMAN_LOGIN.trim();
  if (!teks) { el.style.display = 'none'; return; }
  el.innerHTML =
    '<div style="display:flex;align-items:flex-start;gap:10px">'
    + '<span style="font-size:20px;flex-shrink:0">📢</span>'
    + '<div style="flex:1">'
      + '<div style="font-size:12px;font-weight:700;color:#7a4f00;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Pengumuman</div>'
      + '<div style="font-size:13px;color:#7a4f00;line-height:1.6;white-space:pre-wrap">' + teks + '</div>'
    + '</div>'
    + '</div>';
  el.style.display = 'block';
}

function togglePass(){
  var i=document.getElementById('login-pass'),e=document.getElementById('pass-eye');
  if(i.type==='password'){i.type='text';e.textContent='🙈';}else{i.type='password';e.textContent='👁';}
}

async function doLogin(){
  var idEl   = document.getElementById('login-id');
  var passEl = document.getElementById('login-pass');
  var err    = document.getElementById('login-err');
  err.textContent = '';

  var id   = idEl.value.trim().toLowerCase();
  var pass = passEl.value.trim();

  if (!id)   { err.textContent = 'Masukkan ID dosen.'; return; }
  if (!pass) { err.textContent = 'Masukkan password.'; return; }

  var btn = document.getElementById('btn-login-dosen');
  btn.disabled = true;
  btn.textContent = 'Memeriksa...';

  try {
    var r = await get({ action: 'doLogin', id: id, pass: pass });
    if (!r.success) {
      err.textContent = '❌ ' + (r.error || 'Login gagal.');
      passEl.value = '';
      passEl.focus();
      return;
    }
    currentUser = r.data;
    isAdmin = false;
    sessionStorage.setItem('userRole', 'dosen');
    sessionStorage.setItem('current_user', JSON.stringify(r.data));
    hideLogin();
    loadThenShow();
  } catch(e) {
    err.textContent = '❌ Gagal terhubung ke server. Coba lagi.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Masuk →';
  }
}

// Reset password dosen oleh admin
async function resetPasswordDosen(dosenId, namaDosen) {
  if (!isAdmin) { alert('Hanya admin yang dapat mereset password.'); return; }
  var pw = prompt('Reset password untuk:\n' + namaDosen + ' (' + dosenId + ')\n\nMasukkan password baru (minimal 4 karakter):');
  if (pw === null) return;
  pw = pw.trim();
  if (pw.length < 4) { alert('❌ Password minimal 4 karakter.'); return; }
  var konfirmasi = prompt('Konfirmasi — masukkan ulang password baru:');
  if (konfirmasi === null) return;
  if (konfirmasi.trim() !== pw) { alert('❌ Password tidak cocok. Reset dibatalkan.'); return; }

  setSB('sy');
  try {
    var r = await post({ action: 'resetPassword', dosenId: dosenId, passwordBaru: pw });
    if (!r.success) throw new Error(r.error || 'Gagal reset');
    setSB('ok');
    alert('✅ Password ' + namaDosen + ' berhasil direset.\nSampaikan password baru ke dosen yang bersangkutan.');
  } catch(e) {
    setSB('er');
    alert('❌ Gagal: ' + e.message);
  }
}

// Migrasi password lama → dipanggil SEKALI oleh admin setelah deploy V8.0
async function jalankanMigrasiPassword() {
  if (!isAdmin) return;
  if (!confirm('Migrasi password dari config lama ke server?\n\nLakukan ini SEKALI saja setelah pertama deploy V8.0.')) return;

  // Password lama dari config.js — hanya ada di sini untuk keperluan migrasi
  var PASS_LAMA = {
    "d001":"QAH276","d002":"XCK025","d003":"AFQ525","d004":"VAU631",
    "d005":"YIC086","d006":"USN935","d007":"VQW570","d008":"FHC212",
    "d009":"QJJ229","d010":"QPE713","d011":"ZQO687","d012":"FAI229",
    "d013":"WIR394","d014":"GGO258","d015":"KFZ500","d016":"CQU403",
    "d017":"ZNZ807","d018":"RNG614","d019":"LYW251","d020":"XWH661",
    "d021":"TOU503"
  };

  var data = Object.keys(PASS_LAMA).map(function(id) {
    return { id: id, password: PASS_LAMA[id] };
  });

  setSB('sy');
  try {
    var r = await post({ action: 'migrasiPassword', data: data });
    setSB('ok');
    alert('✅ Migrasi selesai!\nBerhasil: ' + r.berhasil + ' dosen\nGagal: ' + r.gagal);
  } catch(e) {
    setSB('er');
    alert('❌ Migrasi gagal: ' + e.message);
  }
}

async function doAdminLogin(){
  var pin = document.getElementById('admin-pin').value.trim();
  var err = document.getElementById('login-err');
  err.textContent = '';
  if (!pin) { err.textContent = 'Masukkan PIN.'; return; }

  var btn = document.getElementById('btn-admin-login');
  btn.disabled = true;
  btn.textContent = 'Memeriksa...';

  try {
    var r = await get({ action: 'doAdminLogin', pin: pin });
    if (!r.success) {
      err.textContent = '❌ ' + (r.error || 'PIN salah.');
      document.getElementById('admin-pin').value = '';
      document.getElementById('admin-pin').focus();
      return;
    }
    isAdmin = true; currentUser = null;
    sessionStorage.setItem('userRole', 'admin');
    hideLogin();
    loadThenShow();
  } catch(e) {
    err.textContent = '❌ Gagal terhubung ke server. Coba lagi.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Masuk Portal Admin →';
  }
}

function logout(){
  if(!confirm('Yakin ingin keluar dari aplikasi?'))return;
  sessionStorage.removeItem('userRole');
  sessionStorage.removeItem('current_user');
  currentUser=null; actId=null; actJad=null; isAdmin=false;
  document.getElementById('csel').style.display='none';
  document.getElementById('resume-banner').style.display='none';
  document.getElementById('admin-pin').value='';
  document.getElementById('login-pass').value='';
  loadForLogin();
}

async function refreshDataLokal() {
  setSB('sy');
  try {
    var r = await Promise.all([
      get({action:'getDosen'}), 
      get({action:'getJadwal'}), 
      get({action:'getPresensi'}), 
      get({action:'getGanti'}),
      get({action:'getMaju'}),
      get({action:'getMataKuliah'})
    ]);
    D = r[0].data || [];
    J = r[1].data || [];
    P = r[2].data || [];
    G = r[3].data || [];
    M = r[4].data || [];
    MK= r[5].data || [];
    setSB('ok'); 
    
    var oldRd = document.getElementById('rd') ? document.getElementById('rd').value : 'all';
    var oldJfd = document.getElementById('jfd') ? document.getElementById('jfd').value : 'all';
    
    fillJadwalDosen();
    var rd = document.getElementById('rd'); 
    if(rd) { rd.innerHTML='<option value="all">Semua dosen</option>'; D.forEach(function(d){var o=document.createElement('option');o.value=d.id;o.textContent=d.nama;rd.appendChild(o);}); rd.value = oldRd; }
    
    var jfd = document.getElementById('jfd'); 
    if(jfd) { jfd.innerHTML='<option value="all">Semua dosen</option>'; D.forEach(function(d){var o=document.createElement('option');o.value=d.id;o.textContent=d.nama;jfd.appendChild(o);}); jfd.value = oldJfd; }
    
    renderD(); 
    renderJ(); 
    renderHari(); 
    renderG();
    renderM();
    renderRiwayatSaya();
    renderMK();
    
    if(document.getElementById('page-report').classList.contains('active')) {
       renderR();
    }
    cekNotifGanti();
  } catch(e) {
    setSB('er');
    alert('Gagal menyegarkan data: ' + e.message);
  }
}

// ── Loading overlay helpers ──
function showAppLoading(msg) {
  var el = document.getElementById('app-loading');
  if (!el) return;
  el.style.display = 'flex';
  document.getElementById('load-msg').textContent = msg || 'Memuat data...';
  document.getElementById('load-steps').innerHTML = '';
  document.getElementById('load-error').style.display = 'none';
  document.getElementById('load-spinner').style.display = 'flex';
}

function updateLoadStep(text) {
  var el = document.getElementById('load-steps');
  if (!el) return;
  var line = document.createElement('div');
  line.textContent = text;
  line.style.cssText = 'animation:fadeIn .2s ease';
  el.appendChild(line);
  while (el.children.length > 5) el.removeChild(el.firstChild);
}

function hideAppLoading() {
  var el = document.getElementById('app-loading');
  if (!el) return;
  el.style.opacity = '0';
  el.style.transition = 'opacity .3s ease';
  setTimeout(function() {
    el.style.display = 'none';
    el.style.opacity = '1';
    el.style.transition = '';
  }, 300);
}

function showLoadError(msg) {
  document.getElementById('load-spinner').style.display = 'none';
  document.getElementById('load-msg').textContent = 'Gagal memuat';
  document.getElementById('load-err-msg').textContent = msg;
  document.getElementById('load-error').style.display = 'block';
}

function getWithTimeout(params, ms) {
  ms = ms || 15000;
  return Promise.race([
    get(params),
    new Promise(function(_, reject) {
      setTimeout(function() { reject(new Error('Timeout')); }, ms);
    })
  ]);
}

function getWithRetry(params) {
  return getWithTimeout(params, 15000).catch(function() {
    updateLoadStep('⚠️ Server lambat, mencoba ulang...');
    return getWithTimeout(params, 20000);
  });
}

function retryLoad() {
  document.getElementById('load-error').style.display = 'none';
  document.getElementById('load-spinner').style.display = 'flex';
  document.getElementById('load-msg').textContent = 'Mencoba ulang...';
  document.getElementById('load-steps').innerHTML = '';
  loadThenShow();
}

async function loadThenShow() {
  showAppLoading('Menghubungi server...');
  setSB('sy');

  var STEPS = [
    { action:'getDosen',      label:'Data dosen' },
    { action:'getJadwal',     label:'Data jadwal' },
    { action:'getPresensi',   label:'Data presensi' },
    { action:'getGanti',      label:'Jadwal pengganti' },
    { action:'getMaju',       label:'Jadwal maju' },
    { action:'getSettings',   label:'Pengaturan sistem' },
    { action:'getMataKuliah', label:'Mata kuliah' }
  ];

  try {
    updateLoadStep('🔄 Menghubungi Google Apps Script...');

    var results = await Promise.all(
      STEPS.map(function(s) {
        return getWithRetry({ action: s.action })
          .then(function(r) {
            updateLoadStep('✅ ' + s.label);
            return r;
          });
      })
    );

    D  = results[0].data || [];
    J  = results[1].data || [];
    P  = results[2].data || [];
    G  = results[3].data || [];
    M  = results[4].data || [];
    MK = results[6].data || [];

    var cfg          = results[5].data || {};
    SISTEM_AKTIF     = cfg.liburAktif === true ? false : true;
    PESAN_LIBUR      = cfg.pesanLibur      || '';
    PENGUMUMAN_LOGIN = cfg.pengumumanLogin || '';
    SEMESTER_AKTIF   = cfg.semesterAktif   || '';
    TAHUN_AKADEMIK   = cfg.tahunAkademik   || '';
    OVERRIDE_CODE    = cfg.overrideCode    || '';

    updateLoadStep('✅ Siap! Membuka aplikasi...');
    setSB('ok');

    setTimeout(function() {
      hideAppLoading();
      fillAll();
      restoreSesi();
      if (isAdmin) {
        pg('beranda-admin', document.getElementById('tab-beranda'));
      } else if (currentUser) {
        tampilkanPengumumanLogin();
        pg('beranda', document.getElementById('tab-beranda'));
      }
    }, 500);

  } catch(e) {
    setSB('er');
    var msg = e.message === 'Timeout'
      ? 'Server tidak merespons. Periksa koneksi internet, lalu coba lagi.'
      : 'Gagal memuat data: ' + (e.message || 'Error tidak diketahui');
    showLoadError(msg);
  }
}

function updateUserUI(){
  var btnBeranda = document.getElementById('tab-beranda');
  var btnH = document.getElementById('tab-hadir');
  var btnG = document.getElementById('tab-ganti');
  var btnMaju = document.getElementById('tab-maju');
  var btnR = document.getElementById('tab-riwayat');
  var btnRapor = document.getElementById('tab-rapor');
  var btnD = document.getElementById('tab-dosen');
  var btnJ = document.getElementById('tab-jadwal');
  var btnMK = document.getElementById('tab-mk');
  var btnL = document.getElementById('tab-report');
  
  if (isAdmin) {
    document.getElementById('user-avatar').textContent = 'AD';
    document.getElementById('user-name').textContent = 'Administrator';
    document.getElementById('login-info').style.display = 'none';

    btnBeranda.style.display = 'inline-block';
    btnBeranda.textContent = '🏠 Beranda';
    btnH.style.display = 'none';
    btnR.style.display = 'none';
    btnRapor.style.display = 'none';
    btnD.style.display = 'inline-block';
    btnJ.style.display = 'inline-block';
    if(btnMK) btnMK.style.display = 'inline-block';
    btnL.style.display = 'inline-block';
    btnMaju.style.display = 'inline-block';

    document.getElementById('form-pengajuan-ganti').style.display = 'none';
    document.getElementById('ganti-title-list').textContent = 'Daftar Seluruh Pengajuan (Admin)';
    document.getElementById('form-pengajuan-maju').style.display = 'none';
    document.getElementById('maju-title-list').textContent = 'Daftar Seluruh Pengajuan Jadwal Maju (Admin)';

    // pg() dipanggil dari loadThenShow() setelah data siap
    
  } else if (currentUser) {
    var parts=currentUser.nama.split(' ');
    var init=(parts[0]?parts[0][0]:'')+(parts[1]?parts[1][0]:'');
    document.getElementById('user-avatar').textContent=init.toUpperCase();
    document.getElementById('user-name').textContent=currentUser.nama.split(',')[0];
    
    var info=document.getElementById('login-info');
    info.textContent='Login sebagai: '+currentUser.nama;
    info.style.display='block';
    
    var gi=document.getElementById('ganti-info');
    gi.textContent='Pengajuan atas nama: '+currentUser.nama;
    gi.style.display='block';
    
    var mi=document.getElementById('maju-info');
    mi.textContent='Pengajuan atas nama: '+currentUser.nama;
    mi.style.display='block';
    
    var gmk=document.getElementById('gmk');
    gmk.innerHTML='<option value="">— Pilih mata kuliah —</option>';
    (currentUser.mk||[]).forEach(function(m){var o=document.createElement('option');o.textContent=m;gmk.appendChild(o);});
    
    var mmk=document.getElementById('mmk');
    mmk.innerHTML='<option value="">— Pilih mata kuliah —</option>';
    (currentUser.mk||[]).forEach(function(m){var o=document.createElement('option');o.textContent=m;mmk.appendChild(o);});
    
    btnBeranda.style.display = 'inline-block';
    btnH.style.display = 'inline-block';
    btnR.style.display = 'inline-block';
    btnRapor.style.display = 'inline-block';
    btnD.style.display = 'none';
    btnJ.style.display = 'none';
    if(btnMK) btnMK.style.display = 'none';
    btnL.style.display = 'none';
    btnMaju.style.display = 'inline-block';
    
    document.getElementById('form-pengajuan-ganti').style.display = 'block';
    document.getElementById('ganti-title-list').textContent = 'Riwayat Pengajuan Saya';
    document.getElementById('form-pengajuan-maju').style.display = 'block';
    document.getElementById('maju-title-list').textContent = 'Riwayat Pengajuan Jadwal Maju Saya';
    
    // pg() dipanggil dari loadThenShow() setelah data siap
    fillBerandaDosen();
  }
}

function restoreSesi(){
  if(!currentUser)return;
  var todayStr=new Date().toLocaleDateString('id-ID');
  var todayTs=parseTanggal(todayStr);
  var sg=P.find(function(p){return parseTanggal(p.tanggal)===todayTs&&p.dosenId===currentUser.id&&(!p.waktuSelesai||p.waktuSelesai==='');});
  if(sg){
    actId=sg.id;actJad=J.find(function(j){return j.id===sg.jadwalId;});
    var banner=document.getElementById('resume-banner');
    document.getElementById('resume-title').textContent='Sesi mengajar belum direkam selesai';
    document.getElementById('resume-info').textContent=sg.mk+(sg.kelas?' ('+sg.kelas+')':'')+' · Mulai '+sg.waktuHadir;
    banner.style.display='flex';
    tampilKartuSelesai(sg,actJad);
  }else{
    document.getElementById('resume-banner').style.display='none';
    document.getElementById('csel').style.display='none';
  }
}
