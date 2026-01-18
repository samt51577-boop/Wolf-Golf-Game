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
    }
};

let gameState = JSON.parse(JSON.stringify(initialState));

// Track current hole alliance & data
let currentHoleData = {
    wolfIndex: 0,
    partnerIndex: null, // null if Lone Wolf
    isLoneWolf: false,
    isBlind: false
};

// COURSE DATA - WILLOW CREEK
// Note: SI is Stroke Index (Difficulty). 1 is hardest, 18 is easiest.
const willowCreekData = {
    name: "Willow Creek",
    si: [9, 5, 1, 15, 7, 13, 11, 17, 3, 6, 8, 16, 12, 10, 2, 18, 4, 14],
    par: [4, 5, 4, 3, 5, 4, 4, 3, 4, 4, 4, 3, 4, 4, 4, 3, 5, 4]
};

// ----------------------------------------------------
// BOOT SEQUENCE
// ----------------------------------------------------
function bootApp() {
    const saved = localStorage.getItem('wolfLedgerSave');
    // Ensure updatePlayerRows is called to set initial state correctly
    // But if we have a save, we might hide setup anyway.
    updatePlayerRows();

    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data && data.players && data.players.length > 0) {
                const confirmResume = confirm(`Resume existing game on Hole ${data.currentHole}?`);
                if (confirmResume) {
                    loadSavedGame(data);
                    return;
                }
            }
        } catch (e) {
            console.error("Save file corrupted", e);
        }
    }
    // New Game Setup
    document.getElementById('setup-screen').style.display = 'block';
    const views = document.querySelectorAll('.game-view');
    views.forEach(v => v.style.display = 'none');
}

