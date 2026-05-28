/* ganti.js — Jadwal pengganti: form pengajuan, list, ACC admin
              + CRUD kelola dosen & kelola jadwal (admin)
   Fungsi: cekTgl, kirimGanti, setStatusGanti, renderG,
           renderD, openMD, addMk, rmMk, renderMk, saveDos, hapusDos,
           renderJ, openMJ, onJmd, saveJad, hapusJad
*/


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
    setSB('ok'); renderG();
  } catch(e) { setSB('er'); alert('Gagal: ' + e.message); }
}

function renderG(){
  var w=document.getElementById('lgw'),el=document.getElementById('lg');
  
  var data = isAdmin ? G : (currentUser ? G.filter(function(g){return g.dosenId===currentUser.id;}) : []);
  
  if(!data.length){if(w)w.style.display='none';return;}
  w.style.display='block';
  
  el.innerHTML=data.slice().reverse().map(function(g){
    var stBadge = g.statusAcc === 'Disetujui' ? '<span class="badge green">Disetujui</span>' :
                  g.statusAcc === 'Ditolak' ? '<span class="badge red">Ditolak</span>' :
                  '<span class="badge yellow">Menunggu ACC</span>';

    var btnAdmin = '';
    if(isAdmin && g.statusAcc === 'Menunggu') {
       btnAdmin = '<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #e5e5e3;display:flex;gap:8px"><button class="btn btn-sm btn-primary" onclick="setStatusGanti(\''+g.id+'\', \'Disetujui\')">Setujui</button><button class="btn btn-sm btn-danger" onclick="setStatusGanti(\''+g.id+'\', \'Ditolak\')">Tolak</button></div>';
    }

    var buktiLink = g.bukti ? '<br><a href="'+g.bukti+'" target="_blank" style="color:#185fa5;text-decoration:none;font-weight:500">Lihat Lampiran Bukti ↗</a>' : '<br><span style="color:#aaa">Tidak ada lampiran bukti</span>';
    var tolakMsg = g.statusAcc === 'Ditolak' && g.alasanTolak ? '<div style="margin-top:4px;font-size:12px;color:#a32d2d;background:#fcebeb;padding:4px 8px;border-radius:4px">Alasan: '+g.alasanTolak+'</div>' : '';

    return '<div class="entry"><div class="em"><div class="en" style="display:flex;justify-content:space-between;align-items:flex-start"><span>'+g.mk+'<br><span style="font-size:12px;color:#888;font-weight:normal">'+g.dosen+'</span></span> '+stBadge+'</div><div class="es">Asli: '+g.asli+' → Ganti: '+g.ganti+' '+g.jam+' · <b>'+(g.mode==='daring'?'Daring':'Luring')+'</b>'+(g.tempat?' · '+g.tempat:'')+buktiLink+'</div>'+(g.ket?'<div class="es">Ket: '+g.ket+'</div>':'')+tolakMsg+btnAdmin+'</div></div>';
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
    return '<div class="dc"><div class="ch2"><div><div class="en">'+d.nama+waBadge+'</div>'+(d.nip?'<div class="es">NIP: '+d.nip+'</div>':'')+' </div><div class="bg"><button class="btn btn-warn btn-sm" onclick="openMD(\''+d.id+'\')">Edit</button><button class="btn btn-danger btn-sm" onclick="hapusDos(\''+d.id+'\')">Hapus</button></div></div><div style="margin-top:4px">'+( d.mk.length?d.mk.map(function(m){return'<span class="mk-tag">'+m+'</span>';}).join(''):'<span class="empty">Belum ada MK</span>')+'</div><div style="margin-top:6px;font-size:12px;color:#888">'+jd.length+' jadwal terdaftar</div></div>';
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
  var df=document.getElementById('jfd').value,hf=document.getElementById('jfh').value;
  var data=J;
  if(df!=='all')data=data.filter(function(j){return j.dosenId===df;});
  if(hf!=='all')data=data.filter(function(j){return j.hari===hf;});
  var cnt=document.getElementById('jcnt');if(cnt)cnt.textContent=J.length+' jadwal';
  var el=document.getElementById('jl');
  if(!data.length){el.innerHTML='<p class="empty">Belum ada jadwal.</p>';return;}
  var today=todayHari();
  var gr={};HARI.forEach(function(h){gr[h]=[];});
  data.forEach(function(j){if(gr[j.hari])gr[j.hari].push(j);});
  el.innerHTML=HARI.map(function(h){
    var items=gr[h];if(!items||!items.length)return'';
    var isT=h===today;
    var rows=items.sort(function(a,b){return a.jamMulai.localeCompare(b.jamMulai);}).map(function(j){
      var d=D.find(function(x){return x.id===j.dosenId;});
      return '<tr><td>'+j.mk+'</td><td>'+(d?d.nama.split(',')[0]:'-')+'</td><td>'+(j.kelas||'-')+'</td><td>'+jStr(j.jamMulai)+(j.jamSelesai?' – '+jStr(j.jamSelesai):'')+'</td><td>'+j.ruang+'</td><td><div class="bg"><button class="btn btn-warn btn-sm" onclick="openMJ(\''+j.id+'\')">Edit</button><button class="btn btn-danger btn-sm" onclick="hapusJad(\''+j.id+'\')">Hapus</button></div></td></tr>';
    }).join('');
    return '<div class="jg"><div class="jl"><span class="hb'+(isT?' ht':'')+'">'+h+(isT?' (hari ini)':'')+'</span></div><table><thead><tr><th>Mata Kuliah</th><th>Dosen</th><th>Kelas</th><th>Waktu</th><th>Ruang</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  }).join('');
}
function openMJ(id){
  eJad=id||null;
  var jmd=document.getElementById('jmd');jmd.innerHTML='<option value="">— Pilih dosen —</option>';
  D.forEach(function(d){var o=document.createElement('option');o.value=d.id;o.textContent=d.nama;jmd.appendChild(o);});
  document.getElementById('jmm').innerHTML='<option value="">— Pilih mata kuliah —</option>';
  ['jmk','jms','jme','jmr','jmsem'].forEach(function(x){document.getElementById(x).value='';});
  document.getElementById('jmh').value='Senin';
  if(id){
    var j=J.find(function(x){return x.id===id;});if(!j)return;
    document.getElementById('mjt').textContent='Edit jadwal';
    document.getElementById('jmd').value=j.dosenId;onJmd();
    setTimeout(function(){document.getElementById('jmm').value=j.mk;},50);
    document.getElementById('jmh').value=j.hari;document.getElementById('jmk').value=j.kelas||'';
    document.getElementById('jms').value=jStr(j.jamMulai);document.getElementById('jme').value=jStr(j.jamSelesai);
    document.getElementById('jmr').value=j.ruang;document.getElementById('jmsem').value=j.semester||'';
  }else document.getElementById('mjt').textContent='Tambah jadwal perkuliahan';
  document.getElementById('mjad').classList.add('open');
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
  var btn=document.getElementById('bsj');btn.disabled=true;btn.textContent='Menyimpan...';
  var data={id:eJad||('j'+Date.now()),dosenId:did,mk:mk,hari:document.getElementById('jmh').value,
    kelas:document.getElementById('jmk').value,jamMulai:jms,jamSelesai:document.getElementById('jme').value,
    ruang:jmr,semester:document.getElementById('jmsem').value};
  setSB('sy');
  try{
    await post({action:'saveJadwal',data:data});
    if(eJad){var idx=J.findIndex(function(j){return j.id===eJad;});if(idx>-1)J[idx]=data;}else J.push(data);
    setSB('ok');cm('mjad');renderJ();
    var cnt=document.getElementById('jcnt');if(cnt)cnt.textContent=J.length+' jadwal';
  }catch(e){setSB('er');alert('Gagal: '+e.message);}
  btn.disabled=false;btn.textContent='Simpan';
}
async function hapusJad(id){
  if(!isAdmin){alert('Hanya admin yang dapat menghapus data.');return;}
  if(!confirm('Hapus jadwal ini?'))return;setSB('sy');
  try{await post({action:'deleteJadwal',id:id});J=J.filter(function(j){return j.id!==id;});setSB('ok');renderJ();}
  catch(e){setSB('er');alert('Gagal: '+e.message);}
}