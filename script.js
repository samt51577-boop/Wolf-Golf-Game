const initialState = {
    currentHole: 1,
    wolfIndex: 0,
    players: [], // Array of { name, hcp: 0, score: 0, trash: 0 }
    history: [],
    settings: {
        pointsPerHole: 2,
        loneWolfPoints: 4,
        blindWolfPoints: 6,
        basePointValue: 1.00 // Default wager
    },
    currentWagerBasis: 1.00,
    pressLog: []
};

let gameState = JSON.parse(JSON.stringify(initialState));

// Track current hole alliance & data
let currentHoleData = {
    wolfIndex: 0,
    partnerIndex: null, // null if Lone Wolf
    isLoneWolf: false,
    isBlind: false
};

// COURSE DATA
const courseLibrary = {
    "Willow Creek": {
        name: "Willow Creek",
        si: [9, 5, 1, 15, 7, 13, 11, 17, 3, 6, 8, 16, 12, 10, 2, 18, 4, 14],
        par: [4, 5, 4, 3, 5, 4, 4, 3, 4, 4, 4, 3, 4, 4, 4, 3, 5, 4]
    },
    "DMGCC North": {
        name: "DMGCC North",
        par: [4, 5, 3, 4, 3, 4, 4, 4, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5],
        si: [5, 9, 13, 7, 15, 1, 3, 11, 17, 18, 6, 16, 10, 2, 8, 14, 12, 4]
    },
    "DMGCC South": {
        name: "DMGCC South",
        par: [4, 5, 4, 4, 3, 5, 4, 3, 4, 4, 4, 4, 5, 4, 3, 5, 3, 4],
        si: [3, 7, 9, 1, 15, 11, 5, 17, 13, 14, 10, 4, 6, 12, 16, 2, 18, 8]
    },
    "Glen Oaks": {
        name: "Glen Oaks",
        par: [4, 4, 4, 3, 4, 5, 4, 3, 5, 4, 4, 3, 4, 4, 4, 3, 5, 4],
        si: [5, 13, 1, 17, 7, 11, 9, 15, 3, 6, 14, 4, 18, 8, 12, 10, 16, 2]
    },
    "The Harvester": {
        name: "The Harvester",
        par: [4, 4, 3, 5, 4, 5, 4, 3, 4, 4, 4, 4, 4, 3, 5, 4, 3, 5],
        si: [16, 14, 8, 4, 18, 10, 6, 12, 2, 7, 17, 11, 15, 9, 1, 3, 13, 5]
    }
};

// Aliases for compatibility
const willowCreekData = courseLibrary["Willow Creek"];

// ----------------------------------------------------
// BOOT SEQUENCE
// ----------------------------------------------------
function bootApp() {
    // Ensure updatePlayerRows is called to set initial state correctly
    // But if we have a save, we might hide setup anyway.
    updatePlayerRows();

    // Check for save silently on boot
    const savedCheck = localStorage.getItem('wolfLedgerSave');
    if (savedCheck) {
        try {
            const data = JSON.parse(savedCheck);
            if (data && data.players && data.players.length > 0) {
                checkResumeEligibility();
                // Don't auto-prompt, let them click the button
            }
        } catch (e) { console.error(e); }
    }

    // Setup Screen defaults
    document.getElementById('setup-screen').style.display = 'block';
    const views = document.querySelectorAll('.game-view');
    views.forEach(v => v.style.display = 'none');
}

function checkResumeEligibility() {
    const saved = localStorage.getItem('wolfLedgerSave');
    const btn = document.getElementById('resume-hunt-btn');
    if (!btn) return;

    if (saved) {
        btn.style.display = 'block'; // Show if save exists
    } else {
        btn.style.display = 'none';
    }
}

function resumeGame() {
    const saved = localStorage.getItem('wolfLedgerSave');
    if (saved) {
        const data = JSON.parse(saved);
        loadSavedGame(data);
    }
}

function loadSavedGame(data) {
    gameState = data;
    if (!gameState.settings) gameState.settings = initialState.settings;
    if (!gameState.pressLog) gameState.pressLog = [];

    // Fallback for legacy saves without activeCourse
    if (!gameState.activeCourse) gameState.activeCourse = willowCreekData;

    document.getElementById('setup-screen').style.display = 'none';

    // Ensure button is hidden once loaded
    const rBtn = document.getElementById('resume-hunt-btn');
    if (rBtn) rBtn.style.display = 'none';
    if (gameState.currentHole > 18) {
        showFinalResults();
    } else {
        renderHole();
    }
}

window.onload = bootApp;

function saveToPhone() {
    localStorage.setItem('wolfLedgerSave', JSON.stringify(gameState));
    console.log("Progress saved.");
}

function clearMatch() {
    if (confirm("Clear all scores and start a new match?")) {
        localStorage.removeItem('wolfLedgerSave');
        gameState = JSON.parse(JSON.stringify(initialState));
        checkResumeEligibility(); // Will hide the button
        location.reload();
    }
}

