import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Add Baidu push script to index.html
fpath = os.path.join('index.html')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

old_body = '  </body>'
new_body = """
  <!-- Baidu SEO -->
  <script>
  (function(){
    var bp = document.createElement('script');
    bp.src = '//push.zhanzhang.baidu.com/push.js';
    document.body.appendChild(bp);
  })();
  </script>
  </body>"""

if 'push.zhanzhang.baidu.com' not in c:
    c = c.replace(old_body, new_body, 1)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] index.html: added Baidu auto-push script')
else:
    print('[OK] Baidu push already exists')

print('=== Done ===')
