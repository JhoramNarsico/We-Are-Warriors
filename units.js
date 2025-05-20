(function () {
  const Units = {};

  // Define BASE stats (unchanged by upgrades)
  Units.BASE_UNIT_STATS = {
      BARBARIAN: { name: "Barbarian", health: 15, damage: 3, speed: 0.8, reward: 2, attackRange: 35, attackSpeed: 1400, color: "#3b5998", cost: 5, lore: "Fierce highland warriors with unbreakable spirit.", strengths: "Balanced fighter with solid health and damage." },
      ARCHER:    { name: "Archer",    health: 8,  damage: 6, speed: 1.0, reward: 3, attackRange: 150, attackSpeed: 1700, color: "#28a745", cost: 8, lore: "Forest sharpshooters with deadly precision.", strengths: "High ranged damage." },
      HORSE:     { name: "Horse",     health: 25, damage: 12, speed: 1.6, reward: 4, attackRange: 40, attackSpeed: 1300, color: "#dc3545", cost: 12, lore: "Swift warhorses bred for rapid strikes.", strengths: "Fast movement and strong attacks." },
      KNIGHT:    { name: "Knight",    health: 40, damage: 8, speed: 1.2, reward: 6, attackRange: 40, attackSpeed: 1600, color: "#ffd700", cost: 15, lore: "Honored protectors in sacred armor.", strengths: "High health and damage for late waves." }
  };

  // UNIT_TYPES now just references the base stats for easy access by name
  Units.UNIT_TYPES = {
      BARBARIAN: Units.BASE_UNIT_STATS.BARBARIAN,
      ARCHER:    Units.BASE_UNIT_STATS.ARCHER,
      HORSE:     Units.BASE_UNIT_STATS.HORSE,
      KNIGHT:    Units.BASE_UNIT_STATS.KNIGHT
  };

  // Enemies use the same base stats before scaling
  Units.BASE_ENEMY_STATS = Units.BASE_UNIT_STATS;

  Units.units = [];
  Units.enemyUnits = [];
  Units.selectedUnitType = Units.UNIT_TYPES.BARBARIAN; // Default selection

  // Grid system for optimizing nearby unit checks
  const GRID_CELL_SIZE = 50;
  const grid = new Map();

  // Movement behavior constants
  const SEPARATION_RADIUS_SQ = Math.pow(20, 2); // Squared distance for efficiency
  const SEPARATION_FORCE = 0.08;
  const LANE_ADHERENCE_FORCE = 0.02;
  const BASE_TARGETING_BUFFER = 20; // Extra distance to target base

  // --- Grid Functions ---
   Units.getGridKey = function (x, y) {
       return `${Math.floor(x / GRID_CELL_SIZE)},${Math.floor(y / GRID_CELL_SIZE)}`;
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

   Units.getNearbyUnits = function (x, y, unitIsAlly, findOpposingUnits) {
       const gridX = Math.floor(x / GRID_CELL_SIZE);
        const gridY = Math.floor(y / GRID_CELL_SIZE);
        const nearbyUnits = [];
        // Check current cell and 8 surrounding cells
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const key = `${gridX + dx},${gridY + dy}`;
            if (grid.has(key)) {
              grid.get(key).forEach(entry => {
                // Filter based on whether we are looking for opponents or friendlies
                if (findOpposingUnits ? (entry.isAlly !== unitIsAlly) : (entry.isAlly === unitIsAlly)) {
                  nearbyUnits.push(entry);
                }
              });
            }
          }
        }
        return nearbyUnits;
    };
 
  // Calculate scaled enemy stats for a given wave
  Units.getScaledEnemyStats = function (typeKey, currentWave) {
      const healthScale = Math.max(1, Math.pow(1.15, currentWave - 1));
      const damageScale = Math.max(1, Math.pow(1.10, currentWave - 1));
      const baseStats = this.BASE_UNIT_STATS[typeKey]; // Use BASE stats

      if (!baseStats) {
           console.error(`Base stats not found for enemy type: ${typeKey}`);
           // Return some default error state to prevent crashes
           return { name: "ErrorUnit", health: 10, damage: 1, speed: 1, reward: 1, attackRange: 30, attackSpeed: 2000, color:"#ff0000", cost: 0, lore:"", strengths:"" };
      }

      return {
          ...baseStats, // Include base range, speed, name, color etc.
          health: Math.floor(baseStats.health * healthScale),
          damage: Math.floor(baseStats.damage * damageScale), // Enemy damage scales
          reward: Math.floor(baseStats.reward + currentWave * 0.5)
      };
  };

  // Spawn enemy wave
  Units.spawnWave = function (waveNum) {
    if (!window.Canvas || !window.Canvas.canvas) {
      console.error("Canvas not initialized!");
      if(window.UI) window.UI.showFeedback("Error: Game canvas not available!");
      return;
    }
    console.log(`Spawning wave ${waveNum}`);
    if (waveNum > window.GameState.maxWaves) {
      if(window.UI) window.UI.showGameOverModal("Victory!");
      return;
    }

    this.enemyUnits = [];

    // Determine unit counts based on wave number
    const barbarianCount = 3 + Math.floor(waveNum / 2);
    const archerCount = Math.floor(waveNum / 3);
    const horseCount = Math.floor(waveNum / 4);
    const knightCount = waveNum >= 10 ? Math.floor(waveNum / 10) : 0; // Knights appear later

    // Define spawn area
    const spawnX = window.Canvas.canvas.width * 0.9;
    const laneHeight = window.Canvas.canvas.height * 0.166; // Divide height for lanes
    const startY = window.Canvas.canvas.height * 0.333; // Start spawning below top third


    const createUnit = (typeKey, waveNum, laneIndex) => {
        const stats = this.getScaledEnemyStats(typeKey, waveNum); // Gets scaled health/damage/reward + base everything else
        const lane = laneIndex % 3; // Distribute units across 3 lanes
        const unit = {
            x: spawnX + (Math.random() - 0.5) * 20, // Slight horizontal variation
            y: startY + lane * laneHeight + (Math.random() - 0.5) * laneHeight * 0.5, // Position within lane with variation
            type: this.UNIT_TYPES[typeKey], // Store the BASE type reference
            hp: Math.floor(stats.health),
            maxHp: Math.floor(stats.health), // Store initial scaled health as maxHp
            // Use scaled stats for runtime
            speed: stats.speed,
            damage: Math.floor(stats.damage), // Scaled damage for enemy
            attackRange: stats.attackRange,
            attackSpeed: stats.attackSpeed,
            reward: stats.reward, // Store reward on the unit instance
            // Other properties
            opacity: 1,
            lane: lane,
            lastAttack: null, // Timestamp of last attack
            lastGridKey: null, // Track grid cell
            spawnTime: Date.now(), // For spawn animation/effects
            velocityX: 0, // For smoother movement
            velocityY: 0
        };
        // Clamp initial position to canvas bounds
        unit.y = Math.max(0, Math.min(window.Canvas.canvas.height - 30, unit.y));
        unit.x = Math.max(0, Math.min(window.Canvas.canvas.width - 30, unit.x));
        if (unit.x < 0 || unit.x > window.Canvas.canvas.width || unit.y < 0 || unit.y > window.Canvas.canvas.height) {
            console.error(`${typeKey} spawn out of bounds: x=${unit.x}, y=${unit.y}`);
        }
        return unit;
    };

    // Spawn units based on calculated counts
    for (let i = 0; i < barbarianCount; i++) this.enemyUnits.push(createUnit("BARBARIAN", waveNum, i));
    for (let i = 0; i < archerCount; i++) this.enemyUnits.push(createUnit("ARCHER", waveNum, i));
    for (let i = 0; i < horseCount; i++) this.enemyUnits.push(createUnit("HORSE", waveNum, i));
    for (let i = 0; i < knightCount; i++) this.enemyUnits.push(createUnit("KNIGHT", waveNum, i));


    window.GameState.waveStarted = true;
    console.log(`Spawned ${this.enemyUnits.length} enemy units for wave ${waveNum}: Barbarians=${barbarianCount}, Archers=${archerCount}, Horses=${horseCount}, Knights=${knightCount}`);
    if(window.UI) window.UI.showFeedback(`Wave ${waveNum} started with ${this.enemyUnits.length} enemies!`);
    this.updateGrid(); // Update grid after spawning
  };

  // Spawn player unit
  Units.spawnUnit = function () {
     if (!window.Canvas || !window.Canvas.canvas) {
         console.error("Canvas not initialized!");
         if(window.UI) window.UI.showFeedback("Error: Game canvas not available!");
         return;
     }
     if (!window.GameState || !window.UI) {
          console.error("GameState or UI not available for spawning unit.");
          return;
     }

     // Check game state conditions
    if (window.GameState.gameActive && !window.GameState.gameOver && !window.GameState.gamePaused) {
        // Check if Knight is selected and unlocked
        if (this.selectedUnitType.name === "Knight" && !window.GameState.isKnightUnlocked) {
          window.UI.showFeedback("Knight is locked!");
          return;
        }
        // Check gold cost
        if (window.GameState.gold >= this.selectedUnitType.cost) {
            window.GameState.gold -= this.selectedUnitType.cost;
            const lane = this.units.length % 3; // Simple lane assignment
            const spawnX = window.Canvas.canvas.width * 0.1;
            const laneHeight = window.Canvas.canvas.height * 0.166;
            const startY = window.Canvas.canvas.height * 0.333;

            const baseUnitType = this.selectedUnitType; // Get the selected BASE type

            // Calculate stats including upgrades from GameState
            const currentHealth = Math.floor(baseUnitType.health + (window.GameState.unitHealthUpgrades * 3));
            const currentDamage = Math.floor(baseUnitType.damage + (window.GameState.unitDamageUpgrades * 2));

            const newUnit = {
                x: spawnX + (Math.random() - 0.5) * 20,
                y: startY + lane * laneHeight + (Math.random() - 0.5) * laneHeight * 0.5,
                type: baseUnitType, // Store reference to BASE type
                hp: currentHealth,
                maxHp: currentHealth, // Store calculated max health
                // Use base stats + calculated damage for runtime
                speed: baseUnitType.speed,
                damage: currentDamage, // Use calculated damage
                attackRange: baseUnitType.attackRange,
                attackSpeed: baseUnitType.attackSpeed,
                reward: 0, // Player units don't give rewards
                // Other properties
                opacity: 1,
                lane: lane,
                lastAttack: null,
                lastGridKey: null,
                spawnTime: Date.now(),
                velocityX: 0,
                velocityY: 0
            };
            // Clamp position
            newUnit.y = Math.max(0, Math.min(window.Canvas.canvas.height - 30, newUnit.y));
            newUnit.x = Math.max(0, Math.min(window.Canvas.canvas.width - 30, newUnit.x));
             if (newUnit.x < 0 || newUnit.x > window.Canvas.canvas.width || newUnit.y < 0 || newUnit.y > window.Canvas.canvas.height) {
               console.warn(`Unit spawn potentially out of bounds: x=${newUnit.x}, y=${newUnit.y}`);
            }

            this.units.push(newUnit);
            console.log(`Spawned unit: ${newUnit.type.name} (HP:${newUnit.hp}, DMG:${newUnit.damage})`);

            // Play sound
            if (window.GameState.soundEnabled && document.getElementById("spawnSound")) {
                document.getElementById("spawnSound").play().catch(e => { console.error("Spawn sound error:", e); });
            }
            window.UI.updateFooter(); // Update gold display
            this.updateGrid(); // Update grid
        } else {
            console.log("Not enough gold to spawn unit");
            window.UI.showFeedback("Not enough gold!");
        }
    } else {
      console.log("Cannot spawn unit: invalid game state");
      window.UI.showFeedback("Cannot spawn: Game not active or paused!");
    }
  };

  // This function handles movement, targeting, and attacking for a single unit
  function updateSingleUnit(unit, isAllyUnit, allUnits, allEnemyUnits) {
    let targetOpponentUnit = null;
    let closestOpponentDistSq = Infinity;
    let targetX, targetY;
    let targetIsBase = false;
    let targetObject = null; // The actual object being targeted (unit or base placeholder)

    // Calculate scaled attack range based on canvas size
    const scaledAttackRange = unit.attackRange * (window.Canvas.canvas.width / 800);
    const unitAttackRangeSq = Math.pow(scaledAttackRange, 2);
    // Increase range slightly when targeting bases
    const baseAttackRangeSq = Math.pow(scaledAttackRange + BASE_TARGETING_BUFFER * (window.Canvas.canvas.width / 800), 2);

    // 1. Find the nearest OPPONENT unit using the grid system
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

    // 2. Determine Target (nearest opponent or enemy/player base)
    if (targetOpponentUnit) {
      targetObject = targetOpponentUnit;
      targetX = targetOpponentUnit.x;
      targetY = targetOpponentUnit.y;
      targetIsBase = false;
    } else {
      // No enemy units nearby, target the appropriate base
      targetIsBase = true;
      if (isAllyUnit) { // Ally targets enemy base (right side)
        targetX = window.Canvas.canvas.width * 0.9375; // Reference X
        targetY = window.Canvas.canvas.height * 0.5; // Aim for center vertically
        targetObject = { x: targetX, y: targetY, type: { name: "EnemyBase" } }; // Placeholder for logic
      } else { // Enemy targets player base (left side)
        targetX = window.Canvas.canvas.width * 0.075; // Reference X
        targetY = window.Canvas.canvas.height * 0.5;
        targetObject = { x: targetX, y: targetY, type: { name: "PlayerBase" } }; // Placeholder
      }
    }

    // Calculate distance to the current target
    const dxTarget = targetX - unit.x;
    const dyTarget = targetY - unit.y;
    const targetDistSq = dxTarget * dxTarget + dyTarget * dyTarget;
    const currentAttackRangeSq = targetIsBase ? baseAttackRangeSq : unitAttackRangeSq;

    // 3. Decide Action: Attack or Move
    if (targetDistSq <= currentAttackRangeSq) {
      // --- Attack Logic ---
      unit.velocityX = 0; // Stop moving when attacking
      unit.velocityY = 0;
      // Check attack cooldown using unit's specific attackSpeed
      if (!unit.lastAttack || Date.now() - unit.lastAttack > unit.attackSpeed) {
        unit.lastAttack = Date.now();
        window.Canvas.addAttackAnimation(unit, targetX, targetY); // Trigger visual effect

        // Damage calculation (already includes upgrades for player units)
        let actualDamage = Math.floor(unit.damage);

        if (targetIsBase) {
            // --- Attacking a Base ---
            if (isAllyUnit) { // Ally hitting enemy base
                window.GameState.enemyBaseHealth = Math.max(0, window.GameState.enemyBaseHealth - actualDamage);
                 if(window.UI) window.UI.showDamageNumber(targetX, targetY, actualDamage, false); // false = enemy taking damage
            } else { // Enemy hitting player base
                // Apply base defense upgrade
                const damageReduction = 1 - (window.GameState.baseDefenseUpgrades * 0.1);
                const damageDealt = Math.max(1, Math.floor(actualDamage * damageReduction)); // Ensure at least 1 damage
                window.GameState.baseHealth = Math.max(0, window.GameState.baseHealth - damageDealt);
                if(window.UI) window.UI.showDamageNumber(targetX, targetY, damageDealt, true); // true = player taking damage

                // Play sound when player base is hit
                if (window.GameState.soundEnabled && window.UI && window.UI.attackSound) {
                    const baseHitSound = new Audio(window.UI.attackSound.src);
                    baseHitSound.volume = window.UI.attackSound.volume;
                    baseHitSound.play().catch(e => console.error("Enemy base attack sound error:", e));
                }

                // Check for game over immediately
                if (window.GameState.baseHealth <= 0 && !window.GameState.gameOver) {
                    console.log(`Enemy ${unit.type.name} dealt fatal blow to base.`);
                     if(window.UI) window.UI.showGameOverModal("Defeat!");
                    return 'GameOver'; // Signal game over to the main loop
                }
            }
        } else {
            // --- Attacking another Unit ---
             targetObject.hp = Math.max(0, targetObject.hp - actualDamage);
             // Show damage number: !isAllyUnit determines if the *recipient* is an enemy (taking damage)
             if(window.UI) window.UI.showDamageNumber(targetObject.x, targetObject.y, actualDamage, !isAllyUnit);
        }
      }
    } else {
      // --- Movement Logic ---
      const distance = Math.sqrt(targetDistSq);
      // Adjust base speed based on canvas width, slower overall speed factor
      const moveSpeed = unit.speed * (window.Canvas.canvas.width / 800) * 0.35; // Reduced speed factor

      // Calculate velocity components: target following, lane adherence, separation
      let targetVelX = 0, targetVelY = 0;
      if (distance > 1) { // Avoid division by zero
          targetVelX = dxTarget / distance;
          targetVelY = dyTarget / distance;
      }

      // Lane adherence calculation
      const laneCenterY = window.Canvas.canvas.height * 0.333 + unit.lane * (window.Canvas.canvas.height * 0.166);
      const dyLane = laneCenterY - unit.y;
      let laneVelY = 0;
      if (Math.abs(dyLane) > 5) { // Only apply if significantly off-lane
          laneVelY = dyLane / Math.abs(dyLane); // Normalized vertical direction towards lane center
      }

      // Separation calculation
      let separationVelX = 0, separationVelY = 0;
      const nearbyFriendlies = Units.getNearbyUnits(unit.x, unit.y, isAllyUnit, false); // false = find friendlies
      nearbyFriendlies.forEach(({ unit: friendly }) => {
        if (friendly === unit) return; // Don't separate from self
        const dxFriendly = unit.x - friendly.x;
        const dyFriendly = unit.y - friendly.y;
        const distSqFriendly = dxFriendly * dxFriendly + dyFriendly * dyFriendly;

        if (distSqFriendly > 0 && distSqFriendly < SEPARATION_RADIUS_SQ) {
           const distFriendly = Math.sqrt(distSqFriendly);
           // Add force pushing away, stronger when closer (inverse distance weighting)
           separationVelX += (dxFriendly / distFriendly) / distFriendly;
           separationVelY += (dyFriendly / distFriendly) / distFriendly;
        }
      });

      // Combine velocities with weights
      let desiredVelX = targetVelX * moveSpeed           // Main target following
                      + separationVelX * SEPARATION_FORCE; // Separation nudge
      let desiredVelY = targetVelY * moveSpeed * 0.7     // Reduced vertical target pull
                      + laneVelY * LANE_ADHERENCE_FORCE  // Lane adherence nudge
                      + separationVelY * SEPARATION_FORCE; // Separation nudge

      // Apply smoothing/acceleration towards the desired velocity
      const accelerationFactor = 0.06; // Controls how quickly velocity changes
      unit.velocityX += (desiredVelX - unit.velocityX) * accelerationFactor;
      unit.velocityY += (desiredVelY - unit.velocityY) * accelerationFactor;

      // Update position based on current velocity
      unit.x += unit.velocityX;
      unit.y += unit.velocityY;

      // Clamp position to stay within canvas bounds
      unit.y = Math.max(10, Math.min(window.Canvas.canvas.height - 40, unit.y));
      unit.x = Math.max(10, Math.min(window.Canvas.canvas.width - 40, unit.x));
    }

    // Return null normally, or 'GameOver' if base destroyed
    return null;
  }


  // Main update loop for all units, called by game.js loop driver
  Units.update = function () {
    try {
      if (!window.GameState || !window.Canvas || !window.UI) {
          console.error("Units.update prerequisites not met (GameState, Canvas, or UI missing).");
          return; // Cannot proceed
      }
      // Check if game should run updates
      if (!window.GameState.gameActive || window.GameState.gameOver || window.GameState.gamePaused) {
        // Don't run game logic, but allow canvas redraw if necessary (handled by Game.js loop)
        return;
      }

      let needsGridUpdate = false;

      // Check if any unit moved to a new grid cell
      this.units.forEach(unit => {
        const currentKey = this.getGridKey(unit.x, unit.y);
        if (unit.lastGridKey !== currentKey) needsGridUpdate = true;
      });
      this.enemyUnits.forEach(unit => {
        const currentKey = this.getGridKey(unit.x, unit.y);
        if (unit.lastGridKey !== currentKey) needsGridUpdate = true;
      });

      // --- Process Deaths and Rewards ---
      const rewards = { gold: 0, diamonds: 0 };
      const unitsToRemove = [];
      const enemyUnitsToRemove = [];

      // Check player units for death
      for (let i = this.units.length - 1; i >= 0; i--) {
        const unit = this.units[i];
        if (unit.hp <= 0) {
          unitsToRemove.push(i);
          window.Canvas.addDeathAnimation(unit);
          needsGridUpdate = true;
        }
      }
      // Check enemy units for death and calculate rewards
      for (let i = this.enemyUnits.length - 1; i >= 0; i--) {
        const unit = this.enemyUnits[i];
        if (unit.hp <= 0) {
             rewards.gold += unit.reward || 0; // Use reward stored on the unit instance
             rewards.diamonds += Math.floor((unit.reward || 0) / 2); // Base diamonds on stored reward
             enemyUnitsToRemove.push(i);
             window.Canvas.addDeathAnimation(unit);
             needsGridUpdate = true;
        }
      }

      // Apply rewards and save persistent progress if diamonds changed
      if (rewards.diamonds > 0) {
        window.GameState.gold += rewards.gold;
        window.GameState.diamonds += rewards.diamonds;
        // Call central save function (saves locally and cloud if logged in)
         if(window.Shop && window.Shop.savePersistentProgress) {
             window.Shop.savePersistentProgress('warriorDiamonds', window.GameState.diamonds);
         } else { console.error("Shop.savePersistentProgress not found!"); }
        window.UI.updateFooter(); // Update UI immediately
      } else if (rewards.gold > 0) {
          // Only gold increased, just update GameState and UI
          window.GameState.gold += rewards.gold;
          window.UI.updateFooter();
      }


      // Remove dead units from arrays
      unitsToRemove.forEach(i => this.units.splice(i, 1));
      enemyUnitsToRemove.forEach(i => this.enemyUnits.splice(i, 1));

      // Update grid if any units died or moved cells
      if (needsGridUpdate) {
        try { this.updateGrid(); }
        catch (e) { console.error("Grid update failed:", e); window.UI.showFeedback("Error updating unit positions!"); }
      }

      // --- Drawing ---
      window.Canvas.ctx.clearRect(0, 0, window.Canvas.canvas.width, window.Canvas.canvas.height);
      // Draw bases (calculate player max health dynamically)
      const playerMaxHealth = 150 + (window.GameState.baseHealthUpgrades * 25);
      window.Canvas.drawBase(60, "#3b5998", window.GameState.baseHealth, playerMaxHealth, window.GameState.baseDefenseUpgrades);
      // Enemy base health isn't upgraded
      window.Canvas.drawBase(740, "#dc3545", window.GameState.enemyBaseHealth, 150, 0);

      // Ally Unit Update Loop
      for (let i = 0; i < this.units.length; i++) {
         const unit = this.units[i];
         updateSingleUnit(unit, true, this.units, this.enemyUnits); // Update logic
         window.Canvas.drawUnit(unit); // Draw updated unit
      }

      // Enemy Unit Update Loop - Check for game over signal
       let gameOverTriggered = false;
       for (let i = 0; i < this.enemyUnits.length; i++) {
         const unit = this.enemyUnits[i];
         const updateResult = updateSingleUnit(unit, false, this.units, this.enemyUnits); // Update logic
         window.Canvas.drawUnit(unit); // Draw updated unit
         if (updateResult === 'GameOver') {
             gameOverTriggered = true;
             // Don't break; let others finish logic/drawing for this frame.
         }
       }

       // Draw animations after all units are drawn
       window.Canvas.renderAnimations();

       // If game over was triggered during enemy updates, stop further processing
       if (gameOverTriggered) {
           console.log("Game Over detected during enemy update loop.");
           // Game.js loop driver will stop based on GameState.gameOver flag set by showGameOverModal
           return;
       }


      // --- Handle Wave End ---
      if (window.GameState.enemyBaseHealth <= 0 && !window.GameState.gameOver) {
        console.log(`Enemy base destroyed! Advancing to wave ${window.GameState.wave + 1}`);
        window.GameState.wave++;
        window.GameState.waveStarted = false;
        // Award wave clear resources
        window.GameState.gold += 20 + Math.floor(window.GameState.wave * 2);
        window.GameState.diamonds += 5; // Base diamond reward per wave clear
        // Reset for next wave
        window.GameState.enemyBaseHealth = 150;
        this.units = []; // Clear remaining player units
        this.enemyUnits = []; // Clear remaining enemy units
        this.updateGrid(); // Clear grid

        // Save persistent progress (includes new diamonds)
         if(window.Shop && window.Shop.savePersistentProgress) {
             window.Shop.savePersistentProgress('warriorDiamonds', window.GameState.diamonds);
         } else { console.error("Shop.savePersistentProgress not found!"); }

        // Update UI
        window.UI.updateFooter();
        window.UI.drawWaveProgress();

        // Start next wave or declare victory
        if (window.GameState.gameActive) {
           if (window.GameState.wave <= window.GameState.maxWaves) {
               this.spawnWave(window.GameState.wave); // Spawn next wave immediately
               window.UI.showFeedback(`Wave ${window.GameState.wave} started! +5💎`);
           } else {
               window.UI.showGameOverModal("Victory!");
               return; // Victory, stop update loop
           }
        }
      }

      // Final check for player base destruction (should be redundant but safe)
      if (window.GameState.baseHealth <= 0 && !window.GameState.gameOver) {
        console.warn("Player base destroyed check in main loop triggered - should have been caught earlier.");
        if (!window.GameState.gameOver) window.UI.showGameOverModal("Defeat!");
        return; // Stop update loop
      }

      // Loop continues via Game.js requestAnimationFrame driver

    } catch (e) {
      console.error("Error in Units.update:", e);
      if(window.UI) window.UI.showFeedback("Game error occurred. Please check console and consider restarting.");
      // Let Game.js loop handle stopping if necessary
    }
  }; // End of Units.update


  window.Units = Units;
})();
