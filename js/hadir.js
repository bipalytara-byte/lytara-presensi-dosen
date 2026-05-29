/* hadir.js — Alur rekam presensi (mulai & selesai mengajar)
   Fungsi: fillJadwalDosen, onJadwal, previewStatus, rekam,
           eksekusiRekam, tampilKartuSelesai, rekamSelesai,
           renderHari, renderRiwayatSaya
*/


function showSelesai(){
  document.getElementById('resume-banner').style.display='none';
  document.getElementById('csel').style.display='block';
  document.getElementById('csel').scrollIntoView({behavior:'smooth'});
}


function fillJadwalDosen(){
  if(!currentUser)return;
  var sel=document.getElementById('pj');
  sel.innerHTML='<option value="">— Pilih jadwal —</option>';
  
  var today=todayHari();
  var todayStr=new Date().toLocaleDateString('id-ID');
  var todayTs=parseTanggal(todayStr);
  
  var jadwalSelesai = P.filter(function(p){
    return parseTanggal(p.tanggal) === todayTs && p.dosenId === currentUser.id;
  }).map(function(p){ return p.jadwalId; });

  var jd = J.filter(function(j){
    if (j.dosenId !== currentUser.id) return false;
    // Filter paralel nonaktif — tidak muncul sama sekali
    if (j.tipe === 'paralel' && j.statusParalel !== 'aktif') return false;
    // Filter paralel yang sudah penuh (counter >= maxPertemuan)
    if (j.tipe === 'paralel') {
      var counter = P.filter(function(p){ return p.jadwalId === j.id; }).length;
      if (counter >= (j.maxPertemuan || 8)) return false;
    }
    return true;
  });

  var jadwalHariIniAsli = jd.filter(function(j){return j.hari===today;});
  
  var todJ=jadwalHariIniAsli.filter(function(j){
    return jadwalSelesai.indexOf(j.id) === -1;
  }).sort(function(a,b){return a.jamMulai.localeCompare(b.jamMulai);});
  
  var othJ=jd.filter(function(j){return j.hari!==today;}).sort(function(a,b){return HARI.indexOf(a.hari)-HARI.indexOf(b.hari)||a.jamMulai.localeCompare(b.jamMulai);});

  // Fungsi label jadwal — tampilkan [Paralel · Batch X · Ptm ke-N] jika paralel
  function labelJadwal(j, prefix) {
    var tipeLabel = '';
    if (j.tipe === 'paralel') {
      var counter = P.filter(function(p){ return p.jadwalId === j.id; }).length;
      var max     = j.maxPertemuan || 8;
      var next    = counter + 1;
      var isUjian = next >= max;
      tipeLabel = ' [Paralel' + (j.batch ? ' · Batch '+j.batch : '') + ' · Ptm ke-'+next+(isUjian?' · ⚠️ UJIAN':'') + ']';
    }
    return prefix + j.mk + tipeLabel + (j.kelas?' ['+j.kelas+']':'') + ' · ' + jStr(j.jamMulai) + (j.jamSelesai?'–'+jStr(j.jamSelesai):'') + ' · ' + j.ruang;
  }
  
  if(todJ.length>0){
    var g=document.createElement('optgroup');g.label='── Hari ini ('+today+') ──';
    todJ.forEach(function(j){
      var o=document.createElement('option');
      o.value=j.id;
      o.textContent=labelJadwal(j,'✅ ');
      g.appendChild(o);
    });
    sel.appendChild(g);
  } else if (jadwalHariIniAsli.length > 0) {
    var o=document.createElement('option');o.disabled=true;o.textContent='🎉 Jadwal sudah tidak ada, terima kasih sudah berbagi ilmu hari ini';sel.appendChild(o);
  } else {
    var o=document.createElement('option');o.disabled=true;o.textContent='— Tidak ada jadwal hari '+today+' —';sel.appendChild(o);
  }
  
  if(othJ.length>0){
    var g2=document.createElement('optgroup');g2.label='── Jadwal hari lain ──';
    othJ.forEach(function(j){
      var o=document.createElement('option');
      o.value=j.id;
      o.textContent=labelJadwal(j,'['+j.hari+'] ');
      g2.appendChild(o);
    });
    sel.appendChild(g2);
  }
  
  if(jd.length===0){var o=document.createElement('option');o.disabled=true;o.textContent='Belum ada jadwal terdaftar';sel.appendChild(o);}
  
  if(todJ.length===1){sel.value=todJ[0].id;onJadwal();}
}

