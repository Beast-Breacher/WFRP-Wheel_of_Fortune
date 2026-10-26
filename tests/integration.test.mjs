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
