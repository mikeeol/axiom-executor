#Requires AutoHotkey v2.0
#SingleInstance Force

global OWNER := "YOUR_GITHUB_USERNAME"
global REPO  := "axiom-executor"
global BRANCH := "main"

global WORK := A_Temp "\AxiomBuild"
global ZIP  := A_Temp "\axiom.zip"

MsgBox "Axiom Executor - builder`n`nThis downloads the source, installs dependencies and builds Setup.exe.", "Axiom Builder", 0x40

DirCreate WORK
Try FileDelete ZIP

url := "https://codeload.github.com/" OWNER "/" REPO "/zip/refs/heads/" BRANCH
status("Downloading source...")
Download(url, ZIP)

status("Extracting...")
RunWait 'powershell -NoProfile -Command "Expand-Archive -LiteralPath ''' ZIP ''' -DestinationPath ''' WORK ''' -Force"',, "Hide"

root := ""
Loop Files, WORK "\*", "D"
    root := A_LoopFileFullPath
if (root = "")
    Fail("Extraction failed.")

if !FileExist(root "\package.json")
    Fail("package.json not found - is the repo branch correct?")

if !NodeExists() {
    status("Installing Node.js (winget)...")
    RunWait 'powershell -NoProfile -Command "winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements"',, "Hide"
    Sleep 3000
    if !NodeExists()
        Fail("Node.js install failed. Install it from nodejs.org, then rerun.")
}

status("Installing dependencies...")
RunWait A_ComSpec ' /c cd /d "' root '" && npm install --no-audit --no-fund > "' WORK '\npm.log" 2>&1',, "Hide"
if (ErrorLevel)
    Fail("npm install failed. Log: " WORK "\npm.log")

status("Building the installer...")
RunWait A_ComSpec ' /c cd /d "' root '" && npm run dist > "' WORK '\build.log" 2>&1',, "Hide"
if (ErrorLevel)
    Fail("Build failed. Log: " WORK "\build.log")

exe := ""
Loop Files, root "\dist\*.exe"
    exe := A_LoopFileFullPath
if (exe = "")
    Fail("No installer produced. Log: " WORK "\build.log")

status("Launching installer...")
Run '"' exe '"'
ExitApp

status(text) {
    ToolTip "Axiom: " text
}

NodeExists() {
    RunWait A_ComSpec ' /c where node >nul 2>&1',, "Hide"
    return ErrorLevel = 0
}

Download(url, dest) {
    RunWait 'powershell -NoProfile -Command "Invoke-WebRequest -Uri ''' url ''' -OutFile ''' dest ''' -UseBasicParsing"',, "Hide"
    if !FileExist(dest)
        Fail("Download failed. Check the repo name and that it is public.")
}

Fail(msg) {
    ToolTip
    MsgBox msg, "Axiom Builder", 0x10
    ExitApp
}
