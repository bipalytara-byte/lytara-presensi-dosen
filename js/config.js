/* config.js — Konstanta, state global, dan data libur nasional
   Semua variabel di sini bersifat global (window scope) agar bisa
   diakses oleh semua file JS lain tanpa module bundler.
*/


const API = 'https://script.google.com/macros/s/AKfycbzcIoEqRDMV0rnNzPn6A_A8KP4JR_9hnQuKKY4yQDpvQq6p_M2mlenyjt1xJ9KCPtbN/exec';
const PIN = '1819';
const HARI = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const DOSEN_PASS = {
  "d001":"QAH276","d002":"XCK025","d003":"AFQ525","d004":"VAU631",
  "d005":"YIC086","d006":"USN935","d007":"VQW570","d008":"FHC212",
  "d009":"QJJ229","d010":"QPE713","d011":"ZQO687","d012":"FAI229",
  "d013":"WIR394","d014":"GGO258","d015":"KFZ500","d016":"CQU403",
  "d017":"ZNZ807","d018":"RNG614","d019":"LYW251","d020":"XWH661",
  "d021":"TOU503"
};
let D=[],J=[],P=[],G=[],M=[];
let eDos=null,eJad=null,tempMk=[];
let actId=null,actJad=null;

let isAdmin=false;
let currentUser=null;

// ── Status sistem presensi (diisi dari GAS Pengaturan) ──
let SISTEM_AKTIF       = true;  // true = presensi berjalan normal
let PESAN_LIBUR        = '';    // pesan banner saat sistem nonaktif (untuk dosen)
let PENGUMUMAN_LOGIN   = '';    // pengumuman di halaman login (untuk semua)

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