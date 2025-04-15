// Game State Variables
let wave = 1;
let waveStarted = false;
const maxWaves = 50;
let gameActive = false;
let gamePaused = false;
let waveCooldown = false;
let waveCooldownTimer = 0;
let soundEnabled = true;
let waveCooldownInterval = null;

// Canvas Setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  const maxWidth = window.innerWidth * 0.9;
  const maxHeight = window.innerHeight * 0.5;
  canvas.width = Math.min(800, maxWidth);
  canvas.height = Math.min(300, maxHeight);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

window.addEventListener("resize", debounce(resizeCanvas, 100));
resizeCanvas();

// Spatial Partitioning Grid
const GRID_CELL_SIZE = 50;
const grid = new Map();

function getGridKey(x, y) {
  const gridX = Math.floor(x / GRID_CELL_SIZE);
  const gridY = Math.floor(y / GRID_CELL_SIZE);
  return `${gridX},${gridY}`;
}

function updateGrid() {
  grid.clear();
  units.forEach((unit, index) => {
    const key = getGridKey(unit.x, unit.y);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push({ unit, index, isAlly: true });
  });
  enemyUnits.forEach((unit, index) => {
    const key = getGridKey(unit.x, unit.y);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push({ unit, index, isAlly: false });
  });
}

function getNearbyUnits(x, y, isAlly) {
  const gridX = Math.floor(x / GRID_CELL_SIZE);
  const gridY = Math.floor(y / GRID_CELL_SIZE);
  const nearbyUnits = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = `${gridX + dx},${gridY + dy}`;
      if (grid.has(key)) {
        grid.get(key).forEach(entry => {
          if (entry.isAlly !== isAlly) {
            nearbyUnits.push(entry);
          }
        });
      }
    }
  }
  return nearbyUnits;
}

// DOM Elements
const fightButton = document.getElementById("fightButton");
const pauseButton = document.getElementById("pauseButton");
const surrenderButton = document.getElementById("surrenderButton");
const restartButton = document.getElementById("restartButton");
const soundToggleButton = document.getElementById("soundToggleButton");
const spawnButton = document.getElementById("spawnButton");
const feedbackMessage = document.getElementById("feedbackMessage");
const goldDisplay = document.getElementById("goldDisplay");
const diamondDisplay = document.getElementById("diamondDisplay");
const waveDisplay = document.getElementById("waveDisplay");
const unitButtons = document.querySelectorAll(".unit-button");
const pauseMenu = document.getElementById("pauseMenu");
const resumeButton = document.getElementById("resumeButton");
const toggleShopButton = document.getElementById("toggleShopButton");
const surrenderPauseButton = document.getElementById("surrenderPauseButton");
const gameOverModal = document.getElementById("gameOverModal");
const gameOverMessage = document.getElementById("gameOverMessage");
const gameOverWave = document.getElementById("gameOverWave");
const gameOverRestartButton = document.getElementById("gameOverRestartButton");
const gameOverShopButton = document.getElementById("gameOverShopButton");
const tutorialModal = document.getElementById("tutorialModal");
const startTutorialButton = document.getElementById("startTutorialButton");

// Audio Elements
const spawnSound = document.getElementById("spawnSound");
const attackSound = document.getElementById("attackSound");
const winSound = document.getElementById("winSound");
const loseSound = document.getElementById("loseSound");

// Set default volume
[spawnSound, attackSound, winSound, loseSound].forEach(audio => {
  audio.volume = 0.5;
});

// Unit Definitions
const BASE_ENEMY_STATS = {
  BARBARIAN: { health: 15, damage: 3, speed: 1.1, reward: 2 },
  ARCHER: { health: 8, damage: 6, speed: 1.3, reward: 3 },
  HORSE: { health: 25, damage: 12, speed: 2.2, reward: 4 },
  KNIGHT: { health: 40, damage: 8, speed: 1.5, reward: 6 }
};

const UNIT_TYPES = {
  BARBARIAN: { ...BASE_ENEMY_STATS.BARBARIAN, name: "Barbarian", color: "#3b5998", cost: 5 },
  ARCHER: { ...BASE_ENEMY_STATS.ARCHER, name: "Archer", color: "#28a745", cost: 8 },
  HORSE: { ...BASE_ENEMY_STATS.HORSE, name: "Horse", color: "#dc3545", cost: 12 },
  KNIGHT: { ...BASE_ENEMY_STATS.KNIGHT, name: "Knight", color: "#ffd700", cost: 15, unlocked: false }
};

// Game Entities
let units = [];
let enemyUnits = [];
let baseHealth = 150;
let enemyBaseHealth = 150;
let gameOver = false;

// Resources
let gold = 0;
let diamonds = 0;
try {
  diamonds = localStorage.getItem('warriorDiamonds') ? parseInt(localStorage.getItem('warriorDiamonds')) : 0;
} catch (e) {
  console.error("Failed to access localStorage:", e);
  showFeedback("Storage unavailable, progress won't save.");
}
let selectedUnitType = UNIT_TYPES.BARBARIAN;

// Upgrades
let goldProductionRate = 800;
let baseHealthUpgrades = 0;
let unitHealthUpgrades = 0;
let goldProductionUpgrades = 0;
let unitDamageUpgrades = 0;
let baseDefenseUpgrades = 0;