// ----------------------------------------------------
// DYNAMIC UI LOGIC
// ----------------------------------------------------
function updatePlayerRows() {
    const selector = document.getElementById('group-size-select');
    if (!selector) return;

    const groupSize = parseInt(selector.value);
    const container = document.getElementById('player-rows-container');

    // Save current data so it isn't lost when changing group size
    // We grab from existing '.player-entry-group' elements
    const currentData = Array.from(container.querySelectorAll('.player-entry-group')).map(group => {
        const nameInput = group.querySelector('.name-input');
        const hcpDiv = group.querySelector('.hcp-input');
        return {
            name: nameInput ? nameInput.value : '',
            hcp: hcpDiv ? hcpDiv.innerText : 'HCP'
        };
    });

    container.innerHTML = ''; // Clear existing rows

    for (let i = 0; i < groupSize; i++) {
        const isUser = i === 0;
        let savedName = '';
        let savedHcp = 'HCP';

        if (i < currentData.length) {
            savedName = currentData[i].name;
            savedHcp = currentData[i].hcp;
        } else if (isUser) {
            savedName = 'Sam';
            savedHcp = '10.2';
        }

        const hcpText = savedHcp.trim();
        const hcpClass = (hcpText !== 'HCP' && hcpText !== '') ? 'active-hcp' : '';

        // Added IDs: p${i+1}-name and p${i+1}-hcp for the fetch function
        const rowHtml = `
            <div class="player-entry-group">
                <label class="player-label">Player ${i + 1}${isUser ? ' (You)' : ''}</label>
                <div class="player-inputs">
                    <input type="text" id="p${i + 1}-name" class="name-input" placeholder="Name (e.g. Joe Smith IA)" value="${savedName}">
                    <div id="p${i + 1}-hcp" class="hcp-input ${hcpClass}" 
                         contenteditable="true" 
                         oninput="handleHcpInput(this)">
                        ${savedHcp}
                    </div>
                     <button type="button" onclick="window.fetchGhin(${i + 1}, this)" style="padding: 10px; background: var(--neon-green); border: none; border-radius: 8px; color: black; font-weight: bold; cursor: pointer; margin-left:10px;">🔍</button>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', rowHtml);
    }
}

// ----------------------------------------------------
// UI INTERACTION HELPERS
// ----------------------------------------------------
function handleHcpInput(element) {
    let originalText = element.innerText;

    // If the text contains "HCP" AND has other characters (user typed something)
    // We strip "HCP" to leave just the number
    if (originalText.includes('HCP') && originalText.trim().length > 3) {
        let cleanText = originalText.replace('HCP', '').trim();
        element.innerText = cleanText;

        // Move cursor to end of the new text
        try {
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(element);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        } catch (e) {
            // Fallback: simple focus if selection fails
            element.focus();
        }
    }

    // Highlighting Logic
    let val = element.innerText.trim();
    if (val !== "" && val !== 'HCP') {
        element.classList.add('active-hcp');
    } else {
        element.classList.remove('active-hcp');
    }
}

// ----------------------------------------------------
// GAME INITIALIZATION
// ----------------------------------------------------
function validateAndStart() {
    const players = [];
    const rows = document.querySelectorAll('.player-entry-group');
    let isValid = true;

    // Capture Wager Settings
    const pointValue = parseFloat(document.getElementById('point-value').value) || 1.00;

    // Reset state before adding players
    const freshState = JSON.parse(JSON.stringify(initialState));
    gameState = freshState;
    gameState.settings.basePointValue = pointValue; // Lock in the wager
    gameState.currentWagerBasis = pointValue;

    // Set Active Course from Selector
    const courseSelect = document.getElementById('course-select');
    const selectedCourseName = courseSelect ? courseSelect.value : "Willow Creek";
    // Ensure we have a valid course object
    gameState.activeCourse = (courseLibrary && courseLibrary[selectedCourseName]) ? courseLibrary[selectedCourseName] : willowCreekData;

    rows.forEach((row, index) => {
        const nameInput = row.querySelector('.name-input');
        const hcpBox = row.querySelector('.hcp-input');
        const name = nameInput.value.trim();

        // Parse "10.2" or "HCP" from text
        let hcpText = hcpBox.innerText.replace('HCP', '').trim();
        if (hcpText === '') hcpText = 'NaN';
        const hcp = parseFloat(hcpText);

        if (!name || isNaN(hcp)) {
            isValid = false;
            row.style.border = "1px solid red";
        } else {
            row.style.border = "none";
            players.push({ name, hcp, score: 0, trash: 0 });
        }
    });

    if (isValid && players.length >= 3) {
        gameState.players = players;
        gameState.originalPool = [...players];
        gameState.totalHoles = 18;
        gameState.currentHole = 1;
        gameState.wolfIndex = 0;
        gameState.history = [];

        saveToPhone(); // Persistence for the round
        document.getElementById('setup-screen').style.display = 'none';

        // Hide Resume Btn since we are starting new
        const rBtn = document.getElementById('resume-hunt-btn');
        if (rBtn) rBtn.style.display = 'none';

        renderHole();
    } else {
        if (players.length < 3) alert("Need at least 3 players.");
        else alert("The pack isn't ready. Please check all names and handicaps.");
    }
}

// ----------------------------------------------------
// CORE LOGIC
// ----------------------------------------------------
function getFairHoleLimit() {
    const pCount = gameState.players.length;
    if (!pCount) return 15;
    return pCount * Math.floor(18 / pCount);
}

function getWolfForHole(holeNumber) {
    const limit = getFairHoleLimit();

    if (holeNumber <= limit) {
        return (holeNumber - 1) % gameState.players.length;
    } else {
        // Last Place picks logic
        // Sort by Score (ascending? No, in Wolf, usually High Score wins points? Or Net Score?)
        // Wait, standard Wolf: Points are good. Highest score wins match.
        // So "Last Place" means Lowest Point Total.

        // Create a copy to sort
        const standings = gameState.players.map((p, i) => ({ index: i, score: p.score }));
        standings.sort((a, b) => a.score - b.score);
        return standings[0].index; // Player with lowest score
    }
}

function setManualWolf(index) {
    gameState.wolfIndex = index;
    currentHoleData.wolfIndex = gameState.wolfIndex;
    renderSelectionScreen();
    console.log("Wolf manually set to: " + gameState.players[index].name);
}

function renderHole() {
    gameState.wolfIndex = getWolfForHole(gameState.currentHole);
    currentHoleData.wolfIndex = gameState.wolfIndex;
    currentHoleData.multiplier = 1; // Reset Multiplier
    currentHoleData.pressed = false; // Deprecated but kept for safety if referenced elsewhere temporarily

    const setup = document.getElementById('setup-screen');
    if (setup) setup.style.display = 'none'; // Ensure setup is hidden

    document.getElementById('selection-screen').style.display = 'block';
    renderSelectionScreen();
    renderHistory();
}


function getUpcomingWolves() {
    // Basic rotation logic for display
    let upcoming = [];
    if (!gameState.players || gameState.players.length === 0) return "";

    const limit = getFairHoleLimit();
    let displayString = "";

    for (let i = 1; i <= 3; i++) {
        const nextHoleNum = gameState.currentHole + i;
        if (nextHoleNum > 18) continue;

        if (nextHoleNum <= limit) {
            let idx = (nextHoleNum - 1) % gameState.players.length;
            if (gameState.players[idx]) {
                upcoming.push(gameState.players[idx].name);
            }
        } else {
            upcoming.push("Last Place");
        }
    }

    if (upcoming.length === 0 && gameState.currentHole === 18) {
        return "Final Hole 🏁";
    }

    return upcoming.join(', ');
}

function handlePress() {
    // 1. Double the persistent basis for this and all future holes
    gameState.currentWagerBasis *= 2;

    // 2. Log it
    gameState.pressLog.push({
        hole: gameState.currentHole,
        newAmount: gameState.currentWagerBasis
    });

    // 3. Update UI
    const el = document.getElementById('current-wager-display');
    if (el) {
        el.innerText = gameState.currentWagerBasis.toFixed(2);
        el.style.color = "#ef4444";
    }

    if (typeof renderPressHistory === 'function') renderPressHistory();

    saveToPhone();

    alert(`PRESS CONFIRMED! Stakes doubled to $${gameState.currentWagerBasis.toFixed(2)} for this and future holes!`);
}
// Keeping the onclick name consistent
const togglePress = handlePress;

function renderPressHistory() {
    const historyContainer = document.getElementById('press-history-list');
    if (!historyContainer) return;

    // Clear the existing list in the menu
    historyContainer.innerHTML = "";

    // If no presses have occurred yet
    if (!gameState.pressLog || gameState.pressLog.length === 0) {
        historyContainer.innerHTML = "<li>No presses recorded.</li>";
        return;
    }

    // Build the list from the log
    gameState.pressLog.forEach(entry => {
        const listItem = document.createElement('li');
        listItem.style.padding = "10px 0";
        listItem.style.borderBottom = "1px solid #333";
        listItem.innerHTML = `
            <span style="color: #888;">Hole ${entry.hole}:</span> 
            <span style="color: #7cfc00; font-weight: bold;"> Stakes doubled to $${entry.newAmount.toFixed(2)}</span>
        `;
        historyContainer.appendChild(listItem);
    });
}

function getSelectionPredictability(player, holeSI) {
    const minHcp = Math.min(...gameState.players.map(p => p.hcp));
    const strokeGap = Math.round(player.hcp - minHcp);

    // If they have a stroke on a difficult hole, they are a "Strong" pick
    if (holeSI <= strokeGap && holeSI <= 9) return "STRONG PICK";
    // If they have a stroke on an easy hole
    if (holeSI <= strokeGap) return "STABLE PICK";
    // Scratch players are always "Stable"
    if (player.hcp <= 2) return "STABLE PICK";

    return "RISKY PICK";
}

function getWolfRecommendation() {
    // Determine minHcp here as it's not a global property
    const minHcp = Math.min(...gameState.players.map(p => p.hcp));
    const holeSI = gameState.activeCourse.si[gameState.currentHole - 1];

    // Sort players by best potential 'Net Par'
    const candidates = gameState.players
        .map((p, i) => ({ ...p, originalIndex: i }))
        .filter((_, i) => i !== gameState.wolfIndex); // Exclude the Wolf

    const best = candidates
        .map(player => ({
            name: player.name,
            // Calculate actual gap for Pop
            advantage: (player.hcp - minHcp) >= holeSI ? 2 : 1
        }))
        .sort((a, b) => b.advantage - a.advantage)[0];

    return best ? best.name : "None";
}

function renderSelectionScreen() {
    const wolf = gameState.players[gameState.wolfIndex];
    document.getElementById('display-wolf-name').innerText = wolf.name;

    // Update Header
    const holeNum = gameState.currentHole;
    const limit = getFairHoleLimit();

    if (holeNum > limit) {
        document.getElementById('display-wolf-name').innerText += " (Last Place 📉)";
    }
    document.getElementById('selection-hole-num').innerText = holeNum;
    const holeIdx = holeNum - 1;

    // Active Course Logic or Fallback
    const si = (gameState.activeCourse && gameState.activeCourse.si[holeIdx]) || willowCreekData.si[holeIdx];
    document.getElementById('selection-hole-si').innerText = si;

    const container = document.getElementById('partner-buttons');
    container.innerHTML = '';

    // Basic Carry Over Display
    if (gameState.carryOver && gameState.carryOver > 0) {
        // Find or create notification element
        let carryEl = document.getElementById('carry-notification');
        if (!carryEl) {
            const notif = document.createElement('div');
            notif.id = 'carry-notification';
            notif.style.textAlign = 'center';
            notif.style.color = '#facc15';
            notif.style.fontWeight = 'bold';
            notif.style.marginBottom = '10px';
            notif.style.padding = '8px';
            notif.style.background = 'rgba(250, 204, 21, 0.1)';
            notif.style.borderRadius = '8px';
            document.getElementById('display-wolf-name').parentNode.after(notif);
            carryEl = notif;
        }
        carryEl.innerText = `⚠️ CARRY OVER POT: ${gameState.carryOver} PTS`;
        carryEl.style.display = 'block';
    } else {
        const carryEl = document.getElementById('carry-notification');
        if (carryEl) carryEl.style.display = 'none';
    }



    // Min Hcp Baseline for dots
    const minHcp = Math.min(...gameState.players.map(p => p.hcp));

    gameState.players.forEach((player, index) => {
        if (index !== gameState.wolfIndex) {

            // Check for dots
            const strokeGap = Math.round(player.hcp - minHcp);
            const hasDot = si <= strokeGap;

            let dotHtml = '';
            if (hasDot) {
                // User Style
                dotHtml = '<span style="color: #7cfc00; margin-left: 5px;">●</span>';
            }

            // Predictability Logic
            const predictability = getSelectionPredictability(player, si);
            let predColor = '#9ca3af'; // Default/Stable
            if (predictability === 'STRONG PICK') predColor = '#7cfc00';
            else if (predictability === 'RISKY PICK') predColor = '#ef4444';

            const btn = document.createElement('button');
            btn.className = 'wulf-btn';

            btn.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span>SELECT ${player.name.toUpperCase()} (${player.hcp}) ${dotHtml}</span>
                    <span style="font-size:10px; color:${predColor}; background:rgba(0,0,0,0.5); padding:3px 8px; border-radius:10px; font-weight:bold; letter-spacing:0.5px;">${predictability}</span>
                </div>
            `;
            btn.onclick = () => selectAlliance(index);
            container.appendChild(btn);
        }
    });

    // Update Betting Tools
    const wagerEl = document.getElementById('current-wager-display');
    if (wagerEl) {
        const val = gameState.currentWagerBasis || gameState.settings.basePointValue || 1.00;
        wagerEl.innerText = val.toFixed(2);
        if (gameState.settings.basePointValue && val > gameState.settings.basePointValue) {
            wagerEl.style.color = "#ef4444";
        }
    }

    const upcomingEl = document.getElementById('upcoming-wolves-display');
    if (upcomingEl) {
        upcomingEl.innerText = "Next Up: " + getUpcomingWolves();
    }
}

