import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest=JSON.parse(fs.readFileSync(new URL('../module.json',import.meta.url),'utf8'));
const packageJson=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const compare=(a,b)=>{
  const x=a.split('.').map(Number),y=b.split('.').map(Number);
  for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]??0)-(y[i]??0);if(d)return Math.sign(d);}
  return 0;
};
const allowed=(version,range)=>compare(version,range.minimum)>=0&&(!range.maximum||compare(version,range.maximum)<=0);

test('manifest permits WFRP4e 9.6.x through 10.1.2 without imposing an untested upper limit',()=>{
  const system=manifest.relationships.systems.find(s=>s.id==='wfrp4e');
  assert.equal(system.compatibility.minimum,'9.6.0');
  for(const version of ['9.6.0','9.6.1','9.6.9','10.0.0','10.1.2'])assert.ok(allowed(version,system.compatibility),version);
  assert.equal(allowed('9.5.9',system.compatibility),false);
  assert.equal(system.compatibility.maximum,undefined);
  assert.equal(system.compatibility.verified,undefined,'Do not claim a live verified system version without world tests');
});

test('Foundry 13 and 14 are admitted while 12 and 15 remain outside the declared range',()=>{
  // Foundry interprets a major-only maximum at generation granularity.
  const range=manifest.compatibility;
  assert.equal(range.minimum,'13');assert.equal(range.maximum,'14');assert.equal(range.verified,'14.369');
  for(const generation of [13,14])assert.ok(allowed(String(generation),range));
  for(const generation of [12,15])assert.equal(allowed(String(generation),range),false);
});

test('release version and canonical repository URLs stay consistent',()=>{
  assert.equal(manifest.version,packageJson.version);
  assert.equal(manifest.url,'https://github.com/Beast-Breacher/WFRP-Wheel_of_Fortune');
  assert.equal(manifest.manifest,manifest.url+'/releases/latest/download/module.json');
  assert.equal(manifest.download,`${manifest.url}/releases/download/v${manifest.version}/${manifest.id}.zip`);
});

