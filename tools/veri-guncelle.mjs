#!/usr/bin/env node
/**
 * Bot verisini uygulamadan tazeler.
 *
 * Bot ile uygulama AYNI âyeti göstermek zorunda; bu ancak ikisi aynı veriyi
 * okursa garanti edilir. Buradaki dosyalar TÜRETİLMEZ, birebir KOPYALANIR —
 * dönüştürme olsaydı sapma yeniden mümkün olurdu.
 *
 * Kullanım:
 *   node tools/veri-guncelle.mjs [uygulama-klasoru]
 *
 * Örn:
 *   node tools/veri-guncelle.mjs ../HAFIZ_KOCU_3_SURUMLERI/hafiz-kocu-3.0.0
 */
import { copyFileSync, existsSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VARSAYILAN_APP = resolve(ROOT, '../HAFIZ_KOCU_3_SURUMLERI/hafiz-kocu-3.0.0');
const app = resolve(process.argv[2] || VARSAYILAN_APP);

const DOSYALAR = [
  ['public/kuran.json',                 'data/kuran.json'],
  ['public/data/meal/elmalili.json',    'data/elmalili.json'],
  ['src/data/quran/turkishSurahNames.js', 'data/turkishSurahNames.js'],
];

if (!existsSync(app)) {
  console.error(`✗ Uygulama klasörü yok: ${app}`);
  process.exit(1);
}

let degisen = 0;
for (const [kaynak, hedef] of DOSYALAR) {
  const k = join(app, kaynak), h = join(ROOT, hedef);
  if (!existsSync(k)) {
    console.error(`✗ Kaynak bulunamadı: ${k}`);
    process.exit(1);
  }
  const eskiBoyut = existsSync(h) ? statSync(h).size : -1;
  copyFileSync(k, h);
  const yeniBoyut = statSync(h).size;
  const durum = eskiBoyut === yeniBoyut ? 'aynı' : `${eskiBoyut} → ${yeniBoyut}`;
  if (eskiBoyut !== yeniBoyut) degisen++;
  console.log(`  ${hedef.padEnd(28)} ${durum}`);
}

console.log(`\n✓ Veri tazelendi (${degisen} dosya değişti). Kaynak: ${app}`);
console.log('  Doğrulama: node tools/dogrula.mjs');
