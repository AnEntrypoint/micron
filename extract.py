import sys
from pypdf import PdfReader

file = sys.argv[1]
out = sys.argv[2]
reader = PdfReader(file)
text = f"PAGES: {len(reader.pages)}\n"
for i, page in enumerate(reader.pages):
    text += f"\n--- PAGE {i+1} ---\n"
    text += page.extract_text() or ""
with open(out, 'w', encoding='utf-8') as f:
    f.write(text)
print(f"Written {len(text)} chars to {out}")
