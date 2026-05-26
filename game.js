const ICONS = [
  "🥬",
  "🥕",
  "🧄",
  "🍄",
  "🥚",
  "🧀",
  "🍗",
  "🥐",
  "🍉",
  "🧃",
  "🧦",
  "🧲",
  "🪇",
  "🪩",
  "🧸",
  "🧯",
  "🪣",
  "🛎️",
];

const LEVELS = [
  {
    name: "新手鹅摊",
    desc: "先热热手。东西少，但遮挡关系已经会骗眼睛。",
    triples: 10,
    layers: 4,
    iconCount: 7,
    capacity: 7,
    jitter: 0.035,
    tools: { hint: 3, undo: 3, shuffle: 1, scoop: 1 },
  },
  {
    name: "三倍羊道",
    desc: "图案开始变多，别被同色食物带跑。",
    triples: 16,
    layers: 5,
    iconCount: 9,
    capacity: 7,
    jitter: 0.05,
    tools: { hint: 3, undo: 2, shuffle: 1, scoop: 1 },
  },
  {
    name: "鸭鸭迷宫",
    desc: "上层更密，先拆锁，再追三连。",
    triples: 22,
    layers: 6,
    iconCount: 11,
    capacity: 7,
    jitter: 0.06,
    tools: { hint: 2, undo: 2, shuffle: 1, scoop: 1 },
  },
  {
    name: "魔音仓库",
    desc: "鹅槽看起来很大，实际每一步都在挤牙膏。",
    triples: 28,
    layers: 7,
    iconCount: 14,
    capacity: 7,
    jitter: 0.07,
    tools: { hint: 2, undo: 1, shuffle: 1, scoop: 1 },
  },
  {
    name: "鹅王加班夜",
    desc: "最终关槽位少一格，图案全员上班。稳住，别乱点。",
    triples: 36,
    layers: 9,
    iconCount: 18,
    capacity: 6,
    jitter: 0.08,
    tools: { hint: 1, undo: 1, shuffle: 1, scoop: 1 },
  },
];

const els = {
  board: document.querySelector("#board"),
  tray: document.querySelector("#tray"),
  toast: document.querySelector("#toast"),
  score: document.querySelector("#score"),
  combo: document.querySelector("#combo"),
  leftCount: document.querySelector("#leftCount"),
  trayCounter: document.querySelector("#trayCounter"),
  levelTag: document.querySelector("#levelTag"),
  levelRow: document.querySelector("#levelRow"),
  levelDesc: document.querySelector("#levelDesc"),
  difficultyMeter: document.querySelector("#difficultyMeter"),
  guideDialog: document.querySelector("#guideDialog"),
  modalTitle: document.querySelector("#modalTitle"),
  modalText: document.querySelector("#modalText"),
  startBtn: document.querySelector("#startBtn"),
  shareBtn: document.querySelector("#shareBtn"),
  helpBtn: document.querySelector("#helpBtn"),
  restartBtn: document.querySelector("#restartBtn"),
  soundBtn: document.querySelector("#soundBtn"),
  hintTool: document.querySelector("#hintTool"),
  undoTool: document.querySelector("#undoTool"),
  shuffleTool: document.querySelector("#shuffleTool"),
  scoopTool: document.querySelector("#scoopTool"),
  hintLeft: document.querySelector("#hintLeft"),
  undoLeft: document.querySelector("#undoLeft"),
  shuffleLeft: document.querySelector("#shuffleLeft"),
  scoopLeft: document.querySelector("#scoopLeft"),
};

const state = {
  levelIndex: 0,
  tiles: [],
  tray: [],
  history: [],
  score: 0,
  combo: 1,
  started: false,
  over: false,
  tools: {},
  seed: Date.now(),
  tileRect: { w: 72, h: 82 },
};

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, random = Math.random) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

class AudioLoop {
  constructor() {
    this.ctx = null;
    this.timer = null;
    this.enabled = true;
    this.step = 0;
    this.nextTime = 0;
  }

  async start() {
    if (!this.enabled) return;
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    if (this.timer) return;
    this.nextTime = this.ctx.currentTime + 0.05;
    this.timer = setInterval(() => this.schedule(), 80);
    this.schedule();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    els.soundBtn.classList.toggle("muted", !this.enabled);
    els.soundBtn.textContent = this.enabled ? "♫" : "×";
    if (this.enabled) {
      this.start();
    } else {
      this.stop();
    }
  }

