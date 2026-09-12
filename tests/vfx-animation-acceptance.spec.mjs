import { test, expect } from "@playwright/test";
import { mockAnimationServices, animationRecords } from "./helpers/animation-services.mjs";

async function openBattle(page, room = "", appUrl = "") {
  await page.goto(`${appUrl}?smokeTest=1&vfxTest=1${room ? `&room=${room}&view=battle` : ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__HOMEBREW_GOD_RELEASE_TEST__));
  if (room) await expect(page.locator('#roomCodeText')).toContainText(room);
  await page.evaluate(async () => { const api=window.__HOMEBREW_GOD_RELEASE_TEST__;await api.openScreen("battle");api.setDmRole(true); });
  await page.locator("#battleToolsMenu").evaluate(el => { el.open=true; });
  await page.locator("#battleVfxModeSelect").selectOption("full");
}
const field=(dialog,name)=>dialog.locator(`[data-animation-${name}]`);
function watchErrors(page) {
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  return errors;
}
const libraryState=page=>page.evaluate(async()=>{
  const {getAnimationSession}=await import('/vfx/animationWorkspace.js');
  const s=getAnimationSession(document);return {context:s.library.getContext(),status:s.persistence?.getStatus(),animations:s.library.list()};
});

async function realTokens(page, sourceSize='medium', targetSize='medium', elevations=[0,0]) {
  await page.evaluate(({sourceSize,targetSize,elevations})=>window.__HOMEBREW_GOD_RELEASE_TEST__.setMovementTestTokens([
    {id:'acceptance-source',name:'Caster',type:'player',linkedCharacterId:'release-test-character',x:25,y:50,sizeCategory:sourceSize,elevation:elevations[0],mapMode:'single'},
    {id:'acceptance-target',name:'Target',type:'enemy',x:65,y:50,sizeCategory:targetSize,elevation:elevations[1],mapMode:'single'}
  ]),{sourceSize,targetSize,elevations});
  await expect(page.locator('.hg-token')).toHaveCount(2);
}

async function tokenCenter(page,id) {
  return page.locator(`.hg-token[data-token-id="${id}"]`).evaluate(el=>{
    const r=(el.querySelector(':scope > img,:scope > .hg-token-fallback')||el).getBoundingClientRect();
    return {x:r.left+r.width/2,y:r.top+r.height/2};
  });
}
async function selectPreview(page,spellId) {
  await page.locator('#battleToolsMenu').evaluate(el=>{el.open=true;});
  await page.locator('#spellTemplateSelect').selectOption(spellId);await page.locator('#loadSpellTemplateButton').click();
  await expect(page.locator('#templateStatus')).toContainText('Click caster position.');
}

test("Gary Missile uploads, saves with a spell, previews and casts after full reload, then replaces its sprite without reassignment",async({page})=>{
  const errors=watchErrors(page);
  await page.setViewportSize({width:1280,height:1400});
  const room='ABC-123',services=await mockAnimationServices(page,{room});await openBattle(page,room);
  await page.locator('#animationLibraryButton').click();const dialog=page.locator('#animationLibraryDialog');
  await field(dialog,'custom').click();await field(dialog,'name').fill('Gary Missile');
  await field(dialog,'file').setInputFiles({name:'gary-missile.png',mimeType:'image/png',buffer:services.sheet});
  await field(dialog,'advanced-mode').check();await field(dialog,'behavior').selectOption('projectile');
  await field(dialog,'fps').fill('60');await field(dialog,'travel-speed').fill('1000');
  await dialog.locator('[data-section="direction"] > summary').click();
  await field(dialog,'facing').selectOption('face-target');
  await dialog.getByRole('button',{name:'Save Animation',exact:true}).click();
  await expect(field(dialog,'status')).toContainText('personal library');const [gary]=await animationRecords(page);
  await field(dialog,'close').click();
  await page.evaluate(async()=>{const api=window.__HOMEBREW_GOD_RELEASE_TEST__;await api.openScreen('characterCreator');api.prepareCharacterCreatorClassTest({stepId:'spells'});});
  await page.locator('#ccNewSpellName').fill('Gary Fireball Test');await page.locator('#ccNewSpellRange').fill('120 feet');
  await page.locator('[data-cc-action="edit-spell-animations"]').click();const panel=page.getByRole('dialog',{name:'Spell animations',exact:true});
  for(const [slot,id] of [['cast','cold_burst_01'],['travel',gary.id],['impact','fireball_explosion_01']]) {
    await panel.locator(`[data-spell-animation-slot="${slot}"] [data-slot-action="choose"]`).click();
    await field(dialog,'select').selectOption(id);await field(dialog,'use-selected').click();
  }
  await panel.locator('[data-spell-save]').click();await page.locator('#ccNewSpellKnown').uncheck();
  await page.locator('[data-cc-action="add-custom-spell"]').click();
  await page.evaluate(()=>window.__HOMEBREW_GOD_RELEASE_TEST__.setCharacterCreatorTestStep('basics'));
  await page.locator('#ccCharacterName').fill('Gary Wizard');await page.locator('#characterWizardSaveButton').click();
  const savedSpell=()=>page.evaluate(room=>Object.entries(JSON.parse(localStorage.getItem('acceptance-firestore')||'{}')).filter(([path])=>path.startsWith(`rooms/${room}/characters/`)).flatMap(([,record])=>record.magic?.customSpells||[]).find(s=>s.name==='Gary Fireball Test'),room);
  await expect.poll(async()=>(await savedSpell())?.animations.travel.animationId).toBe(gary.id);
  const spell=await savedSpell();
  async function previewAndCast(sprite,zoom=1) {
    await page.evaluate(async()=>{const api=window.__HOMEBREW_GOD_RELEASE_TEST__;await api.openScreen('battle');api.setDmRole(true);});
    await realTokens(page,'huge','large');
    await page.locator('#battleMapSurface').evaluate(el=>{el.style.height='600px';el.style.minHeight='600px';});
    await page.locator('#zoomResetButton').click();for(let n=0;n<(zoom-1)/.25;n++)await page.locator('#zoomInButton').click();
    await selectPreview(page,spell.id);
    const source=await tokenCenter(page,'acceptance-source'),target=await tokenCenter(page,'acceptance-target');
    await page.mouse.click(source.x,source.y);await page.mouse.click(target.x,target.y);
    await page.locator('#playSpellPreviewVfxButton').click();
    const castEffect=page.locator('#battleMapSurface [data-animation-id="cold_burst_01"]'),travel=page.locator(`#battleMapSurface [data-animation-id="${gary.id}"]`),impact=page.locator('#battleMapSurface [data-animation-id="fireball_explosion_01"]');
    async function assertCasterCenter() { await expect(castEffect).toBeVisible();const a=await castEffect.boundingBox(),c=await tokenCenter(page,'acceptance-source');expect(a.x+a.width/2).toBeCloseTo(c.x,0);expect(a.y+a.height/2).toBeCloseTo(c.y,0); }
    await assertCasterCenter();
    await expect(travel).toBeVisible();await expect(travel.locator('.hg-vfx-sprite')).toHaveCSS('background-image',`url("${sprite}")`);
    await expect(impact).toHaveCount(0);
    const preview=await page.evaluate(()=>window.__HOMEBREW_GOD_RELEASE_TEST__.getSpellPreviewVfxState().event);
    expect(preview.casterTokenId).toBe('acceptance-source');expect(preview.targetTokenId).toBe('acceptance-target');
    await expect(impact).toBeVisible();const box=await impact.boundingBox();expect(box.x+box.width/2).toBeCloseTo(target.x,0);expect(box.y+box.height/2).toBeCloseTo(target.y,0);
    await page.locator('#stopSpellPreviewVfxButton').click();await expect(page.locator('#battleMapSurface .hg-map-vfx-effect')).toHaveCount(0);
    await page.locator('#playSpellPreviewVfxButton').click();await expect(travel).toBeVisible();await page.locator('#stopSpellPreviewVfxButton').click();
    await page.evaluate(spell=>window.__HOMEBREW_GOD_RELEASE_TEST__.beginSpellCast({spell}),spell);
    await page.locator('#battleToolsMenu').evaluate(el=>{el.open=false;});
    const castTarget=await tokenCenter(page,'acceptance-target');await page.mouse.click(castTarget.x,castTarget.y);
    await expect(page.locator('#confirmSpellCastButton')).toBeEnabled();await page.locator('#confirmSpellCastButton').click();
    await assertCasterCenter();
    await expect(travel).toBeVisible();await expect(travel.locator('.hg-vfx-sprite')).toHaveCSS('background-image',`url("${sprite}")`);
    await expect(impact).toHaveCount(0);
    // Confirm updates panel layout. Following effects must track the actual
    // current token body, not the mouse coordinate sampled before Confirm.
    await expect(impact).toBeVisible();const castBox=await impact.boundingBox(),currentTarget=await tokenCenter(page,'acceptance-target');expect(castBox.x+castBox.width/2).toBeCloseTo(currentTarget.x,0);expect(castBox.y+castBox.height/2).toBeCloseTo(currentTarget.y,0);
    await expect(page.locator('#battleMapSurface .hg-map-vfx-effect')).toHaveCount(0);
  }
  await previewAndCast(gary.sprite);
  await page.reload();await page.waitForFunction(()=>Boolean(window.__HOMEBREW_GOD_RELEASE_TEST__));
  expect((await savedSpell()).animations.travel.animationId).toBe(gary.id);await previewAndCast(gary.sprite);
  await page.locator('#battleToolsMenu').evaluate(el=>{el.open=true;});await page.locator('#animationLibraryButton').click();
  await field(dialog,'select').selectOption(gary.id);await field(dialog,'edit').click();
  await field(dialog,'file').setInputFiles({name:'gary-new.png',mimeType:'image/png',buffer:services.sheet});
  await dialog.getByRole('button',{name:'Save Animation',exact:true}).click();await expect(field(dialog,'status')).toContainText('personal library');
  const replacement=(await animationRecords(page)).find(a=>a.id===gary.id);expect(replacement.revision).toBe(gary.revision+1);expect(replacement.sprite).not.toBe(gary.sprite);
  expect((await savedSpell()).animations.travel.animationId).toBe(gary.id);await field(dialog,'close').click();await previewAndCast(replacement.sprite,1.5);
  expect(errors).toEqual([]);
});

