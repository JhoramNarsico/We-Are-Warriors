(function () {
  const Events = {};

  Events.init = function () {

    // === ADDED: General Button Click Sound Listener ===
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        gameContainer.addEventListener('click', (e) => {
            // Check if the clicked element is a button and is not disabled
            const button = e.target.closest('button');
            if (button && !button.disabled) {
                window.UI.playButtonClickSound();
            }
        });
    } else {
        console.error("Game container not found for button click listener.");
    }
    // ===============================================

    window.UI.unitButtons.forEach(button => {
      button.addEventListener("click", () => {
        // Click sound handled by the general listener above
        const unitType = button.dataset.unit;
        // Ensure Knight cannot be selected if locked, even if button somehow enabled
        if (unitType === "KNIGHT" && !window.GameState.isKnightUnlocked) {
            window.UI.showFeedback("Knight is locked! Unlock in the Shop.");
            return;
        }
        window.Units.units.forEach(unit => unit.isSelected = false);
        window.Units.enemyUnits.forEach(unit => unit.isSelected = false);
        window.Units.selectedUnitType = window.Units.UNIT_TYPES[unitType];
        window.UI.updateUnitSelectionUI();
        console.log(`Selected unit: ${unitType}`);
      });
    });

    const spawnButton = document.getElementById("spawnButton");
    if (spawnButton) {
      spawnButton.addEventListener("click", () => {
        // Click sound handled by the general listener above
        window.Units.spawnUnit();
      });
    } else {
      console.error("Spawn button not found!");
    }

    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" && window.GameState.gameActive && !window.GameState.gamePaused && !window.GameState.gameOver) {
        e.preventDefault();
        // No sound for keydown spawn, but could add one if desired
        window.Units.spawnUnit();
      }
    });

    // Add hotkeys for unit selection (1: Barbarian, 2: Archer, 3: Horse, 4: Knight)
    document.addEventListener("keydown", (e) => {
      if (window.GameState.gamePaused || window.GameState.gameOver) return;

      let unitType = null;
      switch (e.code) {
        case "Digit1": unitType = "BARBARIAN"; break;
        case "Digit2": unitType = "ARCHER"; break;
        case "Digit3": unitType = "HORSE"; break;
        case "Digit4": unitType = "KNIGHT"; break;
        default: return;
      }

      if (unitType === "KNIGHT" && !window.GameState.isKnightUnlocked) {
        // No sound for feedback messages
        window.UI.showFeedback("Knight is locked! Unlock in the Shop.");
        return;
      }

      if (unitType && window.Units.UNIT_TYPES[unitType]) {
        e.preventDefault();
        // No sound for hotkey selection
        window.Units.units.forEach(unit => unit.isSelected = false);
        window.Units.enemyUnits.forEach(unit => unit.isSelected = false);
        window.Units.selectedUnitType = window.Units.UNIT_TYPES[unitType];
        window.UI.updateUnitSelectionUI();
        window.UI.showFeedback(`${unitType.charAt(0).toUpperCase() + unitType.slice(1).toLowerCase()} selected`);
        console.log(`Selected unit via hotkey: ${unitType}`);
      }
    });

    const fightButton = document.getElementById("fightButton");
    if (!fightButton) {
      console.error("Fight button not found!");
      window.UI.showFeedback("Error: Fight button not found!");
    } else {
      fightButton.addEventListener("click", () => {
        // Click sound handled by the general listener above
        try {
          console.log("Fight button clicked, gameActive:", window.GameState.gameActive, "gameOver:", window.GameState.gameOver);
          if (!window.GameState || !window.Units || !window.UI) {
            console.error("Required modules missing:", { GameState: !!window.GameState, Units: !!window.Units, UI: !!window.UI });
            window.UI.showFeedback("Game modules not loaded!");
            return;
          }
          if (window.GameState.gameOver) {
            window.GameState.initGame(); // Start a new game session
            window.UI.gameOverModal.style.display = "none";
            window.Game.gameLoopRunning = false; // Ensure loop isn't running yet
            window.UI.showFeedback("Starting new battle!");
            // Do NOT start wave/music here, wait for next click on Fight
            window.UI.updateButtonStates(); // Update buttons for the fresh state
            window.UI.updateBackgroundMusicState(); // Ensure music is off
            return; // Prevent starting wave immediately after restart
          }
          if (!window.GameState.gameActive && !window.GameState.waveCooldown) {
            window.GameState.gameActive = true;
            window.GameState.gamePaused = false; // Ensure not paused when starting
            window.Units.spawnWave(window.GameState.wave);
            window.UI.updateButtonStates();
            window.Game.startGameUpdateLoop();
            window.UI.showFeedback("Battle started!");
            // === ADDED: Update Music State ===
            window.UI.updateBackgroundMusicState();
            // =================================
          } else {
            console.log("Cannot start: gameActive or waveCooldown is true");
            window.UI.showFeedback("Cannot start battle: Game already active or wave cooldown active!");
          }
        } catch (e) {
          console.error("Fight button error:", e);
          window.UI.showFeedback("Error starting battle!");
        }
      });
    }

    const pauseButton = document.getElementById("pauseButton");
    if (pauseButton) {
      pauseButton.addEventListener("click", () => {
        // Click sound handled by the general listener above
        if (window.GameState.gameActive && !window.GameState.gameOver) {
          window.GameState.gamePaused = !window.GameState.gamePaused;
          window.UI.pauseMenu.style.display = window.GameState.gamePaused ? "flex" : "none";
          window.UI.pauseButton.textContent = window.GameState.gamePaused ? "Resume" : "Pause";
          window.UI.showFeedback(window.GameState.gamePaused ? "Game paused" : "Game resumed");
          window.UI.updateButtonStates();
          // === ADDED: Update Music State ===
          window.UI.updateBackgroundMusicState();
          // =================================
        }
      });
    }

    const surrenderButton = document.getElementById("surrenderButton");
    if (surrenderButton) {
      surrenderButton.addEventListener("click", () => {
        // Click sound handled by the general listener above
        if (window.GameState.gameActive && !window.GameState.gameOver) {
          window.UI.showGameOverModal("Surrendered!");
           // Music paused within showGameOverModal
        }
      });
    }

    const restartButton = document.getElementById("restartButton");
    if (restartButton) {
      restartButton.addEventListener("click", () => {
        // Click sound handled by the general listener above
        window.GameState.initGame(); // initGame will handle resetting state
        window.UI.gameOverModal.style.display = "none";
        window.UI.pauseMenu.style.display = "none";
        window.UI.showFeedback("Game restarted!");
        window.UI.updateButtonStates();
        // === ADDED: Update Music State (likely pause) ===
        window.UI.updateBackgroundMusicState();
        // ===============================================
      });
    }

    const soundToggleButton = document.getElementById("soundToggleButton");
    if (soundToggleButton) {
      soundToggleButton.addEventListener("click", () => {
        // Click sound handled by the general listener above
        window.GameState.soundEnabled = !window.GameState.soundEnabled;
        soundToggleButton.textContent = `Sound: ${window.GameState.soundEnabled ? "On" : "Off"}`;
        window.UI.showFeedback(`Sound ${window.GameState.soundEnabled ? "enabled" : "disabled"}`);
        // === ADDED: Update Music State ===
        window.UI.updateBackgroundMusicState();
        // =================================
      });
    }

    const resumeButton = document.getElementById("resumeButton");
    if (resumeButton) {
      resumeButton.addEventListener("click", () => {
        // Click sound handled by the general listener above
        if (!window.GameState.gameOver) { // Ensure game isn't over when resuming
            window.GameState.gamePaused = false;
            window.UI.pauseMenu.style.display = "none";
            window.UI.pauseButton.textContent = "Pause";
            window.UI.showFeedback("Game resumed");
            window.UI.updateButtonStates();
            // === ADDED: Update Music State ===
            window.UI.updateBackgroundMusicState();
            // =================================
        }
      });
    }


    const toggleShopButton = document.getElementById("toggleShopButton");
    if (toggleShopButton) {
      toggleShopButton.addEventListener("click", () => {
        // Click sound handled by the general listener above
        const shop = document.getElementById("shop");
        const willShow = shop.style.display === "none"; // Check if shop is currently hidden
        shop.style.display = willShow ? "block" : "none"; // Toggle display
        toggleShopButton.textContent = willShow ? "Hide Shop" : "Show Shop"; // Update button text
        window.UI.showFeedback(willShow ? "Shop shown" : "Shop hidden"); // Feedback based on action
      });
    }

    const surrenderPauseButton = document.getElementById("surrenderPauseButton");
    if (surrenderPauseButton) {
      surrenderPauseButton.addEventListener("click", () => {
        // Click sound handled by the general listener above
        if (window.GameState.gameActive && !window.GameState.gameOver) {
            window.UI.showGameOverModal("Surrendered!"); // Music paused within showGameOverModal
            window.UI.pauseMenu.style.display = "none";
        }
      });
    }


    const gameOverRestartButton = document.getElementById("gameOverRestartButton");
    if (gameOverRestartButton) {
      gameOverRestartButton.addEventListener("click", () => {
        // Click sound handled by the general listener above
        window.GameState.initGame(); // initGame handles reset
        window.UI.gameOverModal.style.display = "none";
        window.UI.showFeedback("Game restarted!");
        window.UI.updateButtonStates();
        // === ADDED: Update Music State (likely pause) ===
        window.UI.updateBackgroundMusicState();
        // ===============================================
      });
    }

    const gameOverShopButton = document.getElementById("gameOverShopButton");
    if (gameOverShopButton) {
      gameOverShopButton.addEventListener("click", () => {
        // Click sound handled by general listener
        window.UI.gameOverModal.style.display = "none";
        document.getElementById("shop").style.display = "block";
        document.getElementById("toggleShopButton").textContent = "Hide Shop"; // Ensure button text sync
        window.Shop.updateShop();
        window.UI.showFeedback("Shop opened");
      });
    }

    const startTutorialButton = document.getElementById("startTutorialButton");
    if (startTutorialButton) {
      startTutorialButton.addEventListener("click", () => {
        // Click sound handled by the general listener above
        window.UI.tutorialModal.style.display = "none";
        window.GameState.initGame(); // Resets state for a new game
        window.UI.showFeedback("Tutorial completed! Ready to fight!");
        window.UI.updateButtonStates();
        // === ADDED: Update Music State (likely pause) ===
         window.UI.updateBackgroundMusicState();
        // ===============================================
      });
    }


    const saveGameButton = document.getElementById("saveGameButton");
    if (saveGameButton) {
      saveGameButton.addEventListener("click", () => {
        // Click sound handled by the general listener above
        window.GameState.saveGame();
        // No change to music state needed for saving
        //window.UI.updateButtonStates(); // Update button states in case saving disables it? (Not needed here)
        window.UI.showFeedback("Game progress saved!"); // Give feedback
      });
    }

    const newGameButton = document.getElementById("newGameButton");
    if (newGameButton) {
      newGameButton.addEventListener("click", () => {
        // Click sound handled by the general listener above
        if (confirm("Are you sure you want to start a new game? All progress will be lost.")) {
          window.GameState.resetGame(); // resetGame calls initGame
          window.UI.pauseMenu.style.display = "none";
          window.UI.gameOverModal.style.display = "none";
          window.UI.updateButtonStates();
          window.UI.updateFooter();
          window.UI.updateUnitSelectionUI();
          window.UI.updateUnitInfoPanel();
          window.UI.updateUpgradesDisplay();
          window.Shop.updateShop();
          window.UI.drawWaveProgress();
           // === ADDED: Update Music State (likely pause) ===
          window.UI.updateBackgroundMusicState();
         // ===============================================
        }
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.code === "Escape" && !window.GameState.gameOver) { // Allow pause even if game not active yet
          if (window.GameState.gameActive) { // Only toggle if game is actually active
            // No sound for keydown pause/resume
            window.GameState.gamePaused = !window.GameState.gamePaused;
            window.UI.pauseMenu.style.display = window.GameState.gamePaused ? "flex" : "none";
            window.UI.pauseButton.textContent = window.GameState.gamePaused ? "Resume" : "Pause";
            window.UI.showFeedback(window.GameState.gamePaused ? "Game paused" : "Game resumed");
            window.UI.updateButtonStates();
            // === ADDED: Update Music State ===
            window.UI.updateBackgroundMusicState();
            // =================================
          } else if (window.UI.pauseMenu.style.display === 'flex') {
              // If pause menu is shown but game not active (e.g. after restart), Esc should hide it
              window.UI.pauseMenu.style.display = 'none';
              window.UI.showFeedback("Menu closed");
          }
      }
    });


    if (window.Canvas.canvas) {
      window.Canvas.canvas.addEventListener("contextmenu", (e) => {
        e.preventDefault();
      });
    }
  };

  window.Events = Events;
})();