import {
  ACTIVE_RULESET,
  getLegacy2014Metadata
} from "./ruleset2014.js?v=phase14-20260726";

export const BUILTIN_SPECIES_IDS_2014 = Object.freeze([
  "human",
  "dwarf",
  "elf",
  "halfling",
  "dragonborn",
  "gnome",
  "half-elf",
  "half-orc",
  "tiefling"
]);

export const BUILTIN_BACKGROUND_IDS_2014 = Object.freeze([
  "acolyte",
  "charlatan",
  "criminal",
  "entertainer",
  "folk-hero",
  "guild-artisan",
  "hermit",
  "noble",
  "outlander",
  "sage",
  "sailor",
  "soldier",
  "urchin"
]);

const SPECIES_DESCRIPTIONS = Object.freeze({
  human:
    "Humans are widespread and adaptable, building communities in nearly every climate and culture. Under the fixed 2014 rules, their broad potential is represented by a +1 increase to every ability score and a choice of one additional language.",
  dwarf:
    "Dwarves are sturdy, tradition-minded people whose communities prize endurance, craft, and clan history. Their 2014 traits provide Constitution, poison resilience, darkvision, weapon training, a tool choice, and a subrace that further defines their talents.",
  elf:
    "Elves are long-lived, perceptive people with fey ancestry and a meditative trance in place of ordinary sleep. Their 2014 traits grant Dexterity, darkvision, Perception training, charm and sleep defenses, and a subrace with additional abilities.",
  halfling:
    "Halflings are small, nimble, and unusually fortunate people who often survive danger through courage and good timing. Their 2014 traits grant Dexterity, luck, bravery, nimble movement, and a subrace that adds another cultural talent.",
  dragonborn:
    "Dragonborn carry the legacy of chromatic or metallic dragons and express it through a destructive breath weapon. Their fixed 2014 traits grant Strength and Charisma, Draconic language, and an ancestry choice that determines breath shape, damage, and resistance.",
  gnome:
    "Gnomes are small, inventive people known for curiosity, quick thought, and resistance to hostile magic. Their 2014 traits grant Intelligence, darkvision, magical mental defenses, and a subrace focused on woodland magic or practical invention.",
  "half-elf":
    "Half-elves combine fey ancestry with human flexibility and frequently move between different communities. Their 2014 traits grant Charisma, two flexible ability increases, darkvision, charm and sleep defenses, two skill choices, and an additional language.",
  "half-orc":
    "Half-orcs are powerful, determined people whose physical endurance can keep them standing through otherwise decisive blows. Their 2014 traits grant Strength and Constitution, darkvision, Intimidation training, relentless endurance, and stronger weapon critical hits.",
  tiefling:
    "Tieflings bear an infernal legacy that appears through distinctive features and innate supernatural power. Their fixed 2014 traits grant Intelligence and Charisma, darkvision, fire resistance, and Charisma-based spells that unlock as they gain levels."
});

const SUBRACE_DESCRIPTIONS = Object.freeze({
  "hill-dwarf":
    "Hill dwarves emphasize intuition and exceptional physical endurance. In the 2014 rules they gain Wisdom and Dwarven Toughness, increasing maximum hit points once for every character level.",
  "mountain-dwarf":
    "Mountain dwarves are accustomed to demanding terrain and martial defense. In the 2014 rules they gain Strength plus proficiency with light and medium armor.",
  "high-elf":
    "High elves cultivate formal study and arcane traditions. In the 2014 rules they gain Intelligence, elven weapon training, another language, and one wizard cantrip that uses Intelligence.",
  "wood-elf":
    "Wood elves are swift and practiced at disappearing into natural cover. In the 2014 rules they gain Wisdom, elven weapon training, a 35-foot walking speed, and Mask of the Wild.",
  "dark-elf":
    "Dark elves, also called drow, possess potent innate magic and superior sight adapted to lightless places. Their 2014 traits grant Charisma, 120-foot darkvision, specialized weapon training, level-based magic, and sunlight sensitivity.",
  "lightfoot-halfling":
    "Lightfoot halflings are socially confident and adept at disappearing behind larger companions. In the 2014 rules they gain Charisma and Naturally Stealthy.",
  "stout-halfling":
    "Stout halflings are unusually hardy and resistant to toxins. In the 2014 rules they gain Constitution plus advantage against poison and resistance to poison damage.",
  "forest-gnome":
    "Forest gnomes combine natural subtlety with minor illusion magic and an affinity for small animals. In the 2014 rules they gain Dexterity, Minor Illusion, and simple communication with Small or smaller beasts.",
  "rock-gnome":
    "Rock gnomes pair technical knowledge with a gift for building small clockwork devices. In the 2014 rules they gain Constitution, tinker's tools, Artificer's Lore, and Tinker."
});