try {
  baseHealthUpgrades = parseInt(localStorage.getItem('warriorBaseHealthUpgrades')) || 0;
  unitHealthUpgrades = parseInt(localStorage.getItem('warriorUnitHealthUpgrades')) || 0;
  goldProductionUpgrades = parseInt(localStorage.getItem('warriorGoldProdUpgrades')) || 0;
  unitDamageUpgrades = parseInt(localStorage.getItem('warriorUnitDamageUpgrades')) || 0;
  baseDefenseUpgrades = parseInt(localStorage.getItem('warriorBaseDefenseUpgrades')) || 0;
} catch (e) {
  console.error("Failed to access localStorage for upgrades:", e);
}

// Load saved upgrades
try {
  const savedDamage = localStorage.getItem('warriorUnitDamage');
  if (savedDamage) {
    const damage = JSON.parse(savedDamage);
    UNIT_TYPES.BARBARIAN.damage = damage.barb || BASE_ENEMY_STATS.BARBARIAN.damage;
    UNIT_TYPES.ARCHER.damage = damage.arch || BASE_ENEMY_STATS.ARCHER.damage;
    UNIT_TYPES.HORSE.damage = damage.horse || BASE_ENEMY_STATS.HORSE.damage;
    UNIT_TYPES.KNIGHT.damage = damage.knight || BASE_ENEMY_STATS.KNIGHT.damage;
  }
} catch (e) {
  console.error("Failed to load unit damage upgrades:", e);
}

// Check if knight is unlocked
try {
  if (localStorage.getItem('warriorKnightUnlocked') === 'true') {
    UNIT_TYPES.KNIGHT.unlocked = true;
  }
} catch (e) {
  console.error("Failed to check knight unlock status:", e);
}

// Gold production
let goldInterval = setInterval(() => {
  if (gameActive && !gameOver && !gamePaused) {
    gold += 1 + Math.floor(wave / 5);
    updateFooter();
  }
}, goldProductionRate);

// Shop Items
const SHOP_ITEMS = {
  GOLD_PRODUCTION: {
    name: "Gold Production +",
    description: "Increase gold production by 0.2/s",
    getPrice: () => 10 + (goldProductionUpgrades * 15),
    apply: function() {
      if (diamonds >= this.getPrice()) {
        diamonds -= this.getPrice();
        try {
          localStorage.setItem('warriorDiamonds', diamonds);
        } catch (e) {
          console.error("Failed to save diamonds:", e);
        }
        goldProductionRate = Math.max(300, 800 - (goldProductionUpgrades * 50));
        goldProductionUpgrades++;
        try {
          localStorage.setItem('warriorGoldProdUpgrades', goldProductionUpgrades);
        } catch (e) {
          console.error("Failed to save gold production upgrades:", e);
        }
        clearInterval(goldInterval);
        goldInterval = setInterval(() => {
          if (gameActive && !gameOver && !gamePaused) {
            gold += 1 + Math.floor(wave / 5);
            updateFooter();
          }
        }, goldProductionRate);
        updateShop();
        updateFooter();
        showFeedback("Gold production upgraded!");
        updateUpgradesDisplay();
      } else {
        showFeedback("Not enough diamonds!");
      }
    }
  },
  BASE_HEALTH: {
    name: "Base Health +",
    description: "Increase base health by 25",
    getPrice: () => 15 + (baseHealthUpgrades * 20),
    apply: function() {
      if (diamonds >= this.getPrice()) {
        diamonds -= this.getPrice();
        try {
          localStorage.setItem('warriorDiamonds', diamonds);
        } catch (e) {
          console.error("Failed to save diamonds:", e);
        }
        baseHealth += 25;
        baseHealthUpgrades++;
        try {
          localStorage.setItem('warriorBaseHealthUpgrades', baseHealthUpgrades);
        } catch (e) {
          console.error("Failed to save base health upgrades:", e);
        }
        updateFooter();
        updateShop();
        showFeedback("Base health increased!");
        updateUpgradesDisplay();
      } else {
        showFeedback("Not enough diamonds!");
      }
    }
  },
  BASE_DEFENSE: {
    name: "Base Defense +",
    description: "Reduce base damage taken by 10%",
    getPrice: () => 12 + (baseDefenseUpgrades * 15),
    apply: function() {
      if (diamonds >= this.getPrice()) {
        diamonds -= this.getPrice();
        try {
          localStorage.setItem('warriorDiamonds', diamonds);
        } catch (e) {
          console.error("Failed to save diamonds:", e);
        }
        baseDefenseUpgrades++;
        try {
          localStorage.setItem('warriorBaseDefenseUpgrades', baseDefenseUpgrades);
        } catch (e) {
          console.error("Failed to save base defense upgrades:", e);
        }
        updateFooter();
        updateShop();
        showFeedback("Base defense upgraded!");
        updateUpgradesDisplay();
      } else {
        showFeedback("Not enough diamonds!");
      }
    }
  },
  UNIT_HEALTH: {
    name: "Unit Health +",
    description: "Increase all unit health by 3",
    getPrice: () => 12 + (unitHealthUpgrades * 18),
    apply: function() {
      if (diamonds >= this.getPrice()) {
        diamonds -= this.getPrice();
        try {
          localStorage.setItem('warriorDiamonds', diamonds);
        } catch (e) {
          console.error("Failed to save diamonds:", e);
        }
        unitHealthUpgrades++;
        try {
          localStorage.setItem('warriorUnitHealthUpgrades', unitHealthUpgrades);
        } catch (e) {
          console.error("Failed to save unit health upgrades:", e);
        }
        updateFooter();
        updateShop();
        addTooltips();
        updateUnitInfoPanel();
        showFeedback("Unit health increased!");
        updateUpgradesDisplay();
      } else {
        showFeedback("Not enough diamonds!");
      }
    }
  },
  UNIT_DAMAGE: {
    name: "Unit Damage +",
    description: "Increase all unit damage by 2",
    getPrice: () => 15 + (unitDamageUpgrades * 25),
    apply: function() {
      if (diamonds >= this.getPrice()) {
        diamonds -= this.getPrice();
        try {
          localStorage.setItem('warriorDiamonds', diamonds);
        } catch (e) {
          console.error("Failed to save diamonds:", e);
        }
        UNIT_TYPES.BARBARIAN.damage += 2;
        UNIT_TYPES.ARCHER.damage += 2;
        UNIT_TYPES.HORSE.damage += 2;
        UNIT_TYPES.KNIGHT.damage += 2;
        unitDamageUpgrades++;
        try {
          localStorage.setItem('warriorUnitDamage', JSON.stringify({
            barb: UNIT_TYPES.BARBARIAN.damage,
            arch: UNIT_TYPES.ARCHER.damage,
            horse: UNIT_TYPES.HORSE.damage,
            knight: UNIT_TYPES.KNIGHT.damage
          }));
          localStorage.setItem('warriorUnitDamageUpgrades', unitDamageUpgrades);
        } catch (e) {
          console.error("Failed to save unit damage upgrades:", e);
        }
        updateFooter();
        updateShop();
        addTooltips();
        updateUnitInfoPanel();
        showFeedback("Unit damage increased!");
        updateUpgradesDisplay();
      } else {
        showFeedback("Not enough diamonds!");
      }
    }
  },
  NEW_UNIT: {
    name: "Unlock Knight",
    description: "Unlock the powerful Knight unit",
    getPrice: () => 25,
    apply: function() {
      if (diamonds >= this.getPrice() && !UNIT_TYPES.KNIGHT.unlocked) {
        diamonds -= this.getPrice();
        try {
          localStorage.setItem('warriorDiamonds', diamonds);
        } catch (e) {
          console.error("Failed to save diamonds:", e);
        }
        UNIT_TYPES.KNIGHT.unlocked = true;
        try {
          localStorage.setItem('warriorKnightUnlocked', 'true');
        } catch (e) {
          console.error("Failed to save knight unlock status:", e);
        }
        addKnightButton();
        updateShop();
        updateFooter();
        showFeedback("Knight unlocked!");
        updateUpgradesDisplay();
      } else {
        showFeedback("Not enough diamonds!");
      }
    }
  }
};

