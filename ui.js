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

  // Audio Elements
  UI.spawnSound = document.getElementById("spawnSound");
  UI.attackSound = document.getElementById("attackSound");
  UI.winSound = document.getElementById("winSound");
  UI.loseSound = document.getElementById("loseSound");

  // Set default volume
  [UI.spawnSound, UI.attackSound, UI.winSound, UI.loseSound].forEach(audio => {
    if (audio) audio.volume = 0.3;
  });

  UI.checkAudioFiles = function () {
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
    const progress = Math.min(1, (window.GameState.wave - 1) / window.GameState.maxWaves);
    this.waveProgressBar.style.width = `${progress * 100}%`;
  };

  UI.updateUpgradesDisplay = function () {
    if (!this.upgradesList) return;
    let upgradesText = "";
    if (window.GameState.baseHealthUpgrades > 0) upgradesText += `<li>Base Health: +${window.GameState.baseHealthUpgrades * 25} HP (${window.GameState.baseHealthUpgrades})</li>`;
    if (window.GameState.unitHealthUpgrades > 0) upgradesText += `<li>Unit Health: +${window.GameState.unitHealthUpgrades * 3} HP (${window.GameState.unitHealthUpgrades})</li>`;
    if (window.GameState.unitDamageUpgrades > 0) upgradesText += `<li>Unit Damage: +${window.GameState.unitDamageUpgrades * 2} DMG (${window.GameState.unitDamageUpgrades})</li>`;
    if (window.GameState.goldProductionUpgrades > 0) upgradesText += `<li>Gold Rate: ${window.GameState.goldProductionRate}ms (${window.GameState.goldProductionUpgrades})</li>`;
    if (window.GameState.baseDefenseUpgrades > 0) upgradesText += `<li>Base Defense: ${window.GameState.baseDefenseUpgrades * 10}% (${window.GameState.baseDefenseUpgrades})</li>`;
    if (window.GameState.isKnightUnlocked) upgradesText += `<li>Knight: Unlocked</li>`;
    this.upgradesList.innerHTML = upgradesText ? `<ul>${upgradesText}</ul>` : "<p>No upgrades purchased yet.</p>";
  };

  UI.showFeedback = function (message) {
    if (!this.feedbackMessage) return;
    this.feedbackMessage.textContent = message;
    this.feedbackMessage.classList.remove("show");
    void this.feedbackMessage.offsetWidth;
    this.feedbackMessage.classList.add("show");
    if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
    this.feedbackTimeout = setTimeout(() => {
      this.feedbackMessage.classList.remove("show");
    }, 3000);
  };

  UI.showDamageNumber = function (x, y, amount, isPlayerTakingDamage) {
    if (!amount || amount <= 0) return;

    if (window.GameState.soundEnabled && !isPlayerTakingDamage) {
      console.log("Attempting to play audio from src:", this.attackSound ? this.attackSound.src : 'ERROR: attackSound element not found');
      const attackAudio = new Audio(this.attackSound.src);
      attackAudio.volume = this.attackSound.volume;
      attackAudio.play().catch(e => console.error("Attack sound error:", e));
    }

    const damageText = document.createElement("div");
    damageText.textContent = `-${Math.floor(amount)}`;
    damageText.className = "damage-text";
    const canvasRect = window.Canvas.canvas.getBoundingClientRect();
    damageText.style.left = `${x + canvasRect.left}px`;
    damageText.style.top = `${y + canvasRect.top - 20}px`;
    damageText.style.color = isPlayerTakingDamage ? "#ff4d4d" : "#ffd700";

    document.body.appendChild(damageText);

    requestAnimationFrame(() => {
      damageText.style.transform = "translateY(-40px)";
      damageText.style.opacity = "0";
    });

    setTimeout(() => {
      if (document.body.contains(damageText)) {
        document.body.removeChild(damageText);
      }
    }, 800);
  };

  UI.showGameOverModal = function (message) {
    if (window.GameState.gameOver) return;
    window.GameState.gameOver = true;
    window.GameState.gameActive = false;
    window.GameState.gamePaused = true;
    window.Game.gameLoopRunning = false; // Reset loop flag

    if (window.GameState.waveCooldownInterval) {
      clearInterval(window.GameState.waveCooldownInterval);
      window.GameState.waveCooldownInterval = null;
      this.hideWaveCooldown();
    }
    if (window.GameState.goldInterval) {
      clearInterval(window.GameState.goldInterval);
      window.GameState.goldInterval = null;
    }

    this.gameOverMessage.textContent = message;
    this.gameOverWave.textContent = `Reached Wave: ${window.GameState.wave}`;
    this.gameOverModal.style.display = "flex";
    this.updateButtonStates();

    if (window.GameState.soundEnabled) {
      const soundToPlay = (message === "Victory!") ? this.winSound : this.loseSound;
      if (soundToPlay) {
        soundToPlay.currentTime = 0;
        soundToPlay.play().catch(e => console.error("Game Over sound error:", e));
      }
    }
  };

  UI.showTutorial = function () {
    if (this.tutorialModal) this.tutorialModal.style.display = "flex";
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
    this.unitButtons = document.querySelectorAll(".unit-button");
    this.unitButtons.forEach(button => {
      const unitType = button.dataset.unit;
      if (unitType && window.Units.UNIT_TYPES[unitType]) {
        const tooltipSpan = button.querySelector(".tooltip");
        if (tooltipSpan) {
          tooltipSpan.innerHTML = this.generateTooltip(window.Units.UNIT_TYPES[unitType].name);
        }
      }
    });
    this.updateKnightButtonState();
  };

  UI.generateTooltip = function (unitName) {
    const unit = window.Units.UNIT_TYPES[unitName.toUpperCase()];
    if (!unit) return "Unit data not found";

    const health = unit.health + (window.GameState.unitHealthUpgrades * 3);
    const damage = unit.damage;
    const speed = unit.speed.toFixed(1);
    const cost = unit.cost;
    let description = "";

    switch (unitName.toUpperCase()) {
      case "BARBARIAN": description = "Balanced fighter."; break;
      case "ARCHER": description = "High damage, fragile."; break;
      case "HORSE": description = "Fast and strong."; break;
      case "KNIGHT": description = "Tanky, high damage."; break;
    }

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
      if (this.unitInfoPanel) this.unitInfoPanel.innerHTML = "";
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

    if (fightButton) fightButton.disabled = window.GameState.gameActive || window.GameState.gameOver || window.GameState.waveCooldown;
    if (pauseButton) pauseButton.disabled = !window.GameState.gameActive || window.GameState.gameOver;
    if (surrenderButton) surrenderButton.disabled = !window.GameState.gameActive || window.GameState.gameOver;
    if (spawnButton) spawnButton.disabled = !window.GameState.gameActive || window.GameState.gamePaused || window.GameState.gameOver;

    if (pauseButton) pauseButton.textContent = window.GameState.gamePaused ? "Resume" : "Pause";

    this.updateKnightButtonState();
  };

  UI.updateKnightButtonState = function() {
    if (!this.knightButton) {
      this.knightButton = document.getElementById('knightButton');
      this.knightButtonTooltip = this.knightButton ? this.knightButton.querySelector('.tooltip') : null;
    }
    if (!this.knightButton) {
      console.warn("Knight button not found in DOM.");
      return;
    }

    const isUnlocked = window.GameState.isKnightUnlocked;

    this.knightButton.disabled = !isUnlocked;
    this.knightButton.classList.toggle('locked', !isUnlocked);
    this.knightButton.setAttribute('aria-label', `Select Knight unit${isUnlocked ? '' : ' (Locked)'}`);

    if (this.knightButtonTooltip) {
      this.knightButtonTooltip.innerHTML = this.generateTooltip("Knight") + (isUnlocked ? '' : '<br><span style="color: #ffcc00;">(Unlock in Shop)</span>');
    }

    if (window.Units.selectedUnitType && window.Units.selectedUnitType.name === "Knight") {
      this.updateUnitInfoPanel();
    }
  };

  // Expose UI
  window.UI = UI;
})();