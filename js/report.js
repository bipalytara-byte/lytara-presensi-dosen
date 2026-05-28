/* report.js — Halaman Laporan Dashboard admin
   Fungsi: renderR (main report render), exportExcel,
           switchLbTab, renderTop10, donut
*/


function renderR(){
  // Fitur 1 & 2: selalu render berdasarkan data real-time (bukan filter tanggal)
  renderDailyDashboard();
  renderAlertAbsen();
  // Fitur 4, 5, 6, 7, 8: render dengan data filtered
  renderGantiAlert();
  renderRiwayatGanti();
  renderRiwayatMaju();
  renderTren();

  var start=document.getElementById('r-start').value;
  var end=document.getElementById('r-end').value;
  var df=document.getElementById('rd').value;
  
  var daysInRange = getHariInRange(start, end);
  var data=P;
  var gf=G;
  var mf2=M;

  if(start) {
    var tsStart = new Date(start).setHours(0,0,0,0);
    data = data.filter(function(p){ return parseTanggal(p.tanggal) >= tsStart; });
    gf = gf.filter(function(g){ return new Date(g.ganti).getTime() >= tsStart; });
    mf2 = mf2.filter(function(mx){ return mx.tglRaw && new Date(mx.tglRaw).getTime() >= tsStart; });
  }
  
  if(end) {
    var tsEnd = new Date(end).setHours(23,59,59,999);
    data = data.filter(function(p){ return parseTanggal(p.tanggal) <= tsEnd; });
    gf = gf.filter(function(g){ return new Date(g.ganti).getTime() <= tsEnd; });
    mf2 = mf2.filter(function(mx){ return mx.tglRaw && new Date(mx.tglRaw).getTime() <= tsEnd; });
  }

  if(df!=='all') {
    data=data.filter(function(p){return p.dosenId===df;});
    gf=gf.filter(function(g){return g.dosenId===df;});
    mf2=mf2.filter(function(mx){return mx.dosenId===df;});
  }
  
  var h=data.filter(function(p){return p.color==='green';}).length;
  var k=data.filter(function(p){return p.color==='yellow';}).length;
  var m=data.filter(function(p){return p.color==='red';}).length;
  
  var ml = data.filter(function(p){return !p.modeKuliah || p.modeKuliah.indexOf('Luring')>-1;}).length;
  var ms = data.filter(function(p){return p.modeKuliah && p.modeKuliah.indexOf('Sinkronus')>-1 && p.modeKuliah.indexOf('Asinkronus')===-1;}).length;
  var maAll = data.filter(function(p){return p.modeKuliah && p.modeKuliah.indexOf('Asinkronus')>-1;});
  var ma = maAll.filter(function(p){return !p.tipePertemuan||p.tipePertemuan==='Reguler';}).length;
  var maUjian = maAll.filter(function(p){return p.tipePertemuan==='UTS'||p.tipePertemuan==='UAS';}).length;

  var sd=data.filter(function(p){return p.waktuSelesai&&p.waktuSelesai!=='';});
  var sh=sd.filter(function(p){return p.colorSelesai==='blue';}).length;
  var sm=sd.filter(function(p){return p.colorSelesai==='red';}).length;
  var sn=data.length-sd.length;
  
  document.getElementById('rt').textContent=data.length;
  document.getElementById('rg').textContent=gf.length;
  var rm2el=document.getElementById('rm2');if(rm2el)rm2el.textContent=mf2.length;
  document.getElementById('rp').textContent=data.length?Math.round(h/data.length*100)+'%':'0%';
  document.getElementById('rs').textContent=sd.length?Math.round(sh/sd.length*100)+'%':'0%';
  
  document.getElementById('lml').textContent='Luring: '+ml;
  document.getElementById('lms').textContent='Daring Sinkronus: '+ms;
  document.getElementById('lma').textContent='Daring Asinkronus: '+ma+(maUjian>0?' (+'+maUjian+'x UTS/UAS)':'');

  document.getElementById('lh').textContent='Tepat waktu: '+h;
  document.getElementById('lk').textContent='Terlambat: '+k;
  document.getElementById('lm').textContent='Sangat terlambat: '+m;
  document.getElementById('lsh').textContent='Tepat waktu selesai: '+sh;
  document.getElementById('lsm').textContent='Pulang awal: '+sm;
  document.getElementById('lsn').textContent='Belum direkam: '+sn;
  
  donut('cm',[{v:ml,c:'#8b5cf6'},{v:ms,c:'#3b82f6'},{v:ma,c:'#10b981'}],data.length);
  donut('ch',[{v:h,c:'#639922'},{v:k,c:'#BA7517'},{v:m,c:'#E24B4A'}],data.length);
  donut('cs',[{v:sh,c:'#185fa5'},{v:sm,c:'#E24B4A'},{v:sn,c:'#ddd'}],data.length);
  
  var totalPelanggaran = 0;

  var AVATAR_PAL = ['#185fa5','#639922','#7c3aed','#c2410c','#0f766e','#b45309','#be123c','#1d4ed8','#065f46','#6d28d9','#92400e','#155e75'];
  function aColor(n){var c=0;for(var i=0;i<n.length;i++)c+=n.charCodeAt(i);return AVATAR_PAL[c%AVATAR_PAL.length];}
  function aInit(n){var p=n.trim().split(' ').filter(Boolean);return p.length===1?p[0].substring(0,2).toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase();}

  var targetEl = document.getElementById('target-pct');
  var TARGET_PCT = targetEl ? parseInt(targetEl.value) : 80;

  var ds=df==='all'?D:D.filter(function(d){return d.id===df;});
  document.getElementById('bd').innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+ds.map(function(d){
    var dd=data.filter(function(p){return p.dosenId===d.id;});
    var jd=J.filter(function(j){return j.dosenId===d.id;});
    var dg=gf.filter(function(g){return g.dosenId===d.id && g.statusAcc==='Disetujui';});
    var dm2=mf2.filter(function(m){return m.dosenId===d.id && m.statusAcc==='Disetujui';});

    var totJadwal=jd.length, totPresensi=dd.length, totGanti=dg.length, totMaju=dm2.length;
    if(totJadwal===0&&totPresensi===0&&totGanti===0&&totMaju===0) return '';

    var hasJadwalInRange=jd.filter(function(j){return daysInRange.indexOf(j.hari)>-1;}).length>0;
    var dh=dd.filter(function(p){return p.color==='green';}).length;
    var dk=dd.filter(function(p){return p.color==='yellow';}).length;
    var dm=dd.filter(function(p){return p.color==='red';}).length;
    var dml=dd.filter(function(p){return !p.modeKuliah||p.modeKuliah.indexOf('Luring')>-1;}).length;
    var dms=dd.filter(function(p){return p.modeKuliah&&p.modeKuliah.indexOf('Sinkronus')>-1&&p.modeKuliah.indexOf('Asinkronus')===-1;}).length;
    var dmaAll=dd.filter(function(p){return p.modeKuliah&&p.modeKuliah.indexOf('Asinkronus')>-1;});
    var dma=dmaAll.filter(function(p){return !p.tipePertemuan||p.tipePertemuan==='Reguler';}).length;
    var dmaUjian=dmaAll.filter(function(p){return p.tipePertemuan==='UTS'||p.tipePertemuan==='UAS';}).length;
    var duts=dd.filter(function(p){return p.tipePertemuan==='UTS';}).length;
    var duas=dd.filter(function(p){return p.tipePertemuan==='UAS';}).length;
    var pHadir=totPresensi?Math.round((dh/totPresensi)*100):0;
    var pAsinkron=totPresensi?Math.round((dma/totPresensi)*100):0; // hanya reguler
    var pLuring=totPresensi?Math.round((dml/totPresensi)*100):0;
    var pSinkron=totPresensi?Math.round((dms/totPresensi)*100):0;
    var pGanti=totPresensi?Math.round((totGanti/totPresensi)*100):0;

    // Status
    var statusColor='#eaf3de',statusTextColor='#27500a',statusBorder='#97c459',statusLabel='✅ Disiplin';
    var warnHtml='';
    if(totJadwal>0&&totPresensi===0&&hasJadwalInRange){
      totalPelanggaran++;
      statusColor='#fcebeb';statusTextColor='#a32d2d';statusBorder='#f09595';statusLabel='🚨 Peringatan';
      warnHtml='<div style="margin-top:8px;padding:6px 8px;background:#fcebeb;border:1px solid #f09595;border-radius:6px;font-size:10px;font-weight:600;color:#a32d2d">🚨 Ada jadwal tapi tidak ada presensi.</div>';
    } else if(totJadwal>0&&totPresensi===0){
      statusColor='#f5f5f3';statusTextColor='#666';statusBorder='#ddd';statusLabel='ℹ️ Belum aktif';
    } else if(pAsinkron>=50){
      statusColor='#fff4e5';statusTextColor='#854f0b';statusBorder='#fac775';statusLabel='⚠️ Teguran';
      warnHtml='<div style="margin-top:8px;padding:6px 8px;background:#fff4e5;border:1px solid #fac775;border-radius:6px;font-size:10px;font-weight:600;color:#854f0b">⚠️ Asinkronus terlalu tinggi ('+pAsinkron+'%).</div>';
    } else if(pHadir<60&&totPresensi>0){
      statusColor='#faeeda';statusTextColor='#633806';statusBorder='#fac775';statusLabel='⏳ Perlu Perhatian';
    }

    // Progress bar hadir
    var barHtml=totPresensi===0
      ?'<div style="font-size:11px;color:#aaa;margin:8px 0 4px">Belum ada presensi</div>'
      :'<div style="display:flex;height:8px;border-radius:20px;overflow:hidden;margin:8px 0 4px">'
        +(dh?'<div style="flex:'+dh+';background:#639922"></div>':'')
        +(dk?'<div style="flex:'+dk+';background:#BA7517"></div>':'')
        +(dm?'<div style="flex:'+dm+';background:#E24B4A"></div>':'')
        +'</div>';
    var barLabel=totPresensi===0?'':
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
      +'<span style="font-size:10px;color:#888">✓ '+dh+'x tepat · '+dk+'x terlambat · '+dm+'x sangat terlambat</span>'
      +'<span style="font-size:11px;font-weight:700;color:'+(pHadir>=80?'#27500a':pHadir>=60?'#633806':'#a32d2d')+'">'+pHadir+'%</span>'
      +'</div>';

    // Mode mini grid
    var modeGrid=totPresensi===0?'':
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-top:6px">'
      +'<div style="background:#f5f5f3;border-radius:5px;padding:4px 6px;font-size:10px;color:#555">🏫 Luring<br><b style="color:#1a1a1a">'+dml+'x ('+pLuring+'%)</b></div>'
      +'<div style="background:#f5f5f3;border-radius:5px;padding:4px 6px;font-size:10px;color:#555">💻 Sinkronus<br><b style="color:#1a1a1a">'+dms+'x ('+pSinkron+'%)</b></div>'
      +'<div style="background:#f5f5f3;border-radius:5px;padding:4px 6px;font-size:10px;color:#555">📝 Asinkronus<br><b style="color:#1a1a1a">'+dma+'x ('+pAsinkron+'%)'+(dmaUjian>0?' <span style="color:#185fa5">+'+dmaUjian+'x UTS/UAS</span>':'')+'</b></div>'
      +'<div style="background:#f5f5f3;border-radius:5px;padding:4px 6px;font-size:10px;color:#555">🔄 Ganti Jadwal<br><b style="color:#1a1a1a">'+totGanti+'x</b></div>'
      +(totMaju>0?'<div style="background:#fefce8;border:1px solid #fde68a;border-radius:5px;padding:4px 6px;font-size:10px;color:#92400e;grid-column:span 2">⏩ Jadwal Maju (ACC)<br><b style="color:#92400e">'+totMaju+'x pemajuan jam</b></div>':'')
      +(duts>0||duas>0?'<div style="background:#e6f1fb;border:1px solid #85b7eb;border-radius:5px;padding:4px 6px;font-size:10px;color:#185fa5;grid-column:span 2">📋 UTS/UAS: '+(duts>0?duts+'x UTS ':'')+''+(duas>0?duas+'x UAS':'')+'<br><span style="font-size:9px;color:#185fa5;opacity:.8">tidak dihitung dalam batas asinkronus</span></div>':'')
      +'</div>';

    // FITUR 3: Target Kehadiran — hitung estimasi total sesi dari jadwal di rentang tanggal
    // Hitung jumlah sesi yang seharusnya terjadi berdasarkan jadwal & rentang filter
    var hariAdaJadwal = jd.filter(function(j){ return daysInRange.indexOf(j.hari)>-1; });
    // Estimasi pertemuan: jika ada rentang tanggal, hitung minggu; jika tidak, gunakan total presensi + jadwal per minggu sebagai referensi
    var estimasiSesi = 0;
    if(start && end) {
      var msRange = new Date(end).getTime() - new Date(start).getTime();
      var minggu = Math.ceil(msRange / (7*24*60*60*1000)) || 1;
      estimasiSesi = hariAdaJadwal.length * minggu;
    } else {
      // Tanpa rentang: gunakan jumlah presensi + pelanggaran sebagai proxy
      estimasiSesi = totPresensi + (hasJadwalInRange && totPresensi===0 ? hariAdaJadwal.length : 0);
    }
    var pTarget = estimasiSesi > 0 ? Math.round((totPresensi/estimasiSesi)*100) : (totPresensi>0?100:0);
    var memenuhi = pTarget >= TARGET_PCT;
    var targetBadge = totPresensi===0 ? '' :
      '<div style="margin-top:7px;padding:5px 8px;border-radius:7px;font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:space-between;background:'+(memenuhi?'#eaf3de':'#fcebeb')+';border:1px solid '+(memenuhi?'#97c459':'#f09595')+';color:'+(memenuhi?'#27500a':'#a32d2d')+'">'
        +'<span>'+(memenuhi?'✅':'❌')+' Target ≥'+TARGET_PCT+'%</span>'
        +'<span style="font-size:11px">'+pTarget+'% ('+totPresensi+'/'+(estimasiSesi||'-')+'x)</span>'
        +'</div>';

    var ac=aColor(d.nama), ini=aInit(d.nama);
    return '<div style="background:#fff;border:1px solid #e5e5e3;border-radius:14px;padding:14px;box-shadow:0 1px 4px rgba(0,0,0,.04)">'
      // header
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'
        +'<div style="width:36px;height:36px;border-radius:50%;background:'+ac+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">'+ini+'</div>'
        +'<div style="min-width:0">'
          +'<div style="font-size:13px;font-weight:600;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+d.nama+'</div>'
          +'<div style="font-size:10px;color:#888;margin-top:1px">'+totJadwal+' MK · '+totPresensi+'x Presensi</div>'
        +'</div>'
      +'</div>'
      // status badge
      +'<div style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;background:'+statusColor+';color:'+statusTextColor+';border:1px solid '+statusBorder+';margin-bottom:2px">'+statusLabel+'</div>'
      // progress + target
      + barHtml + barLabel + modeGrid + targetBadge + warnHtml
      +'</div>';
  }).filter(Boolean).join('')+'</div>'||'<p class="empty">Belum ada data.</p>';

  document.getElementById('tp-count').textContent = totalPelanggaran;
  document.getElementById('pelanggaran-banner').style.display = totalPelanggaran > 0 ? 'block' : 'none';

  // Fitur 4: rata-rata keterlambatan (pakai data filtered)
  renderRataLambat(data);

  // ===== UPDATE BADGE COUNT TOMBOL FILTER STATUS =====
  var cAll = data.length;
  var cGreen = data.filter(function(p){return p.color==='green';}).length;
  var cYellow = data.filter(function(p){return p.color==='yellow';}).length;
  var cRed = data.filter(function(p){return p.color==='red';}).length;
  var sfAll = document.getElementById('sf-count-all');
  var sfG = document.getElementById('sf-count-green');
  var sfY = document.getElementById('sf-count-yellow');
  var sfR = document.getElementById('sf-count-red');
  if(sfAll) sfAll.textContent = cAll;
  if(sfG) sfG.textContent = cGreen;
  if(sfY) sfY.textContent = cYellow;
  if(sfR) sfR.textContent = cRed;
  // Sembunyikan section filter jika bukan admin
  var cardFS = document.getElementById('card-filter-status');
  if(cardFS) cardFS.style.display = isAdmin ? 'block' : 'none';
  // Re-render detail list sesuai filter aktif saat ini
  renderDetailStatusKehadiran(data);

  // DETAIL RIWAYAT — card per sesi, dikelompokkan per tanggal
  var groupedData = {};
  data.slice().reverse().forEach(function(p) {
    if(!groupedData[p.tanggal]) groupedData[p.tanggal] = [];
    groupedData[p.tanggal].push(p);
  });

  var detHtml = '';
  if(Object.keys(groupedData).length === 0) {
    detHtml = '<p class="empty">Belum ada data pada rentang tanggal ini.</p>';
  } else {
    for(var tgl in groupedData) {
      // Header tanggal
      detHtml += '<div style="display:flex;align-items:center;gap:8px;margin:12px 0 8px;padding-bottom:6px;border-bottom:2px solid #e5e5e3">'
        +'<div style="width:32px;height:32px;border-radius:8px;background:#185fa5;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">📅</div>'
        +'<div style="font-size:13px;font-weight:700;color:#1a1a1a">'+tgl+'</div>'
        +'<div style="font-size:11px;color:#888;margin-left:auto">'+groupedData[tgl].length+' sesi</div>'
        +'</div>';

      // Grid card sesi
      detHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;min-width:0;overflow:hidden">';
      detHtml += groupedData[tgl].map(function(p) {
        var jt = jStr(p.jam)||p.jam;
        var md = p.modeKuliah||'Luring';

        // warna & label status hadir
        var hadirBg = p.color==='green'?'#eaf3de':p.color==='yellow'?'#faeeda':'#fcebeb';
        var hadirTx = p.color==='green'?'#27500a':p.color==='yellow'?'#633806':'#791f1f';

        // status selesai
        var selesaiHtml='';
        if(p.waktuSelesai && p.waktuSelesai!=='') {
          var sBg = p.colorSelesai==='blue'?'#e6f1fb':'#fcebeb';
          var sTx = p.colorSelesai==='blue'?'#185fa5':'#791f1f';
          selesaiHtml = '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;padding-top:6px;border-top:1px dashed #f0f0ee">'
            +'<span style="font-size:10px;color:#888">Selesai</span>'
            +'<div style="display:flex;align-items:center;gap:5px">'
              +'<span style="font-size:11px;font-weight:600;color:#1a1a1a">'+p.waktuSelesai+'</span>'
              +'<span style="font-size:10px;font-weight:600;padding:1px 6px;border-radius:20px;background:'+sBg+';color:'+sTx+'">'+p.statusSelesai+'</span>'
            +'</div>'
            +'</div>';
        } else {
          var tutupBtn = isAdmin
            ? '<button class="btn btn-sm btn-danger" style="padding:1px 7px;font-size:10px" onclick="tutupPaksa(\''+p.id+'\')">Tutup Paksa</button>'
            : '';
          selesaiHtml = '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;padding-top:6px;border-top:1px dashed #f0f0ee">'
            +'<span style="font-size:10px;color:#aaa">Selesai belum direkam</span>'+tutupBtn
            +'</div>';
        }

        // mode badge
        var modeBg='#f3e8ff',modeTx='#7e22ce';
        if(md.indexOf('Luring')>-1){modeBg='#eaf3de';modeTx='#27500a';}
        else if(md.indexOf('Sinkronus')>-1){modeBg='#e6f1fb';modeTx='#185fa5';}
        else if(md.indexOf('Asinkronus')>-1){modeBg='#faeeda';modeTx='#633806';}

        // avatar
        var ac2=aColor(p.dosen), ini2=aInit(p.dosen);

        return '<div style="background:#fff;border:1px solid #e5e5e3;border-radius:12px;padding:10px 12px;box-shadow:0 1px 3px rgba(0,0,0,.04);min-width:0;overflow:hidden">'
          // nama dosen row
          +'<div style="display:flex;align-items:center;gap:7px;margin-bottom:8px">'
            +'<div style="width:28px;height:28px;border-radius:50%;background:'+ac2+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">'+ini2+'</div>'
            +'<div style="min-width:0;overflow:hidden">'
              +'<div style="font-size:12px;font-weight:600;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+p.dosen+'</div>'
              +'<div style="font-size:10px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+p.mk+(p.kelas?' · '+p.kelas:'')+'</div>'
            +'</div>'
          +'</div>'
          // info row
          +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:6px;min-width:0">'
            +'<div style="background:#f8f8f7;border-radius:6px;padding:4px 6px;min-width:0;overflow:hidden">'
              +'<div style="font-size:9px;color:#aaa;text-transform:uppercase;letter-spacing:.04em">Ruang</div>'
              +'<div style="font-size:11px;font-weight:600;color:#1a1a1a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%" title="'+p.ruang+'">'+p.ruang+'</div>'
            +'</div>'
            +'<div style="background:#f8f8f7;border-radius:6px;padding:4px 6px;min-width:0">'
              +'<div style="font-size:9px;color:#aaa;text-transform:uppercase;letter-spacing:.04em">Jadwal</div>'
              +'<div style="font-size:11px;font-weight:600;color:#1a1a1a">'+jt+'</div>'
            +'</div>'
          +'</div>'
          // hadir + mode badges
          +'<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">'
            +'<span style="font-size:10px;color:#888">Hadir: <b style="color:#1a1a1a">'+p.waktuHadir+'</b></span>'
            +'<span style="font-size:10px;font-weight:600;padding:1px 7px;border-radius:20px;background:'+hadirBg+';color:'+hadirTx+'">'+p.status+(p.diff>0?' +'+p.diff+'mnt':'')+'</span>'
            +'<span style="font-size:10px;font-weight:500;padding:1px 7px;border-radius:20px;background:'+modeBg+';color:'+modeTx+'">'+md+'</span>'
            +(p.sumberJadwal==='Jadwal Maju'?'<span style="font-size:10px;font-weight:600;padding:1px 7px;border-radius:20px;background:#fef3c7;color:#92400e;border:1px solid #fde68a">⏩ Maju</span>':p.sumberJadwal==='Jadwal Pengganti'?'<span style="font-size:10px;font-weight:600;padding:1px 7px;border-radius:20px;background:#e6f1fb;color:#185fa5;border:1px solid #85b7eb">🔄 Pengganti</span>':'')
          +'</div>'
          + selesaiHtml
          +'</div>';
      }).join('');
      detHtml += '</div>';
    }
  }
  document.getElementById('det').innerHTML = detHtml;
}