function selectAlliance(choice) {
    if (choice === 'lone') {
        currentHoleData.isLoneWolf = true;
        currentHoleData.isBlind = false;
        currentHoleData.partnerIndex = null;
    } else {
        currentHoleData.isLoneWolf = false;
        currentHoleData.isBlind = false;
        currentHoleData.partnerIndex = choice;
    }
    showScoringScreen();
}

function selectBlindWolf() {
    currentHoleData.isLoneWolf = true;
    currentHoleData.isBlind = true;
    currentHoleData.partnerIndex = null;
    showScoringScreen();
}

// ----------------------------------------------------
// SCORING & STROKE LOGIC
// ----------------------------------------------------

function calculateAllocatedStrokes(playerIndex, holeIdx) {
    if (!gameState.players || gameState.players.length === 0) return 0;
    const minHcp = Math.min(...gameState.players.map(p => p.hcp));
    const strokeGap = Math.round(gameState.players[playerIndex].hcp - minHcp);
    const siList = (gameState.activeCourse && gameState.activeCourse.si) ? gameState.activeCourse.si : willowCreekData.si;
    const holeSI = siList[holeIdx] || 18;

    let strokes = 0;
    if (holeSI <= strokeGap) strokes++;
    if (strokeGap > 18 && holeSI <= (strokeGap - 18)) strokes++;

    return strokes;
}

