/* monitoring.js — Fitur monitoring untuk Admin / WK I
   Fungsi: renderDailyDashboard, renderAlertAbsen,
           filterStatusKehadiran, renderDetailStatusKehadiran,
           renderRataLambat, renderTren, renderGantiAlert,
           renderRiwayatGanti, aksiBuktGanti, promptTolakGanti
*/

function renderDailyDashboard() {
  if(!isAdmin) { var c=document.getElementById('daily-dashboard-card'); if(c) c.style.display='none'; return; }
  var HARI_ID = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  var now = new Date();
  var hariIni = HARI_ID[now.getDay()];
  var tglStr = now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  document.getElementById('daily-hari').textContent = tglStr;

  // Jadwal yang ada hari ini
  var jadwalHariIni = J.filter(function(j){ return j.hari === hariIni; });

  // Presensi yang masuk hari ini
  var tglFormatted = now.toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric'}).replace(/\//g,'/');
  // Coba match berbagai format tanggal
  var todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  var presensiHariIni = P.filter(function(p){
    return parseTanggal(p.tanggal) === todayTs;
  });

  // Dosen yang sudah presensi hari ini (unik per dosenId)
  var dosenSudahIds = {};
  presensiHariIni.forEach(function(p){ dosenSudahIds[p.dosenId] = true; });

  // Dosen yang belum presensi (punya jadwal hari ini tapi belum ada di presensi hari ini)
  var dosenBelum = jadwalHariIni.filter(function(j){
    return !dosenSudahIds[j.dosenId];
  });
  // Unik per dosenId
  var dosenBelumUniq = {}, dosenBelumList = [];
  dosenBelum.forEach(function(j){
    if(!dosenBelumUniq[j.dosenId]){
      dosenBelumUniq[j.dosenId] = true;
      var d = D.find(function(x){ return x.id===j.dosenId; });
      if(d) dosenBelumList.push({ dosen: d, jadwal: j });
    }
  });

  var totJadwal = Object.keys(
    jadwalHariIni.reduce(function(acc,j){ acc[j.dosenId]=true; return acc; }, {})
  ).length; // unik per dosen
  var totHadir = Object.keys(dosenSudahIds).length;
  var totBelum = dosenBelumList.length;
  var pct = totJadwal > 0 ? Math.round((totHadir/totJadwal)*100) : 0;

  document.getElementById('daily-jadwal').textContent = totJadwal;
  document.getElementById('daily-hadir').textContent = totHadir;
  document.getElementById('daily-belum').textContent = totBelum;
  document.getElementById('daily-bar').style.width = pct+'%';
  document.getElementById('daily-bar').style.background = pct>=80?'#639922':pct>=50?'#BA7517':'#E24B4A';
  document.getElementById('daily-pct-label').textContent = pct+'% dosen sudah presensi hari ini ('+totHadir+' dari '+totJadwal+' yang memiliki jadwal)';

  var AVATAR_PAL2=['#185fa5','#639922','#7c3aed','#c2410c','#0f766e','#b45309','#be123c','#1d4ed8'];
  function aC(n){var c=0;for(var i=0;i<n.length;i++)c+=n.charCodeAt(i);return AVATAR_PAL2[c%AVATAR_PAL2.length];}
  function aI(n){var p=n.trim().split(' ').filter(Boolean);return p.length===1?p[0].substring(0,2).toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase();}

  var listHtml = '';
  if(dosenBelumList.length === 0) {
    listHtml = '<div style="padding:10px;background:#eaf3de;border-radius:8px;font-size:12px;color:#27500a;font-weight:500;text-align:center">✅ Semua dosen yang memiliki jadwal hari ini sudah presensi!</div>';
  } else {
    listHtml = '<div style="font-size:11px;font-weight:600;color:#a32d2d;margin-bottom:6px">Belum presensi (' + dosenBelumList.length + ' dosen):</div>';
    listHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">';
    listHtml += dosenBelumList.map(function(item){
      var ac=aC(item.dosen.nama), ini=aI(item.dosen.nama);
      return '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:#fff8f8;border:1px solid #f09595;border-radius:8px">'
        +'<div style="width:28px;height:28px;border-radius:50%;background:'+ac+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">'+ini+'</div>'
        +'<div style="min-width:0">'
          +'<div style="font-size:11px;font-weight:600;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+item.dosen.nama+'</div>'
          +'<div style="font-size:10px;color:#888">'+item.jadwal.mk+' · '+item.jadwal.jamMulai+'</div>'
        +'</div>'
        +'</div>';
    }).join('');
    listHtml += '</div>';
  }
  document.getElementById('daily-belum-list').innerHTML = listHtml;
}

