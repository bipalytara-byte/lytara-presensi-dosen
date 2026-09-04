/* hadir.js — Alur rekam presensi (mulai & selesai mengajar)
   Fungsi: fillJadwalDosen, onJadwal, previewStatus, rekam,
           eksekusiRekam, tampilKartuSelesai, rekamSelesai,
           renderHari, renderRiwayatSaya
*/


// actJamSelesai menyimpan jam selesai yang berlaku (bisa dari jadwal ganti/maju/asli)
// diset saat eksekusiRekam(), dipakai di rekamSelesai()
var actJamSelesai = '';

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
  
  // Bug 1 fix: tambahkan jadwal pengganti (G) yang disetujui untuk hari ini
  // agar muncul di dropdown meski jadwal aslinya hari lain
  var d0 = new Date();
  var ymd0 = d0.getFullYear() + '-' + String(d0.getMonth()+1).padStart(2,'0') + '-' + String(d0.getDate()).padStart(2,'0');
  var gantiHariIni = G.filter(function(g){
    return g.dosenId === currentUser.id && g.statusAcc === 'Disetujui' && g.ganti === ymd0;
  });
  // Temukan jadwal asli untuk setiap ganti yang disetujui hari ini (jadwal asli bukan hari ini)
  var jadwalGantiVirtual = [];
  gantiHariIni.forEach(function(g){
    var jAsli = jd.find(function(j){ return j.mk === g.mk && j.hari !== today; });
    if(jAsli && jadwalSelesai.indexOf(jAsli.id) === -1) {
      jadwalGantiVirtual.push({ j: jAsli, g: g });
    }
  });
  
  var todJ=jadwalHariIniAsli.filter(function(j){
    return j.polaJadwal !== 'flex' && jadwalSelesai.indexOf(j.id) === -1;
  }).sort(function(a,b){return a.jamMulai.localeCompare(b.jamMulai);});
  
  // [V11.8] Kelas flex dipisah: dia tidak punya hari, jadi tidak boleh
  // ikut pengurutan berdasarkan hari maupun masuk kelompok "hari lain".
  var flexJ = jd.filter(function(j){
    return j.polaJadwal === 'flex' && jadwalSelesai.indexOf(j.id) === -1;
  });
  var othJ=jd.filter(function(j){return j.polaJadwal!=='flex' && j.hari!==today;}).sort(function(a,b){return HARI.indexOf(a.hari)-HARI.indexOf(b.hari)||a.jamMulai.localeCompare(b.jamMulai);});

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
  
  if(todJ.length>0 || jadwalGantiVirtual.length>0){
    var g=document.createElement('optgroup');g.label='── Hari ini ('+today+') ──';
    todJ.forEach(function(j){
      var o=document.createElement('option');
      o.value=j.id;
      o.textContent=labelJadwal(j,'✅ ');
      g.appendChild(o);
    });
    // Tambahkan jadwal pengganti (dari hari lain tapi ganti-nya hari ini)
    jadwalGantiVirtual.forEach(function(item){
      var j=item.j; var ganti=item.g;
      var jamLabel = ganti.jam || (jStr(j.jamMulai)+(j.jamSelesai?'–'+jStr(j.jamSelesai):''));
      var o=document.createElement('option');
      o.value=j.id;
      o.textContent='🔄 '+j.mk+(j.kelas?' ['+j.kelas+']':'') + ' (Pengganti) · '+jamLabel+' · '+(ganti.tempat||j.ruang);
      g.appendChild(o);
    });
    sel.appendChild(g);
  } else if (jadwalHariIniAsli.length > 0) {
    var o=document.createElement('option');o.disabled=true;o.textContent='🎉 Jadwal sudah tidak ada, terima kasih sudah berbagi ilmu hari ini';sel.appendChild(o);
  } else {
    var o=document.createElement('option');o.disabled=true;o.textContent='— Tidak ada jadwal hari '+today+' —';sel.appendChild(o);
  }
  
  // [V11.8] Kelompok Flex Class — labelnya memakai blok minggu ini,
  // bukan hari & jam jadwal (yang memang kosong untuk kelas flex).
  if(flexJ.length>0){
    var gf=document.createElement('optgroup');gf.label='── Flex Class ──';
    flexJ.forEach(function(j){
      var b = (typeof blokUntukHariIni === 'function') ? blokUntukHariIni(j.id) : null;
      var o=document.createElement('option');
      o.value=j.id;
      o.textContent = (b ? '🔀 ' : '⚪ ') + j.mk + (j.kelas?' ['+j.kelas+']':'')
        + (b ? ' · Minggu ' + b.minggu + ' · ' + b.jamMulai + '–' + b.jamSelesai
             : ' · belum ada blok untuk hari ini');
      gf.appendChild(o);
    });
    sel.appendChild(gf);
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
  
  var flexBerblok = flexJ.filter(function(j){
    return (typeof blokUntukHariIni === 'function') && blokUntukHariIni(j.id); });
  if(todJ.length===0 && jadwalGantiVirtual.length===0 && flexBerblok.length===1){
    sel.value=flexBerblok[0].id; onJadwal();
  }
  else if(todJ.length===1 && jadwalGantiVirtual.length===0){sel.value=todJ[0].id;onJadwal();}
  else if(todJ.length===0 && jadwalGantiVirtual.length===1){sel.value=jadwalGantiVirtual[0].j.id;onJadwal();}
}

