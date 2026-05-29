/* beranda.js — Halaman beranda dosen (home screen mobile)
   Fungsi: fillBerandaDosen, fillAll, pg (navigasi halaman), cm (tutup modal)
*/


function fillBerandaAdmin() {
  if (!isAdmin) return;

  // Tanggal
  var tglEl = document.getElementById('admin-beranda-tgl');
  if (tglEl) {
    var n = new Date();
    var HARI_ID = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    var BLN_ID  = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    tglEl.textContent = HARI_ID[n.getDay()] + ', ' + n.getDate() + ' ' + BLN_ID[n.getMonth()] + ' ' + n.getFullYear();
  }

  // Badge status sistem
  var badgeEl = document.getElementById('admin-sistem-badge');
  if (badgeEl) {
    badgeEl.innerHTML = SISTEM_AKTIF
      ? '<span style="background:#eaf3de;color:#27500a;font-size:12px;padding:4px 12px;border-radius:20px;font-weight:500">🟢 Sistem Aktif</span>'
      : '<span style="background:#fcebeb;color:#a32d2d;font-size:12px;padding:4px 12px;border-radius:20px;font-weight:500">🔴 Sistem Nonaktif</span>';
  }

  // Statistik
  var hariIni = todayHari();
  var todayTs = new Date(); todayTs.setHours(0,0,0,0);

  var jadwalHariIni = J.filter(function(j){
    if (j.hari !== hariIni) return false;
    if (j.tipe === 'paralel' && j.statusParalel !== 'aktif') return false;
    if (j.tipe === 'paralel') {
      var counter = P.filter(function(p){ return p.jadwalId === j.id; }).length;
      if (counter >= (j.maxPertemuan || 8)) return false;
    }
    return true;
  });
  var dosenPunyaJadwal = {};
  jadwalHariIni.forEach(function(j){ dosenPunyaJadwal[j.dosenId] = true; });

  var presensiHariIni = P.filter(function(p){
    var ts = new Date(p.tanggal.split('/').reverse().join('-'));
    return ts >= todayTs && ts < new Date(todayTs.getTime() + 86400000);
  });
  var dosenSudahPresensi = {};
  presensiHariIni.forEach(function(p){ dosenSudahPresensi[p.dosenId] = true; });

  var totalDosen   = D.length;
  var jumlahHadir  = Object.keys(dosenSudahPresensi).filter(function(id){ return dosenPunyaJadwal[id]; }).length;
  var jumlahBelum  = Object.keys(dosenPunyaJadwal).filter(function(id){ return !dosenSudahPresensi[id]; }).length;
  var jumlahPending= G.filter(function(g){ return g.statusAcc === 'Menunggu'; }).length
                   + M.filter(function(m){ return m.statusAcc === 'Menunggu'; }).length;

  var el = function(id){ return document.getElementById(id); };
  if(el('abs-dosen'))   el('abs-dosen').textContent   = totalDosen;
  if(el('abs-hadir'))   el('abs-hadir').textContent   = jumlahHadir;
  if(el('abs-belum'))   el('abs-belum').textContent   = jumlahBelum;
  if(el('abs-pending')) el('abs-pending').textContent = jumlahPending;

  // Alert pending
  var alertEl = document.getElementById('admin-alert-pending');
  var alertTxt = document.getElementById('admin-alert-pending-txt');
  if (alertEl && jumlahPending > 0) {
    alertTxt.textContent = 'Ada ' + jumlahPending + ' pengajuan jadwal yang menunggu persetujuan Anda.';
    alertEl.style.display = 'flex';
  } else if (alertEl) {
    alertEl.style.display = 'none';
  }

  // Daftar pending
  var pending = G.filter(function(g){ return g.statusAcc === 'Menunggu'; })
    .concat(M.filter(function(m){ return m.statusAcc === 'Menunggu'; }));
  var listWrap = document.getElementById('admin-beranda-pending-list');
  var listCard = document.getElementById('admin-beranda-pending-card');
  if (!listWrap || !listCard) return;

  if (pending.length === 0) {
    listWrap.style.display = 'none';
  } else {
    listWrap.style.display = 'block';
    listCard.innerHTML = pending.slice(0, 5).map(function(item) {
      var isMaju = !!item.tgl;
      var tipe = isMaju ? '⏩ Jadwal Maju' : '🔄 Jadwal Pengganti';
      var info = isMaju
        ? item.tgl + ' · ' + item.jam
        : item.asli + ' → ' + item.ganti;
      var targetPage = isMaju ? 'maju' : 'ganti';
      var targetTab  = isMaju ? 'tab-maju' : 'tab-ganti';
      return '<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:9px 0;border-bottom:0.5px solid #f0f0ee;gap:10px">'
        + '<div style="flex:1;min-width:0">'
          + '<div style="font-size:13px;font-weight:500;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + item.dosen.split(',')[0] + ' — ' + item.mk + '</div>'
          + '<div style="font-size:11px;color:#888;margin-top:2px">' + tipe + ' · ' + info + '</div>'
        + '</div>'
        + '<button onclick="pg(\'' + targetPage + '\', document.getElementById(\'' + targetTab + '\'))" style="padding:3px 10px;border-radius:6px;border:1px solid #ddd;background:#fff;font-size:11px;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0">Tinjau →</button>'
        + '</div>';
    }).join('')
    + (pending.length > 5 ? '<div style="font-size:11px;color:#888;padding:8px 0;text-align:center">+ ' + (pending.length-5) + ' pengajuan lainnya</div>' : '');
  }
}

