const SYMBOLS = ["🌸", "🍃", "🌷", "🥕", "🍓", "⭐", "🍄", "☁️", "🍀", "🦋", "🌼", "☀️"];

const STORAGE_KEY = "xiaomeng-flip-v2-progress";

const LEVELS = [
  { level: 1, name: "晨光花谷", groups: 10, layers: 4, reserveSize: 3, rewards: 1, traps: 0, mystery: 0, joker: 0 },
  { level: 2, name: "树篱十字", groups: 14, layers: 5, reserveSize: 4, rewards: 1, traps: 0, mystery: 1, joker: 0 },
  { level: 3, name: "问号牌局", groups: 18, layers: 6, reserveSize: 4, rewards: 1, traps: 1, mystery: 2, joker: 0 },
  { level: 4, name: "双岛迷阵", groups: 22, layers: 7, reserveSize: 5, rewards: 2, traps: 1, mystery: 2, joker: 1 },
  { level: 5, name: "翻盘山丘", groups: 26, layers: 8, reserveSize: 5, rewards: 2, traps: 2, mystery: 3, joker: 1 },
];

const els = {
  livesText: document.getElementById("livesText"),
  levelTitle: document.getElementById("levelTitle"),
  levelSub: document.getElementById("levelSub"),
  stars: document.getElementById("stars"),
  progressFill: document.getElementById("progressFill"),
  coinText: document.getElementById("coinText"),
  levelTabs: document.getElementById("levelTabs"),
  board: document.getElementById("board"),
  reservePiles: document.getElementById("reservePiles"),
  slots: document.getElementById("slots"),
  slotCount: document.getElementById("slotCount"),
  paceText: document.getElementById("paceText"),
  hintBtn: document.getElementById("hintBtn"),
  undoBtn: document.getElementById("undoBtn"),
  shuffleBtn: document.getElementById("shuffleBtn"),
  expandBtn: document.getElementById("expandBtn"),
  hintCount: document.getElementById("hintCount"),
  undoCount: document.getElementById("undoCount"),
  shuffleCount: document.getElementById("shuffleCount"),
  expandCount: document.getElementById("expandCount"),
  helpBtn: document.getElementById("helpBtn"),
  resetBtn: document.getElementById("resetBtn"),
  helpModal: document.getElementById("helpModal"),
  closeHelpBtn: document.getElementById("closeHelpBtn"),
  resultModal: document.getElementById("resultModal"),
  resultTitle: document.getElementById("resultTitle"),
  resultText: document.getElementById("resultText"),
  retryBtn: document.getElementById("retryBtn"),
  nextBtn: document.getElementById("nextBtn"),
  toast: document.getElementById("toast"),
};

const GameState = {
  currentLevel: 1,
  unlockedLevel: 1,
  lives: 5,
  coins: 0,
  boardCards: [],
  reservePiles: [],
  slots: [],
  maxSlots: 7,
  props: { hint: 3, undo: 3, shuffle: 1, expand: 1 },
  history: [],
  hintCardId: null,
  status: "playing",
  idSeed: 1,
};

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    GameState.unlockedLevel = saved.unlockedLevel || 1;
    GameState.lives = saved.lives ?? 5;
    GameState.coins = saved.coins || 0;
  } catch {
    GameState.unlockedLevel = 1;
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    unlockedLevel: GameState.unlockedLevel,
    lives: GameState.lives,
    coins: GameState.coins,
  }));
}

function levelConfig() {
  return LEVELS.find((item) => item.level === GameState.currentLevel) || LEVELS[0];
}

