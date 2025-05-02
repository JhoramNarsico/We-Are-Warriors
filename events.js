(function () {
  const Events = {};

  Events.init = function () {

    // === General Button Click Sound Listener ===
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

    // Unit Selection Buttons
    window.UI.unitButtons.forEach(button => {
      button.addEventListener("click", () => {
        // Click sound handled by the general listener above
        const unitType = button.dataset.unit;
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

    // Spawn Button
    const spawnButton = document.getElementById("spawnButton");
    if (spawnButton) {
      spawnButton.addEventListener("click", () => {
        // Click sound handled by the general listener above
        window.Units.spawnUnit();
      });
    } else {
      console.error("Spawn button not found!");
    }

    // Keydown Spawn (Space)
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" && window.GameState.gameActive && !window.GameState.gamePaused && !window.GameState.gameOver) {
        e.preventDefault();
        // No sound for keydown spawn
        window.Units.spawnUnit();
      }
    });

    // Keydown Unit Selection (Digits 1-4)
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

    // Fight Button
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
            window.GameState.initGame();
            window.UI.gameOverModal.style.display = "none";
            window.Game.gameLoopRunning = false;
            window.UI.showFeedback("Starting new battle!");
            window.UI.updateButtonStates();
            window.UI.updateBackgroundMusicState(); // Ensure music is off
            return;
          }
          if (!window.GameState.gameActive && !window.GameState.waveCooldown) {
            window.GameState.gameActive = true;
            window.GameState.gamePaused = false;
            window.Units.spawnWave(window.GameState.wave);
            window.UI.updateButtonStates();
            window.Game.startGameUpdateLoop();
            window.UI.showFeedback("Battle started!");
            window.UI.updateBackgroundMusicState(); // Start music
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

    // Pause Button
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
          window.UI.updateBackgroundMusicState(); // Update Music State
        }
      });
    }

    // Surrender Button (Footer)
    const surrenderButton = document.getElementById("surrenderButton");
    if (surrenderButton) {
      surrenderButton.addEventListener("click", () => {
        // Click sound handled by the general listener above
        if (window.GameState.gameActive && !window.GameState.gameOver) {
          window.UI.showGameOverModal("Surrendered!"); // Handles music pause
        }
      });
    }

    // Restart Button (Footer)
    const restartButton = document.getElementById("restartButton");
    if (restartButton) {
      restartButton.addEventListener("click", () => {
        // Click sound handled by the general listener above
        window.GameState.initGame();
        window.UI.gameOverModal.style.display = "none";
        window.UI.pauseMenu.style.display = "none";
        window.UI.showFeedback("Game restarted!");
        window.UI.updateButtonStates();
        window.UI.updateBackgroundMusicState(); // Ensure music stops/updates
      });
    }

    // Sound Toggle Button
    const soundToggleButton = document.getElementById("soundToggleButton");
    if (soundToggleButton) {
      soundToggleButton.addEventListener("click", () => {
        // Click sound handled by the general listener above
        window.GameState.soundEnabled = !window.GameState.soundEnabled;
        soundToggleButton.textContent = `Sound: ${window.GameState.soundEnabled ? "On" : "Off"}`;
        window.UI.showFeedback(`Sound ${window.GameState.soundEnabled ? "enabled" : "disabled"}`);
        window.UI.updateBackgroundMusicState(); // Update Music State
      });
    }

    // Resume Button (Pause Menu)
    const resumeButton = document.getElementById("resumeButton");
    if (resumeButton) {
      resumeButton.addEventListener("click", () => {
        window.UI.playButtonClickSound(); // Explicit sound for pause menu button
        if (!window.GameState.gameOver) {
            window.GameState.gamePaused = false;
            window.UI.pauseMenu.style.display = "none";
            window.UI.pauseButton.textContent = "Pause";
            window.UI.showFeedback("Game resumed");
            window.UI.updateButtonStates();
            window.UI.updateBackgroundMusicState(); // Ensure music resumes
        }
      });
    }

    // Toggle Shop Button
    const toggleShopButton = document.getElementById("toggleShopButton");
    if (toggleShopButton) {
      toggleShopButton.addEventListener("click", () => {
        // Click sound handled by the general listener above
        const shop = document.getElementById("shop");
        const willShow = shop.style.display === "none";
        shop.style.display = willShow ? "block" : "none";
        toggleShopButton.textContent = willShow ? "Hide Shop" : "Show Shop";
        window.UI.showFeedback(willShow ? "Shop shown" : "Shop hidden");
      });
    }

    // Surrender Button (Pause Menu)
    const surrenderPauseButton = document.getElementById("surrenderPauseButton");
    if (surrenderPauseButton) {
      surrenderPauseButton.addEventListener("click", () => {
        window.UI.playButtonClickSound(); // Explicit sound for pause menu button
        if (window.GameState.gameActive && !window.GameState.gameOver) {
            window.UI.showGameOverModal("Surrendered!"); // Handles music pause
            window.UI.pauseMenu.style.display = "none";
        }
      });
    }

    // Game Over Restart Button
    const gameOverRestartButton = document.getElementById("gameOverRestartButton");
    if (gameOverRestartButton) {
      gameOverRestartButton.addEventListener("click", () => {
        window.UI.playButtonClickSound(); // Explicit sound for game over button
        window.GameState.initGame();
        window.UI.gameOverModal.style.display = "none";
        window.UI.showFeedback("Game restarted!");
        window.UI.updateButtonStates();
        window.UI.updateBackgroundMusicState(); // Ensure music stops/updates
      });
    }

    // Game Over Shop Button
    const gameOverShopButton = document.getElementById("gameOverShopButton");
    if (gameOverShopButton) {
      gameOverShopButton.addEventListener("click", () => {
        window.UI.playButtonClickSound(); // Explicit sound for game over button
        window.UI.gameOverModal.style.display = "none";
        document.getElementById("shop").style.display = "block";
        document.getElementById("toggleShopButton").textContent = "Hide Shop";
        window.Shop.updateShop();
        window.UI.showFeedback("Shop opened");
      });
    }

    // Save Game Button (Pause Menu)
    const saveGameButton = document.getElementById("saveGameButton");
    if (saveGameButton) {
      saveGameButton.addEventListener("click", () => {
        window.UI.playButtonClickSound(); // Explicit sound for pause menu button
        window.GameState.saveGame();
        // No change to music state needed for saving
        window.UI.showFeedback("Game progress saved!");
      });
    }

    // New Game Button (Pause Menu)
    const newGameButton = document.getElementById("newGameButton");
    if (newGameButton) {
      newGameButton.addEventListener("click", () => {
        window.UI.playButtonClickSound(); // Explicit sound for pause menu button
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
          window.UI.updateBackgroundMusicState(); // Ensure music stops/updates
        }
      });
    }


    // === Tutorial Modal Button Listeners & Logic ===
    const tutorialModal = document.getElementById('tutorialModal');

    if (tutorialModal) {
        const tutorialPrevButton = tutorialModal.querySelector("#tutorialPrevButton");
        const tutorialNextButton = tutorialModal.querySelector("#tutorialNextButton");
        const startTutorialButton = tutorialModal.querySelector("#startTutorialButton");
        const loadGameButton = tutorialModal.querySelector("#loadGameButton");
        const slides = tutorialModal.querySelectorAll('.tutorial-slide');
        const totalSlides = slides.length;
        let currentSlideIndex = 0; // Track index within this scope

        // Function to update the tutorial view (slides and buttons)
        const updateTutorialView = () => {
            slides.forEach((slide, index) => {
                slide.classList.toggle('active', index === currentSlideIndex);
                // Ensure data-slide attribute matches index for potential future use
                slide.dataset.slide = index;
            });
            if (tutorialPrevButton) tutorialPrevButton.disabled = currentSlideIndex === 0;
            if (tutorialNextButton) tutorialNextButton.style.display = currentSlideIndex === totalSlides - 1 ? 'none' : 'inline-block';
            if (startTutorialButton) startTutorialButton.style.display = currentSlideIndex === totalSlides - 1 ? 'inline-block' : 'none';
            if (loadGameButton) {
                const hasSave = localStorage.getItem('warriorGameState') !== null;
                loadGameButton.style.display = (currentSlideIndex === totalSlides - 1 && hasSave) ? 'inline-block' : 'none';
            }
        };

        // Previous Button Listener
        if (tutorialPrevButton) {
            tutorialPrevButton.addEventListener("click", () => {
                window.UI.playButtonClickSound();
                if (currentSlideIndex > 0) {
                    currentSlideIndex--;
                    updateTutorialView();
                }
            });
        } else { console.warn("Tutorial Prev button not found."); }

        // Next Button Listener
        if (tutorialNextButton) {
            tutorialNextButton.addEventListener("click", () => {
                window.UI.playButtonClickSound();
                if (currentSlideIndex < totalSlides - 1) {
                   currentSlideIndex++;
                   updateTutorialView();
                }
            });
        } else { console.warn("Tutorial Next button not found."); }

        // Start New Game Button Listener
        if (startTutorialButton) {
          startTutorialButton.addEventListener("click", () => {
            window.UI.playButtonClickSound(); // Play sound FIRST
            window.UI.tutorialModal.style.display = "none";
            window.GameState.initGame(); // Resets state for a new game
            window.UI.showFeedback("Tutorial completed! Ready to fight!");
            window.UI.updateButtonStates();
            window.UI.updateBackgroundMusicState(); // Update music state AFTER closing modal
            // Reset slide index for next time tutorial opens
            currentSlideIndex = 0;
          });
        } else { console.warn("Start Tutorial button not found."); }

        // Load Game Button Listener
        if (loadGameButton) {
          loadGameButton.addEventListener('click', () => {
            window.UI.playButtonClickSound(); // Play sound FIRST
            window.UI.tutorialModal.style.display = "none";
            window.GameState.initGame(true); // Load game
            window.UI.showFeedback("Saved game loaded!");
            // Update all relevant UI elements after loading
            window.UI.updateButtonStates();
            window.UI.updateFooter();
            window.UI.updateUnitSelectionUI();
            window.UI.updateUnitInfoPanel();
            window.UI.updateUpgradesDisplay();
            window.Shop.updateShop();
            window.UI.drawWaveProgress();
            window.UI.updateKnightButtonState();
            window.UI.updateBackgroundMusicState(); // Update music state AFTER closing modal and loading state
            console.log("Load Game button clicked from tutorial.");
             // Reset slide index for next time tutorial opens
            currentSlideIndex = 0;
          });
        } else {
          console.warn("Load Game button not found in tutorial modal.");
        }

        // Note: updateTutorialView() is called initially by UI.showTutorial() when it makes the modal visible

    } else {
        console.warn("Tutorial modal element not found. Listeners not added.");
    }
    // ==========================================


    // Keydown Escape Listener (Pause/Resume/Close Menus)
    document.addEventListener("keydown", (e) => {
      if (e.code === "Escape" && !window.GameState.gameOver) {
          if (window.GameState.gameActive) { // Toggle pause if game is active
            // No sound for keydown pause/resume
            window.GameState.gamePaused = !window.GameState.gamePaused;
            window.UI.pauseMenu.style.display = window.GameState.gamePaused ? "flex" : "none";
            window.UI.pauseButton.textContent = window.GameState.gamePaused ? "Resume" : "Pause";
            window.UI.showFeedback(window.GameState.gamePaused ? "Game paused" : "Game resumed");
            window.UI.updateButtonStates();
            window.UI.updateBackgroundMusicState(); // Update Music State
          } else if (window.UI.pauseMenu.style.display === 'flex') { // Close pause menu if open but game not active
              window.UI.pauseMenu.style.display = 'none';
              window.UI.showFeedback("Menu closed");
              // No music change needed here
          } else if (window.UI.tutorialModal && window.UI.tutorialModal.style.display === 'flex') { // Close tutorial modal if open
              window.UI.tutorialModal.style.display = 'none';
              window.UI.showFeedback("Tutorial closed");
              window.UI.updateBackgroundMusicState(); // Stop tutorial music if it was playing
          }
      }
    });


    // Prevent Canvas Context Menu
    if (window.Canvas && window.Canvas.canvas) {
      window.Canvas.canvas.addEventListener("contextmenu", (e) => {
        e.preventDefault();
      });
    } else {
        console.warn("Canvas element not found for context menu listener.")
    }

  }; // End of Events.init

  window.Events = Events;
})();