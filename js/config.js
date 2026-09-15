/* config.js — Konstanta, state global, dan data libur nasional
   Semua variabel di sini bersifat global (window scope) agar bisa
   diakses oleh semua file JS lain tanpa module bundler.
*/


const API = 'https://script.google.com/macros/s/AKfycbxGKxl4M9NdTNZTJu1xSvdDulR0PkQRRiIihjDSp_VKxHETmstZ0qXSGDhlLljDRpJDlA/exec';
// Versi backend yang diharapkan. Kalau server menjawab dengan versi
// lain, berarti URL /exec menunjuk deployment lama — penyebab paling
// sering dari "action tidak dikenal" dan "data lama muncul lagi".
const VERSI_DIHARAPKAN = 'V12.8';
const HARI = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
let D=[],J=[],P=[],G=[],M=[],MK=[];
let eDos=null,eJad=null,eMk=null,tempMk=[];
let actId=null,actJad=null;

let isAdmin=false;
let currentUser=null;

// ── Status sistem presensi (diisi dari GAS Pengaturan) ──
let SISTEM_AKTIF       = true;  // true = presensi berjalan normal
let PESAN_LIBUR        = '';    // pesan banner saat sistem nonaktif (untuk dosen)
let PENGUMUMAN_LOGIN   = '';    // pengumuman di halaman login (untuk semua)
let SEMESTER_AKTIF     = '';    // misal: "2025/2026 Genap"
let TAHUN_AKADEMIK     = '';    // misal: "2025/2026"
let OVERRIDE_CODE      = '';    // kode override sementara saat sistem nonaktif (kosong = tidak aktif)
// ── Kalender akademik (untuk Flex Class) ──
let TGL_MULAI_KULIAH = '';   // YYYY-MM-DD, minggu 1 dimulai di sini
let MINGGU_UTS       = 8;
let MINGGU_UAS       = 16;
let MINGGU_LIBUR     = '';   // nomor minggu tanpa perkuliahan, mis. "5, 12"
let FLEX_BLOK        = [];   // blok waktu mingguan kelas flex

// ── Arsip (per-request, bukan mode global) ──
let ARSIP_LIST   = [];   // [{nama, id, catatan}] dari sheet Arsip
let ARSIP_AKTIF  = null; // null = database semester berjalan
                         // {nama,id} = sedang melihat arsip (read-only)

// Libur nasional — diisi dari sheet Libur_Nasional saat loadThenShow().
// Format tiap item: { tgl: Date, nama: string }
let LIBUR_NASIONAL     = [];

window.onload=function(){
  tick(); setInterval(tick,1000);
  
  var role = sessionStorage.getItem('userRole');
  if (role === 'admin') {
     isAdmin = true; currentUser = null; loadThenShow();
  } else if (role === 'dosen') {
     var savedUser = sessionStorage.getItem('current_user');
     if(savedUser) { currentUser = JSON.parse(savedUser); isAdmin = false; loadThenShow(); }
     else { loadForLogin(); }
  } else {
     loadForLogin();
  }
};