function loadSavedGame(data) {
    gameState = data;
    if (!gameState.settings) gameState.settings = initialState.settings;

    // Fallback for legacy saves without activeCourse
    if (!gameState.activeCourse) gameState.activeCourse = willowCreekData;

    document.getElementById('setup-screen').style.display = 'none';
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
        // logic: if we have saved data use it, otherwise use defaults for first user
        let savedName = '';
        let savedHcp = 'HCP';

        if (i < currentData.length) {
            savedName = currentData[i].name;
            savedHcp = currentData[i].hcp;
        } else if (isUser) {
            // Defaults for fresh rows if not present
            savedName = 'Sam';
            savedHcp = '10.2';
        }

        // Clean up HCP text to ensure valid class detection
        const hcpText = savedHcp.trim();
        const hcpClass = (hcpText !== 'HCP' && hcpText !== '') ? 'active-hcp' : '';

        const rowHtml = `
            <div class="player-entry-group">
                <label class="player-label">Player ${i + 1}${isUser ? ' (You)' : ''}</label>
                <div class="player-inputs">
                    <input type="text" class="name-input" placeholder="Name" value="${savedName}">
                    <div class="hcp-input ${hcpClass}" 
                         contenteditable="true" 
                         oninput="handleHcpInput(this)">
                        ${savedHcp}
                    </div>
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

    // Set Active Course (Willow Creek Default) - Matches user request
    gameState.activeCourse = willowCreekData;

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
        renderHole();
    } else {
        if (players.length < 3) alert("Need at least 3 players.");
        else alert("The pack isn't ready. Please check all names and handicaps.");
    }
}

// ----------------------------------------------------
// CORE LOGIC
// ----------------------------------------------------
function getWolfForHole(holeNumber) {
    if (holeNumber <= 15) {
        return (holeNumber - 1) % gameState.players.length;
    } else {
        // Last Place picks logic
        const standings = gameState.players.map((p, i) => ({ index: i, score: p.score }));
        standings.sort((a, b) => a.score - b.score);
        return standings[0].index;
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

    for (let i = 1; i <= 3; i++) {
        let nextWolfIdx = (gameState.currentHole + i - 1) % gameState.players.length;
        // Note: Logic above uses hole number based rotation. 
        // Actual logic: getWolfForHole uses (hole-1)%count usually.
        // Let's reuse getWolfForHole simply
        let idx = getWolfForHole(gameState.currentHole + i);
        if (gameState.players[idx]) {
            upcoming.push(gameState.players[idx].name);
        }
    }
    return upcoming.join(', ');
}

function togglePress() {
    alert("Press feature coming soon! 🔨");
}

function renderSelectionScreen() {
    const wolf = gameState.players[gameState.wolfIndex];
    document.getElementById('display-wolf-name').innerText = wolf.name;

    // Update Header
    const holeNum = gameState.currentHole;
    document.getElementById('selection-hole-num').innerText = holeNum;
    const holeIdx = holeNum - 1;

    // Active Course Logic or Fallback
    const si = (gameState.activeCourse && gameState.activeCourse.si[holeIdx]) || willowCreekData.si[holeIdx];
    document.getElementById('selection-hole-si').innerText = si;

    const container = document.getElementById('partner-buttons');
    container.innerHTML = '';

    if (gameState.currentHole > 15) {
        document.getElementById('display-wolf-name').innerText += " (Last Place)";
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
                // Use wulf-dot class as defined in stylesheet
                dotHtml = '<span class="wulf-dot">●</span>';
            }

            const btn = document.createElement('button');
            btn.className = 'wulf-blue-btn';

            btn.innerHTML = `SELECT ${player.name.toUpperCase()} (${player.hcp}) ${dotHtml}`;
            btn.onclick = () => selectAlliance(index);
            container.appendChild(btn);
        }
    });

    // Update Betting Tools
    const wagerEl = document.getElementById('current-wager-display');
    if (wagerEl) {
        const val = (gameState.settings && gameState.settings.basePointValue) ? gameState.settings.basePointValue : 1.00;
        wagerEl.innerText = val.toFixed(2);
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

function renderHandicapDots(playerIndex, holeIdx) {
    if (!gameState.players || gameState.players.length === 0) return '';
    const minHcp = Math.min(...gameState.players.map(p => p.hcp));
    const strokeGap = Math.round(gameState.players[playerIndex].hcp - minHcp);

    // Safety check for SI data using activeCourse
    const siList = (gameState.activeCourse && gameState.activeCourse.si) ? gameState.activeCourse.si : willowCreekData.si;
    const holeSI = siList[holeIdx] || 18;

    let dots = '';

    // One dot if the Stroke Index is within the gap
    if (holeSI <= strokeGap) {
        dots += '<span class="stroke-dot" style="color:var(--neon-green)">●</span>';
    }

    // Second dot for gaps greater than 18
    if (strokeGap > 18 && holeSI <= (strokeGap - 18)) {
        dots += '<span class="stroke-dot" style="color:var(--neon-green)">●</span>';
    }

    return dots;
}

function showScoringScreen() {
    document.getElementById('selection-screen').style.display = 'none';
    document.getElementById('scoring-screen').style.display = 'block';

    // 1. Update Header Info
    const holeNum = gameState.currentHole;
    document.getElementById('scoring-hole-num').innerText = holeNum;

    const holeIdx = holeNum - 1;
    // Use activeCourse
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
                <input type="number" class="wulf-score-input" placeholder="Gross" style="width: 80px; padding: 10px; border-radius: 8px; border: 1px solid #333; background: #222; color: white; text-align: center; font-size: 16px;">
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

function resolveHole(winnerSide) {
    let pointSwing = new Array(gameState.players.length).fill(0);
    // Determine base points per stake
    let points = 0;

    if (currentHoleData.isBlind) {
        if (winnerSide === 'wolf') {
            pointSwing[gameState.wolfIndex] = 6;
            points = 6;
        } else {
            gameState.players.forEach((p, i) => { if (i !== gameState.wolfIndex) pointSwing[i] = 4; });
            points = 4;
        }
    } else if (currentHoleData.isLoneWolf) {
        if (winnerSide === 'wolf') {
            pointSwing[gameState.wolfIndex] = 4;
            points = 4;
        } else {
            gameState.players.forEach((p, i) => { if (i !== gameState.wolfIndex) pointSwing[i] = 1; });
            points = 1;
        }
    } else {
        if (winnerSide === 'wolf') {
            pointSwing[gameState.wolfIndex] = 2;
            pointSwing[currentHoleData.partnerIndex] = 2;
            points = 2;
        } else {
            gameState.players.forEach((p, i) => {
                if (i !== gameState.wolfIndex && i !== currentHoleData.partnerIndex) {
                    pointSwing[i] = 3;
                }
            });
            points = 3;
        }
    }

    gameState.players.forEach((p, i) => { p.score += pointSwing[i]; });
    saveHoleToHistory(winnerSide, points, pointSwing);
    saveToPhone();
    moveToNextHole();
}

function saveHoleToHistory(winnerSide, pointsAwarded, pointSwing) {
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
        result: winnerSide === 'wolf' ? 'Wolf' : 'Pack',
        points: pointsAwarded,
        pointSwing: pointSwing,
        wolfIndexWas: gameState.wolfIndex
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
    const lastHole = gameState.history.shift();
    lastHole.pointSwing.forEach((points, index) => { gameState.players[index].score -= points; });
    gameState.currentHole--;

    if (document.getElementById('leaderboard-screen').style.display === 'block') {
        document.getElementById('selection-screen').style.display = 'block';
        document.getElementById('leaderboard-screen').style.display = 'none';
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

    // We reuse the list style but make it prominent
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