// =====================================================
// FITUR 2: ALERT ABSEN BERTURUT-TURUT (≥ 2 minggu)
// =====================================================
function renderAlertAbsen() {
  if(!isAdmin) { var c=document.getElementById('alert-absen-card'); if(c) c.style.display='none'; return; }
  var MINGGU_MS = 7 * 24 * 60 * 60 * 1000;
  var now = new Date(); now.setHours(0,0,0,0);
  var batas = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // 2 minggu ke belakang

  var AVATAR_PAL3=['#185fa5','#639922','#7c3aed','#c2410c','#0f766e','#b45309','#be123c','#1d4ed8'];
  function aC3(n){var c=0;for(var i=0;i<n.length;i++)c+=n.charCodeAt(i);return AVATAR_PAL3[c%AVATAR_PAL3.length];}
  function aI3(n){var p=n.trim().split(' ').filter(Boolean);return p.length===1?p[0].substring(0,2).toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase();}

  var alerts = [];
  D.forEach(function(d){
    var jd = J.filter(function(j){ return j.dosenId===d.id; });
    if(jd.length === 0) return;

    // Presensi dosen ini dalam 2 minggu terakhir
    var presensiRecent = P.filter(function(p){
      return p.dosenId===d.id && parseTanggal(p.tanggal) >= batas.getTime();
    });

    // Hitung berapa hari jadwal yang seharusnya ada dalam 2 minggu terakhir
    var hariJadwal = jd.map(function(j){ return j.hari; });
    var HARI_IDX = {Senin:1,Selasa:2,Rabu:3,Kamis:4,Jumat:5,Sabtu:6};
    var expectedDates = [];
    for(var i=14; i>=1; i--) {
      var d2 = new Date(now.getTime() - i*24*60*60*1000);
      var HARI_NAME = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][d2.getDay()];
      if(hariJadwal.indexOf(HARI_NAME) > -1) expectedDates.push(d2.getTime());
    }

    if(expectedDates.length === 0) return; // tidak ada jadwal dalam 2 minggu

    // Cek apakah ada presensi sama sekali dalam 2 minggu
    if(presensiRecent.length === 0 && expectedDates.length >= 2) {
      // Cari presensi terakhir kapan
      var allPresensidosen = P.filter(function(p){ return p.dosenId===d.id; });
      var lastPresensi = allPresensidosen.length > 0
        ? allPresensidosen.reduce(function(latest, p){
            return parseTanggal(p.tanggal) > parseTanggal(latest.tanggal) ? p : latest;
          })
        : null;

      var selisihHari = lastPresensi
        ? Math.floor((now.getTime() - parseTanggal(lastPresensi.tanggal)) / (24*60*60*1000))
        : null;

      alerts.push({
        dosen: d,
        expectedCount: expectedDates.length,
        lastPresensi: lastPresensi,
        selisihHari: selisihHari
      });
    }
  });

  var card = document.getElementById('alert-absen-card');
  var listEl = document.getElementById('alert-absen-list');

  if(alerts.length === 0) {
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';
  listEl.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + alerts.map(function(a){
        var ac=aC3(a.dosen.nama), ini=aI3(a.dosen.nama);
        var lastTgl = a.lastPresensi ? a.lastPresensi.tanggal + ' ('+a.selisihHari+' hari lalu)' : 'Belum pernah presensi';
        return '<div style="background:#fff8f8;border:1px solid #f09595;border-radius:10px;padding:10px 12px">'
          +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
            +'<div style="width:32px;height:32px;border-radius:50%;background:'+ac+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">'+ini+'</div>'
            +'<div><div style="font-size:12px;font-weight:700;color:#a32d2d">'+a.dosen.nama+'</div>'
            +'<div style="font-size:10px;color:#888">'+a.expectedCount+'x jadwal tidak hadir (2 mgg)</div></div>'
          +'</div>'
          +'<div style="font-size:10px;color:#888;padding:5px 8px;background:#fff;border-radius:6px;border:1px solid #f09595">'
            +'📅 Terakhir presensi: <b style="color:#a32d2d">'+lastTgl+'</b>'
          +'</div>'
          +'</div>';
    }).join('')
    +'</div>';
}

// =====================================================
// FITUR FILTER STATUS KEHADIRAN (Tepat / Terlambat / Sangat Terlambat)
// =====================================================
var _sfActive = 'all'; // status filter aktif saat ini

function filterStatusKehadiran(status) {
  _sfActive = status;
  // Update style tombol
  ['all','green','yellow','red'].forEach(function(s){
    var btn = document.getElementById('sfbtn-' + s);
    if(!btn) return;
    btn.classList.remove('sf-active');
    if(s === status) btn.classList.add('sf-active');
  });
  // Rebuild filtered data dari state saat ini
  var start = document.getElementById('r-start').value;
  var end   = document.getElementById('r-end').value;
  var df    = document.getElementById('rd').value;
  var data  = P.slice();
  if(start) { var ts0 = new Date(start).setHours(0,0,0,0); data = data.filter(function(p){ return parseTanggal(p.tanggal) >= ts0; }); }
  if(end)   { var ts1 = new Date(end).setHours(23,59,59,999); data = data.filter(function(p){ return parseTanggal(p.tanggal) <= ts1; }); }
  if(df !== 'all') data = data.filter(function(p){ return p.dosenId === df; });
  renderDetailStatusKehadiran(data);
}