function onJadwal(){
  var jid=document.getElementById('pj').value;
  document.getElementById('hint').style.display='none';
  document.getElementById('warn-hari').style.display='none';
  document.getElementById('prev').style.display='none';
  if(!jid){document.getElementById('pjam').value='';document.getElementById('pruang').value='';return;}
  var j=J.find(function(x){return x.id===jid;});if(!j)return;

  var d = new Date();
  var ymd = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  var todayStr = d.toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric'});

  var isGantiValid = G.find(function(g){ return g.dosenId === currentUser.id && g.mk === j.mk && g.statusAcc === 'Disetujui' && g.ganti === ymd; });
  var isMajuValid  = M.find(function(m){ return m.dosenId === currentUser.id && m.mk === j.mk && m.statusAcc === 'Disetujui' && m.tglRaw === ymd; });

  if(isGantiValid) {
      var jMulaiOverride = isGantiValid.jam;
      if(jMulaiOverride.indexOf('-') > -1) jMulaiOverride = jMulaiOverride.split('-')[0].trim();
      document.getElementById('pjam').value = jStr(jMulaiOverride);
      document.getElementById('pruang').value = isGantiValid.tempat || j.ruang;
      document.getElementById('pmode').value = isGantiValid.mode === 'daring' ? 'Daring Sinkronus' : 'Luring';
      var w=document.getElementById('warn-hari');
      w.className = 'ai';
      w.textContent='ℹ️ Menggunakan Jadwal Pengganti yang telah di-ACC Admin.';
      w.style.display='block';
  } else if(isMajuValid) {
      var jMulaiMaju = isMajuValid.jam;
      if(jMulaiMaju.indexOf('-') > -1) jMulaiMaju = jMulaiMaju.split('-')[0].trim();
      document.getElementById('pjam').value = jStr(jMulaiMaju);
      document.getElementById('pruang').value = isMajuValid.tempat || j.ruang;
      document.getElementById('pmode').value = isMajuValid.mode === 'daring' ? 'Daring Sinkronus' : 'Luring';
      var w=document.getElementById('warn-hari');
      w.className = 'ai';
      w.innerHTML='⏩ <b>Jadwal Maju</b> digunakan — ACC Admin tgl <b>'+isMajuValid.tgl+'</b> · Jam: <b>'+isMajuValid.jam+'</b>';
      w.style.display='block';
  } else {
      document.getElementById('pjam').value=jStr(j.jamMulai);
      document.getElementById('pruang').value=j.ruang;
      var today=todayHari();
      if(j.hari!==today){
        var w=document.getElementById('warn-hari');
        w.className = 'aw';
        w.textContent='⚠️ Jadwal ini untuk hari '+j.hari+'. Hari ini '+today+'. Presensi tidak bisa direkam tanpa ACC Admin.';
        w.style.display='block';
      }else{document.getElementById('hint').style.display='block';}
  }
  previewStatus();
}

