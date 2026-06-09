import codecs

with codecs.open('d:\\Web\\NEXA Downloader\\backend\\requirements.txt', 'r', encoding='utf-16le', errors='replace') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    # remove BOM if present
    if line.startswith('\ufeff'):
        line = line[1:]
    
    # remove problematic tight constraints
    if line.startswith('h11=='):
        continue
    if line.startswith('httpcore=='):
        continue
        
    new_lines.append(line)

with open('d:\\Web\\NEXA Downloader\\backend\\requirements.txt', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Requirements fixed and converted to utf-8.")
