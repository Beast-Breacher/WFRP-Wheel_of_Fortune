"""One-time extraction of the existing desktop generator's data (no runtime Python)."""
import ast
import dataclasses
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parents[1] / 'data'
OUT.mkdir(exist_ok=True)

def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    import sys
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module

g = load('generator_data')
w = load('weather_engine')
data = {key: value for key, value in vars(g).items() if key.isupper()}
tree = ast.parse((ROOT / 'generator_data.py').read_text(encoding='utf-8'))
for node in ast.walk(tree):
    if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name):
        key = node.targets[0].id
        if key in ('backstory_table', 'dooms', 'secrets'):
            data[key] = ast.literal_eval(node.value)
weather = {key: getattr(w, key) for key in ('IMPERIAL_MONTHS', 'IMPERIAL_WEEKDAYS', 'WEATHER_MODIFIERS', 'TEMP_LOW', 'TEMP_HIGH')}
weather['CLIMATES'] = {key: dataclasses.asdict(value) for key, value in w.CLIMATES.items()}
for name, value in [('character-tables', data), ('weather-tables', weather)]:
    (OUT / (name + '.js')).write_text('export default ' + json.dumps(value, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
print('Extracted complete character/name tables and 30 climate profiles.')