function previewStatus(){
  var jam=document.getElementById('pjam').value,jid=document.getElementById('pj').value;
  var el=document.getElementById('prev');
  if(!jam){el.style.display='none';return;}
  var j=J.find(function(x){return x.id===jid;}),today=todayHari();

  var d = new Date();
  var ymd = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  var isGantiValid = G.find(function(g){ return g.dosenId === currentUser.id && g.mk === j.mk && g.statusAcc === 'Disetujui' && g.ganti === ymd; });
  var isMajuValid  = M.find(function(m){ return m.dosenId === currentUser.id && m.mk === j.mk && m.statusAcc === 'Disetujui' && m.tglRaw === ymd; });

  if(j&&j.hari!==today && !isGantiValid && !isMajuValid){
     el.style.display='block';el.style.background='#fcebeb';el.style.color='#791f1f';el.textContent='❌ Tidak bisa presensi — jadwal hari '+j.hari+', bukan '+today;return;
  }

  // Cek batasan 15 menit sebelum jadwal
  var jamParts = jam.split(':');
  var jadwalMenit = parseInt(jamParts[0]) * 60 + parseInt(jamParts[1]);
  var nowMenit = d.getHours() * 60 + d.getMinutes();
  var selisihMenit = nowMenit - jadwalMenit;

  if(selisihMenit < -15){
    var sisaMenit = Math.abs(selisihMenit) - 15;
    var jamBuka = new Date(d.getTime() + sisaMenit * 60000);
    var jamBukaStr = jamBuka.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
    el.style.display='block';
    el.style.background='#f0f4ff';
    el.style.color='#3730a3';
    el.textContent='🔒 Rekam belum bisa dibuka. Menunggu pukul '+jamBukaStr+' (15 menit sebelum jadwal '+jam+')';
    return;
  }

  var st=stH(jam),ns=new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  el.style.display='block';
  if(st.c==='green'){el.style.background='#eaf3de';el.style.color='#27500a';el.textContent='Sekarang '+ns+' · Jadwal '+jam+' → Tepat waktu';}
  else if(st.c==='yellow'){el.style.background='#faeeda';el.style.color='#633806';el.textContent='Sekarang '+ns+' · Terlambat '+st.d+' menit';}
  else{el.style.background='#fcebeb';el.style.color='#791f1f';el.textContent='Sekarang '+ns+' · Sangat terlambat '+st.d+' menit';}
}


