import { createAnimationLibrary, createAnimationBindings } from "./animationLibrary.js";
import { BUILTIN_ANIMATIONS } from "./animationBuiltins.js";
import { createAnimationPlayer } from "./animationPlayer.js";
import { createAnimationEditor } from "./animationEditor.js";
import { createAnimationSpellAdapter } from "./animationSpellAdapter.js";
import { SPELL_VFX_PROFILES } from "./spellVfxProfiles.js";
import { createDefaultCastingSequenceRegistry } from "./castingSequence.js";

export function getAnimationActions() {
  const spells = new Map(SPELL_VFX_PROFILES.map(p => [p.spellId, p.label]));
  for (const sequence of createDefaultCastingSequenceRegistry().list()) {
    for (const id of sequence.match.spellIds) if (!spells.has(id)) spells.set(id, sequence.label || id);
  }
  return [{ key: "attack:sword-slash", name: "Sword slash test" }, ...[...spells]
    .map(([id, name]) => ({ key: `spell:${id}`, name })).sort((a, b) => a.name.localeCompare(b.name))];
}

const sessions = new WeakMap();
export function getAnimationSession(document = globalThis.document) {
  if (sessions.has(document)) return sessions.get(document);
  const library = createAnimationLibrary({ builtins: BUILTIN_ANIMATIONS });
  const bindings = createAnimationBindings({ library });
  const isSoundEnabled = () => document.getElementById("battleVfxSoundToggle")?.checked !== false;
  const editor = createAnimationEditor({ dialog: document.getElementById("animationLibraryDialog"),
    button: document.getElementById("animationLibraryButton"), library, bindings,
    actions: getAnimationActions(), isSoundEnabled });
  const session = { library, bindings, editor, isSoundEnabled }; sessions.set(document, session); return session;
}

export function createAnimationWorkspace({ engine, document = globalThis.document }) {
  const { library, bindings, editor, isSoundEnabled } = getAnimationSession(document);
  const player = createAnimationPlayer({ engine, library, isSoundEnabled });
  return Object.freeze({ library, bindings, player,
    wrapSequences: (legacy, onStateChange) => createAnimationSpellAdapter({ legacy, player, library, bindings, onStateChange }),
    clear() { player.clear(); editor.close(); },
    // The editor/library belong to the document and can also be used by spells.
    destroy() { player.destroy(); editor.close(); }
  });
}
