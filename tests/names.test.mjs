import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Generator,races,humanCultures,humanNamePools,cultureForProvince} from '../scripts/generators.js';
import L from '../data/localized-names.js';
import T from '../data/character-tables.js';
import {given,surnames} from '../data/kislev-names.js';
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const cyrillic=value=>assert.match(value,/^[А-Яа-яЁё\s’'−-]+$/u,value);

test('all reachable name components and generated names use Cyrillic',()=>{
  for(const [key,values] of Object.entries(L)) {
    if(Array.isArray(values))assert.equal(values.length,T[key].length,`${key}: no legacy entry lost`);
    for(const value of (Array.isArray(values)?values:Object.values(values).flat()))cyrillic(value);
  }
  for(const [key,values]of Object.entries(T).filter(([k])=>k.startsWith('ELF_')))for(const value of values)cyrillic(value);
  for(const pool of Object.values(humanNamePools))for(const [key,values]of Object.entries(pool))if(key!=='sources')for(const value of values)cyrillic(value);
  const g=new Generator(rng(527));
  for(const race of Object.keys(races))for(const gender of ['Male','Female'])for(let i=0;i<1000;i++) {
    const culture=Object.keys(humanCultures)[i%4];cyrillic(g.name(race,gender,null,culture).name);
  }
  assert.equal(races.Dwarf,'Гном');assert.equal(races.Gnome,'Карлик');
});

test('Kurufin import preserves paired transcriptions with deduplication and provenance',()=>{
  const audit=JSON.parse(readFileSync(new URL('../data/name-provenance.json',import.meta.url),'utf8'));
  for(const culture of ['Empire','Tilea','Estalia'])for(const kind of ['male','female','surnames']) {
    const names=humanNamePools[culture][kind];assert.equal(names.length,new Set(names).size);
    assert.deepEqual(names,audit.filter(n=>n.culture===culture&&n.kind===kind).map(n=>n.russian));
  }
  assert.ok(humanNamePools.Empire.surnames.includes('Винклер'));
  assert.ok(!audit.some(n=>n.russian==='Викнлер'));
});

test('every supplied Kislev entry is retained and female markers restrict male generation',()=>{
  assert.equal(given.length,74);assert.equal(surnames.length,93);
  const k=humanNamePools.Kislev;
  for(const [,name,gender]of given) {
    assert.ok(k[gender==='Female'?'female':'male'].includes(name));
    assert.ok(!k[gender==='Female'?'male':'female'].includes(name));
  }
  for(const [,male,female]of surnames){if(male)assert.ok(k.surnamesMale.includes(male));assert.ok(k.surnamesFemale.includes(female));}
  for(const [,male,female]of surnames.filter(r=>!r[1]))if(female!=='Новоси')assert.ok(!k.surnamesMale.includes(female));
  for(const name of ['Птор','Пётр','Демитирий','Дмитрий'])assert.ok(k.male.includes(name));
  assert.ok(k.female.includes('Мишка'));assert.ok(!k.male.includes('Мишка'));
  assert.ok(k.surnamesMale.includes('Азаров'));assert.ok(k.surnamesFemale.includes('Азарова'));
});

test('human cultures select both given names and surnames without mixing other regions',()=>{
  const g=new Generator(rng(12));
  for(const culture of Object.keys(humanCultures))for(const gender of ['Male','Female']) {
    const pool=humanNamePools[culture],first=gender==='Male'?pool.male:pool.female;
    const last=culture==='Kislev'?pool[gender==='Male'?'surnamesMale':'surnamesFemale']:pool.surnames;
    for(let i=0;i<500;i++) {
      const n=g.name('Human',gender,culture==='Empire'?null:'Одна рука',culture);
      assert.equal(n.culture,culture);
      assert.ok(first.some(f=>n.name.startsWith(f+' ')&&last.includes(n.name.slice(f.length+1))),n.name);
    }
  }
  assert.throws(()=>g.name('Human','Male',null,'Invalid'));
});

test('background culture follows the resolved birthplace, including random foreign origins',()=>{
  const g=new Generator(rng(152));
  const seen=new Set();
  for(const origin of ['Random','Вне Империи','Тилия','Эсталия','Кислев','Рейкланд'])for(let i=0;i<250;i++) {
    const c=g.character({origin});seen.add(c.culture);
    assert.equal(c.culture,cultureForProvince(c.birthplace.province));
    assert.ok(c.html.includes(c.birthplace.text));
  }
  assert.deepEqual([...seen].sort(),Object.keys(humanCultures).sort());
  const expatriate=g.character({origin:'Рейкланд',culture:'Tilea'});
  assert.equal(expatriate.culture,'Tilea');assert.equal(expatriate.birthplace.province,'Рейкланд');
  assert.ok(!g.character({origin:'<img onerror=alert(1)>'}).html.includes('<img'));
});
