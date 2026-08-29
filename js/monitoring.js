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

    // ── BAGIAN 1: Semester & Tahun Akademik ──
    '<div style="margin-bottom:1.5rem">'
      + '<div style="font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:4px">📅 Semester & Tahun Akademik Aktif</div>'
      + '<div style="font-size:12px;color:#888;margin-bottom:14px">Digunakan otomatis saat dosen merekam presensi — tidak perlu input manual di spreadsheet lagi.</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
        + '<div>'
          + '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:5px">Tahun Akademik</label>'
          + '<input type="text" id="input-tahun-akademik" placeholder="cth: 2025/2026" value="'+TAHUN_AKADEMIK+'" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit"/>'
        + '</div>'
        + '<div>'
          + '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:5px">Semester</label>'
          + '<select id="input-semester-aktif" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit">'
          + ['2025/2026 Ganjil','2025/2026 Genap','2026/2027 Ganjil','2026/2027 Genap'].map(function(s){
              return '<option value="'+s+'"'+(SEMESTER_AKTIF===s?' selected':'')+'>'+s+'</option>';
            }).join('')
          + '</select>'
        + '</div>'
      + '</div>'
      + (SEMESTER_AKTIF
        ? '<div style="background:#eaf3de;border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:12px;color:#27500a">✅ Aktif: <b>'+SEMESTER_AKTIF+'</b> · Tahun Akademik: <b>'+(TAHUN_AKADEMIK||'–')+'</b></div>'
        : '<div style="background:#faeeda;border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:12px;color:#633806">⚠️ Semester aktif belum diset — presensi akan pakai data dari jadwal.</div>'
      )
      + '<button class="btn btn-primary" onclick="simpanSemesterAktif()" style="font-size:13px">💾 Simpan Semester Aktif</button>'
    + '</div>'

    + '<div style="border-top:1px solid #f0f0ee;margin-bottom:1.5rem"></div>'

    // ── BAGIAN 2: Toggle ON/OFF ──
    + '<div style="margin-bottom:1.5rem">'
      + '<div style="font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:4px">🔌 Status Sistem Presensi</div>'
      + '<div style="font-size:12px;color:#888;margin-bottom:14px">Nonaktifkan sistem saat ada libur khusus, cuti bersama, atau kondisi darurat. Dosen tidak akan bisa merekam presensi selama sistem dimatikan.</div>'
      + '<div style="display:flex;align-items:center;gap:16px;padding:16px;border-radius:12px;border:2px solid '+(isOn?'#97c459':'#f09595')+';background:'+(isOn?'#f4fce8':'#fff5f5')+';margin-bottom:12px">'
        + '<div onclick="toggleSistemPresensi()" style="cursor:pointer;width:56px;height:30px;border-radius:20px;background:'+(isOn?'#639922':'#ccc')+';position:relative;transition:background .25s;flex-shrink:0">'
          + '<div style="position:absolute;top:3px;'+(isOn?'right:3px':'left:3px')+';width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2);transition:all .25s"></div>'
        + '</div>'
        + '<div>'
          + '<div style="font-size:15px;font-weight:700;color:'+(isOn?'#27500a':'#a32d2d')+'">'+(isOn?'🟢 Sistem AKTIF':'🔴 Sistem NONAKTIF')+'</div>'
          + '<div style="font-size:11px;color:#888;margin-top:2px">'+(isOn?'Dosen dapat merekam presensi seperti biasa.':'Semua dosen tidak dapat merekam presensi.')+'</div>'
        + '</div>'
      + '</div>'
      + '<div style="margin-bottom:10px">'
        + '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:5px">Pesan banner saat sistem nonaktif <span style="font-weight:400;color:#aaa">(muncul di beranda dosen)</span></label>'
        + '<textarea id="input-pesan-libur" rows="2" placeholder="Contoh: Libur Idul Adha — presensi diliburkan hari ini." style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;resize:vertical">'+PESAN_LIBUR+'</textarea>'
      + '</div>'
      + '<button class="btn btn-primary" onclick="simpanPesanLibur()" style="font-size:13px">💾 Simpan Pesan Libur</button>'
    + '</div>'

    + '<div style="border-top:1px solid #f0f0ee;margin-bottom:1.5rem"></div>'

    // ── BAGIAN 3: Kode Override Sementara ──
    + '<div style="margin-bottom:1.5rem">'
      + '<div style="font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:4px">🔑 Kode Override Presensi</div>'
      + '<div style="font-size:12px;color:#888;margin-bottom:14px">'
        + 'Gunakan saat sistem nonaktif (hari libur) tapi ada dosen tertentu yang perlu tetap mengajar dan merekam presensi. '
        + 'Bagikan kode ini hanya ke dosen yang mendapat izin. Hapus kode setelah semua dosen selesai mengajar.'
      + '</div>'
      + (OVERRIDE_CODE
        ? '<div style="background:#fff8e6;border:1.5px solid #f9c84a;border-radius:10px;padding:12px 14px;margin-bottom:12px">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">'
              + '<div>'
                + '<div style="font-size:11px;color:#7a4f00;font-weight:600;margin-bottom:4px">🟡 Kode Override Aktif:</div>'
                + '<div style="font-size:22px;font-weight:800;color:#7a4f00;letter-spacing:4px;font-family:monospace">' + OVERRIDE_CODE + '</div>'
                + '<div style="font-size:10px;color:#a07030;margin-top:4px">Bagikan hanya ke dosen yang mendapat izin mengajar hari ini.</div>'
              + '</div>'
              + '<button class="btn btn-danger" onclick="hapusOverrideCode()" style="font-size:12px;white-space:nowrap">🗑️ Hapus Kode</button>'
            + '</div>'
          + '</div>'
        : '<div style="background:#f5f5f3;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:12px;color:#aaa;font-style:italic">Tidak ada kode override aktif. Semua dosen mengikuti status sistem.</div>'
      )
      + '<div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">'
        + '<div style="flex:1;min-width:160px">'
          + '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:5px">'
            + (OVERRIDE_CODE ? 'Ganti kode override' : 'Buat kode override baru')
            + ' <span style="font-weight:400;color:#aaa">(4–8 karakter, huruf/angka)</span>'
          + '</label>'
          + '<input type="text" id="input-override-code" maxlength="8" placeholder="cth: LIBUR24" '
            + 'style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:15px;font-family:monospace;letter-spacing:2px;text-transform:uppercase;font-weight:700"/>'
        + '</div>'
        + '<button class="btn btn-primary" onclick="simpanOverrideCode()" style="font-size:13px;white-space:nowrap">🔑 ' + (OVERRIDE_CODE ? 'Ganti Kode' : 'Aktifkan Kode') + '</button>'
      + '</div>'
      + '<div style="margin-top:8px;padding:8px 12px;background:#f0f7ff;border-radius:8px;font-size:11px;color:#185fa5;line-height:1.6">'
        + 'ℹ️ <b>Cara pakai:</b> Aktifkan kode → bagikan ke dosen yang izin → dosen input kode di halaman Presensi → bisa rekam seperti biasa → setelah selesai, hapus kode ini.'
      + '</div>'
    + '</div>'

    + '<div style="border-top:1px solid #f0f0ee;margin-bottom:1.5rem"></div>'

    // ── BAGIAN 4: Pengumuman Login ──
    + '<div>'
      + '<div style="font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:4px">📢 Pengumuman di Halaman Login</div>'
      + '<div style="font-size:12px;color:#888;margin-bottom:14px">Pesan ini muncul di papan pengumuman halaman login — terlihat oleh semua dosen sebelum masuk.</div>'
      + (PENGUMUMAN_LOGIN
        ? '<div style="background:#fff8e6;border:1.5px solid #f9c84a;border-radius:10px;padding:12px 14px;margin-bottom:12px;font-size:12px;color:#7a4f00;line-height:1.6">'
            + '<b style="display:block;margin-bottom:4px">📢 Preview saat ini:</b>'
            + '<span style="white-space:pre-wrap">'+PENGUMUMAN_LOGIN+'</span>'
          + '</div>'
        : '<div style="background:#f5f5f3;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:12px;color:#aaa;font-style:italic">Belum ada pengumuman aktif.</div>'
      )
      + '<div style="margin-bottom:10px">'
        + '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:5px">Isi pengumuman baru <span style="font-weight:400;color:#aaa">(kosongkan untuk menghapus)</span></label>'
        + '<textarea id="input-pengumuman-login" rows="4" placeholder="Contoh: Senin 26 Mei libur Cuti Bersama." style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;resize:vertical">'+PENGUMUMAN_LOGIN+'</textarea>'
      + '</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
        + '<button class="btn btn-primary" onclick="simpanPengumumanLogin()" style="font-size:13px">💾 Simpan Pengumuman</button>'
        + (PENGUMUMAN_LOGIN ? '<button class="btn btn-danger" onclick="hapusPengumumanLogin()" style="font-size:13px">🗑️ Hapus Pengumuman</button>' : '')
      + '</div>'
    + '</div>'

    // ── BAGIAN 5 [V10]: Arsip Semester Lalu ──
    + renderKartuArsip()
    + renderKartuImport()
    + renderKartuRollover();
}

