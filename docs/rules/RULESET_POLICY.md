# Homebrew God Ruleset Policy

## Active rules mode

Homebrew God currently supports **Legacy 5e (2014)** only.

- Ruleset ID: `dnd5e-2014`
- Rules mode: `legacy-2014`
- Edition label: `2014`
- Current catalog policy: `srd-plus-labeled-legacy`

The character creator must not silently combine 2014 and 2024 mechanics.
Content explicitly labeled `2024` or `dnd5e-2024` is incompatible with the
active creator and must not appear as selectable 2014 content.

Future 2024 support must use a separate rules mode with separate validation,
progression tables, content metadata, and saved-character compatibility rules.

## Catalog scope

The built-in catalog includes:

1. SRD 5.1 material, labeled `SRD 5.1 (CC BY 4.0)`.
2. Additional legacy 5e catalog entries, labeled
   `Legacy 5e supplement (non-SRD)`.

The generic non-SRD label records the current provenance boundary without
claiming that an entry is part of SRD 5.1. Exact publication-level citations
can be added as the content audit proceeds, but an unlabeled non-SRD entry is
not permitted in the built-in catalog.
