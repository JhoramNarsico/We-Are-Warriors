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
  GameState.baseHealth = 150;
  GameState.enemyBaseHealth = 150;
  GameState.gameOver = false;
  GameState.gold = 0;
  GameState.diamonds = 0;
  GameState.goldProductionRate = 800;
  GameState.goldInterval = null;
  GameState.baseHealthUpgrades = 0;
  GameState.unitHealthUpgrades = 0;
  GameState.goldProductionUpgrades = 0;
  GameState.unitDamageUpgrades = 0;
  GameState.baseDefenseUpgrades = 0;
  GameState.isKnightUnlocked = false;
  GameState.currentUser = null; // ADDED: To store { uid, email }

  // Initialize Game
  GameState.initGame = function (loadSaved = false) {
    console.log("Initializing game state, loadSaved:", loadSaved);
    // Check auth state (Auth listener in auth.js runs independently and sets GameState.currentUser)
    if (typeof Auth === 'undefined' || !Auth.auth) {
        console.warn("Auth module not ready during GameState.initGame.");
    } else {
        // Auth listener will set GameState.currentUser if already logged in
        console.log("Current user state during initGame:", GameState.currentUser);
    }


    if (!loadSaved) {
      // Load saved upgrades first for new game
      this.loadUpgrades();

      this.wave = 1;
      this.baseHealth = 150 + (this.baseHealthUpgrades * 25);
      this.enemyBaseHealth = 150;
      this.gameOver = false;
      this.gameActive = false;
      this.gamePaused = false;
      this.waveStarted = false;
      this.waveCooldown = false;
      this.waveCooldownTimer = 0;
      window.Units.units = [];
      window.Units.enemyUnits = [];
      this.gold = 50;
      // Load diamonds from local storage first, even for a new game
      this.diamonds = localStorage.getItem('warriorDiamonds') ? parseInt(localStorage.getItem('warriorDiamonds')) : 100;
    } else {
      // Load saved game state (local save)
      this.loadGame();
    }

    try {
      localStorage.setItem('warriorDiamonds', this.diamonds);
    } catch (e) {
      console.error("Failed to save diamonds:", e);
      window.UI.showFeedback("Storage unavailable, progress won't save.");
    }

    if (this.waveCooldownInterval) {
      clearInterval(this.waveCooldownInterval);
      this.waveCooldownInterval = null;
      window.UI.hideWaveCooldown();
    }
    this.goldProductionRate = Math.max(300, 800 - (this.goldProductionUpgrades * 50));
    clearInterval(this.goldInterval);
    this.goldInterval = setInterval(() => {
      if (this.gameActive && !this.gameOver && !this.gamePaused) {
        this.gold += 1 + Math.floor(this.wave / 5);
        window.UI.updateFooter();
      }
    }, this.goldProductionRate);

    window.UI.updateFooter();
    window.UI.updateUnitSelectionUI();
    window.UI.updateUnitInfoPanel();
    window.UI.updateUpgradesDisplay();
    window.UI.updateButtonStates(); // Needs to update based on potential login status now
    window.UI.updateKnightButtonState();
  };

  // Load saved upgrades
  GameState.loadUpgrades = function() {
    try {
      this.baseHealthUpgrades = parseInt(localStorage.getItem('warriorBaseHealthUpgrades')) || 0;
      this.unitHealthUpgrades = parseInt(localStorage.getItem('warriorUnitHealthUpgrades')) || 0;
      this.goldProductionUpgrades = parseInt(localStorage.getItem('warriorGoldProdUpgrades')) || 0;
      this.unitDamageUpgrades = parseInt(localStorage.getItem('warriorUnitDamageUpgrades')) || 0;
      this.baseDefenseUpgrades = parseInt(localStorage.getItem('warriorBaseDefenseUpgrades')) || 0;
      this.isKnightUnlocked = localStorage.getItem('warriorKnightUnlocked') === 'true';
      console.log("Loaded Knight Unlocked State:", this.isKnightUnlocked);
    } catch (e) {
      console.error("Failed to access localStorage for upgrades:", e);
      this.baseHealthUpgrades = 0;
      this.unitHealthUpgrades = 0;
      this.goldProductionUpgrades = 0;
      this.unitDamageUpgrades = 0;
      this.baseDefenseUpgrades = 0;
      this.isKnightUnlocked = false;
      window.UI.showFeedback("Error loading saved upgrades.");
    }
  };

  // Save game state (local save only for now)
  GameState.saveGame = function() {
    try {
      const gameState = {
        wave: this.wave,
        baseHealth: this.baseHealth,
        enemyBaseHealth: this.enemyBaseHealth,
        gold: this.gold,
        diamonds: this.diamonds, // Keep saving diamonds locally too
        baseHealthUpgrades: this.baseHealthUpgrades,
        unitHealthUpgrades: this.unitHealthUpgrades,
        goldProductionUpgrades: this.goldProductionUpgrades,
        unitDamageUpgrades: this.unitDamageUpgrades,
        baseDefenseUpgrades: this.baseDefenseUpgrades,
        isKnightUnlocked: this.isKnightUnlocked,
        selectedUnitType: window.Units.selectedUnitType ? window.Units.selectedUnitType.name : "BARBARIAN"
      };
      localStorage.setItem('warriorGameState', JSON.stringify(gameState));
      console.log("Game state saved locally:", gameState);
      window.UI.showFeedback("Game progress saved!");
    } catch (e) {
      console.error("Failed to save game state:", e);
      window.UI.showFeedback("Error saving game progress.");
    }
  };

  // Load game state (local save only for now)
  GameState.loadGame = function() {
    try {
      const savedState = localStorage.getItem('warriorGameState');
      if (savedState) {
        const state = JSON.parse(savedState);
        this.wave = state.wave || 1;
        this.baseHealth = state.baseHealth || 150;
        this.enemyBaseHealth = state.enemyBaseHealth || 150;
        this.gold = state.gold || 50;
        this.diamonds = state.diamonds || parseInt(localStorage.getItem('warriorDiamonds')) || 100; // Prioritize state save, then local storage, then default
        this.baseHealthUpgrades = state.baseHealthUpgrades || 0;
        this.unitHealthUpgrades = state.unitHealthUpgrades || 0;
        this.goldProductionUpgrades = state.goldProductionUpgrades || 0;
        this.unitDamageUpgrades = state.unitDamageUpgrades || 0;
        this.baseDefenseUpgrades = state.baseDefenseUpgrades || 0;
        this.isKnightUnlocked = state.isKnightUnlocked || false;
        window.Units.selectedUnitType = window.Units.UNIT_TYPES[state.selectedUnitType] || window.Units.UNIT_TYPES.BARBARIAN;
        window.Units.units = [];
        window.Units.enemyUnits = [];
        this.gameOver = false;
        this.gameActive = false;
        this.gamePaused = false;
        this.waveStarted = false;
        this.waveCooldown = false;
        this.waveCooldownTimer = 0;
        console.log("Local game state loaded:", state);
        window.UI.showFeedback("Game progress loaded!");
      } else {
        console.log("No saved local game state found.");
        window.UI.showFeedback("No saved game found!");
        this.initGame(); // Fallback to default initialization (which loads upgrades)
      }
    } catch (e) {
      console.error("Failed to load game state:", e);
      window.UI.showFeedback("Error loading game progress.");
      this.initGame(); // Fallback to default initialization
    }
  };

  // Reset game for new game (clears local storage)
  GameState.resetGame = function() {
    try {
      localStorage.removeItem('warriorGameState');
      localStorage.removeItem('warriorDiamonds');
      localStorage.removeItem('warriorBaseHealthUpgrades');
      localStorage.removeItem('warriorUnitHealthUpgrades');
      localStorage.removeItem('warriorGoldProdUpgrades');
      localStorage.removeItem('warriorUnitDamageUpgrades');
      localStorage.removeItem('warriorBaseDefenseUpgrades');
      localStorage.removeItem('warriorKnightUnlocked');
      localStorage.removeItem('warriorUnitDamage');
      console.log("Local game state and upgrades reset.");
      window.UI.showFeedback("New game started!");
      // Re-initialize with default values, but keep any logged-in user state
      const currentUserBeforeReset = this.currentUser;
      this.initGame();
      this.currentUser = currentUserBeforeReset; // Restore user info after reset
      // Explicitly update UI elements after reset
      window.UI.updateFooter();
      window.UI.updateUnitSelectionUI();
      window.UI.updateUnitInfoPanel();
      window.UI.updateUpgradesDisplay();
      window.UI.updateButtonStates();
      window.UI.updateKnightButtonState();
      window.UI.drawWaveProgress();
      if(window.Shop) window.Shop.updateShop();


    } catch (e) {
      console.error("Failed to reset game state:", e);
      window.UI.showFeedback("Error starting new game.");
    }
  };

  // Unlock Knight
  GameState.unlockKnight = function() {
    if (!this.isKnightUnlocked) {
      this.isKnightUnlocked = true;
      console.log("Knight Unlocked!");
      try {
        localStorage.setItem('warriorKnightUnlocked', 'true');
        console.log("Saved Knight Unlocked state to localStorage.");
      } catch (e) {
        console.error("Failed to save knight unlock status:", e);
        window.UI.showFeedback("Storage error saving unlock.");
      }
      if (typeof window.UI !== 'undefined' && window.UI.updateKnightButtonState) {
        window.UI.updateKnightButtonState();
      } else {
        console.warn("UI.updateKnightButtonState function not found.");
      }
      if (typeof window.Shop !== 'undefined' && window.Shop.updateShop) {
        window.Shop.updateShop();
      }
      if (typeof window.UI !== 'undefined' && window.UI.updateUpgradesDisplay) {
        window.UI.updateUpgradesDisplay();
      }
    }
  };

  // Expose GameState
  window.GameState = GameState;
})();
// --- END OF FILE gameState.js ---