test("every spell stage supports Choose, Replace, Preview, Clear, Create, Upload and persistent built-in Remix",async({page})=>{
  test.setTimeout(120000);
  const errors=watchErrors(page);const services=await mockAnimationServices(page);
  // HTTPS application origin without production writes: all app bytes still
  // come from the test server. This exercises real relative built-in URL resolution.
  const origin='https://homebrewgod.acceptance.test/';
  await page.route(origin+'**',async route=>{const u=new URL(route.request().url());const response=await route.fetch({url:new URL(u.pathname+u.search,process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:4173').href});await route.fulfill({response});});
  await openBattle(page,'',origin);
  await page.evaluate(async()=>{const api=window.__HOMEBREW_GOD_RELEASE_TEST__;await api.openScreen('characterCreator');api.prepareCharacterCreatorClassTest({stepId:'spells'});});
  await page.locator('[data-cc-action="edit-spell-animations"]').click();const panel=page.getByRole('dialog',{name:'Spell animations',exact:true}),dialog=page.locator('#animationLibraryDialog');
  for(const slot of ['cast','travel','impact','sustain','end']) {
    const row=panel.locator(`[data-spell-animation-slot="${slot}"]`),action=name=>row.locator(`[data-slot-action="${name}"]`);
    for(const id of ['sword_slash_01','cold_burst_01']) {
      await action('choose').click();await field(dialog,'select').selectOption(id);await field(dialog,'use-selected').click();
      await expect(row.locator('[data-slot-name]')).toHaveText(id==='sword_slash_01'?'Sword slash':'Cold burst');
      await expect(action('choose')).toHaveText('Replace');
    }
    await action('preview').click();await expect(panel.locator('[data-animation-id="cold_burst_01"]')).toBeVisible();
    await panel.locator('[data-spell-stop]').click();await expect(panel.locator('.hg-map-vfx-effect')).toHaveCount(0);
    await action('clear').click();await expect(row.locator('[data-slot-name]')).toHaveText('No animation');
    for(const mode of ['create','upload']) {
      const chooser=mode==='upload'?page.waitForEvent('filechooser'):null;
      await action(mode).click();await field(dialog,'name').fill(`${slot} ${mode}`);
      const payload={name:`${slot}-${mode}.png`,mimeType:'image/png',buffer:services.sheet};
      if(chooser)await (await chooser).setFiles(payload);else await field(dialog,'file').setInputFiles(payload);
      await dialog.getByRole('button',{name:'Save Animation',exact:true}).click();await expect(dialog).not.toBeVisible();
      await expect(row.locator('[data-slot-name]')).toHaveText(`${slot} ${mode}`);
      const record=(await animationRecords(page)).find(a=>a.name===`${slot} ${mode}`);expect(record.sprite).toMatch(/^https:\/\//);expect(JSON.stringify(record)).not.toContain('data:');
    }
    await action('choose').click();await field(dialog,'select').selectOption('sword_slash_01');await field(dialog,'use-selected').click();
    await action('remix').click();await field(dialog,'name').fill(`${slot} sword remix`);
    await dialog.getByRole('button',{name:'Save Animation',exact:true}).click();await expect(dialog).not.toBeVisible();
    const remix=(await animationRecords(page)).find(a=>a.name===`${slot} sword remix`);expect(remix.id).not.toBe('sword_slash_01');expect(remix.sprite).toBe(origin+'assets/vfx/combat/melee/sword-slash-test.png');
    await expect(row.locator('[data-slot-name]')).toHaveText(`${slot} sword remix`);
  }
  expect((await animationRecords(page))).toHaveLength(15);
  expect((await libraryState(page)).animations.find(a=>a.id==='sword_slash_01').ownership.kind).toBe('builtin');
  await panel.locator('[data-spell-save]').click();await expect(panel).not.toBeVisible();expect(errors).toEqual([]);
});

test("actual map preview and confirmed Fireball/cone/line casts preserve the same Source and map aiming target",async({page})=>{
  await page.setViewportSize({width:1280,height:1400});
  await mockAnimationServices(page);await openBattle(page);await realTokens(page,'huge','large');
  await page.locator('#battleMapSurface').evaluate(el=>{el.style.height='600px';el.style.minHeight='600px';});
  await page.evaluate(async()=>{
    const {getAnimationSession}=await import('/vfx/animationWorkspace.js');const s=getAnimationSession(document);
    for(const [id,behavior] of [['acceptance_cast','static'],['acceptance_travel','projectile'],['acceptance_impact','static']]) {
      s.library.registerAnimation({id,name:id,sprite:'https://res.cloudinary.com/acceptance/image/upload/sprite.png',grid:{columns:6,rows:6},frameCount:36,fps:60,behavior,projectile:{speed:1000}});
    }
    const animations={cast:'acceptance_cast',travel:'acceptance_travel',impact:'acceptance_impact'};
    for(const id of ['fireball','burning-hands','lightning-bolt'])s.bindings.setAnimation('spell:'+id,{animations});
    window.acceptanceCasts=[];document.addEventListener('homebrewgod:spell-cast-confirmed',e=>window.acceptanceCasts.push(e.detail));
  });
  const errors=watchErrors(page);
  for(const spellId of ['fireball','burning-hands','lightning-bolt']) {
    await selectPreview(page,spellId);const source=await tokenCenter(page,'acceptance-source');
    await page.mouse.click(source.x,source.y);
    const overlay=await page.locator('.hg-map-template-layer').boundingBox();
    const destination={x:overlay.x+overlay.width*.75,y:overlay.y+overlay.height*.6};await page.mouse.click(destination.x,destination.y);
    await expect(page.locator('#playSpellPreviewVfxButton')).toBeEnabled();await page.locator('#playSpellPreviewVfxButton').click();
    const effect=page.locator('#battleMapSurface [data-animation-id="acceptance_cast"]');await expect(effect).toBeVisible();
    const box=await effect.boundingBox();expect(box.x+box.width/2).toBeCloseTo(source.x,0);expect(box.y+box.height/2).toBeCloseTo(source.y,0);
    const preview=await page.evaluate(()=>window.__HOMEBREW_GOD_RELEASE_TEST__.getSpellPreviewVfxState().event);
    expect(preview.targetTokenId).toBeNull();
    await expect(page.locator('#battleMapSurface [data-animation-id="acceptance_impact"]')).toBeVisible();
    const impact=await page.locator('#battleMapSurface [data-animation-id="acceptance_impact"]').boundingBox();
    expect(impact.x+impact.width/2).toBeCloseTo(destination.x,0);expect(impact.y+impact.height/2).toBeCloseTo(destination.y,0);
    await page.locator('#stopSpellPreviewVfxButton').click();await expect(page.locator('#battleMapSurface .hg-map-vfx-effect')).toHaveCount(0);
    await page.evaluate(spellId=>window.__HOMEBREW_GOD_RELEASE_TEST__.beginSpellCast({spellId}),spellId);
    // Opening the cast panel changes page layout. Pick the same MAP point,
    // not the stale client coordinate from before the panel opened.
    await page.locator('#battleToolsMenu').evaluate(el=>{el.open=false;});
    await page.locator('.hg-map-template-layer').click({force:true,position:{x:preview.targetPoint.x,y:preview.targetPoint.y}});
    const targeted = await page.evaluate(()=>window.__HOMEBREW_GOD_RELEASE_TEST__.getSpellCastState());
    expect(targeted.canConfirm, JSON.stringify({spellId, targeted})).toBe(true);
    await expect(page.locator('#confirmSpellCastButton')).toBeEnabled();await page.locator('#confirmSpellCastButton').click();
    await expect(effect).toBeVisible();
    const cast=await page.evaluate(()=>window.acceptanceCasts.at(-1));expect(cast.casterTokenId).toBe(preview.casterTokenId);expect(cast.targetTokenId).toBeNull();
    expect(cast.targetPoint.x).toBeCloseTo(preview.targetPoint.x,0);expect(cast.targetPoint.y).toBeCloseTo(preview.targetPoint.y,0);
    const castSource=await tokenCenter(page,'acceptance-source');
    const actualSource=await effect.boundingBox();expect(actualSource.x+actualSource.width/2).toBeCloseTo(castSource.x,0);expect(actualSource.y+actualSource.height/2).toBeCloseTo(castSource.y,0);
    await expect(page.locator('#battleMapSurface .hg-map-vfx-effect')).toHaveCount(0,{timeout:12000});
  }
  expect(errors).toEqual([]);
});

test("real token centers, projectile directions and native sprite facing survive all zooms, pan, resize and elevation",async({page})=>{
  await mockAnimationServices(page);await openBattle(page);
  const results=await page.evaluate(async()=>{
    const [{createAnimationLibrary},{createAnimationPlayer},{createBattleMapEffectEngine}]=await Promise.all([import('/vfx/animationLibrary.js'),import('/vfx/animationPlayer.js'),import('/vfx/effectEngine.js')]);
    const api=window.__HOMEBREW_GOD_RELEASE_TEST__,surface=document.querySelector('#battleMapSurface');
    const library=createAnimationLibrary();library.registerAnimation({id:'matrix',name:'Matrix',sprite:'https://res.cloudinary.com/acceptance/image/upload/sprite.png',grid:{columns:6,rows:6},frameCount:36,fps:60});
    let zoom=1;const engine=createBattleMapEffectEngine({surface,getScale:()=>zoom,getTokenElement:id=>surface.querySelector(`.hg-token[data-token-id="${id}"]`)}),player=createAnimationPlayer({engine,library});
    const wait=()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))),checks=[],directions=[];
    const token=(id,size,x,y,elevation=0)=>({id,name:id,type:'player',mapMode:'single',sizeCategory:size,x,y,elevation});
    function delta(effect,id){const body=surface.querySelector(`.hg-token[data-token-id="${id}"] > .hg-token-fallback`),a=body.getBoundingClientRect(),b=effect.getBoundingClientRect();return {x:b.left+b.width/2-a.left-a.width/2,y:b.top+b.height/2-a.top-a.height/2};}
    for(const scale of [.5,.75,1,1.25,1.5,2]) {
      document.querySelector('#zoomResetButton').click();for(let n=0;n<Math.abs(scale-1)/.25;n++)document.querySelector(scale>1?'#zoomInButton':'#zoomOutButton').click();zoom=scale;
      for(const [sourceSize,targetSize] of [['medium','medium'],['medium','large'],['large','medium'],['huge','medium'],['medium','huge'],['huge','huge']]) {
        api.setMovementTestTokens([token('s',sourceSize,25,50),token('t',targetSize,65,50)]);engine.refresh();
        for(const [placement,id] of [['SOURCE','s'],['TARGET','t']]) {
          const run=await player.playAnimation('matrix',{sourceTokenId:'s',targetTokenId:'t',placement:{mode:placement,followSource:true,followTarget:true},playback:'hold'});await wait();checks.push({scale,sourceSize,targetSize,...delta(surface.querySelector(`[data-animation-id="matrix"]`),id)});run.cancel();
        }
      }
    }
    // Keep real token rendering; their image body (not their label box) is the anchor.
    zoom=1;document.querySelector('#zoomResetButton').click();api.setMovementTestTokens([token('s','medium',50,50),token('t','large',75,50)]);engine.refresh();
    for(const native of ['right','left','up','down'])for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,-1],[1,1],[-1,1]]) {
      const src=engine.getAnimationPoint({id:'s'}),target={x:src.centerX+dx*100,y:src.centerY+dy*100};let last;
      const run=await player.playAnimation('matrix',{sourceTokenId:'s',targetPoint:target,behavior:'projectile',projectile:{speed:5000},direction:{sourceDirection:native},onFrame:f=>{last=f;}});
      await run.arrived;await run.finished;directions.push({native,dx,dy,x:last.x,y:last.y,rotation:last.rotation,target});
    }
    const moving=await player.playAnimation('matrix',{sourceTokenId:'s',targetTokenId:'t',placement:{mode:'SOURCE',followSource:true},playback:'hold'});await wait();
    surface.style.marginLeft='87px';surface.style.width='550px';engine.refresh();await wait();checks.push(delta(surface.querySelector('[data-animation-id="matrix"]'),'s'));moving.cancel();
    for(const [se,te] of [[0,0],[10,0],[0,10],[20,30]]) {
      api.setMovementTestTokens([token('s','huge',25,50,se),token('t','medium',65,50,te)]);engine.refresh();
      const run=await player.playAnimation('matrix',{sourceTokenId:'s',targetTokenId:'t',sourceElevation:se,targetElevation:te,placement:{mode:'TARGET'},playback:'hold'});await wait();checks.push(delta(surface.querySelector('[data-animation-id="matrix"]'),'t'));run.cancel();
    }
    player.destroy();engine.destroy();return {checks,directions,remaining:surface.querySelectorAll('[data-animation-id="matrix"]').length};
  });
  for(const check of results.checks){expect(check.x).toBeCloseTo(0,0);expect(check.y).toBeCloseTo(0,0);}
  for(const d of results.directions){expect(d.x).toBeCloseTo(d.target.x,1);expect(d.y).toBeCloseTo(d.target.y,1);expect(d.rotation).toBeCloseTo(Math.atan2(d.dy,d.dx)*180/Math.PI-({right:0,left:180,up:-90,down:90}[d.native]),1);}
  expect(results.checks).toHaveLength(77);expect(results.directions).toHaveLength(32);expect(results.remaining).toBe(0);
});

