// AxiomInjector.exe <pid>
// Classic CreateRemoteThread + LoadLibraryW. Resolves the DLL next to the exe.
#include <windows.h>
#include <tlhelp32.h>
#include <cstdio>
#include <string>

static DWORD FindPidByName(const wchar_t* name) {
    HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snap == INVALID_HANDLE_VALUE) return 0;
    PROCESSENTRY32W pe{ sizeof(pe) };
    DWORD pid = 0;
    if (Process32FirstW(snap, &pe)) {
        do {
            if (_wcsicmp(pe.szExeFile, name) == 0) { pid = pe.th32ProcessID; break; }
        } while (Process32NextW(snap, &pe));
    }
    CloseHandle(snap);
    return pid;
}

static std::wstring SelfDir() {
    wchar_t buf[MAX_PATH]{};
    GetModuleFileNameW(nullptr, buf, MAX_PATH);
    std::wstring p(buf);
    size_t slash = p.find_last_of(L"\\/");
    return slash == std::wstring::npos ? L"." : p.substr(0, slash);
}

int wmain(int argc, wchar_t** argv) {
    DWORD pid = 0;
    if (argc >= 2) pid = (DWORD)_wtoi(argv[1]);
    if (!pid) pid = FindPidByName(L"RobloxPlayerBeta.exe");
    if (!pid) { wprintf(L"error: Roblox is not running\n"); return 1; }

    std::wstring dll = SelfDir() + L"\\AxiomDll.dll";
    if (GetFileAttributesW(dll.c_str()) == INVALID_FILE_ATTRIBUTES) {
        wprintf(L"error: AxiomDll.dll not found next to the injector\n");
        return 1;
    }

    HANDLE proc = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);
    if (!proc) { wprintf(L"error: OpenProcess failed (%lu)\n", GetLastError()); return 1; }

    SIZE_T len = (dll.size() + 1) * sizeof(wchar_t);
    LPVOID remote = VirtualAllocEx(proc, nullptr, len, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
    if (!remote) { wprintf(L"error: VirtualAllocEx failed (%lu)\n", GetLastError()); return 1; }

    if (!WriteProcessMemory(proc, remote, dll.c_str(), len, nullptr)) {
        wprintf(L"error: WriteProcessMemory failed (%lu)\n", GetLastError());
        return 1;
    }

    HMODULE k32 = GetModuleHandleW(L"kernel32.dll");
    auto loadLib = (LPTHREAD_START_ROUTINE)GetProcAddress(k32, "LoadLibraryW");
    if (!loadLib) { wprintf(L"error: LoadLibraryW not resolved\n"); return 1; }

    HANDLE thread = CreateRemoteThread(proc, nullptr, 0, loadLib, remote, 0, nullptr);
    if (!thread) { wprintf(L"error: CreateRemoteThread failed (%lu)\n", GetLastError()); return 1; }

    WaitForSingleObject(thread, 15000);
    DWORD exitCode = 0;
    GetExitCodeThread(thread, &exitCode);

    CloseHandle(thread);
    VirtualFreeEx(proc, remote, 0, MEM_RELEASE);
    CloseHandle(proc);

    if (exitCode == 0) { wprintf(L"error: LoadLibraryW returned 0 (DLL failed to load)\n"); return 2; }
    wprintf(L"ok pid=%lu\n", pid);
    return 0;
}
