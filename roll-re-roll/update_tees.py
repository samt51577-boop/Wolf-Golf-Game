
import re

file_path = 'courses.js'

with open(file_path, 'r') as f:
    content = f.read()

# Regex to match course objects.
# Pattern: looks for { id: ..., name: ..., slope: ..., rating: ..., indexes: ... }
# We capture groups to reconstruct.
# Note: indexes might span multiple lines if formatted differently, but in view it looks single line.
# However, to be safe, we'll match somewhat loosely.
# We will iterate line by line to modify course objects, assuming standard formatting in this file.

new_lines = []
lines = content.split('\n')

course_start_regex = re.compile(r"^\s*\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*slope:\s*(\d+),\s*rating:\s*([\d\.]+),\s*indexes:\s*\[(.*?)\]\s*\},?")
# Example: { id: 'al_shoal', name: 'Shoal Creek', slope: 145, rating: 74.8, indexes: [...] },

for line in lines:
    match = course_start_regex.match(line)
    if match:
        c_id = match.group(1)
        c_name = match.group(2)
        c_slope = int(match.group(3))
        c_rating = float(match.group(4))
        c_indexes = match.group(5)
        
        # Create mocked tees
        # Back matches current (assuming current is usually from tips/back for these mock stats)
        # Middle: Slope -5, Rating -2
        # Forward: Slope -15, Rating -4.5
        
        back_slope = c_slope
        back_rating = c_rating
        
        mid_slope = max(100, c_slope - 5)
        mid_rating = round(c_rating - 2.0, 1)
        
        fwd_slope = max(90, c_slope - 15)
        fwd_rating = round(c_rating - 4.5, 1)
        
        # New line format
        # { id: '...', name: '...', slope: ..., rating: ..., indexes: [...], tees: [...] },
        
        tees_json = f"[{{name: 'Back', slope: {back_slope}, rating: {back_rating}}}, {{name: 'Middle', slope: {mid_slope}, rating: {mid_rating}}}, {{name: 'Forward', slope: {fwd_slope}, rating: {fwd_rating}}}]"
        
        new_line = f"        {{ id: '{c_id}', name: '{c_name}', slope: {c_slope}, rating: {c_rating}, indexes: [{c_indexes}], tees: {tees_json} }},"
        
        # Remove trailing comma if original didn't have it (end of array)
        if not line.strip().endswith(','):
            new_line = new_line.rstrip(',')
            
        new_lines.append(new_line)
    else:
        new_lines.append(line)

with open(file_path, 'w') as f:
    f.write('\n'.join(new_lines))