function renderDetailStatusKehadiran(baseData) {
  var el = document.getElementById('sf-detail-list');
  var ctx = document.getElementById('sf-context');
  if(!el) return;

  // Filter sesuai status aktif
  var filtered = _sfActive === 'all' ? baseData.slice() : baseData.filter(function(p){ return p.color === _sfActive; });

  // Konteks info
  if(ctx) {
    var start = document.getElementById('r-start').value;
    var end   = document.getElementById('r-end').value;
    var df    = document.getElementById('rd').value;
    var namaFilter = _sfActive === 'all' ? 'Semua status'
      : _sfActive === 'green' ? '✅ Tepat Waktu'
      : _sfActive === 'yellow' ? '⏱ Terlambat'
      : '🚨 Sangat Terlambat';
    var periodeInfo = (start && end) ? (start + ' s/d ' + end) : start ? ('mulai ' + start) : end ? ('sampai ' + end) : 'Semua periode';
    var dosenInfo   = (df !== 'all') ? (' · ' + (D.find(function(d){return d.id===df;})||{nama:'?'}).nama) : '';
    ctx.textContent = namaFilter + ' · ' + periodeInfo + dosenInfo + ' · ' + filtered.length + ' sesi';
    ctx.style.display = 'block';
  }

  if(filtered.length === 0) {
    el.innerHTML = '<div style="padding:12px;text-align:center;background:#f8f8f7;border-radius:8px;font-size:12px;color:#888">'
      + (_sfActive === 'all' ? '📭 Tidak ada data pada rentang ini.' : '🎉 Tidak ada sesi dengan status ini.')
      + '</div>';
    return;
  }

  // Kelompokkan per tanggal (terbaru dulu)
  var grouped = {};
  filtered.slice().reverse().forEach(function(p){
    if(!grouped[p.tanggal]) grouped[p.tanggal] = [];
    grouped[p.tanggal].push(p);
  });

  var AVATAR_SF = ['#185fa5','#639922','#7c3aed','#c2410c','#0f766e','#b45309','#be123c','#1d4ed8'];
  function sfColor(n){ var c=0; for(var i=0;i<n.length;i++) c+=n.charCodeAt(i); return AVATAR_SF[c%AVATAR_SF.length]; }
  function sfInit(n){ var p=n.trim().split(' ').filter(Boolean); return p.length===1?p[0].substring(0,2).toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase(); }

  var html = '';
  for(var tgl in grouped) {
    var sesiList = grouped[tgl];
    // Header tanggal
    html += '<div style="margin:10px 0 6px;display:flex;align-items:center;gap:6px">'
      + '<span style="font-size:11px;font-weight:700;color:#555;background:#f0f0ee;padding:2px 8px;border-radius:6px">📅 ' + tgl + '</span>'
      + '<span style="font-size:10px;color:#aaa">' + sesiList.length + ' sesi</span>'
      + '</div>';

    // Baris per sesi
    sesiList.forEach(function(p){
      var badgeBg  = p.color==='green' ? '#eaf3de' : p.color==='yellow' ? '#faeeda' : '#fcebeb';
      var badgeTx  = p.color==='green' ? '#27500a' : p.color==='yellow' ? '#633806' : '#791f1f';
      var badgeLabel = p.color==='green' ? '✅ Tepat' : p.color==='yellow' ? ('⏱ +' + (p.diff||0) + ' mnt') : ('🚨 +' + (p.diff||0) + ' mnt');
      var ac = sfColor(p.dosen||'');
      var ini = sfInit(p.dosen||'?');
      var modeBg = '#f3e8ff', modeTx = '#7e22ce';
      var mk = p.modeKuliah||'';
      if(mk.indexOf('Luring')>-1){modeBg='#eaf3de';modeTx='#27500a';}
      else if(mk.indexOf('Sinkronus')>-1){modeBg='#e6f1fb';modeTx='#185fa5';}
      else if(mk.indexOf('Asinkronus')>-1){modeBg='#faeeda';modeTx='#633806';}
      var selesaiSudahDirekam = p.waktuSelesai && p.waktuSelesai !== '';
      var tutupPaksaBtn = (isAdmin && !selesaiSudahDirekam)
        ? '<button class="btn btn-sm btn-danger" style="padding:1px 7px;font-size:10px;margin-top:4px" onclick="tutupPaksa(\'' + p.id + '\')">Tutup Paksa</button>'
        : '';
      var selesaiInfo = selesaiSudahDirekam
        ? '<span style="font-size:10px;color:#888;margin-top:3px;display:block">✔ Selesai ' + p.waktuSelesai + '</span>'
        : '';
      html += '<div class="ds-item">'
        + '<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">'
          + '<div style="width:30px;height:30px;border-radius:50%;background:' + ac + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">' + ini + '</div>'
          + '<div class="ds-left">'
            + '<div class="ds-name">' + (p.dosen||'—') + '</div>'
            + '<div class="ds-meta">' + (p.mk||'') + (p.kelas ? ' · ' + p.kelas : '') + ' · ' + (p.jam||'') + (p.ruang ? ' · ' + p.ruang : '') + '</div>'
            + (mk ? '<span style="font-size:10px;font-weight:500;padding:1px 6px;border-radius:20px;background:' + modeBg + ';color:' + modeTx + '">' + mk + '</span>' : '')
          + '</div>'
        + '</div>'
        + '<div style="display:flex;flex-direction:column;align-items:flex-end;flex-shrink:0;gap:2px">'
          + '<div class="ds-badge" style="background:' + badgeBg + ';color:' + badgeTx + '">' + badgeLabel + '</div>'
          + selesaiInfo
          + tutupPaksaBtn
        + '</div>'
        + '</div>';
    });
  }
  el.innerHTML = html;
}