function exportExcel() {
  if(!isAdmin) return;
  
  var start=document.getElementById('r-start').value;
  var end=document.getElementById('r-end').value;
  var df=document.getElementById('rd').value;
  
  var daysInRange = getHariInRange(start, end);
  var labelTanggal = (start ? start : 'Awal') + '_sd_' + (end ? end : 'Akhir');
  
  var data=P;
  var gf=G;

  if(start) {
    var tsStart = new Date(start).setHours(0,0,0,0);
    data = data.filter(function(p){ return parseTanggal(p.tanggal) >= tsStart; });
    gf = gf.filter(function(g){ return new Date(g.ganti).getTime() >= tsStart; });
  }
  
  if(end) {
    var tsEnd = new Date(end).setHours(23,59,59,999);
    data = data.filter(function(p){ return parseTanggal(p.tanggal) <= tsEnd; });
    gf = gf.filter(function(g){ return new Date(g.ganti).getTime() <= tsEnd; });
  }

  if(df!=='all') {
    data=data.filter(function(p){return p.dosenId===df;});
    gf=gf.filter(function(g){return g.dosenId===df;});
  }

  var ds=df==='all'?D:D.filter(function(d){return d.id===df;});

  var table = '<html xmlns:x="urn:schemas-microsoft-com:office:excel">';
  table += '<head><meta charset="UTF-8"></head><body>';
  table += '<table border="1" style="border-collapse:collapse; font-family:sans-serif; font-size:12px;">';
  table += '<thead>';
  table += '<tr><th colspan="11" style="font-size:16px; font-weight:bold; padding:10px; background:#f0f0f0;">Laporan Evaluasi Presensi Dosen (' + labelTanggal.replace(/_/g,' ') + ')</th></tr>';
  table += '<tr style="background:#185fa5; color:#ffffff;">';
  table += '<th style="padding:8px">Nama Dosen</th>';
  table += '<th style="padding:8px">Total MK Aktif</th>';
  table += '<th style="padding:8px">Total Presensi</th>';
  table += '<th style="padding:8px">Kehadiran (Tepat / Tlt / Sgt. Tlt)</th>';
  table += '<th style="padding:8px">Luring (Jumlah & %)</th>';
  table += '<th style="padding:8px">Daring Sinkronus (Jumlah & %)</th>';
  table += '<th style="padding:8px">Daring Asinkronus (Jumlah & %)</th>';
  table += '<th style="padding:8px">UTS / UAS</th>';
  table += '<th style="padding:8px">Pengajuan Ganti Jadwal (Jumlah & %)</th>';
  table += '<th style="padding:8px">Status SP / Peringatan Akademik</th>';
  table += '</tr></thead><tbody>';

  var totalPelanggaran = 0;

  ds.forEach(function(d) {
    var dd = data.filter(function(p){return p.dosenId===d.id;});
    var jd = J.filter(function(j){return j.dosenId===d.id;});
    var dg = gf.filter(function(g){return g.dosenId===d.id && g.statusAcc==='Disetujui';});
    
    var totJadwal = jd.length;
    var totPresensi = dd.length;
    var totGanti = dg.length;
    
    if(totJadwal === 0 && totPresensi === 0 && totGanti === 0) return;

    var hasJadwalInRange = jd.filter(function(j) { return daysInRange.indexOf(j.hari) > -1; }).length > 0;

    var dh=dd.filter(function(p){return p.color==='green';}).length;
    var dk=dd.filter(function(p){return p.color==='yellow';}).length;
    var dm=dd.filter(function(p){return p.color==='red';}).length;
    
    var dml = dd.filter(function(p){return !p.modeKuliah || p.modeKuliah.indexOf('Luring')>-1;}).length;
    var dms = dd.filter(function(p){return p.modeKuliah && p.modeKuliah.indexOf('Sinkronus')>-1 && p.modeKuliah.indexOf('Asinkronus')===-1;}).length;
    var dmaAll2 = dd.filter(function(p){return p.modeKuliah && p.modeKuliah.indexOf('Asinkronus')>-1;});
    var dma = dmaAll2.filter(function(p){return !p.tipePertemuan||p.tipePertemuan==='Reguler';}).length;
    var dmaUjian2 = dmaAll2.filter(function(p){return p.tipePertemuan==='UTS'||p.tipePertemuan==='UAS';}).length;
    var duts2 = dd.filter(function(p){return p.tipePertemuan==='UTS';}).length;
    var duas2 = dd.filter(function(p){return p.tipePertemuan==='UAS';}).length;

    var pLuring = totPresensi ? Math.round((dml/totPresensi)*100) : 0;
    var pSinkron = totPresensi ? Math.round((dms/totPresensi)*100) : 0;
    var pAsinkron = totPresensi ? Math.round((dma/totPresensi)*100) : 0; // hanya reguler
    var pGanti = totPresensi ? Math.round((totGanti/totPresensi)*100) : 0;

    var status = 'Aman';
    var statusStyle = '';
    if (totJadwal > 0 && totPresensi === 0) {
       if (hasJadwalInRange) {
         totalPelanggaran++;
         status = '🚨 PERINGATAN (Ada Jadwal, 0 Presensi)';
         statusStyle = 'color:#a32d2d; font-weight:bold; background:#fcebeb;';
       } else {
         status = 'Aman (Belum menggunakan aplikasi karena kemungkinan tidak ada jam mengajar)';
         statusStyle = 'color:#555; background:#f5f5f5;';
       }
    } else if (pAsinkron >= 50) {
       status = '⚠️ TEGURAN (Asinkronus reguler '+pAsinkron+'%'+(dmaUjian2>0?', tidak termasuk '+dmaUjian2+'x UTS/UAS':'')+')';
       statusStyle = 'color:#854f0b; font-weight:bold; background:#fff4e5;';
    }

    table += '<tr>';
    table += '<td style="padding:5px">' + d.nama + '</td>';
    table += '<td style="padding:5px; text-align:center">' + totJadwal + '</td>';
    table += '<td style="padding:5px; text-align:center; font-weight:bold">' + totPresensi + '</td>';
    table += '<td style="padding:5px; text-align:center">' + dh + ' / ' + dk + ' / ' + dm + '</td>';
    table += '<td style="padding:5px; text-align:center">' + dml + 'x (' + pLuring + '%)</td>';
    table += '<td style="padding:5px; text-align:center">' + dms + 'x (' + pSinkron + '%)</td>';
    table += '<td style="padding:5px; text-align:center">' + dma + 'x (' + pAsinkron + '%)'+(dmaUjian2>0?' +'+dmaUjian2+'x UTS/UAS':'')+'</td>';
    table += '<td style="padding:5px; text-align:center">' + duts2 + 'x UTS / ' + duas2 + 'x UAS</td>';
    table += '<td style="padding:5px; text-align:center">' + totGanti + 'x (' + pGanti + '%)</td>';
    table += '<td style="padding:5px; ' + statusStyle + '">' + status + '</td>';
    table += '</tr>';
  });

  table += '<tr>';
  table += '<td colspan="9" style="text-align:right; font-weight:bold; padding:10px; font-size:14px;">Total Dosen Melanggar (Ada Jadwal Tapi Tidak Presensi):</td>';
  table += '<td style="font-weight:bold; color:#a32d2d; background:#fcebeb; padding:10px; text-align:center; font-size:14px;">' + totalPelanggaran + ' Dosen</td>';
  table += '</tr>';

  table += '</tbody></table></body></html>';

  var blob = new Blob(['\ufeff', table], { type: 'application/vnd.ms-excel;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'Laporan_Presensi_' + labelTanggal + '.xls';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function switchLbTab(tab, btn) {
  document.querySelectorAll('.lb-tab').forEach(function(b){ b.classList.remove('active'); });
  document.querySelectorAll('.lb-panel').forEach(function(p){ p.classList.remove('active'); });
  btn.classList.add('active');
  document.getElementById('lb-'+tab).classList.add('active');
}

var _lastTop10Data = [];
function renderTop10(data) {
  _lastTop10Data = data;
  var AVATAR_COLORS2 = ['#185fa5','#639922','#7c3aed','#c2410c','#0f766e','#b45309','#be123c','#1d4ed8','#065f46','#6d28d9'];
  function ac2(nama) { var c=0;for(var i=0;i<nama.length;i++)c+=nama.charCodeAt(i);return AVATAR_COLORS2[c%AVATAR_COLORS2.length]; }
  function ini2(nama) { var p=nama.trim().split(' ').filter(Boolean);return p.length===1?p[0].substring(0,2).toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase(); }

  var medals = ['🥇','🥈','🥉'];

  // TOP 10 HADIR TEPAT
  var hadirList = D.map(function(d) {
    var dd = data.filter(function(p){ return p.dosenId===d.id; });
    if(dd.length < 2) return null; // min 2 sesi agar bermakna
    var dh = dd.filter(function(p){ return p.color==='green'; }).length;
    var pct = Math.round((dh/dd.length)*100);
    return { nama: d.nama, pct: pct, total: dd.length, tepat: dh };
  }).filter(Boolean).sort(function(a,b){ return b.pct-a.pct || b.tepat-a.tepat; }).slice(0,10);

  // TOP 10 SELESAI TEPAT
  var selesaiList = D.map(function(d) {
    var dd = data.filter(function(p){ return p.dosenId===d.id && p.waktuSelesai && p.waktuSelesai!==''; });
    if(dd.length < 2) return null;
    var dsh = dd.filter(function(p){ return p.colorSelesai==='blue'; }).length;
    var pct = Math.round((dsh/dd.length)*100);
    return { nama: d.nama, pct: pct, total: dd.length, tepat: dsh };
  }).filter(Boolean).sort(function(a,b){ return b.pct-a.pct || b.tepat-a.tepat; }).slice(0,10);

  function renderList(list, unit) {
    if(list.length === 0) return '<p class="empty">Belum cukup data untuk ditampilkan (min. 2 sesi per dosen).</p>';
    return list.map(function(item, i) {
      var color = i===0?'#f59e0b':i===1?'#9ca3af':i===2?'#cd7c41':ac2(item.nama);
      var rank = i < 3 ? '<span class="lb-rank">'+medals[i]+'</span>' : '<span class="lb-rank-num">#'+(i+1)+'</span>';
      var barColor = item.pct>=80?'#639922':item.pct>=60?'#BA7517':'#E24B4A';
      return '<div class="lb-row">'
        + rank
        + '<div class="lb-avatar" style="background:'+color+'">'+ini2(item.nama)+'</div>'
        + '<div class="lb-info"><div class="lb-name">'+item.nama+'</div><div class="lb-sub">'+item.tepat+'x tepat dari '+item.total+'x '+unit+'</div></div>'
        + '<div class="lb-bar-wrap"><div class="lb-bar" style="width:'+item.pct+'%;background:'+barColor+'"></div></div>'
        + '<div class="lb-pct" style="color:'+barColor+'">'+item.pct+'%</div>'
        + '</div>';
    }).join('');
  }

  document.getElementById('lb-hadir').innerHTML = renderList(hadirList, 'hadir');
  document.getElementById('lb-selesai').innerHTML = renderList(selesaiList, 'selesai');
}

function donut(id,sl,tot){
  var c=document.getElementById(id);if(!c)return;
  var ctx=c.getContext('2d'),sz=110;ctx.clearRect(0,0,sz,sz);
  var t=sl.reduce(function(s,x){return s+x.v;},0);
  if(!t){ctx.beginPath();ctx.arc(sz/2,sz/2,42,0,Math.PI*2);ctx.strokeStyle='#e5e5e3';ctx.lineWidth=14;ctx.stroke();return;}
  var s=-Math.PI/2;
  sl.forEach(function(x){if(!x.v)return;var a=x.v/t*Math.PI*2;ctx.beginPath();ctx.moveTo(sz/2,sz/2);ctx.arc(sz/2,sz/2,42,s,s+a);ctx.closePath();ctx.fillStyle=x.c;ctx.fill();s+=a;});
  ctx.beginPath();ctx.arc(sz/2,sz/2,28,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
  ctx.fillStyle='#1a1a1a';ctx.font='500 12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(tot+'x',sz/2,sz/2);
}

// =====================================================
// FITUR: JADWAL MAJU