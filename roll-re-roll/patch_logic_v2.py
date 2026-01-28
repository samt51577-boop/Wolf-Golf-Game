
import os

file_path = 'script.js'
with open(file_path, 'r') as f:
    lines = f.readlines()

new_lines = []
start_index = -1
end_index = -1

for i, line in enumerate(lines):
    if "if (this.state.gameMode === 'roll') {" in line:
        start_index = i
    if "} else if (this.state.gameMode === 'umbrella') {" in line:
        end_index = i

if start_index != -1 and end_index != -1:
    # Keep lines before roll block
    new_lines.extend(lines[:start_index])
    
    # Insert New Logic
    new_lines.append("        if (this.state.gameMode === 'roll') {\n")
    new_lines.append("            const pressTotal = (this.state.holeState.presses || []).reduce((a, b) => a + b, 0);\n")
    new_lines.append("            \n")
    new_lines.append("            // Match Bet Calculation\n")
    new_lines.append("            const matchBet = (this.state.settings.baseBet * this.state.holeState.multiplier) + pressTotal;\n")
    new_lines.append("            let amount = matchBet;\n\n")
    
    new_lines.append("            if (this.state.settings.enableHiLow) {\n")
    new_lines.append("                // --- HI-LOW MODE ---\n")
    new_lines.append("                let netSwing = 0;\n")
    new_lines.append("                \n")
    new_lines.append("                // 1. Low Net (Match Point)\n")
    new_lines.append("                const lowUnit = matchBet;\n")
    new_lines.append("                if (t1Best < t2Best) netSwing += lowUnit;\n")
    new_lines.append("                else if (t2Best < t1Best) netSwing -= lowUnit;\n\n")
    
    new_lines.append("                // 2. High Net (Side Point)\n")
    new_lines.append("                const highUnit = this.state.settings.baseBet;\n")
    new_lines.append("                const t1Worst = Math.max(n1, n2);\n")
    new_lines.append("                const t2Worst = Math.max(n3, n4);\n\n")
    
    new_lines.append("                if (t1Worst < t2Worst) netSwing += highUnit;\n")
    new_lines.append("                else if (t2Worst < t1Worst) netSwing -= highUnit;\n\n")
    
    new_lines.append("                // Update Balance\n")
    new_lines.append("                if (netSwing !== 0) {\n")
    new_lines.append("                    this.state.teams.team1.balance += netSwing;\n")
    new_lines.append("                    this.state.teams.team2.balance -= netSwing;\n")
    new_lines.append("                }\n\n")
    
    new_lines.append("                // History\n")
    new_lines.append("                amount = Math.abs(netSwing);\n")
    new_lines.append("                if (netSwing > 0) winner = 'team1';\n")
    new_lines.append("                else if (netSwing < 0) winner = 'team2';\n")
    new_lines.append("                else winner = 'tie';\n\n")
    
    new_lines.append("                if (t1Best < t2Best) this.state.honor = 'team1';\n")
    new_lines.append("                else if (t2Best < t1Best) this.state.honor = 'team2';\n\n")
    
    new_lines.append("                // Auto-Press Logic\n")
    new_lines.append("                if ((this.state.holeState.presses || []).length > 0) {\n")
    new_lines.append("                    this.state.settings.baseBet = matchBet;\n")
    new_lines.append("                }\n\n")
    
    new_lines.append("            } else {\n")
    new_lines.append("                // --- STANDARD MATCH PLAY ---\n")
    new_lines.append("                amount = matchBet;\n\n")
    
    new_lines.append("                if (t1Best < t2Best) {\n")
    new_lines.append("                    winner = 'team1';\n")
    new_lines.append("                    this.state.teams.team1.balance += amount;\n")
    new_lines.append("                    this.state.teams.team2.balance -= amount;\n")
    new_lines.append("                    this.state.honor = 'team1';\n")
    new_lines.append("                } else if (t2Best < t1Best) {\n")
    new_lines.append("                    winner = 'team2';\n")
    new_lines.append("                    this.state.teams.team2.balance += amount;\n")
    new_lines.append("                    this.state.teams.team1.balance -= amount;\n")
    new_lines.append("                    this.state.honor = 'team2';\n")
    new_lines.append("                } else {\n")
    new_lines.append("                    winner = 'tie';\n")
    new_lines.append("                }\n\n")
    
    new_lines.append("                // Auto-Press Logic\n")
    new_lines.append("                if ((this.state.holeState.presses || []).length > 0) {\n")
    new_lines.append("                    this.state.settings.baseBet = amount;\n")
    new_lines.append("                }\n")
    new_lines.append("            }\n")
    
    # Keep lines after roll block (including the else if line)
    new_lines.extend(lines[end_index:])
    
    with open(file_path, 'w') as f:
        f.writelines(new_lines)
    print("Successfully patched script.js")
else:
    print("Could not find blocks")
