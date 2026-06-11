from pathlib import Path
import py_compile

root = Path('apps/AI/app')
errors = []
for path in root.rglob('*.py'):
    try:
        py_compile.compile(str(path), doraise=True)
    except Exception as e:
        errors.append((str(path), e))

if errors:
    raise SystemExit('SYNTAX ERRORS:\n' + '\n'.join(f'{p}: {e}' for p,e in errors))

print('OK')
