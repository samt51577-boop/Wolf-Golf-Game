
import sys

log = []
try:
    with open('script.js', 'r') as f:
        lines = f.readlines()
    log.append(f"Read {len(lines)} lines.")
except Exception as e:
    log.append(f"Error reading: {e}")

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if "// --- HI-LOW SIDE BET LOGIC ---" in line:
        start_idx = i
    if "this.state.gameMode === 'umbrella'" in line and "else if" in line:
        end_idx = i

log.append(f"Found markers: Start={start_idx}, End={end_idx}")

if start_idx != -1 and end_idx != -1:
    # Construct new content
    # Keep lines before Hi-Low block
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
    new_content.append(patch + "\n") # Ensure newline
    
    # Keep lines from 'else if umbrella' onwards
    # end_idx is the line with 'else if (umbrella)'. We want to KEEP this line.
    new_content.extend(lines[end_idx:])
    
    with open('script.js', 'w') as f:
        f.writelines(new_content)
    log.append("File written successfully.")
else:
    log.append("Markers not found.")

with open('patch_log.txt', 'w') as f:
    f.write('\n'.join(log))
