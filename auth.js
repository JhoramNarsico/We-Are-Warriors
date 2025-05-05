// --- START OF FILE auth.js ---
(function() {
    const Auth = {};

    // --- PASTE YOUR FIREBASE CONFIG HERE ---
    // Ensure this matches your Firebase project settings exactly
    const firebaseConfig = {
        apiKey: "AIzaSyCVOT_6RN_qhLbJSi7NpTm6n__KnZ5BAk0", // Replace with your actual key
        authDomain: "we-are-warriors-20bda.firebaseapp.com", // Replace
        projectId: "we-are-warriors-20bda",               // Replace
        storageBucket: "we-are-warriors-20bda.firebasestorage.app", // Replace
        messagingSenderId: "466777813091",                  // Replace
        appId: "1:466777813091:web:c67633b767419ec02d0856", // Replace
        measurementId: "G-933XH8ZETC"                     // Optional, replace
      };

    // Initialize Firebase
    try {
        firebase.initializeApp(firebaseConfig);
        Auth.auth = firebase.auth();
        Auth.db = firebase.firestore(); // Initialize Firestore
        console.log("Firebase initialized successfully.");
    } catch (error) {
        console.error("Firebase initialization error:", error);
        if (window.UI && window.UI.showFeedback) {
             window.UI.showFeedback("Error connecting to online services.");
        }
        Auth.auth = null;
        Auth.db = null;
    }

    // Promise to track the completion of the first authentication state check
    Auth._initialAuthCheckComplete = false;
    Auth._initialAuthCheckResolver = null;
    Auth.initialAuthCheckPromise = new Promise(resolve => {
        Auth._initialAuthCheckResolver = resolve;
    });


    // UI Element References
    Auth.ui = {
        authContainer: document.getElementById('authContainer'),
        loginForm: document.getElementById('loginForm'),
        signupForm: document.getElementById('signupForm'),
        loginEmailInput: document.getElementById('loginEmail'),
        loginPasswordInput: document.getElementById('loginPassword'),
        loginButton: document.getElementById('loginButton'),
        signupEmailInput: document.getElementById('signupEmail'),
        signupPasswordInput: document.getElementById('signupPassword'),
        signupButton: document.getElementById('signupButton'),
        showSignupLink: document.getElementById('showSignupLink'),
        showLoginLink: document.getElementById('showLoginLink'),
        userStatus: document.getElementById('userStatus'),
        logoutButton: document.getElementById('logoutButton'),
        authError: document.getElementById('authError')
    };

    // Display authentication errors
    Auth.showError = function(message) {
        if (Auth.ui.authError) {
            Auth.ui.authError.textContent = message;
            Auth.ui.authError.style.display = message ? 'block' : 'none';
        }
         console.error("Auth Error:", message);
    };

    // Clear authentication errors
    Auth.clearError = function() {
        Auth.showError('');
    };

    // --- NEW: Save user's persistent progress (diamonds, upgrades) to Firestore ---
    Auth.saveUserProgressToCloud = async function() {
        // Ensure prerequisites are met (logged in, modules loaded)
        if (!Auth.auth || !Auth.db || !window.GameState || !window.GameState.currentUser) {
            console.log("Cannot save progress: User not logged in or modules missing.");
            return; // Cannot save if not logged in or dependencies missing
        }

        const userId = window.GameState.currentUser.uid;
        const progressData = {
            diamonds: window.GameState.diamonds,
            baseHealthUpgrades: window.GameState.baseHealthUpgrades,
            unitHealthUpgrades: window.GameState.unitHealthUpgrades,
            goldProductionUpgrades: window.GameState.goldProductionUpgrades,
            unitDamageUpgrades: window.GameState.unitDamageUpgrades,
            baseDefenseUpgrades: window.GameState.baseDefenseUpgrades,
            isKnightUnlocked: window.GameState.isKnightUnlocked,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp() // Track last save time
        };

        try {
            // Use set with merge: true to create the document if it doesn't exist or update it if it does
            await Auth.db.collection("userProgress").doc(userId).set(progressData, { merge: true });
            console.log("User progress saved successfully to cloud for user:", userId);
        } catch (error) {
            console.error("Error saving user progress to cloud:", error);
            if (window.UI) window.UI.showFeedback("Error saving online progress. Progress might be lost on logout.");
        }
    };

    // --- NEW: Load user's persistent progress from Firestore ---
    Auth.loadUserProgressFromCloud = async function(userId) {
        if (!Auth.db || !window.GameState) {
            console.error("Firestore DB or GameState not available for loading progress.");
             if (window.UI) window.UI.showFeedback("Error loading online progress: Connection or Game State error.");
            return false; // Indicate failure
        }

        console.log("Attempting to load progress from cloud for user:", userId);
        try {
            const docRef = Auth.db.collection("userProgress").doc(userId);
            const docSnap = await docRef.get(); // Fetch the document snapshot

            // Check if the document exists using '.exists' property (Firebase v8 compat library)
            if (docSnap.exists) { // Correct check for v8 compat
                console.log("Cloud progress found for user:", userId);
                const data = docSnap.data(); // Extract data from the snapshot

                // Update GameState with loaded data, using nullish coalescing (??) for defaults
                window.GameState.diamonds = data.diamonds ?? 0;
                window.GameState.baseHealthUpgrades = data.baseHealthUpgrades ?? 0;
                window.GameState.unitHealthUpgrades = data.unitHealthUpgrades ?? 0;
                window.GameState.goldProductionUpgrades = data.goldProductionUpgrades ?? 0;
                window.GameState.unitDamageUpgrades = data.unitDamageUpgrades ?? 0;
                window.GameState.baseDefenseUpgrades = data.baseDefenseUpgrades ?? 0;
                window.GameState.isKnightUnlocked = data.isKnightUnlocked ?? false;

                console.log("Loaded GameState from cloud:", {
                     diamonds: window.GameState.diamonds,
                     knight: window.GameState.isKnightUnlocked // Example log
                });

                // Recalculate derived stats based on loaded upgrades
                 window.GameState.baseHealth = 150 + (window.GameState.baseHealthUpgrades * 25);
                 window.GameState.goldProductionRate = Math.max(300, 800 - (window.GameState.goldProductionUpgrades * 50));

                // Trigger UI and Shop updates to reflect loaded state
                if (window.UI) {
                    window.UI.updateFooter();
                    window.UI.updateUpgradesDisplay();
                    window.UI.updateKnightButtonState();
                    window.UI.addTooltips();
                    window.UI.updateUnitInfoPanel();
                }
                 if (window.Shop) {
                    window.Shop.updateShop();
                    if(window.Shop.updateGoldProduction) {
                       window.Shop.updateGoldProduction(); // Restart gold interval with correct rate
                    }
                 }

                // Save loaded diamonds locally as a backup/for potential offline use
                 try { localStorage.setItem('warriorDiamonds', window.GameState.diamonds); } catch(e) { console.warn("Could not save loaded diamonds locally."); }

                return true; // Indicate successful load
            } else {
                // Document doesn't exist: Initialize progress for a new user
                console.log("No cloud progress found for user:", userId, ". Initializing cloud save with default state.");
                // Set GameState to defaults
                window.GameState.diamonds = 100;
                window.GameState.baseHealthUpgrades = 0;
                window.GameState.unitHealthUpgrades = 0;
                window.GameState.goldProductionUpgrades = 0;
                window.GameState.unitDamageUpgrades = 0;
                window.GameState.baseDefenseUpgrades = 0;
                window.GameState.isKnightUnlocked = false;

                 // Recalculate derived stats based on defaults
                 window.GameState.baseHealth = 150;
                 window.GameState.goldProductionRate = 800;

                // Save these defaults to the cloud for the user
                await Auth.saveUserProgressToCloud();

                // Update UI to reflect the default state
                 if (window.UI) {
                    window.UI.updateFooter();
                    window.UI.updateUpgradesDisplay();
                    window.UI.updateKnightButtonState();
                    window.UI.addTooltips();
                    window.UI.updateUnitInfoPanel();
                 }
                 if (window.Shop) {
                    window.Shop.updateShop();
                     if(window.Shop.updateGoldProduction) {
                       window.Shop.updateGoldProduction();
                    }
                 }
                 // Update local diamonds storage with default
                 try { localStorage.setItem('warriorDiamonds', window.GameState.diamonds); } catch(e) { console.warn("Could not save default diamonds locally."); }

                return true; // Indicate successful initialization
            }
        } catch (error) {
            // Catch errors during Firestore get/set or subsequent updates
            console.error("Error loading user progress from cloud:", error); // Log the specific error
            if (window.UI) window.UI.showFeedback("Error loading online progress. Using local/default data.");

            // Fallback strategy: Load from local storage (only if GameState provides the function)
            if (window.GameState && window.GameState.loadLocalProgress) {
                window.GameState.loadLocalProgress(); // Load local upgrades/diamonds
                // Apply the loaded local progress to derived stats
                window.GameState.baseHealth = 150 + (window.GameState.baseHealthUpgrades * 25);
                window.GameState.goldProductionRate = Math.max(300, 800 - (window.GameState.goldProductionUpgrades * 50));
            } else {
                console.error("GameState.loadLocalProgress not available for fallback.");
            }

             // Update UI based on fallback data (local or default)
             if (window.UI) {
                 window.UI.updateFooter();
                 window.UI.updateUpgradesDisplay();
                 window.UI.updateKnightButtonState();
                 window.UI.addTooltips();
                 window.UI.updateUnitInfoPanel();
             }
             if (window.Shop) {
                 window.Shop.updateShop();
                 if(window.Shop.updateGoldProduction) { window.Shop.updateGoldProduction(); }
             }

            return false; // Indicate failure
        }
    };


    // Setup Authentication UI event listeners and the crucial auth state listener
    Auth.setupAuthUI = function() {
        if (!Auth.auth) return; // Don't setup if Firebase init failed

        // --- Form Event Listeners ---
        if (Auth.ui.loginForm) {
            Auth.ui.loginForm.addEventListener('submit', (e) => {
                e.preventDefault(); Auth.clearError();
                Auth.signIn(Auth.ui.loginEmailInput.value, Auth.ui.loginPasswordInput.value);
            });
        }
        if (Auth.ui.signupForm) {
            Auth.ui.signupForm.addEventListener('submit', (e) => {
                e.preventDefault(); Auth.clearError();
                Auth.signUp(Auth.ui.signupEmailInput.value, Auth.ui.signupPasswordInput.value);
            });
        }

        // --- Form Switching Links ---
        if (Auth.ui.showSignupLink) {
            Auth.ui.showSignupLink.addEventListener('click', (e) => {
                e.preventDefault(); Auth.clearError();
                if(Auth.ui.loginForm) Auth.ui.loginForm.style.display = 'none';
                if(Auth.ui.signupForm) Auth.ui.signupForm.style.display = 'block';
            });
        }
        if (Auth.ui.showLoginLink) {
            Auth.ui.showLoginLink.addEventListener('click', (e) => {
                e.preventDefault(); Auth.clearError();
                if(Auth.ui.loginForm) Auth.ui.loginForm.style.display = 'block';
                if(Auth.ui.signupForm) Auth.ui.signupForm.style.display = 'none';
            });
        }

        // --- Logout Button Listener ---
        if (Auth.ui.logoutButton) {
            Auth.ui.logoutButton.addEventListener('click', () => {
                const confirmationMessage = "Are you sure you want to log out?\n\n" +
                                            "Your latest progress (diamonds, upgrades) will be saved online.\n" +
                                            "Local progress and upgrades will be cleared after logout.";
                if (confirm(confirmationMessage)) {
                    Auth.signOutUser(); // Includes pre-saving progress
                } else {
                    console.log("Logout cancelled by user.");
                }
            });
        }

        // --- Firebase Auth State Change Listener ---
        // This runs when the page loads and whenever the user logs in or out
        Auth.auth.onAuthStateChanged(async user => { // Make async to await cloud load
            if (!window.GameState) {
                 console.error("GameState not ready during Auth state change listener.");
                 // Still resolve the initial check promise to avoid blocking game init
                 if (!Auth._initialAuthCheckComplete && Auth._initialAuthCheckResolver) { Auth._initialAuthCheckResolver(); }
                 return;
            }

            if (user) {
                // --- User Signed In ---
                console.log("Auth State Change: User signed in:", user.email);
                window.GameState.currentUser = { uid: user.uid, email: user.email };

                // Load progress from cloud (waits for completion)
                await Auth.loadUserProgressFromCloud(user.uid);

                // Update UI to reflect logged-in state
                if(Auth.ui.userStatus) Auth.ui.userStatus.textContent = `Logged in: ${user.email}`;
                if(Auth.ui.logoutButton) Auth.ui.logoutButton.style.display = 'inline-block';
                if(Auth.ui.authContainer) Auth.ui.authContainer.style.display = 'none'; // Hide auth forms
                if (window.UI && window.UI.updateButtonStates) window.UI.updateButtonStates();

            } else {
                // --- User Signed Out ---
                console.log("Auth State Change: User signed out.");
                // Only clear state if someone *was* previously logged in
                if (window.GameState.currentUser) {
                    console.log("Clearing user-specific GameState on logout.");
                    window.GameState.currentUser = null;
                    // Reset persistent state variables in GameState to defaults
                    window.GameState.diamonds = 100;
                    window.GameState.baseHealthUpgrades = 0;
                    window.GameState.unitHealthUpgrades = 0;
                    window.GameState.goldProductionUpgrades = 0;
                    window.GameState.unitDamageUpgrades = 0;
                    window.GameState.baseDefenseUpgrades = 0;
                    window.GameState.isKnightUnlocked = false;

                    // Clear corresponding local storage items
                    try {
                        localStorage.removeItem('warriorBaseHealthUpgrades');
                        localStorage.removeItem('warriorUnitHealthUpgrades');
                        localStorage.removeItem('warriorGoldProdUpgrades');
                        localStorage.removeItem('warriorUnitDamageUpgrades');
                        localStorage.removeItem('warriorBaseDefenseUpgrades');
                        localStorage.removeItem('warriorKnightUnlocked');
                        localStorage.setItem('warriorDiamonds', '100'); // Reset local diamonds too
                    } catch(e) { console.error("Error clearing local storage on logout", e);}

                     // Recalculate derived stats based on cleared state
                     window.GameState.baseHealth = 150;
                     window.GameState.goldProductionRate = 800;

                     // Update UI fully to reflect logged-out default state
                    if (window.UI) {
                        window.UI.updateFooter();
                        window.UI.updateUpgradesDisplay();
                        window.UI.updateKnightButtonState();
                        window.UI.addTooltips();
                        window.UI.updateUnitInfoPanel();
                        window.UI.updateButtonStates();
                    }
                    if (window.Shop) {
                        window.Shop.updateShop();
                        if(window.Shop.updateGoldProduction) {
                           window.Shop.updateGoldProduction();
                        }
                    }
                }
                // Update general logged-out UI elements
                if(Auth.ui.userStatus) Auth.ui.userStatus.textContent = 'Not logged in';
                if(Auth.ui.logoutButton) Auth.ui.logoutButton.style.display = 'none';
                // Show auth forms (unless hidden within tutorial modal)
                // Check if authContainer exists and is not inside a hidden tutorial modal
                 const tutorialModal = Auth.ui.authContainer ? Auth.ui.authContainer.closest('#tutorialModal') : null;
                const isTutorialVisible = tutorialModal && (tutorialModal.style.display === 'flex' || tutorialModal.style.display === ''); // Check common visible states

                if (Auth.ui.authContainer && !isTutorialVisible) {
                    Auth.ui.authContainer.style.display = 'block'; // Show auth if not in visible tutorial
                    if(Auth.ui.loginForm) Auth.ui.loginForm.style.display = 'block'; // Default to login view
                    if(Auth.ui.signupForm) Auth.ui.signupForm.style.display = 'none';
                } else if (Auth.ui.authContainer && isTutorialVisible) {
                     // Keep auth visible *inside* the tutorial if it's shown
                    Auth.ui.authContainer.style.display = 'block';
                     if(Auth.ui.loginForm) Auth.ui.loginForm.style.display = 'block'; // Default to login view
                     if(Auth.ui.signupForm) Auth.ui.signupForm.style.display = 'none';
                 } else if (!Auth.ui.authContainer) {
                     console.warn("Auth container UI element not found.");
                 }

                if (window.UI && window.UI.updateButtonStates) window.UI.updateButtonStates();
            }

             // Resolve the initial auth check promise after the first run
             if (!Auth._initialAuthCheckComplete) {
                console.log("Initial auth check complete. User state determined.");
                Auth._initialAuthCheckComplete = true;
                if (Auth._initialAuthCheckResolver) {
                    Auth._initialAuthCheckResolver(); // Signal that game init can proceed
                } else { console.error("Initial auth check resolver missing!"); }
            }
        });
    }; // End setupAuthUI

    // Sign Up function
    Auth.signUp = function(email, password) {
         if (!Auth.auth) return Auth.showError("Auth service unavailable.");
        Auth.auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in successfully - onAuthStateChanged listener handles the rest
                // (including loading/initializing cloud progress)
                console.log("Sign up successful:", userCredential.user.email);
                 if (window.UI) window.UI.showFeedback("Sign up successful! Welcome!");
                 Auth.clearError();
            })
            .catch((error) => {
                console.error("Sign up error:", error.code, error.message);
                Auth.showError(`Sign up failed: ${error.message}`);
            });
    };

    // Sign In function
    Auth.signIn = function(email, password) {
         if (!Auth.auth) return Auth.showError("Auth service unavailable.");
        Auth.auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in successfully - onAuthStateChanged listener handles the rest
                // (including loading cloud progress)
                console.log("Sign in successful:", userCredential.user.email);
                if (window.UI) window.UI.showFeedback("Login successful! Loading progress...");
                Auth.clearError();
            })
            .catch((error) => {
                console.error("Sign in error:", error.code, error.message);
                Auth.showError(`Login failed: ${error.message}`);
            });
    };

    // --- MODIFIED: Sign Out function - includes saving progress first ---
    Auth.signOutUser = async function() { // Make async to await progress save
        if (!Auth.auth) { Auth.showError("Auth service unavailable."); return; }

        // Save current progress to the cloud before logging out
        if (window.UI) window.UI.showFeedback("Saving progress...");
        await Auth.saveUserProgressToCloud(); // Wait for save attempt

        // Proceed with sign out
        try {
            await Auth.auth.signOut();
            console.log("Sign out successful.");
            if (window.UI) window.UI.showFeedback("Logged out.");
            Auth.clearError();
            // onAuthStateChanged listener handles UI updates and state clearing
        } catch (error) {
            console.error("Sign out error:", error);
            Auth.showError(`Logout failed: ${error.message}`);
            if (window.UI) window.UI.showFeedback("Logout failed. Progress might not have saved.");
        }
    };


    // Expose Auth object to the global window scope
    window.Auth = Auth;

}());
// --- END OF FILE auth.js ---