const BACKGROUND_DESCRIPTIONS = Object.freeze({
  acolyte:
    "An acolyte spent formative years serving a temple, shrine, or religious community. The background grants Insight and Religion, two language choices, a religious equipment package, and Shelter of the Faithful.",
  charlatan:
    "A charlatan survives through practiced misdirection, confidence tricks, and carefully prepared aliases. The background grants Deception, Sleight of Hand, disguise and forgery tools, a con artist's equipment package, and False Identity.",
  criminal:
    "A criminal learned the codes, contacts, and practical routines of an underworld organization. The background grants Deception, Stealth, a gaming-set choice, thieves' tools, covert equipment, and Criminal Contact.",
  entertainer:
    "An entertainer has experience holding an audience through music, acting, acrobatics, or another public performance. The background grants Acrobatics, Performance, disguise and instrument choices, performance gear, and By Popular Demand.",
  "folk-hero":
    "A folk hero rose from an ordinary community after confronting a threat or injustice. The background grants Animal Handling, Survival, artisan and land-vehicle training, practical rural equipment, and Rustic Hospitality.",
  "guild-artisan":
    "A guild artisan trained within an organized craft or trade and retains professional ties to that institution. The background grants Insight, Persuasion, an artisan-tool choice, one language, trade equipment, and Guild Membership.",
  hermit:
    "A hermit spent an extended period in seclusion for spiritual, scholarly, medicinal, or personal reasons. The background grants Medicine, Religion, herbalism tools, one language, secluded-living equipment, and Discovery.",
  noble:
    "A noble was raised among rank, inherited influence, formal obligations, and the customs of high society. The background grants History, Persuasion, a gaming-set choice, one language, fine equipment, and Position of Privilege.",
  outlander:
    "An outlander is shaped by long travel through wilderness far from settled roads and familiar comforts. The background grants Athletics, Survival, an instrument choice, one language, travel equipment, and Wanderer.",
  sage:
    "A sage devoted years to formal study, research, and the preservation or interpretation of specialized knowledge. The background grants Arcana, History, two languages, scholarly equipment, and Researcher.",
  sailor:
    "A sailor learned to work as part of a ship's crew while handling weather, rigging, navigation, and maritime discipline. The background grants Athletics, Perception, navigator's tools, water vehicles, seafaring equipment, and Ship's Passage.",
  soldier:
    "A soldier served within a military organization and learned discipline, battlefield routine, and the responsibilities of rank. The background grants Athletics, Intimidation, gaming and land-vehicle training, military equipment, and Military Rank.",
  urchin:
    "An urchin survived in crowded streets by reading danger, finding shortcuts, and making use of whatever was available. The background grants Sleight of Hand, Stealth, disguise and thieves' tools, street equipment, and City Secrets."
});

