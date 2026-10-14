const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {createDraftStore}=require('./draft-store.cjs');
const {emptyState,catalog,generateCss}=require('./style-engine.cjs');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'rt-draft-')),file=path.join(directory,'draft.json');
const base=emptyState(),id=Object.keys(catalog().portal).find(id=>catalog().portal[id].kind==='text');
const create=()=>createDraftStore(file,()=>base);
try{
 const store=create(),next=emptyState();next.portal.mobile.texts={[id]:'Minha edição'};
 const first=store.mutate('save',0,next);assert.equal(first.revision,1);assert.equal(first.canUndo,true);
 assert.equal(create().get().state.portal.mobile.texts[id],'Minha edição');
 assert.deepEqual(first.state.portal.desktop,{});assert.deepEqual(first.state.gestao,base.gestao);assert.deepEqual(base,emptyState());
 assert.throws(()=>store.mutate('save',0,base),error=>error.status===409);
 assert.throws(()=>store.mutate('save',1,{...next,portal:{mobile:{elements:{[id]:{color:'red;display:none'}}}}}));
 assert.equal(store.get().revision,1);
 const undo=store.mutate('undo',1);assert.deepEqual(undo.state,base);
 const saved=store.mutate('save',undo.revision,next),reset=store.mutate('reset',saved.revision);
 assert.deepEqual(reset.state,base);assert.deepEqual(store.mutate('undo',reset.revision).state,next);
 const protectedId=Object.keys(catalog().gestao).find(id=>catalog().gestao[id].kind==='area'&&!catalog().gestao[id].canHide);
 const unsafe=emptyState();unsafe.gestao.desktop.elements={[protectedId]:{hidden:true}};
 assert.throws(()=>store.mutate('save',store.get().revision,unsafe));
 const sized=emptyState();sized.portal.desktop.elements={[Object.keys(catalog().portal).find(id=>catalog().portal[id].kind==='area')]:{width:75,minHeight:200,font:'arial'}};
 const result=store.mutate('save',store.get().revision,sized);assert.match(generateCss(result.state.portal),/width:75%/);assert.match(generateCss(result.state.portal),/min-height:200px/);
 console.log('OK: reinício, isolamento, desfazer, restaurar, conflito de abas, validação e dimensões.');
}finally{fs.rmSync(file,{force:true});fs.rmdirSync(directory);}
