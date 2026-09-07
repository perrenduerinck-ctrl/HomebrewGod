import { test, expect } from '@playwright/test';

test('priority seven sprites render over light, colored and dark backgrounds',async({page})=>{
 await page.setViewportSize({width:1140,height:920});
 await page.goto('/output/vfx/priority-seven/index.html');
 await page.evaluate(()=>window.spriteReviewReady);
 await page.locator('#frame').fill('14');
 const result=await page.evaluate(async()=>{
  const {MODERN_SPRITE_ASSETS}=await import('/vfx/spriteReplacements.js');
  const results=[];
  for(const asset of Object.values(MODERN_SPRITE_ASSETS)){
   const image=new Image();image.src=asset.src;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let transparent=0,black=0;
   for(let i=0;i<data.length;i+=4){if(data[i+3]===0)transparent++;if(data[i+3]>=250&&Math.max(data[i],data[i+1],data[i+2])<=20)black++;}
   results.push({src:asset.src,transparent:transparent/(data.length/4),black});
  }return results;
 });
 expect(result).toHaveLength(7);for(const row of result){expect(row.transparent).toBeGreaterThan(.5);expect(row.black).toBe(0);}
 for(const [name,color] of [['light','#ecdcc1'],['blue','#456caf'],['dark','#182c34'],['white','#ffffff'],['black','#000000']]){
  await page.locator('#background').selectOption(color);
  await page.screenshot({path:`output/vfx/priority-seven/${name}-preview.png`,fullPage:true});
 }
});

test('all migrated roles use modern metadata in Full and Reduced, hide in Off, and clear renderer work',async({page})=>{
 await page.goto('/output/vfx/priority-seven/index.html');
 await page.addStyleTag({url:'/assets/styles/app.css'});
 const result=await page.evaluate(async()=>{
  const {MODERN_SPRITE_ASSETS,MODERN_SPRITE_REPLACEMENTS}=await import('/vfx/spriteReplacements.js');
  const {createVfxAssetCache}=await import('/vfx/vfxAssetManifest.js');
  const {createEffectRenderer}=await import('/vfx/effectRenderer.js');
  const {createEffectEngine}=await import('/vfx/effectEngine.js');
  const cache=createVfxAssetCache();await Promise.all(Object.values(MODERN_SPRITE_ASSETS).map(a=>cache.preload(a.src)));
  const surface=document.createElement('div');surface.style.cssText='position:relative;width:600px;height:400px';document.body.append(surface);
  let time=0,next=0;const rafs=new Map(),timers=new Map();
  const renderer=createEffectRenderer({surface,assetCache:cache,now:()=>time,requestFrame(fn){rafs.set(++next,fn);return next;},cancelFrame:id=>rafs.delete(id)});
  const engine=createEffectEngine({renderer,scheduler:{now:()=>time,setTimeout(fn){timers.set(++next,fn);return next;},clearTimeout:id=>timers.delete(id)}});
  const results=[];
  for(const mode of ['full','reduced','off'])for(const [type,asset] of Object.entries(MODERN_SPRITE_REPLACEMENTS)){
   engine.clear();engine.setMode(mode);time=0;
   // The production cache intentionally holds only eight textures. Warm this role
   // after previous legacy fallbacks may have evicted an unrelated modern sheet.
   await cache.preload(asset.src);
   engine.play({type,duration:1200,position:{x:300,y:200},particles:{count:0},...(type==='lightning5-main'?{startPosition:{x:70,y:200},endPosition:{x:500,y:200}}:{})});
   const sprite=surface.querySelector('.hg-vfx-sprite');const frames=[];
   for(const t of [0,480,1150]){time=t;const work=[...rafs.values()];rafs.clear();work.forEach(fn=>fn(time));frames.push(renderer.getDebugState().effects[0]?.frame);}
   results.push({mode,type,version:sprite?.dataset.vfxAssetVersion,blend:sprite?.style.mixBlendMode,src:sprite?.style.backgroundImage,columns:sprite?.dataset.spriteColumns,frames,start:asset.startFrame,end:asset.endFrame});
  }
  engine.clear();const remaining={sprites:surface.querySelectorAll('.hg-vfx-sprite').length,rafs:rafs.size,timers:timers.size};engine.destroy();surface.remove();return{results,remaining};
 });
 for(const row of result.results){if(row.mode==='off'){expect(row.version).toBeUndefined();continue;}expect(row.version,row.type).toBe('modern6x6');expect(row.columns).toBe('6');expect(row.blend).toBe('normal');expect(row.src).toContain('/modern6x6/');expect(row.frames[0]).toBe(row.start);expect(row.frames[1]).toBeGreaterThan(row.frames[0]);expect(row.frames[2]).toBeGreaterThan(row.frames[1]);expect(row.frames[2]).toBeLessThanOrEqual(row.end);}
 expect(result.remaining).toEqual({sprites:0,rafs:0,timers:0});
});

test('cold modern sheets keep legacy until next playback; failed and forced legacy remain usable',async({page})=>{
 await page.goto('/output/vfx/priority-seven/index.html');
 const result=await page.evaluate(async()=>{
  const {MODERN_SPRITE_REPLACEMENTS}=await import('/vfx/spriteReplacements.js');
  const {createVfxAssetCache}=await import('/vfx/vfxAssetManifest.js');
  const {createEffectRenderer}=await import('/vfx/effectRenderer.js');
  const {createEffectEngine}=await import('/vfx/effectEngine.js');
  const rows=[];
  for(const type of ['lightning5-main','storm-lightning-impact','tier-cold-burst','tier-acid-burst','tier-poison-burst','tier-necrotic-burst']){
   const cache=createVfxAssetCache();const asset=MODERN_SPRITE_REPLACEMENTS[type];
   const surface=document.createElement('div');surface.style.cssText='position:relative;width:600px;height:400px';document.body.append(surface);
   const renderer=createEffectRenderer({surface,assetCache:cache});const engine=createEffectEngine({renderer});
   const play=()=>{engine.clear();engine.play({type,duration:1800,position:{x:200,y:200},particles:{count:0}});return surface.querySelector('.hg-vfx-sprite');};
   let sprite=play();const cold=sprite.dataset.vfxAssetVersion;await cache.preload(asset.src);const late=sprite.dataset.vfxAssetVersion;sprite=play();const warm=sprite.dataset.vfxAssetVersion;
   history.replaceState(null,'','?vfxAssets=legacy');sprite=play();const forced=sprite.dataset.vfxAssetVersion;history.replaceState(null,'','?');engine.destroy();
   const failedRenderer=createEffectRenderer({surface,assetCache:{getStatus:src=>src===asset.src?'failed':'loaded',preload:()=>Promise.resolve(false)}});const failedEngine=createEffectEngine({renderer:failedRenderer});failedEngine.play({type,duration:1800,position:{x:200,y:200},particles:{count:0}});
   const failed=surface.querySelector('.hg-vfx-sprite')?.dataset.vfxAssetVersion;failedEngine.destroy();surface.remove();rows.push({type,cold,late,warm,forced,failed});
  }return rows;
 });
 for(const row of result){expect(row.cold,row.type).toBe('legacy');expect(row.late).toBe('legacy');expect(row.warm).toBe('modern6x6');expect(row.forced).toBe('legacy');expect(row.failed).toBe('legacy');}
});
