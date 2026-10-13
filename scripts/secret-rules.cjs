const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const skip = new Set(['node_modules','.git','.next','out','build','coverage','backups','exports']);
const textExt = /\.(?:[cm]?js|jsx|tsx?|json|md|sql|ya?ml|txt|html|css|ps1|cmd|env|example|toml)$/i;
const rules = [
  ['chave privada', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['token GitHub', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{35,})\b/g],
  ['chave secreta Supabase', /\bsb_secret_[A-Za-z0-9_-]{15,}\b/g],
  ['chave AWS', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['token pagamento', /\b(?:APP_USR|TEST)-\d{6,}-[A-Za-z0-9_-]{15,}/g],
  ['segredo literal', /(?:api_secret|access_token|webhook_secret|service_role_key|secret_key|password)\s*[=:]\s*['"]([^'"\r\n]{12,})['"]/gi],
];
function findings(name, text) {
  const found = [];
  for (const [kind, re] of rules) {
    re.lastIndex = 0;
    for (const match of text.matchAll(re)) {
      if (match[1] && /^(?:process\.env|your[_ -]|sua[_ -]|exemplo|placeholder|\$\{|test|fake|demo)/i.test(match[1])) continue;
      found.push({file:name,line:text.slice(0,match.index).split('\n').length,kind});
    }
  }
  for (const m of text.matchAll(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g)) {
    let role;
    try { role = JSON.parse(Buffer.from(m[0].split('.')[1], 'base64url').toString()).role; } catch {}
    if (role !== 'anon') found.push({file:name,line:text.slice(0,m.index).split('\n').length,kind:'JWT privado'});
  }
  return found;
}
function walk(dir, base=dir, output=[]) {
  for (const e of fs.readdirSync(dir,{withFileTypes:true})) {
    if (skip.has(e.name) || e.name.startsWith('.next') || e.name.endsWith('.log') || e.name.endsWith('.tsbuildinfo') || e.name.startsWith('.env') && !e.name.endsWith('.example')) continue;
    const full=path.join(dir,e.name);
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) walk(full,base,output);
    else if (textExt.test(e.name) && fs.statSync(full).size < 5e6) output.push(...findings(path.relative(base,full),fs.readFileSync(full,'utf8')));
  }
  return output;
}
function git(dir, args) { return cp.execFileSync('git',['--git-dir='+dir,...args],{encoding:'utf8',maxBuffer:30e6}); }
function history(dir) {
  const found=[];
  for (const rev of git(dir,['rev-list','--all']).trim().split('\n')) {
    for (const name of git(dir,['ls-tree','-r','--name-only','-z',rev]).split('\0').filter(Boolean)) {
      if (/(^|\/)\.env(?:\.|$)/.test(name) && !name.endsWith('.example')) found.push({revision:rev,file:name,kind:'arquivo de ambiente no historico'});
      if (textExt.test(name)) found.push(...findings(name,git(dir,['show',rev+':'+name])).map(f=>({...f,revision:rev})));
    }
  }
  return found;
}
if (require.main === module) {
  const mode=process.argv[2], target=process.argv[3];
  const found=mode==='history'?history(target):walk(target);
  console.log(JSON.stringify({target,findings:found},null,2));
  if(found.length) process.exitCode=2;
}
module.exports={walk,findings};
