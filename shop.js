(function () {
  const Shop = {};

  // Cache DOM elements
  const DOM = {
    shopElement: null,
    toggleShopButton: null
  };

  // Shop Items Definition
  Shop.SHOP_ITEMS = {
    GOLD_PRODUCTION: {
      name: "Gold Production +",
      description: "Increase gold gain rate",
      getPrice: () => 10 + (window.GameState.goldProductionUpgrades * 15),
      apply: function() {
        const price = this.getPrice();
        if (!Shop.validatePurchase(price)) return;

        window.GameState.diamonds -= price;
        window.GameState.goldProductionUpgrades++;
        Shop.updateGoldProduction();

        Shop.savePurchase('warriorGoldProdUpgrades', window.GameState.goldProductionUpgrades);
        Shop.finalizePurchase("Gold production upgraded!");
      }
    },
    BASE_HEALTH: {
      name: "Base Health +",
      description: "Increase base max health by 25",
      getPrice: () => 15 + (window.GameState.baseHealthUpgrades * 20),
      apply: function() {
        const price = this.getPrice();
        if (!Shop.validatePurchase(price)) return;

        window.GameState.diamonds -= price;
        window.GameState.baseHealthUpgrades++;
        const oldMaxHealth = 150 + ((window.GameState.baseHealthUpgrades - 1) * 25);
        const healthPercentage = window.GameState.baseHealth / oldMaxHealth;
        const newMaxHealth = 150 + (window.GameState.baseHealthUpgrades * 25);
        window.GameState.baseHealth = Math.round(newMaxHealth * healthPercentage);

        Shop.savePurchase('warriorBaseHealthUpgrades', window.GameState.baseHealthUpgrades);
        Shop.finalizePurchase("Base health increased!");
      }
    },
    BASE_DEFENSE: {
      name: "Base Defense +",
      description: "Reduce base damage taken by 10% (Max 50%)",
      getPrice: () => 12 + (window.GameState.baseDefenseUpgrades * 15),
      apply: function() {
        const MAX_DEFENSE_UPGRADES = 5;
        if (window.GameState.baseDefenseUpgrades >= MAX_DEFENSE_UPGRADES) {
          window.UI.showFeedback("Base defense maxed out!");
          return;
        }

        const price = this.getPrice();
        if (!Shop.validatePurchase(price)) return;

        window.GameState.diamonds -= price;
        window.GameState.baseDefenseUpgrades++;

        Shop.savePurchase('warriorBaseDefenseUpgrades', window.GameState.baseDefenseUpgrades);
        Shop.finalizePurchase("Base defense upgraded!");
      }
    },
    UNIT_HEALTH: {
      name: "Unit Health +",
      description: "Increase all unit max health by 3",
      getPrice: () => 12 + (window.GameState.unitHealthUpgrades * 18),
      apply: function() {
        const price = this.getPrice();
        if (!Shop.validatePurchase(price)) return;

        window.GameState.diamonds -= price;
        window.GameState.unitHealthUpgrades++;

        window.Units.units.forEach(unit => {
          const oldMaxHp = unit.maxHp;
          const healthPercentage = unit.hp / oldMaxHp;
          unit.maxHp += 3;
          unit.hp = Math.round(unit.maxHp * healthPercentage);
        });

        Shop.savePurchase('warriorUnitHealthUpgrades', window.GameState.unitHealthUpgrades);
        Shop.finalizePurchase("Unit health increased!", true);
      }
    },
    UNIT_DAMAGE: {
      name: "Unit Damage +",
      description: "Increase all unit damage by 2",
      getPrice: () => 15 + (window.GameState.unitDamageUpgrades * 25),
      apply: function() {
        const price = this.getPrice();
        if (!Shop.validatePurchase(price)) return;

        window.GameState.diamonds -= price;
        window.GameState.unitDamageUpgrades++;

        // Update base types
        const unitTypes = window.Units.UNIT_TYPES;
        unitTypes.BARBARIAN.damage += 2;
        unitTypes.ARCHER.damage += 2;
        unitTypes.HORSE.damage += 2;
        unitTypes.KNIGHT.damage += 2;

        // Update existing units
        window.Units.units.forEach(unit => {
          unit.damage = Math.floor(unit.damage + 2);
        });

        Shop.savePurchase('warriorUnitDamageUpgrades', window.GameState.unitDamageUpgrades);
        Shop.saveUnitDamage();
        Shop.finalizePurchase("Unit damage increased!", true);
      }
    },
    NEW_UNIT: {
      name: "Unlock Knight",
      description: "Unlock the powerful Knight unit",
      getPrice: () => 25,
      apply: function() {
        if (window.GameState.isKnightUnlocked) {
          window.UI.showFeedback("Knight already unlocked!");
          return;
        }

        const price = this.getPrice();
        if (!Shop.validatePurchase(price)) return;

        if (price >= 25 && !confirm("Are you sure you want to unlock Knight for 25 diamonds?")) {
          window.UI.showFeedback("Purchase cancelled");
          return;
        }

        window.GameState.diamonds -= price;
        window.GameState.unlockKnight();
        Shop.finalizePurchase("Knight unlocked!");
      }
    }
  };

  // Utility Functions
  Shop.validatePurchase = function(price) {
    if (isNaN(price) || price < 0) {
      window.UI.showFeedback("Invalid purchase price!");
      return false;
    }
    if (window.GameState.diamonds < price) {
      window.UI.showFeedback("Not enough diamonds!");
      return false;
    }
    return true;
  };

  Shop.savePurchase = function(key, value) {
    try {
      localStorage.setItem(key, value);
      localStorage.setItem('warriorDiamonds', window.GameState.diamonds);
    } catch (e) {
      console.error(`Failed to save ${key}:`, e);
      window.UI.showFeedback("Warning: Unable to save purchase data!");
    }
  };

  Shop.saveUnitDamage = function() {
    try {
      localStorage.setItem('warriorUnitDamage', JSON.stringify({
        barb: window.Units.UNIT_TYPES.BARBARIAN.damage,
        arch: window.Units.UNIT_TYPES.ARCHER.damage,
        horse: window.Units.UNIT_TYPES.HORSE.damage,
        knight: window.Units.UNIT_TYPES.KNIGHT.damage
      }));
    } catch (e) {
      console.error("Failed to save unit damage:", e);
      window.UI.showFeedback("Warning: Unable to save unit damage data!");
    }
  };

  Shop.updateGoldProduction = function() {
    window.GameState.goldProductionRate = Math.max(300, 800 - (window.GameState.goldProductionUpgrades * 50));
    
    if (window.GameState.goldInterval) {
      clearInterval(window.GameState.goldInterval);
      window.GameState.goldInterval = null;
    }

    window.GameState.goldInterval = setInterval(() => {
      if (window.GameState.gameActive && !window.GameState.gameOver && !window.GameState.gamePaused) {
        window.GameState.gold += 1 + Math.floor(window.GameState.wave / 5);
        window.UI.updateFooter();
      }
    }, window.GameState.goldProductionRate);
  };

  Shop.finalizePurchase = function(message, updateTooltips = false) {
    window.UI.updateFooter();
    Shop.throttledUpdate();
    window.UI.showFeedback(message);
    window.UI.updateUpgradesDisplay();
    if (updateTooltips) {
      window.UI.addTooltips();
      window.UI.updateUnitInfoPanel();
    }
  };

  // Throttle shop updates to prevent excessive DOM manipulation
  Shop.throttleTimeout = null;
  Shop.throttleDelay = 100;

  Shop.throttledUpdate = function() {
    if (Shop.throttleTimeout) return;
    
    Shop.throttleTimeout = setTimeout(() => {
      Shop.updateShop();
      Shop.throttleTimeout = null;
    }, Shop.throttleDelay);
  };

  // Initialize DOM elements
  Shop.init = function() {
    DOM.shopElement = document.getElementById("shop");
    DOM.toggleShopButton = document.getElementById("toggleShopButton");

    if (!DOM.shopElement) {
      console.error("Shop element not found in HTML!");
      window.UI.showFeedback("Error: Shop initialization failed!");
      return;
    }

    if (DOM.toggleShopButton) {
      DOM.shopElement.style.display = "none";
      DOM.toggleShopButton.textContent = "Show Shop";
    }
  };

  // Update Shop UI
  Shop.updateShop = function() {
    if (!DOM.shopElement) {
      console.error("Shop element not initialized!");
      return;
    }

    DOM.shopElement.innerHTML = "<h3>Upgrades</h3>";
    const MAX_DEFENSE_UPGRADES = 5;

    Object.entries(Shop.SHOP_ITEMS).forEach(([key, item]) => {
      if (key === "NEW_UNIT" && window.GameState.isKnightUnlocked) return;
      if (key === "BASE_DEFENSE" && window.GameState.baseDefenseUpgrades >= MAX_DEFENSE_UPGRADES) {
        DOM.shopElement.insertAdjacentHTML('beforeend', `
          <div class="shop-item">
            <button class="shop-button" disabled aria-disabled="true">${item.name} - MAX</button>
            <p>${item.description}</p>
          </div>
        `);
        return;
      }

      const price = item.getPrice();
      const isAffordable = window.GameState.diamonds >= price;
      const buttonClass = `shop-button ${isAffordable ? '' : 'disabled'}`;
      
      const shopItemHTML = `
        <div class="shop-item">
          <button class="${buttonClass}" 
                  ${isAffordable ? '' : 'disabled'} 
                  aria-label="Purchase ${item.name} for ${price} diamonds"
                  ${isAffordable ? '' : 'aria-disabled="true"'}>
            ${item.name} - ${price} <span class="diamond-icon">💎</span>
          </button>
          <p>${item.description}</p>
        </div>
      `;

      DOM.shopElement.insertAdjacentHTML('beforeend', shopItemHTML);
      const button = DOM.shopElement.lastElementChild.querySelector('button');
      if (isAffordable) {
        button.addEventListener('click', () => item.apply());
      }
    });
  };

  // Initialize on load
  Shop.init();

  // Expose Shop
  window.Shop = Shop;
})();