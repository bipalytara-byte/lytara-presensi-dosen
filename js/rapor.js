/* rapor.js — Rapor evaluasi presensi per dosen
   Fungsi: getSemesterOptions, filterBySemester, buildSemesterSelect,
           renderRapor, fillRaporElements, buildRaporHTML, calcGrade,
           buildModeHTML, buildSelesaiHTML, buildTrenHTML, buildMkHTML,
           buildPengajuanHTML, buildPesanHTML,
           renderAdminRapor, fillAdminRaporDropdown,
           exportRaporPDF, exportAdminRaporPDF, _openRaporPrintWindow
*/


// [V10] cekNotifMaju() dihapus dari sini — definisi tunggal ada di notif.js.

// =====================================================
// RAPOR — Semester helper
// =====================================================
function getSemesterOptions(presensiBulan) {
  // Bangun daftar semester dari data bulan presensi (Ganjil: Agu-Jan, Genap: Feb-Jul)
  var semSet = {};
  var now = new Date();
  var thisYear = now.getFullYear();
  // Tambah 4 semester terakhir sebagai pilihan
  for(var y = thisYear - 1; y <= thisYear + 1; y++) {
    semSet['Ganjil '+y+'/'+(y+1)] = {label:'Semester Ganjil '+y+'/'+(y+1), startM:8, startY:y, endM:1, endY:y+1};
    semSet['Genap '+y+'/'+(y+1)] = {label:'Semester Genap '+y+'/'+(y+1), startM:2, startY:y, endM:7, endY:y};
  }
  return Object.values(semSet);
}

function filterBySemester(dataArr, semVal, tglField) {
  if(!semVal || semVal==='all') return dataArr;
  // semVal format: "Ganjil 2025/2026" or "Genap 2025/2026"
  var parts = semVal.split(' ');
  var jenis = parts[0]; // Ganjil / Genap
  var tahun = parts[1] ? parts[1].split('/') : [];
  var y1 = parseInt(tahun[0])||0, y2 = parseInt(tahun[1])||0;
  return dataArr.filter(function(item){
    var tgl = item[tglField]||item.tanggal||item.tgl||item.ganti||'';
    var d = parseTanggal(tgl) ? new Date(parseTanggal(tgl)) : null;
    if(!d) return false;
    var m = d.getMonth()+1, y = d.getFullYear();
    if(jenis==='Ganjil') return (y===y1 && m>=8) || (y===y2 && m<=1);
    if(jenis==='Genap') return y===y2 && m>=2 && m<=7;
    return true;
  });
}

function buildSemesterSelect(selId, currentVal) {
  var sel = document.getElementById(selId);
  if(!sel) return;
  var opts = getSemesterOptions();
  var cur = sel.value || currentVal || 'all';
  sel.innerHTML = '<option value="all">Semua Periode</option>';
  opts.reverse().forEach(function(s){
    var o = document.createElement('option');
    var key = s.label.replace('Semester ','');
    o.value = key; o.textContent = s.label;
    if(key === cur) o.selected = true;
    sel.appendChild(o);
  });
}

// =====================================================
// RAPOR SAYA — Evaluasi Mandiri Dosen
// =====================================================
function renderRapor(dosenOverride) {
  var targetDosen = dosenOverride || currentUser;
  if(!targetDosen) return;

  var isAdminView = !!dosenOverride;
  var semSelId = isAdminView ? 'admin-rapor-semester' : 'rapor-filter-semester';
  var semVal = (document.getElementById(semSelId)||{}).value || 'all';

  // Isi dropdown semester pertama kali
  if(!isAdminView) buildSemesterSelect('rapor-filter-semester', semVal);

  var myP = filterBySemester(P.filter(function(p){ return p.dosenId===targetDosen.id; }), semVal, 'tanggal');
  var myG = filterBySemester(G.filter(function(g){ return g.dosenId===targetDosen.id; }), semVal, 'ganti');
  var myM = filterBySemester(M.filter(function(m){ return m.dosenId===targetDosen.id; }), semVal, 'tglRaw');

  // Label semester
  var semLabel = semVal==='all' ? 'Semua Periode' : semVal;

  // Prefix IDs untuk admin view (pakai elemen berbeda agar tidak konflik)
  var pre = isAdminView ? 'ar-' : 'rapor-';
  var container = isAdminView ? document.getElementById('admin-rapor-konten') : null;

  // Build HTML rapor
  var rHtml = buildRaporHTML(targetDosen, myP, myG, myM, semLabel, pre, isAdminView);

  if(isAdminView) {
    container.innerHTML = rHtml;
  } else {
    // Isi elemen-elemen individual
    fillRaporElements(targetDosen, myP, myG, myM, semLabel);
  }
}