// Initialize Game
function initGame() {
  wave = 1;
  baseHealth = 150 + (baseHealthUpgrades * 25);
  enemyBaseHealth = 150;
  gameOver = false;
  gamePaused = false;
  units = [];
  enemyUnits = [];
  gold = 0;
  diamonds = localStorage.getItem('warriorDiamonds') ? parseInt(localStorage.getItem('warriorDiamonds')) : 100; // Ensure diamonds persist
  try {
    localStorage.setItem('warriorDiamonds', diamonds);
  } catch (e) {
    console.error("Failed to save diamonds:", e);
  }
  waveCooldown = false;
  waveStarted = false;
  waveCooldownTimer = 0;
  if (waveCooldownInterval) {
    clearInterval(waveCooldownInterval);
    waveCooldownInterval = null;
    hideWaveCooldown();
  }
  goldProductionRate = Math.max(300, 800 - (goldProductionUpgrades * 50));
  clearInterval(goldInterval);
  goldInterval = setInterval(() => {
    if (gameActive && !gameOver && !gamePaused) {
      gold += 1 + Math.floor(wave / 5);
      updateFooter();
    }
  }, goldProductionRate);
  updateShop();
  updateFooter();
  updateUnitSelectionUI();
  updateUnitInfoPanel();
  updateUpgradesDisplay();
  updateButtonStates();
}

// Game Functions
function getScaledEnemyStats(type, currentWave) {
  const healthScale = Math.pow(1.18, currentWave - 1);
  const damageScale = Math.pow(1.14, currentWave - 1);
  return {
    health: Math.floor(BASE_ENEMY_STATS[type].health * healthScale),
    damage: Math.floor(BASE_ENEMY_STATS[type].damage * damageScale),
    speed: BASE_ENEMY_STATS[type].speed,
    reward: BASE_ENEMY_STATS[type].reward + Math.floor(currentWave * 0.5)
  };
}

