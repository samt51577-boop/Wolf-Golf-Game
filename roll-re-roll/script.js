// COURSES_BY_STATE is now loaded from courses.js
// STROKE_INDEXES remains for defaulting
const STROKE_INDEXES = [
  17, 1, 15, 3, 13, 5, 11, 7, 9, 18, 2, 16, 4, 14, 6, 12, 8, 10,
]; // Mock diff

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "Custom",
];

// Game defaults and constants
const DEFAULTS = {
  BASE_BET: 1,
  SLOPE_RATING: 113,
  COURSE_RATING: 72,
  HOLES: 18,
  DEFAULT_PAR: 4,
};

// Safe localStorage helpers (handles private browsing, quota exceeded, etc.)
const safeStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("localStorage.getItem failed:", e.message);
      return null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn("localStorage.setItem failed:", e.message);
      // Could be quota exceeded or private browsing
      return false;
    }
  },
};

// Safe JSON parse with validation
function safeJsonParse(str, defaultValue = null) {
  if (!str) return defaultValue;
  try {
    const parsed = JSON.parse(str);
    return parsed !== null ? parsed : defaultValue;
  } catch (e) {
    console.warn("JSON.parse failed:", e.message);
    return defaultValue;
  }
}

class RollReRollGame {
  constructor() {
    this.cacheDOM();
    this.populateStates();
    this.populateCourses();
    this.loadState();
    this.bindEvents();

    if (this.state.isActive) {
      this.homeScreen.classList.add("hidden");
      this.courseScreen.classList.add("hidden");
      this.setupScreen.classList.add("hidden");
      this.gameScreen.classList.remove("hidden");
      this.updateUI();
      this.updateScoreboardDOM();
    } else {
      this.homeScreen.classList.remove("hidden");
      this.courseScreen.classList.add("hidden");
      this.setupScreen.classList.add("hidden");
      this.gameScreen.classList.add("hidden");
    }
  }

  resetState() {
    this.state = {
      isActive: false,
      course: null, // Will be populated on selection
      // Enhanced Player Data
      players: {
        p1: { name: "", hcp: 0 },
        p2: { name: "", hcp: 0 },
        p3: { name: "", hcp: 0 },
        p4: { name: "", hcp: 0 },
      },
      teams: {
        team1: { name: "Team 1", balance: 0 },
        team2: { name: "Team 2", balance: 0 },
      },
      settings: {
        baseBet: 1,
        enableHiLow: false, // New Side Game Toggle
      },
      gameMode: "roll", // 'roll' or 'umbrella'
      currentHole: 1,
      honor: "team1",
      holeState: {
        multiplier: 1,
        rolledBy: null,
        reRolled: false,
        pressCount: 0,
      },
      // Umbrella State
      umbrellaState: {
        greenie: "none", // 'team1', 'team2', 'none'
      },
      history: [],
      editingCourseId: null, // Track if editing
    };
  }

  loadState() {
    const saved = safeStorage.getItem("rollReRollState");
    if (saved) {
      this.state = safeJsonParse(saved) || this.resetState();
    } else {
      this.resetState();
    }
  }

  saveState() {
    safeStorage.setItem("rollReRollState", JSON.stringify(this.state));
  }

  cacheDOM() {
    // Screens
    this.homeScreen = document.getElementById("home-screen");
    this.courseScreen = document.getElementById("course-screen");
    this.setupScreen = document.getElementById("setup-screen");
    this.gameScreen = document.getElementById("game-screen");
    this.scoreboardModal = document.getElementById("scoreboard-modal");

    // Home Inputs
    this.homeStartBtn = document.getElementById("home-start-btn");

    // Course Inputs
    this.inputs = {
      state: document.getElementById("state-select"),
      course: document.getElementById("course-select"),
      // Manual
      manualName: document.getElementById("manual-course-name"),
      manualSlope: document.getElementById("manual-course-slope"),
      manualRating: document.getElementById("manual-course-rating"),
      // Player Defaults
      p1Slope: document.getElementById("p1-slope"),
      p1Rating: document.getElementById("p1-rating"),
      p2Slope: document.getElementById("p2-slope"),
      p2Rating: document.getElementById("p2-rating"),
      p3Slope: document.getElementById("p3-slope"),
      p3Rating: document.getElementById("p3-rating"),
      p4Slope: document.getElementById("p4-slope"),
      p4Rating: document.getElementById("p4-rating"),
      // Player Names & GHINs
      p1: document.getElementById("p1-name"),
      p1Ghin: document.getElementById("p1-ghin"),
      p2: document.getElementById("p2-name"),
      p2Ghin: document.getElementById("p2-ghin"),
      p3: document.getElementById("p3-name"),
      p3Ghin: document.getElementById("p3-ghin"),
      p4: document.getElementById("p4-name"),
      p4Ghin: document.getElementById("p4-ghin"),
      // Bet
      baseBet: document.getElementById("base-bet"),
    };

    // Favorites
    this.addFavoriteBtn = document.getElementById("add-favorite-btn");
    this.favoritesSection = document.getElementById("favorites-section");
    this.favoritesTableBody = document.getElementById("favorites-table-body");
    this.favorites = safeJsonParse(
      safeStorage.getItem("rollReRollFavorites"),
      [],
    );

    this.courseContinueBtn = document.getElementById("course-continue-btn");
    this.addCourseModal = document.getElementById("add-course-modal");
    this.closeAddCourseBtn = document.getElementById("close-add-course-btn");
    this.saveCourseBtn = document.getElementById("save-course-btn");

    // Add Course Inputs
    this.newCourseInputs = {
      state: document.getElementById("new-course-state"),
      name: document.getElementById("new-course-name"),
      teeRows: document.querySelectorAll(".tee-box-row"),
      holes: document.querySelectorAll(".hcp-input"),
      pars: document.querySelectorAll(".par-input"),
    };

    this.courseSelectMode = document.getElementById("course-select-mode");
    this.selectedCourseDisplay = document.getElementById(
      "selected-course-display",
    );
    this.gameModeInputs = document.querySelectorAll('input[name="game-mode"]');

    // Setup Screen
    this.setupScreen = document.getElementById("setup-screen");
    this.currentHoleDisplay = document.getElementById("current-hole");
    this.holeIndexDisplay = document.getElementById("hole-index");
    this.scoreHoleIndexDisplay = document.getElementById("score-hole-index");
    this.startBtn = document.getElementById("start-btn");
    this.currentStakeDisplay = document.getElementById("current-stake");
    this.multiplierBadges = document.getElementById("multiplier-badges");
    this.actionText = document.getElementById("action-text");
    this.rollBtn = document.getElementById("roll-btn");
    this.reRollBtn = document.getElementById("reroll-btn");
    this.pressBtn = document.getElementById("press-btn");

    // Press Modal
    this.pressModal = document.getElementById("press-modal");
    this.closePressBtn = document.getElementById("close-press-btn");
    this.cancelPressBtn = document.getElementById("cancel-press-btn");
    this.confirmPressBtn = document.getElementById("confirm-press-btn");
    this.pressAmountInput = document.getElementById("press-amount-input");

    // Umbrella UI
    this.umbrellaDashboard = document.getElementById("umbrella-dashboard");
    this.umbrellaPointsDisplay = document.getElementById(
      "umbrella-points-display",
    );
    this.umbrellaValueDisplay = document.getElementById(
      "umbrella-value-display",
    );

    this.greenieBtns = document.querySelectorAll(".greenie-btn");
    this.rollControls = document.querySelector(".roll-controls");

    // Hi Low UI
    this.hilowDashboard = document.getElementById("hilow-dashboard");

    // Players UI
    this.p1Display = document.getElementById("p1-display");
    this.p2Display = document.getElementById("p2-display");
    this.p3Display = document.getElementById("p3-display");
    this.p4Display = document.getElementById("p4-display");

    this.p1Pops = document.getElementById("p1-pops");
    this.p2Pops = document.getElementById("p2-pops");
    this.p3Pops = document.getElementById("p3-pops");
    this.p4Pops = document.getElementById("p4-pops");

    this.p1ScoreInput = document.getElementById("p1-score");
    this.p2ScoreInput = document.getElementById("p2-score");
    this.p3ScoreInput = document.getElementById("p3-score");
    this.p4ScoreInput = document.getElementById("p4-score");

    this.finishHoleBtn = document.getElementById("finish-hole-btn");
    this.scoreboardToggle = document.getElementById("scoreboard-toggle");
    this.closeScoreboard = document.getElementById("close-scoreboard");

    // Scoreboard
    this.t1Summary = document.getElementById("t1-summary");
    this.t2Summary = document.getElementById("t2-summary");
    this.holeHistory = document.getElementById("hole-history");

    // Menu
    this.menuBtn = document.getElementById("menu-btn");
    this.menuModal = document.getElementById("menu-modal");
    this.menuOptions = document.getElementById("menu-options");
    this.menuConfirm = document.getElementById("menu-confirm");

    this.resumeBtn = document.getElementById("resume-btn");
    this.undoBtn = document.getElementById("undo-btn");
    this.endMatchBtn = document.getElementById("end-match-btn");

    this.confirmYesBtn = document.getElementById("confirm-yes-btn");
    this.confirmCancelBtn = document.getElementById("confirm-cancel-btn");
    this.setupBackBtn = document.getElementById("setup-back-btn");
    this.changeCourseBtn = document.getElementById("change-course-btn");
    this.openAddCourseBtn = document.getElementById("open-add-course-btn");
    this.editCourseBtn = document.getElementById("edit-course-btn");
  }