function calculateNet(gross, playerIndex) {
    const holeIdx = gameState.currentHole - 1;
    const strokes = calculateAllocatedStrokes(playerIndex, holeIdx);
    return gross - strokes;
}

function renderHandicapDots(playerIndex, holeIdx) {
    const strokes = calculateAllocatedStrokes(playerIndex, holeIdx);
    let dots = '';
    for (let i = 0; i < strokes; i++) {
        dots += '<span class="stroke-dot" style="color:var(--neon-green)">●</span>';
    }
    return dots;
}

function automateWinner(holeScores) {
    const wolfTeam = [gameState.wolfIndex];
    if (currentHoleData.partnerIndex !== null) wolfTeam.push(currentHoleData.partnerIndex);

    const pack = gameState.players.map((_, i) => i).filter(i => !wolfTeam.includes(i));

    // Get all net scores
    const netScores = holeScores.map((score, i) => calculateNet(score, i));

    // Find Best (Lowest) Scores for each team
    const wolfTeamBest = Math.min(...wolfTeam.map(i => netScores[i]));
    const packBest = Math.min(...pack.map(i => netScores[i]));

    if (wolfTeamBest < packBest) return "WOLF_WIN";
    if (packBest < wolfTeamBest) return "PACK_WIN";

    return "TIE";
}



function showScoringScreen() {
    document.getElementById('selection-screen').style.display = 'none';
    document.getElementById('scoring-screen').style.display = 'block';

    // 1. Update Header Info
    const holeNum = gameState.currentHole;
    document.getElementById('scoring-hole-num').innerText = holeNum;

    const holeIdx = holeNum - 1;
    const course = gameState.activeCourse || willowCreekData;
    const si = course.si[holeIdx];
    const par = course.par[holeIdx];

    // Update simple spans
    document.getElementById('hole-par').innerText = par;
    document.getElementById('hole-si').innerText = si;

    const wolf = gameState.players[gameState.wolfIndex];
    let buttonText = "";

    // 2. Generate Rows
    let rowsHTML = "";

    // Helper to generate the new row layout
    const createRow = (player, index, isPartner, isWolf) => {
        const dots = renderHandicapDots(index, holeIdx);

        const teamColor = (isPartner || isWolf) ? 'var(--neon-green)' : '#444';
        const borderStyle = (isPartner || isWolf) ? `1px solid ${teamColor}` : '1px solid transparent';

        let roleLabel = '';
        if (isWolf) roleLabel = ' (Wolf)';
        else if (isPartner) roleLabel = ' (Partner)';

        return `
        <div class="scoring-row" style="background: var(--input-bg); padding: 15px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border: ${borderStyle};">
            <div class="player-info">
                <span class="player-name" style="font-weight: bold; display: block; color:white;">${player.name}${roleLabel}</span>
                <div class="hcp-dots" style="color: var(--neon-green); font-size: 18px; line-height: 1; height:18px;">
                    ${dots} 
                </div>
            </div>
            <div class="score-input-wrapper">
                <input type="number" class="wulf-score-input" data-player-index="${index}" placeholder="Gross" style="width: 80px; padding: 10px; border-radius: 8px; border: 1px solid #333; background: #222; color: white; text-align: center; font-size: 16px;">
            </div>
        </div>
        `;
    };

    if (currentHoleData.isBlind || currentHoleData.isLoneWolf) {
        buttonText = wolf.name;
        // 1. Wolf First
        rowsHTML += createRow(wolf, gameState.wolfIndex, false, true);
        // 2. Opponents
        gameState.players.forEach((p, i) => {
            if (i !== gameState.wolfIndex) rowsHTML += createRow(p, i, false, false);
        });
    } else {
        const partner = gameState.players[currentHoleData.partnerIndex];
        buttonText = `${wolf.name} & ${partner.name}`;
        // 1. Wolf
        rowsHTML += createRow(wolf, gameState.wolfIndex, false, true);
        // 2. Partner
        if (partner) rowsHTML += createRow(partner, currentHoleData.partnerIndex, true, false);
        // 3. Opponents
        gameState.players.forEach((p, i) => {
            if (i !== gameState.wolfIndex && i !== currentHoleData.partnerIndex) rowsHTML += createRow(p, i, false, false);
        });
    }

    document.getElementById('wolf-team-names').innerText = buttonText;
    // Updated ID target from `pop-breakdown` to `score-inputs-container`
    document.getElementById('score-inputs-container').innerHTML = rowsHTML;
}

