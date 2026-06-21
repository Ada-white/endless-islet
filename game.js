const canvas = document.querySelector("#world");
const ctx = canvas.getContext("2d", { alpha: false });
const placeEl = document.querySelector("#place");
const biomeEl = document.querySelector("#biome");
const eventEl = document.querySelector("#event");
const weatherEl = document.querySelector("#weather");
const timeEl = document.querySelector("#time");
const nearbyEl = document.querySelector("#nearby");
const itemsEl = document.querySelector("#items");
const memoriesEl = document.querySelector("#memories");
const memoryDetailEl = document.querySelector("#memoryDetail");
const pauseBtn = document.querySelector("#pause");
const interactBtn = document.querySelector("#interact");
const touchInteractBtn = document.querySelector("#touchInteract");
const discardBtn = document.querySelector("#discard");
const seedBtn = document.querySelector("#seed");
const mapBtn = document.querySelector("#map");
const teleportBtn = document.querySelector("#teleport");
const teleportPanel = document.querySelector("#teleportPanel");
const teleportListEl = document.querySelector("#teleportList");
const teleportGoBtn = document.querySelector("#teleportGo");
const miniEl = document.querySelector("#mini");
const speedButtons = [...document.querySelectorAll("[data-speed]")];

const miniCanvas = document.createElement("canvas");
miniCanvas.width = 66;
miniCanvas.height = 66;
miniEl.appendChild(miniCanvas);
const miniCtx = miniCanvas.getContext("2d", { alpha: false });

const TILE = 22;
const WORLD_SCALE = 0.047;
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", ui-monospace, SFMono-Regular, Menlo, monospace';
const keys = new Set();
const pointer = { active: false, x: 0, y: 0 };

let seed = Math.floor(Math.random() * 100000);
let paused = false;
let showMini = true;
let mapExpanded = false;
let lastTime = 0;
let elapsed = 0;
let uiTick = 0;
let speedSetting = "medium";
let lastTrailTime = 0;
let lastInteractKey = false;
let lastManualInteract = 0;
let lastManualDiscard = 0;
let selectedItem = "";
let carriedAnimal = null;
let worldMode = "surface";
let caveOrigin = null;
let surfaceReturn = null;
let teleportOpen = false;
let selectedTeleport = "grass";

const trails = [];
const inventory = new Map();
const droppedAnimals = [];
const suppressedRare = new Set();
const harvestedPlants = new Map();
const MEMORY_KEY = "endless-island-memory-v1";
const memory = loadMemory();
const waterTerrain = new Set(["ocean", "deep", "water"]);
const trackableTerrain = new Set(["grass", "beach", "desert", "stone", "snow", "ember", "ocean", "deep", "water", "cave", "dragonCave"]);
const solidTerrain = new Set(["caveWall"]);

const speedMultipliers = {
  low: 0.68,
  medium: 1,
  high: 1.42,
};

const teleportOptions = [
  "grass",
  "forest",
  "swamp",
  "beach",
  "desert",
  "stone",
  "snow",
  "ember",
  "water",
  "deep",
  "ocean",
  "cave",
  "easternDragonCave",
  "westernDragonCave",
];

function setMapSize() {
  const size = mapExpanded ? 176 : 66;
  if (miniCanvas.width !== size) {
    miniCanvas.width = size;
    miniCanvas.height = size;
    miniCtx.imageSmoothingEnabled = false;
  }
}

function mapColor(tile, event, settlement) {
  if (tile.id === "caveWall") return "#100d14";
  if (tile.id === "cave") return event?.type === "crystalField" ? "#6bcbd8" : "#2a2634";
  if (tile.id === "dragonCave") return event?.type === "dragon" ? "#c9a06f" : "#302019";
  if (waterTerrain.has(tile.id)) return tile.id === "ocean" ? "#162f42" : "#263f4b";
  let color = tile.id === "forest" ? "#314933" : tile.id === "desert" || tile.id === "beach" ? "#5d503d" : tile.id === "ember" ? "#51352f" : tile.id === "snow" ? "#77746b" : tile.id === "swamp" ? "#454f36" : "#3e4f3b";
  if (tile.island) color = tile.id === "beach" ? "#776745" : color;
  if (settlement) color = "#cfc3a2";
  if (event?.type === "snowMountain") color = "#eaf8ff";
  if (event?.type === "flowerSea") color = "#ff8eb8";
  if (event?.type === "migration") color = "#ffbd79";
  if (event?.type === "sakuraGiant") color = "#ff9fca";
  if (event?.type === "crystalField") color = "#aef7ff";
  if (event?.type === "plantPatch") color = event.plant.color;
  if (event?.type === "desertedIsland") color = "#efe0a7";
  if (event?.type === "caveMouth" || event?.type === "caveExit") color = "#111111";
  if (event?.type === "giantCrystal") color = "#e0c8ff";
  if (event?.type === "dragonTreasure") color = "#ffd36c";
  if (event?.type === "dragonEgg") color = "#d7f0df";
  return color;
}

const player = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  facing: 1,
};

const biomes = {
  ocean: { name: "远海", color: "#35566d", dark: "#101a23", walk: 0.54, glyphs: ["≈", "~", "○", "·"] },
  deep: { name: "深海", color: "#496a7d", dark: "#18232b", walk: 0.42, glyphs: ["○", "。", "~", "·"] },
  water: { name: "浅滩", color: "#5f8ba0", dark: "#22313a", walk: 0.62, glyphs: ["~", "≈", "○", "·"] },
  beach: { name: "贝壳海滩", color: "#b7a37a", dark: "#423b2c", walk: 0.92, glyphs: [".", "'", ",", "˙"] },
  grass: { name: "草原", color: "#78906f", dark: "#263126", walk: 1, glyphs: ["'", ";", "·", ","] },
  forest: { name: "苔藓森林", color: "#6f9272", dark: "#1f2c22", walk: 0.86, glyphs: ["♣", "♧", "♠", "'"] },
  swamp: { name: "芦苇沼泽", color: "#879071", dark: "#2b3026", walk: 0.72, glyphs: ["|", "}", "{", "~"] },
  desert: { name: "日晒荒原", color: "#b99b73", dark: "#3e3326", walk: 0.88, glyphs: ["`", ".", ":", ","] },
  stone: { name: "石脊高地", color: "#97948a", dark: "#32312e", walk: 0.75, glyphs: ["/", "\\", "·", "|"] },
  snow: { name: "白色山脊", color: "#d8d6cc", dark: "#45443f", walk: 0.72, glyphs: ["*", "·", "˚", "'"] },
  ember: { name: "余烬原野", color: "#b78a72", dark: "#332420", walk: 0.68, glyphs: ["*", ":", "'", "·"] },
  cave: { name: "洞窟", color: "#7e7a8f", dark: "#17141d", walk: 0.76, glyphs: ["·", ":", "◇", "'"] },
  dragonCave: { name: "龙的洞窟", color: "#8b6e5e", dark: "#1e1210", walk: 0.7, glyphs: ["·", "^", "◇", "'"] },
  caveWall: { name: "洞壁", color: "#3a3544", dark: "#0b090e", walk: 0.28, glyphs: ["█", "▓", "▒", "▣"] },
};

const rareGlyphs = [
  { id: "sakura", glyph: "🌸", label: "樱花", color: "#ff8fb8", kind: "flower" },
  { id: "daisy", glyph: "🌼", label: "小雏菊", color: "#ffd95a", kind: "flower" },
  { id: "sunflower", glyph: "🌻", label: "向日葵", color: "#ffcc33", kind: "flower" },
  { id: "tulip", glyph: "🌷", label: "郁金香", color: "#ff7fb0", kind: "flower" },
  { id: "rose", glyph: "🌹", label: "玫瑰", color: "#ff6f82", kind: "flower" },
  { id: "sprout", glyph: "🌱", label: "嫩芽", color: "#7dff96", kind: "flower" },
  { id: "herb", glyph: "🌿", label: "草叶", color: "#8dff8d", kind: "flower" },
  { id: "clover", glyph: "☘️", label: "三叶草", color: "#76f47f", kind: "flower" },
  { id: "mushroom", glyph: "🍄", label: "蘑菇", color: "#ff9d7d", kind: "flower" },
  { id: "shell", glyph: "🐚", label: "贝壳", color: "#ffdebb", kind: "flower" },
  { id: "cactus", glyph: "🌵", label: "仙人掌", color: "#6ff08b", kind: "flower" },
  { id: "fish", glyph: "🐟", label: "小鱼", color: "#7fd7ff", kind: "animal" },
  { id: "rabbit", glyph: "🐇", label: "兔子", color: "#ffffff", kind: "animal" },
  { id: "butterfly", glyph: "🦋", label: "蝴蝶", color: "#7fd7ff", kind: "animal" },
  { id: "paw", glyph: "🐾", label: "脚印", color: "#ffcc8a", kind: "animal" },
  { id: "fox", glyph: "🦊", label: "狐狸", color: "#ffad5f", kind: "animal" },
  { id: "deer", glyph: "🦌", label: "鹿", color: "#d8b17a", kind: "animal" },
  { id: "squirrel", glyph: "🐿️", label: "松鼠", color: "#d49a5f", kind: "animal" },
  { id: "hedgehog", glyph: "🦔", label: "刺猬", color: "#d7b98e", kind: "animal" },
  { id: "bird", glyph: "🐦", label: "小鸟", color: "#8fc7ff", kind: "animal" },
  { id: "turtle", glyph: "🐢", label: "乌龟", color: "#8be084", kind: "animal" },
  { id: "frog", glyph: "🐸", label: "青蛙", color: "#82f06d", kind: "animal" },
  { id: "crab", glyph: "🦀", label: "螃蟹", color: "#ff8f6c", kind: "animal" },
  { id: "duck", glyph: "🦆", label: "野鸭", color: "#b5e28c", kind: "animal" },
  { id: "lizard", glyph: "🦎", label: "蜥蜴", color: "#8ee07b", kind: "animal" },
  { id: "snake", glyph: "🐍", label: "小蛇", color: "#bde86f", kind: "animal" },
  { id: "owl", glyph: "🦉", label: "猫头鹰", color: "#d6b27a", kind: "animal" },
  { id: "penguin", glyph: "🐧", label: "企鹅", color: "#e8eef2", kind: "animal" },
  { id: "seal", glyph: "🦭", label: "海豹", color: "#c6d5dc", kind: "animal" },
];

const rareByTerrain = {
  ocean: ["fish", "seal", "turtle"],
  deep: ["fish", "seal"],
  water: ["fish", "turtle", "frog", "duck", "shell"],
  beach: ["shell", "crab", "turtle", "bird", "seal", "daisy", "sprout"],
  grass: ["rabbit", "butterfly", "deer", "fox", "bird", "duck", "sakura", "daisy", "sunflower", "tulip", "rose", "sprout", "herb", "clover"],
  forest: ["rabbit", "deer", "fox", "squirrel", "hedgehog", "bird", "owl", "butterfly", "mushroom", "herb", "clover"],
  swamp: ["frog", "turtle", "duck", "snake", "bird", "herb", "sprout", "mushroom"],
  desert: ["fox", "lizard", "snake", "bird", "cactus", "sprout"],
  stone: ["fox", "bird", "herb", "mushroom"],
  snow: ["fox", "deer", "bird", "penguin", "seal", "paw"],
  ember: ["paw"],
};

const rareLookup = new Map(rareGlyphs.map((item) => [item.id, item]));
const plantIds = rareGlyphs.filter((item) => item.kind === "flower").map((item) => item.id);
const HARVEST_RESPAWN_MS = 5 * 60 * 1000;

const weatherLabels = {
  clear: "晴朗",
  rain: "下雨",
  snow: "落雪",
  fog: "薄雾",
  sand: "风沙",
  ash: "灰烬",
  fireflies: "萤火",
};

const settlementStyles = {
  ocean: { village: "漂泊灯塔", town: "浮标水镇", color: "#8fd6ff", glyphs: ["◇", "≈", "□"] },
  deep: { village: "浮灯村", town: "浮灯水镇", color: "#8fd6ff", glyphs: ["□", "◇", "≈"] },
  water: { village: "芦苇码头", town: "芦苇水镇", color: "#91d8f0", glyphs: ["╬", "□", "≈"] },
  beach: { village: "贝壳村", town: "贝壳小镇", color: "#ffd98b", glyphs: ["⌂", "□", "◇"] },
  grass: { village: "草甸村", town: "草甸小镇", color: "#ffe28f", glyphs: ["⌂", "□", "┬"] },
  forest: { village: "苔木村", town: "苔木小镇", color: "#9dff9a", glyphs: ["⌂", "♣", "╧"] },
  swamp: { village: "吊脚村", town: "沼泽小镇", color: "#b8e58f", glyphs: ["╥", "⌂", "|"] },
  desert: { village: "日晒村", town: "日晒小镇", color: "#ffbd6f", glyphs: ["▣", "□", "╬"] },
  stone: { village: "石脊村", town: "石脊小镇", color: "#d7d2bd", glyphs: ["▰", "△", "□"] },
  snow: { village: "雪屋村", town: "雪岭小镇", color: "#f3fbff", glyphs: ["⌂", "△", "✦"] },
  ember: { village: "余烬营地", town: "余烬小镇", color: "#ff8f67", glyphs: ["⌂", "▲", "*"] },
};