  bindEvents() {
    // Home Screen
    if (this.homeStartBtn) {
      this.homeStartBtn.addEventListener("click", () => {
        this.homeScreen.classList.add("hidden");
        this.courseScreen.classList.remove("hidden");
      });
    }

    // Initialize Toggles
    this.toggleHoleOptions();

    // Open Add Custom Course Modal
    // Open Add Custom Course Modal
    if (this.openAddCourseBtn) {
      this.openAddCourseBtn.addEventListener("click", () => {
        this.editingCourseId = null; // Reset editing state
        // Reset inputs
        this.newCourseInputs.name.value = "";
        this.newCourseInputs.holes.forEach((i) => (i.value = ""));
        this.newCourseInputs.pars.forEach((i) => (i.value = ""));

        this.addCourseModal.classList.remove("hidden");
      });
    }

    if (this.editCourseBtn) {
      this.editCourseBtn.addEventListener("click", () =>
        this.openEditCourseModal(),
      );
    }

    // Check visibility on course change
    if (this.inputs.course) {
      this.inputs.course.addEventListener("change", () =>
        this.updateEditButtonVisibility(),
      );
    }

    // Add Course Modal (Hidden Feature)
    if (this.inputs.state) {
      this.inputs.state.addEventListener("change", () =>
        this.populateCourses(),
      );
    }

    if (this.addFavoriteBtn) {
      this.addFavoriteBtn.addEventListener("click", () => this.addFavorite());
    }

    // Add Course Modal (Hidden Feature)
    if (this.closeAddCourseBtn) {
      this.closeAddCourseBtn.addEventListener("click", () => {
        this.addCourseModal.classList.add("hidden");
      });
    }

    if (this.saveCourseBtn) {
      this.saveCourseBtn.addEventListener("click", () =>
        this.saveCustomCourse(),
      );
    }

    // Back Button (Setup -> Course)
    if (this.setupBackBtn) {
      this.setupBackBtn.addEventListener("click", () => {
        this.setupScreen.classList.add("hidden");
        this.courseScreen.classList.remove("hidden");
      });
    }

    if (this.changeCourseBtn) {
      this.changeCourseBtn.addEventListener("click", () => {
        this.setupScreen.classList.add("hidden");
        this.courseScreen.classList.remove("hidden");
      });
    }

    // Continue to Setup (Course Selected)
    if (this.courseContinueBtn) {
      this.courseContinueBtn.addEventListener("click", () => {
        let finalCourse = this.getSelectedCourseData();
        if (!finalCourse) {
          alert("Please select a course.");
          return;
        }

        this.state.course = finalCourse;
        this.selectedCourseDisplay.textContent = finalCourse.name;

        // Pre-fill Defaults
        const defSlope = finalCourse.slope;
        const defRating = finalCourse.rating;
        this.inputs.p1Slope.value = defSlope;
        this.inputs.p1Rating.value = defRating;
        this.inputs.p2Slope.value = defSlope;
        this.inputs.p2Rating.value = defRating;
        this.inputs.p3Slope.value = defSlope;
        this.inputs.p3Rating.value = defRating;
        this.inputs.p4Slope.value = defSlope;
        this.inputs.p4Rating.value = defRating;

        this.courseScreen.classList.add("hidden");
        this.setupScreen.classList.remove("hidden");

        // Load Tees
        this.loadCourse(finalCourse);
      });
    }

    // START MATCH (TEE OFF)
    if (this.startBtn) {
      this.startBtn.addEventListener("click", () => {
        try {
          this.startGame();
        } catch (e) {
          alert("Start Error: " + e.message);
          console.error(e);
        }
      });
    } else {
      console.error("CRITICAL: Start Button not found in DOM");
    }

    // Game Actions
    if (this.finishHoleBtn)
      this.finishHoleBtn.addEventListener("click", () => this.finishHole());
    if (this.continueBtn)
      this.continueBtn.addEventListener("click", () => this.continueGame());
    if (this.rollBtn)
      this.rollBtn.addEventListener("click", () => this.handleRoll());
    if (this.reRollBtn)
      this.reRollBtn.addEventListener("click", () => this.handleReRoll());
    if (this.pressBtn)
      this.pressBtn.addEventListener("click", () => this.handlePress());

    // Allow editing Base Bet by clicking Pot
    if (this.currentStakeDisplay) {
      const potCard = this.currentStakeDisplay.closest(".bet-status-card");
      if (potCard) {
        potCard.style.cursor = "pointer";
        potCard.title = "Click to Change Base Bet";
        potCard.addEventListener("click", () => {
          if (
            this.state.holeState.rolledBy ||
            (this.state.holeState.presses &&
              this.state.holeState.presses.length > 0)
          ) {
            alert("Cannot change base bet after action has started.");
            return;
          }
          const newBase = prompt(
            "Set New Base Bet ($):",
            this.state.settings.baseBet,
          );
          if (newBase && !isNaN(newBase)) {
            this.state.settings.baseBet = parseInt(newBase);
            this.updateUI();
            this.saveState();
          }
        });
      }
    }

    if (this.scoreboardToggle)
      this.scoreboardToggle.addEventListener("click", () =>
        this.toggleScoreboard(true),
      );
    if (this.closeScoreboard)
      this.closeScoreboard.addEventListener("click", () =>
        this.toggleScoreboard(false),
      );

    // Press Modal
    const closePress = () =>
      this.pressModal && this.pressModal.classList.add("hidden");
    if (this.closePressBtn)
      this.closePressBtn.addEventListener("click", closePress);
    if (this.cancelPressBtn)
      this.cancelPressBtn.addEventListener("click", closePress);
    if (this.confirmPressBtn)
      this.confirmPressBtn.addEventListener("click", () => this.submitPress());

    // Menu & Navigation
    if (this.menuBtn)
      this.menuBtn.addEventListener("click", () => this.toggleMenu(true));
    if (this.resumeBtn)
      this.resumeBtn.addEventListener("click", () => this.toggleMenu(false));

    if (this.undoBtn) {
      this.undoBtn.addEventListener("click", () => {
        this.undoLastHole();
        this.toggleMenu(false);
      });
    }

    // End Match Flow
    if (this.endMatchBtn) {
      this.endMatchBtn.addEventListener("click", () => {
        this.menuOptions.classList.add("hidden");
        this.menuConfirm.classList.remove("hidden");
      });
    }

    if (this.confirmCancelBtn) {
      this.confirmCancelBtn.addEventListener("click", () => {
        this.menuConfirm.classList.add("hidden");
        this.menuOptions.classList.remove("hidden");
      });
    }

    if (this.confirmYesBtn) {
      this.confirmYesBtn.addEventListener("click", () => {
        this.endMatch();
        this.toggleMenu(false);
      });
    }

    // Umbrella Greenie Toggles
    this.greenieBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.state.umbrellaState.greenie = e.target.dataset.team;
        this.updateUI();
      });
    });

    // Game Mode Toggles
    document.querySelectorAll('input[name="game-mode"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        document
          .querySelectorAll(".radio-card")
          .forEach((c) => c.classList.remove("selected"));
        e.target.closest(".radio-card").classList.add("selected");
      });
    });
  }

  toggleMenu(show) {
    if (show) {
      // Always reset to options view when opening
      this.menuOptions.classList.remove("hidden");
      this.menuConfirm.classList.add("hidden");
      this.menuModal.classList.remove("hidden");
    } else {
      this.menuModal.classList.add("hidden");
    }
  }

  endMatch() {
    this.resetState(); // Reset object to initial
    this.saveState(); // Save it as "inactive"
    location.reload();
  }

  undoLastHole() {
    if (this.state.history.length === 0) {
      alert("No holes to undo!");
      return;
    }

    const lastHole = this.state.history.pop();

    // Revert Balances
    if (lastHole.winner === "team1") {
      this.state.teams.team1.balance -= lastHole.amount;
      this.state.teams.team2.balance += lastHole.amount;
    } else if (lastHole.winner === "team2") {
      this.state.teams.team2.balance -= lastHole.amount;
      this.state.teams.team1.balance += lastHole.amount;
    }

    // Revert State
    this.state.currentHole--;
    this.state.honor = lastHole.previousHonor;
    this.state.holeState = lastHole.finalHoleState; // Restore the multiplier/roll status

    this.saveState();
    this.updateUI();
    this.updateScoreboardDOM();
    alert(`Undid Hole ${lastHole.hole}. Score reverted.`);
  }

  populateStates() {
    const optionsHtml = US_STATES.map(
      (s) =>
        `<option value="${s}" ${s === "CA" ? "selected" : ""}>${s}</option>`,
    ).join("");

    this.inputs.state.innerHTML = optionsHtml;

    if (this.newCourseInputs && this.newCourseInputs.state) {
      this.newCourseInputs.state.innerHTML = optionsHtml;
      // Maybe select AL by default or just let CA be default as per above logic
      // If user selects AL, we should probably default to AL?
      // "CA" is selected above.
      // I'll leave it as is.
    }
  }

  populateCourses() {
    if (!this.inputs || !this.inputs.state) return;

    // Safety check for data
    if (typeof COURSES_BY_STATE === "undefined") {
      console.error(
        "COURSES_BY_STATE is undefined. Check courses.js for syntax errors.",
      );
      this.inputs.course.innerHTML =
        '<option value="">Error loading courses</option>';
      return;
    }

    const selectedState = this.inputs.state.value;
    // Merge built-in courses with custom courses for that state
    let courses = COURSES_BY_STATE[selectedState] || [];

    try {
      const savedCustom = safeStorage.getItem("customCourses");
      if (savedCustom) {
        const customAll = safeJsonParse(savedCustom, []);
        const customState = customAll.filter((c) => c.state === selectedState);
        courses = [...courses, ...customState];
      }
    } catch (e) {
      console.error("Error loading custom courses", e);
    }

    // Sort alphabetically
    courses.sort((a, b) => a.name.localeCompare(b.name));

    if (courses.length === 0) {
      this.inputs.course.innerHTML =
        '<option value="">No courses found</option>';
    } else {
      this.inputs.course.innerHTML = courses
        .map((c) => `<option value="${c.id}">${c.name}</option>`)
        .join("");
    }

    this.updateEditButtonVisibility();

    // Also render favorites list initially if not done
    this.renderFavorites();
  }

  loadCourse(course) {
    if (!course) return;
    this.selectedCourseDisplay.textContent = course.name;

    // Populate Tees
    const teeSelect = document.getElementById("courseTee");
    if (teeSelect) {
      teeSelect.innerHTML = '<option value="default">Default / Middle</option>';
      if (course.tees) {
        course.tees.forEach((tee, index) => {
          const opt = document.createElement("option");
          opt.value = index;
          opt.textContent = `${tee.name} (${tee.gender}) - R:${tee.rating} / S:${tee.slope}`;
          teeSelect.appendChild(opt);
        });
      }
    }
  }

  toggleHoleOptions() {
    // Update active class on labels
    document.querySelectorAll('input[type="radio"]').forEach((inp) => {
      const parent = inp.parentElement;
      if (parent.classList.contains("toggle-btn")) {
        if (inp.checked) parent.classList.add("active");
        else parent.classList.remove("active");
      }
    });

    // Ensure manual listeners are attached (idempotent or attached once)
    ["holeCount", "startHole"].forEach((name) => {
      document.querySelectorAll(`input[name="${name}"]`).forEach((inp) => {
        // Avoid duplicate listeners if possible, but simple overwrite is okay for this scope
        inp.parentElement.onclick = () => {
          document
            .querySelectorAll(`input[name="${name}"]`)
            .forEach((i) => i.parentElement.classList.remove("active"));
          inp.parentElement.classList.add("active");
          inp.checked = true;
          // Trigger change event if needed?
          // The click on parent doesn't auto-trigger input change if we manually handle it?
          // Actually, label click triggers input change naturally.
          // But we are using div logic? No, <label>.
          // If we prevent default or something. But here we just update classes.
        };
      });
    });
  }

  // --- Favorites Logic ---

  addFavorite() {
    const courseId = this.inputs.course.value;
    if (!courseId) return;

    if (!this.favorites.includes(courseId)) {
      this.favorites.push(courseId);
      safeStorage.setItem(
        "rollReRollFavorites",
        JSON.stringify(this.favorites),
      );
      this.renderFavorites();
    }
  }

  removeFavorite(courseId) {
    const index = this.favorites.indexOf(courseId);
    if (index > -1) {
      this.favorites.splice(index, 1);
      safeStorage.setItem(
        "rollReRollFavorites",
        JSON.stringify(this.favorites),
      );
      this.renderFavorites();
    }
  }

  renderFavorites() {
    this.favoritesTableBody.innerHTML = "";

    if (this.favorites.length === 0) {
      this.favoritesSection.classList.add("hidden");
      return;
    }

    this.favoritesSection.classList.remove("hidden");

    this.favorites.forEach((favId) => {
      // Find course info
      let course = null;
      // Search all states
      for (const state in COURSES_BY_STATE) {
        const found = COURSES_BY_STATE[state].find((c) => c.id === favId);
        if (found) {
          course = found;
          course.state = state;
          break;
        }
      }

      // Check custom
      if (!course) {
        const customs = safeJsonParse(safeStorage.getItem("customCourses"), []);
        course = customs.find((c) => c.id === favId);
        if (course) course.state = "Custom";
      }

      if (course) {
        const row = document.createElement("tr");
        row.style.borderBottom = "1px solid rgba(255,255,255,0.05)";

        row.innerHTML = `
                    <td style="padding: 12px 15px;">
                        <div style="font-weight: 500;">${course.name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-dim);">${course.state}</div>
                    </td>
                    <td style="padding: 12px 15px; text-align: center;">
                        <span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 6px; font-size: 0.8rem;">
                            ${course.rating} / ${course.slope}
                        </span>
                    </td>
                    <td style="padding: 12px 15px; text-align: right;">
                        <div style="display: flex; gap: 8px; justify-content: flex-end;">
                           <button class="play-fav-btn primary-btn" style="padding: 6px 12px; font-size: 0.75rem; min-width: auto;">Play</button>
                           <button class="remove-fav-btn" style="background: none; border: none; color: #ff5555; cursor: pointer; padding: 4px;">✕</button>
                        </div>
                    </td>
                `;

        // Bind events
        const playBtn = row.querySelector(".play-fav-btn");
        playBtn.addEventListener("click", () => {
          this.inputs.state.value = course.state;
          this.populateCourses();
          this.inputs.course.value = course.id;
          // Trigger continue directly? Or just select. User probably wants to select.
          // Optional: scroll top
          window.scrollTo({ top: 0, behavior: "smooth" });
        });

        const removeBtn = row.querySelector(".remove-fav-btn");
        removeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.removeFavorite(course.id);
        });

        this.favoritesTableBody.appendChild(row);
      }
    });
  }

  saveCustomCourse() {
    const state = this.newCourseInputs.state
      ? this.newCourseInputs.state.value
      : "Custom";
    const name = this.newCourseInputs.name.value.trim();

    // Tee Boxes
    const tees = [];
    // User removed UI inputs, so auto-generate "Standard" tee
    tees.push({
      name: "Standard",
      yards: "",
      slope: 113,
      rating: 72.0,
    });

    if (!name) {
      alert("Please enter a Course Name.");
      return;
    }

    // Tee validation check removed

    const slope = tees[0].slope;
    const rating = tees[0].rating;

    // Duplicate Check
    const normName = name.toLowerCase();

    // Check built-in
    if (COURSES_BY_STATE[state]) {
      const exists = COURSES_BY_STATE[state].find(
        (c) => c.name.toLowerCase() === normName,
      );
      if (exists) {
        alert(`Course "${name}" already exists in ${state}.`);
        return;
      }
    }

    // Check custom
    const saved = safeStorage.getItem("customCourses");
    const customCourses = safeJsonParse(saved, []);
    const existsCustom = customCourses.find(
      (c) => c.state === state && c.name.toLowerCase() === normName,
    );
    if (existsCustom) {
      alert(`Custom Course "${name}" already exists in ${state}.`);
      return;
    }

    const indexes = [];
    let missingHoles = false;
    this.newCourseInputs.holes.forEach((input) => {
      const val = parseInt(input.value);
      if (isNaN(val)) missingHoles = true;
      indexes.push(val);
    });

    const pars = [];
    let missingPars = false;
    if (this.newCourseInputs.pars) {
      this.newCourseInputs.pars.forEach((input) => {
        const val = parseInt(input.value);
        if (isNaN(val)) missingPars = true;
        pars.push(val);
      });
    }

    if (missingHoles) {
      alert("Please enter Handicap Indexes for all 18 holes.");
      return;
    }

    if (missingPars) {
      alert("Please enter Pars for all 18 holes.");
      return;
    }

    // Check for duplicates in indexes (Normally 1-18 unique).
    const unique = new Set(indexes);
    if (unique.size !== 18) {
      alert("Handicap Indexes must be unique numbers from 1 to 18.");
      return;
    }

    // Prepare Course Object
    const courseObj = {
      name: name,
      slope: slope,
      rating: rating,
      tees: tees,
      indexes: indexes,
      pars: pars,
      state: state,
    };

    // Load existing custom courses (Already loaded above)
    // const saved = safeStorage.getItem('customCourses');
    // let customCourses = safeJsonParse(saved, []);

    if (this.editingCourseId) {
      // Update Existing
      const idx = customCourses.findIndex((c) => c.id === this.editingCourseId);
      if (idx !== -1) {
        customCourses[idx] = { ...customCourses[idx], ...courseObj }; // Preserve ID
      } else {
        // Fallback if ID not found? Treat as new
        courseObj.id = "custom_" + Date.now();
        customCourses.push(courseObj);
      }
    } else {
      // Create New
      // Duplicate Check (Name in State)
      const normName = name.toLowerCase();
      if (COURSES_BY_STATE[state]) {
        const exists = COURSES_BY_STATE[state].find(
          (c) => c.name.toLowerCase() === normName,
        );
        if (exists) {
          alert(`Course "${name}" already exists in ${state}.`);
          return;
        }
      }
      const existsCustom = customCourses.find(
        (c) => c.state === state && c.name.toLowerCase() === normName,
      );
      if (existsCustom) {
        alert(`Custom Course "${name}" already exists in ${state}.`);
        return;
      }

      courseObj.id = "custom_" + Date.now();
      customCourses.push(courseObj);
    }

    // Save to LocalStorage
    safeStorage.setItem("customCourses", JSON.stringify(customCourses));

    // Close Modal & Reset
    this.addCourseModal.classList.add("hidden");
    this.newCourseInputs.name.value = "";
    this.newCourseInputs.teeRows.forEach((row) => {
      row.querySelector(".tee-name").value = "";
      row.querySelector(".tee-yards").value = "";
    });
    this.newCourseInputs.holes.forEach((i) => (i.value = ""));
    this.populateCourses(); // Refresh list to show changes
    this.editingCourseId = null; // Clear editing state
  }

  updateEditButtonVisibility() {
    if (!this.editCourseBtn || !this.inputs.course) return;
    const cId = this.inputs.course.value;
    if (cId && cId.startsWith("custom_")) {
      this.editCourseBtn.classList.remove("hidden");
    } else {
      this.editCourseBtn.classList.add("hidden");
    }
  }

  openEditCourseModal() {
    const cId = this.inputs.course.value;
    if (!cId || !cId.startsWith("custom_")) return;

    // Find course data
    const saved = safeStorage.getItem("customCourses");
    const customCourses = safeJsonParse(saved, []);
    const course = customCourses.find((c) => c.id === cId);
    if (!course) return;

    this.editingCourseId = cId;

    // Populate Inputs
    this.newCourseInputs.state.value = course.state || "Custom"; // Should be in dropdown if populated
    this.newCourseInputs.name.value = course.name;

    // Populate Pars
    const coursePars = course.par || course.pars;
    if (coursePars) {
      this.newCourseInputs.pars.forEach((input, i) => {
        if (coursePars[i] !== undefined) input.value = coursePars[i];
      });
    }

    // Populate Indexes
    if (course.indexes) {
      this.newCourseInputs.holes.forEach((input, i) => {
        if (course.indexes[i] !== undefined) input.value = course.indexes[i];
      });
    }

    this.addCourseModal.classList.remove("hidden");
  }

  handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      let newCourses = [];

      try {
        if (file.name.endsWith(".json")) {
          const jsonContent = JSON.parse(content);
          // Handle wrapped format { code, data: [...], ... } OR { courses: [...] }
          if (jsonContent.courses && Array.isArray(jsonContent.courses)) {
            newCourses = jsonContent.courses;
          } else if (Array.isArray(jsonContent)) {
            newCourses = jsonContent;
          } else {
            // Try to find any array property? Or just assume single object?
            newCourses = [jsonContent];
          }
        } else if (file.name.endsWith(".csv")) {
          newCourses = this.parseCSV(content);
        } else {
          alert("Unsupported file format. Please use .json or .csv");
          return;
        }

        if (!Array.isArray(newCourses)) newCourses = [newCourses];

        // Basic Validation & Transformation
        const validCourses = newCourses.map((c) => {
          // Try to map varied keys
          let name =
            c.name ||
            c.Name ||
            c.course_name ||
            c.CourseName ||
            "Unknown Course";
          if (c.city && !name.includes(c.city)) {
            name = `${name} (${c.city})`;
          }

          const slope = parseInt(c.slope || c.Slope || c.slope_rating || 113);
          const rating = parseFloat(
            c.rating || c.Rating || c.course_rating || 72.0,
          );

          // Indexes: try 'indexes', or 'Handicap 1'...'Handicap 18' logic?
          // For now, assume array or generic default
          let indexes = c.indexes || c.Indexes;
          if (!indexes || !Array.isArray(indexes) || indexes.length !== 18) {
            indexes = [
              1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
            ];
          }

          return {
            id:
              "import_" +
              Date.now() +
              "_" +
              Math.random().toString(36).substr(2, 5),
            name,
            slope,
            rating,
            indexes,
          };
        });

        if (validCourses.length === 0) {
          alert("No valid courses found in file.");
          return;
        }

        // Merge with existing
        const saved = safeStorage.getItem("customCourses");
        const existing = safeJsonParse(saved, []);
        const merged = [...existing, ...validCourses];

        safeStorage.setItem("customCourses", JSON.stringify(merged));

        alert(`Successfully imported ${validCourses.length} courses!`);

        // Refresh
        this.inputs.state.value = "Custom";
        this.populateCourses();
      } catch (err) {
        console.error(err);
        alert("Failed to parse file: " + err.message);
      }

      // Reset input
      this.importFileInput.value = "";
    };
    reader.readAsText(file);
  }

  parseCSV(csvText) {
    const lines = csvText.split("\n").filter((l) => l.trim());
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

    return lines.slice(1).map((line) => {
      const values = line.split(","); // Simple split, doesn't handle quoted commas well suited for complex CSV
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = values[i] ? values[i].trim() : "";
      });
      return obj;
    });
  }

  getSelectedCourseData() {
    try {
      const s = this.inputs.state.value;
      const cId = this.inputs.course.value;

      if (!s || !cId) return null;

      let course = null;
      if (COURSES_BY_STATE[s]) {
        course = COURSES_BY_STATE[s].find((c) => c.id === cId);
      }

      if (!course) {
        const saved = safeStorage.getItem("customCourses");
        const customCourses = safeJsonParse(saved, []);
        course = customCourses.find((c) => c.id === cId);
      }

      return course;
    } catch (e) {
      alert("Error fetching course data: " + e.message);
      console.error(e);
      return null;
    }
  }

  startGame() {
    if (!this.inputs || !this.inputs.p1) {
      alert("Critical Error: Inputs not initialized. Please reload.");
      return;
    }

    // Preserve selected course before reset
    const selectedCourse = this.state.course;

    this.resetState();

    // Restore course
    if (selectedCourse) {
      this.state.course = selectedCourse;
    }

    const getVal = (input, def) => input.value || def;
    const getIndex = (input) => this.fetchHandicapIndex(input.value);

    // Get Course Data
    let courseData = this.state.course || { slope: 113, rating: 72 };
    const teeSelect = document.getElementById("courseTee");
    const teeIndex = teeSelect ? teeSelect.value : "default";
    let selectedTee = null;
    if (teeIndex !== "default" && courseData.tees) {
      selectedTee = courseData.tees[parseInt(teeIndex)];
      courseData.slope = selectedTee.slope;
      courseData.rating = selectedTee.rating;
      courseData.gender = selectedTee.gender;
    }
    if (!courseData.slope) courseData.slope = 113;
    if (!courseData.rating) courseData.rating = 72;

    // Calculate Course Handicap: (Index * Slope) / 113
    const calcCH = (index) => Math.round(index * (courseData.slope / 113));

    // Store detailed player info (Calculate CH from Index)
    const p1Index = getIndex(this.inputs.p1Ghin);
    const p2Index = getIndex(this.inputs.p2Ghin);
    const p3Index = getIndex(this.inputs.p3Ghin);
    const p4Index = getIndex(this.inputs.p4Ghin);

    // Initialize Players with Specific Tee Data
    const p1Slp = parseInt(getVal(this.inputs.p1Slope, courseData.slope));
    const p1Rtg = parseFloat(getVal(this.inputs.p1Rating, courseData.rating));

    const p2Slp = parseInt(getVal(this.inputs.p2Slope, courseData.slope));
    const p2Rtg = parseFloat(getVal(this.inputs.p2Rating, courseData.rating));

    const p3Slp = parseInt(getVal(this.inputs.p3Slope, courseData.slope));
    const p3Rtg = parseFloat(getVal(this.inputs.p3Rating, courseData.rating));

    const p4Slp = parseInt(getVal(this.inputs.p4Slope, courseData.slope));
    const p4Rtg = parseFloat(getVal(this.inputs.p4Rating, courseData.rating));

    this.state.players = {
      p1: {
        name: getVal(this.inputs.p1, "Player 1"),
        index: getIndex(this.inputs.p1Ghin),
        ch: 0,
        slope: p1Slp,
      },
      p2: {
        name: getVal(this.inputs.p2, "Player 2"),
        index: getIndex(this.inputs.p2Ghin),
        ch: 0,
        slope: p2Slp,
      },
      p3: {
        name: getVal(this.inputs.p3, "Player 3"),
        index: getIndex(this.inputs.p3Ghin),
        ch: 0,
        slope: p3Slp,
      },
      p4: {
        name: getVal(this.inputs.p4, "Player 4"),
        index: getIndex(this.inputs.p4Ghin),
        ch: 0,
        slope: p4Slp,
      },
    };

    // Calculate CH: (Index * Slope) / 113
    // Note: Rating isn't strictly used for Course Handicap in the basic formula (Index * Slope / 113) + (Rating - Par),
    // but typically CH = Index * Slope / 113. If using WHS, it's (Index * Slope / 113) + (Rating - Par).
    // For simplicity and common US usage in matches, we often stick to I*S/113, but correct WHS includes (Rating-Par).
    // Since we don't have Par in our data easily yet (we have 18 holes of Par 72 usually?), let's stick to I*S/113 for now as base.
    // Actually, user wants Tee options. The biggest factor is Slope.

    for (let pid in this.state.players) {
      const p = this.state.players[pid];
      p.ch = Math.round(p.index * (p.slope / 113));
    }

    this.state.teams.team1.name = `${this.state.players.p1.name} & ${this.state.players.p2.name}`;
    this.state.teams.team2.name = `${this.state.players.p3.name} & ${this.state.players.p4.name}`;

    this.state.settings.baseBet = parseInt(this.inputs.baseBet.value) || 1;

    // Get Game Mode
    const selectedMode = document.querySelector(
      'input[name="game-mode"]:checked',
    ).value;
    this.state.gameMode = selectedMode;

    // Force enable Hi-Low for Roll Re-Roll
    if (this.state.gameMode === "roll") {
      this.state.settings.enableHiLow = true;
    } else {
      this.state.settings.enableHiLow = false;
    }

    this.state.isActive = true;

    this.setupScreen.classList.add("hidden");
    this.gameScreen.classList.remove("hidden");

    this.initHole();
    this.saveState();
  }

  fetchHandicapIndex(inputVal) {
    if (!inputVal) return 0;
    // Handle "Plus" handicaps (e.g. "+2") -> -2
    if (inputVal.trim().startsWith("+")) {
      return -1 * parseFloat(inputVal);
    }
    const val = parseFloat(inputVal);
    return isNaN(val) ? 0 : val;
  }

  initHole() {
    this.state.holeState = {
      multiplier: 1,
      rolledBy: null,
      reRolled: false,
      presses: [],
    };
    this.state.umbrellaState = { greenie: "none" }; // Reset per hole
    this.p1ScoreInput.value = "";
    this.p2ScoreInput.value = "";
    this.p3ScoreInput.value = "";
    this.p4ScoreInput.value = "";
    this.updateUI();
  }

  getPops(hcp, holeIndex) {
    if (!this.state.course) return 0;

    // Determine which index array to use
    let indexArray = this.state.course.indexes;
    if (this.state.course.gender === 'F' && this.state.course.womensIndexes) {
      indexArray = this.state.course.womensIndexes;
    }

    if (!indexArray || indexArray.length < 18) return 0;

    const holeSI = indexArray[holeIndex - 1]; // holeIndex is 1-based
    let pops = Math.floor(hcp / 18);
    const remainder = hcp % 18;

    if (holeSI <= remainder) {
      pops += 1;
    }
    return pops;
  }

  getPlayingHandicaps() {
    // Use 'ch' (Course Handicap) which is calculated in startGame
    const h1 = this.state.players.p1.ch || 0;
    const h2 = this.state.players.p2.ch || 0;
    const h3 = this.state.players.p3.ch || 0;
    const h4 = this.state.players.p4.ch || 0;

    const minHcp = Math.min(h1, h2, h3, h4);

    return {
      p1: h1 - minHcp,
      p2: h2 - minHcp,
      p3: h3 - minHcp,
      p4: h4 - minHcp,
    };
  }

  updateUI() {
    // Update Names & Pops
    const indexes = this.state.course
      ? this.state.course.indexes
      : STROKE_INDEXES;
    const currentHoleIndex = indexes[(this.state.currentHole - 1) % 18];

    if (this.holeIndexDisplay)
      this.holeIndexDisplay.textContent = currentHoleIndex;
    if (this.scoreHoleIndexDisplay)
      this.scoreHoleIndexDisplay.textContent = currentHoleIndex;

    const playingHcps = this.getPlayingHandicaps();

    const updatePlayerUI = (pid, displayEl, popsEl) => {
      // Show Name AND Match Handicap (based off lowest)
      const matchHcp = playingHcps[pid];
      displayEl.textContent = `${this.state.players[pid].name} (${matchHcp})`;

      const pops = this.getPops(matchHcp, currentHoleIndex);

      // Create dots
      let dotsHtml = "";
      for (let i = 0; i < pops; i++)
        dotsHtml += '<span class="pop-dot"></span>';
      popsEl.innerHTML = dotsHtml;
    };

    updatePlayerUI("p1", this.p1Display, this.p1Pops);
    updatePlayerUI("p2", this.p2Display, this.p2Pops);
    updatePlayerUI("p3", this.p3Display, this.p3Pops);
    updatePlayerUI("p4", this.p4Display, this.p4Pops);

    // Update Hole & Stake
    this.currentHoleDisplay.textContent = this.state.currentHole;

    if (this.state.gameMode === "roll") {
      this.rollControls.classList.remove("hidden");
      this.umbrellaDashboard.classList.add("hidden");

      const pressTotal = (this.state.holeState.presses || []).reduce(
        (a, b) => a + b,
        0,
      );
      const currentBet =
        (this.state.settings.baseBet + pressTotal) *
        this.state.holeState.multiplier;
      this.currentStakeDisplay.textContent = currentBet;

      // Badges
      this.multiplierBadges.innerHTML = "";
      if (this.state.holeState.rolledBy) {
        this.multiplierBadges.innerHTML += '<span class="badge">ROLLED</span>';
      }
      if (this.state.holeState.reRolled) {
        this.multiplierBadges.innerHTML +=
          '<span class="badge reroll">RE-ROLLED</span>';
      }
      if (pressTotal > 0) {
        this.multiplierBadges.innerHTML += `<span class="badge" style="border-color: var(--accent-gold); color: var(--accent-gold);">PRESSED +$${pressTotal}</span>`;
      }

      // Buttons
      const teamWithHonor = this.state.honor;
      const teamWithoutHonor = teamWithHonor === "team1" ? "team2" : "team1";
      const honorName = this.state.teams[teamWithHonor].name;
      const otherName = this.state.teams[teamWithoutHonor].name;

      // Press Logic: Only before rolling, and only once per hole.
      const hasPressed = (this.state.holeState.presses || []).length > 0;
      if (!this.state.holeState.rolledBy && !hasPressed) {
        this.pressBtn.classList.remove("hidden");
      } else {
        this.pressBtn.classList.add("hidden");
      }

      if (!this.state.holeState.rolledBy) {
        this.rollBtn.classList.remove("hidden");
        this.reRollBtn.classList.add("hidden");
        this.actionText.textContent = `${otherName} can ROLL`;
      } else if (!this.state.holeState.reRolled) {
        const roller = this.state.holeState.rolledBy;
        const reRoller = roller === "team1" ? "team2" : "team1";
        const reRollerName = this.state.teams[reRoller].name;

        this.rollBtn.classList.add("hidden");
        this.reRollBtn.classList.remove("hidden");
        this.actionText.textContent = `${reRollerName} can RE-ROLL`;
      } else {
        this.rollBtn.classList.add("hidden");
        this.reRollBtn.classList.add("hidden");
        this.actionText.textContent = "Pot is maxed out!";
      }
    } else if (this.state.gameMode === "umbrella") {
      // Umbrella Mode
      this.rollControls.classList.add("hidden");
      this.hilowDashboard.classList.add("hidden");
      this.umbrellaDashboard.classList.remove("hidden");

      // Hide normal roll button/badges logic from action area
      this.rollBtn.classList.add("hidden");
      this.reRollBtn.classList.add("hidden");
      this.pressBtn.classList.add("hidden");
      this.multiplierBadges.innerHTML = "";
      this.actionText.textContent = ""; // Clear roll prompt

      // Update Umbrella specific UI
      const pointsPerCat = this.state.currentHole; // 1 to 18
      const valuePerCat = pointsPerCat * this.state.settings.baseBet;

      this.umbrellaPointsDisplay.textContent = pointsPerCat;
      this.umbrellaValueDisplay.textContent = "$" + valuePerCat;
      this.currentStakeDisplay.textContent = valuePerCat + "/pt";

      // Greenie Buttons - CSS handles styling via .selected class
      this.greenieBtns.forEach((btn) => {
        const team = btn.dataset.team;
        btn.classList.toggle(
          "selected",
          team === this.state.umbrellaState.greenie,
        );
      });
    }
  }

  handleRoll() {
    if (this.state.gameMode !== "roll") return;
    const teamWithHonor = this.state.honor;
    const rollingTeam = teamWithHonor === "team1" ? "team2" : "team1";
    this.state.holeState.multiplier = 2;
    this.state.holeState.rolledBy = rollingTeam;
    this.updateUI();
    this.saveState();
  }

  handleReRoll() {
    this.state.holeState.multiplier = 4;
    this.state.holeState.reRolled = true;
    this.updateUI();
    this.saveState();
  }

  handlePress() {
    try {
      if (this.state.holeState.rolledBy) return;

      const amount = parseInt(this.state.settings.baseBet) || 1;

      // Immediate Action (No Confirm Dialog)
      if (!this.state.holeState.presses) this.state.holeState.presses = [];
      this.state.holeState.presses.push(amount);

      if (this.pressModal) this.pressModal.classList.add("hidden");

      this.updateUI();
      this.saveState();

      // Optional: Small toast notification?
      // For now, the UI update (Pot change + Badge) triggers immediately.
    } catch (e) {
      alert("Error in Press: " + e.message);
      console.error(e);
    }
  }

  // submitPress() { ... } // Deprecated by Auto-Double Press logic

  finishHole() {
    try {
      // Check for duplicate submission (Safety Check)
      if (this.state.history.find((h) => h.hole === this.state.currentHole)) {
        // If hole already exists, maybe we just need to advance?
        // Or Alert user.
        // alert(`Hole ${this.state.currentHole} already recorded. Advancing...`);
        // Force advance
        let next = this.state.currentHole + 1;
        if (next > 18) next = 1;
        this.state.currentHole = next;
        this.initHole();
        this.saveState();
        this.updateUI();
        return;
      }

      const s1 = parseInt(this.p1ScoreInput.value);
      const s2 = parseInt(this.p2ScoreInput.value);
      const s3 = parseInt(this.p3ScoreInput.value);
      const s4 = parseInt(this.p4ScoreInput.value);

      if (isNaN(s1) || isNaN(s2) || isNaN(s3) || isNaN(s4)) {
        alert("Please enter scores for all players");
        return;
      }

      const indexes = this.state.course
        ? this.state.course.indexes
        : STROKE_INDEXES;
      const currentHoleIndex = indexes[(this.state.currentHole - 1) % 18];
      const playingHcps = this.getPlayingHandicaps();

      const calcNet = (gross, pid) =>
        gross - this.getPops(playingHcps[pid], currentHoleIndex);

      const n1 = calcNet(s1, "p1");
      const n2 = calcNet(s2, "p2");
      const n3 = calcNet(s3, "p3");
      const n4 = calcNet(s4, "p4");

      const t1Best = Math.min(n1, n2);
      const t2Best = Math.min(n3, n4);

      let winner = null;
      let amount = 0;
      let previousHonor = this.state.honor;
      let finalHoleState = JSON.parse(JSON.stringify(this.state.holeState));

      if (this.state.gameMode === "roll") {
        const pressTotal = (this.state.holeState.presses || []).reduce(
          (a, b) => a + b,
          0,
        );
        const currentPoint =
          (this.state.settings.baseBet + pressTotal) *
          this.state.holeState.multiplier;
        amount = currentPoint;

        if (!this.state.settings.enableHiLow) {
          if (t1Best < t2Best) {
            winner = "team1";
            this.state.teams.team1.balance += amount;
            this.state.teams.team2.balance -= amount;
            this.state.honor = "team1";
          } else if (t2Best < t1Best) {
            winner = "team2";
            this.state.teams.team2.balance += amount;
            this.state.teams.team1.balance -= amount;
            this.state.honor = "team2";
          } else {
            winner = "tie";
          }
        }

        // Hi-Low Logic
        if (this.state.settings.enableHiLow) {
          let netSwing = 0;
          // Check Low Score
          if (t1Best < t2Best) netSwing += currentPoint;
          else if (t2Best < t1Best) netSwing -= currentPoint;

          // Check High Score (High Net)
          // Point goes to team WITHOUT the high score (so LOWER High Score wins)
          const t1W = Math.max(n1, n2);
          const t2W = Math.max(n3, n4);

          if (t1W < t2W) netSwing += currentPoint;
          else if (t2W < t1W) netSwing -= currentPoint;

          if (netSwing !== 0) {
            this.state.teams.team1.balance += netSwing;
            this.state.teams.team2.balance -= netSwing;
          }
          amount = Math.abs(netSwing);
          if (netSwing > 0) winner = "team1";
          else if (netSwing < 0) winner = "team2";
          else winner = "tie";

          if (t1Best < t2Best) this.state.honor = "team1";
          else if (t2Best < t1Best) this.state.honor = "team2";
        }

        // Auto-Press
        if ((this.state.holeState.presses || []).length > 0) {
          this.state.settings.baseBet =
            this.state.settings.baseBet + pressTotal;
        }
      } else if (this.state.gameMode === "umbrella") {
        // UMBRELLA MODE RE-IMPLEMENTATION TO ENSURE INTEGRITY
        let ptsT1 = 0;
        let ptsT2 = 0;
        let totalAvailable = 0;

        // Low Ball
        totalAvailable++;
        if (t1Best < t2Best) ptsT1++;
        else if (t2Best < t1Best) ptsT2++;

        // Low Total
        totalAvailable++;
        const t1Sum = n1 + n2;
        const t2Sum = n3 + n4;
        if (t1Sum < t2Sum) ptsT1++;
        else if (t2Sum < t1Sum) ptsT2++;

        // Greenie
        totalAvailable++;
        const greenieWinner = this.state.umbrellaState.greenie;
        if (greenieWinner === "team1") ptsT1++;
        else if (greenieWinner === "team2") ptsT2++;

        const holeValue = this.state.currentHole;
        let t1HolePts = ptsT1 * holeValue;
        let t2HolePts = ptsT2 * holeValue;

        if (ptsT1 === totalAvailable) t1HolePts *= 2;
        else if (ptsT2 === totalAvailable) t2HolePts *= 2;

        const netPts = t1HolePts - t2HolePts;
        amount = netPts * this.state.settings.baseBet;

        this.state.teams.team1.balance += amount;
        this.state.teams.team2.balance -= amount;

        if (amount > 0) winner = "team1";
        else if (amount < 0) winner = "team2";
        else winner = "tie";
        amount = Math.abs(amount);

        if (t1Best < t2Best) this.state.honor = "team1";
        else if (t2Best < t1Best) this.state.honor = "team2";
      }

      // SIDE GAME: Hi Low (Runs if enabled AND not Umbrella mode? Or allow with Umbrella? Let's allow with Roll only for now as requested)
      // User said "included in Roll Re-Roll".
      // Duplicate Hi-Low Logic Removed (Step 827 Fix)

      // Log history with snapshot
      this.state.history.push({
        hole: this.state.currentHole,
        winner,
        amount,
        scores: `(${n1},${n2}) vs (${n3},${n4})`,
        detailedScores: { p1: s1, p2: s2, p3: s3, p4: s4 },
        previousHonor,
        finalHoleState,
      });

      // Check if Match Over
      if (this.state.history.length >= this.state.totalHoles) {
        alert("Match Finished!");
        // You might want to show scoreboard here or disable controls
        this.toggleScoreboard(true);
      } else {
        // Next hole calculation with wrap-around
        let nextHole = this.state.currentHole + 1;
        if (nextHole > 18) nextHole = 1;
        this.state.currentHole = nextHole;

        this.updateScoreboardDOM();
        this.initHole();
        this.saveState();
      }
    } catch (e) {
      alert("Critical Error finishing hole: " + e.message);
      console.error(e);
    }
  }

  updateScoreboardDOM() {
    this.t1Summary.querySelector(".money").textContent = this.formatMoney(
      this.state.teams.team1.balance,
    );
    this.t2Summary.querySelector(".money").textContent = this.formatMoney(
      this.state.teams.team2.balance,
    );

    // History text removed as per request
    this.holeHistory.innerHTML = "";

    // Generate Scorecard Table
    const scorecardContainer = document.getElementById("scorecard-container");
    if (scorecardContainer && this.state.course) {
      // Get MATCH Handicaps (pops relative to low player)
      const playingHcps = this.getPlayingHandicaps();

      // Header Row
      let tableHTML =
        '<table class="scorecard-table"><thead><tr><th style="min-width:70px; text-align:left;">Hole</th>';
      for (let i = 1; i <= 9; i++) tableHTML += `<th>${i}</th>`;
      tableHTML += "<th>OUT</th>";
      for (let i = 10; i <= 18; i++) tableHTML += `<th>${i}</th>`;
      tableHTML += "<th>IN</th><th>TOT</th></tr></thead><tbody>";

      // Par Row
      const pars = this.state.course.par || this.state.course.pars || Array(18).fill(4);
      const indexes = this.state.course.indexes || Array(18).fill("-");

      let parOut = 0;
      let parIn = 0;

      tableHTML +=
        '<tr><td class="player-name-cell" style="color:var(--text-dim)">Par</td>';
      for (let i = 0; i < 9; i++) {
        parOut += pars[i];
        tableHTML += `<td>${pars[i]}</td>`;
      }
      tableHTML += `<td class="total-cell">${parOut}</td>`;
      for (let i = 9; i < 18; i++) {
        parIn += pars[i];
        tableHTML += `<td>${pars[i]}</td>`;
      }
      tableHTML += `<td class="total-cell">${parIn}</td><td class="total-cell">${parOut + parIn}</td></tr>`;

      // Hcp Row
      tableHTML +=
        '<tr><td class="player-name-cell" style="color:var(--text-dim)">Hcp</td>';
      for (let i = 0; i < 9; i++) tableHTML += `<td>${indexes[i]}</td>`;
      tableHTML += '<td class="total-cell"></td>';
      for (let i = 9; i < 18; i++) tableHTML += `<td>${indexes[i]}</td>`;
      tableHTML +=
        '<td class="total-cell"></td><td class="total-cell"></td></tr>';

      // Hcp Row Removed as per request

      const players = ["p1", "p2", "p3", "p4"];
      players.forEach((pid) => {
        tableHTML += `<tr><td class="player-name-cell">${this.state.players[pid].name}</td>`;

        let outTotal = 0;
        let inTotal = 0;
        // Match Hcp for this player
        const pHcp = playingHcps[pid];

        // Front 9 (1-9)
        for (let i = 1; i <= 9; i++) {
          const h = this.state.history.find((hist) => hist.hole === i);

          // Score with indicators
          let displayScore = "-";
          let indicators = "";

          // Calculate Pop Dot
          const cIndexes =
            this.state.course && this.state.course.indexes
              ? this.state.course.indexes
              : STROKE_INDEXES;
          const hIdx = cIndexes[(i - 1) % 18];
          const pop = this.getPops(pHcp, hIdx);
          if (pop > 0) {
            indicators += `<span style="display:inline-block; width:4px; height:4px; border-radius:50%; background:gold; margin-left:2px; vertical-align:top;" title="${pop} Pops"></span>`;
          }

          if (h && h.detailedScores && h.detailedScores[pid] !== undefined) {
            displayScore = h.detailedScores[pid];
            outTotal += displayScore;

            // Find Min/Max for this hole to show indicators
            const scores = h.detailedScores;
            const vals = Object.values(scores).filter(
              (v) => typeof v === "number",
            );

            if (vals.length > 0) {
              // HI-LO LOGIC (Strict, using Net Scores)
              if (this.state.settings.enableHiLow) {
                // Helper to get Net Score
                const getNet = (p) => {
                  const gross = scores[p];
                  if (typeof gross !== "number") return 999;
                  const cIndexes =
                    this.state.course && this.state.course.indexes
                      ? this.state.course.indexes
                      : STROKE_INDEXES;
                  const hIdx = cIndexes[(i - 1) % 18];
                  const pop = this.getPops(playingHcps[p], hIdx);
                  return gross - pop;
                };

                const net1 = getNet("p1"),
                  net2 = getNet("p2"),
                  net3 = getNet("p3"),
                  net4 = getNet("p4");

                if (net1 < 900 && net2 < 900 && net3 < 900 && net4 < 900) {
                  const t1Best = Math.min(net1, net2);
                  const t2Best = Math.min(net3, net4);

                  // Tie Rule: No dots if Low is tied
                  if (t1Best !== t2Best) {
                    const t1Worst = Math.max(net1, net2);
                    const t2Worst = Math.max(net3, net4);

                    const isT1 = pid === "p1" || pid === "p2";
                    const myTeam = isT1 ? "team1" : "team2";

                    // Low Win
                    const lowWinner = t1Best < t2Best ? "team1" : "team2";
                    if (lowWinner === myTeam) {
                      const myNet = getNet(pid);
                      const teamBest = isT1 ? t1Best : t2Best;

                      // Mark if I contributed the best score
                      if (myNet === teamBest) {
                        indicators +=
                          '<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--primary-green); margin-left:4px; vertical-align:middle;" title="Low Winner"></span>';
                      }
                    }

                    // High Loss (Higher Worst Ball)
                    let highLoser = null;
                    if (t1Worst < t2Worst) highLoser = "team2";
                    else if (t2Worst < t1Worst) highLoser = "team1";

                    if (highLoser === myTeam) {
                      const myNet = getNet(pid);
                      const teamWorst = isT1 ? t1Worst : t2Worst;
                      // Mark if I contributed the worst score
                      if (myNet === teamWorst) {
                        indicators +=
                          '<span style="color:#ff4444; font-weight:900; margin-left:4px; font-size:12px;" title="High Total">✕</span>';
                      }
                    }
                  }
                }
              } else {
                // STANDARD LOGIC (Min/Max)
                const minVal = Math.min(...vals);
                const maxVal = Math.max(...vals);

                // Low Score (Green)
                if (displayScore === minVal) {
                  indicators +=
                    '<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--primary-green); margin-left:4px; vertical-align:middle;"></span>';
                }
                // High Score (Red)
                if (displayScore === maxVal && minVal !== maxVal) {
                  indicators +=
                    '<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#ff4444; margin-left:4px; vertical-align:middle;"></span>';
                }
              }
            }
          }

          // Always show indicators (like pops) even if score not entered
          displayScore = `${displayScore}${indicators}`;
          tableHTML += `<td>${displayScore}</td>`;
        }
        tableHTML += `<td class="total-cell">${outTotal || "-"}</td>`;

        // Back 9 (10-18)
        for (let i = 10; i <= 18; i++) {
          const h = this.state.history.find((hist) => hist.hole === i);
          let displayScore = "-";
          let indicators = "";

          // Calculate Pop Dot
          const cIndexes =
            this.state.course && this.state.course.indexes
              ? this.state.course.indexes
              : STROKE_INDEXES;
          const hIdx = cIndexes[(i - 1) % 18];
          const pop = this.getPops(pHcp, hIdx);
          if (pop > 0) {
            indicators += `<span style="display:inline-block; width:4px; height:4px; border-radius:50%; background:gold; margin-left:2px; vertical-align:top;" title="${pop} Pops"></span>`;
          }

          if (h && h.detailedScores && h.detailedScores[pid] !== undefined) {
            displayScore = h.detailedScores[pid];
            inTotal += displayScore;

            const scores = h.detailedScores;
            const vals = Object.values(scores).filter(
              (v) => typeof v === "number",
            );
            if (vals.length > 0) {
              const minVal = Math.min(...vals);
              const maxVal = Math.max(...vals);

              if (displayScore === minVal) {
                indicators +=
                  '<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--primary-green); margin-left:4px; vertical-align:middle;"></span>';
              }
              if (displayScore === maxVal && minVal !== maxVal) {
                indicators +=
                  '<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#ff4444; margin-left:4px; vertical-align:middle;"></span>';
              }
            }
          }

          // Always show indicators (like pops) even if score not entered
          displayScore = `${displayScore}${indicators}`;
          tableHTML += `<td>${displayScore}</td>`;
        }
        tableHTML += `<td class="total-cell">${inTotal || "-"}</td>`;

        // Grand Total
        const grandTotal = (outTotal || 0) + (inTotal || 0);
        const grandDisplay = outTotal || inTotal ? grandTotal : "-";
        tableHTML += `<td class="total-cell" style="color:white; border-left:1px solid rgba(255,255,255,0.1)">${grandDisplay}</td></tr>`;

        // Team Total Insertion
        if (pid === "p2" || pid === "p4") {
          const isT1 = pid === "p2";
          const teamName = isT1 ? "Team 1 Total" : "Team 2 Total";
          const targetWinner = isT1 ? "team1" : "team2";

          tableHTML += `<tr style="border-top:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.15); font-weight:bold;">
                        <td style="text-align:left; color:var(--accent); font-size:0.9rem;">${teamName}</td>`;

          let tOut = 0;
          // Front 9
          for (let i = 1; i <= 9; i++) {
            const h = this.state.history.find((hist) => hist.hole === i);
            let disp = "";
            if (h) {
              const amt = h.amount || 0;
              if (h.winner === targetWinner) {
                disp = `<span style="color:var(--primary-green)">+${amt}</span>`;
                tOut += amt;
              } else if (h.winner !== "tie" && h.winner) {
                disp = `<span style="color:#ff4444">-${amt}</span>`;
                tOut -= amt;
              }
            }
            tableHTML += `<td>${disp}</td>`;
          }
          tableHTML += `<td class="total-cell" style="color:${tOut >= 0 ? "var(--primary-green)" : "#ff4444"}">${this.formatMoney(tOut)}</td>`;

          let tIn = 0;
          // Back 9
          for (let i = 10; i <= 18; i++) {
            const h = this.state.history.find((hist) => hist.hole === i);
            let disp = "";
            if (h) {
              const amt = h.amount || 0;
              if (h.winner === targetWinner) {
                disp = `<span style="color:var(--primary-green)">+${amt}</span>`;
                tIn += amt;
              } else if (h.winner !== "tie" && h.winner) {
                disp = `<span style="color:#ff4444">-${amt}</span>`;
                tIn -= amt;
              }
            }
            tableHTML += `<td>${disp}</td>`;
          }
          tableHTML += `<td class="total-cell" style="color:${tIn >= 0 ? "var(--primary-green)" : "#ff4444"}">${this.formatMoney(tIn)}</td>`;

          const tGrand = tOut + tIn;
          tableHTML += `<td class="total-cell" style="color:${tGrand >= 0 ? "var(--primary-green)" : "#ff4444"}">${this.formatMoney(tGrand)}</td></tr>`;
        }
      });
      tableHTML += "</tbody></table>";

      scorecardContainer.innerHTML = tableHTML;
    }
  }

  formatMoney(amount) {
    return amount >= 0 ? `+${amount}` : `${amount}`;
  }

  toggleScoreboard(show) {
    if (this.state.history.length > 0) this.updateScoreboardDOM();
    if (show) this.scoreboardModal.classList.remove("hidden");
    else this.scoreboardModal.classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.game = new RollReRollGame();
});
