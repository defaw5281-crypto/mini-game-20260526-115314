const SYMBOLS = ["🌸", "🍃", "🍄", "🥕", "🍓", "⭐", "💠", "🌾", "☘️", "🌼", "🌷", "🍀"];
const STORAGE_KEY = "xiaomeng-flip-challenge-progress-v520";
const BASE_SLOTS = 7;
const EXPANDED_SLOTS = 10;
const GAME_NAME = "小孟--翻牌挑战";
const GAME_VERSION = "V520.13.14";

const LEVELS = [
  {
    level: 1,
    name: "晨光花径",
    normalGroups: 10,
    layers: 4,
    template: "pyramid",
    reservePileCount: 3,
    reservePileSize: 3,
    rewardCount: 1,
    trapCount: 0,
    mysteryCount: 0,
    jokerCount: 0,
    initialProps: { hint: 3, undo: 3, shuffle: 1, expand: 1 },
    difficulty: 1,
  },
  {
    level: 2,
    name: "树篱十字",
    normalGroups: 14,
    layers: 5,
    template: "cross",
    reservePileCount: 3,
    reservePileSize: 4,
    rewardCount: 1,
    trapCount: 0,
    mysteryCount: 0,
    jokerCount: 0,
    initialProps: { hint: 3, undo: 2, shuffle: 1, expand: 1 },
    difficulty: 2,
  },
  {
    level: 3,
    name: "问号旋涡",
    normalGroups: 18,
    layers: 6,
    template: "petal",
    reservePileCount: 3,
    reservePileSize: 5,
    rewardCount: 1,
    trapCount: 0,
    mysteryCount: 2,
    jokerCount: 1,
    initialProps: { hint: 2, undo: 2, shuffle: 1, expand: 1 },
    difficulty: 3,
  },
  {
    level: 4,
    name: "双岛迷园",
    normalGroups: 22,
    layers: 7,
    template: "twin",
    reservePileCount: 3,
    reservePileSize: 5,
    rewardCount: 2,
    trapCount: 2,
    mysteryCount: 2,
    jokerCount: 1,
    initialProps: { hint: 2, undo: 2, shuffle: 1, expand: 1 },
    difficulty: 4,
  },
  {
    level: 5,
    name: "诱导开口",
    normalGroups: 28,
    layers: 8,
    template: "diamond",
    reservePileCount: 3,
    reservePileSize: 6,
    rewardCount: 2,
    trapCount: 3,
    mysteryCount: 3,
    jokerCount: 2,
    initialProps: { hint: 2, undo: 1, shuffle: 1, expand: 1 },
    difficulty: 5,
  },
];

const els = {
  board: document.querySelector("#board"),
  floatLayer: document.querySelector("#floatLayer"),
  levelStrip: document.querySelector("#levelStrip"),
  reservePiles: document.querySelector("#reservePiles"),
  slots: document.querySelector("#slots"),
  livesText: document.querySelector("#livesText"),
  levelTitle: document.querySelector("#levelTitle"),
  starRow: document.querySelector("#starRow"),
  progressFill: document.querySelector("#progressFill"),
  coinText: document.querySelector("#coinText"),
  slotCountText: document.querySelector("#slotCountText"),
  riskText: document.querySelector("#riskText"),
  helpBtn: document.querySelector("#helpBtn"),
  settingsBtn: document.querySelector("#settingsBtn"),
  hintBtn: document.querySelector("#hintBtn"),
  undoBtn: document.querySelector("#undoBtn"),
  shuffleBtn: document.querySelector("#shuffleBtn"),
  expandBtn: document.querySelector("#expandBtn"),
  hintCount: document.querySelector("#hintCount"),
  undoCount: document.querySelector("#undoCount"),
  shuffleCount: document.querySelector("#shuffleCount"),
  expandCount: document.querySelector("#expandCount"),
  dialog: document.querySelector("#gameDialog"),
  dialogTitle: document.querySelector("#dialogTitle"),
  dialogText: document.querySelector("#dialogText"),
  dialogPrimaryBtn: document.querySelector("#dialogPrimaryBtn"),
  resetProgressBtn: document.querySelector("#resetProgressBtn"),
};

const GameState = {
  currentLevel: 1,
  unlockedLevel: 1,
  score: 0,
  lives: 5,
  coins: 0,
  slots: [],
  maxSlots: BASE_SLOTS,
  selectedHistory: [],
  boardCards: [],
  reservePiles: [],
  props: { hint: 0, undo: 0, shuffle: 0, expand: 0 },
  combo: 1,
  status: "ready",
  riskMeter: 0,
  hintedCardId: null,
  started: false,
  testing: false,
};

let idSeed = 0;
let toastTimer = 0;

function nextId(prefix = "card") {
  idSeed += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSeed.toString(36)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    GameState.unlockedLevel = clamp(Number(saved.unlockedLevel) || 1, 1, LEVELS.length);
    GameState.lives = clamp(Number(saved.lives) || 5, 0, 5);
    GameState.coins = Number(saved.coins) || 0;
  } catch {
    GameState.unlockedLevel = 1;
    GameState.lives = 5;
    GameState.coins = 0;
  }
}

function saveProgress() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      unlockedLevel: GameState.unlockedLevel,
      lives: GameState.lives,
      coins: GameState.coins,
    }),
  );
}

