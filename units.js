(function () {
  const Units = {};

  Units.BASE_ENEMY_STATS = {
    BARBARIAN: { health: 15, damage: 3, speed: 1.1, reward: 2 },
    ARCHER: { health: 8, damage: 6, speed: 1.3, reward: 3 },
    HORSE: { health: 25, damage: 12, speed: 2.2, reward: 4 },
    KNIGHT: { health: 40, damage: 8, speed: 1.5, reward: 6 }
  };

  Units.UNIT_TYPES = {
    BARBARIAN: { 
      ...Units.BASE_ENEMY_STATS.BARBARIAN, 
      name: "Barbarian", 
      color: "#3b5998", 
      cost: 5,
      lore: "Fierce highland warriors with unbreakable spirit.",
      strengths: "Balanced fighter with solid health and damage."
    },
    ARCHER: { 
      ...Units.BASE_ENEMY_STATS.ARCHER, 
      name: "Archer", 
      color: "#28a745", 
      cost: 8,
      lore: "Forest sharpshooters with deadly precision.",
      strengths: "High ranged damage."
    },
    HORSE: { 
      ...Units.BASE_ENEMY_STATS.HORSE, 
      name: "Horse", 
      color: "#dc3545", 
      cost: 12,
      lore: "Swift warhorses bred for rapid strikes.",
      strengths: "Fast movement and strong attacks."
    },
    KNIGHT: { 
      ...Units.BASE_ENEMY_STATS.KNIGHT, 
      name: "Knight", 
      color: "#ffd700", 
      cost: 15,
      lore: "Honored protectors in sacred armor.",
      strengths: "High health and damage for late waves."
    }
  };

  Units.units = [];
  Units.enemyUnits = [];
  Units.selectedUnitType = Units.UNIT_TYPES.BARBARIAN;

  const GRID_CELL_SIZE = 50;
  const grid = new Map();

  Units.getGridKey = function (x, y) {
    const gridX = Math.floor(x / GRID_CELL_SIZE);
    const gridY = Math.floor(y / GRID_CELL_SIZE);
    return `${gridX},${gridY}`;
  };

  Units.updateGrid = function () {
    grid.clear();
    this.units.forEach((unit, index) => {
      const key = this.getGridKey(unit.x, unit.y);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push({ unit, index, isAlly: true });
      unit.lastGridKey = key;
    });
    this.enemyUnits.forEach((unit, index) => {
      const key = this.getGridKey(unit.x, unit.y);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push({ unit, index, isAlly: false });
      unit.lastGridKey = key;
    });
  };

  Units.getNearbyUnits = function (x, y, isAlly) {
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
  };

  try {
    const savedDamage = localStorage.getItem('warriorUnitDamage');
    if (savedDamage) {
      const damage = JSON.parse(savedDamage);
      Units.UNIT_TYPES.BARBARIAN.damage = damage.barb || Units.BASE_ENEMY_STATS.BARBARIAN.damage;
      Units.UNIT_TYPES.ARCHER.damage = damage.arch || Units.BASE_ENEMY_STATS.ARCHER.damage;
      Units.UNIT_TYPES.HORSE.damage = damage.horse || Units.BASE_ENEMY_STATS.HORSE.damage;
      Units.UNIT_TYPES.KNIGHT.damage = damage.knight || Units.BASE_ENEMY_STATS.KNIGHT.damage;
    }
  } catch (e) {
    console.error("Failed to load unit damage upgrades:", e);
  }

  Units.getScaledEnemyStats = function (type, currentWave) {
    const healthScale = Math.min(10, Math.pow(1.15, currentWave - 1));
    const damageScale = Math.min(10, Math.pow(1.12, currentWave - 1));
    return {
      health: Math.floor(this.BASE_ENEMY_STATS[type].health * healthScale),
      damage: Math.floor(this.BASE_ENEMY_STATS[type].damage * damageScale),
      speed: this.BASE_ENEMY_STATS[type].speed,
      reward: this.BASE_ENEMY_STATS[type].reward + Math.floor(currentWave * 0.5)
    };
  };

  Units.spawnWave = function (waveNum) {
    if (!window.Canvas || !window.Canvas.canvas) {
      console.error("Canvas not initialized!");
      window.UI.showFeedback("Error: Game canvas not available!");
      return;
    }
    console.log(`Spawning wave ${waveNum}`);
    if (waveNum > window.GameState.maxWaves) {
      window.UI.showGameOverModal("Victory!");
      return;
    }

    const barbarianCount = Math.min(10, 2 + Math.floor(waveNum / 3));
    const archerCount = Math.min(5, Math.floor((waveNum - 2) / 4));
    const horseCount = Math.min(3, Math.floor((waveNum - 4) / 6));
    const knightCount = waveNum >= 10 ? Math.min(2, Math.floor(waveNum / 12)) : 0;

    const spawnX = window.Canvas.canvas.width * 0.9375;
    const laneHeight = window.Canvas.canvas.height * 0.166;
    const startY = window.Canvas.canvas.height * 0.333;

    for (let i = 0; i < barbarianCount; i++) {
      const stats = this.getScaledEnemyStats("BARBARIAN", waveNum);
      const lane = i % 3;
      this.enemyUnits.push({
        x: spawnX,
        y: startY + lane * laneHeight + (Math.random() - 0.5) * laneHeight * 0.5,
        type: { ...this.UNIT_TYPES.BARBARIAN, ...stats },
        hp: Math.floor(stats.health),
        speed: stats.speed,
        damage: Math.floor(stats.damage),
        maxHp: Math.floor(stats.health),
        opacity: 1,
        lane: lane,
        lastAttack: null,
        lastGridKey: null,
        spawnTime: Date.now()
      });
    }
    for (let i = 0; i < archerCount; i++) {
      const stats = this.getScaledEnemyStats("ARCHER", waveNum);
      const lane = i % 3;
      this.enemyUnits.push({
        x: spawnX,
        y: startY + lane * laneHeight + (Math.random() - 0.5) * laneHeight * 0.5,
        type: { ...this.UNIT_TYPES.ARCHER, ...stats },
        hp: Math.floor(stats.health),
        speed: stats.speed,
        damage: Math.floor(stats.damage),
        maxHp: Math.floor(stats.health),
        opacity: 1,
        lane: lane,
        lastAttack: null,
        lastGridKey: null,
        spawnTime: Date.now()
      });
    }
    for (let i = 0; i < horseCount; i++) {
      const stats = this.getScaledEnemyStats("HORSE", waveNum);
      const lane = i % 3;
      this.enemyUnits.push({
        x: spawnX,
        y: startY + lane * laneHeight + (Math.random() - 0.5) * laneHeight * 0.5,
        type: { ...this.UNIT_TYPES.HORSE, ...stats },
        hp: Math.floor(stats.health),
        speed: stats.speed,
        damage: Math.floor(stats.damage),
        maxHp: Math.floor(stats.health),
        opacity: 1,
        lane: lane,
        lastAttack: null,
        lastGridKey: null,
        spawnTime: Date.now()
      });
    }
    for (let i = 0; i < knightCount; i++) {
      const stats = this.getScaledEnemyStats("KNIGHT", waveNum);
      const lane = i % 3;
      this.enemyUnits.push({
        x: spawnX,
        y: startY + lane * laneHeight + (Math.random() - 0.5) * laneHeight * 0.5,
        type: { ...this.UNIT_TYPES.KNIGHT, ...stats },
        hp: Math.floor(stats.health),
        speed: stats.speed,
        damage: Math.floor(stats.damage),
        maxHp: Math.floor(stats.health),
        opacity: 1,
        lane: lane,
        lastAttack: null,
        lastGridKey: null,
        spawnTime: Date.now()
      });
    }

    window.GameState.waveStarted = true;
    console.log(`Spawned ${this.enemyUnits.length} enemy units for wave ${waveNum}`);
  };

  Units.spawnUnit = function () {
    if (!window.Canvas || !window.Canvas.canvas) {
      console.error("Canvas not initialized!");
      window.UI.showFeedback("Error: Game canvas not available!");
      return;
    }
    if (window.GameState.gameActive && !window.GameState.gameOver && !window.GameState.gamePaused) {
      if (this.selectedUnitType.name === "Knight" && !window.GameState.isKnightUnlocked) {
        window.UI.showFeedback("Knight is locked!");
        return;
      }

      if (window.GameState.gold >= this.selectedUnitType.cost) {
        window.GameState.gold -= this.selectedUnitType.cost;
        const lane = this.units.length % 3;
        const spawnX = window.Canvas.canvas.width * 0.1;
        const laneHeight = window.Canvas.canvas.height * 0.166;
        const startY = window.Canvas.canvas.height * 0.333;

        const newUnit = {
          x: spawnX,
          y: startY + lane * laneHeight + (Math.random() - 0.5) * laneHeight * 0.5,
          type: this.selectedUnitType,
          hp: Math.floor(Number(this.selectedUnitType.health) + (window.GameState.unitHealthUpgrades * 3)),
          speed: Number(this.selectedUnitType.speed),
          damage: Math.floor(Number(this.selectedUnitType.damage)),
          maxHp: Math.floor(Number(this.selectedUnitType.health) + (window.GameState.unitHealthUpgrades * 3)),
          opacity: 1,
          lane: lane,
          lastAttack: null,
          lastGridKey: null,
          spawnTime: Date.now()
        };
        if (newUnit.x < 0 || newUnit.x > window.Canvas.canvas.width || newUnit.y < 0 || newUnit.y > window.Canvas.canvas.height) {
          console.error("Unit spawned outside canvas:", newUnit.x, newUnit.y);
          window.UI.showFeedback("Unit spawned off-screen!");
        }
        this.units.push(newUnit);
        console.log(`Spawned unit: ${newUnit.type.name} at x:${newUnit.x}, y:${newUnit.y}`);
        if (window.GameState.soundEnabled) {
          document.getElementById("spawnSound").play().catch(e => {
            console.error("Spawn sound error:", e);
          });
        }
        window.UI.updateFooter();
      } else {
        window.UI.showFeedback("Not enough gold!");
      }
    }
  };

  Units.update = function () {
    if (!window.GameState.gameActive || window.GameState.gameOver || window.GameState.gamePaused) {
      requestAnimationFrame(this.update.bind(this));
      return;
    }

    let needsGridUpdate = false;

    this.units.forEach(unit => {
      const currentKey = this.getGridKey(unit.x, unit.y);
      if (unit.lastGridKey !== currentKey) needsGridUpdate = true;
    });
    this.enemyUnits.forEach(unit => {
      const currentKey = this.getGridKey(unit.x, unit.y);
      if (unit.lastGridKey !== currentKey) needsGridUpdate = true;
    });

    for (let i = this.units.length - 1; i >= 0; i--) {
      const unit = this.units[i];
      if (unit.hp <= 0) {
        this.units.splice(i, 1);
        needsGridUpdate = true;
      }
    }
    for (let i = this.enemyUnits.length - 1; i >= 0; i--) {
      const unit = this.enemyUnits[i];
      if (unit.hp <= 0) {
        window.GameState.gold += unit.type.reward;
        window.GameState.diamonds += Math.floor(unit.type.reward / 2);
        try {
          localStorage.setItem('warriorDiamonds', window.GameState.diamonds);
        } catch (e) {
          console.error("Failed to save diamonds:", e);
          window.UI.showFeedback("Warning: Unable to save progress.");
        }
        window.UI.updateFooter();
        this.enemyUnits.splice(i, 1);
        needsGridUpdate = true;
      }
    }

    if (needsGridUpdate) this.updateGrid();

    window.Canvas.ctx.clearRect(0, 0, window.Canvas.canvas.width, window.Canvas.canvas.height);

    const playerMaxHealth = 150 + (window.GameState.baseHealthUpgrades * 25);
    window.Canvas.drawBase(60, "#3b5998", window.GameState.baseHealth, playerMaxHealth, window.GameState.baseDefenseUpgrades);
    window.Canvas.drawBase(750, "#dc3545", window.GameState.enemyBaseHealth, 150, 0);

    for (let i = this.units.length - 1; i >= 0; i--) {
      const unit = this.units[i];
      let closestEnemy = null;
      let closestDistanceSq = Infinity;

      const nearbyEnemies = this.getNearbyUnits(unit.x, unit.y, true);
      nearbyEnemies.forEach(({ unit: enemy }) => {
        const dx = enemy.x - unit.x;
        const dy = enemy.y - unit.y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < closestDistanceSq) {
          closestDistanceSq = distanceSq;
          closestEnemy = enemy;
        }
      });

      const attackRangeSq = Math.pow(30 * (window.Canvas.canvas.width / 800), 2);
      const baseAttackRangeSq = Math.pow(50 * (window.Canvas.canvas.width / 800), 2);
      const enemyBaseX = window.Canvas.canvas.width * 0.9375;
      const enemyBaseY = window.Canvas.canvas.height * 0.5;

      if (closestEnemy && closestDistanceSq <= attackRangeSq) {
        if (!unit.lastAttack || Date.now() - unit.lastAttack > 1000) {
          unit.lastAttack = Date.now();
          closestEnemy.hp = Math.max(0, Math.floor(closestEnemy.hp - Math.floor(unit.damage)));
          window.UI.showDamageNumber(closestEnemy.x, closestEnemy.y, Math.floor(unit.damage), false);
        }
      } else {
        const dxToBase = enemyBaseX - unit.x;
        const dyToBase = enemyBaseY - unit.y;
        const distanceToBaseSq = dxToBase * dxToBase + dyToBase * dyToBase;

        if (distanceToBaseSq <= baseAttackRangeSq) {
          if (!unit.lastAttack || Date.now() - unit.lastAttack > 1000) {
            unit.lastAttack = Date.now();
            window.GameState.enemyBaseHealth = Math.max(0, window.GameState.enemyBaseHealth - Math.floor(unit.damage));
            window.UI.showDamageNumber(enemyBaseX, enemyBaseY, Math.floor(unit.damage), false);
          }
        } else {
          let targetX, targetY;
          if (closestEnemy) {
            targetX = closestEnemy.x;
            targetY = closestEnemy.y;
          } else {
            targetX = enemyBaseX;
            targetY = window.Canvas.canvas.height * 0.333 + unit.lane * (window.Canvas.canvas.height * 0.166);
          }

          const dx = targetX - unit.x;
          const dy = targetY - unit.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const moveSpeed = unit.speed * (window.Canvas.canvas.width / 800);

          if (distance > moveSpeed) {
            unit.x += (dx / distance) * moveSpeed;
            const laneCenterY = window.Canvas.canvas.height * 0.333 + unit.lane * (window.Canvas.canvas.height * 0.166);
            const yDiff = laneCenterY - unit.y;
            unit.y += (dy / distance) * moveSpeed * 0.3;
            unit.y += yDiff * 0.05;
            unit.y = Math.max(0, Math.min(window.Canvas.canvas.height - 30, unit.y));
          }
        }
      }
      window.Canvas.drawUnit(unit);
    }

    for (let i = this.enemyUnits.length - 1; i >= 0; i--) {
      const unit = this.enemyUnits[i];
      let closestAlly = null;
      let closestDistanceSq = Infinity;

      const nearbyAllies = this.getNearbyUnits(unit.x, unit.y, false);
      nearbyAllies.forEach(({ unit: ally }) => {
        const dx = ally.x - unit.x;
        const dy = ally.y - unit.y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < closestDistanceSq) {
          closestDistanceSq = distanceSq;
          closestAlly = ally;
        }
      });

      const attackRangeSq = Math.pow(30 * (window.Canvas.canvas.width / 800), 2);

      if (closestAlly && closestDistanceSq <= attackRangeSq) {
        if (!unit.lastAttack || Date.now() - unit.lastAttack > 1000) {
          unit.lastAttack = Date.now();
          closestAlly.hp = Math.max(0, Math.floor(closestAlly.hp - Math.floor(unit.damage)));
          window.UI.showDamageNumber(closestAlly.x, closestAlly.y, Math.floor(unit.damage), true);
        }
      } else {
        let targetX, targetY;
        if (closestAlly) {
          targetX = closestAlly.x;
          targetY = closestAlly.y;
        } else {
          targetX = window.Canvas.canvas.width * 0.12;
          targetY = window.Canvas.canvas.height * 0.333 + unit.lane * (window.Canvas.canvas.height * 0.166);
        }

        const dx = targetX - unit.x;
        const dy = targetY - unit.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const moveSpeed = unit.speed * (window.Canvas.canvas.width / 800);

        if (distance > moveSpeed) {
          unit.x += (dx / distance) * moveSpeed;
          const laneCenterY = window.Canvas.canvas.height * 0.333 + unit.lane * (window.Canvas.canvas.height * 0.166);
          const yDiff = laneCenterY - unit.y;
          unit.y += (dy / distance) * moveSpeed * 0.3;
          unit.y += yDiff * 0.05;
          unit.y = Math.max(0, Math.min(window.Canvas.canvas.height - 30, unit.y));
        } else if (!closestAlly && unit.x <= targetX) {
          if (!unit.lastAttack || Date.now() - unit.lastAttack > 1000) {
            unit.lastAttack = Date.now();
            const damageReduction = 1 - (window.GameState.baseDefenseUpgrades * 0.1);
            const damageDealt = Math.max(1, Math.floor(Math.floor(unit.damage) * damageReduction));
            window.GameState.baseHealth = Math.max(0, window.GameState.baseHealth - damageDealt);
            window.UI.showDamageNumber(window.Canvas.canvas.width * 0.08, window.Canvas.canvas.height * 0.5, damageDealt, true);
            if (window.GameState.baseHealth <= 0 && !window.GameState.gameOver) {
              window.UI.showGameOverModal("Defeat!");
            }
          }
        }
      }
      window.Canvas.drawUnit(unit);
    }

    if (this.enemyUnits.length === 0 && window.GameState.waveStarted && !window.GameState.gameOver) {
      console.log(`Wave ${window.GameState.wave} cleared!`);
      window.GameState.wave++;
      window.GameState.waveStarted = false;
      window.GameState.gold += 10 + Math.floor(window.GameState.wave * 1.5);
      window.UI.updateFooter();
      window.UI.drawWaveProgress();

      window.GameState.waveCooldown = true;
      window.GameState.waveCooldownTimer = 5;
      window.UI.drawWaveCooldown(window.GameState.waveCooldownTimer);
      if (window.GameState.waveCooldownInterval) clearInterval(window.GameState.waveCooldownInterval);
      window.GameState.waveCooldownInterval = setInterval(() => {
        if (window.GameState.gamePaused || window.GameState.gameOver) return;

        window.GameState.waveCooldownTimer--;
        window.UI.drawWaveCooldown(window.GameState.waveCooldownTimer);
        if (window.GameState.waveCooldownTimer <= 0) {
          clearInterval(window.GameState.waveCooldownInterval);
          window.GameState.waveCooldownInterval = null;
          window.UI.hideWaveCooldown();
          window.GameState.waveCooldown = false;
          window.UI.updateButtonStates();
          window.UI.showFeedback(`Wave ${window.GameState.wave} incoming! Press Fight!`);
        }
      }, 1000);
    }

    if (window.GameState.enemyBaseHealth <= 0 && !window.GameState.gameOver) {
      console.log(`Enemy base destroyed! Advancing to wave ${window.GameState.wave + 1}`);
      window.GameState.wave++;
      window.GameState.waveStarted = false;
      window.GameState.gold += 20 + Math.floor(window.GameState.wave * 2);
      window.GameState.diamonds += 5;
      window.GameState.enemyBaseHealth = 150; // Reset enemy base health
      this.units = []; // Clear allied units
      this.enemyUnits = []; // Clear enemy units
      try {
        localStorage.setItem('warriorDiamonds', window.GameState.diamonds);
      } catch (e) {
        console.error("Failed to save diamonds:", e);
        window.UI.showFeedback("Warning: Unable to save progress.");
      }
      window.UI.updateFooter();
      window.UI.drawWaveProgress();

      window.GameState.waveCooldown = true;
      window.GameState.waveCooldownTimer = 5;
      window.UI.drawWaveCooldown(window.GameState.waveCooldownTimer);
      if (window.GameState.waveCooldownInterval) clearInterval(window.GameState.waveCooldownInterval);
      window.GameState.waveCooldownInterval = setInterval(() => {
        if (window.GameState.gamePaused || window.GameState.gameOver) return;

        window.GameState.waveCooldownTimer--;
        window.UI.drawWaveCooldown(window.GameState.waveCooldownTimer);
        if (window.GameState.waveCooldownTimer <= 0) {
          clearInterval(window.GameState.waveCooldownInterval);
          window.GameState.waveCooldownInterval = null;
          window.UI.hideWaveCooldown();
          window.GameState.waveCooldown = false;
          window.UI.updateButtonStates();
          window.UI.showFeedback(`Wave ${window.GameState.wave} incoming! Press Fight!`);
        }
      }, 1000);
    }

    if (window.GameState.baseHealth <= 0 && !window.GameState.gameOver) {
      window.UI.showGameOverModal("Defeat!");
      return;
    }

    if (!window.GameState.gameOver) {
      requestAnimationFrame(this.update.bind(this));
    }
  };

  window.Units = Units;
})();