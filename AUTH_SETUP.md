# Giris ve Rol Kurulumu

Bu proje artik Supabase Auth + rol bazli ekran gosterebilir.

## Roller

- `admin`: tum paneli gorur
- `staff`: sadece urun satis akisi ve `Gunu Kapat` alanini gorur

## 1. SQL Kurulumu

Supabase SQL Editor icinde su dosyayi calistir:

- `AUTH_SETUP.sql`

Bu dosya `user_profiles` tablosunu olusturur.

## 2. Kullanici Mantigi

Frontend giris ekrani `kullanici adi + sifre` alir.

Calisma sekli:

1. `username` bilgisi `user_profiles` tablosunda aranir
2. ilgili `email` bulunur
3. Supabase Auth email/sifre ile giris yapilir
4. kullanicinin `role` degeri okunur
5. ekran role gore acilir

## 3. Kullanici Olusturma

Bir sonraki adimda her kullanici icin:

- Supabase Auth icinde bir email/sifre kullanicisi olusturulur
- ayni kullanicinin `id`, `email`, `username`, `role` bilgileri `user_profiles` tablosuna eklenir

## 4. Bu Surumde Rol Kurallari

### Admin

- gun sonu ozeti
- giderler
- WhatsApp ayarlari
- export
- hareket tablosu
- toplam kasa

### Staff

- urun satis ekranı
- vardiya kontrolu
- gun kapatma

## 5. Dosyalar

- `AUTH_SETUP.sql`
- `index.html`
- `style.css`
- `app.js`
- `config.js`