function fillRaporElements(targetDosen, myP, myG, myM, semLabel) {
  var parts = targetDosen.nama.split(' ').filter(Boolean);
  var init = parts.length===1 ? parts[0].substring(0,2).toUpperCase() : (parts[0][0]+(parts[parts.length-1][0])).toUpperCase();
  document.getElementById('rapor-avatar').textContent = init;
  document.getElementById('rapor-nama').textContent = targetDosen.nama;
  document.getElementById('rapor-semester-label').textContent = semLabel==='Semua Periode' ? '' : '📅 '+semLabel;

  var total = myP.length;
  var tepat  = myP.filter(function(p){ return p.color==='green'; }).length;
  var lambat = myP.filter(function(p){ return p.color==='yellow'; }).length;
  var sangat = myP.filter(function(p){ return p.color==='red'; }).length;
  var pctTepat = total > 0 ? Math.round((tepat/total)*100) : 0;

  if(myP.length > 0) {
    var dates = myP.map(function(p){ return parseTanggal(p.tanggal); }).filter(Boolean).sort(function(a,b){return a-b;});
    var tFirst = new Date(dates[0]).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
    var tLast  = new Date(dates[dates.length-1]).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
    document.getElementById('rapor-periode').textContent = 'Periode: '+tFirst+' — '+tLast;
  } else {
    document.getElementById('rapor-periode').textContent = 'Belum ada data presensi pada periode ini';
  }

  document.getElementById('rapor-total').textContent = total+'x';
  document.getElementById('rapor-tepat').textContent = tepat+'x';
  document.getElementById('rapor-terlambat').textContent = lambat+'x';
  document.getElementById('rapor-sangat').textContent = sangat+'x';

  var gradeData = calcGrade(pctTepat, total, lambat, sangat, myP);
  document.getElementById('rapor-grade-huruf').textContent = gradeData.grade;
  document.getElementById('rapor-grade-huruf').style.color = gradeData.barColor;
  document.getElementById('rapor-grade-label').textContent = gradeData.label;
  document.getElementById('rapor-grade-bar').style.width = pctTepat+'%';
  document.getElementById('rapor-grade-bar').style.background = gradeData.barColor;
  document.getElementById('rapor-grade-pct').textContent = pctTepat+'% tepat waktu ('+tepat+' dari '+total+' sesi)';

  var pesanBg = pctTepat>=80?'#eaf3de':pctTepat>=65?'#faeeda':'#fcebeb';
  var pesanBorder = pctTepat>=80?'#97c459':pctTepat>=65?'#fac775':'#f09595';
  var pesanTx = pctTepat>=80?'#27500a':pctTepat>=65?'#633806':'#791f1f';
  document.getElementById('rapor-pesan').innerHTML = buildPesanHTML(gradeData, pctTepat, lambat, sangat, myP, pesanBg, pesanBorder, pesanTx);
  document.getElementById('rapor-mode').innerHTML = buildModeHTML(myP, total);
  document.getElementById('rapor-selesai').innerHTML = buildSelesaiHTML(myP, total);
  document.getElementById('rapor-tren').innerHTML = buildTrenHTML(myP);
  document.getElementById('rapor-mk').innerHTML = buildMkHTML(myP);
  document.getElementById('rapor-pengajuan').innerHTML = buildPengajuanHTML(myG, myM);
}

