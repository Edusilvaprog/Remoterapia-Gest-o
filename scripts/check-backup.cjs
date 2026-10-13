const cp = require('node:child_process');
const {findings} = require('./secret-rules.cjs');
function git(args){return cp.execFileSync('git',args,{encoding:'utf8',maxBuffer:40e6});}
const files=git(['diff','--cached','--name-only','--diff-filter=ACMR','-z']).split('\0').filter(Boolean);
const errors=[];
for(const file of files){
  if(/(^|\/)(node_modules|\.next[^/]*|coverage|backups?|exports?)(\/|$)|\.(?:pem|p12|pfx|key|log|tsbuildinfo|sqlite|sqlite3|dump|bak|zip|bundle)$|(^|\/)\.env(?:\.|$)/i.test(file) && !/\.env\.[^/]*example$/.test(file)) errors.push({file,kind:'arquivo privado ou temporario'});
  const text=git(['show',':'+file]);
  if(Buffer.byteLength(text)>10e6) {errors.push({file,kind:'arquivo maior que 10 MB; revisar antes de enviar'});continue;}
  if(!text.includes('\0')) errors.push(...findings(file,text));
  if(/\.env\.[^/]*example$/.test(file)) {
    for(const line of text.split(/\r?\n/)) {
      const m=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if(m && m[2] && !/^(?:false|true|0|1|sandbox|test|disabled|https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/?|["']{2})$/.test(m[2])) errors.push({file,kind:'valor preenchido no modelo de ambiente'});
    }
  }
}
if(errors.length){console.error('Envio bloqueado. Revise estes arquivos (os valores nao sao exibidos):');console.error(JSON.stringify(errors,null,2));process.exit(1);}
console.log('Verificacao preventiva: '+files.length+' arquivos preparados, sem alertas.');