test("real-token sword, spear, claw, self heal, targeted heal, aura, beam and ground placement stay bounded and follow the right actors",async({page})=>{
  await mockAnimationServices(page);await openBattle(page);await realTokens(page);
  const result=await page.evaluate(async()=>{
    const [{createAnimationLibrary},{createAnimationPlayer},{createBattleMapEffectEngine}]=await Promise.all([import('/vfx/animationLibrary.js'),import('/vfx/animationPlayer.js'),import('/vfx/effectEngine.js')]);
    const api=window.__HOMEBREW_GOD_RELEASE_TEST__,surface=document.querySelector('#battleMapSurface'),library=createAnimationLibrary();
    for(const id of ['sword','spear','claw','heal','aura','beam','ground'])library.registerAnimation({id,name:id,sprite:'https://res.cloudinary.com/acceptance/image/upload/sprite.png',grid:{columns:6,rows:6},frameCount:36,fps:60});
    const engine=createBattleMapEffectEngine({surface,getTokenElement:id=>surface.querySelector(`.hg-token[data-token-id="${id}"]`)}),player=createAnimationPlayer({engine,library});
    const wait=()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))),sourceId='acceptance-source',targetId='acceptance-target';
    const token=(id,x,y)=>({id,name:id,type:'player',mapMode:'single',sizeCategory:id===sourceId?'huge':'medium',x,y});
    const move=(sx,sy,tx,ty)=>{api.setMovementTestTokens([token(sourceId,sx,sy),token(targetId,tx,ty)]);engine.refresh();};
    const anchor=id=>{const p=engine.getAnimationPoint({id});return {x:p.centerX,y:p.centerY};},melee=[];
    for(const id of ['sword','spear','claw'])for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,-1],[1,1],[-1,1]]) {
      move(50,50,50+dx*20,50+dy*20);const s=anchor(sourceId),t=anchor(targetId),angle=Math.atan2(t.y-s.y,t.x-s.x);let last;
      const run=await player.playAnimation(id,{sourceTokenId:sourceId,targetTokenId:targetId,behavior:'melee',placement:{mode:'SOURCE_TOWARD_TARGET',towardOffset:40},direction:{mode:'face-target'},playback:'hold',onFrame:f=>{last=f;}});
      await wait();const first={x:last.x,y:last.y};await wait();melee.push({id,first,last:{x:last.x,y:last.y,rotation:last.rotation},expected:{x:s.x+Math.cos(angle)*40,y:s.y+Math.sin(angle)*40,rotation:angle*180/Math.PI}});run.cancel();
    }
    const following=[];
    for(const [id,placement,followSource,followTarget] of [['aura','SOURCE',true,false],['heal','TARGET',false,true],['beam','MIDPOINT',true,true]]) {
      move(25,50,65,50);let last;const run=await player.playAnimation(id,{sourceTokenId:sourceId,targetTokenId:targetId,behavior:id==='beam'?'beam':'static',placement:{mode:placement,followSource,followTarget},playback:'hold',onFrame:f=>{last=f;}});
      await wait();move(35,30,70,65);await wait();const s=anchor(sourceId),t=anchor(targetId);following.push({id,last:{x:last.x,y:last.y},expected:id==='beam'?{x:(s.x+t.x)/2,y:(s.y+t.y)/2}:id==='aura'?s:t});run.cancel();
    }
    let selfFrame;const self=await player.playAnimation('heal',{sourceTokenId:sourceId,targetTokenId:sourceId,placement:{mode:'TARGET',followTarget:true},direction:{mode:'face-target'},rotation:17,playback:'hold',onFrame:f=>{selfFrame=f;}});
    await wait();const selfResult={x:selfFrame.x,y:selfFrame.y,rotation:selfFrame.rotation,expected:anchor(sourceId)};self.cancel();
    const point={x:450,y:180},layer=engine.getOverlayElement(),before={width:layer.clientWidth,height:layer.clientHeight};let groundFrame;const ground=await player.playAnimation('ground',{sourceTokenId:sourceId,targetTokenId:null,world:point,targetPoint:point,placement:{mode:'WORLD',fixedToMap:true,followSource:false,followTarget:false},playback:'hold',onFrame:f=>{groundFrame=f;}});
    await wait();move(10,70,20,80);await wait();const afterActorMove={x:groundFrame.x,y:groundFrame.y};
    // Margin also shrinks this responsive map. A fixed MAP point retains its
    // selected normalized map location, not its old absolute overlay pixels.
    surface.style.marginLeft='53px';engine.refresh();await wait();const groundResult={x:groundFrame.x,y:groundFrame.y,afterActorMove,expected:{x:point.x*layer.clientWidth/before.width,y:point.y*layer.clientHeight/before.height}};ground.cancel();
    player.destroy();engine.destroy();return {melee,following,self:selfResult,ground:groundResult,remaining:surface.querySelectorAll('[data-animation-id]').length};
  });
  for(const sample of result.melee){expect(sample.last.x).toBeCloseTo(sample.expected.x,1);expect(sample.last.y).toBeCloseTo(sample.expected.y,1);expect(sample.last.rotation).toBeCloseTo(sample.expected.rotation,1);expect(sample.last.x).toBeCloseTo(sample.first.x,1);expect(sample.last.y).toBeCloseTo(sample.first.y,1);}
  for(const sample of [...result.following,result.self,result.ground]){const actual=sample.last||sample;expect(actual.x).toBeCloseTo(sample.expected.x,1);expect(actual.y).toBeCloseTo(sample.expected.y,1);}
  expect(result.ground.afterActorMove).toEqual({x:450,y:180});expect(result.melee).toHaveLength(24);expect(result.self.rotation).toBe(17);expect(result.remaining).toBe(0);
});