function nextId() {
  GameState.idSeed += 1;
  return `card-${GameState.idSeed}`;
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getSymbol(card) {
  if (!card) return "";
  if (card.type === "reward") return "🎁";
  if (card.type === "trap") return "⚠️";
  if (card.type === "mystery") return "?";
  if (card.type === "joker") return "⭐";
  if (card.type === "junk") return "🪨";
  return card.symbol;
}

function createNormalDeck(groups) {
  const selected = [];
  for (let i = 0; i < groups; i += 1) {
    selected.push(SYMBOLS[i % SYMBOLS.length]);
  }

  const cards = [];
  selected.forEach((symbol) => {
    for (let i = 0; i < 3; i += 1) {
      cards.push({ id: nextId(), type: "normal", symbol });
    }
  });

  return shuffleArray(cards);
}

function createSpecialCards(cfg) {
  const cards = [];

  for (let i = 0; i < cfg.rewards; i += 1) {
    cards.push({ id: nextId(), type: "reward", symbol: "reward" });
  }
  for (let i = 0; i < cfg.traps; i += 1) {
    cards.push({ id: nextId(), type: "trap", symbol: "trap" });
  }
  for (let i = 0; i < cfg.mystery; i += 1) {
    cards.push({ id: nextId(), type: "mystery", symbol: "mystery" });
  }
  for (let i = 0; i < cfg.joker; i += 1) {
    cards.push({ id: nextId(), type: "joker", symbol: "joker" });
  }

  return cards;
}

function mountainPositions(total, layers) {
  const positions = [];
  const layerCount = Math.max(3, layers);

  /*
    大牌山结构：
    - 底层宽，铺开；
    - 越往上越收；
    - 每层固定网格，不旋转、不乱飘；
    - 边缘有露出空间，中心有厚度。
  */
  for (let layer = 0; layer < layerCount && positions.length < total; layer += 1) {
    const widthCount = Math.max(3, 9 - layer);
    const heightCount = Math.max(2, 5 - Math.floor(layer / 2));
    const stepX = 0.082;
    const stepY = 0.066;
    const yCenter = 0.52 - layer * 0.035;
    const xCenter = 0.5 + (layer % 2 === 0 ? 0 : 0.018);

    const cells = [];
    for (let r = 0; r < heightCount; r += 1) {
      const rowWidth = widthCount - Math.abs(r - Math.floor(heightCount / 2));
      for (let c = 0; c < rowWidth; c += 1) {
        const x = xCenter + (c - (rowWidth - 1) / 2) * stepX + (r % 2 ? stepX / 2 : 0);
        const y = yCenter + (r - (heightCount - 1) / 2) * stepY;
        cells.push({ layer, x, y, rot: 0 });
      }
    }

    const ordered = cells.sort((a, b) => {
      const da = Math.abs(a.x - 0.5) + Math.abs(a.y - 0.5);
      const db = Math.abs(b.x - 0.5) + Math.abs(b.y - 0.5);
      return db - da;
    });

    ordered.forEach((pos) => {
      if (positions.length < total) positions.push(pos);
    });
  }

  while (positions.length < total) {
    const i = positions.length;
    const layer = Math.min(layerCount - 1, i % layerCount);
    positions.push({
      layer,
      x: 0.5 + ((i % 9) - 4) * 0.075,
      y: 0.52 + ((Math.floor(i / 9) % 5) - 2) * 0.065 - layer * 0.035,
      rot: 0,
    });
  }

  return positions.map((pos) => ({
    ...pos,
    x: Math.max(0.08, Math.min(0.92, pos.x)),
    y: Math.max(0.18, Math.min(0.82, pos.y)),
  }));
}

function prepareLevel(level) {
  const cfg = LEVELS.find((item) => item.level === level) || LEVELS[0];

  GameState.currentLevel = level;
  GameState.status = "playing";
  GameState.slots = [];
  GameState.maxSlots = 7;
  GameState.history = [];
  GameState.hintCardId = null;
  GameState.props = { hint: 3, undo: 3, shuffle: 1, expand: 1 };
  GameState.idSeed = Date.now();

  const normalDeck = createNormalDeck(cfg.groups);
  const specialDeck = createSpecialCards(cfg);
  const allCards = shuffleArray([...normalDeck, ...specialDeck]);

  const reserveCardsTotal = cfg.reserveSize * 3;
  const reserveSource = allCards.splice(0, Math.min(reserveCardsTotal, allCards.length));

  GameState.reservePiles = [0, 1, 2].map((pileIndex) => ({
    id: `reserve-${pileIndex}`,
    cards: reserveSource
      .filter((_, index) => index % 3 === pileIndex)
      .map((card) => ({ ...card, source: "reserve", isRemoved: false, isClickable: true, blockedBy: [] })),
  }));

  const positions = mountainPositions(allCards.length, cfg.layers);

  GameState.boardCards = allCards.map((card, index) => ({
    ...card,
    source: "board",
    x: positions[index].x,
    y: positions[index].y,
    layer: positions[index].layer,
    rot: 0,
    isRemoved: false,
    isClickable: false,
    blockedBy: [],
  }));

  updateCardBlockState();
  renderGame();
  showToast(`第 ${level} 关开始`);
}

function cardRect(card) {
  const size = 0.118;
  return {
    x: card.x - size / 2,
    y: card.y - size / 2,
    w: size,
    h: size,
  };
}

function overlap(a, b) {
  const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return w * h;
}

function isCardBlocked(card) {
  if (card.isRemoved) return true;

  const own = cardRect(card);
  const blockers = [];

  GameState.boardCards.forEach((other) => {
    if (other.id === card.id || other.isRemoved) return;
    if (other.layer <= card.layer) return;

    const area = overlap(own, cardRect(other));
    const ownArea = own.w * own.h;

    if (area > ownArea * 0.12) {
      blockers.push(other.id);
    }
  });

  card.blockedBy = blockers;
  return blockers.length > 0;
}

function updateCardBlockState() {
  GameState.boardCards.forEach((card) => {
    card.blockedBy = [];
    card.isClickable = !isCardBlocked(card);
  });
}

function renderGame() {
  const cfg = levelConfig();

  els.livesText.textContent = GameState.lives;
  els.coinText.textContent = GameState.coins;
  els.levelTitle.textContent = `第 ${GameState.currentLevel} 关`;
  els.levelSub.textContent = cfg.name;
  els.slotCount.textContent = `卡槽 ${GameState.slots.length} / ${GameState.maxSlots}`;

  const removedNormal = GameState.boardCards.filter((c) => c.type === "normal" && c.isRemoved).length;
  const totalNormal = GameState.boardCards.filter((c) => c.type === "normal").length;
  const progress = totalNormal ? Math.round((removedNormal / totalNormal) * 100) : 0;
  els.progressFill.style.width = `${progress}%`;
  els.stars.textContent = progress > 80 ? "★ ★ ★" : progress > 45 ? "★ ★ ☆" : "★ ☆ ☆";

  if (GameState.slots.length <= 2) els.paceText.textContent = "开局热身";
  else if (GameState.slots.length <= 5) els.paceText.textContent = "开始压力";
  else els.paceText.textContent = "危险边缘";

  renderLevelTabs();
  renderBoard();
  renderReserve();
  renderSlots();
  renderTools();
}

function renderLevelTabs() {
  els.levelTabs.innerHTML = "";
  LEVELS.forEach((level) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `level-chip ${level.level === GameState.currentLevel ? "active" : ""} ${level.level > GameState.unlockedLevel ? "locked" : ""}`;
    btn.textContent = level.level > GameState.unlockedLevel ? "锁" : level.level;
    btn.addEventListener("click", () => {
      if (level.level > GameState.unlockedLevel) {
        showToast("先通过前一关");
        return;
      }
      prepareLevel(level.level);
    });
    els.levelTabs.appendChild(btn);
  });
}