// =====================================================
// FITUR 4: RATA-RATA KETERLAMBATAN PER DOSEN
// =====================================================
function renderRataLambat(data) {
  if(!isAdmin){ var c=document.getElementById('card-terlambat');if(c)c.style.display='none';return; }
  var AVATAR_PAL4=['#185fa5','#639922','#7c3aed','#c2410c','#0f766e','#b45309','#be123c','#1d4ed8'];
  function aC4(n){var c=0;for(var i=0;i<n.length;i++)c+=n.charCodeAt(i);return AVATAR_PAL4[c%AVATAR_PAL4.length];}
  function aI4(n){var p=n.trim().split(' ').filter(Boolean);return p.length===1?p[0].substring(0,2).toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase();}

  // Hitung rata-rata keterlambatan per dosen (hanya yang pernah terlambat)
  var result = D.map(function(d){
    var dd = data.filter(function(p){ return p.dosenId===d.id; });
    var terlambat = dd.filter(function(p){ return p.color==='yellow'||p.color==='red'; });
    if(terlambat.length===0) return null;
    var totalMenit = terlambat.reduce(function(s,p){ return s+(Number(p.diff)||0); },0);
    var rataRata = Math.round(totalMenit / terlambat.length);
    var pctTerlambat = Math.round((terlambat.length/dd.length)*100);
    return { dosen:d, total:dd.length, terlambatCount:terlambat.length, rataRata:rataRata, pctTerlambat:pctTerlambat };
  }).filter(Boolean).sort(function(a,b){ return b.rataRata-a.rataRata; });

  var el = document.getElementById('list-terlambat');
  if(result.length===0){ el.innerHTML='<div style="padding:10px;background:#eaf3de;border-radius:8px;font-size:12px;color:#27500a;text-align:center">✅ Tidak ada dosen yang terlambat pada periode ini.</div>'; return; }

  // Cari max untuk skala bar
  var maxMnt = result[0].rataRata || 1;

  el.innerHTML = result.map(function(r,i){
    var ac=aC4(r.dosen.nama), ini=aI4(r.dosen.nama);
    var barColor = r.rataRata<=10?'#BA7517':r.rataRata<=20?'#e07b20':'#E24B4A';
    var barW = Math.round((r.rataRata/maxMnt)*100);
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0ee">'
      +'<span style="font-size:12px;font-weight:700;color:#888;width:20px;text-align:center">#'+(i+1)+'</span>'
      +'<div style="width:30px;height:30px;border-radius:50%;background:'+ac+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">'+ini+'</div>'
      +'<div style="flex:1;min-width:0">'
        +'<div style="font-size:12px;font-weight:600;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+r.dosen.nama+'</div>'
        +'<div style="display:flex;align-items:center;gap:6px;margin-top:4px">'
          +'<div style="flex:1;background:#f0f0ee;border-radius:20px;height:7px;overflow:hidden"><div class="lat-bar" style="width:'+barW+'%;background:'+barColor+'"></div></div>'
          +'<span style="font-size:11px;font-weight:700;color:'+barColor+';white-space:nowrap">rata '+r.rataRata+' mnt</span>'
        +'</div>'
        +'<div style="font-size:10px;color:#888;margin-top:2px">Terlambat '+r.terlambatCount+'x dari '+r.total+'x sesi ('+r.pctTerlambat+'%)</div>'
      +'</div>'
      +'</div>';
  }).join('');
}

