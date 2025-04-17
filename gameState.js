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
  // --- New Property ---
  GameState.isKnightUnlocked = false; // Knight starts locked

  // Initialize Game
  GameState.initGame = function () {
    console.log("Initializing game state");

    // Load saved upgrades first
    this.loadUpgrades(); // Moved loading here to ensure it happens before calculations

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
    this.gold = 50; // Start with some gold
    // Load diamonds (keep existing logic)
    this.diamonds = localStorage.getItem('warriorDiamonds') ? parseInt(localStorage.getItem('warriorDiamonds')) : 100;
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

    // Ensure UI updates happen after state is set
    window.UI.updateFooter();
    window.UI.updateUnitSelectionUI(); // May need selectedUnitType reset if not default
    window.UI.updateUnitInfoPanel();
    window.UI.updateUpgradesDisplay();
    window.UI.updateButtonStates();
    window.UI.updateKnightButtonState(); // Update knight button based on loaded state
  };

  // Load saved upgrades (centralized function)
  GameState.loadUpgrades = function() {
    try {
      this.baseHealthUpgrades = parseInt(localStorage.getItem('warriorBaseHealthUpgrades')) || 0;
      this.unitHealthUpgrades = parseInt(localStorage.getItem('warriorUnitHealthUpgrades')) || 0;
      this.goldProductionUpgrades = parseInt(localStorage.getItem('warriorGoldProdUpgrades')) || 0;
      this.unitDamageUpgrades = parseInt(localStorage.getItem('warriorUnitDamageUpgrades')) || 0;
      this.baseDefenseUpgrades = parseInt(localStorage.getItem('warriorBaseDefenseUpgrades')) || 0;
      // --- Load Knight Unlock State ---
      this.isKnightUnlocked = localStorage.getItem('warriorKnightUnlocked') === 'true';
      console.log("Loaded Knight Unlocked State:", this.isKnightUnlocked);

    } catch (e) {
      console.error("Failed to access localStorage for upgrades:", e);
      // Reset to defaults if loading fails? Or just log error.
      this.baseHealthUpgrades = 0;
      this.unitHealthUpgrades = 0;
      this.goldProductionUpgrades = 0;
      this.unitDamageUpgrades = 0;
      this.baseDefenseUpgrades = 0;
      this.isKnightUnlocked = false;
      window.UI.showFeedback("Error loading saved upgrades.");
    }
  };

  // --- New Function ---
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
            // Should we revert the state if saving fails? Maybe not, UI will update anyway.
        }
        // IMPORTANT: Trigger a UI update after changing the state
        if (typeof window.UI !== 'undefined' && window.UI.updateKnightButtonState) {
             window.UI.updateKnightButtonState(); // Call the UI update function
        } else {
            console.warn("UI.updateKnightButtonState function not found. UI might not reflect unlock.");
        }
        // Update shop display as the unlock item should disappear
        if (typeof window.Shop !== 'undefined' && window.Shop.updateShop) {
            window.Shop.updateShop();
        }
        // Update upgrades display in pause menu
         if (typeof window.UI !== 'undefined' && window.UI.updateUpgradesDisplay) {
            window.UI.updateUpgradesDisplay();
        }
    }
  };
  // --- End New Function ---

  // Expose GameState
  window.GameState = GameState;
})();
