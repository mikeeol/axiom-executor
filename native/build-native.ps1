# Builds AxiomDll.dll + AxiomInjector.exe and drops them in ../bin
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$out  = Join-Path $here '..\bin'
New-Item -ItemType Directory -Force -Path $out | Out-Null

$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (-not (Test-Path $vswhere)) { throw "Visual Studio Build Tools not found. Install 'Desktop development with C++'." }

$vcvars = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $vcvars) { throw "MSVC toolset missing." }
$vcvars = Join-Path $vcvars 'VC\Auxiliary\Build\vcvars64.bat'
if (-not (Test-Path $vcvars)) { throw "vcvars64.bat missing." }

$cmd = @"
call "$vcvars" >nul
cl /nologo /std:c++17 /EHsc /O2 /LD /MT "$here\AxiomDll\dllmain.cpp" "$here\AxiomDll\executor.cpp" /Fe:"$out\AxiomDll.dll" /Fo:"$here\obj\" /link /DLL
cl /nologo /std:c++17 /EHsc /O2 /MT "$here\AxiomInjector\main.cpp" /Fe:"$out\AxiomInjector.exe" /Fo:"$here\obj\"
"@

cmd /c $cmd
if ($LASTEXITCODE -ne 0) { throw "compile failed" }
Write-Host "Built into $out" -ForegroundColor Green