function buildRaporHTML(targetDosen, myP, myG, myM, semLabel, pre, isAdminView) {
  var parts = targetDosen.nama.split(' ').filter(Boolean);
  var init = parts.length===1 ? parts[0].substring(0,2).toUpperCase() : (parts[0][0]+(parts[parts.length-1][0])).toUpperCase();
  var AVATAR_COLORS=['#185fa5','#639922','#7c3aed','#c2410c','#0f766e','#b45309','#be123c'];
  var ac = AVATAR_COLORS[init.charCodeAt(0)%AVATAR_COLORS.length];

  var total = myP.length;
  var tepat  = myP.filter(function(p){ return p.color==='green'; }).length;
  var lambat = myP.filter(function(p){ return p.color==='yellow'; }).length;
  var sangat = myP.filter(function(p){ return p.color==='red'; }).length;
  var pctTepat = total > 0 ? Math.round((tepat/total)*100) : 0;
  var gradeData = calcGrade(pctTepat, total, lambat, sangat, myP);

  var periodeStr = '';
  if(myP.length > 0) {
    var dates = myP.map(function(p){ return parseTanggal(p.tanggal); }).filter(Boolean).sort(function(a,b){return a-b;});
    periodeStr = new Date(dates[0]).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})+' — '+new Date(dates[dates.length-1]).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  }

  var pesanBg = pctTepat>=80?'#eaf3de':pctTepat>=65?'#faeeda':'#fcebeb';
  var pesanBorder = pctTepat>=80?'#97c459':pctTepat>=65?'#fac775':'#f09595';
  var pesanTx = pctTepat>=80?'#27500a':pctTepat>=65?'#633806':'#791f1f';

  return ''
    // Header
    +'<div style="background:linear-gradient(135deg,#1a1a1a,#2d2d2d);border-radius:12px;padding:16px;color:#fff;margin-bottom:12px">'
      +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">'
        +'<div style="width:44px;height:44px;border-radius:50%;background:'+ac+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;flex-shrink:0">'+init+'</div>'
        +'<div><div style="font-size:15px;font-weight:700">'+targetDosen.nama+'</div>'
        +'<div style="font-size:10px;color:#aaa">LYTARA v4.5 · Evaluasi Presensi'+( semLabel!=='Semua Periode'?' · '+semLabel:'' )+'</div>'
        +(periodeStr?'<div style="font-size:10px;color:#888">'+periodeStr+'</div>':'')+
        '</div></div>'
      +'<div style="display:flex;align-items:center;gap:14px">'
        +'<div style="text-align:center"><div style="font-size:40px;font-weight:900;color:'+gradeData.barColor+'">'+gradeData.grade+'</div><div style="font-size:9px;color:#aaa">GRADE</div></div>'
        +'<div style="flex:1"><div style="font-size:13px;font-weight:600;margin-bottom:5px;color:#fff">'+gradeData.label+'</div>'
        +'<div style="background:rgba(255,255,255,.15);border-radius:20px;height:8px;overflow:hidden"><div style="width:'+pctTepat+'%;height:8px;border-radius:20px;background:'+gradeData.barColor+'"></div></div>'
        +'<div style="font-size:11px;color:#aaa;margin-top:3px">'+pctTepat+'% tepat waktu · '+tepat+'/'+total+' sesi</div></div>'
      +'</div>'
    +'</div>'
    // Stat boxes
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px">'
      +[['Total',total+'x','#1a1a1a','#fff'],['Tepat',tepat+'x','#27500a','#eaf3de'],['Terlambat',lambat+'x','#633806','#faeeda'],['Sgt Terlambat',sangat+'x','#a32d2d','#fcebeb']].map(function(x){
        return '<div style="background:'+x[3]+';border-radius:10px;padding:10px;text-align:center"><div style="font-size:18px;font-weight:700;color:'+x[2]+'">'+x[1]+'</div><div style="font-size:9px;color:'+x[2]+';opacity:.7;margin-top:2px">'+x[0]+'</div></div>';
      }).join('')
    +'</div>'
    // Pesan
    +'<div style="background:'+pesanBg+';border-left:4px solid '+pesanBorder+';border-radius:0 10px 10px 0;padding:10px 12px;margin-bottom:10px">'
      +'<div style="font-size:13px;font-weight:700;color:'+pesanTx+'">'+gradeData.pesanUtama+'</div>'
      +'<div style="font-size:11px;color:'+pesanTx+';opacity:.85;margin-top:3px">'+gradeData.pesanSub+'</div>'
    +'</div>'
    // Mode + Tren
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">'
      +'<div style="background:#fff;border:1px solid #e5e5e3;border-radius:10px;padding:12px"><div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;margin-bottom:8px">Mode Kuliah</div>'+buildModeHTML(myP,total)+'</div>'
      +'<div style="background:#fff;border:1px solid #e5e5e3;border-radius:10px;padding:12px"><div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;margin-bottom:8px">Tren Bulanan</div><div style="display:flex;align-items:flex-end;gap:3px;height:60px">'+buildTrenHTML(myP)+'</div></div>'
    +'</div>'
    // Per MK
    +'<div style="background:#fff;border:1px solid #e5e5e3;border-radius:10px;padding:12px;margin-bottom:10px">'
      +'<div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;margin-bottom:8px">📚 Per Mata Kuliah</div>'
      +buildMkHTML(myP)
    +'</div>'
    // Pengajuan
    +'<div style="background:#fff;border:1px solid #e5e5e3;border-radius:10px;padding:12px;margin-bottom:8px">'
      +'<div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;margin-bottom:8px">📋 Pengajuan Jadwal</div>'
      +buildPengajuanHTML(myG, myM)
    +'</div>'
    +'<div style="font-size:10px;color:#aaa;text-align:center;padding:6px">LYTARA v4.5 · Skuro Production · Dicetak: '+new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})+'</div>';
}