// Shortcut ke tab Pengaturan di halaman Laporan
function pgAdminPengaturan() {
  pg('report', document.getElementById('tab-report'));
  setTimeout(function(){
    var btn = document.querySelector('.dash-tab[onclick*="pengaturan"]');
    if (btn) switchDashTab('pengaturan', btn);
  }, 100);
}

function fillBerandaDosen() {
  if (!currentUser) return;

  // ── Banner sistem nonaktif (libur khusus admin) ──
  var bannerLiburEl = document.getElementById('beranda-banner-libur-sistem');
  if (bannerLiburEl) {
    if (!SISTEM_AKTIF) {
      // Cek apakah dosen punya jadwal hari ini yang belum diganti
      var hariIniCek = todayHari();
      var jadwalTerdampak = J.filter(function(j) {
        return j.dosenId === currentUser.id && j.hari === hariIniCek;
      });
      var todayYmd = (function(){
        var d=new Date();
        return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      })();
      var sudahGanti = G.filter(function(g) {
        return g.dosenId === currentUser.id && g.asli === todayYmd;
      });
      var belumGanti = jadwalTerdampak.filter(function(j) {
        return !sudahGanti.some(function(g){ return g.mk === j.mk; });
      });

      var reminderHtml = '';
      if (belumGanti.length > 0) {
        reminderHtml =
          '<div style="margin-top:10px;padding:10px 12px;background:rgba(255,255,255,.6);border-radius:8px;border:1px solid #f9c84a">'
          + '<div style="font-size:12px;font-weight:700;color:#7a4f00;margin-bottom:6px">📋 Jadwal hari ini yang perlu diganti:</div>'
          + belumGanti.map(function(j){
              return '<div style="font-size:12px;color:#7a4f00;padding:2px 0">• ' + j.mk + (j.kelas?' · '+j.kelas:'') + ' · ' + (j.jamMulai||'?') + '–' + (j.jamSelesai||'?') + '</div>';
            }).join('')
          + '<button onclick="pg(\'ganti\', document.getElementById(\'tab-ganti\'))" '
          + 'style="margin-top:8px;padding:6px 14px;border-radius:8px;border:none;background:#f9c84a;color:#5a3800;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">'
          + '🔄 Ajukan Jadwal Pengganti →</button>'
          + '</div>';
      }

      bannerLiburEl.innerHTML =
        '<div style="background:#fff3cd;border:1.5px solid #f9c84a;border-radius:12px;padding:14px 16px;margin-bottom:1.25rem">'
        + '<div style="display:flex;align-items:flex-start;gap:10px">'
          + '<span style="font-size:24px;flex-shrink:0">🔕</span>'
          + '<div style="flex:1">'
            + '<div style="font-size:14px;font-weight:700;color:#7a4f00;margin-bottom:3px">Sistem Presensi Nonaktif</div>'
            + '<div style="font-size:12px;color:#7a4f00;line-height:1.5">'
              + (PESAN_LIBUR || 'Presensi sedang dinonaktifkan oleh Admin.')
            + '</div>'
          + '</div>'
        + '</div>'
        + reminderHtml
        + '</div>';
      bannerLiburEl.style.display = 'block';
    } else {
      bannerLiburEl.style.display = 'none';
    }
  }

  // Greeting
  var namaEl = document.getElementById('beranda-nama-dosen');
  var nipEl  = document.getElementById('beranda-nip-dosen');
  if (namaEl) namaEl.textContent = currentUser.nama;
  if (nipEl)  nipEl.textContent  = currentUser.nip ? 'NIP: ' + currentUser.nip : '';

  // Hari ini
  var hariIni = todayHari();
  var hariLabel = document.getElementById('beranda-hari-label');
  if (hariLabel) hariLabel.textContent = hariIni + ', ' + new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});

  var todayStr = new Date().toLocaleDateString('id-ID');
  var todayTs  = parseTanggal(todayStr); // timestamp hari ini — toleran format

  // Presensi hari ini milik dosen ini — pakai parseTanggal agar toleran format
  var presensiHariIni = P.filter(function(p) {
    return p.dosenId === currentUser.id && parseTanggal(p.tanggal) === todayTs;
  });

  // Jadwal hari ini milik dosen ini
  // Filter: paralel nonaktif dan paralel counter penuh tidak ditampilkan
  var jadwalHariIni = J.filter(function(j) {
    if (j.dosenId !== currentUser.id) return false;
    if (j.hari !== hariIni) return false;
    // Sembunyikan paralel nonaktif
    if (j.tipe === 'paralel' && j.statusParalel !== 'aktif') return false;
    // Sembunyikan paralel yang sudah penuh
    if (j.tipe === 'paralel') {
      var counter = P.filter(function(p){ return p.jadwalId === j.id; }).length;
      if (counter >= (j.maxPertemuan || 8)) return false;
    }
    return true;
  }).sort(function(a,b){ return (a.jamMulai||'').localeCompare(b.jamMulai||''); });

  var listEl = document.getElementById('beranda-jadwal-list');
  if (listEl) {
    if (jadwalHariIni.length === 0) {
      listEl.innerHTML = '<div class="beranda-empty-hari" style="color:#e74c3c">Tidak ada jadwal hari ini</div>';
    } else {
      listEl.innerHTML = jadwalHariIni.map(function(j) {
        // Cari presensi yang cocok dengan jadwal ini
        // Prioritas 1: cocok jadwalId; Prioritas 2: fallback via MK (untuk data lama tanpa jadwalId)
        var pres = presensiHariIni.find(function(p){ return p.jadwalId && p.jadwalId === j.id; });
        if (!pres) pres = presensiHariIni.find(function(p){ return (!p.jadwalId || p.jadwalId === '') && p.mk === j.mk; });

        // Tentukan status badge & warna kartu
        var statusHTML = '';
        var borderLeft = '3px solid #e5e5e3';
        var bgCard = '#fff';

        if (!pres) {
          // Belum rekam sama sekali
          statusHTML = '<div style="display:flex;align-items:center;gap:4px;margin-top:5px">'
            + '<span style="font-size:10px;background:#f5f5f3;color:#888;border:1px solid #e5e5e3;border-radius:20px;padding:2px 8px;font-weight:500">⏳ Belum Rekam</span>'
            + '</div>';
          borderLeft = '3px solid #e5e5e3';
          bgCard = '#fff';

        } else if (pres.waktuSelesai && pres.waktuSelesai !== '') {
          // Sudah rekam mulai DAN selesai → selesai
          statusHTML = '<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:5px">'
            + '<span style="font-size:10px;background:#eaf3de;color:#27500a;border-radius:20px;padding:2px 8px;font-weight:600">✅ Selesai</span>'
            + '<span style="font-size:10px;color:#888">Mulai ' + (pres.waktuHadir||'') + ' · Selesai ' + (pres.waktuSelesai||'') + '</span>'
            + '</div>';
          borderLeft = '3px solid #639922';
          bgCard = '#f9fdf5';

        } else {
          // Sudah rekam mulai, belum selesai → sedang berlangsung
          statusHTML = '<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:5px">'
            + '<span style="font-size:10px;background:#e6f1fb;color:#185fa5;border-radius:20px;padding:2px 8px;font-weight:600">🔵 Sedang Berlangsung</span>'
            + '<span style="font-size:10px;color:#888">Rekam mulai: ' + (pres.waktuHadir||'') + '</span>'
            + '</div>'
            + '<div style="margin-top:6px">'
            + '<button onclick="pg(\'hadir\', document.getElementById(\'tab-hadir\'))" style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid #185fa5;background:#185fa5;color:#fff;cursor:pointer;font-family:inherit">📍 Rekam Selesai →</button>'
            + '</div>';
          borderLeft = '3px solid #185fa5';
          bgCard = '#f0f7ff';
        }

        return '<div class="beranda-jadwal-item" style="border-left:' + borderLeft + ';background:' + bgCard + ';flex-direction:column;gap:4px">'
          + '<div style="display:flex;gap:10px;align-items:flex-start">'
          + '<span class="beranda-jadwal-time">' + (j.jamMulai||'?') + ' – ' + (j.jamSelesai||'?') + '</span>'
          + '<div class="beranda-jadwal-info">'
          + '<div class="beranda-jadwal-mk">' + j.mk + '</div>'
          + '<div class="beranda-jadwal-sub">' + (j.kelas ? j.kelas + ' · ' : '') + (j.ruang||'') + (j.semester ? ' · ' + j.semester : '') + '</div>'
          + '</div>'
          + '</div>'
          + statusHTML
          + '</div>';
      }).join('');
    }
  }

  // Statistik ringkas
  var myP = P.filter(function(p){ return p.dosenId === currentUser.id; });
  var tepat = myP.filter(function(p){ return p.color === 'green'; }).length;
  var myG = G.filter(function(g){ return g.dosenId === currentUser.id; });

  var bsH = document.getElementById('bs-hadir');
  var bsT = document.getElementById('bs-tepat');
  var bsG = document.getElementById('bs-ganti');
  if (bsH) bsH.textContent = myP.length;
  if (bsT) bsT.textContent = myP.length > 0 ? Math.round(tepat / myP.length * 100) + '%' : '–';
  if (bsG) bsG.textContent = myG.length;
}

