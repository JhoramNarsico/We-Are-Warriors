(function () {
  const UI = {};

  // DOM Elements Caching
  UI.feedbackMessage = document.getElementById("feedbackMessage");
  UI.goldDisplay = document.getElementById("goldDisplay");
  UI.diamondDisplay = document.getElementById("diamondDisplay");
  UI.waveDisplay = document.getElementById("waveDisplay");
  UI.unitButtons = document.querySelectorAll(".unit-button");
  UI.pauseMenu = document.getElementById("pauseMenu");
  UI.gameOverModal = document.getElementById("gameOverModal");
  UI.gameOverMessage = document.getElementById("gameOverMessage");
  UI.gameOverWave = document.getElementById("gameOverWave");
  UI.tutorialModal = document.getElementById("tutorialModal");
  UI.waveProgressBar = document.getElementById("waveProgressBar");
  UI.upgradesList = document.getElementById("upgradesList");
  UI.waveCooldownElement = document.getElementById("waveCooldown");
  UI.unitInfoPanel = document.getElementById("unitInfoPanel");
  UI.pauseButton = document.getElementById("pauseButton");
  UI.knightButton = document.getElementById('knightButton');
  UI.knightButtonTooltip = UI.knightButton ? UI.knightButton.querySelector('.tooltip') : null;

  // Audio Elements Caching & Setup
  UI.spawnSound = document.getElementById("spawnSound");
  UI.attackSound = document.getElementById("attackSound");
  UI.winSound = document.getElementById("winSound");
  UI.loseSound = document.getElementById("loseSound");
  UI.backgroundMusic = document.getElementById("backgroundMusic");
  UI.buttonClickSound = document.getElementById("buttonClickSound");

  // Set default audio volumes
  [UI.spawnSound, UI.attackSound, UI.winSound, UI.loseSound].forEach(audio => {
    if (audio) audio.volume = 0.3;
  });
  if (UI.backgroundMusic) UI.backgroundMusic.volume = 0.15;
  if (UI.buttonClickSound) UI.buttonClickSound.volume = 0.4;

  // Check if audio files are accessible
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
      // Use fetch HEAD request to check existence without downloading
      fetch(audio.path, { method: "HEAD" })
        .then(response => {
          if (!response.ok) {
            console.error(`Audio file not found or inaccessible: ${audio.path} (Status: ${response.status})`);
            this.showFeedback(`Audio file unavailable: ${audio.path.split("/").pop()}`);
          }
        })
        .catch(e => {
          console.error(`Error checking audio file ${audio.path}:`, e);
          this.showFeedback("Audio files may not load correctly.");
        });
    });
  };

  // --- Background Music Control ---
  UI.playBackgroundMusic = function() {
      if (!this.backgroundMusic || !window.GameState || !window.GameState.soundEnabled) return;
      // Use a flag to avoid calling play repeatedly if already playing attempt is pending/successful
      if (this.backgroundMusic.paused && !this.backgroundMusic.playingFlag) {
          this.backgroundMusic.playingFlag = true;
          this.backgroundMusic.play().then(() => {
              console.log("BG Music Playing");
              // Flag remains true while playing
          }).catch(e => {
              if (e.name !== 'NotAllowedError') { // Ignore errors due to browser policy requiring interaction
                  console.error("Background music play error:", e);
              }
              this.backgroundMusic.playingFlag = false; // Reset flag on error
          });
      }
  };

  UI.pauseBackgroundMusic = function() {
      if (this.backgroundMusic && !this.backgroundMusic.paused) {
          this.backgroundMusic.pause();
          this.backgroundMusic.playingFlag = false; // Reset flag when paused
          console.log("BG Music Paused");
      }
  };

  UI.updateBackgroundMusicState = function() {
      if (!this.tutorialModal || !window.GameState) return; // Ensure prerequisites exist
      const isTutorialVisible = this.tutorialModal.style.display === 'flex';

      // Play music if sound is enabled AND (game is active and not paused/over OR tutorial is visible)
      const shouldPlay = window.GameState.soundEnabled &&
                         ((window.GameState.gameActive && !window.GameState.gamePaused && !window.GameState.gameOver) || isTutorialVisible);

      if (shouldPlay) {
          this.playBackgroundMusic();
      } else {
          this.pauseBackgroundMusic();
      }
  };

  // Play button click sound effect
  UI.playButtonClickSound = function() {
      if (this.buttonClickSound && window.GameState && window.GameState.soundEnabled) {
          this.buttonClickSound.currentTime = 0; // Rewind to start
          this.buttonClickSound.play().catch(e => console.error("Button click sound error:", e));
      }
  };

  // --- Wave Cooldown Display ---
  UI.drawWaveCooldown = function (seconds) {
    if (!this.waveCooldownElement) return;

    this.waveCooldownElement.textContent = `Next Wave in ${seconds} seconds`;
    this.waveCooldownElement.style.display = "block";

    // Styling based on remaining time
    if (seconds <= 1) {
      this.waveCooldownElement.style.color = "#ff3333"; // Red
      this.waveCooldownElement.style.fontWeight = "bold";
    } else if (seconds <= 3) {
      this.waveCooldownElement.style.color = "#ffcc00"; // Yellow
      this.waveCooldownElement.style.fontWeight = "bold";
    } else {
      this.waveCooldownElement.style.color = "#33cc33"; // Green
      this.waveCooldownElement.style.fontWeight = "normal";
    }

    // Pulse animation for last few seconds
    this.waveCooldownElement.classList.toggle("pulse-animation", seconds <= 3);
  };

  UI.hideWaveCooldown = function () {
    if (this.waveCooldownElement) {
      this.waveCooldownElement.style.display = "none";
      this.waveCooldownElement.classList.remove("pulse-animation");
    }
  };

  // Update header/footer resource displays
  UI.updateFooter = function () {
      if (!window.GameState) return; // Check if GameState exists
      if (this.goldDisplay) this.goldDisplay.textContent = Math.max(0, Math.floor(window.GameState.gold));
      if (this.diamondDisplay) this.diamondDisplay.textContent = Math.max(0, Math.floor(window.GameState.diamonds));
      if (this.waveDisplay) this.waveDisplay.textContent = window.GameState.wave;
  };

  // Update wave progress bar
  UI.drawWaveProgress = function () {
    if (!this.waveProgressBar || !window.GameState) return;
    const progress = Math.min(1, Math.max(0, (window.GameState.wave - 1) / window.GameState.maxWaves));
    this.waveProgressBar.style.width = `${progress * 100}%`;
  };

  // Display current upgrades in the pause menu
  UI.updateUpgradesDisplay = function () {
    if (!this.upgradesList || !window.GameState) return;

    let upgradesContent = "";
    const gs = window.GameState; // Shorthand

    // Add list items for each purchased upgrade type
    if (gs.baseHealthUpgrades > 0) upgradesContent += `<li class="upgrade-item"><span class="upgrade-icon">🛡️</span> <span class="upgrade-name">Base Health:</span> <span class="upgrade-value">+${gs.baseHealthUpgrades * 25} HP</span> <span class="upgrade-level">(Lv ${gs.baseHealthUpgrades})</span></li>`;
    if (gs.unitHealthUpgrades > 0) upgradesContent += `<li class="upgrade-item"><span class="upgrade-icon">❤️</span> <span class="upgrade-name">Unit Health:</span> <span class="upgrade-value">+${gs.unitHealthUpgrades * 3} HP</span> <span class="upgrade-level">(Lv ${gs.unitHealthUpgrades})</span></li>`;
    if (gs.unitDamageUpgrades > 0) upgradesContent += `<li class="upgrade-item"><span class="upgrade-icon">⚔️</span> <span class="upgrade-name">Unit Damage:</span> <span class="upgrade-value">+${gs.unitDamageUpgrades * 2} DMG</span> <span class="upgrade-level">(Lv ${gs.unitDamageUpgrades})</span></li>`;
    if (gs.goldProductionUpgrades > 0) upgradesContent += `<li class="upgrade-item"><span class="upgrade-icon">💰</span> <span class="upgrade-name">Gold Rate:</span> <span class="upgrade-value">${gs.goldProductionRate}ms</span> <span class="upgrade-level">(Lv ${gs.goldProductionUpgrades})</span></li>`;
    if (gs.baseDefenseUpgrades > 0) upgradesContent += `<li class="upgrade-item"><span class="upgrade-icon">🛡️</span> <span class="upgrade-name">Base Defense:</span> <span class="upgrade-value">${gs.baseDefenseUpgrades * 10}%</span> <span class="upgrade-level">(Lv ${gs.baseDefenseUpgrades})</span></li>`;
    if (gs.isKnightUnlocked) upgradesContent += `<li class="upgrade-item special-unlock"><span class="upgrade-icon">⚜️</span> <span class="upgrade-name">Knight:</span> <span class="upgrade-value">Unlocked</span></li>`;

    // Set the innerHTML of the upgrades list container
    this.upgradesList.innerHTML = upgradesContent ? `<ul class="upgrades-list">${upgradesContent}</ul>` : '<p class="no-upgrades">No upgrades purchased yet.</p>';
  };

  // Show temporary feedback message at the top
  UI.showFeedback = function (message) {
    if (!this.feedbackMessage) return;

    // Clear any existing timeouts to prevent overlaps/stuck messages
     if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
     if (this.feedbackRemoveTimeout) clearTimeout(this.feedbackRemoveTimeout);

    this.feedbackMessage.classList.remove("show", "fade-out", "slide-in");
    this.feedbackMessage.textContent = message;

    // Force reflow/repaint before adding classes for animation start
    void this.feedbackMessage.offsetWidth;

    this.feedbackMessage.classList.add("show", "slide-in"); // Add classes to trigger animation

    // Timeout to start fading out
    this.feedbackTimeout = setTimeout(() => {
      this.feedbackMessage.classList.add("fade-out");
      // Timeout to remove classes after fade-out completes
      this.feedbackRemoveTimeout = setTimeout(() => {
           this.feedbackMessage.classList.remove("show", "slide-in", "fade-out");
      }, 500); // Match fade-out animation duration in CSS
    }, 2500); // How long the message stays visible before fading
  };


  // Display floating damage numbers on the canvas
  UI.showDamageNumber = function (x, y, amount, isPlayerTakingDamage) {
    if (!window.GameState || !window.Canvas || !amount || amount <= 0) return; // Check prerequisites

    // Play sound only for damage dealt TO enemies or enemy base
    if (window.GameState.soundEnabled && !isPlayerTakingDamage && this.attackSound) {
      // Create new audio object for potentially overlapping sounds
      const attackAudio = new Audio(this.attackSound.src);
      attackAudio.volume = this.attackSound.volume;
      attackAudio.play().catch(e => console.error("Attack sound error:", e));
    }

    const damageText = document.createElement("div");
    damageText.textContent = `-${Math.floor(amount)}`;
    damageText.className = "damage-text";
    damageText.classList.toggle("player-damage", isPlayerTakingDamage);
    damageText.classList.toggle("enemy-damage", !isPlayerTakingDamage);

    // Calculate position relative to viewport using canvas info
    const canvasRect = window.Canvas.canvas.getBoundingClientRect();
    // Scaling factors if canvas render size differs from display size
    const scaleX = window.Canvas.canvas.width / window.Canvas.canvas.offsetWidth;
    const scaleY = window.Canvas.canvas.height / window.Canvas.canvas.offsetHeight;

    let targetX = x; // Use provided coordinate
    // Check proximity to base reference points
    const isEnemyBaseHit = !isPlayerTakingDamage && Math.abs(targetX - window.Canvas.canvas.width * 0.9375) < 30;
    const isPlayerBaseHit = isPlayerTakingDamage && Math.abs(targetX - window.Canvas.canvas.width * 0.075) < 30;

    // Calculate screen coordinates
    let left = (targetX / scaleX) + canvasRect.left + window.scrollX; // Add scroll offsets
    let top = (y / scaleY) + canvasRect.top - 20 + window.scrollY; // Offset above hit point, add scroll

    // Adjust position for base hits and add randomness for unit hits
    if (isEnemyBaseHit) { left += 15 * scaleX; top -= 5 * scaleY; damageText.classList.add("enemy-base-damage"); }
    else if (isPlayerBaseHit) { left -= 15 * scaleX; top += 5 * scaleY; damageText.classList.add("player-base-damage"); }
    else { left += (Math.random() - 0.5) * 10 * scaleX; } // Slight random offset for unit hits

    // Ensure text stays within viewport bounds (approximate)
    const textWidth = Math.min(50, 10 + damageText.textContent.length * 8); // Estimate width
    left = Math.max(5, Math.min(left, window.innerWidth - textWidth - 5));
    top = Math.max(5, Math.min(top, window.innerHeight - 20 - 5));

    // Apply styles
    damageText.style.left = `${left}px`;
    damageText.style.top = `${top}px`;
    damageText.style.color = isPlayerTakingDamage ? "#ff4d4d" : "#ffdd00"; // Red for player damage, Yellow for enemy
    damageText.style.fontSize = isPlayerBaseHit || isEnemyBaseHit ? "15px" : "12px";
    damageText.style.fontWeight = "bold";
    damageText.style.textShadow = "0 0 3px rgba(0,0,0,0.8), 0 0 1px #000";

    document.body.appendChild(damageText);

    // Trigger animation (move up and fade out)
     requestAnimationFrame(() => {
        damageText.style.transition = "transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.6s ease-in";
        damageText.style.transform = `translateY(-${25 + Math.random()*10}px) scale(1.1)`;
        // Start fading slightly after animation starts
        setTimeout(() => { damageText.style.opacity = "0"; }, 200);
    });

    // Remove element after animation + buffer
    setTimeout(() => {
      if (document.body.contains(damageText)) {
        document.body.removeChild(damageText);
      }
    }, 800);
  };


  // Show Game Over Modal
  UI.showGameOverModal = function (message) {
    if (!window.GameState || !window.Leaderboard || !window.Game || !window.Shop) return; // Check prerequisites

    if (window.GameState.gameOver) return; // Prevent multiple calls
    window.GameState.gameOver = true;
    window.GameState.gameActive = false;
    window.GameState.gamePaused = true; // Explicitly pause
    window.Game.gameLoopRunning = false; // Stop game loop

    this.updateBackgroundMusicState(); // Pause music

    // Show shop immediately
    const shop = document.getElementById("shop");
    const toggleShopButton = document.getElementById("toggleShopButton");
    if (shop) shop.style.display = "block";
    if (toggleShopButton) toggleShopButton.textContent = "Hide Shop";
    window.Shop.updateShop();

    // Clear intervals
    if (window.GameState.waveCooldownInterval) clearInterval(window.GameState.waveCooldownInterval);
    if (window.GameState.goldInterval) clearInterval(window.GameState.goldInterval);
    window.GameState.waveCooldownInterval = null;
    window.GameState.goldInterval = null;
    this.hideWaveCooldown();

    const isVictory = message === "Victory!";
    const isLoggedIn = !!window.GameState.currentUser;

    // --- Set Game Over Message Content ---
    if (!isLoggedIn && !isVictory) {
        // Logged-out Defeat: Provide instructions to log in
        this.gameOverMessage.innerHTML = `
            ${message} <!-- "Defeat!" -->
            <p style="font-size: 0.9em; margin-top: 15px; line-height: 1.4; color: #ccc;">
                Want to save your high score next time? Log in or Sign Up!
            </p>
            <p style="font-size: 0.8em; margin-top: 8px; line-height: 1.3; color: #aaa;">
                (Pause Menu -> New Game -> Refresh page to see Login options)
            </p>
        `;
    } else {
        // Logged-in or Victory: Simple message
        this.gameOverMessage.textContent = message;
    }
    this.gameOverMessage.className = isVictory ? "victory-message" : "defeat-message"; // Apply style class

    // Set wave reached text
    const finalWaveDisplay = isVictory ? window.GameState.maxWaves : window.GameState.wave;
    this.gameOverWave.textContent = `Reached Wave: ${finalWaveDisplay}`;

    // Display the modal with animation
    this.gameOverModal.style.display = "flex";
    this.gameOverModal.classList.remove("modal-animation");
    void this.gameOverModal.offsetWidth; // Force reflow
    this.gameOverModal.classList.add("modal-animation");

    // Update button states (e.g., disable fight)
    this.updateButtonStates();

     // --- Attempt to Save Score to Leaderboard ---
    if (isLoggedIn && Leaderboard.saveScore) {
        // Save wave number (or max+1 for win to rank higher than losing on max wave)
        const scoreToSave = isVictory ? window.GameState.maxWaves + 1 : window.GameState.wave;
        console.log(`Game over. Attempting to save score ${scoreToSave} for user ${window.GameState.currentUser.email}`);
        Leaderboard.saveScore(window.GameState.currentUser.uid, window.GameState.currentUser.email, scoreToSave);
    } else {
        console.log("Game over. User not logged in or Leaderboard module not ready. Score not saved online.");
    }

    // Play appropriate sound effect
    if (window.GameState.soundEnabled) {
      const soundToPlay = isVictory ? this.winSound : this.loseSound;
      if (soundToPlay) {
        soundToPlay.currentTime = 0;
        soundToPlay.play().catch(e => console.error("Game Over sound error:", e));
      }
    }
  };


  // Show Tutorial Modal
  UI.showTutorial = function () {
    if (!this.tutorialModal) { console.error("Tutorial modal element not found."); return; }
    if (!window.GameState) { console.error("GameState not available for tutorial."); return; }


    console.log("Showing tutorial modal.");
    this.tutorialModal.style.display = "flex";
    this.tutorialModal.classList.remove("tutorial-animation"); // Reset animation state
    void this.tutorialModal.offsetWidth; // Force reflow
    this.tutorialModal.classList.add("tutorial-animation"); // Start animation

    this.updateBackgroundMusicState(); // Update music (should play if enabled)

    // --- Setup Initial Tutorial Slide View ---
    const slides = this.tutorialModal.querySelectorAll('.tutorial-slide');
    const prevButton = this.tutorialModal.querySelector('#tutorialPrevButton');
    const nextButton = this.tutorialModal.querySelector('#tutorialNextButton');
    const startButton = this.tutorialModal.querySelector('#startTutorialButton');
    const loadButton = this.tutorialModal.querySelector('#loadGameButton');
    const totalSlides = slides.length;
    let currentSlideIndex = 0; // Start at the first slide

     slides.forEach((slide, index) => {
        slide.classList.toggle('active', index === currentSlideIndex);
    });

    // Update button states for the first slide
     if(prevButton) prevButton.disabled = true;
     if(nextButton) nextButton.style.display = currentSlideIndex >= totalSlides - 1 ? 'none' : 'inline-block';
     if(startButton) startButton.style.display = currentSlideIndex === totalSlides - 1 ? 'inline-block' : 'none';

     // Check for local save to show the "Load Game" button on the *last* slide
     if (loadButton) {
        const hasSave = localStorage.getItem('warriorGameState') !== null;
        loadButton.style.display = (currentSlideIndex === totalSlides - 1 && hasSave) ? 'inline-block' : 'none';
    } else { console.warn("Load game button not found in tutorial."); }

    // Focus the first interactive element for accessibility
    setTimeout(() => {
        if (nextButton && nextButton.style.display !== 'none') nextButton.focus();
        else if (startButton && startButton.style.display !== 'none') startButton.focus();
        else if (prevButton) prevButton.focus(); // Fallback
    }, 150); // Small delay for modal animation
  };


  // Update visual selection state of unit buttons
  UI.updateUnitSelectionUI = function () {
    if (!window.Units || !window.Units.selectedUnitType) return; // Check prerequisites
    const selectedTypeName = window.Units.selectedUnitType.name.toUpperCase();
    this.unitButtons.forEach(btn => {
        btn.classList.toggle("selected", btn.dataset.unit === selectedTypeName);
    });
    this.updateUnitInfoPanel(); // Refresh info panel when selection changes
  };

  // Add/Update tooltips for unit buttons
  UI.addTooltips = function () {
      if (!window.Units || !window.Units.BASE_UNIT_STATS || !window.GameState) {
           console.warn("Cannot add tooltips: Units or GameState not ready.");
           return;
      }
      this.unitButtons = document.querySelectorAll(".unit-button"); // Re-query in case DOM changed
      this.unitButtons.forEach(button => {
          const unitTypeKey = button.dataset.unit;
          if (unitTypeKey && window.Units.BASE_UNIT_STATS[unitTypeKey]) {
              const tooltipSpan = button.querySelector(".tooltip");
              if (tooltipSpan) {
                  // Generate tooltip content using dynamic stats
                  tooltipSpan.innerHTML = this.generateTooltip(unitTypeKey);

                  // Set ARIA attributes for accessibility
                  const tooltipId = `tooltip-${unitTypeKey.toLowerCase()}`;
                  button.setAttribute("aria-describedby", tooltipId);
                  tooltipSpan.id = tooltipId;
              } else { console.warn(`Tooltip span not found for button: ${unitTypeKey}`); }
          }
      });
      this.updateKnightButtonState(); // Ensure Knight button tooltip/state is also updated
  };

  // Generate HTML content for a unit tooltip
  UI.generateTooltip = function (unitTypeKey) {
    const unitBase = window.Units.BASE_UNIT_STATS[unitTypeKey.toUpperCase()]; // Get BASE stats
    if (!unitBase) return "Unit data not found";

    const isKnightLocked = unitTypeKey.toUpperCase() === "KNIGHT" && !window.GameState.isKnightUnlocked;

    // Calculate current stats based on base stats + GameState upgrades
    const currentHealth = Math.floor(unitBase.health + (window.GameState.unitHealthUpgrades * 3));
    const currentDamage = Math.floor(unitBase.damage + (window.GameState.unitDamageUpgrades * 2));

    return `
      <div class="tooltip-header">${unitBase.name} ${isKnightLocked ? '🔒' : ''}</div>
      <div class="tooltip-body">
        <div class="tooltip-stats">
            <span>❤️ ${currentHealth}</span> | <span>⚔️ ${currentDamage}</span> | <span>💰 ${unitBase.cost}</span>
        </div>
        <div class="tooltip-lore">${unitBase.lore}</div>
        <div class="tooltip-strengths"><strong>Strengths:</strong> ${unitBase.strengths}</div>
      </div>
      ${isKnightLocked ? '<div class="unlock-instruction">Purchase from Shop to unlock</div>' : ''}
    `;
  };

  // Update the unit information panel on the left sidebar
  UI.updateUnitInfoPanel = function () {
      if (!this.unitInfoPanel || !window.Units || !window.GameState) { return; } // Check prerequisites

      if (!window.Units.selectedUnitType) {
          this.unitInfoPanel.innerHTML = "<p>Select a unit to see details.</p>";
          return;
      }

      const unitBase = window.Units.selectedUnitType; // Holds reference to BASE stats object
      if (!unitBase) {
           this.unitInfoPanel.innerHTML = "<p>Error loading unit details.</p>";
           return;
      }

      // Calculate current stats dynamically
      const health = Math.floor(unitBase.health + (window.GameState.unitHealthUpgrades * 3));
      const damage = Math.floor(unitBase.damage + (window.GameState.unitDamageUpgrades * 2));
      const speed = unitBase.speed.toFixed(1);
      const cost = unitBase.cost;
      const range = unitBase.attackRange;
      const attackSpeed = unitBase.attackSpeed;

      let description = ""; let special = "";
       switch (unitBase.name.toUpperCase()) { // Use base name for consistency
          case "BARBARIAN": description = "Balanced melee fighter."; special = "Reliable frontline soldier."; break;
          case "ARCHER":    description = "Ranged attacker, vulnerable up close."; special = "Attacks from a safe distance."; break;
          case "HORSE":     description = "Fast charging melee unit."; special = "Quickly reaches the frontline or base."; break;
          case "KNIGHT":    description = "Heavily armored tank unit."; special = "High health and damage, but slower."; break;
          default:          description = "Unknown unit selected."; break;
      }

      const isLockedKnight = (unitBase.name === "Knight" && !window.GameState.isKnightUnlocked);

      // Generate panel HTML
      this.unitInfoPanel.innerHTML = `
      <div class="unit-info-header ${isLockedKnight ? 'locked' : ''}">
        <h4>${unitBase.name} ${isLockedKnight ? '<span class="lock-icon">🔒</span>' : ''}</h4>
      </div>
      <div class="unit-info-description"> <p>${description}</p> <p class="unit-special-ability">${special}</p> </div>
      <div class="unit-info-stats">
        <div class="stat-row"> <span class="stat-icon">❤️</span><span class="stat-label">Health:</span><span class="stat-value">${health}</span> </div>
        <div class="stat-row"> <span class="stat-icon">⚔️</span><span class="stat-label">Damage:</span><span class="stat-value">${damage}</span> </div>
        <div class="stat-row"> <span class="stat-icon">🏃</span><span class="stat-label">Speed:</span><span class="stat-value">${speed}</span> </div>
        <div class="stat-row"> <span class="stat-icon">🎯</span><span class="stat-label">Range:</span><span class="stat-value">${range}</span> </div>
        <div class="stat-row"> <span class="stat-icon">⏱️</span><span class="stat-label">Atk Spd:</span><span class="stat-value">${attackSpeed}ms</span> </div>
        <div class="stat-row"> <span class="stat-icon">💰</span><span class="stat-label">Cost:</span><span class="stat-value">${cost} gold</span> </div>
      </div>
      ${isLockedKnight ? '<div class="unit-locked-message">Unlock in the Shop!</div>' : ''}
    `;
  };


  // Update enabled/disabled states of various control buttons
  UI.updateButtonStates = function () {
      if (!window.GameState) return; // Need game state

      // Cache button elements once for performance
       if (!this._buttons) {
          this._buttons = {
              fight: document.getElementById("fightButton"),
              pause: document.getElementById("pauseButton"),
              surrender: document.getElementById("surrenderButton"),
              restart: document.getElementById("restartButton"),
              spawn: document.getElementById("spawnButton"),
              saveGame: document.getElementById("saveGameButton"), // Pause menu save
              surrenderPause: document.getElementById("surrenderPauseButton"), // May not exist if removed
              leaderboard: document.getElementById("leaderboardButton"),
              logout: document.getElementById("logoutButton")
              // Add others if needed (e.g., shop toggle, sound toggle?)
          };
      }
      const btns = this._buttons;
      const gs = window.GameState; // Shorthand

      // Game Control Buttons (Footer)
      if (btns.fight) btns.fight.disabled = gs.gameActive || gs.gameOver || gs.waveCooldown;
      if (btns.pause) btns.pause.disabled = !gs.gameActive || gs.gameOver; // Can only pause active, non-game-over state
      if (btns.surrender) btns.surrender.disabled = !gs.gameActive || gs.gameOver; // Can only surrender active game
      if (btns.spawn) btns.spawn.disabled = !gs.gameActive || gs.gamePaused || gs.gameOver; // Can only spawn when active and not paused/over
      if (btns.restart) btns.restart.disabled = false; // Restart is always available

      // Pause Menu Buttons
      if (btns.saveGame) btns.saveGame.disabled = !gs.gameActive || gs.gameOver; // Can only save an active game session
      if (btns.surrenderPause && btns.surrenderPause.isConnected) { // Check if element exists and is in DOM
          btns.surrenderPause.disabled = !gs.gameActive || gs.gameOver;
      }


       // Header Buttons (Auth/Leaderboard)
       const isLoggedIn = !!gs.currentUser;
       if (btns.leaderboard) btns.leaderboard.disabled = !isLoggedIn; // Enable leaderboard only if logged in
       if (btns.logout) btns.logout.style.display = isLoggedIn ? 'inline-block' : 'none'; // Show logout only if logged in


      // Update Pause button text based on state
      if (btns.pause) btns.pause.textContent = gs.gamePaused ? "Resume" : "Pause";

      this.updateKnightButtonState(); // Ensure knight button state reflects lock status
      // Tooltips are updated via addTooltips called elsewhere when stats might change
  };


  // Update visual state and accessibility attributes of the Knight button
  UI.updateKnightButtonState = function() {
      // Ensure button elements are cached or found
      if (!this.knightButton) {
          this.knightButton = document.getElementById('knightButton');
          if (this.knightButton) {
              this.knightButtonTooltip = this.knightButton.querySelector('.tooltip');
          }
      }
      if (!this.knightButton || !window.GameState) {
        console.warn("Knight button or GameState not found for update.");
        return;
      }

      const isUnlocked = window.GameState.isKnightUnlocked;

      // Disable button interactivity if locked
      this.knightButton.disabled = !isUnlocked;

      // Add/remove visual 'locked' class for styling
      this.knightButton.classList.toggle('locked', !isUnlocked);
      this.knightButton.classList.toggle('locked-unit', !isUnlocked); // Keep separate class for potential specific styles

      // Add/remove lock icon overlay for clearer visual indication
      const existingOverlay = this.knightButton.querySelector('.lock-overlay');
      if (!isUnlocked) {
          if (!existingOverlay) {
              const lockOverlay = document.createElement('div');
              lockOverlay.className = 'lock-overlay';
              lockOverlay.innerHTML = '🔒';
              // Apply basic styles for the lock overlay
              this.knightButton.style.position = 'relative'; // Ensure button positioning context
              Object.assign(lockOverlay.style, {
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)', fontSize: '1.5em',
                  pointerEvents: 'none', zIndex: '1', opacity: '0.8', color: '#ccc'
              });
              this.knightButton.appendChild(lockOverlay);
          }
      } else {
          // Remove overlay if it exists and unit is unlocked
          if (existingOverlay) {
              this.knightButton.removeChild(existingOverlay);
               this.knightButton.style.position = ''; // Reset position if needed
          }
      }

      this.knightButton.setAttribute('aria-label', `Select Knight unit${isUnlocked ? '' : ' (Locked)'}`);

      // Update tooltip content by regenerating it
      if (this.knightButtonTooltip) {
          this.knightButtonTooltip.innerHTML = this.generateTooltip("Knight");
      }

      // If Knight is currently selected, refresh the main info panel too
      if (window.Units && window.Units.selectedUnitType && window.Units.selectedUnitType.name === "Knight") {
        this.updateUnitInfoPanel();
      }
  };


  // Expose UI object globally
  window.UI = UI;
})();
