import { ANIMATION_SLOTS, normalizeSpellAnimationReference } from "./animationReferences.js";

// Lightweight presentation controller. Arrival/completion are emitted by the
// player; no independent motion clock, HP changes or token mutations live here.
export function createAnimationSequenceController({ player, scheduler = globalThis } = {}) {
  const active = new Set();
  let revision = 0;
  async function playAnimationSequence(context = {}) {
    const current = revision;
    let stages;
    try {
      stages = (context.stages || ANIMATION_SLOTS.filter(slot => context.animations?.[slot]).map(slot => ({ slot, ...normalizeSpellAnimationReference(context.animations[slot]), ...(slot === "impact" && context.animations.travel && !context.animations[slot]?.trigger ? { trigger: "onArrival" } : {}) })))
        .map(stage => ({ slot: stage.slot || "impact", ...normalizeSpellAnimationReference(stage) }));
      if (!stages.length || stages.length > 32) throw new Error("Choose between 1 and 32 animation stages.");
      if (context.duration && (!["manual", "seconds", "minutes", "hours", "rounds", "turns"].includes(context.duration.unit) || context.duration.unit !== "manual" && (!Number.isFinite(Number(context.duration.value)) || Number(context.duration.value) <= 0))) throw new Error("Choose a valid effect duration.");
      await Promise.all(stages.map(stage => player.prepareAnimation(stage.animationId, { ...stage.overrides, ...context, duration: context.maximumDuration || 5000 })));
    } catch (error) { return { ok: false, reason: "sprite-unavailable", message: error.message }; }
    if (context.signal?.aborted || current !== revision) return { ok: false, reason: "cancelled" };
    const handles = [], waits = new Set(); let cancelled = false, ending = false, paused = false, previous = null, travel = null;
    let settings = { ...context }, resolveEnd;
    const durationEnded = new Promise(resolve => { resolveEnd = resolve; });
    const notify = event => { try { settings.onEvent?.(event); } catch { /* Host observers do not own visuals. */ } };
    const sleep = ms => new Promise(resolve => {
      const wait = { remaining: ms, resolve, timer: null, at: 0 };
      wait.start = () => { wait.at = Date.now(); wait.timer = scheduler.setTimeout(() => { waits.delete(wait); resolve(); }, wait.remaining); };
      waits.add(wait); if (!paused) wait.start();
    });
    function cancel() { cancelled = true; resolveEnd(); handles.forEach(h => h.cancel?.()); for (const w of waits) { scheduler.clearTimeout(w.timer); w.resolve(); } waits.clear(); active.delete(api); }
    function end() { ending = true; resolveEnd(); handles.forEach(h => h.cancel?.()); for (const w of waits) { scheduler.clearTimeout(w.timer); w.resolve(); } waits.clear(); }
    const api = { ok: true, handles, cancel, end,
      update(changes) { settings = { ...settings, ...changes }; },
      pause() { if (paused) return; paused = true; handles.forEach(h => h.pause?.()); for (const w of waits) { scheduler.clearTimeout(w.timer); w.remaining = Math.max(0, w.remaining - (Date.now() - w.at)); } },
      resume() { if (!paused) return; paused = false; handles.forEach(h => h.resume?.()); waits.forEach(w => w.start()); }
    };
    active.add(api); context.signal?.addEventListener("abort", cancel, { once: true });
    api.finished = (async () => {
      try {
        for (const stage of stages) {
          if (cancelled || ending && stage.slot !== "end") continue;
          if (stage.trigger === "durationEnd") await durationEnded;
          else if (stage.trigger === "onArrival" && travel) await travel.arrived;
          else if (stage.trigger === "onImpact" && previous) await (previous.impacted || previous.finished);
          else if (!["immediate", "durationStart"].includes(stage.trigger) && previous) await previous.finished;
          if (cancelled || ending && stage.slot !== "end") continue;
          if (stage.delay) await sleep(stage.delay);
          if (cancelled || ending && stage.slot !== "end") continue;
          const defaults = stage.slot === "cast" ? { placement: { mode: "SOURCE" } } : stage.slot === "travel" ? { behavior: "projectile", placement: { mode: "SOURCE_TO_TARGET" } } : ["impact", "end"].includes(stage.slot) ? { placement: { mode: "TARGET" } } : { placement: { mode: "TARGET", followTarget: true } };
          const overrides = { ...defaults, ...stage.overrides, placement: { ...defaults.placement, ...stage.overrides.placement } };
          if (stage.slot === "sustain" && context.duration) { overrides.placement.persist = true; overrides.placement.duration = 0; overrides.duration = undefined; }
          else overrides.duration = context.maximumDuration || 5000;
          const runtimeSettings = { ...settings, ...overrides, onEvent: notify };
          for (const key of ["source", "target"]) if (settings[key] != null) runtimeSettings[key] = () => typeof settings[key] === "function" ? settings[key]() : settings[key];
          const result = await player.playAnimation(stage.animationId, runtimeSettings);
          if (!result.ok) { cancel(); return { ok: false, reason: result.reason, message: result.message }; }
          handles.push(result);
          if (cancelled || ending && stage.slot !== "end") { result.cancel(); continue; }
          // Effects Off, renderer teardown and external cancellation also end
          // manual sustains and release stages waiting for a duration event.
          result.finished.then(reasons => {
            if (!ending && !cancelled && [reasons].flat().some(reason => reason !== "completed")) cancel();
          });
          if (paused) result.pause();
          notify({ type: "stage", slot: stage.slot, animationId: stage.animationId });
          if (stage.slot === "travel") travel = result;
          previous = stage.waitForCompletion ? result : null;
          if (stage.slot === "sustain") {
            const duration = context.duration;
            if (["manual", "rounds", "turns"].includes(duration?.unit)) await durationEnded;
            else if (duration && ["seconds", "minutes", "hours"].includes(duration.unit)) {
              await sleep(Math.max(0, Math.min(86400000, Number(duration.value || 0) * ({ seconds: 1000, minutes: 60000, hours: 3600000 }[duration.unit]))));
              resolveEnd();
            } else await result.finished;
            ending = !cancelled; result.cancel(); resolveEnd(); previous = null;
          }
        }
        await Promise.all(handles.map(h => h.finished)); return { ok: !cancelled, reason: cancelled ? "cancelled" : "completed" };
      } finally { active.delete(api); context.signal?.removeEventListener("abort", cancel); }
    })();
    return api;
  }
  return { playAnimationSequence, startEffect: playAnimationSequence, clear() { revision++; [...active].forEach(x => x.cancel()); }, getInstances: () => [...active].flatMap(x => x.handles.flatMap(h => h.instances || [])) };
}