// ── Banner sistem nonaktif di halaman Presensi ───────────────────────
function renderBannerHadirNonaktif() {
  var el = document.getElementById('hadir-banner-nonaktif');
  var cardEl = document.querySelector('#page-hadir .card');
  if (!el) return;

  if (!SISTEM_AKTIF) {
    // Cek jika session override sudah aktif — tampilkan banner hijau langsung
    if (sessionStorage.getItem('override_unlocked') === '1') {
      el.innerHTML = '<div style="background:#eaf3de;border:1.5px solid #97c459;border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:10px">'
        + '<span style="font-size:20px">🔓</span>'
        + '<div><div style="font-size:13px;font-weight:700;color:#27500a">Kode Override Aktif</div>'
        + '<div style="font-size:12px;color:#27500a;margin-top:2px">Anda mendapat izin merekam presensi hari ini. Silakan lanjutkan seperti biasa.</div></div>'
        + '</div>';
      el.style.display = 'block';
      if (cardEl) { cardEl.style.opacity = ''; cardEl.style.pointerEvents = ''; }
      return;
    }

    // Jadwal dosen hari ini yang belum punya pengganti
    var hariIni = todayHari();
    var belumGanti = currentUser ? J.filter(function(j){
      return j.dosenId === currentUser.id && j.hari === hariIni &&
        !G.some(function(g){ return g.dosenId === currentUser.id && g.mk === j.mk && g.statusAcc !== 'Ditolak'; });
    }) : [];

    var jadwalHtml = belumGanti.length > 0
      ? '<div style="margin:8px 0 6px;font-size:12px;font-weight:700;color:#7a4f00">📋 Jadwal hari ini yang perlu diganti:</div>'
        + '<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px">'
        + belumGanti.map(function(j){
            return '<div style="background:rgba(255,255,255,.5);border-radius:6px;padding:5px 10px;font-size:12px;color:#7a4f00">'
              + '• <b>' + j.mk + '</b>' + (j.kelas?' · '+j.kelas:'') + ' · ' + (jStr(j.jamMulai)||'?') + '–' + (jStr(j.jamSelesai)||'?')
              + '</div>';
          }).join('')
        + '</div>'
      : '';

    var overrideHtml = OVERRIDE_CODE
      ? '<div style="margin-top:12px;padding:12px 14px;background:rgba(255,255,255,.7);border-radius:10px;border:1px solid #e8c97a">'
          + '<div style="font-size:12px;font-weight:700;color:#7a4f00;margin-bottom:4px">🔑 Punya kode override dari Admin?</div>'
          + '<div style="font-size:11px;color:#7a4f00;margin-bottom:8px">Masukkan kode yang diberikan Admin untuk mengajar hari ini.</div>'
          + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
            + '<input type="text" id="input-kode-override" maxlength="8" placeholder="Masukkan kode..." '
              + 'style="flex:1;min-width:140px;border:1.5px solid #f9c84a;border-radius:8px;padding:8px 12px;'
              + 'font-size:16px;font-family:monospace;letter-spacing:3px;text-transform:uppercase;font-weight:700;'
              + 'background:#fffdf0;color:#5a3800;outline:none" '
              + 'onkeydown="if(event.key===\'Enter\') cekOverrideCode()"/>'
            + '<button onclick="cekOverrideCode()" '
              + 'style="padding:8px 16px;border-radius:8px;border:none;background:#f9c84a;color:#5a3800;'
              + 'font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap">'
              + '✅ Gunakan Kode</button>'
          + '</div>'
          + '<div id="override-err" style="display:none;margin-top:6px;font-size:11px;color:#a32d2d;font-weight:600"></div>'
        + '</div>'
      : '<div style="margin-top:10px;padding:8px 12px;background:rgba(255,255,255,.5);border-radius:8px;font-size:11px;color:#7a4f00">'
          + 'ℹ️ Tidak ada kode override aktif. Hubungi Admin jika perlu izin mengajar hari ini.'
        + '</div>';

    el.innerHTML = '<div style="background:#fff3cd;border:1.5px solid #f9c84a;border-radius:12px;padding:14px 16px">'
      + '<div style="display:flex;align-items:flex-start;gap:10px">'
        + '<span style="font-size:22px;flex-shrink:0">🔕</span>'
        + '<div style="flex:1">'
          + '<div style="font-size:14px;font-weight:700;color:#7a4f00;margin-bottom:4px">Rekam Presensi Tidak Tersedia</div>'
          + '<div style="font-size:12px;color:#7a4f00;line-height:1.6;margin-bottom:8px">'
            + (PESAN_LIBUR || 'Sistem presensi sedang dinonaktifkan oleh Admin.')
          + '</div>'
          + jadwalHtml
          + '<div style="background:rgba(255,255,255,.6);border-radius:8px;padding:10px 12px;border:1px solid #f9c84a">'
            + '<div style="font-size:12px;font-weight:700;color:#7a4f00;margin-bottom:6px">✅ Yang masih bisa dilakukan:</div>'
            + '<div style="font-size:12px;color:#7a4f00;margin-bottom:8px;line-height:1.6">'
              + 'Ajukan <b>Jadwal Pengganti</b> untuk memindahkan perkuliahan ke hari lain.'
            + '</div>'
            + '<button onclick="pg(\'ganti\', document.getElementById(\'tab-ganti\'))" '
              + 'style="padding:7px 16px;border-radius:8px;border:none;background:#f9c84a;color:#5a3800;'
              + 'font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">'
              + '🔄 Ajukan Jadwal Pengganti →</button>'
          + '</div>'
          + overrideHtml
        + '</div>'
      + '</div>'
    + '</div>';
    el.style.display = 'block';
    if (cardEl) { cardEl.style.opacity = '0.4'; cardEl.style.pointerEvents = 'none'; }
  } else {
    el.style.display = 'none';
    if (cardEl) { cardEl.style.opacity = ''; cardEl.style.pointerEvents = ''; }
  }
}

