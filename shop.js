(function () {
  const Shop = {};

  // Shop Items Definition
  Shop.SHOP_ITEMS = {
    GOLD_PRODUCTION: {
      name: "Gold Production +",
      description: "Increase gold gain rate", // Simpler description
      getPrice: () => 10 + (window.GameState.goldProductionUpgrades * 15),
      apply: function() {
        if (window.GameState.diamonds >= this.getPrice()) {
          window.GameState.diamonds -= this.getPrice();
          window.GameState.goldProductionUpgrades++;
          // Update rate in GameState and restart interval
          window.GameState.goldProductionRate = Math.max(300, 800 - (window.GameState.goldProductionUpgrades * 50));
          clearInterval(window.GameState.goldInterval); // Clear existing interval
          window.GameState.goldInterval = setInterval(() => { // Start new one
              if (window.GameState.gameActive && !window.GameState.gameOver && !window.GameState.gamePaused) {
                  window.GameState.gold += 1 + Math.floor(window.GameState.wave / 5);
                  window.UI.updateFooter();
              }
          }, window.GameState.goldProductionRate);


          try {
            localStorage.setItem('warriorDiamonds', window.GameState.diamonds);
            localStorage.setItem('warriorGoldProdUpgrades', window.GameState.goldProductionUpgrades);
          } catch (e) {
            console.error("Failed to save gold production upgrades:", e);
            window.UI.showFeedback("Storage error saving upgrade.");
          }

          Shop.updateShop();
          window.UI.updateFooter();
          window.UI.showFeedback("Gold production upgraded!");
          window.UI.updateUpgradesDisplay();
        } else {
          window.UI.showFeedback("Not enough diamonds!");
        }
      }
    },
    BASE_HEALTH: {
      name: "Base Health +",
      description: "Increase base max health by 25",
      getPrice: () => 15 + (window.GameState.baseHealthUpgrades * 20),
      apply: function() {
        if (window.GameState.diamonds >= this.getPrice()) {
          window.GameState.diamonds -= this.getPrice();
          window.GameState.baseHealthUpgrades++;
          // Update current health proportionally and max health
          const oldMaxHealth = 150 + ((window.GameState.baseHealthUpgrades - 1) * 25);
          const healthPercentage = window.GameState.baseHealth / oldMaxHealth;
          const newMaxHealth = 150 + (window.GameState.baseHealthUpgrades * 25);
          window.GameState.baseHealth = Math.round(newMaxHealth * healthPercentage); // Heal proportionally


          try {
            localStorage.setItem('warriorDiamonds', window.GameState.diamonds);
            localStorage.setItem('warriorBaseHealthUpgrades', window.GameState.baseHealthUpgrades);
          } catch (e) {
            console.error("Failed to save base health upgrades:", e);
            window.UI.showFeedback("Storage error saving upgrade.");
          }

          window.UI.updateFooter();
          Shop.updateShop();
          window.UI.showFeedback("Base health increased!"); // Effect is immediate now
          window.UI.updateUpgradesDisplay();
          // Redraw base immediately if canvas drawing depends on max health for bar
          // window.Canvas.drawBase(...) // Or rely on next game loop draw
        } else {
          window.UI.showFeedback("Not enough diamonds!");
        }
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

        if (window.GameState.diamonds >= this.getPrice()) {
          window.GameState.diamonds -= this.getPrice();
          window.GameState.baseDefenseUpgrades++;

          try {
            localStorage.setItem('warriorDiamonds', window.GameState.diamonds);
            localStorage.setItem('warriorBaseDefenseUpgrades', window.GameState.baseDefenseUpgrades);
          } catch (e) {
            console.error("Failed to save base defense upgrades:", e);
            window.UI.showFeedback("Storage error saving upgrade.");
          }

          window.UI.updateFooter();
          Shop.updateShop();
          window.UI.showFeedback("Base defense upgraded!");
          window.UI.updateUpgradesDisplay();
        } else {
          window.UI.showFeedback("Not enough diamonds!");
        }
      }
    },
    UNIT_HEALTH: {
      name: "Unit Health +",
      description: "Increase all unit max health by 3",
      getPrice: () => 12 + (window.GameState.unitHealthUpgrades * 18),
      apply: function() {
        if (window.GameState.diamonds >= this.getPrice()) {
          window.GameState.diamonds -= this.getPrice();
          window.GameState.unitHealthUpgrades++;

          try {
            localStorage.setItem('warriorDiamonds', window.GameState.diamonds);
            localStorage.setItem('warriorUnitHealthUpgrades', window.GameState.unitHealthUpgrades);
          } catch (e) {
            console.error("Failed to save unit health upgrades:", e);
            window.UI.showFeedback("Storage error saving upgrade.");
          }

          // Apply health increase to existing units proportionally
          window.Units.units.forEach(unit => {
              const oldMaxHp = unit.maxHp;
              const healthPercentage = unit.hp / oldMaxHp;
              unit.maxHp += 3; // Increase max HP
              unit.hp = Math.round(unit.maxHp * healthPercentage); // Heal proportionally
          });

          window.UI.updateFooter();
          Shop.updateShop();
          window.UI.addTooltips(); // Update tooltips to show new health
          window.UI.updateUnitInfoPanel(); // Update info panel
          window.UI.showFeedback("Unit health increased!");
          window.UI.updateUpgradesDisplay();
        } else {
          window.UI.showFeedback("Not enough diamonds!");
        }
      }
    },
    UNIT_DAMAGE: {
      name: "Unit Damage +",
      description: "Increase all unit damage by 2",
      getPrice: () => 15 + (window.GameState.unitDamageUpgrades * 25),
      apply: function() {
        if (window.GameState.diamonds >= this.getPrice()) {
          window.GameState.diamonds -= this.getPrice();
          window.GameState.unitDamageUpgrades++; // Track the level

          // Update base damage values in the Units module
          // This approach modifies the base types directly.
          // Consider if damage should be calculated on spawn instead: unit.damage = baseDamage + upgradeBonus
          window.Units.UNIT_TYPES.BARBARIAN.damage += 2;
          window.Units.UNIT_TYPES.ARCHER.damage += 2;
          window.Units.UNIT_TYPES.HORSE.damage += 2;
          window.Units.UNIT_TYPES.KNIGHT.damage += 2; // Also upgrade Knight

          try {
            localStorage.setItem('warriorDiamonds', window.GameState.diamonds);
            // Save the individual damage values AND the upgrade level
            localStorage.setItem('warriorUnitDamage', JSON.stringify({
              barb: window.Units.UNIT_TYPES.BARBARIAN.damage,
              arch: window.Units.UNIT_TYPES.ARCHER.damage,
              horse: window.Units.UNIT_TYPES.HORSE.damage,
              knight: window.Units.UNIT_TYPES.KNIGHT.damage // Save Knight damage
            }));
            localStorage.setItem('warriorUnitDamageUpgrades', window.GameState.unitDamageUpgrades);
          } catch (e) {
            console.error("Failed to save unit damage upgrades:", e);
            window.UI.showFeedback("Storage error saving upgrade.");
          }

          window.UI.updateFooter();
          Shop.updateShop();
          window.UI.addTooltips(); // Update tooltips
          window.UI.updateUnitInfoPanel(); // Update info panel
          window.UI.showFeedback("Unit damage increased!");
          window.UI.updateUpgradesDisplay();
        } else {
          window.UI.showFeedback("Not enough diamonds!");
        }
      }
    },
    // --- Revised Knight Unlock ---
    NEW_UNIT: {
      name: "Unlock Knight",
      description: "Unlock the powerful Knight unit",
      getPrice: () => 25, // Fixed price for unlock
      apply: function() {
        // Check GameState flag now
        if (window.GameState.diamonds >= this.getPrice() && !window.GameState.isKnightUnlocked) {
          window.GameState.diamonds -= this.getPrice();

          // Call the centralized unlock function in GameState
          window.GameState.unlockKnight();

          // GameState.unlockKnight handles saving and UI updates now
          // No need to save 'warriorKnightUnlocked' here directly
          // No need to call UI.addKnightButton()

          window.UI.updateFooter(); // Update diamond display
          // Shop.updateShop(); // Called by unlockKnight
          window.UI.showFeedback("Knight unlocked!");
          // window.UI.updateUpgradesDisplay(); // Called by unlockKnight
        } else if (window.GameState.isKnightUnlocked) {
           window.UI.showFeedback("Knight already unlocked!");
        } else {
          window.UI.showFeedback("Not enough diamonds!");
        }
      }
    }
    // --- End Revised Knight Unlock ---
  };

  // Function to Update Shop UI
  Shop.updateShop = function () {
    const shopElement = document.getElementById("shop");
    if (!shopElement) {
        console.error("Shop element not found in HTML!");
        return;
    }
    shopElement.innerHTML = "<h3>Upgrades</h3>"; // Clear previous items

    for (let key in Shop.SHOP_ITEMS) {
      const item = Shop.SHOP_ITEMS[key];

      // --- Use GameState flag to check if Knight unlock should be shown ---
      if (key === "NEW_UNIT" && window.GameState.isKnightUnlocked) {
        continue; // Skip showing the unlock item if already unlocked
      }
      // --- End Knight Check ---

      // Skip showing maxed out defense upgrade
      const MAX_DEFENSE_UPGRADES = 5; // Define here or get from GameState if needed
      if (key === "BASE_DEFENSE" && window.GameState.baseDefenseUpgrades >= MAX_DEFENSE_UPGRADES) {
        const container = document.createElement("div");
        container.className = "shop-item";
        container.innerHTML = `
            <button class="shop-button" disabled>${item.name} - MAX</button>
            <p>${item.description}</p>
        `;
        shopElement.appendChild(container);
        continue; // Skip the rest for this item
      }


      const container = document.createElement("div");
      container.className = "shop-item";
      const currentPrice = item.getPrice();
      const isAffordable = window.GameState.diamonds >= currentPrice;

      container.innerHTML = `
        <button class="shop-button" ${!isAffordable ? 'disabled' : ''}>${item.name} - ${currentPrice} <span class="diamond-icon">💎</span></button>
        <p>${item.description}</p>
      `;

      const button = container.querySelector("button");
      button.onclick = () => {
        item.apply(); // 'this' inside apply will refer to the item object
      };
      shopElement.appendChild(container);
    }
  };

  // Expose Shop
  window.Shop = Shop;
})();