function calcGrade(pctTepat, total, lambat, sangat, myP) {
  var grade, label, barColor, pesanUtama, pesanSub;
  if(total===0){ return {grade:'—',label:'Belum ada data',barColor:'#ccc',pesanUtama:'Belum ada rekam presensi.',pesanSub:'Mulai rekam presensi agar rapor dapat ditampilkan.'}; }
  if(pctTepat>=90){ grade='A';label='Sangat Disiplin';barColor='#639922';pesanUtama='🏆 Luar biasa! Tingkat kedisiplinan Anda sangat tinggi.';pesanSub='Pertahankan konsistensi ini. Anda menjadi teladan bagi rekan dosen lainnya.'; }
  else if(pctTepat>=80){ grade='B';label='Disiplin';barColor='#3b82f6';pesanUtama='👍 Bagus! Kehadiran Anda cukup baik dan konsisten.';pesanSub='Masih ada ruang untuk mencapai grade A. Perhatikan jadwal agar lebih tepat waktu.'; }
  else if(pctTepat>=65){ grade='C';label='Cukup';barColor='#BA7517';pesanUtama='⚠️ Perlu ditingkatkan. Cukup banyak sesi yang tidak tepat waktu.';pesanSub='Perhatikan jadwal mengajar Anda. Keterlambatan berulang akan tercatat dalam evaluasi WK I.'; }
  else if(pctTepat>=50){ grade='D';label='Kurang Disiplin';barColor='#f59e0b';pesanUtama='🚨 Perhatian! Tingkat ketepatan waktu Anda di bawah standar.';pesanSub='Mohon segera perbaiki kebiasaan kehadiran. Data ini akan menjadi bahan evaluasi di HRD.'; }
  else { grade='E';label='Sangat Kurang';barColor='#E24B4A';pesanUtama='🚨 Kritis! Mayoritas sesi mengajar tidak tepat waktu.';pesanSub='Segera lakukan perbaikan dan konsultasikan dengan Bidang Akademik / WK I sebelum evaluasi akhir.'; }
  return {grade:grade,label:label,barColor:barColor,pesanUtama:pesanUtama,pesanSub:pesanSub};
}

