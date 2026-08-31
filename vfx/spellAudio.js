// Optional presentation-only audio. One reusable channel prevents cast spam
// from stacking thunder clips; visual timing never waits for audio playback.
export const LIGHTNING_BOLT_SOUND = Object.freeze({
  src: "./assets/audio/spells/lightning-bolt.mp3", phase: "travel",
  delay: 0, volume: 0.6, maximumDuration: 6000
});

const bounded = (value, fallback, min, max) =>
  Math.min(max, Math.max(min, Number.isFinite(Number(value)) ? Number(value) : fallback));

export function normalizeSoundCue(value) {
  if (!value || !/^\.\/assets\/audio\/[a-z0-9/_-]+\.mp3$/i.test(value.src || "")) return null;
  return Object.freeze({ src: value.src,
    phase: ["charge", "release", "travel", "impact", "aftermath"].includes(value.phase) ? value.phase : "travel",
    delay: Math.round(bounded(value.delay, 0, 0, 5000)),
    volume: bounded(value.volume, .6, 0, 1),
    maximumDuration: Math.round(bounded(value.maximumDuration, 6000, 100, 10000)) });
}

function createBrowserAudio() {
  if (typeof document === "undefined") return null;
  const audio = document.createElement("audio");
  audio.hidden = true;
  audio.dataset.vfxAudio = "spell";
  document.body.appendChild(audio);
  return audio;
}

export function createSpellAudioPlayer({ createAudio = createBrowserAudio,
  scheduler = { setTimeout, clearTimeout }, getMode = () => "full" } = {}) {
  let audio = null, current = null, enabled = true, destroyed = false;

  function cancel(id) {
    if (!current || (id != null && current.id !== id)) return false;
    const record = current;
    current = null;
    for (const timer of [record.startTimer, record.endTimer]) {
      if (timer != null) { try { scheduler.clearTimeout(timer); } catch {} }
    }
    try { audio.onended = null; audio.onerror = null; audio.pause(); audio.currentTime = 0; } catch {}
    return true;
  }

  function play(rawCue, { id, preview = false, delay = 0 } = {}) {
    const cue = normalizeSoundCue(rawCue);
    if (destroyed || !enabled || getMode() === "off" || !cue) return false;
    cancel();
    try {
      audio ||= createAudio();
      if (!audio) return false;
      audio.preload = "auto";
      audio.loop = false;
      // Keep the same decoded media element across repeated casts.
      if (audio.getAttribute("src") !== cue.src) audio.setAttribute("src", cue.src);
      const record = { id, preview, startTimer: null, endTimer: null };
      current = record;
      const stopThis = () => { if (current === record) cancel(); };
      const start = () => {
        if (current !== record) return;
        record.startTimer = null;
        if (!enabled || getMode() === "off") { stopThis(); return; }
        try {
          audio.volume = cue.volume * (getMode() === "reduced" ? .65 : 1);
          audio.currentTime = 0;
          audio.onended = stopThis;
          audio.onerror = stopThis;
          record.endTimer = scheduler.setTimeout(stopThis, cue.maximumDuration);
          Promise.resolve(audio.play()).catch(stopThis);
        } catch { stopThis(); }
      };
      record.startTimer = scheduler.setTimeout(start, bounded(delay, 0, 0, 20000));
      return true;
    } catch { cancel(); return false; }
  }

  function clearPreviews() { if (current?.preview) cancel(); }
  function setEnabled(value) { enabled = value === true; if (!enabled) cancel(); return enabled; }
  function destroy() {
    cancel(); destroyed = true;
    try { audio?.removeAttribute("src"); audio?.load(); audio?.remove(); } catch {}
    audio = null;
  }
  return Object.freeze({ play, cancel, clear: () => cancel(), clearPreviews, setEnabled, destroy,
    getState: () => Object.freeze({ enabled, activeCount: current ? 1 : 0 }) });
}