function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
  GameState.unlockedLevel = 1;
  GameState.lives = 5;
  GameState.coins = 0;
  startLevel(1);
  showToast("进度已重置");
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function makeNormalDeck(config) {
  const usable = SYMBOLS.slice(0, Math.min(SYMBOLS.length, 5 + config.difficulty));
  const deck = [];
  for (let i = 0; i < config.normalGroups; i += 1) {
    const symbol = usable[i % usable.length];
    deck.push(symbol, symbol, symbol);
  }

  const starters = [];
  if (config.level === 1) {
    starters.push(usable[0], usable[0], usable[0], usable[1], usable[1], usable[2], usable[2], usable[3]);
  } else {
    starters.push(usable[0], usable[0], usable[1], usable[1], usable[2], usable[3], usable[3]);
  }

  const remaining = deck.filter((symbol, index) => {
    const starterIndex = starters.indexOf(symbol);
    if (starterIndex < 0) return true;
    starters.splice(starterIndex, 1);
    return false;
  });

  return [...(config.level === 1 ? [usable[0], usable[0], usable[0], usable[1], usable[1], usable[2], usable[2], usable[3]] : [usable[0], usable[0], usable[1], usable[1], usable[2], usable[3], usable[3]]), ...shuffle(remaining)];
}

function makeCard({ type = "normal", symbol = "", layer = 0, x = 0.5, y = 0.5, source = "board" }) {
  return {
    id: nextId(type),
    type,
    symbol,
    layer,
    x,
    y,
    width: 1,
    height: 1,
    blockedBy: [],
    isClickable: false,
    isRemoved: false,
    isLocked: false,
    source,
    faceDownUntil: 0,
  };
}

function generateTemplatePositions(template, count, layers) {
  const positions = [];
  const safeLayers = Math.max(1, layers || 1);

  const shapes = {
    pyramid: [
      [-3, 2], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2], [3, 2],
      [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1],
      [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0],
      [-1, -1], [0, -1], [1, -1],
      [0, -2],
    ],
    diamond: [
      [0, -3],
      [-1, -2], [0, -2], [1, -2],
      [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1],
      [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0],
      [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1],
      [-1, 2], [0, 2], [1, 2],
      [0, 3],
    ],
    cross: [
      [0, -3], [0, -2], [-1, -1], [0, -1], [1, -1],
      [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0],
      [-1, 1], [0, 1], [1, 1], [0, 2], [0, 3],
    ],
    twin: [
      [-4, -1], [-3, -1], [-2, -1], [2, -1], [3, -1], [4, -1],
      [-4, 0], [-3, 0], [-2, 0], [-1, 0], [1, 0], [2, 0], [3, 0], [4, 0],
      [-4, 1], [-3, 1], [-2, 1], [2, 1], [3, 1], [4, 1],
      [-3, 2], [-2, 2], [2, 2], [3, 2],
    ],
    petal: [
      [0, -3], [-1, -2], [1, -2],
      [-2, -1], [0, -1], [2, -1],
      [-3, 0], [-1, 0], [0, 0], [1, 0], [3, 0],
      [-2, 1], [0, 1], [2, 1],
      [-1, 2], [1, 2],
      [0, 3],
    ],
  };

  const base = shapes[template] || shapes.pyramid;

  for (let layer = 0; layer < safeLayers && positions.length < count; layer += 1) {
    const keepRatio = 1 - layer * 0.16;
    const layerCells = base
      .filter(([cx, cy]) => Math.abs(cx) + Math.abs(cy) <= 5 * keepRatio)
      .slice(0, Math.max(5, base.length - layer * 4));

    const stepX = 0.082;
    const stepY = 0.072;
    const layerOffsetX = layer * 0.012;
    const layerOffsetY = -layer * 0.012;

    layerCells.forEach(([cx, cy]) => {
      if (positions.length >= count) return;

      positions.push({
        layer,
        x: 0.5 + cx * stepX + layerOffsetX,
        y: 0.5 + cy * stepY + layerOffsetY,
        rot: 0,
      });
    });
  }

  while (positions.length < count) {
    const i = positions.length;
    const layer = Math.min(safeLayers - 1, i % safeLayers);
    const col = i % 7;
    const row = Math.floor(i / 7) % 5;

    positions.push({
      layer,
      x: 0.5 + (col - 3) * 0.075 + layer * 0.012,
      y: 0.5 + (row - 2) * 0.07 - layer * 0.012,
      rot: 0,
    });
  }

  return positions.map((pos) => ({
    ...pos,
    x: clamp(pos.x, 0.1, 0.9),
    y: clamp(pos.y, 0.12, 0.84),
    rot: 0,
  }));
}