const eventLabels = {
  none: "漫游中",
  snowMountain: "发现雪山",
  flowerSea: "花海",
  migration: "动物迁徙",
  sakuraGiant: "巨樱树",
  crystalField: "水晶群系",
  plantPatch: "植物繁生",
  desertedIsland: "无人岛",
  caveMouth: "洞口",
  caveExit: "洞口",
  giantCrystal: "巨型水晶",
  dragonTreasure: "龙的宝藏",
  dragon: "龙",
  dragonEgg: "龙蛋",
};

const waterDrops = {
  ocean: ["海漂瓶", "珊瑚枝", "星砂", "鲸骨小片", "潮汐玻璃"],
  deep: ["鱼鳞", "海玻璃", "蓝贝壳", "深海砂", "沉船铜扣", "夜光藻"],
  water: ["鱼鳞", "鹅卵石", "水草", "小贝壳", "浮木小盒"],
  beach: ["鹅卵石", "贝壳碎片", "海盐", "漂流木"],
  swamp: ["湿叶", "芦苇", "泥珠", "蛙卵"],
  snow: ["冰晶", "圆石", "冻鱼鳞"],
};

const treeDrops = {
  grass: ["野果", "草叶", "小树枝", "浆果"],
  forest: ["松果", "蘑菇", "苔藓", "树叶", "野果"],
  swamp: ["芦苇叶", "湿木片", "沼泽果"],
  desert: ["仙人掌果", "干草", "刺枝"],
  stone: ["山莓", "干叶", "岩缝草"],
  snow: ["松针", "冻浆果", "雪松皮"],
  ember: ["焦木片", "灰叶"],
};

const npcDrops = {
  deep: ["海盐面包", "烤鱼干", "灯油"],
  water: ["鱼干", "芦苇饼", "小面包"],
  beach: ["椰枣", "盐烤鱼", "贝壳扣"],
  grass: ["面包", "奶酪", "浆果酱"],
  forest: ["蘑菇汤", "肉干", "蜂蜜"],
  swamp: ["芦苇饼", "烟熏鱼", "草药包"],
  desert: ["肉干", "扁面包", "椰枣"],
  stone: ["硬面包", "山羊奶酪", "干肉"],
  snow: ["热汤", "冻肉干", "黑麦面包"],
  ember: ["炭烤肉干", "灰盐", "焦糖块"],
};

const crystalDrops = [
  { item: "白水晶", weight: 42 },
  { item: "紫水晶", weight: 22 },
  { item: "烟晶", weight: 14 },
  { item: "黄水晶", weight: 8 },
  { item: "石榴石", weight: 5 },
  { item: "海蓝宝石", weight: 3 },
  { item: "碧玺", weight: 2.2 },
  { item: "托帕石", weight: 1.6 },
  { item: "蓝宝石碎晶", weight: 0.75 },
  { item: "红宝石碎晶", weight: 0.45 },
  { item: "祖母绿碎晶", weight: 0.28 },
  { item: "钻石微晶", weight: 0.12 },
];

const caveCrystalDrops = [
  { item: "白水晶", weight: 22 },
  { item: "紫水晶", weight: 18 },
  { item: "烟晶", weight: 14 },
  { item: "黄水晶", weight: 11 },
  { item: "石榴石", weight: 8 },
  { item: "海蓝宝石", weight: 7 },
  { item: "碧玺", weight: 6 },
  { item: "托帕石", weight: 5 },
  { item: "蓝宝石碎晶", weight: 4 },
  { item: "红宝石碎晶", weight: 3 },
  { item: "祖母绿碎晶", weight: 2.4 },
  { item: "钻石微晶", weight: 1.5 },
  { item: "月脉水晶", weight: 1.1 },
  { item: "龙息晶", weight: 0.7 },
  { item: "黑星水晶", weight: 0.42 },
];

const snowMountainDrops = ["雪晶", "冰棱", "冻岩片", "山顶雪", "寒铁砂", "雪松针"];
const emberDrops = ["黑曜石", "火纹矿", "赤铁渣", "硫磺晶", "熔岩玻璃", "焦木炭", "余烬盐", "火山灰"];
const dragonTreasureDrops = ["旧金币", "龙鳞片", "银杯", "古钥匙", "镶晶戒指", "龙洞地图"];
const dragonSpecies = {
  cloudSerpent: {
    culture: "eastern",
    name: "云脉龙",
    english: "Cloud Serpent",
    colors: { body: "#8fd8c8", belly: "#e9f3d7", scale: "#f5d66c", horn: "#f4edbe", eye: "#17302f", accent: "#ccfff1" },
    scalePattern: ["==", "~~", "◇◇"],
    giftChance: 0.26,
    gifts: ["云鳞", "风骨铃", "青玉龙须", "浮云结"],
    lines: [
      "风先听见你，旅人。",
      "山脉记得你的脚步，水还在辨认。",
      "若你愿意安静片刻，我赠你一枚旧鳞。",
      "别惊动蛋壳里的梦，它还在听雨。",
    ],
  },
  moonhornLong: {
    culture: "eastern",
    name: "月角龙",
    english: "Moonhorn Long",
    colors: { body: "#9fb9e8", belly: "#f0eef8", scale: "#d8d2ff", horn: "#fff2b8", eye: "#1b1c3a", accent: "#cfe5ff" },
    scalePattern: ["<>", "==", "**"],
    giftChance: 0.22,
    gifts: ["月角碎片", "静潮珠", "银蓝龙鳞", "月影铃"],
    lines: [
      "月光落进洞里时，我会数岛上的潮声。",
      "不要急着拿走，会惊醒石头里的雨。",
      "你身上有远海的盐，也有草叶的气味。",
      "若礼物很轻，也请认真收好。",
    ],
  },
  rainscaleDragon: {
    culture: "eastern",
    name: "雨鳞龙",
    english: "Rainscale Dragon",
    colors: { body: "#6ebf92", belly: "#d8f0bb", scale: "#89e6d1", horn: "#e8dc91", eye: "#143223", accent: "#a5ffd9" },
    scalePattern: ["~~", "{}", "=="],
    giftChance: 0.3,
    gifts: ["雨脉珠", "听潮鳞片", "苔青龙须", "溪纹玉"],
    lines: [
      "雨会替温柔的人记路。",
      "我守的是气脉，不只是晶石。",
      "小岛还在长大，你听见地下的水了吗？",
      "带走这点雨意，别带走贪心。",
    ],
  },
  emberDrake: {
    culture: "western",
    name: "余烬龙",
    english: "Ember Drake",
    colors: { body: "#9e463a", belly: "#d68b4f", scale: "#ffcf65", horn: "#f3d6a6", eye: "#ffd56b", accent: "#ff7d45" },
    scalePattern: ["/\\", "^^", "##"],
    giftChance: 0.24,
    gifts: ["余烬龙鳞", "火心石", "熔金牙坠", "焦红爪片"],
    lines: [
      "State your wish, little wanderer.",
      "我的火不为威吓，只为记住边界。",
      "A gift is not a surrender. Take it with respect.",
      "再近一步前，先让你的手空下来。",
    ],
  },
  blackwingWyrm: {
    culture: "western",
    name: "黑翼龙",
    english: "Blackwing Wyrm",
    colors: { body: "#3b3342", belly: "#6d6674", scale: "#9c90aa", horn: "#d5c7b8", eye: "#ffcf66", accent: "#c99cff" },
    scalePattern: ["\\/","<>", "##"],
    giftChance: 0.2,
    gifts: ["黑翼扣", "暗鳞护片", "夜誓石", "古堡银扣"],
    lines: [
      "Speak clearly. Old caves dislike half-promises.",
      "我的宝库记得每一只伸来的手。",
      "契约不必写下，也会留在火光里。",
      "若你只是路过，我允许你带走一小片夜色。",
    ],
  },
  goldbackDragon: {
    culture: "western",
    name: "金脊龙",
    english: "Goldback Dragon",
    colors: { body: "#a76e36", belly: "#f0c46d", scale: "#ffe18a", horn: "#fff0bf", eye: "#39210e", accent: "#ffd45d" },
    scalePattern: ["^^", "==", "$$"],
    giftChance: 0.28,
    gifts: ["金脊硬币", "王冠碎金", "琥珀龙鳞", "旧王印章"],
    lines: [
      "Gold shines best when it is not begged for.",
      "旅人，宝物不是答案，只是重量。",
      "我喜欢诚实的目光，它比金币少见。",
      "拿去吧。让它提醒你，礼物也有边界。",
    ],
  },
};

function hash2(x, y, salt = 0) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed + salt, 1442695041);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function valueNoise(x, y, salt = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const a = hash2(xi, yi, salt);
  const b = hash2(xi + 1, yi, salt);
  const c = hash2(xi, yi + 1, salt);
  const d = hash2(xi + 1, yi + 1, salt);
  const u = smoothstep(xf);
  const v = smoothstep(yf);
  const top = a + (b - a) * u;
  const bottom = c + (d - c) * u;
  return top + (bottom - top) * v;
}

function fbm(x, y, salt = 0, octaves = 4) {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i += 1) {
    value += valueNoise(x * freq, y * freq, salt + i * 19) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return value / norm;
}

function islandAt(tx, ty, baseId) {
  if (!waterTerrain.has(baseId)) return null;
  const cellSize = 96;
  const cx = Math.floor(tx / cellSize);
  const cy = Math.floor(ty / cellSize);
  let best = null;

  for (let oy = -1; oy <= 1; oy += 1) {
    for (let ox = -1; ox <= 1; ox += 1) {
      const ix = cx + ox;
      const iy = cy + oy;
      const roll = hash2(ix, iy, 3500);
      if (roll < 0.82) continue;
      const centerX = ix * cellSize + 20 + Math.floor(hash2(ix, iy, 3501) * 56);
      const centerY = iy * cellSize + 20 + Math.floor(hash2(ix, iy, 3502) * 56);
      const radius = 5 + Math.floor(hash2(ix, iy, 3503) * 13);
      const wobble = 0.82 + fbm(tx * 0.16 + ix, ty * 0.16 - iy, 3510, 2) * 0.38;
      const distance = Math.hypot((tx - centerX) * 1.08, (ty - centerY) * 0.94);
      if (distance > radius * wobble) continue;
      if (!best || distance / radius < best.edge) {
        const kinds = ["grass", "forest", "swamp", "desert", "stone", "snow", "ember"];
        const kind = kinds[Math.floor(hash2(ix, iy, 3504) * kinds.length) % kinds.length];
        const deserted = hash2(ix, iy, 3505) > 0.6;
        best = { kind, deserted, edge: distance / radius, cx: ix, cy: iy };
      }
    }
  }

  if (!best) return null;
  const id = best.edge > 0.82 ? "beach" : best.kind;
  return { id, island: { terrain: best.kind, deserted: best.deserted, edge: best.edge, cx: best.cx, cy: best.cy } };
}

function surfaceTileAt(tx, ty) {
  const nx = tx * WORLD_SCALE;
  const ny = ty * WORLD_SCALE;
  const height = fbm(nx, ny, 10, 5);
  const continent = fbm(nx * 0.28 + 180, ny * 0.28 - 120, 14, 4);
  const ridge = fbm(nx * 0.72 - 60, ny * 0.72 + 150, 24, 3);
  const landMass = height * 0.42 + continent * 0.46 + ridge * 0.12;
  const heat = fbm(nx * 0.62 + 90, ny * 0.62 - 40, 80, 3);
  const wet = fbm(nx * 0.8 - 130, ny * 0.8 + 20, 130, 3);
  const weird = fbm(nx * 1.35 + 12, ny * 1.35 + 71, 220, 2);
  const detail = hash2(tx, ty, 300);

  let id = "grass";
  if (landMass < 0.47) id = "ocean";
  else if (landMass < 0.515) id = "deep";
  else if (landMass < 0.54) id = "water";
  else if (landMass < 0.56) id = "beach";
  else if (height > 0.78 && heat < 0.45) id = "snow";
  else if (height > 0.72) id = "stone";
  else if (heat > 0.73 && wet < 0.48) id = "desert";
  else if (heat > 0.69 && weird > 0.72) id = "ember";
  else if (wet > 0.72 && height < 0.58) id = "swamp";
  else if (wet > 0.58) id = "forest";

  const island = islandAt(tx, ty, id);
  if (island) id = island.id;

  return { ...biomes[id], id, detail, height: landMass, heat, wet, island: island?.island || null };
}

