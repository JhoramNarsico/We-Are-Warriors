(function () {
  const GameState = {};

  // Game State Variables
  GameState.wave = 1;
  GameState.waveStarted = false;
  GameState.maxWaves = 50;
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

  // Initialize Game
  GameState.initGame = function (loadSaved = false) {
    console.log("Initializing game state, loadSaved:", loadSaved);

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
      this.diamonds = localStorage.getItem('warriorDiamonds') ? parseInt(localStorage.getItem('warriorDiamonds')) : 100;
    } else {
      // Load saved game state
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
    window.UI.updateButtonStates();
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

  // Save game state
  GameState.saveGame = function() {
    try {
      const gameState = {
        wave: this.wave,
        baseHealth: this.baseHealth,
        enemyBaseHealth: this.enemyBaseHealth,
        gold: this.gold,
        diamonds: this.diamonds,
        baseHealthUpgrades: this.baseHealthUpgrades,
        unitHealthUpgrades: this.unitHealthUpgrades,
        goldProductionUpgrades: this.goldProductionUpgrades,
        unitDamageUpgrades: this.unitDamageUpgrades,
        baseDefenseUpgrades: this.baseDefenseUpgrades,
        isKnightUnlocked: this.isKnightUnlocked,
        selectedUnitType: window.Units.selectedUnitType ? window.Units.selectedUnitType.name : "BARBARIAN"
      };
      localStorage.setItem('warriorGameState', JSON.stringify(gameState));
      console.log("Game state saved:", gameState);
      window.UI.showFeedback("Game progress saved!");
    } catch (e) {
      console.error("Failed to save game state:", e);
      window.UI.showFeedback("Error saving game progress.");
    }
  };

  // Load game state
  GameState.loadGame = function() {
    try {
      const savedState = localStorage.getItem('warriorGameState');
      if (savedState) {
        const state = JSON.parse(savedState);
        this.wave = state.wave || 1;
        this.baseHealth = state.baseHealth || 150;
        this.enemyBaseHealth = state.enemyBaseHealth || 150;
        this.gold = state.gold || 50;
        this.diamonds = state.diamonds || 100;
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
        console.log("Game state loaded:", state);
        window.UI.showFeedback("Game progress loaded!");
      } else {
        console.log("No saved game state found.");
        window.UI.showFeedback("No saved game found!");
        this.initGame(); // Fallback to default initialization
      }
    } catch (e) {
      console.error("Failed to load game state:", e);
      window.UI.showFeedback("Error loading game progress.");
      this.initGame(); // Fallback to default initialization
    }
  };

  // Reset game for new game
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
      console.log("Game state and upgrades reset.");
      window.UI.showFeedback("New game started!");
      this.initGame();
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