function legacyGenerateTemplatePositions(template, count, layers) {
  const positions = [];
  if (template === "pyramid") {
    for (let layer = 0; layer < layers; layer += 1) {
      const span = 0.72 - layer * 0.08;
      const rows = Math.max(2, layers + 1 - layer);
      const cols = Math.max(3, rows + 1);
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const offset = (r % 2) * 0.035;
          positions.push({
            layer,
            x: 0.5 - span / 2 + (span * c) / Math.max(1, cols - 1) + offset,
            y: 0.15 + layer * 0.055 + (0.68 * r) / Math.max(1, rows - 1),
            rot: (Math.random() - 0.5) * 4,
          });
        }
      }
    }
  }

  if (template === "cross") {
    for (let layer = 0; layer < layers; layer += 1) {
      const width = 0.78 - layer * 0.05;
      const n = 7 - Math.min(layer, 3);
      for (let i = 0; i < n; i += 1) {
        const t = i / Math.max(1, n - 1);
        positions.push({ layer, x: 0.5 - width / 2 + t * width, y: 0.49 + layer * 0.016, rot: (Math.random() - 0.5) * 5 });
        positions.push({ layer, x: 0.5 + layer * 0.006, y: 0.16 + t * 0.68, rot: (Math.random() - 0.5) * 5 });
      }
    }
  }

  if (template === "spiral") {
    const total = Math.max(count, 28);
    for (let i = 0; i < total * 1.4; i += 1) {
      const t = i / total;
      const angle = t * Math.PI * 6.4;
      const radius = 0.38 - t * 0.23;
      const layer = i % layers;
      positions.push({
        layer,
        x: 0.5 + Math.cos(angle) * radius + layer * 0.004,
        y: 0.5 + Math.sin(angle) * radius * 1.18 + layer * 0.006,
        rot: ((angle * 180) / Math.PI) % 18,
      });
    }
  }

  if (template === "twin") {
    for (let layer = 0; layer < layers; layer += 1) {
      const rows = 4 + (layer % 2);
      const cols = 4;
      for (let side = 0; side < 2; side += 1) {
        const cx = side === 0 ? 0.31 : 0.69;
        for (let r = 0; r < rows; r += 1) {
          for (let c = 0; c < cols; c += 1) {
            positions.push({
              layer,
              x: cx - 0.17 + c * 0.105 + (r % 2) * 0.025,
              y: 0.2 + r * 0.13 + layer * 0.018,
              rot: (Math.random() - 0.5) * 7,
            });
          }
        }
      }
      positions.push({ layer, x: 0.5, y: 0.34 + layer * 0.055, rot: (Math.random() - 0.5) * 6 });
    }
  }

  if (template === "trap") {
    for (let layer = 0; layer < layers; layer += 1) {
      const ring = layer % 3;
      const cols = 7 - ring;
      const rows = 5 - (ring === 2 ? 1 : 0);
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const edgeBias = layer > layers - 3 ? 0.04 : 0;
          positions.push({
            layer,
            x: 0.12 + (0.76 * c) / Math.max(1, cols - 1) + (r % 2) * 0.03,
            y: 0.18 + (0.62 * r) / Math.max(1, rows - 1) + edgeBias,
            rot: (Math.random() - 0.5) * 9,
          });
        }
      }
    }
  }

  while (positions.length < count) {
    positions.push({
      layer: Math.floor(Math.random() * layers),
      x: 0.18 + Math.random() * 0.64,
      y: 0.16 + Math.random() * 0.68,
      rot: (Math.random() - 0.5) * 8,
    });
  }

  return positions
    .map((pos) => ({
      ...pos,
      x: clamp(pos.x, 0.08, 0.92),
      y: clamp(pos.y, 0.08, 0.88),
    }))
    .slice(0, count);
}

function planLayerCounts(count, layers) {
  const counts = Array(layers).fill(0);
  const topCount = clamp(Math.round(count * 0.3), Math.min(4, count), Math.min(9, count));
  counts[layers - 1] = topCount;
  let remaining = count - topCount;
  for (let layer = layers - 2; layer >= 0; layer -= 1) {
    const n = layer === 0 ? remaining : Math.max(1, Math.round(remaining / (layer + 1)));
    counts[layer] = n;
    remaining -= n;
  }
  return counts;
}

function selectLayeredPositions(positions, count, layers) {
  const groups = Array.from({ length: layers }, (_, layer) => positions.filter((pos) => pos.layer === layer));
  groups.forEach((group) => {
    group.sort((a, b) => {
      const ar = Math.hypot(a.x - 0.5, a.y - 0.5);
      const br = Math.hypot(b.x - 0.5, b.y - 0.5);
      return ar - br;
    });
  });
  const counts = planLayerCounts(count, layers);
  const selected = [];
  for (let layer = layers - 1; layer >= 0; layer -= 1) {
    const group = groups[layer].length ? groups[layer] : positions;
    for (let i = 0; i < counts[layer]; i += 1) {
      selected.push(group[i % group.length]);
    }
  }
  return selected;
}

function buildLevel(config) {
  const deck = makeNormalDeck(config);
  const reservePiles = [];
  for (let pile = 0; pile < config.reservePileCount; pile += 1) {
    const cards = [];
    for (let i = 0; i < config.reservePileSize; i += 1) {
      const symbol = deck.pop();
      if (symbol) cards.push(makeCard({ type: "normal", symbol, source: "reserve" }));
    }
    reservePiles.push(cards);
  }

  const boardNormalCards = deck.map((symbol) => makeCard({ type: "normal", symbol, source: "board" }));
  const specials = [];
  for (let i = 0; i < config.rewardCount; i += 1) specials.push(makeCard({ type: "reward", symbol: "🎁", source: "board" }));
  for (let i = 0; i < config.trapCount; i += 1) specials.push(makeCard({ type: "trap", symbol: "⚠", source: "board" }));
  for (let i = 0; i < config.mysteryCount; i += 1) specials.push(makeCard({ type: "mystery", symbol: "?", source: "board" }));
  for (let i = 0; i < config.jokerCount; i += 1) specials.push(makeCard({ type: "joker", symbol: "🌈", source: "board" }));

  const cards = [...boardNormalCards, ...specials];
  const positions = generateTemplatePositions(config.template, cards.length * 2, config.layers);
  const selectedPositions = selectLayeredPositions(positions, cards.length, config.layers);

  cards.forEach((card, index) => {
    const pos = selectedPositions[index % selectedPositions.length];
    card.layer = pos.layer;
    card.x = pos.x;
    card.y = pos.y;
    card.rot = pos.rot;
  });

  return { boardCards: cards, reservePiles };
}

function startLevel(level) {
  const safeLevel = clamp(level, 1, GameState.unlockedLevel);
  const config = LEVELS[safeLevel - 1];
  const built = buildLevel(config);
  GameState.currentLevel = safeLevel;
  GameState.slots = [];
  GameState.maxSlots = BASE_SLOTS;
  GameState.selectedHistory = [];
  GameState.boardCards = built.boardCards;
  GameState.reservePiles = built.reservePiles;
  GameState.props = { ...config.initialProps };
  GameState.combo = 1;
  GameState.status = "playing";
  GameState.riskMeter = 0;
  GameState.hintedCardId = null;
  renderGame();
  showToast(config.name);
}

function getCardSymbol(card) {
  if (card.type === "normal" || card.type === "junk") return card.symbol;
  if (card.type === "joker") return "🌈";
  if (card.type === "reward") return "🎁";
  if (card.type === "trap") return "⚠";
  return "?";
}

