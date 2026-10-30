#pragma once
// Signature table. Update these when Roblox patches.
// Each entry is a byte pattern; '?' is a wildcard nibble.
namespace sigs {
    // DataModel* passed to the ScriptContext getter.
    constexpr const char* DataModel   = "48 8B 0D ? ? ? ? 48 8B 01 48 8B 40 ? FF D0";
    // ScriptContext* returned from DataModel.
    constexpr const char* ScriptCtx   = "48 8B 01 48 8B 80 ? ? ? ? 48 85 C0 74 ? 48 8B 08";
    // lua_State* member inside ScriptContext.
    constexpr const char* LuaState    = "48 8B 9E ? ? ? ? 48 85 DB 74 ? 48 8B CB";
    // luau_load prologue.
    constexpr const char* LuauLoad    = "48 89 5C 24 ? 48 89 74 24 ? 57 48 83 EC 30";
}
