# bin/

Drop your native injector here as `AxiomInjector.exe`.

Contract:
- `AxiomInjector.exe <pid>` -> injects the executor DLL into the given Roblox process, exit code 0 on success.
- The DLL opens a named pipe from the list in `src/main/engine.js`
  (`\\.\pipe\AxiomPipe` is checked first) and speaks newline-delimited JSON:
  - in:  {"type":"execute","source":"print('hi')"}
  - out: {"ok":true} / {"ok":false,"error":"..."}
