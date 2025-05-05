// --- START OF FILE game.js ---

(function () {
  const Game = {};

  Game.gameLoopRunning = false; // Track if the main game update loop is active

  // Initialize the game asynchronously, handling dependencies and auth
  Game.init = async function () { // <--- Added async
    console.log("Initializing game...");

    // 1. Setup Auth UI and State Listener (crucial first step)
    if (typeof Auth !== 'undefined' && Auth.setupAuthUI) {
        Auth.setupAuthUI(); // Sets up forms and the onAuthStateChanged listener
    } else {
        console.error("Auth module failed to load or setupAuthUI function missing!");
        // Attempt to show feedback if UI is loaded, otherwise log
        if(window.UI && window.UI.showFeedback) {
             window.UI.showFeedback("Error: Online features unavailable!");
        } else {
             console.error("UI module not available to show feedback.");
        }
        // Stop initialization if auth fails
        return;
    }

     // 2. Initialize Leaderboard Module (depends on Auth providing DB)
     if (typeof Leaderboard !== 'undefined' && Leaderboard.init) {
         Leaderboard.init();
     } else {
          console.error("Leaderboard module failed to load or init function missing!");
     }


    // 3. Wait for the initial authentication check and potential cloud data load
    // This ensures GameState has the correct user/progress before proceeding
    console.log("Waiting for initial authentication check...");
    if (typeof Auth === 'undefined' || !Auth.initialAuthCheckPromise) {
         console.error("Auth module or initial promise missing! Cannot proceed.");
         // Potentially show error and stop
          if(window.UI) window.UI.showFeedback("Error initializing authentication.");
         return;
    }
    try {
        await Auth.initialAuthCheckPromise; // <--- Wait here
        console.log("Initial authentication check complete. Proceeding with game initialization.");
    } catch (error) {
        console.error("Error during initial authentication check:", error);
        // Handle error? Maybe proceed with local data? For now, log and potentially stop.
         if(window.UI) window.UI.showFeedback("Error checking login status.");
        return;
    }
    // At this point, Auth.loadUserProgressFromCloud() should have run if the user was logged in.


    // 4. Check for local save file (used for offline/logged-out state *and* tutorial skip)
    const hasSavedGame = localStorage.getItem('warriorGameState') !== null;

    // 5. Initialize Game State
    // GameState.initGame now uses GameState.currentUser (set by auth listener)
    // to decide whether to use cloud data or load local progress/session.
     if (!window.GameState || !window.GameState.initGame) {
          console.error("GameState module or initGame function missing! Cannot initialize game state.");
          return;
     }
     // Initialize game state. It will internally check GameState.currentUser.
     // We pass 'false' here because we only want to load local *mid-game* state
     // if the user explicitly clicks "Load Game" (e.g., from tutorial).
     // Basic init will load local *persistent* progress if not logged in.
    window.GameState.initGame(false);


    // 6. Setup Canvas
     if (window.Canvas && window.Canvas.resizeCanvas) {
         // Brief delay to allow layout calculations after potential UI shifts from login state
         await new Promise(resolve => setTimeout(resolve, 50));
         window.Canvas.resizeCanvas();
     } else {
          console.error("Canvas module not loaded or resizeCanvas function missing!");
     }


    // 7. Initialize UI Elements and States
    // This runs *after* GameState is initialized with either cloud or local data.
    if (window.UI) {
        UI.checkAudioFiles(); // Check audio file paths
        // Update all relevant UI components based on the initialized GameState
        window.UI.updateFooter();
        window.UI.updateButtonStates();
        window.UI.updateKnightButtonState();
        window.UI.addTooltips();
        window.UI.updateUnitSelectionUI(); // Includes updating info panel
        window.UI.updateUpgradesDisplay();
        window.UI.drawWaveProgress();
        window.UI.updateBackgroundMusicState(); // Set initial music based on state
    } else {
         console.error("UI module not loaded! Cannot update interface.");
    }


    // 8. Initialize Shop
    // updateShop depends on GameState (diamonds, unlocks) being correctly initialized.
    if (window.Shop && window.Shop.updateShop) {
      const shopElement = document.getElementById("shop");
      const toggleShopButton = document.getElementById("toggleShopButton");
      if (shopElement) shopElement.style.display = "none"; // Start hidden
      if(toggleShopButton) toggleShopButton.textContent = "Show Shop";
      window.Shop.updateShop(); // Populate shop based on GameState
       if(window.Shop.updateGoldProduction) { window.Shop.updateGoldProduction(); } // Ensure interval is set correctly
    } else {
       console.error("Shop module not loaded or updateShop function missing!");
       if(window.UI) window.UI.showFeedback("Error: Shop module unavailable!");
    }

    // 9. Initialize Event Listeners (Should be loaded after other modules)
     if (window.Events && window.Events.init) {
        window.Events.init();
    } else {
          console.error("Events module not loaded or init function missing!");
     }


    // 10. Show Tutorial (Only if NO *local* save exists, regardless of login status)
    // The user can log in/sign up from within the tutorial modal.
    // hasSavedGame checks for 'warriorGameState', indicating a session was played.
    if (!hasSavedGame && window.UI && window.UI.showTutorial) {
        window.UI.showTutorial();
    } else {
        // Ensure tutorial is hidden if a local save exists or tutorial UI is missing
        if (window.UI && window.UI.tutorialModal) window.UI.tutorialModal.style.display = 'none';
        if (hasSavedGame) console.log("Skipping tutorial due to existing local saved game state.");
         // Make sure music state is correct if tutorial skipped
         if (window.UI) window.UI.updateBackgroundMusicState();
    }


    console.log("Game initialization complete.");
  }; // End of Game.init


  // Starts the main game update loop using requestAnimationFrame
  Game.startGameUpdateLoop = function () { /* ... remains same ... */
    if (this.gameLoopRunning) {
      console.log("Game loop already running.");
      return;
    }
    // Ensure Units module and its update function are available
    if (!window.Units || !window.Units.update) {
        console.error("Units module or update function not ready to start game loop!");
        if(window.UI) window.UI.showFeedback("Error starting game loop!");
        return;
    }

    console.log("Starting game update loop");
    this.gameLoopRunning = true;

    // Define the loop function
    const gameLoop = (timestamp) => {
        // Stop the loop if the flag is set to false (e.g., by game over)
        if (!this.gameLoopRunning) {
            console.log("Game loop stopped.");
            return;
        }

        // Run the core game logic update (movement, attacks, etc.)
        window.Units.update();

        // Schedule the next frame if the loop should continue
        if (this.gameLoopRunning) {
            requestAnimationFrame(gameLoop);
        }
    };

    // Start the loop
    requestAnimationFrame(gameLoop);
  };

  // Add event listener to start the game initialization when the window loads
  window.addEventListener("load", () => {
    Game.init(); // Call the async init function
  });

  // Expose the Game object globally
  window.Game = Game;
})();
// --- END OF FILE game.js ---