function snapshotForUndo() {
  return {
    slots: clone(GameState.slots),
    boardCards: clone(GameState.boardCards),
    reservePiles: clone(GameState.reservePiles),
    score: GameState.score,
    coins: GameState.coins,
    combo: GameState.combo,
    maxSlots: GameState.maxSlots,
    props: clone(GameState.props),
  };
}

function restoreSnapshot(snapshot) {
  GameState.slots = clone(snapshot.slots);
  GameState.boardCards = clone(snapshot.boardCards);
  GameState.reservePiles = clone(snapshot.reservePiles);
  GameState.score = snapshot.score;
  GameState.coins = snapshot.coins;
  GameState.combo = snapshot.combo;
  GameState.maxSlots = snapshot.maxSlots;
  GameState.props = clone(snapshot.props);
}

function activeSlotCards() {
  const now = Date.now();
  return GameState.slots.filter((card) => !card.lockedUntil || card.lockedUntil <= now);
}

function removeSlotIds(ids) {
  const idSet = new Set(ids);
  GameState.slots = GameState.slots.filter((card) => !idSet.has(card.slotId));
}

function checkSlotMatches() {
  let removedAny = false;
  let loopGuard = 0;
  while (loopGuard < 20) {
    loopGuard += 1;
    const active = activeSlotCards();
    const groups = new Map();
    active.forEach((card) => {
      if (card.type !== "normal") return;
      if (!groups.has(card.symbol)) groups.set(card.symbol, []);
      groups.get(card.symbol).push(card);
    });

    const normalMatch = [...groups.entries()].find(([, cards]) => cards.length >= 3);
    if (normalMatch) {
      const cards = normalMatch[1].slice(0, 3);
      removeSlotIds(cards.map((card) => card.slotId));
      GameState.score += 120 * GameState.combo;
      GameState.combo += 1;
      removedAny = true;
      continue;
    }

    const jokers = active.filter((card) => card.type === "joker");
    if (jokers.length) {
      const jokerTarget = [...groups.entries()]
        .filter(([, cards]) => cards.length >= 2)
        .sort((a, b) => b[1].length - a[1].length)[0];
      if (jokerTarget) {
        removeSlotIds([...jokerTarget[1].slice(0, 2).map((card) => card.slotId), jokers[0].slotId]);
        GameState.score += 150 * GameState.combo;
        GameState.combo += 1;
        removedAny = true;
        continue;
      }
    }

    break;
  }

  if (removedAny) {
    showScorePop(`连消 x${Math.max(1, GameState.combo - 1)}`);
  } else {
    GameState.combo = 1;
  }
  return removedAny;
}

function addToSlot(card, options = {}) {
  if (!card) return false;
  if (GameState.status !== "playing" && !GameState.testing) return false;
  if (options.record !== false) {
    GameState.selectedHistory.push(snapshotForUndo());
  }

  const slotCard = {
    id: card.id || nextId("slot"),
    slotId: nextId("slot"),
    type: card.type,
    symbol: card.symbol,
    source: card.source || options.source || "unknown",
    lockedUntil: card.lockedUntil || 0,
  };

  GameState.slots.push(slotCard);
  checkSlotMatches();
  checkWinLose();
  renderGame();
  return true;
}

function checkDeadlock() {
  checkSlotMatches();
  if (GameState.slots.length < GameState.maxSlots) return false;
  if (GameState.slots.length > GameState.maxSlots) return true;
  if (hasImmediateRescue()) return false;
  return true;
}

function hasImmediateRescue() {
  const clickable = GameState.boardCards.filter((card) => !card.isRemoved && card.isClickable);
  if (clickable.some((card) => card.type === "reward" || card.type === "mystery")) return true;
  if (GameState.reservePiles.some((pile) => pile.length > 0)) return true;
  return GameState.props.hint > 0 || GameState.props.undo > 0 || GameState.props.shuffle > 0 || GameState.props.expand > 0;
}

function checkWinLose() {
  if (isLevelWon()) {
    winLevel();
    return;
  }
  if (checkDeadlock()) {
    failLevel();
  }
}

function isLevelWon() {
  const boardHasNormal = GameState.boardCards.some((card) => !card.isRemoved && (card.type === "normal" || card.type === "joker"));
  const reserveHasNormal = GameState.reservePiles.some((pile) => pile.some((card) => card.type === "normal" || card.type === "joker"));
  const slotHasNormal = GameState.slots.some((card) => card.type === "normal" || card.type === "joker");
  return !boardHasNormal && !reserveHasNormal && !slotHasNormal;
}

function winLevel() {
  if (GameState.status === "won") return;
  GameState.status = "won";
  GameState.coins += 25 + GameState.currentLevel * 5;
  if (GameState.currentLevel === GameState.unlockedLevel && GameState.unlockedLevel < LEVELS.length) {
    GameState.unlockedLevel += 1;
  }
  saveProgress();
  renderGame();
  showDialog("通关成功", GameState.currentLevel < LEVELS.length ? "下一关已经解锁，继续拆牌。" : "全部关卡都清完了，花园很安静。", GameState.currentLevel < LEVELS.length ? "下一关" : "再玩一次");
}

function failLevel() {
  if (GameState.status === "failed") return;
  GameState.status = "failed";
  GameState.lives = Math.max(0, GameState.lives - 1);
  saveProgress();
  renderGame();
  showDialog("卡槽满了", GameState.lives > 0 ? "换个顺序就有机会翻盘，重试本关。" : "生命为 0 也可以重置进度继续测试。", "重试");
}

function cardRect(card, boardRect) {
  const size = getCardSize();
  const x = card.x * (boardRect.width - size);
  const y = card.y * (boardRect.height - size);
  return { x, y, width: size, height: size };
}

function overlapArea(a, b) {
  const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return x * y;
}

