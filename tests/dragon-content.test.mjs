import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../game.js", import.meta.url), "utf8");

const speciesMatch = source.match(/const dragonSpecies = (\{[\s\S]*?\n\});/);
assert.ok(speciesMatch, "dragonSpecies should define concrete dragon varieties");

const speciesBlock = speciesMatch[1];
const easternCount = (speciesBlock.match(/culture: "eastern"/g) || []).length;
const westernCount = (speciesBlock.match(/culture: "western"/g) || []).length;

assert.ok(easternCount >= 3, "there should be at least three eastern dragon varieties");
assert.ok(westernCount >= 3, "there should be at least three western dragon varieties");
assert.match(speciesBlock, /Cloud Serpent|Moonhorn Long|Rainscale Dragon/, "eastern dragons should include English creation names");
assert.match(speciesBlock, /Ember Drake|Blackwing Wyrm|Goldback Dragon/, "western dragons should include English creation names");
assert.match(speciesBlock, /giftChance: 0\.[0-9]+/, "dragon varieties should control gift chance");

assert.match(source, /function dragonProfile\(\)/, "dragonProfile should choose one stable dragon for a cave");
assert.match(source, /function drawDragonHead/, "dragon drawing should have a visible head");
assert.match(source, /function drawDragonEye/, "dragon drawing should have visible facial features");
assert.match(source, /function drawDragonHorn/, "dragon drawing should have visible horns");
assert.match(source, /function drawDragonClaw/, "dragon drawing should have visible claws");
assert.match(source, /function drawWesternWing/, "western dragons should have visible wings");
assert.match(source, /function easternDragonSpine/, "eastern dragons should use a continuous curling spine");
assert.match(source, /function drawEasternMane/, "eastern dragons should have a mane like the references");
assert.match(source, /function drawDragonWhiskers/, "eastern dragons should have long whiskers");
assert.match(source, /function drawWesternChestPlates/, "western dragons should have a plated chest silhouette");
assert.match(source, /visible: dragonDistance < 1\.2/, "only the dragon center should draw the giant dragon");
assert.match(source, /if \(!event\.visible\) return;/, "nearby dragon interaction area should not draw extra dragons");
assert.doesNotMatch(source, /function drawDragonSymbolLines/, "dragon drawing should not be a block of symbol text");
assert.match(source, /scalePattern: \[/, "dragon varieties should define scale symbols");
assert.match(source, /ctx\.arc\(/, "dragon drawing should use shaped body parts, not only text");
assert.match(source, /quadraticCurveTo/, "dragon bodies should use curved silhouettes");
assert.match(source, /dragonProfile\(\)\.name|profile\.name/, "interaction should use the concrete dragon name");
