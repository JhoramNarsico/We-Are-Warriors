(function () {
  const Canvas = {};

  // Canvas Setup
  Canvas.canvas = document.getElementById("gameCanvas");
  Canvas.ctx = Canvas.canvas.getContext("2d");

  Canvas.resizeCanvas = function () {
    const maxWidth = window.innerWidth * 0.9; // Increased from 0.85 for larger container
    const maxHeight = window.innerHeight * 0.5; // Increased from 0.45
    const aspectRatio = 800 / 300;

    let newWidth = maxHeight * aspectRatio;
    let newHeight = maxHeight;

    if (newWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = newWidth / aspectRatio;
    }

    this.canvas.width = Math.max(280, Math.floor(newWidth)); // Increased min width from 240
    this.canvas.height = Math.max(105, Math.floor(newHeight)); // Increased min height from 90
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

    const x = refX * scaleX;
    const baseWidth = 70 * scaleX;
    const baseHeight = 130 * scaleY;
    const healthBarHeight = 10 * scaleY;
    const healthBarYOffset = 0.13 * this.canvas.height;
    const mainRectYOffset = 0.175 * this.canvas.height;

    // Ground texture
    this.ctx.fillStyle = "rgba(50, 50, 50, 0.5)";
    this.ctx.fillRect(x - baseWidth / 2 - 10 * scaleX, mainRectYOffset + baseHeight, baseWidth + 20 * scaleX, 10 * scaleY);

    // Base structure (pixelated look)
    this.ctx.fillStyle = refX === 60 ? "#4a4a4a" : "#5a2e2e";
    this.ctx.fillRect(x - baseWidth / 2, mainRectYOffset, baseWidth, baseHeight);

    // Pixelated inner part
    const gradient = this.ctx.createLinearGradient(x - (30 * scaleX), mainRectYOffset, x + (30 * scaleX), mainRectYOffset + baseHeight * 0.8);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, refX === 60 ? "#2a4066" : "#8b1c1c");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x - (30 * scaleX), mainRectYOffset, (60 * scaleX), baseHeight * 0.8);

    // Pixelated battlements/spikes
    this.ctx.fillStyle = "#333";
    if (refX === 60) {
      for (let i = -2; i <= 2; i++) {
        this.ctx.fillRect(x - baseWidth / 2 + i * (15 * scaleX), mainRectYOffset - (10 * scaleY), (10 * scaleX), (10 * scaleY));
      }
    } else {
      for (let i = -2; i <= 2; i++) {
        this.ctx.beginPath();
        this.ctx.moveTo(x - baseWidth / 2 + i * (15 * scaleX), mainRectYOffset);
        this.ctx.lineTo(x - baseWidth / 2 + i * (15 * scaleX) + (5 * scaleX), mainRectYOffset - (10 * scaleY));
        this.ctx.lineTo(x - baseWidth / 2 + i * (15 * scaleX) + (10 * scaleX), mainRectYOffset);
        this.ctx.fill();
      }
    }

    // Health Bar
    this.ctx.fillStyle = "rgba(0,0,0,0.7)";
    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 1 * scaleX;
    this.ctx.fillRect(x - baseWidth / 2, healthBarYOffset, baseWidth, healthBarHeight);
    this.ctx.strokeRect(x - baseWidth / 2, healthBarYOffset, baseWidth, healthBarHeight);

    const healthPercentage = Math.max(0, currentHealth / maxHealth);
    this.ctx.fillStyle = healthPercentage > 0.5 ? "#28a745" : healthPercentage > 0.2 ? "#ffd700" : "#dc3545";
    this.ctx.fillRect(x - baseWidth / 2, healthBarYOffset, baseWidth * healthPercentage, healthBarHeight);

    // Text Info
    this.ctx.fillStyle = "#f5f5f5";
    this.ctx.font = `${Math.max(12, 16 * scaleX)}px 'VT323', 'Press Start 2P', 'Courier New', monospace`;
    this.ctx.textAlign = "left";
    const hpText = `HP: ${Math.max(0, Math.floor(currentHealth))} / ${maxHealth}`;
    this.ctx.fillText(hpText, x - baseWidth / 2, healthBarYOffset - (5 * scaleY));

    if (refX === 60 && defenseLevel > 0) {
      const defText = `🛡️ DEF: ${defenseLevel * 10}%`;
      this.ctx.fillText(defText, x - baseWidth / 2, healthBarYOffset - (20 * scaleY));
    }
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

  // Expose Canvas
  window.Canvas = Canvas;
})();