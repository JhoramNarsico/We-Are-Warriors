(function () {
  const Canvas = {};

  // Canvas Setup
  Canvas.canvas = document.getElementById("gameCanvas");
  Canvas.ctx = Canvas.canvas.getContext("2d");

  Canvas.resizeCanvas = function () {
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.5; // Keep height constrained
    const aspectRatio = 800 / 300; // Original reference aspect ratio

    // Calculate width based on height first to maintain aspect ratio
    let newWidth = maxHeight * aspectRatio;
    let newHeight = maxHeight;

    // If calculated width exceeds max width, recalculate height based on max width
    if (newWidth > maxWidth) {
        newWidth = maxWidth;
        newHeight = newWidth / aspectRatio;
    }

    // Ensure minimum dimensions? Maybe not necessary if constrained by window size.
    this.canvas.width = Math.max(320, Math.floor(newWidth)); // Minimum width 320px
    this.canvas.height = Math.max(120, Math.floor(newHeight)); // Minimum height 120px

    console.log(`Canvas resized to width:${this.canvas.width}, height:${this.canvas.height}`);
    // Redraw immediately after resize if needed (e.g., if game is paused)
    // if (window.GameState && (window.GameState.gamePaused || !window.GameState.gameActive)) {
    //    // Need a dedicated draw function that just draws current state without update logic
    //    // For now, rely on the next update loop frame if active
    // }
  };

  Canvas.debounce = function (func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args); // Use apply to maintain context
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Bind 'this' correctly for the debounced function
  window.addEventListener("resize", Canvas.debounce(Canvas.resizeCanvas.bind(Canvas), 100));
  // Call initial resize
  Canvas.resizeCanvas();

  // Drawing Functions
  // Added maxHealth and defense parameters
  Canvas.drawBase = function (refX, color, currentHealth, maxHealth, defenseLevel = 0) {
    // Use reference width/height for scaling calculations
    const refWidth = 800;
    const refHeight = 300;

    const scaleX = this.canvas.width / refWidth;
    const scaleY = this.canvas.height / refHeight;

    const x = refX * scaleX; // Scale the reference X position
    const baseWidth = 70 * scaleX;
    const baseHeight = 130 * scaleY;
    const healthBarHeight = 10 * scaleY;
    const healthBarYOffset = 0.13 * this.canvas.height; // Position relative to canvas top
    const mainRectYOffset = 0.175 * this.canvas.height;
    const turretYOffset = 0.15 * this.canvas.height;

    // Base structure
    this.ctx.fillStyle = "#555"; // Dark grey main structure
    this.ctx.fillRect(x - baseWidth / 2, mainRectYOffset, baseWidth, baseHeight);

    // Colored inner part
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x - (30 * scaleX), mainRectYOffset, (60 * scaleX), baseHeight * 0.8);

    // Turrets/Tops
    this.ctx.fillStyle = "#333"; // Very dark grey turrets
    this.ctx.fillRect(x - baseWidth / 2, turretYOffset, (15 * scaleX), (20 * scaleY));
    this.ctx.fillRect(x + baseWidth / 2 - (15 * scaleX), turretYOffset, (15 * scaleX), (20 * scaleY));

    // Health Bar Background
    this.ctx.fillStyle = "rgba(0,0,0,0.7)";
    this.ctx.fillRect(x - baseWidth / 2, healthBarYOffset, baseWidth, healthBarHeight);

    // Health Bar Foreground
    const healthPercentage = Math.max(0, currentHealth / maxHealth);
    this.ctx.fillStyle = healthPercentage > 0.5 ? "#28a745" : healthPercentage > 0.2 ? "#ffd700" : "#dc3545"; // Green/Yellow/Red
    this.ctx.fillRect(x - baseWidth / 2, healthBarYOffset, baseWidth * healthPercentage, healthBarHeight);

    // Text Info (HP and Defense)
    this.ctx.fillStyle = "#fff"; // White text
    this.ctx.font = `${Math.max(10, 14 * scaleX)}px Roboto`; // Scaled font size, min 10px
    this.ctx.textAlign = "left"; // Align text to the left of the bar start

    // HP Text
    const hpText = `HP: ${Math.max(0, Math.floor(currentHealth))} / ${maxHealth} (${Math.round(healthPercentage * 100)}%)`;
    this.ctx.fillText(hpText, x - baseWidth / 2, healthBarYOffset - (5 * scaleY)); // Position above health bar

    // Defense Text (only for player base, identified by refX or color maybe?)
    // --- ADJUSTED refX CHECK ---
    if (refX === 60) { // Assuming refX 60 is now the player base (was 20)
        const defText = `DEF: ${defenseLevel * 10}%`;
        this.ctx.fillText(defText, x - baseWidth / 2, healthBarYOffset - (20 * scaleY)); // Position further above HP
    }
  };

  Canvas.drawUnit = function (unit) {
    // Use reference width/height for scaling calculations
    const refWidth = 800;
    const refHeight = 300;
    const scaleX = this.canvas.width / refWidth;
    const scaleY = this.canvas.height / refHeight;

    const size = 15 * scaleX; // Scale size based on width scale
    const shadowSize = size * 1.2;
    const healthBarWidth = size * 2 + (10 * scaleX);
    const healthBarHeight = 6 * scaleY;
    const healthBarYOffset = -12 * scaleY; // Offset above unit top
    const textYOffset = 5 * scaleY; // Offset below unit center for initial
    const hpTextYOffset = -15 * scaleY; // Offset above unit top for HP text

    // Shadow
    this.ctx.fillStyle = "rgba(0,0,0,0.4)";
    this.ctx.beginPath();
    // Scale shadow offset slightly
    this.ctx.arc(unit.x + (2 * scaleX) + size, unit.y + (2 * scaleY) + size, shadowSize, 0, Math.PI * 2);
    this.ctx.fill();

    // Unit Shape
    this.ctx.fillStyle = unit.type.color;
    this.ctx.globalAlpha = unit.opacity || 1;
    this.ctx.shadowColor = unit.type.color; // Glow effect
    this.ctx.shadowBlur = 10 * scaleX; // Scale blur slightly
    this.ctx.beginPath();
    switch (unit.type.name.toUpperCase()) {
      case "BARBARIAN":
        this.ctx.arc(unit.x + size, unit.y + size, size, 0, Math.PI * 2);
        break;
      case "ARCHER":
        this.ctx.moveTo(unit.x + size, unit.y); // Top point
        this.ctx.lineTo(unit.x + size * 2, unit.y + size * 2); // Bottom right
        this.ctx.lineTo(unit.x, unit.y + size * 2); // Bottom left
        this.ctx.closePath();
        break;
      case "HORSE": // Pentagon shape
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2; // Start from top point
          const px = unit.x + size + Math.cos(angle) * size;
          const py = unit.y + size + Math.sin(angle) * size;
          if (i === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        break;
      case "KNIGHT": // Square shape
        this.ctx.rect(unit.x, unit.y, size * 2, size * 2);
        break;
    }
    this.ctx.fill();
    this.ctx.shadowBlur = 0; // Reset shadow for other elements
    this.ctx.globalAlpha = 1; // Reset alpha

    // Health Bar
    const maxHealth = unit.maxHp || (unit.type.health + (window.GameState.unitHealthUpgrades * 3));
    const healthPercentage = Math.max(0, unit.hp / maxHealth);

    // Health Bar Background
    this.ctx.fillStyle = "rgba(0,0,0,0.8)";
    // Position relative to unit's top-left (unit.x, unit.y)
    this.ctx.fillRect(unit.x - (5 * scaleX), unit.y + healthBarYOffset, healthBarWidth, healthBarHeight);

    // Health Bar Foreground
    this.ctx.fillStyle = healthPercentage > 0.6 ? "#28a745" : healthPercentage > 0.3 ? "#ffd700" : "#dc3545";
    this.ctx.fillRect(unit.x - (5 * scaleX), unit.y + healthBarYOffset, healthBarWidth * healthPercentage, healthBarHeight);

    // Unit Text (Initial and HP)
    this.ctx.fillStyle = "#fff";
    this.ctx.textAlign = "center"; // Center text horizontally

    // Unit Initial (e.g., 'B', 'A') - Centered within the shape
    this.ctx.font = `${Math.max(9, 12 * scaleX)}px Roboto`; // Scaled font, min 9px
    this.ctx.fillText(unit.type.name.charAt(0).toUpperCase(), unit.x + size, unit.y + size + textYOffset);

    // HP Text (e.g., '10/15') - Centered above the health bar
    this.ctx.font = `${Math.max(8, 10 * scaleX)}px Roboto`; // Slightly smaller font, min 8px
    this.ctx.fillText(`${Math.floor(unit.hp)}/${Math.floor(maxHealth)}`, unit.x + size, unit.y + hpTextYOffset);

    this.ctx.textAlign = "left"; // Reset alignment for other drawing functions
    // --- REMOVED CONSOLE LOG ---
    // console.log(`Drawing unit: ${unit.type.name} at x:${unit.x}, y:${unit.y}, opacity:${unit.opacity}`);
  };

  // Expose Canvas
  window.Canvas = Canvas;
})();