// =====================================================
// FITUR 5: GRAFIK TREN KEHADIRAN BULANAN
// =====================================================
function renderTren() {
  if(!isAdmin){ var c=document.getElementById('card-tren');if(c)c.style.display='none';return; }
  var dosenFilter = (document.getElementById('tren-dosen')||{value:'all'}).value;
  var BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
  var tahunIni = new Date().getFullYear();

  // Isi dropdown filter dosen tren jika belum
  var sel = document.getElementById('tren-dosen');
  if(sel && sel.options.length<=1){
    D.forEach(function(d){ var o=document.createElement('option');o.value=d.id;o.textContent=d.nama;sel.appendChild(o); });
  }

  // Kelompokkan presensi per bulan
  var dataSource = dosenFilter==='all' ? P : P.filter(function(p){ return p.dosenId===dosenFilter; });

  var perBulan = BULAN.map(function(_, idx){
    var bulanData = dataSource.filter(function(p){ return Number(p.bulan)===(idx+1); });
    if(bulanData.length===0) return { label:BULAN[idx], total:0, tepat:0, pct:null };
    var tepat = bulanData.filter(function(p){ return p.color==='green'; }).length;
    return { label:BULAN[idx], total:bulanData.length, tepat:tepat, pct:Math.round((tepat/bulanData.length)*100) };
  });

  var maxTotal = Math.max.apply(null, perBulan.map(function(b){ return b.total||0; })) || 1;

  var html = '<div class="tren-bar-wrap">';
  html += perBulan.map(function(b){
    if(b.pct===null){
      return '<div class="tren-bar-col"><div class="tren-pct" style="color:#ddd">—</div><div class="tren-bar" style="height:4px;background:#f0f0ee;width:100%"></div><div class="tren-lbl">'+b.label+'</div></div>';
    }
    var h = Math.max(8, Math.round((b.total/maxTotal)*60));
    var col = b.pct>=80?'#639922':b.pct>=60?'#BA7517':'#E24B4A';
    return '<div class="tren-bar-col">'
      +'<div class="tren-pct" style="color:'+col+'">'+b.pct+'%</div>'
      +'<div class="tren-bar" style="height:'+h+'px;background:'+col+'" title="'+b.label+': '+b.tepat+'x tepat / '+b.total+'x total"></div>'
      +'<div class="tren-lbl">'+b.label+'</div>'
      +'</div>';
  }).join('');
  html += '</div>';

  // Tambahkan catatan naik/turun
  var lastTwo = perBulan.filter(function(b){ return b.pct!==null; }).slice(-2);
  if(lastTwo.length===2){
    var diff = lastTwo[1].pct - lastTwo[0].pct;
    var trendNote = diff>0
      ? '<div style="margin-top:8px;padding:6px 10px;background:#eaf3de;border-radius:7px;font-size:11px;color:#27500a;font-weight:500">📈 Naik '+diff+'% dibanding bulan sebelumnya</div>'
      : diff<0
      ? '<div style="margin-top:8px;padding:6px 10px;background:#fcebeb;border-radius:7px;font-size:11px;color:#a32d2d;font-weight:500">📉 Turun '+Math.abs(diff)+'% dibanding bulan sebelumnya</div>'
      : '<div style="margin-top:8px;padding:6px 10px;background:#f5f5f3;border-radius:7px;font-size:11px;color:#888;font-weight:500">➡️ Sama dengan bulan sebelumnya</div>';
    html += trendNote;
  }

  document.getElementById('tren-chart').innerHTML = html;
}

// =====================================================
// FITUR 6: ALERT GANTI JADWAL MENUMPUK
// =====================================================
function renderGantiAlert() {
  if(!isAdmin){ var c=document.getElementById('card-ganti-alert');if(c)c.style.display='none';return; }
  var AVATAR_PAL5=['#185fa5','#639922','#7c3aed','#c2410c','#0f766e','#b45309','#be123c','#1d4ed8'];
  function aC5(n){var c=0;for(var i=0;i<n.length;i++)c+=n.charCodeAt(i);return AVATAR_PAL5[c%AVATAR_PAL5.length];}
  function aI5(n){var p=n.trim().split(' ').filter(Boolean);return p.length===1?p[0].substring(0,2).toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase();}

  var now = new Date();
  var bulanIni = now.getMonth()+1;
  var tahunIni = now.getFullYear();

  var alerts = D.map(function(d){
    // Hitung pengajuan ganti dalam bulan ini
    var gantibulan = G.filter(function(g){
      if(g.dosenId!==d.id) return false;
      // Coba parse tanggal diajukan atau tanggal ganti
      var tgl = g.diajukan || g.ganti || '';
      var parts = tgl.split(/[\/\-]/);
      if(parts.length<3) return false;
      // Format bisa dd/mm/yyyy atau yyyy-mm-dd
      var bulan, tahun;
      if(parts[0].length===4){ tahun=+parts[0];bulan=+parts[1]; }
      else { bulan=+parts[1];tahun=+parts[2]; }
      return bulan===bulanIni && tahun===tahunIni;
    });
    if(gantibulan.length<3) return null;
    return { dosen:d, count:gantibulan.length, list:gantibulan };
  }).filter(Boolean).sort(function(a,b){ return b.count-a.count; });

  var card = document.getElementById('card-ganti-alert');
  var listEl = document.getElementById('list-ganti-alert');
  if(alerts.length===0){ card.style.display='none'; return; }
  card.style.display='block';

  listEl.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + alerts.map(function(a){
        var ac=aC5(a.dosen.nama), ini=aI5(a.dosen.nama);
        var mkList = [...new Set(a.list.map(function(g){return g.mk;}))].join(', ');
        return '<div style="background:#fff4e5;border:1px solid #fac775;border-radius:10px;padding:10px 12px">'
          +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
            +'<div style="width:32px;height:32px;border-radius:50%;background:'+ac+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">'+ini+'</div>'
            +'<div><div style="font-size:12px;font-weight:700;color:#854f0b">'+a.dosen.nama+'</div>'
            +'<div style="font-size:10px;color:#888">Bulan ini: <b>'+a.count+'x</b> pengajuan ganti</div></div>'
          +'</div>'
          +'<div style="font-size:10px;color:#888;background:#fff;border-radius:6px;padding:4px 8px;border:1px solid #fac775">📚 MK: '+mkList+'</div>'
          +'</div>';
    }).join('')
    +'</div>';
}

