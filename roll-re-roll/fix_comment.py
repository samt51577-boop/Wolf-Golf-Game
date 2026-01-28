
import sys

try:
    with open('script.js', 'r') as f:
        lines = f.readlines()
except Exception:
    sys.exit(1)

target_idx = -1
for i, line in enumerate(lines):
    if "amount = 0;" in line:
        # Verify context
        if "winner = 'tie'" in lines[i-1]:
            target_idx = i
            break

if target_idx != -1:
    # We found 'amount = 0;'
    # We expect:
    # i+1: } (closes else)
    # i+2: } (closes if sideAmount)
    # i+3: } (closes if enableHiLow)
    
    # We want to insert '*/' at i+3 (before the brace)
    # And insert AutoPress at i+4 (after the brace)
    
    # Using list insertion, index shifts.
    
    # Insert */ before the last brace (which is at target_idx + 3 originally)
    insert_at = target_idx + 3
    lines.insert(insert_at, "                */\n")
    
    # Now the brace is at insert_at + 1
    # We want to append AutoPress after that brace.
    append_at = insert_at + 2 
    
    auto_press = """
            // AUTO-PRESS RULE: Update Base Bet for Next Hole (Persist Presses)
            if ((this.state.holeState.presses || []).length > 0) {
                 this.state.settings.baseBet = this.state.settings.baseBet + pressTotal;
            }
"""
    lines.insert(append_at, auto_press)
    
    with open('script.js', 'w') as f:
        f.writelines(lines)
    print("Fixed comment block.")
else:
    print("Target not found.")
