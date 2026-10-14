import os

REPLACEMENTS = {
    'Ã¡': 'á',
    'Ã©': 'é',
    'Ã\xad': 'í',
    'Ã³': 'ó',
    'Ãº': 'ú',
    'Ã±': 'ñ',
    'Ã\x81': 'Á',
    'Ã\x89': 'É',
    'Ã\x8d': 'Í',
    'Ã\x93': 'Ó',
    'Ã\x9a': 'Ú',
    'Ã\x91': 'Ñ',
    'Â¿': '¿',
    'Â¡': '¡',
    'âœ“': '✓',
    'â‰¥': '≥',
    'â‰¤': '≤',
    'Â±': '±',
    'â€”': '—',
    'â€“': '–',
    'â€¦': '…',
    'â€œ': '“',
    'â€\x9d': '”',
    'â€˜': '‘',
    'â€™': '’',
    'Â°': '°',
}

src_dir = os.path.join(os.path.dirname(__file__), 'src')

count = 0
for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith(('.ts', '.tsx', '.css', '.html')):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                content = fp.read()
            
            modified = content
            for bad, good in REPLACEMENTS.items():
                if bad in modified:
                    modified = modified.replace(bad, good)
            
            if modified != content:
                with open(path, 'w', encoding='utf-8') as fp:
                    fp.write(modified)
                print(f"Fixed: {path}")
                count += 1

print(f"Total files fixed: {count}")