test("signed-in creator uploads, reloads, edits and replaces sprites without changing Animation ID",async({page})=>{
  const errors=watchErrors(page);
  const services=await mockAnimationServices(page);await openBattle(page);
  await expect.poll(async()=>(await libraryState(page)).status?.state).toBe('ready');
  await page.locator('#animationLibraryButton').click();const dialog=page.locator('#animationLibraryDialog');
  await field(dialog,'custom').click();await field(dialog,'name').fill('Gary Missile');
  await field(dialog,'file').setInputFiles({name:'gary.png',mimeType:'image/png',buffer:services.sheet});
  await field(dialog,'fps').fill('36');await field(dialog,'advanced-mode').check();await field(dialog,'behavior').selectOption('projectile');
  await field(dialog,'draft-preview').click();await expect(dialog.locator('.hg-map-vfx-effect')).not.toHaveCount(0);
  await field(dialog,'stop').click();await dialog.getByRole('button',{name:'Save Animation',exact:true}).click();
  await expect(field(dialog,'status')).toContainText('personal library');
  const [record]=await animationRecords(page);expect(record.name).toBe('Gary Missile');expect(record.grid).toEqual({columns:6,rows:6});
  expect(record.fps).toBe(36);expect(record.behavior).toBe('projectile');expect(record.sprite).toMatch(/^https:\/\/res.cloudinary.com/);
  expect(JSON.stringify(record)).not.toContain('data:');expect(services.uploads()).toBe(1);
  await page.reload();await page.waitForFunction(()=>Boolean(window.__HOMEBREW_GOD_RELEASE_TEST__));
  await expect.poll(async()=>(await libraryState(page)).animations.find(a=>a.id===record.id)?.name).toBe('Gary Missile');
  await page.evaluate(async()=>{const api=window.__HOMEBREW_GOD_RELEASE_TEST__;await api.openScreen('battle');api.setDmRole(true);});
  await page.locator('#battleToolsMenu').evaluate(el=>{el.open=true;});
  await page.locator('#animationLibraryButton').click();await field(dialog,'select').selectOption(record.id);
  await field(dialog,'play').click();await expect(dialog.locator(`[data-animation-id="${record.id}"]`)).toBeVisible();await field(dialog,'stop').click();
  await field(dialog,'edit').click();await field(dialog,'fps').fill('48');await field(dialog,'scale').fill('1.5');
  await field(dialog,'file').setInputFiles({name:'gary-replaced.png',mimeType:'image/png',buffer:services.sheet});
  await dialog.getByRole('button',{name:'Save Animation',exact:true}).click();
  await expect(field(dialog,'status')).toContainText('personal library');
  const [replacement]=await animationRecords(page);expect(replacement.id).toBe(record.id);expect(replacement.revision).toBe(record.revision+1);
  expect(replacement.sprite).not.toBe(record.sprite);expect(replacement.fps).toBe(48);expect(replacement.scale).toBe(1.5);
  await page.reload();await expect.poll(async()=>(await libraryState(page)).animations.find(a=>a.id===record.id)?.fps).toBe(48);
  expect(errors).toEqual([]);
});

