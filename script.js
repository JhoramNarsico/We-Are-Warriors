// Game State Variables
let wave = 1;
let waveStarted = false;
const maxWaves = 50;
let gameActive = false;
let waveCooldown = false;
let waveCooldownTimer = 0;
let soundEnabled = true; // Audio toggle state

// Canvas Setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// DOM Elements
const fightButton = document.getElementById("fightButton");
const surrenderButton = document.getElementById("surrenderButton");
const restartButton = document.getElementById("restartButton");
const soundToggleButton = document.getElementById("soundToggleButton");
const barbarianButton = document.getElementById("barbarianButton");
const archerButton = document.getElementById("archerButton");
const horseButton = document.getElementById("horseButton");
const spawnButton = document.getElementById("spawnButton");
const feedbackMessage = document.getElementById("feedbackMessage");

// Audio Elements
const spawnSound = document.getElementById("spawnSound");
const attackSound = document.getElementById("attackSound");
const winSound = document.getElementById("winSound");
const loseSound = document.getElementById("loseSound");

// Unit Definitions (unchanged)
const BASE_ENEMY_STATS = {
  BARBARIAN: { health: 15, damage: 3, speed: 1.1, reward: 1 },
  ARCHER: { health: 8, damage: 6, speed: 1.3, reward: 2 },
  HORSE: { health: 25, damage: 12, speed: 2.2, reward: 3 },
  KNIGHT: { health: 40, damage: 8, speed: 1.5, reward: 5 }
};

const UNIT_TYPES = {
  BARBARIAN: { ...BASE_ENEMY_STATS.BARBARIAN, name: "barbarian", color: "#3498db", cost: 5 },
  ARCHER: { ...BASE_ENEMY_STATS.ARCHER, name: "archer", color: "#2ecc71", cost: 8 },
  HORSE: { ...BASE_ENEMY_STATS.HORSE, name: "horse", color: "#a67c52", cost: 12 },
  KNIGHT: { ...BASE_ENEMY_STATS.KNIGHT, name: "knight", color: "#e74c3c", cost: 15, unlocked: false }
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

// Upgrades (unchanged)
let goldProductionRate = 800;
let baseHealthUpgrades = parseInt(localStorage.getItem('warriorBaseHealthUpgrades')) || 0;
let unitHealthUpgrades = parseInt(localStorage.getItem('warriorUnitHealthUpgrades')) || 0;
let goldProductionUpgrades = parseInt(localStorage.getItem('warriorGoldProdUpgrades')) || 0;
let unitDamageUpgrades = parseInt(localStorage.getItem('warriorUnitDamageUpgrades')) || 0;

// Load saved upgrades (unchanged)
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

// Gold production system (unchanged)
let goldInterval = setInterval(() => {
  if (gameActive && !gameOver) gold += 1 + Math.floor(wave / 5);
}, goldProductionRate);

// Shop Items (unchanged)
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
          if (gameActive && !gameOver) gold += 1 + Math.floor(wave / 5);
        }, goldProductionRate);
        drawUI();
        updateShopPrices();
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
        drawUI();
        updateShopPrices();
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
        drawUI();
        updateShopPrices();
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
        drawUI();
        updateShopPrices();
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
        drawUI();
        updateShopPrices();
      }
    }
  }
};

// Initialize Game
function initGame() {
  wave = 1;
  baseHealth = Math.max(150 + (baseHealthUpgrades * 25), 0);
  enemyBaseHealth = 150;
  gameOver = false;
  units = [];
  enemyUnits = [];
  gold = 0;
  waveCooldown = false;
  waveStarted = false;
  waveCooldownTimer = 0;
  
  // Apply upgrades
  goldProductionRate = Math.max(300, 800 - (goldProductionUpgrades * 50));
  clearInterval(goldInterval);
  goldInterval = setInterval(() => {
    if (gameActive && !gameOver) gold += 1 + Math.floor(wave / 5);
  }, goldProductionRate);
  
  updateShopPrices();
  drawUI();
}

