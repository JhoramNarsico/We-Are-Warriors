# Warrior Defense

A simple real-time strategy/tower defense browser game built with vanilla HTML/CSS/JS and HTML5 Canvas.

## Gameplay

*   **Objective:** Defend your base (left) while spawning units to destroy the enemy base (right). Survive 20 waves.
*   **Resources:**
    *   💰 **Gold:** Earned during waves & from kills. Spend to spawn units.
    *   💎 **Diamonds:** Earned from kills & clearing waves. Spend on permanent upgrades in the Shop.
*   **Units:** Spawn Barbarians, Archers, Horses, and unlockable Knights. They fight automatically.
*   **Upgrades:** Improve Base/Unit stats, Gold Rate, and unlock the Knight via the Shop (upgrades persist via `localStorage`).
*   **Waves:** Click "Fight!" to start increasingly difficult waves. Destroy the enemy base to advance.

## Key Features

*   Real-time unit spawning & combat
*   4 Unit Types (Barbarian, Archer, Horse, Knight)
*   Persistent Shop upgrades (via `localStorage`)
*   20 Waves with scaling difficulty
*   Basic Save/Load functionality
*   Sound effects & music toggle

## Controls

*   **Unit Buttons / 1-4:** Select Unit
*   **Spawn Button / Spacebar:** Spawn Selected Unit (costs Gold)
*   **Fight Button:** Start Next Wave
*   **Pause Button / Esc:** Pause/Resume Game
*   **Shop Buttons:** Buy Upgrades (costs Diamonds)

## Running the Game

1.  Clone or download the repository.
2.  Run using a local web server. Navigate to the project directory in your terminal and use:
    ```bash
    # Example using Python 3
    python -m http.server
    ```
    Then open `http://localhost:8000` in your browser.
3.  Alternatively, open `index.html` directly in your browser (local server recommended).

## Tech Stack

*   HTML5
*   CSS3
*   Vanilla JavaScript (ES6+)
*   HTML5 Canvas 2D API

## License

MIT License (or specify if different)
