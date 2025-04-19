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
    
    this.feedbackMessage.classList.remove("show", "fade-out", "slide-in");
    
    this.feedbackMessage.textContent = message;
    
    void this.feedbackMessage.offsetWidth;
    
    this.feedbackMessage.classList.add("show", "slide-in");
    
    if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
    
    this.feedbackTimeout = setTimeout(() => {
      this.feedbackMessage.classList.add("fade-out");
      this.feedbackTimeout = setTimeout(() => {
        this.feedbackMessage.classList.remove("show", "slide-in", "fade-out");
      }, 500);
    }, 2500);
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
    
    if (isPlayerTakingDamage) {
      damageText.classList.add("player-damage");
    } else {
      damageText.classList.add("enemy-damage");
    }
    
    const canvasRect = window.Canvas.canvas.getBoundingClientRect();
    damageText.style.left = `${x + canvasRect.left}px`;
    damageText.style.top = `${y + canvasRect.top - 20}px`;
    
    damageText.style.color = isPlayerTakingDamage ? "#ff4d4d" : "#ffdd00";
    damageText.style.fontSize = isPlayerTakingDamage ? "18px" : "16px";
    damageText.style.fontWeight = "bold";
    damageText.style.textShadow = isPlayerTakingDamage ? 
      "0 0 3px rgba(0,0,0,0.8), 0 0 1px #000" : 
      "0 0 3px rgba(0,0,0,0.8), 0 0 1px #000";

    document.body.appendChild(damageText);

    requestAnimationFrame(() => {
      damageText.style.transition = "transform 0.8s ease-out, opacity 0.7s ease-in";
      damageText.style.transform = "translateY(-40px) scale(1.2)";
      
      setTimeout(() => {
        damageText.style.opacity = "0";
      }, 300);
    });

    setTimeout(() => {
      if (document.body.contains(damageText)) {
        document.body.removeChild(damageText);
      }
    }, 1000);
  };

  UI.showGameOverModal = function (message) {
    if (window.GameState.gameOver) return;
    window.GameState.gameOver = true;
    window.GameState.gameActive = false;
    window.GameState.gamePaused = true;
    window.Game.gameLoopRunning = false;

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
    
    this.gameOverMessage.textContent = message;
    this.gameOverMessage.className = isVictory ? "victory-message" : "defeat-message";
    
    this.gameOverWave.textContent = `Reached Wave: ${window.GameState.wave}`;
    this.gameOverModal.style.display = "flex";
    
    this.gameOverModal.classList.add("modal-animation");
    
    this.updateButtonStates();

    if (window.GameState.soundEnabled) {
      const soundToPlay = isVictory ? this.winSound : this.loseSound;
      if (soundToPlay) {
        soundToPlay.currentTime = 0;
        soundToPlay.play().catch(e => console.error("Game Over sound error:", e));
      }
    }
  };

  UI.showTutorial = function () {
    if (!this.tutorialModal) return;
    
    this.tutorialModal.style.display = "flex";
    this.tutorialModal.classList.add("tutorial-animation");

    const slides = this.tutorialModal.querySelectorAll('.tutorial-slide');
    const prevButton = this.tutorialModal.querySelector('#tutorialPrevButton');
    const nextButton = this.tutorialModal.querySelector('#tutorialNextButton');
    const startButton = this.tutorialModal.querySelector('#startTutorialButton');
    let currentSlide = 0;
    const totalSlides = slides.length;

    const updateSlide = () => {
      slides.forEach((slide, index) => {
        slide.classList.toggle('active', index === currentSlide);
      });
      prevButton.disabled = currentSlide === 0;
      nextButton.style.display = currentSlide === totalSlides - 1 ? 'none' : 'inline-block';
      startButton.style.display = currentSlide === totalSlides - 1 ? 'inline-block' : 'none';
    };

    prevButton.addEventListener('click', () => {
      if (currentSlide > 0) {
        currentSlide--;
        updateSlide();
      }
    });

    nextButton.addEventListener('click', () => {
      if (currentSlide < totalSlides - 1) {
        currentSlide++;
        updateSlide();
      }
    });

    updateSlide();
    
    setTimeout(() => {
      prevButton.focus();
    }, 100);
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
          tooltipSpan.innerHTML = this.generateTooltip(unitType);
          
          button.setAttribute("aria-describedby", `tooltip-${unitType.toLowerCase()}`);
          tooltipSpan.id = `tooltip-${unitType.toLowerCase()}`;
        }
      }
    });
    this.updateKnightButtonState();
  };

  UI.generateTooltip = function (unitName) {
    const unit = window.Units.UNIT_TYPES[unitName.toUpperCase()];
    if (!unit) return "Unit data not found";

    const isKnightLocked = unitName.toUpperCase() === "KNIGHT" && !window.GameState.isKnightUnlocked;
    return `
      <div class="tooltip-header">${unit.name}</div>
      <div class="tooltip-body">
        <div class="tooltip-lore">${unit.lore}</div>
        <div class="tooltip-strengths"><strong>Strengths:</strong> ${unit.strengths}</div>
      </div>
      ${isKnightLocked ? '<div class="unlock-instruction">Purchase from Shop to unlock</div>' : ''}
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
    let special = "";

    switch (unit.name.toUpperCase()) {
      case "BARBARIAN": 
        description = "Balanced fighter with good survivability."; 
        special = "No special abilities, but reliable in most situations.";
        break;
      case "ARCHER": 
        description = "High damage from a distance."; 
        special = "Can attack enemies before they get close.";
        break;
      case "HORSE": 
        description = "Fast movement with strong charge attacks."; 
        special = "Reaches enemies quickly to disrupt their formations.";
        break;
      case "KNIGHT": 
        description = "Heavy armor with powerful strikes."; 
        special = "Can withstand significant damage while dealing heavy blows.";
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
          <span class="stat-icon">💰</span>
          <span class="stat-label">Cost:</span>
          <span class="stat-value">${cost} gold</span>
        </div>
      </div>
      
      ${isLockedKnight ? '<div class="unit-locked-message">Unlock in the Shop!</div>' : ''}
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
    
    if (!isUnlocked) {
      this.knightButton.classList.add('locked-unit');
      if (!this.knightButton.querySelector('.lock-overlay')) {
        const lockOverlay = document.createElement('div');
        lockOverlay.className = 'lock-overlay';
        lockOverlay.innerHTML = '🔒';
        this.knightButton.appendChild(lockOverlay);
      }
    } else {
      this.knightButton.classList.remove('locked-unit');
      const lockOverlay = this.knightButton.querySelector('.lock-overlay');
      if (lockOverlay) {
        this.knightButton.removeChild(lockOverlay);
      }
    }
    
    this.knightButton.setAttribute('aria-label', `Select Knight unit${isUnlocked ? '' : ' (Locked)'}`);

    if (this.knightButtonTooltip) {
      this.knightButtonTooltip.innerHTML = this.generateTooltip("Knight");
    }

    if (window.Units.selectedUnitType && window.Units.selectedUnitType.name === "Knight") {
      this.updateUnitInfoPanel();
    }
  };

  // Expose UI
  window.UI = UI;
})();