test("spell creator uses the signed-in persistent library and saves all stage IDs and overrides to Firestore before reload",async({page})=>{
  const errors=watchErrors(page);
  const room='ABC-123',services=await mockAnimationServices(page,{room});await openBattle(page,room);
  await page.evaluate(async()=>{const api=window.__HOMEBREW_GOD_RELEASE_TEST__;await api.openScreen('characterCreator');api.prepareCharacterCreatorClassTest({stepId:'spells'});});
  await page.locator('#ccNewSpellName').fill('Fireball Test');await page.locator('#ccNewSpellRange').fill('120 feet');
  await page.locator('[data-cc-action="edit-spell-animations"]').click();const panel=page.getByRole('dialog',{name:'Spell animations',exact:true});
  await panel.locator('[data-spell-animation-slot="travel"] [data-slot-action="create"]').click();const dialog=page.locator('#animationLibraryDialog');
  await field(dialog,'name').fill('Spell Gary Missile');await field(dialog,'file').setInputFiles({name:'spell-gary.png',mimeType:'image/png',buffer:services.sheet});
  await dialog.getByRole('button',{name:'Save Animation',exact:true}).click();await expect(dialog).not.toBeVisible();
  const [gary]=await animationRecords(page);expect(gary?.name).toBe('Spell Gary Missile');
  for(const slot of ['cast','impact','sustain','end']) {
    await panel.locator(`[data-spell-animation-slot="${slot}"] [data-slot-action="choose"]`).click();
    await field(dialog,'select').selectOption(gary.id);await field(dialog,'use-selected').click();
  }
  const row=panel.locator('[data-spell-animation-slot="travel"]');await row.locator('summary').click();
  await row.locator('[data-slot-scale]').fill('1.5');await row.locator('[data-slot-placement]').selectOption('SOURCE_TO_TARGET');
  await row.locator('[data-slot-offset-x]').fill('12');await row.locator('[data-slot-flip-x]').check();
  await row.locator('[data-slot-fade-in]').fill('0.2');
  await panel.locator('[data-spell-save]').click();await expect(panel).not.toBeVisible();await page.locator('#ccNewSpellKnown').uncheck();
  const add=page.locator('[data-cc-action="add-custom-spell"]');await add.focus();await add.click();
  await expect(page.locator('[data-cc-action="edit-spell-animations"][data-spell-id]')).toHaveCount(1);
  await page.evaluate(()=>window.__HOMEBREW_GOD_RELEASE_TEST__.setCharacterCreatorTestStep('basics'));await page.locator('#ccCharacterName').fill('Acceptance Wizard');
  await page.locator('#characterWizardSaveButton').click();
  const savedSpells=()=>page.evaluate(room=>Object.entries(JSON.parse(localStorage.getItem('acceptance-firestore')||'{}')).filter(([path])=>path.startsWith(`rooms/${room}/characters/`)).flatMap(([,record])=>record.magic?.customSpells||[]),room);
  await expect.poll(async()=>(await savedSpells()).length).toBe(1);
  await page.reload();await page.waitForFunction(()=>Boolean(window.__HOMEBREW_GOD_RELEASE_TEST__));
  await page.evaluate(()=>window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen('characterCreator'));
  const spell=(await savedSpells()).find(s=>s.name==='Fireball Test');expect(Object.keys(spell.animations)).toHaveLength(5);
  for(const ref of Object.values(spell.animations))expect(typeof ref==='string'?ref:ref.animationId).toBe(gary.id);
  expect(spell.animations.travel.overrides).toMatchObject({scaleMultiplier:1.5,offsetX:12,flipX:true,appearance:{fadeIn:0.2},placement:{mode:'SOURCE_TO_TARGET'}});
  expect((await animationRecords(page))[0].transform.flipX).toBe(false);
  await page.evaluate(async()=>{const api=window.__HOMEBREW_GOD_RELEASE_TEST__;await api.openScreen('battle');api.setDmRole(true);});
  await page.locator('#battleToolsMenu').evaluate(el=>{el.open=true;});
  await expect(page.locator('#spellTemplateSelect optgroup[data-custom-spells]')).toContainText('Fireball Test');
  await page.locator('#animationLibraryButton').click();await field(dialog,'select').selectOption(gary.id);await field(dialog,'delete').click();
  const warning=field(dialog,'delete-warning');
  if (await warning.isVisible()) await field(dialog,'delete-remove').click();
  await expect(field(dialog,'status')).toContainText('Saved spell “Fireball Test”');
  expect((await animationRecords(page)).some(a=>a.id===gary.id)).toBe(true);
  expect(errors).toEqual([]);
});