// =====================================================
// [V10] KARTU ARSIP — kelola & buka database semester lalu
// =====================================================
function renderKartuArsip() {
  var opsi = ARSIP_LIST.map(function(a){
    var sel = (ARSIP_AKTIF && ARSIP_AKTIF.id === a.id) ? ' selected' : '';
    return '<option value="'+a.id+'"'+sel+'>'+a.nama+'</option>';
  }).join('');

  var daftar = ARSIP_LIST.length
    ? ARSIP_LIST.map(function(a){
        return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;'
          + 'background:#f8f8f7;border-radius:8px;padding:8px 10px;margin-bottom:6px">'
          + '<div style="min-width:0">'
            + '<div style="font-size:12px;font-weight:600;color:#1a1a1a">'+a.nama+'</div>'
            + '<div style="font-size:10px;color:#aaa;font-family:monospace;overflow:hidden;text-overflow:ellipsis">'+a.id+'</div>'
          + '</div>'
          + '<button class="btn btn-danger btn-sm" style="font-size:11px;flex-shrink:0" '
          + 'onclick="hapusArsip(\''+a.id+'\')">Hapus</button>'
        + '</div>';
      }).join('')
    : '<div style="background:#f5f5f3;border-radius:8px;padding:10px 12px;margin-bottom:10px;'
      + 'font-size:12px;color:#aaa;font-style:italic">Belum ada arsip terdaftar.</div>';

  return '<div style="margin-bottom:1.5rem;padding-top:1.2rem;border-top:1px solid #f0f0ee">'
    + '<div style="font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:4px">📁 Arsip Semester Lalu</div>'
    + '<div style="font-size:12px;color:#888;margin-bottom:14px">'
      + 'Membuka arsip hanya mempengaruhi layar Anda sendiri — dosen lain tetap bisa presensi seperti biasa. '
      + 'Data arsip tidak bisa diubah.</div>'

    + (ARSIP_LIST.length
      ? '<div style="margin-bottom:14px">'
        + '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:5px">Lihat data semester</label>'
        + '<select id="pilih-arsip" onchange="bukaArsip(this.value)" '
        + 'style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit">'
        + '<option value="">— Semester berjalan (aktif) —</option>' + opsi
        + '</select></div>'
      : '')

    + '<div style="font-size:12px;font-weight:600;color:#555;margin-bottom:6px">Daftar arsip</div>'
    + daftar

    + '<div style="background:#f8f8f7;border-radius:8px;padding:10px 12px;margin-top:10px">'
      + '<div style="font-size:12px;font-weight:600;color:#555;margin-bottom:8px">+ Tambah arsip baru</div>'
      + '<input type="text" id="arsip-nama" placeholder="Nama, cth: Genap 2025/2026" '
      + 'style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;margin-bottom:6px"/>'
      + '<input type="text" id="arsip-id" placeholder="ID spreadsheet (dari URL-nya)" '
      + 'style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:12px;font-family:monospace;margin-bottom:8px"/>'
      + '<button class="btn btn-primary" onclick="simpanArsip()" style="font-size:13px">💾 Tambah Arsip</button>'
      + '<div style="font-size:11px;color:#aaa;margin-top:8px;line-height:1.5">'
        + 'ID diambil dari URL spreadsheet:<br>'
        + '<span style="font-family:monospace">docs.google.com/spreadsheets/d/<b style="color:#185fa5">ID-NYA</b>/edit</span>'
      + '</div>'
    + '</div>'
  + '</div>';
}