function caveSalt() {
  if (!caveOrigin) return seed + 7100;
  return seed + caveOrigin.x * 37 + caveOrigin.y * 71;
}

function caveInfo() {
  const salt = caveSalt();
  const dragon = hash2(salt, seed, 7200) > 0.9;
  const dragonKind = hash2(salt, seed, 7202) > 0.5 ? "eastern" : "western";
  const linked = dragon || hash2(salt, seed, 7201) > 0.42;
  return { salt, dragon, dragonKind, linked };
}

function dragonProfile() {
  const info = caveInfo();
  const species = Object.entries(dragonSpecies).filter(([, dragon]) => dragon.culture === info.dragonKind);
  const index = Math.floor(hash2(info.salt, seed, 7203) * species.length) % species.length;
  const [id, profile] = species[index] || Object.entries(dragonSpecies)[0];
  return { id, ...profile };
}

function caveRoomCenter(cx, cy, salt) {
  return {
    x: cx * 30 + 7 + Math.floor(hash2(cx, cy, salt + 1) * 16),
    y: cy * 30 + 7 + Math.floor(hash2(cx, cy, salt + 2) * 16),
  };
}

function caveOpenAt(tx, ty, info = caveInfo()) {
  const cx = Math.floor(tx / 30);
  const cy = Math.floor(ty / 30);
  let open = Math.hypot(tx, ty) < 9;
  if (info.dragon && Math.hypot(tx - 18, ty + 12) < 12) open = true;
  for (let oy = -1; oy <= 1; oy += 1) {
    for (let ox = -1; ox <= 1; ox += 1) {
      const rx = cx + ox;
      const ry = cy + oy;
      const roll = hash2(rx, ry, info.salt + 10);
      const allowed = info.linked ? roll > 0.42 : (rx === 0 && ry === 0);
      if (!allowed) continue;
      const center = caveRoomCenter(rx, ry, info.salt);
      const radius = 7 + Math.floor(hash2(rx, ry, info.salt + 3) * 8);
      if (Math.hypot((tx - center.x) * 1.06, (ty - center.y) * 0.92) < radius) open = true;
      if (info.linked) {
        const next = caveRoomCenter(rx + (hash2(rx, ry, info.salt + 4) > 0.5 ? 1 : 0), ry + (hash2(rx, ry, info.salt + 5) > 0.5 ? 1 : 0), info.salt);
        const corridor = Math.min(Math.abs(ty - center.y), Math.abs(tx - center.x));
        const betweenX = tx >= Math.min(center.x, next.x) - 2 && tx <= Math.max(center.x, next.x) + 2;
        const betweenY = ty >= Math.min(center.y, next.y) - 2 && ty <= Math.max(center.y, next.y) + 2;
        if ((betweenX && Math.abs(ty - center.y) < 2.2) || (betweenY && Math.abs(tx - next.x) < 2.2) || corridor < 1.5) open = true;
      }
    }
  }
  return open;
}

function caveTileAt(tx, ty) {
  const info = caveInfo();
  const open = caveOpenAt(tx, ty, info);
  const detail = hash2(tx, ty, info.salt + 30);
  const height = fbm(tx * 0.06, ty * 0.06, info.salt + 40, 3);
  const wet = fbm(tx * 0.08 + 20, ty * 0.08 - 10, info.salt + 50, 2);
  const id = open ? (info.dragon ? "dragonCave" : "cave") : "caveWall";
  return { ...biomes[id], id, detail, height, heat: 0.2, wet, cave: info };
}

function tileAt(tx, ty) {
  return worldMode === "cave" ? caveTileAt(tx, ty) : surfaceTileAt(tx, ty);
}

function canStandAt(x, y) {
  const tile = tileAt(Math.floor(x / TILE), Math.floor(y / TILE));
  return !solidTerrain.has(tile.id);
}

function findLandSpawn() {
  for (let radius = 0; radius < 80; radius += 1) {
    for (let y = -radius; y <= radius; y += 1) {
      for (let x = -radius; x <= radius; x += 1) {
        if (Math.abs(x) !== radius && Math.abs(y) !== radius) continue;
        const tile = tileAt(x, y);
        if (![...waterTerrain, "ember"].includes(tile.id)) {
          player.x = (x + 0.5) * TILE;
          player.y = (y + 0.5) * TILE;
          return;
        }
      }
    }
  }
  player.x = 0;
  player.y = 0;
}

function hasNearbyDryLand(tx, ty) {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      const tile = tileAt(tx + x, ty + y);
      if (!waterTerrain.has(tile.id)) return true;
    }
  }
  return false;
}

function settlementAt(tx, ty, tile) {
  if (worldMode === "cave") return null;
  const cellSize = 24;
  const cx = Math.floor(tx / cellSize);
  const cy = Math.floor(ty / cellSize);
  const roll = hash2(cx, cy, 1040);
  if (roll < 0.82) return null;

  const centerX = cx * cellSize + 8 + Math.floor(hash2(cx, cy, 1041) * 9);
  const centerY = cy * cellSize + 8 + Math.floor(hash2(cx, cy, 1042) * 9);
  const dx = tx - centerX;
  const dy = ty - centerY;
  const town = roll > 0.94;
  const radius = town ? 8 : 5;
  const distance = Math.hypot(dx * 1.08, dy * 0.92);
  if (distance > radius) return null;
  if (waterTerrain.has(tile.id) && !hasNearbyDryLand(tx, ty)) return null;
  if (tile.island?.deserted) return null;

  const lane = Math.abs(dx) < 1 || Math.abs(dy) < 1;
  const edge = distance > radius - 1.4;
  const lot = hash2(tx, ty, 1043);
  const style = settlementStyles[tile.id] || settlementStyles.grass;
  return {
    type: town ? "town" : "village",
    label: town ? style.town : style.village,
    style,
    lane,
    edge,
    lot,
    distance,
  };
}

function caveEventAt(tx, ty, tile) {
  if (tile.id === "caveWall") return null;
  const info = tile.cave || caveInfo();
  if (Math.hypot(tx, ty) < 3.2) return { type: "caveExit", label: "洞口", distance: Math.hypot(tx, ty), dx: tx, dy: ty };

  const roomX = Math.floor(tx / 18);
  const roomY = Math.floor(ty / 18);
  const centerX = roomX * 18 + 5 + Math.floor(hash2(roomX, roomY, info.salt + 100) * 9);
  const centerY = roomY * 18 + 5 + Math.floor(hash2(roomX, roomY, info.salt + 101) * 9);
  const dx = tx - centerX;
  const dy = ty - centerY;
  const distance = Math.hypot(dx, dy);
  const roll = hash2(roomX, roomY, info.salt + 102);

  if (info.dragon) {
    const dragonX = 18;
    const dragonY = -12;
    const dragonDistance = Math.hypot(tx - dragonX, ty - dragonY);
    if (dragonDistance < 8) return { type: "dragon", label: "龙", distance: dragonDistance, dx: tx - dragonX, dy: ty - dragonY, visible: dragonDistance < 1.2 };
    if (distance < 5 && roll > 0.52 && roll <= 0.72) return { type: "dragonTreasure", label: "龙的宝藏", distance, dx, dy };
    if (distance < 4 && roll > 0.86) return { type: "dragonEgg", label: "龙蛋", distance, dx, dy };
    if (distance < 8 && roll > 0.18 && roll <= 0.52) return { type: "giantCrystal", label: "巨型水晶", distance, dx, dy };
  } else if (info.linked && distance < 7 && roll > 0.72) {
    return { type: "giantCrystal", label: "巨型水晶", distance, dx, dy };
  }

  if (distance < 9 && roll > 0.38 && roll <= 0.72) return { type: "crystalField", label: "水晶群系", distance, dx, dy };
  if (distance < 5 && roll > 0.92) return { type: "giantCrystal", label: "巨型水晶", distance, dx, dy };
  return null;
}

function eventAt(tx, ty, tile) {
  if (worldMode === "cave") return caveEventAt(tx, ty, tile);

  const cellSize = 56;
  const cx = Math.floor(tx / cellSize);
  const cy = Math.floor(ty / cellSize);
  const roll = hash2(cx, cy, 1220);
  const centerX = cx * cellSize + 16 + Math.floor(hash2(cx, cy, 1221) * 24);
  const centerY = cy * cellSize + 16 + Math.floor(hash2(cx, cy, 1222) * 24);
  const dx = tx - centerX;
  const dy = ty - centerY;
  const distance = Math.hypot(dx, dy);

  if (roll > 0.955 && distance < 12 && (tile.id === "stone" || tile.id === "snow" || tile.height > 0.7)) {
    return { type: "snowMountain", label: eventLabels.snowMountain, distance, dx, dy };
  }
  if (roll > 0.51 && roll <= 0.57 && distance < 7 && ["forest", "stone", "snow", "swamp", "grass"].includes(tile.id)) {
    return { type: "caveMouth", label: eventLabels.caveMouth, distance, dx, dy };
  }
  if (roll > 0.78 && roll <= 0.84 && distance < 11 && ["grass", "forest"].includes(tile.id) && tile.wet > 0.48) {
    return { type: "sakuraGiant", label: eventLabels.sakuraGiant, distance, dx, dy };
  }
  if (roll > 0.72 && roll <= 0.78 && distance < 13 && ["stone", "snow", "ember"].includes(tile.id)) {
    return { type: "crystalField", label: eventLabels.crystalField, distance, dx, dy };
  }
  if (roll > 0.64 && roll <= 0.72 && distance < 14 && ["grass", "forest", "swamp", "beach", "desert", "stone"].includes(tile.id)) {
    const plantPool = (rareByTerrain[tile.id] || rareByTerrain.grass).filter((id) => plantIds.includes(id));
    if (plantPool.length) {
      const plantId = plantPool[Math.floor(hash2(cx, cy, 1233) * plantPool.length) % plantPool.length];
      const plant = rareLookup.get(plantId);
      return { type: "plantPatch", label: `${plant.label}群落`, plant, distance, dx, dy };
    }
  }
  if (roll > 0.91 && roll <= 0.955 && distance < 15 && ["grass", "forest", "beach", "swamp"].includes(tile.id)) {
    return { type: "flowerSea", label: eventLabels.flowerSea, distance, dx, dy };
  }
  if (roll > 0.865 && roll <= 0.91 && distance < 18 && ["grass", "beach", "forest", "desert", "stone", "snow"].includes(tile.id)) {
    const stripe = Math.abs(dy - Math.sin((dx + elapsed * 2.2) * 0.28) * 4);
    return { type: "migration", label: eventLabels.migration, distance, dx, dy, active: stripe < 2.1 };
  }
  if (tile.island?.deserted && tile.island.edge < 0.62) {
    return { type: "desertedIsland", label: eventLabels.desertedIsland, distance: tile.island.edge * 12, dx: 0, dy: 0 };
  }
  return null;
}

function rareKey(tx, ty) {
  return `${tx},${ty}`;
}

function plantHarvestKey(tx, ty, id = "plant") {
  return `${id}:${tx},${ty}`;
}

function isPlantHarvested(key) {
  const expires = harvestedPlants.get(key);
  if (!expires) return false;
  if (Date.now() >= expires) {
    harvestedPlants.delete(key);
    return false;
  }
  return true;
}

function markPlantHarvested(key) {
  harvestedPlants.set(key, Date.now() + HARVEST_RESPAWN_MS);
}

function rareAt(tx, ty, tile = tileAt(tx, ty)) {
  if (worldMode === "cave") return null;
  if (suppressedRare.has(rareKey(tx, ty))) return null;
  const rare = hash2(tx, ty, 880);
  if (rare <= 0.985) return null;
  const pool = rareByTerrain[tile.id] || rareByTerrain.grass;
  const id = pool[Math.floor(hash2(tx, ty, 881) * pool.length) % pool.length];
  const rareGlyph = rareLookup.get(id);
  if (rareGlyph?.kind === "flower" && isPlantHarvested(plantHarvestKey(tx, ty, id))) return null;
  return rareGlyph ? { ...rareGlyph, tx, ty, source: "world" } : null;
}

function nearestRareThing() {
  const centerX = Math.floor(player.x / TILE);
  const centerY = Math.floor(player.y / TILE);
  let nearest = null;
  for (let y = centerY - 5; y <= centerY + 5; y += 1) {
    for (let x = centerX - 5; x <= centerX + 5; x += 1) {
      const rare = rareAt(x, y, tileAt(x, y));
      if (!rare) continue;
      const worldX = (x + 0.5) * TILE;
      const worldY = (y + 0.5) * TILE;
      const distance = Math.hypot(worldX - player.x, worldY - player.y);
      if (distance < 44 && (!nearest || distance < nearest.distance)) {
        nearest = { ...rare, distance };
      }
    }
  }
  for (const animal of droppedAnimals) {
    const distance = Math.hypot(animal.x - player.x, animal.y - player.y);
    if (distance < 44 && (!nearest || distance < nearest.distance)) {
      nearest = { ...animal.rare, source: "dropped", dropId: animal.id, distance };
    }
  }
  return nearest;
}

