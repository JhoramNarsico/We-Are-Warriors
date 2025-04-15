// Game State Variables
let wave = 1;
let waveStarted = false;
const maxWaves = 50;
let gameActive = false;
let waveCooldown = false;
let waveCooldownTimer = 0;
let soundEnabled = true;

// Canvas Setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  const maxWidth = window.innerWidth * 0.9;
  const maxHeight = window.innerHeight * 0.5;
  canvas.width = Math.min(800, maxWidth);
  canvas.height = Math.min(300, maxHeight);
  console.log("Canvas resized to:", canvas.width, canvas.height);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// DOM Elements
const fightButton = document.getElementById("fightButton");
const surrenderButton = document.getElementById("surrenderButton");
const restartButton = document.getElementById("restartButton");
const soundToggleButton = document.getElementById("soundToggleButton");
const spawnButton = document.getElementById("spawnButton");
const feedbackMessage = document.getElementById("feedbackMessage");
const goldDisplay = document.getElementById("goldDisplay");
const diamondDisplay = document.getElementById("diamondDisplay");
const waveDisplay = document.getElementById("waveDisplay");
const unitButtons = document.querySelectorAll(".unit-button");

// Audio Elements
const spawnSound = document.getElementById("spawnSound");
const attackSound = document.getElementById("attackSound");
const winSound = document.getElementById("winSound");
const loseSound = document.getElementById("loseSound");