function buildModeHTML(myP, total) {
  if(!total) return '<p class="empty" style="font-size:12px">Belum ada data.</p>';
  var ml=myP.filter(function(p){return !p.modeKuliah||p.modeKuliah.indexOf('Luring')>-1;}).length;
  var ms=myP.filter(function(p){return p.modeKuliah&&p.modeKuliah.indexOf('Sinkronus')>-1&&p.modeKuliah.indexOf('Asinkronus')===-1;}).length;
  var ma=myP.filter(function(p){return p.modeKuliah&&p.modeKuliah.indexOf('Asinkronus')>-1;}).length;
  return [['🏫','Luring',ml,'#639922'],['💻','Sinkronus',ms,'#185fa5'],['📝','Asinkronus',ma,'#BA7517']].map(function(x){
    var pct=total?Math.round(x[2]/total*100):0;
    return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><span>'+x[0]+'</span><div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px"><span style="color:#555">'+x[1]+'</span><span style="font-weight:700;color:'+x[3]+'">'+x[2]+'x ('+pct+'%)</span></div><div style="background:#f0f0ee;border-radius:10px;height:5px"><div style="width:'+pct+'%;height:5px;border-radius:10px;background:'+x[3]+'"></div></div></div></div>';
  }).join('') + (myP.filter(function(p){return p.modeKuliah&&p.modeKuliah.indexOf('Asinkronus')>-1;}).length/total>=.5?'<div style="padding:5px 8px;background:#faeeda;border-radius:7px;font-size:10px;color:#633806;font-weight:600">⚠️ Asinkronus ≥50% — perlu perhatian</div>':'');
}

function buildSelesaiHTML(myP, total) {
  if(!total) return '<p class="empty" style="font-size:12px">Belum ada data.</p>';
  var sd=myP.filter(function(p){return p.waktuSelesai&&p.waktuSelesai!=='';});
  var sh=sd.filter(function(p){return p.colorSelesai==='blue';}).length;
  var sm=sd.filter(function(p){return p.colorSelesai==='red';}).length;
  var sn=total-sd.length;
  return [['✅','Tepat selesai',sh,'#185fa5'],['⚠️','Pulang awal',sm,'#E24B4A'],['⏳','Belum direkam',sn,'#aaa']].map(function(x){
    var pct=total?Math.round(x[2]/total*100):0;
    return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><span>'+x[0]+'</span><div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px"><span style="color:#555">'+x[1]+'</span><span style="font-weight:700;color:'+x[3]+'">'+x[2]+'x</span></div><div style="background:#f0f0ee;border-radius:10px;height:5px"><div style="width:'+pct+'%;height:5px;border-radius:10px;background:'+x[3]+'"></div></div></div></div>';
  }).join('');
}

function buildTrenHTML(myP) {
  var BULAN=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  var trenData=BULAN.map(function(_,i){
    var bln=myP.filter(function(p){return Number(p.bulan)===(i+1);});
    if(!bln.length) return {lbl:BULAN[i],pct:null,n:0};
    return {lbl:BULAN[i],pct:Math.round(bln.filter(function(p){return p.color==='green';}).length/bln.length*100),n:bln.length};
  });
  if(!trenData.some(function(t){return t.n>0;})) return '<p class="empty" style="font-size:11px;line-height:60px">Belum cukup data.</p>';
  return trenData.map(function(t){
    if(!t.n) return '<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:1px"><div style="flex:1;background:#f0f0ee;border-radius:3px 3px 0 0;width:100%"></div><div style="font-size:8px;color:#ccc">'+t.lbl+'</div></div>';
    var bH=Math.max(6,Math.round(t.pct*.55));
    var bc=t.pct>=80?'#639922':t.pct>=60?'#BA7517':'#E24B4A';
    return '<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:1px" title="'+t.lbl+': '+t.pct+'% ('+t.n+'x)"><div style="font-size:8px;font-weight:700;color:'+bc+'">'+t.pct+'</div><div style="height:'+bH+'px;background:'+bc+';border-radius:3px 3px 0 0;width:100%"></div><div style="font-size:8px;color:#888">'+t.lbl+'</div></div>';
  }).join('');
}

