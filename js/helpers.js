/* helpers.js — Fungsi utilitas kecil yang dipakai banyak modul
   Fungsi: parseTanggal(), getHariInRange(), tutupPaksa(),
           jStr(), stH(), stS(), onModeChange()
   Note: jStr/stH/stS dipindah ke sini dari hadir.js agar tersedia global
*/


function stH(jam){
  var p=jam.split(':'),jh=+p[0],jm=+p[1];
  var n=new Date(),d=(n.getHours()*60+n.getMinutes())-(jh*60+jm);
  if(d<=10)return{l:'Tepat waktu',c:'green',d:Math.max(0,d)};
  if(d<=15)return{l:'Terlambat',c:'yellow',d:d};
  return{l:'Sangat terlambat',c:'red',d:d};
}
function stS(js){
  if(!js||js.indexOf(':')<0)return{l:'Tidak ada jam selesai',c:'gray'};
  var p=js.split(':'),jh=+p[0],jm=+p[1];
  var n=new Date(),d=(n.getHours()*60+n.getMinutes())-(jh*60+jm);
  if(d>=0)return{l:'Tepat waktu selesai',c:'blue'};
  return{l:'Pulang awal ('+Math.abs(d)+' mnt)',c:'red'};
}
function jStr(v){
  if(!v&&v!==0)return'';
  if(typeof v==='string'){
    var m=v.match(/(\d{1,2}):(\d{2}):\d{2}/);if(m)return m[1].padStart(2,'0')+':'+m[2];
    if(v.indexOf(':')>-1)return v.substring(0,5);
    if(v.indexOf('.')>-1)return v.replace('.',':').substring(0,5);
    return v;
  }
  if(typeof v==='number'){var t=Math.round(v*1440),h=Math.floor(t/60)%24,mn=t%60;return(h<10?'0':'')+h+':'+(mn<10?'0':'')+mn;}
  return String(v);
}

function onModeChange(){
  var sel = document.getElementById('pmode');
  var hint = document.getElementById('mode-hint');
  if(!sel||!hint) return;
  var v = sel.value;
  if(v==='Luring'){
    hint.style.display='block';
    hint.style.background='#eaf3de';hint.style.color='#27500a';
    hint.innerHTML='🏫 <b>Luring</b> — pastikan perkuliahan memang dilakukan tatap muka di kelas/ruang fisik.';
  } else if(v==='Daring Sinkronus'){
    hint.style.display='block';
    hint.style.background='#e6f1fb';hint.style.color='#185fa5';
    hint.innerHTML='💻 <b>Daring Sinkronus</b> — pastikan perkuliahan dilakukan secara online real-time (Zoom / GMeet / Teams).';
  } else if(v==='Daring Asinkronus'){
    hint.style.display='block';
    hint.style.background='#faeeda';hint.style.color='#633806';
    hint.innerHTML='📝 <b>Daring Asinkronus</b> — pastikan perkuliahan berupa penugasan mandiri / e-learning, bukan tatap muka.';
  } else {
    hint.style.display='none';
  }
}

// Data sementara sebelum konfirmasi
var _rekamPending = null;


function parseTanggal(str) {
  if(!str) return 0;
  var p = str.split(/[\/\-]/);
  if(p.length === 3) return new Date(p[2], p[1]-1, p[0]).getTime();
  return 0;
}

function getHariInRange(start, end) {
  var H = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  if (!start && !end) return ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  
  var sDate = start ? new Date(start + 'T00:00:00') : new Date(end + 'T00:00:00');
  var eDate = end ? new Date(end + 'T00:00:00') : new Date(start + 'T00:00:00');
  
  var diff = Math.floor((eDate - sDate) / (1000 * 60 * 60 * 24));
  if (diff >= 6) return H; 
  
  var res = [];
  var curr = new Date(sDate);
  while (curr <= eDate) {
    var dName = H[curr.getDay()];
    if (res.indexOf(dName) === -1) res.push(dName);
    curr.setDate(curr.getDate() + 1);
  }
  return res;
}

