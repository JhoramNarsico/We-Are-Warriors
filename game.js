(function () {
  const Game = {};

  Game.init = function () {
    console.log("Initializing game...");

    // 1. Check for saved game state
    const hasSavedGame = localStorage.getItem('warriorGameState') !== null;

    // 2. Initialize Game State
    window.GameState.initGame(hasSavedGame); // Load saved game if available

    // 3. Setup Canvas
    window.Canvas.resizeCanvas();

    // 4. Initialize UI Elements and States
    window.UI.checkAudioFiles(); // Check new audio files
    window.UI.updateFooter();
    window.UI.updateButtonStates();
    window.UI.updateKnightButtonState();
    window.UI.addTooltips();
    window.UI.updateUnitSelectionUI();
    window.UI.updateUnitInfoPanel();
    window.UI.updateUpgradesDisplay();
    window.UI.drawWaveProgress();
    // === ADDED: Ensure initial music state is correct (off) ===
    window.UI.updateBackgroundMusicState();
    // ========================================================

    // 5. Initialize Shop
    if (window.Shop && window.Shop.updateShop) {
      const shop = document.getElementById("shop");
      shop.style.display = "none"; // Explicitly hide shop on init
      const toggleShopButton = document.getElementById("toggleShopButton");
      if(toggleShopButton) toggleShopButton.textContent = "Show Shop"; // Ensure button text is correct
      window.Shop.updateShop();
    } else {
      console.error("Shop module not loaded or updateShop function missing!");
      window.UI.showFeedback("Error: Shop module unavailable!");
    }

    // 6. Initialize Event Listeners
    window.Events.init();

    // 7. Show Tutorial (Only if NO saved game exists)
    if (!hasSavedGame) {
        window.UI.showTutorial();
    } else {
        // If loaded game, ensure tutorial is hidden
        if (window.UI.tutorialModal) window.UI.tutorialModal.style.display = 'none';
        console.log("Skipping tutorial due to saved game.");
    }


    console.log("Game initialization complete.");
  };

  Game.startGameUpdateLoop = function () {
    if (this.gameLoopRunning) {
      console.log("Game loop already running.");
      return;
    }
    console.log("Starting game update loop");
    this.gameLoopRunning = true;
    window.Units.update(); // Start the first frame
  };

  Game.gameLoopRunning = false; // Track if the loop is active

  window.addEventListener("load", () => {
    Game.init();
  });

  window.Game = Game;
})();