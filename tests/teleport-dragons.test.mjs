import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../game.js", import.meta.url), "utf8");

assert.match(source, /"easternDragonCave"/, "teleport options should include eastern dragon cave");
assert.match(source, /"westernDragonCave"/, "teleport options should include western dragon cave");
assert.match(source, /东方龙洞窟/, "teleport label should show eastern dragon cave in Chinese");
assert.match(source, /西方龙洞窟/, "teleport label should show western dragon cave in Chinese");
assert.match(source, /function teleportLabel/, "teleport UI should resolve labels outside biome ids");
assert.match(source, /function teleportDragonKind/, "teleport target should map dragon cave ids to culture");
assert.match(source, /info\.dragonKind !== requiredDragonKind/, "dragon cave search should filter by eastern or western kind");
