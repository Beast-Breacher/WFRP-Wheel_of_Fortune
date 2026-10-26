"""Independent weather oracle from the original Python implementation."""
import importlib.util
import json
import gzip
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('weather_oracle', ROOT / 'weather_engine.py')
w = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = w
spec.loader.exec_module(w)

class Random:
    def __init__(self, seed): self.seed = seed
    def randint(self, a, b):
        self.seed = (self.seed * 1664525 + 1013904223) & 0xFFFFFFFF
        return a + int(self.seed / 4294967296 * (b - a + 1))

fixtures = {'temperatures': [], 'precipitation': [], 'wind': [], 'reports': [], 'adjustments': []}
for mod in range(-11, 8):
    for dice in range(2, 13):
        total = dice + mod
        fixtures['temperatures'].append({'total':total, 'mod':mod, 'expected':w.resolve_temperature(total, mod)})
for total in range(-10, 25):
    fixtures['precipitation'].append({'total':total, 'expected':w.resolve_precipitation(total)})
    fixtures['wind'].append({'total':total, 'expected':w.resolve_wind(total)})
for climate in w.CLIMATES:
    for month in w.IMPERIAL_MONTHS:
        for mode in ('same','reroll'):
            if climate not in ('Cfb','EF','BWh') and month['code'] != 'jahrdrung': continue
            seed = 12345
            w.random = Random(seed)
            fixtures['reports'].append({'climate':climate,'month':month['code'],'mode':mode,'seed':seed,'expected':w.generate_monthly_weather(climate,month['code'],mode)})
for total in range(-3, 13):
    for temp in (-4, 8):
        for wind_total in (2, 10):
            p,t,wind = w.resolve_precipitation(total),w.resolve_temperature(temp,0),w.resolve_wind(wind_total)
            fixtures['adjustments'].append({'p':p,'t':t,'w':wind,'expected':w.adjust_precipitation(p,t,wind)})
out=Path(__file__).resolve().parents[1]/'tests'/'weather-parity.json.gz'
out.write_bytes(gzip.compress(json.dumps(fixtures, ensure_ascii=False).encode('utf-8'),mtime=0))
print(f'Exported {len(fixtures["reports"])} full Python weather reports for cross-language parity testing.')
