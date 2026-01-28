
import sys

try:
    with open('script.js', 'r') as f:
        lines = f.readlines()
except Exception:
    sys.exit(1)

idx_start = -1
idx_end = -1

for i, line in enumerate(lines):
    if "baseBet = this.state.settings.baseBet + pressTotal;" in line:
        idx_start = i # The line with assignment
    if "this.state.gameMode === 'umbrella'" in line and "else if" in line:
        idx_end = i # The umbrella line

if idx_start != -1 and idx_end != -1:
    # line[idx_start] is assignment.
    # line[idx_start+1] is Closing AutoPress brace. We keep it.
    
    # Delete from idx_start+2 up to idx_end (exclusive).
    lines_to_delete = lines[idx_start+2 : idx_end]
    
    # Safety check: lines should look like braces
    # simple check
    
    del lines[idx_start+2 : idx_end]
    
    with open('script.js', 'w') as f:
        f.writelines(lines)
    print("Cleaned up orphans.")
else:
    print("Markers not found.")
