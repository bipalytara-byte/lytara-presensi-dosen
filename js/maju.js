/* maju.js — Pengajuan jadwal maju (kuliah lebih awal)
   Fungsi: kirimMaju, setStatusMaju, promptTolakMaju,
           renderRiwayatMaju, renderM, cekNotifMaju
*/

// =====================================================
async function kirimMaju(){
  if(!currentUser){alert('Hanya dosen yang bisa mengajukan jadwal maju.');return;}
  var mk=document.getElementById('mmk').value;
  var tgl=document.getElementById('mtgl').value;
  var jMulai=document.getElementById('mjam_mulai').value;
  var jSelesai=document.getElementById('mjam_selesai').value;
  
  if(!mk||!tgl||!jMulai||!jSelesai){alert('Lengkapi field wajib (Mata kuliah, Tanggal, Jam Mulai & Selesai).');return;}
  
  // Validasi: jam maju harus lebih awal dari jam jadwal asli
  var jadwalAsli = J.find(function(j){ return j.dosenId === currentUser.id && j.mk === mk; });
  if(jadwalAsli && jMulai >= jStr(jadwalAsli.jamMulai)){
    if(!confirm('⚠️ Jam yang diajukan ('+jMulai+') tidak lebih awal dari jam jadwal asli ('+jStr(jadwalAsli.jamMulai)+').\nTetap ajukan?')) return;
  }
  
  var jamGabung = jMulai + ' - ' + jSelesai;
  var tglFormatted = new Date(tgl+'T00:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric'});
  
  var rec={
    id:Date.now().toString(), dosenId:currentUser.id, dosen:currentUser.nama, mk:mk, 
    tgl:tglFormatted, tglRaw:tgl, jam:jamGabung,
    mode:document.getElementById('mmode').value, 
    tempat:document.getElementById('mtempat').value,
    ket:document.getElementById('mket').value, 
    diajukan:new Date().toLocaleDateString('id-ID'),
    bukti:document.getElementById('mbukti').value, 
    statusAcc:'Menunggu', alasanTolak:''
  };
  setSB('sy');
  try{
    await post({action:'saveMaju',data:rec});
    M.push(rec);setSB('ok');renderM();
    ['mmk','mtgl','mjam_mulai','mjam_selesai','mtempat','mket','mbukti'].forEach(function(id){document.getElementById(id).value='';});
    document.getElementById('mmode').value='luring';
    alert('✅ Jadwal maju berhasil diajukan!\nMenunggu persetujuan Admin / Bidang Akademik.');
  }catch(e){setSB('er');alert('Gagal: '+e.message);}
}

async function setStatusMaju(id, status) {
  var alasan = '';
  if (status === 'Ditolak') {
    alasan = prompt('Masukkan alasan penolakan (opsional):');
    if (alasan === null) return;
  } else {
    if (!confirm('Setujui pengajuan jadwal maju ini?\nDosen akan diizinkan presensi lebih awal pada tanggal tersebut.')) return;
  }
  setSB('sy');
  try {
    await post({action:'updateStatusMaju', id:id, status:status, alasan:alasan});
    var idx = M.findIndex(function(m){return m.id === id;});
    if (idx > -1) { M[idx].statusAcc = status; M[idx].alasanTolak = alasan; }
    setSB('ok'); renderM(); renderRiwayatMaju();
    cekNotifMaju();
  } catch(e) { setSB('er'); alert('Gagal: ' + e.message); }
}

function promptTolakMaju(id) {
  var alasan = prompt('Masukkan alasan penolakan jadwal maju:');
  if(alasan === null) return;
  setStatusMaju(id, 'Ditolak');
}

