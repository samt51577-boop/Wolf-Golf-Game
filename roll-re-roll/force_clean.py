
import sys

try:
    with open('script.js', 'r') as f:
        lines = f.readlines()
except Exception:
    sys.exit(1)

idx = -1
for i, line in enumerate(lines):
    if "gameMode === 'umbrella'" in line:
        idx = i
        break

if idx != -1:
    # idx is the Umbrella line (e.g., 1228)
    # We want to remove the 3 lines preceding it if they are braces.
    
    # Check idx-1, idx-2, idx-3
    to_delete = []
    
    count = 0
    scan_idx = idx - 1
    while count < 3 and scan_idx >= 0:
        if lines[scan_idx].strip() == '}':
            to_delete.append(scan_idx)
        else:
            # Stop if we hit non-brace (like the AutoPress block)
            # But wait, lines usually have indentation.
            pass
        scan_idx -= 1
        count += 1
    
    # We expect 3 braces to match 3 deletions.
    # If we found fewer, be careful?
    # View 617 showed exactly 3 orphans.
    
    if len(to_delete) > 0:
        for i in sorted(to_delete, reverse=True):
            del lines[i]
        
        with open('script.js', 'w') as f:
            f.writelines(lines)
        print("Forced cleanup done.")
else:
    print("Umbrella not found.")
