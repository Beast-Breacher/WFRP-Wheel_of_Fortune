import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Generator,careerRaces,careers,months,climates,monthlyWeather,temperature,precipitation,wind,adjustPrecipitation} from '../scripts/generators.js';
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);

test('all 144 careers respect race restrictions; High Elf additions remain intact',()=>{
  assert.equal(careers.length,144);
  for(const [name,race] of [['Мастер меча','Высшие эльфы'],['Воин тени','Высшие эльфы'],['Табунщик носорожцев','Огры']]) {
    const c=careers.find(c=>c.name===name);assert.deepEqual(c.races,[race]);
    for(const other of careerRaces.filter(r=>r!==race))assert.throws(()=>new Generator().career(other,c.id));
  }
  const g=new Generator(rng(42));
  for(const race of careerRaces)for(const c of careers.filter(c=>c.races.includes(race))) {
    const result=g.career(race,c.id);if(result.career)assert.ok(result.career.races.includes(race));
  }
  assert.match(careers.find(c=>c.name==='Воин тени').restriction,/только в Нагарите/);
});

test('all races and genders generate consistent characters, names and escaped origin',()=>{
  const g=new Generator(rng(777));
  for(const race of ['Human','Dwarf','Halfling','High Elf','Wood Elf','Gnome'])for(const gender of ['Male','Female'])for(let i=0;i<25;i++) {
    const c=g.character({race,gender,age:30,burden:true});assert.ok(c.name.trim());assert.equal(c.gender,gender);assert.ok(c.html.includes('Место рождения:'));
    if(race!=='High Elf'||gender!=='Male')assert.equal(c.cursed,false);
  }
  assert.ok(!g.origin('Human','<img src=x onerror=alert(1)>').includes('<img'));
  assert.throws(()=>g.character({age:NaN}));
});

test('Azuryan curse is exactly 5/100 and failed checks are invisible',()=>{
  const g=new Generator();
  for(let roll=1;roll<=100;roll++) {const c=g.curse(roll);assert.equal(c.cursed,roll<=5);if(roll>5)assert.equal(c.html,'');else assert.match(c.html,new RegExp(`d100 = ${roll}`));}
});

test('every climate/month/night mode produces a complete monthly Celsius calendar',()=>{
  const g=new Generator(rng(1));
  for(const c of climates)for(const m of months)for(const mode of ['same','reroll']) {
    const report=monthlyWeather(c.code,m.code,mode,g);assert.equal(report.days.length,m.days);assert.equal(report.week_length,8);
    for(const d of report.days){assert.match(d.temperature_day.text,/°C/);assert.ok(d.day_in_week>=1&&d.day_in_week<=8);if(mode==='same')assert.equal(d.rolls.temperature_day,d.rolls.temperature_night);}
  }
  assert.throws(()=>monthlyWeather('bad'));assert.throws(()=>monthlyWeather('Cfb','bad'));
});

test('Python weather-engine parity fixtures',()=>{
  const file=new URL('./weather-parity.json.gz',import.meta.url);assert.ok(fs.existsSync(file),'Run tools/export-parity.py first');
  const fixtures=JSON.parse(gunzipSync(fs.readFileSync(file)).toString('utf8'));
  for(const f of fixtures.temperatures)assert.deepEqual(temperature(f.total,f.mod),f.expected);
  for(const f of fixtures.precipitation)assert.deepEqual(precipitation(f.total),f.expected);
  for(const f of fixtures.wind)assert.deepEqual(wind(f.total),f.expected);
  for(const f of fixtures.reports)assert.deepEqual(monthlyWeather(f.climate,f.month,f.mode,new Generator(rng(f.seed))),f.expected);
  for(const f of fixtures.adjustments)assert.deepEqual(adjustPrecipitation(f.p,f.t,f.w),f.expected);
});