// Game Functions (unchanged)
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
    console.log("Win condition reached, soundEnabled:", soundEnabled);
    drawGameOver("CONGRATULATIONS! YOU WON!");
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
      x: 750, y: 100 + (i % 3) * 50,
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
      x: 750, y: 100 + (i % 3) * 50,
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
      x: 750, y: 100 + (i % 3) * 50,
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
      x: 750, y: 100 + (i % 3) * 50,
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
  // Draw tower-like base
  ctx.fillStyle = "#666";
  ctx.fillRect(x - 10, 80, 60, 120); // Base foundation
  ctx.fillStyle = color;
  ctx.fillRect(x, 90, 40, 100); // Main tower
  ctx.fillStyle = "#333";
  ctx.fillRect(x + 5, 100, 30, 80); // Door
  ctx.fillStyle = "#000";
  ctx.font = "14px Arial";
  ctx.fillText("HP: " + Math.max(0, health), x - 10, 75);
  const healthPercentage = Math.max(0, health / (150 + (baseHealthUpgrades * 25)));
  ctx.fillStyle = "red";
  ctx.fillRect(x - 10, 60, 60, 5);
  ctx.fillStyle = healthPercentage > 0.5 ? "lime" : healthPercentage > 0.2 ? "yellow" : "red";
  ctx.fillRect(x - 10, 60, 60 * healthPercentage, 5);
}

function drawUnit(unit) {
  const size = 12; // Radius for circular units
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.arc(unit.x + 2 + size, unit.y + 2 + size, size, 0, Math.PI * 2);
  ctx.fill();
  // Unit circle
  ctx.fillStyle = unit.type.color;
  ctx.globalAlpha = unit.opacity || 1;
  ctx.beginPath();
  ctx.arc(unit.x + size, unit.y + size, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Health bar
  const maxHealth = unit.maxHp || (unit.type.health + (unitHealthUpgrades * 3));
  const healthPercentage = Math.max(0, unit.hp / maxHealth);
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(unit.x - 2, unit.y - 10, size * 2 + 4, 6);
  ctx.fillStyle = healthPercentage > 0.6 ? "#2ecc71" : 
                  healthPercentage > 0.3 ? "#f39c12" : "#e74c3c";
  ctx.fillRect(unit.x - 2, unit.y - 10, (size * 2 + 4) * healthPercentage, 6);
  // Name and HP
  ctx.fillStyle = "#fff";
  ctx.font = "bold 12px Arial";
  ctx.fillText(unit.type.name.charAt(0).toUpperCase(), unit.x + 7, unit.y + 17);
  ctx.font = "bold 10px Arial";
  ctx.fillText(`${Math.floor(unit.hp)}/${Math.floor(maxHealth)}`, unit.x, unit.y - 13);
}

function drawGameOver(message) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.fillRect(canvas.width / 2 - 180, canvas.height / 2 - 50, 360, 100);
  ctx.fillStyle = "#fff";
  ctx.font = "32px Arial";
  ctx.textAlign = "center";
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  ctx.font = "20px Arial";
  ctx.fillText(`Reached Wave: ${wave}`, canvas.width / 2, canvas.height / 2 + 30);
  ctx.textAlign = "left";
  restartButton.disabled = false;
}

function drawWaveCooldown(seconds) {
  const cooldownElement = document.getElementById("waveCooldown");
  cooldownElement.textContent = `Next wave in ${seconds}s`;
  cooldownElement.style.display = "block";
  cooldownElement.style.color = seconds <= 1 ? "#e74c3c" : seconds <= 2 ? "#f39c12" : "#2ecc71";
}

function hideWaveCooldown() {
  document.getElementById("waveCooldown").style.display = "none";
}

function drawGold() {
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(5, canvas.height - 85, 180, 25);
  ctx.fillStyle = "#f1c40f";
  ctx.font = "bold 20px Arial";
  ctx.fillText("Gold: " + Math.max(0, gold), 10, canvas.height - 70);
}

function drawDiamonds() {
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(5, canvas.height - 55, 180, 25);
  ctx.fillStyle = "#1abc9c";
  ctx.font = "bold 20px Arial";
  ctx.fillText("Diamonds: " + Math.max(0, diamonds), 10, canvas.height - 40);
}

