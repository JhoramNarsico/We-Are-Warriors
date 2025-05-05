// --- START OF FILE game.js ---

(function () {
  const Game = {};

  Game.gameLoopRunning = false; // Track if the loop is active

  Game.init = function () {
    console.log("Initializing game...");

    // --- Firebase Auth/Firestore Initialization happens within auth.js ---
    // We just need to ensure Auth and Leaderboard modules are loaded and run their setup

    // 1. Setup Auth UI and State Listener (Must happen after DOM is ready)
    // This also initializes the Firebase app and gets Auth/Firestore instances
    if (typeof Auth !== 'undefined' && Auth.setupAuthUI) {
        Auth.setupAuthUI(); // Sets up forms and the crucial onAuthStateChanged listener
    } else {
        console.error("Auth module failed to load or setupAuthUI function missing!");
        if(window.UI) window.UI.showFeedback("Error: Online features unavailable!");
    }

    // 2. Initialize Leaderboard Module (tries to get DB reference from Auth)
     if (typeof Leaderboard !== 'undefined' && Leaderboard.init) {
         Leaderboard.init();
     } else {
         console.error("Leaderboard module failed to load or init function missing!");
     }


    // 3. Check for saved game state (local save) AFTER auth listener potentially runs
    const hasSavedGame = localStorage.getItem('warriorGameState') !== null;

    // 4. Initialize Game State (This will use Auth.currentUser if set by the listener)
    // It also loads local save if `hasSavedGame` is true
    window.GameState.initGame(hasSavedGame);


    // 5. Setup Canvas
    // Wait briefly for potential resize calculations based on initial viewport
    setTimeout(() => {
         if (window.Canvas && window.Canvas.resizeCanvas) {
            window.Canvas.resizeCanvas();
        } else {
             console.error("Canvas module not loaded or resizeCanvas function missing!");
        }
    }, 50); // Short delay


    // 6. Initialize UI Elements and States (dependent on GameState)
    if (window.UI) {
        window.UI.checkAudioFiles();
        window.UI.updateFooter();
        window.UI.updateButtonStates(); // Ensure buttons reflect initial login/game state
        window.UI.updateKnightButtonState();
        window.UI.addTooltips();
        window.UI.updateUnitSelectionUI();
        window.UI.updateUnitInfoPanel();
        window.UI.updateUpgradesDisplay();
        window.UI.drawWaveProgress();
        window.UI.updateBackgroundMusicState(); // Set initial music state
    } else {
        console.error("UI module not loaded!");
    }


    // 7. Initialize Shop (dependent on GameState for diamonds/upgrades)
    if (window.Shop && window.Shop.updateShop) {
      const shop = document.getElementById("shop");
      const toggleShopButton = document.getElementById("toggleShopButton");
      if (shop) shop.style.display = "none"; // Explicitly hide shop on init
      if(toggleShopButton) toggleShopButton.textContent = "Show Shop";
      window.Shop.updateShop(); // Initial shop update
    } else {
      console.error("Shop module not loaded or updateShop function missing!");
      if(window.UI) window.UI.showFeedback("Error: Shop module unavailable!");
    }

    // 8. Initialize Event Listeners (now includes leaderboard button, auth form listeners via Auth.js)
     if (window.Events && window.Events.init) {
        window.Events.init();
    } else {
         console.error("Events module not loaded or init function missing!");
    }


    // 9. Show Tutorial (Only if NO *local* saved game exists)
    // Auth state doesn't determine if tutorial shows, only local save does.
    if (!hasSavedGame && window.UI && window.UI.showTutorial) {
        window.UI.showTutorial();
    } else {
        // If loaded game or tutorial element missing, ensure tutorial is hidden
        if (window.UI && window.UI.tutorialModal) window.UI.tutorialModal.style.display = 'none';
        if (hasSavedGame) console.log("Skipping tutorial due to saved game.");
    }


    console.log("Game initialization complete.");
  };

  Game.startGameUpdateLoop = function () {
    if (this.gameLoopRunning) {
      console.log("Game loop already running.");
      return;
    }
    if (!window.Units || !window.Units.update) {
        console.error("Units module not ready to start game loop!");
        if(window.UI) window.UI.showFeedback("Error starting game loop!");
        return;
    }
    console.log("Starting game update loop");
    this.gameLoopRunning = true;
    // Use requestAnimationFrame for the loop driver
    const gameLoop = (timestamp) => {
        if (!this.gameLoopRunning) return; // Stop loop if flag is set to false

        window.Units.update(); // Run the unit update logic

        // Check if still running after update (game over might stop it)
        if (this.gameLoopRunning) {
            requestAnimationFrame(gameLoop); // Schedule the next frame
        }
    };
    requestAnimationFrame(gameLoop); // Start the loop
  };

  // Initialize the game when the window loads
  window.addEventListener("load", () => {
    Game.init();
  });

  window.Game = Game;
})();
// --- END OF FILE game.js ---