// ── Validasi kode override yang diinput dosen ────────────────────────
function cekOverrideCode() {
  var input = (document.getElementById('input-kode-override').value || '').trim().toUpperCase();
  var errEl = document.getElementById('override-err');
  if (!input) {
    if (errEl) { errEl.textContent = '❌ Masukkan kode terlebih dahulu.'; errEl.style.display = 'block'; }
    return;
  }
  if (!OVERRIDE_CODE) {
    if (errEl) { errEl.textContent = '❌ Tidak ada kode override aktif. Hubungi Admin.'; errEl.style.display = 'block'; }
    return;
  }
  if (input === OVERRIDE_CODE) {
    var cardEl = document.querySelector('#page-hadir .card');
    var bannerEl = document.getElementById('hadir-banner-nonaktif');
    if (bannerEl) {
      bannerEl.innerHTML = '<div style="background:#eaf3de;border:1.5px solid #97c459;border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:10px">'
        + '<span style="font-size:20px">🔓</span>'
        + '<div><div style="font-size:13px;font-weight:700;color:#27500a">Kode Override Diterima</div>'
        + '<div style="font-size:12px;color:#27500a;margin-top:2px">Anda mendapat izin merekam presensi hari ini. Silakan lanjutkan seperti biasa.</div></div>'
        + '</div>';
    }
    if (cardEl) { cardEl.style.opacity = ''; cardEl.style.pointerEvents = ''; }
    sessionStorage.setItem('override_unlocked', '1');
  } else {
    if (errEl) { errEl.textContent = '❌ Kode salah. Periksa kembali atau hubungi Admin.'; errEl.style.display = 'block'; }
    document.getElementById('input-kode-override').value = '';
    document.getElementById('input-kode-override').focus();
  }
}

