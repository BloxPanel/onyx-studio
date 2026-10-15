$ErrorActionPreference = 'Stop'
$path = 'src\editors\website\websiteExporter.ts'
if (-not (Test-Path $path)) {
    throw 'Run this script from the Onyx Studio project root.'
}
$fullPath = (Resolve-Path $path).Path
$content = [System.IO.File]::ReadAllText($fullPath)

# Check exact code before modifying anything.
$changes = @(
    @{
        Old = 'export function exportWebsite(project: WebProject): string {'
        New = "export function exportWebsite(project: WebProject, layout: 'full' | 'fixed' = 'full'): string {"
    },
    @{
        Old = 'section{width:100%;overflow:hidden}.onyx-section{position:relative;width:${DESIGN_WIDTH}px;margin:auto;transform-origin:top center}'
        New = 'section{width:100%;overflow:hidden}.onyx-section{position:relative;width:${DESIGN_WIDTH}px;margin:${layout === ''fixed'' ? ''auto'' : ''0''};transform-origin:${layout === ''fixed'' ? ''top center'' : ''top left''}}'
    },
    @{
        Old = '@media(max-width:1000px){.onyx-section{margin-left:0;margin-right:0;transform-origin:top left}}'
        New = ''
    },
    @{
        Old = 'const scale=Math.min(1,document.documentElement.clientWidth/width);'
        New = 'const scale=${layout === ''fixed'' ? ''Math.min(1,document.documentElement.clientWidth/width)'' : ''document.documentElement.clientWidth/width''};'
    }
)
foreach ($change in $changes) {
    if (-not $content.Contains($change.Old)) {
        throw "Expected exporter code not found: $($change.Old). No changes made."
    }
}

$backup = "$fullPath.$(Get-Date -Format 'yyyyMMdd-HHmmss').bak"
Copy-Item $fullPath $backup
try {
    foreach ($change in $changes) {
        $content = $content.Replace($change.Old, $change.New)
    }
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($fullPath, $content, $utf8)
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'npm run build failed.' }
    Write-Host 'SUCCESS: Onyx Studio now exports full-width HTML by default.' -ForegroundColor Green
    Write-Host 'Optional fixed-width export: exportWebsite(project, ''fixed'')'
    Write-Host "Backup: $backup"
} catch {
    Copy-Item $backup $fullPath -Force
    Write-Host 'Build failed; original exporter restored.' -ForegroundColor Yellow
    throw
}