function getCardSize() {
  if (!els.board || !window.getComputedStyle) return 54;
  const value = getComputedStyle(document.documentElement).getPropertyValue("--card-size");
  return parseFloat(value) || 54;
}

function isCardBlocked(card, boardRect = els.board?.getBoundingClientRect?.() || { width: 360, height: 360 }) {
  if (card.isRemoved) return true;

  const ownRect = cardRect(card, boardRect);
  const blockers = [];

  GameState.boardCards.forEach((other) => {
    if (other.isRemoved || other.id === card.id) return;
    if (other.layer <= card.layer) return;

    const otherRect = cardRect(other, boardRect);
    const area = overlapArea(ownRect, otherRect);

    const dx = Math.abs((other.x || 0) - (card.x || 0));
    const dy = Math.abs((other.y || 0) - (card.y || 0));

    const rectBlocked = area > ownRect.width * ownRect.height * 0.03;
const nearBlocked = dx < 0.16 && dy < 0.14;

    if (rectBlocked || nearBlocked) {
      blockers.push(other.id);
    }
  });

  card.blockedBy = blockers;
  return blockers.length > 0;
}

function updateCardBlockState() {
  const boardRect = els.board?.getBoundingClientRect?.() || { width: 360, height: 360 };
  GameState.boardCards.forEach((card) => {
    card.blockedBy = [];
    card.isClickable = false;
    if (card.isRemoved) return;
    card.isClickable = !isCardBlocked(card, boardRect);
  });
}

function recalcBoardState() {
  updateCardBlockState();
}

function updateClickability() {
  recalcBoardState();
}

function clickBoardCard(cardId) {
  const card = GameState.boardCards.find((item) => item.id === cardId);
  if (!card || card.isRemoved || GameState.status !== "playing") return;
  recalcBoardState();
  if (!card.isClickable) {
    shakeCard(card.id);
    showToast("这张还被压住");
    return;
  }

  const undoSnapshot = snapshotForUndo();
  if (card.type === "reward") {
    card.isRemoved = true;
    applyReward();
    checkWinLose();
    renderGame();
    return;
  }

  if (card.type === "trap") {
    card.isRemoved = true;
    applyTrapPenalty();
    checkWinLose();
    renderGame();
    return;
  }

  if (card.type === "mystery") {
    card.isRemoved = true;
    processMysteryCard(card, undefined, undoSnapshot);
    return;
  }

  card.isRemoved = true;
  GameState.selectedHistory.push(undoSnapshot);
  addToSlot({ ...card, source: "board" }, { record: false });
}

function clickReservePile(index) {
  const pile = GameState.reservePiles[index];
  if (!pile || !pile.length || GameState.status !== "playing") return;
  const undoSnapshot = snapshotForUndo();
  const card = pile.shift();
  GameState.selectedHistory.push(undoSnapshot);
  addToSlot({ ...card, source: "reserve" }, { record: false });
}

function processMysteryCard(card, forcedType, undoSnapshot = null) {
  const roll = forcedType || (Math.random() < 0.68 ? "normal" : Math.random() < 0.78 ? "reward" : Math.random() < 0.92 ? "trap" : "joker");
  if (roll === "reward") {
    applyReward();
    checkWinLose();
    renderGame();
    return;
  }
  if (roll === "trap") {
    applyTrapPenalty();
    checkWinLose();
    renderGame();
    return;
  }
  if (roll === "joker") {
    if (undoSnapshot) GameState.selectedHistory.push(undoSnapshot);
    addToSlot({ ...card, type: "joker", symbol: "🌈", source: "mystery" }, { record: !undoSnapshot });
    return;
  }
  const symbol = chooseMysterySymbol();
  if (undoSnapshot) GameState.selectedHistory.push(undoSnapshot);
  addToSlot({ ...card, type: "normal", symbol, source: "mystery" }, { record: !undoSnapshot });
}

function chooseMysterySymbol() {
  const slotPairs = new Map();
  GameState.slots.forEach((card) => {
    if (card.type === "normal") slotPairs.set(card.symbol, (slotPairs.get(card.symbol) || 0) + 1);
  });
  const pair = [...slotPairs.entries()].find(([, count]) => count === 2);
  if (pair) return pair[0];
  const visible = GameState.boardCards.find((card) => !card.isRemoved && card.type === "normal" && card.isClickable);
  return visible?.symbol || SYMBOLS[Math.floor(Math.random() * Math.min(7, SYMBOLS.length))];
}

function applyReward() {
  const rewards = ["hint", "undo", "shuffle", "coins"];
  const reward = rewards[Math.floor(Math.random() * rewards.length)];
  if (reward === "coins") {
    GameState.coins += 20;
    showToast("金币 +20");
  } else {
    GameState.props[reward] += 1;
    showToast(`${propName(reward)} +1`);
  }
  showScorePop("奖励");
  saveProgress();
}

function propName(prop) {
  return { hint: "提示", undo: "撤回", shuffle: "洗牌", expand: "加格" }[prop] || prop;
}

function applyTrapPenalty(forced) {
  const options = forced ? [forced] : ["lock", "junk", "prop", "flip"];
  const pick = options[Math.floor(Math.random() * options.length)];
  if (pick === "lock" && GameState.slots.length) {
    const target = GameState.slots[Math.floor(Math.random() * GameState.slots.length)];
    target.lockedUntil = Date.now() + 5000;
    setTimeout(() => {
      checkSlotMatches();
      checkWinLose();
      renderGame();
    }, 5050);
    showToast("一张槽牌被锁住");
    return;
  }

  if (pick === "junk") {
    const symbol = SYMBOLS[Math.floor(Math.random() * 4)];
    addToSlot({ type: "junk", symbol, source: "trap" }, { record: false });
    showToast("混入一张杂草牌");
    return;
  }

  if (pick === "prop") {
    const prop = ["hint", "undo", "shuffle"].sort((a, b) => GameState.props[b] - GameState.props[a])[0];
    if (GameState.props[prop] > 0) GameState.props[prop] -= 1;
    showToast("道具被藤蔓缠住");
    return;
  }

  const candidates = GameState.boardCards.filter((card) => !card.isRemoved && card.isClickable && card.type === "normal").slice(0, 3);
  candidates.forEach((card) => {
    card.faceDownUntil = Date.now() + 3000;
  });
  setTimeout(renderGame, 3050);
  showToast("几张牌短暂翻面");
}

