#!/usr/bin/env python3
"""Generate defense plan HTML from markdown — zero dependencies."""

import re
import html as html_mod
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MD_PATH = ROOT / "docs" / "07-research" / "thesis-drafts" / "two-week-defense-study-plan.md"
HTML_PATH = ROOT / "docs" / "07-research" / "thesis-drafts" / "diana-defense-plan.html"

md = MD_PATH.read_text(encoding="utf-8")

def md_to_html(text):
    lines = text.split("\n")
    out = []
    in_list = False
    in_ol = False
    in_code = False
    in_blockquote = False
    bq_buf = []

    def inline(s):
        s = html_mod.escape(s)
        s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
        s = re.sub(r'\*(.+?)\*', r'<em>\1</em>', s)
        s = re.sub(r'`(.+?)`', r'<code>\1</code>', s)
        return s

    def flush_bq():
        nonlocal in_blockquote, bq_buf
        if bq_buf:
            content = " ".join(bq_buf)
            out.append(f'<blockquote><p>{inline(content)}</p></blockquote>')
            bq_buf = []
            in_blockquote = False

    def flush_list():
        nonlocal in_list, in_ol
        if in_list: out.append("</ul>"); in_list = False
        if in_ol: out.append("</ol>"); in_ol = False

    i = 0
    while i < len(lines):
        line = lines[i]

        # Code blocks
        if line.strip().startswith("```"):
            flush_bq(); flush_list()
            if not in_code:
                in_code = True
                out.append("<pre><code>")
            else:
                in_code = False
                out.append("</code></pre>")
            i += 1; continue

        if in_code:
            out.append(html_mod.escape(line))
            i += 1; continue

        # Blockquote
        if line.startswith("> "):
            flush_list()
            content = line[2:]
            if not in_blockquote:
                in_blockquote = True
                bq_buf = [content]
            else:
                bq_buf.append(content)
            i += 1; continue
        elif in_blockquote and line.strip() == "":
            flush_bq()
            i += 1; continue
        elif in_blockquote:
            flush_bq()

        # Headers
        m = re.match(r'^(#{1,4})\s+(.+)$', line)
        if m:
            flush_list(); flush_bq()
            level = len(m.group(1))
            out.append(f'<h{level}>{inline(m.group(2))}</h{level}>')
            i += 1; continue

        # Ordered list
        m_ol = re.match(r'^(\d+)\.\s+(.+)$', line)
        if m_ol:
            flush_bq()
            if in_list: out.append("</ul>"); in_list = False
            if not in_ol: out.append("<ol>"); in_ol = True
            out.append(f'<li>{inline(m_ol.group(2))}</li>')
            i += 1; continue

        # Unordered list
        if line.startswith("- "):
            flush_bq()
            if in_ol: out.append("</ol>"); in_ol = False
            if not in_list: out.append("<ul>"); in_list = True
            out.append(f'<li>{inline(line[2:])}</li>')
            i += 1; continue

        # Horizontal rule
        if line.strip() in ("---", "***", "___"):
            flush_list(); flush_bq()
            out.append("<hr>")
            i += 1; continue

        # Empty line
        if line.strip() == "":
            flush_list(); flush_bq()
            i += 1; continue

        # Paragraph
        flush_list(); flush_bq()
        out.append(f'<p>{inline(line)}</p>')
        i += 1

    flush_list(); flush_bq()
    return "\n".join(out)

body = md_to_html(md)

CSS = """
:root {
    --primary: #1e3a8a;
    --primary-light: #eff6ff;
    --secondary: #0f172a;
    --accent: #2563eb;
    --danger: #dc2626;
    --text-main: #334155;
    --text-muted: #64748b;
    --bg-page: #f8fafc;
    --bg-paper: #ffffff;
    --border-color: #e2e8f0;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: 'Inter', sans-serif;
    line-height: 1.7;
    color: var(--text-main);
    background: var(--bg-page);
    font-size: 11pt;
}
.doc {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 50px;
    background: var(--bg-paper);
}
@media print {
    @page { margin: 0.55in; }
    body {
        background: #fff;
        font-size: 10pt;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .doc { padding: 0; max-width: 100%; }
    h1, h2, h3, h4 { break-after: avoid; page-break-after: avoid; }
    h2 { break-before: auto; page-break-before: auto; margin-top: 24px; }
    blockquote, pre, table { break-inside: avoid; page-break-inside: avoid; }
    ul, ol { break-inside: avoid-page; }
}
h1 {
    font-family: 'Lora', serif;
    font-size: 24pt;
    color: var(--primary);
    text-align: center;
    padding: 30px 0 10px;
    border-bottom: 3px solid var(--primary);
    margin-bottom: 30px;
}
h2 {
    font-family: 'Lora', serif;
    font-size: 16pt;
    color: var(--primary);
    margin-top: 40px;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--border-color);
}
h3 {
    font-size: 12pt;
    font-weight: 600;
    color: var(--secondary);
    margin-top: 24px;
    margin-bottom: 10px;
}
h4 {
    font-size: 11pt;
    font-weight: 600;
    color: var(--accent);
    margin-top: 20px;
    margin-bottom: 8px;
}
p {
    margin-bottom: 12px;
    text-align: justify;
    hyphens: auto;
}
blockquote {
    border-left: 4px solid var(--accent);
    background: var(--primary-light);
    padding: 14px 20px;
    margin: 16px 0;
    border-radius: 0 6px 6px 0;
    font-style: italic;
    color: var(--secondary);
}
blockquote p { margin-bottom: 0; }
ul, ol { margin: 10px 0 16px 24px; }
li { margin-bottom: 6px; }
code {
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10pt;
    color: var(--danger);
}
pre {
    background: #f1f5f9;
    padding: 16px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 12px 0;
    font-size: 9.5pt;
    line-height: 1.5;
}
pre code { background: none; padding: 0; color: var(--text-main); }
strong { font-weight: 600; color: var(--secondary); }
hr { border: none; border-top: 1px solid var(--border-color); margin: 30px 0; }
"""

full = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DianaV2 Two-Week Defense Study Plan</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
    <style>{CSS}</style>
</head>
<body>
    <div class="doc">
        {body}
    </div>
</body>
</html>"""

HTML_PATH.write_text(full, encoding="utf-8")
print(f"✅ Generated {HTML_PATH}")
print(f"   Size: {len(full):,} bytes")