const BACKGROUND_FEATURE_DESCRIPTIONS = Object.freeze({
  "shelter-of-the-faithful":
    "Members of your faith recognize your service and can usually provide modest lodging, meals, healing assistance, or ceremonial support when resources allow. They will not accept requests that place the community in unreasonable danger.",
  "false-identity":
    "You maintain an established alternate identity supported by appropriate clothing, documents, acquaintances, and practiced behavior. You can also reproduce documents or personal letters when you have seen the kind of writing being imitated.",
  "criminal-contact":
    "You have a dependable contact who connects you to a wider criminal network. Messages can travel through local intermediaries even when you do not know the recipient personally, subject to time, distance, and the network's reach.",
  "by-popular-demand":
    "You can usually find a venue willing to host your performance. When you perform regularly, the establishment commonly provides modest food and lodging for you and often for your companions, while your reputation may attract local attention.",
  "rustic-hospitality":
    "Ordinary people recognize you as one of their own and are inclined to hide, feed, or shelter you when they can. They will not risk certain punishment or direct violence merely because you ask.",
  "guild-membership":
    "Your guild recognizes your professional standing, expects regular dues, and can connect you with colleagues, lodging, legal support, or patrons. The type and speed of assistance depend on the guild's local presence and available resources.",
  discovery:
    "Your isolation led to a significant discovery such as a hidden truth, forgotten site, spiritual revelation, or dangerous secret. Define its nature with the DM so that it creates meaningful ties to the campaign.",
  "position-of-privilege":
    "Your title and bearing are recognized by people familiar with social rank. Commoners generally defer to you, and you can often obtain audiences or entry to high society when your claimed station is relevant and credible.",
  wanderer:
    "You have an excellent memory for maps and geography and can recall the general layout of terrain and settlements you have seen. In productive wilderness, you can usually locate food and fresh water for yourself and several companions.",
  researcher:
    "When a piece of lore is beyond your current knowledge, you usually know which archive, specialist, institution, or other source could provide an answer. Reaching that source and earning access may still require travel or negotiation.",
  "ships-passage":
    "Your maritime contacts can usually arrange passage aboard a vessel for you and your companions. The crew may expect help during the voyage, and schedules, destinations, cargo, and dangerous conditions remain under the captain's control.",
  "military-rank":
    "Members of your former military organization recognize your rank and service record. Lower-ranking personnel commonly follow legitimate orders, and military facilities may provide access or supplies when doing so fits their authority.",
  "city-secrets":
    "You know how to use alleys, rooftops, service passages, crowds, and local transit patterns to move efficiently through a settlement. When you guide the group between two urban locations, normal travel takes roughly half the usual time."
});

export const BUILTIN_SPECIES_2014_EXPECTATIONS = Object.freeze({
  human: {
    abilityBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    size: "medium",
    speed: 30,
    languages: ["Common"]
  },
  dwarf: {
    abilityBonuses: { con: 2 },
    size: "medium",
    speed: 25,
    languages: ["Common", "Dwarvish"],
    weaponProficiencies: ["Battleaxes", "Handaxes", "Light hammers", "Warhammers"],
    damageResistances: ["Poison"],
    toolChoiceCount: 1
  },
  elf: {
    abilityBonuses: { dex: 2 },
    size: "medium",
    speed: 30,
    languages: ["Common", "Elvish"],
    skillProficiencies: ["Perception"]
  },
  halfling: {
    abilityBonuses: { dex: 2 },
    size: "small",
    speed: 25,
    languages: ["Common", "Halfling"]
  },
  dragonborn: {
    abilityBonuses: { str: 2, cha: 1 },
    size: "medium",
    speed: 30,
    languages: ["Common", "Draconic"],
    damageResistances: ["Draconic ancestry choice"]
  },
  gnome: {
    abilityBonuses: { int: 2 },
    size: "small",
    speed: 25,
    languages: ["Common", "Gnomish"]
  },
  "half-elf": {
    abilityBonuses: { cha: 2 },
    size: "medium",
    speed: 30,
    languages: ["Common", "Elvish"],
    skillChoiceCount: 2,
    flexibleAbilityChoiceCount: 2
  },
  "half-orc": {
    abilityBonuses: { str: 2, con: 1 },
    size: "medium",
    speed: 30,
    languages: ["Common", "Orc"],
    skillProficiencies: ["Intimidation"]
  },
  tiefling: {
    abilityBonuses: { int: 1, cha: 2 },
    size: "medium",
    speed: 30,
    languages: ["Common", "Infernal"],
    damageResistances: ["Fire"]
  }
});

