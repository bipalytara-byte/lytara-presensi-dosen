/* beranda.js — Halaman beranda dosen (home screen mobile)
   Fungsi: fillBerandaDosen, fillAll, pg (navigasi halaman), cm (tutup modal)
*/


function fillBerandaDosen() {
  if (!currentUser) return;

  // ── Banner sistem nonaktif (libur khusus admin) ──
  var bannerLiburEl = document.getElementById('beranda-banner-libur-sistem');
  if (bannerLiburEl) {
    if (!SISTEM_AKTIF) {
      bannerLiburEl.innerHTML =
        '<div style="background:#fff3cd;border:1.5px solid #f9c84a;border-radius:12px;padding:14px 16px;margin-bottom:1.25rem;display:flex;align-items:flex-start;gap:10px">'
        + '<span style="font-size:24px;flex-shrink:0">🔕</span>'
        + '<div>'
          + '<div style="font-size:14px;font-weight:700;color:#7a4f00;margin-bottom:3px">Sistem Presensi Nonaktif</div>'
          + '<div style="font-size:12px;color:#7a4f00;line-height:1.5">'
            + (PESAN_LIBUR || 'Presensi sedang dinonaktifkan oleh Admin. Silakan hubungi Admin untuk informasi lebih lanjut.')
          + '</div>'
        + '</div>'
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
  var jadwalHariIni = J.filter(function(j) {
    return j.dosenId === currentUser.id && j.hari === hariIni;
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
  if (!isAdmin && currentUser) fillBerandaDosen();
  fillJadwalDosen();
  var rd=document.getElementById('rd');if(rd){rd.innerHTML='<option value="all">Semua dosen</option>';D.forEach(function(d){var o=document.createElement('option');o.value=d.id;o.textContent=d.nama;rd.appendChild(o);});}
  var jfd=document.getElementById('jfd');if(jfd){jfd.innerHTML='<option value="all">Semua dosen</option>';D.forEach(function(d){var o=document.createElement('option');o.value=d.id;o.textContent=d.nama;jfd.appendChild(o);});}
  renderD();renderJ();renderHari();renderG();renderM();
  renderRiwayatSaya();
  cekNotifGanti();
  renderNotifLiburHadir();
  // Fitur monitoring: render setelah data siap
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
  document.getElementById('page-'+p).classList.add('active');btn.classList.add('active');
  // Sembunyikan tab-bar saat di halaman beranda dosen
  var tabBar = document.querySelector('.tab-bar');
  if (tabBar) { tabBar.style.display = (p === 'beranda') ? 'none' : 'flex'; }
  // Tombol navigasi header
  var btnBackBeranda = document.getElementById('btn-back-beranda');
  if (btnBackBeranda) {
    btnBackBeranda.style.display = (!isAdmin && p !== 'beranda') ? 'flex' : 'none';
  }
  if(p==='report'){
    var rd=document.getElementById('rd');if(rd){rd.innerHTML='<option value="all">Semua dosen</option>';D.forEach(function(d){var o=document.createElement('option');o.value=d.id;o.textContent=d.nama;rd.appendChild(o);});}
    fillAdminRaporDropdown();
    renderR();
  }
  if(p==='rapor'){ if(!isAdmin) renderRapor(null); }
}
document.querySelectorAll('.mo').forEach(function(el){el.addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');});});
function cm(id){document.getElementById(id).classList.remove('open');}
