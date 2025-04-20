(function () {
  const Canvas = {};

  // Canvas Setup
  Canvas.canvas = document.getElementById("gameCanvas");
  Canvas.ctx = Canvas.canvas.getContext("2d");

  // Animation Arrays
  Canvas.attackAnimations = [];
  Canvas.deathAnimations = [];

  Canvas.resizeCanvas = function () {
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.5;
    const aspectRatio = 800 / 300;

    let newWidth = maxHeight * aspectRatio;
    let newHeight = maxHeight;

    if (newWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = newWidth / aspectRatio;
    }

    this.canvas.width = Math.max(280, Math.floor(newWidth));
    this.canvas.height = Math.max(105, Math.floor(newHeight));
    console.log(`Canvas resized to width:${this.canvas.width}, height:${this.canvas.height}`);
  };

  Canvas.debounce = function (func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  window.addEventListener("resize", Canvas.debounce(Canvas.resizeCanvas.bind(Canvas), 100));
  Canvas.resizeCanvas();

  // Drawing Functions
  Canvas.drawBase = function (refX, color, currentHealth, maxHealth, defenseLevel = 0) {
    const refWidth = 800;
    const refHeight = 300;
    const scaleX = this.canvas.width / refWidth;
    const scaleY = this.canvas.height / refHeight;
    const pixelSize = 4 * scaleX; // Pixel size for pixel-art effect

    const x = refX * scaleX;
    const baseWidth = 60 * scaleX; // Smaller base for simplicity
    const baseHeight = 100 * scaleY;
    const healthBarHeight = 8 * scaleY;
    const healthBarYOffset = 0.1 * this.canvas.height;
    const mainRectYOffset = 0.15 * this.canvas.height;

    // Ground (simple pixelated dirt)
    this.ctx.fillStyle = "#523428"; // Flat brown
    for (let px = -baseWidth / 2 - 10 * scaleX; px < baseWidth / 2 + 10 * scaleX; px += pixelSize) {
      for (let py = mainRectYOffset + baseHeight; py < mainRectYOffset + baseHeight + 10 * scaleY; py += pixelSize) {
        this.ctx.fillRect(x + px, py, pixelSize, pixelSize);
      }
    }

    // Base structure (simple stone block)
    const isPlayerBase = refX === 60;
    this.ctx.fillStyle = isPlayerBase ? "#555555" : "#4a2a2a"; // Grey for player, reddish for enemy
    for (let px = -baseWidth / 2; px < baseWidth / 2; px += pixelSize) {
      for (let py = mainRectYOffset; py < mainRectYOffset + baseHeight; py += pixelSize) {
        this.ctx.fillRect(x + px, py, pixelSize, pixelSize);
      }
    }

    // Banner (single vertical stripe)
    this.ctx.fillStyle = isPlayerBase ? "#1e90ff" : "#b22222"; // Blue or red
    for (let px = -10 * scaleX; px < 10 * scaleX; px += pixelSize) {
      for (let py = 10 * scaleY; py < baseHeight - 10 * scaleY; py += pixelSize) {
        this.ctx.fillRect(x + px, mainRectYOffset + py, pixelSize, pixelSize);
      }
    }

    // Battlements (minimal)
    this.ctx.fillStyle = "#333333";
    if (isPlayerBase) {
      // Player: Two blocky turrets
      for (let i = -1; i <= 1; i += 2) {
        for (let px = i * 15 * scaleX; px < i * 15 * scaleX + 10 * scaleX; px += pixelSize) {
          for (let py = -10 * scaleY; py < 0; py += pixelSize) {
            this.ctx.fillRect(x - baseWidth / 2 + px, mainRectYOffset + py, pixelSize, pixelSize);
          }
        }
      }
    } else {
      // Enemy: Two blocky spikes
      for (let i = -1; i <= 1; i += 2) {
        const baseX = x - baseWidth / 2 + i * 15 * scaleX;
        // Bottom row
        for (let px = 0; px < 10 * scaleX; px += pixelSize) {
          this.ctx.fillRect(baseX + px, mainRectYOffset, pixelSize, pixelSize);
        }
        // Top pixel
        this.ctx.fillRect(baseX + 5 * scaleX, mainRectYOffset - 10 * scaleY, pixelSize, pixelSize);
      }
    }

    // Health Bar (simple pixelated)
    this.ctx.fillStyle = "#000000";
    for (let px = -baseWidth / 2; px < baseWidth / 2; px += pixelSize) {
      for (let py = 0; py < healthBarHeight; py += pixelSize) {
        this.ctx.fillRect(x + px, healthBarYOffset + py, pixelSize, pixelSize);
      }
    }
    this.ctx.strokeStyle = "#ffffff"; // White border for simplicity
    this.ctx.lineWidth = 1 * scaleX;
    this.ctx.strokeRect(x - baseWidth / 2, healthBarYOffset, baseWidth, healthBarHeight);

    const healthPercentage = Math.max(0, currentHealth / maxHealth);
    this.ctx.fillStyle = healthPercentage > 0.5 ? "#32cd32" : healthPercentage > 0.2 ? "#ffd700" : "#dc143c";
    for (let px = -baseWidth / 2; px < -baseWidth / 2 + baseWidth * healthPercentage; px += pixelSize) {
      for (let py = 0; py < healthBarHeight; py += pixelSize) {
        this.ctx.fillRect(x + px, healthBarYOffset + py, pixelSize, pixelSize);
      }
    }

    // Text Info (HP and Defense)
    this.ctx.fillStyle = "#f5f5f5";
    this.ctx.font = `${Math.max(12, 16 * scaleX)}px 'VT323', 'Press Start 2P', 'Courier New', monospace`;
    this.ctx.textAlign = "center";
    const hpText = `${Math.max(0, Math.floor(currentHealth))}/${maxHealth}`;
    this.ctx.fillText(hpText, x, healthBarYOffset - (5 * scaleY)); // Moved closer to health bar

    if (isPlayerBase && defenseLevel > 0) {
      const defText = `🛡️ ${defenseLevel * 10}%`;
      this.ctx.fillText(defText, x, healthBarYOffset - (20 * scaleY)); // Adjusted position to prevent clipping
    }
  };

  // Add Attack Animation
  Canvas.addAttackAnimation = function (unit, targetX, targetY) {
    const scaleX = this.canvas.width / 800;
    const scaleY = this.canvas.height / 300;
    this.attackAnimations.push({
      unit,
      targetX,
      targetY,
      startTime: Date.now(),
      duration: 200, // Animation lasts 200ms
      type: unit.type.name.toUpperCase()
    });
  };

  // Add Death Animation
  Canvas.addDeathAnimation = function (unit) {
    const scaleX = this.canvas.width / 800;
    const scaleY = this.canvas.height / 300;
    this.deathAnimations.push({
      x: unit.x,
      y: unit.y,
      startTime: Date.now(),
      duration: 500, // Animation lasts 500ms
      type: unit.type.name.toUpperCase()
    });
  };

  // Draw Attack Animations
  Canvas.drawAttackAnimations = function () {
    const scaleX = this.canvas.width / 800;
    const scaleY = this.canvas.height / 300;
    const now = Date.now();

    this.attackAnimations = this.attackAnimations.filter(anim => now - anim.startTime < anim.duration);

    this.attackAnimations.forEach(anim => {
      const progress = (now - anim.startTime) / anim.duration;
      const opacity = 1 - progress;

      this.ctx.save();
      this.ctx.globalAlpha = opacity;

      switch (anim.type) {
        case "BARBARIAN":
        case "KNIGHT":
          // Sword slash: Draw a diagonal white line
          this.ctx.strokeStyle = "#fff";
          this.ctx.lineWidth = 2 * scaleX;
          this.ctx.beginPath();
          this.ctx.moveTo(anim.unit.x + 10 * scaleX * (1 - progress), anim.unit.y - 5 * scaleY);
          this.ctx.lineTo(anim.unit.x + 20 * scaleX * progress, anim.unit.y + 5 * scaleY);
          this.ctx.stroke();
          break;
        case "ARCHER":
          // Arrow: Draw a line from unit to target
          this.ctx.strokeStyle = "#ccc";
          this.ctx.lineWidth = 1 * scaleX;
          this.ctx.beginPath();
          this.ctx.moveTo(anim.unit.x + 10 * scaleX, anim.unit.y);
          this.ctx.lineTo(anim.targetX, anim.targetY);
          this.ctx.stroke();
          // Arrowhead
          this.ctx.fillStyle = "#ccc";
          this.ctx.beginPath();
          this.ctx.moveTo(anim.targetX, anim.targetY);
          this.ctx.lineTo(anim.targetX - 3 * scaleX, anim.targetY - 3 * scaleY);
          this.ctx.lineTo(anim.targetX - 3 * scaleX, anim.targetY + 3 * scaleY);
          this.ctx.fill();
          break;
        case "HORSE":
          // Dust trail: Draw small particles behind the horse
          this.ctx.fillStyle = "rgba(200, 200, 200, 0.5)";
          for (let i = 0; i < 3; i++) {
            this.ctx.fillRect(
              anim.unit.x - 10 * scaleX * progress + (Math.random() - 0.5) * 5 * scaleX,
              anim.unit.y + 10 * scaleY + (Math.random() - 0.5) * 5 * scaleY,
              2 * scaleX,
              2 * scaleY
            );
          }
          break;
      }

      this.ctx.restore();
    });
  };

  // Draw Death Animations
  Canvas.drawDeathAnimations = function () {
    const scaleX = this.canvas.width / 800;
    const scaleY = this.canvas.height / 300;
    const now = Date.now();

    this.deathAnimations = this.deathAnimations.filter(anim => now - anim.startTime < anim.duration);

    this.deathAnimations.forEach(anim => {
      const progress = (now - anim.startTime) / anim.duration;
      const opacity = 1 - progress;

      this.ctx.save();
      this.ctx.globalAlpha = opacity;

      // Particle burst: Draw small colored particles
      this.ctx.fillStyle = anim.type === "HORSE" ? "#dc3545" : anim.type === "KNIGHT" ? "#ffd700" : "#fff";
      for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = progress * 10 * scaleX;
        this.ctx.fillRect(
          anim.x + Math.cos(angle) * distance,
          anim.y + Math.sin(angle) * distance,
          2 * scaleX,
          2 * scaleY
        );
      }

      this.ctx.restore();
    });
  };

  Canvas.drawUnit = function (unit) {
    const refWidth = 800;
    const refHeight = 300;
    const scaleX = this.canvas.width / refWidth;
    const scaleY = this.canvas.height / refHeight;

    const size = 16 * scaleX;
    const pixel = 2 * scaleX;
    const healthBarWidth = size * 2;
    const healthBarHeight = 6 * scaleY;
    const healthBarYOffset = -12 * scaleY;
    const hpTextYOffset = -15 * scaleY;

    // Shadow
    this.ctx.fillStyle = "rgba(0,0,0,0.4)";
    this.ctx.fillRect(unit.x, unit.y + size * 1.2, size * 2, size * 0.2);

    // Spawn animation
    const spawnScale = unit.spawnTime && Date.now() - unit.spawnTime < 300 ? 1 + 0.1 * Math.sin(Date.now() / 50) : 1;
    this.ctx.save();
    this.ctx.translate(unit.x + size, unit.y + size);
    this.ctx.scale(spawnScale, spawnScale);
    this.ctx.translate(-(unit.x + size), -(unit.y + size));

    // Pixel-art rendering
    const drawPixel = (px, py, color) => {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(unit.x + px * pixel, unit.y + py * pixel, pixel, pixel);
    };

    switch (unit.type.name.toUpperCase()) {
      case "BARBARIAN":
        drawPixel(4, 2, "#f4a261"); drawPixel(5, 2, "#f4a261"); drawPixel(6, 2, "#f4a261"); drawPixel(7, 2, "#f4a261");
        drawPixel(4, 3, "#f4a261"); drawPixel(7, 3, "#f4a261");
        drawPixel(5, 4, "#3b5998"); drawPixel(6, 4, "#3b5998"); drawPixel(5, 5, "#3b5998"); drawPixel(6, 5, "#3b5998");
        drawPixel(5, 6, "#3b5998"); drawPixel(6, 6, "#3b5998"); drawPixel(5, 7, "#3b5998"); drawPixel(6, 7, "#3b5998");
        drawPixel(8, 4, "#666"); drawPixel(8, 5, "#666"); drawPixel(9, 4, "#999"); drawPixel(10, 4, "#999");
        break;
      case "ARCHER":
        drawPixel(4, 2, "#f4a261"); drawPixel(5, 2, "#f4a261"); drawPixel(6, 2, "#f4a261"); drawPixel(7, 2, "#f4a261");
        drawPixel(4, 3, "#f4a261"); drawPixel(7, 3, "#f4a261");
        drawPixel(5, 4, "#28a745"); drawPixel(6, 4, "#28a745"); drawPixel(5, 5, "#28a745"); drawPixel(6, 5, "#28a745");
        drawPixel(5, 6, "#28a745"); drawPixel(6, 6, "#28a745");
        drawPixel(8, 4, "#8b5e3c"); drawPixel(8, 5, "#8b5e3c"); drawPixel(9, 3, "#ccc"); drawPixel(9, 5, "#ccc");
        break;
      case "HORSE":
        drawPixel(8, 2, "#dc3545"); drawPixel(9, 2, "#dc3545"); drawPixel(10, 2, "#dc3545");
        drawPixel(8, 3, "#dc3545"); drawPixel(9, 3, "#dc3545");
        drawPixel(4, 4, "#dc3545"); drawPixel(5, 4, "#dc3545"); drawPixel(6, 4, "#dc3545"); drawPixel(7, 4, "#dc3545");
        drawPixel(4, 5, "#dc3545"); drawPixel(5, 5, "#dc3545"); drawPixel(6, 5, "#dc3545"); drawPixel(7, 5, "#dc3545");
        drawPixel(4, 6, "#dc3545"); drawPixel(7, 6, "#dc3545");
        break;
      case "KNIGHT":
        drawPixel(4, 1, "#ffd700"); drawPixel(5, 1, "#ffd700"); drawPixel(6, 1, "#ffd700"); drawPixel(7, 1, "#ffd700");
        drawPixel(4, 2, "#ffd700"); drawPixel(7, 2, "#ffd700");
        drawPixel(5, 3, "#ffd700"); drawPixel(6, 3, "#ffd700"); drawPixel(5, 4, "#ffd700"); drawPixel(6, 4, "#ffd700");
        drawPixel(5, 5, "#ffd700"); drawPixel(6, 5, "#ffd700"); drawPixel(5, 6, "#ffd700"); drawPixel(6, 6, "#ffd700");
        drawPixel(3, 4, "#666"); drawPixel(3, 5, "#666"); drawPixel(2, 4, "#999"); drawPixel(2, 5, "#999");
        break;
    }

    this.ctx.restore();

    // Health Bar
    const maxHealth = unit.maxHp || (unit.type.health + (window.GameState.unitHealthUpgrades * 3));
    const healthPercentage = Math.max(0, unit.hp / maxHealth);

    this.ctx.fillStyle = "rgba(0,0,0,0.8)";
    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 1 * scaleX;
    this.ctx.fillRect(unit.x - (5 * scaleX), unit.y + healthBarYOffset, healthBarWidth, healthBarHeight);
    this.ctx.strokeRect(unit.x - (5 * scaleX), unit.y + healthBarYOffset, healthBarWidth, healthBarHeight);

    this.ctx.fillStyle = healthPercentage > 0.6 ? "#28a745" : healthPercentage > 0.3 ? "#ffd700" : "#dc3545";
    this.ctx.fillRect(unit.x - (5 * scaleX), unit.y + healthBarYOffset, healthBarWidth * healthPercentage, healthBarHeight);

    // Unit Text
    this.ctx.fillStyle = "#f5f5f5";
    this.ctx.textAlign = "center";
    this.ctx.font = `${Math.max(10, 12 * scaleX)}px 'VT323', 'Press Start 2P', 'Courier New', monospace`;
    this.ctx.fillText(unit.type.name.charAt(0).toUpperCase(), unit.x + size, unit.y + size + (5 * scaleY));

    // HP Text
    this.ctx.font = `${Math.max(9, 11 * scaleX)}px 'VT323', 'Press Start 2P', 'Courier New', monospace`;
    this.ctx.fillText(`${Math.floor(unit.hp)}/${Math.floor(maxHealth)}`, unit.x + size, unit.y + hpTextYOffset);

    this.ctx.textAlign = "left";
  };

  // Render All Animations
  Canvas.renderAnimations = function () {
    this.drawAttackAnimations();
    this.drawDeathAnimations();
  };

  // Expose Canvas
  window.Canvas = Canvas;
})();