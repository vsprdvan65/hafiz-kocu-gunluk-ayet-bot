import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';

const ROOT = dirname(fileURLToPath(import.meta.url));

// ── Uygulamayla BİREBİR aynı deterministik seçim (app: dailyVerse.js) ──
function hashString(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function mulberry32(seed){return function(){seed|=0;seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}

export function todayISO(){
  // Europe/Istanbul (app PlanStorageService.getTodayISO ile aynı)
  return new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Istanbul'});
}

let _ayah, _meal, _names;
function load(){
  if(_ayah) return;
  _ayah = JSON.parse(readFileSync(join(ROOT,'data/quran-metadata-ayah.json'),'utf8'));
  _meal = JSON.parse(readFileSync(join(ROOT,'data/diyanet.json'),'utf8'));
  const src = readFileSync(join(ROOT,'data/turkishSurahNames.js'),'utf8');
  _names = {};
  for(const m of src.matchAll(/(\d+):\s*"([^"]+)"/g)) _names[+m[1]] = m[2];
}

export function getDailyVerse(dateISO){
  load();
  const rng = mulberry32(hashString(dateISO));
  const surahId = Math.floor(rng()*114)+1;
  const verses = Object.values(_ayah).filter(v=>v.surah_number===surahId).sort((a,b)=>a.ayah_number-b.ayah_number);
  const v = verses[Math.floor(rng()*verses.length)];
  const ayahId = v.ayah_number;
  const sure = _meal.sures[surahId-1];
  const row = sure.ayetler.find(a=>String(a[0])===String(ayahId));
  return { surahId, ayahId, text: v.text, meal: row?row[1]:'', surahName: _names[surahId] || `Sure ${surahId}` };
}

function esc(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function trunc(s,n){s=s||'';return s.length<=n?s:s.slice(0,s.lastIndexOf(' ',n)>n*0.6?s.lastIndexOf(' ',n):n).trimEnd()+'…';}

export async function renderBanner(verse, outPath){
  const W=1080,H=540;
  const arabic = trunc(verse.text, 60);
  const meal = trunc(verse.meal, 95);
  const ref = `${verse.surahName} ${verse.surahId}:${verse.ayahId} · Diyanet Meâli`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
   <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#2D1B4E"/><stop offset="55%" stop-color="#1A0B2E"/><stop offset="100%" stop-color="#0D0518"/></linearGradient>
   <radialGradient id="glow" cx="0.22" cy="0.45" r="0.6"><stop offset="0%" stop-color="#A855F7" stop-opacity="0.35"/><stop offset="100%" stop-color="#A855F7" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="0" y="0" width="${W}" height="6" fill="#A855F7" opacity="0.7"/>
  <text x="380" y="140" fill="#C9A8FF" font-family="sans-serif" font-size="36" font-weight="800" letter-spacing="5">📖 GÜNÜN AYETİ</text>
  <text x="380" y="245" fill="#ffffff" font-family="serif" font-size="52" font-weight="700" direction="rtl">${esc(arabic)}</text>
  <text x="380" y="340" fill="#E6D9FF" font-family="sans-serif" font-size="30">"${esc(meal)}"</text>
  <text x="380" y="395" fill="#9B7Fd0" font-family="sans-serif" font-size="26">${esc(ref)}</text>
  </svg>`;
  const logo = await sharp(join(ROOT,'assets/logo.png')).resize(250,250).toBuffer();
  await sharp(Buffer.from(svg)).composite([{input:logo,left:70,top:145}]).png().toFile(outPath);
}