function spawnWave(waveNum) {
  if (waveNum > maxWaves) {
    showGameOverModal("Victory!");
    return;
  }

  const barbarianCount = 2 + Math.floor(waveNum / 2);
  const archerCount = Math.max(0, Math.floor((waveNum - 2) / 3));
  const horseCount = Math.max(0, Math.floor((waveNum - 4) / 5));
  const knightCount = waveNum >= 10 ? Math.floor(waveNum / 10) : 0;

  for (let i = 0; i < barbarianCount; i++) {
    const stats = getScaledEnemyStats("BARBARIAN", waveNum);
    enemyUnits.push({
      x: canvas.width * 0.9375,
      y: canvas.height * 0.333 + (i % 3) * (canvas.height * 0.166),
      type: { ...UNIT_TYPES.BARBARIAN, ...stats },
      hp: stats.health,
      speed: stats.speed,
      damage: stats.damage,
      maxHp: stats.health,
      opacity: 1
    });
  }
  for (let i = 0; i < archerCount; i++) {
    const stats = getScaledEnemyStats("ARCHER", waveNum);
    enemyUnits.push({
      x: canvas.width * 0.9375,
      y: canvas.height * 0.333 + (i % 3) * (canvas.height * 0.166),
      type: { ...UNIT_TYPES.ARCHER, ...stats },
      hp: stats.health,
      speed: stats.speed,
      damage: stats.damage,
      maxHp: stats.health,
      opacity: 1
    });
  }
  for (let i = 0; i < horseCount; i++) {
    const stats = getScaledEnemyStats("HORSE", waveNum);
    enemyUnits.push({
      x: canvas.width * 0.9375,
      y: canvas.height * 0.333 + (i % 3) * (canvas.height * 0.166),
      type: { ...UNIT_TYPES.HORSE, ...stats },
      hp: stats.health,
      speed: stats.speed,
      damage: stats.damage,
      maxHp: stats.health,
      opacity: 1
    });
  }
  for (let i = 0; i < knightCount; i++) {
    const stats = getScaledEnemyStats("KNIGHT", waveNum);
    enemyUnits.push({
      x: canvas.width * 0.9375,
      y: canvas.height * 0.333 + (i % 3) * (canvas.height * 0.166),
      type: { ...UNIT_TYPES.KNIGHT, ...stats },
      hp: stats.health,
      speed: stats.speed,
      damage: stats.damage,
      maxHp: stats.health,
      opacity: 1
    });
  }

  waveStarted = true;
}

// Drawing Functions
function drawBase(x, color, health) {
  const scaledX = x * (canvas.width / 800);
  const baseWidth = 70 * (canvas.width / 800);
  const baseHeight = 130 * (canvas.height / 300);
  ctx.fillStyle = "#333";
  ctx.fillRect(scaledX - baseWidth / 2, canvas.height * 0.233, baseWidth, baseHeight);
  ctx.fillStyle = color;
  ctx.fillRect(scaledX - 20 * (canvas.width / 800), canvas.height * 0.267, 40 * (canvas.width / 800), 110 * (canvas.height / 300));
  ctx.fillStyle = "#222";
  ctx.fillRect(scaledX - 15 * (canvas.width / 800), canvas.height * 0.3, 30 * (canvas.width / 800), 80 * (canvas.height / 300));

  const healthPercentage = Math.max(0, health / (150 + (baseHealthUpgrades * 25)));
  ctx.fillStyle = "red";
  ctx.fillRect(scaledX - baseWidth / 2, canvas.height * 0.2, baseWidth, 8 * (canvas.height / 300));
  ctx.fillStyle = healthPercentage > 0.5 ? "#28a745" : healthPercentage > 0.2 ? "#ffd700" : "#dc3545";
  ctx.fillRect(scaledX - baseWidth / 2, canvas.height * 0.2, baseWidth * healthPercentage, 8 * (canvas.height / 300));

  ctx.fillStyle = "#fff";
  ctx.font = `${14 * (canvas.width / 800)}px Roboto`;
  ctx.fillText(`HP: ${Math.max(0, health)}`, scaledX - baseWidth / 2, canvas.height * 0.183);
  if (x === 20) { // Player base
    ctx.fillText(`DEF: ${baseDefenseUpgrades * 10}%`, scaledX - baseWidth / 2, canvas.height * 0.167);
  }
}

