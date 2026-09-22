import { readFile } from "node:fs/promises";

// Browser transport doubles only: production auth, uploader, persistence,
// authoring UI, library and playback run unchanged. No production account writes.
const firebase = String.raw`
const key='acceptance-firestore';
const records=()=>JSON.parse(localStorage.getItem(key)||'{}');
const path=(...p)=>p.filter(x=>typeof x==='string').join('/');
const subscriptions=new Set();
// Document listeners observe that document only, not writes to descendants.
// Collection listeners observe their immediate documents, not subcollections.
const notify=ref=>{for(const sub of subscriptions){
 const isDocument=sub.ref.split('/').length%2===0;
 const matches=isDocument?ref===sub.ref:ref.startsWith(sub.ref+'/')&&!ref.slice(sub.ref.length+1).includes('/');
 if(matches)queueMicrotask(sub.emit);
}};
const snapshot=(ref)=>({id:ref.split('/').at(-1),metadata:{hasPendingWrites:false,fromCache:false},exists:()=>Boolean(records()[ref]),data:()=>records()[ref]});
const list=(ref)=>{const docs=Object.keys(records()).filter(p=>p.startsWith(ref+'/')&&!p.slice(ref.length+1).includes('/')).map(snapshot);return {docs,empty:!docs.length,size:docs.length,metadata:{hasPendingWrites:false,fromCache:false},forEach:fn=>docs.forEach(fn),docChanges:()=>docs.map(doc=>({type:'added',doc}))};};
export const initializeApp=()=>({}), getFirestore=()=>({}), getAuth=()=>({});
export const doc=path,collection=path,query=(p)=>p,where=()=>null,orderBy=()=>null,limit=()=>null,startAfter=()=>null;
export const serverTimestamp=()=>new Date().toISOString(),deleteField=()=>null;
export const getDoc=async ref=>snapshot(ref);
export const getDocs=async ref=>{
 if(ref.endsWith('/animations')&&localStorage.getItem('acceptance-offline'))throw Error('offline');
 return list(ref);
};
export const setDoc=async (ref,data,{merge=false,mergeFields}={})=>{
 if(data.spellAnimationOverrides&&localStorage.getItem('acceptance-presentation-write-failure'))throw Error('permission denied');
 if(ref.includes('/animations/')) {
  if(localStorage.getItem('acceptance-write-failure'))throw Error('permission denied');
  if(!/^https:\/\//.test(data.sprite)||JSON.stringify(data).includes('data:'))throw Error('invalid hosted asset');
 }
 const all=records();
 if(mergeFields){all[ref] ||= {};for(const field of mergeFields){const parts=field.split('.');let target=all[ref],source=data;for(const part of parts.slice(0,-1)){target[part] ||= {};target=target[part];source=source[part];}target[parts.at(-1)]=source[parts.at(-1)];}}
 else all[ref]=merge?{...all[ref],...data}:data;
 localStorage.setItem(key,JSON.stringify(all));notify(ref);
};
export const updateDoc=(r,d)=>setDoc(r,d,{merge:true});
export const addDoc=async (r,d)=>{const ref=r+'/'+crypto.randomUUID();await setDoc(ref,d);return {id:ref.split('/').at(-1)}};
export const deleteDoc=async ref=>{
 if(localStorage.getItem('acceptance-delete-failure'))throw Error('offline delete');
 const all=records();delete all[ref];localStorage.setItem(key,JSON.stringify(all));notify(ref);
};
export const onSnapshot=(ref,...args)=>{const next=args.find(x=>typeof x==='function'||typeof x?.next==='function');const sub={ref,emit:()=>{
 const value=typeof ref==='string'&&ref.split('/').length%2===0?snapshot(ref):list(ref);
 if(typeof next==='function')next(value);else next.next(value);
}};subscriptions.add(sub);queueMicrotask(sub.emit);return ()=>subscriptions.delete(sub);};
export const runTransaction=async (_,fn)=>fn({get:getDoc,set:setDoc,update:updateDoc,delete:deleteDoc});
export const writeBatch=()=>({set:setDoc,update:updateDoc,delete:deleteDoc,commit:async()=>{}});
const user={uid:'animation-acceptance-user',email:'acceptance@example.test',displayName:'Acceptance',isAnonymous:false};
const authState=globalThis.__ANIMATION_ACCEPTANCE_AUTH_STATE__ ||= {user,observers:new Set()};
globalThis.__ANIMATION_ACCEPTANCE_SWITCH_USER__=uid=>{authState.user=uid?{...user,uid}:null;for(const next of authState.observers)next(authState.user);};
export const onAuthStateChanged=(_,next)=>{authState.observers.add(next);setTimeout(()=>next(authState.user),0);return ()=>authState.observers.delete(next)};
export const signInAnonymously=async()=>{globalThis.__ANIMATION_ACCEPTANCE_SWITCH_USER__(user.uid);return {user:authState.user}},createUserWithEmailAndPassword=signInAnonymously,signInWithEmailAndPassword=signInAnonymously;
export const signOut=async()=>{globalThis.__ANIMATION_ACCEPTANCE_SWITCH_USER__(null)},updateProfile=async()=>{};
`;

export async function mockAnimationServices(page, { room = "" } = {}) {
  if (room) await page.addInitScript(room => {
    const all=JSON.parse(localStorage.getItem("acceptance-firestore")||"{}");
    all[`rooms/${room}`] ||= {roomCode:room,roomName:"Animation Acceptance",dmUid:"animation-acceptance-user"};
    all[`rooms/${room}/activePlayers/animation-acceptance-user`] ||= {uid:"animation-acceptance-user",role:"dm",name:"Acceptance"};
    localStorage.setItem("acceptance-firestore",JSON.stringify(all));
  }, room);
  const sheet = await readFile(new URL("../../assets/vfx/combat/melee/sword-slash-test.png", import.meta.url));
  await page.route("https://www.gstatic.com/firebasejs/**", route => route.fulfill({ contentType: "application/javascript", body: firebase }));
  let uploadCount = 0;
  await page.route("https://api.cloudinary.com/**/image/upload", route => {
    uploadCount++;
    const thumbnail = uploadCount % 2 === 0;
    const name = thumbnail ? `thumbnail-${uploadCount / 2}.webp` : `sprite-${Math.ceil(uploadCount / 2)}.png`;
    return route.fulfill({ json: { secure_url: `https://res.cloudinary.com/acceptance/image/upload/${name}`, public_id: `acceptance/${name}`, resource_type: "image" } });
  });
  await page.route("https://res.cloudinary.com/acceptance/**", route => route.fulfill({ contentType: "image/png", body: sheet }));
  return { sheet, uploads: () => uploadCount };
}

export async function animationRecords(page) {
  return page.evaluate(() => Object.entries(JSON.parse(localStorage.getItem("acceptance-firestore") || "{}"))
    .filter(([path]) => path.includes("/animations/")).map(([, record]) => record));
}
