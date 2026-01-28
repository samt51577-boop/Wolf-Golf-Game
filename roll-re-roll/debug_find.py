
import os

file_path = 'script.js'
print(f"Checking {file_path}")
with open(file_path, 'r') as f:
    lines = f.readlines()

found_start = False
found_end = False

for i, line in enumerate(lines):
    if "if (this.state.gameMode === 'roll') {" in line:
        print(f"Found START at line {i}: {line.strip()}")
        found_start = True
    if "} else if (this.state.gameMode === 'umbrella') {" in line:
        print(f"Found END at line {i}: {line.strip()}")
        found_end = True

if not found_start:
    print("START regex failed")
if not found_end:
    print("END regex failed")