function pick(list, salt = 0) {
  if (!list.length) return null;
  return list[Math.floor(hash2(Math.floor(player.x / TILE), Math.floor(player.y / TILE), 1800 + salt + Math.floor(elapsed * 17)) * list.length) % list.length];
}

function weightedPick(list) {
  const total = list.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = hash2(Math.floor(player.x / TILE), Math.floor(player.y / TILE), 1900 + Math.floor(elapsed * 23)) * total;
  for (const entry of list) {
    roll -= entry.weight;
    if (roll <= 0) return entry.item;
  }
  return list[0].item;
}

function caveCrystalPick(giant = false) {
  const item = weightedPick(caveCrystalDrops);
  return giant ? `巨型${item}` : item;
}

function renderTeleportList() {
  if (!teleportListEl) return;
  teleportListEl.innerHTML = teleportOptions.map((id) => (
    `<button type="button" data-teleport="${id}" aria-pressed="${String(id === selectedTeleport)}">${teleportLabel(id)}</button>`
  )).join("");
}

function teleportLabel(id) {
  if (id === "easternDragonCave") return "东方龙洞窟";
  if (id === "westernDragonCave") return "西方龙洞窟";
  return biomes[id]?.name || id;
}

function teleportDragonKind(id) {
  if (id === "easternDragonCave") return "eastern";
  if (id === "westernDragonCave") return "western";
  return null;
}

function setTeleportOpen(open) {
  if (!teleportPanel || !teleportBtn) return;
  teleportOpen = open;
  teleportPanel.classList.toggle("is-hidden", !teleportOpen);
  teleportBtn.setAttribute("aria-pressed", String(teleportOpen));
}

function teleportTileFor(id, tx, ty) {
  const requiredDragonKind = teleportDragonKind(id);
  if (id === "cave" || requiredDragonKind) {
    const previousMode = worldMode;
    const previousOrigin = caveOrigin;
    worldMode = "cave";
    caveOrigin = { x: tx, y: ty };
    const info = caveInfo();
    const tile = caveTileAt(0, 0);
    worldMode = previousMode;
    caveOrigin = previousOrigin;
    if (requiredDragonKind && info.dragonKind !== requiredDragonKind) return false;
    return requiredDragonKind ? tile.id === "dragonCave" : tile.id === id;
  }
  return surfaceTileAt(tx, ty).id === id;
}

function findTeleportTarget(id) {
  const startX = Math.floor((worldMode === "cave" && surfaceReturn ? surfaceReturn.x : player.x) / TILE);
  const startY = Math.floor((worldMode === "cave" && surfaceReturn ? surfaceReturn.y : player.y) / TILE);
  const dragonKind = teleportDragonKind(id);
  const maxRadius = dragonKind ? 900 : 520;
  const step = dragonKind ? 9 : 5;

  for (let radius = 0; radius <= maxRadius; radius += step) {
    for (let y = -radius; y <= radius; y += step) {
      for (let x = -radius; x <= radius; x += step) {
        if (Math.abs(x) !== radius && Math.abs(y) !== radius) continue;
        const tx = startX + x;
        const ty = startY + y;
        if (!teleportTileFor(id, tx, ty)) continue;
        if (id === "cave" || dragonKind) return { mode: "cave", origin: { x: tx, y: ty }, x: 0, y: 0 };
        return { mode: "surface", x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
      }
    }
  }
  return null;
}

function teleportToSelectedBiome() {
  const target = findTeleportTarget(selectedTeleport);
  const label = teleportLabel(selectedTeleport);
  if (!target) {
    nearbyEl.textContent = `未找到 ${label}`;
    nearbyEl.classList.remove("is-hidden");
    return;
  }
  if (target.mode === "cave") {
    worldMode = "cave";
    caveOrigin = target.origin;
    surfaceReturn = { x: player.x, y: player.y };
    player.x = target.x;
    player.y = target.y;
  } else {
    worldMode = "surface";
    caveOrigin = null;
    surfaceReturn = null;
    player.x = target.x;
    player.y = target.y;
  }
  player.vx = 0;
  player.vy = 0;
  trails.length = 0;
  droppedAnimals.length = 0;
  setTeleportOpen(false);
  remember(`teleport:${selectedTeleport}:${Date.now()}`, `传送至 ${label}`, true);
  nearbyEl.textContent = `传送至 ${label}`;
  nearbyEl.classList.remove("is-hidden");
  drawMini();
}

function teleportToMapPoint(event) {
  const rect = miniCanvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
  const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
  const scaleX = miniCanvas.width / Math.max(1, rect.width);
  const scaleY = miniCanvas.height / Math.max(1, rect.height);
  const px = Math.floor(x * scaleX);
  const py = Math.floor(y * scaleY);
  const radius = Math.floor(miniCanvas.width / 2);
  const step = mapExpanded ? 2 : 1;
  const centerX = Math.floor(player.x / TILE);
  const centerY = Math.floor(player.y / TILE);
  const tx = centerX + Math.floor((px - radius) * step);
  const ty = centerY + Math.floor((py - radius) * step);
  const targetTile = tileAt(tx, ty);
  if (solidTerrain.has(targetTile.id)) {
    nearbyEl.textContent = "无法传送到这里";
    nearbyEl.classList.remove("is-hidden");
    return;
  }
  player.x = (tx + 0.5) * TILE;
  player.y = (ty + 0.5) * TILE;
  player.vx = 0;
  player.vy = 0;
  trails.length = 0;
  droppedAnimals.length = 0;
  setTeleportOpen(false);
  remember(`map-teleport:${worldMode}:${tx},${ty}:${Date.now()}`, `传送至 ${targetTile.name}`, true);
  nearbyEl.textContent = `传送至 ${targetTile.name}`;
  nearbyEl.classList.remove("is-hidden");
  drawMini();
}

function loadMemory() {
  try {
    const saved = JSON.parse(localStorage.getItem(MEMORY_KEY) || "{}");
    return {
      seen: new Set(saved.seen || []),
      entries: Array.isArray(saved.entries) ? saved.entries.slice(0, 40) : [],
    };
  } catch {
    return { seen: new Set(), entries: [] };
  }
}

function saveMemory() {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify({
      seen: [...memory.seen],
      entries: memory.entries.slice(0, 40),
    }));
  } catch {
    // Storage may be unavailable in private contexts; gameplay should continue.
  }
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char]);
}

function remember(key, text, force = false) {
  if (!force && memory.seen.has(key)) return;
  memory.seen.add(key);
  memory.entries.unshift(text);
  memory.entries = memory.entries.slice(0, 40);
  saveMemory();
  renderMemory();
}

function renderMemory() {
  const entries = memory.entries.slice(0, 4);
  if (!entries.length) {
    memoriesEl.textContent = "尚未记录";
    return;
  }
  memoriesEl.innerHTML = entries.map((entry) => {
    const safeEntry = escapeHtml(entry);
    return `<button type="button" data-memory="${safeEntry}" title="${safeEntry}">${safeEntry}</button>`;
  }).join("");
}

function addItem(item, count = 1) {
  if (!item) return;
  inventory.set(item, (inventory.get(item) || 0) + count);
  renderInventory();
  remember(`item:${item}`, `获得 ${item}`);
  nearbyEl.textContent = `获得 ${item}`;
  nearbyEl.classList.remove("is-hidden");
}

function renderInventory() {
  const entries = [...inventory.entries()].slice(-6).reverse();
  if (!entries.length) {
    itemsEl.textContent = "空";
    return;
  }
  itemsEl.innerHTML = entries.map(([name, count]) => (
    `<button type="button" data-item="${name}" aria-pressed="${String(name === selectedItem)}"><b>${name}</b><em>${count}</em></button>`
  )).join("");
}

function selectItem(item) {
  selectedItem = selectedItem === item ? "" : item;
  renderInventory();
  if (selectedItem) {
    nearbyEl.textContent = `选中 ${selectedItem}`;
    nearbyEl.classList.remove("is-hidden");
  }
}

function removeItem(item) {
  const count = inventory.get(item) || 0;
  if (count <= 0) return false;
  if (count === 1) inventory.delete(item);
  else inventory.set(item, count - 1);
  if (!inventory.has(item)) selectedItem = "";
  renderInventory();
  remember(`discard-item:${item}:${Date.now()}`, `丢弃 ${item}`, true);
  nearbyEl.textContent = `丢弃 ${item}`;
  nearbyEl.classList.remove("is-hidden");
  return true;
}

function npcAt(tx, ty, settlement) {
  if (!settlement || settlement.edge || settlement.lane) return null;
  if (settlement.type !== "town" && hash2(tx, ty, 1310) < 0.72) return null;
  if (hash2(tx, ty, 1311) < (settlement.type === "town" ? 0.18 : 0.08)) {
    return { label: settlement.type === "town" ? "镇民" : "村民", glyph: "人" };
  }
  return null;
}

function enterCave(target) {
  surfaceReturn = { x: player.x, y: player.y };
  caveOrigin = { x: target.tx, y: target.ty };
  worldMode = "cave";
  player.x = 0;
  player.y = 0;
  player.vx = 0;
  player.vy = 0;
  trails.length = 0;
  remember(`cave:${target.tx},${target.ty}`, "进入 洞窟", true);
  nearbyEl.textContent = "进入 洞窟";
  nearbyEl.classList.remove("is-hidden");
  drawMini();
}

function leaveCave() {
  worldMode = "surface";
  player.x = surfaceReturn?.x || 0;
  player.y = surfaceReturn?.y || 0;
  player.vx = 0;
  player.vy = 0;
  trails.length = 0;
  remember(`cave-exit:${Date.now()}`, "离开 洞窟", true);
  nearbyEl.textContent = "离开 洞窟";
  nearbyEl.classList.remove("is-hidden");
  caveOrigin = null;
  surfaceReturn = null;
  drawMini();
}

function dragonSpeech() {
  const profile = dragonProfile();
  const lines = profile.lines;
  return lines[Math.floor(hash2(Math.floor(player.x / TILE), Math.floor(player.y / TILE), 8100 + Math.floor(elapsed * 11)) * lines.length) % lines.length];
}

function dragonGift() {
  const profile = dragonProfile();
  const gifts = profile.gifts;
  return gifts[Math.floor(hash2(Math.floor(player.x / TILE), Math.floor(player.y / TILE), 8120 + Math.floor(elapsed * 13)) * gifts.length) % gifts.length];
}

function nearbyInteraction() {
  const centerX = Math.floor(player.x / TILE);
  const centerY = Math.floor(player.y / TILE);
  let best = null;
  for (const animal of droppedAnimals) {
    const distance = Math.hypot(animal.x - player.x, animal.y - player.y);
    if (distance < 38) {
      best = {
        kind: "animal",
        label: animal.rare.label,
        rare: animal.rare,
        dropId: animal.id,
        source: "dropped",
        distance,
        score: 650 - distance,
      };
    }
  }
  for (let y = centerY - 4; y <= centerY + 4; y += 1) {
    for (let x = centerX - 4; x <= centerX + 4; x += 1) {
      const tile = tileAt(x, y);
      const event = eventAt(x, y, tile);
      const settlement = settlementAt(x, y, tile);
      const npc = npcAt(x, y, settlement);
      const rare = rareAt(x, y, tile);
      const worldX = (x + 0.5) * TILE;
      const worldY = (y + 0.5) * TILE;
      const distance = Math.hypot(worldX - player.x, worldY - player.y);
      if (distance > 58) continue;

      let target = null;
      if (event?.type === "caveMouth") target = { kind: "caveEnter", label: "洞口", tile, tx: x, ty: y, priority: 7, reach: 42 };
      else if (event?.type === "caveExit") target = { kind: "caveExit", label: "洞口", tile, priority: 7, reach: 46 };
      else if (event?.type === "dragon") target = { kind: "dragon", label: dragonProfile().name, tile, priority: 8, reach: 58 };
      else if (event?.type === "dragonTreasure") target = { kind: "dragonTreasure", label: "龙的宝藏", tile, priority: 7, reach: 42 };
      else if (event?.type === "dragonEgg") target = { kind: "dragonEgg", label: "龙蛋", tile, priority: 7, reach: 38 };
      else if (event?.type === "giantCrystal") target = { kind: "giantCrystal", label: "巨型水晶", tile, priority: 6, reach: 46 };
      else if (event?.type === "snowMountain") target = { kind: "snowMountain", label: "雪山", tile, priority: 5, reach: 50 };
      else if (event?.type === "sakuraGiant") target = { kind: "sakura", label: "巨樱树", tile, priority: 5, reach: 54 };
      else if (event?.type === "crystalField") target = { kind: "crystal", label: "水晶群系", tile, priority: 5, reach: 46 };
      else if (event?.type === "plantPatch" && !isPlantHarvested(plantHarvestKey(x, y, event.plant.id))) target = { kind: "plantPatch", label: event.plant.label, tile, plant: event.plant, tx: x, ty: y, priority: 4, reach: 34 };
      else if (npc) target = { kind: "npc", label: npc.label, tile, priority: 4, reach: 32 };
      else if (tile.id === "ember") target = { kind: "ember", label: "余烬地", tile, priority: 3, reach: 40 };
      else if (waterTerrain.has(tile.id) || (tile.id === "beach" && hasNearbyWater(x, y))) target = { kind: "water", label: waterTerrain.has(tile.id) ? "水面" : "水边", tile, priority: 3, reach: 42 };
      else if (["forest", "grass", "swamp", "desert", "stone", "snow", "ember"].includes(tile.id) && hasNearbyTreeLike(x, y)) target = { kind: "tree", label: "树边", tile, priority: 2, reach: 38 };
      else if (rare?.kind === "animal") target = { kind: "animal", label: rare.label, tile, rare, priority: 6, reach: 34 };
      else if (rare?.kind === "flower") target = { kind: "plant", label: rare.label, tile, rare, priority: 1, reach: 32 };
      if (!target) continue;
      if (distance > target.reach) continue;
      const score = target.priority * 100 - distance;
      if (!best || score > best.score) best = { ...target, distance, score };
    }
  }
  return best;
}