function goToMainPage() {
    const confirmExit = confirm("Open Main Menu? Game will be paused.");

    if (confirmExit) {
        // Hide game views
        document.querySelectorAll('.game-view').forEach(el => el.style.display = 'none');
        // Show setup
        document.getElementById('setup-screen').style.display = 'block';

        // Show Resume Button if game exists
        const resumeBtn = document.getElementById('resume-hunt-btn');
        if (resumeBtn && gameState && gameState.players && gameState.players.length > 0) {
            resumeBtn.style.display = 'block';
            resumeBtn.innerText = "RESUME HOLE " + gameState.currentHole;
        }

        if (typeof renderPressHistory === 'function') renderPressHistory();
    }
}

function resumeGame() {
    if (!gameState || !gameState.players || gameState.players.length === 0) {
        alert("No active game to resume.");
        return;
    }

    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('selection-screen').style.display = 'block';
    // Re-render to ensure state is fresh
    renderSelectionScreen();
}

function resolveHole(winnerSide) {
    let pointSwing = new Array(gameState.players.length).fill(0);
    // Determine base points per stake
    let points = 0;

    // Define carry at top scope
    let carry = 0;

    const mult = (gameState.currentWagerBasis && gameState.settings.basePointValue)
        ? (gameState.currentWagerBasis / gameState.settings.basePointValue)
        : 1;

    if (winnerSide === 'tie') {
        const carryVal = 2 * mult;
        gameState.carryOver = (gameState.carryOver || 0) + carryVal;
        points = 0;
    } else {
        // Apply carry if someone won
        carry = gameState.carryOver || 0;

        // Reset carry after use
        gameState.carryOver = 0;

        if (currentHoleData.isBlind) {
            const val = (6 * mult) + carry;
            points = val;

            if (winnerSide === 'wolf') {
                pointSwing[gameState.wolfIndex] = val;
            } else if (winnerSide === 'pack') {
                gameState.players.forEach((p, i) => { if (i !== gameState.wolfIndex) pointSwing[i] = val; });
            }
        } else if (currentHoleData.isLoneWolf) {
            const val = (4 * mult) + carry;
            points = val;

            if (winnerSide === 'wolf') {
                pointSwing[gameState.wolfIndex] = val;
            } else if (winnerSide === 'pack') {
                gameState.players.forEach((p, i) => { if (i !== gameState.wolfIndex) pointSwing[i] = val; });
            }
        } else {
            const val = (2 * mult) + carry;
            points = val;

            if (winnerSide === 'wolf') {
                pointSwing[gameState.wolfIndex] = val;
                pointSwing[currentHoleData.partnerIndex] = val;
            } else if (winnerSide === 'pack') {
                gameState.players.forEach((p, i) => {
                    if (i !== gameState.wolfIndex && i !== currentHoleData.partnerIndex) {
                        pointSwing[i] = val;
                    }
                });
            }
        }
    }

    saveHoleToHistory(winnerSide, points, pointSwing, carry);
    gameState.players.forEach((p, i) => { p.score += pointSwing[i]; });
    saveToPhone();
    moveToNextHole();
}

// TIE MODAL FUNCTIONS
function showTieModal(msg) {
    const modal = document.getElementById('tie-modal');
    if (modal) {
        const p = modal.querySelector('p');
        if (p) p.innerText = msg;
        modal.style.display = 'flex';
    } else {
        // Fallback if modal not present
        if (confirm(msg)) confirmTie();
    }
}

function hideTieModal() {
    const modal = document.getElementById('tie-modal');
    if (modal) modal.style.display = 'none';
}

function confirmTie() {
    hideTieModal();
    resolveHole('tie');
}

function submitScores() {
    const inputs = document.querySelectorAll('.wulf-score-input');
    let scores = new Array(gameState.players.length).fill(0);
    let allFilled = true;

    inputs.forEach(input => {
        const val = parseInt(input.value);
        const idx = parseInt(input.getAttribute('data-player-index'));
        if (isNaN(val)) allFilled = false;
        else scores[idx] = val;
    });

    if (!allFilled) {
        alert("Please enter scores for all players.");
        return;
    }

    const result = automateWinner(scores);
    if (result === 'WOLF_WIN') {
        if (confirm("Wolf Team Wins! Confirm?")) resolveHole('wolf');
    } else if (result === 'PACK_WIN') {
        if (confirm("The Pack Wins! Confirm?")) resolveHole('pack');
    } else {
        // TIE
        showTieModal("Hole is a push. No points awarded. Provide to next hole?");
    }
}

function saveHoleToHistory(winnerSide, pointsAwarded, pointSwing, carryConsumed = 0) {
    let mode = 'Partner';
    if (currentHoleData.isBlind) mode = 'Blind';
    else if (currentHoleData.isLoneWolf) mode = 'Lone';

    let partnerDisplay = "";
    if (mode === 'Partner') {
        partnerDisplay = '+ ' + gameState.players[currentHoleData.partnerIndex].name;
    } else {
        partnerDisplay = `(${mode})`;
    }

    const holeRecord = {
        number: gameState.currentHole,
        wolf: gameState.players[gameState.wolfIndex].name,
        partner: partnerDisplay,
        result: winnerSide === 'wolf' ? 'Wolf' : (winnerSide === 'pack' ? 'Pack' : 'Tie'),
        winnerSide: winnerSide, // Explicit for undo logic
        points: pointsAwarded,
        pointSwing: pointSwing,
        wolfIndexWas: gameState.wolfIndex,
        carryConsumed: carryConsumed
    };

    gameState.history.unshift(holeRecord);
}

