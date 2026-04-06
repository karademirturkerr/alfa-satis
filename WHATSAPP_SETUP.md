# WhatsApp Rapor Kurulumu

Bu proje artik WhatsApp rapor ayarlarini kaydedebilir ve bir Supabase Edge Function uzerinden rapor gonderebilir.

## 1. SQL Kurulumu

Supabase SQL Editor icinde su dosyayi calistir:

- `WHATSAPP_REPORT_SETUP.sql`

Bu dosya:

- `report_settings` tablosunu olusturur
- `report_logs` tablosunu olusturur
- frontend'in ayar kaydetmesi icin gerekli policy'leri acar

## 2. Edge Function Kurulumu

Supabase CLI ya da dashboard ile `supabase/functions/send-whatsapp-report/index.ts` fonksiyonunu deploy et.

Fonksiyon adi:

- `send-whatsapp-report`

## 3. Gerekli Secret'lar

Fonksiyon ortam degiskenleri:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `APP_TIMEZONE`
- `WHATSAPP_TEMPLATE_NAME` (opsiyonel ama saatli gonderimde tavsiye edilir)
- `WHATSAPP_TEMPLATE_LANGUAGE` (opsiyonel, varsayilan `tr`)

`APP_TIMEZONE` icin onerilen deger:

- `Europe/Istanbul`

## 4. WhatsApp Bilgileri

Senin WhatsApp Business hesabindan su bilgiler gerekecek:

- Permanent Access Token
- Phone Number ID
- gerekiyorsa onayli template adi

Not:

- Bu bilgiler `config.js` icine yazilmaz
- sadece Edge Function secret olarak kaydedilir

## 5. Test Gonderimi

Frontend'teki `Test Mesaji Gonder` butonu:

- secili tarihin raporunu
- ayarlardaki numaraya
- function uzerinden yollar

## 6. Otomatik Saatli Gonderim

Bu repo function mantigini hazirlar. Saatli tetikleme icin iki yoldan biri gerekir:

- Supabase Scheduled Function / cron benzeri tetikleme
- dis cron servisi ile `send-whatsapp-report` fonksiyonunu `scheduled` modda cagirmak

Ornek POST body:

```json
{
  "app_id": "alfa-satis-main",
  "mode": "scheduled"
}
```

Fonksiyon:

- kayitli saati kontrol eder
- ayni gun ikinci kez gonderimi engeller
- raporu yollar

## 7. Onemli Not

WhatsApp Business tarafinda 24 saat disi gonderim kurallari degisebilir. Bu function istenirse `WHATSAPP_TEMPLATE_NAME` tanimlanarak template message ile de calisabilir.