// =====================================================
// [V10] KARTU ROLLOVER — ganti semester tanpa buka Apps Script
// =====================================================
function renderKartuRollover() {
  return '<div style="margin-bottom:1.5rem;padding-top:1.2rem;border-top:1px solid #f0f0ee">'
    + '<div style="font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:4px">🔄 Ganti Semester (Rollover)</div>'
    + '<div style="font-size:12px;color:#888;margin-bottom:12px">'
      + 'Dipakai <b>sekali tiap awal semester</b>. Database yang sekarang otomatis '
      + 'masuk daftar arsip, lalu sistem berpindah ke database baru.</div>'

    + '<div style="background:#fcebeb;border:1px solid #f09595;border-radius:8px;padding:10px 12px;margin-bottom:12px">'
      + '<div style="font-size:12px;color:#791f1f;line-height:1.6">'
      + '<b>⚠️ Berpengaruh ke SEMUA pengguna.</b> Setelah tombol ditekan, seluruh dosen '
      + 'langsung memakai database baru. Pastikan spreadsheet baru sudah dibuat dari '
      + 'template dan berisi data Dosen &amp; Mata Kuliah.</div>'
    + '</div>'

    + '<div style="background:#f8f8f7;border-radius:8px;padding:12px">'
      + '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:5px">1. ID spreadsheet BARU</label>'
      + '<input type="text" id="ro-id-baru" placeholder="ID atau URL spreadsheet baru" '
      + 'style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:12px;font-family:monospace;margin-bottom:10px"/>'

      + '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:5px">2. Nama arsip untuk database SEKARANG</label>'
      + '<input type="text" id="ro-nama-arsip" placeholder="cth: Genap 2025/2026" value="'+(SEMESTER_AKTIF||'')+'" '
      + 'style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;margin-bottom:10px"/>'

      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">'
        + '<div>'
          + '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:5px">3. Semester baru</label>'
          + '<select id="ro-semester" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit">'
          + ['2026/2027 Ganjil','2026/2027 Genap','2027/2028 Ganjil','2027/2028 Genap'].map(function(x){
              return '<option value="'+x+'">'+x+'</option>'; }).join('')
          + '</select>'
        + '</div>'
        + '<div>'
          + '<label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:5px">4. Tahun akademik</label>'
          + '<input type="text" id="ro-tahun" placeholder="cth: 2026/2027" '
          + 'style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit"/>'
        + '</div>'
      + '</div>'

      + '<button class="btn btn-danger" onclick="jalankanRollover()" style="font-size:13px">🔄 Jalankan Rollover</button>'
    + '</div>'

    + '<div style="margin-top:12px">'
      + '<div style="font-size:12px;font-weight:600;color:#555;margin-bottom:4px">🧹 Rapikan database</div>'
      + '<div style="font-size:11px;color:#aaa;margin-bottom:8px;line-height:1.5">'
        + 'Meluruskan header, membuang sheet &amp; kolom tak terpakai, dan menghapus baris kosong. '
        + 'Jalankan setelah rollover. Aman diulang.</div>'
      + '<button class="btn btn-sm" onclick="jalankanSiapkanDatabase()" style="font-size:12px">🧹 Rapikan Sekarang</button>'
    + '</div>'
  + '</div>';
}

