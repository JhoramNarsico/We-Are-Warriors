// --- START OF FILE units.js ---

(function () {
  const Units = {};

  // Define base stats including attack range and speed (cooldown in ms)
  Units.BASE_ENEMY_STATS = {
    // --- INCREASE attackSpeed values ---
    BARBARIAN: { health: 15, damage: 3, speed: 0.8, reward: 2, attackRange: 35, attackSpeed: 1400 }, // Was 1000
    ARCHER: { health: 8, damage: 6, speed: 1.0, reward: 3, attackRange: 150, attackSpeed: 1700 }, // Was 1200
    HORSE: { health: 25, damage: 12, speed: 1.6, reward: 4, attackRange: 40, attackSpeed: 1300 }, // Was 900
    KNIGHT: { health: 40, damage: 8, speed: 1.2, reward: 6, attackRange: 40, attackSpeed: 1600 } // Was 1100
  };

  Units.UNIT_TYPES = {
     // --- INCREASE attackSpeed values to match BASE_ENEMY_STATS ---
    BARBARIAN: {
      ...Units.BASE_ENEMY_STATS.BARBARIAN, // Inherits the increased attackSpeed
      name: "Barbarian",
      color: "#3b5998",
      cost: 5,
      lore: "Fierce highland warriors with unbreakable spirit.",
      strengths: "Balanced fighter with solid health and damage."
    },
    ARCHER: {
      ...Units.BASE_ENEMY_STATS.ARCHER, // Inherits the increased attackSpeed
      name: "Archer",
      color: "#28a745",
      cost: 8,
      lore: "Forest sharpshooters with deadly precision.",
      strengths: "High ranged damage."
    },
    HORSE: {
      ...Units.BASE_ENEMY_STATS.HORSE, // Inherits the increased attackSpeed
      name: "Horse",
      color: "#dc3545",
      cost: 12,
      lore: "Swift warhorses bred for rapid strikes.",
      strengths: "Fast movement and strong attacks."
    },
    KNIGHT: {
      ...Units.BASE_ENEMY_STATS.KNIGHT, // Inherits the increased attackSpeed
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
  // --- NEW: Constants for Behavior Tuning ---
  const SEPARATION_RADIUS_SQ = Math.pow(20, 2); // How close friendlies need to be to separate
  const SEPARATION_FORCE = 0.08; // How strongly they push apart
  const LANE_ADHERENCE_FORCE = 0.02; // How strongly they stick to lanes when moving
  const BASE_TARGETING_BUFFER = 20; // Extra distance units will target base from

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

  // Modified to find EITHER opponents or friendlies based on `findOpposingUnits`
  Units.getNearbyUnits = function (x, y, unitIsAlly, findOpposingUnits) {
    const gridX = Math.floor(x / GRID_CELL_SIZE);
    const gridY = Math.floor(y / GRID_CELL_SIZE);
    const nearbyUnits = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${gridX + dx},${gridY + dy}`;
        if (grid.has(key)) {
          grid.get(key).forEach(entry => {
            // If finding opponents, check isAlly is different
            // If finding friendlies, check isAlly is the same
            if (findOpposingUnits ? (entry.isAlly !== unitIsAlly) : (entry.isAlly === unitIsAlly)) {
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
      // Update damage from upgrades, keep base range/speed
      Units.UNIT_TYPES.BARBARIAN.damage = damage.barb || Units.BASE_ENEMY_STATS.BARBARIAN.damage;
      Units.UNIT_TYPES.ARCHER.damage = damage.arch || Units.BASE_ENEMY_STATS.ARCHER.damage;
      Units.UNIT_TYPES.HORSE.damage = damage.horse || Units.BASE_ENEMY_STATS.HORSE.damage;
      Units.UNIT_TYPES.KNIGHT.damage = damage.knight || Units.BASE_ENEMY_STATS.KNIGHT.damage;
    }
  } catch (e) {
    console.error("Failed to load unit damage upgrades:", e);
  }

  Units.getScaledEnemyStats = function (type, currentWave) {
    const healthScale = Math.max(1, Math.pow(1.15, currentWave - 1));
    const damageScale = Math.max(1, Math.pow(1.10, currentWave - 1));
    const baseStats = this.BASE_ENEMY_STATS[type]; // Get base stats including range/speed
    return {
      ...baseStats, // Include base range and speed
      health: Math.floor(baseStats.health * healthScale),
      damage: Math.floor(baseStats.damage * damageScale),
      reward: Math.floor(baseStats.reward + currentWave * 0.5)
      // Speed and attackRange/attackSpeed remain constant (or could be scaled too if desired)
    };
  };

  Units.spawnWave = function (waveNum) {
    // ... (spawn logic remains largely the same, but now units get attackRange/Speed from stats)
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

    const barbarianCount = 3 + Math.floor(waveNum / 2);
    const archerCount = Math.floor(waveNum / 3);
    const horseCount = Math.floor(waveNum / 4);
    const knightCount = waveNum >= 10 ? Math.floor(waveNum / 10) : 0;

    const spawnX = window.Canvas.canvas.width * 0.9;
    const laneHeight = window.Canvas.canvas.height * 0.166;
    const startY = window.Canvas.canvas.height * 0.333;

    const createUnit = (typeKey, waveNum, laneIndex) => {
        const stats = this.getScaledEnemyStats(typeKey, waveNum);
        const lane = laneIndex % 3;
        const unit = {
            x: spawnX + (Math.random() - 0.5) * 20,
            y: startY + lane * laneHeight + (Math.random() - 0.5) * laneHeight * 0.5,
            // --- Use combined type and scaled stats ---
            type: { ...this.UNIT_TYPES[typeKey], ...stats }, // Ensure type includes everything
            hp: Math.floor(stats.health),
            speed: stats.speed, // Use speed from stats
            damage: Math.floor(stats.damage),
            attackRange: stats.attackRange, // Use range from stats
            attackSpeed: stats.attackSpeed, // Use speed from stats
            maxHp: Math.floor(stats.health),
            opacity: 1,
            lane: lane,
            lastAttack: null,
            lastGridKey: null,
            spawnTime: Date.now(),
            velocityX: 0,
            velocityY: 0
        };
        unit.y = Math.max(0, Math.min(window.Canvas.canvas.height - 30, unit.y));
        unit.x = Math.max(0, Math.min(window.Canvas.canvas.width - 30, unit.x));
        if (unit.x < 0 || unit.x > window.Canvas.canvas.width || unit.y < 0 || unit.y > window.Canvas.canvas.height) {
            console.error(`${typeKey} spawn out of bounds: x=${unit.x}, y=${unit.y}`);
        }
        return unit;
    };

    for (let i = 0; i < barbarianCount; i++) this.enemyUnits.push(createUnit("BARBARIAN", waveNum, i));
    for (let i = 0; i < archerCount; i++) this.enemyUnits.push(createUnit("ARCHER", waveNum, i));
    for (let i = 0; i < horseCount; i++) this.enemyUnits.push(createUnit("HORSE", waveNum, i));
    for (let i = 0; i < knightCount; i++) this.enemyUnits.push(createUnit("KNIGHT", waveNum, i));


    window.GameState.waveStarted = true;
    console.log(`Spawned ${this.enemyUnits.length} enemy units for wave ${waveNum}: Barbarians=${barbarianCount}, Archers=${archerCount}, Horses=${horseCount}, Knights=${knightCount}`);
    window.UI.showFeedback(`Wave ${waveNum} started with ${this.enemyUnits.length} enemies!`);
    this.updateGrid();
  };

  Units.spawnUnit = function () {
     // ... (spawn logic remains largely the same, but now units get attackRange/Speed from type)
    if (!window.Canvas || !window.Canvas.canvas) {
      console.error("Canvas not initialized!");
      window.UI.showFeedback("Error: Game canvas not available!");
      return;
    }
    // ... (rest of the spawn conditions check) ...

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

            const unitType = this.selectedUnitType; // Get the selected type

            const newUnit = {
                x: spawnX + (Math.random() - 0.5) * 20,
                y: startY + lane * laneHeight + (Math.random() - 0.5) * laneHeight * 0.5,
                type: unitType, // Assign the full type object
                hp: Math.floor(Number(unitType.health) + (window.GameState.unitHealthUpgrades * 3)),
                speed: Number(unitType.speed),
                damage: Math.floor(Number(unitType.damage)), // Already includes potential upgrades from load
                attackRange: Number(unitType.attackRange), // Get range from type
                attackSpeed: Number(unitType.attackSpeed), // Get attack speed from type
                maxHp: Math.floor(Number(unitType.health) + (window.GameState.unitHealthUpgrades * 3)),
                opacity: 1,
                lane: lane,
                lastAttack: null,
                lastGridKey: null,
                spawnTime: Date.now(),
                velocityX: 0,
                velocityY: 0
            };
            newUnit.y = Math.max(0, Math.min(window.Canvas.canvas.height - 30, newUnit.y));
            newUnit.x = Math.max(0, Math.min(window.Canvas.canvas.width - 30, newUnit.x));
            if (newUnit.x < 0 || newUnit.x > window.Canvas.canvas.width || newUnit.y < 0 || newUnit.y > window.Canvas.canvas.height) {
               console.warn(`Unit spawn potentially out of bounds: x=${newUnit.x}, y=${newUnit.y}`);
            }
            this.units.push(newUnit);
            console.log(`Spawned unit: ${newUnit.type.name} at x:${newUnit.x}, y:${newUnit.y}`);
            if (window.GameState.soundEnabled) {
                document.getElementById("spawnSound").play().catch(e => { console.error("Spawn sound error:", e); });
            }
            window.UI.updateFooter();
            this.updateGrid();
        } else {
            console.log("Not enough gold to spawn unit");
            window.UI.showFeedback("Not enough gold!");
        }
    } else {
      console.log("Cannot spawn unit: invalid game state");
      window.UI.showFeedback("Cannot spawn: Game not active or paused!");
    }
  };

  // --- Centralized Unit Update Logic ---
  function updateSingleUnit(unit, isAllyUnit, allUnits, allEnemyUnits) {
    let targetOpponentUnit = null;
    let closestOpponentDistSq = Infinity;
    let targetX, targetY;
    let targetIsBase = false;
    let targetObject = null;

    // Scale attack range by canvas width
    const scaledAttackRange = unit.attackRange * (window.Canvas.canvas.width / 800);
    const unitAttackRangeSq = Math.pow(scaledAttackRange, 2);
    // Base attack range: unit's range + a buffer
    const baseAttackRangeSq = Math.pow(scaledAttackRange + BASE_TARGETING_BUFFER * (window.Canvas.canvas.width / 800), 2);

    // 1. Find the nearest OPPONENT unit
    const nearbyOpponents = Units.getNearbyUnits(unit.x, unit.y, isAllyUnit, true); // true = find opposing
    nearbyOpponents.forEach(({ unit: opponent }) => {
      const dx = opponent.x - unit.x;
      const dy = opponent.y - unit.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq < closestOpponentDistSq) {
        closestOpponentDistSq = distanceSq;
        targetOpponentUnit = opponent;
      }
    });

    // 2. Determine Target
    if (targetOpponentUnit) {
      targetObject = targetOpponentUnit;
      targetX = targetOpponentUnit.x;
      targetY = targetOpponentUnit.y;
      targetIsBase = false;
    } else {
      // Target the appropriate base
      if (isAllyUnit) {
        // Ally targets enemy base (right side)
        targetX = window.Canvas.canvas.width * 0.9375; // Reference X for targeting
        targetY = window.Canvas.canvas.height * 0.5;
        targetObject = { x: targetX, y: targetY, type: { name: "EnemyBase" } }; // Dummy base object
      } else {
        // Enemy targets player base (left side)
        targetX = window.Canvas.canvas.width * 0.075; // Reference X for targeting
        targetY = window.Canvas.canvas.height * 0.5;
        targetObject = { x: targetX, y: targetY, type: { name: "PlayerBase" } }; // Dummy base object
      }
      targetIsBase = true;
    }

    const dxTarget = targetX - unit.x;
    const dyTarget = targetY - unit.y;
    const targetDistSq = dxTarget * dxTarget + dyTarget * dyTarget;
    const currentAttackRangeSq = targetIsBase ? baseAttackRangeSq : unitAttackRangeSq;

    // 3. Decide Action: Attack or Move
    let isAttacking = false;
    if (targetDistSq <= currentAttackRangeSq) {
      isAttacking = true;
      // Attack logic
      // Stop horizontal/vertical movement completely when attacking for simplicity now
      // We could allow *slight* forward creep for melee later if desired.
      unit.velocityX = 0;
      unit.velocityY = 0;
      if (!unit.lastAttack || Date.now() - unit.lastAttack > unit.attackSpeed) { // Use unit's attack speed
        unit.lastAttack = Date.now();
        window.Canvas.addAttackAnimation(unit, targetX, targetY); // Use target coords for animation
        if (targetIsBase) {
            if (isAllyUnit) { // Ally hitting enemy base
                window.GameState.enemyBaseHealth = Math.max(0, window.GameState.enemyBaseHealth - Math.floor(unit.damage));
                window.UI.showDamageNumber(targetX, targetY, Math.floor(unit.damage), false);
            } else { // Enemy hitting player base
                const damageReduction = 1 - (window.GameState.baseDefenseUpgrades * 0.1);
                const damageDealt = Math.max(1, Math.floor(Math.floor(unit.damage) * damageReduction));
                window.GameState.baseHealth = Math.max(0, window.GameState.baseHealth - damageDealt);
                window.UI.showDamageNumber(targetX, targetY, damageDealt, true); // true indicates player is taking damage

                // --- ADDED SOUND EFFECT LOGIC ---
                if (window.GameState.soundEnabled && window.UI && window.UI.attackSound) {
                    // Play the attack sound when the player's base takes damage
                    // Create a new Audio object to allow overlapping sounds if needed
                    const baseHitSound = new Audio(window.UI.attackSound.src);
                    baseHitSound.volume = window.UI.attackSound.volume; // Respect existing volume setting
                    baseHitSound.play().catch(e => console.error("Enemy base attack sound error:", e));
                    // console.log(`Enemy ${unit.type.name} hit player base, playing sound.`); // Optional debug log
                }
                // --- END ADDED SOUND EFFECT LOGIC ---

                // Check for game over immediately after dealing damage to player base
                if (window.GameState.baseHealth <= 0 && !window.GameState.gameOver) {
                    console.log(`Enemy ${unit.type.name} dealt fatal blow to base.`);
                    window.UI.showGameOverModal("Defeat!");
                    // Return a flag or handle game over state immediately if possible
                    return 'GameOver'; // Signal game over
                }
            }
        } else { // Attacking another unit
            targetObject.hp = Math.max(0, Math.floor(targetObject.hp - Math.floor(unit.damage)));
            // Pass !isAllyUnit to showDamageNumber to indicate if the recipient is an enemy (player attacking) or player (enemy attacking)
            window.UI.showDamageNumber(targetObject.x, targetObject.y, Math.floor(unit.damage), !isAllyUnit);
        }
      }
    } else {
      // Movement logic
      const distance = Math.sqrt(targetDistSq);
      // --- REDUCE THIS MULTIPLIER ---
      const moveSpeed = unit.speed * (window.Canvas.canvas.width / 800) * 0.35; // <--- REDUCED MULTIPLIER (Was 0.6)

      // --- Calculate Desired Velocity Components ---

      // 1. Target Following Vector (Normalized)
      let targetVelX = 0;
      let targetVelY = 0;
      if (distance > 1) { // Avoid division by zero
          targetVelX = dxTarget / distance;
          targetVelY = dyTarget / distance;
      }

      // 2. Lane Adherence Vector (Points towards lane center)
      const laneCenterY = window.Canvas.canvas.height * 0.333 + unit.lane * (window.Canvas.canvas.height * 0.166);
      const dyLane = laneCenterY - unit.y;
      let laneVelX = 0;
      let laneVelY = 0;
      const distToLaneCenter = Math.abs(dyLane);
      if (distToLaneCenter > 5) { // Only apply if significantly off-lane
          laneVelY = dyLane / distToLaneCenter; // Normalized vertical direction
      }

      // 3. Separation Vector (Pushes away from close friendlies)
      let separationVelX = 0;
      let separationVelY = 0;
      const nearbyFriendlies = Units.getNearbyUnits(unit.x, unit.y, isAllyUnit, false); // false = find friendlies
      nearbyFriendlies.forEach(({ unit: friendly }) => {
        if (friendly === unit) return; // Don't separate from self
        const dxFriendly = unit.x - friendly.x;
        const dyFriendly = unit.y - friendly.y;
        const distSqFriendly = dxFriendly * dxFriendly + dyFriendly * dyFriendly;

        if (distSqFriendly > 0 && distSqFriendly < SEPARATION_RADIUS_SQ) {
           const distFriendly = Math.sqrt(distSqFriendly);
           // Add force pushing away, stronger when closer
           separationVelX += (dxFriendly / distFriendly) / distFriendly; // Inverse distance weighting
           separationVelY += (dyFriendly / distFriendly) / distFriendly;
        }
      });

      // --- Combine Velocities ---
      // Weight the components: primary is target, add lane adherence and separation
      // Reduce lane adherence effect when very close to target? Maybe not needed yet.
      let desiredVelX = targetVelX * moveSpeed
                      + laneVelX * LANE_ADHERENCE_FORCE // Lane force is weaker, acts as a nudge
                      + separationVelX * SEPARATION_FORCE; // Separation force is also a nudge

      // Make vertical target following slightly less strong to prioritize horizontal progress
      let desiredVelY = targetVelY * moveSpeed * 0.7 // Slightly reduced vertical pull towards target (was 0.3)
                      + laneVelY * LANE_ADHERENCE_FORCE // Lane force nudge
                      + separationVelY * SEPARATION_FORCE; // Separation force nudge


      // --- Apply Smoothing / Acceleration ---
      // --- SLIGHTLY REDUCED ACCELERATION (OPTIONAL) ---
      const accelerationFactor = 0.06; // <--- SLIGHTLY REDUCED (Was 0.08)
      unit.velocityX += (desiredVelX - unit.velocityX) * accelerationFactor;
      unit.velocityY += (desiredVelY - unit.velocityY) * accelerationFactor;

      // Optional: Clamp maximum velocity?
      // const maxVel = moveSpeed * 1.5;
      // const currentSpeedSq = unit.velocityX * unit.velocityX + unit.velocityY * unit.velocityY;
      // if (currentSpeedSq > maxVel * maxVel) {
      //    const currentSpeed = Math.sqrt(currentSpeedSq);
      //    unit.velocityX = (unit.velocityX / currentSpeed) * maxVel;
      //    unit.velocityY = (unit.velocityY / currentSpeed) * maxVel;
      // }

      // --- Update Position ---
      unit.x += unit.velocityX;
      unit.y += unit.velocityY;

      // Clamp position to canvas bounds (prevent units going off-screen)
      unit.y = Math.max(10, Math.min(window.Canvas.canvas.height - 40, unit.y));
      unit.x = Math.max(10, Math.min(window.Canvas.canvas.width - 40, unit.x));
    }

    // Return null normally, or 'GameOver' if base destroyed
    return null;
  }


  Units.update = function () {
    try {
      if (!window.GameState.gameActive || window.GameState.gameOver || window.GameState.gamePaused) {
        // Still request next frame even if paused/inactive to keep the canvas rendering loop potentially alive
        // and responsive to unpausing. The game logic itself won't run.
        if (window.Game && window.Game.gameLoopRunning) {
             requestAnimationFrame(this.update.bind(this));
        } else if (!window.Game || !window.Game.gameLoopRunning){
            // If the main game loop isn't running (e.g., after game over), don't restart it here.
        }
        return;
      }

      let needsGridUpdate = false;

      // Check for grid updates - can be optimized later if needed
      this.units.forEach(unit => {
        const currentKey = this.getGridKey(unit.x, unit.y);
        if (unit.lastGridKey !== currentKey) needsGridUpdate = true;
      });
      this.enemyUnits.forEach(unit => {
        const currentKey = this.getGridKey(unit.x, unit.y);
        if (unit.lastGridKey !== currentKey) needsGridUpdate = true;
      });

      const rewards = { gold: 0, diamonds: 0 };
      const unitsToRemove = [];
      const enemyUnitsToRemove = [];

      // Process unit deaths and rewards FIRST
      for (let i = this.units.length - 1; i >= 0; i--) {
        const unit = this.units[i];
        if (unit.hp <= 0) {
          unitsToRemove.push(i);
          window.Canvas.addDeathAnimation(unit);
          needsGridUpdate = true;
        }
      }
      for (let i = this.enemyUnits.length - 1; i >= 0; i--) {
        const unit = this.enemyUnits[i];
        if (unit.hp <= 0) {
          rewards.gold += unit.type.reward;
          rewards.diamonds += Math.floor(unit.type.reward / 2);
          enemyUnitsToRemove.push(i);
          window.Canvas.addDeathAnimation(unit);
          needsGridUpdate = true;
        }
      }

      // Apply rewards
      if (rewards.gold > 0 || rewards.diamonds > 0) {
        window.GameState.gold += rewards.gold;
        window.GameState.diamonds += rewards.diamonds;
        try { localStorage.setItem('warriorDiamonds', window.GameState.diamonds); }
        catch (e) { console.error("Failed to save diamonds:", e); window.UI.showFeedback("Warning: Unable to save progress."); }
        window.UI.updateFooter();
      }

      // Remove dead units from arrays
      unitsToRemove.forEach(i => this.units.splice(i, 1));
      enemyUnitsToRemove.forEach(i => this.enemyUnits.splice(i, 1));

      // Update grid if necessary AFTER removing units
      if (needsGridUpdate) {
        try { this.updateGrid(); }
        catch (e) { console.error("Grid update failed:", e); window.UI.showFeedback("Error updating unit positions!"); }
      }

      // Clear canvas and draw bases
      window.Canvas.ctx.clearRect(0, 0, window.Canvas.canvas.width, window.Canvas.canvas.height);
      const playerMaxHealth = 150 + (window.GameState.baseHealthUpgrades * 25);
      window.Canvas.drawBase(60, "#3b5998", window.GameState.baseHealth, playerMaxHealth, window.GameState.baseDefenseUpgrades);
      window.Canvas.drawBase(740, "#dc3545", window.GameState.enemyBaseHealth, 150, 0);


      // --- Ally Unit Update Loop ---
      // Iterate forwards now that removals are done
      for (let i = 0; i < this.units.length; i++) {
         const unit = this.units[i];
         // Update unit's state
         updateSingleUnit(unit, true, this.units, this.enemyUnits);
         // Draw unit *after* its state is updated for this frame
         window.Canvas.drawUnit(unit);
      }


      // --- Enemy Unit Update Loop ---
       let gameOverTriggered = false;
       // Iterate forwards now that removals are done
       for (let i = 0; i < this.enemyUnits.length; i++) {
         const unit = this.enemyUnits[i];
         // Update unit's state
         const updateResult = updateSingleUnit(unit, false, this.units, this.enemyUnits);
         // Draw unit *after* its state is updated for this frame
         window.Canvas.drawUnit(unit);
         if (updateResult === 'GameOver') {
             gameOverTriggered = true;
             // Don't break, let others finish drawing for this frame.
         }
       }

       // Draw animations after all units are drawn
       window.Canvas.renderAnimations();

       // If game over was triggered, stop further processing this frame.
       if (gameOverTriggered) {
           console.log("Game Over detected during enemy update loop.");
           // Main game loop flag (Game.gameLoopRunning) should be set false by showGameOverModal
           // which prevents the next requestAnimationFrame in the *main* game loop driver.
           return;
       }


      // Handle enemy base destruction (Wave End)
      if (window.GameState.enemyBaseHealth <= 0 && !window.GameState.gameOver) {
        console.log(`Enemy base destroyed! Advancing to wave ${window.GameState.wave + 1}`);
        window.GameState.wave++;
        window.GameState.waveStarted = false;
        window.GameState.gold += 20 + Math.floor(window.GameState.wave * 2);
        window.GameState.diamonds += 5; // Base diamond reward per wave clear
        window.GameState.enemyBaseHealth = 150; // Reset enemy base health
        this.units = []; // Clear remaining player units
        this.enemyUnits = []; // Clear remaining enemy units
        this.updateGrid(); // Clear grid
        try { localStorage.setItem('warriorDiamonds', window.GameState.diamonds); }
        catch (e) { console.error("Failed to save diamonds:", e); window.UI.showFeedback("Warning: Unable to save progress."); }
        window.UI.updateFooter();
        window.UI.drawWaveProgress(); // Update wave display immediately

        if (window.GameState.gameActive) {
           if (window.GameState.wave <= window.GameState.maxWaves) {
               // Spawn next wave immediately
               this.spawnWave(window.GameState.wave);
               window.UI.showFeedback(`Enemy base destroyed! Wave ${window.GameState.wave} started!`);
           } else {
               window.UI.showGameOverModal("Victory!");
               return; // Victory, stop update loop
           }
        }
      }

      // Player base destruction check (redundant, handled in updateSingleUnit, but safe)
      if (window.GameState.baseHealth <= 0 && !window.GameState.gameOver) {
        console.warn("Player base destroyed check in main loop triggered - should have been caught earlier.");
        if (!window.GameState.gameOver) window.UI.showGameOverModal("Defeat!");
        return; // Stop update loop
      }

      // Schedule the next frame ONLY if the main game loop flag is still true
      // (Game.js loop driver handles the requestAnimationFrame)
      // No need to requestAnimationFrame here anymore as Game.js handles the loop driver.

    } catch (e) {
      console.error("Error in Units.update:", e);
      window.UI.showFeedback("Game error occurred. Please check console and consider restarting.");
      // Let the main game loop handle potential continuation or stopping
      // if (!window.GameState.gameOver && window.Game && window.Game.gameLoopRunning) {
      //    requestAnimationFrame(this.update.bind(this)); // Maybe re-request if error occurs? Risky.
      // }
    }
  }; // End of Units.update


  window.Units = Units;
})();

// --- END OF FILE units.js ---