function fillAll(){
  updateUserUI();
  if (isAdmin) fillBerandaAdmin();
  if (!isAdmin && currentUser) fillBerandaDosen();
  fillJadwalDosen();
  var rd=document.getElementById('rd');if(rd){rd.innerHTML='<option value="all">Semua dosen</option>';D.forEach(function(d){var o=document.createElement('option');o.value=d.id;o.textContent=d.nama;rd.appendChild(o);});}
  var jfd=document.getElementById('jfd');if(jfd){jfd.innerHTML='<option value="all">Semua dosen</option>';D.forEach(function(d){var o=document.createElement('option');o.value=d.id;o.textContent=d.nama;jfd.appendChild(o);});}
  renderD(); renderJ(); renderHari(); renderG(); renderM();
  renderRiwayatSaya();
  renderMK();
  cekNotifGanti();
  renderNotifLiburHadir();
  renderDailyDashboard();
  renderAlertAbsen();
  renderGantiAlert();
  renderRiwayatGanti();
  renderRiwayatMaju();
  renderTren();
  renderPengaturanSistem();
}

function pg(p,btn){
  document.querySelectorAll('.page').forEach(function(x){x.classList.remove('active');});
  document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active');});
  document.getElementById('page-'+p).classList.add('active');
  if(btn) btn.classList.add('active');
  // Sembunyikan tab-bar saat di beranda
  var tabBar = document.querySelector('.tab-bar');
  if (tabBar) { tabBar.style.display = (p==='beranda'||p==='beranda-admin') ? 'none' : 'flex'; }
  // Tombol back
  var btnBack = document.getElementById('btn-back-beranda');
  if (btnBack) {
    var showBack = (isAdmin && p!=='beranda-admin') || (!isAdmin && p!=='beranda');
    btnBack.style.display = showBack ? 'flex' : 'none';
  }
  if(p==='report'){
    var rd=document.getElementById('rd');if(rd){rd.innerHTML='<option value="all">Semua dosen</option>';D.forEach(function(d){var o=document.createElement('option');o.value=d.id;o.textContent=d.nama;rd.appendChild(o);});}
    fillAdminRaporDropdown();
    renderR();
  }
  if(p==='mk'){ renderMK(); }
  if(p==='rapor'){ if(!isAdmin) renderRapor(null); }
  if(p==='hadir'){ renderNotifLiburHadir(); }
  if(p==='beranda-admin'){ fillBerandaAdmin(); }
}
document.querySelectorAll('.mo').forEach(function(el){el.addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');});});
function cm(id){document.getElementById(id).classList.remove('open');}