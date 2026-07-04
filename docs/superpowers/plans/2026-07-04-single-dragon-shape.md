# Single Dragon Shape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace dragon cave visuals with one readable giant dragon per cave, with eastern dragons coiled into one continuous body.

**Architecture:** Keep all drawing in `game.js` beside the existing dragon render functions. Add focused source tests in `tests/dragon-content.test.mjs` that lock the single-body function names and prevent multi-dragon symbol-cluster helpers from returning.

**Tech Stack:** Static JavaScript canvas game, Node built-in `assert` tests.

## Global Constraints

- Keep species, dialogue, gifts, teleport labels, and cave interaction behavior unchanged.
- Use one visible dragon per cave.
- Eastern dragon must be one coiled continuous body.
- Western dragon must be one standing winged body.
- Preserve the pixel/canvas style and subtle animation.

---

### Task 1: Lock Single-Dragon Rendering Tests

**Files:**
- Modify: `tests/dragon-content.test.mjs`

**Interfaces:**
- Consumes: `game.js` source text.
- Produces: assertions for `drawSingleEasternCoiledDragon`, `easternCoiledDragonSpine`, `drawSingleWesternDragon`, and no repeated dragon-head loops.

- [ ] Add failing assertions for single-dragon function names and coiled eastern silhouette.
- [ ] Run `node tests/dragon-content.test.mjs`; expect failure because new functions do not exist yet.

### Task 2: Implement Single Eastern Coiled Dragon

**Files:**
- Modify: `game.js`

**Interfaces:**
- Produces: `drawSingleEasternCoiledDragon(screenX, screenY, size, tx, ty, profile)` and `easternCoiledDragonSpine(originX, originY, scale, pulse)`.

- [ ] Replace the eastern drawing entry with `drawSingleEasternCoiledDragon`.
- [ ] Generate a looped spine around the cave center.
- [ ] Draw one thick continuous body path, one raised head, one tail, visible scales, mane, whiskers, and claws.
- [ ] Run `node tests/dragon-content.test.mjs`; expect pass for eastern assertions.

### Task 3: Clarify Single Western Dragon

**Files:**
- Modify: `game.js`

**Interfaces:**
- Produces: `drawSingleWesternDragon(screenX, screenY, size, tx, ty, profile)`.

- [ ] Rename the western drawing entry to make the one-dragon intent explicit.
- [ ] Keep one torso, one head, one pair of wings, one tail, chest plates, and two claws.
- [ ] Run `node tests/dragon-content.test.mjs` and `node tests/teleport-dragons.test.mjs`; expect pass.

