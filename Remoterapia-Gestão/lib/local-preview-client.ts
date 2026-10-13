import type {SupabaseClient} from '@supabase/supabase-js'
export function localPreviewEnabled(){return process.env.NODE_ENV==='development'&&process.env.NEXT_PUBLIC_LOCAL_PREVIEW==='1'}
const user={id:'10000000-0000-4000-8000-000000000001',email:'preview@remoterapia.local',role:'authenticated',aud:'authenticated',app_metadata:{provider:'local-preview'},user_metadata:{nome:'Equipe de demonstração'},is_anonymous:false}
type Query={op:string;table?:string;rpc?:string;payload?:unknown;filters:unknown[][];columns?:string;head?:boolean;single?:boolean;maybeSingle?:boolean;order?:unknown[];range?:number[];limit?:number}
class LocalQuery{
 query:Query
 constructor(table?:string,rpc?:string,payload?:unknown){this.query={op:rpc?'rpc':'select',table,rpc,payload,filters:[]}}
 select(columns='*',options?:{head?:boolean;count?:string}){this.query.columns=columns;this.query.head=options?.head;return this}
 insert(payload:unknown){this.query.op='insert';this.query.payload=payload;return this}
 upsert(payload:unknown){this.query.op='upsert';this.query.payload=payload;return this}
 update(payload:unknown){this.query.op='update';this.query.payload=payload;return this}
 delete(){this.query.op='delete';return this}
 filter(op:string,key:string,value:unknown){this.query.filters.push([op,key,value]);return this}
 eq(key:string,value:unknown){return this.filter('eq',key,value)}
 neq(key:string,value:unknown){return this.filter('neq',key,value)}
 is(key:string,value:unknown){return this.filter('is',key,value)}
 in(key:string,value:unknown){return this.filter('in',key,value)}
 gte(key:string,value:unknown){return this.filter('gte',key,value)}
 gt(key:string,value:unknown){return this.filter('gt',key,value)}
 lte(key:string,value:unknown){return this.filter('lte',key,value)}
 lt(key:string,value:unknown){return this.filter('lt',key,value)}
 ilike(key:string,value:unknown){return this.filter('ilike',key,value)}
 like(key:string,value:unknown){return this.filter('like',key,value)}
 not(key:string,operator:string,value:unknown){return this.filter('not',key,[operator,value])}
 or(expression:string){return this.filter('or',expression,null)}
 order(key:string,options?:{ascending?:boolean}){this.query.order=[key,options?.ascending!==false];return this}
 limit(value:number){this.query.limit=value;return this}
 range(from:number,to:number){this.query.range=[from,to];return this}
 single(){this.query.single=true;return this}
 maybeSingle(){this.query.maybeSingle=true;return this}
 async execute(){
  if(!localPreviewEnabled())throw Error('A demonstração está disponível somente no desenvolvimento local.')
  try{const response=await fetch('http://localhost:3010/api/local-data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(this.query),cache:'no-store'});if(!response.ok)throw Error('Abra o painel visual para iniciar os exemplos.');return await response.json()}
  catch{return {data:null,error:{message:'Os exemplos locais estão indisponíveis. Abra o painel visual e tente novamente.',code:'LOCAL_PREVIEW'},count:null}}
 }
 then(resolve:((value:any)=>unknown)|undefined,reject?:((reason:unknown)=>unknown)){return this.execute().then(resolve,reject)}
}
let cachedClient:SupabaseClient|undefined
export function createLocalPreviewClient():SupabaseClient{
 if(!localPreviewEnabled())throw Error('Modo local indisponível fora do desenvolvimento.')
 if(cachedClient)return cachedClient
 const ok=(data:unknown)=>Promise.resolve({data,error:null})
 const unsupported=()=>Promise.resolve({data:null,error:{message:'Integração externa desativada na prévia local.'}})
 const client={
  from:(table:string)=>new LocalQuery(table),rpc:(name:string,payload?:unknown)=>new LocalQuery(undefined,name,payload),
  auth:{getUser:()=>ok({user}),getSession:()=>ok({session:{user}}),getClaims:()=>ok({claims:{sub:user.id,aud:'authenticated',role:'authenticated',is_anonymous:false,amr:[]}}),signInWithPassword:()=>ok({user,session:{user}}),signOut:()=>ok({}),signUp:()=>ok({user:{...user,id:crypto.randomUUID()},session:null}),updateUser:unsupported,resetPasswordForEmail:unsupported,signInWithOAuth:unsupported,onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),mfa:{getAuthenticatorAssuranceLevel:()=>ok({currentLevel:'aal1',nextLevel:'aal1',currentAuthenticationMethods:[]}),listFactors:()=>ok({all:[],totp:[],phone:[]}),enroll:unsupported,unenroll:unsupported,challenge:unsupported,verify:unsupported,challengeAndVerify:unsupported}},
  channel:()=>{const channel={on:()=>channel,subscribe:()=>channel,unsubscribe:()=>Promise.resolve('ok')};return channel},removeChannel:()=>Promise.resolve('ok'),
  storage:{from:()=>({upload:unsupported,remove:unsupported,getPublicUrl:()=>({data:{publicUrl:''}})})}
 }
 cachedClient=client as unknown as SupabaseClient
 return cachedClient
}
