import T from '../data/character-tables.js';
import W from '../data/weather-tables.js';
import C from '../data/careers.js';
import L from '../data/localized-names.js';
import R from '../data/regional-names.js';
import K from '../data/kislev-names.js';

const N={...T,...L};
export const humanNamePools={...R,Kislev:K};
export const humanCultures={Empire:'Имперец',Tilea:'Тилиец',Estalia:'Эсталиец',Kislev:'Кислевит'};
export const cultureForProvince=province=>({'Тилия':'Tilea','Эсталия':'Estalia','Кислев':'Kislev'}[province]??'Empire');
export const races = {Human:'Человек',Dwarf:'Гном',Halfling:'Полурослик','High Elf':'Высший эльф','Wood Elf':'Лесной эльф',Gnome:'Карлик'};
export const careerRaces = ['Люди','Гномы','Карлики','Полурослики','Высшие эльфы','Лесные эльфы','Огры'];
export const {careers, transitions} = C;
export const climates = Object.values(W.CLIMATES);
export const months = W.IMPERIAL_MONTHS;
export const provinces = Object.keys(T.PROVINCE_CITIES);
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Foundry's own random source supports dice integrations; injectable RNG enables parity tests.
export class Generator {
  constructor(random = () => globalThis.CONFIG?.Dice?.randomUniform?.() ?? Math.random()) { this.random = random; }
  int(min,max) { return min + Math.floor(this.random() * (max-min+1)); }
  pick(items) { if(!items.length) throw new Error('Пустая таблица'); return items[this.int(0,items.length-1)]; }
  table(rows,roll=this.int(1,100)) { return (rows.find(r=>r[0]<=roll && roll<=r[1]) ?? rows.at(-1))[2]; }
  years(n) { return `${n} ${n%100>=11&&n%100<=14?'лет':n%10===1?'год':[2,3,4].includes(n%10)?'года':'лет'}`; }
  gender(g) { return ['Male','Female'].includes(g)?g:this.pick(['Male','Female']); }
  name(race,gender='Random',feature=null,culture='Empire') {
    if(!Object.hasOwn(races,race)) throw new Error('Неизвестный народ');
    if(race==='Human'&&!Object.hasOwn(humanCultures,culture))throw new Error('Неизвестная культура имён');
    const g=this.gender(gender),f=g==='Female';
    let name;
    if(race==='Dwarf') {
      name=this.random()<0.5?this.pick(f?N.DWARF_SAMPLE_NAMES_F:N.DWARF_SAMPLE_NAMES):this.pick(f?N.DWARF_PREFIXES_F:N.DWARF_PREFIXES_M)+this.pick(f?N.DWARF_SUFFIXES_F:N.DWARF_SUFFIXES_M);
      name+=' '+this.pick(T.DWARF_CLAN_NAMES)[f?1:0];
    } else if(race==='Halfling'||race==='Gnome') {
      const p=race.toUpperCase(); name=this.pick(N[p+'_NAMES_'+(f?'F':'M')])+' '+this.pick(N[p+'_CLAN_NAMES']);
    } else if(race==='High Elf'||race==='Wood Elf') {
      const p=race==='High Elf'?'HIGH':'WOOD';
      name=this.random()<0.5?this.pick(T['ELF_'+p+'_SAMPLE_'+(f?'F':'M')]):this.pick(T.ELF_FIRST_SYLLABLES)+(this.random()<0.6?this.pick(T.ELF_SECOND_SYLLABLES):'')+this.pick(T['ELF_ENDINGS_'+p+'_'+(f?'F':'M')]);
    } else {
      const pool=humanNamePools[culture];
      const surnames=culture==='Kislev'?(f?pool.surnamesFemale:pool.surnamesMale):pool.surnames;
      name=this.pick(f?pool.female:pool.male)+' '+this.pick((culture==='Empire'?N.FEATURE_SURNAMES[feature]:null)??surnames);
    }
    return {name,gender:g,...(race==='Human'?{culture}:{})};
  }
  birth(age=25,year=2512) {
    if(!Number.isInteger(year))throw new Error('Укажите целый текущий год в настройках модуля');
    const m=this.table(T.MONTHS.map(m=>[m[0],m[1],m])),y=year-age;
    const zodiac=['Год Молота (Честолюбивый, лидер, общительный, упрямый)','Год Щита (Осторожный, чуткий, нерешительный, надёжный)','Год Наковальни (Прямолинейный, прилежный, практичный, сильный)','Год Косы (Обаятельный, хитрый, проницательный, ненадёжный)'];
    const sign=this.pick(T.STAR_SIGNS.filter(s=>s[2]===m[4]));
    return `<b>Дата рождения:</b> ${m[3]?'день '+this.int(1,m[3]):'праздник'} ${m[2]}, ${y} И.К.<br><b>Год Зодиака:</b> ${zodiac[((y%4)+4)%4]}<br><b>Звёздный знак:</b> ${sign[0]}<br><b>Характер:</b> ${sign[1]}`;
  }
  build(race,gender) {
    const build=this.table(T.BUILD_TABLE[race]??T.BUILD_TABLE.Human,Math.max(1,this.int(1,100)-(gender==='Female'?20:0)));
    const r=this.int(1,100),n=r<=55?1:r<=85?2:3,types=new Set(),features=[];
    for(let i=0;i<n;i++) {
      let roll=this.int(1,100),feat=T.FEATURE_TABLE.find(f=>f[0]<=roll&&roll<=f[1]);
      if(types.has(feat[3])) { roll=(roll%10)*10+Math.floor(roll/10); if(!roll)roll=100; feat=T.FEATURE_TABLE.find(f=>f[0]<=roll&&roll<=f[1]); }
      let attempts=0;
      while(types.has(feat[3])&&attempts++<1000) {
        roll=this.int(1,100);feat=T.FEATURE_TABLE.find(f=>f[0]<=roll&&roll<=f[1]);
      }
      if(types.has(feat[3]))feat=this.pick(T.FEATURE_TABLE.filter(f=>!types.has(f[3])));
      types.add(feat[3]);features.push(feat);
    }
    return {html:`<b>Телосложение:</b> ${build} (${T.BUILD_EFFECTS[build]})<br><b>Отличительные черты:</b> ${features.map(f=>f[2]+(f[4]==='none'?'':` (${f[4]})`)).join(', ')}`,features:features.map(f=>f[2])};
  }
  handedness() { const r=this.int(1,100);return r===1?'Левша, +1 уровень таланта «Амбидекстр»':r<=20?'Левша':r<=95?'Правша':r<=99?'Правша, +1 уровень таланта «Амбидекстр»':'Одинаково владеет обеими руками, +2 уровня таланта «Амбидекстр»'; }
  doom() { return `<b>Мотивация:</b> ${this.pick(['Честолюбие','Побег','Нажива','Патриотизм','Фанатизм','Верность','Помощь другим','Искупление','Первооткрывательство'])}<br><b>Роковое пророчество:</b> <i>«${this.pick(T.dooms)}»</i>`; }
  humanOriginDetails(province='Random') {
    if(province==='Random') province=this.table([[1,5,'Аверланд'],[6,10,'Хохланд'],[11,15,'Мидденланд'],[16,20,'Нордланд'],[21,25,'Остермарк'],[26,30,'Остланд'],[31,55,'Рейкланд'],[56,70,'Альтдорф'],[71,75,'Штирланд'],[76,80,'Талабекланд'],[81,85,'Виссенланд'],[86,90,'Нульн'],[91,95,'Пустоши'],[96,100,'Вне Империи']]);
    if(province==='Вне Империи') province=this.table([[1,25,'Бретония'],[26,45,'Кислев'],[46,70,'Эсталия'],[71,90,'Тилия'],[91,95,'Пограничные Принцы'],[96,100,'Из дальних земель']]);
    const cities=T.PROVINCE_CITIES[province];if(!cities)return {province,city:null,text:escapeHtml(province)};
    let city=this.pick(cities);if(!['Альтдорф','Нульн','Из дальних земель'].includes(province)&&this.int(1,100)<=15)city='Небольшой городок, деревня, хутор или ферма';
    return {province,city,text:`${city}, ${province}`};
  }
  humanOrigin(province='Random') { return this.humanOriginDetails(province).text; }
  origin(race,origin='Random') {
    if(origin!=='Random'&&!Object.hasOwn(T.PROVINCE_CITIES,origin))return `<b>Место рождения:</b> ${escapeHtml(origin)} (выбрано вручную)`;
    let place;
    if(race==='Human')place=this.humanOrigin(origin);
    else if(race==='Dwarf')place=this.table([[1,10,'Карак Норн (Серые горы)'],[11,20,'Карак Изор (Убежища)'],[21,30,'Карак Хирн (Чёрные горы)'],[31,40,'Карак Кадрин (Краесветные горы)'],[41,85,'Караз-а-Карак (Краесветные горы)'],[86,90,'Жуфбар (Краесветные горы)'],[91,100,'Другая крепь гномов']]);
    else if(race==='Wood Elf')place=this.table([[1,5,'Поселение людей'],[6,10,'Бретония'],[11,20,'Великий Лес'],[21,30,'Рейквальдский Лес'],[31,70,'Лес Лорелорн (Эонир)'],[71,100,'Атель-Лорен (Асрай)']]);
    else if(race==='High Elf') {
      place=this.table([[1,5,'Великий Лес'],[6,10,'Рейквальдский Лес'],[11,20,'Поселение людей'],[21,70,'Ультуан'],[71,85,'Альтдорф'],[86,100,'Мариенбург']]);
      if(place==='Ультуан') {
        const r=this.int(1,100),region=r<=20?'Внутренние королевства':r<=45?'Внешние королевства':r<=65?'Нагарит':r<=80?'Авелорн':'Морские эльфы';
        const p={'Внутренние королевства':['Каледор','Эллирион','Сафери','Эатайн'],'Внешние королевства':['Тиранок','Земля Теней (Крейс)','Котик','Ивресс'],'Нагарит':['Нагарит (Земля Теней)'],'Авелорн':['Авелорн (Вечный лес)'],'Морские эльфы':["Морской порт (Ло’Тандар или Ультуанская гавань)"]};
        place=`Ультуан — ${region} (${this.pick(p[region])})`;
      }
    } else if(race==='Halfling')place=this.table([[1,50,'Мут'],[51,100,'Поселение людей']]);
    else if(race==='Gnome')place=this.table([[1,65,'Глимдварроу, Зеркальные Болота'],[66,85,'Мидденландские болота'],[86,90,'Серые Горы'],[91,100,'Поселение людей']]);
    if(place==='Поселение людей')place+=` (${this.humanOrigin()})`;
    if(place==='Бретония')place=this.humanOrigin('Бретония');
    return `<b>Место рождения:</b> ${place??'Неизвестно'}`;
  }
  family(race,age=25) {
    const backstory=this.table(T.backstory_table),r=this.int(1,100);
    let n=0;
    if(race==='Human')n=r<=20?0:r<=45?1:r<=55?2:r<=75?3:r<=95?4:this.int(2,6);
    else if(race==='Dwarf')n=r<=40?0:r<=55?1:r<=75?2:r<=95?3:4;
    else if(['High Elf','Wood Elf'].includes(race))n=r>50?1:0;
    else n=r>30?2:0;
    const siblings=Array.from({length:n},()=>{const d=this.int(-10,10),f=this.pick([false,true]);return `${d===0?(f?'Сестра-близнец':'Брат-близнец'):(d>0?(f?'Старшая':'Старший'):(f?'Младшая':'Младший'))+' '+(f?'сестра':'брат')} (${this.years(Math.max(1,age+d))})`;});
    const p=this.int(1,100)+age+(race==='Human'&&age>25?Math.floor((age-25)/5)*5:0);
    const death=(f=false)=>{const d=this.int(1,100);return d<=40?`Погиб${f?'ла':''} от болезни, голода или естественных причин`:d<=50?`Погиб${f?'ла':''} в результате несчастного случая`:d<=65?`Погиб${f?'ла':''} на поле битвы`:d<=85?`Убит${f?'а':''} стражниками, бандитами или в результате бессмысленного насилия`:d<=95?`Убит${f?'а':''} чудовищем или диким зверем`:`Погиб${f?'ла':''} из-за мутации, Хаоса или скверны`;};
    let deaths='Данных нет';if(p>75)deaths=`Отец: ${death()} | Мать: ${death(true)}`;else if(p>35){const f=this.pick([false,true]);deaths=`${f?'Мать':'Отец'}: ${death(f)}`;}
    return `<b>Предыстория семьи:</b> ${backstory}<br><b>Родители:</b> ${p<=35?'Оба родителя живы':p<=75?'Один родитель погиб':'Оба родителя погибли'}<br><b>Гибель родителей:</b> ${deaths}<br><b>Братья/сёстры:</b> ${n?`Всего ${n}: ${siblings.join(', ')}`:'Нет'}`;
  }
  spouse(age=25) {
    if(age<20)return '<b>Супруг или супруга и дети:</b> Нет (персонаж слишком молод)';
    const r=this.int(1,100),cs=age>=25?65:50,cc=age>=25?50:35;
    if(r>cs)return '<b>Супруг или супруга и дети:</b> Персонаж не состоит в браке.';
    const spouse=this.years(Math.max(16,age+this.int(-5,5))),kids=r<=cc?this.int(1,4):0;
    const ages=Array.from({length:kids},()=>Math.max(1,age-16-this.int(0,10))).sort((a,b)=>b-a).map(k=>this.years(k));
    return `<b>Супруг или супруга и дети:</b> Персонаж состоит в браке; супругу или супруге ${spouse}. ${kids?`Детей: ${kids} (возраст: ${ages.join(', ')}).`:'Детей пока нет.'}`;
  }
  secrets() { return '<b>Тайна:</b> '+this.pick(T.secrets); }
  curse(roll=this.int(1,100)) {
    if(!Number.isInteger(roll)||roll<1||roll>100)throw new Error('Бросок должен быть от 1 до 100');
    return {roll,cursed:roll<=5,html:roll<=5?`<p class="wod-curse" style="color:#c33b46;font-weight:600"><strong style="font-weight:600">d100 = ${roll}<br>В жилах асура пробудилось проклятое наследие Аэнариона. Древняя кровь отозвалась внутренней тьмой, которая отныне следует за ним, словно неотступная тень.</strong></p>`:''};
  }
  character({race='Human',gender='Random',age=25,origin='Random',burden=false,year=2512,culture='Auto'}={}) {
    if(!Number.isInteger(age)||age<1||age>5000)throw new Error('Возраст должен быть целым числом от 1 до 5000');
    if(!Object.hasOwn(races,race))throw new Error('Неизвестный народ');
    const g=this.gender(gender),build=this.build(race,g);
    const birthplace=race==='Human'?this.humanOriginDetails(origin):null;
    const resolvedCulture=culture==='Auto'?cultureForProvince(birthplace?.province):culture;
    const name=this.name(race,g,build.features[0],resolvedCulture);
    const originHtml=birthplace?`<b>Место рождения:</b> ${birthplace.text}`:this.origin(race,origin);
    const curse=burden&&race==='High Elf'&&g==='Male'?this.curse():{cursed:false,html:''};
    return {...name,race,birthplace,html:`<h2>${escapeHtml(name.name)} (${g==='Male'?'мужчина':'женщина'}, ${races[race]})</h2><p>${this.birth(age,year)}</p>${curse.html}<p>${build.html}</p><p><b>Ведущая рука:</b> ${this.handedness()}</p><p>${this.doom()}</p><p>${originHtml}</p><p>${this.family(race,age)}</p><p>${this.spouse(age)}</p><p>${this.secrets()}</p>`,cursed:curse.cursed};
  }
  career(race,id) {
    const source=careers.find(c=>c.id===id);if(!source||!source.races.includes(race))throw new Error('Выберите карьеру выбранного народа');
    const roll=this.int(1,100),group=transitions[source.class].find(t=>roll<=t.max).cl;
    const pool=careers.filter(c=>c.class===group&&c.races.includes(race));
    return {roll,group,career:pool.length?this.pick(pool):null,race};
  }
}

