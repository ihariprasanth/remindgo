$cert = Get-ChildItem -Path Cert:\CurrentUser\My -CodeSigningCert | Where-Object { $_.Subject -match "HARIPRASANTH T" } | Select-Object -First 1

if (-not $cert) {
    Write-Host "Code signing cert not found in CurrentUser\My."
    exit 0
}

Write-Host "Using Certificate: $($cert.Subject)"

$targets = @(
    "release\RemindGo-Setup-3.5.0.exe",
    "release\RemindGo-Portable-3.5.0.exe",
    "D:\PROJECTS\RemindGo\v3.5.0\RemindGo-Setup-3.5.0.exe",
    "D:\PROJECTS\RemindGo\v3.5.0\RemindGo-Portable-3.5.0.exe",
    "C:\Users\HARIPRASANTH\Desktop\RemindGo App\RemindGo-Setup-3.5.0.exe",
    "C:\Users\HARIPRASANTH\Desktop\RemindGo App\RemindGo Setup 3.5.0.exe",
    "C:\Users\HARIPRASANTH\Desktop\RemindGo App\RemindGo-Portable-3.5.0.exe",
    "release\RemindGo-Setup-3.0.0.exe",
    "release\RemindGo-Portable-3.0.0.exe"
)

Get-ChildItem -Path "release\*.exe" -ErrorAction SilentlyContinue | ForEach-Object {
    if ($targets -notcontains $_.FullName) {
        $targets += $_.FullName
    }
}

foreach ($t in $targets) {
    if (Test-Path $t) {
        $sig = Set-AuthenticodeSignature -FilePath $t -Certificate $cert -HashAlgorithm SHA256
        Write-Host "Signed: $t -> Status: $($sig.Status)"
    }
}
Write-Host "Signing complete."
