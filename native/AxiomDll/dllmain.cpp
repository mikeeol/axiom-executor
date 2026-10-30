#include <windows.h>
#include <string>
#include <thread>
#include "executor.hpp"
#include "protocol.hpp"

static volatile bool g_run = true;

static void ServeClient(HANDLE pipe) {
    std::string buf;
    char chunk[8192];
    DWORD read = 0;

    while (g_run) {
        BOOL ok = ReadFile(pipe, chunk, sizeof(chunk), &read, nullptr);
        if (!ok || read == 0) break;
        buf.append(chunk, read);

        size_t nl;
        while ((nl = buf.find('\n')) != std::string::npos) {
            std::string line = buf.substr(0, nl);
            buf.erase(0, nl + 1);

            std::string type = JsonField(line, "type");
            std::string reply;

            if (type == "ping") {
                reply = "{\"ok\":true}\n";
            } else if (type == "detach") {
                reply = "{\"ok\":true}\n";
                g_run = false;
            } else if (type == "execute") {
                std::string src = JsonField(line, "source");
                std::string err;
                if (executor::Ready() || executor::Initialize()) err = executor::Execute(src);
                else err = "roblox signatures not found - update signatures.hpp";
                reply = err.empty()
                    ? "{\"ok\":true}\n"
                    : "{\"ok\":false,\"error\":\"" + JsonEscape(err) + "\"}\n";
            } else {
                reply = "{\"ok\":false,\"error\":\"unknown type\"}\n";
            }

            DWORD written = 0;
            WriteFile(pipe, reply.c_str(), (DWORD)reply.size(), &written, nullptr);
        }
    }
}

static DWORD WINAPI ServerThread(LPVOID) {
    while (g_run) {
        HANDLE pipe = CreateNamedPipeW(
            L"\\\\.\\pipe\\AxiomPipe",
            PIPE_ACCESS_DUPLEX,
            PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT,
            PIPE_UNLIMITED_INSTANCES,
            1 << 20, 1 << 20, 0, nullptr);

        if (pipe == INVALID_HANDLE_VALUE) { Sleep(200); continue; }

        BOOL connected = ConnectNamedPipe(pipe, nullptr)
            || GetLastError() == ERROR_PIPE_CONNECTED;

        if (connected) ServeClient(pipe);
        DisconnectNamedPipe(pipe);
        CloseHandle(pipe);
    }
    return 0;
}

BOOL APIENTRY DllMain(HMODULE mod, DWORD reason, LPVOID) {
    if (reason == DLL_PROCESS_ATTACH) {
        DisableThreadLibraryCalls(mod);
        executor::Initialize();
        CreateThread(nullptr, 0, ServerThread, nullptr, 0, nullptr);
    } else if (reason == DLL_PROCESS_DETACH) {
        g_run = false;
    }
    return TRUE;
}
