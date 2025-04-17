(function () {
  const Game = {};

  Game.init = function () {
    console.log("Initializing game...");

    // 1. Initialize Game State (loads upgrades including knight status)
    window.GameState.initGame(); // This now calls loadUpgrades internally

    // 2. Setup Canvas
    window.Canvas.resizeCanvas(); // Initial resize

    // 3. Initialize UI Elements and States
    window.UI.checkAudioFiles(); // Check sounds early
    window.UI.updateFooter(); // Set initial gold/wave etc.
    window.UI.updateButtonStates(); // Set initial button disabled states
    window.UI.updateKnightButtonState(); // Set initial knight button state *after* GameState loaded it
    window.UI.addTooltips(); // Generate initial tooltips (will be updated by knight state)
    window.UI.updateUnitSelectionUI(); // Set default unit selection visual
    window.UI.updateUnitInfoPanel(); // Show default unit info
    window.UI.updateUpgradesDisplay(); // Show loaded upgrades in pause menu
    window.UI.drawWaveProgress(); // Set initial wave progress bar

    // 4. Initialize Shop (needs GameState loaded)
    if (window.Shop && window.Shop.updateShop) {
      window.Shop.updateShop(); // Populate shop based on current state (incl. knight unlock)
    } else {
      console.error("Shop module not loaded or updateShop function missing!");
      window.UI.showFeedback("Error: Shop module unavailable!");
    }

    // 5. Initialize Event Listeners
    window.Events.init();

    // 6. Show Tutorial (or start game directly if tutorial seen before?)
    // For now, always show tutorial on load
    window.UI.showTutorial();

    console.log("Game initialization complete. Waiting for tutorial completion or Fight button.");
    // Game loop (this.startGameLoop) should now be started by the Fight button event or tutorial completion
  };

  // Renamed to reflect it starts the core update loop, not the whole game logic
  Game.startGameUpdateLoop = function () {
      if (this.gameLoopRunning) {
          console.log("Game loop already running.");
          return;
      }
      console.log("Starting game update loop");
      this.gameLoopRunning = true;
      // Start the Units update cycle, which uses requestAnimationFrame
      window.Units.update();
  };

  // Flag to prevent multiple loop starts
  Game.gameLoopRunning = false;


  // Initialize the game setup when the window loads
  window.addEventListener("load", () => {
    Game.init();
  });

  // Expose Game object
  window.Game = Game;
})();
