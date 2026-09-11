import { test, expect } from "@playwright/test";

test("real shared renderer aligns tokens, projectiles and beams through map zoom, pan and self targeting", async ({ page }) => {
  await page.goto("?smokeTest=1");
  const result = await page.evaluate(async () => {
    const [{ createAnimationLibrary }, { createAnimationPlayer }, { createBattleMapEffectEngine }] = await Promise.all([
      import("/vfx/animationLibrary.js"), import("/vfx/animationPlayer.js"), import("/vfx/effectEngine.js")]);
    const canvas=document.createElement("canvas"); canvas.width=60; canvas.height=60; const ctx=canvas.getContext("2d"); ctx.fillStyle="#55aaff"; ctx.fillRect(1,1,8,8);
    const library=createAnimationLibrary(); library.registerAnimation({id:"runtime_sprite",name:"Runtime",sprite:canvas.toDataURL(),grid:{columns:6,rows:6},frameCount:1,playback:"loop",placement:{mode:"SOURCE",followSource:true}});
    const surface=document.createElement("div"); surface.style.cssText="position:absolute;left:50px;top:100px;width:600px;height:300px;transform-origin:0 0"; document.body.append(surface);
    const actors=[80,400].map((x,i)=>{const node=document.createElement("div");node.dataset.tokenId=String(i);node.style.cssText=`position:absolute;left:${x}px;top:100px;width:40px;height:40px`;const body=document.createElement("div");body.className="hg-token-fallback";body.style.cssText="width:40px;height:40px;transform:translateY(-20px)";node.append(body);surface.append(node);return node;});
    let zoom=1; const engine=createBattleMapEffectEngine({surface,getScale:()=>zoom,getTokenElement:id=>actors[Number(id)]});const player=createAnimationPlayer({engine,library});
    const wait=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const played=await player.playAnimation("runtime_sprite",{source:actors[0],target:actors[1],debugPoints:true}); await wait();
    const delta=()=>{const effect=surface.querySelector(".hg-vfx-animation-sprite"),body=actors[0].firstChild.getBoundingClientRect(),overlay=engine.getOverlayElement().getBoundingClientRect();return {x:parseFloat(effect.style.left)-(body.left+body.width/2-overlay.left),y:parseFloat(effect.style.top)-(body.top+body.height/2-overlay.top)};};
    const checks=[delta()]; zoom=1.5;surface.style.transform="scale(1.5)";engine.refresh();await wait();checks.push(delta());
    surface.style.left="175px";surface.style.top="210px";engine.refresh();await wait();checks.push(delta());actors[0].style.left="130px";await wait();checks.push(delta());
    const debug=surface.querySelector(".hg-animation-runtime-debug output").textContent; played.cancel();
    const self=await player.playAnimation("runtime_sprite",{source:actors[0],target:actors[0],rotation:17});await wait();const rotation=surface.querySelector(".hg-vfx-animation-sprite").style.getPropertyValue("--hg-vfx-rotation");self.cancel();
    const projectile=await player.playAnimation("runtime_sprite",{source:actors[0],target:{x:600,y:200},behavior:"projectile",projectile:{speed:5000},playback:"hold"});const arrival=await projectile.arrived;await projectile.finished;
    const missing=await player.playAnimation("runtime_sprite",{source:actors[0],placement:{mode:"TARGET"}});await wait();const missingDelta=delta();missing.cancel();
    player.destroy();engine.destroy();const remaining=surface.querySelectorAll(".hg-map-vfx-effect,.hg-animation-runtime-debug").length;surface.remove();return{checks,debug,rotation,arrival,missingDelta,remaining};
  });
  for(const p of [...result.checks,result.missingDelta]) {expect(p.x).toBeCloseTo(0,1);expect(p.y).toBeCloseTo(0,1);}
  expect(result.rotation).toBe("17deg");expect(result.debug).toContain("Distance");expect(result.arrival).toEqual(["arrived"]);expect(result.remaining).toBe(0);
});

