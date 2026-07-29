# Hafız Koçu — Günün Ayeti Bot

Her sabah **11:00 (Türkiye)** otomatik olarak o günün ayetini hesaplar ve tüm
kullanıcılara **FCM push** ile gönderir. Sunucu gerektirmez — GitHub Actions
(ücretsiz) çalıştırır. Ayet seçimi uygulamadaki `getDailyVerse` ile **birebir
aynı** olduğundan, bildirim ana sayfadaki "Günün Ayeti" kartıyla eşleşir.

## Nasıl çalışır
- `lib.mjs` — deterministik ayet seçimi (tarih seed'li) + mor banner üretimi
- `send-daily.mjs` — ayeti hesaplar, banner'ı catbox'a yükler, FCM topic `all`'a gönderir
- `.github/workflows/daily.yml` — her gün 08:00 UTC (= 11:00 TR) çalışır

## Veri — uygulamayla ortak kaynak

Bot ile uygulama **aynı** âyeti göstermek zorunda. Bu ancak ikisi aynı veriyi
okursa garanti edilir, o yüzden `data/` altındaki dosyalar uygulamanın
dosyalarının **birebir kopyasıdır** — dönüştürülmez, elle düzenlenmez:

| `data/` | Uygulamadaki kaynağı |
|---|---|
| `kuran.json` | `public/kuran.json` |
| `diyanet.json` | `public/data/meal/diyanet.json` |
| `turkishSurahNames.js` | `Ana_uygulama/Data/turkishSurahNames.js` |

Uygulamanın verisi değiştiğinde:

```bash
npm run veri-guncelle   # uygulamadan kopyalar
npm run dogrula         # bot ↔ app uyumunu 400 gün üzerinden denetler
```

> Sürüm 2.0 ile veri Diyanet altyapısına geçti. Eski `quran-metadata-ayah.json`
> (Uthmani imlâ, âyet sonu rakamı gömülü) **kaldırıldı**; Arapça metin artık
> uygulamadakiyle aynı Diyanet imlâsında.

`kuran.json`'da **`page` alanı 0-tabanlıdır** (Fâtiha = 0, Nâs = 604) ve
uygulama bunu **bilinçli olarak ham gösterir** — mushaf sayfa seçicisi de aynı
numarayı kullanır. `getDailyVerse` bu yüzden `page`'e dokunmaz; +1 eklenirse
bildirim uygulamadan farklı sayfa söyler.

## Göndermeden önce kontrol

Push geri alınamaz — içerik her zaman önce önizlenir:

```bash
npm run onizle       # bugün
npm run onizle 7     # önümüzdeki 7 gün
node tools/onizle.mjs 2026-08-01
```

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
