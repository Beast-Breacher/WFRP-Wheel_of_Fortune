const MODULE_ID='wfrp4e-wheel-of-destiny';
let pending=Promise.resolve();

export function validateWeatherYear(value) {
  const year=Number(value);
  if(!Number.isInteger(year)||year<1||year>9999)throw new Error('Год погоды должен быть целым числом от 1 до 9999');
  return year;
}

// Serialize saves from all generator windows on this client, including the first creation.
// A failed save must not prevent subsequent saves.
export function saveWeatherPage(report,html) {
  const save=async()=>{
    if(!game.user.isGM)throw new Error('Журнал создаёт ведущий');
    const year=validateWeatherYear(report.year);
    const page={name:`${report.month.name} ${year} И.К.`,type:'text',text:{content:html,format:1},
      flags:{[MODULE_ID]:{month:report.month.code,year,climate:report.climate.code}}};
    const journal=game.journal.find(entry=>entry.name==='Погода');
    if(journal) {
      if(!journal.isOwner)throw new Error('Нет права добавлять страницы в журнал «Погода»');
      page.sort=Math.max(0,...journal.pages.map(p=>p.sort??0))+100000;
      await journal.createEmbeddedDocuments('JournalEntryPage',[page]);
      return journal;
    }
    return JournalEntry.create({name:'Погода',pages:[page],ownership:{default:0},flags:{[MODULE_ID]:{weatherJournal:true}}});
  };
  const result=pending.then(save);
  pending=result.catch(()=>{});
  return result;
}
