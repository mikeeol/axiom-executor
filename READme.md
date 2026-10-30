# Axiom Executor

Premium dark-purple Electron script executor for Roblox. Monaco Lua editor, tabs,
script explorer, searchable library, console, custom-script injector, secure Electron
defaults, NSIS installer with Desktop + Start Menu shortcuts.

## Unlock

Type in the console:

    /enablecode AXIOM-2026

## Build

    npm install
    npm run dist        # -> dist/Axiom-Executor-Setup-2.0.0.exe

## Injection

`bin/AxiomInjector.exe` is the native side. Put any DLL injector there that takes a
PID as `argv[1]`; the executor DLL must expose a named pipe (`\\.\pipe\AxiomPipe`
first) speaking newline-delimited JSON. Pipe names live at the top of
`src/main/engine.js`.
