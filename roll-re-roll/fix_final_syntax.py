
import sys

try:
    with open('script.js', 'r') as f:
        lines = f.readlines()
except Exception:
    sys.exit(1)

idx = -1
for i in range(len(lines)-2):
    if "winner = 'tie'" in lines[i] and "amount = 0" in lines[i+1]:
        idx = i
        break

if idx != -1:
    # idx = 1214 (approx).
    # idx+2 = }
    # idx+3 = }
    # idx+4 = } (Closing HiLow, line 1218)
    
    # Check if we see closing braces roughly
    if "}" in lines[idx+2] and "}" in lines[idx+3]:
         # Insert */ before the last brace (idx+4)
         # But wait, we want to KEEP idx+4 brace visible to close the NEW block? 
         # No! The New Block has no closing brace yet?
         # Step 552 replaced start of block, but we didn't add a closing brace for our new logic?
         # Wait. Loop 552 replacement:
         #    /* DISABLE ...
         # The new logic flows into this.
         # The OLD code had a closing brace at 1218.
         # Using */ before 1218 means 1218 becomes code again.
         # So 1218 closes the new logic. 
         # YES.
         
         # So insert */ at idx+4.
         lines.insert(idx+4, "                */\n")
         
         # Now idx+4 is */
         # idx+5 is }
         # We append AutoPress at idx+6 (after })
         
         auto_press = """            // AUTO-PRESS RULE: Update Base Bet for Next Hole (Persist Presses)
            if ((this.state.holeState.presses || []).length > 0) {
                 this.state.settings.baseBet = this.state.settings.baseBet + pressTotal;
            }
"""
         lines.insert(idx+6, auto_press)
         
         with open('script.js', 'w') as f:
             f.writelines(lines)
         print("Fixed via python.")
    else:
         print("Braces not aligned.")
else:
    print("Winner line not found.")
