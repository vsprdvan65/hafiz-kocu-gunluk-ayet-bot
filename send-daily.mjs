import { todayISO, getDailyVerse, renderBanner } from './lib.mjs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Servis hesabı: CI'da secret (env FIREBASE_SERVICE_ACCOUNT = JSON), yerelde dosya
function loadServiceAccount(){
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
  return JSON.parse(readFileSync(new URL('./serviceAccountKey.json', import.meta.url), 'utf8'));
}

const date = process.env.FORCE_DATE || todayISO();
const v = getDailyVerse(date);
console.log('TARİH:', date, '| AYET:', `${v.surahName} ${v.surahId}:${v.ayahId}`);

await renderBanner(v, '/tmp/banner_daily.png');

// Banner'ı geçici host'a yükle (catbox) — FCM image URL için
let imageUrl = '';
try {
  imageUrl = execSync('curl -s -F"reqtype=fileupload" -F"fileToUpload=@/tmp/banner_daily.png" https://catbox.moe/user/api.php').toString().trim();
  if (!imageUrl.startsWith('http')) imageUrl = '';
} catch { imageUrl = ''; }
console.log('BANNER:', imageUrl || '(yüklenemedi, görselsiz gönderilecek)');

initializeApp({ credential: cert(loadServiceAccount()) });

const mealShort = (v.meal||'').length>120 ? (v.meal.slice(0,120)+'…') : (v.meal||'');
const body = `"${mealShort}" — ${v.surahName} ${v.surahId}:${v.ayahId}`;
const androidNotif = { color:'#A855F7', channelId:'gunun_ayeti', icon:'ic_stat_notify' };
if (imageUrl) androidNotif.image = imageUrl;
const notif = { title:'📖 Günün Ayeti', body };
if (imageUrl) notif.image = imageUrl;

const msg = {
  topic:'all',
  notification: notif,
  data:{ surahId:String(v.surahId), ayahId:String(v.ayahId), type:'daily_verse' },
  android:{ priority:'high', notification: androidNotif },
};

const id = await getMessaging().send(msg);
console.log('✅ GÖNDERİLDİ:', id);