test("failed saves and deletes preserve persistent definitions and spell dependencies; remixes are independent",async({page})=>{
  const services=await mockAnimationServices(page);await openBattle(page);await page.locator('#animationLibraryButton').click();const dialog=page.locator('#animationLibraryDialog');
  await field(dialog,'custom').click();await field(dialog,'name').fill('Safe Gary');await field(dialog,'file').setInputFiles({name:'safe.png',mimeType:'image/png',buffer:services.sheet});
  await dialog.getByRole('button',{name:'Save Animation',exact:true}).click();await expect(field(dialog,'status')).toContainText('personal library');
  const [original]=await animationRecords(page);await field(dialog,'edit').click();await field(dialog,'fps').fill('52');
  await page.evaluate(()=>localStorage.setItem('acceptance-write-failure','1'));await dialog.getByRole('button',{name:'Save Animation',exact:true}).click();
  await expect(field(dialog,'status')).toContainText('permission denied');
  expect((await animationRecords(page))[0].fps).toBe(original.fps);expect((await libraryState(page)).animations.find(a=>a.id===original.id).fps).toBe(original.fps);
  await page.evaluate(()=>localStorage.removeItem('acceptance-write-failure'));await dialog.getByRole('button',{name:'Save Animation',exact:true}).click();
  await expect(field(dialog,'status')).toContainText('personal library');expect((await animationRecords(page))[0].revision).toBe(original.revision+1);
  await field(dialog,'duplicate').click();const copyId=await field(dialog,'select').inputValue();expect(copyId).not.toBe(original.id);
  await field(dialog,'name').fill('Independent Gary');await field(dialog,'fps').fill('60');await dialog.getByRole('button',{name:'Save Animation',exact:true}).click();
  await expect(field(dialog,'status')).toContainText('personal library');const records=await animationRecords(page);
  expect(records.find(a=>a.id===original.id).fps).toBe(52);expect(records.find(a=>a.id===copyId).fps).toBe(60);
  await page.evaluate(async id=>{const {getAnimationSession}=await import('/vfx/animationWorkspace.js');getAnimationSession(document).bindings.setAnimation('spell:used',{animations:{travel:id}});},copyId);
  await field(dialog,'delete').click();await expect(field(dialog,'delete-warning')).toContainText('spell:used');
  await page.evaluate(()=>localStorage.setItem('acceptance-delete-failure','1'));await field(dialog,'delete-remove').click();await expect(field(dialog,'status')).toContainText('offline delete');
  const usage=()=>page.evaluate(async id=>{const {getAnimationSession}=await import('/vfx/animationWorkspace.js');const s=getAnimationSession(document);return {exists:!!s.library.getAnimation(id),binding:s.bindings.getAssignment('spell:used')};},copyId);
  expect((await usage()).binding.animations.travel).toBe(copyId);expect((await animationRecords(page)).some(a=>a.id===copyId)).toBe(true);
  await page.evaluate(()=>localStorage.removeItem('acceptance-delete-failure'));await field(dialog,'delete-remove').click();await expect(field(dialog,'status')).toContainText('removed');
  expect((await usage()).exists).toBe(false);expect((await usage()).binding.animations.travel).toBeUndefined();
  await field(dialog,'select').selectOption('sword_slash_01');await expect(field(dialog,'delete')).toBeDisabled();
});