  blip(freq = 780, duration = 0.05, type = "square", volume = 0.05) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  note(time, freq, duration, type, volume) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  schedule() {
    if (!this.ctx || !this.enabled) return;
    const bpm = 136;
    const stepDur = 60 / bpm / 2;
    const melody = [392, 392, 523, 392, 330, 392, 587, 523, 392, 330, 392, 294, 330, 392, 523, 587];
    while (this.nextTime < this.ctx.currentTime + 0.42) {
      const i = this.step % melody.length;
      const isKick = i % 4 === 0;
      this.note(this.nextTime, melody[i], 0.09, i % 3 === 0 ? "sawtooth" : "square", 0.022);
      if (isKick) this.note(this.nextTime, 92, 0.08, "triangle", 0.04);
      if (i % 8 === 6) this.note(this.nextTime, 740, 0.035, "square", 0.018);
      this.step += 1;
      this.nextTime += stepDur;
    }
  }
}

const audio = new AudioLoop();

function getTileSize() {
  const styles = getComputedStyle(document.documentElement);
  const w = parseFloat(styles.getPropertyValue("--tile-w")) || 72;
  const h = parseFloat(styles.getPropertyValue("--tile-h")) || 82;
  state.tileRect = { w, h };
}

function rectFor(tile) {
  const boardRect = els.board.getBoundingClientRect();
  const w = state.tileRect.w;
  const h = state.tileRect.h;
  return {
    x: tile.x * (boardRect.width - w),
    y: tile.y * (boardRect.height - h),
    w,
    h,
  };
}

function overlaps(a, b, pad = 0.54) {
  const acx = a.x + a.w / 2;
  const acy = a.y + a.h / 2;
  const bcx = b.x + b.w / 2;
  const bcy = b.y + b.h / 2;
  return Math.abs(acx - bcx) < a.w * pad && Math.abs(acy - bcy) < a.h * pad;
}

function isUnlocked(tile) {
  if (tile.removed) return false;
  const a = rectFor(tile);
  return !state.tiles.some((other) => {
    if (other.removed || other.layer <= tile.layer) return false;
    return overlaps(a, rectFor(other));
  });
}

function makeDeck(config, random) {
  const icons = ICONS.slice(0, config.iconCount);
  const deck = [];
  for (let i = 0; i < config.triples; i += 1) {
    const icon = icons[i % icons.length];
    deck.push(icon, icon, icon);
  }
  return shuffle(deck, random);
}

function layerDistribution(total, layers) {
  const weights = Array.from({ length: layers }, (_, i) => 1 + i * 0.28);
  const sum = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map((w) => Math.floor((w / sum) * total));
  while (counts.reduce((a, b) => a + b, 0) < total) {
    counts[counts.length - 1 - ((total + counts[0]) % layers)] += 1;
  }
  return counts;
}

function buildTiles(config, seed) {
  const random = mulberry32(seed);
  const deck = makeDeck(config, random);
  const counts = layerDistribution(deck.length, config.layers);
  const tiles = [];
  let cursor = 0;

  counts.forEach((count, layer) => {
    const cols = Math.ceil(Math.sqrt(count * 1.45));
    const rows = Math.ceil(count / cols);
    const cells = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        cells.push({ c, r });
      }
    }
    shuffle(cells, random);
    const layerInset = clamp(0.02 + layer * 0.012, 0.02, 0.14);
    const layerW = 1 - layerInset * 2;
    const layerH = 1 - layerInset * 2;

    for (let i = 0; i < count; i += 1) {
      const cell = cells[i % cells.length];
      const baseX = cols === 1 ? 0.5 : cell.c / (cols - 1);
      const baseY = rows === 1 ? 0.5 : cell.r / (rows - 1);
      const wiggle = config.jitter + layer * 0.003;
      const x = clamp(layerInset + baseX * layerW + (random() - 0.5) * wiggle, 0.01, 0.95);
      const y = clamp(layerInset + baseY * layerH + (random() - 0.5) * wiggle, 0.01, 0.93);
      tiles.push({
        id: `${seed}-${layer}-${i}`,
        icon: deck[cursor],
        layer,
        x,
        y,
        rot: (random() - 0.5) * 10,
        removed: false,
      });
      cursor += 1;
    }
  });

  return tiles;
}

function availableTiles() {
  return state.tiles.filter((tile) => isUnlocked(tile));
}

