import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';

const ROOT = dirname(fileURLToPath(import.meta.url));

// ── Uygulamayla BİREBİR aynı deterministik seçim ──
// App karşılığı: Ana_uygulama/Pages/Home/HomePage.jsx → loadDailyVerse()
// Veri kaynağı da aynı: data/kuran.json, uygulamanın public/kuran.json
// dosyasının birebir kopyasıdır (tools/veri-guncelle.mjs ile tazelenir).
// ESKİ YAPI (quran-metadata-ayah.json, Uthmani imlâ) KALDIRILDI — Arapça
// metin uygulamadakiyle aynı Diyanet imlâsında olsun diye.
function hashString(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function mulberry32(seed){return function(){seed|=0;seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}

export function todayISO(){
  // Europe/Istanbul (app PlanStorageService.getTodayISO ile aynı)
  return new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Istanbul'});
}

let _flat, _meal, _names;
function load(){
  if(_flat) return;
  // kuran.json: {surahs:[{id, verses:[{surah_id, verse_number, verse, page, juz_number}]}]}
  const kuran = JSON.parse(readFileSync(join(ROOT,'data/kuran.json'),'utf8'));
  _flat = [];
  for(const s of kuran.surahs) for(const v of s.verses) _flat.push(v);
  // 2026-09-02: Diyanet meali telif durumu netleşene kadar bırakıldı; Elmalılı
  // (1942 vefat, kamu malı) kullanılıyor. Uygulamadaki HomePage kartı da AYNI
  // meali okur — ikisi ayrışırsa kullanıcı bildirimde başka, kartta başka
  // metin görür.
  _meal = JSON.parse(readFileSync(join(ROOT,'data/elmalili.json'),'utf8'));
  const src = readFileSync(join(ROOT,'data/turkishSurahNames.js'),'utf8');
  _names = {};
  for(const m of src.matchAll(/(\d+):\s*"([^"]+)"/g)) _names[+m[1]] = m[2];
}

export function getDailyVerse(dateISO){
  load();
  // RNG çağrı SIRASI uygulamayla aynı olmalı: önce sûre, sonra âyet.
  const rng = mulberry32(hashString(dateISO));
  const surahId = Math.floor(rng()*114)+1;
  // Âyet, sûrenin GERÇEK listesinden seçilir — numara hesaplanmaz.
  const verses = _flat.filter(v=>v.surah_id===surahId).sort((a,b)=>a.verse_number-b.verse_number);
  const v = verses[Math.floor(rng()*verses.length)];
  const ayahId = v.verse_number;
  const sure = _meal.sures[surahId-1];
  const row = sure.ayetler.find(a=>String(a[0])===String(ayahId));
  return {
    surahId, ayahId,
    text: v.verse,
    meal: row?row[1]:'',
    surahName: _names[surahId] || `Sure ${surahId}`,
    juzNumber: v.juz_number,
    // `page` 0-TABANLIDIR (Fâtiha = 0, Nâs = 604) ve uygulamada BİLİNÇLİ
    // olarak ham gösterilir (mushaf sayfa seçicisi de aynı numarayı kullanır).
    // Burada +1 eklenirse bildirim uygulamadan farklı sayfa söyler.
    pageNumber: v.page,
  };
}

function esc(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function trunc(s,n){s=s||'';return s.length<=n?s:s.slice(0,s.lastIndexOf(' ',n)>n*0.6?s.lastIndexOf(' ',n):n).trimEnd()+'…';}

function wrap(text, maxChars, maxLines){
  const words = (text||'').split(/\s+/);
  const lines = []; let cur = '';
  for (const w of words){
    if ((cur ? cur+' '+w : w).length <= maxChars) cur = cur ? cur+' '+w : w;
    else { if(cur) lines.push(cur); cur = w; if (lines.length === maxLines) break; }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  const joined = lines.join(' ');
  if (joined.length < (text||'').replace(/\s+/g,' ').length && lines.length) lines[lines.length-1] += '…';
  return lines.slice(0, maxLines);
}

export async function renderBanner(verse, outPath){
  const W=1080, H=540;
  const ref = `${verse.surahName} ${verse.surahId}:${verse.ayahId} · Diyanet Meâli`;
  const lines = wrap(verse.meal, 32, 3);              // Arapça yok — meal hero, 3 satıra kadar
  const startY = lines.length >= 3 ? 220 : (lines.length === 2 ? 245 : 270);
  const lineEls = lines.map((ln,i)=>`<text x="380" y="${startY + i*50}" fill="#F1E9FF" font-family="sans-serif" font-size="34" font-weight="600">${esc(ln)}</text>`).join('');
  const refY = startY + lines.length*50 + 20;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
   <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#2D1B4E"/><stop offset="55%" stop-color="#1A0B2E"/><stop offset="100%" stop-color="#0D0518"/></linearGradient>
   <radialGradient id="glow" cx="0.22" cy="0.45" r="0.6"><stop offset="0%" stop-color="#A855F7" stop-opacity="0.35"/><stop offset="100%" stop-color="#A855F7" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="0" y="0" width="${W}" height="6" fill="#A855F7" opacity="0.7"/>
  <text x="380" y="135" fill="#C9A8FF" font-family="sans-serif" font-size="34" font-weight="800" letter-spacing="5">📖 GÜNÜN AYETİ</text>
  ${lineEls}
  <text x="380" y="${refY}" fill="#9B7Fd0" font-family="sans-serif" font-size="26">${esc(ref)}</text>
  </svg>`;
  const logo = await sharp(join(ROOT,'assets/logo.png')).resize(250,250).toBuffer();
  await sharp(Buffer.from(svg)).composite([{input:logo,left:70,top:145}]).png().toFile(outPath);
}
