import subprocess
result = subprocess.run(['npx', 'tsc', '--noEmit'], capture_output=True, text=True, encoding='utf-8')
print(result.stdout)
print(result.stderr)
