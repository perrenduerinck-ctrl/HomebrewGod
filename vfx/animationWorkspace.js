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

export function createAnimationWorkspace({ engine, document = globalThis.document }) {
  const library = createAnimationLibrary({ builtins: BUILTIN_ANIMATIONS });
  const bindings = createAnimationBindings({ library });
  const player = createAnimationPlayer({ engine, library });
  const editor = createAnimationEditor({ dialog: document.getElementById("animationLibraryDialog"),
    button: document.getElementById("animationLibraryButton"), library, bindings,
    actions: getAnimationActions() });
  return Object.freeze({ library, bindings, player,
    wrapSequences: (legacy, onStateChange) => createAnimationSpellAdapter({ legacy, player, library, bindings, onStateChange }),
    clear() { player.clear(); editor.close(); },
    destroy() { editor.destroy(); player.destroy(); }
  });
}