export const BUILTIN_SUBRACE_2014_EXPECTATIONS = Object.freeze({
  "hill-dwarf": {
    abilityBonuses: { wis: 1 }
  },
  "mountain-dwarf": {
    abilityBonuses: { str: 2 },
    armorProficiencies: ["Light armor", "Medium armor"]
  },
  "high-elf": {
    abilityBonuses: { int: 1 },
    weaponProficiencies: ["Longswords", "Shortswords", "Shortbows", "Longbows"]
  },
  "wood-elf": {
    abilityBonuses: { wis: 1 },
    speed: 35,
    weaponProficiencies: ["Longswords", "Shortswords", "Shortbows", "Longbows"]
  },
  "dark-elf": {
    abilityBonuses: { cha: 1 },
    darkvision: 120,
    weaponProficiencies: ["Rapiers", "Shortswords", "Hand crossbows"]
  },
  "lightfoot-halfling": {
    abilityBonuses: { cha: 1 }
  },
  "stout-halfling": {
    abilityBonuses: { con: 1 },
    damageResistances: ["Poison"]
  },
  "forest-gnome": {
    abilityBonuses: { dex: 1 }
  },
  "rock-gnome": {
    abilityBonuses: { con: 1 },
    toolProficiencies: ["Tinker's tools"]
  }
});

export const BUILTIN_BACKGROUND_2014_EXPECTATIONS = Object.freeze({
  acolyte: {
    skills: ["Insight", "Religion"],
    toolChoices: { choose: 0, from: [] },
    languageChoices: { choose: 2, from: [] },
    packageId: "acolyte-pack"
  },
  charlatan: {
    skills: ["Deception", "Sleight of Hand"],
    toolChoices: { choose: 2, from: ["Disguise kit", "Forgery kit"] },
    languageChoices: { choose: 0, from: [] },
    packageId: "charlatan-pack"
  },
  criminal: {
    skills: ["Deception", "Stealth"],
    toolChoices: { choose: 2, from: ["One gaming set", "Thieves' tools"] },
    languageChoices: { choose: 0, from: [] },
    packageId: "criminal-pack"
  },
  entertainer: {
    skills: ["Acrobatics", "Performance"],
    toolChoices: { choose: 2, from: ["Disguise kit", "One musical instrument"] },
    languageChoices: { choose: 0, from: [] },
    packageId: "entertainer-pack"
  },
  "folk-hero": {
    skills: ["Animal Handling", "Survival"],
    toolChoices: { choose: 2, from: ["One artisan's tools", "Vehicles (land)"] },
    languageChoices: { choose: 0, from: [] },
    packageId: "folk-hero-pack"
  },
  "guild-artisan": {
    skills: ["Insight", "Persuasion"],
    toolChoices: { choose: 1, from: ["One artisan's tools"] },
    languageChoices: { choose: 1, from: [] },
    packageId: "guild-artisan-pack"
  },
  hermit: {
    skills: ["Medicine", "Religion"],
    toolChoices: { choose: 1, from: ["Herbalism kit"] },
    languageChoices: { choose: 1, from: [] },
    packageId: "hermit-pack"
  },
  noble: {
    skills: ["History", "Persuasion"],
    toolChoices: { choose: 1, from: ["One gaming set"] },
    languageChoices: { choose: 1, from: [] },
    packageId: "noble-pack"
  },
  outlander: {
    skills: ["Athletics", "Survival"],
    toolChoices: { choose: 1, from: ["One musical instrument"] },
    languageChoices: { choose: 1, from: [] },
    packageId: "outlander-pack"
  },
  sage: {
    skills: ["Arcana", "History"],
    toolChoices: { choose: 0, from: [] },
    languageChoices: { choose: 2, from: [] },
    packageId: "sage-pack"
  },
  sailor: {
    skills: ["Athletics", "Perception"],
    toolChoices: { choose: 2, from: ["Navigator's tools", "Vehicles (water)"] },
    languageChoices: { choose: 0, from: [] },
    packageId: "sailor-pack"
  },
  soldier: {
    skills: ["Athletics", "Intimidation"],
    toolChoices: { choose: 2, from: ["One gaming set", "Vehicles (land)"] },
    languageChoices: { choose: 0, from: [] },
    packageId: "soldier-pack"
  },
  urchin: {
    skills: ["Sleight of Hand", "Stealth"],
    toolChoices: { choose: 2, from: ["Disguise kit", "Thieves' tools"] },
    languageChoices: { choose: 0, from: [] },
    packageId: "urchin-pack"
  }
});

