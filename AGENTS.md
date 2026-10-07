# Verdant Reach: brief for any AI working in this repo

This repository is the single source of truth for Farhad's (NakoFrish) fantasy world **Verdant Reach** and for the
Reach Studio game project built inside it. Read this file first, then the files it points to.

## What is here

| Path | What it is |
|---|---|
| `README.md` and `01-*.md` to `18-*.md` | The world bible. `README.md` explains the status tags and the source hierarchy. Start there. |
| `10-contradictions-and-fixes.md` | Every known conflict in the lore, with proposed fixes that are **waiting for Farhad's decision**. Do not resolve them on your own. |
| `11-open-questions.md` | Questions the lore leaves open on purpose. Do not invent answers casually. |
| `13-writing-guide.md` | Rules for writing new Verdant Reach material. |
| `references/` | 43 of Farhad's TikTok images. A loose idea bank, not rules. Catalogued in `14-visual-references.md`. |
| `studio/` | The Reach Studio: the games' visuals, prototypes, lore notes and the plan for a tiny engine. Its own brief is `studio/CLAUDE.md`. |
| `studio/lore/*.md` | Farhad's own notes, marked `[his]`, `[working]`, `[proposed]`. Top-tier lore sources. |
| `studio/.claude/skills/pixel-scenes/` | The house art method (code-rendered pixel art) with finished examples. |
| `studio/art/` | Art direction, the technique library, the quality rubric, and headless renders of every piece under `frames/`. |
| `studio/engine/EXTRACTION-MAP.md` | What the pieces share and what to extract into the engine first. |
| `studio/pieces/world-map/` | The world map in progress: finished world data (`src/world.js`) and three candidate looks. Not finished. |
| `maps/` | An early map draft that Farhad rejected. Kept only as a record of what not to do. |

## Rules

1. **Status tags are law.** Every lore bullet carries a tag (`[CANON]`, `[PROVISIONAL]`, `[FLAVOR]`, `[PROPOSED FIX]`, `[LEGEND]`,
   `[STUDIO PROPOSAL]`, `[GAME TEXT]`, `[ARCHIVE]`, `[NOT CANON]`). `README.md` defines them. Never promote anything to
   `[CANON]` yourself; only Farhad does that. Mark your own ideas as proposals.
2. **His notes outrank everything.** Dedicated lore (`studio/lore/*.md` marked `[his]`, and `[CANON]` bullets) beats TikTok
   captions, game text, roster stats and any assistant idea.
3. **Conflicts are merged, not deleted.** When two real pieces of lore disagree, propose a fix that keeps the strongest parts
   of both and add it to `10-contradictions-and-fixes.md` as a new entry. Do not quietly rewrite either side.
4. **Never borrow recognizable signatures from famous works** (a continent-spanning wall of mountains, a Mordor, a Hogwarts).
   No "AM" as a place name, no Agartha. See `12-archive.md` for everything rejected.
5. **Visuals follow the house style.** Read `studio/CLAUDE.md` and `studio/.claude/skills/pixel-scenes/SKILL.md` before making
   any image or game piece. The quality bar is the Still Water boat frame (`studio/art/frames/still-water/01_boat_day_reference.png`).
   Score your work with `studio/art/quality-rubric.md`. Render headless, look at the PNG, fix, repeat.
6. **How to talk to Farhad.** Short answers, main points first. Honest critique, not encouragement: say what is weak or untested.
   He reads code but is not a strong programmer: explain choices in plain words.
7. **Keep the bible consistent.** If you add a file, add it to the contents table in `README.md`. Cross-references use the
   file names and the entry IDs (`R1`, `P1`, `S1`) in `10-contradictions-and-fixes.md`.

## Current state (2026-10-07)

- The bible is complete against everything shared so far. 19 studio-vs-bible conflicts (S1 to S19) await Farhad's decision.
- Engine tuning (Phase 0 of `studio/ROADMAP.md`) is done: technique library, rubric, extraction map, 3D options paper.
- The world map piece is mid-build: world data is finished and checked; three candidate renderers exist but were not judged or polished.
