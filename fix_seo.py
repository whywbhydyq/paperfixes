import os

root = os.path.dirname(os.path.abspath(__file__))
os.chdir(root)

# ============================================================
# 1. Fix index.html - add all meta tags
# ============================================================
fpath = os.path.join('index.html')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

old_head = """<head>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="baidu-site-verification" content="codeva-UuVNLQrfef" />
    <title>PaperFix - \u5b66\u672f\u6539\u5199\u5f15\u64ce</title>
  </head>"""

new_head = """<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="baidu-site-verification" content="codeva-UuVNLQrfef" />

    <!-- Primary Meta Tags -->
    <title>PaperFix - \u5b66\u672f\u6539\u5199\u5f15\u64ce | \u667a\u80fd\u964d\u4f4eAIGC\u68c0\u6d4b\u7387</title>
    <meta name="description" content="\u81ea\u7814\u5b66\u672f\u6539\u5199\u5f15\u64ce\uff0c\u667a\u80fd\u964d\u4f4eAIGC\u68c0\u6d4b\u7387\u3002\u6280\u672f\u672f\u8bed\u96f6\u7834\u574f\uff0c\u5b57\u6570\u4e25\u683c\u63a7\u5236\uff0c\u5904\u7406\u5b8c\u6210\u540e\u4e0d\u7559\u5b58\u4efb\u4f55\u539f\u6587\u3002\u652f\u6301\u8ba1\u7b97\u673a\u3001\u533b\u5b66\u3001\u7406\u5de5\u79d1\u8bba\u6587\u3002" />
    <meta name="keywords" content="\u5b66\u672f\u6539\u5199,AIGC\u68c0\u6d4b,\u964d\u91cd,\u8bba\u6587\u964d\u91cd,\u6539\u5199\u5f15\u64ce,\u964d\u4f4eAI\u68c0\u6d4b\u7387" />
    <link rel="canonical" href="https://www.paperfixes.com/" />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://www.paperfixes.com/" />
    <meta property="og:title" content="PaperFix - \u5b66\u672f\u6539\u5199\u5f15\u64ce | \u667a\u80fd\u964d\u4f4eAIGC\u68c0\u6d4b\u7387" />
    <meta property="og:description" content="\u81ea\u7814\u5b66\u672f\u6539\u5199\u5f15\u64ce\uff0c\u667a\u80fd\u964d\u4f4eAIGC\u68c0\u6d4b\u7387\u3002\u6280\u672f\u672f\u8bed\u96f6\u7834\u574f\uff0c\u5b57\u6570\u4e25\u683c\u63a7\u5236\uff0c\u5904\u7406\u5b8c\u6210\u540e\u4e0d\u7559\u5b58\u4efb\u4f55\u539f\u6587\u3002" />
    <meta property="og:site_name" content="PaperFix" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="PaperFix - \u5b66\u672f\u6539\u5199\u5f15\u64ce | \u667a\u80fd\u964d\u4f4eAIGC\u68c0\u6d4b\u7387" />
    <meta name="twitter:description" content="\u81ea\u7814\u5b66\u672f\u6539\u5199\u5f15\u64ce\uff0c\u667a\u80fd\u964d\u4f4eAIGC\u68c0\u6d4b\u7387\u3002\u6280\u672f\u672f\u8bed\u96f6\u7834\u574f\uff0c\u5b57\u6570\u4e25\u683c\u63a7\u5236\u3002" />
  </head>"""

if old_head in c:
    c = c.replace(old_head, new_head, 1)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] index.html: added meta description, OG tags, Twitter cards, canonical')
else:
    print('[WARNING] index.html: head anchor not found')
    print('  Current head content (first 5 lines after <head>):')
    lines = c.split('\n')
    in_head = False
    count = 0
    for i, line in enumerate(lines):
        if '<head>' in line:
            in_head = True
        if in_head:
            print(f'  {i+1}: {line}')
            count += 1
            if count > 8: break

# ============================================================
# 2. Fix sitemap.xml - use www.paperfixes.com
# ============================================================
fpath = os.path.join('public', 'sitemap.xml')
if os.path.exists(fpath):
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write("""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.paperfixes.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.paperfixes.com/pricing</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.paperfixes.com/dashboard</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>""")
    print('[OK] sitemap.xml: updated to www.paperfixes.com')
else:
    print('[WARNING] sitemap.xml not found')

# ============================================================
# 3. Fix robots.txt - use www.paperfixes.com
# ============================================================
fpath = os.path.join('public', 'robots.txt')
if os.path.exists(fpath):
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write("User-agent: *\nAllow: /\n\nSitemap: https://www.paperfixes.com/sitemap.xml\n")
    print('[OK] robots.txt: updated to www.paperfixes.com')
else:
    print('[WARNING] robots.txt not found')

# ============================================================
# 4. Also fix ymirtool.com robots.txt if it exists in this project
# ============================================================
# (Skip - different project)

print('\n=== SEO fix done ===')
