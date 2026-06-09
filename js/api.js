/* api.js — Komunikasi ke Google Apps Script (GAS)
   Fungsi: get(), post(), setSB(), refreshDataLokal()
*/


async function get(p){var r=await fetch(API+'?'+new URLSearchParams(p).toString(),{redirect:'follow'});return JSON.parse(await r.text());}
async function post(b){var r=await fetch(API+'?method=POST&payload='+encodeURIComponent(JSON.stringify(b)),{redirect:'follow'});return JSON.parse(await r.text());}
function setSB(s){var el=document.getElementById('sb');el.textContent=s==='ok'?'Tersinkron':s==='sy'?'Menyinkron...':'Error';el.className='sb'+(s==='sy'?' sy':s==='er'?' se':'');}

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
  try{var r=await get({action:'getDosen'});D=r.data||[];
    var sel=document.getElementById('login-sel');
    sel.innerHTML='<option value="">— Pilih nama —</option>';
    D.forEach(function(d){var o=document.createElement('option');o.value=d.id;o.textContent=d.nama;sel.appendChild(o);});
  }catch(e){}
  showLogin();
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

function logout(){
  if(!confirm('Yakin ingin keluar dari aplikasi?'))return;
  sessionStorage.removeItem('userRole');
  sessionStorage.removeItem('current_user');
  sessionStorage.removeItem('override_unlocked');
  currentUser=null; actId=null; actJad=null; actJamSelesai=''; isAdmin=false;
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