// --- START OF FILE gameState.js ---

(function () {
  const GameState = {};

  // Game State Variables
  GameState.wave = 1;
  GameState.waveStarted = false;
  GameState.maxWaves = 20;
  GameState.gameActive = false;
  GameState.gamePaused = false;
  GameState.waveCooldown = false;
  GameState.waveCooldownTimer = 0;
  GameState.soundEnabled = true;
  GameState.waveCooldownInterval = null;
  GameState.baseHealth = 150; // Base value, upgrades add to this during init/load
  GameState.enemyBaseHealth = 150;
  GameState.gameOver = false;
  GameState.gold = 0;
  // --- Persistent state managed by cloud/local save ---
  GameState.diamonds = 100; // Default, overwritten by load
  GameState.baseHealthUpgrades = 0;
  GameState.unitHealthUpgrades = 0;
  GameState.goldProductionUpgrades = 0;
  GameState.unitDamageUpgrades = 0;
  GameState.baseDefenseUpgrades = 0;
  GameState.isKnightUnlocked = false;
  // --- End Persistent state ---
  GameState.goldProductionRate = 800; // Base value, calculated from upgrades
  GameState.goldInterval = null;
  GameState.currentUser = null; // Set by Auth.js

  // --- MODIFIED: Initialize Game ---
  // Now depends on Auth module having already loaded cloud data if user is logged in.
  GameState.initGame = function (loadLocalMidGameState = false) {
    console.log("Initializing game state. User:", this.currentUser ? this.currentUser.email : 'None', "Load Local Mid-Game:", loadLocalMidGameState);

    // Reset dynamic game state variables (wave, active flags, units, gold etc.)
    this.wave = 1;
    this.gameOver = false;
    this.gameActive = false;
    this.gamePaused = false;
    this.waveStarted = false;
    this.waveCooldown = false;
    this.waveCooldownTimer = 0;
    if (window.Units) { // Check if Units module is loaded
        window.Units.units = [];
        window.Units.enemyUnits = [];
        // Reset selected unit type to default
        window.Units.selectedUnitType = window.Units.UNIT_TYPES.BARBARIAN;
    } else {
        console.error("Units module not found during GameState init!");
    }
    this.gold = 50; // Starting gold for a new battle/session
    this.enemyBaseHealth = 150; // Reset enemy base health

    // Clear intervals
    if (this.waveCooldownInterval) clearInterval(this.waveCooldownInterval);
    if (this.goldInterval) clearInterval(this.goldInterval);
    this.waveCooldownInterval = null;
    this.goldInterval = null;

    // --- Load/Apply Persistent State ---
    if (this.currentUser) {
      // User is logged in. Assume Auth.loadUserProgressFromCloud() has already run via onAuthStateChanged
      // and populated diamonds, upgrades, isKnightUnlocked in GameState.
      // We just need to apply the effects of those loaded upgrades to derived stats.
      console.log("Logged in user - Applying loaded/default cloud progress to derived stats.");
      this.baseHealth = 150 + (this.baseHealthUpgrades * 25);
      this.goldProductionRate = Math.max(300, 800 - (this.goldProductionUpgrades * 50));
      // Diamonds and upgrade counts are already set by Auth.loadUserProgressFromCloud

    } else {
      // No user logged in. Load persistent progress (diamonds/upgrades) from local storage.
      console.log("No logged in user - Loading persistent progress from local storage.");
      this.loadLocalProgress(); // Load diamonds and upgrades locally

      // Apply locally loaded upgrades to derived stats for a NEW local game/session
      this.baseHealth = 150 + (this.baseHealthUpgrades * 25);
      this.goldProductionRate = Math.max(300, 800 - (this.goldProductionUpgrades * 50));

       // Load mid-game state (wave, gold, etc.) *only* if requested AND available
       // This happens *after* loading local persistent progress.
      if (loadLocalMidGameState) {
         console.log("Attempting to load local mid-game session state...");
         this.loadLocalMidGameState(); // Loads wave, gold, base health etc. OVERWRITING defaults if found
      } else {
         console.log("Starting a new local session (not loading mid-game state).");
         // Base health and gold rate are already set based on local upgrades.
         // Wave, gold, etc., remain at the defaults set earlier.
      }
    }

    // --- Setup Intervals (Using potentially updated goldProductionRate) ---
    this.goldInterval = setInterval(() => {
      if (this.gameActive && !this.gameOver && !this.gamePaused) {
        this.gold += 1 + Math.floor(this.wave / 5);
        if(window.UI) window.UI.updateFooter(); // Ensure UI exists
      }
    }, this.goldProductionRate);


    // --- Final UI Updates (Reflecting loaded cloud/local/default state) ---
    if (window.UI) {
        window.UI.updateFooter();
        window.UI.updateUnitSelectionUI();
        // window.UI.updateUnitInfoPanel(); // Called by updateUnitSelectionUI
        window.UI.updateUpgradesDisplay();
        window.UI.updateButtonStates();
        window.UI.updateKnightButtonState();
        window.UI.addTooltips();
        window.UI.hideWaveCooldown(); // Ensure cooldown display is hidden initially
        window.UI.drawWaveProgress(); // Reset wave progress bar
    }
     if (window.Shop) {
        window.Shop.updateShop(); // Update shop based on loaded diamonds/unlocks
        if(window.Shop.updateGoldProduction) {
             window.Shop.updateGoldProduction(); // Ensure gold production interval matches rate
        }
    }

     console.log("GameState initialized:", {
         wave: this.wave, gold: this.gold, diamonds: this.diamonds,
         baseHpUpg: this.baseHealthUpgrades, unitHpUpg: this.unitHealthUpgrades,
         goldUpg: this.goldProductionUpgrades, unitDmgUpg: this.unitDamageUpgrades,
         defUpg: this.baseDefenseUpgrades, knight: this.isKnightUnlocked,
         baseHealth: this.baseHealth, goldRate: this.goldProductionRate,
         currentUser: this.currentUser ? this.currentUser.email : 'None'
     });
  };

  // --- Load ONLY persistent progress from local storage ---
  GameState.loadLocalProgress = function() {
    console.log("Loading local persistent progress (diamonds, upgrades)...");
    try {
      // Load diamonds first
      this.diamonds = parseInt(localStorage.getItem('warriorDiamonds')) || 100;

      // Load upgrades
      this.baseHealthUpgrades = parseInt(localStorage.getItem('warriorBaseHealthUpgrades')) || 0;
      this.unitHealthUpgrades = parseInt(localStorage.getItem('warriorUnitHealthUpgrades')) || 0;
      this.goldProductionUpgrades = parseInt(localStorage.getItem('warriorGoldProdUpgrades')) || 0;
      this.unitDamageUpgrades = parseInt(localStorage.getItem('warriorUnitDamageUpgrades')) || 0;
      this.baseDefenseUpgrades = parseInt(localStorage.getItem('warriorBaseDefenseUpgrades')) || 0;
      this.isKnightUnlocked = localStorage.getItem('warriorKnightUnlocked') === 'true';
      console.log("Loaded local progress. Diamonds:", this.diamonds, "Knight Unlocked:", this.isKnightUnlocked);

    } catch (e) {
      console.error("Failed to access localStorage for local progress:", e);
      // Reset to defaults on error
      this.diamonds = 100;
      this.baseHealthUpgrades = 0;
      this.unitHealthUpgrades = 0;
      this.goldProductionUpgrades = 0;
      this.unitDamageUpgrades = 0;
      this.baseDefenseUpgrades = 0;
      this.isKnightUnlocked = false;
      if(window.UI) window.UI.showFeedback("Error loading local progress.");
    }
  };

  // --- Load mid-game session state (wave, gold, health) from local storage ---
  // Called only if NOT logged in and specifically requested (e.g., load game button)
  GameState.loadLocalMidGameState = function() {
      console.log("Loading local mid-game state (wave, gold, health)...");
      try {
          const savedState = localStorage.getItem('warriorGameState');
          if (savedState) {
              const state = JSON.parse(savedState);
              // Load ONLY non-persistent state here. Persistent stuff was loaded by loadLocalProgress.
              this.wave = state.wave || this.wave;
              this.baseHealth = state.baseHealth || this.baseHealth; // Use saved health if available
              this.enemyBaseHealth = state.enemyBaseHealth || this.enemyBaseHealth;
              this.gold = state.gold || this.gold;

              // Restore selected unit type if available
              if (window.Units && state.selectedUnitType && window.Units.UNIT_TYPES[state.selectedUnitType]) {
                 window.Units.selectedUnitType = window.Units.UNIT_TYPES[state.selectedUnitType];
              }

              console.log("Local mid-game state loaded:", { wave: this.wave, gold: this.gold, baseHealth: this.baseHealth });
              if(window.UI) window.UI.showFeedback("Loaded saved game session!");
              return true; // Indicate success
          } else {
              console.log("No saved local mid-game state found.");
              return false; // Indicate no mid-game state found
          }
      } catch (e) {
          console.error("Failed to load local mid-game state:", e);
          if(window.UI) window.UI.showFeedback("Error loading saved session.");
          return false; // Indicate failure
      }
  };

  // --- Save game state (local save - primarily for mid-game state now) ---
  GameState.saveGame = function() {
    // Saving persistent progress to cloud is handled by Shop.savePersistentProgress or Auth.signOutUser

    // Save current session state locally ONLY (wave, gold, current healths)
    // Also include persistent state as a backup for offline play
    try {
      const gameStateToSave = {
        // Mid-game state
        wave: this.wave,
        baseHealth: this.baseHealth, // Save current health
        enemyBaseHealth: this.enemyBaseHealth,
        gold: this.gold,
        selectedUnitType: window.Units && window.Units.selectedUnitType ? window.Units.selectedUnitType.name.toUpperCase() : "BARBARIAN",
        // Include persistent state in local save as a backup / for offline play
        diamonds: this.diamonds,
        baseHealthUpgrades: this.baseHealthUpgrades,
        unitHealthUpgrades: this.unitHealthUpgrades,
        goldProductionUpgrades: this.goldProductionUpgrades,
        unitDamageUpgrades: this.unitDamageUpgrades,
        baseDefenseUpgrades: this.baseDefenseUpgrades,
        isKnightUnlocked: this.isKnightUnlocked,
      };
      localStorage.setItem('warriorGameState', JSON.stringify(gameStateToSave));
      console.log("Mid-game state saved locally:", gameStateToSave);
      if(window.UI) window.UI.showFeedback("Game progress saved locally!");
    } catch (e) {
      console.error("Failed to save game state locally:", e);
      if(window.UI) window.UI.showFeedback("Error saving game progress locally.");
    }
  };

  // --- loadGame is now handled by initGame logic ---
  // Keep function stub? Or remove? Let's remove it to avoid confusion.
  // GameState.loadGame = function() {
  //     this.initGame(true); // Tell initGame to attempt loading local mid-game state
  // };

  // --- MODIFIED: Reset game (clears local storage, resets GameState, DOES NOT clear cloud) ---
  GameState.resetGame = function() {
    console.log("Resetting game (local state and current session)...");
    try {
      // Clear local storage related to game state and upgrades
      localStorage.removeItem('warriorGameState');
      localStorage.removeItem('warriorDiamonds');
      localStorage.removeItem('warriorBaseHealthUpgrades');
      localStorage.removeItem('warriorUnitHealthUpgrades');
      localStorage.removeItem('warriorGoldProdUpgrades');
      localStorage.removeItem('warriorUnitDamageUpgrades');
      localStorage.removeItem('warriorBaseDefenseUpgrades');
      localStorage.removeItem('warriorKnightUnlocked');

      console.log("Local game state and progress cleared from storage.");

      // Preserve current user info
      const currentUserBeforeReset = this.currentUser;

      // If logged out, reset persistent vars to defaults. If logged in, these will be overwritten by cloud load anyway.
      if (!currentUserBeforeReset) {
          this.diamonds = 100;
          this.baseHealthUpgrades = 0;
          this.unitHealthUpgrades = 0;
          this.goldProductionUpgrades = 0;
          this.unitDamageUpgrades = 0;
          this.baseDefenseUpgrades = 0;
          this.isKnightUnlocked = false;
      }

      // Call initGame to reset dynamic state and recalculate derived values.
      // initGame will handle logged-in vs logged-out logic again.
      // We pass 'false' to ensure it doesn't try to load a mid-game state we just deleted.
      this.initGame(false);

      if(window.UI) window.UI.showFeedback("New game started! Local progress cleared.");

      // Ensure UI is fully updated after reset and re-initialization (initGame handles most)
      // Additional check for modals might be needed
       if (window.UI && window.UI.gameOverModal) window.UI.gameOverModal.style.display = 'none';
       if (window.UI && window.UI.pauseMenu) window.UI.pauseMenu.style.display = 'none';


    } catch (e) {
      console.error("Failed to reset game state:", e);
      if(window.UI) window.UI.showFeedback("Error starting new game.");
    }
  };

  // --- MODIFIED: Unlock Knight - Save via Shop's method ---
  GameState.unlockKnight = function() {
    if (!this.isKnightUnlocked) {
      this.isKnightUnlocked = true;
      console.log("Knight Unlocked! (GameState updated)");
      // Saving (local + cloud) is now handled by Shop.savePersistentProgress call in shop.js

      // Update UI immediately
      if (window.UI) {
        window.UI.updateKnightButtonState();
        window.UI.updateUpgradesDisplay();
        window.UI.addTooltips(); // Update tooltip
        window.UI.updateUnitInfoPanel(); // Update info panel
      }
      if (window.Shop) {
        Shop.updateShop(); // Refresh shop to remove unlock button
      }
    }
  };

  // Expose GameState
  window.GameState = GameState;
})();
// --- END OF FILE gameState.js ---