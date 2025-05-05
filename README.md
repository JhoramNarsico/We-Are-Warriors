# Warrior Defense

Warrior Defense is a simple side-scrolling base defense game built with HTML, CSS, and vanilla JavaScript. Players spawn units to defend their base and destroy the enemy's base across multiple waves, utilizing gold and diamond resources for spawning and upgrades. It features optional Firebase integration for user authentication and an online leaderboard.

**(screenshot.gif)**
<!-- (screenshot.GIF) -->
*(Replace the line above with an actual screenshot or GIF of your game)*

## Features

*   **Unit Variety:** Spawn different unit types (Barbarian, Archer, Horse, Knight) each with unique stats and costs.
*   **Resource Management:** Earn Gold (💰) over time and from kills to spawn units. Earn Diamonds (💎) from kills and wave clears to buy permanent upgrades.
*   **Upgrade System:** Spend Diamonds in the Shop to permanently upgrade:
    *   Base Health & Defense
    *   Unit Health & Damage
    *   Gold Production Rate
    *   Unlock the powerful Knight unit.
*   **Wave Progression:** Battle through 20 waves of increasingly difficult enemies.
*   **Win/Loss Conditions:** Win by surviving all waves and destroying the enemy base each wave. Lose if your base's health reaches zero.
*   **Game Controls:** Pause, Restart, Surrender options available.
*   **Sound Control:** Toggle background music and sound effects on/off.
*   **Local Save/Load:** Game progress (upgrades, current wave, resources) is saved locally in the browser. The game automatically attempts to load saved state on startup.
*   **Tutorial:** An interactive tutorial introduces new players to the game mechanics on their first launch (or after resetting).
*   **Optional Online Features (Firebase):**
    *   **Authentication:** Log in or Sign Up using Email/Password.
    *   **Leaderboard:** Logged-in users can save their highest wave reached to a global Firestore leaderboard and view the top scores.

## Technology Stack

*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
*   **Backend (Optional):** Firebase
    *   Firebase Authentication (Email/Password)
    *   Firebase Firestore (Leaderboard Database)

## Getting Started

To run this game locally, you need a local web server and optionally a Firebase project for the online features.

### Prerequisites

1.  **Local Web Server:** You need a way to serve the files over HTTP. Simple options include:
    *   Node.js with `http-server`: `npm install -g http-server`
    *   Python's built-in server: `python -m http.server` (Python 3) or `python -m SimpleHTTPServer` (Python 2)
    *   VS Code Live Server extension.
2.  **Firebase Project (Optional):** If you want to use the Login/Leaderboard features:
    *   Create a project at [https://firebase.google.com/](https://firebase.google.com/).
    *   Enable Email/Password Authentication in the Authentication section.
    *   Create a Firestore database in the Firestore section. Set up basic security rules (e.g., allow reads publicly, writes only for authenticated users to the leaderboard).

### Setup

1.  **Clone the repository (or download the files):**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
2.  **Firebase Configuration (Optional):**
    *   If using Firebase, go to your Firebase project settings -> General tab -> Your apps -> Web app.
    *   Find your Firebase configuration object (it looks like `firebaseConfig = { apiKey: "...", ... }`).
    *   Open the `auth.js` file in the project.
    *   **Replace** the placeholder `firebaseConfig` object within `auth.js` with your actual Firebase project configuration.
    ```javascript
    // --- START OF FILE auth.js ---
    (function() {
        const Auth = {};

        // --- PASTE YOUR FIREBASE CONFIG HERE ---
        const firebaseConfig = {
            apiKey: "YOUR_API_KEY", // Replace
            authDomain: "YOUR_AUTH_DOMAIN", // Replace
            projectId: "YOUR_PROJECT_ID", // Replace
            storageBucket: "YOUR_STORAGE_BUCKET", // Replace
            messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Replace
            appId: "YOUR_APP_ID", // Replace
            measurementId: "YOUR_MEASUREMENT_ID" // Optional, replace if you use Analytics
        };
        // ... rest of auth.js
    ```

### Running the Game

1.  **Navigate to the project directory** in your terminal.
2.  **Start your local web server:**
    *   Using `http-server`:
        ```bash
        http-server
        ```
    *   Using Python 3:
        ```bash
        python -m http.server
        ```
3.  **Open your web browser** and navigate to the address provided by your server (e.g., `http://localhost:8080` or `http://127.0.0.1:8000`).

## Gameplay

1.  **Tutorial/Login:** On first launch (or after reset/refresh), you'll see a tutorial explaining the basics. The last slide includes optional Login/Sign Up forms. You can also load a previously saved local game from here if one exists.
2.  **Unit Selection:** Choose a unit type from the left sidebar using the buttons or number keys (1-4). Knight (4) must be unlocked in the shop first. Unit stats are displayed below the buttons.
3.  **Spawning:** Click the "Spawn Unit" button or press `Spacebar` to deploy the selected unit from your base. This costs Gold (💰).
4.  **Starting Waves:** Click the "Fight!" button to begin the enemy wave. Enemies spawn from the right.
5.  **Combat:** Your units automatically move towards and attack the nearest enemy or the enemy base.
6.  **Resources:** Earn Gold (💰) passively during waves and for kills. Earn Diamonds (💎) for kills and completing waves.
7.  **Shop:** Use Diamonds (💎) in the Shop (right sidebar, toggle with button) to buy permanent upgrades for your base and units.
8.  **Winning a Wave:** Destroy the enemy's red base to clear the wave, earn rewards, and prepare for the next.
9.  **Winning the Game:** Survive all 20 waves.
10. **Losing:** If your blue base's health drops to zero, the game is over.
11. **Controls:**
    *   `1`, `2`, `3`, `4`: Select Unit Type
    *   `Spacebar`: Spawn Selected Unit
    *   `Esc`: Pause/Resume Game (also closes modals)
    *   Footer Buttons: Fight, Spawn, Pause/Resume, Surrender, Restart
    *   Pause Menu: Resume, Save Game (Local), New Game (Resets Progress)
    *   Header Buttons: Sound Toggle, Leaderboard (if logged in), Logout (if logged in)

## File Structure

*   `index.html`: The main HTML file defining the game structure and including scripts.
*   `style.css`: Contains all the CSS rules for styling the game interface.
*   `game.js`: Initializes the game modules, sets up the main game loop driver.
*   `gameState.js`: Manages the core state of the game (wave, resources, health, upgrades, game status flags, user info). Handles saving and loading local progress.
*   `units.js`: Defines unit types, stats, enemy scaling, handles unit spawning and the core unit update logic (movement, targeting, attacking).
*   `canvas.js`: Manages the HTML5 Canvas element and context. Contains functions for drawing bases, units, and visual effects (attack/death animations).
*   `ui.js`: Handles all interactions with the DOM (updating displays, showing feedback messages, managing modals, updating button states and tooltips).
*   `shop.js`: Defines shop items, handles purchase logic, and updates the shop UI.
*   `events.js`: Attaches all necessary event listeners for buttons, keyboard input, etc.
*   `auth.js`: Handles Firebase Authentication initialization, UI setup (login/signup forms), user state changes (login, logout), and provides Auth/Firestore instances.
*   `leaderboard.js`: Manages interaction with Firebase Firestore for saving high scores and displaying the leaderboard modal.
*   `sounds/`: Directory containing all audio files (.mp3).

## Contributing

Contributions, issues, and feature requests are welcome!

## License

(Specify your license here, e.g., MIT, or state if it's unlicensed)
