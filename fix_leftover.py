import os
root = os.path.dirname(os.path.abspath(__file__))
os.chdir(root)

fpath = os.path.join('src', 'pages', 'PricingPage.tsx')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

old_um = """  // \u7ec4\u4ef6\u5378\u8f7d\u65f6\u6e05\u7406\u5b9a\u65f6\u5668
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  // \u81ea\u52a8\u8f6e\u8be2\u652f\u4ed8\u72b6\u6001"""

new_um = "  // \u81ea\u52a8\u8f6e\u8be2\u652f\u4ed8\u72b6\u6001"

if old_um in c:
    c = c.replace(old_um, new_um, 1)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] PricingPage.tsx: removed redundant unmount-only useEffect')
else:
    print('[WARNING] PricingPage.tsx: target not found')

print('=== Done ===')