async function rekam(){
  if(!currentUser){alert('Hanya dosen yang bisa melakukan ini.');return;}
  // Cek status sistem — blokir jika sedang libur / dimatikan admin
  if(!SISTEM_AKTIF){
    alert('🚫 Sistem presensi sedang dinonaktifkan oleh Admin.\n\n' + (PESAN_LIBUR || 'Presensi tidak dapat dilakukan saat ini. Hubungi Admin untuk informasi lebih lanjut.'));
    return;
  }
  var jid=document.getElementById('pj').value,
      jam=document.getElementById('pjam').value,
      ruang=document.getElementById('pruang').value,
      pmode=document.getElementById('pmode').value;

  if(!jid||!jam||!ruang){alert('Lengkapi semua field.');return;}
  var jad=J.find(function(j){return j.id===jid;});

  var d = new Date();
  var ymd = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  var isGantiValid = G.find(function(g){ return g.dosenId === currentUser.id && g.mk === jad.mk && g.statusAcc === 'Disetujui' && g.ganti === ymd; });
  var isMajuValid  = M.find(function(m){ return m.dosenId === currentUser.id && m.mk === jad.mk && m.statusAcc === 'Disetujui' && m.tglRaw === ymd; });

  // ── Cek batasan 15 menit sebelum jadwal ──
  // Hitung selisih menit antara sekarang dan jam jadwal
  var jamParts = jam.split(':');
  var jadwalMenit = parseInt(jamParts[0]) * 60 + parseInt(jamParts[1]);
  var nowMenit = d.getHours() * 60 + d.getMinutes();
  var selisihMenit = nowMenit - jadwalMenit; // negatif = belum waktunya, positif = sudah lewat

  // Blokir jika lebih dari 15 menit SEBELUM jadwal (selisih < -15)
  if(selisihMenit < -15){
    var sisaMenit = Math.abs(selisihMenit) - 15;
    var jamBuka = new Date(d.getTime() + sisaMenit * 60000);
    var jamBukaStr = jamBuka.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
    alert('⏰ Presensi belum bisa dibuka.\n\nJadwal mulai pukul ' + jam + ', rekam baru bisa dilakukan mulai pukul ' + jamBukaStr + ' (15 menit sebelum jadwal).');
    return;
  }

  if(jad.hari!==todayHari() && !isGantiValid && !isMajuValid){
    alert('❌ Presensi gagal!\nJadwal "'+jad.mk+'" adalah hari '+jad.hari+'.\nTidak ada pengajuan pengganti/maju yang di-ACC untuk hari ini.');
    return;
  }

  var todayStr=new Date().toLocaleDateString('id-ID');
  var todayTs=parseTanggal(todayStr);
  var sudah=P.find(function(p){return p.dosenId===currentUser.id&&p.jadwalId===jid&&parseTanggal(p.tanggal)===todayTs;});
  if(sudah){alert('⚠️ Kamu sudah presensi untuk jadwal ini hari ini.\nWaktu hadir: '+sudah.waktuHadir);return;}

  // Simpan data pending dan tampilkan modal konfirmasi
  _rekamPending = { jid:jid, jam:jam, ruang:ruang, pmode:pmode, jad:jad, isGantiValid:isGantiValid, isMajuValid:isMajuValid };

  // Isi modal
  document.getElementById('rkf-mk').textContent = jad.mk + (jad.kelas?' ['+jad.kelas+']':'');
  document.getElementById('rkf-jam').textContent = jam;
  document.getElementById('rkf-ruang').textContent = ruang;

  var modeBox = document.getElementById('rkf-mode-box');
  var modeLbl = document.getElementById('rkf-mode-label');
  var modeWarn = document.getElementById('rkf-mode-warn');

  if(pmode==='Luring'){
    modeBox.style.background='#eaf3de'; modeBox.style.borderColor='#97c459';
    modeLbl.style.color='#27500a'; modeLbl.textContent='🏫 Luring (Tatap Muka di Kelas)';
    modeWarn.style.color='#27500a';
    modeWarn.textContent='Pastikan Anda memang sedang mengajar tatap muka di ruang fisik.';
  } else if(pmode==='Daring Sinkronus'){
    modeBox.style.background='#e6f1fb'; modeBox.style.borderColor='#85b7eb';
    modeLbl.style.color='#185fa5'; modeLbl.textContent='💻 Daring Sinkronus (Zoom / GMeet)';
    modeWarn.style.color='#185fa5';
    modeWarn.textContent='Pastikan perkuliahan dilakukan online real-time, bukan tatap muka.';
  } else {
    modeBox.style.background='#faeeda'; modeBox.style.borderColor='#fac775';
    modeLbl.style.color='#633806'; modeLbl.textContent='📝 Daring Asinkronus (E-learning / Penugasan)';
    modeWarn.style.color='#633806';
    modeWarn.textContent='Pastikan ini memang penugasan mandiri / e-learning tanpa tatap muka.';
  }

  document.getElementById('modal-konfirmasi-rekam').classList.add('open');
}

