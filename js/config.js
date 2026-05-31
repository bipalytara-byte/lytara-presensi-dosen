/* config.js — Konstanta, state global, dan data libur nasional
   Semua variabel di sini bersifat global (window scope) agar bisa
   diakses oleh semua file JS lain tanpa module bundler.
*/


const API = 'https://script.google.com/macros/s/AKfycbzcIoEqRDMV0rnNzPn6A_A8KP4JR_9hnQuKKY4yQDpvQq6p_M2mlenyjt1xJ9KCPtbN/exec';

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

async function get(p){var r=await fetch(API+'?'+new URLSearchParams(p).toString(),{redirect:'follow'});return JSON.parse(await r.text());}
async function post(b){var r=await fetch(API+'?method=POST&payload='+encodeURIComponent(JSON.stringify(b)),{redirect:'follow'});return JSON.parse(await r.text());}