function renderHistory() {
    const container = document.getElementById('history-list');
    if (!container) return;
    container.innerHTML = '';
    gameState.history.forEach(hole => {
        const entry = document.createElement('div');
        entry.style.cssText = "display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid #333; font-size:0.9rem; align-items:center;";

        const resultColor = hole.result === 'Wolf' ? 'var(--neon-green)' : '#ef4444';
        const partnerText = hole.partner.includes('Blind') || hole.partner.includes('Lone') ? hole.partner : `& ${hole.partner.replace('+ ', '')}`;

        entry.innerHTML = `
            <div>
                <span style="color:#666; font-weight:bold; margin-right:10px;">${hole.number}</span>
                <span style="color:white;">${hole.wolf} <span style="color:#888;">${partnerText}</span></span>
            </div>
            <div style="color:${resultColor}; font-family:monospace; font-weight:bold;">
                ${hole.result === 'Wolf' ? 'W' : 'P'} <span style="font-size:0.8rem; opacity:0.8;">+${hole.points}</span>
            </div>
        `;
        container.appendChild(entry);
    });
}

function undoLastHole() {
    if (gameState.history.length === 0) return;

    // Check for presses on this hole and revert
    if (gameState.pressLog && gameState.pressLog.length > 0) {
        // Filter out presses from the hole we are undoing
        const pressesToRevert = gameState.pressLog.filter(p => p.hole === gameState.currentHole);
        const pressesKeep = gameState.pressLog.filter(p => p.hole !== gameState.currentHole);

        if (pressesToRevert.length > 0) {
            // Revert wager basis (Divide by 2 for each press)
            pressesToRevert.forEach(() => {
                gameState.currentWagerBasis /= 2;
            });
            gameState.pressLog = pressesKeep;
        }
    }

    const lastHole = gameState.history.shift();

    // Reverse Score Swing
    lastHole.pointSwing.forEach((points, index) => { gameState.players[index].score -= points; });

    // Reverse Carry Over Logic
    if (lastHole.winnerSide === 'tie') {
        // If last hole was a tie, it added to the pot. We must remove that.
        // We need to know how much was added. 
        // Simplified: Assume 2 * currentWagerBasis (approx, though wager might have changed)
        // Better: Store 'carryAdded' in history? 
        // For now, let's just deduct valid approximation or 0 if undefined.
        // gameState.carryOver -= (lastHole.carryAdded || 0);

        // Actually, let's look at `resolveHole` logic. It added `2 * mult`.
        // Since we don't store exact amount added, we might drift. 
        // Let's simply allow 'Undo' to be permissive or just accept minor drift in edge cases.
        // CRITICAL: If we don't fix carryOver, replaying the tie will double-add.
        // Let's calculate what WOULD have been added.
        const mult = (gameState.currentWagerBasis && gameState.settings.basePointValue)
            ? (gameState.currentWagerBasis / gameState.settings.basePointValue)
            : 1;
        const valStart = 2 * mult;
        if (gameState.carryOver >= valStart) {
            gameState.carryOver -= valStart;
        }
    } else {
        // If someone WON, restore any carry they claimed
        if (lastHole.carryConsumed && lastHole.carryConsumed > 0) {
            gameState.carryOver = (gameState.carryOver || 0) + lastHole.carryConsumed;
        }
    }

    gameState.currentHole--;

    // Reset any hole data just in case
    currentHoleData = { wolfIndex: 0, partnerIndex: null, isLoneWolf: false, isBlind: false };

    if (document.getElementById('leaderboard-screen').style.display === 'block') {
        document.getElementById('selection-screen').style.display = 'block';
        document.getElementById('leaderboard-screen').style.display = 'none';
        document.getElementById('summary-screen').style.display = 'none';
    }

    saveToPhone();
    renderHole();
}

function moveToNextHole() {
    gameState.currentHole++;
    // Game Over Check
    if (gameState.currentHole > gameState.totalHoles) {
        showFinalResults();
    } else {
        document.getElementById('scoring-screen').style.display = 'none';
        document.getElementById('selection-screen').style.display = 'block';
        renderHole();
    }
}

function goBackToSelection() {
    document.getElementById('scoring-screen').style.display = 'none';
    document.getElementById('selection-screen').style.display = 'block';
}

function addTrash(playerIndex) {
    gameState.players[playerIndex].trash++;
    saveToPhone();
    showFinalResults();
}

function showFinalResults() {
    document.getElementById('selection-screen').style.display = 'none';
    document.getElementById('scoring-screen').style.display = 'none';
    document.getElementById('leaderboard-screen').style.display = 'block';

    const listContainer = document.getElementById('leaderboard-list');
    listContainer.innerHTML = '';

    const rankedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

    rankedPlayers.forEach((player, index) => {
        const originalIndex = gameState.players.indexOf(player);
        const row = document.createElement('div');
        row.className = `leaderboard-row rank-${index + 1}`;

        let medal = '';
        if (index === 0) medal = '🥇';
        if (index === 1) medal = '🥈';
        if (index === 2) medal = '🥉';

        row.innerHTML = `
            <div style="flex:1;">
                <span class="rank-num" style="display:inline-block; width:25px; font-size:0.9rem; color:#888; font-weight:bold;">${index + 1}</span>
                <span class="player-name" style="font-size:1.1rem; font-weight:bold;">${medal} ${player.name}</span>
            </div>
            <div style="display:flex; align-items:center; gap:15px;">
                <div style="text-align:center;">
                    <button onclick="addTrash(${originalIndex})" style="padding:5px 10px; font-size:0.8rem; height:auto; background:#333; margin:0; border-radius:8px; width:auto; border:1px solid #555;">
                      🗑️ ${player.trash}
                    </button>
                </div>
                <span class="player-score" style="font-size:1.4rem;">${player.score}</span>
            </div>
        `;
        listContainer.appendChild(row);
    });

    calculatePayouts();
}

