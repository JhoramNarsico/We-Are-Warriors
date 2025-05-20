(function() {
    const Leaderboard = {};

    Leaderboard.db = null; // Will be set by Auth.js

    Leaderboard.ui = {
        leaderboardModal: document.getElementById('leaderboardModal'),
        leaderboardContent: document.getElementById('leaderboardContent'),
        closeLeaderboardButton: document.getElementById('closeLeaderboardButton'),
        loadingIndicator: document.getElementById('leaderboardLoading')
    };

    Leaderboard.init = function() {
        // Attempt to get Firestore instance from Auth module after it initializes
        // This needs careful timing or a shared initialization pattern.
        // For now, assume Auth.db exists when leaderboard functions are called.
        if (window.Auth && window.Auth.db) {
             Leaderboard.db = window.Auth.db;
             console.log("Leaderboard Firestore reference obtained.");
        } else {
            console.warn("Leaderboard could not get Firestore reference on init.");
            // Attempt to get it later if needed
        }

        // Event listener for closing the modal
         if (Leaderboard.ui.closeLeaderboardButton) {
             Leaderboard.ui.closeLeaderboardButton.addEventListener('click', () => {
                 Leaderboard.hideLeaderboard();
             });
         }
    };

    Leaderboard.showLoading = function(show) {
        if (Leaderboard.ui.loadingIndicator) {
            Leaderboard.ui.loadingIndicator.style.display = show ? 'block' : 'none';
        }
    }

    Leaderboard.saveScore = function(userId, userEmail, wave) {
         // Ensure DB is available (might not be on initial load if Auth hasn't finished)
         if (!Leaderboard.db && window.Auth && window.Auth.db) {
             Leaderboard.db = window.Auth.db;
         }
         if (!Leaderboard.db) {
             console.error("Firestore not available to save score.");
             window.UI.showFeedback("Cannot save score: Database connection error.");
             return; // Don't attempt if DB isn't ready
         }
        if (!userId || !userEmail || wave <= 0) {
            console.log("Invalid data for saving score.");
            return; // Don't save if not logged in or wave is 0
        }

        console.log(`Attempting to save score: User ${userId}, Wave ${wave}`);

        // Add a new entry to the 'leaderboard' collection
        Leaderboard.db.collection("leaderboard").add({
            userId: userId,
            userEmail: userEmail, // Store email for display
            wave: wave,
            timestamp: firebase.firestore.FieldValue.serverTimestamp() // Record when score was saved
        })
        .then((docRef) => {
            console.log("Score saved successfully with ID: ", docRef.id);
            window.UI.showFeedback("Score saved to leaderboard!");
        })
        .catch((error) => {
            console.error("Error saving score: ", error);
            window.UI.showFeedback(`Error saving score: ${error.message}`);
        });
    };

    Leaderboard.displayLeaderboard = async function() {
        // Ensure DB is available
        if (!Leaderboard.db && window.Auth && window.Auth.db) {
             Leaderboard.db = window.Auth.db;
         }
        if (!Leaderboard.db) {
             console.error("Firestore not available to display leaderboard.");
             window.UI.showFeedback("Cannot load leaderboard: Database connection error.");
             return; // Don't attempt if DB isn't ready
         }
        if (!Leaderboard.ui.leaderboardModal || !Leaderboard.ui.leaderboardContent) {
            console.error("Leaderboard UI elements not found.");
            return;
        }

        Leaderboard.ui.leaderboardModal.style.display = 'flex';
        Leaderboard.ui.leaderboardContent.innerHTML = ''; // Clear previous content
        Leaderboard.showLoading(true);

        try {
            // Query the top 10 scores, ordered by wave descending, then timestamp ascending (earlier is better tie-breaker)
            const querySnapshot = await Leaderboard.db.collection("leaderboard")
                .orderBy("wave", "desc")
                .orderBy("timestamp", "asc")
                .limit(10)
                .get();

            Leaderboard.showLoading(false);

            if (querySnapshot.empty) {
                Leaderboard.ui.leaderboardContent.innerHTML = '<p>Leaderboard is empty!</p>';
                return;
            }

            let leaderboardHTML = '<ol class="leaderboard-list">';
            let rank = 1;
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Basic email obfuscation for display
                const displayEmail = data.userEmail.replace(/(.{2}).*@(.*)/, "$1***@$2");
                leaderboardHTML += `<li>
                    <span class="rank">${rank++}.</span>
                    <span class="email">${displayEmail}</span>
                    <span class="wave">Wave ${data.wave}</span>
                </li>`;
            });
            leaderboardHTML += '</ol>';
            Leaderboard.ui.leaderboardContent.innerHTML = leaderboardHTML;

        } catch (error) {
            console.error("Error getting leaderboard: ", error);
             Leaderboard.showLoading(false);
             Leaderboard.ui.leaderboardContent.innerHTML = '<p>Error loading leaderboard. Please try again.</p>';
             window.UI.showFeedback(`Error loading leaderboard: ${error.message}`);
        }
    };

     Leaderboard.hideLeaderboard = function() {
        if (Leaderboard.ui.leaderboardModal) {
            Leaderboard.ui.leaderboardModal.style.display = 'none';
        }
    }

    // Expose Leaderboard object
    window.Leaderboard = Leaderboard;

}());
