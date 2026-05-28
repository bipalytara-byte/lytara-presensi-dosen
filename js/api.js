/* api.js — Komunikasi ke Google Apps Script (GAS)
   Fungsi: get(), post(), setSB(), refreshDataLokal()
*/

async function get(p){var r=await fetch(API+'?'+new URLSearchParams(p).toString(),{redirect:'follow'});return JSON.parse(await r.text());}
async function post(b){var r=await fetch(API+'?method=POST&payload='+encodeURIComponent(JSON.stringify(b)),{redirect:'follow'});return JSON.parse(await r.text());}
function setSB(s){var el=document.getElementById('sb');el.textContent=s==='ok'?'Tersinkron':s==='sy'?'Menyinkron...':'Error';el.className='sb'+(s==='sy'?' sy':s==='er'?' se':'');}

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