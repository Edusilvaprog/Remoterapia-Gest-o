// Only drafts live here. This module never writes application CSS or content files.
const fs = require('node:fs');
const {validateState} = require('./style-engine.cjs');
function createDraftStore(file, baseline) {
  const copy = value => JSON.parse(JSON.stringify(value));
  function read() {
    if (!fs.existsSync(file)) return {revision:0, state:validateState(baseline()), history:[]};
    const data = JSON.parse(fs.readFileSync(file,'utf8'));
    if (!Number.isSafeInteger(data.revision) || !Array.isArray(data.history)) throw Error('Rascunho inválido.');
    return {...data, state:validateState(data.state), history:data.history.map(validateState)};
  }
  function write(data) {
    fs.writeFileSync(file+'.tmp',JSON.stringify(data,null,2),'utf8');
    fs.renameSync(file+'.tmp',file);
    return result(data);
  }
  function result(data) { return {revision:data.revision,state:copy(data.state),canUndo:data.history.length>0}; }
  function mutate(action, revision, state) {
    const data = read();
    if (revision !== data.revision) { const error=Error('O rascunho mudou em outra aba. Reabra o editor para continuar.'); error.status=409; throw error; }
    let next;
    if (action === 'undo') {
      if (!data.history.length) return result(data);
      next=data.history.pop();
    } else {
      next=action==='reset'?validateState(baseline()):validateState(state);
      if (JSON.stringify(next)===JSON.stringify(data.state)) return result(data);
      data.history.push(data.state);
      data.history=data.history.slice(-30);
    }
    data.state=next; data.revision++;
    return write(data);
  }
  return {get:()=>result(read()), mutate};
}
module.exports={createDraftStore};