// =====================================================
// [V10] KARTU IMPORT JADWAL
// =====================================================
function renderKartuImport() {
  return '<div style="margin-bottom:1.5rem;padding-top:1.2rem;border-top:1px solid #f0f0ee">'
    + '<div style="font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:4px">📥 Import Jadwal</div>'
    + '<div style="font-size:12px;color:#888;margin-bottom:12px">'
      + 'Isi jadwal satu semester lewat spreadsheet, bukan satu per satu. '
      + 'Tipe kelas paralel ditentukan otomatis dari hari dan jam.</div>'

    + '<div style="background:#f8f8f7;border-radius:8px;padding:12px">'
      + '<div style="font-size:12px;color:#555;line-height:1.7;margin-bottom:10px">'
        + '<b>1.</b> Klik <i>Buat Template</i> → sheet <b>Import_Jadwal</b> muncul di spreadsheet<br>'
        + '<b>2.</b> Isi barisnya, hapus baris contoh<br>'
        + '<b>3.</b> Klik <i>Cek Dulu</i> untuk melihat error tanpa menyimpan<br>'
        + '<b>4.</b> Kalau bersih, klik <i>Import Sekarang</i>'
      + '</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap">'
        + '<button class="btn btn-sm" onclick="buatTemplateImport()" style="font-size:12px">📄 Buat Template</button>'
        + '<button class="btn btn-sm" onclick="cekImportJadwal()" style="font-size:12px">🔍 Cek Dulu</button>'
        + '<button class="btn btn-primary btn-sm" onclick="jalankanImportJadwal()" style="font-size:12px">📥 Import Sekarang</button>'
      + '</div>'
      + '<div id="hasil-import" style="margin-top:10px"></div>'
    + '</div>'
  + '</div>';
}

