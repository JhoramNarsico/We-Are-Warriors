// --- START OF FILE shop.js ---
(function () {
  const Shop = {};

  // Cache DOM elements
  const DOM = { /* ... remains same ... */ };
  DOM.shopElement = document.getElementById("shop");
  DOM.toggleShopButton = document.getElementById("toggleShopButton");


  // Shop Items Definition
  Shop.SHOP_ITEMS = {
    GOLD_PRODUCTION: {
      name: "Gold Production +",
      description: "Increase gold gain rate",
      getPrice: () => 5 + (window.GameState.goldProductionUpgrades * 10),
      apply: function() {
        const price = this.getPrice();
        if (!Shop.validatePurchase(price)) return;

        window.GameState.diamonds -= price;
        window.GameState.goldProductionUpgrades++;
        Shop.updateGoldProduction(); // Applies the rate change

        Shop.savePersistentProgress('warriorGoldProdUpgrades', window.GameState.goldProductionUpgrades); // Calls new save function
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
        // Apply health increase immediately (initGame handles initial load)
        const oldMaxHealth = 150 + ((window.GameState.baseHealthUpgrades - 1) * 25);
        // Prevent division by zero if old max health was 0 (shouldn't happen)
        const healthPercentage = oldMaxHealth > 0 ? (window.GameState.baseHealth / oldMaxHealth) : 1;
        const newMaxHealth = 150 + (window.GameState.baseHealthUpgrades * 25);
        window.GameState.baseHealth = Math.max(1, Math.round(newMaxHealth * healthPercentage)); // Ensure base health >= 1

        Shop.savePersistentProgress('warriorBaseHealthUpgrades', window.GameState.baseHealthUpgrades); // Calls new save function
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

        Shop.savePersistentProgress('warriorBaseDefenseUpgrades', window.GameState.baseDefenseUpgrades); // Calls new save function
        Shop.finalizePurchase("Base defense upgraded!");
      }
    },
    UNIT_HEALTH: {
      name: "Unit Health +",
      description: "Increase all unit max health by 3",
      getPrice: () => 8 + (window.GameState.unitHealthUpgrades * 12),
      apply: function() {
        const price = this.getPrice();
        if (!Shop.validatePurchase(price)) return;

        window.GameState.diamonds -= price;
        window.GameState.unitHealthUpgrades++;

        // Update existing units' health proportionally
        window.Units.units.forEach(unit => {
          // Recalculate max HP based on *new* upgrade level
          const baseHp = unit.type.health;
          const oldMaxHp = baseHp + ((window.GameState.unitHealthUpgrades -1) * 3);
          const newMaxHp = baseHp + (window.GameState.unitHealthUpgrades * 3);
          const healthPercentage = oldMaxHp > 0 ? (unit.hp / oldMaxHp) : 1;
          unit.hp = Math.round(newMaxHp * healthPercentage);
          unit.maxHp = newMaxHp; // Update the stored maxHp too
        });
        // Enemy units scale by wave, not upgrades

        Shop.savePersistentProgress('warriorUnitHealthUpgrades', window.GameState.unitHealthUpgrades); // Calls new save function
        Shop.finalizePurchase("Unit health increased!", true); // true = update tooltips
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
        window.GameState.unitDamageUpgrades++; // Increment the counter

        Shop.savePersistentProgress('warriorUnitDamageUpgrades', window.GameState.unitDamageUpgrades); // Calls new save function
        Shop.finalizePurchase("Unit damage increased!", true); // true = update tooltips
      }
    },
    NEW_UNIT: {
      name: "Unlock Knight",
      description: "Unlock the powerful Knight unit",
      getPrice: () => 25, // Fixed price
      apply: function() {
        if (window.GameState.isKnightUnlocked) {
          window.UI.showFeedback("Knight already unlocked!");
          return;
        }

        const price = this.getPrice();
        if (!Shop.validatePurchase(price)) return;

        window.GameState.diamonds -= price;
        window.GameState.unlockKnight(); // This now handles saving locally AND potentially to cloud
        // No separate save call needed here for the knight state itself.
        // We still need to save the diamond reduction.
        Shop.savePersistentProgress('warriorKnightUnlocked', true); // Save the fact knight is unlocked and also the diamonds reduction
        Shop.finalizePurchase("Knight unlocked!"); // Finalize updates UI etc.
      }
    }
  };

  // Utility Functions
  Shop.validatePurchase = function(price) { /* ... remains same ... */
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

  // --- NEW: Centralized save function ---
  // Saves locally and calls Auth.saveUserProgressToCloud if logged in
  Shop.savePersistentProgress = function(localStorageKey, value) {
    try {
      // Always save locally
      localStorage.setItem(localStorageKey, value);
      localStorage.setItem('warriorDiamonds', window.GameState.diamonds); // Also save current diamonds locally

      // Save to cloud if logged in (Auth module handles the actual saving)
      if (window.GameState.currentUser && window.Auth && Auth.saveUserProgressToCloud) {
          console.log("User logged in, attempting cloud save via Auth module...");
          Auth.saveUserProgressToCloud(); // Let Auth handle the Firestore interaction
      } else {
          console.log("User not logged in or Auth module unavailable, skipping cloud save.");
      }
    } catch (e) {
      console.error(`Failed to save ${localStorageKey} locally:`, e);
      window.UI.showFeedback("Warning: Unable to save purchase data locally!");
    }
  };
  // --- END NEW ---

  Shop.updateGoldProduction = function() { /* ... remains same ... */
    // Calculate rate based on current upgrade level
    window.GameState.goldProductionRate = Math.max(300, 800 - (window.GameState.goldProductionUpgrades * 50));

    // Clear existing interval
    if (window.GameState.goldInterval) {
      clearInterval(window.GameState.goldInterval);
      window.GameState.goldInterval = null;
    }

    // Start new interval with the updated rate
     window.GameState.goldInterval = setInterval(() => {
      if (window.GameState.gameActive && !window.GameState.gameOver && !window.GameState.gamePaused) {
        window.GameState.gold += 1 + Math.floor(window.GameState.wave / 5);
        if(window.UI) window.UI.updateFooter(); // Check if UI exists
      }
    }, window.GameState.goldProductionRate);
     console.log("Gold production interval updated. Rate(ms):", window.GameState.goldProductionRate);
  };

  Shop.finalizePurchase = function(message, updateTooltips = false) { /* ... remains same ... */
     // Ensure UI exists before updating
     if (window.UI) {
        window.UI.updateFooter(); // Update diamond display
        window.UI.showFeedback(message);
        window.UI.updateUpgradesDisplay(); // Show new upgrade level in pause menu
        if (updateTooltips) {
          window.UI.addTooltips(); // Recalculate tooltips
          window.UI.updateUnitInfoPanel(); // Update info panel stats
        }
    }
    // Use throttled update for the shop itself to prevent rapid updates
    Shop.throttledUpdate();
  };

  // --- Throttle shop updates ---
  Shop.throttleTimeout = null;
  Shop.throttleDelay = 150; /* ... remains same ... */
  Shop.throttledUpdate = function() { /* ... remains same ... */
    if (Shop.throttleTimeout) return; // Don't queue another if one is pending

    Shop.throttleTimeout = setTimeout(() => {
      Shop.updateShop(); // Update the shop display
      Shop.throttleTimeout = null; // Clear the timeout ID
    }, Shop.throttleDelay);
  };

  // Initialize DOM elements
  Shop.init = function() { /* ... remains same ... */
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
  Shop.updateShop = function() { /* ... remains same ... */
        if (!DOM.shopElement) {
          console.warn("Shop element not initialized, skipping updateShop."); // Warn instead of error
          return;
        }
        if (!window.GameState) {
             console.warn("GameState not available, skipping updateShop.");
             return;
        }


        DOM.shopElement.innerHTML = "<h3>Upgrades</h3>";
        const MAX_DEFENSE_UPGRADES = 5;

        Object.entries(Shop.SHOP_ITEMS).forEach(([key, item]) => {
          // Skip Knight if unlocked
          if (key === "NEW_UNIT" && window.GameState.isKnightUnlocked) return;
          // Show maxed out defense
          if (key === "BASE_DEFENSE" && window.GameState.baseDefenseUpgrades >= MAX_DEFENSE_UPGRADES) {
            DOM.shopElement.insertAdjacentHTML('beforeend', `
              <div class="shop-item">
                <button class="shop-button" disabled aria-disabled="true">${item.name} - MAX</button>
                <p>${item.description}</p>
              </div>
            `);
            return;
          }

          // Calculate price and affordability
           try {
              const price = item.getPrice();
              // Ensure price is valid number before proceeding
              if (typeof price !== 'number' || isNaN(price)) {
                  console.error(`Invalid price calculated for shop item: ${key}`);
                  return; // Skip this item if price is invalid
              }

              const isAffordable = window.GameState.diamonds >= price;
              const buttonClass = `shop-button ${isAffordable ? '' : 'disabled'}`;

              const shopItemHTML = `
                <div class="shop-item">
                  <button class="${buttonClass}"
                          ${isAffordable ? '' : 'disabled'}
                          aria-label="Purchase ${item.name} for ${price} diamonds"
                          ${!isAffordable ? 'aria-disabled="true"' : ''}>
                    ${item.name} - ${price} <span class="diamond-icon">💎</span>
                  </button>
                  <p>${item.description}</p>
                </div>
              `;

              DOM.shopElement.insertAdjacentHTML('beforeend', shopItemHTML);
              const button = DOM.shopElement.lastElementChild.querySelector('button');

              // Remove previous listener before adding new one to prevent duplicates
              // This requires a more complex approach like storing listeners or cloning nodes.
              // For simplicity now, we rely on innerHTML clearing old ones. Be cautious if changing this.

              if (button && isAffordable) { // Check button exists before adding listener
                button.addEventListener('click', () => item.apply()); // Use arrow function to preserve 'this' context if item.apply uses it implicitly
              }
          } catch (e) {
              console.error(`Error processing shop item ${key}:`, e);
               // Optionally add a placeholder indicating the item failed to load
                DOM.shopElement.insertAdjacentHTML('beforeend', `
                    <div class="shop-item">
                        <button class="shop-button disabled" disabled>Error Loading Item</button>
                        <p>Could not load this upgrade.</p>
                    </div>
                `);
          }
        });
  };

  // Initialize on load
  Shop.init();

  // Expose Shop
  window.Shop = Shop;
})();
// --- END OF FILE shop.js ---