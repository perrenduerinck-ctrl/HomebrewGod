# Spell sound assets

`spells/lightning-bolt.mp3` is an unchanged copy of the project owner's supplied
`patricksilvey-weather-lightning-2-464187.mp3` (132,911 bytes, approximately four
seconds). Original filename attribution is retained here; no source/license
claim beyond the owner's supplied file is inferred.

SHA-256: `ef6261691b438b49a3b19b462bdf1a65d8aecd67e2083297d401ea7756b01471`.

Lightning Bolt's 5×5 and 4×4 sequences reference the same local file. One reusable
audio channel starts at discharge, plays once at 60% volume in Full (39% in
Reduced), and allows the natural thunder tail after the visual ends. A six-second
safety timeout prevents broken media from lingering. Repeated bolts replace the
previous sound instead of layering more voices.

The Spell sound checkbox mutes audio independently of visuals. Effects Off,
Reset Preview, variant changes, leaving the map and page cleanup stop applicable
audio, including pending starts and tails. Reset Preview does not cancel a
confirmed cast's sound. Autoplay/decode failures are caught and never affect
casting, HP, resources or visual playback. Browser autoplay settings may require
an interaction with the page before sound is permitted.

The file is loaded on the first audible Lightning Bolt playback, not at app
startup. Sound settings are page-local; no gameplay data or broadcasts are added.