async function buatTemplateImport() {
  setSB('sy');
  try {
    var r = await post({ action:'buatTemplateImport' });
    setSB(r.success ? 'ok' : 'er');
    alert(r.success
      ? '✅ Sheet "Import_Jadwal" siap.\n\nBuka spreadsheet, isi barisnya, lalu kembali ke sini dan klik "Cek Dulu".'
      : 'Gagal: ' + r.error);
  } catch(e) { setSB('er'); alert('Gagal: ' + e.message); }
}

function tampilkanHasilPreview(r) {
  var el = document.getElementById('hasil-import');
  if (!el) return;
  if (!r.success) { el.innerHTML = '<div style="font-size:12px;color:#a32d2d">❌ '+r.error+'</div>'; return; }

  var ringkas = '<div style="font-size:12px;color:#555;margin-bottom:8px">'
    + '<b>'+r.total+'</b> baris · <b style="color:#27500a">'+r.siap+'</b> siap'
    + (r.errors ? ' · <b style="color:#a32d2d">'+r.errors+'</b> bermasalah' : '')
    + ' · '+r.paralel+' paralel · '+r.flex+' flex</div>';

  var masalah = r.baris.filter(function(b){ return !b.ok; });
  var detail = masalah.length
    ? masalah.slice(0,15).map(function(b){
        return '<div style="font-size:11px;color:#791f1f;background:#fcebeb;border-radius:6px;'
          + 'padding:5px 8px;margin-bottom:4px">Baris '+b.baris+': '+b.pesan.join('; ')+'</div>';
      }).join('') + (masalah.length>15 ? '<div style="font-size:11px;color:#888">… dan '+(masalah.length-15)+' lainnya</div>' : '')
    : '<div style="font-size:12px;color:#27500a;background:#eaf3de;border-radius:6px;padding:6px 10px">'
      + '✅ Semua baris valid — siap diimport.</div>';

  el.innerHTML = ringkas + detail;
}

async function cekImportJadwal() {
  setSB('sy');
  try {
    var r = await get({ action:'previewImportJadwal' });
    setSB('ok');
    tampilkanHasilPreview(r);
  } catch(e) { setSB('er'); alert('Gagal: ' + e.message); }
}

async function jalankanImportJadwal() {
  setSB('sy');
  var pv;
  try { pv = await get({ action:'previewImportJadwal' }); }
  catch(e) { setSB('er'); alert('Gagal: ' + e.message); return; }
  setSB('ok');
  tampilkanHasilPreview(pv);

  if (!pv.success)   { alert('Gagal: ' + pv.error); return; }
  if (pv.errors > 0) { alert('❌ Masih ada ' + pv.errors + ' baris bermasalah.\nPerbaiki dulu di sheet Import_Jadwal.'); return; }

  var jmlLama = J.length;
  var hapusLama = false;
  if (jmlLama > 0) {
    hapusLama = confirm('Sudah ada ' + jmlLama + ' jadwal di sistem.\n\n'
      + 'OK  = HAPUS semua jadwal lama, ganti dengan hasil import\n'
      + 'Cancel = TAMBAHKAN hasil import ke jadwal yang ada');
  }

  if (!confirm('Import ' + pv.total + ' jadwal?\n\n'
    + '• ' + pv.paralel + ' kelas paralel (8 pertemuan)\n'
    + '• ' + (pv.total - pv.paralel) + ' kelas reguler (16 pertemuan)\n'
    + '• ' + pv.flex + ' kelas flex\n\n'
    + (hapusLama ? '⚠️ Jadwal lama akan DIHAPUS.' : 'Jadwal lama tetap ada.'))) return;

  setSB('sy');
  try {
    var r = await post({ action:'commitImportJadwal', data:{ hapusLama: hapusLama } });
    if (!r.success) { setSB('er'); alert('Gagal: ' + r.error); return; }
    J = (await get({ action:'getJadwal' })).data || [];
    setSB('ok');
    alert('✅ ' + r.imported + ' jadwal berhasil diimport.\n'
      + r.paralel + ' paralel · ' + r.flex + ' flex');
    if (typeof renderJ === 'function') renderJ();
  } catch(e) { setSB('er'); alert('Gagal: ' + e.message); }
}