// =====================================================
// FITUR 7: RIWAYAT GANTI JADWAL PER DOSEN (AUDIT)
// =====================================================
function renderRiwayatGanti() {
  if(!isAdmin){ var c=document.getElementById('card-riwayat-ganti');if(c)c.style.display='none';return; }

  // Isi dropdown jika belum
  var sel = document.getElementById('filter-ganti-dosen');
  if(sel && sel.options.length<=1){
    D.forEach(function(d){ var o=document.createElement('option');o.value=d.id;o.textContent=d.nama;sel.appendChild(o); });
  }

  var df = sel ? sel.value : 'all';
  var gantiData = df==='all' ? G.slice() : G.filter(function(g){ return g.dosenId===df; });
  gantiData = gantiData.slice().reverse(); // terbaru dulu

  var el = document.getElementById('list-riwayat-ganti');
  if(gantiData.length===0){ el.innerHTML='<p class="empty">Belum ada pengajuan ganti jadwal.</p>'; return; }

  el.innerHTML = gantiData.map(function(g){
    var statusBg = g.statusAcc==='Disetujui'?'#eaf3de':g.statusAcc==='Ditolak'?'#fcebeb':'#faeeda';
    var statusTx = g.statusAcc==='Disetujui'?'#27500a':g.statusAcc==='Ditolak'?'#791f1f':'#633806';
    var statusIcon = g.statusAcc==='Disetujui'?'✅':g.statusAcc==='Ditolak'?'❌':'⏳';
    var AVATAR_PAL6=['#185fa5','#639922','#7c3aed','#c2410c','#0f766e','#b45309'];
    function aC6(n){var c=0;for(var i=0;i<n.length;i++)c+=n.charCodeAt(i);return AVATAR_PAL6[c%AVATAR_PAL6.length];}
    function aI6(n){var p=n.trim().split(' ').filter(Boolean);return p.length===1?p[0].substring(0,2).toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase();}
    var ac=aC6(g.dosen), ini=aI6(g.dosen);

    return '<div class="ganti-card">'
      // header
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
        +'<div style="display:flex;align-items:center;gap:8px">'
          +'<div style="width:30px;height:30px;border-radius:50%;background:'+ac+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">'+ini+'</div>'
          +'<div>'
            +'<div style="font-size:13px;font-weight:600;color:#1a1a1a">'+g.dosen+'</div>'
            +'<div style="font-size:10px;color:#888">'+g.mk+' · Diajukan: '+g.diajukan+'</div>'
          +'</div>'
        +'</div>'
        +'<span class="ganti-status" style="background:'+statusBg+';color:'+statusTx+'">'+statusIcon+' '+g.statusAcc+'</span>'
      +'</div>'
      // tanggal & jam
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:6px">'
        +'<div style="background:#f8f8f7;border-radius:6px;padding:5px 8px">'
          +'<div style="font-size:9px;color:#aaa;text-transform:uppercase">Tgl Asli</div>'
          +'<div style="font-size:11px;font-weight:600;color:#1a1a1a">'+g.asli+'</div>'
        +'</div>'
        +'<div style="background:#f8f8f7;border-radius:6px;padding:5px 8px">'
          +'<div style="font-size:9px;color:#aaa;text-transform:uppercase">Tgl Ganti</div>'
          +'<div style="font-size:11px;font-weight:600;color:#1a1a1a">'+g.ganti+'</div>'
        +'</div>'
        +'<div style="background:#f8f8f7;border-radius:6px;padding:5px 8px">'
          +'<div style="font-size:9px;color:#aaa;text-transform:uppercase">Jam · Mode</div>'
          +'<div style="font-size:11px;font-weight:600;color:#1a1a1a">'+g.jam+' · '+g.mode+'</div>'
        +'</div>'
      +'</div>'
      // keterangan & alasan tolak
      +(g.ket?'<div style="font-size:11px;color:#555;margin-bottom:4px">📝 '+g.ket+'</div>':'')
      +(g.alasanTolak?'<div style="font-size:11px;color:#a32d2d;padding:4px 8px;background:#fcebeb;border-radius:6px">❌ Alasan ditolak: '+g.alasanTolak+'</div>':'')
      +(g.bukti?'<div style="margin-top:4px"><a href="'+g.bukti+'" target="_blank" style="font-size:11px;color:#185fa5;text-decoration:none">🔗 Lihat bukti</a></div>':'')
      // tombol aksi admin (jika masih menunggu)
      +(isAdmin && g.statusAcc==='Menunggu'
        ? '<div style="display:flex;gap:6px;margin-top:8px">'
            +'<button class="btn btn-sm" style="background:#eaf3de;color:#27500a;border-color:#97c459;font-size:11px" onclick="aksiBuktGanti(\''+g.id+'\',\'Disetujui\',\'\')">✅ Setujui</button>'
            +'<button class="btn btn-sm btn-danger" style="font-size:11px" onclick="promptTolakGanti(\''+g.id+'\')">❌ Tolak</button>'
          +'</div>'
        : '')
      +'</div>';
  }).join('');
}

