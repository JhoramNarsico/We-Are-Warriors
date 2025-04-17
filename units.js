(function () {
  const Units = {};

  // Unit Definitions
  Units.BASE_ENEMY_STATS = {
    BARBARIAN: { health: 15, damage: 3, speed: 1.1, reward: 2 },
    ARCHER: { health: 8, damage: 6, speed: 1.3, reward: 3 },
    HORSE: { health: 25, damage: 12, speed: 2.2, reward: 4 },
    KNIGHT: { health: 40, damage: 8, speed: 1.5, reward: 6 } // Base stats for Knight
  };

  Units.UNIT_TYPES = {
    BARBARIAN: { ...Units.BASE_ENEMY_STATS.BARBARIAN, name: "Barbarian", color: "#3b5998", cost: 5 },
    ARCHER: { ...Units.BASE_ENEMY_STATS.ARCHER, name: "Archer", color: "#28a745", cost: 8 },
    HORSE: { ...Units.BASE_ENEMY_STATS.HORSE, name: "Horse", color: "#dc3545", cost: 12 },
    // --- Removed 'unlocked' property - state is now in GameState ---
    KNIGHT: { ...Units.BASE_ENEMY_STATS.KNIGHT, name: "Knight", color: "#ffd700", cost: 15 }
  };

  // Game Entities
  Units.units = [];
  Units.enemyUnits = [];
  Units.selectedUnitType = Units.UNIT_TYPES.BARBARIAN; // Default selection

  // Spatial Partitioning Grid (Keep existing logic)
  const GRID_CELL_SIZE = 50;
  const grid = new Map();
  let unitsToUpdate = new Set();

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
    });
    this.enemyUnits.forEach((unit, index) => {
      const key = this.getGridKey(unit.x, unit.y);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push({ unit, index, isAlly: false });
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

  // Load saved unit damage upgrades (Keep existing logic, but ensure Knight damage is handled)
  try {
    const savedDamage = localStorage.getItem('warriorUnitDamage');
    if (savedDamage) {
      const damage = JSON.parse(savedDamage);
      Units.UNIT_TYPES.BARBARIAN.damage = damage.barb || Units.BASE_ENEMY_STATS.BARBARIAN.damage;
      Units.UNIT_TYPES.ARCHER.damage = damage.arch || Units.BASE_ENEMY_STATS.ARCHER.damage;
      Units.UNIT_TYPES.HORSE.damage = damage.horse || Units.BASE_ENEMY_STATS.HORSE.damage;
      // Ensure Knight damage is loaded if present, otherwise use base
      Units.UNIT_TYPES.KNIGHT.damage = damage.knight || Units.BASE_ENEMY_STATS.KNIGHT.damage;
    }
  } catch (e) {
    console.error("Failed to load unit damage upgrades:", e);
  }

  // --- Removed loading knight unlock status from here - handled by GameState ---

  Units.getScaledEnemyStats = function (type, currentWave) {
    // (Keep existing logic)
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
    // (Keep existing logic)
    console.log(`Spawning wave ${waveNum}`);
    if (waveNum > window.GameState.maxWaves) {
      window.UI.showGameOverModal("Victory!");
      return;
    }

    const barbarianCount = Math.min(10, 2 + Math.floor(waveNum / 3));
    const archerCount = Math.min(5, Math.floor((waveNum - 2) / 4));
    const horseCount = Math.min(3, Math.floor((waveNum - 4) / 6));
    const knightCount = waveNum >= 10 ? Math.min(2, Math.floor(waveNum / 12)) : 0;

    for (let i = 0; i < barbarianCount; i++) {
      const stats = this.getScaledEnemyStats("BARBARIAN", waveNum);
      this.enemyUnits.push({
        x: window.Canvas.canvas.width * 0.9375,
        y: window.Canvas.canvas.height * 0.333 + (i % 3) * (window.Canvas.canvas.height * 0.166),
        type: { ...this.UNIT_TYPES.BARBARIAN, ...stats }, // Combine base type with scaled stats
        hp: stats.health,
        speed: stats.speed,
        damage: stats.damage,
        maxHp: stats.health,
        opacity: 1,
        lane: i % 3,
        lastAttack: null,
        lastGridKey: null
      });
    }
     for (let i = 0; i < archerCount; i++) {
      const stats = this.getScaledEnemyStats("ARCHER", waveNum);
      this.enemyUnits.push({
        x: window.Canvas.canvas.width * 0.9375,
        y: window.Canvas.canvas.height * 0.333 + (i % 3) * (window.Canvas.canvas.height * 0.166),
        type: { ...this.UNIT_TYPES.ARCHER, ...stats },
        hp: stats.health,
        speed: stats.speed,
        damage: stats.damage,
        maxHp: stats.health,
        opacity: 1,
        lane: i % 3,
        lastAttack: null,
        lastGridKey: null
      });
    }
     for (let i = 0; i < horseCount; i++) {
      const stats = this.getScaledEnemyStats("HORSE", waveNum);
      this.enemyUnits.push({
        x: window.Canvas.canvas.width * 0.9375,
        y: window.Canvas.canvas.height * 0.333 + (i % 3) * (window.Canvas.canvas.height * 0.166),
        type: { ...this.UNIT_TYPES.HORSE, ...stats },
        hp: stats.health,
        speed: stats.speed,
        damage: stats.damage,
        maxHp: stats.health,
        opacity: 1,
        lane: i % 3,
        lastAttack: null,
        lastGridKey: null
      });
    }
     for (let i = 0; i < knightCount; i++) {
      const stats = this.getScaledEnemyStats("KNIGHT", waveNum);
      this.enemyUnits.push({
        x: window.Canvas.canvas.width * 0.9375,
        y: window.Canvas.canvas.height * 0.333 + (i % 3) * (window.Canvas.canvas.height * 0.166),
        type: { ...this.UNIT_TYPES.KNIGHT, ...stats }, // Use Knight base type
        hp: stats.health,
        speed: stats.speed,
        damage: stats.damage,
        maxHp: stats.health,
        opacity: 1,
        lane: i % 3,
        lastAttack: null,
        lastGridKey: null
      });
    }


    window.GameState.waveStarted = true;
    console.log(`Spawned ${this.enemyUnits.length} enemy units for wave ${waveNum}`);
  };

  Units.spawnUnit = function () {
    if (window.GameState.gameActive && !window.GameState.gameOver && !window.GameState.gamePaused) {
      // --- Check if selected unit is Knight and if it's unlocked ---
      if (this.selectedUnitType.name === "Knight" && !window.GameState.isKnightUnlocked) {
        window.UI.showFeedback("Knight is locked!");
        return; // Don't spawn
      }

      if (window.GameState.gold >= this.selectedUnitType.cost) {
        window.GameState.gold -= this.selectedUnitType.cost;
        const lane = this.units.length % 3;
        const newUnit = {
          x: window.Canvas.canvas.width * 0.0625,
          y: window.Canvas.canvas.height * 0.333 + lane * (window.Canvas.canvas.height * 0.166),
          type: this.selectedUnitType,
          // Apply upgrades to base stats
          hp: Number(this.selectedUnitType.health) + (window.GameState.unitHealthUpgrades * 3),
          speed: Number(this.selectedUnitType.speed),
          damage: Number(this.selectedUnitType.damage), // Damage upgrades already applied to UNIT_TYPES
          maxHp: Number(this.selectedUnitType.health) + (window.GameState.unitHealthUpgrades * 3),
          opacity: 1,
          lane: lane,
          lastAttack: null,
          lastGridKey: null
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
            // window.UI.showFeedback("Failed to play spawn sound!"); // Maybe too noisy
          });
        }
        window.UI.updateFooter();
      } else {
        window.UI.showFeedback("Not enough gold!");
      }
    } else {
      // window.UI.showFeedback("Game not active or paused!"); // Can be annoying
    }
  };

  Units.update = function () {
    // (Keep existing update logic - collision, movement, attacking, drawing)
    // console.log("Update called, gameActive:", window.GameState.gameActive, "gameOver:", window.GameState.gameOver, "gamePaused:", window.GameState.gamePaused); // Reduce logging frequency
    if (!window.GameState.gameActive || window.GameState.gameOver || window.GameState.gamePaused) {
      requestAnimationFrame(this.update.bind(this));
      return;
    }

    // --- Grid Update ---
    let needsGridUpdate = false;
     this.units.forEach(unit => {
        const currentKey = this.getGridKey(unit.x, unit.y);
        if (unit.lastGridKey !== currentKey) {
            unit.lastGridKey = currentKey;
            needsGridUpdate = true;
        }
    });
    this.enemyUnits.forEach(unit => {
        const currentKey = this.getGridKey(unit.x, unit.y);
        if (unit.lastGridKey !== currentKey) {
            unit.lastGridKey = currentKey;
            needsGridUpdate = true;
        }
    });
    if (needsGridUpdate) {
        this.updateGrid();
    }
    // --- End Grid Update ---


    window.Canvas.ctx.clearRect(0, 0, window.Canvas.canvas.width, window.Canvas.canvas.height);
    window.Canvas.drawBase(20 * (window.Canvas.canvas.width / 800), "#3b5998", window.GameState.baseHealth); // Scale base position
    window.Canvas.drawBase(750 * (window.Canvas.canvas.width / 800), "#dc3545", window.GameState.enemyBaseHealth); // Scale base position


    // --- Update Allied Units ---
    for (let i = this.units.length - 1; i >= 0; i--) { // Iterate backwards for safe removal
        const unit = this.units[i];
        if (unit.hp <= 0) {
            this.units.splice(i, 1);
            continue; // Skip rest of loop for this unit
        }

        let closestEnemy = null;
        let highestPriority = -Infinity;
        let closestDistanceSq = Infinity; // Use squared distance for comparison

        const nearbyEnemies = this.getNearbyUnits(unit.x, unit.y, true);
        nearbyEnemies.forEach(({ unit: enemy }) => {
            const dx = enemy.x - unit.x;
            const dy = enemy.y - unit.y;
            const distanceSq = dx * dx + dy * dy; // Squared distance
            if (distanceSq < closestDistanceSq) { // Simple closest target logic for now
                 closestDistanceSq = distanceSq;
                 closestEnemy = enemy;
            }
            // Example priority logic (can be refined)
            // const priority = 1 / (distanceSq + 1) + (enemy.type.name === "KNIGHT" ? 0.1 : 0); // Prioritize Knights slightly
            // if (priority > highestPriority) {
            //     highestPriority = priority;
            //     closestDistanceSq = distanceSq;
            //     closestEnemy = enemy;
            // }
        });

        const attackRangeSq = Math.pow(30 * (window.Canvas.canvas.width / 800), 2); // Squared attack range

        if (closestEnemy && closestDistanceSq <= attackRangeSq) {
            // Attack
            if (!unit.lastAttack || Date.now() - unit.lastAttack > 1000) { // 1 second attack cooldown
                unit.lastAttack = Date.now();
                closestEnemy.hp = Math.max(0, closestEnemy.hp - unit.damage);
                window.UI.showDamageNumber(closestEnemy.x, closestEnemy.y, unit.damage, false); // false = not enemy taking damage

                // Check if enemy died (handle within enemy loop or check here)
                // Note: Enemy death/reward logic is primarily in the enemy update loop below
            }
        } else if (closestEnemy) {
            // Move towards closest enemy
            const distance = Math.sqrt(closestDistanceSq);
            const dx = closestEnemy.x - unit.x;
            const dy = closestEnemy.y - unit.y;
            if (distance > 0) {
                unit.x += (dx / distance) * unit.speed * (window.Canvas.canvas.width / 800);
                // Simple lane keeping - adjust Y towards target lane center
                const targetY = window.Canvas.canvas.height * 0.333 + unit.lane * (window.Canvas.canvas.height * 0.166);
                const yDiff = targetY - unit.y;
                unit.y += (dy / distance) * unit.speed * 0.3 * (window.Canvas.canvas.height / 300); // Slower vertical movement
                unit.y += yDiff * 0.1; // Nudge towards lane center
                unit.y = Math.max(0, Math.min(window.Canvas.canvas.height - 30, unit.y)); // Keep within bounds
            }
        } else {
            // Move towards enemy base if no enemies nearby
            const enemyBaseX = window.Canvas.canvas.width * 0.9125;
            if (unit.x < enemyBaseX) {
                unit.x += unit.speed * (window.Canvas.canvas.width / 800);
                // Simple lane keeping
                const targetY = window.Canvas.canvas.height * 0.333 + unit.lane * (window.Canvas.canvas.height * 0.166);
                const yDiff = targetY - unit.y;
                unit.y += yDiff * 0.1;
                unit.y = Math.max(0, Math.min(window.Canvas.canvas.height - 30, unit.y)); // Keep within bounds
            } else {
                // Attack enemy base
                if (!unit.lastAttack || Date.now() - unit.lastAttack > 1000) {
                    unit.lastAttack = Date.now();
                    window.GameState.enemyBaseHealth = Math.max(0, window.GameState.enemyBaseHealth - unit.damage);
                    window.UI.showDamageNumber(window.Canvas.canvas.width * 0.9375, window.Canvas.canvas.height * 0.5, unit.damage, false);
                    // Check for victory condition immediately? Or let main loop handle it.
                    if (window.GameState.enemyBaseHealth <= 0 && !window.GameState.gameOver) {
                         window.UI.showGameOverModal("Victory!"); // Trigger victory early
                    }
                }
            }
        }
        window.Canvas.drawUnit(unit);
    }
    // --- End Update Allied Units ---


    // --- Update Enemy Units ---
    for (let i = this.enemyUnits.length - 1; i >= 0; i--) { // Iterate backwards
        const unit = this.enemyUnits[i];
        if (unit.hp <= 0) {
            // Grant reward before removing
            window.GameState.gold += unit.type.reward; // Give gold reward
            window.GameState.diamonds += Math.floor(unit.type.reward / 2); // Give some diamonds too?
             try {
                 localStorage.setItem('warriorDiamonds', window.GameState.diamonds);
             } catch (e) { console.error("Failed to save diamonds:", e); }
            window.UI.updateFooter(); // Update UI immediately

            this.enemyUnits.splice(i, 1);
            continue;
        }

        let closestAlly = null;
        let closestDistanceSq = Infinity;

        const nearbyAllies = this.getNearbyUnits(unit.x, unit.y, false); // false = looking for allies
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
            // Attack
            if (!unit.lastAttack || Date.now() - unit.lastAttack > 1000) {
                unit.lastAttack = Date.now();
                closestAlly.hp = Math.max(0, closestAlly.hp - unit.damage);
                window.UI.showDamageNumber(closestAlly.x, closestAlly.y, unit.damage, true); // true = enemy (player unit) taking damage
                // Ally death is handled in the ally update loop
            }
        } else if (closestAlly) {
            // Move towards closest ally
            const distance = Math.sqrt(closestDistanceSq);
            const dx = closestAlly.x - unit.x;
            const dy = closestAlly.y - unit.y;
             if (distance > 0) {
                unit.x += (dx / distance) * unit.speed * (window.Canvas.canvas.width / 800);
                const targetY = window.Canvas.canvas.height * 0.333 + unit.lane * (window.Canvas.canvas.height * 0.166);
                const yDiff = targetY - unit.y;
                unit.y += (dy / distance) * unit.speed * 0.3 * (window.Canvas.canvas.height / 300);
                unit.y += yDiff * 0.1;
                unit.y = Math.max(0, Math.min(window.Canvas.canvas.height - 30, unit.y));
            }
        } else {
            // Move towards player base
            const playerBaseX = window.Canvas.canvas.width * 0.08; // Target slightly in front of base
             if (unit.x > playerBaseX) {
                unit.x -= unit.speed * (window.Canvas.canvas.width / 800);
                const targetY = window.Canvas.canvas.height * 0.333 + unit.lane * (window.Canvas.canvas.height * 0.166);
                const yDiff = targetY - unit.y;
                unit.y += yDiff * 0.1;
                unit.y = Math.max(0, Math.min(window.Canvas.canvas.height - 30, unit.y));
            } else {
                // Attack player base
                if (!unit.lastAttack || Date.now() - unit.lastAttack > 1000) {
                    unit.lastAttack = Date.now();
                    const damageReduction = 1 - (window.GameState.baseDefenseUpgrades * 0.1); // Apply defense
                    const damageDealt = Math.max(1, unit.damage * damageReduction); // Ensure at least 1 damage
                    window.GameState.baseHealth = Math.max(0, window.GameState.baseHealth - damageDealt);
                    window.UI.showDamageNumber(window.Canvas.canvas.width * 0.025, window.Canvas.canvas.height * 0.5, damageDealt, true);
                    if (window.GameState.baseHealth <= 0 && !window.GameState.gameOver) {
                        window.UI.showGameOverModal("Defeat!"); // Trigger defeat early
                    }
                }
            }
        }
        window.Canvas.drawUnit(unit);
    }
    // --- End Update Enemy Units ---


    // --- Wave Logic ---
    if (this.enemyUnits.length === 0 && window.GameState.waveStarted && !window.GameState.gameOver) {
        console.log(`Wave ${window.GameState.wave} cleared!`);
        window.GameState.wave++;
        window.GameState.waveStarted = false; // Wave is over
        window.GameState.gold += 10 + Math.floor(window.GameState.wave * 1.5); // Increased gold reward for clearing wave
        window.UI.updateFooter();
        window.UI.drawWaveProgress(); // Update progress bar

        if (window.GameState.wave > window.GameState.maxWaves) {
            window.UI.showGameOverModal("Victory!"); // Check victory after incrementing wave
        } else {
            // Start cooldown for the NEXT wave
            window.GameState.waveCooldown = true;
            window.GameState.waveCooldownTimer = 5; // 5 second cooldown
            window.UI.drawWaveCooldown(window.GameState.waveCooldownTimer); // Show initial cooldown
            if (window.GameState.waveCooldownInterval) clearInterval(window.GameState.waveCooldownInterval); // Clear any existing interval
            window.GameState.waveCooldownInterval = setInterval(() => {
                if (window.GameState.gamePaused || window.GameState.gameOver) return; // Don't tick down if paused/over

                window.GameState.waveCooldownTimer--;
                window.UI.drawWaveCooldown(window.GameState.waveCooldownTimer);
                if (window.GameState.waveCooldownTimer <= 0) {
                    clearInterval(window.GameState.waveCooldownInterval);
                    window.GameState.waveCooldownInterval = null;
                    window.UI.hideWaveCooldown();
                    // Don't automatically spawn next wave here, wait for Fight button
                    window.GameState.waveCooldown = false;
                    window.UI.updateButtonStates(); // Re-enable fight button
                    window.UI.showFeedback(`Wave ${window.GameState.wave} incoming! Press Fight!`);
                }
            }, 1000);
        }
    }
    // --- End Wave Logic ---

    // Check game over conditions (redundant checks are okay)
    if (window.GameState.baseHealth <= 0 && !window.GameState.gameOver) {
      window.UI.showGameOverModal("Defeat!");
      return; // Stop update loop processing if game over
    }
    if (window.GameState.enemyBaseHealth <= 0 && !window.GameState.gameOver) {
        window.UI.showGameOverModal("Victory!");
        return; // Stop update loop processing if game over
    }
    // Victory by wave completion is handled in wave logic


    requestAnimationFrame(this.update.bind(this)); // Continue loop
  };

  // Expose Units
  window.Units = Units;
})();
