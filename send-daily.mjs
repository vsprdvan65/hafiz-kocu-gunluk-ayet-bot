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

// Banner'ı repo köküne üret
const bannerPath = new URL('./banner.png', import.meta.url).pathname;
await renderBanner(v, bannerPath);

// Hosting: CI'da repo'ya commit + GitHub raw (SHA pinli, taze) ; yerelde catbox
let imageUrl = '';
if (process.env.GITHUB_ACTIONS) {
  try {
    execSync('git config user.name "ayet-bot"');
    execSync('git config user.email "bot@users.noreply.github.com"');
    execSync('git add banner.png');
    execSync(`git commit -m "banner: ${date}" || true`, { shell: '/bin/bash', stdio: 'ignore' });
    execSync('git push', { stdio: 'ignore' });
    const sha = execSync('git rev-parse HEAD').toString().trim();
    imageUrl = `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY}/${sha}/banner.png`;
  } catch (e) { console.log('banner host hata:', e.message); imageUrl = ''; }
} else {
  try {
    imageUrl = execSync(`curl -s -F"reqtype=fileupload" -F"fileToUpload=@${bannerPath}" https://catbox.moe/user/api.php`).toString().trim();
    if (!imageUrl.startsWith('http')) imageUrl = '';
  } catch { imageUrl = ''; }
}
console.log('BANNER:', imageUrl || '(yüklenemedi, görselsiz gönderilecek)');

initializeApp({ credential: cert(loadServiceAccount()) });

// Banner'ı görmeyen cihazlarda (Xiaomi/MIUI görseli siler) da zengin görünüm:
// Arapça ayet + tam meal, genişleyince (BigText) tamamı okunur.
const arabicShort = (v.text||'').length>110 ? (v.text.slice(0,110)+'…') : (v.text||'');
const mealFull = (v.meal||'').length>320 ? (v.meal.slice(0,320)+'…') : (v.meal||'');
const body = `${arabicShort}\n\n${mealFull}\n\n— ${v.surahName} ${v.surahId}:${v.ayahId} · Diyanet Meâli`;
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