function ambilIdSpreadsheet(v) {
  v = (v || '').trim();
  var m = v.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : v;
}

async function jalankanRollover() {
  var idBaru    = ambilIdSpreadsheet(document.getElementById('ro-id-baru').value);
  var namaArsip = (document.getElementById('ro-nama-arsip').value || '').trim();
  var semester  = document.getElementById('ro-semester').value;
  var tahun     = (document.getElementById('ro-tahun').value || '').trim();

  if (!idBaru)    { alert('ID spreadsheet baru wajib diisi.'); return; }
  if (!namaArsip) { alert('Nama arsip wajib diisi.'); return; }
  if (!tahun)     { alert('Tahun akademik wajib diisi.'); return; }

  // Konfirmasi berlapis — dampaknya ke semua pengguna.
  if (!confirm('🔄 GANTI SEMESTER\n\n'
    + 'Database sekarang → arsip "' + namaArsip + '"\n'
    + 'Database baru     → ' + idBaru + '\n'
    + 'Semester baru     → ' + semester + '\n\n'
    + 'SELURUH DOSEN akan langsung berpindah ke database baru.\n'
    + 'Lanjutkan?')) return;

  var ketik = prompt('Konfirmasi terakhir.\n\nKetik ulang nama semester baru persis seperti ini:\n\n'
    + semester);
  if (ketik === null) return;
  if (ketik.trim() !== semester) { alert('❌ Tidak cocok. Rollover dibatalkan.'); return; }

  setSB('sy');
  try {
    var r = await post({ action:'rolloverSemester', data:{
      idBaru: idBaru, namaArsip: namaArsip, semesterBaru: semester, tahunBaru: tahun
    }});
    if (!r.success) { setSB('er'); alert('Gagal: ' + r.error); return; }
    setSB('ok');
    alert('✅ Rollover berhasil.\n\n'
      + 'Database aktif : ' + r.dbBaru + '\n'
      + 'Arsip          : ' + r.arsip + '\n'
      + (r.warning ? '\n⚠️ ' + r.warning + '\n' : '')
      + '\nHalaman akan dimuat ulang.');
    location.reload();
  } catch(e) { setSB('er'); alert('Gagal: ' + e.message); }
}

async function jalankanSiapkanDatabase() {
  if (!confirm('🧹 Rapikan struktur database aktif?\n\n'
    + 'Header diluruskan, sheet & kolom tak terpakai dibuang, baris kosong dihapus.\n'
    + 'Data yang ada TIDAK dihapus.')) return;

  setSB('sy');
  try {
    var r = await post({ action:'siapkanDatabaseBaru', data:{
      semesterAktif: SEMESTER_AKTIF, tahunAkademik: TAHUN_AKADEMIK
    }});
    if (!r.success) { setSB('er'); alert('Gagal: ' + (r.error||'')); return; }
    setSB('ok');
    var pesan = r.log.length ? '✅ Selesai:\n\n• ' + r.log.join('\n• ') : '✅ Tidak ada yang perlu diperbaiki.';
    if (r.peringatan && r.peringatan.length) pesan += '\n\n⚠️ Perlu perhatian:\n• ' + r.peringatan.join('\n• ');
    alert(pesan);
  } catch(e) { setSB('er'); alert('Gagal: ' + e.message); }
}

