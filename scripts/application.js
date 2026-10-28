import {Generator,careers,careerRaces,races,humanCultures,transitions,climates,months,provinces,monthlyWeather,escapeHtml as esc} from './generators.js';
import {saveWeatherPage,validateWeatherYear} from './weather-journal.js';

export const MODULE_ID='wfrp4e-wheel-of-destiny';
const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
const labels={career:'Колесо Судьбы',registry:'Реестр профессий',background:'Неофициальный пакет',names:'Генератор имён',weather:'Генератор погоды'};
const options=(items,value)=>items.map(item=>{const [v,l]=Array.isArray(item)?item:[item,item];return `<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(l)}</option>`;}).join('');
const select=(key,label,items,value)=>`<label>${esc(label)}<select data-field="${key}">${options(items,value)}</select></label>`;
const button=(command,label,attrs='')=>`<button type="button" data-action="run" data-command="${command}" ${attrs}>${esc(label)}</button>`;
const note=text=>text?`<aside class="wod-note">${esc(text)}</aside>`:'';
const actorList=()=>game.actors.filter(a=>a.isOwner&&['character','npc'].includes(a.type));

export class WheelOfDestiny extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS={id:'wfrp4e-wheel-of-destiny',classes:['wfrp-wheel'],window:{title:'WFRP4e — Колесо Судьбы',resizable:true},position:{width:980,height:760},actions:{run:WheelOfDestiny.onAction}};
  static PARTS={main:{template:`modules/${MODULE_ID}/templates/generator.hbs`}};
  constructor(options={}) {
    super(options);this.tab='career';this.outputs={};this.generator=new Generator();
    this.values={careerRace:'Люди',careerId:'11',race:'Human',gender:'Random',age:25,origin:'Random',humanCulture:'Auto',burden:false,nameRace:'Human',nameGender:'Random',nameCulture:'Empire',climate:'Cfb',month:'jahrdrung',weatherYear:game.settings.get(MODULE_ID,'year'),night:'same',search:'',actorId:'',audience:'gm'};
  }
  async _prepareContext(options) {
    const context=await super._prepareContext(options);
    return {...context,tabs:Object.entries(labels).map(([id,label])=>({id,label,active:id===this.tab})),body:this.body()};
  }
  _onRender(context,options) {
    super._onRender(context,options);
    this._listenerAbort?.abort();this._listenerAbort=new AbortController();
    this.element.addEventListener('change',event=>{
      const field=event.target.dataset.field;if(!field)return;
      this.values[field]=event.target.type==='checkbox'?event.target.checked:event.target.value;
      if(field==='careerRace')this.values.careerId=careers.find(c=>c.races.includes(this.values.careerRace))?.id??'';
      if(field==='race'||field==='gender')this.values.burden=false;
      this.render({force:true});
    },{signal:this._listenerAbort.signal});
  }
  body() {
    const v=this.values,out=this.outputs[this.tab];let body='';
    if(this.tab==='career') {
      const available=careers.filter(c=>c.races.includes(v.careerRace));
      if(!available.some(c=>c.id===v.careerId))v.careerId=available[0]?.id??'';
      const selected=available.find(c=>c.id===v.careerId);
      const groups=Object.keys(transitions).map(cls=>`<optgroup label="${cls}">${options(available.filter(c=>c.class===cls).map(c=>[c.id,c.name+' — '+c.source]),v.careerId)}</optgroup>`).join('');
      body=`<div class="wod-controls">${select('careerRace','Народ родственника',careerRaces,v.careerRace)}<label>Прежняя карьера<select data-field="careerId">${groups}</select></label></div>`;
      body+=note(v.careerRace==='Высшие эльфы'?selected?.restriction:'');
      body+=button('generate','Узнать судьбу карьеры');
      if(selected) {let previous=0;body+=`<h3>Группа: ${selected.class}</h3><table><thead><tr><th>d100</th><th>Переход</th><th>Причина</th></tr></thead><tbody>${transitions[selected.class].map(t=>{const min=previous+1;previous=t.max;return `<tr><td>${min}–${t.max}</td><td>${t.cl}</td><td>${t.desc}</td></tr>`;}).join('')}</tbody></table>`;}
    } else if(this.tab==='registry') {
      const search=v.search.trim().toLocaleLowerCase('ru');
      const filtered=careers.filter(c=>[c.name,c.class,c.source,...c.races].join(' ').toLocaleLowerCase('ru').includes(search));
      return `<label>Поиск по карьере, народу или источнику<input type="search" data-field="search" value="${esc(v.search)}"></label><p>Карьер: ${filtered.length} из ${careers.length}</p><div class="wod-scroll"><table><thead><tr><th>Группа</th><th>Карьера</th><th>Народы</th><th>Источник</th><th>Ограничения Высших эльфов</th></tr></thead><tbody>${filtered.map(c=>`<tr><td>${esc(c.class)}</td><td>${esc(c.name)}</td><td>${esc(c.races.join(', '))}</td><td>${esc(c.source)}</td><td>${esc(c.restriction)}</td></tr>`).join('')}</tbody></table></div>`;
    } else if(this.tab==='background') {
      body=`<div class="wod-controls">${select('race','Народ',Object.entries(races),v.race)}${select('gender','Пол',[['Random','Случайный'],['Male','Мужчина'],['Female','Женщина']],v.gender)}<label>Возраст<input data-field="age" type="number" min="1" max="5000" value="${esc(v.age)}"></label>${select('origin','Происхождение',[['Random','Случайное'],...provinces],v.origin)}</div>`;
      if(v.race==='Human')body+=`<div class="wod-controls">${select('humanCulture','Культура имён',[['Auto','По месту рождения'],...Object.entries(humanCultures)],v.humanCulture)}</div>`;
      if(v.race==='High Elf'&&v.gender==='Male')body+=`<label class="wod-check"><input data-field="burden" type="checkbox" ${v.burden?'checked':''}>Бремя детей Азуриана</label>`;
      body+=note('Модификаторы из неофициального пакета выводятся как рекомендации. Генерация не меняет характеристики персонажа.');
      body+=`<div class="wod-actions">${button('generate','Сгенерировать всё')}${[['birth','Рождение'],['build','Внешность'],['hand','Ведущая рука'],['doom','Мотивация и рок'],['origin','Место рождения'],['family','Семья'],['spouse','Супруг и дети'],['secrets','Тайна']].map(([id,label])=>button('partial',label,`data-part="${id}"`)).join('')}</div>`;
    } else if(this.tab==='names')body=`<div class="wod-controls">${select('nameRace','Народ',Object.entries(races),v.nameRace)}${select('nameGender','Пол',[['Random','Случайный'],['Male','Мужчина'],['Female','Женщина']],v.nameGender)}${v.nameRace==='Human'?select('nameCulture','Культура имён',Object.entries(humanCultures),v.nameCulture):''}</div>${button('generate','Сгенерировать имя')}`;
    else if(this.tab==='weather')body=`<div class="wod-controls">${select('climate','Климат',climates.map(c=>[c.code,`${c.code} — ${c.name}`]),v.climate)}${select('month','Месяц',months.map(m=>[m.code,`${m.name} — ${m.days} дня`]),v.month)}<label>Год И.К.<input data-field="weatherYear" type="number" min="1" max="9999" step="1" value="${esc(v.weatherYear)}"></label>${select('night','Ночная температура',[['same','Общий бросок с днём'],['reroll','Отдельный бросок']],v.night)}</div>${button('generate','Сгенерировать месяц')}`;
    if(out) {
      body+=`<div class="wod-actions">${button('copy','Копировать всё')}${select('audience','Отправка в чат',[['gm','Себе и ведущему'],['self','Только себе'],['public','Всем']],v.audience)}${button('chat','Отправить в чат')}`;
      if(game.user.isGM)body+=button('journal',this.tab==='weather'?'Добавить в журнал «Погода»':'Создать запись журнала');
      if(this.tab==='background')body+=`${select('actorId','Персонаж',[['','Выберите персонажа'],...actorList().map(a=>[a.id,a.name])],v.actorId)}${button('biography','Добавить в биографию')}`;
      body+=`</div><div class="wod-output" aria-live="polite">${out.html}</div>`;
    }
    return body;
  }
  static async onAction(event,target) {
    try { await this.action(target.dataset.command,target.dataset); }
    catch(error) {console.error(`${MODULE_ID} |`,error);ui.notifications.error(error.message);}
  }
  async action(command,data={}) {
    if(!game.user.isGM&&!game.settings.get(MODULE_ID,'allowPlayers'))throw new Error('Ведущий ограничил доступ к генераторам');
    const v=this.values,g=this.generator;
    if(command==='tab'){this.tab=data.tab;return this.render({force:true});}
    if(command==='generate') {
      let out;
      if(this.tab==='background')out=g.character({race:v.race,gender:v.gender,age:Number(v.age),origin:v.origin,culture:v.humanCulture,burden:v.burden,year:game.settings.get(MODULE_ID,'year')});
      else if(this.tab==='names'){const n=g.name(v.nameRace,v.nameGender,null,v.nameCulture);out={...n,html:`<h2 class="wod-name">${esc(n.name)}</h2><p>${races[v.nameRace]}; ${n.gender==='Male'?'мужчина':'женщина'}${n.culture?'; '+humanCultures[n.culture]:''}</p>`};}
      else if(this.tab==='career'){
        const result=g.career(v.careerRace,v.careerId),c=result.career;
        out={...result,html:`<p>d100: <b>${result.roll}</b>. Группа: ${result.group}</p>${c?`<h2>${esc(c.name)}</h2><p>${esc(c.source)}</p>${note(v.careerRace==='Высшие эльфы'?c.restriction:'')}`:note('В этой группе нет карьер для выбранного народа.')}<p>Народ: ${esc(v.careerRace)}</p>`};
      } else if(this.tab==='weather'){const year=validateWeatherYear(v.weatherYear),report={...monthlyWeather(v.climate,v.month,v.night,g),year};out={report,html:weatherHtml(report)};}
      if(out)this.outputs[this.tab]=out;
      return this.render({force:true});
    }
    if(command==='partial') {
      const age=Number(v.age);if(!Number.isInteger(age)||age<1||age>5000)throw new Error('Проверьте возраст');
      const fn={birth:()=>g.birth(age,game.settings.get(MODULE_ID,'year')),build:()=>g.build(v.race,g.gender(v.gender)).html,hand:()=>'<b>Ведущая рука:</b> '+g.handedness(),doom:()=>g.doom(),origin:()=>g.origin(v.race,v.origin),family:()=>g.family(v.race,age),spouse:()=>g.spouse(age),secrets:()=>g.secrets()}[data.part];
      if(!fn)throw new Error('Неизвестный раздел');
      this.outputs.background={html:`<p>${fn()}</p>${this.outputs.background?.html??''}`};return this.render({force:true});
    }
    const out=this.outputs[this.tab];if(!out)throw new Error('Сначала создайте результат');
    if(command==='copy') {
      const text=this.element.querySelector('.wod-output')?.innerText;
      if(!text?.trim())throw new Error('Нет текста для копирования');
      await game.clipboard.copyPlainText(text);ui.notifications.info('Результат скопирован');
    }
    if(command==='chat') {
      const whisper=v.audience==='public'?[]:v.audience==='self'?[game.user.id]:[...new Set([game.user.id,...ChatMessage.getWhisperRecipients('GM').map(u=>u.id)])];
      await ChatMessage.create({user:game.user.id,speaker:ChatMessage.getSpeaker({alias:'Колесо Судьбы'}),content:`<section class="wod-chat"><h3>${labels[this.tab]}</h3>${out.html}</section>`,whisper});
    }
    if(command==='journal') {
      if(!game.user.isGM)throw new Error('Журнал создаёт ведущий');
      if(this.tab==='weather') {
        await saveWeatherPage(out.report,out.html);
        ui.notifications.info('Страница добавлена в журнал «Погода»');
      } else {
        await JournalEntry.create({name:`Колесо Судьбы — ${labels[this.tab]}`,pages:[{name:labels[this.tab],type:'text',text:{content:out.html,format:1}}],ownership:{default:0}});ui.notifications.info('Создана приватная запись журнала');
      }
    }
    if(command==='biography') {
      const actor=game.actors.get(v.actorId);if(!actor?.isOwner||!['character','npc'].includes(actor.type))throw new Error('Выберите принадлежащего вам персонажа');
      const accepted=await foundry.applications.api.DialogV2.confirm({window:{title:'Добавить предысторию'},content:`<p>Добавить результат в биографию «${esc(actor.name)}»? Существующий текст будет сохранён.</p>`});
      if(!accepted)return;
      if(!actor.isOwner)throw new Error('Нет доступа к персонажу');
      const current=actor.system.details?.biography?.value;
      if(typeof current!=='string')throw new Error('У этого персонажа нет поля биографии WFRP4e');
      await actor.update({'system.details.biography.value':`${current}<hr>${out.html}`});ui.notifications.info(`Предыстория добавлена: ${actor.name}`);
    }
  }
}

