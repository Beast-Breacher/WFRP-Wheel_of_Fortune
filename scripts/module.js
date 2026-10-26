import {WheelOfDestiny,MODULE_ID} from './application.js';
import {Generator,monthlyWeather} from './generators.js';

let app;
export function open() {
  if(game.system.id!=='wfrp4e')return ui.notifications.warn('Модуль предназначен для WFRP4e');
  if(!game.user.isGM&&!game.settings.get(MODULE_ID,'allowPlayers'))return ui.notifications.warn('Доступ к генераторам ограничен ведущим');
  app??=new WheelOfDestiny();return app.render({force:true});
}
Hooks.once('init',()=>{
  game.settings.register(MODULE_ID,'allowPlayers',{name:'WOD.AllowPlayers',hint:'WOD.AllowPlayersHint',scope:'world',config:true,type:Boolean,default:true});
  game.settings.register(MODULE_ID,'year',{name:'WOD.Year',hint:'WOD.YearHint',scope:'world',config:true,type:Number,default:2512,onChange:value=>{if(!Number.isInteger(value))ui.notifications.warn('Укажите целый год Имперского календаря');}});
  game.settings.registerMenu(MODULE_ID,'generators',{name:'WOD.Menu',hint:'WOD.MenuHint',label:'WOD.Open',icon:'fas fa-dice-d20',type:WheelOfDestiny,restricted:false});
});
Hooks.once('ready',()=>{
  game.modules.get(MODULE_ID).api=Object.freeze({open,Generator,monthlyWeather});
  console.info(`${MODULE_ID} | Ready. game.modules.get('${MODULE_ID}').api.open()`);
});
Hooks.on('renderActorDirectory',(app,html)=>{
  const root=html instanceof HTMLElement?html:html?.[0];
  if(!root||root.querySelector('[data-wod-open]'))return;
  if(!game.user.isGM&&!game.settings.get(MODULE_ID,'allowPlayers'))return;
  const header=root.querySelector('.directory-header')??root.querySelector('header');if(!header)return;
  const button=document.createElement('button');button.type='button';button.dataset.wodOpen='';button.textContent=game.i18n.localize('WOD.Open');button.addEventListener('click',open);header.append(button);
});