async function aksiBuktGanti(id, status, alasan) {
  setSB('sy');
  try {
    await post({action:'updateStatusGanti', id:id, status:status, alasan:alasan});
    var idx = G.findIndex(function(g){ return g.id===id; });
    if(idx>-1){ G[idx].statusAcc=status; G[idx].alasanTolak=alasan; }
    setSB('ok'); renderRiwayatGanti(); renderGantiAlert();
  } catch(e){ setSB('er'); alert('Gagal: '+e.message); }
}
function promptTolakGanti(id) {
  var alasan = prompt('Masukkan alasan penolakan:');
  if(alasan===null) return;
  aksiBuktGanti(id, 'Ditolak', alasan||'Tidak memenuhi ketentuan');
}
// =====================================================
// PENGATURAN SISTEM — Toggle ON/OFF Presensi (Admin)
// =====================================================

function renderPengaturanSistem() {
  var el = document.getElementById('panel-pengaturan-sistem');
  if (!el || !isAdmin) return;

  var isOn = SISTEM_AKTIF;
  el.innerHTML =

    // ── BAGIAN 1: Toggle ON/OFF ──
    '<div style="margin-bottom:1.5rem">'
      + '<div style="font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:4px">🔌 Status Sistem Presensi</div>'
      + '<div style="font-size:12px;color:#888;margin-bottom:14px">Nonaktifkan sistem saat ada libur khusus, cuti bersama, atau kondisi darurat. Dosen tidak akan bisa merekam presensi selama sistem dimatikan.</div>'

      // Toggle switch
      + '<div style="display:flex;align-items:center;gap:16px;padding:16px;border-radius:12px;border:2px solid '+(isOn?'#97c459':'#f09595')+';background:'+(isOn?'#f4fce8':'#fff5f5')+';margin-bottom:12px">'
        + '<div onclick="toggleSistemPresensi()" style="cursor:pointer;width:56px;height:30px;border-radius:20px;background:'+(isOn?'#639922':'#ccc')+';position:relative;transition:background .25s;flex-shrink:0">'
          + '<div style="position:absolute;top:3px;'+(isOn?'right:3px':'left:3px')+';width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2);transition:all .25s"></div>'
        + '</div>'
        + '<div>'
          + '<div style="font-size:15px;font-weight:700;color:'+(isOn?'#27500a':'#a32d2d')+'">'+(isOn?'🟢 Sistem AKTIF':'🔴 Sistem NONAKTIF')+'</div>'
          + '<div style="font-size:11px;color:#888;margin-top:2px">'+(isOn?'Dosen dapat merekam presensi seperti biasa.':'Semua dosen tidak dapat merekam presensi.')+'</div>'
        + '</div>'
      + '</div>'

      // Pesan libur (banner di beranda dosen)
      + '<div style="margin-bottom:10px">'
        + '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:5px">Pesan banner saat sistem nonaktif <span style="font-weight:400;color:#aaa">(muncul di beranda dosen)</span></label>'
        + '<textarea id="input-pesan-libur" rows="2" placeholder="Contoh: Libur Idul Adha — presensi diliburkan hari ini." style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;resize:vertical">'+PESAN_LIBUR+'</textarea>'
      + '</div>'
      + '<button class="btn btn-primary" onclick="simpanPesanLibur()" style="font-size:13px">💾 Simpan Pesan Libur</button>'
    + '</div>'

    + '<div style="border-top:1px solid #f0f0ee;margin-bottom:1.5rem"></div>'

    // ── BAGIAN 2: Pengumuman Login ──
    + '<div>'
      + '<div style="font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:4px">📢 Pengumuman di Halaman Login</div>'
      + '<div style="font-size:12px;color:#888;margin-bottom:14px">Pesan ini muncul di papan pengumuman halaman login — terlihat oleh semua dosen sebelum masuk, cocok untuk info cuti bersama, jadwal ujian, atau instruksi khusus.</div>'

      // Preview
      + (PENGUMUMAN_LOGIN
        ? '<div style="background:#fff8e6;border:1.5px solid #f9c84a;border-radius:10px;padding:12px 14px;margin-bottom:12px;font-size:12px;color:#7a4f00;line-height:1.6">'
            + '<b style="display:block;margin-bottom:4px">📢 Preview saat ini:</b>'
            + '<span style="white-space:pre-wrap">'+PENGUMUMAN_LOGIN+'</span>'
          + '</div>'
        : '<div style="background:#f5f5f3;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:12px;color:#aaa;font-style:italic">Belum ada pengumuman aktif.</div>'
      )

      + '<div style="margin-bottom:10px">'
        + '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:5px">Isi pengumuman baru <span style="font-weight:400;color:#aaa">(kosongkan untuk menghapus)</span></label>'
        + '<textarea id="input-pengumuman-login" rows="4" placeholder="Contoh: Senin 26 Mei libur Cuti Bersama. Dosen yang memiliki jadwal hari Senin harap segera mengajukan jadwal pengganti." style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;resize:vertical">'+PENGUMUMAN_LOGIN+'</textarea>'
      + '</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
        + '<button class="btn btn-primary" onclick="simpanPengumumanLogin()" style="font-size:13px">💾 Simpan Pengumuman</button>'
        + (PENGUMUMAN_LOGIN ? '<button class="btn btn-danger" onclick="hapusPengumumanLogin()" style="font-size:13px">🗑️ Hapus Pengumuman</button>' : '')
      + '</div>'
    + '</div>';
}

