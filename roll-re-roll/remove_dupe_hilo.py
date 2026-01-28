
import sys

try:
    with open('script.js', 'r') as f:
        lines = f.readlines()
except Exception:
    sys.exit(1)

start = -1
end = -1

for i, line in enumerate(lines):
    if "if (this.state.gameMode === 'roll' && this.state.settings.enableHiLow)" in line:
        start = i
    if "// Log history with snapshot" in line:
        end = i

if start != -1 and end != -1:
    # start is the if line.
    # Check for preceding comment
    if start > 0 and "User said" in lines[start-1]:
        start -= 1
    
    # Check lines to confirm it is the block we want
    # Printing for log
    # print(lines[start])
    
    # We delete from start up to end (exclusive of end, so we execute line 'end' which is history log)
    # Actually, we might want to preserve the empty line before history?
    # lines[end] is // Log history.
    # lines[end-1] is empty?
    # lines[end-2] is }?
    # So deleting up to end removes the } and the blank line.
    # This is correct.
    
    # Logic check: Umbrella closed before this?
    # Previous check suggests yes.
    
    del lines[start:end]
    
    with open('script.js', 'w') as f:
        f.writelines(lines)
    print("Deleted duplicate HiLow block.")
else:
    print(f"Block not found: start={start}, end={end}")