function useHint() {
  if (GameState.props.hint <= 0 || GameState.status !== "playing") return;
  GameState.props.hint -= 1;
  const card = findBestHint();
  GameState.hintedCardId = card?.id || null;
  showToast(card ? "提示已标出" : "先从边缘拆开");
  renderGame();
}

function findBestHint() {
  updateClickability();
  const clickable = GameState.boardCards.filter((card) => !card.isRemoved && card.isClickable);
  const slotCounts = new Map();
  GameState.slots.forEach((slot) => {
    if (slot.type === "normal") slotCounts.set(slot.symbol, (slotCounts.get(slot.symbol) || 0) + 1);
  });
  return clickable
    .filter((card) => card.type === "normal" || card.type === "joker" || card.type === "reward" || card.type === "mystery")
    .sort((a, b) => {
      const aImmediate = a.type === "normal" && (slotCounts.get(a.symbol) || 0) >= 2 ? 100 : 0;
      const bImmediate = b.type === "normal" && (slotCounts.get(b.symbol) || 0) >= 2 ? 100 : 0;
      const aUnlock = GameState.boardCards.filter((card) => !card.isRemoved && card.blockedBy.includes(a.id)).length;
      const bUnlock = GameState.boardCards.filter((card) => !card.isRemoved && card.blockedBy.includes(b.id)).length;
      return bImmediate + bUnlock + b.layer - (aImmediate + aUnlock + a.layer);
    })[0];
}

function useUndo() {
  if (GameState.props.undo <= 0 || !GameState.selectedHistory.length || GameState.status !== "playing") return;
  const snapshot = GameState.selectedHistory.pop();
  restoreSnapshot(snapshot);
  GameState.props.undo = Math.max(0, GameState.props.undo - 1);
  checkSlotMatches();
  checkWinLose();
  renderGame();
  showToast("撤回一步");
}

function useShuffle() {
  if (GameState.props.shuffle <= 0 || GameState.status !== "playing") return;
  GameState.props.shuffle -= 1;
  const activeNormal = GameState.boardCards.filter((card) => !card.isRemoved && card.type === "normal");
  const symbols = shuffle(activeNormal.map((card) => card.symbol));
  activeNormal.forEach((card, index) => {
    card.symbol = symbols[index];
  });
  renderGame();
  showToast("牌面重新洗过");
}

function useExpand() {
  if (GameState.props.expand <= 0 || GameState.status !== "playing" || GameState.maxSlots >= EXPANDED_SLOTS) return;
  GameState.props.expand -= 1;
  GameState.maxSlots = EXPANDED_SLOTS;
  renderGame();
  showToast("本关卡槽 +3");
}

function countRemainingNormals() {
  const board = GameState.boardCards.filter((card) => !card.isRemoved && card.type === "normal").length;
  const reserve = GameState.reservePiles.reduce((sum, pile) => sum + pile.filter((card) => card.type === "normal").length, 0);
  const slots = GameState.slots.filter((card) => card.type === "normal").length;
  return board + reserve + slots;
}

function renderGame() {
  if (!els.board) return;
  updateClickability();
  renderStatus();
  renderLevelStrip();
  renderBoard();
  renderReserve();
  renderSlots();
  renderTools();
}

function renderStatus() {
  const remaining = countRemainingNormals();
  const config = LEVELS[GameState.currentLevel - 1];
  const total = config.normalGroups * 3;
  const progress = clamp(((total - remaining) / Math.max(1, total)) * 100, 0, 100);
  els.livesText.textContent = String(GameState.lives);
  els.levelTitle.textContent = `第 ${GameState.currentLevel} 关`;
  els.coinText.textContent = String(GameState.coins + GameState.score);
  els.progressFill.style.width = `${progress}%`;
  els.starRow.innerHTML = "";
  for (let i = 0; i < 3; i += 1) {
    const star = document.createElement("span");
    star.textContent = "★";
    if (progress >= (i + 1) * 31) star.className = "on";
    els.starRow.append(star);
  }
  els.slotCountText.textContent = `卡槽 ${GameState.slots.length} / ${GameState.maxSlots}`;
  els.riskText.textContent = GameState.slots.length >= 6 ? "危险边缘" : GameState.slots.length >= 4 ? "开始有压力" : "稳住节奏";
}

function renderLevelStrip() {
  els.levelStrip.innerHTML = "";
  LEVELS.forEach((level) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `level-chip${level.level === GameState.currentLevel ? " active" : ""}${level.level > GameState.unlockedLevel ? " locked" : ""}`;
    btn.textContent = level.level > GameState.unlockedLevel ? "锁" : String(level.level);
    btn.addEventListener("click", () => {
      if (level.level <= GameState.unlockedLevel) startLevel(level.level);
    });
    els.levelStrip.append(btn);
  });
}

