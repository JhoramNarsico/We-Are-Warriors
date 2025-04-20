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
    window.UI.checkAudioFiles();
    window.UI.updateFooter();
    window.UI.updateButtonStates();
    window.UI.updateKnightButtonState();
    window.UI.addTooltips();
    window.UI.updateUnitSelectionUI();
    window.UI.updateUnitInfoPanel();
    window.UI.updateUpgradesDisplay();
    window.UI.drawWaveProgress();

    // 5. Initialize Shop
    if (window.Shop && window.Shop.updateShop) {
      const shop = document.getElementById("shop");
      shop.style.display = "none"; // Explicitly hide shop on init
      const toggleShopButton = document.getElementById("toggleShopButton");
      toggleShopButton.textContent = "Show Shop"; // Ensure button text is correct
      window.Shop.updateShop();
    } else {
      console.error("Shop module not loaded or updateShop function missing!");
      window.UI.showFeedback("Error: Shop module unavailable!");
    }

    // 6. Initialize Event Listeners
    window.Events.init();

    // 7. Show Tutorial
    window.UI.showTutorial();

    console.log("Game initialization complete.");
  };

  Game.startGameUpdateLoop = function () {
    if (this.gameLoopRunning) {
      console.log("Game loop already running.");
      return;
    }
    console.log("Starting game update loop");
    this.gameLoopRunning = true;
    window.Units.update();
  };

  Game.gameLoopRunning = false;

  window.addEventListener("load", () => {
    Game.init();
  });

  window.Game = Game;
})();