function buildMkHTML(myP) {
  var mkList={};
  myP.forEach(function(p){
    if(!mkList[p.mk]) mkList[p.mk]={mk:p.mk,total:0,tepat:0,lambat:0,sangat:0};
    mkList[p.mk].total++; if(p.color==='green') mkList[p.mk].tepat++; else if(p.color==='yellow') mkList[p.mk].lambat++; else mkList[p.mk].sangat++;
  });
  var arr=Object.values(mkList).sort(function(a,b){return b.total-a.total;});
  if(!arr.length) return '<p class="empty" style="font-size:12px">Belum ada data.</p>';
  return arr.map(function(mk){
    var pct=Math.round(mk.tepat/mk.total*100);
    var bc=pct>=80?'#639922':pct>=60?'#BA7517':'#E24B4A';
    return '<div style="padding:8px 0;border-bottom:1px solid #f0f0ee"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:12px;font-weight:600;color:#1a1a1a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:80%">'+mk.mk+'</span><span style="font-size:12px;font-weight:800;color:'+bc+';margin-left:6px">'+pct+'%</span></div><div style="display:flex;height:6px;border-radius:10px;overflow:hidden;background:#f0f0ee"><div style="flex:'+mk.tepat+';background:#639922"></div><div style="flex:'+mk.lambat+';background:#BA7517"></div><div style="flex:'+mk.sangat+';background:#E24B4A"></div></div><div style="font-size:10px;color:#aaa;margin-top:3px">'+mk.total+'x sesi · ✓'+mk.tepat+' ⚠'+mk.lambat+' ✗'+mk.sangat+'</div></div>';
  }).join('');
}

function buildPengajuanHTML(myG, myM) {
  var all=[];
  myG.forEach(function(g){all.push({type:'Pengganti',mk:g.mk,status:g.statusAcc,info:g.asli+' → '+g.ganti+' · '+g.jam});});
  myM.forEach(function(m){all.push({type:'Maju',mk:m.mk,status:m.statusAcc,info:m.tgl+' · '+m.jam});});
  if(!all.length) return '<p class="empty" style="font-size:12px">Belum ada pengajuan.</p>';
  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'+all.map(function(ap){
    var isG=ap.type==='Pengganti';
    var tBg=isG?'#e6f1fb':'#fef3c7'; var tTx=isG?'#185fa5':'#92400e';
    var sBg=ap.status==='Disetujui'?'#eaf3de':ap.status==='Ditolak'?'#fcebeb':'#f5f5f3';
    var sTx=ap.status==='Disetujui'?'#27500a':ap.status==='Ditolak'?'#a32d2d':'#888';
    var sIcon=ap.status==='Disetujui'?'✅':ap.status==='Ditolak'?'❌':'⏳';
    return '<div style="background:#f8f8f7;border-radius:8px;padding:8px;min-width:0"><div style="display:flex;gap:4px;margin-bottom:4px;flex-wrap:wrap"><span style="font-size:10px;font-weight:600;padding:1px 6px;border-radius:20px;background:'+tBg+';color:'+tTx+'">'+(isG?'🔄':'⏩')+' '+ap.type+'</span><span style="font-size:10px;font-weight:600;padding:1px 6px;border-radius:20px;background:'+sBg+';color:'+sTx+'">'+sIcon+' '+ap.status+'</span></div><div style="font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+ap.mk+'</div><div style="font-size:10px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+ap.info+'</div></div>';
  }).join('')+'</div>';
}

function buildPesanHTML(gradeData, pctTepat, lambat, sangat, myP, pesanBg, pesanBorder, pesanTx) {
  return '<div style="background:'+pesanBg+';border-left:4px solid '+pesanBorder+';border-radius:0 10px 10px 0;padding:12px 14px">'
    +'<div style="font-size:14px;font-weight:700;color:'+pesanTx+';margin-bottom:4px">'+gradeData.pesanUtama+'</div>'
    +'<div style="font-size:12px;color:'+pesanTx+';line-height:1.6;opacity:.85">'+gradeData.pesanSub+'</div>'
    +(myP.length>0&&lambat+sangat>0?'<div style="margin-top:8px;font-size:11px;color:'+pesanTx+';opacity:.75">📌 Rata-rata keterlambatan: <b>'+Math.round(myP.filter(function(p){return p.color==='yellow'||p.color==='red';}).reduce(function(s,p){return s+(Number(p.diff)||0);},0)/(lambat+sangat||1))+' menit</b> dari '+(lambat+sangat)+'x sesi terlambat.</div>':'')
    +'</div>';
}