async function eksekusiRekam(){
  if(!_rekamPending) return;
  var p = _rekamPending; _rekamPending = null;
  cm('modal-konfirmasi-rekam');

  var now=new Date(), st=stH(p.jam);
  var ts=now.toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  var todayStr=now.toLocaleDateString('id-ID');
  
  // Tentukan jam selesai berdasarkan sumber (ganti/maju/asli)
  var jamSelesaiAkhir = '';
  if(p.isGantiValid && p.isGantiValid.jam.indexOf('-') > -1) jamSelesaiAkhir = p.isGantiValid.jam.split('-')[1].trim();
  else if(p.isMajuValid && p.isMajuValid.jam.indexOf('-') > -1) jamSelesaiAkhir = p.isMajuValid.jam.split('-')[1].trim();
  else jamSelesaiAkhir = p.jad.jamSelesai||'';

  // Tandai sumber jadwal di record
  var sumberJadwal = p.isGantiValid ? 'Jadwal Pengganti' : (p.isMajuValid ? 'Jadwal Maju' : 'Jadwal Reguler');

  var rec={id:Date.now().toString(),dosenId:currentUser.id,dosen:currentUser.nama,mk:p.jad.mk,kelas:p.jad.kelas||'',
    jadwalId:p.jid,jam:p.jam,ruang:p.ruang,waktuHadir:now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}),
    tanggal:todayStr,bulan:now.getMonth()+1,status:st.l,color:st.c,diff:st.d,
    jamSelesaiJadwal:jamSelesaiAkhir,waktuSelesai:'',statusSelesai:'',colorSelesai:'',timestamp:ts,
    modeKuliah:p.pmode, sumberJadwal:sumberJadwal};

  var btn=document.getElementById('brek');btn.disabled=true;btn.textContent='Menyimpan...';
  setSB('sy');
  try{
    await post({action:'savePresensi',data:rec});
    P.push(rec);setSB('ok');actId=rec.id;actJad=p.jad;
    document.getElementById('resume-banner').style.display='none';
    tampilKartuSelesai(rec,p.jad);
    renderHari();
    renderRiwayatSaya();
    fillBerandaDosen();
    document.getElementById('pj').innerHTML='<option value="">— Pilih jadwal —</option>';
    fillJadwalDosen();
    document.getElementById('pjam').value='';document.getElementById('pruang').value='';
    document.getElementById('pmode').value='Luring';
    document.getElementById('mode-hint').style.display='none';
    document.getElementById('hint').style.display='none';document.getElementById('warn-hari').style.display='none';
    document.getElementById('prev').style.display='none';
    alert('✅ Presensi berhasil!\n'+p.jad.mk+'\nMode: '+p.pmode+'\nStatus: '+st.l+(st.d>0?' (+'+st.d+' mnt)':''));
  }catch(e){setSB('er');alert('Gagal: '+e.message);}
  btn.disabled=false;btn.textContent='Rekam mulai mengajar';
}

function tampilKartuSelesai(rec,jad){
  var md = rec.modeKuliah || 'Luring';
  document.getElementById('isel').innerHTML='<b>'+rec.dosen+'</b><br>'+rec.mk+(rec.kelas?' · '+rec.kelas:'')+' · '+rec.ruang+' <span class="badge mode-badge" style="font-size:10px; margin-left:6px">' + md + '</span><br>Hadir: <b>'+rec.waktuHadir+'</b> <span class="badge '+rec.color+'" style="font-size:11px">'+rec.status+'</span><br>Jam selesai jadwal: <b>'+(jad&&jad.jamSelesai?jStr(jad.jamSelesai):'—')+'</b>';
  document.getElementById('csel').style.display='block';
}

async function rekamSelesai(){
  if(!actId){alert('Tidak ada sesi aktif.');return;}
  var now=new Date(),ws=now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  var st=stS(actJad?jStr(actJad.jamSelesai):'');
  var selAlasan=document.getElementById('alasan-sel').value;
  var txtAlasan=document.getElementById('alasan-txt').value.trim();
  var alasan=(selAlasan==='Lainnya')?txtAlasan:selAlasan;
  if(alasan!==''){st.l='Selesai Awal ('+alasan+')';st.c='blue';}
  var btn=document.getElementById('bsel');btn.disabled=true;btn.textContent='Menyimpan...';
  setSB('sy');
  try{
    await post({action:'updateSelesai',id:actId,waktuSelesai:ws,statusSelesai:st.l,colorSelesai:st.c});
    var idx=P.findIndex(function(p){return p.id===actId;});
    if(idx>-1){P[idx].waktuSelesai=ws;P[idx].statusSelesai=st.l;P[idx].colorSelesai=st.c;}
    setSB('ok');
    document.getElementById('csel').style.display='none';
    document.getElementById('resume-banner').style.display='none';
    renderHari();
    renderRiwayatSaya();
    actId=null;actJad=null;
    document.getElementById('alasan-sel').value='';
    document.getElementById('alasan-txt').value='';
    document.getElementById('alasan-txt').style.display='none';
    fillBerandaDosen();
    alert('✅ Selesai mengajar!\nWaktu: '+ws+'\nStatus: '+st.l);
  }catch(e){setSB('er');alert('Gagal: '+e.message);}
  btn.disabled=false;btn.textContent='Rekam selesai mengajar';
}