test("missing and failed hosted sprites warn and fall back; offline personal sync cannot break map preview",async({page})=>{
  await mockAnimationServices(page);await openBattle(page);await realTokens(page);
  await page.evaluate(async()=>{
    const {getAnimationSession}=await import('/vfx/animationWorkspace.js');const s=getAnimationSession(document);
    s.library.registerAnimation({id:'gone',name:'Gone',sprite:'https://res.cloudinary.com/acceptance/image/upload/gone.png',grid:{columns:6,rows:6}});
    s.bindings.setAnimation('spell:fireball',{animations:{travel:'gone'}});s.library.deleteAnimation('gone',{removeReferences:true});
    // A persisted spell can reference an asset deleted on another device.
    s.library.trackReferences('missing-fixture',{name:'missing',get:()=>null,replace(){}});
    window.missingSpell={id:'missing-fixture',name:'Missing fixture',level:3,animations:{travel:'missing_animation'},targeting:{range:{type:'feet',distance:120},target:{type:'point'},area:{shape:'sphere',radius:20}}};
    const select=document.querySelector('#spellTemplateSelect');select.append(new Option('Unavailable sprite','fireball'));
    s.library.registerAnimation({id:'failed',name:'Failed Cloudinary sprite',sprite:'https://res.cloudinary.com/acceptance/image/upload/failed.png',grid:{columns:6,rows:6}});
    s.bindings.setAnimation('spell:fireball',{animations:{travel:'failed'}});
  });
  await page.route('https://res.cloudinary.com/acceptance/image/upload/failed.png',route=>route.abort('failed'));
  await selectPreview(page,'fireball');const source=await tokenCenter(page,'acceptance-source');await page.mouse.click(source.x,source.y);
  await page.locator('.hg-map-template-layer').click({force:true,position:{x:550,y:220}});await page.locator('#playSpellPreviewVfxButton').click();
  await expect(page.locator('#templateStatus')).toContainText('Unable to load animation sprite');await expect(page.locator('#templateStatus')).toContainText('legacy');
  await expect(page.locator('#battleMapSurface [data-animation-id="failed"]')).toHaveCount(0);await expect(page.locator('#battleMapSurface .hg-map-vfx-effect')).not.toHaveCount(0);
  await page.locator('#stopSpellPreviewVfxButton').click();await expect(page.locator('#battleMapSurface .hg-map-vfx-effect')).toHaveCount(0);
  await page.evaluate(async()=>{localStorage.setItem('acceptance-offline','1');const {getAnimationSession}=await import('/vfx/animationWorkspace.js');await getAnimationSession(document).persistence.load({force:true});});
  await page.locator('#battleToolsMenu').evaluate(el=>{el.open=true;});
  await page.locator('#animationLibraryButton').click();const dialog=page.locator('#animationLibraryDialog');await expect(field(dialog,'session')).toContainText('could not be loaded');
  await expect(dialog.locator('[data-choose-animation="failed"]')).toContainText('Unavailable sprite');
  await field(dialog,'select').selectOption('sword_slash_01');await field(dialog,'play').click();await expect(dialog.locator('[data-animation-id="sword_slash_01"]')).toBeVisible();await field(dialog,'close').click();
  const missing=await page.evaluate(async()=>{
    const [{getAnimationSession},{createAnimationSpellAdapter},{createAnimationPlayer},{createBattleMapEffectEngine}]=await Promise.all([import('/vfx/animationWorkspace.js'),import('/vfx/animationSpellAdapter.js'),import('/vfx/animationPlayer.js'),import('/vfx/effectEngine.js')]);
    const s=getAnimationSession(document),surface=document.createElement('div');document.body.append(surface);const engine=createBattleMapEffectEngine({surface}),player=createAnimationPlayer({engine,library:s.library});let fallback=0;
    const legacy={play:()=>{fallback++;return {ok:true}},clear(){},clearPreviews(){},destroy(){},getState:()=>({activeCount:0,sequences:[]})};
    const adapter=createAnimationSpellAdapter({player,library:s.library,bindings:s.bindings,legacy});const result=adapter.play(window.missingSpell);adapter.destroy();player.destroy();engine.destroy();surface.remove();return {result,fallback};
  });
  expect(missing.result.ok).toBe(true);expect(missing.result.warning).toContain('unavailable');expect(missing.fallback).toBe(1);
});

test("Sustain preview plays End after two seconds and 20 rapid stop/replays plus modes release DOM, instances and audio",async({page})=>{
  await mockAnimationServices(page);await openBattle(page);
  const result=await page.evaluate(async()=>{
    const [{createAnimationLibrary,createAnimationBindings},{createAnimationPlayer},{createAnimationSpellAdapter},{createBattleMapEffectEngine}]=await Promise.all([import('/vfx/animationLibrary.js'),import('/vfx/animationPlayer.js'),import('/vfx/animationSpellAdapter.js'),import('/vfx/effectEngine.js')]);
    const library=createAnimationLibrary(),surface=document.createElement('div');surface.style.cssText='position:relative;width:600px;height:300px';document.body.append(surface);
    const originalAudio=window.Audio,calls=[];let sound=true;
    window.Audio=class {constructor(src){this.src=src;this.plays=0;this.pauses=0;calls.push(this);}play(){this.plays++;return Promise.resolve();}pause(){this.pauses++;}removeAttribute(){this.src=null;}load(){this.disposed=true;}};
    for(const id of ['cast','travel','impact','sustain','end'])library.registerAnimation({id,name:id,sprite:'https://res.cloudinary.com/acceptance/image/upload/sprite.png',grid:{columns:6,rows:6},frameCount:3,fps:60,playback:id==='sustain'?'loop':'once',sound:{src:'https://example.test/sound.mp3'}});
    const engine=createBattleMapEffectEngine({surface}),player=createAnimationPlayer({engine,library,isSoundEnabled:()=>sound}),bindings=createAnimationBindings({library});
    const legacy={play:()=>({ok:true}),clear(){},clearPreviews(){},destroy(){},getState:()=>({activeCount:0,sequences:[]})},adapter=createAnimationSpellAdapter({legacy,player,library,bindings});
    const stages={cast:'cast',travel:{animationId:'travel',overrides:{projectile:{speed:5000}}},impact:'impact',sustain:'sustain',end:'end'},events=[];
    const event={preview:true,animations:stages,casterPoint:{x:100,y:150},targetPoint:{x:400,y:150},targetTokenId:null};
    const start=performance.now(),run=adapter.play(event,{onEvent:e=>{if(e.type==='stage')events.push(e.slot);}}),ready=await run.ready;await ready.finished;
    const duration=performance.now()-start;
    const pauseRun=await adapter.play(event).ready;await new Promise(done=>setTimeout(done,250));pauseRun.pause();
    const pauses=calls.reduce((n,c)=>n+c.pauses,0);await new Promise(done=>setTimeout(done,100));pauseRun.resume();sound=false;await new Promise(done=>requestAnimationFrame(done));adapter.clearPreviews();sound=true;
    let maximum=0;for(let i=0;i<20;i++){const pending=adapter.play({...event,targetPoint:{x:200+i*5,y:100}});if(i%2===0)await pending.ready;maximum=Math.max(maximum,engine.getState().activeCount);adapter.clearPreviews();}
    const modes=[];for(const mode of ['full','reduced','off']){engine.setMode(mode);const r=adapter.play(event);modes.push({mode,ok:r.ok,reason:r.reason});if(r.ready)await r.ready;adapter.clearPreviews();}
    const state={effects:engine.getState().activeCount,sequences:adapter.getState().activeCount,instances:ready.handles.flatMap(h=>h.instances||[]).filter(i=>i.active).length,nodes:surface.querySelectorAll('.hg-map-vfx-effect').length};
    adapter.destroy();player.destroy();engine.destroy();surface.remove();window.Audio=originalAudio;
    return {events,duration,maximum,pauses,modes,state,audio:calls.map(c=>({plays:c.plays,disposed:c.disposed,src:c.src}))};
  });
  expect(result.events).toEqual(['cast','travel','impact','sustain','end']);expect(result.duration).toBeGreaterThanOrEqual(2000);expect(result.duration).toBeLessThan(5000);
  expect(result.maximum).toBeLessThanOrEqual(1);expect(result.pauses).toBeGreaterThan(0);expect(result.state).toEqual({effects:0,sequences:0,instances:0,nodes:0});
  expect(result.modes.map(m=>m.ok)).toEqual([true,true,true]);expect(result.modes.at(-1).reason).toBe('effects-off');
  expect(result.audio.some(a=>a.plays>0)).toBe(true);for(const audio of result.audio){expect(audio.disposed).toBe(true);expect(audio.src).toBeNull();}
});