function generateLevel(index) {
  const config = LEVELS[index];
  let seed = Date.now() + index * 1009;
  let tiles = [];

  for (let attempt = 0; attempt < 40; attempt += 1) {
    tiles = buildTiles(config, seed + attempt * 71);
    state.tiles = tiles;
    const available = availableTiles();
    const typeCounts = available.reduce((map, tile) => {
      map.set(tile.icon, (map.get(tile.icon) || 0) + 1);
      return map;
    }, new Map());
    const hasPair = [...typeCounts.values()].some((count) => count >= 2);
    if (available.length >= Math.min(10, config.iconCount) && hasPair) {
      state.seed = seed + attempt * 71;
      return tiles;
    }
  }

  state.seed = seed;
  return tiles;
}

function resetLevel(index = state.levelIndex) {
  state.levelIndex = index;
  const config = LEVELS[index];
  state.tiles = generateLevel(index);
  state.tray = [];
  state.history = [];
  state.score = 0;
  state.combo = 1;
  state.over = false;
  state.tools = { ...config.tools };
  renderAll();
  showToast(`第 ${index + 1} 关：${config.name}`);
}

function renderLevels() {
  els.levelRow.innerHTML = "";
  LEVELS.forEach((level, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `${index + 1}. ${level.name}`;
    btn.className = index === state.levelIndex ? "active" : "";
    btn.addEventListener("click", () => resetLevel(index));
    els.levelRow.append(btn);
  });
}

function renderBoard() {
  getTileSize();
  const fragment = document.createDocumentFragment();
  const boardRect = els.board.getBoundingClientRect();
  const maxX = Math.max(1, boardRect.width - state.tileRect.w);
  const maxY = Math.max(1, boardRect.height - state.tileRect.h);

  state.tiles.forEach((tile) => {
    if (tile.removed) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tile";
    btn.textContent = tile.icon;
    btn.dataset.id = tile.id;
    btn.style.setProperty("--x", `${tile.x * maxX}px`);
    btn.style.setProperty("--y", `${tile.y * maxY}px`);
    btn.style.setProperty("--rot", `${tile.rot}deg`);
    btn.style.zIndex = String(10 + tile.layer);
    if (!isUnlocked(tile)) {
      btn.classList.add("locked");
      btn.setAttribute("aria-disabled", "true");
    }
    btn.addEventListener("click", () => pickTile(tile.id));
    fragment.append(btn);
  });

  els.board.replaceChildren(fragment);
}

function renderTray(flashIcons = []) {
  const fragment = document.createDocumentFragment();
  state.tray.forEach((item) => {
    const cell = document.createElement("div");
    cell.className = "tray-item";
    if (flashIcons.includes(item.icon)) cell.classList.add("flash");
    cell.textContent = item.icon;
    fragment.append(cell);
  });
  for (let i = state.tray.length; i < LEVELS[state.levelIndex].capacity; i += 1) {
    const cell = document.createElement("div");
    cell.className = "tray-item";
    cell.textContent = "";
    fragment.append(cell);
  }
  els.tray.replaceChildren(fragment);
}

function renderStats() {
  const level = LEVELS[state.levelIndex];
  const left = state.tiles.filter((tile) => !tile.removed).length;
  els.score.textContent = state.score.toLocaleString("zh-CN");
  els.combo.textContent = `x${state.combo}`;
  els.leftCount.textContent = String(left);
  els.trayCounter.textContent = `${state.tray.length} / ${level.capacity}`;
  els.levelTag.textContent = `第 ${state.levelIndex + 1} 关 · ${level.name}`;
  els.levelDesc.textContent = level.desc;
  els.hintLeft.textContent = state.tools.hint;
  els.undoLeft.textContent = state.tools.undo;
  els.shuffleLeft.textContent = state.tools.shuffle;
  els.scoopLeft.textContent = state.tools.scoop;
  els.hintTool.disabled = state.tools.hint <= 0 || state.over;
  els.undoTool.disabled = state.tools.undo <= 0 || !state.history.length || state.over;
  els.shuffleTool.disabled = state.tools.shuffle <= 0 || state.over;
  els.scoopTool.disabled = state.tools.scoop <= 0 || state.tray.length === 0 || state.over;
  els.difficultyMeter.innerHTML = "";
  for (let i = 0; i < 5; i += 1) {
    const dot = document.createElement("i");
    if (i <= state.levelIndex) dot.className = "on";
    els.difficultyMeter.append(dot);
  }
}

function renderAll(flashIcons = []) {
  renderLevels();
  renderStats();
  renderBoard();
  renderTray(flashIcons);
}