function renderBoard() {
  els.board.innerHTML = "";

  GameState.boardCards
    .filter((card) => !card.isRemoved)
    .sort((a, b) => a.layer - b.layer)
    .forEach((card) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `card ${card.type} ${card.isClickable ? "clickable" : "blocked"} ${card.id === GameState.hintCardId ? "hint" : ""}`;
      btn.style.setProperty("--x", card.x);
      btn.style.setProperty("--y", card.y);
      btn.style.setProperty("--rot", `${card.rot || 0}deg`);
      btn.style.setProperty("--z", 10 + card.layer);
      btn.textContent = getSymbol(card);
      btn.addEventListener("click", () => clickBoardCard(card.id, btn));
      els.board.appendChild(btn);
    });
}

function renderReserve() {
  els.reservePiles.innerHTML = "";

  GameState.reservePiles.forEach((pile, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reserve-pile";

    const top = pile.cards[0];
    if (top) {
      const card = document.createElement("span");
      card.className = "reserve-card";
      card.textContent = getSymbol(top);
      btn.appendChild(card);
    } else {
      const card = document.createElement("span");
      card.className = "reserve-card";
      card.textContent = "空";
      btn.appendChild(card);
      btn.disabled = true;
    }

    const count = document.createElement("span");
    count.className = "reserve-count";
    count.textContent = pile.cards.length;
    btn.appendChild(count);

    btn.addEventListener("click", () => drawReserve(index));
    els.reservePiles.appendChild(btn);
  });
}