// FITUR KHUSUS WK I: Tutup Paksa Sesi
async function tutupPaksa(id) {
  var TOKEN_WKI = '1990'; 
  
  var inputToken = prompt('🛡️ OTORISASI DIBUTUHKAN:\nMasukkan Token Rahasia WK I untuk menutup paksa sesi ini:');
  if (inputToken === null) return; 
  if (inputToken !== TOKEN_WKI) {
    alert('❌ Akses Ditolak!\nToken salah. Anda tidak memiliki izin untuk melakukan tindakan ini.');
    return;
  }

  // Cari data presensi untuk ambil jamSelesaiJadwal
  var presensi = P.find(function(p){ return p.id === id; });
  var jamSelesaiJadwal = presensi ? (presensi.jamSelesaiJadwal || '') : '';

  // Hitung waktu selesai aktual (sekarang)
  var now = new Date();
  var ws = now.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});

  // Hitung status berdasarkan jam jadwal selesai (sama seperti logika stS)
  var stl, stc;
  if (!jamSelesaiJadwal || jamSelesaiJadwal.indexOf(':') < 0) {
    // Tidak ada jam selesai jadwal — tandai netral tapi dengan keterangan ditutup admin
    stl = 'Ditutup Admin (' + ws + ')';
    stc = 'red';
  } else {
    var p2 = jamSelesaiJadwal.split(':');
    var jh2 = +p2[0], jm2 = +p2[1];
    var selisih = (now.getHours()*60 + now.getMinutes()) - (jh2*60 + jm2);
    if (selisih >= -5) {
      // Tepat waktu atau lewat jadwal (toleransi 5 menit lebih awal)
      stl = 'Tepat waktu selesai (Tutup Admin)';
      stc = 'blue';
    } else {
      // Pulang awal — masih sebelum jam selesai jadwal
      stl = 'Pulang awal ' + Math.abs(selisih) + ' mnt (Tutup Admin)';
      stc = 'red';
    }
  }

  // Tampilkan konfirmasi dengan info status
  var infoPresensi = presensi ? '\n👤 ' + presensi.dosen + '\n📚 ' + presensi.mk + '\n⏰ Jam selesai jadwal: ' + (jamSelesaiJadwal||'—') + '\n🕐 Waktu tutup: ' + ws + '\n📋 Status: ' + stl : '';
  if (!confirm('Token Benar. Lanjutkan menutup paksa sesi ini?' + infoPresensi)) return;
  
  setSB('sy');
  try {
    await post({action:'updateSelesai', id:id, waktuSelesai:ws, statusSelesai:stl, colorSelesai:stc});
    
    var idx = P.findIndex(function(p){ return p.id === id; });
    if(idx > -1) { P[idx].waktuSelesai = ws; P[idx].statusSelesai = stl; P[idx].colorSelesai = stc; }
    
    setSB('ok');
    renderR(); 
    alert('✅ Sesi berhasil ditutup.\nWaktu: ' + ws + '\nStatus: ' + stl);
  } catch(e) {
    setSB('er'); alert('Gagal: ' + e.message);
  }
}

// =====================================================
// FITUR 1: DASHBOARD RINGKASAN HARIAN
// =====================================================

// ── Normalisasi format semester ──────────────────────────────────────
// Menyeragamkan berbagai variasi format ke "Genap 2025/2026" / "Ganjil 2025/2026"
// Menangani: "2025/2026 Genap", "Semester Genap 2025/2026", "Genap 2025/2026", dll.
function normalisasiSemester(str) {
  if (!str || !str.trim()) return str;
  var s = str.trim();
  // Sudah benar: "Genap 2025/2026" atau "Ganjil 2025/2026"
  if (/^(Genap|Ganjil)\s+\d{4}\/\d{4}$/.test(s)) return s;
  // Format "2025/2026 Genap" atau "2025/2026 Ganjil"
  var m1 = s.match(/^(\d{4}\/\d{4})\s+(Genap|Ganjil)$/i);
  if (m1) return m1[2].charAt(0).toUpperCase() + m1[2].slice(1).toLowerCase() + ' ' + m1[1];
  // Format "Semester Genap 2025/2026"
  var m2 = s.match(/^Semester\s+(Genap|Ganjil)\s+(\d{4}\/\d{4})$/i);
  if (m2) return m2[1].charAt(0).toUpperCase() + m2[1].slice(1).toLowerCase() + ' ' + m2[2];
  return s;
}