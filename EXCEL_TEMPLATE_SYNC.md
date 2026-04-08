# Excel Sablonuna Yazma

Bu repo icindeki `scripts/update-excel-template.ps1` script'i:

- web uygulamasindan indirilen `Excel Sablonuna Aktar` CSV dosyasini alir
- `satis_takip_sablonu_giderli.xlsx` dosyasinin `Gunluk Satis` sayfasina yazar
- tarih, satilan adet ve gider bilgisini isler
- Excel acildiginda formuller otomatik yeniden hesaplanir

## Gerekli Dosyalar

- Excel sablonu:
  - `C:\Users\PC\Desktop\alfa-satis\satis_takip_sablonu_giderli.xlsx`
- Web uygulamasindan indirilen CSV:
  - `gunluk-satis-sablon-YYYY-MM-DD.csv`

## Calistirma

PowerShell'de:

```powershell
cd C:\Users\PC\Desktop\alfa-satis
powershell -ExecutionPolicy Bypass -File .\scripts\update-excel-template.ps1 `
  -WorkbookPath "C:\Users\PC\Desktop\alfa-satis\satis_takip_sablonu_giderli.xlsx" `
  -CsvPath "C:\Users\PC\Downloads\gunluk-satis-sablon-2026-04-08.csv"
```

Istersen ciktinin adini da belirleyebilirsin:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\update-excel-template.ps1 `
  -WorkbookPath "C:\Users\PC\Desktop\alfa-satis\satis_takip_sablonu_giderli.xlsx" `
  -CsvPath "C:\Users\PC\Downloads\gunluk-satis-sablon-2026-04-08.csv" `
  -OutputPath "C:\Users\PC\Desktop\alfa-satis\gunluk-satis-2026-04-08.xlsx"
```

## Ne Yazar?

- `B2`: tarih
- `E3`: gider
- `B6:B...`: urun bazinda satilan adetler

Script urun adlarini normalize ederek eslestirir:

- buyuk/kucuk harf farki sorun olmaz
- Turkce karakter farklarini tolere eder

## Not

Bu yapi su an yerel calisir. Yani tarayicidan dogrudan `.xlsx` dosyasina yazmaz; bunun yerine:

1. panelden `Excel Sablonuna Aktar`
2. PowerShell script ile `.xlsx` sablonuna isle

akisi kullanilir.
