#pragma once
#include <string>

namespace executor {
    bool Initialize();
    // Returns empty string on success, otherwise a human-readable error.
    std::string Execute(const std::string& source);
    bool Ready();
}
