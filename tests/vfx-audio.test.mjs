import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createCastingSequenceSystem, createDefaultCastingSequenceRegistry } from "../vfx/castingSequence.js";
import { createSpellAudioPlayer, LIGHTNING_BOLT_SOUND, normalizeSoundCue } from "../vfx/spellAudio.js";

function harness(initialMode = "full", failPlay = false) {
  let now = 0, next = 0, mode = initialMode, created = 0, plays = 0;
  const timers = new Map(), requests = [], attrs = {};
  const scheduler = { now: () => now,
    setTimeout(fn, delay) { const id = ++next; timers.set(id, {fn, at:now+delay}); return id; },
    clearTimeout(id) { timers.delete(id); } };
  const media = { paused:true, currentTime:0, getAttribute: key => attrs[key],
    setAttribute(key,value) { attrs[key]=value; }, removeAttribute(key) { delete attrs[key]; },
    play() { plays++; this.paused=false; return failPlay ? Promise.reject(Error("autoplay blocked")) : Promise.resolve(); },
    pause() { this.paused=true; }, load() {}, remove() { this.removed=true; } };
  const player = createSpellAudioPlayer({scheduler, getMode:()=>mode,
    createAudio() { created++; return media; } });
  const engine = {getState:()=>({mode}), play(effect) {requests.push(effect); return {ok:true,cancel(){}};} };
  const system = createCastingSequenceSystem({effectEngine:engine, scheduler, audioPlayer:player});
  function advance(ms) {
    const target=now+ms;
    while (true) {
      const entry=[...timers].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];
      if (!entry) break;
      timers.delete(entry[0]); now=entry[1].at; entry[1].fn();
    }
    now=target;
  }
  return {system,player,media,requests,advance,timers,
    setMode(value){mode=value;}, stats:()=>({created,plays})};
}
const bolt = preview => ({spellId:"lightning-bolt",preview,spellLevel:3,damageTypes:["lightning"],
  casterPoint:{x:0,y:0},targetPoint:{x:200,y:0},affectedTokens:Array.from({length:300},(_,i)=>({id:String(i)}))});

test("the supplied clip is unchanged and sound cues only accept local bounded audio", () => {
  const bytes=readFileSync(new URL("../assets/audio/spells/lightning-bolt.mp3",import.meta.url));
  assert.equal(bytes.length,132911);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),"ef6261691b438b49a3b19b462bdf1a65d8aecd67e2083297d401ea7756b01471");
  for(const src of ["https://example.com/a.mp3","./assets/audio/../a.mp3","data:audio/mp3,x"]) assert.equal(normalizeSoundCue({src}),null);
  const cue=normalizeSoundCue({...LIGHTNING_BOLT_SOUND,volume:99,maximumDuration:1e9});
  assert.equal(cue.volume,1); assert.equal(cue.maximumDuration,10000);
  assert.equal(createDefaultCastingSequenceRegistry().resolve({spellId:"fire-bolt",damageTypes:["fire"]}).sound,null);
});

test("both Lightning Bolt variants sound once at discharge in preview and confirmed playback", () => {
  for(const preview of [true,false]) for(const variant of ["5x5","4x4"]) for(const mode of ["full","reduced","off"]) {
    const h=harness(mode),event=bolt(preview),before=JSON.stringify(event);
    h.system.play(event,variant==="4x4"?{sequenceId:"profile-lightning-bolt"}:{});
    const delay=Math.round((variant==="5x5"?328:420)*(mode==="reduced"?.6:1));
    h.advance(delay-1); assert.equal(h.stats().plays,0);
    h.advance(1); assert.equal(h.stats().plays,mode==="off"?0:1);
    if(mode!=="off") {assert.equal(h.media.volume,mode==="reduced"?.39:.6);assert.equal(h.media.loop,false);}
    h.advance(20000); assert.equal(h.player.getState().activeCount,0); assert.equal(h.media.paused,true);
    assert.equal(h.timers.size,0); assert.equal(JSON.stringify(event),before);
    if(variant==="5x5") assert.equal(h.requests.length,mode==="full"?2:mode==="reduced"?1:0);
  }
});

test("thunder tail survives visual completion but Reset, mute, Off, cancel and destruction stop it", () => {
  const h=harness(); let handle=h.system.play(bolt(true)); h.advance(1200);
  assert.equal(h.system.getState().activeCount,0); assert.equal(h.player.getState().activeCount,1);
  h.system.clearPreviews(); assert.equal(h.media.paused,true); assert.equal(h.timers.size,0);
  handle=h.system.play(bolt(false));h.advance(1200);h.system.clearPreviews();assert.equal(h.media.paused,false);
  assert.equal(handle.cancel(),true);assert.equal(h.media.paused,true);
  h.system.play(bolt(true));h.advance(400);h.system.setSoundEnabled(false);assert.equal(h.media.paused,true);
  const count=h.stats().plays;h.system.play(bolt(true));h.advance(400);assert.equal(h.stats().plays,count);
  h.system.setSoundEnabled(true);h.system.play(bolt(true));h.setMode("off");h.advance(400);assert.equal(h.media.paused,true);
  h.setMode("full");h.system.play(bolt(true));h.advance(400);h.setMode("off");h.system.clear("effects-off");assert.equal(h.media.paused,true);
  h.setMode("full");h.system.play(bolt(true));h.advance(400);h.system.destroy();
  assert.equal(h.media.removed,true);assert.equal(h.timers.size,0);
});

test("rapid replays reuse one audio channel and natural end/error handlers release it", () => {
  const h=harness();
  for(let i=0;i<100;i++){h.system.play(bolt(true));h.advance(350);assert.equal(h.player.getState().activeCount,1);}
  assert.equal(h.stats().created,1);assert.equal(h.stats().plays,100);
  h.media.onended();assert.equal(h.player.getState().activeCount,0);
  h.system.play(bolt(true));h.advance(400);h.media.onerror();assert.equal(h.player.getState().activeCount,0);
  h.system.clear();h.advance(20000);assert.equal(h.timers.size,0);
});

test("autoplay rejection and missing audio support cannot fail or delay visual playback", async () => {
  const h=harness("full",true);assert.equal(h.system.play(bolt(true)).ok,true);h.advance(400);
  await Promise.resolve();assert.equal(h.player.getState().activeCount,0);assert.equal(h.media.paused,true);
  h.advance(20000);assert.equal(h.requests.length,2);assert.equal(h.timers.size,0);
  const player=createSpellAudioPlayer({createAudio(){throw Error("audio unavailable");}});
  assert.equal(player.play(LIGHTNING_BOLT_SOUND),false);
});
