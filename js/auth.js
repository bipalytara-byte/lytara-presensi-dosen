/* auth.js — Login, logout, session management
   Fungsi: showLogin, hideLogin, swapLogin, togglePass, doLogin,
           doAdminLogin, logout, loadForLogin, loadThenShow,
           updateUserUI, restoreSesi, showSelesai
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

    var sel = document.getElementById('login-sel');
    sel.innerHTML = '<option value="">— Pilih nama —</option>';
    D.forEach(function(d){
      var o = document.createElement('option');
      o.value = d.id; o.textContent = d.nama;
      sel.appendChild(o);
    });
  } catch(e) {}
  tampilkanPengumumanLogin();
  showLogin();
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

function doLogin(){
  var sel=document.getElementById('login-sel'),pass=document.getElementById('login-pass').value.trim();
  var err=document.getElementById('login-err');err.textContent='';
  var did=sel.value;
  if(!did){err.textContent='Pilih nama terlebih dahulu.';return;}
  if(!pass){err.textContent='Masukkan password.';return;}
  if(!DOSEN_PASS[did]||pass!==DOSEN_PASS[did]){
    err.textContent='❌ Password salah. Hubungi admin jika lupa.';
    document.getElementById('login-pass').value='';
    document.getElementById('login-pass').focus();return;
  }
  var dos=D.find(function(d){return d.id===did;});
  if(!dos){err.textContent='Dosen tidak ditemukan.';return;}
  
  currentUser=dos; isAdmin=false;
  sessionStorage.setItem('userRole', 'dosen');
  sessionStorage.setItem('current_user',JSON.stringify(dos));
  hideLogin();loadThenShow();
}

function doAdminLogin(){
  var pin=document.getElementById('admin-pin').value.trim();
  var err=document.getElementById('login-err');err.textContent='';
  if(pin === PIN) {
     isAdmin=true; currentUser=null;
     sessionStorage.setItem('userRole', 'admin');
     hideLogin(); loadThenShow();
  } else {
     err.textContent='❌ PIN Admin salah.';
     document.getElementById('admin-pin').value='';
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
      get({action:'getMaju'})
    ]);
    
    D = r[0].data || [];
    J = r[1].data || [];
    P = r[2].data || [];
    G = r[3].data || [];
    M = r[4].data || [];
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
    
    if(document.getElementById('page-report').classList.contains('active')) {
       renderR();
    }
    cekNotifGanti();
  } catch(e) {
    setSB('er');
    alert('Gagal menyegarkan data: ' + e.message);
  }
}

async function loadThenShow(){
  setSB('sy');
  try{
    var r=await Promise.all([
      get({action:'getDosen'}),get({action:'getJadwal'}),
      get({action:'getPresensi'}),get({action:'getGanti'}),
      get({action:'getMaju'}),get({action:'getSettings'})
    ]);
    D=r[0].data||[];J=r[1].data||[];P=r[2].data||[];G=r[3].data||[];M=r[4].data||[];
    var cfg = r[5].data || {};
    SISTEM_AKTIF     = cfg.liburAktif === true ? false : true;
    PESAN_LIBUR      = cfg.pesanLibur      || '';
    PENGUMUMAN_LOGIN = cfg.pengumumanLogin || '';
    setSB('ok');fillAll();restoreSesi();
  }catch(e){setSB('er');}
}

function updateUserUI(){
  var btnBeranda      = document.getElementById('tab-beranda');
  var btnBerandaAdmin = document.getElementById('tab-beranda-admin');
  var btnH = document.getElementById('tab-hadir');
  var btnG = document.getElementById('tab-ganti');
  var btnMaju = document.getElementById('tab-maju');
  var btnR = document.getElementById('tab-riwayat');
  var btnRapor = document.getElementById('tab-rapor');
  var btnD = document.getElementById('tab-dosen');
  var btnJ = document.getElementById('tab-jadwal');
  var btnL = document.getElementById('tab-report');
  
  if (isAdmin) {
    document.getElementById('user-avatar').textContent = 'AD';
    document.getElementById('user-name').textContent = 'Administrator';
    document.getElementById('login-info').style.display = 'none';

    btnBeranda.style.display = 'none';
    btnBerandaAdmin.style.display = 'inline-block';
    btnH.style.display = 'none';
    btnR.style.display = 'none';
    btnRapor.style.display = 'none';
    btnD.style.display = 'inline-block';
    btnJ.style.display = 'inline-block';
    btnL.style.display = 'inline-block';
    btnMaju.style.display = 'inline-block';

    document.getElementById('form-pengajuan-ganti').style.display = 'none';
    document.getElementById('ganti-title-list').textContent = 'Daftar Seluruh Pengajuan (Admin)';
    document.getElementById('form-pengajuan-maju').style.display = 'none';
    document.getElementById('maju-title-list').textContent = 'Daftar Seluruh Pengajuan Jadwal Maju (Admin)';

    pg('beranda-admin', btnBerandaAdmin);
    
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
    btnL.style.display = 'none';
    btnMaju.style.display = 'inline-block';
    
    document.getElementById('form-pengajuan-ganti').style.display = 'block';
    document.getElementById('ganti-title-list').textContent = 'Riwayat Pengajuan Saya';
    document.getElementById('form-pengajuan-maju').style.display = 'block';
    document.getElementById('maju-title-list').textContent = 'Riwayat Pengajuan Jadwal Maju Saya';
    
    // Isi konten beranda dosen
    fillBerandaDosen();
    pg('beranda', btnBeranda);
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