test("shared spell preview stage measures distance, supports keyboard, swap, drag, reset and resized anchors",async({page})=>{
  await mockAnimationServices(page);await openBattle(page);
  await page.evaluate(async()=>{const {openSpellAnimationPanel}=await import('/vfx/spellAnimationPanel.js');void openSpellAnimationPanel({animations:{impact:'sword_slash_01'}});});
  const panel=page.getByRole('dialog',{name:'Spell animations',exact:true}),surface=panel.locator('[data-spell-animation-preview]'),source=panel.locator('[data-spell-source]'),target=panel.locator('[data-spell-target]');
  await panel.locator('[data-spell-distance]').selectOption('30');
  const ratios=()=>panel.evaluate(el=>{const p=el.querySelector('[data-spell-animation-preview]').getBoundingClientRect();const c=key=>{const r=el.querySelector('[data-spell-'+key+']').getBoundingClientRect();return {x:(r.left+r.width/2-p.left)/p.width,y:(r.top+r.height/2-p.top)/p.height};};return {source:c('source'),target:c('target')};});
  const original=await ratios();expect(original.target.x-original.source.x).toBeCloseTo(30/150,2);await source.press('ArrowRight');expect((await ratios()).source.x).toBeCloseTo(original.source.x+.015,2);
  const before=await ratios();await panel.locator('[data-spell-swap]').click();expect((await ratios()).target.x).toBeCloseTo(before.source.x,2);
  const b=await source.boundingBox(),s=await surface.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(s.x+s.width*.3,s.y+s.height*.7,{steps:4});await page.mouse.up();
  expect((await ratios()).source.x).toBeCloseTo(.3,2);const dragged=await ratios();await page.setViewportSize({width:1000,height:900});expect((await ratios()).source.x).toBeCloseTo(dragged.source.x,2);
  await panel.locator('[data-spell-reset]').click();expect((await ratios()).source.x).toBeCloseTo(.24,2);expect((await ratios()).target.x).toBeCloseTo(.76,2);
  await panel.locator('[data-spell-cancel]').click();await expect(panel).not.toBeVisible();
});

test("all per-spell overrides validate and change presentation without mutating the base; Animation default clears nested overrides",async({page})=>{
  await mockAnimationServices(page);await openBattle(page);
  await page.evaluate(async()=>{
    const [{getAnimationSession},{openSpellAnimationPanel}]=await Promise.all([import('/vfx/animationWorkspace.js'),import('/vfx/spellAnimationPanel.js')]);
    const s=getAnimationSession(document);s.library.registerAnimation({id:'override_base',name:'Override base',sprite:'https://res.cloudinary.com/acceptance/image/upload/sprite.png',grid:{columns:6,rows:6},scale:2,rotation:12,flipY:true,offsetY:7,appearance:{tint:'#4499ff',opacity:.8},projectile:{speed:300}});
    window.overrideBase=JSON.stringify(s.library.getAnimation('override_base'));
    void openSpellAnimationPanel({animations:{impact:'override_base'}}).then(value=>{window.overrideResult=value;});
  });
  const panel=page.getByRole('dialog',{name:'Spell animations',exact:true}),row=panel.locator('[data-spell-animation-slot="impact"]');await row.locator('summary').click();
  for(const [key,value] of [['scale','1.5'],['speed','1.25'],['opacity','0.5'],['rotation','30'],['offset-x','9'],['offset-y','11'],['projectile-speed','1.5'],['fade-in','0.2'],['fade-out','0.3']])await row.locator(`[data-slot-${key}]`).fill(value);
  await row.locator('[data-slot-placement]').selectOption('WORLD');await row.locator('[data-slot-direction]').selectOption('face-away');await row.locator('[data-slot-flip-x]').check();await row.locator('[data-slot-flip-y]').uncheck();
  await row.locator('[data-slot-tint]').fill('#ff5500');await panel.locator('[data-spell-save]').click();await expect(panel).not.toBeVisible();
  const result=await page.evaluate(async()=>{
    const [{getAnimationSession},{createAnimationPlayer},{createBattleMapEffectEngine}]=await Promise.all([import('/vfx/animationWorkspace.js'),import('/vfx/animationPlayer.js'),import('/vfx/effectEngine.js')]);
    const library=getAnimationSession(document).library,surface=document.createElement('div');document.body.append(surface);const engine=createBattleMapEffectEngine({surface}),player=createAnimationPlayer({engine,library});
    const ref=window.overrideResult.impact,prepared=await player.prepareAnimation(ref.animationId,ref.overrides);
    const unchanged=JSON.stringify(library.getAnimation(ref.animationId))===window.overrideBase;player.destroy();engine.destroy();surface.remove();return {ref,definition:prepared.definition,unchanged};
  });
  expect(result.unchanged).toBe(true);expect(result.definition).toMatchObject({scale:3,rotation:42,offsetX:9,offsetY:11,flipX:true,flipY:false,projectile:{speed:450},timing:{speed:1.25},appearance:{opacity:.4,tint:'#ff5500',fadeIn:.2,fadeOut:.3},placement:{mode:'WORLD'},direction:{mode:'face-away'}});
  await page.evaluate(async()=>{const {openSpellAnimationPanel}=await import('/vfx/spellAnimationPanel.js');void openSpellAnimationPanel({animations:window.overrideResult}).then(value=>{window.overrideCleared=value;});});
  await row.locator('summary').click();await row.locator('[data-slot-placement]').selectOption('');await row.locator('[data-slot-direction]').selectOption('');await row.locator('[data-slot-fade-in]').fill('');await row.locator('[data-slot-fade-out]').fill('');
  await panel.locator('[data-spell-save]').click();await expect(panel).not.toBeVisible();const cleared=await page.evaluate(()=>window.overrideCleared.impact.overrides);
  expect(cleared.placement).toBeUndefined();expect(cleared.direction).toBeUndefined();expect(cleared.appearance).toBeUndefined();
  await page.evaluate(async()=>{const {openSpellAnimationPanel}=await import('/vfx/spellAnimationPanel.js');void openSpellAnimationPanel({animations:{impact:'override_base'}}).then(value=>{window.untouched=value;});});
  await panel.locator('[data-spell-save]').click();await expect(panel).not.toBeVisible();expect(await page.evaluate(()=>window.untouched.impact.overrides)).toEqual({});
});
