
import sys

try:
    with open('script.js', 'r') as f:
        lines = f.readlines()
except Exception as e:
    print(f"Error reading file: {e}")
    sys.exit(1)

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if "this.state.gameMode === 'roll'" in line and "if" in line:
        start_idx = i
    if "this.state.gameMode === 'umbrella'" in line and "else if" in line:
        end_idx = i

print(f"Start: {start_idx}, End: {end_idx}")

if start_idx != -1 and end_idx != -1:
    # Construct new content
    new_content = lines[:start_idx]
    
    patch = """        if (this.state.gameMode === 'roll') {
            const pressTotal = (this.state.holeState.presses || []).reduce((a, b) => a + b, 0);
            
            // Match Bet Calculation
            const matchBet = (this.state.settings.baseBet * this.state.holeState.multiplier) + pressTotal;
            let amount = matchBet;

            if (this.state.settings.enableHiLow) {
                // --- HI-LOW MODE ---
                let netSwing = 0;
                
                // 1. Low Net (Match Point)
                const lowUnit = matchBet;
                if (t1Best < t2Best) netSwing += lowUnit;
                else if (t2Best < t1Best) netSwing -= lowUnit;

                // 2. High Net (Side Point)
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

                // Auto-Press Logic
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
"""
    new_content.append(patch + "\n")
    
    new_content.extend(lines[end_idx:])
    
    with open('script.js', 'w') as f:
        f.writelines(new_content)
    print("File updated successfully.")
else:
    print("Could not find markers.")
