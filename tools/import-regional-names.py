"""Extract factual name/transcription pairs from downloaded Kurufin reference pages.

Usage: python tools/import-regional-names.py <directory-with-downloaded-pages>
Does not execute any JavaScript from those pages or import their descriptions.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

BASE=Path(sys.argv[1])
OUT=Path(__file__).resolve().parents[1]/'data'
SOURCES={
    'Tilea':('italian-generator.html','cp1251','http://www.kurufin.com/html/italy.html','http://www.kurufin.com/html/Name_generator/random_name_italian.html'),
    'Estalia':('spanish-generator.html','utf-8','http://www.kurufin.com/html/spain.html','http://kurufin.ucoz.ru/random_name_spain.html'),
    'Empire':('german-generator.html','utf-8','http://www.kurufin.com/html/german.html','http://kurufin.ucoz.ru/random_name_german.html'),
}
CORRECTIONS={'Викнлер':'Винклер','Винценцо':'Винченцо','Лючия':'Лучия'}
result={};audit=[]
for culture,(filename,encoding,overview,url) in SOURCES.items():
    html=(BASE/filename).read_text(encoding=encoding)
    pools={}
    for variable,field in [('malename','male'),('femalename','female'),('lastname','surnames')]:
        match=re.search(r'var\s+'+variable+r'\s*=\s*new\s+Array\s*\((.*?)\)\s*;?\s*(?:var|function)',html,re.S)
        if not match:raise ValueError(f'{filename}: missing {variable}')
        values=re.findall(r'"((?:[^"\\]|\\.)*)"',match[1])
        pairs=[];seen=set()
        # A few entries contain two Latin/Russian variant pairs separated by a comma.
        expanded=[]
        for raw in values:
            value=json.loads('"'+raw+'"')
            expanded.extend(re.split(r',\s*(?=[A-Za-zÀ-ž])',value))
        for value in expanded:
            start=re.search('[А-Яа-яЁё]',value)
            if not start:raise ValueError(f'No Russian transcription: {value}')
            original=value[:start.start()].strip()
            russian=unicodedata.normalize('NFC',value[start.start():]).replace('\u0301','').strip()
            russian=re.sub(r'\s+',' ',russian)
            russian=CORRECTIONS.get(russian,russian)
            if re.search('[A-Za-z]',russian):raise ValueError(f'Mixed scripts: {russian}')
            if russian in seen:continue
            seen.add(russian);pairs.append(russian)
            audit.append({'culture':culture,'kind':field,'original':original,'russian':russian,'source':url})
        pools[field]=pairs
    result[culture]={**pools,'sources':[overview,url]}
    print(culture, {k:len(v)for k,v in pools.items()})
(OUT/'regional-names.js').write_text('export default '+json.dumps(result,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
(OUT/'name-provenance.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