function drawWaveProgress() {
  const progress = (wave - 1) / maxWaves;
  const progressBar = document.getElementById("waveProgressBar") || document.createElement("div");
  progressBar.id = "waveProgressBar";
  progressBar.style.width = `${progress * 100}%`;
  if (!document.getElementById("waveProgress")) {
    const progressContainer = document.createElement("div");
    progressContainer.id = "waveProgress";
    progressContainer.appendChild(progressBar);
    document.body.insertBefore(progressContainer, document.getElementById("shop"));
  }
}

function drawUI() {
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, canvas.width, 60);
  ctx.fillStyle = "#34495e";
  ctx.fillRect(canvas.width / 2 - 60, 5, 120, 30);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Wave: " + wave, canvas.width / 2, 28);
  ctx.textAlign = "left";
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 10, 220, 50);
  ctx.fillStyle = "#ecf0f1";
  ctx.fillRect(5, 15, 210, 40);
  ctx.fillStyle = "#2c3e50";
  ctx.font = "bold 16px Arial";
  ctx.fillText("Selected: " + selectedUnitType.name, 10, 35);
  ctx.fillText("Cost: " + selectedUnitType.cost + " gold", 10, 55);
  drawGold();
  drawDiamonds();
  drawWaveProgress();
}

// Shop Functions (unchanged)
function updateShopPrices() {
  const shop = document.getElementById("shop");
  shop.innerHTML = "<h3 style='color:#2c3e50;'>Upgrades Shop</h3>";
  
  for (let key in SHOP_ITEMS) {
    const item = SHOP_ITEMS[key];
    if (key === "NEW_UNIT" && UNIT_TYPES.KNIGHT.unlocked) continue;
    
    const btn = document.createElement("button");
    btn.innerText = `${item.name} - ${item.getPrice()} diamonds`;
    btn.title = item.description;
    btn.style.cssText = `
      margin: 5px;
      padding: 8px 12px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    `;
    btn.onmouseover = () => btn.style.background = "#2980b9";
    btn.onmouseout = () => btn.style.background = "#3498db";
    btn.onclick = item.apply.bind(item);
    
    const container = document.createElement("div");
    container.style.margin = "10px 0";
    const desc = document.createElement("div");
    desc.textContent = item.description;
    desc.style.fontSize = "12px";
    desc.style.color = "#7f8c8d";
    container.appendChild(btn);
    container.appendChild(desc);
    shop.appendChild(container);
  }
}

// Unit Functions
function spawnUnit() {
  if (gameActive && !gameOver) {
    if (gold >= selectedUnitType.cost) {
      gold -= selectedUnitType.cost;
      const newUnit = { 
        x: 50, 
        y: 100 + (units.length % 3) * 50,
        type: selectedUnitType,
        hp: selectedUnitType.health + (unitHealthUpgrades * 3),
        speed: selectedUnitType.speed,
        damage: selectedUnitType.damage,
        maxHp: selectedUnitType.health + (unitHealthUpgrades * 3),
        opacity: 0 // For fade-in animation
      };
      units.push(newUnit);
      console.log("Spawning unit, soundEnabled:", soundEnabled);
      if (soundEnabled) spawnSound.play().catch(e => console.error("Spawn sound error:", e));
      // Animate spawn
      let opacity = 0;
      const fadeInterval = setInterval(() => {
        opacity += 0.1;
        newUnit.opacity = opacity;
        if (opacity >= 1) {
          newUnit.opacity = 1;
          clearInterval(fadeInterval);
        }
      }, 50);
    } else {
      showFeedback("Not enough gold!");
    }
  }
}

function showFeedback(message) {
  feedbackMessage.textContent = message;
  feedbackMessage.style.display = "block";
  feedbackMessage.style.opacity = "1";
  setTimeout(() => {
    feedbackMessage.style.opacity = "0";
    setTimeout(() => {
      feedbackMessage.style.display = "none";
    }, 500);
  }, 2000);
}