async function toggleSistemPresensi() {
  var targetAktif = !SISTEM_AKTIF;
  var konfirmasi = confirm(
    targetAktif
      ? '✅ Aktifkan kembali sistem presensi?\nDosen akan bisa merekam presensi seperti biasa.'
      : '🔴 Nonaktifkan sistem presensi?\nSemua dosen tidak akan bisa merekam presensi sampai diaktifkan kembali.'
  );
  if (!konfirmasi) return;

  setSB('sy');
  try {
    // liburAktif=true berarti sistem MATI (libur), liburAktif=false berarti sistem AKTIF
    await post({ action: 'saveSettings', data: { liburAktif: String(!targetAktif) } });
    SISTEM_AKTIF = targetAktif;
    setSB('ok');
    renderPengaturanSistem();
    // Refresh banner beranda jika ada dosen yang login
    if (!isAdmin && currentUser) fillBerandaDosen();
  } catch(e) {
    setSB('er');
    alert('Gagal mengubah status sistem: ' + e.message);
  }
}

async function simpanPesanLibur() {
  var pesan = (document.getElementById('input-pesan-libur').value || '').trim();
  setSB('sy');
  try {
    await post({ action: 'saveSettings', data: { pesanLibur: pesan } });
    PESAN_LIBUR = pesan;
    setSB('ok');
    alert('✅ Pesan libur berhasil disimpan.');
  } catch(e) {
    setSB('er');
    alert('Gagal menyimpan pesan: ' + e.message);
  }
}

async function simpanPengumumanLogin() {
  var teks = (document.getElementById('input-pengumuman-login').value || '').trim();
  setSB('sy');
  try {
    await post({ action: 'saveSettings', data: { pengumumanLogin: teks } });
    PENGUMUMAN_LOGIN = teks;
    setSB('ok');
    renderPengaturanSistem();
    alert('✅ Pengumuman berhasil disimpan.\nAkan muncul di halaman login untuk semua dosen.');
  } catch(e) {
    setSB('er');
    alert('Gagal menyimpan pengumuman: ' + e.message);
  }
}

async function hapusPengumumanLogin() {
  if (!confirm('Hapus pengumuman dari halaman login?')) return;
  setSB('sy');
  try {
    await post({ action: 'saveSettings', data: { pengumumanLogin: '' } });
    PENGUMUMAN_LOGIN = '';
    setSB('ok');
    renderPengaturanSistem();
    alert('✅ Pengumuman berhasil dihapus.');
  } catch(e) {
    setSB('er');
    alert('Gagal menghapus pengumuman: ' + e.message);
  }
}
