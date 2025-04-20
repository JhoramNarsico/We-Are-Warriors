(function () {
  const Units = {};

  Units.BASE_ENEMY_STATS = {
    BARBARIAN: { health: 15, damage: 3, speed: 0.8, reward: 2 }, // Reduced speed from 1.1 to 0.8
    ARCHER: { health: 8, damage: 6, speed: 1.0, reward: 3 }, // Reduced speed from 1.3 to 1.0
    HORSE: { health: 25, damage: 12, speed: 1.6, reward: 4 }, // Reduced speed from 2.2 to 1.6
    KNIGHT: { health: 40, damage: 8, speed: 1.2, reward: 6 } // Reduced speed from 1.5 to 1.2
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
    const healthScale = Math.max(1.2, Math.pow(1.20, currentWave - 1));
    const damageScale = Math.max(1.1, Math.pow(1.15, currentWave - 1));
    return {
      health: Math.floor(this.BASE_ENEMY_STATS[type].health * healthScale),
      damage: Math.floor(this.BASE_ENEMY_STATS[type].damage * damageScale),
      speed: this.BASE_ENEMY_STATS[type].speed,
      reward: Math.floor(this.BASE_ENEMY_STATS[type].reward + currentWave * 0.75)
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

    this.enemyUnits = [];
    this.updateGrid();

    const barbarianCount = 3 + Math.floor(waveNum / 2);
    const archerCount = Math.floor(waveNum / 3);
    const horseCount = Math.floor(waveNum / 4);
    const knightCount = waveNum >= 10 ? Math.floor(waveNum / 10) : 0;

    const spawnX = window.Canvas.canvas.width * 0.9;
    const laneHeight = window.Canvas.canvas.height * 0.166;
    const startY = window.Canvas.canvas.height * 0.333;

    for (let i = 0; i < barbarianCount; i++) {
      const stats = this.getScaledEnemyStats("BARBARIAN", waveNum);
      const lane = i % 3;
      const unit = {
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
        spawnTime: Date.now(),
        velocityX: 0, // Added for smooth movement
        velocityY: 0 // Added for smooth movement
      };
      if (unit.x < 0 || unit.x > window.Canvas.canvas.width || unit.y < 0 || unit.y > window.Canvas.canvas.height) {
        console.error(`Barbarian spawn out of bounds: x=${unit.x}, y=${unit.y}`);
      }
      this.enemyUnits.push(unit);
    }
    for (let i = 0; i < archerCount; i++) {
      const stats = this.getScaledEnemyStats("ARCHER", waveNum);
      const lane = i % 3;
      const unit = {
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
        spawnTime: Date.now(),
        velocityX: 0,
        velocityY: 0
      };
      if (unit.x < 0 || unit.x > window.Canvas.canvas.width || unit.y < 0 || unit.y > window.Canvas.canvas.height) {
        console.error(`Archer spawn out of bounds: x=${unit.x}, y=${unit.y}`);
      }
      this.enemyUnits.push(unit);
    }
    for (let i = 0; i < horseCount; i++) {
      const stats = this.getScaledEnemyStats("HORSE", waveNum);
      const lane = i % 3;
      const unit = {
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
        spawnTime: Date.now(),
        velocityX: 0,
        velocityY: 0
      };
      if (unit.x < 0 || unit.x > window.Canvas.canvas.width || unit.y < 0 || unit.y > window.Canvas.canvas.height) {
        console.error(`Horse spawn out of bounds: x=${unit.x}, y=${unit.y}`);
      }
      this.enemyUnits.push(unit);
    }
    for (let i = 0; i < knightCount; i++) {
      const stats = this.getScaledEnemyStats("KNIGHT", waveNum);
      const lane = i % 3;
      const unit = {
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
        spawnTime: Date.now(),
        velocityX: 0,
        velocityY: 0
      };
      if (unit.x < 0 || unit.x > window.Canvas.canvas.width || unit.y < 0 || unit.y > window.Canvas.canvas.height) {
        console.error(`Knight spawn out of bounds: x=${unit.x}, y=${unit.y}`);
      }
      this.enemyUnits.push(unit);
    }

    window.GameState.waveStarted = true;
    console.log(`Spawned ${this.enemyUnits.length} enemy units for wave ${waveNum}: Barbarians=${barbarianCount}, Archers=${archerCount}, Horses=${horseCount}, Knights=${knightCount}`);
    window.UI.showFeedback(`Wave ${waveNum} started with ${this.enemyUnits.length} enemies!`);
  };

  Units.spawnUnit = function () {
    if (!window.Canvas || !window.Canvas.canvas) {
      console.error("Canvas not initialized!");
      window.UI.showFeedback("Error: Game canvas not available!");
      return;
    }
    console.log("Attempting to spawn unit", {
      gameActive: window.GameState.gameActive,
      gameOver: window.GameState.gameOver,
      gamePaused: window.GameState.gamePaused,
      gold: window.GameState.gold,
      unitType: this.selectedUnitType.name,
      cost: this.selectedUnitType.cost,
      canvasWidth: window.Canvas.canvas.width,
      canvasHeight: window.Canvas.canvas.height
    });

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
          spawnTime: Date.now(),
          velocityX: 0, // Added for smooth movement
          velocityY: 0 // Added for smooth movement
        };

        if (newUnit.x < 0 || newUnit.x > window.Canvas.canvas.width || newUnit.y < 0 || newUnit.y > window.Canvas.canvas.height) {
          console.warn(`Unit spawn potentially out of bounds: x=${newUnit.x}, y=${newUnit.y}`);
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
        console.log("Not enough gold to spawn unit");
        window.UI.showFeedback("Not enough gold!");
      }
    } else {
      console.log("Cannot spawn unit: invalid game state");
      window.UI.showFeedback("Cannot spawn: Game not active or paused!");
    }
  };

  Units.update = function () {
    try {
      if (!window.GameState.gameActive || window.GameState.gameOver || window.GameState.gamePaused) {
        requestAnimationFrame(this.update.bind(this));
        return;
      }
  
      let needsGridUpdate = false;
  
      // Check for grid updates
      this.units.forEach(unit => {
        const currentKey = this.getGridKey(unit.x, unit.y);
        if (unit.lastGridKey !== currentKey) needsGridUpdate = true;
      });
      this.enemyUnits.forEach(unit => {
        const currentKey = this.getGridKey(unit.x, unit.y);
        if (unit.lastGridKey !== currentKey) needsGridUpdate = true;
      });
  
      // Collect rewards and units to remove
      const rewards = { gold: 0, diamonds: 0 };
      const unitsToRemove = [];
      const enemyUnitsToRemove = [];
  
      // Remove dead ally units
      for (let i = this.units.length - 1; i >= 0; i--) {
        const unit = this.units[i];
        if (unit.hp <= 0) {
          unitsToRemove.push(i);
          window.Canvas.addDeathAnimation(unit); // Add death animation
          needsGridUpdate = true;
        }
      }
  
      // Remove dead enemy units and collect rewards
      for (let i = this.enemyUnits.length - 1; i >= 0; i--) {
        const unit = this.enemyUnits[i];
        if (unit.hp <= 0) {
          rewards.gold += unit.type.reward;
          rewards.diamonds += Math.floor(unit.type.reward / 2);
          enemyUnitsToRemove.push(i);
          window.Canvas.addDeathAnimation(unit); // Add death animation
          needsGridUpdate = true;
        }
      }
  
      // Apply rewards and remove units
      if (rewards.gold > 0 || rewards.diamonds > 0) {
        window.GameState.gold += rewards.gold;
        window.GameState.diamonds += rewards.diamonds;
        try {
          localStorage.setItem('warriorDiamonds', window.GameState.diamonds);
        } catch (e) {
          console.error("Failed to save diamonds:", e);
          window.UI.showFeedback("Warning: Unable to save progress.");
        }
        window.UI.updateFooter();
      }
  
      unitsToRemove.forEach(i => this.units.splice(i, 1));
      enemyUnitsToRemove.forEach(i => this.enemyUnits.splice(i, 1));
  
      if (needsGridUpdate) {
        try {
          this.updateGrid();
        } catch (e) {
          console.error("Grid update failed:", e);
          window.UI.showFeedback("Error updating unit positions!");
        }
      }
  
      window.Canvas.ctx.clearRect(0, 0, window.Canvas.canvas.width, window.Canvas.canvas.height);
  
      const playerMaxHealth = 150 + (window.GameState.baseHealthUpgrades * 25);
      window.Canvas.drawBase(60, "#3b5998", window.GameState.baseHealth, playerMaxHealth, window.GameState.baseDefenseUpgrades);
      window.Canvas.drawBase(750, "#dc3545", window.GameState.enemyBaseHealth, 150, 0);
  
      // Update ally units
      for (let i = this.units.length - 1; i >= 0; i--) {
        const unit = this.units[i];
        let closestEnemy = null;
        let closestDistanceSq = Infinity;
        let closestTarget = null;
        let closestTargetDistanceSq = Infinity;
        let targetX, targetY;
  
        // Find nearest enemy unit
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
  
        // Check distance to enemy base
        const enemyBaseX = window.Canvas.canvas.width * 0.9375;
        const enemyBaseY = window.Canvas.canvas.height * 0.5;
        const dxToBase = enemyBaseX - unit.x;
        const dyToBase = enemyBaseY - unit.y;
        const distanceToBaseSq = dxToBase * dxToBase + dyToBase * dyToBase;
  
        // Determine closest target (enemy unit or base)
        if (closestEnemy && closestDistanceSq < distanceToBaseSq) {
          closestTarget = closestEnemy;
          closestTargetDistanceSq = closestDistanceSq;
          targetX = closestEnemy.x;
          targetY = closestEnemy.y;
        } else {
          closestTarget = { x: enemyBaseX, y: enemyBaseY, type: { name: "EnemyBase" } };
          closestTargetDistanceSq = distanceToBaseSq;
          targetX = enemyBaseX;
          targetY = enemyBaseY;
        }
  
        const attackRangeSq = Math.pow(30 * (window.Canvas.canvas.width / 800), 2);
        const baseAttackRangeSq = Math.pow(50 * (window.Canvas.canvas.width / 800), 2);
  
        // Attack logic
        if (closestTargetDistanceSq <= (closestTarget.type.name === "EnemyBase" ? baseAttackRangeSq : attackRangeSq)) {
          if (!unit.lastAttack || Date.now() - unit.lastAttack > 1000) {
            unit.lastAttack = Date.now();
            window.Canvas.addAttackAnimation(unit, targetX, targetY); // Add attack animation
            if (closestTarget.type.name === "EnemyBase") {
              window.GameState.enemyBaseHealth = Math.max(0, window.GameState.enemyBaseHealth - Math.floor(unit.damage));
              window.UI.showDamageNumber(enemyBaseX, enemyBaseY, Math.floor(unit.damage), false);
            } else {
              closestTarget.hp = Math.max(0, Math.floor(closestTarget.hp - Math.floor(unit.damage)));
              window.UI.showDamageNumber(closestTarget.x, closestTarget.y, Math.floor(unit.damage), false);
            }
          }
        } else {
          // Move toward the closest target
          const dx = targetX - unit.x;
          const dy = targetY - unit.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const moveSpeed = unit.speed * (window.Canvas.canvas.width / 800) * 0.7;
  
          // Smooth movement with velocity
          const targetVelocityX = distance > moveSpeed ? (dx / distance) * moveSpeed : dx;
          const targetVelocityY = distance > moveSpeed ? (dy / distance) * moveSpeed * 0.3 : dy * 0.3;
          unit.velocityX += (targetVelocityX - unit.velocityX) * 0.1;
          unit.velocityY += (targetVelocityY - unit.velocityY) * 0.1;
  
          // Stronger lane adherence
          const laneCenterY = window.Canvas.canvas.height * 0.333 + unit.lane * (window.Canvas.canvas.height * 0.166);
          const yDiff = laneCenterY - unit.y;
          unit.velocityY += yDiff * 0.1;
  
          // Update position
          unit.x += unit.velocityX;
          unit.y += unit.velocityY;
  
          // Clamp position to canvas bounds
          unit.y = Math.max(0, Math.min(window.Canvas.canvas.height - 30, unit.y));
          unit.x = Math.max(0, Math.min(window.Canvas.canvas.width - 30, unit.x));
        }
  
        window.Canvas.drawUnit(unit);
      }
  
      // Update enemy units
      for (let i = this.enemyUnits.length - 1; i >= 0; i--) {
        const unit = this.enemyUnits[i];
        let closestAlly = null;
        let closestDistanceSq = Infinity;
        let closestTarget = null;
        let closestTargetDistanceSq = Infinity;
        let targetX, targetY;
  
        // Find nearest ally unit
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
  
        // Check distance to player base
        const playerBaseX = window.Canvas.canvas.width * 0.075;
        const playerBaseY = window.Canvas.canvas.height * 0.5;
        const dxToBase = playerBaseX - unit.x;
        const dyToBase = playerBaseY - unit.y;
        const distanceToBaseSq = dxToBase * dxToBase + dyToBase * dyToBase;
  
        // Determine closest target (ally unit or player base)
        if (closestAlly && closestDistanceSq < distanceToBaseSq) {
          closestTarget = closestAlly;
          closestTargetDistanceSq = closestDistanceSq;
          targetX = closestAlly.x;
          targetY = closestAlly.y;
        } else {
          closestTarget = { x: playerBaseX, y: playerBaseY, type: { name: "PlayerBase" } };
          closestTargetDistanceSq = distanceToBaseSq;
          targetX = playerBaseX;
          targetY = playerBaseY;
        }
  
        const attackRangeSq = Math.pow(30 * (window.Canvas.canvas.width / 800), 2);
        const baseAttackRangeSq = Math.pow(50 * (window.Canvas.canvas.width / 800), 2);
  
        // Attack logic
        if (closestTargetDistanceSq <= (closestTarget.type.name === "PlayerBase" ? baseAttackRangeSq : attackRangeSq)) {
          if (!unit.lastAttack || Date.now() - unit.lastAttack > 1000) {
            unit.lastAttack = Date.now();
            window.Canvas.addAttackAnimation(unit, targetX, targetY); // Add attack animation
            if (closestTarget.type.name === "PlayerBase") {
              const damageReduction = 1 - (window.GameState.baseDefenseUpgrades * 0.1);
              const damageDealt = Math.max(1, Math.floor(Math.floor(unit.damage) * damageReduction));
              window.GameState.baseHealth = Math.max(0, window.GameState.baseHealth - damageDealt);
              window.UI.showDamageNumber(playerBaseX, playerBaseY, damageDealt, true);
              console.log(`Enemy ${unit.type.name} attacked base: damage=${damageDealt}, baseHealth=${window.GameState.baseHealth}`);
              if (window.GameState.baseHealth <= 0 && !window.GameState.gameOver) {
                window.UI.showGameOverModal("Defeat!");
                return;
              }
            } else {
              closestTarget.hp = Math.max(0, Math.floor(closestTarget.hp - Math.floor(unit.damage)));
              window.UI.showDamageNumber(closestTarget.x, closestTarget.y, Math.floor(unit.damage), true);
            }
          }
        } else {
          // Move toward the closest target
          const dx = targetX - unit.x;
          const dy = targetY - unit.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const moveSpeed = unit.speed * (window.Canvas.canvas.width / 800) * 0.7;
  
          // Smooth movement with velocity
          const targetVelocityX = distance > moveSpeed ? (dx / distance) * moveSpeed : dx;
          const targetVelocityY = distance > moveSpeed ? (dy / distance) * moveSpeed * 0.3 : dy * 0.3;
          unit.velocityX += (targetVelocityX - unit.velocityX) * 0.1;
          unit.velocityY += (targetVelocityY - unit.velocityY) * 0.1;
  
          // Stronger lane adherence
          const laneCenterY = window.Canvas.canvas.height * 0.333 + unit.lane * (window.Canvas.canvas.height * 0.166);
          const yDiff = laneCenterY - unit.y;
          unit.velocityY += yDiff * 0.1;
  
          // Update position
          unit.x += unit.velocityX;
          unit.y += unit.velocityY;
  
          // Clamp position to canvas bounds
          unit.y = Math.max(0, Math.min(window.Canvas.canvas.height - 30, unit.y));
          unit.x = Math.max(0, Math.min(window.Canvas.canvas.width - 30, unit.x));
        }
        window.Canvas.drawUnit(unit);
      }
  
      window.Canvas.renderAnimations(); // Render attack and death animations
  
      // Handle enemy base destruction
      if (window.GameState.enemyBaseHealth <= 0 && !window.GameState.gameOver) {
        console.log(`Enemy base destroyed! Advancing to wave ${window.GameState.wave + 1}`);
        window.GameState.wave++;
        window.GameState.waveStarted = false;
        window.GameState.gold += 20 + Math.floor(window.GameState.wave * 2);
        window.GameState.diamonds += 5;
        window.GameState.enemyBaseHealth = 150;
        this.units = [];
        this.enemyUnits = [];
        try {
          localStorage.setItem('warriorDiamonds', window.GameState.diamonds);
        } catch (e) {
          console.error("Failed to save diamonds:", e);
          window.UI.showFeedback("Warning: Unable to save progress.");
        }
        window.UI.updateFooter();
        window.UI.drawWaveProgress();
        if (window.GameState.gameActive) {
          this.spawnWave(window.GameState.wave);
          window.UI.showFeedback(`Enemy base destroyed! Wave ${window.GameState.wave} started!`);
        }
      }
  
      // Handle player base destruction
      if (window.GameState.baseHealth <= 0 && !window.GameState.gameOver) {
        window.UI.showGameOverModal("Defeat!");
        return;
      }
  
      // Always schedule the next frame unless game is over
      if (!window.GameState.gameOver) {
        requestAnimationFrame(this.update.bind(this));
      }
    } catch (e) {
      console.error("Error in Units.update:", e);
      window.UI.showFeedback("Game error occurred. Please restart.");
      if (!window.GameState.gameOver) {
        requestAnimationFrame(this.update.bind(this));
      }
    }
  };

  window.Units = Units;
})();