async function simpanArsip() {
  var nama = (document.getElementById('arsip-nama').value || '').trim();
  var id   = (document.getElementById('arsip-id').value   || '').trim();
  if (!nama) { alert('Nama semester wajib diisi.'); return; }
  if (!id)   { alert('ID spreadsheet wajib diisi.'); return; }

  // Toleransi kalau yang ditempel URL penuh, bukan ID saja
  var m = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (m) id = m[1];

  setSB('sy');
  try {
    var r = await post({ action: 'saveArsip', data: { nama: nama, id: id } });
    if (!r.success) { setSB('er'); alert('Gagal: ' + r.error); return; }
    ARSIP_LIST = (await get({ action: 'getDaftarArsip' })).data || [];
    setSB('ok');
    renderPengaturanSistem();
    alert('✅ Arsip "' + nama + '" ' + (r.updated ? 'diperbarui' : 'ditambahkan')
      + '.\nSpreadsheet: ' + r.nama);
  } catch(e) { setSB('er'); alert('Gagal: ' + e.message); }
}

async function hapusArsip(id) {
  var a = ARSIP_LIST.find(function(x){ return x.id === id; });
  if (!a) return;
  if (!confirm('Hapus "' + a.nama + '" dari daftar arsip?\n\n'
    + 'Spreadsheet-nya TIDAK ikut terhapus — hanya dikeluarkan dari daftar.')) return;

  setSB('sy');
  try {
    var r = await post({ action: 'deleteArsip', id: id });
    if (!r.success) { setSB('er'); alert('Gagal: ' + r.error); return; }
    ARSIP_LIST = ARSIP_LIST.filter(function(x){ return x.id !== id; });
    if (ARSIP_AKTIF && ARSIP_AKTIF.id === id) { await keluarArsip(); return; }
    setSB('ok');
    renderPengaturanSistem();
  } catch(e) { setSB('er'); alert('Gagal: ' + e.message); }
}

async function simpanOverrideCode() {
  var kode = (document.getElementById('input-override-code').value || '').trim().toUpperCase();
  if (!kode) { alert('Masukkan kode override terlebih dahulu.'); return; }
  if (kode.length < 4) { alert('Kode minimal 4 karakter.'); return; }
  if (!/^[A-Z0-9]+$/.test(kode)) { alert('Kode hanya boleh berisi huruf kapital dan angka.'); return; }
  if (!confirm('Aktifkan kode override "' + kode + '"?\n\nKode ini akan memperbolehkan siapapun yang mengetahuinya untuk merekam presensi meski sistem sedang nonaktif.\n\nPastikan hanya dibagikan ke dosen yang mendapat izin.')) return;
  setSB('sy');
  try {
    await post({ action: 'saveSettings', data: { overrideCode: kode } });
    OVERRIDE_CODE = kode;
    setSB('ok');
    renderPengaturanSistem();
    alert('✅ Kode override "' + kode + '" berhasil diaktifkan.\nBagikan kode ini hanya ke dosen yang mendapat izin mengajar hari ini.');
  } catch(e) { setSB('er'); alert('Gagal menyimpan: ' + e.message); }
}

async function hapusOverrideCode() {
  if (!confirm('Hapus kode override "' + OVERRIDE_CODE + '"?\n\nSetelah dihapus, semua dosen kembali mengikuti status sistem (tidak bisa presensi jika sistem nonaktif).')) return;
  setSB('sy');
  try {
    await post({ action: 'saveSettings', data: { overrideCode: '' } });
    OVERRIDE_CODE = '';
    setSB('ok');
    renderPengaturanSistem();
    alert('✅ Kode override berhasil dihapus. Sistem kembali ke kondisi normal.');
  } catch(e) { setSB('er'); alert('Gagal menghapus: ' + e.message); }
}

async function simpanSemesterAktif() {
  var semester = (document.getElementById('input-semester-aktif').value || '').trim();
  var tahun    = (document.getElementById('input-tahun-akademik').value  || '').trim();
  if (!semester) { alert('Pilih semester terlebih dahulu.'); return; }
  if (!tahun)    { alert('Isi tahun akademik terlebih dahulu.'); return; }
  setSB('sy');
  try {
    await post({ action: 'saveSettings', data: { semesterAktif: semester, tahunAkademik: tahun } });
    SEMESTER_AKTIF = semester;
    TAHUN_AKADEMIK = tahun;
    setSB('ok');
    renderPengaturanSistem();
    alert('✅ Semester aktif berhasil disimpan.\nSemester: ' + semester + '\nTahun Akademik: ' + tahun);
  } catch(e) {
    setSB('er');
    alert('Gagal menyimpan: ' + e.message);
  }
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
