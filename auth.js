// --- START OF FILE auth.js ---
(function() {
    const Auth = {};

    // --- PASTE YOUR FIREBASE CONFIG HERE ---
    const firebaseConfig = {
        apiKey: "AIzaSyCVOT_6RN_qhLbJSi7NpTm6n__KnZ5BAk0",
        authDomain: "we-are-warriors-20bda.firebaseapp.com",
        projectId: "we-are-warriors-20bda",
        storageBucket: "we-are-warriors-20bda.firebasestorage.app",
        messagingSenderId: "466777813091",
        appId: "1:466777813091:web:c67633b767419ec02d0856",
        measurementId: "G-933XH8ZETC"
      };

    // Initialize Firebase
    try {
        firebase.initializeApp(firebaseConfig);
        Auth.auth = firebase.auth();
        Auth.db = firebase.firestore(); // Initialize Firestore
        console.log("Firebase initialized successfully.");
    } catch (error) {
        console.error("Firebase initialization error:", error);
        // Maybe show an error message to the user that online features won't work
        if (window.UI && window.UI.showFeedback) {
             window.UI.showFeedback("Error connecting to online services.");
        }
        // Prevent further auth/db operations if init fails
        Auth.auth = null;
        Auth.db = null;
    }


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

    Auth.showError = function(message) {
        if (Auth.ui.authError) {
            Auth.ui.authError.textContent = message;
            Auth.ui.authError.style.display = message ? 'block' : 'none';
        }
         console.error("Auth Error:", message);
    };

    Auth.clearError = function() {
        Auth.showError('');
    };

    Auth.setupAuthUI = function() {
        if (!Auth.auth) return; // Don't setup if Firebase init failed

        // --- Event Listeners for Forms ---
        if (Auth.ui.loginForm) {
            Auth.ui.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                Auth.clearError();
                const email = Auth.ui.loginEmailInput.value;
                const password = Auth.ui.loginPasswordInput.value;
                Auth.signIn(email, password);
            });
        }

        if (Auth.ui.signupForm) {
            Auth.ui.signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                Auth.clearError();
                const email = Auth.ui.signupEmailInput.value;
                const password = Auth.ui.signupPasswordInput.value;
                Auth.signUp(email, password);
            });
        }

        // --- Links to switch forms ---
        if (Auth.ui.showSignupLink) {
            Auth.ui.showSignupLink.addEventListener('click', (e) => {
                e.preventDefault();
                Auth.clearError();
                if(Auth.ui.loginForm) Auth.ui.loginForm.style.display = 'none';
                if(Auth.ui.signupForm) Auth.ui.signupForm.style.display = 'block';
            });
        }
        if (Auth.ui.showLoginLink) {
            Auth.ui.showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                Auth.clearError();
                if(Auth.ui.loginForm) Auth.ui.loginForm.style.display = 'block';
                if(Auth.ui.signupForm) Auth.ui.signupForm.style.display = 'none';
            });
        }

        // --- Logout Button ---
        if (Auth.ui.logoutButton) {
            Auth.ui.logoutButton.addEventListener('click', () => {
                // --- ADDED CONFIRMATION DIALOG ---
                const confirmationMessage = "Are you sure you want to log out?\n\n" +
                                            "You will no longer be able to save your high scores to the online leaderboard.\n" +
                                            "Local progress and upgrades will still be saved.";

                if (confirm(confirmationMessage)) {
                    // User confirmed, proceed with logout
                    Auth.signOutUser();
                } else {
                    // User cancelled, do nothing
                    console.log("Logout cancelled by user.");
                    // Optionally show feedback that logout was cancelled
                    // window.UI.showFeedback("Logout cancelled.");
                }
                // --- END ADDED CONFIRMATION DIALOG ---
            });
        }

        // --- Auth State Listener ---
        Auth.auth.onAuthStateChanged(user => {
            if (user) {
                // User is signed in
                console.log("User signed in:", user.email);
                window.GameState.currentUser = { uid: user.uid, email: user.email }; // Store user info
                if(Auth.ui.userStatus) Auth.ui.userStatus.textContent = `Logged in: ${user.email}`;
                if(Auth.ui.logoutButton) Auth.ui.logoutButton.style.display = 'inline-block';
                if(Auth.ui.authContainer) Auth.ui.authContainer.style.display = 'none'; // Hide login/signup forms
                 // Maybe trigger leaderboard load or other user-specific actions
            } else {
                // User is signed out
                console.log("User signed out.");
                window.GameState.currentUser = null; // Clear user info
                if(Auth.ui.userStatus) Auth.ui.userStatus.textContent = 'Not logged in';
                if(Auth.ui.logoutButton) Auth.ui.logoutButton.style.display = 'none';
                // Ensure auth forms are potentially visible again if they are part of a modal/container
                // This check depends on where the #authContainer is located. If it's in the tutorial modal,
                // this won't make it visible unless the tutorial modal itself is shown.
                if (Auth.ui.authContainer && Auth.ui.authContainer.closest('#tutorialModal') && Auth.ui.authContainer.closest('#tutorialModal').style.display !== 'flex') {
                   // Don't force authContainer block if it's inside the hidden tutorial modal
                } else if (Auth.ui.authContainer) {
                    Auth.ui.authContainer.style.display = 'block'; // Show container (forms inside might be hidden)
                }
                if(Auth.ui.loginForm) Auth.ui.loginForm.style.display = 'block'; // Default to login view when showing container
                if(Auth.ui.signupForm) Auth.ui.signupForm.style.display = 'none';
            }
            // Update any UI dependent on login state
            if (window.UI && window.UI.updateButtonStates) window.UI.updateButtonStates(); // e.g., disable "Save Score" if logged out
        });
    };

    Auth.signUp = function(email, password) {
        if (!Auth.auth) return Auth.showError("Auth service unavailable.");

        Auth.auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in
                const user = userCredential.user;
                console.log("Sign up successful:", user.email);
                 window.UI.showFeedback("Sign up successful!");
                 Auth.clearError();
                // No need to manually update UI, onAuthStateChanged will handle it
            })
            .catch((error) => {
                console.error("Sign up error:", error.code, error.message);
                Auth.showError(`Sign up failed: ${error.message}`);
            });
    };

    Auth.signIn = function(email, password) {
         if (!Auth.auth) return Auth.showError("Auth service unavailable.");

        Auth.auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in
                const user = userCredential.user;
                console.log("Sign in successful:", user.email);
                window.UI.showFeedback("Login successful!");
                Auth.clearError();
                // No need to manually update UI, onAuthStateChanged will handle it
            })
            .catch((error) => {
                console.error("Sign in error:", error.code, error.message);
                Auth.showError(`Login failed: ${error.message}`);
            });
    };

    Auth.signOutUser = function() {
        if (!Auth.auth) return Auth.showError("Auth service unavailable.");

        Auth.auth.signOut().then(() => {
            console.log("Sign out successful.");
            window.UI.showFeedback("Logged out.");
             Auth.clearError();
            // onAuthStateChanged will handle UI updates
        }).catch((error) => {
            console.error("Sign out error:", error);
            Auth.showError(`Logout failed: ${error.message}`);
        });
    };

    // Expose Auth object
    window.Auth = Auth;

}());
// --- END OF FILE auth.js ---