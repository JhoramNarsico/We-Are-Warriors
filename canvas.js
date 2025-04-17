(function () {
  const Canvas = {};

  // Canvas Setup
  Canvas.canvas = document.getElementById("gameCanvas");
  Canvas.ctx = Canvas.canvas.getContext("2d");

  Canvas.resizeCanvas = function () {
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.5;
    this.canvas.width = Math.min(800, maxWidth);
    this.canvas.height = Math.min(300, maxHeight);
    console.log(`Canvas resized to width:${this.canvas.width}, height:${this.canvas.height}`);
  };

  Canvas.debounce = function (func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  window.addEventListener("resize", Canvas.debounce(Canvas.resizeCanvas.bind(Canvas), 100));
  Canvas.resizeCanvas();

  // Drawing Functions
  Canvas.drawBase = function (x, color, health) {
    const scaledX = x * (this.canvas.width / 800);
    const baseWidth = 70 * (this.canvas.width / 800);
    const baseHeight = 130 * (this.canvas.height / 300);
    
    this.ctx.fillStyle = "#555";
    this.ctx.fillRect(scaledX - baseWidth / 2, this.canvas.height * 0.233, baseWidth, baseHeight);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(scaledX - 30 * (this.canvas.width / 800), this.canvas.height * 0.233, 60 * (this.canvas.width / 800), baseHeight * 0.8);
    this.ctx.fillStyle = "#333";
    this.ctx.fillRect(scaledX - baseWidth / 2, this.canvas.height * 0.2, 15 * (this.canvas.width / 800), 20 * (this.canvas.height / 300));
    this.ctx.fillRect(scaledX + baseWidth / 2 - 15 * (this.canvas.width / 800), this.canvas.height * 0.2, 15 * (this.canvas.width / 800), 20 * (this.canvas.height / 300));

    const maxHealth = 150 + (window.GameState.baseHealthUpgrades * 25);
    const healthPercentage = Math.max(0, health / maxHealth);
    this.ctx.fillStyle = "rgba(0,0,0,0.7)";
    this.ctx.fillRect(scaledX - baseWidth / 2, this.canvas.height * 0.18, baseWidth, 10 * (this.canvas.height / 300));
    this.ctx.fillStyle = healthPercentage > 0.5 ? "#28a745" : healthPercentage > 0.2 ? "#ffd700" : "#dc3545";
    this.ctx.fillRect(scaledX - baseWidth / 2, this.canvas.height * 0.18, baseWidth * healthPercentage, 10 * (this.canvas.height / 300));

    this.ctx.fillStyle = "#fff";
    this.ctx.font = `${14 * (this.canvas.width / 800)}px Roboto`;
    this.ctx.fillText(`HP: ${Math.max(0, health)} (${Math.round(healthPercentage * 100)}%)`, scaledX - baseWidth / 2, this.canvas.height * 0.167);
    if (x === 20) {
      this.ctx.fillText(`DEF: ${window.GameState.baseDefenseUpgrades * 10}%`, scaledX - baseWidth / 2, this.canvas.height * 0.15);
    }
  };

  Canvas.drawUnit = function (unit) {
    const size = 15 * (this.canvas.width / 800);
    const shadowSize = size * 1.2;

    this.ctx.fillStyle = "rgba(0,0,0,0.4)";
    this.ctx.beginPath();
    this.ctx.arc(unit.x + 2 * (this.canvas.width / 800) + size, unit.y + 2 * (this.canvas.height / 300) + size, shadowSize, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = unit.type.color;
    this.ctx.globalAlpha = unit.opacity || 1;
    this.ctx.shadowColor = unit.type.color;
    this.ctx.shadowBlur = 10;
    this.ctx.beginPath();
    switch (unit.type.name.toUpperCase()) {
      case "BARBARIAN":
        this.ctx.arc(unit.x + size, unit.y + size, size, 0, Math.PI * 2);
        break;
      case "ARCHER":
        this.ctx.moveTo(unit.x + size, unit.y);
        this.ctx.lineTo(unit.x + size * 2, unit.y + size * 2);
        this.ctx.lineTo(unit.x, unit.y + size * 2);
        this.ctx.closePath();
        break;
      case "HORSE":
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const px = unit.x + size + Math.cos(angle) * size;
          const py = unit.y + size + Math.sin(angle) * size;
          if (i === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        break;
      case "KNIGHT":
        this.ctx.rect(unit.x, unit.y, size * 2, size * 2);
        break;
    }
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;

    const maxHealth = unit.maxHp || (unit.type.health + (window.GameState.unitHealthUpgrades * 3));
    const healthPercentage = Math.max(0, unit.hp / maxHealth);
    this.ctx.fillStyle = "rgba(0,0,0,0.8)";
    this.ctx.fillRect(unit.x - 5 * (this.canvas.width / 800), unit.y - 12 * (this.canvas.height / 300), size * 2 + 10 * (this.canvas.width / 800), 6 * (this.canvas.height / 300));
    this.ctx.fillStyle = healthPercentage > 0.6 ? "#28a745" : healthPercentage > 0.3 ? "#ffd700" : "#dc3545";
    this.ctx.fillRect(unit.x - 5 * (this.canvas.width / 800), unit.y - 12 * (this.canvas.height / 300), (size * 2 + 10 * (this.canvas.width / 800)) * healthPercentage, 6 * (this.canvas.height / 300));

    this.ctx.fillStyle = "#fff";
    this.ctx.font = `${12 * (this.canvas.width / 800)}px Roboto`;
    this.ctx.textAlign = "center";
    this.ctx.fillText(unit.type.name.charAt(0).toUpperCase(), unit.x + size, unit.y + size + 5 * (this.canvas.height / 300));
    this.ctx.font = `${10 * (this.canvas.width / 800)}px Roboto`;
    this.ctx.fillText(`${Math.floor(unit.hp)}/${Math.floor(maxHealth)}`, unit.x + size, unit.y - 15 * (this.canvas.height / 300));
    this.ctx.textAlign = "left";
    console.log(`Drawing unit: ${unit.type.name} at x:${unit.x}, y:${unit.y}, opacity:${unit.opacity}`);
  };

  // Expose Canvas
  window.Canvas = Canvas;
})();