import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../game.js", import.meta.url), "utf8");

const treasureMatch = source.match(/const dragonTreasureDrops = \[([\s\S]*?)\];/);
assert.ok(treasureMatch, "dragon treasures should keep a concrete drop table");
const rareTreasureMatch = source.match(/const dragonTreasureRareDrops = \[([\s\S]*?)\];/);
assert.ok(rareTreasureMatch, "dragon treasures should keep former gifts in a rare drop table");

const treasureBlock = `${treasureMatch[1]}\n${rareTreasureMatch[1]}`;
for (const item of ["旧金币", "龙鳞片", "银杯", "古钥匙", "镶晶戒指", "龙洞地图"]) {
  assert.match(treasureBlock, new RegExp(item), `dragon treasures should still include ${item}`);
}

for (const item of ["云鳞", "风骨铃", "月角碎片", "雨脉珠", "余烬龙鳞", "火心石", "黑翼扣", "金脊硬币", "旧王印章"]) {
  assert.match(treasureBlock, new RegExp(item), `former dragon gift ${item} should now be found in treasure`);
}

assert.match(source, /function dragonTreasureDrop\(\)/, "dragon treasure should choose common and rare former-gift drops");
assert.match(source, /dragonTreasureRareDrops/, "former dragon gifts should live in a separate rare treasure pool");
assert.match(source, /hash2\([^)]*8160/, "dragon treasure should use a probability roll for rare finds");
assert.match(source, /else if \(target\.kind === "dragonTreasure"\) addItem\(dragonTreasureDrop\(\)\)/, "dragon treasures should use the new probability drop helper");

assert.doesNotMatch(source, /const dragonSpecies = /, "concrete dragon species should be removed");
assert.doesNotMatch(source, /function dragonProfile\(\)/, "dragon profiles should be removed");
assert.doesNotMatch(source, /function dragonSpeech\(\)/, "dragon dialogue should be removed");
assert.doesNotMatch(source, /function dragonGift\(\)/, "direct dragon gifting should be removed");
assert.doesNotMatch(source, /type: "dragon"/, "caves should no longer create dragon encounter events");
assert.doesNotMatch(source, /event\.type === "dragon"/, "rendering should no longer handle dragon encounter events");
assert.doesNotMatch(source, /target\.kind === "dragon"/, "interaction should no longer handle dragon conversations");
assert.doesNotMatch(source, /function drawDragon/, "dragon drawing helpers should be removed");
assert.doesNotMatch(source, /赠予/, "dragon gift memory text should be removed");
assert.doesNotMatch(source, /说 \$\{line\}|说 /, "dragon speech memory text should be removed");
