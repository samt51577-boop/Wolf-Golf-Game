
import sys

log = []
try:
    with open('script.js', 'r') as f:
        lines = f.readlines()
    log.append(f"Read {len(lines)} lines.")
except Exception as e:
    log.append(f"Error: {e}")
    sys.exit(1)

umbrella_idx = -1
for i, line in enumerate(lines):
    if "this.state.gameMode === 'umbrella'" in line and "else if" in line:
        umbrella_idx = i
        break

if umbrella_idx != -1:
    log.append(f"Found umbrella at {umbrella_idx}")
    # Insert */ before the brace preceding umbrella
    # The brace is at umbrella_idx - 1
    
    lines.insert(umbrella_idx - 1, "                */\n")
    
    # Indices shift by +1.
    # Old brace is now at umbrella_idx.
    # Umbrella line is now at umbrella_idx + 1.
    
    auto_press = """
            // AUTO-PRESS RULE: Update Base Bet for Next Hole (Persist Presses)
            if ((this.state.holeState.presses || []).length > 0) {
                 this.state.settings.baseBet = this.state.settings.baseBet + pressTotal;
            }
"""
    # Insert AutoPress before Umbrella line (which is at umbrella_idx + 1)
    lines.insert(umbrella_idx + 1, auto_press)
    
    with open('script.js', 'w') as f:
        f.writelines(lines)
    log.append("Patched successfully.")
else:
    log.append("Umbrella block not found.")

with open('finish_log.txt', 'w') as f:
    f.write('\n'.join(log))