function renderBoard() {
  const frag = document.createDocumentFragment();
  const boardRect = els.board.getBoundingClientRect();
  const size = getCardSize();
  GameState.boardCards
    .filter((card) => !card.isRemoved)
    .sort((a, b) => a.layer - b.layer)
    .forEach((card) => {
      const el = document.createElement("button");
      const rect = cardRect(card, boardRect);
      el.type = "button";
      el.className = `card ${card.type} ${card.isClickable ? "clickable" : "blocked"}${card.id === GameState.hintedCardId ? " hint" : ""}${card.faceDownUntil > Date.now() ? " face-down" : ""}`;
      el.textContent = getCardSymbol(card);
      el.dataset.id = card.id;
      el.style.setProperty("--x", `${rect.x}px`);
      el.style.setProperty("--y", `${rect.y}px`);
      el.style.setProperty("--rot", `${card.rot || 0}deg`);
      el.style.zIndex = String(10 + card.layer);
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.addEventListener("click", () => clickBoardCard(card.id));
      frag.append(el);
    });
  els.board.replaceChildren(frag);
}

function renderReserve() {
  els.reservePiles.innerHTML = "";
  GameState.reservePiles.forEach((pile, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reserve-pile";
    const top = pile[0];
    if (top) {
      const card = document.createElement("span");
      card.className = "reserve-card";
      card.textContent = getCardSymbol(top);
      btn.append(card);
    } else {
      const empty = document.createElement("span");
      empty.className = "reserve-empty";
      empty.textContent = "空";
      btn.append(empty);
    }
    const count = document.createElement("span");
    count.className = "pile-count";
    count.textContent = String(pile.length);
    btn.append(count);
    btn.disabled = !pile.length || GameState.status !== "playing";
    btn.addEventListener("click", () => clickReservePile(index));
    els.reservePiles.append(btn);
  });
}

function renderSlots() {
  els.slots.innerHTML = "";
  for (let i = 0; i < EXPANDED_SLOTS; i += 1) {
    const slot = document.createElement("div");
    slot.className = `slot${i >= GameState.maxSlots ? " hidden" : ""}${i >= 5 && i < BASE_SLOTS ? " warn" : ""}`;
    const card = GameState.slots[i];
    if (card) {
      slot.textContent = getCardSymbol(card);
      if (card.lockedUntil && card.lockedUntil > Date.now()) slot.classList.add("locked");
    }
    els.slots.append(slot);
  }
}

function renderTools() {
  els.hintCount.textContent = String(GameState.props.hint);
  els.undoCount.textContent = String(GameState.props.undo);
  els.shuffleCount.textContent = String(GameState.props.shuffle);
  els.expandCount.textContent = String(GameState.props.expand);
  els.hintBtn.disabled = GameState.props.hint <= 0 || GameState.status !== "playing";
  els.undoBtn.disabled = GameState.props.undo <= 0 || !GameState.selectedHistory.length || GameState.status !== "playing";
  els.shuffleBtn.disabled = GameState.props.shuffle <= 0 || GameState.status !== "playing";
  els.expandBtn.disabled = GameState.props.expand <= 0 || GameState.maxSlots >= EXPANDED_SLOTS || GameState.status !== "playing";
}

function showToast(text) {
  if (GameState.testing || !els.floatLayer) return;
  clearTimeout(toastTimer);
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = text;
  els.floatLayer.append(toast);
  toastTimer = setTimeout(() => toast.remove(), 620);
}

function showScorePop(text) {
  if (GameState.testing || !els.floatLayer) return;
  const pop = document.createElement("div");
  pop.className = "score-pop";
  pop.textContent = text;
  pop.style.left = "50%";
  pop.style.top = "52%";
  els.floatLayer.append(pop);
  setTimeout(() => pop.remove(), 540);
}

function shakeCard(cardId) {
  const el = els.board?.querySelector(`[data-id="${cardId}"]`);
  if (!el) return;
  el.classList.remove("shake");
  void el.offsetWidth;
  el.classList.add("shake");
}

function showDialog(title, text, primary) {
  if (GameState.testing) return;
  els.dialogTitle.textContent = title;
  els.dialogText.innerHTML = text;
  els.dialogPrimaryBtn.textContent = primary;
  if (!els.dialog.open) els.dialog.showModal();
}

function handleDialogPrimary() {
  if (!GameState.started) {
    GameState.started = true;
    if (els.dialog.open) els.dialog.close();
    startLevel(GameState.currentLevel);
    return;
  }
  if (els.dialog.open) els.dialog.close();
  if (GameState.status === "won") {
    const next = GameState.currentLevel < LEVELS.length ? GameState.currentLevel + 1 : 1;
    startLevel(Math.min(next, GameState.unlockedLevel));
    return;
  }
  startLevel(GameState.currentLevel);
}

function openSettings() {
  showDialog("游戏设置", `${GAME_NAME} ${GAME_VERSION}。纯静态网页，无登录、无广告、无外部接口。可以重置进度重新测试关卡。`, "继续游戏");
}

function openHelp() {
  showDialog(
    "玩法说明",
    `<ul class="help-list">
      <li><b>基础玩法</b>：点击没有被上层压住的牌进入卡槽，任意三张相同普通牌会自动消除。</li>
      <li><b>失败条件</b>：卡槽满，并且没有可消除组合、可点击救场牌、备用牌或可用道具。</li>
      <li><b>通关条件</b>：清空主牌区、备用牌堆和卡槽里的全部普通牌。</li>
      <li><b>卡槽上限</b>：基础 7 格；“加 3 格”道具只在本关临时扩展到 10 格。</li>
      <li><b>道具</b>：提示会标出高价值牌；撤回回退上一步进槽；洗牌只洗未移除普通牌图案；加 3 格用于救急。</li>
      <li><b>奖励牌</b>：点击后不进卡槽，随机加道具或金币。</li>
      <li><b>陷阱牌</b>：点击后触发轻惩罚，例如锁槽牌、塞入干扰牌、扣道具或短暂翻面，不会直接判输。</li>
      <li><b>未知牌</b>：点击后随机变成普通牌、奖励牌、陷阱牌或少量万能牌。</li>
      <li><b>万能牌</b>：可与两张相同普通牌组成三消。</li>
      <li><b>干扰牌</b>：由陷阱塞入卡槽，占位置但不参与普通三消。</li>
    </ul>`,
    "知道了",
  );
}

