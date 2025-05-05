// --- START OF FILE ui.js ---

(function () {
  const UI = {};

  // DOM Elements
  UI.feedbackMessage = document.getElementById("feedbackMessage");
  UI.goldDisplay = document.getElementById("goldDisplay");
  UI.diamondDisplay = document.getElementById("diamondDisplay");
  UI.waveDisplay = document.getElementById("waveDisplay");
  UI.unitButtons = document.querySelectorAll(".unit-button");
  UI.pauseMenu = document.getElementById("pauseMenu");
  UI.gameOverModal = document.getElementById("gameOverModal");
  UI.gameOverMessage = document.getElementById("gameOverMessage"); // Target for the message
  UI.gameOverWave = document.getElementById("gameOverWave");
  UI.tutorialModal = document.getElementById("tutorialModal"); // Make sure this is assigned
  UI.waveProgressBar = document.getElementById("waveProgressBar");
  UI.upgradesList = document.getElementById("upgradesList");
  UI.waveCooldownElement = document.getElementById("waveCooldown");
  UI.unitInfoPanel = document.getElementById("unitInfoPanel");
  UI.pauseButton = document.getElementById("pauseButton");

  UI.knightButton = document.getElementById('knightButton');
  UI.knightButtonTooltip = UI.knightButton ? UI.knightButton.querySelector('.tooltip') : null;

  // Audio Elements
  UI.spawnSound = document.getElementById("spawnSound");
  UI.attackSound = document.getElementById("attackSound");
  UI.winSound = document.getElementById("winSound");
  UI.loseSound = document.getElementById("loseSound");
  UI.backgroundMusic = document.getElementById("backgroundMusic");
  UI.buttonClickSound = document.getElementById("buttonClickSound");

  // Set default volume
  [UI.spawnSound, UI.attackSound, UI.winSound, UI.loseSound].forEach(audio => {
    if (audio) audio.volume = 0.3;
  });
  if (UI.backgroundMusic) UI.backgroundMusic.volume = 0.15; // Background music quieter
  if (UI.buttonClickSound) UI.buttonClickSound.volume = 0.4; // Button clicks slightly louder


  UI.checkAudioFiles = function () {
    const audioFiles = [
      { element: UI.spawnSound, path: "./sounds/spawn.mp3" },
      { element: UI.attackSound, path: "./sounds/attack.mp3" },
      { element: UI.winSound, path: "./sounds/win.mp3" },
      { element: UI.loseSound, path: "./sounds/lose.mp3" },
      { element: UI.backgroundMusic, path: "./sounds/background_music.mp3" },
      { element: UI.buttonClickSound, path: "./sounds/button_click.mp3" }
    ];

    audioFiles.forEach(audio => {
      if (!audio.element) {
        console.warn(`Audio element for ${audio.path} not found in HTML.`);
        return;
      }
      fetch(audio.path, { method: "HEAD" })
        .then(response => {
          if (!response.ok) {
            console.error(`Audio file not found: ${audio.path}`);
            this.showFeedback(`Audio file unavailable: ${audio.path.split("/").pop()}`);
          } else {
            // console.log(`Audio file found: ${audio.path}`); // Can be noisy, commented out
          }
        })
        .catch(e => {
          console.error(`Error checking audio file ${audio.path}:`, e);
          this.showFeedback("Audio files may not load correctly.");
        });
    });
  };

    UI.playBackgroundMusic = function() {
        if (this.backgroundMusic && window.GameState.soundEnabled && !this.backgroundMusic.playing) {
            this.backgroundMusic.play().then(() => {
                this.backgroundMusic.playing = true; // Set flag only on successful play
                console.log("BG Music Playing");
            }).catch(e => {
                if (e.name !== 'NotAllowedError') {
                    console.error("Background music play error:", e);
                } else {
                    // console.log("BG Music play prevented by browser policy (needs user interaction)."); // Can be noisy
                }
                this.backgroundMusic.playing = false; // Ensure flag is false on error
            });
        }
    };

    UI.pauseBackgroundMusic = function() {
        if (this.backgroundMusic && this.backgroundMusic.playing) {
            this.backgroundMusic.pause();
            this.backgroundMusic.playing = false;
            console.log("BG Music Paused");
        }
    };

    UI.updateBackgroundMusicState = function() {
        const isTutorialVisible = this.tutorialModal && this.tutorialModal.style.display === 'flex';
        // console.log(`Updating BG Music State: soundEnabled=${window.GameState.soundEnabled}, gameActive=${window.GameState.gameActive}, gamePaused=${window.GameState.gamePaused}, gameOver=${window.GameState.gameOver}, tutorialVisible=${isTutorialVisible}`);

        // Play music if sound is on AND (game is active/not paused/not over OR tutorial is visible)
        if (window.GameState.soundEnabled &&
            ( (window.GameState.gameActive && !window.GameState.gamePaused && !window.GameState.gameOver) || isTutorialVisible )
           ) {
            this.playBackgroundMusic();
        } else {
            this.pauseBackgroundMusic();
        }
    };

    UI.playButtonClickSound = function() {
        if (this.buttonClickSound && window.GameState.soundEnabled) {
            this.buttonClickSound.currentTime = 0; // Rewind to start
            this.buttonClickSound.play().catch(e => console.error("Button click sound error:", e));
        }
    };

  UI.drawWaveCooldown = function (seconds) {
    if (!this.waveCooldownElement) return;

    this.waveCooldownElement.textContent = `Next Wave in ${seconds} seconds`;
    this.waveCooldownElement.style.display = "block";

    if (seconds <= 1) {
      this.waveCooldownElement.style.color = "#ff3333";
      this.waveCooldownElement.style.fontWeight = "bold";
    } else if (seconds <= 2) {
      this.waveCooldownElement.style.color = "#ffcc00";
      this.waveCooldownElement.style.fontWeight = "bold";
    } else {
      this.waveCooldownElement.style.color = "#33cc33";
      this.waveCooldownElement.style.fontWeight = "normal";
    }

    if (seconds <= 3) {
      this.waveCooldownElement.classList.add("pulse-animation");
    } else {
      this.waveCooldownElement.classList.remove("pulse-animation");
    }
  };

  UI.hideWaveCooldown = function () {
    if (this.waveCooldownElement) {
      this.waveCooldownElement.style.display = "none";
      this.waveCooldownElement.classList.remove("pulse-animation");
    }
  };

  UI.updateFooter = function () {
    if (this.goldDisplay) this.goldDisplay.textContent = Math.max(0, window.GameState.gold);
    if (this.diamondDisplay) this.diamondDisplay.textContent = Math.max(0, window.GameState.diamonds);
    if (this.waveDisplay) this.waveDisplay.textContent = window.GameState.wave;
  };

  UI.drawWaveProgress = function () {
    if (!this.waveProgressBar) return;
    const progress = Math.min(1, (window.GameState.wave - 1) / window.GameState.maxWaves);
    this.waveProgressBar.style.width = `${progress * 100}%`;
  };

  UI.updateUpgradesDisplay = function () {
    if (!this.upgradesList) return;

    let upgradesContent = "";

    if (window.GameState.baseHealthUpgrades > 0) {
      upgradesContent += `<li class="upgrade-item">
        <span class="upgrade-icon">🛡️</span>
        <span class="upgrade-name">Base Health:</span>
        <span class="upgrade-value">+${window.GameState.baseHealthUpgrades * 25} HP</span>
        <span class="upgrade-level">(Level ${window.GameState.baseHealthUpgrades})</span>
      </li>`;
    }

    if (window.GameState.unitHealthUpgrades > 0) {
      upgradesContent += `<li class="upgrade-item">
        <span class="upgrade-icon">❤️</span>
        <span class="upgrade-name">Unit Health:</span>
        <span class="upgrade-value">+${window.GameState.unitHealthUpgrades * 3} HP</span>
        <span class="upgrade-level">(Level ${window.GameState.unitHealthUpgrades})</span>
      </li>`;
    }

    if (window.GameState.unitDamageUpgrades > 0) {
      upgradesContent += `<li class="upgrade-item">
        <span class="upgrade-icon">⚔️</span>
        <span class="upgrade-name">Unit Damage:</span>
        <span class="upgrade-value">+${window.GameState.unitDamageUpgrades * 2} DMG</span>
        <span class="upgrade-level">(Level ${window.GameState.unitDamageUpgrades})</span>
      </li>`;
    }

    if (window.GameState.goldProductionUpgrades > 0) {
      upgradesContent += `<li class="upgrade-item">
        <span class="upgrade-icon">💰</span>
        <span class="upgrade-name">Gold Rate:</span>
        <span class="upgrade-value">${window.GameState.goldProductionRate}ms</span>
        <span class="upgrade-level">(Level ${window.GameState.goldProductionUpgrades})</span>
      </li>`;
    }

    if (window.GameState.baseDefenseUpgrades > 0) {
      upgradesContent += `<li class="upgrade-item">
        <span class="upgrade-icon">🛡️</span>
        <span class="upgrade-name">Base Defense:</span>
        <span class="upgrade-value">${window.GameState.baseDefenseUpgrades * 10}%</span>
        <span class="upgrade-level">(Level ${window.GameState.baseDefenseUpgrades})</span>
      </li>`;
    }

    if (window.GameState.isKnightUnlocked) {
      upgradesContent += `<li class="upgrade-item special-unlock">
        <span class="upgrade-icon">⚜️</span>
        <span class="upgrade-name">Knight:</span>
        <span class="upgrade-value">Unlocked</span>
      </li>`;
    }

    this.upgradesList.innerHTML = upgradesContent ?
      `<ul class="upgrades-list">${upgradesContent}</ul>` :
      '<p class="no-upgrades">No upgrades purchased yet.</p>';
  };

  UI.showFeedback = function (message) {
    if (!this.feedbackMessage) return;

    // Clear existing timeouts to prevent weird overlaps
     if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
     if (this.feedbackRemoveTimeout) clearTimeout(this.feedbackRemoveTimeout);


    this.feedbackMessage.classList.remove("show", "fade-out", "slide-in");
    this.feedbackMessage.textContent = message;

    // Force reflow to restart animation
    void this.feedbackMessage.offsetWidth;

    this.feedbackMessage.classList.add("show", "slide-in");

    this.feedbackTimeout = setTimeout(() => {
      this.feedbackMessage.classList.add("fade-out");
      // Set another timeout to remove classes after fade-out completes
      this.feedbackRemoveTimeout = setTimeout(() => {
           this.feedbackMessage.classList.remove("show", "slide-in", "fade-out");
      }, 500); // Match the fade-out duration in CSS
    }, 2500); // Duration the message stays visible before starting fade-out
  };


  UI.showDamageNumber = function (x, y, amount, isPlayerTakingDamage) {
    if (!amount || amount <= 0) return;

    // Only play sound for damage dealt TO enemies/enemy base
    if (window.GameState.soundEnabled && !isPlayerTakingDamage && this.attackSound) {
      // console.log("Attempting to play audio from src:", this.attackSound.src);
      const attackAudio = new Audio(this.attackSound.src);
      attackAudio.volume = this.attackSound.volume;
      attackAudio.play().catch(e => console.error("Attack sound error:", e));
    }

    const damageText = document.createElement("div");
    damageText.textContent = `-${Math.floor(amount)}`;
    damageText.className = "damage-text";

    damageText.classList.toggle("player-damage", isPlayerTakingDamage);
    damageText.classList.toggle("enemy-damage", !isPlayerTakingDamage);


    const canvasRect = window.Canvas.canvas.getBoundingClientRect();
    const scaleX = window.Canvas.canvas.width / window.Canvas.canvas.offsetWidth;
    const scaleY = window.Canvas.canvas.height / window.Canvas.canvas.offsetHeight;

    let targetX = x; // Use the provided x directly
    const isEnemyBaseHit = !isPlayerTakingDamage && Math.abs(targetX - window.Canvas.canvas.width * 0.9375) < 30; // Check proximity to enemy base ref X
    const isPlayerBaseHit = isPlayerTakingDamage && Math.abs(targetX - window.Canvas.canvas.width * 0.075) < 30; // Check proximity to player base ref X

    let left = (targetX / scaleX) + canvasRect.left;
    let top = (y / scaleY) + canvasRect.top - 20; // Base offset above unit/point

    // Adjust position slightly for base hits to make them more distinct
    if (isEnemyBaseHit) {
        left += 15 * scaleX; // Shift right for enemy base
        top -= 5 * scaleY; // Shift slightly up
        damageText.classList.add("enemy-base-damage");
    } else if (isPlayerBaseHit) {
        left -= 15 * scaleX; // Shift left for player base
        top += 5 * scaleY; // Shift slightly down
        damageText.classList.add("player-base-damage");
    } else {
        // Randomize slightly for unit hits
        left += (Math.random() - 0.5) * 10 * scaleX;
    }

    // Clamp position to be within canvas bounds
    const textWidth = Math.min(50, 10 + damageText.textContent.length * 8); // Estimate width
    left = Math.max(canvasRect.left + 5, Math.min(left, canvasRect.right - textWidth - 5));
    top = Math.max(canvasRect.top + 5, Math.min(top, canvasRect.bottom - 20)); // Keep within top/bottom

    damageText.style.left = `${left}px`;
    damageText.style.top = `${top}px`;

    // Dynamic styling based on damage type
    damageText.style.color = isPlayerTakingDamage ? "#ff4d4d" : "#ffdd00"; // Red for player damage, Yellow for enemy damage
    damageText.style.fontSize = isPlayerBaseHit || isEnemyBaseHit ? "15px" : "12px"; // Larger for base hits
    damageText.style.fontWeight = "bold";
    damageText.style.textShadow = isPlayerTakingDamage ?
      "0 0 3px rgba(0,0,0,0.8), 0 0 1px #000" :
      "0 0 3px rgba(0,0,0,0.8), 0 0 1px #000";

    document.body.appendChild(damageText);

    // Animation: Move up and fade out
     requestAnimationFrame(() => {
        damageText.style.transition = "transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.6s ease-in";
        damageText.style.transform = `translateY(-${25 + Math.random()*10}px) scale(1.1)`; // Move up

        // Start fading slightly after animation starts
        setTimeout(() => {
            damageText.style.opacity = "0";
        }, 200); // Start fading after 200ms
    });


    // Remove the element after animation completes
    setTimeout(() => {
      if (document.body.contains(damageText)) {
        document.body.removeChild(damageText);
      }
    }, 800); // Matches animation duration (600ms) + fade buffer
  };


  // --- MODIFIED FUNCTION ---
  UI.showGameOverModal = function (message) {
    if (window.GameState.gameOver) return; // Prevent multiple calls
    window.GameState.gameOver = true;
    window.GameState.gameActive = false;
    window.GameState.gamePaused = true; // Explicitly pause
    if(window.Game) window.Game.gameLoopRunning = false; // Stop game loop if Game module exists

    this.updateBackgroundMusicState(); // Pause music if needed

    // Show shop immediately on game over
    const shop = document.getElementById("shop");
    const toggleShopButton = document.getElementById("toggleShopButton");
    if (shop) shop.style.display = "block";
    if (toggleShopButton) toggleShopButton.textContent = "Hide Shop";
    if (window.Shop && window.Shop.updateShop) window.Shop.updateShop();

    // Clear intervals
    if (window.GameState.waveCooldownInterval) {
      clearInterval(window.GameState.waveCooldownInterval);
      window.GameState.waveCooldownInterval = null;
      this.hideWaveCooldown();
    }
    if (window.GameState.goldInterval) {
      clearInterval(window.GameState.goldInterval);
      window.GameState.goldInterval = null;
    }

    const isVictory = message === "Victory!";
    const isLoggedIn = !!window.GameState.currentUser;

    // --- Start: Determine the content for the Game Over Message ---
    if (!isLoggedIn && !isVictory) {
        // User is NOT logged in and has been DEFEATED
        const defeatMessageHTML = `
            ${message} <!-- Display "Defeat!" -->
            <p style="font-size: 0.9em; margin-top: 15px; line-height: 1.4; color: #ccc;">
                Want to save your high score next time? Log in or Sign Up!
            </p>
            <p style="font-size: 0.8em; margin-top: 8px; line-height: 1.3; color: #aaa;">
                To access login/signup: Go to Pause Menu -> Click 'New Game', then <strong>refresh the page</strong>. This will show the welcome screen with login options.
            </p>
        `;
        // Use innerHTML because we added paragraph and strong tags
        this.gameOverMessage.innerHTML = defeatMessageHTML;
    } else {
        // User is logged in OR has achieved Victory
        this.gameOverMessage.textContent = message; // Just display "Victory!" or "Defeat!"
    }
    // --- End: Determine the content for the Game Over Message ---

    // Apply styling class AFTER setting content
    this.gameOverMessage.className = isVictory ? "victory-message" : "defeat-message";

    // Set the wave reached text
    const finalWaveDisplay = isVictory ? window.GameState.maxWaves : window.GameState.wave;
    this.gameOverWave.textContent = `Reached Wave: ${finalWaveDisplay}`;

    // Display the modal and apply animation
    this.gameOverModal.style.display = "flex";
    this.gameOverModal.classList.remove("modal-animation"); // Reset animation state
    void this.gameOverModal.offsetWidth; // Force reflow
    this.gameOverModal.classList.add("modal-animation"); // Start animation

    // Update button states (e.g., disable fight button)
    this.updateButtonStates();

     // --- Logic for Saving Score ---
    if (isLoggedIn && typeof Leaderboard !== 'undefined' && Leaderboard.saveScore) {
        const scoreToSave = isVictory ? window.GameState.maxWaves + 1 : window.GameState.wave; // Save wave number (or max+1 for win)
        console.log(`Game over. Attempting to save score ${scoreToSave} for user ${window.GameState.currentUser.email}`);
        Leaderboard.saveScore(window.GameState.currentUser.uid, window.GameState.currentUser.email, scoreToSave);
    } else {
        console.log("Game over, user not logged in or Leaderboard module not ready. Score not saved.");
         // The main modal message now handles informing the logged-out user.
         // if (!isLoggedIn) {
         //     this.showFeedback("Log in to save scores online!");
         // }
    }
    // --- END Logic for Saving Score ---


    // Play sound
    if (window.GameState.soundEnabled) {
      const soundToPlay = isVictory ? this.winSound : this.loseSound;
      if (soundToPlay) {
        soundToPlay.currentTime = 0;
        soundToPlay.play().catch(e => console.error("Game Over sound error:", e));
      }
    }
  }; // --- END of MODIFIED UI.showGameOverModal ---


  UI.showTutorial = function () {
    if (!this.tutorialModal) {
        console.error("Tutorial modal element not found.");
        return;
    }

    console.log("Showing tutorial modal.");
    this.tutorialModal.style.display = "flex";
    this.tutorialModal.classList.remove("tutorial-animation"); // Reset animation
    void this.tutorialModal.offsetWidth; // Trigger reflow
    this.tutorialModal.classList.add("tutorial-animation"); // Start animation

    this.updateBackgroundMusicState(); // Update music (play if enabled)


    // Reset to the first slide and update buttons (logic moved mostly to events.js, but good to ensure initial state here)
    const slides = this.tutorialModal.querySelectorAll('.tutorial-slide');
    const prevButton = this.tutorialModal.querySelector('#tutorialPrevButton');
    const nextButton = this.tutorialModal.querySelector('#tutorialNextButton');
    const startButton = this.tutorialModal.querySelector('#startTutorialButton');
    const loadButton = this.tutorialModal.querySelector('#loadGameButton');
    const totalSlides = slides.length;

     let currentSlideIndex = 0; // Assume starting at 0

     slides.forEach((slide, index) => {
        slide.classList.toggle('active', index === currentSlideIndex);
    });

     if(prevButton) prevButton.disabled = true;
     if(nextButton) nextButton.style.display = currentSlideIndex === totalSlides - 1 ? 'none' : 'inline-block';
     if(startButton) startButton.style.display = currentSlideIndex === totalSlides - 1 ? 'inline-block' : 'none';
     if (loadButton) { // Check for local save to show load button on last slide
        const hasSave = localStorage.getItem('warriorGameState') !== null;
        loadButton.style.display = (currentSlideIndex === totalSlides - 1 && hasSave) ? 'inline-block' : 'none';
    }

    // Focus the first interactive element (e.g., the 'Next' button)
    setTimeout(() => {
        if (nextButton && nextButton.style.display !== 'none') {
            nextButton.focus();
        } else if (startButton && startButton.style.display !== 'none') {
            startButton.focus();
        } else if (prevButton) {
            prevButton.focus(); // Fallback
        }
    }, 150); // Small delay for modal display
  };


  UI.updateUnitSelectionUI = function () {
    const selectedTypeName = window.Units.selectedUnitType ? window.Units.selectedUnitType.name.toUpperCase() : null;
    this.unitButtons.forEach(btn => {
      if (btn.dataset.unit === selectedTypeName) {
        btn.classList.add("selected");
      } else {
        btn.classList.remove("selected");
      }
    });
    this.updateUnitInfoPanel();
  };

  UI.addTooltips = function () {
    this.unitButtons = document.querySelectorAll(".unit-button"); // Re-query in case buttons change
    this.unitButtons.forEach(button => {
      const unitType = button.dataset.unit;
      if (unitType && window.Units.UNIT_TYPES[unitType]) {
        const tooltipSpan = button.querySelector(".tooltip");
        if (tooltipSpan) {
          tooltipSpan.innerHTML = this.generateTooltip(unitType);

          // Ensure unique ID for ARIA
          const tooltipId = `tooltip-${unitType.toLowerCase()}`;
          button.setAttribute("aria-describedby", tooltipId);
          tooltipSpan.id = tooltipId;
        }
      }
    });
    this.updateKnightButtonState(); // Ensure Knight button tooltip updates if needed
  };

  UI.generateTooltip = function (unitName) {
    const unit = window.Units.UNIT_TYPES[unitName.toUpperCase()];
    if (!unit) return "Unit data not found";

    const isKnightLocked = unitName.toUpperCase() === "KNIGHT" && !window.GameState.isKnightUnlocked;
    // Get current stats including upgrades
    const currentHealth = unit.health + (window.GameState.unitHealthUpgrades * 3);
    const currentDamage = unit.damage; // Damage is already updated in UNIT_TYPES by shop/load

    return `
      <div class="tooltip-header">${unit.name} ${isKnightLocked ? '🔒' : ''}</div>
      <div class="tooltip-body">
        <div class="tooltip-stats">
            <span>❤️ ${currentHealth}</span> | <span>⚔️ ${currentDamage}</span> | <span>💰 ${unit.cost}</span>
        </div>
        <div class="tooltip-lore">${unit.lore}</div>
        <div class="tooltip-strengths"><strong>Strengths:</strong> ${unit.strengths}</div>
      </div>
      ${isKnightLocked ? '<div class="unlock-instruction">Purchase from Shop to unlock</div>' : ''}
    `;
  };

  UI.updateUnitInfoPanel = function () {
    if (!this.unitInfoPanel ) {
        return; // Exit if panel doesn't exist
    }
    if (!window.Units.selectedUnitType) {
        this.unitInfoPanel.innerHTML = "<p>Select a unit to see details.</p>"; // Clear panel if no unit selected
        return;
    }

    const unit = window.Units.selectedUnitType;
    const health = unit.health + (window.GameState.unitHealthUpgrades * 3);
    const damage = unit.damage; // Damage already includes upgrades from gameState/shop/load
    const speed = unit.speed.toFixed(1);
    const cost = unit.cost;
    let description = "";
    let special = "";

    switch (unit.name.toUpperCase()) {
      case "BARBARIAN":
        description = "Balanced melee fighter.";
        special = "Reliable frontline soldier.";
        break;
      case "ARCHER":
        description = "Ranged attacker, vulnerable up close.";
        special = "Attacks from a safe distance.";
        break;
      case "HORSE":
        description = "Fast charging melee unit.";
        special = "Quickly reaches the frontline or base.";
        break;
      case "KNIGHT":
        description = "Heavily armored tank unit.";
        special = "High health and damage, but slower.";
        break;
      default:
          description = "Unknown unit selected.";
          special = "";
          break;
    }

    const isLockedKnight = (unit.name === "Knight" && !window.GameState.isKnightUnlocked);

    this.unitInfoPanel.innerHTML = `
      <div class="unit-info-header ${isLockedKnight ? 'locked' : ''}">
        <h4>${unit.name} ${isLockedKnight ? '<span class="lock-icon">🔒</span>' : ''}</h4>
      </div>

      <div class="unit-info-description">
        <p>${description}</p>
        <p class="unit-special-ability">${special}</p>
      </div>

      <div class="unit-info-stats">
        <div class="stat-row">
          <span class="stat-icon">❤️</span>
          <span class="stat-label">Health:</span>
          <span class="stat-value">${health}</span>
        </div>
        <div class="stat-row">
          <span class="stat-icon">⚔️</span>
          <span class="stat-label">Damage:</span>
          <span class="stat-value">${damage}</span>
        </div>
        <div class="stat-row">
          <span class="stat-icon">🏃</span>
          <span class="stat-label">Speed:</span>
          <span class="stat-value">${speed}</span>
        </div>
         <div class="stat-row">
          <span class="stat-icon">🎯</span>
          <span class="stat-label">Range:</span>
          <span class="stat-value">${unit.attackRange}</span>
        </div>
         <div class="stat-row">
          <span class="stat-icon">⏱️</span>
          <span class="stat-label">Atk Spd:</span>
          <span class="stat-value">${unit.attackSpeed}ms</span>
        </div>
        <div class="stat-row">
          <span class="stat-icon">💰</span>
          <span class="stat-label">Cost:</span>
          <span class="stat-value">${cost} gold</span>
        </div>
      </div>

      ${isLockedKnight ? '<div class="unit-locked-message">Unlock in the Shop!</div>' : ''}
    `;
  };


  UI.updateButtonStates = function () {
    // Cache buttons if not already cached
     if (!this._buttons) {
        this._buttons = {
            fight: document.getElementById("fightButton"),
            pause: document.getElementById("pauseButton"),
            surrender: document.getElementById("surrenderButton"),
            restart: document.getElementById("restartButton"),
            spawn: document.getElementById("spawnButton"),
            saveGame: document.getElementById("saveGameButton"),
            // loadGame: document.getElementById("loadGameButton"), // Tutorial load handled differently
            surrenderPause: document.getElementById("surrenderPauseButton"),
            leaderboard: document.getElementById("leaderboardButton"),
            logout: document.getElementById("logoutButton")
        };
    }
    const btns = this._buttons;

    // Core game controls
    if (btns.fight) btns.fight.disabled = window.GameState.gameActive || window.GameState.gameOver || window.GameState.waveCooldown;
    if (btns.pause) btns.pause.disabled = !window.GameState.gameActive || window.GameState.gameOver;
    if (btns.surrender) btns.surrender.disabled = !window.GameState.gameActive || window.GameState.gameOver;
    if (btns.spawn) btns.spawn.disabled = !window.GameState.gameActive || window.GameState.gamePaused || window.GameState.gameOver;
    if (btns.restart) btns.restart.disabled = false; // Restart is always available

    // Pause menu controls
    if (btns.saveGame) btns.saveGame.disabled = !window.GameState.gameActive || window.GameState.gameOver; // Can only save active game
    if (btns.surrenderPause) btns.surrenderPause.disabled = !window.GameState.gameActive || window.GameState.gameOver;

     // Auth/Leaderboard controls
     const isLoggedIn = !!window.GameState.currentUser;
     if (btns.leaderboard) btns.leaderboard.disabled = !isLoggedIn; // Enable leaderboard only if logged in
     if (btns.logout) btns.logout.style.display = isLoggedIn ? 'inline-block' : 'none'; // Show logout only if logged in


    // Update Pause button text
    if (btns.pause) btns.pause.textContent = window.GameState.gamePaused ? "Resume" : "Pause";

    this.updateKnightButtonState(); // Ensure knight button state is correct
    this.addTooltips(); // Refresh tooltips in case stats changed
  };


  UI.updateKnightButtonState = function() {
    // Ensure button elements are cached or found
    if (!this.knightButton) {
        this.knightButton = document.getElementById('knightButton');
        if (this.knightButton) {
            this.knightButtonTooltip = this.knightButton.querySelector('.tooltip');
        }
    }
    if (!this.knightButton) {
      console.warn("Knight button not found in DOM.");
      return;
    }

    const isUnlocked = window.GameState.isKnightUnlocked;

    // Disable button if locked
    this.knightButton.disabled = !isUnlocked;

    // Add/remove visual 'locked' class for styling
    this.knightButton.classList.toggle('locked', !isUnlocked);
    this.knightButton.classList.toggle('locked-unit', !isUnlocked); // Keep potentially different style

    // Add/remove lock icon overlay
    const existingOverlay = this.knightButton.querySelector('.lock-overlay');
    if (!isUnlocked) {
        if (!existingOverlay) {
            const lockOverlay = document.createElement('div');
            lockOverlay.className = 'lock-overlay';
            lockOverlay.innerHTML = '🔒';
            // Basic styling for the lock overlay
            this.knightButton.style.position = 'relative'; // Ensure button is positioned
            lockOverlay.style.position = 'absolute';
            lockOverlay.style.top = '50%';
            lockOverlay.style.left = '50%';
            lockOverlay.style.transform = 'translate(-50%, -50%)';
            lockOverlay.style.fontSize = '1.5em'; // Adjust size as needed
            lockOverlay.style.pointerEvents = 'none'; // Prevent click interception
            lockOverlay.style.zIndex = '1';
            lockOverlay.style.opacity = '0.8';
             lockOverlay.style.color = '#ccc'; // Color of the lock icon
            this.knightButton.appendChild(lockOverlay);
        }
    } else {
        // Remove overlay if it exists and unit is unlocked
        if (existingOverlay) {
            this.knightButton.removeChild(existingOverlay);
        }
         // Reset position if no longer needed (optional)
         // this.knightButton.style.position = '';
    }

    // Update ARIA label for accessibility
    this.knightButton.setAttribute('aria-label', `Select Knight unit${isUnlocked ? '' : ' (Locked)'}`);

    // Update tooltip content (uses generateTooltip which checks lock status)
    if (this.knightButtonTooltip) {
      this.knightButtonTooltip.innerHTML = this.generateTooltip("Knight");
    }

    // If the currently selected unit is Knight, refresh the info panel
    if (window.Units.selectedUnitType && window.Units.selectedUnitType.name === "Knight") {
      this.updateUnitInfoPanel();
    }
  };


  // Expose UI
  window.UI = UI;
})();
// --- END OF FILE ui.js ---