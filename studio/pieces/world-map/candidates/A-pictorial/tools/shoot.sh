#!/bin/bash
# usage: tools/shoot.sh <round-name> [extra shoot.js args]
cd "$(dirname "$0")/.."
R="$1"; shift
node "C:/Users/farha/Verdant Reach/studio/.claude/skills/pixel-scenes/scripts/shoot.js" render.js --h 568 --at 2 --scale 3 --out "shots/$R" "$@"
