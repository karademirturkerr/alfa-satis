# Paylasilabilir Link Kurulumu

Bu proje artik iki modda calisir:

- `local`: Su anki gibi sadece ayni cihazda veri saklar.
- `supabase`: Verileri ortak veritabaninda tutar. Linki acan herkes ayni satislari gorur.

## 1. Supabase Projesi Ac

1. [https://supabase.com](https://supabase.com) uzerinden bir proje olustur.
2. SQL Editor ac.
3. `SUPABASE_SETUP.sql` dosyasinin icini calistir.

## 2. Proje Ayarlarini Doldur

`config.js` dosyasini su sekle getir:

```js
window.APP_CONFIG = {
  storageMode: "supabase",
  supabaseUrl: "https://SENIN-PROJE-ID.supabase.co",
  supabaseAnonKey: "SENIN-ANON-KEY",
  supabaseTable: "app_state",
  appId: "alfa-satis-main",
};
```

`supabaseUrl` ve `supabaseAnonKey` bilgileri:

- Supabase panelinde `Project Settings > API` altindadir.

## 3. Statik Olarak Yayinla

Bu klasoru herhangi bir statik hosting servisine koyabilirsin:

- Netlify
- Vercel
- GitHub Pages

En kolay yontem:

1. Netlify hesabinda `Add new site > Deploy manually`
2. Bu klasordeki dosyalari yukle
3. Sana bir link verecek

## 4. Sonuc

`config.js` dosyasinda `storageMode: "supabase"` aktifse:

- Linki acan herkes ayni gunluk veriyi gorur
- Eklenen satislar ortak kayda yazilir
- Giderler ve urunler de ortak olur

## Onemli Not

Bu yapi temel bir paylasimli panel icindir. Guvenlik acisindan cok kritik ticari kullanim dusunuluyorsa sonraki adimda:

- kullanici girisi
- yetkilendirme
- silme / duzeltme loglari
- yedekleme

eklenmelidir.