function renderSlots() {
  els.slots.innerHTML = "";
  for (let i = 0; i < 10; i += 1) {
    const slot = document.createElement("div");
    slot.className = `slot ${i >= 5 && i < GameState.maxSlots ? "warn" : ""}`;
    if (i >= GameState.maxSlots) {
      slot.style.visibility = "hidden";
    }

    const card = GameState.slots[i];
    if (card) {
      slot.classList.add("filled");
      slot.textContent = getSymbol(card);
    }

    els.slots.appendChild(slot);
  }
}

function renderTools() {
  els.hintCount.textContent = GameState.props.hint;
  els.undoCount.textContent = GameState.props.undo;
  els.shuffleCount.textContent = GameState.props.shuffle;
  els.expandCount.textContent = GameState.props.expand;

  els.hintBtn.disabled = GameState.props.hint <= 0;
  els.undoBtn.disabled = GameState.props.undo <= 0 || GameState.history.length === 0;
  els.shuffleBtn.disabled = GameState.props.shuffle <= 0;
  els.expandBtn.disabled = GameState.props.expand <= 0 || GameState.maxSlots > 7;
}

function clickBoardCard(id, el) {
  if (GameState.status !== "playing") return;

  const card = GameState.boardCards.find((item) => item.id === id);
  if (!card || card.isRemoved) return;

  updateCardBlockState();

  if (!card.isClickable) {
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
    showToast("这张被压住了");
    return;
  }

  handleCard(card, "board");
}

function drawReserve(index) {
  if (GameState.status !== "playing") return;
  const pile = GameState.reservePiles[index];
  const card = pile?.cards.shift();
  if (!card) return;
  handleCard(card, "reserve", index);
}

function handleCard(card, source, reserveIndex = null) {
  if (card.type === "reward") {
    card.isRemoved = true;
    giveReward();
    updateCardBlockState();
    renderGame();
    checkWin();
    return;
  }

  if (card.type === "trap") {
    card.isRemoved = true;
    triggerTrap();
    updateCardBlockState();
    renderGame();
    checkLose();
    return;
  }

  if (card.type === "mystery") {
    const roll = Math.random();
    if (roll < 0.65) {
      card.type = "normal";
      card.symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    } else if (roll < 0.85) {
      card.type = "reward";
      handleCard(card, source, reserveIndex);
      return;
    } else {
      card.type = "trap";
      handleCard(card, source, reserveIndex);
      return;
    }
  }

  addToSlot(card, source, reserveIndex);
}

function addToSlot(card, source, reserveIndex = null) {
  if (GameState.slots.length >= GameState.maxSlots) {
    showToast("卡槽已满");
    if (source === "reserve" && reserveIndex !== null) {
      GameState.reservePiles[reserveIndex].cards.unshift(card);
    }
    return;
  }

  if (source === "board") {
    const boardCard = GameState.boardCards.find((item) => item.id === card.id);
    if (boardCard) boardCard.isRemoved = true;
  }

  const slotCard = { ...card, isRemoved: true };
  GameState.slots.push(slotCard);
  GameState.history.push({ card: { ...card }, source, reserveIndex });

  checkSlotMatches();
  updateCardBlockState();
  renderGame();
  checkWin();
  checkLose();
}

