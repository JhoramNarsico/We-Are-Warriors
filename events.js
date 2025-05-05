// --- START OF FILE events.js ---

(function () {
  const Events = {};

  Events.init = function () {

    // === General Button Click Sound Listener ===
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        gameContainer.addEventListener('click', (e) => {
            // Check if the clicked element is a button and is not disabled
            const button = e.target.closest('button');
            // Exclude clicks inside auth forms from playing the main click sound
            const isInAuthForm = e.target.closest('#authContainer');

            if (button && !button.disabled && !isInAuthForm) {
                window.UI.playButtonClickSound();
            }
        });
    } else {
        console.error("Game container not found for button click listener.");
    }
    // ===============================================

    // --- ADDED: Leaderboard Button Listener ---
    const leaderboardButton = document.getElementById("leaderboardButton");
    if (leaderboardButton) {
        leaderboardButton.addEventListener('click', () => {
            // Play sound specifically for this header button
             if (!leaderboardButton.disabled) window.UI.playButtonClickSound();

            if (typeof Leaderboard !== 'undefined' && Leaderboard.displayLeaderboard) {
                if (window.GameState.currentUser) { // Only try to display if logged in
                     Leaderboard.displayLeaderboard();
                } else {
                     window.UI.showFeedback("Please log in to view the leaderboard.");
                     // Optionally open the tutorial/auth modal
                     // if (window.UI.tutorialModal) window.UI.showTutorial();
                }
            } else {
                console.error("Leaderboard module not available.");
                window.UI.showFeedback("Leaderboard feature unavailable.");
            }
        });
    } else {
        console.error("Leaderboard button not found!");
    }
    // --- END ADDED ---

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
         // Ignore space if typing in an input field (like auth forms)
         if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
             return;
         }
        e.preventDefault();
        // No sound for keydown spawn
        window.Units.spawnUnit();
      }
    });

    // Keydown Unit Selection (Digits 1-4)
    document.addEventListener("keydown", (e) => {
      if (window.GameState.gamePaused || window.GameState.gameOver) return;
       // Ignore hotkeys if typing in an input field
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
            return;
        }

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
             // Restarting after game over should go back to initial state
             window.GameState.initGame(); // Re-initialize (loads upgrades)
            window.UI.gameOverModal.style.display = "none";
            if(window.Game) window.Game.gameLoopRunning = false;
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
             if(window.Game) window.Game.startGameUpdateLoop();
             else console.error("Game module not found to start loop");
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
          window.UI.showGameOverModal("Surrendered!"); // Handles music pause & score saving
        }
      });
    }

    // Restart Button (Footer)
    const restartButton = document.getElementById("restartButton");
    if (restartButton) {
      restartButton.addEventListener("click", () => {
        // Click sound handled by the general listener above
        if (confirm("Are you sure you want to restart the battle from Wave 1? Current progress will be lost.")) {
            window.GameState.initGame(); // Re-initialize (loads upgrades)
            window.UI.gameOverModal.style.display = "none"; // Close modals if open
            window.UI.pauseMenu.style.display = "none";
            if(window.Game) window.Game.gameLoopRunning = false; // Stop loop if running
            window.UI.showFeedback("Battle restarted!");
            window.UI.updateButtonStates();
            window.UI.updateBackgroundMusicState(); // Ensure music stops/updates
        }
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
        if (!shop) return;
        const willShow = shop.style.display === "none";
        shop.style.display = willShow ? "block" : "none";
        toggleShopButton.textContent = willShow ? "Hide Shop" : "Show Shop";
        window.UI.showFeedback(willShow ? "Shop shown" : "Shop hidden");
         if (willShow && window.Shop && window.Shop.updateShop) {
            window.Shop.updateShop(); // Refresh shop content when shown
        }
      });
    }

    // --- Surrender Button (Pause Menu) Listener REMOVED/COMMENTED OUT ---
    /*
    const surrenderPauseButton = document.getElementById("surrenderPauseButton");
    if (surrenderPauseButton) {
      surrenderPauseButton.addEventListener("click", () => {
        window.UI.playButtonClickSound(); // Explicit sound for pause menu button
        if (window.GameState.gameActive && !window.GameState.gameOver) {
            window.UI.showGameOverModal("Surrendered!"); // Handles music pause & score saving
            window.UI.pauseMenu.style.display = "none";
        }
      });
    }
    */
    // --- END REMOVED/COMMENTED OUT ---

    // Game Over Restart Button
    const gameOverRestartButton = document.getElementById("gameOverRestartButton");
    if (gameOverRestartButton) {
      gameOverRestartButton.addEventListener("click", () => {
        window.UI.playButtonClickSound(); // Explicit sound for game over button
        window.GameState.initGame(); // Re-initialize (loads upgrades)
        window.UI.gameOverModal.style.display = "none";
        window.UI.showFeedback("Battle restarted!");
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
        const shop = document.getElementById("shop");
        const toggleShopBtn = document.getElementById("toggleShopButton");
        if (shop) shop.style.display = "block";
        if (toggleShopBtn) toggleShopBtn.textContent = "Hide Shop";

        if (window.Shop && window.Shop.updateShop) {
          window.Shop.updateShop();
        }
        window.UI.showFeedback("Shop opened");
      });
    }

    // Save Game Button (Pause Menu) - Local Save
    const saveGameButton = document.getElementById("saveGameButton");
    if (saveGameButton) {
      saveGameButton.addEventListener("click", () => {
        window.UI.playButtonClickSound(); // Explicit sound for pause menu button
        window.GameState.saveGame(); // Saves locally
        // No change to music state needed for saving
      });
    }

    // New Game Button (Pause Menu) - Clears Local Storage
    const newGameButton = document.getElementById("newGameButton");
    if (newGameButton) {
      newGameButton.addEventListener("click", () => {
        window.UI.playButtonClickSound(); // Explicit sound for pause menu button
        if (confirm("Are you sure you want to start a new game? All local progress and upgrades will be lost.")) {
          window.GameState.resetGame(); // resetGame calls initGame and updates UI
          window.UI.pauseMenu.style.display = "none";
          window.UI.gameOverModal.style.display = "none";
          // UI updates are handled within resetGame/initGame now
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

        const updateTutorialView = () => {
            if (!slides.length) return; // Avoid errors if slides not found

            slides.forEach((slide, index) => {
                slide.classList.toggle('active', index === currentSlideIndex);
                slide.dataset.slide = index;
            });

            if (tutorialPrevButton) tutorialPrevButton.disabled = currentSlideIndex === 0;
            if (tutorialNextButton) tutorialNextButton.style.display = currentSlideIndex >= totalSlides - 1 ? 'none' : 'inline-block';
            if (startTutorialButton) startTutorialButton.style.display = currentSlideIndex === totalSlides - 1 ? 'inline-block' : 'none';

            // Show Load Game button on last slide only if a local save exists
            if (loadGameButton) {
                const hasSave = localStorage.getItem('warriorGameState') !== null;
                loadGameButton.style.display = (currentSlideIndex === totalSlides - 1 && hasSave) ? 'inline-block' : 'none';
            }
        };


        if (tutorialPrevButton) {
            tutorialPrevButton.addEventListener("click", () => {
                window.UI.playButtonClickSound();
                if (currentSlideIndex > 0) {
                    currentSlideIndex--;
                    updateTutorialView();
                }
            });
        } else { console.warn("Tutorial Prev button not found."); }


        if (tutorialNextButton) {
            tutorialNextButton.addEventListener("click", () => {
                window.UI.playButtonClickSound();
                if (currentSlideIndex < totalSlides - 1) {
                   currentSlideIndex++;
                   updateTutorialView();
                }
            });
        } else { console.warn("Tutorial Next button not found."); }


        if (startTutorialButton) {
          startTutorialButton.addEventListener("click", () => {
            window.UI.playButtonClickSound();
            window.UI.tutorialModal.style.display = "none";
            // Ensure a completely new game state, even if upgrades were loaded before tutorial
            window.GameState.resetGame(); // Use reset to clear everything first
            window.UI.showFeedback("Tutorial completed! Ready to fight!");
            // Buttons and music state updated by resetGame/initGame
             currentSlideIndex = 0; // Reset slide index
          });
        } else { console.warn("Start Tutorial button not found."); }


        if (loadGameButton) {
          loadGameButton.addEventListener('click', () => {
            window.UI.playButtonClickSound();
            window.UI.tutorialModal.style.display = "none";
            window.GameState.initGame(true); // Load local game
            window.UI.showFeedback("Saved game loaded!");
            // UI updates happen within initGame now
            window.UI.updateBackgroundMusicState(); // Update music state AFTER closing modal
            console.log("Load Game button clicked from tutorial.");
             currentSlideIndex = 0; // Reset slide index
          });
        } else {
          console.warn("Load Game button not found in tutorial modal.");
        }

        // Initial call to set up the first slide view correctly
        updateTutorialView();


    } else {
        console.warn("Tutorial modal element not found. Listeners not added.");
    }
    // ==========================================


    // Keydown Escape Listener (Pause/Resume/Close Menus)
    document.addEventListener("keydown", (e) => {
        // Ignore escape if typing in an input field
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
            return;
        }

      if (e.code === "Escape") {
          e.preventDefault(); // Prevent potential browser default actions for Escape

          // Priority: Close Leaderboard -> Close Pause -> Close Tutorial -> Toggle Pause
           const leaderboardModal = document.getElementById('leaderboardModal');
           const pauseMenu = document.getElementById('pauseMenu');
           const tutorialModal = document.getElementById('tutorialModal');


          if (leaderboardModal && leaderboardModal.style.display === 'flex') {
              if (window.Leaderboard && Leaderboard.hideLeaderboard) Leaderboard.hideLeaderboard();
              window.UI.showFeedback("Leaderboard closed");
          } else if (pauseMenu && pauseMenu.style.display === 'flex' && window.GameState.gameActive) {
              // Resume game if pause menu is open during active game
              window.GameState.gamePaused = false;
              pauseMenu.style.display = "none";
              if (window.UI.pauseButton) window.UI.pauseButton.textContent = "Pause";
              window.UI.showFeedback("Game resumed");
              window.UI.updateButtonStates();
              window.UI.updateBackgroundMusicState();
          } else if (pauseMenu && pauseMenu.style.display === 'flex' && !window.GameState.gameActive) {
               // Close pause menu if open but game not active
              pauseMenu.style.display = 'none';
              window.UI.showFeedback("Menu closed");
          } else if (tutorialModal && tutorialModal.style.display === 'flex') {
              tutorialModal.style.display = 'none';
              window.UI.showFeedback("Tutorial closed");
              window.UI.updateBackgroundMusicState();
          } else if (window.GameState.gameActive && !window.GameState.gameOver && !window.GameState.gamePaused) {
              // Pause the game if it's active and no modals are open
              window.GameState.gamePaused = true;
              if (pauseMenu) pauseMenu.style.display = "flex";
              if (window.UI.pauseButton) window.UI.pauseButton.textContent = "Resume";
              window.UI.showFeedback("Game paused");
              window.UI.updateButtonStates();
              window.UI.updateBackgroundMusicState();
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
// --- END OF FILE events.js ---