function tick(){
  var el=document.getElementById('clk');if(!el)return;
  var n=new Date();
  el.textContent=n.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+' — '+n.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
function todayHari(){return['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date().getDay()];}

// [V10] setSB() dipindah ke sini dari api.js (file itu dihapus).
// Indikator status sinkronisasi di pojok header — dipakai 95x di seluruh app.
function setSB(s){
  var el=document.getElementById('sb');
  if(!el) return;
  el.textContent = s==='ok' ? 'Tersinkron' : s==='sy' ? 'Menyinkron...' : 'Error';
  el.className   = 'sb'+(s==='sy'?' sy':s==='er'?' se':'');
}

// =====================================================
// [V12.6] PERCOBAAN ULANG OTOMATIS
// -----------------------------------------------------
// Apps Script membatasi jumlah eksekusi yang berjalan bersamaan.
// Pada jam sibuk (presensi pagi) sebagian permintaan ditolak dan
// muncul sebagai "gagal terhubung ke server", padahal servernya
// sehat — hanya sedang padat.
//
// Tanpa penanganan ini, dosen menekan tombol berulang kali, dan
// itulah yang kemarin melahirkan catatan presensi ganda.
// =====================================================
const RETRY_JEDA = [900, 2500];          // milidetik

// [V12.8] Batas waktu SATU percobaan. Lewat ini, permintaan benar-benar
// dibatalkan lewat AbortController — bukan sekadar "dianggap gagal" tapi
// tetap jalan di belakang layar seperti sebelumnya.
const BATAS_WAKTU = 25000;

function _tunggu(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

// Kegagalan sesaat: jaringan putus, 404/500 dari googleusercontent,
// atau jawaban yang bukan JSON. Semuanya layak dicoba ulang.
async function _ambil(url, opsi, maksUlang, batasMs) {
  if (maksUlang == null) maksUlang = 1;
  batasMs = batasMs || BATAS_WAKTU;
  var galat;
  for (var i = 0; i <= maksUlang; i++) {
    if (i > 0) await _tunggu(RETRY_JEDA[Math.min(i - 1, RETRY_JEDA.length - 1)]);

    var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var jam = setTimeout(function(c){ return function(){ if (c) c.abort(); }; }(ctl), batasMs);

    try {
      var o = {};
      Object.keys(opsi || {}).forEach(function(k){ o[k] = opsi[k]; });
      if (ctl) o.signal = ctl.signal;

      var r    = await fetch(url, o);
      var teks = await r.text();
      clearTimeout(jam);
      try {
        return JSON.parse(teks);
      } catch(e) {
        galat = new Error('Jawaban server tidak utuh');
        continue;                       // kemungkinan halaman error, coba lagi
      }
    } catch(e) {
      clearTimeout(jam);
      // Permintaan yang kita batalkan sendiri dilaporkan sebagai Timeout,
      // supaya lapisan di atas bisa membedakannya dari jaringan putus.
      galat = (e && e.name === 'AbortError') ? new Error('Timeout') : e;
    }
  }
  throw galat || new Error('Gagal terhubung ke server');
}

// [V10] get() otomatis menyertakan arsipId kalau sedang melihat arsip.
// opsi (opsional): { ulang: <jumlah percobaan ulang>, batasMs: <batas waktu per percobaan> }
async function get(p, opsi){
  opsi = opsi || {};
  var q = {};
  Object.keys(p).forEach(function(k){ q[k] = p[k]; });
  if (ARSIP_AKTIF && !q.arsipId) q.arsipId = ARSIP_AKTIF.id;
  // [V12.8] Dulu 3 kali ulang. Pada jam sibuk itu justru memperparah:
  // Apps Script sedang antre, dan kita menambah antrean. Sekarang cukup
  // sekali ulang, dan tiap percobaan punya batas waktu yang tegas.
  var ulang = (opsi.ulang == null) ? 1 : opsi.ulang;
  return await _ambil(API+'?'+new URLSearchParams(q).toString(),
                      {redirect:'follow'}, ulang, opsi.batasMs);
}

// [V10.9] postBesar() — untuk kiriman besar seperti foto bukti.
// post() biasa menempelkan seluruh data di URL, dan foto tidak muat
// di situ. Ini memakai POST sungguhan. Content-Type sengaja text/plain
// supaya browser tidak melakukan preflight (yang akan ditolak GAS).
async function postBesar(b){
  if (ARSIP_AKTIF) {
    alert('📁 Anda sedang melihat arsip ' + ARSIP_AKTIF.nama + '.\n\nData arsip tidak bisa diubah.');
    throw new Error('Mode arsip: penulisan ditolak.');
  }
  return await _ambil(API, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(b),
    redirect: 'follow'
  }, 1);
}

// [V10] post() diblokir saat melihat arsip. Server juga menolak,
// ini lapis kedua supaya pengguna dapat pesan jelas tanpa menunggu server.
async function post(b){
  if (ARSIP_AKTIF && b.action !== 'saveArsip' && b.action !== 'deleteArsip') {
    alert('📁 Anda sedang melihat arsip ' + ARSIP_AKTIF.nama + '.\n\n'
        + 'Data arsip tidak bisa diubah. Kembali ke semester berjalan dulu.');
    throw new Error('Mode arsip: penulisan ditolak.');
  }
  // Penulisan hanya diulang SEKALI. Server sudah menolak presensi ganda,
  // tapi pengulangan berlebihan tetap berisiko untuk aksi lain.
  return await _ambil(API+'?method=POST&payload='+encodeURIComponent(JSON.stringify(b)),
                      {redirect:'follow'}, 1);
}