// ADMIN: render rapor untuk dosen yang dipilih di dropdown
function renderAdminRapor() {
  var dosenId = (document.getElementById('admin-rapor-dosen')||{}).value;
  var semVal  = (document.getElementById('admin-rapor-semester')||{}).value || 'all';

  // Isi dropdown semester jika belum
  buildSemesterSelect('admin-rapor-semester', semVal);

  var container = document.getElementById('admin-rapor-konten');
  if(!container) return;
  if(!dosenId) {
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:#aaa;font-size:13px">Pilih dosen untuk melihat rapor presensinya.</div>';
    return;
  }
  var dosen = D.find(function(d){ return d.id===dosenId; });
  if(!dosen) return;
  renderRapor(dosen);
}

// Isi dropdown dosen di admin rapor
function fillAdminRaporDropdown() {
  var sel = document.getElementById('admin-rapor-dosen');
  if(!sel || sel.options.length > 1) return;
  D.forEach(function(d){
    var o = document.createElement('option');
    o.value = d.id; o.textContent = d.nama;
    sel.appendChild(o);
  });
  buildSemesterSelect('admin-rapor-semester', 'all');
}

// PDF EXPORT — dosen
function exportRaporPDF() {
  var dosen = currentUser;
  if(!dosen) return;
  var semVal = (document.getElementById('rapor-filter-semester')||{}).value || 'all';
  var myP = filterBySemester(P.filter(function(p){return p.dosenId===dosen.id;}),semVal,'tanggal');
  var myG = filterBySemester(G.filter(function(g){return g.dosenId===dosen.id;}),semVal,'ganti');
  var myM = filterBySemester(M.filter(function(m){return m.dosenId===dosen.id;}),semVal,'tglRaw');
  var semLabel = semVal==='all'?'Semua Periode':semVal;
  _openRaporPrintWindow(dosen, myP, myG, myM, semLabel);
}

// PDF EXPORT — admin
function exportAdminRaporPDF() {
  var dosenId = (document.getElementById('admin-rapor-dosen')||{}).value;
  if(!dosenId){alert('Pilih dosen terlebih dahulu.');return;}
  var dosen = D.find(function(d){return d.id===dosenId;});
  if(!dosen) return;
  var semVal = (document.getElementById('admin-rapor-semester')||{}).value||'all';
  var myP = filterBySemester(P.filter(function(p){return p.dosenId===dosen.id;}),semVal,'tanggal');
  var myG = filterBySemester(G.filter(function(g){return g.dosenId===dosen.id;}),semVal,'ganti');
  var myM = filterBySemester(M.filter(function(m){return m.dosenId===dosen.id;}),semVal,'tglRaw');
  var semLabel = semVal==='all'?'Semua Periode':semVal;
  _openRaporPrintWindow(dosen, myP, myG, myM, semLabel);
}

function _openRaporPrintWindow(dosen, myP, myG, myM, semLabel) {
  var html = buildRaporHTML(dosen, myP, myG, myM, semLabel, 'pr-', false);
  var w = window.open('', '_blank', 'width=800,height=900');
  w.document.write('<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Rapor '+dosen.nama+'</title>'
    +'<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;color:#1a1a1a;background:#fff;padding:24px}@page{size:A4;margin:20mm}.card{border:1px solid #e5e5e3;border-radius:12px;padding:16px;margin-bottom:12px}.empty{color:#aaa;font-size:12px}.sec{font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:8px}</style>'
    +'</head><body><div style="max-width:720px;margin:0 auto">'+html+'</div>'
    +'<script>window.onload=function(){window.print();}<\/script></body></html>');
  w.document.close();
}