test("spell creation uploads an animation in place, stores stage IDs, preserves fields and tracks usage", async ({ page }) => {
  const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("dialog",async d=>{errors.push(d.message());await d.dismiss();});
  await page.goto("?smokeTest=1&view=characterCreator");
  await page.waitForFunction(()=>Boolean(window.__HOMEBREW_GOD_RELEASE_TEST__));
  await page.evaluate(async()=>{const api=window.__HOMEBREW_GOD_RELEASE_TEST__;await api.openScreen("characterCreator");api.prepareCharacterCreatorClassTest({stepId:"spells"});});
  await page.locator("#ccNewSpellName").fill("Prismatic test spell");await page.locator("#ccNewSpellRange").fill("30 feet");
  await page.locator('[data-cc-action="edit-spell-animations"]').click();
  const panel=page.getByRole("dialog",{name:"Spell animations",exact:true});await expect(panel).toBeVisible();
  await panel.locator('[data-spell-animation-slot="impact"] [data-slot-action="create"]').click();
  const creator=page.locator("#animationLibraryDialog");await expect(creator).toBeVisible();await creator.locator("[data-animation-name]").fill("Prismatic impact");
  const data=await page.evaluate(()=>{const c=document.createElement("canvas");c.width=60;c.height=60;const x=c.getContext("2d");x.fillStyle="#88aaff";x.fillRect(0,0,60,60);return c.toDataURL().split(",")[1];});
  await creator.locator("[data-animation-file]").setInputFiles({name:"impact.png",mimeType:"image/png",buffer:Buffer.from(data,"base64")});
  await creator.getByRole("button",{name:"Save Animation",exact:true}).click();await expect(creator).not.toBeVisible();
  await expect(panel.locator('[data-spell-animation-slot="impact"]')).toContainText("Prismatic impact");
  await panel.locator("[data-spell-animation-add]").selectOption("travel");
  await panel.locator('[data-spell-animation-slot="travel"] [data-slot-action="choose"]').click();await creator.locator("[data-animation-select]").selectOption("sword_slash_01");await creator.locator("[data-animation-use-selected]").click();
  await panel.screenshot({path:"output/vfx/combat-sprite-test/spell-animation-panel.png"});
  await panel.locator("[data-spell-play]").click();await expect(panel.locator(".hg-map-vfx-effect")).not.toHaveCount(0);await panel.locator("[data-spell-stop]").click();
  await panel.locator("[data-spell-save]").click();await expect(panel).not.toBeVisible();
  await expect(page.locator("#ccNewSpellName")).toHaveValue("Prismatic test spell");await expect(page.locator("#ccNewSpellRange")).toHaveValue("30 feet");
  await page.locator("#ccNewSpellKnown").uncheck();
  const addSpell = page.locator('[data-cc-action="add-custom-spell"]');
  // Let the existing field-limit hint settle when focus leaves the form field.
  await addSpell.focus(); await addSpell.click();
  expect(errors).toEqual([]);
  const edit=page.locator('[data-cc-action="edit-spell-animations"][data-spell-id]');await expect(edit).toHaveCount(1);await edit.click();
  await expect(panel.locator('[data-spell-animation-slot="impact"]')).toContainText("Prismatic impact");await expect(panel.locator('[data-spell-animation-slot="travel"]')).toContainText("Sword slash");
  const usage=await page.evaluate(async()=>{const {getAnimationSession}=await import("/vfx/animationWorkspace.js");const {library}=getAnimationSession(document);const a=library.list().find(a=>a.name==="Prismatic impact");return {id:a.id,usage:library.getAnimationUsage(a.id)};});
  expect(usage.id).toMatch(/^custom_/);expect(usage.usage.some(x=>x.name==="Prismatic test spell")).toBe(true);expect(errors).toEqual([]);
  await panel.locator('[data-spell-animation-slot="travel"] [data-slot-action="clear"]').click();
  await panel.locator("[data-spell-save]").click(); await expect(panel).not.toBeVisible(); await edit.click();
  await expect(panel.locator('[data-spell-animation-slot="travel"]')).toHaveCount(0);
  await panel.locator("[data-spell-cancel]").click();
  await page.evaluate(async id=>{const {getAnimationSession}=await import("/vfx/animationWorkspace.js");void getAnimationSession(document).editor.openForSlot({animationId:id});},usage.id);
  await creator.locator("[data-animation-delete]").click();
  await expect(creator.locator("[data-animation-delete-warning]")).toContainText("Prismatic test spell");
  await creator.locator("[data-animation-delete-replacement]").selectOption("sword_slash_01");
  await creator.locator("[data-animation-delete-replace]").click();
  await page.evaluate(async()=>{const {getAnimationSession}=await import("/vfx/animationWorkspace.js");getAnimationSession(document).editor.close();});
  await edit.click();await expect(panel.locator('[data-spell-animation-slot="impact"]')).toContainText("Sword slash");
  await panel.locator("[data-spell-cancel]").click();expect(errors).toEqual([]);
});

