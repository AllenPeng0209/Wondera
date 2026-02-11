"""
從 apps/mobile/src/data/seeds.js 擷取 roleSeeds 的 persona、greeting、script 等，
寫出 roles_from_mobile.json 供 seed_supabase 使用。
在專案根目錄或 services/backend/seed 執行：python extract_mobile_roles.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]  # repo root (seed -> backend -> services -> repo)
MOBILE_SEEDS = ROOT / "apps" / "mobile" / "src" / "data" / "seeds.js"
OUT_JSON = Path(__file__).resolve().parents[0] / "roles_from_mobile.json"
ROLE_IDS = ["antoine", "edward", "kieran"]


def find_template_literal_end(text: str, start: int) -> int:
    """從 start 開始，找到 persona: ` 之後的結束反引號（未轉義）的位置。"""
    i = start
    while i < len(text):
        if text[i] == "\\":
            i += 2
            continue
        if text[i] == "`":
            return i
        i += 1
    return -1


def find_single_quoted_end(text: str, start: int) -> int:
    """從 start 開始（在開頭 ' 之後），找到結束的單引號（未轉義）。"""
    i = start
    while i < len(text):
        if text[i] == "\\":
            i += 2
            continue
        if text[i] == "'":
            return i
        i += 1
    return -1


def extract_script_array(text: str, start: int) -> tuple[list, int]:
    """從 script: [ 開始，回傳 (script 字串列表, 結束 ] 的下一格索引)。"""
    bracket = text.index("[", start)
    depth = 1
    i = bracket + 1
    current = ""
    in_string = None
    escape = False
    result = []
    while i < len(text) and depth > 0:
        c = text[i]
        if escape:
            if in_string == "'":
                current += c
            escape = False
            i += 1
            continue
        if c == "\\" and in_string:
            escape = True
            if in_string == "'":
                current += c
            i += 1
            continue
        if in_string == "'":
            if c == "'":
                result.append(current)
                current = ""
                in_string = None
            else:
                current += c
            i += 1
            continue
        if c == "'" and depth == 1:
            in_string = "'"
            i += 1
            continue
        if c == "[":
            depth += 1
            i += 1
            continue
        if c == "]":
            depth -= 1
            if depth == 0:
                return result, i + 1
            i += 1
            continue
        i += 1
    return result, i


def extract_one_role(content: str, role_id: str) -> dict | None:
    """從 seeds.js 內容擷取單一角色的 persona, greeting, script, mood, title, city, description, tags。"""
    pattern = rf"\bid\s*:\s*['\"]{re.escape(role_id)}['\"]"
    m = re.search(pattern, content)
    if not m:
        return None
    start = m.start()
    # 往後找 persona: `
    persona_m = re.search(r"\bpersona\s*:\s*`", content[start:])
    if not persona_m:
        return None
    persona_start = start + persona_m.end()
    persona_end = find_template_literal_end(content, persona_start)
    if persona_end == -1:
        return None
    persona = content[persona_start:persona_end]

    # greeting: '...'
    greeting_m = re.search(r"\bgreeting\s*:\s*'", content[persona_end:])
    if not greeting_m:
        greeting = ""
    else:
        g_start = persona_end + greeting_m.end()
        g_end = find_single_quoted_end(content, g_start)
        greeting = content[g_start:g_end].replace("\\n", "\n").replace("\\'", "'") if g_end != -1 else ""

    # script: [ ... ]
    script_m = re.search(r"\bscript\s*:\s*\[", content[persona_end:])
    script = []
    if script_m:
        script, _ = extract_script_array(content, persona_end + script_m.start())

    # mood, title, city, description, tags（簡短字串或陣列）
    def field_re(name: str, kind: str = "str") -> str | list:
        if kind == "str":
            pat = rf"\b{re.escape(name)}\s*:\s*['\"]([^'\"]*)['\"]"
        else:
            pat = rf"\b{re.escape(name)}\s*:\s*\[(.*?)\]"
        mm = re.search(pat, content[persona_end:persona_end + 2000], re.DOTALL)
        if not mm:
            return "" if kind == "str" else []
        if kind == "str":
            return mm.group(1).strip()
        inner = mm.group(1)
        tags = re.findall(r"['\"]([^'\"]*)['\"]", inner)
        return tags

    mood = field_re("mood")
    title = field_re("title")
    city = field_re("city")
    description = field_re("description")
    tags = field_re("tags", "list")

    return {
        "id": role_id,
        "name": {"antoine": "Antoine", "edward": "Edward Whitmore", "kieran": "Kieran Voss"}.get(role_id, role_id),
        "persona": persona.strip(),
        "mood": mood,
        "greeting": greeting,
        "script": script,
        "title": title,
        "city": city,
        "description": description,
        "tags": tags,
    }


def main():
    if not MOBILE_SEEDS.exists():
        print(f"Not found: {MOBILE_SEEDS}")
        return
    content = MOBILE_SEEDS.read_text(encoding="utf-8")
    roles = []
    for rid in ROLE_IDS:
        r = extract_one_role(content, rid)
        if r:
            roles.append(r)
            print(f"Extracted: {rid} (persona len={len(r['persona'])}, script len={len(r['script'])})")
    if not roles:
        print("No roles extracted.")
        return
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(roles, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_JSON}")


if __name__ == "__main__":
    main()
