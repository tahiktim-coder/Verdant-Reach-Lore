# Reach Studio starter

Everything a fresh Claude Code instance needs to make visuals for your games the way Kolobok and the Muster were made.

## Set up (once)
1. Unzip. Put the `reach-studio` folder where you keep projects and open a terminal in it.
2. Needs Node 18+ (`node -v`). Optional: `pip install pillow` (contact sheets), `npm i jsdom` (page tests).
3. Start Claude Code in this folder (`claude`). It reads `CLAUDE.md` automatically.
4. First message: "Do Phase 0 from ROADMAP.md."

## What's here
- `CLAUDE.md` the brief: who you are, how to talk to you, the world, the look, the rules
- `ROADMAP.md` the tiny-engine plan in phases, and the first tasks
- `lore/` Verdant Reach, Still Water, Kolobok, the Muster roster, other notebook ideas
- `art/art-direction.md` the quality bar, what you liked and hated, the palettes
- `.claude/skills/pixel-scenes/` the technique, test scripts, and four finished examples
  (Still Water, Kolobok, Muster, Summit Road, Souls scenes)
- `COOKBOOK.md` starts empty; the instance adds how each new piece was built

Optional: export your Game visuals cookbook doc from claude.ai as Markdown and drop it in as `docs/cookbook-claude-ai.md`.
