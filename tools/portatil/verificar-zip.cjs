'use strict';
const fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
function verifyZip(file){
 const zip=fs.readFileSync(file),end=zip.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));assert.ok(end>=0,'ZIP invalido');
 const count=zip.readUInt16LE(end+10);assert.notEqual(count,65535,'ZIP64 exige outra ferramenta de verificacao');let offset=zip.readUInt32LE(end+16);const entries=new Map();
 for(let i=0;i<count;i++){assert.equal(zip.readUInt32LE(offset),0x02014b50);const length=zip.readUInt16LE(offset+28),name=zip.subarray(offset+46,offset+46+length).toString('utf8');assert.ok(!name.includes('\\'),'ZIP deve usar separadores portateis');assert.ok(!name.split('/').includes('..'),'Caminho invalido no ZIP');entries.set(name,{method:zip.readUInt16LE(offset+10),compressed:zip.readUInt32LE(offset+20),local:zip.readUInt32LE(offset+42)});offset+=46+length+zip.readUInt16LE(offset+30)+zip.readUInt16LE(offset+32);}
 function read(name){const entry=entries.get(name);assert.ok(entry,'Arquivo ausente: '+name);assert.equal(zip.readUInt32LE(entry.local),0x04034b50);const start=entry.local+30+zip.readUInt16LE(entry.local+26)+zip.readUInt16LE(entry.local+28),bytes=zip.subarray(start,start+entry.compressed);assert.ok([0,8].includes(entry.method));return entry.method===8?zlib.inflateRawSync(bytes):bytes;}
 const metadata=[...entries.keys()].find(name=>name.endsWith('/transferencia.json'));assert.ok(metadata,'Manifesto ausente');const prefix=metadata.slice(0,-'transferencia.json'.length),manifest=JSON.parse(read(metadata));assert.equal(entries.size,manifest.files.length+1,'Arquivo adicional fora do manifesto');
 for(const item of manifest.files){assert.ok(!/(^|\/)(node_modules|\.next[^/]*|\.git|\.env[^/]*)(\/|$)/.test(item.path),'Arquivo nao permitido');assert.equal(crypto.createHash('sha256').update(read(prefix+item.path)).digest('hex'),item.sha256,'Integridade: '+item.path);}
 return manifest;
}
if(require.main===module){try{const manifest=verifyZip(process.argv[2]);console.log('ZIP integro: '+manifest.files.length+' arquivos; rascunho e captura incluidos.');}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={verifyZip};