// =====================================================
// MONITORING: RIWAYAT JADWAL MAJU PER DOSEN (WK I)
// =====================================================
function renderRiwayatMaju() {
  var card = document.getElementById('card-riwayat-maju');
  if(!card) return;
  if(!isAdmin){ card.style.display='none'; return; }
  card.style.display='block';

  // Isi dropdown filter dosen
  var sel = document.getElementById('filter-maju-dosen');
  if(sel && sel.options.length <= 1){
    D.forEach(function(d){ var o=document.createElement('option');o.value=d.id;o.textContent=d.nama;sel.appendChild(o); });
  }

  var df = sel ? sel.value : 'all';
  var majuData = df==='all' ? M.slice() : M.filter(function(m){ return m.dosenId===df; });
  majuData = majuData.slice().reverse();

  var el = document.getElementById('list-riwayat-maju');
  if(majuData.length===0){ el.innerHTML='<p class="empty">Belum ada pengajuan jadwal maju.</p>'; return; }

  var AVATAR_PAL8=['#185fa5','#639922','#7c3aed','#c2410c','#0f766e','#b45309','#be123c','#1d4ed8'];
  function aC8(n){var c=0;for(var i=0;i<n.length;i++)c+=n.charCodeAt(i);return AVATAR_PAL8[c%AVATAR_PAL8.length];}
  function aI8(n){var p=n.trim().split(' ').filter(Boolean);return p.length===1?p[0].substring(0,2).toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase();}

  el.innerHTML = majuData.map(function(m){
    var statusBg = m.statusAcc==='Disetujui'?'#fef3c7':m.statusAcc==='Ditolak'?'#fcebeb':'#faeeda';
    var statusTx = m.statusAcc==='Disetujui'?'#92400e':m.statusAcc==='Ditolak'?'#791f1f':'#633806';
    var statusIcon = m.statusAcc==='Disetujui'?'⏩':m.statusAcc==='Ditolak'?'❌':'⏳';
    var ac=aC8(m.dosen), ini=aI8(m.dosen);
    var modeLabel = m.mode==='daring'?'Daring':'Luring';

    return '<div class="ganti-card">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
        +'<div style="display:flex;align-items:center;gap:8px">'
          +'<div style="width:30px;height:30px;border-radius:50%;background:'+ac+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">'+ini+'</div>'
          +'<div>'
            +'<div style="font-size:13px;font-weight:600;color:#1a1a1a">'+m.dosen+'</div>'
            +'<div style="font-size:10px;color:#888">'+m.mk+' · Diajukan: '+m.diajukan+'</div>'
          +'</div>'
        +'</div>'
        +'<span class="ganti-status" style="background:'+statusBg+';color:'+statusTx+'">'+statusIcon+' '+m.statusAcc+'</span>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:6px">'
        +'<div style="background:#fefce8;border:1px solid #fde68a;border-radius:6px;padding:5px 8px">'
          +'<div style="font-size:9px;color:#92400e;text-transform:uppercase;font-weight:600">Tanggal Maju</div>'
          +'<div style="font-size:11px;font-weight:700;color:#1a1a1a">'+m.tgl+'</div>'
        +'</div>'
        +'<div style="background:#f8f8f7;border-radius:6px;padding:5px 8px">'
          +'<div style="font-size:9px;color:#aaa;text-transform:uppercase">Jam Baru</div>'
          +'<div style="font-size:11px;font-weight:600;color:#1a1a1a">'+m.jam+'</div>'
        +'</div>'
        +'<div style="background:#f8f8f7;border-radius:6px;padding:5px 8px">'
          +'<div style="font-size:9px;color:#aaa;text-transform:uppercase">Mode</div>'
          +'<div style="font-size:11px;font-weight:600;color:#1a1a1a">'+modeLabel+(m.tempat?' · '+m.tempat:'')+' </div>'
        +'</div>'
      +'</div>'
      +(m.ket?'<div style="font-size:11px;color:#555;margin-bottom:4px">📝 '+m.ket+'</div>':'')
      +(m.alasanTolak?'<div style="font-size:11px;color:#a32d2d;padding:4px 8px;background:#fcebeb;border-radius:6px;margin-bottom:4px">❌ Alasan ditolak: '+m.alasanTolak+'</div>':'')
      +(m.bukti?'<div style="margin-bottom:4px"><a href="'+m.bukti+'" target="_blank" style="font-size:11px;color:#185fa5;text-decoration:none">🔗 Lihat bukti</a></div>':'')
      +(isAdmin && m.statusAcc==='Menunggu'
        ? '<div style="display:flex;gap:6px;margin-top:8px">'
            +'<button class="btn btn-sm" style="background:#fef3c7;color:#92400e;border-color:#fde68a;font-size:11px" onclick="setStatusMaju(\''+m.id+'\',\'Disetujui\')">⏩ Setujui Maju</button>'
            +'<button class="btn btn-sm btn-danger" style="font-size:11px" onclick="promptTolakMaju(\''+m.id+'\')">❌ Tolak</button>'
          +'</div>'
        : '')
      +'</div>';
  }).join('');
}

