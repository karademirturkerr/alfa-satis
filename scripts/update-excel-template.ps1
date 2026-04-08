param(
  [Parameter(Mandatory = $true)]
  [string]$WorkbookPath,

  [Parameter(Mandatory = $true)]
  [string]$CsvPath,

  [string]$OutputPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-CellColumn([string]$cellRef) {
  return ([regex]::Match($cellRef, "^[A-Z]+")).Value
}

function Get-CellRow([string]$cellRef) {
  return [int]([regex]::Match($cellRef, "[0-9]+$")).Value
}

function Normalize-ProductName([string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) {
    return ""
  }

  $map = @{
    "ı" = "i"
    "İ" = "i"
    "ş" = "s"
    "Ş" = "s"
    "ğ" = "g"
    "Ğ" = "g"
    "ü" = "u"
    "Ü" = "u"
    "ö" = "o"
    "Ö" = "o"
    "ç" = "c"
    "Ç" = "c"
  }

  $normalized = $value.Trim().ToLowerInvariant()
  foreach ($key in $map.Keys) {
    $normalized = $normalized.Replace($key, $map[$key])
  }

  return $normalized
}

function Parse-DecimalOrZero($value) {
  if ($null -eq $value) {
    return 0
  }

  $text = [string]$value
  if ([string]::IsNullOrWhiteSpace($text)) {
    return 0
  }

  $text = $text.Trim().Replace(".", ",")
  $number = 0.0
  [void][double]::TryParse($text, [System.Globalization.NumberStyles]::Any, [System.Globalization.CultureInfo]::GetCultureInfo("tr-TR"), [ref]$number)
  return $number
}

function Parse-IntOrZero($value) {
  return [int][math]::Round((Parse-DecimalOrZero $value), 0)
}

if (-not (Test-Path -LiteralPath $WorkbookPath)) {
  throw "Excel dosyasi bulunamadi: $WorkbookPath"
}

if (-not (Test-Path -LiteralPath $CsvPath)) {
  throw "CSV dosyasi bulunamadi: $CsvPath"
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $baseName = [System.IO.Path]::GetFileNameWithoutExtension($WorkbookPath)
  $directory = [System.IO.Path]::GetDirectoryName($WorkbookPath)
  $OutputPath = Join-Path $directory "$baseName-guncel.xlsx"
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("excel-sync-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempRoot | Out-Null

try {
  Copy-Item -LiteralPath $WorkbookPath -Destination $OutputPath -Force

  $extractPath = Join-Path $tempRoot "unzipped"
  New-Item -ItemType Directory -Path $extractPath | Out-Null
  Expand-Archive -LiteralPath $OutputPath -DestinationPath $extractPath -Force

  $sheetPath = Join-Path $extractPath "xl\worksheets\sheet2.xml"
  $sharedStringsPath = Join-Path $extractPath "xl\sharedStrings.xml"
  $workbookPath = Join-Path $extractPath "xl\workbook.xml"

  [xml]$sheetXml = Get-Content -LiteralPath $sheetPath -Raw
  [xml]$sharedXml = Get-Content -LiteralPath $sharedStringsPath -Raw
  [xml]$workbookXml = Get-Content -LiteralPath $workbookPath -Raw

  $nsSheet = New-Object System.Xml.XmlNamespaceManager($sheetXml.NameTable)
  $nsSheet.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")

  $nsShared = New-Object System.Xml.XmlNamespaceManager($sharedXml.NameTable)
  $nsShared.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")

  $sharedStrings = @()
  foreach ($si in $sharedXml.SelectNodes("//x:si", $nsShared)) {
    $sharedStrings += $si.InnerText
  }

  function Get-CellText($cell) {
    if ($null -eq $cell) { return "" }
    $valueNode = $cell.SelectSingleNode("x:v", $nsSheet)
    if ($null -eq $valueNode) { return "" }
    if ($cell.t -eq "s") {
      $index = [int]$valueNode.InnerText
      if ($index -ge 0 -and $index -lt $sharedStrings.Count) {
        return [string]$sharedStrings[$index]
      }
    }
    return [string]$valueNode.InnerText
  }

  function Get-OrCreate-Cell([xml]$xml, $rowNode, [string]$cellRef) {
    $cell = $rowNode.SelectSingleNode("x:c[@r='$cellRef']", $nsSheet)
    if ($null -ne $cell) {
      return $cell
    }

    $cell = $xml.CreateElement("c", $nsSheet.LookupNamespace("x"))
    $null = $cell.SetAttribute("r", $cellRef)
    $rowNode.AppendChild($cell) | Out-Null
    return $cell
  }

  function Set-CellNumber([xml]$xml, $rowNode, [string]$cellRef, $numberValue) {
    $cell = Get-OrCreate-Cell $xml $rowNode $cellRef
    if ($cell.HasAttribute("t")) {
      $cell.RemoveAttribute("t")
    }
    $vNode = $cell.SelectSingleNode("x:v", $nsSheet)
    if ($null -eq $vNode) {
      $vNode = $xml.CreateElement("v", $nsSheet.LookupNamespace("x"))
      $cell.AppendChild($vNode) | Out-Null
    }
    $vNode.InnerText = [string]$numberValue
  }

  function Set-CellInlineText([xml]$xml, $rowNode, [string]$cellRef, [string]$textValue) {
    $cell = Get-OrCreate-Cell $xml $rowNode $cellRef
    $null = $cell.SetAttribute("t", "inlineStr")
    foreach ($child in @($cell.ChildNodes)) {
      $cell.RemoveChild($child) | Out-Null
    }
    $isNode = $xml.CreateElement("is", $nsSheet.LookupNamespace("x"))
    $tNode = $xml.CreateElement("t", $nsSheet.LookupNamespace("x"))
    $tNode.InnerText = $textValue
    $isNode.AppendChild($tNode) | Out-Null
    $cell.AppendChild($isNode) | Out-Null
  }

  $csvRows = Import-Csv -LiteralPath $CsvPath -Delimiter ";"
  if ($csvRows.Count -lt 1) {
    throw "CSV icinde veri bulunamadi."
  }

  $dateRow = $csvRows | Select-Object -First 1
  $reportDate = [string]$dateRow.Tarih
  if ([string]::IsNullOrWhiteSpace($reportDate)) {
    $reportDate = Get-Date -Format "yyyy-MM-dd"
  }

  $productRows = @{}
  foreach ($row in $sheetXml.SelectNodes("//x:sheetData/x:row", $nsSheet)) {
    $rowNumber = [int]$row.r
    if ($rowNumber -lt 6) { continue }
    $nameCell = $row.SelectSingleNode("x:c[starts-with(@r,'A')]", $nsSheet)
    $productName = Normalize-ProductName (Get-CellText $nameCell)
    if (-not [string]::IsNullOrWhiteSpace($productName)) {
      $productRows[$productName] = $row
    }
  }

  $productDataRows = $csvRows | Where-Object { -not [string]::IsNullOrWhiteSpace($_.'Urun Adi') }
  $expenseValue = 0
  foreach ($row in $productDataRows) {
    $expenseValue += Parse-DecimalOrZero $row.Gider
  }

  foreach ($entry in $productRows.GetEnumerator()) {
    $rowNode = $entry.Value
    $rowNumber = [int]$rowNode.r
    Set-CellNumber $sheetXml $rowNode ("B{0}" -f $rowNumber) 0
  }

  foreach ($csvRow in $productDataRows) {
    $normalizedName = Normalize-ProductName $csvRow.'Urun Adi'
    if (-not $productRows.ContainsKey($normalizedName)) {
      continue
    }

    $rowNode = $productRows[$normalizedName]
    $rowNumber = [int]$rowNode.r
    Set-CellNumber $sheetXml $rowNode ("B{0}" -f $rowNumber) (Parse-IntOrZero $csvRow.'Satilan Adet')
  }

  $dateTargetRow = $sheetXml.SelectSingleNode("//x:sheetData/x:row[@r='2']", $nsSheet)
  $expenseTargetRow = $sheetXml.SelectSingleNode("//x:sheetData/x:row[@r='3']", $nsSheet)

  Set-CellInlineText $sheetXml $dateTargetRow "B2" $reportDate
  Set-CellNumber $sheetXml $expenseTargetRow "E3" $expenseValue

  $calcPr = $workbookXml.workbook.calcPr
  if ($null -eq $calcPr) {
    $calcPr = $workbookXml.CreateElement("calcPr", $workbookXml.DocumentElement.NamespaceURI)
    $workbookXml.workbook.AppendChild($calcPr) | Out-Null
  }
  $null = $calcPr.SetAttribute("calcMode", "auto")
  $null = $calcPr.SetAttribute("fullCalcOnLoad", "1")
  $null = $calcPr.SetAttribute("forceFullCalc", "1")

  $sheetXml.Save($sheetPath)
  $workbookXml.Save($workbookPath)

  Remove-Item -LiteralPath $OutputPath -Force
  Compress-Archive -Path (Join-Path $extractPath '*') -DestinationPath $OutputPath -Force

  Write-Output "Tamamlandi: $OutputPath"
}
finally {
  if (Test-Path -LiteralPath $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
  }
}