export function weatherHtml(report) {
  const {month,climate,days}=report,tr=month.season_transition;
  const season=tr?`${tr.from}: 1–${tr.day-1}; ${tr.to}: ${tr.day}–${month.days}`:month.season;
  const cell=(text,hazard=false)=>`<td${hazard?' class="wod-hazard"':''}>${esc(text)}</td>`;
  return `<h3>${esc(month.name)}${report.year===undefined?'':` ${esc(report.year)} И.К.`} — ${month.days} дня</h3><p>${esc(climate.code+': '+climate.name)}. ${esc(climate.biome)}; ${esc(climate.terrain)}. ${esc(season)}. Неделя: 8 дней. Температура: °C.</p><div class="wod-scroll"><table><thead><tr><th>Неделя</th><th>День</th><th>Днём</th><th>Ночью</th><th>Осадки</th><th>Ветер</th><th>Примечания</th></tr></thead><tbody>${days.map(d=>`<tr>${cell(d.week)}${cell(d.day+' '+month.name+', '+d.weekday)}${cell(d.temperature_day.text,d.temperature_day.hazardous)}${cell(d.temperature_night.text,d.temperature_night.hazardous)}${cell(d.precipitation.label,d.precipitation.hazardous)}${cell(d.wind.label,d.wind.hazardous)}<td>${esc(d.note??(d.hazards.length?'Опасные условия: '+d.hazards.join(', '):'Без особых условий.'))}<small>${Object.keys(d.rolls).map((key,i)=>`${['День','Ночь','Осадки','Ветер'][i]}: ${d.rolls[key]}${d.modifiers[key]>=0?'+':''}${d.modifiers[key]}=${d.totals[key]}`).join('; ')}</small></td></tr>`).join('')}</tbody></table></div>`;
}