function bindEvents() {
  els.hintBtn.addEventListener("click", useHint);
  els.undoBtn.addEventListener("click", useUndo);
  els.shuffleBtn.addEventListener("click", useShuffle);
  els.expandBtn.addEventListener("click", useExpand);
  els.helpBtn.addEventListener("click", openHelp);
  els.settingsBtn.addEventListener("click", openSettings);
  els.dialogPrimaryBtn.addEventListener("click", handleDialogPrimary);
  els.resetProgressBtn.addEventListener("click", resetProgress);
  window.addEventListener("resize", renderGame);
}

function runGameLogicTests() {
  const backup = clone({
    currentLevel: GameState.currentLevel,
    unlockedLevel: GameState.unlockedLevel,
    score: GameState.score,
    lives: GameState.lives,
    coins: GameState.coins,
    slots: GameState.slots,
    maxSlots: GameState.maxSlots,
    selectedHistory: GameState.selectedHistory,
    boardCards: GameState.boardCards,
    reservePiles: GameState.reservePiles,
    props: GameState.props,
    combo: GameState.combo,
    status: GameState.status,
  });
  const errors = [];
  GameState.testing = true;

  function resetTest() {
    GameState.status = "playing";
    GameState.slots = [];
    GameState.maxSlots = BASE_SLOTS;
    GameState.selectedHistory = [];
    GameState.boardCards = [];
    GameState.reservePiles = [[], [], []];
    GameState.props = { hint: 2, undo: 2, shuffle: 1, expand: 1 };
    GameState.combo = 1;
  }

  function assert(name, condition) {
    if (!condition) errors.push(name);
  }

  resetTest();
  addToSlot({ type: "normal", symbol: "A" }, { record: false });
  addToSlot({ type: "normal", symbol: "A" }, { record: false });
  addToSlot({ type: "normal", symbol: "A" }, { record: false });
  assert("连续三张相同应消除", GameState.slots.length === 0);

  resetTest();
  ["A", "B", "A", "C", "A"].forEach((symbol) => addToSlot({ type: "normal", symbol }, { record: false }));
  assert("不相邻三张相同应消除", GameState.slots.map((card) => card.symbol).join("") === "BC");

  resetTest();
  ["A", "B", "A", "B", "A", "B"].forEach((symbol) => addToSlot({ type: "normal", symbol }, { record: false }));
  assert("两组三消应全部消除", GameState.slots.length === 0);

  resetTest();
  ["B", "C", "D", "E", "F", "A", "A"].forEach((symbol) => addToSlot({ type: "normal", symbol }, { record: false }));
  addToSlot({ type: "normal", symbol: "A" }, { record: false });
  assert("第 7 格形成三消不能失败", GameState.status !== "failed" && GameState.slots.length === 5);

  resetTest();
  GameState.slots = [
    { slotId: "s1", type: "normal", symbol: "Q" },
    { slotId: "s2", type: "normal", symbol: "Q" },
  ];
  GameState.reservePiles = [[{ id: "r1", type: "normal", symbol: "Q" }], [], []];
  clickReservePile(0);
  assert("备用牌堆取牌应触发三消", GameState.slots.length === 0 && GameState.reservePiles[0].length === 0);

  resetTest();
  GameState.slots = [
    { slotId: "s1", type: "normal", symbol: "M" },
    { slotId: "s2", type: "normal", symbol: "M" },
  ];
  processMysteryCard({ id: "m1", type: "mystery", symbol: "?" }, "normal");
  assert("未知牌翻成普通牌应参与三消", GameState.slots.length === 0);

  resetTest();
  applyTrapPenalty("junk");
  assert("陷阱塞牌不应破坏 slots", GameState.slots.length === 1 && GameState.slots[0].type === "junk");

  resetTest();
  addToSlot({ type: "reward", symbol: "🎁" }, { record: false });
  addToSlot({ type: "trap", symbol: "⚠" }, { record: false });
  addToSlot({ type: "mystery", symbol: "?" }, { record: false });
  assert("特殊牌不应触发普通三消", GameState.slots.length === 3);

  resetTest();
  GameState.boardCards = [makeCard({ type: "normal", symbol: "U", source: "board" })];
  const undoSnapshot = snapshotForUndo();
  GameState.boardCards[0].isRemoved = true;
  GameState.selectedHistory.push(undoSnapshot);
  addToSlot({ ...GameState.boardCards[0], type: "normal", symbol: "U" }, { record: false });
  const beforeUndoDomSlots = GameState.slots.length;
  useUndo();
  assert("撤回后 slots 和状态应恢复", beforeUndoDomSlots === 1 && GameState.slots.length === 0 && GameState.boardCards[0].isRemoved === false);

  resetTest();
  GameState.boardCards = [];
  GameState.reservePiles = [[{ id: "rv", type: "normal", symbol: "Z" }], [], []];
  GameState.slots = [];
  assert("通关判断不能漏掉备用牌普通牌", isLevelWon() === false);

  Object.assign(GameState, backup);
  GameState.testing = false;
  renderGame();

  if (errors.length) {
    console.error(`Game logic tests failed: ${errors.join("; ")}`);
    return false;
  }
  console.log("Game logic tests passed");
  return true;
}

window.runGameLogicTests = runGameLogicTests;
globalThis.runGameLogicTests = runGameLogicTests;

function init() {
  loadProgress();
  bindEvents();
  GameState.currentLevel = 1;
  GameState.status = "ready";
  startLevel(1);
  GameState.status = "ready";
  renderGame();
  showDialog(GAME_NAME, `${GAME_VERSION}。点开没有被压住的牌，任意三张相同会自动消除。第 1 关会先给你几组爽消。`, "开始");
  if (new URLSearchParams(window.location.search).get("test") === "1") {
    setTimeout(runGameLogicTests, 80);
  }
}

init();