function drawUnit(unit) {
  const size = 15 * (canvas.width / 800);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.arc(unit.x + 2 * (canvas.width / 800) + size, unit.y + 2 * (canvas.height / 300) + size, size, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = unit.type.color;
  ctx.globalAlpha = unit.opacity || 1;
  ctx.beginPath();
  ctx.arc(unit.x + size, unit.y + size, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const maxHealth = unit.maxHp || (unit.type.health + (unitHealthUpgrades * 3));
  const healthPercentage = Math.max(0, unit.hp / maxHealth);
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillRect(unit.x - 5 * (canvas.width / 800), unit.y - 12 * (canvas.height / 300), size * 2 + 10 * (canvas.width / 800), 6 * (canvas.height / 300));
  ctx.fillStyle = healthPercentage > 0.6 ? "#28a745" : healthPercentage > 0.3 ? "#ffd700" : "#dc3545";
  ctx.fillRect(unit.x - 5 * (canvas.width / 800), unit.y - 12 * (canvas.height / 300), (size * 2 + 10 * (canvas.width / 800)) * healthPercentage, 6 * (canvas.height / 300));

  ctx.fillStyle = "#fff";
  ctx.font = `${12 * (canvas.width / 800)}px Roboto`;
  ctx.textAlign = "center";
  ctx.fillText(unit.type.name.charAt(0).toUpperCase(), unit.x + size, unit.y + size + 5 * (canvas.height / 300));
  ctx.font = `${10 * (canvas.width / 800)}px Roboto`;
  ctx.fillText(`${Math.floor(unit.hp)}/${Math.floor(maxHealth)}`, unit.x + size, unit.y - 15 * (canvas.height / 300));
  ctx.textAlign = "left";
}

function drawWaveCooldown(seconds) {
  const cooldownElement = document.getElementById("waveCooldown");
  cooldownElement.textContent = `Next Wave in ${seconds}s`;
  cooldownElement.style.display = "block";
  cooldownElement.style.color = seconds <= 1 ? "#dc3545" : seconds <= 2 ? "#ffd700" : "#28a745";
}

function hideWaveCooldown() {
  document.getElementById("waveCooldown").style.display = "none";
}

function updateFooter() {
  goldDisplay.textContent = Math.max(0, gold);
  diamondDisplay.textContent = Math.max(0, diamonds);
  waveDisplay.textContent = wave;
}

function drawWaveProgress() {
  const progress = (wave - 1) / maxWaves;
  const progressBar = document.getElementById("waveProgressBar");
  progressBar.style.width = `${progress * 100}%`;
}

// Shop Functions
function updateShop() {
  const shop = document.getElementById("shop");
  shop.innerHTML = "<h3>Upgrades</h3>";
  for (let key in SHOP_ITEMS) {
    if (key === "NEW_UNIT" && UNIT_TYPES.KNIGHT.unlocked) continue;
    const item = SHOP_ITEMS[key];
    const container = document.createElement("div");
    container.className = "shop-item";
    const isAffordable = diamonds >= item.getPrice();
    container.innerHTML = `
      <button ${!isAffordable ? 'disabled' : ''}>${item.name} - ${item.getPrice()} Diamonds</button>
      <p>${item.description}</p>
    `;
    const button = container.querySelector("button");
    button.onclick = () => {
      item.apply();
    };
    shop.appendChild(container);
  }
}

// New Function to Update Upgrades Display
function updateUpgradesDisplay() {
  const upgradesList = document.getElementById("upgradesList");
  if (!upgradesList) return;
  let upgradesText = "";
  if (baseHealthUpgrades > 0) upgradesText += `Base Health: +${baseHealthUpgrades * 25} HP (${baseHealthUpgrades} upgrades)<br>`;
  if (unitHealthUpgrades > 0) upgradesText += `Unit Health: +${unitHealthUpgrades * 3} HP (${unitHealthUpgrades} upgrades)<br>`;
  if (unitDamageUpgrades > 0) upgradesText += `Unit Damage: +${unitDamageUpgrades * 2} DMG (${unitDamageUpgrades} upgrades)<br>`;
  if (goldProductionUpgrades > 0) upgradesText += `Gold Production: ${(800 - Math.max(300, 800 - (goldProductionUpgrades * 50))) / 4000}s faster (${goldProductionUpgrades} upgrades)<br>`;
  if (baseDefenseUpgrades > 0) upgradesText += `Base Defense: ${baseDefenseUpgrades * 10}% reduction (${baseDefenseUpgrades} upgrades)<br>`;
  if (UNIT_TYPES.KNIGHT.unlocked) upgradesText += `Knight: Unlocked<br>`;
  upgradesList.innerHTML = upgradesText || "No upgrades purchased yet.";
}

// Unit Functions
function spawnUnit() {
  if (gameActive && !gameOver && !gamePaused) {
    if (gold >= selectedUnitType.cost) {
      gold -= selectedUnitType.cost;
      const lane = units.length % 3;
      const newUnit = {
        x: canvas.width * 0.0625,
        y: canvas.height * 0.333 + lane * (canvas.height * 0.166),
        type: selectedUnitType,
        hp: Number(selectedUnitType.health) + (unitHealthUpgrades * 3),
        speed: Number(selectedUnitType.speed),
        damage: Number(selectedUnitType.damage),
        maxHp: Number(selectedUnitType.health) + (unitHealthUpgrades * 3),
        opacity: 0,
        fadeIn: true,
        fadeTimer: 0,
        lane: lane,
        lastAttack: null
      };
      if (isNaN(newUnit.hp) || isNaN(newUnit.speed) || isNaN(newUnit.damage)) {
        console.error("Invalid unit stats:", newUnit);
        showFeedback("Error spawning unit!");
        return;
      }
      units.push(newUnit);
      if (soundEnabled) {
        spawnSound.play().catch(e => {
          console.error("Spawn sound error:", e);
          showFeedback("Failed to play spawn sound!");
        });
      }
      updateFooter();
    } else {
      showFeedback("Not enough gold!");
    }
  } else {
    showFeedback("Game not active or paused!");
  }
}

function showFeedback(message) {
  feedbackMessage.textContent = message;
  feedbackMessage.classList.add("show");
  setTimeout(() => {
    feedbackMessage.classList.remove("show");
  }, 3000);
}

function showDamageNumber(x, y, amount, isEnemy) {
  if (soundEnabled && !isEnemy) {
    attackSound.play().catch(e => {
      console.error("Attack sound error:", e);
      showFeedback("Failed to play attack sound!");
    });
  }
  const damageText = document.createElement("div");
  damageText.textContent = `-${Math.floor(amount)}`;
  damageText.className = "damage-text";
  damageText.style.left = `${x + canvas.offsetLeft}px`;
  damageText.style.top = `${y + canvas.offsetTop - 30}px`;
  damageText.style.color = isEnemy ? "#dc3545" : "#ffd700";
  document.body.appendChild(damageText);
  setTimeout(() => {
    damageText.style.top = `${y + canvas.offsetTop - 60}px`;
    damageText.style.opacity = "0";
  }, 50);
  setTimeout(() => {
    document.body.removeChild(damageText);
  }, 1000);
}

function showGameOverModal(message) {
  gameOver = true;
  gamePaused = true;
  if (waveCooldownInterval) {
    clearInterval(waveCooldownInterval);
    waveCooldownInterval = null;
    hideWaveCooldown();
  }
  gameOverMessage.textContent = message;
  gameOverWave.textContent = `Reached Wave: ${wave}`;
  gameOverModal.style.display = "flex";
  updateButtonStates();
  if (soundEnabled) {
    if (message === "Victory!") {
      winSound.play().catch(e => {
        console.error("Win sound error:", e);
        showFeedback("Failed to play win sound!");
      });
    } else {
      loseSound.play().catch(e => {
        console.error("Lose sound error:", e);
        showFeedback("Failed to play lose sound!");
      });
    }
  }
}

// Battle System
function update() {
  if (!gameActive || gameOver || gamePaused) return;

  // Update spatial grid
  updateGrid();

  // Update fading units
  units.forEach(unit => {
    if (unit.fadeIn) {
      unit.fadeTimer += 1/60;
      unit.opacity = Math.min(1, unit.fadeTimer / 0.5);
      if (unit.opacity >= 1) {
        unit.fadeIn = false;
        unit.opacity = 1;
      }
    }
  });

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBase(20, "#3b5998", baseHealth);
  drawBase(750, "#dc3545", enemyBaseHealth);

  units.forEach((unit, index) => {
    if (unit.hp <= 0) {
      units.splice(index, 1);
      return;
    }

    let closestEnemy = null;
    let highestPriority = -Infinity;
    let closestDistance = Infinity;

    const nearbyEnemies = getNearbyUnits(unit.x, unit.y, true);
    nearbyEnemies.forEach(({ unit: enemy }) => {
      const dx = enemy.x - unit.x;
      const dy = enemy.y - unit.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const priority = enemy.speed - distance * 0.1;
      if (priority > highestPriority || (priority === highestPriority && distance < closestDistance)) {
        highestPriority = priority;
        closestDistance = distance;
        closestEnemy = enemy;
      }
    });

    if (closestEnemy) {
      if (closestDistance <= 30 * (canvas.width / 800)) {
        if (!unit.lastAttack || Date.now() - unit.lastAttack > 1000) {
          unit.lastAttack = Date.now();
          closestEnemy.hp = Math.max(0, closestEnemy.hp - unit.damage);
          showDamageNumber(closestEnemy.x, closestEnemy.y, unit.damage, false);
          if (closestEnemy.hp > 0) {
            unit.hp = Math.max(0, unit.hp - closestEnemy.damage * 0.7);
            showDamageNumber(unit.x, unit.y, cresceEnemy.damage * 0.7, true);
          }
          if (closestEnemy.hp <= 0) {
            const enemyEntry = nearbyEnemies.find(e => e.unit === closestEnemy);
            if (enemyEntry) {
              const enemyIndex = enemyEntry.index;
              diamonds = Math.max(0, diamonds + closestEnemy.type.reward);
              try {
                localStorage.setItem('warriorDiamonds', diamonds);
              } catch (e) {
                console.error("Failed to save diamonds:", e);
              }
              enemyUnits.splice(enemyIndex, 1);
              updateFooter();
            }
          }
        }
      } else {
        const dx = closestEnemy.x - unit.x;
        const dy = closestEnemy.y - unit.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const targetY = canvas.height * 0.333 + unit.lane * (canvas.height * 0.166);
        const yDiff = targetY - unit.y;
        if (distance > 0) {
          unit.x += (dx / distance) * unit.speed * (canvas.width / 800);
          unit.y += ((dy / distance) * unit.speed * 0.5 + yDiff * 0.1) * (canvas.height / 300);
        }
      }
    } else {
      if (unit.x < canvas.width * 0.9125) {
        const targetY = canvas.height * 0.333 + unit.lane * (canvas.height * 0.166);
        const yDiff = targetY - unit.y;
        unit.x += unit.speed * (canvas.width / 800);
        unit.y += yDiff * 0.1 * (canvas.height / 300);
      } else {
        enemyBaseHealth = Math.max(0, enemyBaseHealth - unit.damage);
        showDamageNumber(canvas.width * 0.9375, canvas.height * 0.5, unit.damage, false);
        units.splice(index, 1);
      }
    }

    drawUnit(unit);
  });

  enemyUnits.forEach((unit, index) => {
    if (unit.hp <= 0) {
      diamonds = Math.max(0, diamonds + unit.type.reward);
      try {
        localStorage.setItem('warriorDiamonds', diamonds);
      } catch (e) {
        console.error("Failed to save diamonds:", e);
      }
      enemyUnits.splice(index, 1);
      updateFooter();
      return;
    }

    let closestAlly = null;
    let highestPriority = -Infinity;
    let closestDistance = Infinity;

    const nearbyAllies = getNearbyUnits(unit.x, unit.y, false);
    nearbyAllies.forEach(({ unit: ally }) => {
      const dx = ally.x - unit.x;
      const dy = ally.y - unit.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const priority = ally.speed - distance * 0.1;
      if (priority > highestPriority || (priority === highestPriority && distance < closestDistance)) {
        highestPriority = priority;
        closestDistance = distance;
        closestAlly = ally;
      }
    });

    if (closestAlly) {
      if (closestDistance <= 30 * (canvas.width / 800)) {
        if (!unit.lastAttack || Date.now() - unit.lastAttack > 1000) {
          unit.lastAttack = Date.now();
          closestAlly.hp = Math.max(0, closestAlly.hp - unit.damage);
          showDamageNumber(closestAlly.x, closestAlly.y, unit.damage, true);
          if (closestAlly.hp > 0) {
            unit.hp = Math.max(0, unit.hp - closestAlly.damage * 0.7);
            showDamageNumber(unit.x, unit.y, closestAlly.damage * 0.7, false);
          }
        }
      } else {
        const dx = closestAlly.x - unit.x;
        const dy = closestAlly.y - unit.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0) {
          unit.x += (dx / distance) * unit.speed * (canvas.width / 800);
          unit.y += (dy / distance) * unit.speed * (canvas.height / 300);
        }
      }
    } else {
      if (unit.x > canvas.width * 0.0625) {
        unit.x -= unit.speed * (canvas.width / 800);
      } else {
        const damageReduction = 1 - (baseDefenseUpgrades * 0.1);
        const cappedDamage = Math.min(unit.damage * damageReduction, 10);
        baseHealth = Math.max(0, baseHealth - cappedDamage);
        showDamageNumber(canvas.width * 0.025, canvas.height * 0.5, cappedDamage, true);
        enemyUnits.splice(index, 1);
      }
    }

    drawUnit(unit);
  });

  if (!waveStarted && enemyUnits.length === 0 && !waveCooldown) {
    waveCooldown = true;
    waveCooldownTimer = 3;
    waveCooldownInterval = setInterval(() => {
      waveCooldownTimer--;
      drawWaveCooldown(waveCooldownTimer);
      if (waveCooldownTimer <= 0) {
        clearInterval(waveCooldownInterval);
        waveCooldownInterval = null;
        hideWaveCooldown();
        spawnWave(wave);
        waveCooldown = false;
      }
    }, 1000);
  }

  if (enemyUnits.length === 0 && waveStarted) {
    wave++;
    waveStarted = false;
    gold = Math.max(0, gold + 5 + Math.floor(wave * 0.5));
    updateFooter();
  }

  if (baseHealth <= 0) {
    showGameOverModal("Defeat!");
    return;
  }

  if (wave > maxWaves) {
    showGameOverModal("Victory!");
    return;
  }

  requestAnimationFrame(update);
}

// UI Functions
function addKnightButton() {
  if (!document.getElementById("knightButton")) {
    const knightButton = document.createElement("button");
    knightButton.id = "knightButton";
    knightButton.className = "unit-button";
    knightButton.dataset.unit = "KNIGHT";
    knightButton.textContent = "Knight (4)";
    knightButton.innerHTML += `<span class="tooltip">${generateTooltip("Knight")}</span>`;
    document.querySelector(".unit-controls").appendChild(knightButton);
    knightButton.addEventListener("click", () => {
      selectedUnitType = UNIT_TYPES.KNIGHT;
      updateUnitSelectionUI();
    });
  }
}

function updateUnitSelectionUI() {
  unitButtons.forEach(btn => btn.classList.remove("active"));
  const activeButton = Array.from(unitButtons).find(btn => btn.dataset.unit === selectedUnitType.name.toUpperCase());
  if (activeButton) activeButton.classList.add("active");
  updateUnitInfoPanel();
}

function addTooltips() {
  const tooltips = {
    BARBARIAN: generateTooltip("Barbarian"),
    ARCHER: generateTooltip("Archer"),
    HORSE: generateTooltip("Horse"),
    KNIGHT: generateTooltip("Knight")
  };

  unitButtons.forEach(button => {
    const unit = button.dataset.unit;
    if (unit !== "KNIGHT" || (unit === "KNIGHT" && UNIT_TYPES.KNIGHT.unlocked)) {
      button.innerHTML = button.textContent + `<span class="tooltip">${tooltips[unit]}</span>`;
    }
  });
}

function generateTooltip(unitName) {
  const unit = UNIT_TYPES[unitName.toUpperCase()];
  const health = unit.health + (unitHealthUpgrades * 3);
  const damage = unit.damage;
  const speed = unit.speed.toFixed(1);
  const cost = unit.cost;
  let description = "";
  
  switch (unitName.toUpperCase()) {
    case "BARBARIAN":
      description = "Balanced fighter, good for early waves.";
      break;
    case "ARCHER":
      description = "High damage, fragile. Great for ranged support.";
      break;
    case "HORSE":
      description = "Fast and strong, ideal for quick strikes.";
      break;
    case "KNIGHT":
      description = "Tanky with high damage, excels in late waves.";
      break;
  }

  return `
    <strong>${unitName}</strong><br>
    ${description}<br>
    <ul style="list-style: none; padding: 0; margin: 5px 0 0;">
      <li>Health: ${health}</li>
      <li>Damage: ${damage}</li>
      <li>Speed: ${speed}</li>
      <li>Cost: ${cost} gold</li>
    </ul>
  `;
}

function updateUnitInfoPanel() {
  const panel = document.getElementById("unitInfoPanel");
  if (!panel) return;
  if (!selectedUnitType) {
    panel.innerHTML = "";
    return;
  }
  const health = selectedUnitType.health + (unitHealthUpgrades * 3);
  const damage = selectedUnitType.damage;
  const speed = selectedUnitType.speed.toFixed(1);
  const cost = selectedUnitType.cost;
  let description = "";
  switch (selectedUnitType.name.toUpperCase()) {
    case "BARBARIAN":
      description = "Balanced fighter, good for early waves.";
      break;
    case "ARCHER":
      description = "High damage, fragile. Great for ranged support.";
      break;
    case "HORSE":
      description = "Fast and strong, ideal for quick strikes.";
      break;
    case "KNIGHT":
      description = "Tanky with high damage, excels in late waves.";
      break;
  }
  panel.innerHTML = `
    <h4>${selectedUnitType.name}</h4>
    <p>${description}</p>
    <p>Health: ${health}</p>
    <p>Damage: ${damage}</p>
    <p>Speed: ${speed}</p>
    <p>Cost: ${cost} gold</p>
  `;
}

function updateButtonStates() {
  fightButton.disabled = gameActive && !gameOver;
  pauseButton.disabled = !gameActive || gameOver;
  surrenderButton.disabled = !gameActive || gameOver;
  restartButton.disabled = !gameActive || gameOver;
  gameOverRestartButton.disabled = !gameOver;
  gameOverShopButton.disabled = !gameOver;
  pauseButton.textContent = gamePaused ? "Resume" : "Pause";
}

// Pause Functions
function togglePause() {
  if (gameActive && !gameOver) {
    gamePaused = !gamePaused;
    pauseMenu.style.display = gamePaused ? "flex" : "none";
    updateButtonStates();
    updateUpgradesDisplay();
    if (!gamePaused) {
      document.getElementById("shop").style.display = "none";
      toggleShopButton.textContent = "Show Shop";
      requestAnimationFrame(update);
    }
  }
}

// Tutorial Functions
function showTutorial() {
  try {
    if (!localStorage.getItem('warriorTutorialSeen')) {
      tutorialModal.style.display = "flex";
      fightButton.disabled = true;
    }
  } catch (e) {
    console.error("Failed to check tutorial status:", e);
  }
}

// Unlock audio on first interaction
function unlockAudio() {
  [spawnSound, attackSound, winSound, loseSound].forEach(audio => {
    audio.muted = true;
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    }).catch(e => console.warn("Audio unlock failed:", e));
  });
}

