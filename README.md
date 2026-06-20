# Hafız Koçu — Günün Ayeti Bot

Her sabah **11:00 (Türkiye)** otomatik olarak o günün ayetini hesaplar ve tüm
kullanıcılara **FCM push** ile gönderir. Sunucu gerektirmez — GitHub Actions
(ücretsiz) çalıştırır. Ayet seçimi uygulamadaki `getDailyVerse` ile **birebir
aynı** olduğundan, bildirim ana sayfadaki "Günün Ayeti" kartıyla eşleşir.

## Nasıl çalışır
- `lib.mjs` — deterministik ayet seçimi (tarih seed'li) + mor banner üretimi
- `send-daily.mjs` — ayeti hesaplar, banner'ı catbox'a yükler, FCM topic `all`'a gönderir
- `.github/workflows/daily.yml` — her gün 08:00 UTC (= 11:00 TR) çalışır

## Kurulum (tek seferlik)
1. Bu klasörü bir **GitHub deposuna** yükle (private olabilir).
2. Depo → **Settings → Secrets and variables → Actions → New repository secret**:
   - **Name:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** `serviceAccountKey.json` dosyasının **tüm içeriği** (Firebase → Project settings → Service accounts → Generate new private key)
3. Bitti. Her sabah otomatik çalışır.

## Manuel test
GitHub'da depo → **Actions → "Günün Ayeti — Günlük Push" → Run workflow**.

## Yerelde test
`serviceAccountKey.json` dosyasını bu klasöre koy, sonra:
```
npm install
node send-daily.mjs
```

> ⚠️ `serviceAccountKey.json` **gizlidir** — git'e gitmez (`.gitignore`'da). Sadece GitHub Secret olarak kullanılır.