test("real Fireball stages, healing, spear, ground area and beam use the same runtime at several map transforms", async ({ page }) => {
  await page.goto("?smokeTest=1");
  const result = await page.evaluate(async () => {
    const [{createAnimationLibrary},{createAnimationPlayer},{createBattleMapEffectEngine},{createAnimationSequenceController}] = await Promise.all([
      import("/vfx/animationLibrary.js"),import("/vfx/animationPlayer.js"),import("/vfx/effectEngine.js"),import("/vfx/animationSequence.js")]);
    const canvas=document.createElement("canvas"); canvas.width=60;canvas.height=60;canvas.getContext("2d").fillRect(0,0,60,60);
    const library=createAnimationLibrary();
    for(const id of ["cast","travel","impact"]) library.registerAnimation({id,name:id,sprite:canvas.toDataURL(),grid:{columns:6,rows:6},frameCount:3,fps:60,events:id==="cast"?[{frame:1,type:"SHOW_TOKEN"}]:[]});
    const surface=document.createElement("div");surface.style.cssText="position:absolute;left:30px;top:80px;width:600px;height:300px;transform-origin:0 0";document.body.append(surface);
    const source=document.createElement("div");source.style.cssText="position:absolute;left:80px;top:100px;width:40px;height:40px";surface.append(source);
    let zoom=1;const engine=createBattleMapEffectEngine({surface,getScale:()=>zoom}),player=createAnimationPlayer({engine,library}),controller=createAnimationSequenceController({player});
    const wait=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))),checks=[];
    for (const [scale,left] of [[1,30],[1.6,30],[1.6,170]]) {
      zoom=scale;surface.style.transform=`scale(${scale})`;surface.style.left=`${left}px`;engine.refresh();
      const frames={cast:[],travel:[],impact:[]},events=[];
      const sequence=await controller.playAnimationSequence({source,target:{x:450*scale,y:160*scale},animations:{cast:"cast",travel:{animationId:"travel",overrides:{projectile:{speed:5000}}},impact:"impact"},
        onEvent:event=>events.push(event.type),onFrame:frame=>{if(frames[frame.animationId])frames[frame.animationId].push({x:frame.x,y:frame.y});}});
      await sequence.finished;
      const cast=frames.cast.at(-1),impact=frames.impact.at(-1);
      checks.push({cast,impact,source:{x:100*scale,y:120*scale},target:{x:450*scale,y:160*scale},events});
    }
    const samples={};
    async function sample(key,options){const run=await player.playAnimation("impact",{source,target:{x:640,y:240},playback:"hold",...options});await wait();const effect=surface.querySelector(".hg-vfx-animation-sprite"),sprite=effect.querySelector(".hg-vfx-sprite");samples[key]={x:parseFloat(effect.style.left),y:parseFloat(effect.style.top),rotation:effect.style.getPropertyValue("--hg-vfx-rotation"),spriteTransform:sprite.style.transform};run.cancel();}
    await sample("sword",{behavior:"melee",placement:{mode:"SOURCE"},direction:{sourceDirection:"UP"}});
    await sample("spear",{behavior:"melee",placement:{mode:"SOURCE_TOWARD_TARGET",towardOffset:40,visualReach:10}});
    await sample("self",{target:source,placement:{mode:"TARGET"},rotation:13});
    await sample("other",{placement:{mode:"TARGET"}});
    await sample("beam",{behavior:"beam",beam:{thickness:24}});
    await sample("ground",{world:{x:320,y:270},placement:{mode:"WORLD",fixedToMap:true},area:{shape:"circle",radius:20,unit:"ft"},grid:{pixelsPerFoot:10}});
    controller.clear();player.destroy();engine.destroy();const remaining=surface.querySelectorAll(".hg-map-vfx-effect").length;surface.remove();return{checks,samples,remaining};
  });
  for(const c of result.checks){expect(c.cast.x).toBeCloseTo(c.source.x,1);expect(c.cast.y).toBeCloseTo(c.source.y,1);expect(c.impact.x).toBeCloseTo(c.target.x,1);expect(c.impact.y).toBeCloseTo(c.target.y,1);expect(c.events.filter(x=>x==="stage")).toHaveLength(3);expect(c.events.filter(x=>x==="SHOW_TOKEN")).toHaveLength(1);expect(c.events.filter(x=>x==="arrived")).toHaveLength(1);}
  expect(result.samples.sword.x).toBeCloseTo(160,1);expect(parseFloat(result.samples.sword.rotation)).toBeGreaterThan(90);
  expect(result.samples.spear.x).toBeGreaterThan(160);expect(result.samples.spear.x).toBeLessThan(201);
  expect(result.samples.self.rotation).toBe("13deg");expect(result.samples.self.x).toBeCloseTo(160,1);
  expect(result.samples.other.x).toBe(640);expect(result.samples.beam.x).toBeCloseTo(400,1);
  expect(result.samples.ground.x).toBe(320);expect(result.samples.ground.y).toBe(270);expect(result.samples.ground.spriteTransform).toContain("scale(2.5, 2.5)");expect(result.remaining).toBe(0);
});
