$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression.FileSystem

$outputPath = Join-Path $PSScriptRoot "satis_takip_sablonu.xlsx"
$tempRoot = Join-Path $PSScriptRoot "tmp_excel_build"

$products = @(
    @{ Name = "tavukburger"; SalePrice = 200; Cost = 65 },
    @{ Name = "hamburger"; SalePrice = 250; Cost = 95 },
    @{ Name = "kasarli tost"; SalePrice = 100; Cost = 40 },
    @{ Name = "karisik tost"; SalePrice = 110; Cost = 45 },
    @{ Name = "patso"; SalePrice = 100; Cost = 35 },
    @{ Name = "sosisli patso"; SalePrice = 110; Cost = 40 },
    @{ Name = "makarna"; SalePrice = 200; Cost = 50 },
    @{ Name = "doner"; SalePrice = 100; Cost = 60 },
    @{ Name = "hamburger menu"; SalePrice = 300; Cost = 130 },
    @{ Name = "tavukburger menu"; SalePrice = 250; Cost = 100 }
)

if (Test-Path $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $tempRoot | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempRoot "_rels") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempRoot "xl") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempRoot "xl\_rels") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempRoot "xl\worksheets") | Out-Null

function New-InlineCell {
    param(
        [string]$CellRef,
        [string]$Text,
        [int]$Style = 0
    )

    $escaped = [System.Security.SecurityElement]::Escape($Text)
    return "<c r=`"$CellRef`" t=`"inlineStr`" s=`"$Style`"><is><t>$escaped</t></is></c>"
}

function New-NumberCell {
    param(
        [string]$CellRef,
        [string]$Value,
        [int]$Style = 0
    )

    return "<c r=`"$CellRef`" s=`"$Style`"><v>$Value</v></c>"
}

function New-FormulaCell {
    param(
        [string]$CellRef,
        [string]$Formula,
        [int]$Style = 0
    )

    $escapedFormula = [System.Security.SecurityElement]::Escape($Formula)
    return "<c r=`"$CellRef`" s=`"$Style`"><f>$escapedFormula</f></c>"
}

$contentTypes = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>
"@

$rootRels = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>
"@

$workbook = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Urunler" sheetId="1" r:id="rId1"/>
    <sheet name="Gunluk Satis" sheetId="2" r:id="rId2"/>
  </sheets>
  <calcPr calcId="191029"/>
</workbook>
"@

$workbookRels = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
"@

$styles = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="#,##0.00"/>
    <numFmt numFmtId="165" formatCode="dd.mm.yyyy"/>
  </numFmts>
  <fonts count="3">
    <font>
      <sz val="11"/>
      <name val="Calibri"/>
    </font>
    <font>
      <b/>
      <sz val="11"/>
      <name val="Calibri"/>
    </font>
    <font>
      <b/>
      <sz val="14"/>
      <name val="Calibri"/>
    </font>
  </fonts>
  <fills count="3">
    <fill>
      <patternFill patternType="none"/>
    </fill>
    <fill>
      <patternFill patternType="gray125"/>
    </fill>
    <fill>
      <patternFill patternType="solid">
        <fgColor rgb="FFD9EAF7"/>
        <bgColor indexed="64"/>
      </patternFill>
    </fill>
  </fills>
  <borders count="2">
    <border>
      <left/><right/><top/><bottom/><diagonal/>
    </border>
    <border>
      <left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="7">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="10" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>
"@

