#!/usr/bin/env node
/**
 * Gönderilecek bildirimi FCM'e DOKUNMADAN gösterir.
 *
 * `npm run send` gerçek push atar ve geri alınamaz; içerik kontrolü için
 * her zaman önce bu çalıştırılır. Bildirim gövdesi send-daily.mjs ile
 * aynı biçimde kurulur.
 *
 * Kullanım:
 *   node tools/onizle.mjs              # bugün
 *   node tools/onizle.mjs 2026-08-01   # belirli gün
 *   node tools/onizle.mjs 7            # bugünden itibaren 7 gün
 */
import { todayISO, getDailyVerse, renderBanner } from '../lib.mjs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv[2];

const gunler = [];
if (/^\d{4}-\d{2}-\d{2}$/.test(arg || '')) {
  gunler.push(arg);
} else {
  const n = Number.parseInt(arg || '1', 10) || 1;
  const bugun = Date.now();
  for (let i = 0; i < n; i++)
    gunler.push(new Date(bugun + i * 86400000).toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }));
}

for (const d of gunler) {
  const v = getDailyVerse(d);
  // send-daily.mjs ile aynı gövde
  const mealFull = (v.meal || '').length > 320 ? v.meal.slice(0, 320) + '…' : (v.meal || '');
  const body = `${mealFull}\n\n— ${v.surahName} ${v.surahId}:${v.ayahId} · Elmalılı Meâli`;

  console.log('─'.repeat(72));
  console.log(`TARİH   : ${d}${d === todayISO() ? '  (bugün)' : ''}`);
  console.log(`ÂYET    : ${v.surahName} ${v.surahId}:${v.ayahId}`);
  console.log(`KONUM   : ${v.juzNumber}. cüz · ${v.pageNumber}. sayfa`);
  console.log(`ARAPÇA  : ${v.text}`);
  console.log(`BAŞLIK  : 📖 Günün Ayeti`);
  console.log(`GÖVDE   :\n${body.split('\n').map(l => '          ' + l).join('\n')}`);
  if (!v.meal) console.log('⚠️  MEAL BOŞ — gönderilmemeli!');
}
console.log('─'.repeat(72));

if (gunler.length === 1 && process.env.BANNER) {
  const out = join(ROOT, 'onizleme-banner.png');
  await renderBanner(getDailyVerse(gunler[0]), out);
  console.log(`Banner: ${out}`);
}
console.log('(Bu bir önizlemedir — hiçbir bildirim gönderilmedi.)');