function hasNearbyWater(tx, ty) {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      if (waterTerrain.has(tileAt(tx + x, ty + y).id)) return true;
    }
  }
  return false;
}

function hasNearbyTreeLike(tx, ty) {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      const tile = tileAt(tx + x, ty + y);
      if (tile.id === "forest") return true;
      if (tile.id === "grass" && tile.wet > 0.55 && tile.detail > 0.65) return true;
      if (tile.id === "swamp" && tile.wet > 0.68) return true;
      if (tile.id === "desert" && tile.detail > 0.86) return true;
      if (tile.id === "snow" && tile.detail > 0.76) return true;
      if (tile.id === "ember" && tile.detail > 0.88) return true;
    }
  }
  return false;
}

function interact() {
  const target = nearbyInteraction();
  if (!target) {
    nearbyEl.textContent = "没有可交互物";
    nearbyEl.classList.remove("is-hidden");
    return;
  }
  if (target.kind === "animal") {
    liftAnimal(target);
    return;
  }
  if (target.kind === "caveEnter") {
    enterCave(target);
    return;
  }
  if (target.kind === "caveExit") {
    leaveCave();
    return;
  }
  if (target.kind === "dragon") {
    const profile = dragonProfile();
    const line = dragonSpeech();
    remember(`dragon:${profile.id}:${line}`, `${profile.name}说 ${line}`, true);
    nearbyEl.textContent = `${profile.name}：${line}`;
    nearbyEl.classList.remove("is-hidden");
    if (hash2(Math.floor(player.x / TILE), Math.floor(player.y / TILE), 8140 + Math.floor(elapsed * 17)) > 1 - profile.giftChance) {
      const gift = dragonGift();
      addItem(gift);
      remember(`dragon-gift:${profile.id}:${gift}`, `${profile.name}赠予 ${gift}`, true);
    }
    return;
  }
  remember(`interact:${target.kind}:${target.label}`, `触碰 ${target.label}`);
  if (target.kind === "water") addItem(pick(waterDrops[target.tile.id] || waterDrops.water, 1));
  else if (target.kind === "tree") addItem(pick(treeDrops[target.tile.id] || treeDrops.grass, 2));
  else if (target.kind === "npc") addItem(pick(npcDrops[target.tile.id] || npcDrops.grass, 3));
  else if (target.kind === "snowMountain") addItem(pick(snowMountainDrops, 6));
  else if (target.kind === "sakura") addItem(pick(["樱花花瓣", "樱桃", "樱花树皮"], 4));
  else if (target.kind === "crystal") addItem(worldMode === "cave" ? caveCrystalPick(false) : weightedPick(crystalDrops));
  else if (target.kind === "giantCrystal") addItem(caveCrystalPick(true));
  else if (target.kind === "dragonTreasure") addItem(pick(dragonTreasureDrops, 8));
  else if (target.kind === "dragonEgg") addItem("龙蛋");
  else if (target.kind === "ember") addItem(pick(emberDrops, 7));
  else if (target.kind === "plant") {
    markPlantHarvested(plantHarvestKey(target.rare.tx, target.rare.ty, target.rare.id));
    addItem(target.rare.label);
  } else if (target.kind === "plantPatch") {
    markPlantHarvested(plantHarvestKey(target.tx, target.ty, target.plant.id));
    addItem(target.plant.label);
  }
}

function liftAnimal(target) {
  if (carriedAnimal) {
    nearbyEl.textContent = `已经抱着${carriedAnimal.label}`;
    nearbyEl.classList.remove("is-hidden");
    return;
  }
  if (target.source === "dropped") {
    const index = droppedAnimals.findIndex((animal) => animal.id === target.dropId);
    if (index >= 0) droppedAnimals.splice(index, 1);
  } else if (target.rare?.source === "world") {
    suppressedRare.add(rareKey(target.rare.tx, target.rare.ty));
  }
  carriedAnimal = { ...target.rare, label: target.rare.label, glyph: target.rare.glyph };
  remember(`carry:${carriedAnimal.id || carriedAnimal.label}`, `抱起 ${carriedAnimal.label}`);
  nearbyEl.textContent = `抱起 ${carriedAnimal.label}`;
  nearbyEl.classList.remove("is-hidden");
}

function discard() {
  if (carriedAnimal) {
    droppedAnimals.push({
      id: `${Date.now()}-${Math.random()}`,
      x: player.x + player.facing * TILE * 0.75,
      y: player.y,
      vx: player.facing * 18,
      vy: 0,
      born: elapsed,
      rare: carriedAnimal,
    });
    remember(`drop-animal:${carriedAnimal.label}:${Date.now()}`, `放下 ${carriedAnimal.label}`, true);
    nearbyEl.textContent = `放下 ${carriedAnimal.label}`;
    nearbyEl.classList.remove("is-hidden");
    carriedAnimal = null;
    return;
  }
  if (selectedItem && removeItem(selectedItem)) return;
  nearbyEl.textContent = "没有可丢弃物";
  nearbyEl.classList.remove("is-hidden");
}

function triggerDiscard(event) {
  event?.preventDefault();
  const now = performance.now();
  if (now - lastManualDiscard < 180) return;
  lastManualDiscard = now;
  discard();
}

function triggerInteract(event) {
  event?.preventDefault();
  const now = performance.now();
  if (now - lastManualInteract < 180) return;
  lastManualInteract = now;
  interact();
}

function weatherAt(x, y) {
  if (worldMode === "cave") return caveInfo().dragon ? "ash" : "fog";
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  const zoneX = Math.floor(tx / 28);
  const zoneY = Math.floor(ty / 28);
  const current = tileAt(tx, ty);
  const roll = fbm(zoneX * 0.72 + elapsed * 0.012, zoneY * 0.72, 470, 3);
  if (current.id === "snow" && roll > 0.42) return "snow";
  if (current.id === "desert" && roll > 0.58) return "sand";
  if (current.id === "ember" && roll > 0.36) return "ash";
  if ((current.id === "forest" || current.id === "grass") && roll > 0.76) return "fireflies";
  if (current.wet > 0.58 && roll > 0.48) return "rain";
  if (roll > 0.66) return "fog";
  return "clear";
}

function resize() {
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.imageSmoothingEnabled = false;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

function fleeOffset(tx, ty, size) {
  const worldX = (tx + 0.5) * TILE;
  const worldY = (ty + 0.5) * TILE;
  const dx = worldX - player.x;
  const dy = worldY - player.y;
  const distance = Math.hypot(dx, dy);
  if (distance > 150 || distance < 0.001) return { x: 0, y: 0 };
  const strength = (1 - distance / 150) * size * 0.92;
  const jitter = Math.sin(elapsed * 9 + tx * 0.7 + ty * 0.31) * size * 0.08;
  return {
    x: (dx / distance) * strength + jitter,
    y: (dy / distance) * strength,
  };
}

function drawTile(screenX, screenY, tile, size, tx, ty) {
  const event = eventAt(tx, ty, tile);
  const settlement = settlementAt(tx, ty, tile);
  const glimmer = Math.sin(elapsed * 0.7 + tx * 0.37 + ty * 0.19) * 10;
  const bgAlpha = tile.id === "caveWall" ? 0.48 : tile.id === "cave" || tile.id === "dragonCave" ? 0.22 : waterTerrain.has(tile.id) ? 0.16 : 0.08;
  ctx.fillStyle = `${tile.dark}${Math.round(bgAlpha * 255).toString(16).padStart(2, "0")}`;
  ctx.fillRect(screenX, screenY, size, size);

  const r = hash2(tx, ty, 620);
  const glyph = tile.glyphs[Math.floor(r * tile.glyphs.length) % tile.glyphs.length];
  const rareGlyph = rareAt(tx, ty, tile);
  const quiet = tile.id === "caveWall" ? r < 0.22 : r < 0.46;
  const xJitter = Math.floor(hash2(tx, ty, 621) * size * 0.28);
  const yJitter = Math.floor(hash2(tx, ty, 622) * size * 0.2);
  const bloom = rareGlyph?.kind === "flower" ? 0.88 + Math.max(0, Math.sin(elapsed * 2.2 + tx * 0.43 + ty * 0.29)) * 0.28 : 1;
  const flee = rareGlyph?.kind === "animal" ? fleeOffset(tx, ty, size) : { x: 0, y: 0 };
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (rareGlyph || !quiet) {
    ctx.fillStyle = rareGlyph ? rareGlyph.color : shade(tile.color, tile.id === "cave" || tile.id === "dragonCave" ? glimmer * 1.6 : glimmer);
    const plantDistance = rareGlyph?.kind === "flower" ? Math.hypot((tx + 0.5) * TILE - player.x, (ty + 0.5) * TILE - player.y) : Infinity;
    const plantNear = rareGlyph?.kind === "flower" ? Math.max(0, 1 - plantDistance / 145) : 0;
    const plantPulse = rareGlyph?.kind === "flower" ? 0.08 + Math.max(0, Math.sin(elapsed * 5.4 + tx * 0.8 + ty * 0.45)) * 0.1 : 0;
    const plantScale = rareGlyph?.kind === "flower" ? 1 + plantNear * (0.95 + plantPulse) : 1;
    const plantLift = rareGlyph?.kind === "flower" ? plantNear * size * 0.22 : 0;
    ctx.globalAlpha = rareGlyph?.kind === "flower" ? 0.9 + (bloom - 0.88) * 0.25 + plantNear * 0.18 : 0.76;
    ctx.font = `${Math.max(12, Math.floor(size * 0.78 * bloom))}px ${EMOJI_FONT}`;
    if (plantScale > 1) ctx.font = `${Math.max(12, Math.floor(size * 0.78 * bloom * plantScale))}px ${EMOJI_FONT}`;
    ctx.fillText(rareGlyph ? rareGlyph.glyph : glyph, screenX + size * 0.5 + xJitter - size * 0.14 + flee.x, screenY + size * 0.54 + yJitter - size * 0.1 + flee.y - plantLift);
  }

  if (!rareGlyph && tile.detail > 0.93) {
    ctx.globalAlpha = 0.58;
    ctx.fillStyle = tile.id === "ember" ? "#df9b73" : "#d8d0bd";
    const detailGlyph = tile.id === "cave" || tile.id === "dragonCave" ? "◇" : tile.id === "caveWall" ? "▒" : tile.id === "forest" ? "♣" : tile.id === "snow" ? "*" : tile.id === "grass" ? "'" : tile.id === "beach" ? "." : waterTerrain.has(tile.id) ? "○" : tile.id === "ember" ? "*" : "·";
    ctx.fillText(detailGlyph, screenX + size * 0.76, screenY + size * 0.35);
  }
  ctx.globalAlpha = 1;

  if (event) drawEvent(screenX, screenY, size, tx, ty, event);
  if (settlement) drawSettlement(screenX, screenY, size, tx, ty, settlement);
}

function drawSettlement(screenX, screenY, size, tx, ty, settlement) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.max(12, Math.floor(size * 0.76))}px ${EMOJI_FONT}`;

  if (settlement.edge) {
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = settlement.style.color;
    ctx.fillText("·", screenX + size * 0.5, screenY + size * 0.52);
    ctx.globalAlpha = 1;
    return;
  }

  if (settlement.lane) {
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = "#d8c9a7";
    ctx.fillText(settlement.type === "town" ? "═" : "·", screenX + size * 0.5, screenY + size * 0.54);
    ctx.globalAlpha = 1;
    return;
  }

  if (settlement.lot > 0.34) {
    const glyphs = settlement.style.glyphs;
    const glyph = glyphs[Math.floor(hash2(tx, ty, 1090) * glyphs.length) % glyphs.length];
    ctx.globalAlpha = settlement.type === "town" ? 0.98 : 0.86;
    ctx.fillStyle = settlement.style.color;
    ctx.fillText(glyph, screenX + size * 0.5, screenY + size * 0.5);
    const npc = npcAt(tx, ty, settlement);
    if (npc) {
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = "#ffe8a4";
      ctx.font = `${Math.max(10, Math.floor(size * 0.58))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.fillText(npc.glyph, screenX + size * 0.78, screenY + size * 0.28);
    }
    ctx.globalAlpha = 1;
  }
}