// Audio Check
function checkAudioFiles() {
  [spawnSound, attackSound, winSound, loseSound].forEach(audio => {
    audio.addEventListener("canplaythrough", () => {
      console.log(`Audio loaded successfully: ${audio.src}`);
    }, { once: true });

    audio.addEventListener("error", () => {
      console.error(`Failed to load audio: ${audio.src}`);
      showFeedback(`Cannot load ${audio.id}. Check file path.`);
    }, { once: true });

    audio.load();
  });
}

// Event Listeners
fightButton.addEventListener("click", () => {
  unlockAudio();
  gameActive = true;
  document.getElementById("shop").style.display = "none";
  initGame();
  requestAnimationFrame(update);
});

pauseButton.addEventListener("click", togglePause);

resumeButton.addEventListener("click", togglePause);

toggleShopButton.addEventListener("click", () => {
  const shop = document.getElementById("shop");
  shop.style.display = shop.style.display === "block" ? "none" : "block";
  toggleShopButton.textContent = shop.style.display === "block" ? "Hide Shop" : "Show Shop";
});

surrenderPauseButton.addEventListener("click", () => {
  gameActive = false;
  gameOver = true;
  gamePaused = false;
  clearInterval(goldInterval);
  pauseMenu.style.display = "none";
  document.getElementById("shop").style.display = "block";
  updateButtonStates();
});