function cleanArray(value) {
  return Array.isArray(value)
    ? value.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [];
}

function createTraitDescription(trait, parentName) {
  const summary = String(trait?.summary || "").trim();

  if (!summary) {
    return "";
  }

  return `${summary} This is a built-in ${parentName} ancestry trait in the Legacy 5e (2014) rules and is available whenever its stated trigger or level requirement is met.`;
}

function inheritMetadata(record, metadata) {
  return {
    ...record,
    rulesetId: metadata.rulesetId,
    rulesEdition: metadata.rulesEdition,
    rulesMode: metadata.rulesMode,
    sourceType: metadata.sourceType,
    sourceLabel: metadata.sourceLabel
  };
}

export function enrichBuiltinSpeciesTemplate(rawSpecies) {
  const species = rawSpecies || {};
  const metadata = getLegacy2014Metadata(
    "species",
    species.id,
    species
  );
  const speciesName = String(species.name || "species");

  return Object.freeze({
    ...inheritMetadata(species, metadata),
    description: SPECIES_DESCRIPTIONS[species.id] || "",
    traits: Object.freeze(
      (Array.isArray(species.traits) ? species.traits : [])
        .map((trait) => {
          return Object.freeze({
            ...inheritMetadata(trait, metadata),
            description: createTraitDescription(
              trait,
              speciesName
            )
          });
        })
    ),
    subraces: Object.freeze(
      (Array.isArray(species.subraces) ? species.subraces : [])
        .map((subrace) => {
          const subraceMetadata = getLegacy2014Metadata(
            "subrace",
            subrace.id,
            subrace,
            species.id
          );
          const subraceName = String(
            subrace.name || "subrace"
          );

          return Object.freeze({
            ...inheritMetadata(
              subrace,
              subraceMetadata
            ),
            description:
              SUBRACE_DESCRIPTIONS[subrace.id] ||
              "",
            traits: Object.freeze(
              (
                Array.isArray(subrace.traits)
                  ? subrace.traits
                  : []
              ).map((trait) => {
                return Object.freeze({
                  ...inheritMetadata(
                    trait,
                    subraceMetadata
                  ),
                  description:
                    createTraitDescription(
                      trait,
                      subraceName
                    )
                });
              })
            )
          });
        })
    )
  });
}

export function enrichBuiltinBackgroundTemplate(
  rawBackground
) {
  const background = rawBackground || {};
  const metadata = getLegacy2014Metadata(
    "background",
    background.id,
    background
  );

  return Object.freeze({
    ...inheritMetadata(background, metadata),
    description:
      BACKGROUND_DESCRIPTIONS[background.id] ||
      "",
    features: Object.freeze(
      (
        Array.isArray(background.features)
          ? background.features
          : []
      ).map((feature) => {
        return Object.freeze({
          ...inheritMetadata(
            feature,
            metadata
          ),
          description:
            BACKGROUND_FEATURE_DESCRIPTIONS[
              feature.id
            ] ||
            ""
        });
      })
    )
  });
}

function sameValue(actual, expected) {
  if (Array.isArray(expected)) {
    return (
      JSON.stringify(cleanArray(actual)) ===
      JSON.stringify(cleanArray(expected))
    );
  }

  if (
    expected &&
    typeof expected === "object"
  ) {
    return (
      JSON.stringify(actual || {}) ===
      JSON.stringify(expected)
    );
  }

  return actual === expected;
}

function validateMetadata(
  record,
  label,
  errors
) {
  if (
    record?.rulesetId !==
      ACTIVE_RULESET.id ||
    record?.rulesEdition !==
      ACTIVE_RULESET.edition ||
    !String(
      record?.sourceLabel ||
      ""
    ).trim() ||
    !String(
      record?.sourceType ||
      ""
    ).trim()
  ) {
    errors.push(
      `${label} is missing Legacy 5e source or edition metadata.`
    );
  }
}