$sheet1Rows = New-Object System.Collections.Generic.List[string]
$sheet1Rows.Add("<row r=`"1`">$(New-InlineCell -CellRef 'A1' -Text 'Urun Adi' -Style 1)$(New-InlineCell -CellRef 'B1' -Text 'Satis Fiyati' -Style 1)$(New-InlineCell -CellRef 'C1' -Text 'Birim Maliyet' -Style 1)$(New-InlineCell -CellRef 'D1' -Text 'Birim Kar' -Style 1)$(New-InlineCell -CellRef 'E1' -Text 'Kar %' -Style 1)</row>")

for ($row = 2; $row -le 201; $row++) {
    $product = $null
    if (($row - 2) -lt $products.Count) {
        $product = $products[$row - 2]
    }

    $nameValue = if ($null -ne $product) { $product.Name } else { "" }
    $saleValue = if ($null -ne $product) { [string]$product.SalePrice } else { "" }
    $costValue = if ($null -ne $product) { [string]$product.Cost } else { "" }

    $sheet1Rows.Add(
        "<row r=`"$row`">" +
        (New-InlineCell -CellRef "A$row" -Text $nameValue -Style 4) +
        (New-NumberCell -CellRef "B$row" -Value $saleValue -Style 2) +
        (New-NumberCell -CellRef "C$row" -Value $costValue -Style 2) +
        (New-FormulaCell -CellRef "D$row" -Formula "IF(OR(B$row=`"`",C$row=`"`"),`"`",B$row-C$row)" -Style 2) +
        (New-FormulaCell -CellRef "E$row" -Formula "IF(B$row=0,`"`",D$row/B$row)" -Style 3) +
        "</row>"
    )
}

$sheet1Xml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>
    <col min="1" max="1" width="28" customWidth="1"/>
    <col min="2" max="4" width="14" customWidth="1"/>
    <col min="5" max="5" width="11" customWidth="1"/>
  </cols>
  <sheetData>
    $($sheet1Rows -join "`n    ")
  </sheetData>
</worksheet>
"@

$sheet2Rows = New-Object System.Collections.Generic.List[string]
$sheet2Rows.Add("<row r=`"1`">$(New-InlineCell -CellRef 'A1' -Text 'Gun Sonu Satis Ozeti' -Style 5)</row>")
$sheet2Rows.Add("<row r=`"2`">$(New-InlineCell -CellRef 'A2' -Text 'Tarih' -Style 1)$(New-NumberCell -CellRef 'B2' -Value '' -Style 6)$(New-InlineCell -CellRef 'D2' -Text 'Toplam Ciro' -Style 1)$(New-FormulaCell -CellRef 'E2' -Formula 'SUM(F6:F205)' -Style 2)$(New-InlineCell -CellRef 'F2' -Text 'Toplam Maliyet' -Style 1)$(New-FormulaCell -CellRef 'G2' -Formula 'SUM(G6:G205)' -Style 2)$(New-InlineCell -CellRef 'H2' -Text 'Toplam Kar' -Style 1)$(New-FormulaCell -CellRef 'I2' -Formula 'SUM(H6:H205)' -Style 2)$(New-InlineCell -CellRef 'J2' -Text 'Kar %' -Style 1)$(New-FormulaCell -CellRef 'K2' -Formula 'IF(E2=0,\"\",I2/E2)' -Style 3)</row>")
$sheet2Rows.Add("<row r=`"3`">$(New-InlineCell -CellRef 'D3' -Text 'Gider' -Style 1)$(New-NumberCell -CellRef 'E3' -Value '' -Style 2)$(New-InlineCell -CellRef 'F3' -Text 'Net Sonuc' -Style 1)$(New-FormulaCell -CellRef 'G3' -Formula 'I2-E3' -Style 2)$(New-InlineCell -CellRef 'H3' -Text 'Net %' -Style 1)$(New-FormulaCell -CellRef 'I3' -Formula 'IF(E2=0,\"\",G3/E2)' -Style 3)</row>")
$sheet2Rows.Add("<row r=`"4`">$(New-InlineCell -CellRef 'A4' -Text 'Bu sayfada sadece Urun Adi, Satilan Adet ve varsa Gider alanini girmeniz yeterli.' -Style 4)</row>")
$sheet2Rows.Add("<row r=`"5`">$(New-InlineCell -CellRef 'A5' -Text 'Urun Adi' -Style 1)$(New-InlineCell -CellRef 'B5' -Text 'Satilan Adet' -Style 1)$(New-InlineCell -CellRef 'C5' -Text 'Birim Fiyat' -Style 1)$(New-InlineCell -CellRef 'D5' -Text 'Birim Maliyet' -Style 1)$(New-InlineCell -CellRef 'E5' -Text 'Birim Kar' -Style 1)$(New-InlineCell -CellRef 'F5' -Text 'Satis Tutari' -Style 1)$(New-InlineCell -CellRef 'G5' -Text 'Toplam Maliyet' -Style 1)$(New-InlineCell -CellRef 'H5' -Text 'Toplam Kar' -Style 1)$(New-InlineCell -CellRef 'I5' -Text 'Kar %' -Style 1)</row>")

for ($row = 6; $row -le 205; $row++) {
    $sheet2Rows.Add(
        "<row r=`"$row`">" +
        (New-InlineCell -CellRef "A$row" -Text "" -Style 4) +
        (New-NumberCell -CellRef "B$row" -Value "" -Style 4) +
        (New-FormulaCell -CellRef "C$row" -Formula "IFERROR(VLOOKUP(A$row,Urunler!A`$2:E`$201,2,FALSE),`"`")" -Style 2) +
        (New-FormulaCell -CellRef "D$row" -Formula "IFERROR(VLOOKUP(A$row,Urunler!A`$2:E`$201,3,FALSE),`"`")" -Style 2) +
        (New-FormulaCell -CellRef "E$row" -Formula "IFERROR(VLOOKUP(A$row,Urunler!A`$2:E`$201,4,FALSE),`"`")" -Style 2) +
        (New-FormulaCell -CellRef "F$row" -Formula "IF(OR(B$row=`"`",C$row=`"`"),`"`",B$row*C$row)" -Style 2) +
        (New-FormulaCell -CellRef "G$row" -Formula "IF(OR(B$row=`"`",D$row=`"`"),`"`",B$row*D$row)" -Style 2) +
        (New-FormulaCell -CellRef "H$row" -Formula "IF(OR(B$row=`"`",E$row=`"`"),`"`",B$row*E$row)" -Style 2) +
        (New-FormulaCell -CellRef "I$row" -Formula "IF(F$row=0,`"`",H$row/F$row)" -Style 3) +
        "</row>"
    )
}

$sheet2Xml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>
    <col min="1" max="1" width="28" customWidth="1"/>
    <col min="2" max="2" width="12" customWidth="1"/>
    <col min="3" max="8" width="14" customWidth="1"/>
    <col min="9" max="9" width="11" customWidth="1"/>
    <col min="10" max="11" width="12" customWidth="1"/>
  </cols>
  <sheetData>
    $($sheet2Rows -join "`n    ")
  </sheetData>
</worksheet>
"@

Set-Content -LiteralPath (Join-Path $tempRoot "[Content_Types].xml") -Value $contentTypes -Encoding UTF8
Set-Content -LiteralPath (Join-Path $tempRoot "_rels\.rels") -Value $rootRels -Encoding UTF8
Set-Content -LiteralPath (Join-Path $tempRoot "xl\workbook.xml") -Value $workbook -Encoding UTF8
Set-Content -LiteralPath (Join-Path $tempRoot "xl\_rels\workbook.xml.rels") -Value $workbookRels -Encoding UTF8
Set-Content -LiteralPath (Join-Path $tempRoot "xl\styles.xml") -Value $styles -Encoding UTF8
Set-Content -LiteralPath (Join-Path $tempRoot "xl\worksheets\sheet1.xml") -Value $sheet1Xml -Encoding UTF8
Set-Content -LiteralPath (Join-Path $tempRoot "xl\worksheets\sheet2.xml") -Value $sheet2Xml -Encoding UTF8

if (Test-Path $outputPath) {
    Remove-Item -LiteralPath $outputPath -Force
}

[System.IO.Compression.ZipFile]::CreateFromDirectory($tempRoot, $outputPath)
Remove-Item -LiteralPath $tempRoot -Recurse -Force

Write-Output "Olusturuldu: $outputPath"
