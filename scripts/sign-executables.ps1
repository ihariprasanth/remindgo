$cert = Get-ChildItem -Path Cert:\CurrentUser\My -CodeSigningCert | Where-Object { $_.Subject -match "HARIPRASANTH T" } | Select-Object -First 1

if (-not $cert) {
    Write-Host "Code signing cert not found in CurrentUser\My."
    exit 0
}

Write-Host "Using Certificate: $($cert.Subject)"

$targets = @(
    "release\RemindGo-Setup-2.9.1.exe",
    "release\RemindGo-Portable-2.9.1.exe",
    "D:\PROJECTS\RemindGo\v2.9.1\RemindGo-Setup-2.9.1.exe",
    "D:\PROJECTS\RemindGo\v2.9.1\RemindGo-Portable-2.9.1.exe",
    "C:\Users\HARIPRASANTH\Desktop\RemindGo App\RemindGo-Setup-2.9.1.exe",
    "C:\Users\HARIPRASANTH\Desktop\RemindGo App\RemindGo Setup 2.9.1.exe",
    "C:\Users\HARIPRASANTH\Desktop\RemindGo App\RemindGo-Portable-2.9.1.exe"
)

foreach ($t in $targets) {
    if (Test-Path $t) {
        $sig = Set-AuthenticodeSignature -FilePath $t -Certificate $cert -HashAlgorithm SHA256
        Write-Host "Signed: $t -> Status: $($sig.Status)"
    }
}
Write-Host "Signing complete."