function groupTray() {
  return state.tray.reduce((map, item) => {
    if (!map.has(item.icon)) map.set(item.icon, []);
    map.get(item.icon).push(item);
    return map;
  }, new Map());
}

function removeMatches() {
  const groups = groupTray();
  const matched = [];
  groups.forEach((items, icon) => {
    while (items.length >= 3) {
      matched.push(icon);
      const ids = new Set(items.splice(0, 3).map((item) => item.pickId));
      state.tray = state.tray.filter((item) => !ids.has(item.pickId));
      state.score += 120 * state.combo + state.levelIndex * 35;
      state.combo += 1;
    }
  });
  if (matched.length) {
    audio.blip(980 + matched.length * 120, 0.08, "square", 0.06);
    showToast(matched.length > 1 ? "双响！鹅槽瞬间清爽" : `消掉 ${matched[0]}，手感上来了`);
  }
  return matched;
}

function pickTile(id) {
  if (state.over) return;
  const tile = state.tiles.find((item) => item.id === id);
  if (!tile || tile.removed) return;
  if (!isUnlocked(tile)) {
    audio.blip(130, 0.05, "sawtooth", 0.04);
    showToast("这张还被压着，先拆上面那层");
    return;
  }

  const pickId = `${tile.id}-${performance.now()}`;
  state.history.push({
    tileId: tile.id,
    trayBefore: state.tray.map((item) => ({ ...item })),
    score: state.score,
    combo: state.combo,
  });
  tile.removed = true;
  state.tray.push({ icon: tile.icon, pickId });
  state.score += 10 + state.levelIndex * 3;
  audio.blip(520 + state.combo * 18, 0.04, "square", 0.035);

  const matched = removeMatches();
  if (!matched.length) {
    state.combo = Math.max(1, state.combo - 1);
  }

  const level = LEVELS[state.levelIndex];
  if (state.tray.length > level.capacity) {
    failGame();
    return;
  }

  const left = state.tiles.filter((item) => !item.removed).length;
  if (left === 0) {
    winLevel();
    return;
  }

  renderAll(matched);
}

function failGame() {
  state.over = true;
  renderAll();
  audio.blip(88, 0.35, "sawtooth", 0.05);
  els.modalTitle.textContent = "鹅槽爆了";
  els.modalText.textContent = "这一把被物品淹没了。重开会保留关卡，不会登录，也不会有广告来烦你。";
  els.startBtn.textContent = "重开本关";
  els.guideDialog.showModal();
}

function winLevel() {
  state.over = true;
  state.score += 500 + state.levelIndex * 260 + state.combo * 80;
  renderAll();
  audio.blip(1260, 0.18, "triangle", 0.08);
  const next = state.levelIndex + 1;
  if (next < LEVELS.length) {
    els.modalTitle.textContent = "清场成功";
    els.modalText.textContent = `这一关被你盘明白了。下一关是「${LEVELS[next].name}」，东西更多，鹅槽更紧。`;
    els.startBtn.textContent = "下一关";
  } else {
    els.modalTitle.textContent = "鹅王下班";
    els.modalText.textContent = `五关全通，最终分数 ${state.score.toLocaleString("zh-CN")}。这个链接可以继续分享挑战。`;
    els.startBtn.textContent = "再疯一轮";
  }
  els.guideDialog.showModal();
}

function showToast(text) {
  els.toast.textContent = text;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 1500);
}

function useHint() {
  if (state.tools.hint <= 0 || state.over) return;
  state.tools.hint -= 1;
  const choice = bestHintTile();
  renderAll();
  if (!choice) {
    showToast("暂时没有特别漂亮的一手，先拆最高层");
    return;
  }
  const el = els.board.querySelector(`[data-id="${choice.id}"]`);
  if (el) el.classList.add("hint");
  showToast(`先点 ${choice.icon}，鹅觉得这手不亏`);
}

function bestHintTile() {
  const available = availableTiles();
  if (!available.length) return null;
  const trayCounts = state.tray.reduce((map, item) => {
    map.set(item.icon, (map.get(item.icon) || 0) + 1);
    return map;
  }, new Map());
  const availableCounts = available.reduce((map, tile) => {
    map.set(tile.icon, (map.get(tile.icon) || 0) + 1);
    return map;
  }, new Map());
  return [...available].sort((a, b) => {
    const aScore = (trayCounts.get(a.icon) || 0) * 6 + (availableCounts.get(a.icon) || 0) * 2 + a.layer;
    const bScore = (trayCounts.get(b.icon) || 0) * 6 + (availableCounts.get(b.icon) || 0) * 2 + b.layer;
    return bScore - aScore;
  })[0];
}

