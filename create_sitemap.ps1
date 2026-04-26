$domain = "https://paperfixes.com"

$sitemap = @"
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>$domain/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>$domain/pricing</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>$domain/dashboard</loc>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>
"@

[System.IO.File]::WriteAllText(
    (Join-Path $PWD "public\sitemap.xml"),
    $sitemap,
    [System.Text.Encoding]::UTF8
)
Write-Host "[OK] public/sitemap.xml created"