function checkSlotMatches() {
  let changed = true;

  while (changed) {
    changed = false;

    const normalMap = new Map();
    const jokerIndexes = [];

    GameState.slots.forEach((card, index) => {
      if (card.type === "joker") {
        jokerIndexes.push(index);
        return;
      }
      if (card.type !== "normal") return;
      if (!normalMap.has(card.symbol)) normalMap.set(card.symbol, []);
      normalMap.get(card.symbol).push(index);
    });

    for (const indexes of normalMap.values()) {
      if (indexes.length >= 3) {
        removeSlotIndexes(indexes.slice(0, 3));
        GameState.coins += 12;
        showToast("+12 三消");
        changed = true;
        break;
      }

      if (indexes.length === 2 && jokerIndexes.length > 0) {
        removeSlotIndexes([...indexes, jokerIndexes[0]]);
        GameState.coins += 18;
        showToast("+18 万能消除");
        changed = true;
        break;
      }
    }
  }

  saveProgress();
}

function removeSlotIndexes(indexes) {
  const set = new Set(indexes);
  GameState.slots = GameState.slots.filter((_, index) => !set.has(index));
}

function checkLose() {
  if (GameState.status !== "playing") return;
  checkSlotMatches();

  if (GameState.slots.length >= GameState.maxSlots) {
    GameState.status = "failed";
    GameState.lives = Math.max(0, GameState.lives - 1);
    saveProgress();
    showResult("挑战失败", "卡槽已满，换个顺序再试。", false);
  }
}

function checkWin() {
  if (GameState.status !== "playing") return;

  const boardNormalLeft = GameState.boardCards.some((card) => card.type === "normal" && !card.isRemoved);
  const reserveNormalLeft = GameState.reservePiles.some((pile) => pile.cards.some((card) => card.type === "normal"));
  const slotNormalLeft = GameState.slots.some((card) => card.type === "normal" || card.type === "joker");

  if (!boardNormalLeft && !reserveNormalLeft && !slotNormalLeft) {
    GameState.status = "won";
    GameState.coins += 60;
    GameState.unlockedLevel = Math.max(GameState.unlockedLevel, Math.min(LEVELS.length, GameState.currentLevel + 1));
    saveProgress();
    showResult("通关成功", "节奏不错，下一关会更有压力。", true);
  }
}

function showResult(title, text, won) {
  els.resultTitle.textContent = title;
  els.resultText.textContent = text;
  els.nextBtn.style.display = won ? "block" : "none";
  els.resultModal.classList.remove("hidden");
  renderGame();
}

function giveReward() {
  const rewards = ["hint", "undo", "shuffle", "coins"];
  const reward = rewards[Math.floor(Math.random() * rewards.length)];

  if (reward === "coins") {
    GameState.coins += 20;
    showToast("金币 +20");
  } else {
    GameState.props[reward] += 1;
    showToast("获得道具 +1");
  }
}

function triggerTrap() {
  const roll = Math.random();

  if (roll < 0.45 && GameState.slots.length < GameState.maxSlots) {
    GameState.slots.push({
      id: nextId(),
      type: "junk",
      symbol: "junk",
    });
    showToast("陷阱：塞入废牌");
  } else if (roll < 0.75) {
    const keys = ["hint", "undo", "shuffle"];
    const key = keys.sort((a, b) => GameState.props[b] - GameState.props[a])[0];
    if (GameState.props[key] > 0) GameState.props[key] -= 1;
    showToast("陷阱：扣除道具");
  } else {
    shuffleSymbols();
    showToast("陷阱：扰乱牌面");
  }
}

function useHint() {
  if (GameState.props.hint <= 0) return;
  updateCardBlockState();

  const candidates = GameState.boardCards.filter((card) => !card.isRemoved && card.isClickable && card.type === "normal");
  if (!candidates.length) {
    showToast("暂无可提示牌");
    return;
  }

  const slotCounts = new Map();
  GameState.slots.forEach((card) => {
    if (card.type === "normal") {
      slotCounts.set(card.symbol, (slotCounts.get(card.symbol) || 0) + 1);
    }
  });

  const best = candidates.find((card) => (slotCounts.get(card.symbol) || 0) >= 2)
    || candidates.find((card) => (slotCounts.get(card.symbol) || 0) >= 1)
    || candidates[0];

  GameState.hintCardId = best.id;
  GameState.props.hint -= 1;
  renderGame();
  showToast("已高亮推荐牌");
}