function showDamageNumber(x, y, amount, isEnemy) {
  console.log("Playing attack sound, isEnemy:", isEnemy, "soundEnabled:", soundEnabled);
  if (soundEnabled && !isEnemy) attackSound.play().catch(e => console.error("Attack sound error:", e));
  const damageText = document.createElement("div");
  damageText.textContent = `-${Math.floor(amount)}`;
  damageText.style.position = "absolute";
  damageText.style.left = `${x + canvas.offsetLeft}px`;
  damageText.style.top = `${y + canvas.offsetTop - 30}px`;
  damageText.style.color = isEnemy ? "#e74c3c" : "#f1c40f";
  damageText.style.fontWeight = "bold";
  damageText.style.fontSize = "16px";
  damageText.style.pointerEvents = "none";
  damageText.style.textShadow = "1px 1px 2px #000";
  damageText.style.transition = "all 0.5s";
  damageText.style.opacity = "1";
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

  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
  drawBase(20, "#3498db", baseHealth);
  drawBase(750, "#e74c3c", enemyBaseHealth);
  drawUI();

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

  // Player units behavior
  units.forEach((unit, index) => {
    if (unit.hp <= 0) {
      units.splice(index, 1);
      return;
    }
    
    // Find closest enemy
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
      // Attack if in range
      if (closestDistance <= 30) {
        if (!unit.lastAttack || Date.now() - unit.lastAttack > 1000) {
          unit.lastAttack = Date.now();
          closestEnemy.hp = Math.max(0, closestEnemy.hp - unit.damage);
          showDamageNumber(closestEnemy.x, closestEnemy.y, unit.damage, false);
          
          // Enemy counterattacks
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
            }
          }
        }
      } else {
        // Move toward enemy
        const dx = closestEnemy.x - unit.x;
        const dy = closestEnemy.y - unit.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        unit.x += (dx / distance) * unit.speed;
        unit.y += (dy / distance) * unit.speed;
      }
    } else {
      // Move toward enemy base
      if (unit.x < 730) {
        unit.x += unit.speed;
      } else {
        enemyBaseHealth = Math.max(0, enemyBaseHealth - unit.damage);
        showDamageNumber(750, 150, unit.damage, false);
        units.splice(index, 1);
      }
    }
    
    drawUnit(unit);
  });

  // Enemy units behavior
  enemyUnits.forEach((unit, index) => {
    if (unit.hp <= 0) {
      diamonds = Math.max(0, diamonds + unit.type.reward);
      localStorage.setItem('warriorDiamonds', diamonds);
      enemyUnits.splice(index, 1);
      return;
    }
    
    // Find closest player unit
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
      // Attack if in range
      if (closestDistance <= 30) {
        if (!unit.lastAttack || Date.now() - unit.lastAttack > 1000) {
          unit.lastAttack = Date.now();
          closestAlly.hp = Math.max(0, closestAlly.hp - unit.damage);
          showDamageNumber(closestAlly.x, closestAlly.y, unit.damage, true);
          
          // Ally counterattacks
          if (closestAlly.hp > 0) {
            unit.hp = Math.max(0, unit.hp - closestAlly.damage * 0.7);
            showDamageNumber(unit.x, unit.y, closestAlly.damage * 0.7, false);
          }
        }
      } else {
        // Move toward ally
        const dx = closestAlly.x - unit.x;
        const dy = closestAlly.y - unit.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        unit.x += (dx / distance) * unit.speed;
        unit.y += (dy / distance) * unit.speed;
      }
    } else {
      // Move toward player base
      if (unit.x > 50) {
        unit.x -= unit.speed;
      } else {
        baseHealth = Math.max(0, baseHealth - unit.damage);
        showDamageNumber(20, 150, unit.damage, true);
        enemyUnits.splice(index, 1);
      }
    }
    
    drawUnit(unit);
  });

  if (enemyUnits.length === 0 && waveStarted) {
    wave++;
    waveStarted = false;
    gold = Math.max(0, gold + 5 + Math.floor(wave * 0.5));
  }

  if (baseHealth <= 0) {
    console.log("Lose condition reached, soundEnabled:", soundEnabled);
    drawGameOver("DEFEAT!");
    gameOver = true;
    if (soundEnabled) loseSound.play().catch(e => console.error("Lose sound error:", e));
    restartButton.disabled = false;
    return;
  }

  if (wave > maxWaves) {
    console.log("Victory condition reached, soundEnabled:", soundEnabled);
    drawGameOver("VICTORY!");
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
    knightButton.textContent = "Knight (4)";
    knightButton.style.cssText = `
      padding: 10px 20px;
      margin: 5px;
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    `;
    knightButton.onmouseover = () => knightButton.style.background = "#c0392b";
    knightButton.onmouseout = () => knightButton.style.background = "#e74c3c";
    knightButton.onclick = () => {
      selectedUnitType = UNIT_TYPES.KNIGHT;
      updateUnitSelectionUI();
    };
    document.getElementById("unitControls").appendChild(knightButton);
  }
}

