import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateRawSync} from 'node:zlib';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),arg=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
const repo=arg('--repo');
if(repo&&!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))throw new Error('Use --repo owner/repository');
const manifest=JSON.parse(await fs.readFile(path.join(root,'module.json'),'utf8'));
if(!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(manifest.version))throw new Error('Invalid semantic version');
if(process.env.GITHUB_REF_TYPE==='tag'&&process.env.GITHUB_REF_NAME!==`v${manifest.version}`)throw new Error('Tag must match module.json version');
if(repo) {
  const base=`https://github.com/${repo}`;
  manifest.url=base;
  manifest.manifest=`${base}/releases/latest/download/module.json`;
  manifest.download=`${base}/releases/download/v${manifest.version}/${manifest.id}.zip`;
  manifest.bugs=`${base}/issues`;
}
const out=path.resolve(arg('--out')??path.join(root,'dist'));
await fs.mkdir(out,{recursive:true});
const manifestBytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n');
const files=[['module.json',manifestBytes]];
for(const dir of ['scripts','data','templates','styles','lang']) {
  for(const file of await fs.readdir(path.join(root,dir),{recursive:true,withFileTypes:true})) {
    if(!file.isFile())continue;
    const full=path.join(file.parentPath??file.path,file.name),relative=path.relative(root,full).replaceAll('\\','/');
    files.push([relative,await fs.readFile(full)]);
  }
}
for(const file of ['README.md','GITHUB-INSTALL-RU.md','NOTICE.md','LICENSE'])files.push([file,await fs.readFile(path.join(root,file))]);
// Small, dependency-free ZIP writer (DEFLATE + CRC32), with files at the module root.
function crc32(bytes) {let crc=0xFFFFFFFF;for(const b of bytes){crc^=b;for(let n=0;n<8;n++)crc=(crc>>>1)^((crc&1)?0xEDB88320:0);}return (crc^0xFFFFFFFF)>>>0;}
const entries=[],central=[];let offset=0;
for(const [name,bytes] of files) {
  const filename=Buffer.from(name),compressed=deflateRawSync(bytes),crc=crc32(bytes);
  const local=Buffer.alloc(30);local.writeUInt32LE(0x04034B50);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(8,8);local.writeUInt16LE(33,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(bytes.length,22);local.writeUInt16LE(filename.length,26);
  const record=Buffer.alloc(46);record.writeUInt32LE(0x02014B50);record.writeUInt16LE(20,4);record.writeUInt16LE(20,6);record.writeUInt16LE(0x800,8);record.writeUInt16LE(8,10);record.writeUInt16LE(33,14);record.writeUInt32LE(crc,16);record.writeUInt32LE(compressed.length,20);record.writeUInt32LE(bytes.length,24);record.writeUInt16LE(filename.length,28);record.writeUInt32LE(offset,42);
  entries.push(local,filename,compressed);central.push(record,filename);offset+=local.length+filename.length+compressed.length;
}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054B50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
await fs.writeFile(path.join(out,`${manifest.id}.zip`),Buffer.concat([...entries,directory,end]));
await fs.writeFile(path.join(out,'module.json'),manifestBytes);
console.log(JSON.stringify({version:manifest.version,files:files.length,out,manifest:manifest.manifest??'Local package; pass --repo owner/repository for GitHub URLs'},null,2));