function onJadwal(){
  var jid=document.getElementById('pj').value;
  document.getElementById('hint').style.display='none';
  document.getElementById('warn-hari').style.display='none';
  document.getElementById('prev').style.display='none';
  if(!jid){document.getElementById('pjam').value='';document.getElementById('pruang').value='';return;}
  var j=J.find(function(x){return x.id===jid;});if(!j)return;

  sesuaikanModeUjian(j);

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
  } else if (j.polaJadwal === 'flex') {
      // [V11.8] Kelas flex tidak punya hari & jam di jadwalnya —
      // keduanya berasal dari blok minggu ini yang ditetapkan dosen.
      var blokIni = (typeof blokUntukHariIni === 'function') ? blokUntukHariIni(j.id) : null;
      var w = document.getElementById('warn-hari');
      if (blokIni) {
        document.getElementById('pjam').value   = jStr(blokIni.jamMulai);
        document.getElementById('pruang').value = document.getElementById('pruang').value || '';
        w.className = 'ai';
        w.innerHTML = '🔀 <b>Flex Class</b> — blok minggu ke-<b>' + blokIni.minggu + '</b> · Jam: <b>'
                    + blokIni.jamMulai + '–' + blokIni.jamSelesai + '</b> · ' + blokIni.modaSumbuA;
        w.style.display = 'block';
      } else {
        document.getElementById('pjam').value   = '';
        document.getElementById('pruang').value = '';
        w.className = 'aw';
        w.innerHTML = '🔀 <b>Flex Class</b> — belum ada blok waktu untuk hari ini. '
                    + 'Buka menu <b>Flex Class</b> dan tetapkan blok minggu ini terlebih dahulu '
                    + '(paling lambat H-1 sebelum pelaksanaan).';
        w.style.display = 'block';
      }
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
  // Bug 3 fix: isGantiValid hanya berlaku jika jadwal ini BUKAN jadwal asli hari ini
  // (cegah jadwal asli hari Jumat ikut pakai jam ganti hanya karena MK-nya sama)
  var isGantiValid = (j.hari !== today)
    ? G.find(function(g){ return g.dosenId === currentUser.id && g.mk === j.mk && g.statusAcc === 'Disetujui' && g.ganti === ymd; })
    : null;
  var isMajuValid  = M.find(function(m){ return m.dosenId === currentUser.id && m.mk === j.mk && m.statusAcc === 'Disetujui' && m.tglRaw === ymd; });

  var blokPrev = (j && j.polaJadwal === 'flex' && typeof blokUntukHariIni === 'function')
                 ? blokUntukHariIni(j.id) : null;
  if (j && j.polaJadwal === 'flex' && !blokPrev) {
     el.style.display='block';el.style.background='#fcebeb';el.style.color='#791f1f';
     el.textContent='❌ Belum ada blok Flex Class untuk hari ini';return;
  }
  if(j && j.polaJadwal!=='flex' && j.hari!==today && !isGantiValid && !isMajuValid){
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



// =====================================================
// [V10] SUMBER JAM RESMI — satu tempat, dipakai semua pengecekan
// -----------------------------------------------------
// Jam yang berlaku belum tentu jam jadwal asli. Kalau ada Jadwal
// Pengganti atau Jadwal Maju yang sudah di-ACC untuk tanggal ini,
// JAM MEREKA yang berlaku. Sebelumnya pengaman anti-manipulasi
// memaksa balik ke jam asli, sehingga dosen yang maju ke jam 14:00
// tetap dihitung terlambat dari jam 11:00.
// Sumbernya tetap data server (G / M / J), bukan input di layar,
// jadi pengamanan terhadap manipulasi DevTools tidak berkurang.
// =====================================================
function ambilJamResmi(jad) {
  var d = new Date();
  var ymd = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0')
          + '-' + String(d.getDate()).padStart(2,'0');

  function pecah(rentang, bagian) {
    var v = String(rentang || '');
    if (v.indexOf('-') > -1) return jStr(v.split('-')[bagian].trim());
    return bagian === 0 ? jStr(v) : '';
  }

  // Jadwal pengganti hanya berlaku kalau hari ini bukan hari jadwal aslinya
  var ganti = (jad.hari !== todayHari())
    ? G.find(function(g){ return g.dosenId === currentUser.id && g.mk === jad.mk
                            && g.statusAcc === 'Disetujui' && g.ganti === ymd; })
    : null;
  var maju = M.find(function(m){ return m.dosenId === currentUser.id && m.mk === jad.mk
                            && m.statusAcc === 'Disetujui' && m.tglRaw === ymd; });

  // Kelas Flex Class tidak punya jam tetap — jamnya dari blok minggu ini.
  if (jad.polaJadwal === 'flex') {
    var blok = (typeof blokUntukHariIni === 'function') ? blokUntukHariIni(jad.id) : null;
    if (blok) return { jam: jStr(blok.jamMulai), jamSelesai: jStr(blok.jamSelesai),
                       sumber: 'Flex Class minggu ' + blok.minggu, ganti: null, maju: null, blok: blok };
    return { jam: '', jamSelesai: '', sumber: 'Flex Class', ganti: null, maju: null, blok: null };
  }

  if (ganti) return { jam: pecah(ganti.jam,0), jamSelesai: pecah(ganti.jam,1) || jStr(jad.jamSelesai||''),
                      sumber: 'Jadwal Pengganti', ganti: ganti, maju: null };
  if (maju)  return { jam: pecah(maju.jam,0),  jamSelesai: pecah(maju.jam,1)  || jStr(jad.jamSelesai||''),
                      sumber: 'Jadwal Maju', ganti: null, maju: maju };
  return { jam: jStr(jad.jamMulai), jamSelesai: jStr(jad.jamSelesai||''),
           sumber: 'Jadwal Reguler', ganti: null, maju: null };
}

async function rekam(){
  if(!currentUser){alert('Hanya dosen yang bisa melakukan ini.');return;}
  // Blokir rekam jika sistem nonaktif — kecuali ada override aktif di session
  if(!SISTEM_AKTIF && sessionStorage.getItem('override_unlocked') !== '1'){
    if(confirm(
      '🔕 Rekam presensi tidak tersedia hari ini.\n\n'
      + (PESAN_LIBUR ? PESAN_LIBUR + '\n\n' : '')
      + 'Buka halaman Jadwal Pengganti sebagai alternatif?'
    )) { pg('ganti', document.getElementById('tab-ganti')); }
    return;
  }
  var jid=document.getElementById('pj').value,
      jam=document.getElementById('pjam').value,
      ruang=document.getElementById('pruang').value,
      pmode=document.getElementById('pmode').value;

  if(!jid||!jam||!ruang){alert('Lengkapi semua field.');return;}
  var jad=J.find(function(j){return j.id===jid;});
  if(!jad){alert('Jadwal tidak ditemukan.');return;}

  // ── SECURITY: jam resmi diambil dari data server, bukan dari input ──
  // Sumbernya bisa jadwal pengganti / maju yang sudah di-ACC, bukan
  // selalu jam jadwal asli. Lihat ambilJamResmi().
  var resmi = ambilJamResmi(jad);
  var jamResmi = resmi.jam;
  if (!jamResmi && jad.polaJadwal === 'flex') {
    alert('🔀 Kelas Flex Class ini belum punya blok waktu untuk hari ini.\n\n'
        + 'Buka menu Flex Class dan tetapkan blok minggu ini terlebih dahulu '
        + '(paling lambat H-1 sebelum pelaksanaan).');
    return;
  }
  if(!jamResmi){alert('Data jam jadwal tidak ditemukan. Hubungi Admin.');return;}

  // Paksa sinkronkan input dengan data resmi (siapa yang mengubah, tampilan ikut kembali)
  document.getElementById('pjam').value = jamResmi;

  var d = new Date();
  var isGantiValid = resmi.ganti;
  var isMajuValid  = resmi.maju;

  // ── Cek batasan 15 menit sebelum jadwal ──
  // Gunakan jamResmi dari GAS — bukan jam dari input yang bisa dimanipulasi
  var jamParts = jamResmi.split(':');
  var jadwalMenit = parseInt(jamParts[0]) * 60 + parseInt(jamParts[1]);
  var nowMenit = d.getHours() * 60 + d.getMinutes();
  var selisihMenit = nowMenit - jadwalMenit;

  // Blokir jika lebih dari 15 menit SEBELUM jadwal (selisih < -15)
  if(selisihMenit < -15){
    var sisaMenit = Math.abs(selisihMenit) - 15;
    var jamBuka = new Date(d.getTime() + sisaMenit * 60000);
    var jamBukaStr = jamBuka.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
    alert('⏰ Presensi belum bisa dibuka.\n\nJadwal mulai pukul ' + jam + ', rekam baru bisa dilakukan mulai pukul ' + jamBukaStr + ' (15 menit sebelum jadwal).');
    return;
  }

  // [V11.8] Kelas flex tidak terikat hari. Yang menentukan boleh atau
  // tidaknya presensi adalah ada tidaknya blok waktu untuk hari ini.
  var blokHariIni = (jad.polaJadwal === 'flex' && typeof blokUntukHariIni === 'function')
                    ? blokUntukHariIni(jad.id) : null;

  if (jad.polaJadwal === 'flex') {
    if (!blokHariIni) {
      alert('🔀 Presensi gagal!\n\nKelas Flex Class "'+jad.mk+'" belum punya blok waktu untuk hari ini.\n\n'
          + 'Buka menu Flex Class dan tetapkan blok minggu ini terlebih dahulu.');
      return;
    }
  } else if(jad.hari!==todayHari() && !isGantiValid && !isMajuValid){
    alert('❌ Presensi gagal!\nJadwal "'+jad.mk+'" adalah hari '+jad.hari+'.\nTidak ada pengajuan pengganti/maju yang di-ACC untuk hari ini.');
    return;
  }

  var todayStr=new Date().toLocaleDateString('id-ID');
  var todayTs=parseTanggal(todayStr);
  var sudah=P.find(function(p){return p.dosenId===currentUser.id&&p.jadwalId===jid&&parseTanggal(p.tanggal)===todayTs;});
  if(sudah){alert('⚠️ Kamu sudah presensi untuk jadwal ini hari ini.\nWaktu hadir: '+sudah.waktuHadir);return;}

  // Simpan data pending dengan jam resmi dari GAS
  _rekamPending = { jid:jid, jam:jamResmi, ruang:ruang, pmode:pmode, jad:jad, isGantiValid:isGantiValid, isMajuValid:isMajuValid };

  // Isi modal
  document.getElementById('rkf-mk').textContent = jad.mk + (jad.kelas?' ['+jad.kelas+']':'');
  document.getElementById('rkf-jam').textContent = jamResmi;
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
  } else if(pmode.indexOf('Take-Home')>-1){
    modeBox.style.background='#faeeda'; modeBox.style.borderColor='#fac775';
    modeLbl.style.color='#633806'; modeLbl.textContent='📝 UAS Take-Home / Project';
    modeWarn.style.color='#633806';
    modeWarn.textContent='Presensi tetap dinilai sesuai jam ujian terjadwal. Perpanjangan pengerjaan take-home diatur di luar sistem.';
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

  // ── SECURITY: validasi ulang jam di sini sebelum kirim ke GAS ──
  // Mencegah serangan via _rekamPending yang diisi manual lewat DevTools
  var jad2 = J.find(function(j){ return j.id === p.jid; });
  if(!jad2){ alert('❌ Data jadwal tidak valid.'); return; }
  var jamCek = ambilJamResmi(jad2).jam;
  var cekParts = jamCek.split(':');
  var cekMenit = parseInt(cekParts[0])*60 + parseInt(cekParts[1]);
  var nowCek = new Date();
  var nowCekMenit = nowCek.getHours()*60 + nowCek.getMinutes();
  var selisihCek = nowCekMenit - cekMenit;
  if(selisihCek < -15){
    alert('⛔ Rekam presensi tidak valid.\nJadwal masih ' + Math.abs(selisihCek+15) + ' menit lagi.\nData tidak disimpan.');
    return;
  }

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
    modeKuliah:p.pmode, sumberJadwal:sumberJadwal,
    semester: SEMESTER_AKTIF || p.jad.semester || ''};

  // Kelas flex: bawa nomor minggu + Sumbu A/B dari blok yang berlaku
  var blokAktif = (p.jad.polaJadwal === 'flex' && typeof blokUntukHariIni === 'function')
                  ? blokUntukHariIni(p.jad.id) : null;
  if (blokAktif) {
    rec.minggu       = blokAktif.minggu;
    rec.modeKuliah   = blokAktif.modaSumbuA;
    rec.metodeSumbuB = blokAktif.metodeSumbuB;
  } else if (typeof mingguBerjalan === 'function') {
    rec.minggu = mingguBerjalan();
  }
  if (typeof MINGGU_UTS !== 'undefined' && rec.minggu) {
    rec.jenisPertemuan = rec.minggu === MINGGU_UTS ? 'UTS'
                       : rec.minggu === MINGGU_UAS ? 'UAS' : 'Tatap Muka';
  }

  var btn=document.getElementById('brek');btn.disabled=true;btn.textContent='Menyimpan...';
  setSB('sy');
  try{
    await post({action:'savePresensi',data:rec});
    P.push(rec);setSB('ok');actId=rec.id;actJad=p.jad;
    // Bug 2 fix: simpan jam selesai yang berlaku agar rekamSelesai pakai jam yang tepat
    actJamSelesai = jamSelesaiAkhir;
    document.getElementById('resume-banner').style.display='none';
    tampilKartuSelesai(rec,p.jad,jamSelesaiAkhir);
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

function tampilKartuSelesai(rec,jad,jamSelesaiOverride){
  var md = rec.modeKuliah || 'Luring';
  // Gunakan jamSelesaiOverride jika ada (dari jadwal ganti/maju), fallback ke jadwal asli
  var jamSelesaiTampil = jamSelesaiOverride || (jad&&jad.jamSelesai ? jStr(jad.jamSelesai) : '');
  document.getElementById('isel').innerHTML='<b>'+rec.dosen+'</b><br>'+rec.mk+(rec.kelas?' · '+rec.kelas:'')+' · '+rec.ruang+' <span class="badge mode-badge" style="font-size:10px; margin-left:6px">' + md + '</span><br>Hadir: <b>'+rec.waktuHadir+'</b> <span class="badge '+rec.color+'" style="font-size:11px">'+rec.status+'</span><br>Jam selesai jadwal: <b>'+(jamSelesaiTampil||'—')+'</b>';
  document.getElementById('csel').style.display='block';
}

async function rekamSelesai(){
  if(!actId){alert('Tidak ada sesi aktif.');return;}
  var now=new Date(),ws=now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  // Bug 2 fix: gunakan actJamSelesai (bisa dari jadwal ganti/maju) jika tersedia,
  // fallback ke jam selesai jadwal asli
  var jamSelesaiRef = actJamSelesai || (actJad ? jStr(actJad.jamSelesai) : '');
  var st=stS(jamSelesaiRef);
  var selAlasan=document.getElementById('alasan-sel').value;
  var txtAlasan=document.getElementById('alasan-txt').value.trim();
  var alasan=(selAlasan==='Lainnya')?txtAlasan:selAlasan;
  if(alasan!==''){st.l='Selesai Awal ('+alasan+')';st.c='blue';}
  // UAS Take-Home/Project: skoring tetap normal (stS), hanya tempel tag informatif ke status
  var actRec = P.find(function(p){return p.id===actId;});
  if(actRec && (actRec.modeKuliah||'').indexOf('Take-Home')>-1 && st.l.indexOf('Take-Home')===-1){
    st.l = st.l + ' · Ujian Take-Home/Project';
  }
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
    actId=null;actJad=null;actJamSelesai='';
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


// =====================================================
// [V11.5] MODE PERKULIAHAN SAAT MINGGU UJIAN
// -----------------------------------------------------
// Di minggu UTS/UAS, yang direkam adalah pelaksanaan ujian —
// bukan perkuliahan. Dropdown mode diganti jadi dua pilihan
// ujian supaya ujian take-home/project tetap tercatat, bukan
// dianggap tatap muka biasa.
// Aturan minggunya sama dengan flex: paralel tidak punya UTS.
// =====================================================
var MODE_KULIAH_BIASA = [
  ['Luring', 'Luring (Tatap Muka di Kelas)'],
  ['Daring Sinkronus', 'Daring Sinkronus (Zoom / GMeet)'],
  ['Daring Asinkronus', 'Daring Asinkronus (E-learning / Penugasan)']
];
var MODE_UJIAN = [
  ['Ujian Sinkronus (diawasi)', 'Ujian Sinkronus — diawasi langsung / online'],
  ['Ujian Asinkronus (take-home / project)', 'Ujian Asinkronus — take-home / project']
];

function mingguHariIni() {
  if (typeof mingguBerjalan === 'function') return mingguBerjalan();
  return 0;
}

function sesuaikanModeUjian(jad) {
  var sel  = document.getElementById('pmode');
  var hint = document.getElementById('mode-hint');
  if (!sel) return;

  var w = mingguHariIni();
  var jenis = (typeof jenisMinggu === 'function') ? jenisMinggu(jad, w) : 'Tatap Muka';
  var ujian = jenis !== 'Tatap Muka';

  var lama = sel.value;
  var opsi = ujian ? MODE_UJIAN : MODE_KULIAH_BIASA;
  sel.innerHTML = opsi.map(function(o){
    return '<option value="' + o[0] + '">' + o[1] + '</option>';
  }).join('');
  if (opsi.some(function(o){ return o[0] === lama; })) sel.value = lama;

  if (ujian && hint) {
    hint.style.display = 'block';
    hint.style.background = '#e6f1fb';
    hint.style.color = '#185fa5';
    hint.innerHTML = '📝 <b>Minggu ' + jenis + '</b> (minggu ke-' + w + ') — '
      + 'yang Anda rekam adalah pelaksanaan ujian, bukan perkuliahan biasa.';
  } else if (typeof onModeChange === 'function') {
    onModeChange();
  }
}
