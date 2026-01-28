if (this.state.gameMode === 'roll') {
    const pressTotal = (this.state.holeState.presses || []).reduce((a, b) => a + b, 0);

    // Match Bet Calculation
    // Standard: Base * Mult + PressTotal.
    const matchBet = (this.state.settings.baseBet * this.state.holeState.multiplier) + pressTotal;

    if (this.state.settings.enableHiLow) {
        // --- HI-LOW MODE ---
        // Replaces Standard Match Payout.
        // Low Point (Best Ball) + High Point (Worst Ball).

        let netSwing = 0;

        // 1. Low Net (Match Point - inherits presses)
        const lowUnit = matchBet;
        if (t1Best < t2Best) netSwing += lowUnit;
        else if (t2Best < t1Best) netSwing -= lowUnit;

        // 2. High Net (Side Point - flat base bet)
        // "If there is a tie, then no money is won by either team for that side"
        const highUnit = this.state.settings.baseBet;
        const t1Worst = Math.max(n1, n2);
        const t2Worst = Math.max(n3, n4);

        if (t1Worst < t2Worst) netSwing += highUnit;
        else if (t2Worst < t1Worst) netSwing -= highUnit;

        // Update Balance
        if (netSwing !== 0) {
            this.state.teams.team1.balance += netSwing;
            this.state.teams.team2.balance -= netSwing;
        }

        // History
        amount = Math.abs(netSwing);
        if (netSwing > 0) winner = 'team1';
        else if (netSwing < 0) winner = 'team2';
        else winner = 'tie';

        if (t1Best < t2Best) this.state.honor = 'team1';
        else if (t2Best < t1Best) this.state.honor = 'team2';

        // Auto-Press Logic:
        // "The new value is the starting bet on the next hole"
        if ((this.state.holeState.presses || []).length > 0) {
            this.state.settings.baseBet = matchBet;
        }

    } else {
        // --- STANDARD MATCH PLAY ---
        amount = matchBet;

        if (t1Best < t2Best) {
            winner = 'team1';
            this.state.teams.team1.balance += amount;
            this.state.teams.team2.balance -= amount;
            this.state.honor = 'team1';
        } else if (t2Best < t1Best) {
            winner = 'team2';
            this.state.teams.team2.balance += amount;
            this.state.teams.team1.balance -= amount;
            this.state.honor = 'team2';
        } else {
            winner = 'tie';
        }

        // Auto-Press Logic
        if ((this.state.holeState.presses || []).length > 0) {
            this.state.settings.baseBet = amount;
        }
    }
} else if (this.state.gameMode === 'umbrella') {