function validateDescription(
  record,
  label,
  errors
) {
  const description = String(
    record?.description ||
    ""
  ).trim();

  if (
    description.length < 80 ||
    /placeholder|coming soon|\btodo\b|\btbd\b|description not filled/i
      .test(description)
  ) {
    errors.push(
      `${label} is missing a full description.`
    );
  }
}

export function validateBuiltinSpeciesBackgroundCatalog({
  species,
  backgrounds,
  equipmentPackages
} = {}) {
  const speciesEntries =
    Array.isArray(species)
      ? species
      : [];
  const backgroundEntries =
    Array.isArray(backgrounds)
      ? backgrounds
      : [];
  const packageEntries =
    Array.isArray(equipmentPackages)
      ? equipmentPackages
      : [];
  const errors = [];
  const speciesMap = new Map(
    speciesEntries.map((entry) => [
      entry.id,
      entry
    ])
  );
  const backgroundMap = new Map(
    backgroundEntries.map((entry) => [
      entry.id,
      entry
    ])
  );
  const packageMap = new Map(
    packageEntries.map((entry) => [
      entry.id,
      entry
    ])
  );

  BUILTIN_SPECIES_IDS_2014
    .forEach((speciesId) => {
      const entry = speciesMap.get(
        speciesId
      );
      const expected =
        BUILTIN_SPECIES_2014_EXPECTATIONS[
          speciesId
        ];

      if (!entry) {
        errors.push(
          `Missing built-in species: ${speciesId}.`
        );
        return;
      }

      validateDescription(
        entry,
        `Species ${speciesId}`,
        errors
      );
      validateMetadata(
        entry,
        `Species ${speciesId}`,
        errors
      );

      [
        "abilityBonuses",
        "size",
        "speed",
        "languages",
        "skillProficiencies",
        "toolProficiencies",
        "weaponProficiencies",
        "armorProficiencies",
        "damageResistances"
      ].forEach((field) => {
        const expectedValue =
          expected[field] ??
          (
            [
              "languages",
              "skillProficiencies",
              "toolProficiencies",
              "weaponProficiencies",
              "armorProficiencies",
              "damageResistances"
            ].includes(field)
              ? []
              : undefined
          );

        if (
          expectedValue !== undefined &&
          !sameValue(
            entry[field],
            expectedValue
          )
        ) {
          errors.push(
            `Species ${speciesId} has invalid ${field}.`
          );
        }
      });

      if (
        expected.skillChoiceCount !==
          undefined &&
        Number(
          entry.skillChoices?.choose ||
          0
        ) !==
          expected.skillChoiceCount
      ) {
        errors.push(
          `Species ${speciesId} has invalid skill choice count.`
        );
      }

      if (
        expected.toolChoiceCount !==
          undefined &&
        Number(
          entry.toolChoices?.choose ||
          0
        ) !==
          expected.toolChoiceCount
      ) {
        errors.push(
          `Species ${speciesId} has invalid tool choice count.`
        );
      }

      if (
        expected.flexibleAbilityChoiceCount !==
          undefined &&
        !String(
          entry.abilityChoices?.summary ||
          ""
        ).match(
          expected
            .flexibleAbilityChoiceCount ===
            2
            ? /\b(?:2|two)\b/i
            : new RegExp(
                `\\b${expected.flexibleAbilityChoiceCount}\\b`
              )
        )
      ) {
        errors.push(
          `Species ${speciesId} has invalid flexible ability choices.`
        );
      }

      (
        Array.isArray(entry.traits)
          ? entry.traits
          : []
      ).forEach((trait) => {
        validateDescription(
          trait,
          `Species trait ${trait.id}`,
          errors
        );
        validateMetadata(
          trait,
          `Species trait ${trait.id}`,
          errors
        );
      });

      (
        Array.isArray(entry.subraces)
          ? entry.subraces
          : []
      ).forEach((subrace) => {
        const subraceExpected =
          BUILTIN_SUBRACE_2014_EXPECTATIONS[
            subrace.id
          ];

        if (!subraceExpected) {
          errors.push(
            `Unsupported built-in subrace: ${subrace.id}.`
          );
          return;
        }

        validateDescription(
          subrace,
          `Subrace ${subrace.id}`,
          errors
        );
        validateMetadata(
          subrace,
          `Subrace ${subrace.id}`,
          errors
        );

        Object.entries(
          subraceExpected
        ).forEach(([field, value]) => {
          if (
            !sameValue(
              subrace[field],
              value
            )
          ) {
            errors.push(
              `Subrace ${subrace.id} has invalid ${field}.`
            );
          }
        });

        (
          Array.isArray(subrace.traits)
            ? subrace.traits
            : []
        ).forEach((trait) => {
          validateDescription(
            trait,
            `Subrace trait ${trait.id}`,
            errors
          );
          validateMetadata(
            trait,
            `Subrace trait ${trait.id}`,
            errors
          );
        });
      });
    });

  if (
    speciesEntries.length !==
    BUILTIN_SPECIES_IDS_2014.length
  ) {
    errors.push(
      `Expected ${BUILTIN_SPECIES_IDS_2014.length} built-in species, found ${speciesEntries.length}.`
    );
  }

  BUILTIN_BACKGROUND_IDS_2014
    .forEach((backgroundId) => {
      const entry =
        backgroundMap.get(
          backgroundId
        );
      const expected =
        BUILTIN_BACKGROUND_2014_EXPECTATIONS[
          backgroundId
        ];

      if (!entry) {
        errors.push(
          `Missing built-in background: ${backgroundId}.`
        );
        return;
      }

      validateDescription(
        entry,
        `Background ${backgroundId}`,
        errors
      );
      validateMetadata(
        entry,
        `Background ${backgroundId}`,
        errors
      );

      if (
        Number(
          entry.skillChoices?.choose ||
          0
        ) !== expected.skills.length ||
        !sameValue(
          entry.skillChoices?.from,
          expected.skills
        )
      ) {
        errors.push(
          `Background ${backgroundId} has invalid skill choices.`
        );
      }

      [
        "toolChoices",
        "languageChoices"
      ].forEach((field) => {
        const actual =
          entry[field] || {};
        const expectedChoice =
          expected[field];

        if (
          Number(actual.choose || 0) !==
            expectedChoice.choose ||
          !sameValue(
            actual.from,
            expectedChoice.from
          )
        ) {
          errors.push(
            `Background ${backgroundId} has invalid ${field}.`
          );
        }
      });

      if (
        !cleanArray(
          entry.equipmentPackageIds
        ).includes(
          expected.packageId
        )
      ) {
        errors.push(
          `Background ${backgroundId} is missing its equipment package.`
        );
      }

      const equipmentPackage =
        packageMap.get(
          expected.packageId
        );

      if (
        !equipmentPackage ||
        !Array.isArray(
          equipmentPackage.items
        ) ||
        !equipmentPackage.items.length
      ) {
        errors.push(
          `Background ${backgroundId} has an invalid equipment package.`
        );
      }

      (
        Array.isArray(entry.features)
          ? entry.features
          : []
      ).forEach((feature) => {
        validateDescription(
          feature,
          `Background feature ${feature.id}`,
          errors
        );
        validateMetadata(
          feature,
          `Background feature ${feature.id}`,
          errors
        );
      });

      if (
        !Array.isArray(
          entry.features
        ) ||
        entry.features.length !== 1
      ) {
        errors.push(
          `Background ${backgroundId} must have one built-in feature.`
        );
      }
    });

  if (
    backgroundEntries.length !==
    BUILTIN_BACKGROUND_IDS_2014.length
  ) {
    errors.push(
      `Expected ${BUILTIN_BACKGROUND_IDS_2014.length} built-in backgrounds, found ${backgroundEntries.length}.`
    );
  }

  const catalogPolicy =
    ACTIVE_RULESET
      .speciesBackgroundCatalog;

  if (
    catalogPolicy
      ?.additionalPublishedContent !==
      "not-bundled" ||
    catalogPolicy
      ?.extensionPolicy !==
      "custom-or-room-content-with-source-labels"
  ) {
    errors.push(
      "Species and background expansion policy is missing or invalid."
    );
  }

  return errors;
}
