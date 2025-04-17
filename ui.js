(function () {
  const UI = {};

  // DOM Elements
  UI.feedbackMessage = document.getElementById("feedbackMessage");
  UI.goldDisplay = document.getElementById("goldDisplay");
  UI.diamondDisplay = document.getElementById("diamondDisplay");
  UI.waveDisplay = document.getElementById("waveDisplay");
  UI.unitButtons = document.querySelectorAll(".unit-button"); // NodeList, might need update if buttons change
  UI.pauseMenu = document.getElementById("pauseMenu");
  UI.gameOverModal = document.getElementById("gameOverModal");
  UI.gameOverMessage = document.getElementById("gameOverMessage");
  UI.gameOverWave = document.getElementById("gameOverWave");
  UI.tutorialModal = document.getElementById("tutorialModal");
  UI.waveProgressBar = document.getElementById("waveProgressBar");
  UI.upgradesList = document.getElementById("upgradesList");
  UI.waveCooldownElement = document.getElementById("waveCooldown");
  UI.unitInfoPanel = document.getElementById("unitInfoPanel");
  UI.pauseButton = document.getElementById("pauseButton"); // Added reference

  // --- Knight Button References ---
  UI.knightButton = document.getElementById('knightButton');
  UI.knightButtonTooltip = UI.knightButton ? UI.knightButton.querySelector('.tooltip') : null; // Get tooltip span inside knight button

  // Audio Elements
  UI.spawnSound = document.getElementById("spawnSound");
  UI.attackSound = document.getElementById("attackSound");
  UI.winSound = document.getElementById("winSound");
  UI.loseSound = document.getElementById("loseSound");

  // Set default volume
  [UI.spawnSound, UI.attackSound, UI.winSound, UI.loseSound].forEach(audio => {
    if (audio) audio.volume = 0.3; // Lowered volume slightly
  });

  UI.checkAudioFiles = function () {
    // (Keep existing logic)
    const audioFiles = [
      { element: UI.spawnSound, path: "./sounds/spawn.mp3" },
      { element: UI.attackSound, path: "./sounds/attack.mp3" },
      { element: UI.winSound, path: "./sounds/win.mp3" },
      { element: UI.loseSound, path: "./sounds/lose.mp3" }
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
            audio.element.muted = true;
          }
        })
        .catch(e => {
          console.error(`Error checking audio file ${audio.path}:`, e);
          this.showFeedback("Audio files may not load correctly.");
          audio.element.muted = true;
        });
    });
  };

  UI.drawWaveCooldown = function (seconds) {
    if (!this.waveCooldownElement) return;
    this.waveCooldownElement.textContent = `Next Wave in ${seconds}s`;
    this.waveCooldownElement.style.display = "block";
    this.waveCooldownElement.style.color = seconds <= 1 ? "#dc3545" : seconds <= 2 ? "#ffd700" : "#28a745";
  };

  UI.hideWaveCooldown = function () {
    if (this.waveCooldownElement) this.waveCooldownElement.style.display = "none";
  };

  UI.updateFooter = function () {
    if (this.goldDisplay) this.goldDisplay.textContent = Math.max(0, window.GameState.gold);
    if (this.diamondDisplay) this.diamondDisplay.textContent = Math.max(0, window.GameState.diamonds);
    if (this.waveDisplay) this.waveDisplay.textContent = window.GameState.wave;
  };

  UI.drawWaveProgress = function () {
    if (!this.waveProgressBar) return;
    const progress = Math.min(1, (window.GameState.wave - 1) / window.GameState.maxWaves); // Cap at 1
    this.waveProgressBar.style.width = `${progress * 100}%`;
  };

  UI.updateUpgradesDisplay = function () {
    if (!this.upgradesList) return;
    let upgradesText = "";
    if (window.GameState.baseHealthUpgrades > 0) upgradesText += `<li>Base Health: +${window.GameState.baseHealthUpgrades * 25} HP (${window.GameState.baseHealthUpgrades})</li>`;
    if (window.GameState.unitHealthUpgrades > 0) upgradesText += `<li>Unit Health: +${window.GameState.unitHealthUpgrades * 3} HP (${window.GameState.unitHealthUpgrades})</li>`;
    if (window.GameState.unitDamageUpgrades > 0) upgradesText += `<li>Unit Damage: +${window.GameState.unitDamageUpgrades * 2} DMG (${window.GameState.unitDamageUpgrades})</li>`;
    if (window.GameState.goldProductionUpgrades > 0) upgradesText += `<li>Gold Rate: ${window.GameState.goldProductionRate}ms (${window.GameState.goldProductionUpgrades})</li>`; // Show interval time
    if (window.GameState.baseDefenseUpgrades > 0) upgradesText += `<li>Base Defense: ${window.GameState.baseDefenseUpgrades * 10}% (${window.GameState.baseDefenseUpgrades})</li>`;
    // --- Check GameState flag for Knight ---
    if (window.GameState.isKnightUnlocked) upgradesText += `<li>Knight: Unlocked</li>`;
    // --- End Knight Check ---
    this.upgradesList.innerHTML = upgradesText ? `<ul>${upgradesText}</ul>` : "<p>No upgrades purchased yet.</p>";
  };

  UI.showFeedback = function (message) {
    if (!this.feedbackMessage) return;
    this.feedbackMessage.textContent = message;
    this.feedbackMessage.classList.remove("show"); // Remove first to reset animation if concurrent calls
    void this.feedbackMessage.offsetWidth; // Trigger reflow
    this.feedbackMessage.classList.add("show");
    // Clear previous timeout if exists
    if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
    this.feedbackTimeout = setTimeout(() => {
      this.feedbackMessage.classList.remove("show");
    }, 3000);
  };

  UI.showDamageNumber = function (x, y, amount, isPlayerTakingDamage) {
    if (!amount || amount <= 0) return; // Don't show 0 damage

    // Play sound only when player units deal damage
    if (window.GameState.soundEnabled && !isPlayerTakingDamage) {
      // --- ADDED DEBUG LOG ---
      console.log("Attempting to play audio from src:", this.attackSound ? this.attackSound.src : 'ERROR: attackSound element not found');
      // --- END DEBUG LOG ---

      // Create a new audio element for each attack to allow overlapping sounds
      const attackAudio = new Audio(this.attackSound.src);
      attackAudio.volume = this.attackSound.volume; // Use configured volume
      attackAudio.play().catch(e => console.error("Attack sound error:", e)); // Line 124 (approx)
    }

    const damageText = document.createElement("div");
    damageText.textContent = `-${Math.floor(amount)}`;
    damageText.className = "damage-text";
    // Position relative to canvas, not body
    const canvasRect = window.Canvas.canvas.getBoundingClientRect();
    damageText.style.left = `${x + canvasRect.left}px`;
    damageText.style.top = `${y + canvasRect.top - 20}px`; // Adjust vertical offset
    damageText.style.color = isPlayerTakingDamage ? "#ff4d4d" : "#ffd700"; // Brighter red for player damage

    document.body.appendChild(damageText); // Append to body to overlay canvas

    // Animation
    requestAnimationFrame(() => {
        damageText.style.transform = "translateY(-40px)"; // Move further up
        damageText.style.opacity = "0";
    });

    setTimeout(() => {
      if (document.body.contains(damageText)) { // Check if still exists
           document.body.removeChild(damageText);
      }
    }, 800); // Slightly shorter duration
  };

  UI.showGameOverModal = function (message) {
    if (window.GameState.gameOver) return; // Prevent multiple calls

    window.GameState.gameOver = true;
    window.GameState.gameActive = false; // Ensure game stops
    window.GameState.gamePaused = true; // Treat as paused

    if (window.GameState.waveCooldownInterval) {
      clearInterval(window.GameState.waveCooldownInterval);
      window.GameState.waveCooldownInterval = null;
      this.hideWaveCooldown();
    }
     if (window.GameState.goldInterval) {
         clearInterval(window.GameState.goldInterval); // Stop gold production
         window.GameState.goldInterval = null;
     }


    this.gameOverMessage.textContent = message;
    this.gameOverWave.textContent = `Reached Wave: ${window.GameState.wave}`;
    this.gameOverModal.style.display = "flex";
    this.updateButtonStates(); // Disable most buttons

    // Play sound only once
    if (window.GameState.soundEnabled) {
        const soundToPlay = (message === "Victory!") ? this.winSound : this.loseSound;
        if (soundToPlay) {
            soundToPlay.currentTime = 0; // Rewind if already playing
            soundToPlay.play().catch(e => console.error("Game Over sound error:", e));
        }
    }
  };

  UI.showTutorial = function () {
    if (this.tutorialModal) this.tutorialModal.style.display = "flex";
  };

  // --- Removed addKnightButton function - button exists in HTML ---

  UI.updateUnitSelectionUI = function () {
    const selectedTypeName = window.Units.selectedUnitType ? window.Units.selectedUnitType.name.toUpperCase() : null;
    this.unitButtons.forEach(btn => {
        if (btn.dataset.unit === selectedTypeName) {
            btn.classList.add("selected"); // Use 'selected' class from CSS
        } else {
            btn.classList.remove("selected");
        }
    });
    this.updateUnitInfoPanel(); // Update info panel when selection changes
  };

  UI.addTooltips = function () {
    // Refresh NodeList in case buttons were added/removed (though Knight isn't added dynamically now)
    this.unitButtons = document.querySelectorAll(".unit-button");
    this.unitButtons.forEach(button => {
      const unitType = button.dataset.unit;
      if (unitType && window.Units.UNIT_TYPES[unitType]) {
          const tooltipSpan = button.querySelector(".tooltip");
          if (tooltipSpan) {
              // Generate base tooltip content
              tooltipSpan.innerHTML = this.generateTooltip(window.Units.UNIT_TYPES[unitType].name);
              // Knight specific text (locked/unlocked) is handled by updateKnightButtonState
          }
      }
    });
    // Ensure Knight tooltip is correct based on current state
    this.updateKnightButtonState();
  };

  UI.generateTooltip = function (unitName) {
    const unit = window.Units.UNIT_TYPES[unitName.toUpperCase()];
    if (!unit) return "Unit data not found";

    // Calculate stats including upgrades
    const health = unit.health + (window.GameState.unitHealthUpgrades * 3);
    const damage = unit.damage; // Damage upgrades are directly in UNIT_TYPES now
    const speed = unit.speed.toFixed(1);
    const cost = unit.cost;
    let description = "";

    switch (unitName.toUpperCase()) {
      case "BARBARIAN": description = "Balanced fighter."; break;
      case "ARCHER": description = "High damage, fragile."; break;
      case "HORSE": description = "Fast and strong."; break;
      case "KNIGHT": description = "Tanky, high damage."; break; // Base description
    }

    // Basic HTML structure for the tooltip content
    return `
      <strong>${unitName}</strong><br>
      ${description}<br>
      <span class="tooltip-stat">❤️ Health: ${health}</span><br>
      <span class="tooltip-stat">⚔️ Damage: ${damage}</span><br>
      <span class="tooltip-stat">🏃 Speed: ${speed}</span><br>
      <span class="tooltip-stat">💰 Cost: ${cost} gold</span>
    `;
  };

  UI.updateUnitInfoPanel = function () {
    if (!this.unitInfoPanel || !window.Units.selectedUnitType) {
        if (this.unitInfoPanel) this.unitInfoPanel.innerHTML = ""; // Clear panel if no unit selected
        return;
    }
    const unit = window.Units.selectedUnitType;
    const health = unit.health + (window.GameState.unitHealthUpgrades * 3);
    const damage = unit.damage;
    const speed = unit.speed.toFixed(1);
    const cost = unit.cost;
    let description = "";

    switch (unit.name.toUpperCase()) {
       case "BARBARIAN": description = "Balanced fighter, good for early waves."; break;
       case "ARCHER": description = "High damage, fragile. Great for ranged support."; break;
       case "HORSE": description = "Fast and strong, ideal for quick strikes."; break;
       case "KNIGHT": description = "Tanky with high damage, excels in late waves."; break;
    }

    // Check if Knight is selected but locked
    const isLockedKnight = (unit.name === "Knight" && !window.GameState.isKnightUnlocked);

    this.unitInfoPanel.innerHTML = `
      <h4>${unit.name} ${isLockedKnight ? '(Locked)' : ''}</h4>
      <p>${description}</p>
      <p><span class="stat-icon">❤️</span>Health: ${health}</p>
      <p><span class="stat-icon">⚔️</span>Damage: ${damage}</p>
      <p><span class="stat-icon">🏃</span>Speed: ${speed}</p>
      <p><span class="stat-icon">💰</span>Cost: ${cost} gold</p>
      ${isLockedKnight ? '<p style="color: #ffcc00;">Unlock in the Shop!</p>' : ''}
    `;
  };

  UI.updateButtonStates = function () {
    const fightButton = document.getElementById("fightButton");
    const pauseButton = document.getElementById("pauseButton");
    const surrenderButton = document.getElementById("surrenderButton");
    const restartButton = document.getElementById("restartButton");
    const spawnButton = document.getElementById("spawnButton");

    // Fight button enabled only when game not active, not over, and wave cooldown finished
    if (fightButton) fightButton.disabled = window.GameState.gameActive || window.GameState.gameOver || window.GameState.waveCooldown;
    // Pause button enabled only when game is active and not over
    if (pauseButton) pauseButton.disabled = !window.GameState.gameActive || window.GameState.gameOver;
    // Surrender button enabled only when game is active and not over
    if (surrenderButton) surrenderButton.disabled = !window.GameState.gameActive || window.GameState.gameOver;
    // Restart button always enabled? Or maybe disable during active game? Let's keep it enabled.
    // if (restartButton) restartButton.disabled = false;
    // Spawn button enabled only when game active, not paused, not over
    if (spawnButton) spawnButton.disabled = !window.GameState.gameActive || window.GameState.gamePaused || window.GameState.gameOver;

    // Update Pause button text
    if (pauseButton) pauseButton.textContent = window.GameState.gamePaused ? "Resume" : "Pause";

    // Update Knight button state separately
    this.updateKnightButtonState();
  };

  // --- New Function to Update Knight Button ---
  UI.updateKnightButtonState = function() {
      if (!this.knightButton) {
          // console.warn("Knight button element not found in UI cache.");
          // Try to find it again, maybe it was added later (though it shouldn't be now)
          this.knightButton = document.getElementById('knightButton');
          this.knightButtonTooltip = this.knightButton ? this.knightButton.querySelector('.tooltip') : null;
          if (!this.knightButton) return; // Still not found, exit
      }

      const isUnlocked = window.GameState.isKnightUnlocked;

      this.knightButton.disabled = !isUnlocked; // Disable if not unlocked

      if (isUnlocked) {
          this.knightButton.classList.remove('locked');
          this.knightButton.setAttribute('aria-label', 'Select Knight unit');
          // Update tooltip text (remove locked status)
          if (this.knightButtonTooltip) {
               // Regenerate tooltip content without locked status
               this.knightButtonTooltip.innerHTML = this.generateTooltip("Knight");
          }
      } else {
          this.knightButton.classList.add('locked'); // Ensure locked class is present
          this.knightButton.setAttribute('aria-label', 'Select Knight unit (Locked)');
           // Ensure tooltip text shows locked status
           if (this.knightButtonTooltip) {
               // Regenerate base tooltip and add locked info
               this.knightButtonTooltip.innerHTML = this.generateTooltip("Knight") + '<br><span style="color: #ffcc00;">(Unlock in Shop)</span>';
           }
      }
      // Also update info panel if Knight is currently selected
      if (window.Units.selectedUnitType && window.Units.selectedUnitType.name === "Knight") {
          this.updateUnitInfoPanel();
      }
  };
  // --- End New Function ---


  // Expose UI
  window.UI = UI;
})();
