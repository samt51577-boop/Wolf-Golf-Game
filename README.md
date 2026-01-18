# Wolf Ledger (5-Man Edition) 🐺⛳

**Wolf Ledger** is a lightweight, mobile-first web application designed to track scoring for the "Wolf" golf betting game. Specifically optimized for 5-player groups, this tool handles the complex rotation and point distribution that makes manual scorecards a headache.

## 🚀 Features
- **Dynamic 5-Player Rotation:** Automatically tracks who is the Wolf for every hole.
- **Alliance Tracking:** Simple UI to select a partner or declare a "Lone Wolf" before scoring.
- **Automated Point Distribution:** - **Wolf + Partner Win:** +2 pts each.
  - **The Pack (3) Wins vs Team:** +3 pts each.
  - **Lone Wolf Win:** +4 pts.
  - **The Pack (4) Wins vs Lone Wolf:** +1 pt each.
- **Mobile-Optimized:** High-contrast design for visibility on the course and thumb-friendly buttons.

## 🛠️ Tech Stack
- **HTML5/CSS3**
- **Tailwind CSS:** For rapid, responsive UI styling.
- **Alpine.js:** A rugged, minimal framework for handling the scoring logic and state management.

## 📋 Rules of the Game
1. **The Order:** A fixed rotation is set at the start (Player 1 through 5).
2. **The Tee:** The Wolf tees off first. They can choose a partner immediately after a player hits, or wait to see all drives and go "Lone Wolf."
3. **The Score:** The game is played as "Better Ball." The lowest score on the hole wins for that team.
4. **The Points:** Points are tallied hole-by-hole and typically settled for a cash value at the end of the round.

## 💻 How to Use
1. Clone the repository.
2. Open `index.html` in any modern web browser (or host it via GitHub Pages for on-course access).
3. Enter the names of your 5-man group.
4. Tap "Start Match" and let the ledger handle the math.

## 🧪 Future Enhancements
- [ ] **Blind Wolf Toggle:** Add 6-point "Blind Wolf" modifiers.
- [ ] **Side Bet Tracker:** Integrate "Greenies" (closest to pin) and "Sandies."
- [ ] **Data Persistence:** Use LocalStorage to save game progress in case of accidental browser refresh.

---
*Created for the walk, the wager, and the win.*