surrenderButton.addEventListener("click", () => {
  if (gameActive && !gameOver) {
    gameActive = false;
    gameOver = true;
    gamePaused = false;
    clearInterval(goldInterval);
    pauseMenu.style.display = "none";
    document.getElementById("shop").style.display = "block";
    showFeedback("You surrendered!");
    updateButtonStates();
  }
});

restartButton.addEventListener("click", () => {
  if (gameActive && !gameOver) {
    gameActive = true;
    gameOver = false;
    gamePaused = false;
    pauseMenu.style.display = "none";
    document.getElementById("shop").style.display = "none";
    initGame();
    showFeedback("Game restarted!");
    requestAnimationFrame(update);
  }
});

gameOverRestartButton.addEventListener("click", () => {
  gameOverModal.style.display = "none";
  gameActive = true;
  gameOver = false;
  gamePaused = false;
  document.getElementById("shop").style.display = "none";
  initGame();
  requestAnimationFrame(update);
});

gameOverShopButton.addEventListener("click", () => {
  gameOverModal.style.display = "none";
  gameActive = false;
  gameOver = true;
  gamePaused = false;
  clearInterval(goldInterval);
  document.getElementById("shop").style.display = "block";
  updateButtonStates();
});

startTutorialButton.addEventListener("click", () => {
  tutorialModal.style.display = "none";
  try {
    localStorage.setItem('warriorTutorialSeen', 'true');
  } catch (e) {
    console.error("Failed to save tutorial status:", e);
  }
  updateButtonStates();
});

soundToggleButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundToggleButton.textContent = `Sound: ${soundEnabled ? "On" : "Off"}`;
});

if (!spawnButton) {
  console.error("Spawn button not found! Please check the HTML for the spawnButton element.");
} else {
  spawnButton.addEventListener("click", spawnUnit);
}

unitButtons.forEach(button => {
  button.addEventListener("click", () => {
    selectedUnitType = UNIT_TYPES[button.dataset.unit];
    updateUnitSelectionUI();
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && gameActive && !gameOver) {
    togglePause();
  }
  if (gamePaused) return;
  if (e.key >= "1" && e.key <= "4") {
    const units = ["BARBARIAN", "ARCHER", "HORSE", "KNIGHT"];
    const index = parseInt(e.key) - 1;
    if (index === 3 && !UNIT_TYPES.KNIGHT.unlocked) return;
    selectedUnitType = UNIT_TYPES[units[index]];
    updateUnitSelectionUI();
  }
  if (e.key === " ") {
    spawnUnit();
  }
});

// Initialize
if (UNIT_TYPES.KNIGHT.unlocked) addKnightButton();
addTooltips();
updateShop();
updateUnitSelectionUI();
updateFooter();
showTutorial();
checkAudioFiles();