function useUndo() {
  if (GameState.props.undo <= 0 || !GameState.history.length) return;

  const last = GameState.history.pop();
  const index = [...GameState.slots].reverse().findIndex((card) => card.id === last.card.id);
  const slotIndex = index >= 0 ? GameState.slots.length - 1 - index : -1;

  if (slotIndex >= 0) GameState.slots.splice(slotIndex, 1);

  if (last.source === "board") {
    const boardCard = GameState.boardCards.find((card) => card.id === last.card.id);
    if (boardCard) boardCard.isRemoved = false;
  } else if (last.source === "reserve" && last.reserveIndex !== null) {
    GameState.reservePiles[last.reserveIndex].cards.unshift(last.card);
  }

  GameState.props.undo -= 1;
  updateCardBlockState();
  renderGame();
  showToast("已撤回");
}

function shuffleSymbols() {
  const normalCards = GameState.boardCards.filter((card) => !card.isRemoved && card.type === "normal");
  const symbols = shuffleArray(normalCards.map((card) => card.symbol));
  normalCards.forEach((card, index) => {
    card.symbol = symbols[index];
  });
}

function useShuffle() {
  if (GameState.props.shuffle <= 0) return;
  shuffleSymbols();
  GameState.props.shuffle -= 1;
  renderGame();
  showToast("已洗牌");
}

function useExpand() {
  if (GameState.props.expand <= 0 || GameState.maxSlots > 7) return;
  GameState.maxSlots = 10;
  GameState.props.expand -= 1;
  renderGame();
  showToast("卡槽 +3");
}

function showToast(text) {
  els.toast.textContent = text;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    els.toast.classList.remove("show");
  }, 650);
}

function closeModals() {
  els.helpModal.classList.add("hidden");
  els.resultModal.classList.add("hidden");
}

function bindEvents() {
  els.helpBtn.addEventListener("click", () => els.helpModal.classList.remove("hidden"));
  els.closeHelpBtn.addEventListener("click", () => els.helpModal.classList.add("hidden"));

  els.resetBtn.addEventListener("click", () => {
    if (!confirm("重置进度并回到第 1 关？")) return;
    localStorage.removeItem(STORAGE_KEY);
    GameState.unlockedLevel = 1;
    GameState.lives = 5;
    GameState.coins = 0;
    prepareLevel(1);
  });

  els.retryBtn.addEventListener("click", () => {
    closeModals();
    prepareLevel(GameState.currentLevel);
  });

  els.nextBtn.addEventListener("click", () => {
    closeModals();
    const next = Math.min(LEVELS.length, GameState.currentLevel + 1);
    prepareLevel(next);
  });

  els.hintBtn.addEventListener("click", useHint);
  els.undoBtn.addEventListener("click", useUndo);
  els.shuffleBtn.addEventListener("click", useShuffle);
  els.expandBtn.addEventListener("click", useExpand);

  window.runGameLogicTests = runGameLogicTests;
}

function runGameLogicTests() {
  const backup = JSON.parse(JSON.stringify({
    slots: GameState.slots,
    boardCards: GameState.boardCards,
    reservePiles: GameState.reservePiles,
    coins: GameState.coins,
  }));

  const a = { id: "t1", type: "normal", symbol: "🍓" };
  const b = { id: "t2", type: "normal", symbol: "🍓" };
  const c = { id: "t3", type: "normal", symbol: "🍓" };

  GameState.slots = [a, { id: "x", type: "normal", symbol: "🍃" }, b, c];
  checkSlotMatches();

  console.assert(GameState.slots.length === 1, "三张相同不相邻也必须消除");

  Object.assign(GameState, backup);
  console.log("Game logic tests passed");
}

loadProgress();
bindEvents();
prepareLevel(1);