function drawEvent(screenX, screenY, size, tx, ty, event) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.max(13, Math.floor(size * 0.82))}px ${EMOJI_FONT}`;

  if (event.type === "snowMountain") {
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = event.distance < 5 ? "#f6fbff" : "#a9dff5";
    const ridge = Math.abs(event.dx) < 2 || hash2(tx, ty, 1250) > 0.58;
    ctx.fillText(ridge ? "▲" : "△", screenX + size * 0.5, screenY + size * 0.52);
  } else if (event.type === "flowerSea") {
    const bloom = 0.9 + Math.max(0, Math.sin(elapsed * 2 + tx * 0.28 + ty * 0.47)) * 0.34;
    ctx.globalAlpha = 0.78 + (bloom - 0.9) * 0.36;
    const flowers = ["🌸", "🌼", "🌻", "🌷", "🌹", "🌺"];
    const palette = ["#ff86b7", "#ffd55f", "#fb8b6f", "#b7ff83", "#b18cff", "#ff6f92"];
    ctx.fillStyle = palette[Math.floor(hash2(tx, ty, 1260) * palette.length) % palette.length];
    ctx.font = `${Math.max(13, Math.floor(size * 0.82 * bloom))}px ${EMOJI_FONT}`;
    ctx.fillText(flowers[Math.floor(hash2(tx, ty, 1261) * flowers.length) % flowers.length], screenX + size * 0.5, screenY + size * 0.52);
  } else if (event.type === "migration" && event.active) {
    const herd = ["🐇", "🦌", "🦊", "🐿️", "🦔", "🐾"];
    const flee = fleeOffset(tx, ty, size);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = hash2(tx, ty, 1270) > 0.5 ? "#fff2cf" : "#ffba7a";
    ctx.fillText(herd[Math.floor(hash2(tx, ty, 1271) * herd.length) % herd.length], screenX + size * 0.5 + flee.x, screenY + size * 0.5 + flee.y);
  } else if (event.type === "sakuraGiant") {
    ctx.globalAlpha = event.distance < 3.5 ? 1 : 0.86;
    ctx.fillStyle = event.distance < 3.5 ? "#ffb4d2" : "#ff82b2";
    const glyph = event.distance < 2.4 ? "🌸" : hash2(tx, ty, 1280) > 0.5 ? "✿" : "♧";
    ctx.font = `${Math.max(14, Math.floor(size * (event.distance < 3.5 ? 1.06 : 0.82)))}px ${EMOJI_FONT}`;
    ctx.fillText(glyph, screenX + size * 0.5, screenY + size * 0.5);
  } else if (event.type === "crystalField") {
    ctx.globalAlpha = 0.9;
    const palette = ["#aef7ff", "#d9b7ff", "#8fffe1", "#fff19a"];
    ctx.fillStyle = palette[Math.floor(hash2(tx, ty, 1290) * palette.length) % palette.length];
    ctx.fillText(hash2(tx, ty, 1291) > 0.42 ? "♦" : "◇", screenX + size * 0.5, screenY + size * 0.52);
  } else if (event.type === "plantPatch") {
    if (isPlantHarvested(plantHarvestKey(tx, ty, event.plant.id))) return;
    const bloom = 0.9 + Math.max(0, Math.sin(elapsed * 2.4 + tx * 0.35 + ty * 0.52)) * 0.28;
    ctx.globalAlpha = 0.86;
    ctx.fillStyle = event.plant.color;
    ctx.font = `${Math.max(13, Math.floor(size * 0.78 * bloom))}px ${EMOJI_FONT}`;
    ctx.fillText(event.plant.glyph, screenX + size * 0.5, screenY + size * 0.52);
  } else if (event.type === "desertedIsland") {
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = "#efe0a7";
    ctx.font = `${Math.max(12, Math.floor(size * 0.7))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillText(hash2(tx, ty, 1320) > 0.5 ? "◇" : "·", screenX + size * 0.5, screenY + size * 0.52);
  } else if (event.type === "caveMouth" || event.type === "caveExit") {
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "#050505";
    ctx.fillText("◖", screenX + size * 0.42, screenY + size * 0.54);
    ctx.fillText("◗", screenX + size * 0.58, screenY + size * 0.54);
    ctx.fillStyle = "#c7b79b";
    ctx.globalAlpha = 0.62 + Math.max(0, Math.sin(elapsed * 2.4 + tx)) * 0.24;
    ctx.fillText("·", screenX + size * 0.5, screenY + size * 0.35);
  } else if (event.type === "giantCrystal") {
    const pulse = 0.9 + Math.max(0, Math.sin(elapsed * 2.8 + tx * 0.2)) * 0.28;
    const palette = ["#aef7ff", "#d9b7ff", "#8fffe1", "#fff19a", "#ff9ac7"];
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = palette[Math.floor(hash2(tx, ty, 1390) * palette.length) % palette.length];
    ctx.font = `${Math.max(18, Math.floor(size * 1.15 * pulse))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillText("♦", screenX + size * 0.5, screenY + size * 0.48);
    ctx.font = `${Math.max(11, Math.floor(size * 0.58))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillText("╱╲", screenX + size * 0.5, screenY + size * 0.78);
  } else if (event.type === "dragonTreasure") {
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#ffd36c";
    ctx.font = `${Math.max(12, Math.floor(size * 0.72))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillText("$", screenX + size * 0.5, screenY + size * 0.5);
  } else if (event.type === "dragonEgg") {
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "#d7f0df";
    ctx.font = `${Math.max(13, Math.floor(size * 0.78))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillText("()", screenX + size * 0.5, screenY + size * 0.52);
  } else if (event.type === "dragon") {
    drawDragon(screenX, screenY, size, tx, ty, event);
  }
  ctx.globalAlpha = 1;
}

function drawDragon(screenX, screenY, size, tx, ty, event) {
  if (!event.visible) return;
  const profile = dragonProfile();
  if (profile.culture === "eastern") {
    drawEasternDragon(screenX, screenY, size, tx, ty, profile);
    return;
  }
  drawWesternDragon(screenX, screenY, size, tx, ty, profile);
}

function drawEasternDragon(screenX, screenY, size, tx, ty, profile) {
  const pulse = Math.sin(elapsed * 2.1 + tx * 0.2 + ty * 0.1);
  const scale = size * 0.95;
  const originX = screenX + size * 0.5;
  const originY = screenY + size * 0.5 + pulse * size * 0.08;
  const spine = easternDragonSpine(originX, originY, scale, pulse);
  ctx.save();
  drawEasternDragonBody(spine, scale, profile);
  drawEasternMane(spine, scale, profile);
  drawDragonTail(spine[0].x, spine[0].y, scale * 0.82, profile, "eastern");
  drawDragonHead(spine[spine.length - 1].x + scale * 0.2, spine[spine.length - 1].y - scale * 0.1, scale * 1.05, profile, "eastern");
  drawDragonWhiskers(spine[spine.length - 1].x + scale * 0.52, spine[spine.length - 1].y + scale * 0.1, scale, profile);
  for (const index of [4, 7, 10]) drawDragonClaw(spine[index].x, spine[index].y + scale * 0.42, scale * 0.6, profile, "eastern");
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawWesternDragon(screenX, screenY, size, tx, ty, profile) {
  const pulse = Math.sin(elapsed * 1.8 + tx * 0.2 + ty * 0.1);
  const scale = size * 1.05;
  const cx = screenX + size * 0.5;
  const cy = screenY + size * 0.5 + pulse * size * 0.05;

  ctx.save();
  drawWesternWing(cx - scale * 0.38, cy - scale * 0.22, scale * 1.28, profile, -1, pulse);
  drawWesternWing(cx + scale * 0.38, cy - scale * 0.22, scale * 1.28, profile, 1, pulse);
  drawDragonTail(cx - scale * 0.62, cy + scale * 1.02, scale * 1.05, profile, "western");
  drawWesternStandingBody(cx, cy + scale * 0.2, scale, profile);
  drawWesternChestPlates(cx, cy + scale * 0.24, scale, profile);
  drawDragonHead(cx, cy - scale * 0.9, scale * 1.03, profile, "western");
  drawDragonClaw(cx - scale * 0.48, cy + scale * 0.94, scale * 0.72, profile, "western");
  drawDragonClaw(cx + scale * 0.48, cy + scale * 0.94, scale * 0.72, profile, "western");
  ctx.restore();
  ctx.globalAlpha = 1;
}

function easternDragonSpine(originX, originY, scale, pulse) {
  const points = [];
  for (let i = 0; i < 14; i += 1) {
    const t = i / 13;
    const curl = Math.sin(t * Math.PI * 2.25 + pulse * 0.18);
    const x = originX + (t - 0.5) * scale * 5.8;
    const y = originY + curl * scale * 1.05 + Math.cos(t * Math.PI * 3.4 + elapsed * 0.8) * scale * 0.12;
    points.push({ x, y, t });
  }
  return points;
}

function drawEasternDragonBody(spine, scale, profile) {
  ctx.strokeStyle = profile.colors.body;
  ctx.lineWidth = Math.max(4, scale * 0.56);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.93;
  ctx.beginPath();
  ctx.moveTo(spine[0].x, spine[0].y);
  for (let i = 1; i < spine.length - 1; i += 1) {
    const midX = (spine[i].x + spine[i + 1].x) / 2;
    const midY = (spine[i].y + spine[i + 1].y) / 2;
    ctx.quadraticCurveTo(spine[i].x, spine[i].y, midX, midY);
  }
  ctx.stroke();

  ctx.strokeStyle = profile.colors.belly;
  ctx.lineWidth = Math.max(2, scale * 0.22);
  ctx.globalAlpha = 0.88;
  ctx.beginPath();
  ctx.moveTo(spine[1].x, spine[1].y + scale * 0.18);
  for (let i = 2; i < spine.length - 1; i += 1) {
    ctx.lineTo(spine[i].x, spine[i].y + scale * 0.18);
  }
  ctx.stroke();
  ctx.lineCap = "butt";

  ctx.fillStyle = profile.colors.scale;
  ctx.font = `${Math.max(8, Math.floor(scale * 0.26))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 0.72;
  for (let i = 2; i < spine.length - 2; i += 2) {
    ctx.fillText(profile.scalePattern[i % profile.scalePattern.length], spine[i].x, spine[i].y - scale * 0.12);
  }
  ctx.globalAlpha = 1;
}

function drawEasternMane(spine, scale, profile) {
  ctx.strokeStyle = profile.colors.accent;
  ctx.lineWidth = Math.max(1, scale * 0.08);
  ctx.globalAlpha = 0.78;
  for (let i = 6; i < spine.length; i += 1) {
    const point = spine[i];
    ctx.beginPath();
    ctx.moveTo(point.x, point.y - scale * 0.22);
    ctx.lineTo(point.x - scale * 0.12, point.y - scale * (0.5 + (i % 3) * 0.12));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawDragonWhiskers(x, y, scale, profile) {
  ctx.strokeStyle = profile.colors.accent;
  ctx.lineWidth = Math.max(1, scale * 0.06);
  ctx.globalAlpha = 0.82;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + side * scale * 0.7, y + scale * 0.34, x + side * scale * 1.25, y + scale * 0.08);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - side * scale * 0.08, y + scale * 0.1);
    ctx.quadraticCurveTo(x + side * scale * 0.55, y + scale * 0.56, x + side * scale * 1.0, y + scale * 0.48);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawWesternStandingBody(cx, cy, scale, profile) {
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = profile.colors.body;
  ctx.beginPath();
  ctx.ellipse(cx, cy, scale * 0.62, scale * 1.0, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = profile.colors.belly;
  ctx.beginPath();
  ctx.ellipse(cx, cy + scale * 0.12, scale * 0.32, scale * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawWesternChestPlates(cx, cy, scale, profile) {
  ctx.strokeStyle = profile.colors.scale;
  ctx.lineWidth = Math.max(1, scale * 0.08);
  ctx.globalAlpha = 0.86;
  for (let i = 0; i < 5; i += 1) {
    const y = cy - scale * 0.54 + i * scale * 0.24;
    ctx.beginPath();
    ctx.moveTo(cx - scale * (0.26 - i * 0.015), y);
    ctx.lineTo(cx, y + scale * 0.12);
    ctx.lineTo(cx + scale * (0.26 - i * 0.015), y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawDragonBodySegment(x, y, rx, ry, profile, index) {
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = profile.colors.body;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = profile.colors.belly;
  ctx.beginPath();
  ctx.ellipse(x, y + ry * 0.32, rx * 0.72, ry * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = profile.colors.scale;
  ctx.font = `${Math.max(8, Math.floor(rx * 0.48))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 0.86;
  ctx.fillText(profile.scalePattern[index % profile.scalePattern.length], x, y - ry * 0.1);
  ctx.globalAlpha = 1;
}

function drawDragonHead(x, y, scale, profile, culture) {
  ctx.globalAlpha = 0.96;
  ctx.fillStyle = profile.colors.body;
  ctx.beginPath();
  if (culture === "eastern") {
    ctx.ellipse(x, y, scale * 0.7, scale * 0.44, -0.08, 0, Math.PI * 2);
  } else {
    ctx.ellipse(x, y, scale * 0.48, scale * 0.62, 0.02, 0, Math.PI * 2);
  }
  ctx.fill();

  ctx.fillStyle = profile.colors.belly;
  ctx.beginPath();
  ctx.ellipse(x + scale * 0.28, y + scale * 0.12, scale * 0.25, scale * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();

  drawDragonHorn(x - scale * 0.18, y - scale * 0.42, scale * (culture === "eastern" ? 0.72 : 0.82), profile, -1);
  drawDragonHorn(x + scale * 0.14, y - scale * 0.44, scale * (culture === "eastern" ? 0.72 : 0.82), profile, 1);
  drawDragonEye(x + scale * 0.08, y - scale * 0.1, scale, profile);
  drawDragonEye(x + scale * 0.35, y - scale * 0.08, scale, profile);

  if (culture === "western") {
    ctx.fillStyle = profile.colors.accent;
    ctx.globalAlpha = 0.82;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x + i * scale * 0.12, y - scale * 0.5);
      ctx.lineTo(x + i * scale * 0.12 + scale * 0.08, y - scale * 0.86);
      ctx.lineTo(x + i * scale * 0.12 + scale * 0.16, y - scale * 0.48);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.strokeStyle = profile.colors.accent;
  ctx.lineWidth = Math.max(1, scale * 0.07);
  ctx.globalAlpha = 0.78;
  ctx.beginPath();
  ctx.moveTo(x + scale * 0.52, y + scale * 0.12);
  ctx.lineTo(x + scale * 0.82, y + scale * 0.18);
  ctx.stroke();
  if (culture === "eastern") {
    ctx.beginPath();
    ctx.moveTo(x + scale * 0.42, y + scale * 0.2);
    ctx.quadraticCurveTo(x + scale * 0.78, y + scale * 0.48, x + scale * 1.02, y + scale * 0.36);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + scale * 0.38, y + scale * 0.24);
    ctx.quadraticCurveTo(x + scale * 0.72, y + scale * 0.58, x + scale * 0.9, y + scale * 0.54);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawDragonEye(x, y, scale, profile) {
  ctx.fillStyle = "#fff8cf";
  ctx.globalAlpha = 0.96;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1.4, scale * 0.08), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = profile.colors.eye;
  ctx.beginPath();
  ctx.arc(x + scale * 0.02, y, Math.max(1, scale * 0.04), 0, Math.PI * 2);
  ctx.fill();
}

function drawDragonHorn(x, y, scale, profile, direction) {
  ctx.fillStyle = profile.colors.horn;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + direction * scale * 0.2, y - scale * 0.52);
  ctx.lineTo(x + direction * scale * 0.42, y + scale * 0.02);
  ctx.closePath();
  ctx.fill();
}

function drawDragonClaw(x, y, scale, profile, culture) {
  ctx.strokeStyle = profile.colors.horn;
  ctx.lineWidth = Math.max(1, scale * 0.08);
  ctx.globalAlpha = 0.9;
  for (const offset of [-0.18, 0, 0.18]) {
    ctx.beginPath();
    ctx.moveTo(x + scale * offset, y - scale * 0.18);
    ctx.lineTo(x + scale * (offset + 0.03), y + scale * 0.2);
    ctx.lineTo(x + scale * (offset + 0.14), y + scale * 0.28);
    ctx.stroke();
  }
  if (culture === "eastern") {
    ctx.strokeStyle = profile.colors.body;
    ctx.beginPath();
    ctx.moveTo(x - scale * 0.22, y - scale * 0.2);
    ctx.lineTo(x, y - scale * 0.38);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawWesternWing(x, y, scale, profile, direction, pulse) {
  const lift = pulse > 0 ? -scale * 0.28 : scale * 0.02;
  ctx.fillStyle = profile.colors.body;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + direction * scale * 0.68, y - scale * 1.22 + lift);
  ctx.lineTo(x + direction * scale * 1.25, y - scale * 0.1 + lift);
  ctx.quadraticCurveTo(x + direction * scale * 0.66, y + scale * 0.28, x, y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = profile.colors.accent;
  ctx.lineWidth = Math.max(1, scale * 0.06);
  ctx.globalAlpha = 0.78;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + direction * scale * 0.68, y - scale * 1.22 + lift);
  ctx.lineTo(x + direction * scale * 1.25, y - scale * 0.1 + lift);
  ctx.moveTo(x + direction * scale * 0.28, y - scale * 0.28);
  ctx.lineTo(x + direction * scale * 0.82, y - scale * 0.06 + lift);
  ctx.moveTo(x + direction * scale * 0.34, y - scale * 0.48);
  ctx.lineTo(x + direction * scale * 0.95, y - scale * 0.28 + lift);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawDragonTail(x, y, scale, profile, culture) {
  ctx.strokeStyle = profile.colors.body;
  ctx.lineWidth = Math.max(2, scale * 0.22);
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.82;
  ctx.beginPath();
  ctx.moveTo(x + scale * 0.42, y);
  ctx.quadraticCurveTo(x - scale * 0.3, y - scale * 0.2, x - scale * 0.62, y + scale * 0.12);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.fillStyle = profile.colors.accent;
  ctx.font = `${Math.max(7, Math.floor(scale * 0.34))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(culture === "eastern" ? "~" : ">", x - scale * 0.66, y + scale * 0.12);
  ctx.globalAlpha = 1;
}

function drawWorld() {
  const scale = canvas.width / canvas.clientWidth;
  const width = canvas.width;
  const height = canvas.height;
  const tileSize = Math.round(TILE * scale);
  const camX = player.x * scale - width / 2;
  const camY = player.y * scale - height / 2;
  const startX = Math.floor(camX / tileSize) - 2;
  const startY = Math.floor(camY / tileSize) - 2;
  const endX = startX + Math.ceil(width / tileSize) + 4;
  const endY = startY + Math.ceil(height / tileSize) + 4;

  ctx.fillStyle = "#070707";
  ctx.fillRect(0, 0, width, height);
  for (let ty = startY; ty <= endY; ty += 1) {
    for (let tx = startX; tx <= endX; tx += 1) {
      const tile = tileAt(tx, ty);
      const sx = tx * tileSize - camX;
      const sy = ty * tileSize - camY;
      drawTile(Math.floor(sx), Math.floor(sy), tile, tileSize, tx, ty);
    }
  }
}

function addTrail(tile) {
  if (!trackableTerrain.has(tile.id)) return;
  if (elapsed - lastTrailTime < 0.055) return;
  const speed = Math.hypot(player.vx, player.vy);
  if (speed < 18) return;
  lastTrailTime = elapsed;
  const dx = player.vx / speed;
  const dy = player.vy / speed;
  trails.push({
    x: player.x - dx * TILE * 0.28,
    y: player.y - dy * TILE * 0.28,
    px: -dy,
    py: dx,
    biome: tile.id,
    born: elapsed,
  });
  if (trails.length > 160) trails.splice(0, trails.length - 160);
}

function trailGlyph(biome) {
  if (waterTerrain.has(biome)) return "≈";
  if (biome === "beach") return ".";
  if (biome === "desert") return "`";
  if (biome === "snow") return "*";
  if (biome === "stone") return "·";
  if (biome === "ember") return "'";
  return ",";
}

function drawTrails() {
  const scale = canvas.width / canvas.clientWidth;
  const width = canvas.width;
  const height = canvas.height;
  const camX = player.x * scale - width / 2;
  const camY = player.y * scale - height / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.max(10, Math.floor(TILE * scale * 0.62))}px ui-monospace, SFMono-Regular, Menlo, monospace`;

  for (let i = trails.length - 1; i >= 0; i -= 1) {
    const trail = trails[i];
    const age = elapsed - trail.born;
    if (age > 1.35) {
      trails.splice(i, 1);
      continue;
    }
    const fade = 1 - age / 1.35;
    const sx = trail.x * scale - camX;
    const sy = trail.y * scale - camY;
    const spread = (4 + age * 6) * scale;
    ctx.globalAlpha = fade * 0.65;
    ctx.fillStyle = "rgba(5, 5, 5, 0.72)";
    ctx.fillRect(sx - 5 * scale, sy - 5 * scale, 10 * scale, 10 * scale);
    ctx.fillStyle = waterTerrain.has(trail.biome) ? "#bfeeff" : trail.biome === "beach" || trail.biome === "desert" ? "#d9bf82" : trail.biome === "snow" ? "#eef8ff" : "#a7c08f";
    const glyph = trailGlyph(trail.biome);
    ctx.fillText(glyph, sx + trail.px * spread, sy + trail.py * spread);
    ctx.fillText(glyph, sx - trail.px * spread, sy - trail.py * spread);
  }
  ctx.globalAlpha = 1;
}

function drawDroppedAnimals() {
  const scale = canvas.width / canvas.clientWidth;
  const width = canvas.width;
  const height = canvas.height;
  const camX = player.x * scale - width / 2;
  const camY = player.y * scale - height / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.max(13, Math.floor(TILE * scale * 0.82))}px ${EMOJI_FONT}`;
  ctx.globalAlpha = 0.92;
  for (const animal of droppedAnimals) {
    const sx = animal.x * scale - camX;
    const sy = animal.y * scale - camY;
    ctx.fillText(animal.rare.glyph, sx, sy);
  }
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  const scale = canvas.width / canvas.clientWidth;
  const x = canvas.width / 2;
  const y = canvas.height / 2;
  const s = Math.round(13 * scale);
  const tile = tileAt(Math.floor(player.x / TILE), Math.floor(player.y / TILE));
  const sailing = waterTerrain.has(tile.id);
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fillRect(x - s / 2 + scale * 2, y + s / 2, s, Math.max(2, scale * 2));

  if (sailing) {
    ctx.fillStyle = "#5b3a26";
    ctx.fillRect(x - s * 0.85, y - s * 0.08, s * 1.7, s * 0.38);
    ctx.fillStyle = "#8f6440";
    ctx.fillRect(x - s * 0.62, y - s * 0.3, s * 1.24, s * 0.32);
    ctx.fillStyle = "#f0e5c7";
    ctx.fillRect(x - scale, y - s * 1.15, Math.max(2, scale * 2), s * 0.82);
    ctx.fillStyle = "#d8c397";
    ctx.fillRect(x + player.facing * s * 0.08, y - s * 1.02, s * 0.48 * player.facing, s * 0.34);
    ctx.fillStyle = "#1a120c";
    ctx.fillRect(x + player.facing * s * 0.38, y - s * 0.22, Math.max(2, scale * 2), Math.max(2, scale * 2));
    if (carriedAnimal) {
      ctx.font = `${Math.max(15, Math.floor(15 * scale))}px ${EMOJI_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.96;
      ctx.fillText(carriedAnimal.glyph, x - player.facing * s * 0.75, y - s * 0.8);
      ctx.globalAlpha = 1;
    }
    return;
  }

  ctx.fillStyle = "#e7e0d1";
  ctx.fillRect(x - s * 0.5, y - s * 0.36, s, s * 0.72);
  ctx.fillStyle = "#f5f0e7";
  ctx.fillRect(x - s * 0.36, y - s * 0.55, s * 0.72, s * 0.22);
  ctx.fillRect(x - s * 0.36, y + s * 0.33, s * 0.72, s * 0.22);
  ctx.fillStyle = "#141414";
  ctx.fillRect(x + player.facing * s * 0.2, y - s * 0.1, Math.max(2, scale * 2), Math.max(2, scale * 2));
  if (carriedAnimal) {
    ctx.font = `${Math.max(15, Math.floor(15 * scale))}px ${EMOJI_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.96;
    ctx.fillText(carriedAnimal.glyph, x + player.facing * s * 0.9, y - s * 0.72);
    ctx.globalAlpha = 1;
  }
}

function drawWeather(weather) {
  const scale = canvas.width / canvas.clientWidth;
  const w = canvas.width;
  const h = canvas.height;
  if (weather === "rain") {
    ctx.strokeStyle = "rgba(91, 210, 255, 0.16)";
    ctx.lineWidth = Math.max(1, scale * 0.75);
    for (let i = 0; i < 110; i += 1) {
      const x = (hash2(i, 1, 900) * w + elapsed * 72 * scale) % w;
      const y = (hash2(i, 2, 901) * h + elapsed * 190 * scale) % h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 8 * scale, y + 14 * scale);
      ctx.stroke();
    }
  } else if (weather === "snow" || weather === "ash") {
    ctx.fillStyle = weather === "snow" ? "rgba(235, 252, 255, 0.24)" : "rgba(255, 126, 64, 0.15)";
    ctx.font = `${Math.max(10, Math.floor(9 * scale))}px ${EMOJI_FONT}`;
    for (let i = 0; i < 90; i += 1) {
      const x = (hash2(i, 3, 910) * w + Math.sin(elapsed + i) * 22 * scale) % w;
      const y = (hash2(i, 4, 911) * h + elapsed * (24 + hash2(i, 5, 912) * 28) * scale) % h;
      ctx.fillText(weather === "snow" ? "*" : "'", x, y);
    }
  } else if (weather === "fog" || weather === "sand") {
    ctx.fillStyle = weather === "fog" ? "rgba(150, 202, 255, 0.045)" : "rgba(255, 187, 64, 0.05)";
    for (let i = 0; i < 8; i += 1) {
      const y = ((i * 94 + elapsed * 18) * scale) % h;
      ctx.fillRect(0, y, w, 30 * scale);
    }
  } else if (weather === "fireflies") {
    ctx.fillStyle = "rgba(255, 230, 82, 0.24)";
    for (let i = 0; i < 32; i += 1) {
      const x = (hash2(i, 6, 930) * w + Math.sin(elapsed * 1.6 + i) * 24 * scale) % w;
      const y = (hash2(i, 7, 931) * h + Math.cos(elapsed * 1.1 + i) * 18 * scale) % h;
      ctx.fillText("·", x, y);
    }
  }
}

function drawLight() {
  const day = (elapsed * 0.025) % 1;
  const darkness = 0.02 + Math.max(0, Math.cos((day - 0.5) * Math.PI * 2)) * 0.28;
  ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawMini() {
  if (!showMini) return;
  setMapSize();
  const centerX = Math.floor(player.x / TILE);
  const centerY = Math.floor(player.y / TILE);
  const size = miniCanvas.width;
  const radius = Math.floor(size / 2);
  const step = mapExpanded ? 2 : 1;
  miniCtx.fillStyle = "#060606";
  miniCtx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const tx = centerX + Math.floor((x - radius) * step);
      const ty = centerY + Math.floor((y - radius) * step);
      const tile = tileAt(tx, ty);
      const event = eventAt(tx, ty, tile);
      const settlement = settlementAt(tx, ty, tile);
      if (hash2(centerX + x, centerY + y, 777) < 0.18) continue;
      miniCtx.fillStyle = mapColor(tile, event, settlement);
      miniCtx.fillRect(x, y, 1, 1);
    }
  }
  miniCtx.fillStyle = "#f3eee4";
  miniCtx.fillRect(radius - 1, radius - 1, 3, 3);
}

function inputVector() {
  let x = 0;
  let y = 0;
  if (keys.has("arrowleft") || keys.has("a")) x -= 1;
  if (keys.has("arrowright") || keys.has("d")) x += 1;
  if (keys.has("arrowup") || keys.has("w")) y -= 1;
  if (keys.has("arrowdown") || keys.has("s")) y += 1;

  if (pointer.active) {
    const rect = canvas.getBoundingClientRect();
    const dx = pointer.x - rect.width / 2;
    const dy = pointer.y - rect.height / 2;
    const distance = Math.hypot(dx, dy);
    if (distance > 18) {
      x += dx / Math.max(distance, 1);
      y += dy / Math.max(distance, 1);
    }
  }

  const length = Math.hypot(x, y);
  return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}

function update(dt) {
  if (paused) return;
  elapsed += dt;
  updateDroppedAnimals(dt);
  const v = inputVector();
  const tile = tileAt(Math.floor(player.x / TILE), Math.floor(player.y / TILE));
  const run = keys.has("shift") ? 1.55 : 1;
  const speed = 102 * tile.walk * run * speedMultipliers[speedSetting];
  player.vx += (v.x * speed - player.vx) * Math.min(1, dt * 9);
  player.vy += (v.y * speed - player.vy) * Math.min(1, dt * 9);
  const nextX = player.x + player.vx * dt;
  const nextY = player.y + player.vy * dt;
  if (canStandAt(nextX, player.y)) {
    player.x = nextX;
  } else {
    player.vx *= -0.18;
  }
  if (canStandAt(player.x, nextY)) {
    player.y = nextY;
  } else {
    player.vy *= -0.18;
  }
  if (Math.abs(player.vx) > 2) player.facing = player.vx > 0 ? 1 : -1;
  addTrail(tile);
}

function updateDroppedAnimals(dt) {
  for (const animal of droppedAnimals) {
    const dx = animal.x - player.x;
    const dy = animal.y - player.y;
    const distance = Math.hypot(dx, dy);
    let ax = Math.sin(elapsed * 0.9 + animal.id.length) * 8;
    let ay = Math.cos(elapsed * 0.7 + animal.id.length * 0.31) * 8;
    if (distance > 0.001 && distance < 120) {
      const flee = (1 - distance / 120) * 72;
      ax += (dx / distance) * flee;
      ay += (dy / distance) * flee;
    }
    animal.vx = (animal.vx || 0) + ax * dt;
    animal.vy = (animal.vy || 0) + ay * dt;
    const speed = Math.hypot(animal.vx, animal.vy);
    const maxSpeed = animal.rare.id === "turtle" ? 28 : animal.rare.id === "fish" ? 38 : 48;
    if (speed > maxSpeed) {
      animal.vx = (animal.vx / speed) * maxSpeed;
      animal.vy = (animal.vy / speed) * maxSpeed;
    }
    const nextX = animal.x + animal.vx * dt;
    const nextY = animal.y + animal.vy * dt;
    if (canStandAt(nextX, animal.y)) animal.x = nextX;
    else animal.vx *= -0.5;
    if (canStandAt(animal.x, nextY)) animal.y = nextY;
    else animal.vy *= -0.5;
    animal.vx *= 0.992;
    animal.vy *= 0.992;
  }
}

function render() {
  const currentTile = tileAt(Math.floor(player.x / TILE), Math.floor(player.y / TILE));
  const currentTx = Math.floor(player.x / TILE);
  const currentTy = Math.floor(player.y / TILE);
  const currentEvent = eventAt(currentTx, currentTy, currentTile);
  const currentSettlement = settlementAt(currentTx, currentTy, currentTile);
  const weather = weatherAt(player.x, player.y);
  drawWorld();
  drawDroppedAnimals();
  drawTrails();
  drawLight();
  drawWeather(weather);
  drawPlayer();

  uiTick += 1;
  if (uiTick % 12 === 0) {
    const day = (elapsed * 0.025) % 1;
    const phase = day < 0.22 ? "黎明" : day < 0.52 ? "白昼" : day < 0.72 ? "黄昏" : "夜晚";
    placeEl.textContent = worldMode === "cave" ? `洞窟 x ${Math.round(player.x / TILE)} · y ${Math.round(player.y / TILE)}` : `x ${Math.round(player.x / TILE)} · y ${Math.round(player.y / TILE)}`;
    biomeEl.textContent = currentTile.name;
    eventEl.textContent = currentEvent?.label || currentSettlement?.label || eventLabels.none;
    weatherEl.textContent = weatherLabels[weather];
    timeEl.textContent = worldMode === "cave" ? "地下" : phase;
    remember(`biome:${currentTile.id}`, `到达 ${currentTile.name}`);
    if (currentEvent) remember(`event:${currentEvent.type}`, currentEvent.label);
    if (currentSettlement) remember(`settlement:${currentSettlement.label}`, `经过 ${currentSettlement.label}`);
    const nearby = nearestRareThing();
    const action = nearbyInteraction();
    const label = carriedAnimal ? `抱着 ${carriedAnimal.label}` : selectedItem ? `选中 ${selectedItem}` : action ? `${action.label} · 可交互` : nearby ? nearby.label : "";
    nearbyEl.textContent = label;
    nearbyEl.classList.toggle("is-hidden", !label);
  }
  if (uiTick % 24 === 0) drawMini();
}

function loop(time) {
  const dt = Math.min(0.05, (time - lastTime) / 1000 || 0);
  lastTime = time;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "e" && !lastInteractKey) {
    event.preventDefault();
    lastInteractKey = true;
    triggerInteract();
    return;
  }
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "shift"].includes(key)) {
    event.preventDefault();
    keys.add(key);
  }
});
window.addEventListener("keyup", (event) => {
  if (event.key.toLowerCase() === "e") lastInteractKey = false;
  keys.delete(event.key.toLowerCase());
});

itemsEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-item]");
  if (!button) return;
  selectItem(button.dataset.item);
});

memoriesEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-memory]");
  if (!button) return;
  if (memoryDetailEl) {
    memoryDetailEl.textContent = button.dataset.memory;
    memoryDetailEl.classList.remove("is-hidden");
  } else {
    nearbyEl.textContent = button.dataset.memory;
    nearbyEl.classList.remove("is-hidden");
  }
});

memoryDetailEl?.addEventListener("click", () => {
  memoryDetailEl.classList.add("is-hidden");
});

canvas.addEventListener("pointerdown", (event) => {
  pointer.active = true;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});
canvas.addEventListener("pointerup", () => {
  pointer.active = false;
});

pauseBtn.addEventListener("click", () => {
  paused = !paused;
  pauseBtn.textContent = paused ? "▶" : "Ⅱ";
});

interactBtn.addEventListener("pointerdown", triggerInteract);
interactBtn.addEventListener("click", triggerInteract);
touchInteractBtn.addEventListener("pointerdown", triggerInteract);
touchInteractBtn.addEventListener("click", triggerInteract);
discardBtn.addEventListener("pointerdown", triggerDiscard);
discardBtn.addEventListener("click", triggerDiscard);

teleportBtn?.addEventListener("click", () => {
  setTeleportOpen(!teleportOpen);
});