function useUndo() {
  if (state.tools.undo <= 0 || !state.history.length || state.over) return;
  const last = state.history.pop();
  const tile = state.tiles.find((item) => item.id === last.tileId);
  if (tile) tile.removed = false;
  state.tray = last.trayBefore;
  state.score = last.score;
  state.combo = last.combo;
  state.tools.undo -= 1;
  audio.blip(360, 0.09, "triangle", 0.04);
  renderAll();
  showToast("撤回成功，鹅槽喘了一口气");
}

function useShuffle() {
  if (state.tools.shuffle <= 0 || state.over) return;
  state.tools.shuffle -= 1;
  const random = mulberry32(Date.now() + state.tiles.length);
  const active = state.tiles.filter((tile) => !tile.removed);
  const positions = active.map((tile) => ({ x: tile.x, y: tile.y, rot: tile.rot, layer: tile.layer }));
  shuffle(positions, random);
  active.forEach((tile, index) => {
    tile.x = clamp(positions[index].x + (random() - 0.5) * 0.035, 0.01, 0.95);
    tile.y = clamp(positions[index].y + (random() - 0.5) * 0.035, 0.01, 0.93);
    tile.rot = (random() - 0.5) * 12;
  });
  audio.blip(700, 0.08, "sawtooth", 0.04);
  renderAll();
  showToast("洗牌完成，桌面重新开搅");
}

function useScoop() {
  if (state.tools.scoop <= 0 || !state.tray.length || state.over) return;
  const groups = [...groupTray().entries()].sort((a, b) => b[1].length - a[1].length);
  const [icon, items] = groups[0];
  const ids = new Set(items.map((item) => item.pickId));
  state.tray = state.tray.filter((item) => !ids.has(item.pickId));
  state.tools.scoop -= 1;
  state.history = [];
  state.combo = Math.max(1, state.combo - 1);
  audio.blip(860, 0.12, "triangle", 0.05);
  renderAll([icon]);
  showToast(`捞走 ${items.length} 个 ${icon}，继续冲`);
}

function copyShareLink() {
  const url = new URL(window.location.href);
  url.searchParams.set("level", String(state.levelIndex + 1));
  navigator.clipboard
    .writeText(url.toString())
    .then(() => showToast("挑战链接已复制"))
    .catch(() => showToast("浏览器没给剪贴板权限，可以直接复制地址栏"));
}

function openGuide() {
  els.modalTitle.textContent = "新手指导";
  els.modalText.textContent =
    "点开没有被压住的物品，三个相同会自动消除。鹅槽满了就失败。道具每关限量，越晚用越值。";
  els.startBtn.textContent = state.started ? "继续玩" : "开疯";
  els.guideDialog.showModal();
}

function handleStart() {
  const isWin = state.over && state.tiles.every((tile) => tile.removed);
  if (!state.started) {
    state.started = true;
  } else if (state.over && isWin) {
    const next = state.levelIndex + 1 < LEVELS.length ? state.levelIndex + 1 : 0;
    resetLevel(next);
  } else if (state.over) {
    resetLevel(state.levelIndex);
  }
  audio.start();
  els.guideDialog.close();
}

function bindEvents() {
  els.startBtn.addEventListener("click", handleStart);
  els.shareBtn.addEventListener("click", copyShareLink);
  els.helpBtn.addEventListener("click", openGuide);
  els.restartBtn.addEventListener("click", () => resetLevel(state.levelIndex));
  els.soundBtn.addEventListener("click", () => audio.toggle());
  els.hintTool.addEventListener("click", useHint);
  els.undoTool.addEventListener("click", useUndo);
  els.shuffleTool.addEventListener("click", useShuffle);
  els.scoopTool.addEventListener("click", useScoop);
  window.addEventListener("resize", () => renderBoard());
}

function initFromUrl() {
  const levelParam = Number(new URLSearchParams(window.location.search).get("level"));
  if (Number.isFinite(levelParam) && levelParam >= 1 && levelParam <= LEVELS.length) {
    state.levelIndex = levelParam - 1;
  }
}

function init() {
  bindEvents();
  initFromUrl();
  resetLevel(state.levelIndex);
  els.guideDialog.showModal();
}

init();
