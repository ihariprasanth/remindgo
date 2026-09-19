param(
    [string]$TargetDir = "release"
)

$cert = Get-ChildItem -Path Cert:\CurrentUser\My -CodeSigningCert | Where-Object { $_.Subject -match "HARIPRASANTH T" } | Select-Object -First 1

if (-not $cert) {
    Write-Host "Code signing cert not found in CurrentUser\My."
    exit 0
}

Write-Host "Using Code Signing Certificate: $($cert.Subject) [Thumbprint: $($cert.Thumbprint)]"

$dir = Join-Path $PSScriptRoot "..\" $TargetDir
if (-not (Test-Path $dir)) {
    Write-Host "Directory $dir does not exist."
    exit 0
}

$exeFiles = Get-ChildItem -Path $dir -Filter "*.exe" -Recurse
foreach ($f in $exeFiles) {
    Write-Host "Signing $($f.FullName)..."
    try {
        $res = Set-AuthenticodeSignature -FilePath $f.FullName -Certificate $cert -TimestampServer "http://timestamp.digicert.com" -HashAlgorithm SHA256
        Write-Host "Signed: $($f.Name) -> Status: $($res.Status)"
    } catch {
        $res = Set-AuthenticodeSignature -FilePath $f.FullName -Certificate $cert -HashAlgorithm SHA256
        Write-Host "Signed without timestamp: $($f.Name) -> Status: $($res.Status)"
    }
}
Write-Host "Signing complete."
