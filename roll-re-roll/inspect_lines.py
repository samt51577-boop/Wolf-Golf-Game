
lines = open('script.js').readlines()
with open('lines_info.txt', 'w') as f:
    for i, line in enumerate(lines):
        if "DISABLE OLD LOGIC" in line:
            f.write(f"Line {i+1}: {repr(line)}\n")
        if "winner = 'tie'" in line:
            f.write(f"Line {i+1}: {repr(line)}\n")
        if "amount = 0" in line:
            f.write(f"Line {i+1}: {repr(line)}\n")
        if "gameMode === 'umbrella'" in line:
            f.write(f"Line {i+1}: {repr(line)}\n")