// Unit Definitions
const BASE_ENEMY_STATS = {
  BARBARIAN: { health: 15, damage: 3, speed: 1.1, reward: 1 },
  ARCHER: { health: 8, damage: 6, speed: 1.3, reward: 2 },
  HORSE: { health: 25, damage: 12, speed: 2.2, reward: 3 },
  KNIGHT: { health: 40, damage: 8, speed: 1.5, reward: 5 }
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
let diamonds = localStorage.getItem('warriorDiamonds') ? parseInt(localStorage.getItem('warriorDiamonds')) : 0;
let selectedUnitType = UNIT_TYPES.BARBARIAN;

// Upgrades
let goldProductionRate = 800;
let baseHealthUpgrades = parseInt(localStorage.getItem('warriorBaseHealthUpgrades')) || 0;
let unitHealthUpgrades = parseInt(localStorage.getItem('warriorUnitHealthUpgrades')) || 0;
let goldProductionUpgrades = parseInt(localStorage.getItem('warriorGoldProdUpgrades')) || 0;
let unitDamageUpgrades = parseInt(localStorage.getItem('warriorUnitDamageUpgrades')) || 0;

// Load saved upgrades
const savedDamage = localStorage.getItem('warriorUnitDamage');
if (savedDamage) {
  const damage = JSON.parse(savedDamage);
  UNIT_TYPES.BARBARIAN.damage = damage.barb || BASE_ENEMY_STATS.BARBARIAN.damage;
  UNIT_TYPES.ARCHER.damage = damage.arch || BASE_ENEMY_STATS.ARCHER.damage;
  UNIT_TYPES.HORSE.damage = damage.horse || BASE_ENEMY_STATS.HORSE.damage;
  UNIT_TYPES.KNIGHT.damage = damage.knight || BASE_ENEMY_STATS.KNIGHT.damage;
}

// Check if knight is unlocked
if (localStorage.getItem('warriorKnightUnlocked') === 'true') {
  UNIT_TYPES.KNIGHT.unlocked = true;
}

// Gold production
let goldInterval = setInterval(() => {
  if (gameActive && !gameOver) {
    gold += 1 + Math.floor(wave / 5);
    updateFooter();
  }
}, goldProductionRate);

// Shop Items (unchanged from previous)
const SHOP_ITEMS = {
  GOLD_PRODUCTION: {
    name: "Gold Production +",
    description: "Increase gold production by 0.2/s",
    getPrice: () => 10 + (goldProductionUpgrades * 15),
    apply: function() {
      if (diamonds >= this.getPrice()) {
        diamonds -= this.getPrice();
        localStorage.setItem('warriorDiamonds', diamonds);
        goldProductionRate = Math.max(300, 800 - (goldProductionUpgrades * 50));
        goldProductionUpgrades++;
        localStorage.setItem('warriorGoldProdUpgrades', goldProductionUpgrades);
        clearInterval(goldInterval);
        goldInterval = setInterval(() => {
          if (gameActive && !gameOver) {
            gold += 1 + Math.floor(wave / 5);
            updateFooter();
          }
        }, goldProductionRate);
        updateShop();
        updateFooter();
        showFeedback("Gold production upgraded!");
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
        localStorage.setItem('warriorDiamonds', diamonds);
        baseHealth += 25;
        baseHealthUpgrades++;
        localStorage.setItem('warriorBaseHealthUpgrades', baseHealthUpgrades);
        updateFooter();
        updateShop();
        showFeedback("Base health increased!");
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
        localStorage.setItem('warriorDiamonds', diamonds);
        unitHealthUpgrades++;
        localStorage.setItem('warriorUnitHealthUpgrades', unitHealthUpgrades);
        updateFooter();
        updateShop();
        showFeedback("Unit health increased!");
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
        localStorage.setItem('warriorDiamonds', diamonds);
        UNIT_TYPES.BARBARIAN.damage += 2;
        UNIT_TYPES.ARCHER.damage += 2;
        UNIT_TYPES.HORSE.damage += 2;
        UNIT_TYPES.KNIGHT.damage += 2;
        unitDamageUpgrades++;
        localStorage.setItem('warriorUnitDamage', JSON.stringify({
          barb: UNIT_TYPES.BARBARIAN.damage,
          arch: UNIT_TYPES.ARCHER.damage,
          horse: UNIT_TYPES.HORSE.damage,
          knight: UNIT_TYPES.KNIGHT.damage
        }));
        localStorage.setItem('warriorUnitDamageUpgrades', unitDamageUpgrades);
        updateFooter();
        updateShop();
        showFeedback("Unit damage increased!");
      } else {
        showFeedback("Not enough diamonds!");
      }
    }
  },
  NEW_UNIT: {
    name: "Unlock Knight",
    description: "Unlock the powerful Knight unit",
    getPrice: () => 50,
    apply: function() {
      if (diamonds >= this.getPrice() && !UNIT_TYPES.KNIGHT.unlocked) {
        diamonds -= this.getPrice();
        localStorage.setItem('warriorDiamonds', diamonds);
        UNIT_TYPES.KNIGHT.unlocked = true;
        localStorage.setItem('warriorKnightUnlocked', 'true');
        addKnightButton();
        updateShop();
        updateFooter();
        showFeedback("Knight unlocked!");
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
  units = [];
  enemyUnits = [];
  gold = 0;
  waveCooldown = false;
  waveStarted = false;
  waveCooldownTimer = 0;

  goldProductionRate = Math.max(300, 800 - (goldProductionUpgrades * 50));
  clearInterval(goldInterval);
  goldInterval = setInterval(() => {
    if (gameActive && !gameOver) {
      gold += 1 + Math.floor(wave / 5);
      updateFooter();
    }
  }, goldProductionRate);

  updateShop();
  updateFooter();
  updateUnitSelectionUI();
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
    drawGameOver("Victory!");
    gameOver = true;
    if (soundEnabled) winSound.play().catch(e => console.error("Win sound error:", e));
    restartButton.disabled = false;
    return;
  }

  const barbarianCount = 2 + Math.floor(waveNum / 2);
  const archerCount = Math.max(0, Math.floor((waveNum - 2) / 3));
  const horseCount = Math.max(0, Math.floor((waveNum - 4) / 5));
  const knightCount = waveNum >= 10 ? Math.floor(waveNum / 10) : 0;

  for (let i = 0; i < barbarianCount; i++) {
    const stats = getScaledEnemyStats("BARBARIAN", waveNum);
    enemyUnits.push({
      x: canvas.width * 0.9375, // Scales to 750/800
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
}

function drawUnit(unit) {
  console.log("Drawing unit:", unit.type.name, "at", unit.x, unit.y);
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

function drawGameOver(message) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffd700";
  ctx.font = `${36 * (canvas.width / 800)}px Roboto`;
  ctx.textAlign = "center";
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  ctx.font = `${20 * (canvas.width / 800)}px Roboto`;
  ctx.fillText(`Reached Wave: ${wave}`, canvas.width / 2, canvas.height / 2 + 40 * (canvas.height / 300));
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
    container.innerHTML = `
      <button>${item.name} - ${item.getPrice()} Diamonds</button>
      <p>${item.description}</p>
    `;
    container.querySelector("button").onclick = item.apply.bind(item);
    shop.appendChild(container);
  }
}

// Unit Functions
function spawnUnit() {
  console.log("Attempting to spawn unit:", selectedUnitType.name, "Gold:", gold, "Game Active:", gameActive, "Game Over:", gameOver);
  if (gameActive && !gameOver) {
    if (gold >= selectedUnitType.cost) {
      gold -= selectedUnitType.cost;
      const newUnit = {
        x: canvas.width * 0.0625,
        y: canvas.height * 0.333 + (units.length % 3) * (canvas.height * 0.166),
        type: selectedUnitType,
        hp: selectedUnitType.health + (unitHealthUpgrades * 3),
        speed: selectedUnitType.speed,
        damage: selectedUnitType.damage,
        maxHp: selectedUnitType.health + (unitHealthUpgrades * 3),
        opacity: 0
      };
      units.push(newUnit);
      console.log("Unit spawned:", newUnit);
      if (soundEnabled) spawnSound.play().catch(e => console.error("Spawn sound error:", e));
      let opacity = 0;
      const fadeInterval = setInterval(() => {
        opacity += 0.1;
        newUnit.opacity = opacity;
        if (opacity >= 1) {
          newUnit.opacity = 1;
          clearInterval(fadeInterval);
        }
      }, 50);
      updateFooter();
    } else {
      showFeedback("Not enough gold!");
    }
  } else {
    showFeedback("Game not active or over!");
  }
}

function showFeedback(message) {
  feedbackMessage.textContent = message;
  feedbackMessage.classList.add("show");
  setTimeout(() => {
    feedbackMessage.classList.remove("show");
  }, 2000);
}

function showDamageNumber(x, y, amount, isEnemy) {
  if (soundEnabled && !isEnemy) attackSound.play().catch(e => console.error("Attack sound error:", e));
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

// Battle System
function update() {
  if (!gameActive || gameOver) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBase(20, "#3b5998", baseHealth);
  drawBase(750, "#dc3545", enemyBaseHealth);

  units.forEach((unit, index) => {
    if (unit.hp <= 0) {
      units.splice(index, 1);
      return;
    }

    let closestEnemy = null;
    let closestDistance = Infinity;

    enemyUnits.forEach(enemy => {
      const dx = enemy.x - unit.x;
      const dy = enemy.y - unit.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < closestDistance) {
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
            showDamageNumber(unit.x, unit.y, closestEnemy.damage * 0.7, true);
          }
          if (closestEnemy.hp <= 0) {
            const enemyIndex = enemyUnits.indexOf(closestEnemy);
            if (enemyIndex !== -1) {
              diamonds = Math.max(0, diamonds + closestEnemy.type.reward);
              localStorage.setItem('warriorDiamonds', diamonds);
              enemyUnits.splice(enemyIndex, 1);
              updateFooter();
            }
          }
        }
      } else {
        const dx = closestEnemy.x - unit.x;
        const dy = closestEnemy.y - unit.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        unit.x += (dx / distance) * unit.speed * (canvas.width / 800);
        unit.y += (dy / distance) * unit.speed * (canvas.height / 300);
      }
    } else {
      if (unit.x < canvas.width * 0.9125) {
        unit.x += unit.speed * (canvas.width / 800);
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
      localStorage.setItem('warriorDiamonds', diamonds);
      enemyUnits.splice(index, 1);
      updateFooter();
      return;
    }

    let closestAlly = null;
    let closestDistance = Infinity;

    units.forEach(ally => {
      const dx = ally.x - unit.x;
      const dy = ally.y - unit.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < closestDistance) {
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
        unit.x += (dx / distance) * unit.speed * (canvas.width / 800);
        unit.y += (dy / distance) * unit.speed * (canvas.height / 300);
      }
    } else {
      if (unit.x > canvas.width * 0.0625) {
        unit.x -= unit.speed * (canvas.width / 800);
      } else {
        baseHealth = Math.max(0, baseHealth - unit.damage);
        showDamageNumber(canvas.width * 0.025, canvas.height * 0.5, unit.damage, true);
        enemyUnits.splice(index, 1);
      }
    }

    drawUnit(unit);
  });

  if (!waveStarted && enemyUnits.length === 0 && !waveCooldown) {
    waveCooldown = true;
    waveCooldownTimer = 3;
    const interval = setInterval(() => {
      waveCooldownTimer--;
      drawWaveCooldown(waveCooldownTimer);
      if (waveCooldownTimer <= 0) {
        clearInterval(interval);
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
    drawGameOver("Defeat!");
    gameOver = true;
    if (soundEnabled) loseSound.play().catch(e => console.error("Lose sound error:", e));
    restartButton.disabled = false;
    return;
  }

  if (wave > maxWaves) {
    drawGameOver("Victory!");
    gameOver = true;
    if (soundEnabled) winSound.play().catch(e => console.error("Win sound error:", e));
    restartButton.disabled = false;
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
}

// Event Listeners
fightButton.addEventListener("click", () => {
  console.log("Fight button clicked");
  gameActive = true;
  fightButton.disabled = true;
  surrenderButton.disabled = false;
  restartButton.disabled = true;
  document.getElementById("shop").style.display = "none";
  initGame();
  console.log("Starting update loop");
  requestAnimationFrame(update);
});

surrenderButton.addEventListener("click", () => {
  gameActive = false;
  gameOver = true;
  fightButton.disabled = false;
  surrenderButton.disabled = true;
  restartButton.disabled = true;
  document.getElementById("shop").style.display = "block";
});

restartButton.addEventListener("click", () => {
  gameActive = true;
  gameOver = false;
  fightButton.disabled = true;
  surrenderButton.disabled = false;
  restartButton.disabled = true;
  document.getElementById("shop").style.display = "none";
  initGame();
  requestAnimationFrame(update);
});

soundToggleButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundToggleButton.textContent = `Sound: ${soundEnabled ? "On" : "Off"}`;
});

if (!spawnButton) {
  console.error("Spawn button not found!");
} else {
  spawnButton.addEventListener("click", () => {
    console.log("Spawn button clicked");
    spawnUnit();
  });
}

unitButtons.forEach(button => {
  button.addEventListener("click", () => {
    selectedUnitType = UNIT_TYPES[button.dataset.unit];
    updateUnitSelectionUI();
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key >= "1" && e.key <= "4") {
    const units = ["BARBARIAN", "ARCHER", "HORSE", "KNIGHT"];
    const index = parseInt(e.key) - 1;
    if (index === 3 && !UNIT_TYPES.KNIGHT.unlocked) return;
    selectedUnitType = UNIT_TYPES[units[index]];
    updateUnitSelectionUI();
  }
  if (e.key === " ") {
    console.log("Spacebar pressed");
    spawnUnit();
  }
});

// Initialize
if (UNIT_TYPES.KNIGHT.unlocked) addKnightButton();
updateShop();
updateUnitSelectionUI();
updateFooter();

// Audio Check
function checkAudioFiles() {
  [spawnSound, attackSound, winSound, loseSound].forEach(audio => {
    audio.addEventListener("error", () => {
      console.error(`Failed to load audio: ${audio.src}`);
      showFeedback(`Audio error: ${audio.id}`);
    });
    audio.load();
  });
}
checkAudioFiles();