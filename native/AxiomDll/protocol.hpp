#pragma once
#include <string>

inline std::string JsonUnescape(const std::string& s) {
    std::string out;
    out.reserve(s.size());
    for (size_t i = 0; i < s.size(); ++i) {
        if (s[i] != '\\' || i + 1 >= s.size()) { out += s[i]; continue; }
        char c = s[++i];
        switch (c) {
            case 'n': out += '\n'; break;
            case 't': out += '\t'; break;
            case 'r': out += '\r'; break;
            case '"': out += '"';  break;
            case '\\': out += '\\'; break;
            default: out += c;
        }
    }
    return out;
}

inline std::string JsonEscape(const std::string& s) {
    std::string out;
    out.reserve(s.size() + 16);
    for (char c : s) {
        switch (c) {
            case '"': out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default: out += c;
        }
    }
    return out;
}

// Pulls a string field out of a flat JSON object.
inline std::string JsonField(const std::string& json, const char* key) {
    std::string needle = std::string("\"") + key + "\":\"";
    size_t start = json.find(needle);
    if (start == std::string::npos) return {};
    start += needle.size();
    size_t end = start;
    bool esc = false;
    while (end < json.size()) {
        char c = json[end];
        if (esc) esc = false;
        else if (c == '\\') esc = true;
        else if (c == '"') break;
        ++end;
    }
    return JsonUnescape(json.substr(start, end - start));
}
