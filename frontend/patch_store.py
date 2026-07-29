import os

file_path = 'c:/captions/frontend/src/store/playerStore.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

if 'import { temporal } from' not in code:
    code = code.replace("import { create } from 'zustand';", "import { create } from 'zustand';\nimport { temporal } from 'zundo';")

if 'temporal(' not in code:
    code = code.replace(
        'export const usePlayerStore = create<PlayerState>((set) => ({',
        'export const usePlayerStore = create<PlayerState>()(temporal((set) => ({\n'
    )
    # The end bracket replacement is tricky, let's use regex or just standard string replace
    code = code.replace(
        '}));',
        '}), { partialize: (state) => ({ segments: state.segments, overlays: state.overlays }) }));'
    )

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Store updated with Zundo.")
