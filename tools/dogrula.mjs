#!/usr/bin/env node
/**
 * Bot ↔ uygulama uyum denetimi.
 *
 * Dini içerikte sapma kabul edilemez: bildirimde giden âyet, kullanıcının
 * uygulamada gördüğü âyetin AYNISI olmalı. Bu betik üç şeyi denetler:
 *
 *   1. Veri bütünlüğü  — 114 sûre / 6236 âyet, her âyetin meali var mı
 *   2. Veri özdeşliği  — bot data/ dosyaları uygulamanınkilerle birebir mi
 *   3. Seçim özdeşliği — 400 gün boyunca bot ve uygulama aynı âyeti mi seçiyor
 *
 * Uygulama tarafı BURADA YENİDEN YAZILMAZ; HomePage.jsx'teki seçim adımları
 * (aynı hash, aynı RNG, aynı çağrı sırası) uygulamanın KENDİ kuran.json'u
 * üzerinde çalıştırılır. Bot ise kendi lib.mjs'ini kullanır — iki bağımsız
 * yol aynı sonuca varmalı.
 *
 * Kullanım: node tools/dogrula.mjs [uygulama-klasoru]
 */
import { readFileSync, existsSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { getDailyVerse } from '../lib.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app = resolve(process.argv[2] || join(ROOT, '../HAFIZ_KOCU_2_SÜRÜMLERİ/hafiz-kocu-2.0.2'));

let hata = 0;
const ok  = (m) => console.log(`  ✓ ${m}`);
const err = (m) => { console.log(`  ✗ ${m}`); hata++; };

// ── 1. Veri bütünlüğü ──────────────────────────────────────────────────────
console.log('\n[1] Veri bütünlüğü');
const kuran = JSON.parse(readFileSync(join(ROOT, 'data/kuran.json'), 'utf8'));
const meal  = JSON.parse(readFileSync(join(ROOT, 'data/diyanet.json'), 'utf8'));

kuran.surahs.length === 114 ? ok('114 sûre') : err(`sûre sayısı ${kuran.surahs.length}, 114 olmalı`);

const flat = [];
for (const s of kuran.surahs) for (const v of s.verses) flat.push(v);
flat.length === 6236 ? ok('6236 âyet') : err(`âyet sayısı ${flat.length}, 6236 olmalı`);

// Her sûrede âyet numaraları 1..n kesintisiz mi
let bosluk = 0;
for (const s of kuran.surahs) {
  const nos = s.verses.map(v => v.verse_number).sort((a, b) => a - b);
  for (let i = 0; i < nos.length; i++) if (nos[i] !== i + 1) { bosluk++; break; }
}
bosluk === 0 ? ok('âyet numaraları kesintisiz (1..n)') : err(`${bosluk} sûrede âyet numarası boşluğu`);

// Her âyetin meali var mı — bildirim mealsiz gitmemeli
const mealIdx = {};
for (let i = 0; i < meal.sures.length; i++)
  for (const r of meal.sures[i].ayetler) mealIdx[`${i + 1}:${r[0]}`] = r[1];
const mealsiz = flat.filter(v => !mealIdx[`${v.surah_id}:${v.verse_number}`]);
mealsiz.length === 0
  ? ok('6236 âyetin tamamında meal var')
  : err(`${mealsiz.length} âyette meal yok (ör. ${mealsiz.slice(0, 3).map(v => v.surah_id + ':' + v.verse_number).join(', ')})`);

// Sayfa 0-tabanlı mı — pageNumber hesabı buna dayanıyor
const sayfalar = flat.map(v => v.page);
const enKucuk = Math.min(...sayfalar), enBuyuk = Math.max(...sayfalar);
enKucuk === 0
  ? ok(`sayfa 0-tabanlı (${enKucuk}..${enBuyuk}) → gösterimde ${enKucuk + 1}..${enBuyuk + 1}`)
  : err(`sayfa ${enKucuk}'dan başlıyor; lib.mjs page+1 varsayıyor`);

// ── 2. Veri özdeşliği ──────────────────────────────────────────────────────
console.log('\n[2] Uygulama verisiyle özdeşlik');
if (!existsSync(app)) {
  console.log(`  … atlandı (uygulama klasörü yok: ${app})`);
} else {
  const ciftler = [
    ['data/kuran.json',            'public/kuran.json'],
    ['data/diyanet.json',          'public/data/meal/diyanet.json'],
    ['data/turkishSurahNames.js',  'Ana_uygulama/Data/turkishSurahNames.js'],
  ];
  for (const [b, a] of ciftler) {
    const bp = join(ROOT, b), ap = join(app, a);
    if (!existsSync(ap)) { err(`uygulamada yok: ${a}`); continue; }
    const bs = statSync(bp).size, as = statSync(ap).size;
    if (bs !== as) { err(`${b} boyut farklı (bot ${bs} / app ${as}) — 'node tools/veri-guncelle.mjs' çalıştır`); continue; }
    readFileSync(bp).equals(readFileSync(ap))
      ? ok(`${b} birebir aynı`)
      : err(`${b} içerik farklı — 'node tools/veri-guncelle.mjs' çalıştır`);
  }
}

// ── 3. Seçim özdeşliği ─────────────────────────────────────────────────────
console.log('\n[3] Seçim özdeşliği (bot ↔ uygulama, 400 gün)');
if (!existsSync(app)) {
  console.log(`  … atlandı (uygulama klasörü yok)`);
} else {
  // HomePage.jsx → loadDailyVerse() ile aynı adımlar, uygulamanın kendi verisi
  const appKuran = JSON.parse(readFileSync(join(app, 'public/kuran.json'), 'utf8'));
  const appFlat = [];
  for (const s of appKuran.surahs) for (const v of s.verses) appFlat.push(v);

  const hashString = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const mulberry32 = (seed) => function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  const appSecim = (dateISO) => {
    const rng = mulberry32(hashString(dateISO));
    const surahId = Math.floor(rng() * 114) + 1;
    const vs = appFlat.filter(v => v.surah_id === surahId).sort((a, b) => a.verse_number - b.verse_number);
    const v = vs[Math.floor(rng() * vs.length)];
    return { key: `${surahId}:${v.verse_number}`, text: v.verse };
  };

  let fark = 0, metinFark = 0, ilk = [];
  const bugun = Date.now();
  for (let i = 0; i < 400; i++) {
    const d = new Date(bugun + i * 86400000).toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
    const b = getDailyVerse(d);
    const a = appSecim(d);
    const bKey = `${b.surahId}:${b.ayahId}`;
    if (bKey !== a.key) { fark++; if (ilk.length < 5) ilk.push(`${d}: bot ${bKey} ≠ app ${a.key}`); }
    else if (b.text !== a.text) { metinFark++; if (ilk.length < 5) ilk.push(`${d}: ${bKey} metin farklı`); }
  }
  fark === 0 ? ok('400 günün tamamında aynı âyet seçiliyor') : err(`${fark}/400 günde FARKLI âyet:\n     ${ilk.join('\n     ')}`);
  metinFark === 0 ? ok('Arapça metinler birebir aynı') : err(`${metinFark}/400 günde metin farklı:\n     ${ilk.join('\n     ')}`);
}

console.log(hata === 0 ? '\n✅ Tüm denetimler geçti.\n' : `\n❌ ${hata} sorun bulundu.\n`);
process.exit(hata === 0 ? 0 : 1);