function renderM(){
  var w=document.getElementById('lmw'),el=document.getElementById('lm2');
  if(!w||!el)return;
  
  var data = isAdmin ? M : (currentUser ? M.filter(function(m){return m.dosenId===currentUser.id;}) : []);
  
  if(!data.length){if(w)w.style.display='none';return;}
  w.style.display='block';

  var AVATAR_PAL7=['#185fa5','#639922','#7c3aed','#c2410c','#0f766e','#b45309','#be123c','#1d4ed8'];
  function aC7(n){var c=0;for(var i=0;i<n.length;i++)c+=n.charCodeAt(i);return AVATAR_PAL7[c%AVATAR_PAL7.length];}
  function aI7(n){var p=n.trim().split(' ').filter(Boolean);return p.length===1?p[0].substring(0,2).toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase();}
  
  el.innerHTML=data.slice().reverse().map(function(m){
    var statusBg = m.statusAcc==='Disetujui'?'#fef3c7':m.statusAcc==='Ditolak'?'#fcebeb':'#faeeda';
    var statusTx = m.statusAcc==='Disetujui'?'#92400e':m.statusAcc==='Ditolak'?'#791f1f':'#633806';
    var statusIcon = m.statusAcc==='Disetujui'?'⏩':m.statusAcc==='Ditolak'?'❌':'⏳';
    var ac=aC7(m.dosen), ini=aI7(m.dosen);
    var modeLabel = m.mode === 'daring' ? 'Daring' : 'Luring';

    var btnAdmin = '';
    if(isAdmin && m.statusAcc === 'Menunggu') {
      btnAdmin = '<div style="display:flex;gap:6px;margin-top:8px">'
        +'<button class="btn btn-sm" style="background:#fef3c7;color:#92400e;border-color:#fde68a;font-size:11px" onclick="setStatusMaju(\''+m.id+'\',\'Disetujui\')">⏩ Setujui Maju</button>'
        +'<button class="btn btn-sm btn-danger" style="font-size:11px" onclick="promptTolakMaju(\''+m.id+'\')">❌ Tolak</button>'
        +'</div>';
    }

    return '<div class="ganti-card">'
      // header dosen
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
        +'<div style="display:flex;align-items:center;gap:8px">'
          +'<div style="width:30px;height:30px;border-radius:50%;background:'+ac+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">'+ini+'</div>'
          +'<div>'
            +'<div style="font-size:13px;font-weight:600;color:#1a1a1a">'+m.dosen+'</div>'
            +'<div style="font-size:10px;color:#888">'+m.mk+' · Diajukan: '+m.diajukan+'</div>'
          +'</div>'
        +'</div>'
        +'<span class="ganti-status" style="background:'+statusBg+';color:'+statusTx+'">'+statusIcon+' '+m.statusAcc+'</span>'
      +'</div>'
      // info grid
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:6px">'
        +'<div style="background:#fefce8;border-radius:6px;padding:5px 8px;border:1px solid #fde68a">'
          +'<div style="font-size:9px;color:#92400e;text-transform:uppercase;font-weight:600">Tanggal Maju</div>'
          +'<div style="font-size:11px;font-weight:700;color:#1a1a1a">'+m.tgl+'</div>'
        +'</div>'
        +'<div style="background:#f8f8f7;border-radius:6px;padding:5px 8px">'
          +'<div style="font-size:9px;color:#aaa;text-transform:uppercase">Jam Baru</div>'
          +'<div style="font-size:11px;font-weight:600;color:#1a1a1a">'+m.jam+'</div>'
        +'</div>'
        +'<div style="background:#f8f8f7;border-radius:6px;padding:5px 8px">'
          +'<div style="font-size:9px;color:#aaa;text-transform:uppercase">Mode · Tempat</div>'
          +'<div style="font-size:11px;font-weight:600;color:#1a1a1a">'+modeLabel+(m.tempat?' · '+m.tempat:'')+' </div>'
        +'</div>'
      +'</div>'
      // keterangan
      +(m.ket?'<div style="font-size:11px;color:#555;margin-bottom:4px">📝 '+m.ket+'</div>':'')
      +(m.alasanTolak?'<div style="font-size:11px;color:#a32d2d;padding:4px 8px;background:#fcebeb;border-radius:6px;margin-bottom:4px">❌ Alasan ditolak: '+m.alasanTolak+'</div>':'')
      +(m.bukti?'<div style="margin-bottom:4px"><a href="'+m.bukti+'" target="_blank" style="font-size:11px;color:#185fa5;text-decoration:none">🔗 Lihat bukti/kesepakatan</a></div>':'')
      + btnAdmin
      +'</div>';
  }).join('');
}