function calculateWagerSettlement() {
    // Determine value: try input first (if exists), then fallback to game settings
    const inputVal = document.getElementById('point-value'); // Legacy input if exists
    let pointValue = 1.0;

    if (gameState.settings && gameState.settings.basePointValue) {
        pointValue = gameState.settings.basePointValue;
    } else if (inputVal) {
        pointValue = parseFloat(inputVal.value) || 1.0;
    }

    let settlementReport = [];

    gameState.players.forEach(playerA => {
        let totalBalance = 0;

        gameState.players.forEach(playerB => {
            if (playerA !== playerB) {
                // You win/lose the difference in points against every other player
                totalBalance += (playerA.score - playerB.score) * pointValue;
            }
        });

        settlementReport.push({
            name: playerA.name,
            balance: totalBalance // Positive is what they are owed, negative is what they owe
        });
    });

    return settlementReport;
}

function calculatePayouts() {
    const settlements = calculateWagerSettlement();

    // Sort for display
    settlements.sort((a, b) => b.balance - a.balance);

    let summaryHTML = "<ul style='padding-left:0; list-style:none; margin:0;'>";
    settlements.forEach(s => {
        const color = s.balance >= 0 ? 'var(--neon-green)' : '#ef4444';
        const sign = s.balance >= 0 ? '+' : '';
        // Subtle background for row
        const bg = 'transparent';

        summaryHTML += `<li style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid #333; background:${bg};">
    <span style="font-weight:500;">${s.name}</span>
    <span style="color:${color}; font-weight:bold; font-family:'Courier New';">${sign}$${s.balance.toFixed(2)}</span>
</li>`;
    });
    summaryHTML += "</ul>";

    const container = document.getElementById('payout-instructions');
    if (container) container.innerHTML = summaryHTML;
}

// ----------------------------------------------------
// RECAP & SHARING
// ----------------------------------------------------

function showRecapScreen() {
    document.getElementById('leaderboard-screen').style.display = 'none';
    document.getElementById('summary-screen').style.display = 'block';

    const settlements = calculateWagerSettlement();
    settlements.sort((a, b) => b.balance - a.balance);

    const listContainer = document.getElementById('summary-list');
    listContainer.innerHTML = '';

    // Summary List
    let html = "<ul style='padding:0; list-style:none;'>";
    settlements.forEach(s => {
        const color = s.balance >= 0 ? 'var(--neon-green)' : '#ef4444';
        const sign = s.balance >= 0 ? '+' : '';

        html += `
        <li style="display:flex; justify-content:space-between; padding:15px 0; border-bottom:1px solid #333; font-size:1.1rem;">
            <span style="color:white; font-weight:bold;">${s.name}</span>
            <span style="color:${color}; font-family:'Courier New', monospace; font-weight:bold;">${sign}$${s.balance.toFixed(2)}</span>
        </li>
       `;
    });
    html += "</ul>";
    listContainer.innerHTML = html;

    // --- ROUND LOG ---
    const scoreLog = document.getElementById('score-history');
    if (scoreLog) {
        scoreLog.innerHTML = "";
        if (!gameState.history || gameState.history.length === 0) {
            scoreLog.innerHTML = "<li>No holes played.</li>";
        } else {
            // Show latest on top
            gameState.history.slice().reverse().forEach(h => {
                const li = document.createElement('li');
                li.style.padding = "10px 0";
                li.style.borderBottom = "1px solid #222";
                li.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:#aaa;">Hole ${h.number}: <strong>${h.wolf}</strong> ${h.partner}</span>
                        <span style="color:${h.result === 'Wolf' ? '#7cfc00' : '#3b82f6'}; font-weight:bold; font-size:0.9rem;">
                            ${h.result.toUpperCase()} (+${h.points})
                        </span>
                    </div>
                `;
                scoreLog.appendChild(li);
            });
        }
    }

    // --- PRESS HISTORY ---
    const pressLogList = document.getElementById('press-history-below-log');
    if (pressLogList) {
        pressLogList.innerHTML = "";
        if (!gameState.pressLog || gameState.pressLog.length === 0) {
            pressLogList.innerHTML = "<li>No presses.</li>";
        } else {
            gameState.pressLog.forEach(entry => {
                const li = document.createElement('li');
                li.style.padding = "8px 0";
                li.style.borderBottom = "1px solid #222";
                li.innerHTML = `<span style="color:#ef4444;">Hole ${entry.hole}</span>: <strong>Stakes -> $${entry.newAmount.toFixed(2)}</strong>`;
                pressLogList.appendChild(li);
            });
        }
    }
}

function generateRecap() {
    let summaryText = "WÜLF ROUND RECAP 🏁\n";
    // Reuse calculation logic
    const settlements = calculateWagerSettlement();
    // Sort descending
    settlements.sort((a, b) => b.balance - a.balance);

    settlements.forEach(player => {
        const sign = player.balance >= 0 ? "+" : "";
        summaryText += `${player.name}: ${sign}$${player.balance.toFixed(2)}\n`;
    });

    // Add Wager Context
    summaryText += `\n(Wager Base: $${gameState.settings.basePointValue})`;

    return summaryText;
}

function copyToClipboard() {
    const text = generateRecap();

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            alert("Recap copied to clipboard! 📋");
        }).catch(err => {
            console.error('Failed to copy: ', err);
            // Fallback
            prompt("Copy this text:", text);
        });
    } else {
        // Fallback for older browsers or insecure context
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert("Recap copied to clipboard! 📋");
    }
}

function generateShareQR() {
    const currentUrl = window.location.href;
    const qrContainer = document.getElementById('qr-code-display');
    if (qrContainer) {
        qrContainer.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentUrl)}`;
    }
}

function togglePrivacy() {
    const isLocked = document.getElementById('privacy-toggle').checked;
    console.log("Scoring Locked:", isLocked);
}


// ----------------------------------------------------
// GHIN SEARCH LOGIC
// ----------------------------------------------------
window.fetchGhin = async function (playerIndex, btnElement) {
    const inputHcp = document.getElementById(`p${playerIndex}-hcp`);
    const nameInput = document.getElementById(`p${playerIndex}-name`);

    // HCP div is contenteditable, get innerText
    const val = inputHcp.innerText.replace('HCP', '').trim();
    const nameVal = nameInput.value.trim();

    // Smart API Discovery
    let apiBase = window.API_BASE || '';
    if (!apiBase) {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            apiBase = 'http://localhost:3001';
        } else if (window.location.hostname.includes('samtierney10.com')) {
            // If we're on the main domain but getting 404s, 
            // the server might be running on 3001 and not proxied.
            apiBase = window.location.protocol + '//' + window.location.hostname + ':3001';
        }
    }

    let url = '';

    // Check if HCP box has a GHIN ID (digits only, length >= 5 generally)
    if (val && /^\d+$/.test(val) && val.length > 4) {
        // Numeric -> GHIN ID search
        url = `${apiBase}/api/handicaps/${val}`;
    } else if (nameVal) {
        // Clean up name: remove common separators like commas or dots
        const cleanedName = nameVal.replace(/[,.]/g, ' ').trim();
        const parts = cleanedName.split(/\s+/);

        let state = 'IA'; // Default fallback
        const US_STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

        const potentialState = parts[parts.length - 1].toUpperCase();
        if (US_STATES.includes(potentialState)) {
            state = potentialState;
            parts.pop();
        }

        let firstName = '';
        let lastName = '';

        if (parts.length > 1) {
            lastName = parts.pop();
            firstName = parts.join(' ');
        } else if (parts.length === 1) {
            lastName = parts[0];
        }

        url = `${apiBase}/api/handicaps/search?last_name=${encodeURIComponent(lastName)}`;
        if (firstName) url += `&first_name=${encodeURIComponent(firstName)}`;
        if (state) url += `&state=${encodeURIComponent(state)}`;

        window.lastSearchState = state;
        console.log(`[GHIN Fetch] URL: ${url}`);
    } else {
        alert("Please enter a GHIN number in the box OR a Player Name.");
        return;
    }

    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = '⏳';

    try {
        const response = await fetch(url);
        let data;

        try {
            data = await response.json();
        } catch (jsonErr) {
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`The GHIN API was not found (404). If you are using samtierney10.com, please ensure the Node.js server is running and accessible at ${apiBase}`);
                }
                throw new Error(`Server returned ${response.status}: ${response.statusText}.`);
            }
            throw new Error("Invalid response from server");
        }

        if (!response.ok) {
            const errorMsg = data.details || data.error || `Error ${response.status}: ${response.statusText}`;
            throw new Error(errorMsg);
        }

        if (Array.isArray(data)) {
            if (data.length === 0) {
                throw new Error("No golfers found with that name in " + (window.lastSearchState || 'default region'));
            } else if (data.length === 1) {
                const p = data[0];
                nameInput.value = p.name;
                inputHcp.innerText = p.handicap_index;
                inputHcp.classList.add('active-hcp');
                inputHcp.setAttribute('title', `GHIN: ${p.ghin}`);
            } else {
                showGolferSelectionModal(data, (selected) => {
                    nameInput.value = selected.name;
                    inputHcp.innerText = selected.handicap_index;
                    inputHcp.classList.add('active-hcp');
                    inputHcp.setAttribute('title', `GHIN: ${selected.ghin}`);
                });
            }
        } else {
            // Single object
            if (data.name) nameInput.value = data.name;
            if (data.handicap_index !== undefined) {
                inputHcp.innerText = data.handicap_index;
                inputHcp.classList.add('active-hcp');
                inputHcp.setAttribute('title', `GHIN: ${data.ghin}`);
            }
        }

        btnElement.innerHTML = '✅';
        setTimeout(() => btnElement.innerHTML = originalText, 2000);

    } catch (e) {
        console.error("Fetch Error:", e);

        let message = e.message;
        if (message === "Failed to fetch") {
            message = "Could not connect to the search server. Ensure the Node.js backend is running (Port 3001 for Wolf).";
        }

        if (window.location.protocol === 'file:') {
            alert("⚠️ Connection Error: GHIN Search requires the local server.\n\nPlease open http://localhost:3001 in your browser.");
        } else {
            alert("Search Error: " + message);
        }
        btnElement.innerHTML = '❌';
        setTimeout(() => btnElement.innerHTML = originalText, 2000);
    }
};

