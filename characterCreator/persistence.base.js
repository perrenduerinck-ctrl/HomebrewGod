import {
  assertCharacterImportSize,
  assertCharacterSerializedSize
} from "./fieldLimits.js?v=creator-fix-pass-20260730";

export function createCharacterPersistence(context) {
  const {
    $, ABILITY_DEFINITIONS, ABILITY_SCORE_METHODS, ACTIVE_RULESET, ADDITIONAL_CANTRIP_COUNT_2014, ADDITIONAL_CANTRIP_EXPECTATIONS_2014,
    ADDITIONAL_CANTRIP_IDS_2014, ARTISAN_TOOL_OPTIONS, BACKGROUND_SCHEMA_VERSION, BUILDER_STEPS, BUILDER_STEP_INDEX, BUILTIN_BACKGROUND_2014_EXPECTATIONS,
    BUILTIN_BACKGROUND_IDS_2014, BUILTIN_SPECIES_2014_EXPECTATIONS, BUILTIN_SPECIES_IDS_2014, BUILTIN_SUBRACE_2014_EXPECTATIONS, C, CHARACTER_BUSY_ACTIONS,
    CHARACTER_SAVE_BUSY_ACTIONS, CHARACTER_SCHEMA_VERSION, CLASS_SCHEMA_VERSION, CURRENCY_DENOMINATIONS, DARK_ELF_INNATE_SPELLS_2014, DEFAULT_BACKGROUND_EQUIPMENT_PACKAGES,
    DEFAULT_BACKGROUND_TEMPLATES, DEFAULT_CLASSES, DEFAULT_CLASS_SCHEMA_VERSION, DEFAULT_CLASS_TEMPLATES, DEFAULT_EQUIPMENT_CATALOG, DEFAULT_FEATS,
    DEFAULT_FEAT_ABILITY_SCORE_MAXIMUM, DEFAULT_FIGHTING_STYLE_EFFECTS, DEFAULT_INVOCATION_DETAILS, DEFAULT_MANEUVER_DETAILS, DEFAULT_METAMAGIC_DETAILS, DEFAULT_SPECIES_TEMPLATES,
    DEFAULT_SPELLS, DEFAULT_SUBCLASSES, DRAFT_AUTOSAVE_DEBOUNCE_MS, DWARF_TOOL_CHOICES, FEAT_CHOICE_VALUE_PREFIX, FEAT_FEATURE_OPTIONS,
    FEAT_TOOL_OPTIONS, FEAT_WEAPON_OPTIONS, FOREST_GNOME_INNATE_SPELLS_2014, GAMING_SET_OPTIONS, GENERAL_TOOL_OPTIONS, MULTICLASS_PREREQUISITES,
    MULTICLASS_PROFICIENCY_GRANTS, MUSICAL_INSTRUMENT_OPTIONS, POST_CAP_ABILITY_SOURCE_PREFIXES, RAW_DEFAULT_BACKGROUND_TEMPLATES, RAW_DEFAULT_SPECIES_TEMPLATES, SECTION11_DRAGONBORN_ANCESTRIES,
    SECTION11_EMBEDDED_PORTRAIT_MAX_BYTES, SECTION11_UPLOADED_PORTRAIT_MAX_BYTES, SECTION12_CLASS_FEATURE_SAVE_ABILITIES, SECTION13_POINT_BUY_COSTS, SECTION16_SPELL_REFERENCE_ALIASES, SKILL_DEFINITIONS,
    SPECIES_SCHEMA_VERSION, SRD_2014_FIGHTER_ASI_LEVELS, SRD_2014_FULL_CASTER_SLOTS, SRD_2014_PACT_MAGIC, SRD_2014_ROGUE_ASI_LEVELS, SRD_2014_SIZE_CARRY_MULTIPLIERS,
    SRD_2014_STANDARD_ASI_LEVELS, SRD_SPELL_COUNT_2014, STANDARD_LANGUAGE_OPTIONS, TIEFLING_INNATE_SPELLS_2014, UNARMORED_DEFENSE_CLASS_RULES, W,
    WIZARD_CANTRIP_CHOICES_2014, addCappedNormalAbilityIncrease, addCharacterLevelToClass, addCurrencyMaps, addLegacyImportWarning, addMigrationWarning,
    addMulticlassClass, addSection11SkillProficiencies, addSection14BackgroundCurrency, addSection14BackgroundFeature, addSection15CatalogItem, addSection15CustomItem,
    addSection16CustomFeature, addSection16CustomSpell, addSpeciesTrait, adjustMulticlassClassLevel, adjustSection12AsiAbility, adjustSection12SpellSlotUsage,
    adjustSection16HitDieUsage, adjustSelectedClassResource, adjustSelectedFeatResource, applyClassProgressionProficiencies, applyCompatibilityAliases, applyCustomSpecies,
    applyInitialRoute, applySection11MechanicBlock, applySection11SpeciesChoiceMechanics, applySection11SpeciesChoices, applySection11SpeciesMechanics, applySection12ClassDefaults,
    applySection12CustomClass, applySection12CustomSubclass, applySection13PointBuyDefaults, applySection13RolledScores, applySection13Scores, applySection13StandardArray,
    applySection13SuggestedHp, applySection14BackgroundChoices, applySection14BackgroundPackage, applySection14CustomBackground, applySection14ProficiencyLists, applySelectedClassFeatureMechanics,
    applySelectedFeatMechanics, applyStoredClassSkillProficiencies, assertCharacterMutationAccess, assignSection13StandardScore, auditLegacyImportedCharacter, backfillBackgroundCurrencySources,
    beginCharacterBusyAction, beginnerNote, blockCharacterBusyAction, blockMulticlassEdit, bootSection20WhenReady, calculateAbilityModifier,
    calculateAbilityModifiers, calculateArmorClassOptions, calculateCharacterHitDice, calculateCharacterHp, calculateCharacterInitiative, calculateCharacterPassiveScores,
    calculateCharacterRolledHp, calculateCharacterSavingThrows, calculateCharacterSkillModifier, calculateClassProgressionTotalLevel, calculateContainerContentWeight, calculateEquippedWeaponAttacks,
    calculateInventoryWeightSummary, calculateRuleCarryingCapacity, calculateRuleFixedAverageHp, calculateRuleManualHp, calculateRulePassiveScore, calculateRuleRolledHp,
    calculateRuleSavingThrowModifier, calculateRuleSkillModifier, calculateRuleSpellAttackBonus, calculateRuleSpellSaveDc, calculateSection13SuggestedHp, calculateSection16SpellcastingValues,
    calculateSelectedFeatNumericEffect, calculateSrd2014MulticlassSpellcasting, calculateWeaponAttack, changeSection13PointBuyScore, changeSection15Quantity, characterCreatorActions,
    characterCreatorChangeHandlers, characterCreatorInputHandlers, characterHasClass, characterLibraryRenderer, characterSheetView, characterStepCompletionChecks,
    characterStepRenderers, chooseSection11Subrace, chooseSection12Class, chooseSection12Subclass, chooseSection14Background, chooseSpeciesFromTemplate,
    chooseStoredDraftRecord, clampLevel, clampStepIndex, cleanArray, cleanImportSourceLabel, cleanString,
    cleanupDuplicateNonRepeatableAdvancementFeats, cleanupSection11PreviousPortrait, cleanupSection19PermanentListeners, cleanupSection20CharacterCreator, clearPendingDraftPersistence, clearSection11Portrait,
    clearSection11SpeciesMechanics, clearSection12Subclass, clearStoredDraft, cloneData, collectMalformedSourceValues, collectSection12Features,
    collectSection12FeaturesForClassEntry, confirmDiscardUnsavedDraft, connectDraftPersistenceLifecycle, connectPopstateRouting,
    connectSection19PermanentListeners, connectWizardEvents, countSection14BackgroundSourceList,
    countSection14SkillSource, countSection14ValidBackgroundToolChoices, countSection14ValidSkillSource, countValidClassEntrySkillChoices, createAbilityMap, createCharacterLibraryCard,
    createCharacterPayload, createCharacterSheetView, createClassEntryId, createClassProgressionEntry, createDefaultClassTemplate, createDraftStorageRecord,
    createEmptyCharacter, createNormalAbilityCapScoreMap, createSection11PortraitFromFile, createSection13HpRollRecord, createSrdClassTemplate, createSrdFeature,
    createSrdFeatureLevels, createSrdSubclass, creatorState, debugSection12MulticlassAdd, decodeFeatChoiceValue, deps,
    deriveAbilityBaseFromFinalScores, disconnectDraftPersistenceLifecycle, disconnectSection20Routing, disconnectWizardEvents, draftPersistenceRuntime, duplicateCharacterFromLibrary,
    duplicateIntoDraft, encodeFeatChoiceValue, endCharacterBusyAction, enforceClassProgressionLevelCap, enrichBuiltinBackgroundTemplate, enrichBuiltinSpeciesTemplate,
    ensureAbilityBonusSources, ensureClassProgressionEntryData, ensureEquipmentCurrencySources, ensureProficiencySources, ensureWizardShell, ensureWizardStyles,
    escapeHtml, evaluateSection12ClassLevelFormula, evaluateSection12ClassResourceMaximum, expandSection14ToolChoice, filterRepeatedFeatChoiceOptions, findCachedCharacter,
    findClassEntryForLevelOrderKey, findDefaultClassDefinition, findHpRollRawRecordForLevel, findSection11ActionElement, findSection12ActionElement, findSection13ActionElement,
    findSection14ActionElement, findSection15ActionElement, findSection16ActionElement, flushPendingDraftPersistence, formatClassEntryHitDie, formatClassEntryProficiencySummary,
    formatDefaultSpellLevelLabel, formatMulticlassPrerequisiteFailure, formatMulticlassRequirementItem, formatMulticlassStoredChoiceKey, formatMulticlassStoredChoiceValue, formatSection11PortraitBytes,
    formatSection12ClassChoiceValues, formatSection12FeatEffect, formatSection12List, formatSection12Recharge, formatSection13HpRolls, formatSection14CurrencySummary,
    formatSection14List, formatSection16ProgressionLabel, formatSection16SpellComponents, formatSection16SpellResolution, formatSection16SpellScaling, formatSection17ClassEntryLabel,
    formatSection17ClassLevelSummary, formatSection17Modifier, formatSelectedClassMechanicEffect, formatSignedNumber, friendlyServiceError, getAbilityBonusTotalsFromSources,
    getAbilityDefinition, getAbilityScore, getAllClassTemplates, getAllSection14Backgrounds, getAllSpeciesTemplates, getBackgroundSourceLabel,
    getBrowserStorage, getCharacterBusyLabel, getCharacterClassEntries, getCharacterLevelHitDieRecords, getCharacterLibraryClassName, getCharacterLibraryDisplayName,
    getCharacterLibraryImageUrl, getCharacterLibraryLevel, getCharacterLibrarySpeciesName, getCharacterProficiencyBonus, getCharacterSkillEntry, getCharacterSnapshot,
    getCharacterSpellcastingInfo, getClassAsiLevels, getClassEntryAtIndex, getClassEntryLevel, getClassEntrySkillChoiceConfig, getClassEntryStoredSkillIds,
    getClassEntryStoredToolChoices, getClassEntrySubclassTemplate, getClassEntryToolChoiceConfig, getClassEntryToolChoiceOptions, getClassIndexForLevelRecord, getClassLevelOrderEntryKey,
    getClassProgressionEntries, getClassProgressionEntryKey, getClassProgressionPendingChoiceWarnings, getClassSourceLabel, getContainerContents, getContainerSummaries,
    getCurrencySourceTotals, getDefaultClassFeaturesThroughLevel, getDefaultLevelUpClassIndex, getDraftStorageKey, getDraftStorageTargets, getExactBuilderStepById,
    getFeatAbilityEffectMaximum, getFeatPrerequisiteLabel, getFeatPrerequisiteResult, getFeatSpellcastingValidationWarnings, getGenericProficiencyBonus, getHitDieSize,
    getHpRollRawRecords, getInventoryItemKnownWeight, getLatestLevelUpContext, getLegacy2014Metadata, getManualCurrencyBalance, getManualProficiencyList,
    getMulticlassClassId, getMulticlassPendingSkillChoiceWarnings, getMulticlassPendingToolChoiceWarnings, getMulticlassPrerequisiteRequirements, getMulticlassPrerequisiteResultForClass, getMulticlassPrerequisiteResults,
    getMulticlassProficiencyRule, getMulticlassRequirementLabel, getMulticlassSummaryEntries, getNormalAbilityScoreForCap, getPendingClassFeatureChoiceWarnings, getPerClassSpellSelectionSummary,
    getPersistentDraftStorageKey, getPreparedSpellLimit, getPrimaryClassEntry, getProgressionValueByLevel, getRoomCode, getRouteFromUrl,
    getSafeBackgroundName, getSafeCharacterName, getSafeClassName, getSafeSpeciesName, getSafeSubclassName, getSection11ChoiceSource,
    getSection11DragonbornAncestry, getSection11HalfElfAbilityChoices, getSection11LanguageChoices, getSection11Portrait, getSection11SelectedSpeciesTemplate, getSection11SelectedSubrace,
    getSection11SkillChoices, getSection12ArtificerInfusionContext, getSection12ArtificerInfusionState, getSection12AsiChoiceState, getSection12AsiFeature, getSection12CanonicalResourceId,
    getSection12ClassFeatureSaveDc, getSection12ClassFeaturesThroughLevel, getSection12CustomClassSkillNames, getSection12DivineSmiteSlotOptions, getSection12FeatChoiceLimit, getSection12FeatChoiceOptions,
    getSection12FeatureChoiceKey, getSection12FeatureChoiceOptionRecords, getSection12FeatureChoiceOptions, getSection12FeatureChooseCount, getSection12FeatureMechanicLines, getSection12FeatureStoredChoices,
    getSection12FutureClassFeatures, getSection12InfusionTargetOptions, getSection12LevelData, getSection12MulticlassAddStatus, getSection12PrimaryClass, getSection12SkillPickerChoices,
    getSection12SpellSlotUsageState, getSection12SubclassTemplates, getSection12UnlockedAsiSlot, getSection13AbilityBonus, getSection13AbilityName, getSection13AbilityScore,
    getSection13BaseAbilityScore, getSection13HitDieSize, getSection13HpRollState, getSection13PointBuySpent, getSection14AllExactToolOptions, getSection14BackgroundChoiceList,
    getSection14BackgroundCurrencyGrant, getSection14BackgroundLanguageOptions, getSection14BackgroundPackages, getSection14BackgroundRemovalSummary, getSection14BackgroundSourceValues, getSection14BackgroundToolOptions,
    getSection14BackgroundToolOptionsForIndex, getSection14SkillChoiceList, getSection14SkillEntry, getSection14SkillModifier, getSection14SkillSourceLabel, getSection15ActionIndex,
    getSection15AttunedItemCount, getSection15Catalog, getSection15Inventory, getSection15InventoryCount, getSection15TotalWeight, getSection15UnknownWeightCount,
    getSection16ClassSourceStore, getSection16CustomFeatures, getSection16CustomSpells, getSection16EligibleSpellcasters, getSection16EntryForSource, getSection16ExpandedSpellGrant,
    getSection16ExpandedSpellGrants, getSection16HitDieKey, getSection16InnateSpells, getSection16KnownLimitWarning, getSection16KnownSpellIds, getSection16MysticArcanumLevels,
    getSection16PreparationMode, getSection16PreparedLimitWarning, getSection16PreparedSpellIds, getSection16SelectedFeats, getSection16SourceKey, getSection16SourceState,
    getSection16SpellById, getSection16SpellReferenceId, getSection17AbilityName, getSection17CarryingCapacity, getSection17CharacterSheetView, getSection17ClassProgressionEntries,
    getSection17CompletedStepIds, getSection17FeatureCount, getSection17FinalizationValidation, getSection17Initiative, getSection17InventoryWeight, getSection17MigrationWarnings,
    getSection17PassivePerception, getSection17ProficiencyBonus, getSection17SkillEntry, getSection17SkillModifier, getSection17SpellCount, getSection17Warnings,
    getSection18MutationIdentity, getSection19CollectionName, getSelectedClassTemplate, getSelectedDefaultFeatInstances, getSelectedSection12Subclass,
    getSelectedSection14Background, getSkillDefinitionByIdOrName, getSpeciesHpBonus, getSpeciesSourceLabel, getSpellSelectionLimits, getSpellSlotCastingOptions,
    getSpellSourceContexts, getSpellSourceId, getSpellSourceWarning, getSpellcastingClassOptions, getSpellcastingEntryForSpell, getSpellcastingFocusClassIds,
    getSpellcastingFocusSummary, getSpellcastingSummary, getSrd2014PactMagic, getSrd2014SpellSlots, getStartingClassEntry, getStepById,
    getStepIndex, getStoredSources, getSubraceSourceLabel, getUnlockedFeatChoiceSlots, getValidClassEntrySkillIds, getValidClassEntryToolChoices,
    getValidationWarnings, handleAddSpeciesTraitAction, handleApplySpeciesChoicesAction, handleBrowserRouteChange, handleChooseSpeciesAction, handleChooseSubraceAction,
    handleDraftBeforeUnload, handleRemoveSpeciesTraitAction, handleSection11PortraitChange, handleSection11RemovePortrait, handleSection11SetPortraitUrl, handleSection12AddCharacterLevel,
    handleSection12AddMulticlassClass, handleSection12AdjustMulticlassLevel, handleSection12ArtificerInfusion, handleSection12ArtificerInfusionTargetChange, handleSection12AsiAction, handleSection12AsiChange,
    handleSection12ChooseAsiFeat, handleSection12ChooseClass, handleSection12ChooseSubclass, handleSection12ClassFeatureChoice, handleSection12ClassFeatureSelectChange, handleSection12ClearSubclass,
    handleSection12CustomClass, handleSection12CustomClassSkillPicker, handleSection12CustomSubclass, handleSection12FeatSearch, handleSection12MoveCharacterLevelOrder, handleSection12MoveMulticlassClass,
    handleSection12MulticlassChange, handleSection12RemoveLastCharacterLevel, handleSection12RemoveMulticlassClass, handleSection12ToggleMulticlassSkill, handleSection12ToggleMulticlassTool, handleSection13ApplyRolls,
    handleSection13CalculateHp, handleSection13Change, handleSection13PointBuy, handleSection13RefreshLevel, handleSection13ResetPointBuy, handleSection13ResetStandardArray,
    handleSection13RollScores, handleSection14AddFeature, handleSection14ApplyBackgroundChoices, handleSection14ApplyBackgroundPackage, handleSection14ApplyLists, handleSection14ChooseBackground,
    handleSection14CustomBackground, handleSection14OldBackgroundEquipment, handleSection14RemoveFeature, handleSection14SkipBackground, handleSection14ToggleExpertise, handleSection14ToggleSkill,
    handleSection15AddCatalogItem, handleSection15AddCustomItem, handleSection15Change, handleSection15ChangeQuantity, handleSection15CloseContainer, handleSection15MoveItemOut,
    handleSection15OpenContainer, handleSection15RemoveItem, handleSection15ResolveContainerRemoval, handleSection15SkipEquipment, handleSection15ToggleContainedItems, handleSection15ToggleState,
    handleSection16AddFeature, handleSection16AddSpell, handleSection16CalculateSpellcasting, handleSection16DefaultSpellSearch, handleSection16RemoveFeature, handleSection16SpellAction,
    handleSection16SpellSourceChange, handleSection16ToggleFeat, handleSection17AdjustClassResource, handleSection17AdjustDivineSmiteSlot, handleSection17AdjustFeatResource, handleSection17OpenCharacterSheet,
    handleSection17RefreshReview, handleSection17ToggleRageState, handleUseCustomSpeciesAction, handleWizardChange, handleWizardClick, handleWizardImport,
    handleWizardInput, hasAbilityMapValues, hasCurrencyValue, hasFirestoreTools, hasMalformedSourceValue, hasSection11PortraitUploadHook,
    hasSection14BackgroundCurrency, hpRollRawHasAssociation, hpRollRawMatchesLevel, isActiveRulesetEntry, isAsiOrFeatChoiceFeature, isCharacterBusyAction,
    isCharacterCreatorBusy, isCharacterCreatorRoute, isCharacterNonSpellcaster, isDraftStorageQuotaError, isMulticlassDraft, isMulticlassRequirementMet,
    isPlainObject, isSavingThrowProficient, isSection11AbilityChoiceValid, isSection11LanguageChoiceValid, isSection11PortraitFile, isSection11PortraitUrlAllowed,
    isSection11SkillChoiceValid, isSection16MysticArcanumSpell, isSection16SpellKnown, isSection16SpellPrepared, isSection17AbilitiesComplete, isSection17BackgroundComplete,
    isSection17BasicsComplete, isSection17ClassComplete, isSection17EquipmentComplete, isSection17LevelComplete, isSection17OptionalFinalizationWarning, isSection17ReviewComplete,
    isSection17SkillsComplete, isSection17SpeciesComplete, isSection17SpellsComplete, isSection17SubclassComplete, isStartingClassEntry, isStepComplete,
    isWeaponProficient, makeSafeFileName, makeSafeId, markCharacterBuilderAsDraft, markDraftChanged, migrateClassEntryAdvancementData,
    migrateSection16LegacySpellSelections, moveCharacterLevelOrder, moveMulticlassClass, moveSection15ItemToContainer, navigateByStepOffset, navigateToLibrary,
    navigateToStep, normalizeAbilityMap, normalizeAdvancementChoices, normalizeCharacter, normalizeCharacterImageValue, normalizeClassChoiceMap,
    normalizeClassEntryHitDie, normalizeClassLevelOrder, normalizeClassTemplate, normalizeCurrencyMap, normalizeCurrencySourceMap, normalizeFeatChoiceSelections,
    normalizeFeatIds, normalizeHpCalculation, normalizeHpRollRecordsForCharacter, normalizeImportSourceList, normalizeSection12Subclass, normalizeSection14Background,
    normalizeSection15Item, normalizeSection16Feature, normalizeSection16Spell, normalizeSection19BackgroundRecord, normalizeSection19CharacterRecord, normalizeSection19ClassRecord,
    normalizeSection19SpeciesRecord, openCharacterFromLibrary, parseFeatChoiceSelections, parseSection12List, parseSection13HpRolls, parseSection14List,
    parseSection15ItemEditValue, performSection16Rest, persistDraftToSession, pruneAbandonedClassFeatureChoices, pruneRemovedClassSpellSources, readDraftStorageRecord,
    readSection11PortraitFileAsDataUrl, recalculateAbilityTotals, recalculateClassTotalLevel, recordRawEquipmentMigrationWarnings, refreshBuilderChrome,
    refreshClassProgressionDerivedValues, refreshElements, refreshLoadedClassDerivedValues, refreshSection13AbilitySummary, refreshSection13LevelProgression, refreshSection20CharacterCreator,
    refreshSelectedClassFeatures, refreshWizardElements, registerCharacterCreatorAction, registerCharacterCreatorChangeHandler, registerCharacterCreatorInputHandler, registerCharacterLibraryRenderer,
    registerCharacterStepCompletion, registerCharacterStepRenderer, removeAbilityBonusSourcesByPrefix, removeContainerAndContents, removeContainerPreserveContents, removeInnateSpellsBySourcePrefixes,
    removeLastCharacterLevel, removeListProficiencySource, removeListProficiencySourcesByPrefix, removeMulticlassClass, removeSection11Portrait, removeSection12AsiFeatIfUnused,
    removeSection14BackgroundCurrency, removeSection14BackgroundEquipment, removeSection14BackgroundFeature, removeSection15Item, removeSection16CustomFeature, removeSection16CustomSpell,
    removeSkillProficiencySource, removeSkillProficiencySourcesByPrefix, removeSpeciesTrait, renderAbilitiesStep, renderActionBar, renderBackgroundStep,
    renderBasicsStep, renderBuilderView, renderCatalogEntryDetails, renderCharacterLibraryEmptyState, renderCharacterLibraryView, renderClassFeatureMetadata,
    renderClassStep, renderCreatorView, renderEquipmentStep, renderFullCatalogDescription, renderLatestLevelAsiUnlock, renderLatestLevelFeatureUnlocks,
    renderLatestLevelSubclassUnlock, renderLatestLevelUnlockSummary, renderLevelStep, renderLevelUpWorkflow, renderMissingStep, renderMulticlassAdvancementChoiceSummary,
    renderMulticlassClassSummary, renderMulticlassLevelBreakdown, renderMulticlassProgressionEditor, renderMulticlassReadOnlyNotice, renderMulticlassSkillChoices, renderMulticlassStoredChoices,
    renderMulticlassToolChoices, renderReviewStep, renderRulesetMetadata, renderSection11PortraitPanel, renderSection12ArtificerInfusions, renderSection12AsiChoice,
    renderSection12CompactAsiChoice, renderSection12DivineSmiteSlotUsage, renderSection12FeatChoices, renderSection12FeatureMechanics, renderSection12FutureFeatures, renderSection12MulticlassAddStatus,
    renderSection12SelectedClassDetails, renderSection13AbilityScoreDetails, renderSection13AbilitySummary, renderSection13ArmorClassGuide, renderSection13DerivedMechanics, renderSection13HitDice,
    renderSection13HpGuide, renderSection13ManualAbilities, renderSection13MechanicsGuide, renderSection13PointBuy, renderSection13RolledAbilities, renderSection13RolledHpInputs,
    renderSection13StandardArray, renderSection14ExpertiseChoices, renderSection14ProficiencyGuide, renderSection14SourceSkillChoices, renderSection15Catalog, renderSection15ContainerDestinationSelect,
    renderSection15Inventory, renderSection15ItemEditCheckbox, renderSection15ItemEditControls, renderSection15ItemEditInput, renderSection15ItemEditTextarea, renderSection15OpenContainerPanel,
    renderSection16BeginnerGuide, renderSection16CustomSpells, renderSection16DefaultSpellViewer, renderSection16FeatPicker, renderSection16FeatureCards, renderSection16InnateSpells,
    renderSection16SpellSlots, renderSection17Abilities, renderSection17BackgroundChoices, renderSection17BackgroundGrants, renderSection17ClassAndFeatSummary, renderSection17ClassSpells,
    renderSection17ContainerSummary, renderSection17FeatureReviewItem, renderSection17FeatureSummary, renderSection17HitDice, renderSection17InnateSpells, renderSection17Inventory,
    renderSection17List, renderSection17MigrationWarnings, renderSection17PassiveScores, renderSection17SavingThrows, renderSection17Skills, renderSection17SpellcastingSummary,
    renderSection17Warnings, renderSection17WeaponAttacks, renderSelectedClassMechanicsSummary, renderSelectedFeatSummary, renderSkillsStep, renderSpeciesStep,
    renderSpellsStep, renderStepContent, renderStepRail, renderSubclassStep, repairContainerState, replaceDraft,
    replaceSection11Portrait, replaceSection20Draft, resolveClassTemplateForEntry, restoreDraftFromSession, restoreSection16ResourceList, retiredCharacterStepIds,
    rollSection13AbilityScore, rollSection13ScorePool, runCharacterCreatorAction, runCharacterStepRegistrationAudit, runWizardHandlers, safeDisplayString,
    safeNumber, sanitizeDraftStrings, saveSection12ArtificerInfusionState, scheduleDraftPersistence, section16RechargeMatchesRest, section16SelectedSpellSourceIds,
    selectClassTemplate, setAbilityBonusSource, setAbilityScore, setCharacterLevel, setCurrentStep, setDraftValue,
    setFeatRestChoice, setInnateSpellsForSource, setManualProficiencyList, setMulticlassClassLevel, setMulticlassSubclass, setSection11Portrait,
    setSection12ArtificerInfusionTarget, setSection12AsiBonusSource, setSection12AsiChoiceValues, setSection12AsiFeat, setSection12AsiMode, setSection12CustomClassSkillNames,
    setSection12FeatChoiceValues, setSection12FeatureStoredChoices, setSection12MulticlassAddStatus, setSection13AbilityMethod, setSection13HpRollValue, setSection14BackgroundChoiceList,
    setSection14SkillEntry, setSection14StoredSkillChoice, setSimpleDraftField, setSourceProficiencyList, setStatus, skipSection14Background,
    slotsArrayToObject, sourceMatches, splitInventoryStack, startNewDraft, startSection20CharacterCreator, startSection20NewCharacter,
    subtractCurrencyMaps, syncClassLevelOrderToClassLevels, syncEquipmentCurrencyFromSources, syncFirstUnarmoredDefenseSource, syncSection12AdvancementChoice,
    syncSection12ArtificerInfusionsForLevel, syncSection12AsiChoicesForLevel, syncSection14BackgroundFeatures, syncSection16ClassSourceMetadata, syncSection16LegacySpellAliases, syncSection17CompletedSteps,
    toggleMulticlassSkillChoice, toggleMulticlassToolChoice, toggleSection12ArtificerInfusion, toggleSection12ClassFeatureChoice, toggleSection12RageState, toggleSection14Expertise,
    toggleSection14Skill, toggleSection15ItemState, toggleSection16Feat, toggleSection16MysticArcanum, toggleSection16SpellKnown, toggleSection16SpellPrepared,
    tryAddMulticlassClass, uniqueCleanArray, updateSection12CustomClassSkillPicker, updateSection15InventoryItem, uploadSection11PortraitFile, useCustomClassName,
    useCustomSpeciesName, useSpeciesTemplate, validateBuiltinSpeciesBackgroundCatalog, validateContainerState, validateDefaultClassCollection, validateDefaultFeatCollection,
    validateDefaultSpellCatalog, validateDefaultSpellReferences, validateDefaultSubclassCollection, validateFeatPrerequisiteDefinitions, warnDraftStorageFailure, wizardChoiceCard,
    wizardField, wizardRuntime, wizardSelect, wouldCreateContainerCycle, writeRouteToUrl
  } = context;

  function getSection18CharacterCollectionName() {
    return getSection19CollectionName(
      "characterCollectionName",
      "charactersCollectionName",
      "characters"
    );
  }

  function getSection18CharacterCollection() {
    const roomCode = getRoomCode();

    if (!roomCode) {
      throw new Error(
        "Open a room before saving a character."
      );
    }

    if (!hasFirestoreTools()) {
      throw new Error(
        "The character creator is missing its Firestore tools."
      );
    }

    return deps.collection(
      deps.db,
      "rooms",
      roomCode,
      getSection18CharacterCollectionName()
    );
  }

  function getSection18CharacterDocument(
    characterId
  ) {
    const roomCode = getRoomCode();

    const cleanId = String(
      characterId || ""
    ).trim();

    if (!roomCode) {
      throw new Error(
        "Open a room before editing a saved character."
      );
    }

    if (!cleanId) {
      throw new Error(
        "A saved character ID is required."
      );
    }

    if (!hasFirestoreTools()) {
      throw new Error(
        "The character creator is missing its Firestore tools."
      );
    }

    return deps.doc(
      deps.db,
      "rooms",
      roomCode,
      getSection18CharacterCollectionName(),
      cleanId
    );
  }

  function hasSection18FirestoreReadTool() {
    return typeof deps.getDoc === "function";
  }

  function getSection18DocumentSnapshotData(
    snapshot
  ) {
    if (
      snapshot &&
      typeof snapshot.data === "function"
    ) {
      return snapshot.data() || {};
    }

    if (isPlainObject(snapshot?.data)) {
      return snapshot.data;
    }

    return {};
  }

  function section18SnapshotExists(
    snapshot
  ) {
    if (
      snapshot &&
      typeof snapshot.exists === "function"
    ) {
      return snapshot.exists();
    }

    if (
      snapshot &&
      typeof snapshot.exists === "boolean"
    ) {
      return snapshot.exists;
    }

    return Boolean(
      snapshot &&
      Object.keys(
        getSection18DocumentSnapshotData(
          snapshot
        )
      ).length > 0
    );
  }

  function getSection18RecordRoomCode(
    data
  ) {
    return cleanString(
      data?.roomCode ||
      data?.roomId ||
      data?.room ||
      ""
    ).toUpperCase();
  }

  function getSection18RecordType(
    data
  ) {
    return cleanString(
      data?.sheetType ||
      data?.recordType ||
      data?.type ||
      data?.kind ||
      ""
    ).toLowerCase();
  }

  function isSection18CharacterRecordData(
    data
  ) {
    if (!isPlainObject(data)) {
      return false;
    }

    const recordType =
      getSection18RecordType(data);

    if (recordType) {
      return [
        "character",
        "charactersheet",
        "character-sheet"
      ].includes(recordType);
    }

    return (
      isPlainObject(data.identity) ||
      isPlainObject(data.classProgression) ||
      isPlainObject(data.abilities) ||
      isPlainObject(data.proficiencies) ||
      isPlainObject(data.combat) ||
      cleanString(data.name) ||
      cleanString(data.className)
    );
  }

  function getSection18TimestampMillis(
    value
  ) {
    if (
      value &&
      typeof value.toMillis === "function"
    ) {
      return safeNumber(
        value.toMillis(),
        0
      );
    }

    if (value instanceof Date) {
      return safeNumber(
        value.getTime(),
        0
      );
    }

    if (
      value &&
      typeof value === "object" &&
      Number.isFinite(Number(value.seconds))
    ) {
      return (
        Number(value.seconds) * 1000 +
        Math.floor(
          safeNumber(value.nanoseconds, 0) /
          1000000
        )
      );
    }

    return safeNumber(value, 0);
  }

  function getSection18RecordRevisionMillis(
    data
  ) {
    const builderSavedAt =
      safeNumber(
        data?.builder?.lastSavedAtMillis,
        0
      );

    if (builderSavedAt > 0) {
      return builderSavedAt;
    }

    const updatedAtMillis =
      safeNumber(
        data?.updatedAtMillis,
        0
      );

    if (updatedAtMillis > 0) {
      return updatedAtMillis;
    }

    return getSection18TimestampMillis(
      data?.updatedAt
    );
  }

  function validateSection18NoRemoteConflict({
    data,
    expectedRevisionMillis,
    actionLabel
  }) {
    const remoteRevisionMillis =
      getSection18RecordRevisionMillis(data);

    const localRevisionMillis =
      safeNumber(
        expectedRevisionMillis,
        0
      );

    if (
      remoteRevisionMillis > 0 &&
      localRevisionMillis <= 0
    ) {
      throw new Error(
        `Cannot ${actionLabel} this character because this tab does not know which saved version it loaded. Reload the character library before trying again.`
      );
    }

    if (
      remoteRevisionMillis > 0 &&
      localRevisionMillis > 0 &&
      remoteRevisionMillis >
        localRevisionMillis
    ) {
      throw new Error(
        `Cannot ${actionLabel} this character because it was changed in another tab or window after this tab loaded it. Reload the character library before saving again.`
      );
    }

    return true;
  }

  function validateSection18FirestoreRecord({
    characterId,
    data,
    roomCode,
    actionLabel
  }) {
    if (
      !isSection18CharacterRecordData(data)
    ) {
      throw new Error(
        `Cannot ${actionLabel} this document because it is not a character record.`
      );
    }

    const recordRoomCode =
      getSection18RecordRoomCode(data);

    if (
      recordRoomCode &&
      recordRoomCode !== roomCode
    ) {
      throw new Error(
        `Cannot ${actionLabel} this character because it belongs to room ${recordRoomCode}, not ${roomCode}.`
      );
    }

    const explicitDocId =
      cleanString(
        data.firestoreDocumentId ||
        data.docId
      );

    if (
      explicitDocId &&
      explicitDocId !== characterId
    ) {
      throw new Error(
        `Cannot ${actionLabel} this character because its stored document ID does not match the selected character.`
      );
    }

    return true;
  }

  async function getValidatedSection18CharacterDocument(
    characterId,
    actionLabel
  ) {
    if (!hasSection18FirestoreReadTool()) {
      throw new Error(
        "The character creator is missing Firestore document validation tools."
      );
    }

    const roomCode = getRoomCode();
    const characterDocument =
      getSection18CharacterDocument(
        characterId
      );

    const snapshot =
      await deps.getDoc(
        characterDocument
      );

    if (
      !section18SnapshotExists(snapshot)
    ) {
      throw new Error(
        `Cannot ${actionLabel} this character because the saved document no longer exists. Reload the library and try again.`
      );
    }

    const data =
      getSection18DocumentSnapshotData(
        snapshot
      );

    validateSection18FirestoreRecord({
      characterId: String(
        characterId || ""
      ).trim(),
      data,
      roomCode,
      actionLabel
    });

    assertCharacterMutationAccess({
      ...getSection18MutationIdentity(),
      ownerUid:
        data.ownerUid || "",
      label: "character"
    });

    return {
      ref: characterDocument,
      data,
      snapshot
    };
  }

  function syncSection18DerivedValues(
    character
  ) {
    recalculateAbilityTotals(
      character
    );

    character.equipment.items =
      repairContainerState(
        character.equipment.items,
        character
      );

    character.equipment.currency =
      normalizeCurrencyMap(
        character.equipment.currency
      );

    character.equipment.currencySources =
      normalizeCurrencySourceMap(
        character.equipment.currencySources
      );

    backfillBackgroundCurrencySources(
      character
    );

    character.combat.proficiencyBonus =
      getGenericProficiencyBonus(
        character.classProgression
          .totalLevel
      );

    const armorClassSummary =
      calculateArmorClassOptions(
        character
      );
    const armorClass =
      armorClassSummary.selected;

    character.combat.armorClass =
      armorClass.total;
    character.combat
      .armorClassOptions =
        cloneData(
          armorClassSummary
        );

    const hpSummary =
      calculateCharacterHp(
        character
      );

    character.combat.hpCalculation =
      normalizeHpCalculation(
        {
          ...(character.combat
            .hpCalculation || {}),

          laterLevelValues:
            character.combat
              .hpCalculation
              ?.mode === "rolled"
              ? hpSummary.rolls
              : character.combat
                  .hpCalculation
                  ?.laterLevelValues
        },
        character.combat.maxHp
      );

    character.combat.maxHp =
      hpSummary.maximumHp;

    character.combat.currentHp =
      Math.min(
        Math.max(
          0,
          safeNumber(
            character.combat.currentHp,
            hpSummary.maximumHp
          )
        ),
        hpSummary.maximumHp
      );

    character.combat.hitDice =
      calculateCharacterHitDice(
        character
      );
    const activeHitDieKeys =
      new Set(
        character.combat.hitDice
          .map((entry, index) => {
            return cleanString(
              entry.classEntryId ||
              entry.classId ||
              entry.className,
              `hit-die-${index + 1}`
            );
          })
      );
    character.combat.hitDiceUsage =
      Object.fromEntries(
        Object.entries(
          character.combat
            .hitDiceUsage || {}
        )
          .filter(([key]) => {
            return activeHitDieKeys
              .has(key);
          })
          .map(([key, value]) => {
            const matching =
              character.combat
                .hitDice
                .find((entry, index) => {
                  return (
                    cleanString(
                      entry.classEntryId ||
                      entry.classId ||
                      entry.className,
                      `hit-die-${index + 1}`
                    ) === key
                  );
                });

            return [
              key,
              Math.min(
                Math.max(
                  0,
                  Math.round(
                    safeNumber(
                      value,
                      0
                    )
                  )
                ),
                Math.max(
                  0,
                  Math.round(
                    safeNumber(
                      matching?.count,
                      0
                    )
                  )
                )
              )
            ];
          })
      );

    character.combat.initiative =
      calculateCharacterInitiative(
        character
      ).total;

    const spellSummary =
      getSpellcastingSummary(
        character
      );

    character.magic.slots =
      cloneData(
        spellSummary.multiclass
          ?.spellSlots || {}
      );

    const pactMagic =
      (
        spellSummary.multiclass
          ?.pactMagic || []
      ).find((entry) => {
        return safeNumber(
          entry.slots,
          0
        ) > 0;
      });

    character.magic.pactMagic =
      pactMagic
        ? {
            slots:
              safeNumber(
                pactMagic.slots,
                0
              ),
            slotLevel:
              safeNumber(
                pactMagic.slotLevel,
                0
              )
          }
        : {
            slots: 0,
          slotLevel: 0
        };

    character.magic.pactMagicSources =
      cloneData(
        (
          spellSummary.multiclass
            ?.pactMagic || []
        ).filter((entry) => {
          return (
            safeNumber(
              entry.slots,
              0
            ) > 0
          );
        })
      );

    const primarySpellcaster =
      spellSummary.classes.find((entry) => {
        return (
          cleanString(
            entry.progressionType,
            "none"
          ) !== "none" ||
          safeNumber(
            entry.pactMagic?.slots,
            0
          ) > 0
        );
      });

    if (primarySpellcaster) {
      character.magic.spellcastingProgression =
        primarySpellcaster
          .progressionType;

      character.magic.spellcastingAbility =
        primarySpellcaster
          .spellcastingAbility ||
        character.magic
          .spellcastingAbility ||
        "";

      character.magic.spellSaveDc =
        primarySpellcaster
          .spellSaveDc;

      character.magic.spellAttackBonus =
        primarySpellcaster
          .spellAttackBonus;
    } else if (
      isCharacterNonSpellcaster(
        character
      )
    ) {
      character.magic.spellcastingProgression =
        "none";
      character.magic.spellcastingAbility = "";
      character.magic.spellSaveDc = null;
      character.magic.spellAttackBonus = null;
    }

    applyCompatibilityAliases(
      character
    );

    return character;
  }

  function prepareSection18Character(
    options = {}
  ) {
    let character =
      sanitizeDraftStrings(
        creatorState.draft
      );

    const copyName =
      options.copyName === true;

    if (copyName) {
      const currentName =
        getSafeCharacterName(
          character
        ) ||
        "Character";

      character.identity.name =
        / copy$/i.test(currentName)
          ? currentName
          : `${currentName} Copy`;
    }

    character.builder = {
      ...(character.builder || {}),

      currentStep:
        creatorState.currentStepId ||
        "save"
    };

    syncSection18DerivedValues(
      character
    );

    if (
      typeof syncSection17CompletedSteps ===
      "function"
    ) {
      creatorState.draft =
        character;

      syncSection17CompletedSteps();

      character =
        sanitizeDraftStrings(
          creatorState.draft
        );
    }

    applyCompatibilityAliases(
      character
    );

    return character;
  }

  function blockSection18Finalization(
    validation
  ) {
    const blockingErrors =
      Array.isArray(
        validation?.blockingErrors
      )
        ? validation.blockingErrors
        : [];

    creatorState.draft.builder.validation = {
      ...(creatorState.draft.builder
        .validation || {}),
      warnings:
        validation?.allIssues ||
        blockingErrors,
      blockingErrors,
      optionalWarnings:
        validation?.optionalWarnings || [],
      canFinalize: false,
      checkedAtMillis:
        validation?.checkedAtMillis ||
        Date.now()
    };

    setStatus(
      `Character was not finalized: ${blockingErrors.length} blocking rule ${blockingErrors.length === 1 ? "error" : "errors"} must be fixed.`
    );

    if (
      typeof window !== "undefined" &&
      typeof document !== "undefined"
    ) {
      navigateToStep("review");
    } else {
      setCurrentStep("review");
    }

    if (typeof alert === "function") {
      const shownErrors =
        blockingErrors.slice(0, 8);

      const remainingCount =
        Math.max(
          0,
          blockingErrors.length -
            shownErrors.length
        );

      alert(
        [
          "This character cannot be finalized yet:",
          "",
          ...shownErrors.map((error) => {
            return `- ${error}`;
          }),
          remainingCount > 0
            ? `- Plus ${remainingCount} more blocking ${remainingCount === 1 ? "error" : "errors"} on Review.`
            : "",
          "",
          "You can still use Save Draft."
        ].filter((line, index, lines) => {
          return line || lines[index - 1] !== "";
        }).join("\n")
      );
    }

    return false;
  }

  async function saveSection18Character(
    options = {}
  ) {
    const saveAsNew =
      options.asNew === true;

    const finalizeRequested =
      options.finalize === true;
    const preserveFinalization =
      options.preserveFinalization === true;

    const busyAction =
      finalizeRequested
        ? "finalize-character"
        : saveAsNew
        ? "save-copy"
        : "save-character";

    let previousFinalizationState = null;

    if (
      !beginCharacterBusyAction(
        busyAction
      )
    ) {
      return false;
    }

    try {
      setStatus(
        `${getCharacterBusyLabel(
          busyAction
        )}...`
      );

      if (typeof document !== "undefined") {
        renderCreatorView();
      }

      const copyName =
        options.copyName === true;

      if (finalizeRequested) {
        const validation =
          getSection17FinalizationValidation();

        if (!validation.canFinalize) {
          return blockSection18Finalization(
            validation
          );
        }
      }

      const expectedRevisionMillis =
        saveAsNew
          ? 0
          : getSection18RecordRevisionMillis(
              creatorState.draft
            );

      const character =
        prepareSection18Character({
          copyName
        });

      let finalizationValidation =
        getSection17FinalizationValidation();

      if (
        finalizeRequested &&
        !finalizationValidation.canFinalize
      ) {
        return blockSection18Finalization(
          finalizationValidation
        );
      }

      const roomCode =
        getRoomCode();

      const savedAtMillis =
        Date.now();

      previousFinalizationState = {
        status:
          character.builder?.status ||
          "draft",
        finalizedAtMillis:
          character.builder
            ?.finalizedAtMillis ||
          null
      };

      character.builder = {
        ...(character.builder || {}),
        status:
          finalizeRequested
            ? "finalized"
            : preserveFinalization &&
                previousFinalizationState
                  .status === "finalized"
              ? "finalized"
              : "draft",
        finalizedAtMillis:
          finalizeRequested
            ? savedAtMillis
            : preserveFinalization &&
                previousFinalizationState
                  .status === "finalized"
              ? previousFinalizationState
                  .finalizedAtMillis
              : null,
        validation: {
          ...(character.builder
            ?.validation || {}),
          warnings:
            finalizationValidation.allIssues,
          blockingErrors:
            finalizationValidation
              .blockingErrors,
          optionalWarnings:
            finalizationValidation
              .optionalWarnings,
          canFinalize:
            finalizationValidation
              .canFinalize,
          checkedAtMillis:
            finalizationValidation
              .checkedAtMillis
        },
        lastSavedAtMillis:
          savedAtMillis
      };

      const characterPayload =
        createCharacterPayload(
          character
        );

      assertCharacterSerializedSize(
        characterPayload
      );

      const timestamp =
        deps.serverTimestamp();
      const mutationIdentity =
        getSection18MutationIdentity();

      if (!mutationIdentity.actorUid) {
        throw new Error(
          "Sign in before saving a character."
        );
      }

      const firestorePayload = {
        ...characterPayload,
        roomCode,
        ownerUid:
          mutationIdentity.actorUid,
        updatedAtMillis:
          savedAtMillis,
        updatedAt: timestamp
      };

      let savedId =
        saveAsNew
          ? null
          : creatorState
              .currentCharacterId;

      let linkedTokenSyncWarning = "";

      if (savedId) {
        const validatedDocument =
          await getValidatedSection18CharacterDocument(
            savedId,
            "update"
          );

        validateSection18NoRemoteConflict({
          data: validatedDocument.data,
          expectedRevisionMillis,
          actionLabel: "update"
        });

        firestorePayload.ownerUid =
          validatedDocument.data
            .ownerUid ||
          (
            mutationIdentity.actorUid ===
              mutationIdentity.roomDmUid
              ? mutationIdentity.actorUid
              : ""
          );

        if (!firestorePayload.ownerUid) {
          throw new Error(
            "Only the room DM can repair this legacy character before it is changed."
          );
        }

        await deps.updateDoc(
          validatedDocument.ref,

          firestorePayload
        );
      } else {
        const createdDocument =
          await deps.addDoc(
            getSection18CharacterCollection(),

            {
              ...firestorePayload,
              createdAt: timestamp
            }
          );

        savedId =
          createdDocument.id;
      }

      if (
        typeof deps.syncLinkedCharacterTokens ===
        "function"
      ) {
        try {
          await deps.syncLinkedCharacterTokens({
            ...character,
            id: savedId,
            docId: savedId,
            firestoreDocumentId: savedId
          });
        } catch (tokenSyncError) {
          linkedTokenSyncWarning =
            " Linked token refresh failed; the character itself was still saved.";

          console.warn(
            "Could not refresh character-linked tokens:",
            tokenSyncError
          );
        }
      }

      replaceDraft(
        {
          ...character,
          id: savedId
        },

        {
          characterId: savedId,
          dirty: false,
          stepId:
            preserveFinalization
              ? character.builder
                  .currentStep ||
                creatorState
                  .currentStepId ||
                "review"
              : "save"
        }
      );

      creatorState.draft
        .builder
        .lastSavedAtMillis =
          character.builder
            .lastSavedAtMillis;

      creatorState.dirty = false;

      persistDraftToSession();

      setStatus(
        (
          finalizeRequested
            ? `${getSafeCharacterName() || "Unnamed Character"} was finalized.`
            : saveAsNew
              ? `${getSafeCharacterName() || "Unnamed Character"} was saved as a separate draft.`
              : preserveFinalization
                ? `${getSafeCharacterName() || "Unnamed Character"} gameplay was saved.`
              : `${getSafeCharacterName() || "Unnamed Character"} draft was saved.`
        ) + linkedTokenSyncWarning
      );

      return true;
    } catch (error) {
      if (
        previousFinalizationState &&
        creatorState.draft?.builder
      ) {
        creatorState.draft.builder.status =
          previousFinalizationState.status;

        creatorState.draft.builder
          .finalizedAtMillis =
            previousFinalizationState
              .finalizedAtMillis;
      }

      console.error(
        "Could not save character:",
        error
      );

      setStatus(
        friendlyServiceError(
          error,
          {
            service: "Firebase",
            action: "save this character"
          }
        )
      );

      const message =
        error?.message ||
        friendlyServiceError(
          error,
          {
            service: "Firebase",
            action: "save this character"
          }
        );

      if (typeof alert === "function") {
        alert(message);
      }

      return false;
    } finally {
      endCharacterBusyAction(
        busyAction
      );
    }
  }

  async function deleteSection18Character(
    characterId
  ) {
    if (
      blockCharacterBusyAction(
        "delete-character"
      )
    ) {
      return false;
    }

    const cleanId = String(
      characterId || ""
    ).trim();

    const character =
      findCachedCharacter(
        cleanId
      );

    const expectedRevisionMillis =
      getSection18RecordRevisionMillis(
        character ||
        (
          creatorState.currentCharacterId ===
            cleanId
            ? creatorState.draft
            : {}
        )
      );

    if (!cleanId) {
      return false;
    }

    if (
      creatorState.currentCharacterId ===
        cleanId &&
      !confirmDiscardUnsavedDraft(
        "deleting this saved character"
      )
    ) {
      return false;
    }

    const name =
      character
        ? getCharacterLibraryDisplayName(
            character
          )
        : "this character";

    const confirmed =
      window.confirm(
        `Delete ${name}? This cannot be undone.`
      );

    if (!confirmed) {
      return false;
    }

    if (
      !beginCharacterBusyAction(
        "delete-character"
      )
    ) {
      return false;
    }

    try {
      const validatedDocument =
        await getValidatedSection18CharacterDocument(
          cleanId,
          "delete"
        );

      validateSection18NoRemoteConflict({
        data: validatedDocument.data,
        expectedRevisionMillis,
        actionLabel: "delete"
      });

      await deps.deleteDoc(
        validatedDocument.ref
      );

      creatorState.characterCache =
        creatorState.characterCache
          .filter((item) => {
            return (
              String(
                item?.id || ""
              ) !== cleanId
            );
          });

      if (
        creatorState
          .currentCharacterId ===
        cleanId
      ) {
        clearStoredDraft();

        replaceDraft(
          createEmptyCharacter(),

          {
            characterId: null,
            dirty: false,
            stepId: "basics"
          }
        );
      }

      creatorState.viewMode =
        "library";

      setStatus(
        `${name} was deleted.`
      );

      renderCreatorView();

      return true;
    } catch (error) {
      console.error(
        "Could not delete character:",
        error
      );

      setStatus(
        "The character could not be deleted."
      );

      alert(
        error?.message ||
        "The character could not be deleted."
      );

      return false;
    } finally {
      endCharacterBusyAction(
        "delete-character"
      );
    }
  }

  function getSection18JsonText() {
    const character =
      prepareSection18Character();

    character.id =
      creatorState
        .currentCharacterId ||
      null;

    return JSON.stringify(
      character,
      null,
      2
    );
  }

  async function copySection18Json() {
    const jsonText =
      getSection18JsonText();

    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard
          .writeText === "function"
      ) {
        await navigator.clipboard
          .writeText(
            jsonText
          );
      } else {
        const textarea =
          document.createElement(
            "textarea"
          );

        textarea.value =
          jsonText;

        textarea.setAttribute(
          "readonly",
          ""
        );

        textarea.style.position =
          "fixed";

        textarea.style.opacity =
          "0";

        document.body.appendChild(
          textarea
        );

        textarea.select();

        document.execCommand(
          "copy"
        );

        textarea.remove();
      }

      setStatus(
        "Character JSON copied."
      );

      return true;
    } catch (error) {
      console.error(
        "Could not copy character JSON:",
        error
      );

      setStatus(
        "Character JSON could not be copied."
      );

      return false;
    }
  }

  function exportSection18Json(
    options = {}
  ) {
    try {
      flushPendingDraftPersistence();

      const jsonText =
        getSection18JsonText();

      const backup =
        options.backup === true;

      const blob = new Blob(
        [jsonText],

        {
          type:
            "application/json;charset=utf-8"
        }
      );

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        `${makeSafeFileName(
          getSafeCharacterName() ||
          "character"
        )}${
          backup
            ? "-draft-backup"
            : ""
        }.json`;

      document.body.appendChild(
        link
      );

      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(
          url
        );
      }, 0);

      setStatus(
        backup
          ? "Draft backup JSON downloaded."
          : "Character JSON exported."
      );

      return true;
    } catch (error) {
      console.error(
        "Could not export character JSON:",
        error
      );

      setStatus(
        "Character JSON could not be exported."
      );

      return false;
    }
  }

  function parseSection18ImportedCharacter(
    jsonText
  ) {
    assertCharacterImportSize(
      jsonText
    );

    const parsed = JSON.parse(
      String(jsonText || "")
    );

    const rawCharacter =
      parsed?.character &&
      typeof parsed.character ===
        "object" &&
      !Array.isArray(
        parsed.character
      )
        ? parsed.character
        : parsed;

    if (
      !rawCharacter ||
      typeof rawCharacter !==
        "object" ||
      Array.isArray(rawCharacter)
    ) {
      throw new Error(
        "That JSON file does not contain a character object."
      );
    }

    const importedRulesEntries = [
      rawCharacter,
      rawCharacter.species?.templateSnapshot,
      rawCharacter.background?.templateSnapshot,
      ...(
        Array.isArray(rawCharacter.classProgression?.classes)
          ? rawCharacter.classProgression.classes.flatMap((entry) => [
              entry,
              entry?.templateSnapshot,
              entry?.choices?.subclassSnapshot
            ])
          : []
      )
    ].filter(Boolean);

    const incompatibleRulesEntry = importedRulesEntries.find(
      (entry) => !isActiveRulesetEntry(entry)
    );

    if (incompatibleRulesEntry) {
      throw new Error(
        `This character uses ${incompatibleRulesEntry.rulesetId || incompatibleRulesEntry.rulesEdition || incompatibleRulesEntry.edition || "an incompatible ruleset"}. ` +
        `${ACTIVE_RULESET.label} is the only active rules mode.`
      );
    }

    const character =
      sanitizeDraftStrings(
        rawCharacter
      );

    character.id = null;

    character.builder = {
      ...(character.builder || {}),
      status: "draft",
      finalizedAtMillis: null,
      lastSavedAtMillis: null
    };

    return character;
  }

  function useSection18ImportedCharacter(
    character
  ) {
    if (
      !confirmDiscardUnsavedDraft(
        "importing a character"
      )
    ) {
      return false;
    }

    const requestedStep =
      getStepById(
        character?.builder
          ?.currentStep ||
        "basics"
      ).id;

    replaceDraft(
      character,

      {
        characterId: null,
        dirty: true,
        stepId: requestedStep
      }
    );

    creatorState.viewMode =
      "builder";

    creatorState.dirty =
      true;

    persistDraftToSession();

    setStatus(
      "Character imported as a new unsaved draft."
    );

    navigateToStep(
      requestedStep
    );

    return true;
  }

  function importSection18JsonText(
    jsonText
  ) {
    if (
      !beginCharacterBusyAction(
        "import-json-text"
      )
    ) {
      return false;
    }

    try {
      const character =
        parseSection18ImportedCharacter(
          jsonText
        );

      return useSection18ImportedCharacter(
        character
      );
    } catch (error) {
      console.error(
        "Could not import character JSON:",
        error
      );

      setStatus(
        "Character JSON could not be imported."
      );

      alert(
        error?.message ||
        "Character JSON could not be imported."
      );

      return false;
    } finally {
      endCharacterBusyAction(
        "import-json-text"
      );
    }
  }

  async function importSection18File(
    file
  ) {
    if (!file) {
      return false;
    }

    if (
      !beginCharacterBusyAction(
        "import-json-file"
      )
    ) {
      return false;
    }

    try {
      assertCharacterImportSize(
        Number(file.size) || 0
      );

      const jsonText =
        await file.text();

      const character =
        parseSection18ImportedCharacter(
          jsonText
        );

      return useSection18ImportedCharacter(
        character
      );
    } catch (error) {
      console.error(
        "Could not read character JSON file:",
        error
      );

      setStatus(
        "The selected JSON file could not be read."
      );

      alert(
        error?.message ||
        "The selected JSON file could not be read."
      );

      return false;
    } finally {
      endCharacterBusyAction(
        "import-json-file"
      );
    }
  }

  function formatSection18SavedTime() {
    const savedAtMillis =
      safeNumber(
        creatorState.draft
          .builder
          .lastSavedAtMillis,
        0
      );

    if (!savedAtMillis) {
      return "Not saved yet";
    }

    try {
      return new Date(
        savedAtMillis
      ).toLocaleString();
    } catch (error) {
      return "Previously saved";
    }
  }

  function getSection18CharacterPortraitUrl(
    character = creatorState.draft
  ) {
    return cleanString(
      character?.identity?.image?.url ||
      character?.image?.url ||
      character?.imageUrl ||
      character?.portraitUrl ||
      ""
    );
  }

  function isSection18SaveComplete(
    character
  ) {
    return Boolean(
      creatorState
        .currentCharacterId &&
      creatorState.dirty === false &&
      safeNumber(
        character
          ?.builder
          ?.lastSavedAtMillis,
        0
      ) > 0
    );
  }

  async function handleSection18Save() {
    return await saveSection18Character({
      asNew: false,
      copyName: false
    });
  }

  async function handleSection18SaveCopy() {
    return await saveSection18Character({
      asNew: true,

      copyName: Boolean(
        creatorState
          .currentCharacterId
      )
    });
  }

  async function handleSection18Finalize() {
    return await saveSection18Character({
      asNew: false,
      copyName: false,
      finalize: true
    });
  }

  async function handleSection18CreateLinkedToken() {
    if (
      !beginCharacterBusyAction(
        "create-linked-token"
      )
    ) {
      return false;
    }

    try {
      if (
        typeof deps.createCharacterLinkedToken !==
        "function"
      ) {
        throw new Error(
          "The token system is not connected."
        );
      }

      if (!creatorState.currentCharacterId) {
        throw new Error(
          "Save this character before creating its linked token."
        );
      }

      if (creatorState.dirty === true) {
        throw new Error(
          "Save the latest character changes before creating its linked token."
        );
      }

      if (!getSection18CharacterPortraitUrl()) {
        throw new Error(
          "Add and save a character portrait before creating its linked token."
        );
      }

      const character = {
        ...getCharacterSnapshot(),
        id:
          creatorState.currentCharacterId,
        docId:
          creatorState.currentCharacterId,
        firestoreDocumentId:
          creatorState.currentCharacterId
      };

      const token =
        await deps.createCharacterLinkedToken(
          character
        );

      setStatus(
        `${getSafeCharacterName() || "Character"} linked token created. Character HP is authoritative.`
      );

      return token || true;
    } catch (error) {
      console.error(
        "Could not create linked character token:",
        error
      );

      setStatus(
        "The linked token could not be created."
      );

      if (typeof alert === "function") {
        alert(
          error?.message ||
          "The linked token could not be created."
        );
      }

      return false;
    } finally {
      endCharacterBusyAction(
        "create-linked-token"
      );
    }
  }

  async function handleSection18Delete({
    button
  }) {
    await deleteSection18Character(
      button?.dataset
        ?.characterId
    );
  }

  async function handleSection18CopyJson() {
    await copySection18Json();
  }

  function handleSection18ExportJson() {
    exportSection18Json();
  }

  function handleSection18DownloadDraftBackup() {
    exportSection18Json({
      backup: true
    });
  }

  async function handleSection18ImportFile({
    button,
    event
  }) {
    const input =
      event?.target ||
      button;

    const file =
      input?.files?.[0] ||
      null;

    await importSection18File(
      file
    );
  }

  function handleSection18ImportText() {
    const jsonText =
      $("ccImportJsonText")
        ?.value ||
      "";

    if (!jsonText.trim()) {
      alert(
        "Paste character JSON first."
      );

      return;
    }

    importSection18JsonText(
      jsonText
    );
  }

  async function handleSection18Change({
    target
  }) {
    if (
      target?.dataset
        ?.ccImportFile !==
      "true"
    ) {
      return false;
    }

    const file =
      target.files?.[0] ||
      null;

    await importSection18File(
      file
    );

    target.value = "";

    return true;
  }

  registerCharacterCreatorAction(
    "delete-character",
    handleSection18Delete
  );

  return {
    blockSection18Finalization, copySection18Json, deleteSection18Character, exportSection18Json, formatSection18SavedTime, getSection18CharacterCollection,
    getSection18CharacterCollectionName, getSection18CharacterDocument, getSection18CharacterPortraitUrl, getSection18DocumentSnapshotData, getSection18JsonText, getSection18RecordRevisionMillis,
    getSection18RecordRoomCode, getSection18RecordType, getSection18TimestampMillis, getValidatedSection18CharacterDocument, handleSection18Change, handleSection18CopyJson,
    handleSection18CreateLinkedToken, handleSection18Delete, handleSection18DownloadDraftBackup, handleSection18ExportJson, handleSection18Finalize, handleSection18ImportFile,
    handleSection18ImportText, handleSection18Save, handleSection18SaveCopy, hasSection18FirestoreReadTool, importSection18File, importSection18JsonText,
    isSection18CharacterRecordData, isSection18SaveComplete, parseSection18ImportedCharacter, prepareSection18Character,
    saveSection18Character, section18SnapshotExists, syncSection18DerivedValues, useSection18ImportedCharacter,
    validateSection18FirestoreRecord, validateSection18NoRemoteConflict
  };
}
