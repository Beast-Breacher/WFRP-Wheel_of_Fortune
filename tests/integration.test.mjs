import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';

// Side-effect contracts: native rendering is verified separately against local Foundry.
class Base {async _prepareContext(){return {};}render(){return this;} }
globalThis.foundry={applications:{api:{ApplicationV2:Base,HandlebarsApplicationMixin:base=>base,DialogV2:{confirm:async()=>true}}}};
globalThis.ui={notifications:{info(){},error(){},warn(){}}};
const {WheelOfDestiny,MODULE_ID}=await import('../scripts/application.js');
let writes,messages,journals,actor,app;
beforeEach(()=>{
  writes=[];messages=[];journals=[];
  actor={id:'owned',name:'Тестовый персонаж',type:'character',isOwner:true,system:{details:{biography:{value:'<p>Старая биография</p>'}}},update:async data=>writes.push(data)};
  const actors=[actor];actors.get=id=>actors.find(a=>a.id===id);
  globalThis.game={user:{id:'tester',isGM:true},actors,settings:{get:(namespace,key)=>key==='year'?2512:true},clipboard:{copyPlainText:async text=>writes.push(text)}};
  game.journal=[];
  globalThis.ChatMessage={getSpeaker:args=>args,getWhisperRecipients:()=>[{id:'gm'}],create:async data=>messages.push(data)};
  globalThis.JournalEntry={create:async data=>journals.push(data)};
  foundry.applications.api.DialogV2.confirm=async()=>true;
  app=new WheelOfDestiny();app.tab='background';app.outputs.background={html:'<p>Новая предыстория</p>'};app.values.actorId='owned';
});

test('biography appends without replacing original text or changing actor mechanics',async()=>{
  await app.action('biography');assert.deepEqual(writes,[{'system.details.biography.value':'<p>Старая биография</p><hr><p>Новая предыстория</p>'}]);
});
test('cancelled confirmation and non-owned actors cannot be written',async()=>{
  foundry.applications.api.DialogV2.confirm=async()=>false;await app.action('biography');assert.equal(writes.length,0);
  actor.isOwner=false;await assert.rejects(app.action('biography'));assert.equal(writes.length,0);
});
test('chat defaults to self and GM; public delivery is explicit',async()=>{
  await app.action('chat');assert.deepEqual(messages[0].whisper,['tester','gm']);
  app.values.audience='self';await app.action('chat');assert.deepEqual(messages[1].whisper,['tester']);
  app.values.audience='public';await app.action('chat');assert.deepEqual(messages[2].whisper,[]);
});
test('journals remain private and require GM privileges',async()=>{
  await app.action('journal');assert.deepEqual(journals[0].ownership,{default:0});assert.equal(journals[0].pages[0].text.content,app.outputs.background.html);
  game.user.isGM=false;await assert.rejects(app.action('journal'));assert.equal(journals.length,1);
});
test('player-access gate is also enforced on generation actions',async()=>{
  game.user.isGM=false;game.settings.get=()=>false;
  await assert.rejects(app.action('generate'));assert.equal(writes.length,0);
});
test('clipboard uses rendered text, preserving table rows and columns',async()=>{
  app.element={querySelector:()=>({innerText:'День\tТемпература\n1\t5 °C\n33\t10 °C'})};
  await app.action('copy');assert.equal(writes[0],'День\tТемпература\n1\t5 °C\n33\t10 °C');
});
test('High Elf restriction does not leak to other races sharing a career',()=>{
  app.tab='career';app.values.careerRace='Люди';app.values.careerId='24';assert.ok(!app.body().includes('только морским эльфам'));
  app.values.careerRace='Высшие эльфы';assert.ok(app.body().includes('только морским эльфам'));
});

test('weather creates one private journal and appends pages using the generated month/year snapshot',async()=>{
  const created=[];
  globalThis.JournalEntry={create:async data=>{
    created.push(data);
    const entry={...data,isOwner:true,createEmbeddedDocuments:async(type,pages)=>{assert.equal(type,'JournalEntryPage');entry.pages.push(...pages);}};
    game.journal.push(entry);return entry;
  }};
  app.tab='weather';app.values.weatherYear='2513';await app.action('generate');
  const title=app.outputs.weather.report.month.name;
  assert.match(app.outputs.weather.html,/2513 И.К./);
  app.values.weatherYear='2514'; // A field change must not relabel the existing report.
  await Promise.all([app.action('journal'),app.action('journal')]);
  assert.equal(created.length,1);assert.equal(created[0].name,'Погода');
  assert.deepEqual(created[0].ownership,{default:0});
  const entry=game.journal[0];assert.equal(entry.pages.length,2);
  assert.equal(entry.pages[0].name,`${title} 2513 И.К.`);assert.equal(entry.pages[1].name,entry.pages[0].name);
  await app.action('generate');await app.action('journal');
  assert.equal(created.length,1);assert.equal(entry.pages.length,3);
  assert.match(entry.pages[2].name,/2514 И.К./);assert.equal(entry.pages[2].sort,200000);
});

test('existing weather journal is reused without changing old pages or permissions; failed save can retry',async()=>{
  const entry={name:'Погода',isOwner:false,pages:[{name:'Старая страница',sort:500000}],ownership:{default:2},createEmbeddedDocuments:async(_type,pages)=>entry.pages.push(...pages)};
  game.journal.push(entry);app.tab='weather';await app.action('generate');
  await assert.rejects(app.action('journal'),/Нет права/);assert.equal(journals.length,0);
  entry.isOwner=true;await app.action('journal');
  assert.equal(entry.pages.length,2);assert.equal(entry.pages[0].name,'Старая страница');assert.equal(entry.pages[1].sort,600000);
  assert.deepEqual(entry.ownership,{default:2});assert.equal(journals.length,0);
  game.user.isGM=false;await assert.rejects(app.action('journal'));assert.equal(entry.pages.length,2);
});

test('year validation and culture controls are wired through the application',async()=>{
  app.tab='weather';for(const value of ['',0,2.5,'oops',10000]){app.values.weatherYear=value;await assert.rejects(app.action('generate'));}
  app.tab='names';app.values.nameCulture='Kislev';assert.match(app.body(),/nameCulture/);
  await app.action('generate');assert.equal(app.outputs.names.culture,'Kislev');
  app.values.nameRace='Gnome';assert.ok(!app.body().includes('data-field="nameCulture"'));
  app.tab='background';app.values.race='Human';app.values.humanCulture='Estalia';app.values.origin='Тилия';
  await app.action('generate');assert.equal(app.outputs.background.culture,'Estalia');
});
