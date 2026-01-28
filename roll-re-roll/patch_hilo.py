
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
    if "AUTO-PRESS RULE:" in line:
        start_idx = i
    if "this.state.gameMode === 'umbrella'" in line and "else if" in line:
        end_idx = i

print(f"Start: {start_idx}, End: {end_idx}")

if start_idx != -1 and end_idx != -1:
    # Construct new content
    new_content = lines[:start_idx]
    
    patch = """            // --- HI-LOW SIDE BET LOGIC ---
            if (this.state.settings.enableHiLow) {
                let netSwing = 0;
                
                // 1. Low Point (Best Ball)
                if (t1Best < t2Best) netSwing += currentPoint;
                else if (t2Best < t1Best) netSwing -= currentPoint;

                // 2. High Point (Worst Ball)
                const t1Worst = Math.max(n1, n2);
                const t2Worst = Math.max(n3, n4);

                if (t1Worst < t2Worst) netSwing += currentPoint; 
                else if (t2Worst < t1Worst) netSwing -= currentPoint;

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
                
                // Honor
                if (t1Best < t2Best) this.state.honor = 'team1';
                else if (t2Best < t1Best) this.state.honor = 'team2';
            }

            // AUTO-PRESS RULE: Update Base Bet for Next Hole (Persist Presses)
            if ((this.state.holeState.presses || []).length > 0) {
                 this.state.settings.baseBet = this.state.settings.baseBet + pressTotal;
            }
"""
    new_content.append(patch)
    
    new_content.extend(lines[end_idx:])
    
    with open('script.js', 'w') as f:
        f.writelines(new_content)
    print("File updated successfully.")
else:
    print("Could not find markers.")
