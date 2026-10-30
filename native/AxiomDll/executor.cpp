#include "executor.hpp"
#include "signatures.hpp"
#include <windows.h>
#include <cstdint>
#include <cstring>
#include <vector>

namespace {

struct Offsets {
    size_t scriptContextLuaState = 0x1A8; // adjust per version
};

Offsets g_off;
bool g_ready = false;

using luau_load_t = int(__fastcall*)(void* L, const char* chunk, const char* name, size_t len, int env);
using lua_pcall_t = int(__fastcall*)(void* L, int nargs, int nres, int errfunc);

luau_load_t g_load = nullptr;
lua_pcall_t g_pcall = nullptr;
void* g_L = nullptr;

bool SafeRead(uintptr_t addr, void* out, size_t len) {
    __try { std::memcpy(out, (void*)addr, len); return true; }
    __except (EXCEPTION_EXECUTE_HANDLER) { return false; }
}

uintptr_t Scan(HMODULE mod, const char* pattern) {
    if (!mod) return 0;
    auto* base = (uint8_t*)mod;
    auto* dos = (IMAGE_DOS_HEADER*)base;
    auto* nt = (IMAGE_NT_HEADERS*)(base + dos->e_lfanew);
    size_t size = nt->OptionalHeader.SizeOfImage;

    std::vector<uint8_t> bytes;
    std::vector<bool> mask;
    for (const char* p = pattern; *p; ) {
        if (*p == ' ') { ++p; continue; }
        if (*p == '?') { bytes.push_back(0); mask.push_back(false); ++p; if (*p == '?') ++p; }
        else { bytes.push_back((uint8_t)std::strtoul(std::string(p, 2).c_str(), nullptr, 16)); mask.push_back(true); p += 2; }
    }

    for (size_t i = 0; i + bytes.size() < size; ++i) {
        bool hit = true;
        for (size_t j = 0; j < bytes.size(); ++j) {
            if (mask[j] && base[i + j] != bytes[j]) { hit = false; break; }
        }
        if (hit) return (uintptr_t)(base + i);
    }
    return 0;
}

uintptr_t FollowRip(uintptr_t insn) {
    // mov reg, [rip+disp32]  -> 48 8B xx <disp32>
    int32_t disp = 0;
    if (!SafeRead(insn + 3, &disp, sizeof(disp))) return 0;
    return insn + 7 + disp;
}

} // namespace

namespace executor {

bool Ready() { return g_ready; }

bool Initialize() {
    HMODULE game = GetModuleHandleW(L"RobloxPlayerBeta.exe");
    if (!game) return false;

    uintptr_t dmSite = Scan(game, sigs::DataModel);
    if (!dmSite) return false;
    uintptr_t dmPtr = FollowRip(dmSite);
    if (!dmPtr) return false;

    void* dataModel = nullptr;
    if (!SafeRead(dmPtr, &dataModel, sizeof(dataModel)) || !dataModel) return false;

    // DataModel -> ScriptContext via the getter pattern.
    uintptr_t scSite = Scan(game, sigs::ScriptCtx);
    if (!scSite) return false;

    void* scriptContext = nullptr;
    {
        void** vt = nullptr;
        if (!SafeRead((uintptr_t)dataModel, &vt, sizeof(vt)) || !vt) return false;
        void* fn = nullptr;
        if (!SafeRead((uintptr_t)vt + 0x8, &fn, sizeof(fn)) || !fn) return false;
        auto getter = (void*(__fastcall*)(void*))fn;
        __try { scriptContext = getter(dataModel); }
        __except (EXCEPTION_EXECUTE_HANDLER) { return false; }
    }
    if (!scriptContext) return false;

    uintptr_t lsSite = Scan(game, sigs::LuaState);
    if (!lsSite) return false;
    // The mov displacement in `mov rbx,[rsi+disp32]` gives the member offset.
    int32_t disp = 0;
    if (!SafeRead(lsSite + 3, &disp, sizeof(disp))) return false;
    g_off.scriptContextLuaState = (size_t)disp;

    if (!SafeRead((uintptr_t)scriptContext + g_off.scriptContextLuaState, &g_L, sizeof(g_L)) || !g_L) return false;

    uintptr_t loadSite = Scan(game, sigs::LuauLoad);
    if (!loadSite) return false;
    g_load = (luau_load_t)loadSite;

    HMODULE lua = GetModuleHandleW(L"RobloxPlayerBeta.exe");
    g_pcall = (lua_pcall_t)Scan(lua, "48 89 5C 24 ? 48 89 74 24 ? 57 48 83 EC 20 41 8B D8");
    if (!g_pcall) return false;

    g_ready = true;
    return true;
}

std::string Execute(const std::string& source) {
    if (!g_ready) return "executor not initialized";
    if (!g_L) return "no lua_State";

    __try {
        if (g_load(g_L, source.c_str(), "=axiom", source.size(), 0) != 0)
            return "luau_load failed (syntax error)";
        if (g_pcall(g_L, 0, 0, 0) != 0)
            return "script raised an error";
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        g_ready = false;
        return "access violation during execution";
    }
    return {};
}

} // namespace executor