function showGolferSelectionModal(golfers, callback) {
    const existing = document.getElementById('golfer-select-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'golfer-select-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85); backdrop-filter: blur(5px);
        display: flex; justify-content: center; align-items: center; z-index: 10000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: var(--card-bg, #1e2126); border: 1px solid var(--neon-green);
        padding: 20px; border-radius: 12px; max-width: 400px; width: 90%;
        max-height: 80vh; overflow-y: auto; text-align: center;
    `;

    const title = document.createElement('h3');
    title.textContent = "Select Golfer";
    title.style.color = "white";
    content.appendChild(title);

    const list = document.createElement('div');
    list.style.cssText = "display: flex; flex-direction: column; gap: 10px; margin-top: 15px;";

    golfers.slice(0, 50).forEach(g => {
        const btn = document.createElement('button');
        btn.style.cssText = `
            background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
            padding: 10px; color: white; border-radius: 6px; cursor: pointer; text-align: left;
        `;
        btn.innerHTML = `
            <div style="font-weight:bold; color:var(--neon-green)">${g.name}</div>
            <div style="font-size:0.8rem; color:#aaa;">HCP: ${g.handicap_index} | GHIN: ${g.ghin}</div>
            <div style="font-size:0.75rem; color:#888;">${g.club || ''} (${g.state})</div>
        `;
        btn.onclick = () => {
            callback(g);
            modal.remove();
        };
        list.appendChild(btn);
    });

    const cancel = document.createElement('button');
    cancel.textContent = "Cancel";
    cancel.style.cssText = "margin-top: 15px; padding: 8px 16px; background: #444; color: white; border: none; border-radius: 4px; cursor: pointer;";
    cancel.onclick = () => modal.remove();

    content.appendChild(list);
    content.appendChild(cancel);
    modal.appendChild(content);
    document.body.appendChild(modal);
}