export function temperature(total,mod) {
  const key=Math.max(-7,Math.min(19,total)),entry=(mod<=0?W.TEMP_LOW:W.TEMP_HIGH)[key];
  if(!entry)throw new Error('Температура вне диапазона таблицы');
  return {key,label:entry[0],celsius:entry[1],text:`${entry[0]} (${entry[1]})`,hazardous:entry[2]};
}
export function precipitation(total) {
  const [key,label,hazardous]=total<=-3?['sunbaked','Палящее солнце',true]:total<=3?['clear','Ясно',false]:total===4?['partly_cloudy','Переменная облачность',false]:total===5?['mostly_cloudy','Преимущественно облачно',false]:total===6?['overcast','Пасмурно',false]:total<=9?['drizzly','Морось',true]:['rainy','Дождь',true];return {key,label,hazardous};
}
export function wind(total) {
  const [key,label,hazardous]=total<=4?['still','Штиль',false]:total<=6?['gentle','Лёгкий ветер',false]:total<=9?['moderate','Умеренный ветер',false]:total<=11?['strong','Сильный ветер',false]:total<=13?['very_strong','Очень сильный ветер',true]:['gale','Штормовой ветер',true];return {key,label,hazardous};
}
export function adjustPrecipitation(p,t,w) {
  const cold=['Довольно холодно','Очень холодно','Лютый мороз'].includes(t.label);
  if(cold&&p.key==='drizzly')return [{key:'flurry',label:'Снежные заряды',hazardous:false},'Морось превратилась в слабый снег из-за холода.'];
  if(cold&&p.key==='rainy')return [{key:'snowy',label:'Снегопад',hazardous:true},'Дождь превратился в снегопад из-за холода.'];
  if(w.key==='still'&&p.key==='drizzly')return [{key:'misty',label:'Дымка',hazardous:false},'При штиле морось превратилась в дымку.'];
  if(w.key==='still'&&p.key==='rainy')return [{key:'foggy',label:'Туман',hazardous:true},'При штиле дождь превратился в густой туман.'];
  return [p,null];
}
export function monthlyWeather(code='Cfb',monthCode='jahrdrung',nightMode='same',g=new Generator()) {
  const month=months.find(m=>m.code===monthCode),climate=W.CLIMATES[code];
  if(!month||!climate||!['same','reroll'].includes(nightMode))throw new Error('Неверные параметры погоды');
  const days=Array.from({length:month.days},(_,i)=>{
    const day=i+1,tr=month.season_transition,season=tr?(day<tr.day?tr.from:tr.to):month.season;
    const [td,tn,pr,wi]=W.WEATHER_MODIFIERS[code][season],d6=()=>g.int(1,6)+g.int(1,6);
    const dr=d6(),nr=nightMode==='same'?dr:d6(),rr=d6(),wr=d6();
    const dt=temperature(dr+td,td),nt=temperature(nr+tn,tn),base=precipitation(rr+pr),w=wind(wr+wi),[p,note]=adjustPrecipitation(base,dt,w);
    const index=month.start_weekday+i;
    return {day,season,week:Math.floor(index/8)+1,day_in_week:index%8+1,weekday:W.IMPERIAL_WEEKDAYS[index%8],temperature_day:dt,temperature_night:nt,precipitation_base:base,precipitation:p,wind:w,note,hazards:[dt,p,w].filter(x=>x.hazardous).map(x=>x.label),rolls:{temperature_day:dr,temperature_night:nr,precipitation:rr,wind:wr},totals:{temperature_day:dr+td,temperature_night:nr+tn,precipitation:rr+pr,wind:wr+wi},modifiers:{temperature_day:td,temperature_night:tn,precipitation:pr,wind:wi}};
  });
  return {month,climate,season:month.season,night_mode:nightMode,week_length:8,days};
}