function updateUnitSelectionUI() {
  [barbarianButton, archerButton, horseButton].forEach(btn => {
    btn.style.background = "#3498db";
  });
  
  if (UNIT_TYPES.KNIGHT.unlocked) {
    const knightButton = document.getElementById("knightButton");
    if (knightButton) knightButton.style.background = "#e74c3c";
  }
  
  if (selectedUnitType === UNIT_TYPES.BARBARIAN) {
    barbarianButton.style.background = "#2980b9";
  } else if (selectedUnitType === UNIT_TYPES.ARCHER) {
    archerButton.style.background = "#2980b9";
  } else if (selectedUnitType === UNIT_TYPES.HORSE) {
    horseButton.style.background = "#2980b9";
  } else if (selectedUnitType === UNIT_TYPES.KNIGHT && document.getElementById("knightButton")) {
    document.getElementById("knightButton").style.background = "#c0392b";
  }
}

// Event Listeners
fightButton.addEventListener("click", () => {
  gameActive = true;
  fightButton.disabled = true;
  surrenderButton.disabled = false;
  restartButton.disabled = true;
  document.getElementById("shop").style.display = "none";
  initGame();
  update();
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
  update();
});

soundToggleButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundToggleButton.textContent = `Sound: ${soundEnabled ? "On" : "Off"}`;
});

barbarianButton.addEventListener("click", () => {
  selectedUnitType = UNIT_TYPES.BARBARIAN;
  updateUnitSelectionUI();
});

archerButton.addEventListener("click", () => {
  selectedUnitType = UNIT_TYPES.ARCHER;
  updateUnitSelectionUI();
});

horseButton.addEventListener("click", () => {
  selectedUnitType = UNIT_TYPES.HORSE;
  updateUnitSelectionUI();
});

spawnButton.addEventListener("click", spawnUnit);

document.addEventListener("keydown", (e) => {
  if (e.key === "1") {
    selectedUnitType = UNIT_TYPES.BARBARIAN;
    updateUnitSelectionUI();
  }
  if (e.key === "2") {
    selectedUnitType = UNIT_TYPES.ARCHER;
    updateUnitSelectionUI();
  }
  if (e.key === "3") {
    selectedUnitType = UNIT_TYPES.HORSE;
    updateUnitSelectionUI();
  }
  if (UNIT_TYPES.KNIGHT.unlocked && e.key === "4") {
    selectedUnitType = UNIT_TYPES.KNIGHT;
    updateUnitSelectionUI();
  }
  if (e.key === " ") spawnUnit();
});

// Initialize the game
if (UNIT_TYPES.KNIGHT.unlocked) {
  addKnightButton();
}
updateShopPrices();
updateUnitSelectionUI();

// Style buttons
[fightButton, surrenderButton, barbarianButton, archerButton, horseButton, spawnButton, restartButton, soundToggleButton].forEach(btn => {
  btn.style.cssText = `
    padding: 10px 20px;
    margin: 5px;
    background: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  `;
  btn.onmouseover = () => btn.style.background = "#2980b9";
  btn.onmouseout = () => btn.style.background = "#3498db";
});

// Check audio file loading
function checkAudioFiles() {
  [spawnSound, attackSound, winSound, loseSound].forEach(audio => {
    audio.addEventListener("error", () => {
      console.error(`Failed to load audio: ${audio.src}`);
      showFeedback(`Audio file missing: ${audio.id}`);
    });
    audio.load();
  });
}
checkAudioFiles();