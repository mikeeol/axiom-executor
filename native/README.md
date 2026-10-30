# native/

    powershell -ExecutionPolicy Bypass -File build-native.ps1

Requires Visual Studio Build Tools with the C++ workload. Output lands in `../bin/`
as `AxiomDll.dll` + `AxiomInjector.exe`, which is exactly where `engine.js` looks.

The DLL only talks to `\\.\pipe\AxiomPipe`. `executor.cpp` is the only version-sensitive
file; the four patterns in `signatures.hpp` need refreshing when Roblox patches.

Verify by hand before trusting the GUI:

    .\bin\AxiomInjector.exe <roblox pid>

Then, from another shell, echo `{"type":"ping"}` into the pipe and expect `{"ok":true}`.
