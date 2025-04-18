(function () {
  const Events = {};

  Events.init = function () {
    window.UI.unitButtons.forEach(button => {
      button.addEventListener("click", () => {
        const unitType = button.dataset.unit;
        // Reset isSelected for all units
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
        window.Units.spawnUnit();
      });
    } else {
      console.error("Spawn button not found!");
    }

    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" && window.GameState.gameActive && !window.GameState.gamePaused && !window.GameState.gameOver) {
        e.preventDefault();
        window.Units.spawnUnit();
      }
    });

    const fightButton = document.getElementById("fightButton");
    if (!fightButton) {
      console.error("Fight button not found!");
      window.UI.showFeedback("Error: Fight button not found!");
    } else {
      fightButton.addEventListener("click", () => {
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
          }
          if (!window.GameState.gameActive && !window.GameState.waveCooldown) {
            window.GameState.gameActive = true;
            window.Units.spawnWave(window.GameState.wave);
            window.UI.updateButtonStates();
            window.Game.startGameUpdateLoop();
            window.UI.showFeedback("Battle started!");
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
        if (window.GameState.gameActive && !window.GameState.gameOver) {
          window.GameState.gamePaused = !window.GameState.gamePaused;
          window.UI.pauseMenu.style.display = window.GameState.gamePaused ? "flex" : "none";
          window.UI.pauseButton.textContent = window.GameState.gamePaused ? "Resume" : "Pause";
          window.UI.showFeedback(window.GameState.gamePaused ? "Game paused" : "Game resumed");
          window.UI.updateButtonStates();
        }
      });
    }

    const surrenderButton = document.getElementById("surrenderButton");
    if (surrenderButton) {
      surrenderButton.addEventListener("click", () => {
        if (window.GameState.gameActive && !window.GameState.gameOver) {
          window.UI.showGameOverModal("Surrendered!");
        }
      });
    }

    const restartButton = document.getElementById("restartButton");
    if (restartButton) {
      restartButton.addEventListener("click", () => {
        window.GameState.initGame();
        window.UI.gameOverModal.style.display = "none";
        window.UI.pauseMenu.style.display = "none";
        window.UI.showFeedback("Game restarted!");
        window.UI.updateButtonStates();
      });
    }

    const soundToggleButton = document.getElementById("soundToggleButton");
    if (soundToggleButton) {
      soundToggleButton.addEventListener("click", () => {
        window.GameState.soundEnabled = !window.GameState.soundEnabled;
        soundToggleButton.textContent = `Sound: ${window.GameState.soundEnabled ? "On" : "Off"}`;
        window.UI.showFeedback(`Sound ${window.GameState.soundEnabled ? "enabled" : "disabled"}`);
      });
    }

    const resumeButton = document.getElementById("resumeButton");
    if (resumeButton) {
      resumeButton.addEventListener("click", () => {
        window.GameState.gamePaused = false;
        window.UI.pauseMenu.style.display = "none";
        window.UI.pauseButton.textContent = "Pause";
        window.UI.showFeedback("Game resumed");
        window.UI.updateButtonStates();
      });
    }

    const toggleShopButton = document.getElementById("toggleShopButton");
    if (toggleShopButton) {
      toggleShopButton.addEventListener("click", () => {
        const shop = document.getElementById("shop");
        shop.style.display = shop.style.display === "none" ? "block" : "none";
        window.UI.showFeedback(shop.style.display === "none" ? "Shop hidden" : "Shop shown");
      });
    }

    const surrenderPauseButton = document.getElementById("surrenderPauseButton");
    if (surrenderPauseButton) {
      surrenderPauseButton.addEventListener("click", () => {
        window.UI.showGameOverModal("Surrendered!");
        window.UI.pauseMenu.style.display = "none";
      });
    }

    const gameOverRestartButton = document.getElementById("gameOverRestartButton");
    if (gameOverRestartButton) {
      gameOverRestartButton.addEventListener("click", () => {
        window.GameState.initGame();
        window.UI.gameOverModal.style.display = "none";
        window.UI.showFeedback("Game restarted!");
        window.UI.updateButtonStates();
      });
    }

    const gameOverShopButton = document.getElementById("gameOverShopButton");
    if (gameOverShopButton) {
      gameOverShopButton.addEventListener("click", () => {
        window.UI.gameOverModal.style.display = "none";
        document.getElementById("shop").style.display = "block";
        window.Shop.updateShop();
        window.UI.showFeedback("Shop opened");
      });
    }

    const startTutorialButton = document.getElementById("startTutorialButton");
    if (startTutorialButton) {
      startTutorialButton.addEventListener("click", () => {
        window.UI.tutorialModal.style.display = "none";
        window.GameState.initGame();
        window.UI.showFeedback("Tutorial completed! Ready to fight!");
        window.UI.updateButtonStates();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.code === "Escape" && window.GameState.gameActive && !window.GameState.gameOver) {
        window.GameState.gamePaused = !window.GameState.gamePaused;
        window.UI.pauseMenu.style.display = window.GameState.gamePaused ? "flex" : "none";
        window.UI.pauseButton.textContent = window.GameState.gamePaused ? "Resume" : "Pause";
        window.UI.showFeedback(window.GameState.gamePaused ? "Game paused" : "Game resumed");
        window.UI.updateButtonStates();
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