teleportListEl?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-teleport]");
  if (!button) return;
  selectedTeleport = button.dataset.teleport;
  renderTeleportList();
});

teleportGoBtn?.addEventListener("click", teleportToSelectedBiome);

seedBtn.addEventListener("click", () => {
  seed = Math.floor(Math.random() * 100000);
  worldMode = "surface";
  caveOrigin = null;
  surfaceReturn = null;
  player.vx = 0;
  player.vy = 0;
  elapsed = 0;
  trails.length = 0;
  inventory.clear();
  selectedItem = "";
  carriedAnimal = null;
  droppedAnimals.length = 0;
  suppressedRare.clear();
  setTeleportOpen(false);
  renderInventory();
  findLandSpawn();
  drawMini();
});

mapBtn.addEventListener("click", () => {
  if (!showMini) {
    showMini = true;
    mapExpanded = false;
  } else {
    mapExpanded = !mapExpanded;
  }
  miniEl.classList.toggle("is-hidden", !showMini);
  miniEl.classList.toggle("is-expanded", mapExpanded);
  mapBtn.textContent = mapExpanded ? "▣" : "□";
  mapBtn.title = mapExpanded ? "收回小地图" : "放大地图";
  mapBtn.setAttribute("aria-label", mapExpanded ? "收回小地图" : "放大地图");
  drawMini();
});

miniEl.addEventListener("click", (event) => {
  if (!showMini) return;
  if (mapExpanded) {
    teleportToMapPoint(event);
    return;
  }
  mapExpanded = !mapExpanded;
  miniEl.classList.toggle("is-expanded", mapExpanded);
  mapBtn.textContent = mapExpanded ? "▣" : "□";
  mapBtn.title = mapExpanded ? "收回小地图" : "放大地图";
  mapBtn.setAttribute("aria-label", mapExpanded ? "收回小地图" : "放大地图");
  drawMini();
});

speedButtons.forEach((button) => {
  button.addEventListener("click", () => {
    speedSetting = button.dataset.speed;
    speedButtons.forEach((item) => {
      item.setAttribute("aria-pressed", String(item === button));
    });
  });
});

resize();
setMapSize();
findLandSpawn();
renderInventory();
renderMemory();
renderTeleportList();
drawMini();
requestAnimationFrame(loop);