function renderHari(){
  var today=new Date().toLocaleDateString('id-ID');
  var data=P.filter(function(p){return p.tanggal===today;});
  var w=document.getElementById('rhari');
  if(!data.length){w.style.display='none';return;}w.style.display='block';
  document.getElementById('lhari').innerHTML=data.map(function(p){
    var md = p.modeKuliah || 'Luring';
    var sb=p.waktuSelesai?'<span class="badge '+(p.colorSelesai==='blue'?'green':p.colorSelesai==='red'?'red':'yellow')+'" style="font-size:11px">'+p.statusSelesai+'</span>':'<span style="font-size:11px;color:#aaa">Belum selesai</span>';
    var sumberBadge='';
    if(p.sumberJadwal==='Jadwal Maju') sumberBadge='<span style="display:inline-block;background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:20px;padding:1px 7px;font-size:10px;font-weight:600;margin-left:4px">⏩ Maju</span>';
    else if(p.sumberJadwal==='Jadwal Pengganti') sumberBadge='<span style="display:inline-block;background:#e6f1fb;color:#185fa5;border:1px solid #85b7eb;border-radius:20px;padding:1px 7px;font-size:10px;font-weight:600;margin-left:4px">🔄 Pengganti</span>';
    return '<div class="entry"><div class="em"><div class="en">'+p.dosen+'</div><div class="es">'+p.mk+(p.kelas?' · '+p.kelas:'')+' · '+p.ruang+' <span class="badge mode-badge" style="font-size:10px; margin-left:4px">'+md+'</span>'+sumberBadge+'</div><div class="es" style="margin-top:4px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span>Mulai: <b>'+p.waktuHadir+'</b></span><span class="badge '+p.color+'" style="font-size:11px">'+p.status+'</span>'+(p.waktuSelesai?'<span>Selesai: <b>'+p.waktuSelesai+'</b></span>':'')+sb+'</div></div></div>';
  }).join('');
}

function renderRiwayatSaya() {
  var w = document.getElementById('list-riwayat-saya');
  if (!w) return;
  if (!currentUser) { 
    w.innerHTML = '<p class="empty">Silakan login untuk melihat riwayat.</p>'; 
    return; 
  }
  var myData = P.filter(function(p) { return p.dosenId === currentUser.id; });
  if (myData.length === 0) {
    w.innerHTML = '<p class="empty">Belum ada riwayat mengajar yang terekam.</p>';
    return;
  }
  w.innerHTML = myData.slice().reverse().map(function(p) {
    var jt = jStr(p.jam) || p.jam;
    var md = p.modeKuliah || 'Luring';
    var sb = p.waktuSelesai 
      ? '<span class="badge ' + (p.colorSelesai==='blue'?'green':p.colorSelesai==='red'?'red':'yellow') + '" style="font-size:11px">' + p.statusSelesai + '</span>' 
      : '<span style="font-size:11px;color:#aaa">Selesai belum direkam</span>';
    
    return '<div class="entry"><div class="em">' +
             '<div class="en">' + p.mk + (p.kelas ? ' · ' + p.kelas : '') + '</div>' +
             '<div class="es">Tanggal: <b>' + p.tanggal + '</b> · Ruang: ' + p.ruang + ' <span class="badge mode-badge" style="font-size:10px; margin-left:4px">'+md+'</span></div>' +
             '<div class="es" style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">' +
               '<span class="chip" style="background:#fff;border:1px solid #ddd">Jadwal: ' + jt + '</span>' +
               '<span>Hadir: <b>' + p.waktuHadir + '</b></span>' +
               '<span class="badge ' + p.color + '" style="font-size:11px">' + p.status + (p.diff > 0 ? ' (+'+p.diff+' mnt)' : '') + '</span>' +
               (p.waktuSelesai ? '<span>Selesai: <b>' + p.waktuSelesai + '</b></span>' : '') + sb +
             '</div>' +
           '</div></div>';
  }).join('');
}