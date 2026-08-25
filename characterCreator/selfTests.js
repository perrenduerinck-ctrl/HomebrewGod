export function runCharacterCreatorSelfTests(context) {
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
    beginCharacterBusyAction, beginnerNote, blockCharacterBusyAction, blockMulticlassEdit, blockSection18Finalization, bootSection20WhenReady,
    calculateAbilityModifier, calculateAbilityModifiers, calculateArmorClassOptions, calculateCharacterHitDice, calculateCharacterHp, calculateCharacterInitiative,
    calculateCharacterPassiveScores, calculateCharacterRolledHp, calculateCharacterSavingThrows, calculateCharacterSkillModifier, calculateClassProgressionTotalLevel, calculateContainerContentWeight,
    calculateEquippedWeaponAttacks, calculateInventoryWeightSummary, calculateRuleCarryingCapacity, calculateRuleFixedAverageHp, calculateRuleManualHp, calculateRulePassiveScore,
    calculateRuleRolledHp, calculateRuleSavingThrowModifier, calculateRuleSkillModifier, calculateRuleSpellAttackBonus, calculateRuleSpellSaveDc, calculateSection13SuggestedHp,
    calculateSection16SpellcastingValues, calculateSelectedFeatNumericEffect, calculateSrd2014MulticlassSpellcasting, calculateWeaponAttack, changeSection13PointBuyScore, changeSection15Quantity,
    characterCreatorActions, characterCreatorChangeHandlers, characterCreatorInputHandlers, characterHasClass, characterLibraryRenderer, characterSheetView,
    characterStepCompletionChecks, characterStepRenderers, chooseSection11Subrace, chooseSection12Class, chooseSection12Subclass, chooseSection14Background,
    chooseSpeciesFromTemplate, chooseStoredDraftRecord, clampLevel, clampStepIndex, cleanArray, cleanImportSourceLabel,
    cleanString, cleanupDuplicateNonRepeatableAdvancementFeats, cleanupSection11PreviousPortrait, cleanupSection19PermanentListeners, cleanupSection20CharacterCreator, clearPendingDraftPersistence,
    clearSection11Portrait, clearSection11SpeciesMechanics, clearSection12Subclass, clearStoredDraft, cloneData, collectMalformedSourceValues,
    collectSection12Features, collectSection12FeaturesForClassEntry, confirmDiscardUnsavedDraft, connectDraftPersistenceLifecycle, connectPopstateRouting,
    connectSection19PermanentListeners, connectWizardEvents,
    copySection18Json, countSection14BackgroundSourceList, countSection14SkillSource, countSection14ValidBackgroundToolChoices, countSection14ValidSkillSource, countValidClassEntrySkillChoices,
    createAbilityMap, createCharacterLibraryCard, createCharacterPayload, createCharacterSheetView, createClassEntryId, createClassProgressionEntry,
    createDefaultClassTemplate, createDraftStorageRecord, createEmptyCharacter, createNormalAbilityCapScoreMap, createSection11PortraitFromFile, createSection13HpRollRecord,
    createSrdClassTemplate, createSrdFeature, createSrdFeatureLevels, createSrdSubclass, creatorState, debugSection12MulticlassAdd,
    decodeFeatChoiceValue, deleteSection18Character, deps, deriveAbilityBaseFromFinalScores, disconnectDraftPersistenceLifecycle, disconnectSection20Routing,
    disconnectWizardEvents, draftPersistenceRuntime, duplicateCharacterFromLibrary, duplicateIntoDraft, encodeFeatChoiceValue, endCharacterBusyAction,
    enforceClassProgressionLevelCap, enrichBuiltinBackgroundTemplate, enrichBuiltinSpeciesTemplate, ensureAbilityBonusSources, ensureClassProgressionEntryData, ensureEquipmentCurrencySources,
    ensureProficiencySources, ensureWizardShell, ensureWizardStyles, escapeHtml, evaluateSection12ClassLevelFormula, evaluateSection12ClassResourceMaximum,
    expandSection14ToolChoice, exportSection18Json, filterRepeatedFeatChoiceOptions, findCachedCharacter, findClassEntryForLevelOrderKey, findDefaultClassDefinition,
    findHpRollRawRecordForLevel, findSection11ActionElement, findSection12ActionElement, findSection13ActionElement, findSection14ActionElement, findSection15ActionElement,
    findSection16ActionElement, flushPendingDraftPersistence, formatClassEntryHitDie, formatClassEntryProficiencySummary, formatDefaultSpellLevelLabel, formatMulticlassPrerequisiteFailure,
    formatMulticlassRequirementItem, formatMulticlassStoredChoiceKey, formatMulticlassStoredChoiceValue, formatSection11PortraitBytes, formatSection12ClassChoiceValues, formatSection12FeatEffect,
    formatSection12List, formatSection12Recharge, formatSection13HpRolls, formatSection14CurrencySummary, formatSection14List, formatSection16ProgressionLabel,
    formatSection16SpellComponents, formatSection16SpellResolution, formatSection16SpellScaling, formatSection17ClassEntryLabel, formatSection17ClassLevelSummary, formatSection17Modifier,
    formatSection18SavedTime, formatSelectedClassMechanicEffect, formatSignedNumber, friendlyServiceError, getAbilityBonusTotalsFromSources, getAbilityDefinition,
    getAbilityScore, getAllClassTemplates, getAllSection14Backgrounds, getAllSpeciesTemplates, getBackgroundSourceLabel, getBrowserStorage,
    getCharacterBusyLabel, getCharacterClassEntries, getCharacterLevelHitDieRecords, getCharacterLibraryClassName, getCharacterLibraryDisplayName, getCharacterLibraryImageUrl,
    getCharacterLibraryLevel, getCharacterLibrarySpeciesName, getCharacterProficiencyBonus, getCharacterSkillEntry, getCharacterSnapshot, getCharacterSpellcastingInfo,
    getClassAsiLevels, getClassEntryAtIndex, getClassEntryLevel, getClassEntrySkillChoiceConfig, getClassEntryStoredSkillIds, getClassEntryStoredToolChoices,
    getClassEntrySubclassTemplate, getClassEntryToolChoiceConfig, getClassEntryToolChoiceOptions, getClassIndexForLevelRecord, getClassLevelOrderEntryKey, getClassProgressionEntries,
    getClassProgressionEntryKey, getClassProgressionPendingChoiceWarnings, getClassSourceLabel, getContainerContents, getContainerSummaries, getCurrencySourceTotals,
    getDefaultClassFeaturesThroughLevel, getDefaultLevelUpClassIndex, getDraftStorageKey, getDraftStorageTargets, getExactBuilderStepById, getFeatAbilityEffectMaximum,
    getFeatPrerequisiteLabel, getFeatPrerequisiteResult, getFeatSpellcastingValidationWarnings, getGenericProficiencyBonus, getHitDieSize, getHpRollRawRecords,
    getInventoryItemKnownWeight, getLatestLevelUpContext, getLegacy2014Metadata, getManualCurrencyBalance, getManualProficiencyList, getMulticlassClassId,
    getMulticlassPendingSkillChoiceWarnings, getMulticlassPendingToolChoiceWarnings, getMulticlassPrerequisiteRequirements, getMulticlassPrerequisiteResultForClass, getMulticlassPrerequisiteResults, getMulticlassProficiencyRule,
    getMulticlassRequirementLabel, getMulticlassSummaryEntries, getNormalAbilityScoreForCap, getPendingClassFeatureChoiceWarnings, getPerClassSpellSelectionSummary, getPersistentDraftStorageKey,
    getPreparedSpellLimit, getPrimaryClassEntry, getProgressionValueByLevel, getRoomCode, getRouteFromUrl, getSafeBackgroundName,
    getSafeCharacterName, getSafeClassName, getSafeSpeciesName, getSafeSubclassName, getSection11ChoiceSource, getSection11DragonbornAncestry,
    getSection11HalfElfAbilityChoices, getSection11LanguageChoices, getSection11Portrait, getSection11SelectedSpeciesTemplate, getSection11SelectedSubrace, getSection11SkillChoices,
    getSection12ArtificerInfusionContext, getSection12ArtificerInfusionState, getSection12AsiChoiceState, getSection12AsiFeature, getSection12CanonicalResourceId, getSection12ClassFeatureSaveDc,
    getSection12ClassFeaturesThroughLevel, getSection12CustomClassSkillNames, getSection12DivineSmiteSlotOptions, getSection12FeatChoiceLimit, getSection12FeatChoiceOptions, getSection12FeatureChoiceKey,
    getSection12FeatureChoiceOptionRecords, getSection12FeatureChoiceOptions, getSection12FeatureChooseCount, getSection12FeatureMechanicLines, getSection12FeatureStoredChoices, getSection12FutureClassFeatures,
    getSection12InfusionTargetOptions, getSection12LevelData, getSection12MulticlassAddStatus, getSection12PrimaryClass, getSection12SkillPickerChoices, getSection12SpellSlotUsageState,
    getSection12SubclassTemplates, getSection12UnlockedAsiSlot, getSection13AbilityBonus, getSection13AbilityName, getSection13AbilityScore, getSection13BaseAbilityScore,
    getSection13HitDieSize, getSection13HpRollState, getSection13PointBuySpent, getSection14AllExactToolOptions, getSection14BackgroundChoiceList, getSection14BackgroundCurrencyGrant,
    getSection14BackgroundLanguageOptions, getSection14BackgroundPackages, getSection14BackgroundRemovalSummary, getSection14BackgroundSourceValues, getSection14BackgroundToolOptions, getSection14BackgroundToolOptionsForIndex,
    getSection14SkillChoiceList, getSection14SkillEntry, getSection14SkillModifier, getSection14SkillSourceLabel, getSection15ActionIndex, getSection15AttunedItemCount,
    getSection15Catalog, getSection15Inventory, getSection15InventoryCount, getSection15TotalWeight, getSection15UnknownWeightCount, getSection16ClassSourceStore,
    getSection16CustomFeatures, getSection16CustomSpells, getSection16EligibleSpellcasters, getSection16EntryForSource, getSection16ExpandedSpellGrant, getSection16ExpandedSpellGrants,
    getSection16HitDieKey, getSection16InnateSpells, getSection16KnownLimitWarning, getSection16KnownSpellIds, getSection16MysticArcanumLevels, getSection16PreparationMode,
    getSection16PreparedLimitWarning, getSection16PreparedSpellIds, getSection16SelectedFeats, getSection16SourceKey, getSection16SourceState, getSection16SpellById,
    getSection16SpellReferenceId, getSection17AbilityName, getSection17CarryingCapacity, getSection17CharacterSheetView, getSection17ClassProgressionEntries, getSection17CompletedStepIds,
    getSection17FeatureCount, getSection17FinalizationValidation, getSection17Initiative, getSection17InventoryWeight, getSection17MigrationWarnings, getSection17PassivePerception,
    getSection17ProficiencyBonus, getSection17SkillEntry, getSection17SkillModifier, getSection17SpellCount, getSection17Warnings, getSection18CharacterCollection,
    getSection18CharacterCollectionName, getSection18CharacterDocument, getSection18CharacterPortraitUrl, getSection18DocumentSnapshotData, getSection18JsonText, getSection18MutationIdentity,
    getSection18RecordRevisionMillis, getSection18RecordRoomCode, getSection18RecordType, getSection18TimestampMillis, getSection19CollectionName,
    getSelectedClassTemplate, getSelectedDefaultFeatInstances, getSelectedSection12Subclass, getSelectedSection14Background, getSkillDefinitionByIdOrName, getSpeciesHpBonus,
    getSpeciesSourceLabel, getSpellSelectionLimits, getSpellSlotCastingOptions, getSpellSourceContexts, getSpellSourceId, getSpellSourceWarning,
    getSpellcastingClassOptions, getSpellcastingEntryForSpell, getSpellcastingFocusClassIds, getSpellcastingFocusSummary, getSpellcastingSummary, getSrd2014PactMagic,
    getSrd2014SpellSlots, getStartingClassEntry, getStepById, getStepIndex, getStoredSources, getSubraceSourceLabel,
    getUnlockedFeatChoiceSlots, getValidClassEntrySkillIds, getValidClassEntryToolChoices, getValidatedSection18CharacterDocument, getValidationWarnings, handleAddSpeciesTraitAction,
    handleApplySpeciesChoicesAction, handleBrowserRouteChange, handleChooseSpeciesAction, handleChooseSubraceAction, handleDraftBeforeUnload, handleRemoveSpeciesTraitAction,
    handleSection11PortraitChange, handleSection11RemovePortrait, handleSection11SetPortraitUrl, handleSection12AddCharacterLevel, handleSection12AddMulticlassClass, handleSection12AdjustMulticlassLevel,
    handleSection12ArtificerInfusion, handleSection12ArtificerInfusionTargetChange, handleSection12AsiAction, handleSection12AsiChange, handleSection12ChooseAsiFeat, handleSection12ChooseClass,
    handleSection12ChooseSubclass, handleSection12ClassFeatureChoice, handleSection12ClassFeatureSelectChange, handleSection12ClearSubclass, handleSection12CustomClass, handleSection12CustomClassSkillPicker,
    handleSection12CustomSubclass, handleSection12FeatSearch, handleSection12MoveCharacterLevelOrder, handleSection12MoveMulticlassClass, handleSection12MulticlassChange, handleSection12RemoveLastCharacterLevel,
    handleSection12RemoveMulticlassClass, handleSection12ToggleMulticlassSkill, handleSection12ToggleMulticlassTool, handleSection13ApplyRolls, handleSection13CalculateHp, handleSection13Change,
    handleSection13PointBuy, handleSection13RefreshLevel, handleSection13ResetPointBuy, handleSection13ResetStandardArray, handleSection13RollScores, handleSection14AddFeature,
    handleSection14ApplyBackgroundChoices, handleSection14ApplyBackgroundPackage, handleSection14ApplyLists, handleSection14ChooseBackground, handleSection14CustomBackground, handleSection14OldBackgroundEquipment,
    handleSection14RemoveFeature, handleSection14SkipBackground, handleSection14ToggleExpertise, handleSection14ToggleSkill, handleSection15AddCatalogItem, handleSection15AddCustomItem,
    handleSection15Change, handleSection15ChangeQuantity, handleSection15CloseContainer, handleSection15MoveItemOut, handleSection15OpenContainer, handleSection15RemoveItem,
    handleSection15ResolveContainerRemoval, handleSection15SkipEquipment, handleSection15ToggleContainedItems, handleSection15ToggleState, handleSection16AddFeature, handleSection16AddSpell,
    handleSection16CalculateSpellcasting, handleSection16DefaultSpellSearch, handleSection16RemoveFeature, handleSection16SpellAction, handleSection16SpellSourceChange, handleSection16ToggleFeat,
    handleSection17AdjustClassResource, handleSection17AdjustDivineSmiteSlot, handleSection17AdjustFeatResource, handleSection17OpenCharacterSheet, handleSection17RefreshReview, handleSection17ToggleRageState,
    handleSection18Change, handleSection18CopyJson, handleSection18CreateLinkedToken, handleSection18Delete, handleSection18DownloadDraftBackup, handleSection18ExportJson,
    handleSection18Finalize, handleSection18ImportFile, handleSection18ImportText, handleSection18Save, handleSection18SaveCopy, handleUseCustomSpeciesAction,
    handleWizardChange, handleWizardClick, handleWizardImport, handleWizardInput, hasAbilityMapValues, hasCurrencyValue,
    hasFirestoreTools, hasMalformedSourceValue, hasSection11PortraitUploadHook, hasSection14BackgroundCurrency, hasSection18FirestoreReadTool, hpRollRawHasAssociation,
    hpRollRawMatchesLevel, importSection18File, importSection18JsonText, isActiveRulesetEntry, isAsiOrFeatChoiceFeature, isCharacterBusyAction,
    isCharacterCreatorBusy, isCharacterCreatorRoute, isCharacterNonSpellcaster, isDraftStorageQuotaError, isMulticlassDraft, isMulticlassRequirementMet,
    isPlainObject, isSavingThrowProficient, isSection11AbilityChoiceValid, isSection11LanguageChoiceValid, isSection11PortraitFile, isSection11PortraitUrlAllowed,
    isSection11SkillChoiceValid, isSection16MysticArcanumSpell, isSection16SpellKnown, isSection16SpellPrepared, isSection17AbilitiesComplete, isSection17BackgroundComplete,
    isSection17BasicsComplete, isSection17ClassComplete, isSection17EquipmentComplete, isSection17LevelComplete, isSection17OptionalFinalizationWarning, isSection17ReviewComplete,
    isSection17SkillsComplete, isSection17SpeciesComplete, isSection17SpellsComplete, isSection17SubclassComplete, isSection18CharacterRecordData, isSection18SaveComplete,
    isStartingClassEntry, isStepComplete, isWeaponProficient, makeSafeFileName, makeSafeId, markCharacterBuilderAsDraft,
    markDraftChanged, migrateClassEntryAdvancementData, migrateSection16LegacySpellSelections, moveCharacterLevelOrder, moveMulticlassClass, moveSection15ItemToContainer,
    navigateByStepOffset, navigateToLibrary, navigateToStep, normalizeAbilityMap, normalizeAdvancementChoices, normalizeCharacter,
    normalizeCharacterImageValue, normalizeClassChoiceMap, normalizeClassEntryHitDie, normalizeClassLevelOrder, normalizeClassTemplate, normalizeCurrencyMap,
    normalizeCurrencySourceMap, normalizeFeatChoiceSelections, normalizeFeatIds, normalizeHpCalculation, normalizeHpRollRecordsForCharacter, normalizeImportSourceList,
    normalizeSection12Subclass, normalizeSection14Background, normalizeSection15Item, normalizeSection16Feature, normalizeSection16Spell, normalizeSection19BackgroundRecord,
    normalizeSection19CharacterRecord, normalizeSection19ClassRecord, normalizeSection19SpeciesRecord, openCharacterFromLibrary, parseFeatChoiceSelections, parseSection12List,
    parseSection13HpRolls, parseSection14List, parseSection15ItemEditValue, parseSection18ImportedCharacter, performSection16Rest, persistDraftToSession,
    prepareSection18Character, pruneAbandonedClassFeatureChoices, pruneRemovedClassSpellSources, readDraftStorageRecord, readRealtimeSnapshotRecords, readSection11PortraitFileAsDataUrl,
    recalculateAbilityTotals, recalculateClassTotalLevel, recordRawEquipmentMigrationWarnings, refreshBuilderChrome, refreshClassProgressionDerivedValues, refreshElements,
    refreshLoadedClassDerivedValues, refreshSection13AbilitySummary, refreshSection13LevelProgression, refreshSection20CharacterCreator, refreshSelectedClassFeatures, refreshWizardElements,
    registerCharacterCreatorAction, registerCharacterCreatorChangeHandler, registerCharacterCreatorInputHandler, registerCharacterLibraryRenderer, registerCharacterStepCompletion, registerCharacterStepRenderer,
    removeAbilityBonusSourcesByPrefix, removeContainerAndContents, removeContainerPreserveContents, removeInnateSpellsBySourcePrefixes, removeLastCharacterLevel, removeListProficiencySource,
    removeListProficiencySourcesByPrefix, removeMulticlassClass, removeSection11Portrait, removeSection12AsiFeatIfUnused, removeSection14BackgroundCurrency, removeSection14BackgroundEquipment,
    removeSection14BackgroundFeature, removeSection15Item, removeSection16CustomFeature, removeSection16CustomSpell, removeSkillProficiencySource, removeSkillProficiencySourcesByPrefix,
    removeSpeciesTrait, renderAbilitiesStep, renderActionBar, renderBackgroundStep, renderBasicsStep, renderBuilderView,
    renderCatalogEntryDetails, renderCharacterLibraryEmptyState, renderCharacterLibraryView, renderClassFeatureMetadata, renderClassStep, renderCreatorView,
    renderEquipmentStep, renderFullCatalogDescription, renderLatestLevelAsiUnlock, renderLatestLevelFeatureUnlocks, renderLatestLevelSubclassUnlock, renderLatestLevelUnlockSummary,
    renderLevelStep, renderLevelUpWorkflow, renderMissingStep, renderMulticlassAdvancementChoiceSummary, renderMulticlassClassSummary, renderMulticlassLevelBreakdown,
    renderMulticlassProgressionEditor, renderMulticlassReadOnlyNotice, renderMulticlassSkillChoices, renderMulticlassStoredChoices, renderMulticlassToolChoices, renderReviewStep,
    renderRulesetMetadata, renderSaveStep, renderSection11PortraitPanel, renderSection12ArtificerInfusions, renderSection12AsiChoice, renderSection12CompactAsiChoice,
    renderSection12DivineSmiteSlotUsage, renderSection12FeatChoices, renderSection12FeatureMechanics, renderSection12FutureFeatures, renderSection12MulticlassAddStatus, renderSection12SelectedClassDetails,
    renderSection13AbilityScoreDetails, renderSection13AbilitySummary, renderSection13ArmorClassGuide, renderSection13DerivedMechanics, renderSection13HitDice, renderSection13HpGuide,
    renderSection13ManualAbilities, renderSection13MechanicsGuide, renderSection13PointBuy, renderSection13RolledAbilities, renderSection13RolledHpInputs, renderSection13StandardArray,
    renderSection14ExpertiseChoices, renderSection14ProficiencyGuide, renderSection14SourceSkillChoices, renderSection15Catalog, renderSection15ContainerDestinationSelect, renderSection15Inventory,
    renderSection15ItemEditCheckbox, renderSection15ItemEditControls, renderSection15ItemEditInput, renderSection15ItemEditTextarea, renderSection15OpenContainerPanel, renderSection16BeginnerGuide,
    renderSection16CustomSpells, renderSection16DefaultSpellViewer, renderSection16FeatPicker, renderSection16FeatureCards, renderSection16InnateSpells, renderSection16SpellSlots,
    renderSection17Abilities, renderSection17BackgroundChoices, renderSection17BackgroundGrants, renderSection17ClassAndFeatSummary, renderSection17ClassSpells, renderSection17ContainerSummary,
    renderSection17FeatureReviewItem, renderSection17FeatureSummary, renderSection17HitDice, renderSection17InnateSpells, renderSection17Inventory, renderSection17List,
    renderSection17MigrationWarnings, renderSection17PassiveScores, renderSection17SavingThrows, renderSection17Skills, renderSection17SpellcastingSummary, renderSection17Warnings,
    renderSection17WeaponAttacks, renderSection18BackupNotice, renderSection18LinkedTokenPanel, renderSection18Warnings, renderSelectedClassMechanicsSummary, renderSelectedFeatSummary,
    renderSkillsStep, renderSpeciesStep, renderSpellsStep, renderStepContent, renderStepRail, renderSubclassStep,
    repairContainerState, replaceDraft, replaceSection11Portrait, replaceSection20Draft, resolveClassTemplateForEntry, restoreDraftFromSession,
    restoreSection16ResourceList, retiredCharacterStepIds, rollSection13AbilityScore, rollSection13ScorePool, runCharacterCreatorAction, runCharacterStepRegistrationAudit,
    runWizardHandlers, safeDisplayString, safeNumber, sanitizeDraftStrings, saveSection12ArtificerInfusionState, saveSection18Character,
    scheduleDraftPersistence, section16RechargeMatchesRest, section16SelectedSpellSourceIds, section18SnapshotExists, selectClassTemplate, setAbilityBonusSource,
    setAbilityScore, setCharacterLevel, setCurrentStep, setDraftValue, setFeatRestChoice, setInnateSpellsForSource,
    setManualProficiencyList, setMulticlassClassLevel, setMulticlassSubclass, setSection11Portrait, setSection12ArtificerInfusionTarget, setSection12AsiBonusSource,
    setSection12AsiChoiceValues, setSection12AsiFeat, setSection12AsiMode, setSection12CustomClassSkillNames, setSection12FeatChoiceValues, setSection12FeatureStoredChoices,
    setSection12MulticlassAddStatus, setSection13AbilityMethod, setSection13HpRollValue, setSection14BackgroundChoiceList, setSection14SkillEntry, setSection14StoredSkillChoice,
    setSimpleDraftField, setSourceProficiencyList, setStatus, skipSection14Background, slotsArrayToObject, sourceMatches,
    splitInventoryStack, startNewDraft, startSection20CharacterCreator, startSection20NewCharacter, subtractCurrencyMaps,
    syncClassLevelOrderToClassLevels, syncEquipmentCurrencyFromSources, syncFirstUnarmoredDefenseSource, syncSection12AdvancementChoice, syncSection12ArtificerInfusionsForLevel, syncSection12AsiChoicesForLevel,
    syncSection14BackgroundFeatures, syncSection16ClassSourceMetadata, syncSection16LegacySpellAliases, syncSection17CompletedSteps, syncSection18DerivedValues, toggleMulticlassSkillChoice,
    toggleMulticlassToolChoice, toggleSection12ArtificerInfusion, toggleSection12ClassFeatureChoice, toggleSection12RageState, toggleSection14Expertise, toggleSection14Skill,
    toggleSection15ItemState, toggleSection16Feat, toggleSection16MysticArcanum, toggleSection16SpellKnown, toggleSection16SpellPrepared, tryAddMulticlassClass,
    uniqueCleanArray, updateSection12CustomClassSkillPicker, updateSection15InventoryItem, uploadSection11PortraitFile, useCustomClassName, useCustomSpeciesName,
    useSection18ImportedCharacter, useSpeciesTemplate, validateBuiltinSpeciesBackgroundCatalog, validateContainerState, validateDefaultClassCollection, validateDefaultFeatCollection,
    validateDefaultSpellCatalog, validateDefaultSpellReferences, validateDefaultSubclassCollection, validateFeatPrerequisiteDefinitions, validateSection18FirestoreRecord, validateSection18NoRemoteConflict,
    warnDraftStorageFailure, wizardChoiceCard, wizardField, wizardRuntime, wizardSelect, wouldCreateContainerCycle,
    writeRouteToUrl
  } = context;
    const results = [];

    const storageSnapshot = (() => {
      try {
        const targets =
          getDraftStorageTargets();

        return {
          available:
            targets.length > 0,
          targets:
            targets.map((target) => {
              const value =
                target.storage.getItem(
                  target.key
                );

              return {
                ...target,
                hadValue:
                  value !== null,
                value
              };
            })
        };
      } catch (error) {
        return {
          available: false,
          targets: []
        };
      }
    })();

    const getSelfTestStateSnapshot = () => {
      return {
        viewMode:
          creatorState.viewMode,
        currentStepId:
          creatorState.currentStepId,
        currentStepIndex:
          creatorState.currentStepIndex,
        currentCharacterId:
          creatorState.currentCharacterId,
        draft:
          cloneData(creatorState.draft),
        dirty:
          creatorState.dirty,
        isSaving:
          creatorState.isSaving,
        busyAction:
          creatorState.busyAction,
        statusMessage:
          creatorState.statusMessage,
        multiclassAddStatus:
          cloneData(
            creatorState.multiclassAddStatus
          ),
        pendingContainerRemovalId:
          creatorState.pendingContainerRemovalId,
        openContainerId:
          creatorState.openContainerId,
        showContainedItems:
          creatorState.showContainedItems,
        characterCache:
          cloneData(
            creatorState.characterCache
          ),
        characterRoomCode:
          creatorState.characterRoomCode,
        roomClassCache:
          cloneData(
            creatorState.roomClassCache
          ),
        classRoomCode:
          creatorState.classRoomCode,
        roomSpeciesCache:
          cloneData(
            creatorState.roomSpeciesCache
          ),
        roomBackgroundCache:
          cloneData(
            creatorState.roomBackgroundCache
          )
      };
    };

    const applySelfTestStateSnapshot = (
      stateSnapshot
    ) => {
      creatorState.viewMode =
        stateSnapshot.viewMode;
      creatorState.currentStepId =
        stateSnapshot.currentStepId;
      creatorState.currentStepIndex =
        stateSnapshot.currentStepIndex;
      creatorState.currentCharacterId =
        stateSnapshot.currentCharacterId;
      creatorState.draft =
        cloneData(stateSnapshot.draft);
      creatorState.dirty =
        stateSnapshot.dirty;
      creatorState.isSaving =
        stateSnapshot.isSaving;
      creatorState.busyAction =
        stateSnapshot.busyAction;
      creatorState.statusMessage =
        stateSnapshot.statusMessage;
      creatorState.multiclassAddStatus =
        cloneData(
          stateSnapshot.multiclassAddStatus || {
            message: "",
            tone: "warning"
          }
        );
      creatorState.pendingContainerRemovalId =
        stateSnapshot.pendingContainerRemovalId;
      creatorState.openContainerId =
        stateSnapshot.openContainerId;
      creatorState.showContainedItems =
        stateSnapshot.showContainedItems;
      creatorState.characterCache =
        cloneData(
          stateSnapshot.characterCache
        );
      creatorState.characterRoomCode =
        stateSnapshot.characterRoomCode;
      creatorState.roomClassCache =
        cloneData(
          stateSnapshot.roomClassCache
        );
      creatorState.classRoomCode =
        stateSnapshot.classRoomCode;
      creatorState.roomSpeciesCache =
        cloneData(
          stateSnapshot.roomSpeciesCache
        );
      creatorState.roomBackgroundCache =
        cloneData(
          stateSnapshot.roomBackgroundCache
        );
    };

    const createIsolatedSelfTestState = () => {
      return {
        viewMode: "builder",
        currentStepId: "basics",
        currentStepIndex: 0,
        currentCharacterId: null,
        draft: createEmptyCharacter(),
        dirty: false,
        isSaving: false,
        busyAction: "",
        statusMessage:
          "Running isolated character creator self-tests.",
        multiclassAddStatus: {
          message: "",
          tone: "warning"
        },
        pendingContainerRemovalId: "",
        openContainerId: "",
        showContainedItems: false,
        characterCache: [],
        characterRoomCode: null,
        roomClassCache: [],
        classRoomCode: null,
        roomSpeciesCache: [],
        roomBackgroundCache: []
      };
    };

    const stateSnapshot =
      getSelfTestStateSnapshot();

    const restoreSelfTestState = () => {
      applySelfTestStateSnapshot(
        stateSnapshot
      );

      if (
        storageSnapshot.available
      ) {
        storageSnapshot.targets
          .forEach((target) => {
            try {
              if (target.hadValue) {
                target.storage.setItem(
                  target.key,
                  target.value
                );
              } else {
                target.storage.removeItem(
                  target.key
                );
              }
            } catch (error) {
              console.warn(
                "Could not restore stored character draft after self-tests:",
                error
              );
            }
          });
          }
    };

    applySelfTestStateSnapshot(
      createIsolatedSelfTestState()
    );

    const record = (
      name,
      actual,
      expected
    ) => {
      const pass =
        JSON.stringify(actual) ===
        JSON.stringify(expected);

      results.push({
        name,
        pass,
        actual,
        expected
      });
    };

    const createSelfTestStorage = (
      options = {}
    ) => {
      const values = new Map(
        Object.entries(
          options.seed || {}
        )
      );

      const metrics = {
        setCount: 0,
        removeCount: 0
      };

      return {
        values,
        metrics,

        getItem(key) {
          return values.has(key)
            ? values.get(key)
            : null;
        },

        setItem(key, value) {
          if (options.throwOnSet) {
            throw options.throwOnSet;
          }

          metrics.setCount += 1;

          values.set(
            key,
            String(value)
          );
        },

        removeItem(key) {
          metrics.removeCount += 1;
          values.delete(key);
        }
      };
    };

    const createSelfTestStorageTargets = (
      sessionStorageMock,
      persistentStorageMock
    ) => {
      return [
        {
          name: "session",
          label: "this browser tab",
          persistent: false,
          key: getDraftStorageKey(),
          storage: sessionStorageMock
        },
        {
          name: "persistent",
          label:
            "local browser backup",
          persistent: true,
          key: getPersistentDraftStorageKey(),
          storage: persistentStorageMock
        }
      ];
    };

    const withMutedConsoleWarn = (
      action
    ) => {
      const originalWarn =
        console.warn;

      console.warn = () => {};

      try {
        return action();
      } finally {
        console.warn =
          originalWarn;
      }
    };

    try {
    record(
      "Self-tests start from isolated creator state",
      {
        viewMode:
          creatorState.viewMode,
        currentCharacterId:
          creatorState.currentCharacterId,
        dirty:
          creatorState.dirty,
        busyAction:
          creatorState.busyAction,
        openContainerId:
          creatorState.openContainerId,
        showContainedItems:
          creatorState.showContainedItems,
        characterCache:
          creatorState.characterCache.length,
        roomClassCache:
          creatorState.roomClassCache.length,
        draftName:
          getSafeCharacterName(
            creatorState.draft
          )
      },
      {
        viewMode: "builder",
        currentCharacterId: null,
        dirty: false,
        busyAction: "",
        openContainerId: "",
        showContainedItems: false,
        characterCache: 0,
        roomClassCache: 0,
        draftName: ""
      }
    );

    const portraitUrl =
      "https://example.com/portrait.png";

    const portraitSet =
      setSection11Portrait(
        {
          url: portraitUrl,
          publicId: "portrait-public-id"
        },
        {
          render: false,
          status: false
        }
      );

    const portraitBasicsHtml =
      renderBasicsStep();

    const storedPortraitAfterSet =
      getSection11Portrait();

    const normalizedStringPortrait =
      normalizeCharacter({
        identity: {
          name: "String Portrait",
          image:
            "https://example.com/string-portrait.png"
        }
      }).identity.image;

    const portraitCleared =
      clearSection11Portrait({
        render: false,
        status: false
      });

    record(
      "Basics portrait workflow stores images and renders replacement controls",
      {
        set:
          portraitSet,
        url:
          storedPortraitAfterSet.url,
        publicIdRendered:
          portraitBasicsHtml.includes(
            "portrait-public-id"
          ),
        urlAction:
          portraitBasicsHtml.includes(
            'data-cc-action="set-portrait-url"'
          ),
        uploadInput:
          portraitBasicsHtml.includes(
            'data-cc-portrait-upload="true"'
          ),
        removeAction:
          portraitBasicsHtml.includes(
            'data-cc-action="remove-portrait"'
          ),
        normalizedStringUrl:
          normalizedStringPortrait.url,
        cleared:
          portraitCleared,
        clearedUrl:
          creatorState.draft
            .identity
            .image
            .url
      },
      {
        set: true,
        url: portraitUrl,
        publicIdRendered: true,
        urlAction: true,
        uploadInput: true,
        removeAction: true,
        normalizedStringUrl:
          "https://example.com/string-portrait.png",
        cleared: true,
        clearedUrl: ""
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection12Class(
      "wizard"
    );

    const wizardEntryForSubclassIsolation =
      getSection12PrimaryClass();

    const artificerTemplateForSubclassIsolation =
      DEFAULT_CLASS_TEMPLATES.find(
        (template) => {
          return (
            template.id ===
            "artificer"
          );
        }
      );

    const alchemistForSubclassIsolation =
      artificerTemplateForSubclassIsolation
        ?.subclasses
        ?.find((subclass) => {
          return (
            subclass.id ===
            "alchemist"
          );
        });

    wizardEntryForSubclassIsolation.level =
      6;
    wizardEntryForSubclassIsolation
      .templateSnapshot = {
        ...cloneData(
          artificerTemplateForSubclassIsolation
        ),
        id: "wizard",
        name: "Wizard"
      };
    wizardEntryForSubclassIsolation.subclassId =
      "alchemist";
    wizardEntryForSubclassIsolation.subclassName =
      "Alchemist";
    wizardEntryForSubclassIsolation.choices = {
      subclassSnapshot:
        cloneData(
          alchemistForSubclassIsolation
        )
    };

    creatorState.draft
      .classProgression
      .totalLevel = 6;

    creatorState.roomClassCache = [
      {
        ...cloneData(
          artificerTemplateForSubclassIsolation
        ),
        id: "wizard",
        name: "Wizard",
        source: "homebrew"
      }
    ];

    const arcaneTraditionForSubclassIsolation =
      getSection12ClassFeaturesThroughLevel()
        .find((feature) => {
          return (
            feature.id ===
            "arcane-tradition"
          );
        });

    const wizardSubclassNames =
      getSection12SubclassTemplates()
        .map((subclass) => {
          return subclass.name;
        });

    const arcaneTraditionOptions =
      getSection12FeatureChoiceOptionRecords(
        arcaneTraditionForSubclassIsolation
      ).map((option) => {
        return option.label;
      });

    const wizardClassDetailsHtml =
      renderSection12SelectedClassDetails();

    record(
      "Wizard subclass choices reject Artificer snapshots and duplicate room templates",
      {
        resolvedClass:
          getSelectedClassTemplate()
            ?.id ||
          "",
        selectedSubclass:
          getSelectedSection12Subclass()
            ?.name ||
          "",
        wizardCatalog:
          wizardSubclassNames
            .includes("Evocation") &&
          !wizardSubclassNames
            .includes("Alchemist"),
        arcaneTradition:
          arcaneTraditionOptions
            .includes("Evocation") &&
          !arcaneTraditionOptions
            .includes("Alchemist"),
        renderedChoices:
          /Choose\s+Evocation/.test(
            wizardClassDetailsHtml
          ) &&
          !/Choose\s+Alchemist/.test(
            wizardClassDetailsHtml
          )
      },
      {
        resolvedClass: "wizard",
        selectedSubclass: "",
        wizardCatalog: true,
        arcaneTradition: true,
        renderedChoices: true
      }
    );

    const builtInMulticlassPlacementAudit =
      DEFAULT_CLASS_TEMPLATES
        .map((classTemplate, classIndex) => {
          const contaminantTemplate =
            DEFAULT_CLASS_TEMPLATES[
              (
                classIndex + 1
              ) %
              DEFAULT_CLASS_TEMPLATES.length
            ];
          const contaminantSubclass =
            contaminantTemplate
              ?.subclasses
              ?.find(Boolean) ||
            null;
          const classLevel =
            Math.max(
              1,
              Math.round(
                safeNumber(
                  classTemplate
                    .subclassLevel,
                  3
                )
              )
            );
          const anchorEntryId =
            `placement-anchor-${classIndex}`;
          const classEntryId =
            `placement-${classTemplate.id}`;
          const anchorEntry = {
            entryId:
              anchorEntryId,
            classId:
              contaminantTemplate.id,
            className:
              contaminantTemplate.name,
            source:
              contaminantTemplate.source,
            level: 1,
            hitDie:
              contaminantTemplate.hitDie,
            choices: {}
          };
          const classEntry = {
            entryId:
              classEntryId,
            classId:
              classTemplate.id,
            className:
              classTemplate.name,
            source:
              classTemplate.source,
            level:
              classLevel,
            hitDie:
              classTemplate.hitDie,
            templateSnapshot: {
              ...cloneData(
                contaminantTemplate
              ),
              id:
                classTemplate.id,
              name:
                classTemplate.name
            },
            subclassId:
              contaminantSubclass?.id ||
              "",
            subclassName:
              contaminantSubclass?.name ||
              "",
            choices: {
              subclassSnapshot:
                contaminantSubclass
                  ? cloneData(
                      contaminantSubclass
                    )
                  : null
            }
          };

          creatorState.draft =
            createEmptyCharacter();
          creatorState.draft
            .classProgression
            .classes = [
              anchorEntry,
              classEntry
            ];
          creatorState.draft
            .classProgression
            .totalLevel =
              classLevel + 1;
          creatorState.draft
            .classProgression
            .levelOrder = [
              anchorEntryId,
              ...Array.from(
                {
                  length:
                    classLevel
                },
                () => classEntryId
              )
            ];
          creatorState.roomClassCache = [
            {
              ...cloneData(
                contaminantTemplate
              ),
              id:
                classTemplate.id,
              name:
                classTemplate.name,
              source:
                "homebrew"
            }
          ];

          const resolvedTemplate =
            resolveClassTemplateForEntry(
              classEntry
            );
          const subclassCatalog =
            getSection12SubclassTemplates(
              classEntry
            );
          const selectedSubclass =
            getClassEntrySubclassTemplate(
              classEntry
            );
          const expectedSubclassNames =
            new Set(
              (
                classTemplate
                  .subclasses ||
                []
              ).map((subclass) => {
                return subclass.name;
              })
            );
          const foreignSubclassNames =
            new Set(
              (
                contaminantTemplate
                  .subclasses ||
                []
              )
                .map((subclass) => {
                  return subclass.name;
                })
                .filter((name) => {
                  return !expectedSubclassNames
                    .has(name);
                })
            );
          const classFeatures =
            collectSection12FeaturesForClassEntry(
              classEntry,
              1
            );
          const subclassChoiceFeatures =
            classFeatures.filter(
              (feature) => {
                return (
                  feature.optionSource ===
                  "subclasses"
                );
              }
            );
          const subclassChoiceNames =
            subclassChoiceFeatures
              .flatMap((feature) => {
                return getSection12FeatureChoiceOptionRecords(
                  feature
                ).map((option) => {
                  return option.label;
                });
              });
          const detailsHtml =
            renderSection12SelectedClassDetails();
          const groupMarker =
            `data-class-feature-group-entry-id="${classEntryId}"`;
          const groupStart =
            detailsHtml.indexOf(
              groupMarker
            );
          const nextGroupStart =
            groupStart >= 0
              ? detailsHtml.indexOf(
                  'class="hg-character-class-feature-group"',
                  groupStart +
                    groupMarker.length
                )
              : -1;
          const groupEnd =
            groupStart >= 0
              ? (
                  nextGroupStart >= 0
                    ? nextGroupStart
                    : detailsHtml.length
                )
              : -1;
          const groupHtml =
            groupStart >= 0 &&
            groupEnd >= 0
              ? detailsHtml.slice(
                  groupStart,
                  groupEnd
                )
              : "";

          return {
            classId:
              classTemplate.id,
            templateIdentity:
              resolvedTemplate?.id ===
              classTemplate.id,
            subclassesOnlyOwn:
              subclassCatalog.length ===
                expectedSubclassNames
                  .size &&
              subclassCatalog.every(
                (subclass) => {
                  return (
                    expectedSubclassNames
                      .has(
                        subclass.name
                      ) &&
                    makeSafeId(
                      subclass.classId,
                      ""
                    ) ===
                      classTemplate.id
                  );
                }
              ),
            noForeignSelected:
              !selectedSubclass,
            featureOwnership:
              classFeatures.length > 0 &&
              classFeatures.every(
                (feature) => {
                  return (
                    feature.classIndex ===
                      1 &&
                    feature.classEntryId ===
                      classEntryId &&
                    feature.classId ===
                      classTemplate.id &&
                    feature.className ===
                      classTemplate.name
                  );
                }
              ),
            choiceOwnership:
              subclassChoiceFeatures
                .length > 0 &&
              subclassChoiceNames
                .length ===
                expectedSubclassNames
                  .size &&
              subclassChoiceNames.every(
                (name) => {
                  return (
                    expectedSubclassNames
                      .has(name) &&
                    !foreignSubclassNames
                      .has(name)
                  );
                }
              ),
            visualGrouping:
              groupHtml.includes(
                `data-class-feature-group-id="${classTemplate.id}"`
              ) &&
              new RegExp(
                `${classTemplate.name}\\s+Level ${classLevel}\\s+Features`
              ).test(
                groupHtml
              ) &&
              classFeatures.every(
                (feature) => {
                  return groupHtml.includes(
                    `data-feature-card-id="${feature.id}"`
                  );
                }
              ) &&
              Array.from(
                foreignSubclassNames
              ).every((name) => {
                return !groupHtml.includes(
                  `data-option="${name}"`
                );
              }),
            profileOwnership:
              detailsHtml.includes(
                `data-class-profile-entry-id="${classEntryId}"`
              ) &&
              detailsHtml.includes(
                `data-class-profile-id="${classTemplate.id}"`
              ) &&
              new RegExp(
                `${classTemplate.name}\\s+Level ${classLevel}\\s+Proficiencies`
              ).test(
                detailsHtml
              )
          };
        });

    record(
      "Every built-in multiclass keeps profiles, features, and subclass choices inside its owning class section",
      {
        classCount:
          builtInMulticlassPlacementAudit
            .length,
        templateIdentity:
          builtInMulticlassPlacementAudit
            .every((entry) => {
              return entry.templateIdentity;
            }),
        subclassesOnlyOwn:
          builtInMulticlassPlacementAudit
            .every((entry) => {
              return entry.subclassesOnlyOwn;
            }),
        noForeignSelected:
          builtInMulticlassPlacementAudit
            .every((entry) => {
              return entry.noForeignSelected;
            }),
        featureOwnership:
          builtInMulticlassPlacementAudit
            .every((entry) => {
              return entry.featureOwnership;
            }),
        choiceOwnership:
          builtInMulticlassPlacementAudit
            .every((entry) => {
              return entry.choiceOwnership;
            }),
        visualGrouping:
          builtInMulticlassPlacementAudit
            .every((entry) => {
              return entry.visualGrouping;
            }),
        profileOwnership:
          builtInMulticlassPlacementAudit
            .every((entry) => {
              return entry.profileOwnership;
            })
      },
      {
        classCount: 13,
        templateIdentity: true,
        subclassesOnlyOwn: true,
        noForeignSelected: true,
        featureOwnership: true,
        choiceOwnership: true,
        visualGrouping: true,
        profileOwnership: true
      }
    );

    creatorState.roomClassCache = [];

    creatorState.draft =
      createEmptyCharacter();

    chooseSection12Class("rogue");

    const duplicateMulticlassResult =
      tryAddMulticlassClass(
        "rogue"
      );

    const missingMulticlassResult =
      tryAddMulticlassClass(
        "not-a-real-class"
      );

    const emptyMulticlassResult =
      tryAddMulticlassClass("");

    creatorState.draft =
      createEmptyCharacter();

    chooseSection12Class("fighter");

    setCharacterLevel(2);

    const prerequisiteMulticlassResult =
      tryAddMulticlassClass(
        "wizard"
      );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection12Class("fighter");

    setCharacterLevel(2);

    creatorState.draft.abilities.base = {
      ...creatorState.draft.abilities.base,
      str: 13,
      int: 13
    };

    recalculateAbilityTotals(
      creatorState.draft
    );

    const successfulMulticlassResult =
      tryAddMulticlassClass(
        "wizard"
      );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection12Class("fighter");

    creatorState.draft.abilities.base = {
      ...creatorState.draft.abilities.base,
      str: 13,
      int: 13
    };

    recalculateAbilityTotals(
      creatorState.draft
    );

    setMulticlassClassLevel(0, 20);

    const levelTwentyMulticlassResult =
      tryAddMulticlassClass(
        "wizard"
      );

    record(
      "Multiclass add returns exact visible result reasons",
      {
        empty:
          emptyMulticlassResult,
        missing:
          missingMulticlassResult,
        duplicate:
          duplicateMulticlassResult,
        prerequisites: {
          ok:
            prerequisiteMulticlassResult.ok,
          reason:
            prerequisiteMulticlassResult.reason,
          message:
            prerequisiteMulticlassResult.message,
          failures:
            prerequisiteMulticlassResult
              .failedPrerequisites
              .map((result) => {
                return result.classId;
              })
        },
        success: {
          ok:
            successfulMulticlassResult.ok,
          classId:
            successfulMulticlassResult.classId,
          totalLevel:
            successfulMulticlassResult.totalLevel,
          message:
            successfulMulticlassResult.message
        },
        levelTwenty: {
          ok:
            levelTwentyMulticlassResult.ok,
          reason:
            levelTwentyMulticlassResult.reason,
          totalLevel:
            levelTwentyMulticlassResult.totalLevel,
          message:
            levelTwentyMulticlassResult.message
        }
      },
      {
        empty: {
          ok: false,
          reason: "empty-class-id",
          classId: "",
          className: "",
          message:
            "Choose a class to add first.",
          failedPrerequisites: []
        },
        missing: {
          ok: false,
          reason: "class-not-found",
          classId:
            "not-a-real-class",
          className: "",
          message:
            "That class could not be found.",
          failedPrerequisites: []
        },
        duplicate: {
          ok: false,
          reason: "duplicate-class",
          classId: "rogue",
          className: "Rogue",
          message:
            "That class is already in this character's progression.",
          failedPrerequisites: []
        },
        prerequisites: {
          ok: true,
          reason: "added",
          message:
            "Wizard added at class level 1. Total character level stays 2. Set the required ability scores on the Abilities step: Fighter requires Strength 13 or Dexterity 13; Wizard requires Intelligence 13.",
          failures: [
            "fighter",
            "wizard"
          ]
        },
        success: {
          ok: true,
          classId: "wizard",
          totalLevel: 2,
          message:
            "Wizard added at class level 1. Total character level stays 2."
        },
        levelTwenty: {
          ok: true,
          reason: "added",
          totalLevel: 20,
          message:
            "Wizard added at class level 1. Total character level stays 20."
        }
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    creatorState.dirty = false;

    const busySaveStarted =
      beginCharacterBusyAction(
        "save-character"
      );

    const overlappingDeleteBlocked =
      blockCharacterBusyAction(
        "delete-character"
      );

    const busySaveHtml =
      renderSaveStep();

    const busyLibraryCard =
      createCharacterLibraryCard({
        id: "busy-test-character",
        identity: {
          name: "Busy Test"
        }
      });

    record(
      "Character busy state blocks overlapping operations and disables controls",
      {
        started:
          busySaveStarted,
        blocked:
          overlappingDeleteBlocked,
        busyAction:
          creatorState.busyAction,
        isSaving:
          creatorState.isSaving,
        saveButtonDisabled:
          /data-cc-action="save-character"[\s\S]*disabled/.test(
            busySaveHtml
          ),
        importFileDisabled:
          /id="ccSaveImportInput"[\s\S]*disabled/.test(
            busySaveHtml
          ),
        importTextDisabled:
          /data-cc-action="import-json-text"[\s\S]*disabled/.test(
            busySaveHtml
          ),
        libraryDeleteDisabled:
          /data-cc-action="delete-character"[\s\S]*disabled/.test(
            busyLibraryCard
          )
      },
      {
        started: true,
        blocked: true,
        busyAction: "save-character",
        isSaving: true,
        saveButtonDisabled: true,
        importFileDisabled: true,
        importTextDisabled: true,
        libraryDeleteDisabled: true
      }
    );

    endCharacterBusyAction(
      "save-character"
    );

    record(
      "Character busy state clears after operation",
      {
        busyAction:
          creatorState.busyAction,
        isSaving:
          creatorState.isSaving,
        busy:
          isCharacterCreatorBusy()
      },
      {
        busyAction: "",
        isSaving: false,
        busy: false
      }
    );

    const captureSection18ValidationError = (
      action
    ) => {
      try {
        action();
        return "";
      } catch (error) {
        return error?.message || String(error);
      }
    };

    const validFirestoreCharacterData = {
      sheetType: "character",
      roomCode: "TEST",
      identity: {
        name: "Validated Character"
      }
    };

    record(
      "Firestore mutation validation accepts current-room character records",
      {
        snapshotExists:
          section18SnapshotExists({
            exists() {
              return true;
            },
            data() {
              return validFirestoreCharacterData;
            }
          }),
        typedCharacter:
          captureSection18ValidationError(() => {
            validateSection18FirestoreRecord({
              characterId: "character-doc-id",
              data: validFirestoreCharacterData,
              roomCode: "TEST",
              actionLabel: "update"
            });
          }),
        legacyCharacter:
          captureSection18ValidationError(() => {
            validateSection18FirestoreRecord({
              characterId: "legacy-doc-id",
              data: {
                identity: {
                  name: "Legacy Character"
                },
                classProgression: {
                  totalLevel: 1,
                  classes: []
                }
              },
              roomCode: "TEST",
              actionLabel: "delete"
            });
          })
      },
      {
        snapshotExists: true,
        typedCharacter: "",
        legacyCharacter: ""
      }
    );

    record(
      "Firestore mutation validation blocks missing, wrong-room, and wrong-type records",
      {
        missingDocument:
          !section18SnapshotExists({
            exists() {
              return false;
            },
            data() {
              return validFirestoreCharacterData;
            }
          }),
        wrongRoom:
          captureSection18ValidationError(() => {
            validateSection18FirestoreRecord({
              characterId: "character-doc-id",
              data: {
                ...validFirestoreCharacterData,
                roomCode: "OTHER"
              },
              roomCode: "TEST",
              actionLabel: "update"
            });
          }).includes(
            "belongs to room OTHER"
          ),
        wrongType:
          captureSection18ValidationError(() => {
            validateSection18FirestoreRecord({
              characterId: "character-doc-id",
              data: {
                sheetType: "class",
                roomCode: "TEST",
                name: "Not a Character"
              },
              roomCode: "TEST",
              actionLabel: "delete"
            });
          }).includes(
            "not a character record"
          ),
        wrongDocumentId:
          captureSection18ValidationError(() => {
            validateSection18FirestoreRecord({
              characterId: "character-doc-id",
              data: {
                ...validFirestoreCharacterData,
                firestoreDocumentId:
                  "other-doc-id"
              },
              roomCode: "TEST",
              actionLabel: "update"
            });
          }).includes(
            "stored document ID"
          )
      },
      {
        missingDocument: true,
        wrongRoom: true,
        wrongType: true,
        wrongDocumentId: true
      }
    );

    record(
      "Firestore stale-tab conflict validation blocks older saves and deletes",
      {
        matchingRevision:
          captureSection18ValidationError(() => {
            validateSection18NoRemoteConflict({
              data: {
                builder: {
                  lastSavedAtMillis: 2000
                }
              },
              expectedRevisionMillis: 2000,
              actionLabel: "update"
            });
          }),
        staleUpdate:
          captureSection18ValidationError(() => {
            validateSection18NoRemoteConflict({
              data: {
                builder: {
                  lastSavedAtMillis: 3000
                }
              },
              expectedRevisionMillis: 2000,
              actionLabel: "update"
            });
          }).includes(
            "changed in another tab or window"
          ),
        unknownLocalRevision:
          captureSection18ValidationError(() => {
            validateSection18NoRemoteConflict({
              data: {
                updatedAtMillis: 3000
              },
              expectedRevisionMillis: 0,
              actionLabel: "delete"
            });
          }).includes(
            "does not know which saved version"
          )
      },
      {
        matchingRevision: "",
        staleUpdate: true,
        unknownLocalRevision: true
      }
    );

    const timestampOnlyFirestoreRecord =
      normalizeSection19CharacterRecord({
        docId: "timestamp-only-character",
        sheetType: "character",
        roomCode: "TEST",
        identity: {
          name: "Timestamp Only"
        },
        updatedAt: {
          toMillis() {
            return 4321;
          }
        }
      });

    record(
      "Firestore timestamp-only characters get a local conflict revision",
      timestampOnlyFirestoreRecord
        .builder
        .lastSavedAtMillis,
      4321
    );

    const sessionStorageMock =
      createSelfTestStorage();

    const persistentStorageMock =
      createSelfTestStorage();

    const draftStorageTargets =
      createSelfTestStorageTargets(
        sessionStorageMock,
        persistentStorageMock
      );

    creatorState.draft =
      createEmptyCharacter();

    creatorState.draft.identity.name =
      "Persistent Draft";

    creatorState.currentCharacterId =
      "stored-character-id";

    creatorState.currentStepId =
      "species";

    creatorState.dirty = true;

    persistDraftToSession(
      draftStorageTargets
    );

    const sessionStoredDraft =
      JSON.parse(
        sessionStorageMock.getItem(
          getDraftStorageKey()
        )
      );

    const persistentStoredDraft =
      JSON.parse(
        persistentStorageMock.getItem(
          getPersistentDraftStorageKey()
        )
      );

    record(
      "Dirty draft is stored in session and local browser backup",
      {
        sessionName:
          sessionStoredDraft
            .draft
            .identity
            .name,
        persistentName:
          persistentStoredDraft
            .draft
            .identity
            .name,
        sessionDirty:
          sessionStoredDraft.dirty,
        persistentDirty:
          persistentStoredDraft.dirty
      },
      {
        sessionName:
          "Persistent Draft",
        persistentName:
          "Persistent Draft",
        sessionDirty: true,
        persistentDirty: true
      }
    );

    creatorState.dirty = false;

    persistDraftToSession(
      draftStorageTargets
    );

    record(
      "Clean draft clears persistent unsaved backup",
      {
        session:
          Boolean(
            sessionStorageMock.getItem(
              getDraftStorageKey()
            )
          ),
        persistent:
          persistentStorageMock.getItem(
            getPersistentDraftStorageKey()
          )
      },
      {
        session: true,
        persistent: null
      }
    );

    sessionStorageMock.removeItem(
      getDraftStorageKey()
    );

    persistentStorageMock.setItem(
      getPersistentDraftStorageKey(),
      JSON.stringify({
        version: 2,
        persistedAtMillis: 100,
        draft: {
          ...createEmptyCharacter(),
          identity: {
            ...createEmptyCharacter()
              .identity,
            name:
              "Recovered Persistent Draft"
          }
        },
        currentCharacterId:
          "recovered-character-id",
        currentStepId:
          "background",
        dirty: true
      })
    );

    creatorState.draft =
      createEmptyCharacter();

    creatorState.currentCharacterId =
      null;

    creatorState.currentStepId =
      "basics";

    creatorState.dirty = false;

    const restoredPersistentDraft =
      restoreDraftFromSession(
        draftStorageTargets
      );

    record(
      "Draft restore can recover from local browser backup",
      {
        restored:
          restoredPersistentDraft,
        name:
          creatorState.draft
            .identity
            .name,
        currentCharacterId:
          creatorState.currentCharacterId,
        currentStepId:
          creatorState.currentStepId,
        dirty:
          creatorState.dirty
      },
      {
        restored: true,
        name:
          "Recovered Persistent Draft",
        currentCharacterId:
          "recovered-character-id",
        currentStepId: "background",
        dirty: true
      }
    );

    const quotaError =
      new Error(
        "Draft storage full"
      );

    quotaError.name =
      "QuotaExceededError";

    const quotaSessionStorage =
      createSelfTestStorage();

    const quotaPersistentStorage =
      createSelfTestStorage({
        throwOnSet: quotaError
      });

    creatorState.draft =
      createEmptyCharacter();

    creatorState.draft.identity.name =
      "Large Draft";

    creatorState.currentStepId =
      "equipment";

    creatorState.dirty = true;

    creatorState.statusMessage = "";

    withMutedConsoleWarn(() => {
      persistDraftToSession(
        createSelfTestStorageTargets(
          quotaSessionStorage,
          quotaPersistentStorage
        )
      );
    });

    record(
      "Storage quota failure warns while preserving session draft",
      {
        sessionSaved:
          Boolean(
            quotaSessionStorage.getItem(
              getDraftStorageKey()
            )
          ),
        persistentSaved:
          Boolean(
            quotaPersistentStorage.getItem(
              getPersistentDraftStorageKey()
            )
          ),
        warning:
          creatorState.statusMessage
            .includes(
              "Browser autosave could not keep this draft"
            )
      },
      {
        sessionSaved: true,
        persistentSaved: false,
        warning: true
      }
    );

    const debounceSessionStorage =
      createSelfTestStorage();

    const debouncePersistentStorage =
      createSelfTestStorage();

    const debounceTargets =
      createSelfTestStorageTargets(
        debounceSessionStorage,
        debouncePersistentStorage
      );

    creatorState.draft =
      createEmptyCharacter();

    creatorState.dirty = true;
    creatorState.currentStepId =
      "basics";

    creatorState.draft.identity.name =
      "First Debounced Draft";

    scheduleDraftPersistence(
      debounceTargets,
      {
        delayMillis: 999999
      }
    );

    creatorState.draft.identity.name =
      "Latest Debounced Draft";

    scheduleDraftPersistence(
      debounceTargets,
      {
        delayMillis: 999999
      }
    );

    const debounceWritesBeforeFlush = {
      session:
        debounceSessionStorage
          .metrics
          .setCount,
      persistent:
        debouncePersistentStorage
          .metrics
          .setCount
    };

    flushPendingDraftPersistence();

    const debounceStoredDraft =
      JSON.parse(
        debounceSessionStorage.getItem(
          getDraftStorageKey()
        )
      );

    record(
      "Draft autosave debounce coalesces frequent edits",
      {
        beforeFlush:
          debounceWritesBeforeFlush,
        afterFlush: {
          session:
            debounceSessionStorage
              .metrics
              .setCount,
          persistent:
            debouncePersistentStorage
              .metrics
              .setCount
        },
        storedName:
          debounceStoredDraft
            .draft
            .identity
            .name,
        pending:
          Boolean(
            draftPersistenceRuntime
              .timerId
          )
      },
      {
        beforeFlush: {
          session: 0,
          persistent: 0
        },
        afterFlush: {
          session: 1,
          persistent: 1
        },
        storedName:
          "Latest Debounced Draft",
        pending: false
      }
    );

    const immediateSessionStorage =
      createSelfTestStorage();

    const immediatePersistentStorage =
      createSelfTestStorage();

    const immediateTargets =
      createSelfTestStorageTargets(
        immediateSessionStorage,
        immediatePersistentStorage
      );

    creatorState.draft =
      createEmptyCharacter();

    creatorState.dirty = true;
    creatorState.currentStepId =
      "class";

    creatorState.draft.identity.name =
      "Pending Draft";

    scheduleDraftPersistence(
      immediateTargets,
      {
        delayMillis: 999999
      }
    );

    creatorState.draft.identity.name =
      "Immediate Draft";

    persistDraftToSession(
      immediateTargets
    );

    const immediateStoredDraft =
      JSON.parse(
        immediateSessionStorage.getItem(
          getDraftStorageKey()
        )
      );

    record(
      "Immediate draft persistence cancels pending autosave",
      {
        sessionWrites:
          immediateSessionStorage
            .metrics
            .setCount,
        persistentWrites:
          immediatePersistentStorage
            .metrics
            .setCount,
        storedName:
          immediateStoredDraft
            .draft
            .identity
            .name,
        pending:
          Boolean(
            draftPersistenceRuntime
              .timerId
          )
      },
      {
        sessionWrites: 1,
        persistentWrites: 1,
        storedName:
          "Immediate Draft",
        pending: false
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    creatorState.draft.identity.name =
      "Backup Warning Draft";

    creatorState.dirty = true;

    const dirtySaveHtml =
      renderSaveStep();

    creatorState.dirty = false;

    const cleanSaveHtml =
      renderSaveStep();

    record(
      "Dirty save screen warns browser autosave is temporary and offers JSON backup",
      {
        warning:
          dirtySaveHtml.includes(
            "Browser autosave is temporary"
          ),
        backupButton:
          dirtySaveHtml.includes(
            'data-cc-action="download-draft-backup"'
          ),
        cleanWarning:
          cleanSaveHtml.includes(
            "Browser autosave is temporary"
          )
      },
      {
        warning: true,
        backupButton: true,
        cleanWarning: false
      }
    );

    const draftFinalizationAudit =
      getSection17FinalizationValidation();

    record(
      "Save screen separates permissive draft saving from guarded finalization",
      {
        saveDraftButton:
          dirtySaveHtml.includes(
            'data-cc-action="save-character"'
          ) &&
          dirtySaveHtml.includes(
            "Save Draft"
          ),
        finalizeButton:
          dirtySaveHtml.includes(
            'data-cc-action="finalize-character"'
          ),
        linkedTokenButton:
          dirtySaveHtml.includes(
            'data-cc-action="create-linked-token"'
          ),
        characterHpAuthority:
          dirtySaveHtml.includes(
            "character sheet is the"
          ) &&
          dirtySaveHtml.includes(
            "authoritative record"
          ),
        blockingErrors:
          draftFinalizationAudit
            .blockingErrors.length > 0,
        canFinalize:
          draftFinalizationAudit
            .canFinalize
      },
      {
        saveDraftButton: true,
        finalizeButton: true,
        linkedTokenButton: true,
        characterHpAuthority: true,
        blockingErrors: true,
        canFinalize: false
      }
    );

    const finalizedBuilderRecord =
      normalizeCharacter({
        ...createEmptyCharacter(),
        builder: {
          status: "finalized",
          finalizedAtMillis: 1234
        }
      });

    const normalizedFinalizedStatus = {
      status:
        finalizedBuilderRecord
          .builder.status,
      finalizedAtMillis:
        finalizedBuilderRecord
          .builder.finalizedAtMillis
    };

    markCharacterBuilderAsDraft(
      finalizedBuilderRecord
    );

    record(
      "Finalization status persists through normalization and clears when edited",
      {
        normalized:
          normalizedFinalizedStatus,
        edited: {
          status:
            finalizedBuilderRecord
              .builder.status,
          finalizedAtMillis:
            finalizedBuilderRecord
              .builder.finalizedAtMillis
        }
      },
      {
        normalized: {
          status: "finalized",
          finalizedAtMillis: 1234
        },
        edited: {
          status: "draft",
          finalizedAtMillis: null
        }
      }
    );

    creatorState.dirty = true;

    let unloadPrevented = false;

    const unloadEvent = {
      returnValue: null,

      preventDefault() {
        unloadPrevented = true;
      }
    };

    handleDraftBeforeUnload(
      unloadEvent
    );

    record(
      "Unsaved dirty draft warns before page unload",
      {
        prevented:
          unloadPrevented,
        returnValue:
          unloadEvent.returnValue
      },
      {
        prevented: true,
        returnValue: ""
      }
    );

    creatorState.dirty = false;

    record(
      "Ability modifier 8",
      calculateAbilityModifier(8),
      -1
    );

    record(
      "Ability modifier 10",
      calculateAbilityModifier(10),
      0
    );

    record(
      "Ability modifier 15",
      calculateAbilityModifier(15),
      2
    );

    record(
      "Ability modifier 20",
      calculateAbilityModifier(20),
      5
    );

    record(
      "Proficiency bonus levels",
      [1, 5, 9, 13, 17].map(
        getGenericProficiencyBonus
      ),
      [2, 3, 4, 5, 6]
    );

    record(
      "Skill proficiency and expertise",
      [
        calculateRuleSkillModifier({
          abilityModifier: 2,
          proficiencyBonus: 3,
          proficient: true
        }),
        calculateRuleSkillModifier({
          abilityModifier: 2,
          proficiencyBonus: 3,
          proficient: true,
          expertise: true
        })
      ],
      [5, 8]
    );

    record(
      "Passive Perception",
      calculateRulePassiveScore(5),
      15
    );

    record(
      "Level 1 Fighter HP Con 14",
      calculateRuleFixedAverageHp({
        hitDie: "d10",
        level: 1,
        constitutionModifier: 2
      }),
      12
    );

    record(
      "Level 1 Wizard HP Con 14",
      calculateRuleFixedAverageHp({
        hitDie: "d6",
        level: 1,
        constitutionModifier: 2
      }),
      8
    );

    record(
      "Full caster level 5 slots",
      getSrd2014SpellSlots(
        "full-caster",
        5
      ),
      { 1: 4, 2: 3, 3: 2 }
    );

    record(
      "Half caster level 5 slots",
      getSrd2014SpellSlots(
        "half-caster",
        5
      ),
      { 1: 4, 2: 2 }
    );

    record(
      "Warlock pact magic level 5",
      getSrd2014PactMagic(5),
      { slots: 2, slotLevel: 3 }
    );

    record(
      "Multiclass slots keep pact magic separate",
      calculateSrd2014MulticlassSpellcasting([
        {
          level: 3,
          spellcastingProgression: "full-caster"
        },
        {
          level: 2,
          spellcastingProgression: "half-caster"
        },
        {
          level: 5,
          spellcastingProgression: "pact-magic"
        }
      ]),
      {
        casterLevel: 4,
        spellSlots: { 1: 4, 2: 3 },
        pactMagic: [{ slots: 2, slotLevel: 3 }]
      }
    );

    record(
      "Spell save and attack",
      {
        dc: calculateRuleSpellSaveDc({
          proficiencyBonus: 3,
          abilityModifier: 4
        }),
        attack: calculateRuleSpellAttackBonus({
          proficiencyBonus: 3,
          abilityModifier: 4
        })
      },
      { dc: 15, attack: 7 }
    );

    record(
      "Medium carrying capacity Strength 10",
      calculateRuleCarryingCapacity({
        strength: 10,
        size: "medium"
      }).carryingCapacity,
      150
    );

    record(
      "Large carrying capacity Strength 18",
      calculateRuleCarryingCapacity({
        strength: 18,
        size: "large"
      }),
      {
        carryingCapacity: 540,
        pushDragLift: 1080,
        sizeMultiplier: 2
      }
    );

    record(
      "Saving throw helper adds proficiency",
      calculateRuleSavingThrowModifier({
        abilityModifier: 3,
        proficiencyBonus: 2,
        proficient: true
      }),
      5
    );

    record(
      "Saving throw helper adds flat bonus",
      calculateRuleSavingThrowModifier({
        abilityModifier: -1,
        proficiencyBonus: 4,
        proficient: true,
        bonus: 2
      }),
      5
    );

    record(
      "Passive advantage and disadvantage cancel",
      calculateRulePassiveScore(
        4,
        {
          advantage: true,
          disadvantage: true
        }
      ),
      14
    );

    record(
      "Fixed HP respects level one override",
      calculateRuleFixedAverageHp({
        hitDie: "d8",
        level: 3,
        constitutionModifier: 2,
        levelOneValue: 9
      }),
      23
    );

    record(
      "Rolled HP uses supplied rolls",
      calculateRuleRolledHp({
        hitDie: "d10",
        level: 4,
        constitutionModifier: 2,
        rolls: [5, 6, 7]
      }),
      36
    );

    record(
      "Manual HP clamps to at least one",
      calculateRuleManualHp({
        manualOverride: 0
      }),
      1
    );

    record(
      "Normalize manual HP fallback",
      normalizeHpCalculation(
        { mode: "manual" },
        18
      ).manualOverride,
      18
    );

    const fighterTemplate =
      DEFAULT_CLASS_TEMPLATES.find(
        (template) => {
          return template.id === "fighter";
        }
      );

    const fighterCharacter =
      createEmptyCharacter();

    fighterCharacter.abilities.scores = {
      str: 16,
      dex: 14,
      con: 14,
      int: 10,
      wis: 12,
      cha: 8
    };

    fighterCharacter.identity.size =
      "medium";

    fighterCharacter.classProgression.totalLevel = 3;

    fighterCharacter.classProgression.classes = [
      {
        classId: "fighter",
        className: "Fighter",
        level: 3,
        templateSnapshot:
          fighterTemplate
      }
    ];

    fighterCharacter.proficiencies.savingThrows = [
      "Strength",
      "Constitution"
    ];

    fighterCharacter.proficiencies.weapons = [
      "Simple weapons",
      "Martial weapons"
    ];

    fighterCharacter.proficiencies.skills = {
      perception: {
        proficient: true,
        expertise: false,
        source: ["class"]
      },
      stealth: {
        proficient: true,
        expertise: true,
        source: ["manual"]
      }
    };

    fighterCharacter.proficiencies.passiveState = {
      perception: {
        advantage: true
      }
    };

    fighterCharacter.combat.proficiencyBonus = 2;
    fighterCharacter.combat.initiativeBonus = 1;
    fighterCharacter.combat.initiativeProficient = true;
    fighterCharacter.combat.hpCalculation = {
      mode: "fixed",
      levelOneValue: null,
      laterLevelValues: [],
      manualOverride: null,
      lastCalculatedConModifier: 2
    };

    record(
      "Character proficiency from level",
      getCharacterProficiencyBonus(
        fighterCharacter
      ),
      2
    );

    record(
      "Character saving throw totals",
      calculateCharacterSavingThrows(
        fighterCharacter
      )
        .filter((save) => {
          return [
            "str",
            "dex",
            "con"
          ].includes(save.id);
        })
        .map((save) => {
          return save.total;
        }),
      [5, 2, 4]
    );

    record(
      "Character skill modifier with expertise",
      calculateCharacterSkillModifier(
        fighterCharacter,
        SKILL_DEFINITIONS.find((skill) => {
          return skill.id === "stealth";
        })
      ),
      6
    );

    record(
      "Character passive perception with advantage",
      calculateCharacterPassiveScores(
        fighterCharacter
      ).perception.total,
      18
    );

    record(
      "Character initiative with proficiency",
      calculateCharacterInitiative(
        fighterCharacter
      ),
      {
        dexterityModifier: 2,
        proficiencyBonus: 2,
        bonus: 1,
        featBonus: 0,
        total: 5
      }
    );

    record(
      "Character fixed HP summary",
      calculateCharacterHp(
        fighterCharacter
      ).maximumHp,
      28
    );

    record(
      "Character hit dice summary",
      calculateCharacterHitDice(
        fighterCharacter
      ).map((entry) => {
        return {
          die: entry.die,
          count: entry.count
        };
      }),
      [{ die: "d10", count: 3 }]
    );

    record(
      "Unarmored armor class",
      calculateArmorClassOptions(
        fighterCharacter
      ).selected.total,
      12
    );

    const armoredCharacter =
      cloneData(fighterCharacter);

    armoredCharacter.equipment.items = [
      normalizeSection15Item({
        id: "studded",
        name: "Studded Leather",
        category: "armor",
        equipped: true,
        armorCategory: "light armor",
        baseArmorClass: 12,
        magicalArmorClassBonus: 1
      }),
      normalizeSection15Item({
        id: "shield",
        name: "Shield",
        category: "shield",
        equipped: true,
        isShield: true,
        magicalArmorClassBonus: 1
      })
    ];

    record(
      "Armor class with magic armor and shield",
      calculateArmorClassOptions(
        armoredCharacter
      ).selected.total,
      18
    );

    const barbarianCharacter =
      cloneData(fighterCharacter);

    barbarianCharacter.classProgression.classes = [
      {
        classId: "barbarian",
        className: "Barbarian",
        level: 3,
        templateSnapshot:
          DEFAULT_CLASS_TEMPLATES.find(
            (template) => {
              return template.id === "barbarian";
            }
          )
      }
    ];

    barbarianCharacter.abilities.scores.dex = 16;
    barbarianCharacter.abilities.scores.con = 16;

    record(
      "Barbarian unarmored defense",
      calculateArmorClassOptions(
        barbarianCharacter
      ).selected.total,
      16
    );

    const monkCharacter =
      cloneData(fighterCharacter);

    monkCharacter.classProgression.classes = [
      {
        classId: "monk",
        className: "Monk",
        level: 3,
        templateSnapshot:
          DEFAULT_CLASS_TEMPLATES.find(
            (template) => {
              return template.id === "monk";
            }
          )
      }
    ];

    monkCharacter.abilities.scores.dex = 16;
    monkCharacter.abilities.scores.wis = 14;

    record(
      "Monk unarmored defense",
      calculateArmorClassOptions(
        monkCharacter
      ).selected.total,
      15
    );

    const weaponCharacter =
      cloneData(fighterCharacter);

    weaponCharacter.equipment.items = [
      normalizeSection15Item({
        id: "shortsword",
        name: "Shortsword",
        category: "weapon",
        equipped: true,
        weaponType: "martial melee",
        finesse: true,
        damageDice: "1d6",
        magicalBonus: 1
      }),
      normalizeSection15Item({
        id: "bow",
        name: "Shortbow",
        category: "weapon",
        equipped: true,
        weaponType: "simple ranged",
        ranged: true,
        damageDice: "1d6"
      })
    ];

    weaponCharacter.abilities.scores.dex = 18;

    record(
      "Weapon attack uses finesse and magic",
      calculateWeaponAttack(
        weaponCharacter,
        weaponCharacter.equipment.items[0]
      ),
      {
        itemId: "shortsword",
        name: "Shortsword",
        abilityId: "dex",
        proficient: true,
        attacksPerAction: 1,
        attackBonus: 7,
        damageModifier: 5,
        damageDice: "1d6",
        versatileDamageDice: "",
        martialArtsEligible: false,
        martialArtsApplied: false,
        martialArtsRestriction: "",
        sneakAttackEligible: false,
        sneakAttackDice: "",
        sneakAttackRestriction: "",
        rageDamageBonus: 0,
        rageRestriction: "",
        breakdown:
          "DEX +4 + proficiency +2 + magic +1"
      }
    );

    record(
      "Equipped weapon attacks count",
      calculateEquippedWeaponAttacks(
        weaponCharacter
      ).length,
      2
    );

    const extraAttackCharacter = cloneData(
      weaponCharacter
    );
    extraAttackCharacter.classMechanics.attackAction = {
      attacks: 3,
      sourceIds: ["fighter:extra-attack"],
      sourceNames: ["Fighter: Extra Attack"]
    };

    record(
      "Weapon attacks use the best Extra Attack value",
      calculateWeaponAttack(
        extraAttackCharacter,
        extraAttackCharacter.equipment.items[0]
      ).attacksPerAction,
      3
    );

    const martialArtsCharacter = cloneData(
      weaponCharacter
    );
    martialArtsCharacter.equipment.items = [
      martialArtsCharacter.equipment.items[0]
    ];
    martialArtsCharacter.classMechanics.combatProfiles = [
      {
        type: "martialArts",
        classLevel: 11,
        dieByLevel: { 1: "d4", 5: "d6", 11: "d8" }
      }
    ];

    record(
      "Martial Arts applies only to an eligible unarmored weapon",
      {
        eligible:
          calculateWeaponAttack(
            martialArtsCharacter,
            martialArtsCharacter.equipment.items[0]
          ).martialArtsEligible,
        damageDice:
          calculateWeaponAttack(
            martialArtsCharacter,
            martialArtsCharacter.equipment.items[0]
          ).damageDice
      },
      { eligible: true, damageDice: "1d8" }
    );

    martialArtsCharacter.equipment.items.push(
      normalizeSection15Item({
        id: "leather",
        name: "Leather Armor",
        category: "armor",
        armorCategory: "light armor",
        baseArmorClass: 11,
        equipped: true
      })
    );

    record(
      "Armor disables Martial Arts weapon benefits",
      calculateWeaponAttack(
        martialArtsCharacter,
        martialArtsCharacter.equipment.items[0]
      ).martialArtsEligible,
      false
    );

    const sneakAttackCharacter = cloneData(
      weaponCharacter
    );
    sneakAttackCharacter.classMechanics.combatProfiles = [
      {
        type: "sneakAttack",
        classLevel: 3,
        diceByLevel: { 1: "1d6", 3: "2d6" }
      }
    ];

    record(
      "Sneak Attack enforces finesse or ranged weapon eligibility",
      {
        finesse:
          calculateWeaponAttack(
            sneakAttackCharacter,
            sneakAttackCharacter.equipment.items[0]
          ).sneakAttackDice,
        ineligible:
          calculateWeaponAttack(
            sneakAttackCharacter,
            normalizeSection15Item({
              id: "club",
              name: "Club",
              category: "weapon",
              weaponType: "simple melee",
              damageDice: "1d4"
            })
          ).sneakAttackEligible
      },
      { finesse: "2d6", ineligible: false }
    );

    const rageAttackCharacter = cloneData(
      weaponCharacter
    );
    rageAttackCharacter.abilities.scores.str = 18;
    rageAttackCharacter.combat.classFeatureStates = {
      rageActive: true
    };
    rageAttackCharacter.classMechanics.combatProfiles = [
      {
        type: "rage",
        classLevel: 1,
        damageBonusByLevel: { 1: 2 }
      }
    ];
    const rageWeapon = normalizeSection15Item({
      id: "longsword",
      name: "Longsword",
      category: "weapon",
      weaponType: "martial melee",
      damageDice: "1d8"
    });

    record(
      "Active Rage applies only to eligible Strength melee damage",
      calculateWeaponAttack(
        rageAttackCharacter,
        rageWeapon
      ).rageDamageBonus,
      2
    );

    const multiclassDefenseCharacter = cloneData(
      fighterCharacter
    );
    multiclassDefenseCharacter.equipment.items = [];
    multiclassDefenseCharacter.abilities.scores.dex = 16;
    multiclassDefenseCharacter.abilities.scores.con = 14;
    multiclassDefenseCharacter.abilities.scores.wis = 18;
    multiclassDefenseCharacter.classMechanics.armorClassFormulas = [
      {
        classEntryId: "barbarian-1",
        className: "Barbarian",
        featureId: "unarmored-defense-barbarian",
        featureName: "Barbarian Unarmored Defense",
        base: 10,
        abilities: ["dex", "con"],
        requires: { unarmored: true }
      },
      {
        classEntryId: "monk-1",
        className: "Monk",
        featureId: "unarmored-defense-monk",
        featureName: "Monk Unarmored Defense",
        base: 10,
        abilities: ["dex", "wis"],
        requires: { unarmored: true, noShield: true }
      }
    ];

    record(
      "Multiclass Unarmored Defense formulas do not combine",
      calculateArmorClassOptions(
        multiclassDefenseCharacter
      ).selected.total,
      17
    );

    const interactionTestDraft = cloneData(
      creatorState.draft
    );
    const makeInteractionClassEntry = (
      entryId,
      classId,
      level,
      subclassId = "",
      subclassName = ""
    ) => ({
      entryId,
      classId,
      className: DEFAULT_CLASSES[classId].name,
      source: "template",
      level,
      subclassId,
      subclassName,
      hitDie: DEFAULT_CLASSES[classId].hitDie,
      templateSnapshot: null,
      choices: {}
    });

    creatorState.draft = createEmptyCharacter();
    creatorState.draft.classProgression = {
      totalLevel: 9,
      classes: [
        makeInteractionClassEntry(
          "cleric-1",
          "cleric",
          6
        ),
        makeInteractionClassEntry(
          "paladin-1",
          "paladin",
          3,
          "devotion",
          "Devotion"
        )
      ],
      levelOrder: []
    };
    refreshSelectedClassFeatures();
    const sharedChannelDivinity =
      creatorState.draft.classMechanics.resources
        .filter((resource) => {
          return resource.canonicalId === "channel-divinity";
        });

    record(
      "Multiclass Channel Divinity uses one shared best-value pool",
      sharedChannelDivinity.map((resource) => ({
        id: resource.id,
        maximumUses: resource.maximumUses,
        shared: resource.shared,
        sourceCount: resource.sourceIds.length
      })),
      [{
        id: "shared:channel-divinity",
        maximumUses: 2,
        shared: true,
        sourceCount: 2
      }]
    );

    creatorState.draft = createEmptyCharacter();
    creatorState.draft.classProgression = {
      totalLevel: 16,
      classes: [
        makeInteractionClassEntry(
          "fighter-1",
          "fighter",
          11
        ),
        makeInteractionClassEntry(
          "paladin-1",
          "paladin",
          5
        )
      ],
      levelOrder: []
    };
    refreshSelectedClassFeatures();

    record(
      "Multiclass Extra Attack keeps the highest version",
      creatorState.draft.classMechanics.attackAction.attacks,
      3
    );

    creatorState.draft = createEmptyCharacter();
    creatorState.draft.classProgression = {
      totalLevel: 10,
      classes: [
        makeInteractionClassEntry(
          "phase6-fighter",
          "fighter",
          5
        ),
        makeInteractionClassEntry(
          "phase6-paladin",
          "paladin",
          5
        )
      ],
      levelOrder: []
    };
    refreshSelectedClassFeatures();

    record(
      "Phase 6: Extra Attack never stacks across classes",
      {
        attacks:
          creatorState.draft
            .classMechanics
            .attackAction.attacks,
        sourceCount:
          creatorState.draft
            .classMechanics
            .attackAction
            .sourceIds.length
      },
      {
        attacks: 2,
        sourceCount: 2
      }
    );

    creatorState.draft = createEmptyCharacter();
    creatorState.draft.classProgression = {
      totalLevel: 16,
      classes: [
        makeInteractionClassEntry(
          "phase6-fighter",
          "fighter",
          11
        ),
        makeInteractionClassEntry(
          "phase6-paladin",
          "paladin",
          5
        )
      ],
      levelOrder: []
    };
    refreshSelectedClassFeatures();

    record(
      "Phase 6: Fighter higher Extra Attack values are preserved",
      {
        attacks:
          creatorState.draft
            .classMechanics
            .attackAction.attacks,
        classEntryId:
          creatorState.draft
            .classMechanics
            .attackAction
            .classEntryId
      },
      {
        attacks: 3,
        classEntryId: "phase6-fighter"
      }
    );

    const phase6WarlockEntry =
      makeInteractionClassEntry(
        "phase6-warlock",
        "warlock",
        5
      );
    phase6WarlockEntry.choices = {
      classFeatures: {
        "phase6-warlock:eldritch-invocations":
          ["Thirsting Blade"]
      }
    };
    creatorState.draft =
      createEmptyCharacter();
    creatorState.draft.classProgression = {
      totalLevel: 10,
      classes: [
        makeInteractionClassEntry(
          "phase6-fighter",
          "fighter",
          5
        ),
        phase6WarlockEntry
      ],
      levelOrder: []
    };
    refreshSelectedClassFeatures();

    record(
      "Phase 6: Thirsting Blade does not add another attack to Extra Attack",
      {
        attacks:
          creatorState.draft
            .classMechanics
            .attackAction.attacks,
        sources:
          creatorState.draft
            .classMechanics
            .attackAction
            .sourceNames.some((name) => {
              return name.includes(
                "Thirsting Blade"
              );
            })
      },
      {
        attacks: 2,
        sources: true
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    creatorState.draft.abilities.scores.wis =
      16;
    creatorState.draft.abilities.scores.cha =
      14;
    creatorState.draft.classProgression = {
      totalLevel: 9,
      classes: [
        makeInteractionClassEntry(
          "phase6-cleric",
          "cleric",
          6,
          "life",
          "Life Domain"
        ),
        makeInteractionClassEntry(
          "phase6-paladin",
          "paladin",
          3,
          "devotion",
          "Oath of Devotion"
        )
      ],
      levelOrder: []
    };
    refreshSelectedClassFeatures();
    const phase6SharedChannel =
      creatorState.draft
        .classMechanics.resources
        .filter((resource) => {
          return (
            resource.canonicalId ===
            "channel-divinity"
          );
        });

    record(
      "Phase 6: Channel Divinity uses one shared pool",
      phase6SharedChannel.map((resource) => {
        return {
          id: resource.id,
          shared: resource.shared,
          maximumUses:
            resource.maximumUses
        };
      }),
      [
        {
          id: "shared:channel-divinity",
          shared: true,
          maximumUses: 2
        }
      ]
    );

    record(
      "Phase 6: Channel Divinity grants every eligible class and subclass option",
      phase6SharedChannel[0]
        .spendOptions
        .map((option) => {
          return {
            name: option.name,
            classEntryId:
              option.classEntryId
          };
        })
        .sort((a, b) => {
          return a.name.localeCompare(
            b.name
          );
        }),
      [
        {
          name: "Preserve Life",
          classEntryId:
            "phase6-cleric"
        },
        {
          name: "Sacred Weapon",
          classEntryId:
            "phase6-paladin"
        },
        {
          name: "Turn the Unholy",
          classEntryId:
            "phase6-paladin"
        },
        {
          name: "Turn Undead",
          classEntryId:
            "phase6-cleric"
        }
      ]
    );

    creatorState.draft =
      createEmptyCharacter();
    creatorState.draft.classProgression = {
      totalLevel: 8,
      classes: [
        makeInteractionClassEntry(
          "phase6-cleric",
          "cleric",
          5,
          "life",
          "Life Domain"
        ),
        makeInteractionClassEntry(
          "phase6-paladin",
          "paladin",
          3,
          "devotion",
          "Oath of Devotion"
        )
      ],
      levelOrder: []
    };
    refreshSelectedClassFeatures();

    record(
      "Phase 6: Channel Divinity uses increase only at explicit class levels",
      creatorState.draft
        .classMechanics.resources
        .find((resource) => {
          return (
            resource.canonicalId ===
            "channel-divinity"
          );
        })?.maximumUses,
      1
    );

    creatorState.draft =
      createEmptyCharacter();
    creatorState.draft.abilities.scores.dex =
      16;
    creatorState.draft.classProgression = {
      totalLevel: 13,
      classes: [
        makeInteractionClassEntry(
          "phase6-rogue",
          "rogue",
          3
        ),
        makeInteractionClassEntry(
          "phase6-fighter",
          "fighter",
          10
        )
      ],
      levelOrder: []
    };
    refreshSelectedClassFeatures();
    const phase6SneakProfile =
      creatorState.draft
        .classMechanics.combatProfiles
        .find((profile) => {
          return profile.type ===
            "sneakAttack";
        });

    record(
      "Phase 6: Sneak Attack uses Rogue class level",
      {
        classLevel:
          phase6SneakProfile.classLevel,
        dice:
          getProgressionValueByLevel(
            phase6SneakProfile
              .diceByLevel,
            phase6SneakProfile
              .classLevel,
            ""
          )
      },
      {
        classLevel: 3,
        dice: "2d6"
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    creatorState.draft.classProgression = {
      totalLevel: 13,
      classes: [
        makeInteractionClassEntry(
          "phase6-barbarian",
          "barbarian",
          3
        ),
        makeInteractionClassEntry(
          "phase6-fighter",
          "fighter",
          10
        )
      ],
      levelOrder: []
    };
    refreshSelectedClassFeatures();
    const phase6RageProfile =
      creatorState.draft
        .classMechanics.combatProfiles
        .find((profile) => {
          return profile.type ===
            "rage";
        });
    const phase6RageResource =
      creatorState.draft
        .classMechanics.resources
        .find((resource) => {
          return resource.canonicalId ===
            "rage";
        });

    record(
      "Phase 6: Rage damage and uses use Barbarian class level",
      {
        classLevel:
          phase6RageProfile.classLevel,
        damage:
          getProgressionValueByLevel(
            phase6RageProfile
              .damageBonusByLevel,
            phase6RageProfile
              .classLevel,
            0
          ),
        uses:
          phase6RageResource
            .maximumUses
      },
      {
        classLevel: 3,
        damage: 2,
        uses: 3
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    creatorState.draft.classProgression = {
      totalLevel: 15,
      classes: [
        makeInteractionClassEntry(
          "phase6-monk",
          "monk",
          5
        ),
        makeInteractionClassEntry(
          "phase6-fighter",
          "fighter",
          10
        )
      ],
      levelOrder: []
    };
    refreshSelectedClassFeatures();
    const phase6MartialArtsProfile =
      creatorState.draft
        .classMechanics.combatProfiles
        .find((profile) => {
          return profile.type ===
            "martialArts";
        });
    const phase6KiResource =
      creatorState.draft
        .classMechanics.resources
        .find((resource) => {
          return resource.canonicalId ===
            "ki";
        });

    record(
      "Phase 6: Martial Arts uses Monk class level",
      {
        classLevel:
          phase6MartialArtsProfile
            .classLevel,
        die:
          getProgressionValueByLevel(
            phase6MartialArtsProfile
              .dieByLevel,
            phase6MartialArtsProfile
              .classLevel,
            ""
          )
      },
      {
        classLevel: 5,
        die: "d6"
      }
    );

    record(
      "Phase 6: Ki uses Monk class level",
      {
        classEntryId:
          phase6KiResource
            .classEntryId,
        maximumUses:
          phase6KiResource
            .maximumUses
      },
      {
        classEntryId: "phase6-monk",
        maximumUses: 5
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    creatorState.draft.classProgression = {
      totalLevel: 14,
      classes: [
        makeInteractionClassEntry(
          "phase6-druid",
          "druid",
          4
        ),
        makeInteractionClassEntry(
          "phase6-fighter",
          "fighter",
          10
        )
      ],
      levelOrder: []
    };
    refreshSelectedClassFeatures();
    const phase6WildShapeProfile =
      creatorState.draft
        .classMechanics.combatProfiles
        .find((profile) => {
          return profile.type ===
            "wildShape";
        });

    record(
      "Phase 6: Wild Shape uses Druid class level",
      {
        classLevel:
          phase6WildShapeProfile
            .classLevel,
        maximumCr:
          getProgressionValueByLevel(
            phase6WildShapeProfile
              .maxCrByLevel,
            phase6WildShapeProfile
              .classLevel,
            ""
          ),
        durationHours:
          Math.floor(
            phase6WildShapeProfile
              .classLevel / 2
          )
      },
      {
        classLevel: 4,
        maximumCr: "1/2",
        durationHours: 2
      }
    );

    const phase6SmiteCharacter =
      createEmptyCharacter();
    phase6SmiteCharacter
      .classMechanics.combatProfiles = [
        {
          type: "divineSmite",
          classEntryId:
            "phase6-paladin",
          classLevel: 2
        }
      ];
    phase6SmiteCharacter.magic.slots = {
      0: 9,
      1: 4,
      2: 0,
      3: -1
    };
    phase6SmiteCharacter
      .magic.pactMagicSources = [
        {
          classEntryId:
            "phase6-warlock",
          classId: "warlock",
          className: "Warlock",
          slots: 2,
          slotLevel: 2
        },
        {
          classEntryId:
            "phase6-empty-pact",
          classId: "custom",
          className: "Empty Pact",
          slots: 0,
          slotLevel: 3
        }
      ];

    record(
      "Phase 6: Divine Smite uses only valid spell slots",
      getSection12DivineSmiteSlotOptions(
        phase6SmiteCharacter
      ).map((slot) => {
        return {
          kind: slot.kind,
          sourceId: slot.sourceId,
          level: slot.level,
          maximum: slot.maximum
        };
      }),
      [
        {
          kind: "normal",
          sourceId: "",
          level: 1,
          maximum: 4
        },
        {
          kind: "pact",
          sourceId:
            "phase6-warlock",
          level: 2,
          maximum: 2
        }
      ]
    );

    creatorState.draft =
      createEmptyCharacter();
    creatorState.draft.classProgression = {
      totalLevel: 12,
      classes: [
        makeInteractionClassEntry(
          "phase6-paladin",
          "paladin",
          2
        ),
        makeInteractionClassEntry(
          "phase6-fighter",
          "fighter",
          10
        )
      ],
      levelOrder: []
    };
    refreshSelectedClassFeatures();

    record(
      "Phase 6: class resources never scale from total character level",
      creatorState.draft
        .classMechanics.resources
        .find((resource) => {
          return (
            resource.canonicalId ===
            "lay-on-hands"
          );
        })?.maximumUses,
      10
    );

    creatorState.draft =
      createEmptyCharacter();
    creatorState.draft.abilities.scores.wis =
      16;
    creatorState.draft.abilities.scores.cha =
      14;
    creatorState.draft.abilities.scores.int =
      20;
    creatorState.draft.abilities.base.wis =
      16;
    creatorState.draft.abilities.base.cha =
      14;
    creatorState.draft.abilities.base.int =
      20;
    creatorState.draft.classProgression = {
      totalLevel: 6,
      classes: [
        makeInteractionClassEntry(
          "phase6-monk",
          "monk",
          3
        ),
        makeInteractionClassEntry(
          "phase6-paladin",
          "paladin",
          3
        )
      ],
      levelOrder: []
    };
    refreshSelectedClassFeatures();

    record(
      "Phase 6: class save DCs use the correct class ability",
      creatorState.draft
        .classMechanics.classSaveDcs
        .map((entry) => {
          return {
            classEntryId:
              entry.classEntryId,
            abilityId:
              entry.abilityId,
            saveDc:
              entry.saveDc
          };
        }),
      [
        {
          classEntryId:
            "phase6-monk",
          abilityId: "wis",
          saveDc: 14
        },
        {
          classEntryId:
            "phase6-paladin",
          abilityId: "cha",
          saveDc: 13
        }
      ]
    );

    creatorState.draft =
      createEmptyCharacter();
    creatorState.draft.classProgression = {
      totalLevel: 9,
      classes: [
        makeInteractionClassEntry(
          "phase6-rogue",
          "rogue",
          3
        ),
        makeInteractionClassEntry(
          "phase6-barbarian",
          "barbarian",
          3
        ),
        makeInteractionClassEntry(
          "phase6-monk",
          "monk",
          3
        )
      ],
      levelOrder: []
    };
    refreshSelectedClassFeatures();

    record(
      "Phase 6: class features remain attached to the correct class entry",
      {
        profiles:
          Object.fromEntries(
            creatorState.draft
              .classMechanics
              .combatProfiles
              .filter((profile) => {
                return [
                  "sneakAttack",
                  "rage",
                  "martialArts"
                ].includes(profile.type);
              })
              .map((profile) => {
                return [
                  profile.type,
                  profile.classEntryId
                ];
              })
          ),
        resources:
          Object.fromEntries(
            creatorState.draft
              .classMechanics
              .resources
              .filter((resource) => {
                return [
                  "rage",
                  "ki"
                ].includes(
                  resource.canonicalId
                );
              })
              .map((resource) => {
                return [
                  resource.canonicalId,
                  resource.classEntryId
                ];
              })
          )
      },
      {
        profiles: {
          sneakAttack:
            "phase6-rogue",
          rage:
            "phase6-barbarian",
          martialArts:
            "phase6-monk"
        },
        resources: {
          rage:
            "phase6-barbarian",
          ki:
            "phase6-monk"
        }
      }
    );

    const phase7Subclasses =
      Object.values(DEFAULT_CLASSES)
        .flatMap((classData) => {
          return (
            classData.subclasses || []
          );
        });
    const phase7Features =
      phase7Subclasses.flatMap(
        (subclass) => {
          return Object.values(
            subclass.featuresByLevel ||
              {}
          ).flat();
        }
      );
    const phase7SpellReferences =
      phase7Subclasses.flatMap(
        (subclass) => {
          return Object.values(
            subclass.expandedSpells ||
              {}
          ).flat();
        }
      );
    const findPhase7Subclass = (
      classId,
      subclassId
    ) => {
      return (
        DEFAULT_CLASSES[classId]
          ?.subclasses || []
      ).find((subclass) => {
        return (
          subclass.id ===
          subclassId
        );
      });
    };

    record(
      "Phase 7: all 118 subclass summaries replace placeholder text",
      {
        total:
          phase7Subclasses.length,
        placeholders:
          phase7Subclasses.filter(
            (subclass) => {
              return /description not filled|add this subclass|placeholder|coming soon|todo|tbd/i
                .test(
                  subclass.summary || ""
                );
            }
          ).length
      },
      {
        total: 118,
        placeholders: 0
      }
    );

    record(
      "Phase 7: all 118 subclasses have completed descriptions",
      phase7Subclasses.filter(
        (subclass) => {
          return (
            !String(
              subclass.description ||
                ""
            ).trim() ||
            /description not filled|add this subclass|placeholder|coming soon|todo|tbd/i
              .test(
                subclass.description ||
                  ""
              )
          );
        }
      ).length,
      0
    );

    record(
      "Phase 7: every required subclass feature level is populated",
      phase7Subclasses.filter(
        (subclass) => {
          return (
            subclass.featureLevels ||
            []
          ).some((level) => {
            return (
              !Array.isArray(
                subclass
                  .featuresByLevel?.[
                    level
                  ]
              ) ||
              subclass
                .featuresByLevel[
                  level
                ].length === 0
            );
          });
        }
      ).length,
      0
    );

    record(
      "Phase 7: subclass choices are structured and selectable",
      {
        total:
          phase7Subclasses.reduce(
            (total, subclass) => {
              return (
                total +
                (
                  subclass.choices ||
                  []
                ).length
              );
            },
            0
          ),
        structured:
          phase7Subclasses.every(
            (subclass) => {
              return (
                subclass.choices ||
                []
              ).every((choice) => {
                return (
                  choice &&
                  typeof choice ===
                    "object" &&
                  Boolean(choice.id) &&
                  Boolean(
                    Array.isArray(
                      choice.options
                    ) ||
                    choice.optionsSource
                  )
                );
              });
            }
          )
      },
      {
        total: 25,
        structured: true
      }
    );

    record(
      "Phase 7: subclass resource pools are complete and trackable",
      {
        total:
          phase7Subclasses.reduce(
            (total, subclass) => {
              return (
                total +
                (
                  subclass.resources ||
                  []
                ).length
              );
            },
            0
          ),
        valid:
          phase7Subclasses.every(
            (subclass) => {
              return (
                subclass.resources ||
                []
              ).every((resource) => {
                return Boolean(
                  resource?.id &&
                  resource?.name
                );
              });
            }
          )
      },
      {
        total: 57,
        valid: true
      }
    );

    record(
      "Phase 7: subclass actions bonus actions and reactions are labeled",
      Object.fromEntries(
        [
          "action",
          "attack",
          "bonusAction",
          "passive",
          "reaction"
        ].map((actionEconomy) => {
          return [
            actionEconomy,
            phase7Features.filter(
              (feature) => {
                return (
                  feature
                    .actionEconomy ===
                  actionEconomy
                );
              }
            ).length
          ];
        })
      ),
      {
        action: 50,
        attack: 33,
        bonusAction: 24,
        passive: 485,
        reaction: 31
      }
    );

    record(
      "Phase 7: every subclass feature carries a passive or active effect",
      {
        total:
          phase7Features.length,
        withEffects:
          phase7Features.filter(
            (feature) => {
              return (
                Array.isArray(
                  feature.effects
                ) &&
                feature.effects.length > 0
              );
            }
          ).length
      },
      {
        total: 623,
        withEffects: 623
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    creatorState.draft
      .classProgression = {
        totalLevel: 3,
        classes: [
          makeInteractionClassEntry(
            "phase7-cleric",
            "cleric",
            3,
            "arcana",
            "Arcana"
          )
        ],
        levelOrder: []
      };
    const phase7ArcanaSpellSource =
      getSpellcastingClassOptions(
        creatorState.draft
      ).find((entry) => {
        return (
          entry.classEntryId ===
          "phase7-cleric"
        );
      });
    const phase7InlineSpellGrant =
      getSection16ExpandedSpellGrants(
        phase7ArcanaSpellSource
      ).find((grant) => {
        return (
          grant.spellId ===
          "magic-aura"
        );
      });

    record(
      "Phase 7: subclass spell grants resolve through catalog or inline references",
      {
        total:
          phase7SpellReferences
            .length,
        complete:
          phase7SpellReferences.every(
            (reference) => {
              return Boolean(
                reference?.id &&
                reference?.name &&
                Number.isInteger(
                  reference.level
                ) &&
                reference
                  .inlineFallback ===
                  true
              );
            }
          ),
        inlineRuntime: {
          id:
            phase7InlineSpellGrant
              ?.spell?.id,
          name:
            phase7InlineSpellGrant
              ?.spell?.name,
          level:
            phase7InlineSpellGrant
              ?.spell?.level,
          inlineSubclassSpell:
            phase7InlineSpellGrant
              ?.spell
              ?.inlineSubclassSpell ===
            true
        }
      },
      {
        total: 421,
        complete: true,
        inlineRuntime: {
          id: "magic-aura",
          name: "Magic Aura",
          level: 2,
          inlineSubclassSpell: true
        }
      }
    );

    record(
      "Phase 7: subclass expanded spell lists are attached to eligible subclasses",
      phase7Subclasses.filter(
        (subclass) => {
          return (
            Object.keys(
              subclass
                .expandedSpells ||
                {}
            ).length > 0
          );
        }
      ).length,
      45
    );

    record(
      "Phase 7: subclass save DC effects retain owning class context",
      {
        saveEffects:
          phase7Features.filter(
            (feature) => {
              return (
                feature.effects ||
                []
              ).some((effect) => {
                return (
                  effect
                    .classSaveDc ===
                  true
                );
              });
            }
          ).length,
        owned:
          phase7Features.every(
            (feature) => {
              return (
                feature.scaling
                  ?.classId &&
                feature.scaling
                  ?.basis ===
                  "classLevel"
              );
            }
          )
      },
      {
        saveEffects: 34,
        owned: true
      }
    );

    record(
      "Phase 7: subclass feature scaling uses individual class level",
      phase7Features.filter(
        (feature) => {
          return (
            feature.scaling
              ?.basis !==
              "classLevel" ||
            !feature.scaling
              ?.classId
          );
        }
      ).length,
      0
    );

    record(
      "Phase 7: every subclass feature has a completed description",
      {
        total:
          phase7Features.length,
        described:
          phase7Features.filter(
            (feature) => {
              return Boolean(
                String(
                  feature.description ||
                    ""
                ).trim()
              );
            }
          ).length
      },
      {
        total: 623,
        described: 623
      }
    );

    record(
      "Phase 7: every subclass feature has a rules source label",
      {
        total:
          phase7Features.length,
        labeled:
          phase7Features.filter(
            (feature) => {
              return Boolean(
                feature.sourceLabel &&
                feature.rulesEdition ===
                  "2014"
              );
            }
          ).length
      },
      {
        total: 623,
        labeled: 623
      }
    );

    const phase7EldritchKnight =
      findPhase7Subclass(
        "fighter",
        "eldritch-knight"
      );

    record(
      "Phase 7: Eldritch Knight uses third-caster progression",
      {
        progression:
          phase7EldritchKnight
            .spellcastingProgression,
        ability:
          phase7EldritchKnight
            .spellcastingAbility,
        spellList:
          phase7EldritchKnight
            .spellListClassId
      },
      {
        progression:
          "third-caster",
        ability: "int",
        spellList: "wizard"
      }
    );

    record(
      "Phase 7: Eldritch Knight enforces school restrictions",
      {
        allowedSchools:
          phase7EldritchKnight
            .spellSchoolRestrictions
            ?.default,
        unrestrictedKnownSpellLevels:
          phase7EldritchKnight
            .spellSchoolRestrictions
            ?.unrestrictedSpellLevelsAtClassLevels
      },
      {
        allowedSchools: [
          "abjuration",
          "evocation"
        ],
        unrestrictedKnownSpellLevels:
          [3, 8, 14, 20]
      }
    );

    const phase7ArcaneTrickster =
      findPhase7Subclass(
        "rogue",
        "arcane-trickster"
      );

    record(
      "Phase 7: Arcane Trickster uses third-caster progression",
      {
        progression:
          phase7ArcaneTrickster
            .spellcastingProgression,
        ability:
          phase7ArcaneTrickster
            .spellcastingAbility,
        spellList:
          phase7ArcaneTrickster
            .spellListClassId
      },
      {
        progression:
          "third-caster",
        ability: "int",
        spellList: "wizard"
      }
    );

    record(
      "Phase 7: Arcane Trickster enforces school restrictions",
      {
        allowedSchools:
          phase7ArcaneTrickster
            .spellSchoolRestrictions
            ?.default,
        unrestrictedKnownSpellLevels:
          phase7ArcaneTrickster
            .spellSchoolRestrictions
            ?.unrestrictedSpellLevelsAtClassLevels,
        requiredCantripIds:
          phase7ArcaneTrickster
            .spellSchoolRestrictions
            ?.requiredCantripIds
      },
      {
        allowedSchools: [
          "enchantment",
          "illusion"
        ],
        unrestrictedKnownSpellLevels:
          [3, 8, 14, 20],
        requiredCantripIds: [
          "mage-hand"
        ]
      }
    );

    const phase7ClericDomains =
      DEFAULT_CLASSES.cleric
        .subclasses;

    record(
      "Phase 7: every Cleric domain grants spells and Channel Divinity",
      {
        domains:
          phase7ClericDomains.length,
        spellLists:
          phase7ClericDomains.filter(
            (subclass) => {
              return (
                Object.keys(
                  subclass
                    .expandedSpells ||
                    {}
                ).length > 0
              );
            }
          ).length,
        channelOptions:
          phase7ClericDomains.filter(
            (subclass) => {
              return Object.values(
                subclass
                  .featuresByLevel ||
                  {}
              )
                .flat()
                .some((feature) => {
                  return /^Channel Divinity:/i
                    .test(
                      feature.name
                    );
                });
            }
          ).length
      },
      {
        domains: 14,
        spellLists: 14,
        channelOptions: 14
      }
    );

    const phase7PaladinOaths =
      DEFAULT_CLASSES.paladin
        .subclasses;

    record(
      "Phase 7: every Paladin oath grants spells and Channel Divinity",
      {
        oaths:
          phase7PaladinOaths.length,
        spellLists:
          phase7PaladinOaths.filter(
            (subclass) => {
              return (
                Object.keys(
                  subclass
                    .expandedSpells ||
                    {}
                ).length > 0
              );
            }
          ).length,
        channelOptions:
          phase7PaladinOaths.filter(
            (subclass) => {
              return Object.values(
                subclass
                  .featuresByLevel ||
                  {}
              )
                .flat()
                .some((feature) => {
                  return /^Channel Divinity:/i
                    .test(
                      feature.name
                    );
                });
            }
          ).length
      },
      {
        oaths: 9,
        spellLists: 9,
        channelOptions: 9
      }
    );

    record(
      "Phase 7: all Artificer specialists have spells features and resources",
      DEFAULT_CLASSES.artificer
        .subclasses.map(
          (subclass) => {
            return {
              id: subclass.id,
              spells:
                Object.keys(
                  subclass
                    .expandedSpells ||
                    {}
                ).length > 0,
              complete:
                (
                  subclass
                    .featureLevels ||
                  []
                ).every((level) => {
                  return Boolean(
                    subclass
                      .featuresByLevel?.[
                        level
                      ]?.length
                  );
                }),
              resources:
                (
                  subclass.resources ||
                  []
                ).length > 0
            };
          }
        ),
      [
        {
          id: "alchemist",
          spells: true,
          complete: true,
          resources: true
        },
        {
          id: "armorer",
          spells: true,
          complete: true,
          resources: true
        },
        {
          id: "artillerist",
          spells: true,
          complete: true,
          resources: true
        },
        {
          id: "battle-smith",
          spells: true,
          complete: true,
          resources: true
        }
      ]
    );

    record(
      "Phase 7: every Warlock patron has expanded spells and features",
      {
        patrons:
          DEFAULT_CLASSES.warlock
            .subclasses.length,
        complete:
          DEFAULT_CLASSES.warlock
            .subclasses.filter(
              (subclass) => {
                return (
                  Object.keys(
                    subclass
                      .expandedSpells ||
                      {}
                  ).length > 0 &&
                  (
                    subclass
                      .featureLevels ||
                    []
                  ).every((level) => {
                    return Boolean(
                      subclass
                        .featuresByLevel?.[
                          level
                        ]?.length
                    );
                  })
                );
              }
            ).length
      },
      {
        patrons: 9,
        complete: 9
      }
    );

    record(
      "Phase 7: every Sorcerous Origin has features at all required levels",
      {
        origins:
          DEFAULT_CLASSES.sorcerer
            .subclasses.length,
        complete:
          DEFAULT_CLASSES.sorcerer
            .subclasses.filter(
              (subclass) => {
                return (
                  subclass
                    .featureLevels ||
                  []
                ).every((level) => {
                  return Boolean(
                    subclass
                      .featuresByLevel?.[
                        level
                      ]?.length
                  );
                });
              }
            ).length
      },
      {
        origins: 8,
        complete: 8
      }
    );

    record(
      "Phase 7: subclass Extra Attack variants use the shared nonstacking rule",
      phase7Subclasses
        .flatMap((subclass) => {
          return Object.values(
            subclass
              .featuresByLevel || {}
          )
            .flat()
            .filter((feature) => {
              return (
                feature.effects || []
              ).some((effect) => {
                return (
                  effect.type ===
                    "extraAttack" &&
                  effect.attacks === 2 &&
                  effect.stacks ===
                    false
                );
              });
            })
            .map(() => {
              return `${subclass.classId}:${subclass.id}`;
            });
        })
        .sort(),
      [
        "artificer:armorer",
        "artificer:battle-smith",
        "bard:swords",
        "bard:valor",
        "wizard:bladesinging"
      ]
    );

    const phase7PlaceholderFixture =
      cloneData(
        DEFAULT_SUBCLASSES
      );
    phase7PlaceholderFixture[0]
      .summary =
      "Description not filled in yet.";
    const phase7PlaceholderValidation =
      validateDefaultSubclassCollection(
        phase7PlaceholderFixture
      );

    record(
      "Phase 7: validation rejects subclass placeholder text",
      {
        valid:
          phase7PlaceholderValidation
            .valid,
        caught:
          phase7PlaceholderValidation
            .errors.some((error) => {
              return error.includes(
                "placeholder text"
              );
            })
      },
      {
        valid: false,
        caught: true
      }
    );

    const phase7EmptyLevelFixture =
      cloneData(
        DEFAULT_SUBCLASSES
      );
    const phase7EmptyLevel =
      phase7EmptyLevelFixture[0]
        .featureLevels[0];
    phase7EmptyLevelFixture[0]
      .featuresByLevel[
        phase7EmptyLevel
      ] = [];
    const phase7EmptyLevelValidation =
      validateDefaultSubclassCollection(
        phase7EmptyLevelFixture
      );

    record(
      "Phase 7: validation rejects empty required subclass feature levels",
      {
        valid:
          phase7EmptyLevelValidation
            .valid,
        caught:
          phase7EmptyLevelValidation
            .errors.some((error) => {
              return error.includes(
                "must not be empty"
              );
            })
      },
      {
        valid: false,
        caught: true
      }
    );

    record(
      "Phase 7: SRD subclasses are prioritized before non-SRD entries",
      Object.fromEntries(
        Object.values(
          DEFAULT_CLASSES
        )
          .filter((classData) => {
            return (
              classData.id !==
              "artificer"
            );
          })
          .map((classData) => {
            return [
              classData.id,
              classData
                .subclasses?.[0]?.id
            ];
          })
      ),
      {
        barbarian: "berserker",
        bard: "lore",
        cleric: "life",
        druid: "land",
        fighter: "champion",
        monk: "open-hand",
        paladin: "devotion",
        ranger: "hunter",
        rogue: "thief",
        sorcerer:
          "draconic-bloodline",
        warlock: "fiend",
        wizard: "evocation"
      }
    );

    const phase8Features =
      Object.values(DEFAULT_CLASSES)
        .flatMap((classData) => {
          return Object.values(
            classData.featuresByLevel
          ).flat();
        });
    const phase8Validation =
      validateDefaultClassCollection(
        DEFAULT_CLASSES
      );

    record(
      "Phase 8: all 285 base-class features have completed descriptions",
      {
        total:
          phase8Features.length,
        completed:
          phase8Features.filter(
            (feature) => {
              return String(
                feature.description || ""
              ).trim().length >= 80;
            }
          ).length
      },
      {
        total: 285,
        completed: 285
      }
    );

    record(
      "Phase 8: base-class summaries stay concise and replace placeholder text",
      {
        concise:
          phase8Features.every(
            (feature) => {
              return (
                String(
                  feature.summary || ""
                ).length > 0 &&
                String(
                  feature.summary || ""
                ).length <= 180
              );
            }
          ),
        placeholders:
          phase8Features.filter(
            (feature) => {
              return /class feature\.?$|description not filled|placeholder|coming soon|\btodo\b|\btbd\b/i
                .test(
                  feature.summary || ""
                );
            }
          ).length
      },
      {
        concise: true,
        placeholders: 0
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    creatorState.draft
      .classProgression = {
        totalLevel: 1,
        classes: [
          makeInteractionClassEntry(
            "phase8-barbarian",
            "barbarian",
            1
          )
        ],
        levelOrder: [
          "phase8-barbarian"
        ]
      };
    refreshSelectedClassFeatures();
    const phase8Rage =
      DEFAULT_CLASSES.barbarian
        .featuresByLevel[1][0];
    const phase8DescriptionHtml =
      escapeHtml(
        phase8Rage.description
      );
    const phase8DetailHtml =
      renderSection12SelectedClassDetails();
    const phase8ReviewHtml =
      renderSection17ClassAndFeatSummary();

    record(
      "Phase 8: detail and review views show full class-feature descriptions",
      {
        detail:
          phase8DetailHtml.includes(
            phase8DescriptionHtml
          ),
        review:
          phase8ReviewHtml.includes(
            phase8DescriptionHtml
          ),
        metadata:
          phase8DetailHtml.includes(
            phase8Rage.sourceLabel
          ) &&
          phase8ReviewHtml.includes(
            phase8Rage.sourceLabel
          )
      },
      {
        detail: true,
        review: true,
        metadata: true
      }
    );

    record(
      "Phase 8: every base-class feature carries source and edition metadata",
      {
        total:
          phase8Features.length,
        labeled:
          phase8Features.filter(
            (feature) => {
              return (
                Boolean(
                  feature.sourceLabel &&
                  feature.sourceType &&
                  feature.rulesetId
                ) &&
                feature.rulesEdition ===
                  "2014"
              );
            }
          ).length
      },
      {
        total: 285,
        labeled: 285
      }
    );

    record(
      "Phase 8: every base class defines a complete level 1 through 20 progression",
      Object.fromEntries(
        Object.entries(
          DEFAULT_CLASSES
        ).map(
          ([classId, classData]) => {
            return [
              classId,
              Object.keys(
                classData
                  .featuresByLevel
              ).length
            ];
          }
        )
      ),
      Object.fromEntries(
        Object.keys(
          DEFAULT_CLASSES
        ).map((classId) => [
          classId,
          20
        ])
      )
    );

    record(
      "Phase 8: every base-class feature unlocks at its containing class level",
      phase8Features.filter(
        (feature) => {
          const owner =
            DEFAULT_CLASSES[
              feature.classId
            ];

          return !(
            owner
              ?.featuresByLevel?.[
                feature.unlockLevel
              ] || []
          ).includes(feature);
        }
      ).length,
      0
    );

    record(
      "Phase 8: class resource scaling tables match the canonical progressions",
      phase8Validation.errors.filter(
        (error) => {
          return (
            error.includes(
              "class-resource progression"
            ) ||
            error.includes(
              "progression table"
            )
          );
        }
      ),
      []
    );

    record(
      "Phase 8: all base classes retain their confirmed starting proficiencies",
      phase8Validation.errors.filter(
        (error) => {
          return error.includes(
            "starting proficiencies"
          );
        }
      ),
      []
    );

    record(
      "Phase 8: all base classes retain their confirmed multiclass proficiencies",
      {
        errors:
          phase8Validation.errors.filter(
            (error) => {
              return error.includes(
                "multiclass"
              );
            }
          ),
        barbarianArmor:
          DEFAULT_CLASSES.barbarian
            .multiclassProficiencies
            .armor
      },
      {
        errors: [],
        barbarianArmor: [
          "Light Armor",
          "Medium Armor",
          "Shields"
        ]
      }
    );

    record(
      "Phase 8: class-data validation accepts the complete default catalog",
      {
        valid:
          phase8Validation.valid,
        classCount:
          phase8Validation
            .classCount,
        featureCount:
          phase8Validation
            .featureCount,
        errors:
          phase8Validation
            .errors
            .length
      },
      {
        valid: true,
        classCount: 13,
        featureCount: 285,
        errors: 0
      }
    );

    const phase8DuplicateFixture =
      cloneData(DEFAULT_CLASSES);
    phase8DuplicateFixture
      .barbarian
      .featuresByLevel[2][0]
      .id = "rage";
    const phase8DuplicateValidation =
      validateDefaultClassCollection(
        phase8DuplicateFixture
      );

    record(
      "Phase 8: class-data validation rejects duplicate feature IDs",
      {
        valid:
          phase8DuplicateValidation
            .valid,
        caught:
          phase8DuplicateValidation
            .errors
            .some((error) => {
              return error.includes(
                "duplicate feature ID"
              );
            })
      },
      {
        valid: false,
        caught: true
      }
    );

    const phase8MissingDescriptionFixture =
      cloneData(DEFAULT_CLASSES);
    phase8MissingDescriptionFixture
      .barbarian
      .featuresByLevel[1][0]
      .description = "";
    const phase8MissingDescriptionValidation =
      validateDefaultClassCollection(
        phase8MissingDescriptionFixture
      );

    record(
      "Phase 8: class-data validation rejects missing descriptions",
      {
        valid:
          phase8MissingDescriptionValidation
            .valid,
        caught:
          phase8MissingDescriptionValidation
            .errors
            .some((error) => {
              return error.includes(
                "missing a completed description"
              );
            })
      },
      {
        valid: false,
        caught: true
      }
    );

    const phase8UnsupportedEffectFixture =
      cloneData(DEFAULT_CLASSES);
    phase8UnsupportedEffectFixture
      .barbarian
      .featuresByLevel[1][0]
      .effects[0]
      .type =
      "unsupported-phase8-effect";
    const phase8UnsupportedEffectValidation =
      validateDefaultClassCollection(
        phase8UnsupportedEffectFixture
      );

    record(
      "Phase 8: class-data validation rejects unsupported class-effect types",
      {
        valid:
          phase8UnsupportedEffectValidation
            .valid,
        caught:
          phase8UnsupportedEffectValidation
            .errors
            .some((error) => {
              return error.includes(
                "unsupported class-effect type"
              );
            })
      },
      {
        valid: false,
        caught: true
      }
    );

    const phase8InvalidProgressionFixture =
      cloneData(DEFAULT_CLASSES);
    phase8InvalidProgressionFixture
      .barbarian
      .featuresByLevel[1][0]
      .resource
      .usesByLevel[21] = 7;
    const phase8InvalidProgressionValidation =
      validateDefaultClassCollection(
        phase8InvalidProgressionFixture
      );

    record(
      "Phase 8: class-data validation rejects invalid progression tables",
      {
        valid:
          phase8InvalidProgressionValidation
            .valid,
        caught:
          phase8InvalidProgressionValidation
            .errors
            .some((error) => {
              return error.includes(
                "invalid progression table level"
              );
            })
      },
      {
        valid: false,
        caught: true
      }
    );

    const phase9NormalFeatBonus =
      createAbilityMap(0);
    const phase9NormalFeatScores = {
      ...createAbilityMap(10),
      str: 19
    };
    const phase9NormalFeatGranted =
      addCappedNormalAbilityIncrease({
        bonusMap:
          phase9NormalFeatBonus,
        scoreMap:
          phase9NormalFeatScores,
        abilityId: "str",
        amount: 2,
        maximum:
          DEFAULT_FEAT_ABILITY_SCORE_MAXIMUM
      });

    record(
      "Phase 9: normal feat increases cannot raise an ability above 20",
      {
        granted:
          phase9NormalFeatGranted,
        bonus:
          phase9NormalFeatBonus.str,
        score:
          phase9NormalFeatScores.str
      },
      {
        granted: 1,
        bonus: 1,
        score: 20
      }
    );

    const phase9ResilientEffect =
      DEFAULT_FEATS
        .find((feat) => {
          return feat.id ===
            "resilient";
        })
        ?.effects
        ?.find((effect) => {
          return effect.type ===
            "abilityChoice";
        });
    const phase9HalfFeatBonus =
      createAbilityMap(0);
    const phase9HalfFeatScores = {
      ...createAbilityMap(10),
      con: 20
    };
    const phase9HalfFeatGranted =
      addCappedNormalAbilityIncrease({
        bonusMap:
          phase9HalfFeatBonus,
        scoreMap:
          phase9HalfFeatScores,
        abilityId: "con",
        amount:
          phase9ResilientEffect
            ?.increase,
        maximum:
          getFeatAbilityEffectMaximum(
            phase9ResilientEffect
          )
      });

    record(
      "Phase 9: half-feats cannot raise an ability from 20 to 21",
      {
        declaredMaximum:
          phase9ResilientEffect
            ?.maximum,
        granted:
          phase9HalfFeatGranted,
        score:
          phase9HalfFeatScores.con
      },
      {
        declaredMaximum: 20,
        granted: 0,
        score: 20
      }
    );

    const phase9DeclaredMaximumFixture =
      cloneData(DEFAULT_FEATS);
    const phase9DeclaredMaximumFeat =
      phase9DeclaredMaximumFixture
        .find((feat) => {
          return feat.id ===
            "resilient";
        });
    const phase9DeclaredMaximumEffect =
      phase9DeclaredMaximumFeat
        .effects
        .find((effect) => {
          return effect.type ===
            "abilityChoice";
        });

    phase9DeclaredMaximumEffect.maximum =
      22;
    phase9DeclaredMaximumEffect.increase =
      2;

    const phase9DeclaredMaximumValidation =
      validateDefaultFeatCollection(
        phase9DeclaredMaximumFixture
      );
    const phase9DeclaredMaximumBonus =
      createAbilityMap(0);
    const phase9DeclaredMaximumScores = {
      ...createAbilityMap(10),
      wis: 20
    };
    const phase9DeclaredMaximumGranted =
      addCappedNormalAbilityIncrease({
        bonusMap:
          phase9DeclaredMaximumBonus,
        scoreMap:
          phase9DeclaredMaximumScores,
        abilityId: "wis",
        amount:
          phase9DeclaredMaximumEffect
            .increase,
        maximum:
          getFeatAbilityEffectMaximum(
            phase9DeclaredMaximumEffect
          )
      });

    record(
      "Phase 9: feat effects respect their declared maximum ability score",
      {
        valid:
          phase9DeclaredMaximumValidation
            .valid,
        granted:
          phase9DeclaredMaximumGranted,
        score:
          phase9DeclaredMaximumScores.wis
      },
      {
        valid: true,
        granted: 2,
        score: 22
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    creatorState.draft
      .abilities.base.con = 18;
    creatorState.draft.feats = [
      "aberrant-dragonmark"
    ];
    creatorState.draft.selectedFeats = [
      "aberrant-dragonmark"
    ];
    recalculateAbilityTotals(
      creatorState.draft
    );
    applySelectedFeatMechanics();

    record(
      "Phase 9: fixed feat ability increases apply through the capped source",
      {
        score:
          creatorState.draft
            .abilities.scores.con,
        bonus:
          creatorState.draft
            .abilities
            .bonusSources
            ["feat:aberrant-dragonmark-1"]
            ?.con || 0
      },
      {
        score: 19,
        bonus: 1
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    creatorState.draft.feats = [
      "lucky"
    ];
    creatorState.draft.selectedFeats = [
      "lucky"
    ];
    const phase9FeatRemoved =
      toggleSection16Feat("lucky");

    record(
      "Phase 9: removing a Spells-step feat clears its compatibility alias",
      {
        removed:
          phase9FeatRemoved,
        feats:
          creatorState.draft.feats,
        selectedFeats:
          creatorState.draft
            .selectedFeats
      },
      {
        removed: true,
        feats: [],
        selectedFeats: []
      }
    );

    const createPhase9FighterAsiSlot = (
      baseScores = {}
    ) => {
      creatorState.draft =
        createEmptyCharacter();
      chooseSection12Class(
        "fighter"
      );

      Object.entries(baseScores)
        .forEach(
          ([abilityId, score]) => {
            if (
              Object.hasOwn(
                creatorState.draft
                  .abilities.base,
                abilityId
              )
            ) {
              creatorState.draft
                .abilities.base[
                  abilityId
                ] = score;
            }
          }
        );

      recalculateAbilityTotals(
        creatorState.draft
      );

      addCharacterLevelToClass(0);
      addCharacterLevelToClass(0);
      addCharacterLevelToClass(0);

      return getUnlockedFeatChoiceSlots(
        creatorState.draft
      ).find((slot) => {
        return (
          slot.classId ===
            "fighter" &&
          slot.classLevel === 4
        );
      });
    };

    const phase9SelectableSlot =
      createPhase9FighterAsiSlot({
        wis: 18
      });
    const phase9SelectableMode =
      setSection12AsiMode(
        phase9SelectableSlot?.id,
        "feat"
      );
    const phase9SelectableFeat =
      setSection12AsiFeat(
        phase9SelectableSlot?.id,
        "resilient"
      );
    const phase9SelectableChoice =
      setSection12FeatChoiceValues(
        phase9SelectableSlot?.id,
        "ability",
        ["Wisdom"]
      );

    record(
      "Phase 9: selectable feat ability increases apply to the chosen ability",
      {
        mode:
          phase9SelectableMode,
        feat:
          phase9SelectableFeat,
        choice:
          phase9SelectableChoice,
        wisdom:
          creatorState.draft
            .abilities.scores.wis,
        strength:
          creatorState.draft
            .abilities.scores.str
      },
      {
        mode: true,
        feat: true,
        choice: true,
        wisdom: 19,
        strength: 10
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    creatorState.draft
      .abilities.base.str = 19;
    recalculateAbilityTotals(
      creatorState.draft
    );
    setSection12AsiBonusSource(
      "phase9-same-ability",
      ["str", "str"]
    );

    record(
      "Phase 9: two ASI increases placed in one ability stop at 20",
      {
        score:
          creatorState.draft
            .abilities.scores.str,
        bonus:
          creatorState.draft
            .abilities
            .bonusSources
            ["class-asi:phase9-same-ability"]
            ?.str || 0
      },
      {
        score: 20,
        bonus: 1
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    creatorState.draft
      .abilities.base.dex = 19;
    creatorState.draft
      .abilities.base.con = 19;
    recalculateAbilityTotals(
      creatorState.draft
    );
    setSection12AsiBonusSource(
      "phase9-split-abilities",
      ["dex", "con"]
    );

    record(
      "Phase 9: ASI increases can split between two abilities",
      {
        dexterity:
          creatorState.draft
            .abilities.scores.dex,
        constitution:
          creatorState.draft
            .abilities.scores.con
      },
      {
        dexterity: 20,
        constitution: 20
      }
    );

    creatorState.draft =
      normalizeCharacter({
        abilities: {
          method: "manual",
          base: {
            ...createAbilityMap(10),
            str: 22
          },
          bonusSources: {}
        }
      });
    setSection12AsiBonusSource(
      "phase9-imported-score",
      ["str"]
    );

    record(
      "Phase 9: imported ability scores above 20 are preserved without normal increases",
      {
        score:
          creatorState.draft
            .abilities.scores.str,
        asiBonus:
          creatorState.draft
            .abilities
            .bonusSources
            ["class-asi:phase9-imported-score"]
            ?.str || 0
      },
      {
        score: 22,
        asiBonus: 0
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    creatorState.draft
      .abilities.base.str = 22;
    recalculateAbilityTotals(
      creatorState.draft
    );
    setAbilityBonusSource(
      "magic:phase9-belt",
      {
        ...createAbilityMap(0),
        str: 4
      }
    );

    record(
      "Phase 9: manual and magical ability values may exceed 20 up to the global 30 ceiling",
      {
        manualBase:
          creatorState.draft
            .abilities.base.str,
        magicalBonus:
          creatorState.draft
            .abilities
            .bonusSources
            ["magic:phase9-belt"]
            .str,
        score:
          creatorState.draft
            .abilities.scores.str
      },
      {
        manualBase: 22,
        magicalBonus: 4,
        score: 26
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    creatorState.draft
      .abilities.base.str = 19;
    recalculateAbilityTotals(
      creatorState.draft
    );
    setAbilityBonusSource(
      "magic:phase9-blessing",
      {
        ...createAbilityMap(0),
        str: 2
      }
    );
    setSection12AsiBonusSource(
      "phase9-separated-source",
      ["str"]
    );

    record(
      "Phase 9: magical overrides remain separate from normal ASI limits",
      {
        ordinaryScore:
          getNormalAbilityScoreForCap(
            creatorState.draft,
            "str"
          ),
        asiBonus:
          creatorState.draft
            .abilities
            .bonusSources
            ["class-asi:phase9-separated-source"]
            .str,
        magicalBonus:
          creatorState.draft
            .abilities
            .bonusSources
            ["magic:phase9-blessing"]
            .str,
        finalScore:
          creatorState.draft
            .abilities.scores.str
      },
      {
        ordinaryScore: 20,
        asiBonus: 1,
        magicalBonus: 2,
        finalScore: 22
      }
    );

    const phase9PickerSlot =
      createPhase9FighterAsiSlot();
    setSection12AsiMode(
      phase9PickerSlot?.id,
      "feat"
    );
    const phase9PickerHtml =
      renderSection12CompactAsiChoice(
        phase9PickerSlot
      );
    const phase9PseudoFeatRejected =
      !setSection12AsiFeat(
        phase9PickerSlot?.id,
        "ability-score-improvement"
      );

    record(
      "Phase 9: normal Ability Score Improvement is not offered as a feat",
      {
        normalAsiMode:
          phase9PickerHtml.includes(
            'data-mode="asi"'
          ),
        pseudoFeatInPicker:
          phase9PickerHtml.includes(
            'data-feat-id="ability-score-improvement"'
          ),
        pseudoFeatRejected:
          phase9PseudoFeatRejected
      },
      {
        normalAsiMode: true,
        pseudoFeatInPicker: false,
        pseudoFeatRejected: true
      }
    );

    const createPhase10FeatSelection = (
      featId,
      featChoices = {}
    ) => {
      const slot =
        createPhase9FighterAsiSlot();
      const encodedChoices =
        Object.entries(featChoices)
          .flatMap(
            ([choiceId, values]) => {
              return uniqueCleanArray(
                values
              ).map((value) => {
                return encodeFeatChoiceValue(
                  choiceId,
                  value
                );
              });
            }
          )
          .filter(Boolean);

      setSection12AsiChoiceValues(
        slot.id,
        [
          "mode:feat",
          `feat:${featId}`,
          ...encodedChoices
        ]
      );
      creatorState.draft.feats = [
        featId
      ];
      creatorState.draft.selectedFeats = [
        featId
      ];
      syncSection12AdvancementChoice(
        slot.id
      );
      applySelectedFeatMechanics();

      return {
        slot,
        source:
          creatorState.draft
            .magic
            .featSources[
              slot.id
            ],
        records:
          creatorState.draft
            .featMechanics
            .spellcasting
      };
    };

    const phase10Aberrant =
      createPhase10FeatSelection(
        "aberrant-dragonmark",
        {
          cantrip: ["fire-bolt"],
          "level-one-spell": [
            "magic-missile"
          ]
        }
      );

    record(
      "Phase 10: Aberrant Dragonmark spells use Constitution",
      uniqueCleanArray(
        phase10Aberrant.records.map(
          (entry) => {
            return entry
              .spellcastingAbility;
          }
        )
      ),
      ["con"]
    );

    const phase10Artificer =
      createPhase10FeatSelection(
        "artificer-initiate",
        {
          cantrip: ["mending"],
          "level-one-spell": [
            "cure-wounds"
          ],
          "artisan-tool": [
            "Alchemist's supplies"
          ]
        }
      );

    record(
      "Phase 10: Artificer Initiate spells use Intelligence",
      uniqueCleanArray(
        phase10Artificer.records.map(
          (entry) => {
            return entry
              .spellcastingAbility;
          }
        )
      ),
      ["int"]
    );

    const phase10Drow =
      createPhase10FeatSelection(
        "drow-high-magic"
      );

    record(
      "Phase 10: Drow High Magic spells use Charisma",
      uniqueCleanArray(
        phase10Drow.records.map(
          (entry) => {
            return entry
              .spellcastingAbility;
          }
        )
      ),
      ["cha"]
    );

    const phase10Svirfneblin =
      createPhase10FeatSelection(
        "svirfneblin-magic"
      );

    record(
      "Phase 10: Svirfneblin Magic spells use Intelligence",
      uniqueCleanArray(
        phase10Svirfneblin.records.map(
          (entry) => {
            return entry
              .spellcastingAbility;
          }
        )
      ),
      ["int"]
    );

    const phase10WoodElf =
      createPhase10FeatSelection(
        "wood-elf-magic",
        {
          cantrip: ["druidcraft"]
        }
      );

    record(
      "Phase 10: Wood Elf Magic spells use Wisdom",
      uniqueCleanArray(
        phase10WoodElf.records.map(
          (entry) => {
            return entry
              .spellcastingAbility;
          }
        )
      ),
      ["wis"]
    );

    const phase10MagicInitiate =
      createPhase10FeatSelection(
        "magic-initiate",
        {
          "spell-class": ["Wizard"],
          cantrips: [
            "fire-bolt",
            "ray-of-frost"
          ],
          "level-one-spell": [
            "magic-missile"
          ]
        }
      );

    record(
      "Phase 10: Magic Initiate derives its ability from the selected class",
      uniqueCleanArray(
        phase10MagicInitiate.records.map(
          (entry) => {
            return entry
              .spellcastingAbility;
          }
        )
      ),
      ["int"]
    );

    const phase10SpellSniper =
      createPhase10FeatSelection(
        "spell-sniper",
        {
          "cantrip-class": [
            "Warlock"
          ],
          "attack-cantrip": [
            "eldritch-blast"
          ]
        }
      );

    record(
      "Phase 10: Spell Sniper derives its ability from the selected spell list",
      {
        ability:
          phase10SpellSniper
            .records[0]
            ?.spellcastingAbility,
        sourceClass:
          phase10SpellSniper
            .records[0]
            ?.sourceClassId
      },
      {
        ability: "cha",
        sourceClass: "warlock"
      }
    );

    const phase10FeyTouched =
      createPhase10FeatSelection(
        "fey-touched",
        {
          ability: ["Wisdom"],
          "level-one-spell": [
            "charm-person"
          ]
        }
      );

    record(
      "Phase 10: Fey Touched preserves the chosen casting ability",
      uniqueCleanArray(
        phase10FeyTouched.records.map(
          (entry) => {
            return entry
              .spellcastingAbility;
          }
        )
      ),
      ["wis"]
    );

    const phase10ShadowTouched =
      createPhase10FeatSelection(
        "shadow-touched",
        {
          ability: ["Charisma"],
          "level-one-spell": [
            "false-life"
          ]
        }
      );

    record(
      "Phase 10: Shadow Touched preserves the chosen casting ability",
      uniqueCleanArray(
        phase10ShadowTouched.records.map(
          (entry) => {
            return entry
              .spellcastingAbility;
          }
        )
      ),
      ["cha"]
    );

    const phase10Telekinetic =
      createPhase10FeatSelection(
        "telekinetic",
        {
          ability: [
            "Intelligence"
          ]
        }
      );

    record(
      "Phase 10: Telekinetic preserves the chosen casting ability",
      phase10Telekinetic
        .records[0]
        ?.spellcastingAbility,
      "int"
    );

    const phase10Telepathic =
      createPhase10FeatSelection(
        "telepathic",
        {
          ability: ["Wisdom"]
        }
      );

    record(
      "Phase 10: Telepathic preserves the chosen casting ability",
      phase10Telepathic
        .records[0]
        ?.spellcastingAbility,
      "wis"
    );

    record(
      "Phase 10: at-will feat spells are tracked",
      phase10Drow.records
        .find((entry) => {
          return entry.spellId ===
            "detect-magic";
        })
        ?.atWill,
      true
    );

    record(
      "Phase 10: once-per-long-rest feat spells are tracked",
      (() => {
        const record =
          phase10Drow.records
            .find((entry) => {
              return entry.spellId ===
                "levitate";
            });

        return {
          maximumUses:
            record?.maximumUses,
          currentUses:
            record?.currentUses,
          recharge:
            record?.recharge
        };
      })(),
      {
        maximumUses: 1,
        currentUses: 1,
        recharge: "longRest"
      }
    );

    record(
      "Phase 10: feat spells that may use normal slots are tracked",
      phase10FeyTouched.records
        .map((entry) => {
          return {
            spellId: entry.spellId,
            canUseSpellSlots:
              entry.canUseSpellSlots
          };
        }),
      [
        {
          spellId: "misty-step",
          canUseSpellSlots: true
        },
        {
          spellId: "charm-person",
          canUseSpellSlots: true
        }
      ]
    );

    const phase10SheetHtml =
      createCharacterSheetView()
        .renderCharacterSheetHtml(
          creatorState.draft,
          {
            activeTab: "spell"
          }
        );

    record(
      "Phase 10: feat spell resources appear on the character sheet",
      {
        card:
          phase10SheetHtml.includes(
            "<h2>Feat Spells</h2>"
          ),
        spell:
          phase10SheetHtml.includes(
            "Detect Thoughts"
          ),
        ability:
          phase10SheetHtml.includes(
            "Wis"
          ),
        usage:
          phase10SheetHtml.includes(
            "1 / 1 use remaining"
          )
      },
      {
        card: true,
        spell: true,
        ability: true,
        usage: true
      }
    );

    const phase10MagicInitiateFeat =
      DEFAULT_FEATS.find((feat) => {
        return feat.id ===
          "magic-initiate";
      });
    const phase10MagicInitiateSpellChoice =
      phase10MagicInitiateFeat
        ?.choices
        ?.find((choice) => {
          return choice.id ===
            "level-one-spell";
        });
    const phase10ClericOptions =
      getSection12FeatChoiceOptions(
        phase10MagicInitiateSpellChoice,
        {
          featChoices: {
            "spell-class": [
              "Cleric"
            ]
          }
        }
      );

    record(
      "Phase 10: feat spell choices enforce the selected class list",
      {
        count:
          phase10ClericOptions.length >
          0,
        allCleric:
          phase10ClericOptions.every(
            (option) => {
              return DEFAULT_SPELLS
                .find((spell) => {
                  return spell.id ===
                    option.value;
                })
                ?.classes
                ?.includes("cleric");
            }
          )
      },
      {
        count: true,
        allCleric: true
      }
    );

    const phase10FeySpellChoice =
      DEFAULT_FEATS
        .find((feat) => {
          return feat.id ===
            "fey-touched";
        })
        ?.choices
        ?.find((choice) => {
          return choice.id ===
            "level-one-spell";
        });
    const phase10FeyOptions =
      getSection12FeatChoiceOptions(
        phase10FeySpellChoice,
        {}
      );

    record(
      "Phase 10: feat spell choices enforce spell-school restrictions",
      {
        count:
          phase10FeyOptions.length >
          0,
        allAllowed:
          phase10FeyOptions.every(
            (option) => {
              return [
                "divination",
                "enchantment"
              ].includes(
                cleanString(
                  DEFAULT_SPELLS
                    .find((spell) => {
                      return spell.id ===
                        option.value;
                    })
                    ?.school
                ).toLowerCase()
              );
            }
          )
      },
      {
        count: true,
        allAllowed: true
      }
    );

    const phase10RitualChoice =
      DEFAULT_FEATS
        .find((feat) => {
          return feat.id ===
            "ritual-caster";
        })
        ?.choices
        ?.find((choice) => {
          return choice.id ===
            "ritual-spells";
        });
    const phase10RitualOptions =
      getSection12FeatChoiceOptions(
        phase10RitualChoice,
        {
          featChoices: {
            "ritual-class": [
              "Wizard"
            ]
          }
        }
      );

    record(
      "Phase 10: feat spell choices enforce ritual restrictions",
      {
        count:
          phase10RitualOptions.length >
          0,
        allRitual:
          phase10RitualOptions.every(
            (option) => {
              return DEFAULT_SPELLS
                .find((spell) => {
                  return spell.id ===
                    option.value;
                })
                ?.ritual === true;
            }
          )
      },
      {
        count: true,
        allRitual: true
      }
    );

    const phase10AttackChoice =
      DEFAULT_FEATS
        .find((feat) => {
          return feat.id ===
            "spell-sniper";
        })
        ?.choices
        ?.find((choice) => {
          return choice.id ===
            "attack-cantrip";
        });
    const phase10AttackOptions =
      getSection12FeatChoiceOptions(
        phase10AttackChoice,
        {
          featChoices: {
            "cantrip-class": [
              "Wizard"
            ]
          }
        }
      );

    record(
      "Phase 10: feat spell choices enforce spell-attack-only restrictions",
      {
        count:
          phase10AttackOptions.length >
          0,
        allAttackRolls:
          phase10AttackOptions.every(
            (option) => {
              return Boolean(
                DEFAULT_SPELLS
                  .find((spell) => {
                    return spell.id ===
                      option.value;
                  })
                  ?.attackType
              );
            }
          )
      },
      {
        count: true,
        allAttackRolls: true
      }
    );

    const phase10CompleteWarnings =
      getFeatSpellcastingValidationWarnings(
        creatorState.draft
      );
    const phase10InvalidFixture =
      cloneData(
        creatorState.draft
      );
    phase10InvalidFixture
      .featMechanics
      .spellcasting[0]
      .spellcastingAbility = "";
    phase10InvalidFixture
      .featMechanics
      .spellcasting[0]
      .sourceId = "";
    const phase10InvalidWarnings =
      getFeatSpellcastingValidationWarnings(
        phase10InvalidFixture
      );

    record(
      "Phase 10: every feat spell validates its casting ability and source",
      {
        complete:
          phase10CompleteWarnings.length,
        missingAbility:
          phase10InvalidWarnings.some(
            (warning) => {
              return warning.includes(
                "no casting ability"
              );
            }
          ),
        missingSource:
          phase10InvalidWarnings.some(
            (warning) => {
              return warning.includes(
                "no valid feat spell source"
              );
            }
          )
      },
      {
        complete: 0,
        missingAbility: true,
        missingSource: true
      }
    );

    createPhase10FeatSelection(
      "dragon-hide",
      {
        ability: [
          "Strength"
        ]
      }
    );
    record(
      "Phase 11: Dragon Hide adds its natural weapon",
      creatorState.draft
        .featMechanics
        .naturalWeapons
        .map((weapon) => {
          return {
            name:
              weapon.name,
            damage:
              weapon.damageDice,
            damageType:
              weapon.damageType,
            proficient:
              weapon.proficient
          };
        }),
      [
        {
          name: "Dragon Claws",
          damage: "1d4",
          damageType:
            "slashing",
          proficient: true
        }
      ]
    );

    createPhase10FeatSelection(
      "dual-wielder"
    );
    creatorState.draft
      .equipment.items = [
        {
          id: "dual-sword-1",
          name: "Longsword",
          category: "weapon",
          weaponType:
            "Martial melee",
          damageDice: "1d8",
          equipped: true,
          twoHanded: false
        },
        {
          id: "dual-sword-2",
          name: "Rapier",
          category: "weapon",
          weaponType:
            "Martial melee",
          damageDice: "1d8",
          equipped: true,
          twoHanded: false
        }
      ];
    record(
      "Phase 11: Dual Wielder applies its conditional AC bonus",
      calculateArmorClassOptions(
        creatorState.draft
      ).selected.total,
      11
    );

    createPhase10FeatSelection(
      "eldritch-adept",
      {
        invocation: [
          "Devil's Sight"
        ]
      }
    );
    record(
      "Phase 11: Eldritch Adept applies the selected invocation",
      {
        invocation:
          creatorState.draft
            .featMechanics
            .selectedFeatures
            .find((entry) => {
              return entry
                .featureType ===
                "eldritchInvocation";
            })?.name,
        sense:
          creatorState.draft
            .featMechanics
            .senses[0]
      },
      {
        invocation:
          "Devil's Sight",
        sense: {
          id:
            `${creatorState.draft.featMechanics.instances[0].id}:invocation-sense:devil-s-sight`,
          featId:
            "eldritch-adept",
          featName:
            "Eldritch Adept",
          sourceId:
            creatorState.draft
              .featMechanics
              .instances[0]
              .id,
          sense:
            "darkvision",
          range: 120,
          magicalDarkness:
            true
        }
      }
    );

    createPhase10FeatSelection(
      "elemental-adept",
      {
        "damage-type": [
          "Fire"
        ]
      }
    );
    const phase11ElementalAdept =
      creatorState.draft
        .featMechanics
        .elementalAdepts[0];
    record(
      "Phase 11: Elemental Adept ignores resistance for the selected damage type",
      {
        damageType:
          phase11ElementalAdept
            ?.damageType,
        ignoreResistance:
          phase11ElementalAdept
            ?.ignoreResistance
      },
      {
        damageType: "fire",
        ignoreResistance: true
      }
    );

    record(
      "Phase 11: Elemental Adept treats damage-die results of 1 as 2",
      phase11ElementalAdept
        ?.minimumDamageDie,
      2
    );

    createPhase10FeatSelection(
      "fighting-initiate",
      {
        "fighting-style": [
          "Defense"
        ]
      }
    );
    creatorState.draft
      .equipment.items = [
        {
          id: "defense-armor",
          name: "Scale Mail",
          category: "armor",
          armorCategory:
            "medium",
          baseArmorClass: 14,
          dexterityCap: 2,
          equipped: true
        }
      ];
    record(
      "Phase 11: Fighting Initiate applies the selected fighting style",
      {
        style:
          creatorState.draft
            .featMechanics
            .selectedFeatures[0]
            ?.name,
        armorClass:
          calculateArmorClassOptions(
            creatorState.draft
          ).selected.total
      },
      {
        style: "Defense",
        armorClass: 15
      }
    );

    createPhase10FeatSelection(
      "heavy-armor-master"
    );
    record(
      "Phase 11: Heavy Armor Master applies conditional damage reduction",
      creatorState.draft
        .featMechanics
        .damageReductions[0],
      {
        id:
          `${creatorState.draft.featMechanics.instances[0].id}:damage-reduction`,
        featId:
          "heavy-armor-master",
        featName:
          "Heavy Armor Master",
        sourceId:
          creatorState.draft
            .featMechanics
            .instances[0]
            .id,
        value: 3,
        damageTypes: [
          "bludgeoning",
          "piercing",
          "slashing"
        ],
        condition:
          "wearing-heavy-armor-and-nonmagical"
      }
    );

    createPhase10FeatSelection(
      "keenness-of-the-stone-giant",
      {
        ability: [
          "Wisdom"
        ]
      }
    );
    record(
      "Phase 11: Keenness of the Stone Giant applies its darkvision increase",
      {
        bonus:
          creatorState.draft
            .featMechanics
            .senses[0]
            ?.bonus,
        range:
          creatorState.draft
            .featMechanics
            .senses[0]
            ?.range
      },
      {
        bonus: 60,
        range: 60
      }
    );

    const phase11MagicInitiate =
      createPhase10FeatSelection(
        "magic-initiate",
        {
          "spell-class": [
            "Cleric"
          ],
          cantrips: [
            "guidance",
            "sacred-flame"
          ],
          "level-one-spell": [
            "bless"
          ]
        }
      );
    record(
      "Phase 11: Magic Initiate applies the selected class casting ability",
      uniqueCleanArray(
        phase11MagicInitiate
          .records
          .map((entry) => {
            return entry
              .spellcastingAbility;
          })
      ),
      ["wis"]
    );

    createPhase10FeatSelection(
      "martial-adept",
      {
        maneuvers: [
          "Parry",
          "Trip Attack"
        ],
        "maneuver-ability": [
          "Strength"
        ]
      }
    );
    record(
      "Phase 11: Martial Adept adds the selected maneuvers",
      creatorState.draft
        .featMechanics
        .selectedFeatures
        .filter((entry) => {
          return entry.featureType ===
            "battleMasterManeuver";
        })
        .map((entry) => {
          return entry.name;
        }),
      [
        "Parry",
        "Trip Attack"
      ]
    );

    record(
      "Phase 11: Martial Adept adds and tracks its superiority die",
      (() => {
        const resource =
          creatorState.draft
            .featMechanics
            .resources
            .find((entry) => {
              return entry.resourceId ===
                "superiority-dices";
            }) ||
          creatorState.draft
            .featMechanics
            .resources
            .find((entry) => {
              return entry.resourceId ===
                "superiority-dice";
            });

        return {
          currentUses:
            resource
              ?.currentUses,
          maximumUses:
            resource
              ?.maximumUses,
          die: resource?.die,
          recharge:
            resource
              ?.recharge
        };
      })(),
      {
        currentUses: 1,
        maximumUses: 1,
        die: "d6",
        recharge:
          "shortOrLongRest"
      }
    );

    createPhase10FeatSelection(
      "metamagic-adept",
      {
        "metamagic-options": [
          "Quickened Spell",
          "Subtle Spell"
        ]
      }
    );
    record(
      "Phase 11: Metamagic Adept adds the selected metamagic options",
      creatorState.draft
        .featMechanics
        .selectedFeatures
        .filter((entry) => {
          return entry.featureType ===
            "metamagic";
        })
        .map((entry) => {
          return entry.name;
        }),
      [
        "Quickened Spell",
        "Subtle Spell"
      ]
    );

    record(
      "Phase 11: Metamagic Adept adds and tracks sorcery points",
      (() => {
        const resource =
          creatorState.draft
            .featMechanics
            .resources
            .find((entry) => {
              return entry.resourceId ===
                "metamagic-sorcery-points";
            });

        return {
          currentUses:
            resource
              ?.currentUses,
          maximumUses:
            resource
              ?.maximumUses,
          recharge:
            resource
              ?.recharge
        };
      })(),
      {
        currentUses: 2,
        maximumUses: 2,
        recharge:
          "longRest"
      }
    );

    createPhase10FeatSelection(
      "planar-wanderer",
      {
        ability: [
          "Wisdom"
        ],
        "default-resistance": [
          "Acid"
        ]
      }
    );
    const phase11RestChoiceId =
      creatorState.draft
        .featMechanics
        .restChoices[0]
        ?.id;
    const phase11RestChoiceChanged =
      setFeatRestChoice(
        phase11RestChoiceId,
        "fire"
      );
    record(
      "Phase 11: Planar Wanderer changes resistance after a rest",
      {
        changed:
          phase11RestChoiceChanged,
        selected:
          creatorState.draft
            .featMechanics
            .restChoices[0]
            ?.selected,
        resistances:
          creatorState.draft
            .featMechanics
            .resistances
      },
      {
        changed: true,
        selected: "fire",
        resistances: [
          "fire"
        ]
      }
    );

    createPhase10FeatSelection(
      "revenant-blade",
      {
        ability: [
          "Dexterity"
        ]
      }
    );
    creatorState.draft
      .equipment.items = [
        {
          id:
            "double-bladed-scimitar",
          name:
            "Double-Bladed Scimitar",
          category: "weapon",
          weaponType:
            "Martial melee",
          damageDice: "2d4",
          equipped: true,
          twoHanded: true
        }
      ];
    record(
      "Phase 11: Revenant Blade applies its conditional AC bonus",
      calculateArmorClassOptions(
        creatorState.draft
      ).selected.total,
      11
    );

    createPhase10FeatSelection(
      "ritual-caster",
      {
        "ritual-class": [
          "Wizard"
        ],
        "ritual-spells": [
          "alarm",
          "identify"
        ]
      }
    );
    const phase11RitualBook =
      creatorState.draft
        .featMechanics
        .ritualBooks[0];
    const phase11RitualSheetHtml =
      createCharacterSheetView()
        .renderCharacterSheetHtml(
          creatorState.draft,
          {
            activeTab: "main"
          }
        );
    record(
      "Phase 11: Ritual Caster creates and displays a ritual book",
      {
        spellIds:
          phase11RitualBook
            ?.spellIds,
        displayed:
          phase11RitualSheetHtml
            .includes(
              "<h2>Ritual Book</h2>"
            ) &&
          phase11RitualSheetHtml
            .includes("Alarm") &&
          phase11RitualSheetHtml
            .includes("Identify")
      },
      {
        spellIds: [
          "alarm",
          "identify"
        ],
        displayed: true
      }
    );

    createPhase10FeatSelection(
      "ritual-caster",
      {
        "ritual-class": [
          "Wizard"
        ],
        "ritual-spells": [
          "alarm",
          "phantom-steed"
        ]
      }
    );
    record(
      "Phase 11: Ritual Caster enforces its maximum ritual spell level",
      {
        maximum:
          creatorState.draft
            .featMechanics
            .ritualBooks[0]
            ?.maximumSpellLevel,
        accepted:
          creatorState.draft
            .featMechanics
            .ritualBooks[0]
            ?.spellIds,
        rejected:
          creatorState.draft
            .featMechanics
            .ritualBooks[0]
            ?.rejectedSpellIds
      },
      {
        maximum: 2,
        accepted: [
          "alarm"
        ],
        rejected: [
          "phantom-steed"
        ]
      }
    );

    createPhase10FeatSelection(
      "scion-of-the-outer-planes",
      {
        "outer-plane": [
          "Good Outer Plane"
        ],
        "spellcasting-ability": [
          "Wisdom"
        ]
      }
    );
    record(
      "Phase 11: Scion of the Outer Planes applies the selected plane resistance",
      creatorState.draft
        .featMechanics
        .resistances,
      [
        "radiant"
      ]
    );

    record(
      "Phase 11: Scion of the Outer Planes applies its cantrip",
      (() => {
        const record =
          creatorState.draft
            .featMechanics
            .spellcasting[0];

        return {
          spellId:
            record?.spellId,
          ability:
            record
              ?.spellcastingAbility,
          atWill:
            record?.atWill
        };
      })(),
      {
        spellId:
          "sacred-flame",
        ability: "wis",
        atWill: true
      }
    );

    createPhase10FeatSelection(
      "strike-of-the-giants",
      {
        "giant-strike": [
          "Cloud Strike"
        ]
      }
    );
    record(
      "Phase 11: Strike of the Giants adds the selected strike action",
      {
        name:
          creatorState.draft
            .featMechanics
            .actions[0]
            ?.name,
        damage:
          creatorState.draft
            .featMechanics
            .actions[0]
            ?.damage,
        resource:
          creatorState.draft
            .featMechanics
            .actions[0]
            ?.resourceId
      },
      {
        name: "Cloud Strike",
        damage:
          "1d4 thunder",
        resource:
          `${creatorState.draft.featMechanics.instances[0].id}:giant-strike`
      }
    );

    createPhase10FeatSelection(
      "tavern-brawler",
      {
        ability: [
          "Strength"
        ]
      }
    );
    const phase11UnarmedAttack =
      calculateWeaponAttack(
        creatorState.draft,
        {
          id:
            "unarmed-strike",
          name:
            "Unarmed Strike",
          category: "weapon",
          weaponType:
            "Simple melee",
          damageDice: "1",
          attackAbility: "str",
          proficient: true
        }
      );
    record(
      "Phase 11: Tavern Brawler changes unarmed damage to the correct die",
      phase11UnarmedAttack
        .damageDice,
      "1d4"
    );

    createPhase10FeatSelection(
      "telepathic",
      {
        ability: [
          "Wisdom"
        ]
      }
    );
    const phase11TelepathySheetHtml =
      createCharacterSheetView()
        .renderCharacterSheetHtml(
          creatorState.draft,
          {
            activeTab: "main"
          }
        );
    record(
      "Phase 11: Telepathic displays its range and response restrictions",
      {
        range:
          phase11TelepathySheetHtml
            .includes(
              "60 ft."
            ),
        response:
          phase11TelepathySheetHtml
            .includes(
              "can respond only if it shares a language"
            )
      },
      {
        range: true,
        response: true
      }
    );

    createPhase10FeatSelection(
      "vigor-of-the-hill-giant",
      {
        ability: [
          "Constitution"
        ]
      }
    );
    record(
      "Phase 11: Vigor of the Hill Giant applies proficiency-based healing bonuses",
      {
        value:
          creatorState.draft
            .featMechanics
            .healingBonuses[0]
            ?.value,
        formula:
          creatorState.draft
            .featMechanics
            .healingBonuses[0]
            ?.formula,
        sources:
          creatorState.draft
            .featMechanics
            .healingBonuses[0]
            ?.sources
      },
      {
        value: 2,
        formula:
          "proficiencyBonus",
        sources: [
          "spell",
          "hitDie"
        ]
      }
    );

    const phase12FeatIds = [
      "bountiful-luck",
      "charger",
      "crossbow-expert",
      "defensive-duelist",
      "dungeon-delver",
      "grappler",
      "great-weapon-master",
      "healer",
      "inspiring-leader",
      "mage-slayer",
      "mounted-combatant",
      "polearm-master",
      "savage-attacker",
      "sentinel",
      "sharpshooter",
      "shield-master",
      "skulker",
      "war-caster"
    ];
    const phase12RuleEffects =
      DEFAULT_FEATS
        .filter((feat) => {
          return phase12FeatIds
            .includes(feat.id);
        })
        .flatMap((feat) => {
          return (
            Array.isArray(feat.effects)
              ? feat.effects
              : []
          )
            .filter((effect) => {
              return Boolean(
                effect?.handling
              );
            })
            .map((effect) => {
              return {
                featId: feat.id,
                ...effect
              };
            });
        });

    record(
      "Phase 12: situational feat effects are marked automatic, tracked, or manual",
      {
        reviewedFeats:
          new Set(
            phase12RuleEffects.map(
              (effect) => {
                return effect.featId;
              }
            )
          ).size,
        valid:
          phase12RuleEffects.every(
            (effect) => {
              return [
                "automatic",
                "tracked",
                "manual"
              ].includes(
                effect.handling
              );
            }
          )
      },
      {
        reviewedFeats: 18,
        valid: true
      }
    );

    record(
      "Phase 12: manual and tracked feat effects include clear use instructions",
      phase12RuleEffects
        .filter((effect) => {
          return effect.handling !==
            "automatic";
        })
        .every((effect) => {
          return (
            cleanString(
              effect.instructions
            ).length > 20 &&
            cleanString(
              effect.instructions
            ) !==
              cleanString(
                effect.summary
              )
          );
        }),
      true
    );

    record(
      "Phase 12: situational feat effects use action economy labels",
      {
        labels:
          uniqueCleanArray(
            phase12RuleEffects.map(
              (effect) => {
                return effect
                  .actionEconomy;
              }
            )
          ).sort(),
        valid:
          phase12RuleEffects.every(
            (effect) => {
              return [
                "action",
                "bonusAction",
                "reaction",
                "passive"
              ].includes(
                effect.actionEconomy
              );
            }
          )
      },
      {
        labels: [
          "action",
          "bonusAction",
          "passive",
          "reaction"
        ],
        valid: true
      }
    );

    record(
      "Phase 12: situational feat effects include recharge labels",
      phase12RuleEffects.every(
        (effect) => {
          return [
            "none",
            "turn",
            "shortOrLongRest"
          ].includes(
            effect.recharge
          );
        }
      ),
      true
    );

    createPhase10FeatSelection(
      "savage-attacker"
    );
    const phase12SavageResource =
      creatorState.draft
        .featMechanics
        .resources
        .find((entry) => {
          return entry.resourceId ===
            "savage-attacker-reroll";
        });
    const phase12SavageSpent =
      adjustSelectedFeatResource(
        phase12SavageResource?.id,
        -1
      );

    record(
      "Phase 12: applicable situational feat uses have a persistent counter",
      {
        maximum:
          phase12SavageResource
            ?.maximumUses,
        recharge:
          phase12SavageResource
            ?.recharge,
        spent:
          phase12SavageSpent,
        remaining:
          creatorState.draft
            .featMechanics
            .resources
            .find((entry) => {
              return entry.id ===
                phase12SavageResource
                  ?.id;
            })?.currentUses
      },
      {
        maximum: 1,
        recharge: "turn",
        spent: true,
        remaining: 0
      }
    );

    createPhase10FeatSelection(
      "shield-master"
    );
    const phase12SheetHtml =
      createCharacterSheetView()
        .renderCharacterSheetHtml(
          creatorState.draft,
          {
            activeTab: "main"
          }
        );

    record(
      "Phase 12: attack and defense sections display conditional feat summaries",
      {
        attack:
          phase12SheetHtml.includes(
            'data-feat-attack-conditions="true"'
          ) &&
          phase12SheetHtml.includes(
            "Shield Master Shove"
          ),
        defense:
          phase12SheetHtml.includes(
            "<h2>Feat Defenses</h2>"
          ) &&
          phase12SheetHtml.includes(
            "Shield Master Evasion"
          ),
        labels:
          phase12SheetHtml.includes(
            "Manual · Bonus action"
          ) &&
          phase12SheetHtml.includes(
            "Automatic · Passive"
          ),
        instructions:
          phase12SheetHtml.includes(
            "Use: After the Attack action"
          )
      },
      {
        attack: true,
        defense: true,
        labels: true,
        instructions: true
      }
    );

    const phase12ReviewExpectations = [
      {
        featId: "bountiful-luck",
        name: "Bountiful Luck",
        verify: (effects) => {
          return (
            effects.length === 1 &&
            effects[0]
              .actionEconomy ===
              "reaction" &&
            effects[0]
              .condition
              .includes("30 feet")
          );
        }
      },
      {
        featId: "charger",
        name: "Charger",
        verify: (effects) => {
          return (
            effects.length === 1 &&
            effects[0]
              .actionEconomy ===
              "bonusAction" &&
            effects[0]
              .instructions
              .includes("+5")
          );
        }
      },
      {
        featId: "crossbow-expert",
        name: "Crossbow Expert",
        verify: (effects) => {
          return (
            effects.length === 3 &&
            effects.filter(
              (entry) => {
                return entry
                  .handling ===
                  "automatic";
              }
            ).length === 2 &&
            effects.some(
              (entry) => {
                return entry
                  .actionEconomy ===
                  "bonusAction";
              }
            )
          );
        }
      },
      {
        featId: "defensive-duelist",
        name: "Defensive Duelist",
        verify: (effects) => {
          return (
            effects.length === 1 &&
            effects[0].section ===
              "defense" &&
            effects[0]
              .actionEconomy ===
              "reaction"
          );
        }
      },
      {
        featId: "dungeon-delver",
        name: "Dungeon Delver",
        verify: (effects) => {
          return (
            effects.length === 4 &&
            effects.every(
              (entry) => {
                return entry
                  .handling ===
                  "automatic";
              }
            ) &&
            effects.filter(
              (entry) => {
                return entry.section ===
                  "defense";
              }
            ).length === 2
          );
        }
      },
      {
        featId: "grappler",
        name: "Grappler",
        verify: (effects) => {
          return (
            effects.length === 2 &&
            effects.some(
              (entry) => {
                return entry
                  .actionEconomy ===
                  "action" &&
                  entry.instructions
                    .includes(
                      "both you and the target are restrained"
                    );
              }
            )
          );
        }
      },
      {
        featId: "great-weapon-master",
        name: "Great Weapon Master",
        verify: (effects) => {
          return (
            effects.length === 2 &&
            effects.some(
              (entry) => {
                return entry
                  .actionEconomy ===
                  "bonusAction";
              }
            ) &&
            effects.some(
              (entry) => {
                return entry
                  .instructions
                  .includes(
                    "Apply -5 to hit"
                  );
              }
            )
          );
        }
      },
      {
        featId: "healer",
        name: "Healer",
        verify: (effects) => {
          return (
            effects.length === 2 &&
            effects.some(
              (entry) => {
                return (
                  entry.usage
                    ?.scope ===
                    "perTarget" &&
                  entry.recharge ===
                    "shortOrLongRest"
                );
              }
            )
          );
        }
      },
      {
        featId: "inspiring-leader",
        name: "Inspiring Leader",
        verify: (effects) => {
          return (
            effects.length === 1 &&
            effects[0]
              .activationTime ===
              "10 minutes" &&
            effects[0].usage
              ?.scope ===
              "perTarget"
          );
        }
      },
      {
        featId: "mage-slayer",
        name: "Mage Slayer",
        verify: (effects) => {
          return (
            effects.length === 3 &&
            effects.some(
              (entry) => {
                return entry
                  .actionEconomy ===
                  "reaction";
              }
            ) &&
            effects.filter(
              (entry) => {
                return entry
                  .handling ===
                  "automatic";
              }
            ).length === 2
          );
        }
      },
      {
        featId: "mounted-combatant",
        name: "Mounted Combatant",
        verify: (effects) => {
          return (
            effects.length === 3 &&
            effects.filter(
              (entry) => {
                return entry.section ===
                  "defense";
              }
            ).length === 2 &&
            effects.some(
              (entry) => {
                return entry
                  .instructions
                  .includes(
                    "does not spend your reaction"
                  );
              }
            )
          );
        }
      },
      {
        featId: "polearm-master",
        name: "Polearm Master",
        verify: (effects) => {
          return (
            effects.length === 2 &&
            effects.map(
              (entry) => {
                return entry
                  .actionEconomy;
              }
            ).sort().join(",") ===
              "bonusAction,reaction"
          );
        }
      },
      {
        featId: "savage-attacker",
        name: "Savage Attacker",
        verify: (
          effects,
          resources
        ) => {
          return (
            effects.length === 1 &&
            effects[0].handling ===
              "tracked" &&
            resources.some(
              (entry) => {
                return (
                  entry.resourceId ===
                    "savage-attacker-reroll" &&
                  entry.maximumUses ===
                    1 &&
                  entry.recharge ===
                    "turn"
                );
              }
            )
          );
        }
      },
      {
        featId: "sentinel",
        name: "Sentinel",
        verify: (effects) => {
          return (
            effects.length === 3 &&
            effects.some(
              (entry) => {
                return entry
                  .actionEconomy ===
                  "reaction" &&
                  entry.condition
                    .includes(
                      "does not also have Sentinel"
                    );
              }
            )
          );
        }
      },
      {
        featId: "sharpshooter",
        name: "Sharpshooter",
        verify: (effects) => {
          return (
            effects.length === 3 &&
            effects.filter(
              (entry) => {
                return entry
                  .handling ===
                  "automatic";
              }
            ).length === 2 &&
            effects.some(
              (entry) => {
                return entry
                  .instructions
                  .includes(
                    "Apply -5 to hit"
                  );
              }
            )
          );
        }
      },
      {
        featId: "shield-master",
        name: "Shield Master",
        verify: (effects) => {
          return (
            effects.length === 3 &&
            effects.some(
              (entry) => {
                return entry
                  .actionEconomy ===
                  "bonusAction";
              }
            ) &&
            effects.some(
              (entry) => {
                return entry
                  .actionEconomy ===
                  "reaction" &&
                  entry.section ===
                    "defense";
              }
            )
          );
        }
      },
      {
        featId: "skulker",
        name: "Skulker",
        verify: (effects) => {
          return (
            effects.length === 3 &&
            effects.filter(
              (entry) => {
                return entry
                  .handling ===
                  "automatic";
              }
            ).length === 2 &&
            effects.some(
              (entry) => {
                return entry.effectId ===
                  "skulker-hide" &&
                  entry.handling ===
                    "manual";
              }
            )
          );
        }
      },
      {
        featId: "war-caster",
        name: "War Caster",
        verify: (effects) => {
          return (
            effects.length === 3 &&
            effects.filter(
              (entry) => {
                return entry
                  .handling ===
                  "automatic";
              }
            ).length === 2 &&
            effects.some(
              (entry) => {
                return (
                  entry.actionEconomy ===
                    "reaction" &&
                  entry.instructions
                    .includes(
                      "targets only the provoking creature"
                    )
                );
              }
            )
          );
        }
      }
    ];

    phase12ReviewExpectations
      .forEach((expectation) => {
        createPhase10FeatSelection(
          expectation.featId
        );
        const effects =
          creatorState.draft
            .featMechanics
            .situationalEffects;
        const resources =
          creatorState.draft
            .featMechanics
            .resources;

        record(
          `Phase 12: ${expectation.name} situational mechanics reviewed`,
          expectation.verify(
            effects,
            resources
          ),
          true
        );
      });

    const getPhase13Feat = (
      featId
    ) => {
      return DEFAULT_FEATS.find(
        (feat) => {
          return feat.id === featId;
        }
      );
    };

    const phase13AbilitySlot =
      createPhase9FighterAsiSlot({
        dex: 12
      });
    setSection12AsiMode(
      phase13AbilitySlot.id,
      "feat"
    );
    const phase13AbilityRejected =
      !setSection12AsiFeat(
        phase13AbilitySlot.id,
        "defensive-duelist"
      );
    creatorState.draft
      .abilities.base.dex = 13;
    recalculateAbilityTotals(
      creatorState.draft
    );
    const phase13AbilityAccepted =
      setSection12AsiFeat(
        phase13AbilitySlot.id,
        "defensive-duelist"
      );
    creatorState.draft
      .abilities.base.dex = 12;
    recalculateAbilityTotals(
      creatorState.draft
    );
    const phase13LostAbilityWarning =
      getSection17Warnings()
        .some((warning) => {
          return (
            warning.includes(
              "Defensive Duelist"
            ) &&
            warning.includes(
              "no longer meets its prerequisites"
            )
          );
        });

    record(
      "Phase 13: ability-score feat prerequisites are enforced and revalidated",
      {
        rejectedBelowMinimum:
          phase13AbilityRejected,
        acceptedAtMinimum:
          phase13AbilityAccepted,
        warnsAfterAbilityLoss:
          phase13LostAbilityWarning
      },
      {
        rejectedBelowMinimum: true,
        acceptedAtMinimum: true,
        warnsAfterAbilityLoss: true
      }
    );

    const phase13ArmorCharacter =
      createEmptyCharacter();
    const phase13ArmorFeat =
      getPhase13Feat(
        "moderately-armored"
      );
    const phase13ArmorWithout =
      getFeatPrerequisiteResult(
        phase13ArmorFeat,
        phase13ArmorCharacter
      );
    phase13ArmorCharacter
      .proficiencies.armor = [
        "Light Armor"
      ];
    const phase13ArmorWith =
      getFeatPrerequisiteResult(
        phase13ArmorFeat,
        phase13ArmorCharacter
      );

    record(
      "Phase 13: armor-proficiency feat prerequisites are enforced",
      {
        withoutProficiency:
          phase13ArmorWithout.met,
        withProficiency:
          phase13ArmorWith.met
      },
      {
        withoutProficiency: false,
        withProficiency: true
      }
    );

    const phase13WeaponCharacter =
      createEmptyCharacter();
    const phase13WeaponFeat =
      getPhase13Feat(
        "fighting-initiate"
      );
    const phase13WeaponWithout =
      getFeatPrerequisiteResult(
        phase13WeaponFeat,
        phase13WeaponCharacter
      );
    phase13WeaponCharacter
      .proficiencies.weapons = [
        "Martial Weapons"
      ];
    const phase13WeaponWith =
      getFeatPrerequisiteResult(
        phase13WeaponFeat,
        phase13WeaponCharacter
      );

    record(
      "Phase 13: weapon-proficiency feat prerequisites are enforced",
      {
        withoutProficiency:
          phase13WeaponWithout.met,
        withProficiency:
          phase13WeaponWith.met
      },
      {
        withoutProficiency: false,
        withProficiency: true
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    chooseSection12Class(
      "paladin"
    );
    const phase13SpellcastingFeat =
      getPhase13Feat(
        "war-caster"
      );
    const phase13PaladinOneResult =
      getFeatPrerequisiteResult(
        phase13SpellcastingFeat,
        creatorState.draft
      );
    creatorState.draft
      .magic.innateSpells = [
        {
          id:
            "phase13-innate-cantrip",
          spellId: "light"
        }
      ];
    const phase13InnateSpellResult =
      getFeatPrerequisiteResult(
        phase13SpellcastingFeat,
        creatorState.draft
      );

    record(
      "Phase 13: spellcasting prerequisites require actual spell access",
      {
        levelOnePaladin:
          phase13PaladinOneResult.met,
        innateSpell:
          phase13InnateSpellResult.met
      },
      {
        levelOnePaladin: false,
        innateSpell: true
      }
    );

    const phase13SpeciesCharacter =
      createEmptyCharacter();
    phase13SpeciesCharacter.species = {
      ...phase13SpeciesCharacter
        .species,
      id: "elf",
      name: "Elf",
      choices: {
        ...(
          phase13SpeciesCharacter
            .species?.choices ||
          {}
        ),
        subraceId: "high-elf"
      }
    };
    const phase13SpeciesFeat =
      getPhase13Feat(
        "drow-high-magic"
      );
    const phase13WrongSubrace =
      getFeatPrerequisiteResult(
        phase13SpeciesFeat,
        phase13SpeciesCharacter
      );
    phase13SpeciesCharacter
      .species.choices.subraceId =
        "drow";
    const phase13DrowSubrace =
      getFeatPrerequisiteResult(
        phase13SpeciesFeat,
        phase13SpeciesCharacter
      );

    record(
      "Phase 13: species and subrace feat prerequisites are enforced together",
      {
        highElf:
          phase13WrongSubrace.met,
        drow:
          phase13DrowSubrace.met
      },
      {
        highElf: false,
        drow: true
      }
    );

    const phase13ClassBackgroundFeat =
      getPhase13Feat(
        "initiate-of-high-sorcery"
      );
    const phase13ClassBackgroundEmpty =
      createEmptyCharacter();
    const phase13ClassBackgroundFail =
      getFeatPrerequisiteResult(
        phase13ClassBackgroundFeat,
        phase13ClassBackgroundEmpty
      );
    const phase13BackgroundCharacter =
      createEmptyCharacter();
    phase13BackgroundCharacter.background = {
      ...phase13BackgroundCharacter
        .background,
      id: "mage-of-high-sorcery",
      name: "Mage of High Sorcery"
    };
    const phase13BackgroundPass =
      getFeatPrerequisiteResult(
        phase13ClassBackgroundFeat,
        phase13BackgroundCharacter
      );
    creatorState.draft =
      createEmptyCharacter();
    chooseSection12Class(
      "wizard"
    );
    const phase13ClassPass =
      getFeatPrerequisiteResult(
        phase13ClassBackgroundFeat,
        creatorState.draft
      );

    record(
      "Phase 13: class-or-background feat prerequisites accept either path",
      {
        neither:
          phase13ClassBackgroundFail.met,
        background:
          phase13BackgroundPass.met,
        class:
          phase13ClassPass.met
      },
      {
        neither: false,
        background: true,
        class: true
      }
    );

    const phase13RequiredFeatCharacter =
      createEmptyCharacter();
    phase13RequiredFeatCharacter
      .classProgression.totalLevel = 4;
    phase13RequiredFeatCharacter
      .level = 4;
    const phase13RequiredFeat =
      getPhase13Feat(
        "baleful-scion"
      );
    const phase13RequiredFeatFail =
      getFeatPrerequisiteResult(
        phase13RequiredFeat,
        phase13RequiredFeatCharacter
      );
    phase13RequiredFeatCharacter.feats = [
      "scion-of-the-outer-planes"
    ];
    phase13RequiredFeatCharacter
      .selectedFeats = [
        "scion-of-the-outer-planes"
      ];
    const phase13RequiredFeatPass =
      getFeatPrerequisiteResult(
        phase13RequiredFeat,
        phase13RequiredFeatCharacter
      );

    record(
      "Phase 13: prerequisite-feat selections are enforced",
      {
        withoutRequiredFeat:
          phase13RequiredFeatFail.met,
        withRequiredFeat:
          phase13RequiredFeatPass.met
      },
      {
        withoutRequiredFeat: false,
        withRequiredFeat: true
      }
    );

    createPhase10FeatSelection(
      "initiate-of-high-sorcery",
      {
        moon: ["Nuitari"]
      }
    );
    const phase13BlackRobeResult =
      getFeatPrerequisiteResult(
        getPhase13Feat(
          "adept-of-the-black-robes"
        ),
        creatorState.draft
      );
    const phase13RedRobeResult =
      getFeatPrerequisiteResult(
        getPhase13Feat(
          "adept-of-the-red-robes"
        ),
        creatorState.draft
      );

    record(
      "Phase 13: prerequisite-feat choice combinations match the required value",
      {
        NuitariBlackRobes:
          phase13BlackRobeResult.met,
        NuitariRedRobes:
          phase13RedRobeResult.met
      },
      {
        NuitariBlackRobes: true,
        NuitariRedRobes: false
      }
    );

    const phase13SettingResult =
      getFeatPrerequisiteResult(
        getPhase13Feat(
          "aberrant-dragonmark"
        ),
        createEmptyCharacter()
      );

    record(
      "Phase 13: setting prerequisites use the explicit advisory policy",
      {
        met:
          phase13SettingResult.met,
        policy:
          phase13SettingResult
            .settingPolicy,
        settings:
          phase13SettingResult
            .settingRequirements,
        advisory:
          phase13SettingResult
            .advisories
            .some((message) => {
              return message.includes(
                "advisory; not enforced"
              );
            })
      },
      {
        met: true,
        policy: "advisory",
        settings: ["Eberron"],
        advisory: true
      }
    );

    const phase13SettingDisplaySlot =
      createPhase9FighterAsiSlot();
    setSection12AsiMode(
      phase13SettingDisplaySlot.id,
      "feat"
    );
    const phase13SettingDisplayHtml =
      renderSection12CompactAsiChoice(
        phase13SettingDisplaySlot
      );

    record(
      "Phase 13: setting requirements are displayed instead of silently accepted",
      {
        setting:
          phase13SettingDisplayHtml
            .includes(
              "Setting:</b> Eberron"
            ),
        policy:
          phase13SettingDisplayHtml
            .includes(
              "advisory; not enforced"
            )
      },
      {
        setting: true,
        policy: true
      }
    );

    const createPhase13WizardSlots =
      () => {
        creatorState.draft =
          createEmptyCharacter();
        chooseSection12Class(
          "wizard"
        );

        for (
          let levelIndex = 1;
          levelIndex < 8;
          levelIndex += 1
        ) {
          addCharacterLevelToClass(
            0
          );
        }

        return getUnlockedFeatChoiceSlots(
          creatorState.draft
        )
          .filter((slot) => {
            return (
              slot.classId ===
              "wizard"
            );
          })
          .sort((a, b) => {
            return (
              a.classLevel -
              b.classLevel
            );
          });
      };

    const phase13ElementalSlots =
      createPhase13WizardSlots();
    phase13ElementalSlots
      .forEach((slot) => {
        setSection12AsiMode(
          slot.id,
          "feat"
        );
      });
    const phase13ElementalFirst =
      setSection12AsiFeat(
        phase13ElementalSlots[0].id,
        "elemental-adept"
      ) &&
      setSection12FeatChoiceValues(
        phase13ElementalSlots[0].id,
        "damage-type",
        ["Fire"]
      );
    const phase13ElementalSecond =
      setSection12AsiFeat(
        phase13ElementalSlots[1].id,
        "elemental-adept"
      ) &&
      setSection12FeatChoiceValues(
        phase13ElementalSlots[1].id,
        "damage-type",
        ["Cold"]
      );

    record(
      "Phase 13: Elemental Adept repeats only with a different damage type",
      {
        ruleset:
          ACTIVE_RULESET
            .featRepeatability
            .elementalAdept,
        first:
          phase13ElementalFirst,
        second:
          phase13ElementalSecond,
        damageTypes:
          uniqueCleanArray(
            creatorState.draft
              .featMechanics
              .elementalAdepts
              .map((entry) => {
                return entry
                  .damageType;
              })
          ).sort()
      },
      {
        ruleset:
          "repeat-by-damage-type",
        first: true,
        second: true,
        damageTypes: [
          "cold",
          "fire"
        ]
      }
    );

    const phase13MagicInitiateSlots =
      createPhase13WizardSlots();
    phase13MagicInitiateSlots
      .forEach((slot) => {
        setSection12AsiMode(
          slot.id,
          "feat"
        );
      });
    const phase13MagicInitiateFirst =
      setSection12AsiFeat(
        phase13MagicInitiateSlots[0].id,
        "magic-initiate"
      );
    const phase13MagicInitiateSecond =
      setSection12AsiFeat(
        phase13MagicInitiateSlots[1].id,
        "magic-initiate"
      );

    record(
      "Phase 13: Magic Initiate repeatability follows the selected 2014 rules edition",
      {
        edition:
          ACTIVE_RULESET.edition,
        policy:
          ACTIVE_RULESET
            .featRepeatability
            .magicInitiate,
        repeatable:
          getPhase13Feat(
            "magic-initiate"
          ).repeatable,
        first:
          phase13MagicInitiateFirst,
        second:
          phase13MagicInitiateSecond
      },
      {
        edition: "2014",
        policy:
          "single-selection",
        repeatable: false,
        first: true,
        second: false
      }
    );

    const phase13AlertSlots =
      createPhase13WizardSlots();
    phase13AlertSlots
      .forEach((slot) => {
        setSection12AsiMode(
          slot.id,
          "feat"
        );
      });
    const phase13AlertFirst =
      setSection12AsiFeat(
        phase13AlertSlots[0].id,
        "alert"
      );
    const phase13AlertSecond =
      setSection12AsiFeat(
        phase13AlertSlots[1].id,
        "alert"
      );

    record(
      "Phase 13: non-repeatable feats cannot be selected twice",
      {
        first:
          phase13AlertFirst,
        second:
          phase13AlertSecond
      },
      {
        first: true,
        second: false
      }
    );

    const phase13ChoiceSlots =
      createPhase13WizardSlots();
    phase13ChoiceSlots
      .forEach((slot) => {
        setSection12AsiMode(
          slot.id,
          "feat"
        );
        setSection12AsiFeat(
          slot.id,
          "elemental-adept"
        );
      });
    const phase13FirstFire =
      setSection12FeatChoiceValues(
        phase13ChoiceSlots[0].id,
        "damage-type",
        ["Fire"]
      );
    const phase13DuplicateFire =
      setSection12FeatChoiceValues(
        phase13ChoiceSlots[1].id,
        "damage-type",
        ["Fire"]
      );
    const phase13DistinctCold =
      setSection12FeatChoiceValues(
        phase13ChoiceSlots[1].id,
        "damage-type",
        ["Cold"]
      );
    const phase13SecondChoice =
      getSection12AsiChoiceState(
        phase13ChoiceSlots[1].id
      );
    const phase13DamageChoice =
      getPhase13Feat(
        "elemental-adept"
      ).choices.find((choice) => {
        return (
          choice.id ===
          "damage-type"
        );
      });
    const phase13SecondOptions =
      getSection12FeatChoiceOptions(
        phase13DamageChoice,
        phase13SecondChoice
      ).map((option) => {
        return option.value;
      });

    record(
      "Phase 13: repeated feat choice values are rejected and hidden",
      {
        first:
          phase13FirstFire,
        duplicate:
          phase13DuplicateFire,
        distinct:
          phase13DistinctCold,
        fireAvailable:
          phase13SecondOptions
            .includes("Fire")
      },
      {
        first: true,
        duplicate: false,
        distinct: true,
        fireAvailable: false
      }
    );

    const phase13DuplicateChoiceImport =
      cloneData(
        creatorState.draft
      );
    phase13DuplicateChoiceImport
      .classProgression.classes
      .forEach((classEntry) => {
        classEntry.choices = {
          ...(
            classEntry.choices ||
            {}
          ),
          classFeatures: {}
        };
      });
    phase13DuplicateChoiceImport
      .classChoices = {};
    phase13DuplicateChoiceImport
      .advancementChoices =
        normalizeAdvancementChoices(
          phase13DuplicateChoiceImport
            .advancementChoices
        ).map((choice) => {
          if (
            choice.featId !==
            "elemental-adept"
          ) {
            return choice;
          }

          return {
            ...choice,
            mode: "feat",
            featId:
              "elemental-adept",
            featName:
              "Elemental Adept",
            featChoices: {
              "damage-type": [
                "Fire"
              ]
            }
          };
        });
    const phase13CleanedImport =
      normalizeCharacter(
        phase13DuplicateChoiceImport
      );
    const phase13CleanedElementalCount =
      getSelectedDefaultFeatInstances(
        phase13CleanedImport
      ).filter((instance) => {
        return (
          instance.featId ===
          "elemental-adept"
        );
      }).length;
    const phase13CleanupWarning =
      cleanArray(
        phase13CleanedImport
          .builder
          .validation
          .migrationWarnings
      ).some((warning) => {
        return (
          warning.includes(
            "Duplicate feat choice detected: Elemental Adept (Fire)"
          ) &&
          warning.includes(
            "different choices"
          )
        );
      });

    record(
      "Phase 13: migration cleans duplicate repeat-by-choice feat selections",
      {
        remaining:
          phase13CleanedElementalCount,
        warning:
          phase13CleanupWarning
      },
      {
        remaining: 1,
        warning: true
      }
    );

    const phase13CatalogErrors =
      validateFeatPrerequisiteDefinitions(
        DEFAULT_FEATS
      );
    const phase13UnsupportedFeat = {
      id:
        "phase13-unsupported-prerequisite",
      name:
        "Phase 13 Unsupported Prerequisite",
      prerequisites: [
        {
          type:
            "unsupportedPhase13"
        }
      ]
    };
    const phase13UnsupportedErrors =
      validateFeatPrerequisiteDefinitions(
        [
          phase13UnsupportedFeat
        ]
      );
    const phase13UnsupportedRuntime =
      getFeatPrerequisiteResult(
        phase13UnsupportedFeat,
        createEmptyCharacter()
      );

    record(
      "Phase 13: prerequisite validator rejects unsupported types",
      {
        catalogErrors:
          phase13CatalogErrors.length,
        fixtureErrors:
          phase13UnsupportedErrors
            .length,
        runtimeAccepted:
          phase13UnsupportedRuntime.met,
        errorNamesType:
          phase13UnsupportedErrors
            .some((error) => {
              return error.includes(
                "unsupportedPhase13"
              );
            })
      },
      {
        catalogErrors: 0,
        fixtureErrors: 1,
        runtimeAccepted: false,
        errorNamesType: true
      }
    );

    const phase14Species =
      DEFAULT_SPECIES_TEMPLATES;
    const phase14Subraces =
      phase14Species.flatMap((species) => {
        return Array.isArray(species.subraces)
          ? species.subraces
          : [];
      });
    const phase14SpeciesTraits =
      phase14Species.flatMap((species) => {
        return [
          ...(
            Array.isArray(species.traits)
              ? species.traits
              : []
          ),
          ...(
            Array.isArray(species.subraces)
              ? species.subraces
              : []
          ).flatMap((subrace) => {
            return Array.isArray(subrace.traits)
              ? subrace.traits
              : [];
          })
        ];
      });
    const phase14Backgrounds =
      DEFAULT_BACKGROUND_TEMPLATES;
    const phase14BackgroundFeatures =
      phase14Backgrounds.flatMap(
        (background) => {
          return Array.isArray(
            background.features
          )
            ? background.features
            : [];
        }
      );
    const phase14HasFullDescription =
      (record) => {
        const description = String(
          record?.description ||
          ""
        ).trim();

        return (
          description.length >= 80 &&
          !/placeholder|coming soon|\btodo\b|\btbd\b/i
            .test(description)
        );
      };
    const phase14HasMetadata =
      (record) => {
        return (
          record?.rulesetId ===
            ACTIVE_RULESET.id &&
          record?.rulesEdition ===
            ACTIVE_RULESET.edition &&
          Boolean(
            String(
              record?.sourceLabel ||
              ""
            ).trim()
          ) &&
          Boolean(
            String(
              record?.sourceType ||
              ""
            ).trim()
          )
        );
      };
    const phase14SameValue =
      (actual, expected) => {
        return (
          JSON.stringify(actual ?? {}) ===
          JSON.stringify(expected ?? {})
        );
      };

    record(
      "Phase 14: all nine built-in species have full descriptions",
      {
        ids:
          phase14Species.map(
            (species) => species.id
          ),
        fullyDescribed:
          phase14Species.every(
            phase14HasFullDescription
          )
      },
      {
        ids: [
          ...BUILTIN_SPECIES_IDS_2014
        ],
        fullyDescribed: true
      }
    );

    record(
      "Phase 14: every built-in species trait has a full description",
      {
        traitCount:
          phase14SpeciesTraits.length,
        fullyDescribed:
          phase14SpeciesTraits.every(
            phase14HasFullDescription
          )
      },
      {
        traitCount:
          phase14SpeciesTraits.length,
        fullyDescribed: true
      }
    );

    record(
      "Phase 14: every built-in subrace has a full description",
      {
        ids:
          phase14Subraces.map(
            (subrace) => subrace.id
          ),
        fullyDescribed:
          phase14Subraces.every(
            phase14HasFullDescription
          )
      },
      {
        ids: Object.keys(
          BUILTIN_SUBRACE_2014_EXPECTATIONS
        ),
        fullyDescribed: true
      }
    );

    record(
      "Phase 14: species, subrace, trait, background, and feature metadata is complete",
      {
        ruleset:
          ACTIVE_RULESET.id,
        edition:
          ACTIVE_RULESET.edition,
        allLabeled: [
          ...phase14Species,
          ...phase14Subraces,
          ...phase14SpeciesTraits,
          ...phase14Backgrounds,
          ...phase14BackgroundFeatures
        ].every(phase14HasMetadata)
      },
      {
        ruleset: "dnd5e-2014",
        edition: "2014",
        allLabeled: true
      }
    );

    record(
      "Phase 14: fixed 2014 species and subrace ability bonuses match the catalog",
      {
        species:
          phase14Species.every(
            (species) => {
              return phase14SameValue(
                species.abilityBonuses,
                BUILTIN_SPECIES_2014_EXPECTATIONS[
                  species.id
                ]?.abilityBonuses
              );
            }
          ),
        subraces:
          phase14Subraces.every(
            (subrace) => {
              return phase14SameValue(
                subrace.abilityBonuses,
                BUILTIN_SUBRACE_2014_EXPECTATIONS[
                  subrace.id
                ]?.abilityBonuses
              );
            }
          )
      },
      {
        species: true,
        subraces: true
      }
    );

    const phase14CatalogErrors =
      validateBuiltinSpeciesBackgroundCatalog(
        {
          species:
            phase14Species,
          backgrounds:
            phase14Backgrounds,
          equipmentPackages:
            DEFAULT_BACKGROUND_EQUIPMENT_PACKAGES
        }
      );

    record(
      "Phase 14: species size, speed, languages, proficiencies, and resistances are validated",
      {
        catalogErrors:
          phase14CatalogErrors.length,
        catalogErrorMessages:
          phase14CatalogErrors,
        coversEverySpecies:
          Object.keys(
            BUILTIN_SPECIES_2014_EXPECTATIONS
          ).length
      },
      {
        catalogErrors: 0,
        catalogErrorMessages: [],
        coversEverySpecies: 9
      }
    );

    record(
      "Phase 14: all 13 built-in backgrounds have full descriptions",
      {
        ids:
          phase14Backgrounds.map(
            (background) => background.id
          ),
        fullyDescribed:
          phase14Backgrounds.every(
            phase14HasFullDescription
          )
      },
      {
        ids: [
          ...BUILTIN_BACKGROUND_IDS_2014
        ],
        fullyDescribed: true
      }
    );

    record(
      "Phase 14: every built-in background feature has a full description",
      {
        featureCount:
          phase14BackgroundFeatures.length,
        fullyDescribed:
          phase14BackgroundFeatures.every(
            phase14HasFullDescription
          )
      },
      {
        featureCount: 13,
        fullyDescribed: true
      }
    );

    record(
      "Phase 14: background skill choices match the fixed catalog",
      phase14Backgrounds.every(
        (background) => {
          const expected =
            BUILTIN_BACKGROUND_2014_EXPECTATIONS[
              background.id
            ];

          return (
            background.skillChoices?.choose ===
              expected.skills.length &&
            phase14SameValue(
              background.skillChoices?.from,
              expected.skills
            )
          );
        }
      ),
      true
    );

    record(
      "Phase 14: background tool choices match the fixed catalog",
      phase14Backgrounds.every(
        (background) => {
          return phase14SameValue(
            background.toolChoices,
            BUILTIN_BACKGROUND_2014_EXPECTATIONS[
              background.id
            ]?.toolChoices
          );
        }
      ),
      true
    );

    record(
      "Phase 14: background language choices match the fixed catalog",
      phase14Backgrounds.every(
        (background) => {
          return phase14SameValue(
            background.languageChoices,
            BUILTIN_BACKGROUND_2014_EXPECTATIONS[
              background.id
            ]?.languageChoices
          );
        }
      ),
      true
    );

    record(
      "Phase 14: every background equipment package is available and populated",
      phase14Backgrounds.every(
        (background) => {
          const packageId =
            BUILTIN_BACKGROUND_2014_EXPECTATIONS[
              background.id
            ]?.packageId;
          const equipmentPackage =
            DEFAULT_BACKGROUND_EQUIPMENT_PACKAGES
              .find((entry) => {
                return entry.id === packageId;
              });

          return (
            background.equipmentPackageIds
              ?.includes(packageId) &&
            Array.isArray(
              equipmentPackage?.items
            ) &&
            equipmentPackage.items.length >
              0
          );
        }
      ),
      true
    );

    record(
      "Phase 14: additional published species and backgrounds follow the documented extension policy",
      {
        bundled:
          ACTIVE_RULESET
            .speciesBackgroundCatalog
            ?.additionalPublishedContent,
        extensions:
          ACTIVE_RULESET
            .speciesBackgroundCatalog
            ?.extensionPolicy
      },
      {
        bundled: "not-bundled",
        extensions:
          "custom-or-room-content-with-source-labels"
      }
    );

    const phase15SpellAudit =
      validateDefaultSpellCatalog(
        DEFAULT_SPELLS,
        {
          feats: DEFAULT_FEATS,
          subclasses:
            DEFAULT_SUBCLASSES
        }
      );
    const phase15SrdSpells =
      DEFAULT_SPELLS.filter((spell) => {
        return spell.sourceType === "srd";
      });
    const phase15AdditionalCantrips =
      ADDITIONAL_CANTRIP_IDS_2014
        .map((spellId) => {
          return DEFAULT_SPELLS.find(
            (spell) => {
              return spell.id === spellId;
            }
          );
        })
        .filter(Boolean);

    record(
      "Phase 15: all 319 SRD spells remain validated",
      {
        configured:
          SRD_SPELL_COUNT_2014,
        cataloged:
          phase15SrdSpells.length,
        auditErrors:
          phase15SpellAudit.errors
      },
      {
        configured: 319,
        cataloged: 319,
        auditErrors: []
      }
    );

    record(
      "Phase 15: all 21 additional cantrips are reviewed",
      {
        configured:
          ADDITIONAL_CANTRIP_COUNT_2014,
        ids:
          phase15AdditionalCantrips
            .map((spell) => spell.id),
        fullyDescribed:
          phase15AdditionalCantrips
            .every((spell) => {
              return (
                String(
                  spell.description ||
                  ""
                ).length >= 100 &&
                spell.level === 0
              );
            })
      },
      {
        configured: 21,
        ids: [
          ...ADDITIONAL_CANTRIP_IDS_2014
        ],
        fullyDescribed: true
      }
    );

    record(
      "Phase 15: every spell class list matches its canonical catalog entry",
      {
        valid:
          phase15SpellAudit.valid,
        additionalCantripsMatch:
          phase15AdditionalCantrips
            .every((spell) => {
              return (
                JSON.stringify(
                  spell.classes
                ) ===
                JSON.stringify(
                  ADDITIONAL_CANTRIP_EXPECTATIONS_2014[
                    spell.id
                  ]?.classes
                )
              );
            })
      },
      {
        valid: true,
        additionalCantripsMatch: true
      }
    );

    record(
      "Phase 15: every spell level and level key is valid",
      DEFAULT_SPELLS.every(
        (spell) => {
          return (
            Number.isInteger(
              spell.level
            ) &&
            spell.level >= 0 &&
            spell.level <= 9 &&
            spell.levelKey ===
              (
                spell.level === 0
                  ? "cantrip"
                  : `level${spell.level}`
              )
          );
        }
      ),
      true
    );

    record(
      "Phase 15: every spell school is valid",
      DEFAULT_SPELLS.every(
        (spell) => {
          return [
            "abjuration",
            "conjuration",
            "divination",
            "enchantment",
            "evocation",
            "illusion",
            "necromancy",
            "transmutation"
          ].includes(spell.school);
        }
      ),
      true
    );

    record(
      "Phase 15: every spell has a verified casting time",
      DEFAULT_SPELLS.every(
        (spell) => {
          return Boolean(
            String(
              spell.castingTime ||
              ""
            ).trim()
          );
        }
      ),
      true
    );

    record(
      "Phase 15: every spell has a verified range",
      DEFAULT_SPELLS.every(
        (spell) => {
          return Boolean(
            String(
              spell.range ||
              ""
            ).trim()
          );
        }
      ),
      true
    );

    record(
      "Phase 15: every spell component and material requirement is valid",
      {
        valid:
          DEFAULT_SPELLS.every(
            (spell) => {
              const components =
                spell.components ||
                {};

              return (
                [
                  components.verbal,
                  components.somatic,
                  components.material
                ].every((value) => {
                  return typeof value ===
                    "boolean";
                }) &&
                (
                  components.verbal ||
                  components.somatic ||
                  components.material
                ) &&
                components.material ===
                  Boolean(
                    String(
                      components
                        .materialText ||
                      ""
                    ).trim()
                  )
              );
            }
          ),
        materialSpells:
          DEFAULT_SPELLS.filter(
            (spell) => {
              return spell.components
                .material;
            }
          ).length
      },
      {
        valid: true,
        materialSpells: 189
      }
    );

    record(
      "Phase 15: duration and concentration metadata is complete",
      {
        valid:
          DEFAULT_SPELLS.every(
            (spell) => {
              return (
                Boolean(
                  String(
                    spell.duration ||
                    ""
                  ).trim()
                ) &&
                typeof spell
                  .concentration ===
                  "boolean"
              );
            }
          ),
        concentrationSpells:
          DEFAULT_SPELLS.filter(
            (spell) => {
              return spell
                .concentration;
            }
          ).length
      },
      {
        valid: true,
        concentrationSpells: 128
      }
    );

    record(
      "Phase 15: ritual status is verified for every spell",
      {
        valid:
          DEFAULT_SPELLS.every(
            (spell) => {
              return typeof spell.ritual ===
                "boolean";
            }
          ),
        rituals:
          DEFAULT_SPELLS.filter(
            (spell) => spell.ritual
          ).length
      },
      {
        valid: true,
        rituals: 29
      }
    );

    record(
      "Phase 15: attack and saving-throw metadata is verified",
      {
        spellAttacks:
          DEFAULT_SPELLS.filter(
            (spell) => {
              return [
                "melee",
                "ranged"
              ].includes(
                spell.attackType
              );
            }
          ).length,
        weaponAttacks:
          DEFAULT_SPELLS.filter(
            (spell) => {
              return spell.attackType
                .includes("weapon");
            }
          ).length,
        savingThrows:
          DEFAULT_SPELLS.filter(
            (spell) => {
              return Boolean(
                spell.saveAbility
              );
            }
          ).length
      },
      {
        spellAttacks: 18,
        weaponAttacks: 2,
        savingThrows: 103
      }
    );

    const phase15DamageSpells =
      DEFAULT_SPELLS.filter(
        (spell) => {
          return spell.damage.length;
        }
      );

    record(
      "Phase 15: damage scaling metadata is verified",
      {
        damageSpells:
          phase15DamageSpells.length,
        scaled:
          phase15DamageSpells.every(
            (spell) => {
              return (
                Object.keys(
                  spell.scaling
                    .atCharacterLevel
                ).length > 0 ||
                Object.keys(
                  spell.scaling
                    .atSlotLevel
                ).length > 0
              );
            }
          ),
        characterScaling:
          DEFAULT_SPELLS.filter(
            (spell) => {
              return Object.keys(
                spell.scaling
                  .atCharacterLevel
              ).length > 0;
            }
          ).length
      },
      {
        damageSpells: 80,
        scaled: true,
        characterScaling: 24
      }
    );

    const phase15HealingSpells =
      DEFAULT_SPELLS.filter(
        (spell) => {
          return spell.healing.length;
        }
      );

    record(
      "Phase 15: healing scaling metadata is verified",
      {
        healingSpells:
          phase15HealingSpells.length,
        scaled:
          phase15HealingSpells.every(
            (spell) => {
              return Object.keys(
                spell.scaling
                  .healingAtSlotLevel
              ).length > 0;
            }
          )
      },
      {
        healingSpells: 10,
        scaled: true
      }
    );

    record(
      "Phase 15: higher-level spell effects are preserved",
      {
        higherLevelSpells:
          DEFAULT_SPELLS.filter(
            (spell) => {
              return Boolean(
                spell
                  .higherLevelDescription
              );
            }
          ).length,
        synchronized:
          DEFAULT_SPELLS.every(
            (spell) => {
              return (
                spell
                  .higherLevelDescription ===
                spell.scaling
                  .higherLevelDescription
              );
            }
          )
      },
      {
        higherLevelSpells: 90,
        synchronized: true
      }
    );

    record(
      "Phase 15: every spell has edition and source labels",
      {
        srd:
          phase15SrdSpells.length,
        additional:
          DEFAULT_SPELLS.filter(
            (spell) => {
              return (
                spell.sourceType ===
                "legacy-non-srd"
              );
            }
          ).length,
        labeled:
          DEFAULT_SPELLS.every(
            (spell) => {
              return (
                spell.rulesetId ===
                  ACTIVE_RULESET.id &&
                spell.rulesEdition ===
                  ACTIVE_RULESET.edition &&
                Boolean(
                  spell.sourceLabel
                )
              );
            }
          )
      },
      {
        srd: 319,
        additional: 21,
        labeled: true
      }
    );

    const phase15References =
      validateDefaultSpellReferences({
        spells: DEFAULT_SPELLS,
        feats: DEFAULT_FEATS,
        subclasses:
          DEFAULT_SUBCLASSES
      });
    const phase15BrokenReferenceFixture =
      validateDefaultSpellReferences({
        spells: DEFAULT_SPELLS,
        feats: [
          {
            id:
              "phase15-broken-spell",
            effects: [
              {
                spellId:
                  "missing-phase15-spell"
              }
            ]
          }
        ]
      });

    record(
      "Phase 15: broken feat and subclass spell IDs are detected",
      {
        catalogValid:
          phase15References.valid,
        references:
          phase15References
            .referenceCount,
        inlineFallbacks:
          phase15References
            .inlineFallbackCount,
        rejectsBrokenFixture:
          (
            !phase15BrokenReferenceFixture
              .valid &&
            phase15BrokenReferenceFixture
              .errors.some((error) => {
                return error.includes(
                  "missing-phase15-spell"
                );
              })
          )
      },
      {
        catalogValid: true,
        references: 399,
        inlineFallbacks: 46,
        rejectsBrokenFixture: true
      }
    );

    const phase16Character =
      createEmptyCharacter();
    phase16Character.id =
      "phase16-character";
    phase16Character.identity = {
      ...phase16Character.identity,
      name: "Aria Phase Sixteen",
      pronouns: "she/her",
      image: {
        url:
          "https://example.com/phase16-portrait.png",
        publicId:
          "phase16-portrait"
      }
    };
    phase16Character.species = {
      ...phase16Character.species,
      id: "tiefling",
      name: "Tiefling",
      resistances: [
        "fire"
      ],
      senses: [
        {
          sense: "darkvision",
          range: 60
        }
      ]
    };
    phase16Character.background = {
      ...phase16Character.background,
      id: "sage",
      name: "Sage",
      backstory:
        "Aria studies magic and martial traditions."
    };
    phase16Character.classProgression = {
      totalLevel: 7,
      classes: [
        {
          entryId:
            "phase16-fighter",
          classId: "fighter",
          className: "Fighter",
          subclassId: "champion",
          subclassName: "Champion",
          level: 3
        },
        {
          entryId:
            "phase16-wizard",
          classId: "wizard",
          className: "Wizard",
          subclassId: "evocation",
          subclassName:
            "School of Evocation",
          level: 2
        },
        {
          entryId:
            "phase16-warlock",
          classId: "warlock",
          className: "Warlock",
          subclassId: "fiend",
          subclassName: "The Fiend",
          level: 2
        }
      ],
      levelOrder: [
        "phase16-fighter",
        "phase16-fighter",
        "phase16-wizard",
        "phase16-fighter",
        "phase16-wizard",
        "phase16-warlock",
        "phase16-warlock"
      ],
      unarmoredDefenseSource:
        null
    };
    phase16Character.abilities.scores = {
      str: 16,
      dex: 14,
      con: 14,
      int: 18,
      wis: 12,
      cha: 13
    };
    phase16Character.abilities.modifiers = {
      str: 3,
      dex: 2,
      con: 2,
      int: 4,
      wis: 1,
      cha: 1
    };
    phase16Character.proficiencies = {
      ...phase16Character
        .proficiencies,
      savingThrows: [
        "Strength",
        "Constitution"
      ],
      skills: {
        perception: {
          proficient: true,
          expertise: true
        },
        investigation: {
          proficient: true
        },
        insight: {
          proficient: false
        }
      },
      armor: [
        "Light armor",
        "Medium armor",
        "Shields"
      ],
      weapons: [
        "Simple weapons",
        "Martial weapons"
      ],
      tools: [
        "Calligrapher's supplies"
      ],
      languages: [
        "Common",
        "Infernal",
        "Draconic"
      ]
    };
    phase16Character.combat = {
      ...phase16Character.combat,
      armorClass: 19,
      selectedArmorClassMethod:
        "armor:phase16-plate",
      armorClassOptions: {
        selected: {
          id:
            "armor:phase16-plate",
          label:
            "Heavy Armor: Plate",
          total: 19,
          breakdown:
            "Plate 18 + Defense fighting style 1"
        },
        options: [
          {
            id:
              "armor:phase16-plate",
            label:
              "Heavy Armor: Plate",
            total: 19,
            breakdown:
              "Plate 18 + Defense fighting style 1"
          },
          {
            id: "unarmored",
            label: "Unarmored",
            total: 12,
            breakdown:
              "10 + Dexterity 2"
          }
        ]
      },
      maxHp: 52,
      currentHp: 31,
      temporaryHp: 4,
      proficiencyBonus: 3,
      attacksPerAction: 2,
      speed: {
        walk: 30,
        climb: 15,
        swim: 0,
        fly: 0,
        burrow: 0,
        special: ""
      },
      hitDice: [
        {
          classEntryId:
            "phase16-fighter",
          classId: "fighter",
          className: "Fighter",
          die: "d10",
          count: 3
        },
        {
          classEntryId:
            "phase16-wizard",
          classId: "wizard",
          className: "Wizard",
          die: "d6",
          count: 2
        },
        {
          classEntryId:
            "phase16-warlock",
          classId: "warlock",
          className: "Warlock",
          die: "d8",
          count: 2
        }
      ],
      hitDiceUsage: {
        "phase16-fighter": 2,
        "phase16-wizard": 1,
        "phase16-warlock": 1
      },
      hpCalculation: {
        ...phase16Character
          .combat.hpCalculation,
        mode: "fixed"
      }
    };
    phase16Character.attacks = [
      {
        id:
          "phase16-longsword",
        name: "Longsword",
        attackBonus: 7,
        damage: "1d8 + 4 slashing",
        notes: "versatile 1d10"
      }
    ];
    phase16Character.classMechanics = {
      ...phase16Character
        .classMechanics,
      resources: [
        {
          id:
            "phase16-action-surge",
          canonicalId:
            "action-surge",
          name: "Action Surge",
          currentUses: 0,
          maximumUses: 1,
          recharge:
            "shortOrLongRest"
        },
        {
          id:
            "phase16-arcane-recovery",
          canonicalId:
            "arcane-recovery",
          name: "Arcane Recovery",
          currentUses: 0,
          maximumUses: 1,
          recharge:
            "longRest"
        }
      ],
      passiveEffects: [
        {
          id:
            "phase16-defense-style",
          name:
            "Defense Fighting Style",
          summary:
            "Gain +1 AC while wearing armor.",
          className: "Fighter"
        }
      ]
    };
    phase16Character.featMechanics = {
      ...phase16Character
        .featMechanics,
      resources: [
        {
          id:
            "phase16-lucky",
          kind: "feat",
          name: "Luck Points",
          featName: "Lucky",
          currentUses: 1,
          maximumUses: 3,
          recharge:
            "longRest"
        }
      ],
      instances: [
        {
          id:
            "phase16-lucky-instance",
          featId: "lucky",
          featName: "Lucky",
          featSummary:
            "Spend luck points to alter important d20 rolls.",
          featDescription:
            "You have inexplicable luck that seems to kick in at just the right moment. Track each use and restore the pool after a long rest.",
          choices: {
            "example-choice": [
              "Fortune"
            ]
          },
          sourceLabel:
            "Legacy 5e supplement (non-SRD)"
        }
      ],
      resistances: [
        "cold"
      ],
      senses: [
        {
          sense: "darkvision",
          range: 120
        }
      ],
      situationalEffects: [
        {
          id:
            "phase16-lucky-reminder",
          effectId:
            "lucky-reminder",
          featName: "Lucky",
          handling: "manual",
          actionEconomy: "reaction",
          recharge: "longRest",
          summary:
            "Decide whether to spend a luck point after seeing the roll.",
          instructions:
            "Use this reminder when an eligible d20 roll is made."
        }
      ]
    };
    phase16Character.features = {
      ...phase16Character.features,
      classFeatures: [
        {
          id:
            "phase16-action-surge-feature",
          name: "Action Surge",
          summary:
            "Take one additional action.",
          description:
            "On your turn, you can take one additional action on top of your regular action and a possible bonus action.",
          source: "class",
          sourceLabel: "SRD 5.1"
        },
        {
          id:
            "phase16-improved-critical",
          name:
            "Improved Critical",
          summary:
            "Weapon attacks score a critical hit on 19 or 20.",
          description:
            "Your weapon attacks score a critical hit on a roll of 19 or 20.",
          source: "subclass",
          sourceLabel:
            "Legacy 5e supplement (non-SRD)"
        }
      ]
    };
    phase16Character.feats = [
      {
        id: "lucky",
        name: "Lucky",
        summary:
          "Spend luck points to influence rolls.",
        description:
          "You have inexplicable luck that can change attack rolls, ability checks, and saving throws.",
        choices: {
          "example-choice": [
            "Fortune"
          ]
        },
        sourceLabel:
          "Legacy 5e supplement (non-SRD)"
      }
    ];
    phase16Character.magic = {
      ...phase16Character.magic,
      slots: {
        1: 4,
        2: 3,
        3: 2
      },
      slotUsage: {
        normal: {
          1: 1,
          2: 2,
          3: 0
        },
        pact: 1,
        pactSources: {
          "phase16-warlock": 1
        }
      },
      classSources: {
        "phase16-wizard": {
          classEntryId:
            "phase16-wizard",
          classId: "wizard",
          className: "Wizard",
          subclassName:
            "School of Evocation",
          spellcastingAbility: "int",
          spellSaveDc: 15,
          spellAttackBonus: 7,
          cantripIds: [
            "fire-bolt"
          ],
          preparedSpellIds: [
            "magic-missile"
          ],
          spellbookSpellIds: [
            "shield"
          ]
        },
        "phase16-warlock": {
          classEntryId:
            "phase16-warlock",
          classId: "warlock",
          className: "Warlock",
          subclassName: "The Fiend",
          spellcastingAbility: "cha",
          spellSaveDc: 12,
          spellAttackBonus: 4,
          cantripIds: [
            "eldritch-blast"
          ],
          knownSpellIds: [
            "hex"
          ]
        }
      },
      pactMagic: {
        slots: 2,
        slotLevel: 1
      },
      pactMagicSources: [
        {
          classEntryId:
            "phase16-warlock",
          classId: "warlock",
          className: "Warlock",
          slots: 2,
          slotLevel: 1
        }
      ]
    };
    phase16Character.equipment = {
      ...phase16Character
        .equipment,
      currency: {
        cp: 1,
        sp: 2,
        ep: 0,
        gp: 35,
        pp: 1
      },
      items: [
        {
          id:
            "phase16-plate",
          name: "Plate",
          category: "armor",
          quantity: 1,
          weight: 65,
          equipped: true,
          baseArmorClass: 18
        },
        {
          id:
            "phase16-spellbook",
          name: "Spellbook",
          category: "gear",
          quantity: 1,
          weight: 3,
          equipped: false
        }
      ]
    };

    const phase16Sheet =
      createCharacterSheetView();
    const phase16MainHtml =
      phase16Sheet
        .renderCharacterSheetHtml(
          phase16Character,
          {
            activeTab: "main",
            sheetContext: {
              characterId:
                "phase16-character",
              dirty: false
            }
          }
        );
    const phase16SpellHtml =
      phase16Sheet
        .renderCharacterSheetHtml(
          phase16Character,
          {
            activeTab: "spell",
            sheetContext: {
              characterId:
                "phase16-character",
              dirty: false
            }
          }
        );

    record(
      "Phase 16: the character-sheet module is available",
      typeof createCharacterSheetView,
      "function"
    );

    record(
      "Phase 16: identity and portrait are displayed",
      {
        name:
          phase16MainHtml
            .includes(
              "Aria Phase Sixteen"
            ),
        portrait:
          phase16MainHtml
            .includes(
              "phase16-portrait.png"
            ),
        species:
          phase16MainHtml
            .includes("Tiefling")
      },
      {
        name: true,
        portrait: true,
        species: true
      }
    );

    record(
      "Phase 16: class and subclass progression is displayed",
      {
        heading:
          phase16MainHtml
            .includes(
              "Class &amp; Subclass Progression"
            ),
        fighter:
          phase16MainHtml
            .includes(
              "Fighter 3"
            ),
        champion:
          phase16MainHtml
            .includes(
              "Subclass: Champion"
            ),
        evocation:
          phase16MainHtml
            .includes(
              "School of Evocation"
            )
      },
      {
        heading: true,
        fighter: true,
        champion: true,
        evocation: true
      }
    );

    record(
      "Phase 16: level-by-level multiclass order is displayed",
      {
        heading:
          phase16MainHtml
            .includes(
              "Level-by-Level Multiclass Order"
            ),
        first:
          phase16MainHtml
            .includes(
              "Character 1"
            ),
        seventh:
          phase16MainHtml
            .includes(
              "Character 7"
            ),
        warlockTwo:
          phase16MainHtml
            .includes(
              "Warlock 2 — The Fiend"
            )
      },
      {
        heading: true,
        first: true,
        seventh: true,
        warlockTwo: true
      }
    );

    record(
      "Phase 16: ability scores and modifiers are displayed",
      {
        strength:
          phase16MainHtml
            .includes(">STR</span>"),
        strengthScore:
          phase16MainHtml
            .includes("<small>16</small>"),
        intelligence:
          phase16MainHtml
            .includes("<small>18</small>"),
        modifier:
          phase16MainHtml
            .includes("<strong>+4</strong>")
      },
      {
        strength: true,
        strengthScore: true,
        intelligence: true,
        modifier: true
      }
    );

    record(
      "Phase 16: saving throws are displayed",
      {
        heading:
          phase16MainHtml
            .includes(
              "<h2>Saving Throws</h2>"
            ),
        strength:
          phase16MainHtml
            .includes(
              "aria-label=\"Proficient\""
            ),
        constitution:
          phase16MainHtml
            .includes("Constitution")
      },
      {
        heading: true,
        strength: true,
        constitution: true
      }
    );

    record(
      "Phase 16: skills, expertise, and passive scores are displayed",
      {
        expertise:
          phase16MainHtml
            .includes(
              "aria-label=\"Expertise\""
            ),
        perception:
          phase16MainHtml
            .includes(
              "Passive Perception"
            ),
        investigation:
          phase16MainHtml
            .includes(
              "Passive Investigation"
            ),
        insight:
          phase16MainHtml
            .includes(
              "Passive Insight"
            )
      },
      {
        expertise: true,
        perception: true,
        investigation: true,
        insight: true
      }
    );

    record(
      "Phase 16: Armor Class options and the selected option are displayed",
      {
        heading:
          phase16MainHtml
            .includes(
              "Armor Class Options"
            ),
        selected:
          phase16MainHtml
            .includes(
              "Heavy Armor: Plate"
            ) &&
          phase16MainHtml
            .includes(
              "Plate 18 + Defense fighting style 1"
            ),
        alternate:
          phase16MainHtml
            .includes("Unarmored")
      },
      {
        heading: true,
        selected: true,
        alternate: true
      }
    );

    record(
      "Phase 16: HP and Hit Dice are displayed by class",
      {
        hp:
          phase16MainHtml
            .includes("31 / 52"),
        fighter:
          phase16MainHtml
            .includes(
              "1 / 3 d10"
            ),
        wizard:
          phase16MainHtml
            .includes(
              "1 / 2 d6"
            ),
        warlock:
          phase16MainHtml
            .includes(
              "1 / 2 d8"
            )
      },
      {
        hp: true,
        fighter: true,
        wizard: true,
        warlock: true
      }
    );

    record(
      "Phase 16: attacks and Extra Attack count are displayed",
      {
        attacksPerAction:
          phase16MainHtml
            .includes(
              "Attacks / Action"
            ) &&
          phase16MainHtml
            .includes("<strong>2</strong>"),
        attack:
          phase16MainHtml
            .includes("Longsword"),
        bonus:
          phase16MainHtml
            .includes("+7"),
        damage:
          phase16MainHtml
            .includes(
              "1d8 + 4 slashing"
            )
      },
      {
        attacksPerAction: true,
        attack: true,
        bonus: true,
        damage: true
      }
    );

    record(
      "Phase 16: class resources are displayed",
      {
        heading:
          phase16MainHtml
            .includes(
              "<h2>Class Resources</h2>"
            ),
        actionSurge:
          phase16MainHtml
            .includes("Action Surge"),
        recharge:
          phase16MainHtml
            .includes(
              "Recharges after short or long rest"
            )
      },
      {
        heading: true,
        actionSurge: true,
        recharge: true
      }
    );

    record(
      "Phase 16: feat resources are displayed",
      {
        heading:
          phase16MainHtml
            .includes(
              "<h2>Feat Resources</h2>"
            ),
        points:
          phase16MainHtml
            .includes("Luck Points"),
        usage:
          phase16MainHtml
            .includes("1 / 3")
      },
      {
        heading: true,
        points: true,
        usage: true
      }
    );

    record(
      "Phase 16: class features include full descriptions",
      phase16MainHtml
        .includes(
          "On your turn, you can take one additional action on top of your regular action and a possible bonus action."
        ),
      true
    );

    record(
      "Phase 16: subclass features include full descriptions",
      {
        heading:
          phase16MainHtml
            .includes(
              "<h2>Subclass Features</h2>"
            ),
        feature:
          phase16MainHtml
            .includes(
              "Improved Critical"
            ),
        description:
          phase16MainHtml
            .includes(
              "Your weapon attacks score a critical hit on a roll of 19 or 20."
            )
      },
      {
        heading: true,
        feature: true,
        description: true
      }
    );

    record(
      "Phase 16: feats include descriptions and choices",
      {
        description:
          phase16MainHtml
            .includes(
              "You have inexplicable luck that can change attack rolls, ability checks, and saving throws."
            ),
        choices:
          phase16MainHtml
            .includes(
              "Choices:"
            ) &&
          phase16MainHtml
            .includes(
              "Example Choice: Fortune"
            )
      },
      {
        description: true,
        choices: true
      }
    );

    record(
      "Phase 16: spellcasting is displayed separately by class",
      {
        wizard:
          phase16SpellHtml
            .includes(
              "Wizard — School of Evocation"
            ),
        warlock:
          phase16SpellHtml
            .includes(
              "Warlock — The Fiend"
            ),
        wizardAbility:
          phase16SpellHtml
            .includes(
              "Int"
            ),
        warlockAbility:
          phase16SpellHtml
            .includes(
              "Cha"
            )
      },
      {
        wizard: true,
        warlock: true,
        wizardAbility: true,
        warlockAbility: true
      }
    );

    record(
      "Phase 16: combined multiclass spell slots are displayed",
      {
        heading:
          phase16SpellHtml
            .includes(
              "<h2>Spell Slots</h2>"
            ),
        levelOne:
          phase16SpellHtml
            .includes(
              "data-normal-spell-slot=\"1\""
            ) &&
          phase16SpellHtml
            .includes("3 / 4"),
        levelTwo:
          phase16SpellHtml
            .includes("1 / 3"),
        levelThree:
          phase16SpellHtml
            .includes("2 / 2")
      },
      {
        heading: true,
        levelOne: true,
        levelTwo: true,
        levelThree: true
      }
    );

    record(
      "Phase 16: Pact Magic is displayed separately",
      {
        heading:
          phase16SpellHtml
            .includes(
              "<h2>Pact Magic</h2>"
            ),
        source:
          phase16SpellHtml
            .includes(
              "data-pact-source=\"phase16-warlock\""
            ),
        slots:
          phase16SpellHtml
            .includes(
              "1 / 2 level 1"
            )
      },
      {
        heading: true,
        source: true,
        slots: true
      }
    );

    record(
      "Phase 16: inventory and equipment are displayed",
      {
        plate:
          phase16MainHtml
            .includes("Plate"),
        equipped:
          phase16MainHtml
            .includes("Equipped"),
        spellbook:
          phase16MainHtml
            .includes("Spellbook"),
        currency:
          phase16MainHtml
            .includes(
              "<strong>35</strong>"
            )
      },
      {
        plate: true,
        equipped: true,
        spellbook: true,
        currency: true
      }
    );

    record(
      "Phase 16: resistances, senses, speed, languages, and proficiencies are displayed",
      {
        resistances:
          phase16MainHtml
            .includes("fire, cold"),
        senses:
          phase16MainHtml
            .includes(
              "Darkvision 60 ft."
            ) &&
          phase16MainHtml
            .includes(
              "Darkvision 120 ft."
            ),
        speed:
          phase16MainHtml
            .includes(
              "walk 30 ft."
            ),
        languages:
          phase16MainHtml
            .includes(
              "Common, Infernal, Draconic"
            ),
        proficiencies:
          phase16MainHtml
            .includes(
              "Martial weapons"
            )
      },
      {
        resistances: true,
        senses: true,
        speed: true,
        languages: true,
        proficiencies: true
      }
    );

    record(
      "Phase 16: manual and situational effects are displayed",
      {
        heading:
          phase16MainHtml
            .includes(
              "Manual &amp; Situational Effects"
            ),
        handling:
          phase16MainHtml
            .includes(
              "Manual · Reaction"
            ),
        instructions:
          phase16MainHtml
            .includes(
              "Use: Use this reminder when an eligible d20 roll is made."
            )
      },
      {
        heading: true,
        handling: true,
        instructions: true
      }
    );

    const phase16RestDraft =
      cloneData(
        phase16Character
      );
    creatorState.draft =
      phase16RestDraft;
    creatorState.dirty = false;
    performSection16Rest(
      "shortRest"
    );
    const phase16ShortRestState = {
      shortResource:
        creatorState.draft
          .classMechanics
          .resources[0]
          .currentUses,
      longResource:
        creatorState.draft
          .classMechanics
          .resources[1]
          .currentUses,
      normalSlot:
        creatorState.draft
          .magic
          .slotUsage
          .normal[1],
      pactSlot:
        creatorState.draft
          .magic
          .slotUsage
          .pactSources[
            "phase16-warlock"
          ]
    };
    performSection16Rest(
      "longRest"
    );

    record(
      "Phase 16: rest controls restore the correct resources",
      {
        short:
          phase16ShortRestState,
        long: {
          longResource:
            creatorState.draft
              .classMechanics
              .resources[1]
              .currentUses,
          featResource:
            creatorState.draft
              .featMechanics
              .resources[0]
              .currentUses,
          normalSlot:
            creatorState.draft
              .magic
              .slotUsage
              .normal[1],
          hp:
            creatorState.draft
              .combat.currentHp,
          temporaryHp:
            creatorState.draft
              .combat.temporaryHp,
          hitDice:
            creatorState.draft
              .combat
              .hitDiceUsage
        }
      },
      {
        short: {
          shortResource: 1,
          longResource: 0,
          normalSlot: 1,
          pactSlot: 0
        },
        long: {
          longResource: 1,
          featResource: 3,
          normalSlot: 0,
          hp: 52,
          temporaryHp: 0,
          hitDice: {
            "phase16-fighter": 0,
            "phase16-wizard": 0,
            "phase16-warlock": 1
          }
        }
      }
    );

    const phase16ActionLog = [];
    const phase16Root =
      typeof document !==
        "undefined"
        ? document
            .createElement("div")
        : null;

    if (phase16Root) {
      document.body
        .appendChild(
          phase16Root
        );
    }

    const phase16InteractiveSheet =
      createCharacterSheetView({
        root:
          phase16Root,
        getCharacter: () => {
          return phase16Character;
        },
        getSheetContext: () => {
          return {
            characterId:
              "phase16-character",
            dirty: false
          };
        },
        onAdjustClassResource:
          (resourceId, delta) => {
            phase16ActionLog.push(
              [
                "class",
                resourceId,
                delta
              ]
            );
            return true;
          },
        onAdjustFeatResource:
          (resourceId, delta) => {
            phase16ActionLog.push(
              [
                "feat",
                resourceId,
                delta
              ]
            );
            return true;
          },
        onAdjustHitDie:
          (resourceId, delta) => {
            phase16ActionLog.push(
              [
                "hit-die",
                resourceId,
                delta
              ]
            );
            return true;
          },
        onAdjustSpellSlot:
          (
            kind,
            level,
            delta,
            sourceId
          ) => {
            phase16ActionLog.push(
              [
                "spell-slot",
                kind,
                level,
                delta,
                sourceId
              ]
            );
            return true;
          },
        onRest:
          (restType) => {
            phase16ActionLog.push(
              [
                "rest",
                restType
              ]
            );
            return true;
          },
        confirmRest:
          () => true,
        onExportJson:
          (character) => {
            phase16ActionLog.push(
              [
                "export",
                character.id
              ]
            );
            return true;
          },
        onPrint:
          (character) => {
            phase16ActionLog.push(
              [
                "print",
                character.id
              ]
            );
            return true;
          },
        onSyncLinkedToken:
          (character) => {
            phase16ActionLog.push(
              [
                "sync",
                character.id
              ]
            );
            return true;
          }
      });
    phase16InteractiveSheet
      .open(
        phase16Character
      );
    const clickPhase16SheetAction =
      (
        action,
        selector = ""
      ) => {
        const button =
          phase16Root
            ?.querySelector(
              `[data-character-sheet-action="${action}"]${selector}`
            );

        button?.click();
        return Boolean(button);
      };
    const phase16ControlPresence = {
      shortRest:
        clickPhase16SheetAction(
          "short-rest"
        ),
      longRest:
        clickPhase16SheetAction(
          "long-rest"
        ),
      classResource:
        clickPhase16SheetAction(
          "adjust-class-resource",
          "[data-resource-id=\"phase16-action-surge\"][data-delta=\"1\"]"
        ),
      featResource:
        clickPhase16SheetAction(
          "adjust-feat-resource",
          "[data-resource-id=\"phase16-lucky\"][data-delta=\"-1\"]"
        ),
      hitDie:
        clickPhase16SheetAction(
          "adjust-hit-die",
          "[data-hit-die-id=\"phase16-fighter\"][data-delta=\"1\"]"
        ),
      spellSlot:
        (() => {
          phase16Root
            ?.querySelector(
              "[data-character-sheet-tab=\"spells\"]"
            )
            ?.click();

          return clickPhase16SheetAction(
            "adjust-spell-slot",
            "[data-slot-kind=\"normal\"][data-slot-level=\"1\"][data-delta=\"1\"]"
          );
        })(),
      exportJson:
        clickPhase16SheetAction(
          "export-json"
        ),
      print:
        clickPhase16SheetAction(
          "print"
        ),
      tokenSync:
        clickPhase16SheetAction(
          "sync-linked-token"
        )
    };

    record(
      "Phase 16: rest controls are wired to the character state",
      {
        controls: {
          shortRest:
            phase16ControlPresence
              .shortRest,
          longRest:
            phase16ControlPresence
              .longRest
        },
        actions:
          phase16ActionLog
            .filter((entry) => {
              return entry[0] ===
                "rest";
            })
      },
      {
        controls: {
          shortRest: true,
          longRest: true
        },
        actions: [
          [
            "rest",
            "shortRest"
          ],
          [
            "rest",
            "longRest"
          ]
        ]
      }
    );

    record(
      "Phase 16: resource spending and restoration controls are wired",
      {
        controls: {
          classResource:
            phase16ControlPresence
              .classResource,
          featResource:
            phase16ControlPresence
              .featResource,
          hitDie:
            phase16ControlPresence
              .hitDie,
          spellSlot:
            phase16ControlPresence
              .spellSlot
        },
        actions:
          phase16ActionLog
            .filter((entry) => {
              return [
                "class",
                "feat",
                "hit-die",
                "spell-slot"
              ].includes(
                entry[0]
              );
            })
      },
      {
        controls: {
          classResource: true,
          featResource: true,
          hitDie: true,
          spellSlot: true
        },
        actions: [
          [
            "class",
            "phase16-action-surge",
            1
          ],
          [
            "feat",
            "phase16-lucky",
            -1
          ],
          [
            "hit-die",
            "phase16-fighter",
            1
          ],
          [
            "spell-slot",
            "normal",
            1,
            1,
            ""
          ]
        ]
      }
    );

    record(
      "Phase 16: print-friendly styling and controls are present",
      {
        printControl:
          phase16ControlPresence
            .print,
        normalScreenPrintPanel:
          phase16MainHtml
            .includes(
              "data-character-sheet-print-area"
            ),
        printPanel:
          Boolean(
            phase16Root
              ?.querySelector(
                "[data-character-sheet-print-area]"
              )
          ),
        printMedia:
          Boolean(
            typeof document !==
              "undefined" &&
            document
              .getElementById(
                "homebrewGodCharacterSheetStyles"
              )
              ?.textContent
              ?.includes(
                "@media print"
              )
          ),
        callback:
          phase16ActionLog
            .some((entry) => {
              return (
                entry[0] ===
                  "print" &&
                entry[1] ===
                  "phase16-character"
              );
            })
      },
      {
        printControl: true,
        normalScreenPrintPanel:
          false,
        printPanel: true,
        printMedia: true,
        callback: true
      }
    );

    const phase16Json =
      phase16InteractiveSheet
        .getJson(
          phase16Character
        );
    const phase16ParsedJson =
      JSON.parse(
        phase16Json
      );

    record(
      "Phase 16: JSON export remains character-import compatible",
      {
        control:
          phase16ControlPresence
            .exportJson,
        callback:
          phase16ActionLog
            .some((entry) => {
              return (
                entry[0] ===
                  "export" &&
                entry[1] ===
                  "phase16-character"
              );
            }),
        sheetType:
          phase16ParsedJson
            .sheetType,
        id:
          phase16ParsedJson.id,
        classCount:
          phase16ParsedJson
            .classProgression
            .classes.length
      },
      {
        control: true,
        callback: true,
        sheetType: "character",
        id: "phase16-character",
        classCount: 3
      }
    );

    record(
      "Phase 16: linked-token synchronization is visible and wired",
      {
        status:
          phase16MainHtml
            .includes(
              "data-linked-token-status=\"ready\""
            ),
        control:
          phase16ControlPresence
            .tokenSync,
        callback:
          phase16ActionLog
            .some((entry) => {
              return (
                entry[0] ===
                  "sync" &&
                entry[1] ===
                  "phase16-character"
              );
            })
      },
      {
        status: true,
        control: true,
        callback: true
      }
    );

    phase16InteractiveSheet
      .close();
    phase16Root?.remove();

    creatorState.draft = createEmptyCharacter();
    creatorState.draft.classProgression = {
      totalLevel: 2,
      classes: [
        makeInteractionClassEntry(
          "barbarian-1",
          "barbarian",
          1
        ),
        makeInteractionClassEntry(
          "sorcerer-1",
          "sorcerer",
          1
        )
      ],
      levelOrder: []
    };
    refreshSelectedClassFeatures();
    const rageResourceId =
      creatorState.draft.classMechanics.resources
        .find((resource) => {
          return resource.canonicalId === "rage";
        })?.id;
    toggleSection12RageState(rageResourceId);

    record(
      "Active multiclass Rage blocks spellcasting and spends one use",
      {
        blocked:
          getSpellcastingSummary(
            creatorState.draft
          ).castingBlocked,
        rageUses:
          creatorState.draft.classMechanics.resources
            .find((resource) => {
              return resource.canonicalId === "rage";
            })?.currentUses
      },
      { blocked: true, rageUses: 1 }
    );

    creatorState.draft = interactionTestDraft;

    const inventoryItems = [
      normalizeSection15Item({
        id: "pack",
        name: "Pack",
        quantity: 1,
        weight: 5,
        isContainer: true,
        capacityWeight: 10
      }),
      normalizeSection15Item({
        id: "rope",
        name: "Rope",
        quantity: 2,
        weight: 5,
        containerId: "pack"
      }),
      normalizeSection15Item({
        id: "mystery",
        name: "Mystery Box",
        weight: null,
        containerId: "pack"
      })
    ];

    record(
      "Inventory known and unknown weight",
      calculateInventoryWeightSummary(
        inventoryItems
      ),
      {
        knownWeight: 15,
        unknownCount: 1
      }
    );

    record(
      "Container summary detects uncertainty",
      getContainerSummaries(
        inventoryItems
      ).map((container) => {
        return {
          knownWeight:
            container.knownWeight,
          unknownCount:
            container.unknownCount,
          uncertain:
            container.uncertain
        };
      }),
      [
        {
          knownWeight: 10,
          unknownCount: 1,
          uncertain: true
        }
      ]
    );

    record(
      "Container validation detects over capacity",
      validateContainerState([
        normalizeSection15Item({
          id: "bag",
          name: "Bag",
          isContainer: true,
          capacityWeight: 4
        }),
        normalizeSection15Item({
          id: "rock",
          name: "Rock",
          weight: 5,
          containerId: "bag"
        })
      ]),
      ["Bag is over capacity."]
    );

    record(
      "Container cycle detection",
      wouldCreateContainerCycle(
        [
          { id: "a", containerId: "b" },
          { id: "b", containerId: "" }
        ],
        "b",
        "a"
      ),
      true
    );

    record(
      "Split inventory stack",
      splitInventoryStack(
        [
          {
            id: "arrow",
            name: "Arrow",
            quantity: 20,
            containerId: ""
          }
        ],
        "arrow",
        5,
        "quiver"
      ).map((item) => {
        return {
          quantity: item.quantity,
          containerId: item.containerId
        };
      }),
      [
        {
          quantity: 15,
          containerId: ""
        },
        {
          quantity: 5,
          containerId: "quiver"
        }
      ]
    );

    record(
      "Removing container preserves contents",
      removeContainerPreserveContents(
        inventoryItems,
        "pack"
      ).map((item) => {
        return {
          id: item.id,
          containerId: item.containerId
        };
      }),
      [
        {
          id: "rope",
          containerId: ""
        },
        {
          id: "mystery",
          containerId: ""
        }
      ]
    );

    const clericTemplate =
      DEFAULT_CLASS_TEMPLATES.find(
        (template) => {
          return template.id === "cleric";
        }
      );

    const clericCharacter =
      createEmptyCharacter();

    clericCharacter.abilities.scores = {
      str: 10,
      dex: 10,
      con: 12,
      int: 10,
      wis: 16,
      cha: 8
    };

    clericCharacter.classProgression.totalLevel = 5;
    clericCharacter.combat.proficiencyBonus = 3;
    clericCharacter.classProgression.classes = [
      {
        classId: "cleric",
        className: "Cleric",
        level: 5,
        templateSnapshot:
          clericTemplate
      }
    ];

    record(
      "Spellcasting summary cleric DC",
      getSpellcastingSummary(
        clericCharacter
      ).classes[0].spellSaveDc,
      14
    );

    record(
      "Spellcasting summary cleric attack",
      getSpellcastingSummary(
        clericCharacter
      ).classes[0].spellAttackBonus,
      6
    );

    record(
      "Prepared spell limit cleric",
      getSpellcastingSummary(
        clericCharacter
      ).classes[0].preparedLimit,
      8
    );

    record(
      "Cleric level 5 slot summary",
      getSpellcastingSummary(
        clericCharacter
      ).classes[0].spellSlots,
      { 1: 4, 2: 3, 3: 2 }
    );

    record(
      "Third caster level 7 slots",
      getSrd2014SpellSlots(
        "third-caster",
        7
      ),
      { 1: 4, 2: 2 }
    );

    record(
      "Half caster level 1 has no slots",
      getSrd2014SpellSlots(
        "half-caster",
        1
      ),
      {}
    );

    const multiclassCaster =
      createEmptyCharacter();

    multiclassCaster.abilities.scores = {
      str: 10,
      dex: 10,
      con: 12,
      int: 16,
      wis: 10,
      cha: 14
    };

    multiclassCaster.classProgression.totalLevel = 12;
    multiclassCaster.classProgression.classes = [
      {
        classId: "wizard",
        className: "Wizard",
        level: 3,
        templateSnapshot:
          DEFAULT_CLASS_TEMPLATES.find(
            (template) => {
              return template.id === "wizard";
            }
          )
      },
      {
        classId: "paladin",
        className: "Paladin",
        level: 4,
        templateSnapshot:
          DEFAULT_CLASS_TEMPLATES.find(
            (template) => {
              return template.id === "paladin";
            }
          )
      },
      {
        classId: "warlock",
        className: "Warlock",
        level: 5,
        templateSnapshot:
          DEFAULT_CLASS_TEMPLATES.find(
            (template) => {
              return template.id === "warlock";
            }
          )
      }
    ];

    record(
      "Multiclass spellcasting summary",
      getSpellcastingSummary(
        multiclassCaster
      ).multiclass,
      {
        casterLevel: 5,
        spellSlots: { 1: 4, 2: 3, 3: 2 },
        pactMagic: [
          {
            slots: 2,
            slotLevel: 3,
            classEntryId: "warlock",
            classId: "warlock",
            className: "Warlock"
          }
        ]
      }
    );

    record(
      "Phase 5: full-caster plus full-caster slots",
      calculateSrd2014MulticlassSpellcasting([
        {
          level: 3,
          progressionType: "full-caster"
        },
        {
          level: 2,
          progressionType: "full-caster"
        }
      ]),
      {
        casterLevel: 5,
        spellSlots: { 1: 4, 2: 3, 3: 2 },
        pactMagic: []
      }
    );

    record(
      "Phase 5: full-caster plus half-caster slots",
      calculateSrd2014MulticlassSpellcasting([
        {
          level: 3,
          progressionType: "full-caster"
        },
        {
          level: 4,
          progressionType: "half-caster"
        }
      ]),
      {
        casterLevel: 5,
        spellSlots: { 1: 4, 2: 3, 3: 2 },
        pactMagic: []
      }
    );

    record(
      "Phase 5: full-caster plus third-caster slots",
      calculateSrd2014MulticlassSpellcasting([
        {
          level: 4,
          progressionType: "full-caster"
        },
        {
          level: 5,
          progressionType: "third-caster"
        }
      ]),
      {
        casterLevel: 5,
        spellSlots: { 1: 4, 2: 3, 3: 2 },
        pactMagic: []
      }
    );

    record(
      "Phase 5: full-caster plus Artificer slots",
      calculateSrd2014MulticlassSpellcasting([
        {
          level: 2,
          progressionType: "full-caster"
        },
        {
          level: 3,
          progressionType: "artificer"
        }
      ]),
      {
        casterLevel: 4,
        spellSlots: { 1: 4, 2: 3 },
        pactMagic: []
      }
    );

    record(
      "Phase 5: Paladin plus Ranger slots",
      calculateSrd2014MulticlassSpellcasting([
        {
          level: 5,
          progressionType: "half-caster"
        },
        {
          level: 5,
          progressionType: "half-caster"
        }
      ]),
      {
        casterLevel: 4,
        spellSlots: { 1: 4, 2: 3 },
        pactMagic: []
      }
    );

    record(
      "Phase 5: Artificer rounds upward",
      calculateSrd2014MulticlassSpellcasting([
        {
          level: 3,
          progressionType: "artificer"
        }
      ]).casterLevel,
      2
    );

    record(
      "Phase 5: Paladin and Ranger round downward when multiclassed",
      calculateSrd2014MulticlassSpellcasting([
        {
          level: 3,
          progressionType: "half-caster"
        },
        {
          level: 3,
          progressionType: "half-caster"
        }
      ]).casterLevel,
      2
    );

    record(
      "Phase 5: Eldritch Knight rounds downward when multiclassed",
      calculateSrd2014MulticlassSpellcasting([
        {
          classId: "fighter",
          subclassId: "eldritch-knight",
          level: 5,
          progressionType: "third-caster"
        }
      ]).casterLevel,
      1
    );

    record(
      "Phase 5: Arcane Trickster rounds downward when multiclassed",
      calculateSrd2014MulticlassSpellcasting([
        {
          classId: "rogue",
          subclassId: "arcane-trickster",
          level: 5,
          progressionType: "third-caster"
        }
      ]).casterLevel,
      1
    );

    const phase5WizardWarlock =
      calculateSrd2014MulticlassSpellcasting([
        {
          classEntryId: "wizard-source",
          classId: "wizard",
          className: "Wizard",
          level: 3,
          progressionType: "full-caster"
        },
        {
          classEntryId: "warlock-source",
          classId: "warlock",
          className: "Warlock",
          level: 5,
          progressionType: "pact-magic"
        }
      ]);

    record(
      "Phase 5: Pact Magic stays separate from Spellcasting slots",
      {
        normal: phase5WizardWarlock.spellSlots,
        pact: phase5WizardWarlock.pactMagic
          .map((source) => {
            return {
              slots: source.slots,
              slotLevel: source.slotLevel
            };
          })
      },
      {
        normal: { 1: 4, 2: 2 },
        pact: [{ slots: 2, slotLevel: 3 }]
      }
    );

    record(
      "Phase 5: Warlock plus full-caster",
      {
        casterLevel:
          phase5WizardWarlock.casterLevel,
        normalSlots:
          phase5WizardWarlock.spellSlots,
        pactSource:
          phase5WizardWarlock
            .pactMagic[0]
            .classEntryId
      },
      {
        casterLevel: 3,
        normalSlots: { 1: 4, 2: 2 },
        pactSource: "warlock-source"
      }
    );

    const phase5WarlockPaladin =
      calculateSrd2014MulticlassSpellcasting([
        {
          classEntryId: "warlock-source",
          classId: "warlock",
          className: "Warlock",
          level: 5,
          progressionType: "pact-magic"
        },
        {
          classEntryId: "paladin-source",
          classId: "paladin",
          className: "Paladin",
          level: 4,
          progressionType: "half-caster"
        }
      ]);

    record(
      "Phase 5: Warlock plus Paladin",
      {
        casterLevel:
          phase5WarlockPaladin.casterLevel,
        normalSlots:
          phase5WarlockPaladin.spellSlots,
        pactSlots:
          phase5WarlockPaladin
            .pactMagic[0].slots
      },
      {
        casterLevel: 2,
        normalSlots: { 1: 3 },
        pactSlots: 2
      }
    );

    record(
      "Phase 5: multiple Pact Magic sources remain distinct",
      calculateSrd2014MulticlassSpellcasting([
        {
          classEntryId: "warlock-a",
          classId: "warlock",
          className: "Warlock",
          level: 2,
          progressionType: "pact-magic"
        },
        {
          classEntryId: "pact-b",
          classId: "custom-pact",
          className: "Custom Pact",
          level: 3,
          progressionType: "pact-magic"
        }
      ]).pactMagic.map((source) => {
        return {
          classEntryId:
            source.classEntryId,
          slots: source.slots,
          slotLevel: source.slotLevel
        };
      }),
      [
        {
          classEntryId: "warlock-a",
          slots: 2,
          slotLevel: 1
        },
        {
          classEntryId: "pact-b",
          slots: 2,
          slotLevel: 2
        }
      ]
    );

    const phase5SpellSourceCharacter =
      createEmptyCharacter();
    phase5SpellSourceCharacter
      .abilities.scores.int = 16;
    phase5SpellSourceCharacter
      .abilities.scores.wis = 18;
    phase5SpellSourceCharacter
      .classProgression.totalLevel = 6;
    phase5SpellSourceCharacter
      .classProgression.classes = [
        {
          entryId: "wizard-source",
          classId: "wizard",
          className: "Wizard",
          level: 1,
          templateSnapshot:
            DEFAULT_CLASS_TEMPLATES.find(
              (template) => {
                return template.id ===
                  "wizard";
              }
            )
        },
        {
          entryId: "cleric-source",
          classId: "cleric",
          className: "Cleric",
          level: 5,
          templateSnapshot:
            DEFAULT_CLASS_TEMPLATES.find(
              (template) => {
                return template.id ===
                  "cleric";
              }
            )
        }
      ];
    phase5SpellSourceCharacter
      .magic.spellSourceModelVersion = 2;
    phase5SpellSourceCharacter
      .magic.customSpells = [
        normalizeSection16Spell({
          id: "phase5-shared-level-one",
          name: "Phase 5 Shared Spell",
          level: 1,
          classes: ["wizard", "cleric"]
        }),
        normalizeSection16Spell({
          id: "phase5-shared-level-three",
          name: "Phase 5 High Spell",
          level: 3,
          classes: ["wizard", "cleric"]
        }),
        normalizeSection16Spell({
          id: "phase5-feat-spell",
          name: "Phase 5 Feat Spell",
          level: 1
        }),
        normalizeSection16Spell({
          id: "phase5-ownerless",
          name: "Phase 5 Ownerless",
          level: 1,
          source: "import"
        })
      ];
    phase5SpellSourceCharacter
      .magic.classSources = {
        "wizard-source": {
          classEntryId: "wizard-source",
          classId: "wizard",
          className: "Wizard",
          spellcastingAbility: "int",
          cantripIds: [],
          knownSpellIds: [
            "phase5-shared-level-one"
          ],
          preparedSpellIds: [],
          spellbookSpellIds: [
            "phase5-shared-level-one"
          ],
          alwaysPreparedSpellIds: [],
          mysticArcanumSpellIds: {}
        },
        "cleric-source": {
          classEntryId: "cleric-source",
          classId: "cleric",
          className: "Cleric",
          spellcastingAbility: "wis",
          cantripIds: [],
          knownSpellIds: [],
          preparedSpellIds: [
            "phase5-shared-level-three"
          ],
          spellbookSpellIds: [],
          alwaysPreparedSpellIds: [],
          mysticArcanumSpellIds: {}
        }
      };
    phase5SpellSourceCharacter
      .magic.featSources = {
        "magic-initiate-source": {
          featId: "magic-initiate",
          featName: "Magic Initiate",
          spellcastingAbility: "cha",
          spellIds: ["phase5-feat-spell"],
          grants: []
        }
      };

    const phase5PerClassSelections =
      getPerClassSpellSelectionSummary(
        phase5SpellSourceCharacter
      );

    record(
      "Phase 5: spells known calculate separately per class",
      phase5PerClassSelections.map((source) => {
        return {
          classId: source.classId,
          knownSpellIds:
            source.knownSpellIds
        };
      }),
      [
        {
          classId: "wizard",
          knownSpellIds: [
            "phase5-shared-level-one"
          ]
        },
        {
          classId: "cleric",
          knownSpellIds: []
        }
      ]
    );

    record(
      "Phase 5: prepared spells calculate separately per class",
      phase5PerClassSelections.map((source) => {
        return {
          classId: source.classId,
          preparedSpellIds:
            source.preparedSpellIds
        };
      }),
      [
        {
          classId: "wizard",
          preparedSpellIds: []
        },
        {
          classId: "cleric",
          preparedSpellIds: [
            "phase5-shared-level-three"
          ]
        }
      ]
    );

    record(
      "Phase 5: spell levels are limited by individual class level",
      getSection16EligibleSpellcasters(
        phase5SpellSourceCharacter
          .magic.customSpells[1],
        {
          character:
            phase5SpellSourceCharacter
        }
      ).map((entry) => {
        return entry.classId;
      }),
      ["cleric"]
    );

    const phase5UpcastOptions =
      getSpellSlotCastingOptions(
        phase5SpellSourceCharacter,
        phase5SpellSourceCharacter
          .magic.customSpells[0],
        "wizard-source"
      );

    record(
      "Phase 5: higher combined slots upcast lower-level class spells",
      {
        sourceClassMaxSpellLevel:
          phase5UpcastOptions
            .sourceClassMaxSpellLevel,
        normalSlotLevels:
          phase5UpcastOptions
            .normalSlotLevels,
        canUpcast:
          phase5UpcastOptions.canUpcast
      },
      {
        sourceClassMaxSpellLevel: 1,
        normalSlotLevels: [1, 2, 3],
        canUpcast: true
      }
    );

    record(
      "Phase 5: every selected spell resolves to a class or feat source",
      {
        classSource:
          getSpellSourceContexts(
            phase5SpellSourceCharacter,
            phase5SpellSourceCharacter
              .magic.customSpells[0]
          ).map((context) => {
            return context.kind;
          }),
        featSource:
          getSpellSourceContexts(
            phase5SpellSourceCharacter,
            phase5SpellSourceCharacter
              .magic.customSpells[2]
          ).map((context) => {
            return context.kind;
          })
      },
      {
        classSource: ["class"],
        featSource: ["feat"]
      }
    );

    record(
      "Phase 5: a spell uses its source class spellcasting ability",
      getSpellSourceContexts(
        phase5SpellSourceCharacter,
        phase5SpellSourceCharacter
          .magic.customSpells[0]
      )[0]?.spellcastingAbility,
      "int"
    );

    phase5SpellSourceCharacter
      .equipment.items = [
        normalizeSection15Item({
          id: "phase5-arcane-focus",
          name: "Arcane Focus",
          category: "arcane focus"
        }),
        normalizeSection15Item({
          id: "phase5-holy-symbol",
          name: "Holy Symbol",
          category: "holy symbol"
        })
      ];

    record(
      "Phase 5: spellcasting focuses stay with the correct class",
      getSpellcastingFocusSummary(
        phase5SpellSourceCharacter
      ).map((source) => {
        return {
          classId: source.classId,
          focuses: source.focuses.map(
            (focus) => focus.name
          )
        };
      }),
      [
        {
          classId: "wizard",
          focuses: ["Arcane Focus"]
        },
        {
          classId: "cleric",
          focuses: ["Holy Symbol"]
        }
      ]
    );

    const phase5InvalidImportedSpell =
      normalizeSection16Spell({
        id: "phase5-invalid-import",
        name: "Invalid Imported Spell",
        level: 1,
        classId: "removed-class",
        source: "import"
      });

    record(
      "Phase 5: imported spells without a valid source warn",
      getSpellSourceWarning(
        phase5SpellSourceCharacter,
        phase5InvalidImportedSpell
      ),
      "Invalid Imported Spell has an invalid class source."
    );

    phase5SpellSourceCharacter
      .magic.unassignedKnownSpellIds = [
        "phase5-ownerless"
      ];
    phase5SpellSourceCharacter
      .magic.unassignedPreparedSpellIds = [
        "phase5-ownerless"
      ];
    phase5SpellSourceCharacter
      .magic.knownSpellIds.push(
        "phase5-ownerless"
      );
    phase5SpellSourceCharacter
      .magic.preparedSpellIds.push(
        "phase5-ownerless"
      );

    record(
      "Phase 5: ownerless spells do not affect spell calculations",
      {
        known:
          getSpellSelectionLimits(
            phase5SpellSourceCharacter
          ).knownIds.includes(
            "phase5-ownerless"
          ),
        prepared:
          getSpellSelectionLimits(
            phase5SpellSourceCharacter
          ).preparedIds.includes(
            "phase5-ownerless"
          ),
        warning:
          getSpellSourceWarning(
            phase5SpellSourceCharacter,
            phase5SpellSourceCharacter
              .magic.customSpells[3]
          )
      },
      {
        known: false,
        prepared: false,
        warning:
          "Phase 5 Ownerless needs a class source."
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    creatorState.draft.classProgression = {
      totalLevel: 2,
      classes: [
        makeInteractionClassEntry(
          "phase5-barbarian",
          "barbarian",
          1
        ),
        makeInteractionClassEntry(
          "phase5-sorcerer",
          "sorcerer",
          1
        )
      ],
      levelOrder: []
    };
    refreshSelectedClassFeatures();
    const phase5RageResourceId =
      creatorState.draft
        .classMechanics.resources
        .find((resource) => {
          return resource.canonicalId ===
            "rage";
        })?.id;
    toggleSection12RageState(
      phase5RageResourceId
    );

    record(
      "Phase 5: Rage blocks spellcasting",
      getSpellcastingSummary(
        creatorState.draft
      ).castingBlocked,
      true
    );

    toggleSection12RageState(
      phase5RageResourceId
    );

    record(
      "Phase 5: spellcasting resumes after Rage ends",
      getSpellcastingSummary(
        creatorState.draft
      ).castingBlocked,
      false
    );

    record(
      "Paladin prepared spell limit",
      getPreparedSpellLimit(
        multiclassCaster,
        {
          classId: "paladin",
          level: 5,
          spellcastingAbility: "cha"
        }
      ),
      4
    );

    const lightArmorCharacter =
      cloneData(fighterCharacter);

    lightArmorCharacter.equipment.items = [
      normalizeSection15Item({
        id: "leather",
        name: "Leather",
        category: "armor",
        equipped: true,
        armorCategory: "light armor",
        baseArmorClass: 11
      })
    ];

    record(
      "Light armor AC",
      calculateArmorClassOptions(
        lightArmorCharacter
      ).selected.total,
      13
    );

    const mediumArmorCharacter =
      cloneData(fighterCharacter);

    mediumArmorCharacter.abilities.scores.dex = 18;
    mediumArmorCharacter.equipment.items = [
      normalizeSection15Item({
        id: "scale",
        name: "Scale Mail",
        category: "armor",
        equipped: true,
        armorCategory: "medium armor",
        baseArmorClass: 14,
        dexterityCap: 2
      })
    ];

    record(
      "Medium armor Dexterity cap",
      calculateArmorClassOptions(
        mediumArmorCharacter
      ).selected.total,
      16
    );

    const heavyArmorCharacter =
      cloneData(fighterCharacter);

    heavyArmorCharacter.abilities.scores.dex = 18;
    heavyArmorCharacter.equipment.items = [
      normalizeSection15Item({
        id: "chain",
        name: "Chain Mail",
        category: "armor",
        equipped: true,
        armorCategory: "heavy armor",
        baseArmorClass: 16
      })
    ];

    record(
      "Heavy armor ignores Dexterity",
      calculateArmorClassOptions(
        heavyArmorCharacter
      ).selected.total,
      16
    );

    const shieldOnlyCharacter =
      cloneData(fighterCharacter);

    shieldOnlyCharacter.equipment.items = [
      normalizeSection15Item({
        id: "shield",
        name: "Shield",
        category: "shield",
        equipped: true,
        isShield: true
      })
    ];

    record(
      "Shield bonus",
      calculateArmorClassOptions(
        shieldOnlyCharacter
      ).selected.total,
      14
    );

    record(
      "Armor prevents monk unarmored formula",
      calculateArmorClassOptions({
        ...monkCharacter,
        equipment: {
          items: [
            normalizeSection15Item({
              id: "leather",
              name: "Leather",
              category: "armor",
              equipped: true,
              armorCategory: "light armor",
              baseArmorClass: 11
            })
          ]
        }
      }).options.some((option) => {
        return (
          option.id ===
          "monk-unarmored-defense"
        );
      }),
      false
    );

    const spellLimitCharacter =
      cloneData(clericCharacter);

    spellLimitCharacter.magic.customSpells = [
      normalizeSection16Spell({
        id: "guidance",
        name: "Guidance",
        level: 0
      }),
      normalizeSection16Spell({
        id: "light",
        name: "Light",
        level: 0
      }),
      normalizeSection16Spell({
        id: "bless",
        name: "Bless",
        level: 1
      })
    ];

    spellLimitCharacter.magic.knownSpellIds = [
      "guidance",
      "light",
      "bless"
    ];

    spellLimitCharacter.magic.preparedSpellIds = [
      "bless"
    ];

    record(
      "Spell selection limits",
      {
        cantrips:
          getSpellSelectionLimits(
            spellLimitCharacter
          ).cantripsKnownLimit,
        knownCantrips:
          getSpellSelectionLimits(
            spellLimitCharacter
          ).knownCantripCount,
        prepared:
          getSpellSelectionLimits(
            spellLimitCharacter
          ).preparedCount,
        maxLevel:
          getSpellSelectionLimits(
            spellLimitCharacter
          ).maxSpellLevel
      },
      {
        cantrips: 4,
        knownCantrips: 2,
        prepared: 1,
        maxLevel: 3
      }
    );

    record(
      "Mundane item cannot stay attuned",
      normalizeSection15Item({
        id: "pack",
        name: "Pack",
        isMagical: false,
        requiresAttunement: true,
        attuned: true
      }).attuned,
      false
    );

    creatorState.draft.equipment.items = [
      normalizeSection15Item({
        id: "a",
        name: "Ring A",
        category: "magic-item",
        isMagical: true,
        requiresAttunement: true,
        attuned: true
      }),
      normalizeSection15Item({
        id: "b",
        name: "Ring B",
        category: "magic-item",
        isMagical: true,
        requiresAttunement: true,
        attuned: true
      }),
      normalizeSection15Item({
        id: "c",
        name: "Ring C",
        category: "magic-item",
        isMagical: true,
        requiresAttunement: true,
        attuned: true
      })
    ];

    record(
      "Three-item attunement count",
      getSection15AttunedItemCount(),
      3
    );

    creatorState.draft.equipment.items = [
      normalizeSection15Item({
        id: "bag",
        name: "Bag",
        isContainer: true,
        capacityWeight: 100
      }),
      normalizeSection15Item({
        id: "arrows",
        name: "Arrows",
        quantity: 10,
        weight: 0.05
      })
    ];

    moveSection15ItemToContainer(
      1,
      "bag",
      4
    );

    record(
      "Container move splits stack",
      creatorState.draft.equipment.items
        .map((item) => {
          return {
            id: item.id === "arrows"
              ? "arrows"
              : item.id === "bag"
                ? "bag"
                : "split",
            quantity: item.quantity,
            containerId: item.containerId
          };
        }),
      [
        {
          id: "bag",
          quantity: 1,
          containerId: ""
        },
        {
          id: "arrows",
          quantity: 6,
          containerId: ""
        },
        {
          id: "split",
          quantity: 4,
          containerId: "bag"
        }
      ]
    );

    creatorState.draft.equipment.items = [
      normalizeSection15Item({
        id: "pouch",
        name: "Pouch",
        isContainer: true
      }),
      normalizeSection15Item({
        id: "coin",
        name: "Coin",
        containerId: "pouch"
      })
    ];

    record(
      "Container removal waits for explicit choice",
      removeSection15Item(0),
      "pending"
    );

    removeSection15Item(
      0,
      "inventory"
    );

    record(
      "Container removal moves contents to inventory by choice",
      creatorState.draft.equipment.items
        .map((item) => {
          return {
            id: item.id,
            containerId: item.containerId
          };
        }),
      [
        {
          id: "coin",
          containerId: ""
        }
      ]
    );

    const riskyLegacyImport =
      normalizeCharacter({
        id: "old-internal-id",
        docId: "firestore-doc-id",
        firestoreDocumentId:
          "other-firestore-doc-id",
        name: "Risky Legacy Import",
        classProgression: {
          totalLevel: 4,
          classes: [
            {
              classId: "fighter",
              className: "Fighter",
              level: 2,
              source: {
                bad: true
              }
            },
            null,
            {
              classId: "wizard",
              className: "Wizard",
              level: 1,
              source: ["template"]
            }
          ]
        },
        equipment: {
          items: [
            {
              id: "pack",
              name: "Pack",
              isContainer: true,
              source: {
                bad: true
              }
            },
            {
              id: "sword",
              name: "Sword",
              containerId: "missing-pack"
            },
            {
              id: "sword",
              name: "Duplicate Sword"
            },
            {
              name: "Nameless Old Item"
            }
          ],
          currencySources: "old-money"
        },
        equipmentText:
          "Old free-text gear",
        proficiencies: {
          skills: {
            athletics: {
              proficient: true,
              source: "class"
            },
            stealth: {
              proficient: true,
              source: {
                bad: true
              }
            }
          },
          sources: {
            armor: {
              "Heavy Armor": "class",
              "Broken Armor": {
                bad: true
              }
            },
            tools: "broken-tools"
          }
        }
      });

    const riskyLegacyWarnings =
      cleanArray(
        riskyLegacyImport
          .builder
          .validation
          .migrationWarnings
      );

    record(
      "Import audit warns and repairs risky legacy character data",
      {
        idWarning:
          riskyLegacyWarnings.some((warning) => {
            return warning.includes(
              "conflicting saved character IDs"
            );
          }),
        classWarning:
          riskyLegacyWarnings.some((warning) => {
            return warning.includes(
              "malformed class records"
            );
          }) &&
          riskyLegacyWarnings.some((warning) => {
            return warning.includes(
              "multiclass total level"
            );
          }),
        equipmentWarning:
          riskyLegacyWarnings.some((warning) => {
            return warning.includes(
              "duplicate equipment item IDs"
            );
          }) &&
          riskyLegacyWarnings.some((warning) => {
            return warning.includes(
              "container references pointed to missing"
            );
          }) &&
          riskyLegacyWarnings.some((warning) => {
            return warning.includes(
              "malformed equipment source"
            );
          }),
        sourceWarning:
          riskyLegacyWarnings.some((warning) => {
            return warning.includes(
              "legacy string proficiency sources"
            );
          }) &&
          riskyLegacyWarnings.some((warning) => {
            return warning.includes(
              "legacy string skill sources"
            );
          }) &&
          riskyLegacyWarnings.some((warning) => {
            return warning.includes(
              "malformed skill source"
            );
          }),
        totalLevel:
          riskyLegacyImport
            .classProgression
            .totalLevel,
        skillSource:
          riskyLegacyImport
            .proficiencies
            .skills
            .athletics
            .source,
        armorSource:
          riskyLegacyImport
            .proficiencies
            .sources
            .armor["Heavy Armor"],
        toolsSourceMap:
          riskyLegacyImport
            .proficiencies
            .sources
            .tools,
        equipmentSource:
          riskyLegacyImport
            .equipment
            .items[0]
            .source
      },
      {
        idWarning: true,
        classWarning: true,
        equipmentWarning: true,
        sourceWarning: true,
        totalLevel: 3,
        skillSource: ["class:fighter"],
        armorSource: ["class:fighter"],
        toolsSourceMap: {},
        equipmentSource: "import"
      }
    );

    record(
      "All core 2014 species are present",
      [
        "human",
        "dwarf",
        "elf",
        "halfling",
        "dragonborn",
        "gnome",
        "half-elf",
        "half-orc",
        "tiefling"
      ].every((speciesId) => {
        return DEFAULT_SPECIES_TEMPLATES
          .some((species) => {
            return species.id === speciesId;
          });
      }),
      true
    );

    record(
      "Custom Species preset card is absent",
      DEFAULT_SPECIES_TEMPLATES
        .some((species) => {
          return species.id === "custom-species";
        }),
      false
    );

    record(
      "Custom Background preset card is absent",
      DEFAULT_BACKGROUND_TEMPLATES
        .some((background) => {
          return background.id ===
            "custom-background";
        }),
      false
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate("dwarf");

    record(
      "Species bonuses apply by scoped source",
      {
        con:
          creatorState.draft
            .abilities
            .bonuses
            .con,
        source:
          creatorState.draft
            .abilities
            .bonusSources
            ["species:dwarf"]
            ?.con || 0
      },
      {
        con: 2,
        source: 2
      }
    );

    chooseSpeciesFromTemplate("human");

    record(
      "Changing species removes old scoped source",
      Boolean(
        creatorState.draft
          .abilities
          .bonusSources
          ["species:dwarf"]
      ),
      false
    );

    const importedFinalScores =
      normalizeCharacter({
        abilities: {
          scores: {
            str: 17,
            dex: 10,
            con: 10,
            int: 10,
            wis: 10,
            cha: 10
          },
          bonusSources: {
            "species:test": {
              str: 2
            }
          }
        }
      });

    record(
      "Import derives base scores from final scores and bonuses",
      {
        base:
          importedFinalScores
            .abilities
            .base
            .str,
        bonus:
          importedFinalScores
            .abilities
            .bonuses
            .str,
        final:
          importedFinalScores
            .abilities
            .scores
            .str
      },
      {
        base: 15,
        bonus: 2,
        final: 17
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    setAbilityBonusSource(
      "species:test",
      {
        str: 2
      }
    );

    setAbilityScore("str", 15);

    record(
      "Manual ability edit writes base and recalculates final",
      {
        base:
          creatorState.draft
            .abilities
            .base
            .str,
        bonus:
          creatorState.draft
            .abilities
            .bonuses
            .str,
        final:
          creatorState.draft
            .abilities
            .scores
            .str
      },
      {
        base: 15,
        bonus: 2,
        final: 17
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    setAbilityBonusSource(
      "species:test",
      {
        str: 2
      }
    );

    applySection13Scores({
      str: 15,
      dex: 8,
      con: 8,
      int: 8,
      wis: 8,
      cha: 8
    });

    creatorState.draft
      .abilities
      .method = "point-buy";

    record(
      "Point buy uses base scores for cost",
      {
        spent:
          getSection13PointBuySpent(),
        base:
          getSection13BaseAbilityScore(
            "str"
          ),
        final:
          getSection13AbilityScore(
            "str"
          )
      },
      {
        spent: 9,
        base: 15,
        final: 17
      }
    );

    record(
      "Ability screen labels base bonus and final separately",
      [
        "Base Score",
        "Species/Other Bonuses",
        "Final Score"
      ].every((label) => {
        return renderSection13AbilitySummary()
          .includes(label);
      }),
      true
    );

    const noncasterCharacter =
      createEmptyCharacter();

    noncasterCharacter.classProgression.totalLevel = 1;
    noncasterCharacter.classProgression.classes = [
      {
        classId: "barbarian",
        className: "Barbarian",
        level: 1,
        templateSnapshot:
          DEFAULT_CLASS_TEMPLATES.find(
            (template) => {
              return template.id === "barbarian";
            }
          )
      }
    ];

    record(
      "Noncaster Spells step is complete",
      isSection17SpellsComplete(
        noncasterCharacter
      ),
      true
    );

    const wizardCharacter =
      createEmptyCharacter();

    wizardCharacter.classProgression.totalLevel = 1;
    wizardCharacter.classProgression.classes = [
      {
        classId: "wizard",
        className: "Wizard",
        level: 1,
        templateSnapshot:
          DEFAULT_CLASS_TEMPLATES.find(
            (template) => {
              return template.id === "wizard";
            }
          )
      }
    ];

    record(
      "Spellcaster may leave optional spell choices unused",
      isSection17SpellsComplete(
        wizardCharacter
      ),
      true
    );

    creatorState.draft = wizardCharacter;
    const optionalSpellValidation =
      getSection17FinalizationValidation();

    record(
      "Unused spell choices are review reminders instead of blockers",
      {
        reminder:
          optionalSpellValidation.optionalWarnings
            .some((warning) => {
              return /can still learn|may prepare/i
                .test(warning);
            }),
        notBlocking:
          optionalSpellValidation.blockingErrors
            .every((warning) => {
              return !/can still learn|may prepare/i
                .test(warning);
            })
      },
      {
        reminder: true,
        notBlocking: true
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    record(
      "Expertise requires proficiency",
      toggleSection14Expertise("arcana"),
      false
    );

    const fighterWizard =
      createEmptyCharacter();

    fighterWizard.abilities.scores.con = 14;
    fighterWizard.classProgression.totalLevel = 5;
    fighterWizard.classProgression.classes = [
      {
        classId: "fighter",
        className: "Fighter",
        level: 3,
        templateSnapshot:
          DEFAULT_CLASS_TEMPLATES.find(
            (template) => {
              return template.id === "fighter";
            }
          )
      },
      {
        classId: "wizard",
        className: "Wizard",
        level: 2,
        templateSnapshot:
          DEFAULT_CLASS_TEMPLATES.find(
            (template) => {
              return template.id === "wizard";
            }
          )
      }
    ];

    record(
      "Fighter 3 Wizard 2 multiclass HP",
      calculateCharacterHp(
        fighterWizard
      ).maximumHp,
      40
    );

    record(
      "Multiclass hit dice stay separate",
      calculateCharacterHitDice(
        fighterWizard
      ).map((entry) => {
        return {
          die: entry.die,
          count: entry.count
        };
      }),
      [
        { die: "d10", count: 3 },
        { die: "d6", count: 2 }
      ]
    );

    const twoShieldCharacter =
      cloneData(fighterCharacter);

    twoShieldCharacter.equipment.items = [
      normalizeSection15Item({
        id: "shield-a",
        name: "Shield A",
        category: "shield",
        isShield: true,
        equipped: true
      }),
      normalizeSection15Item({
        id: "shield-b",
        name: "Shield B",
        category: "shield",
        isShield: true,
        equipped: true
      })
    ];

    record(
      "Two shields do not stack",
      calculateArmorClassOptions(
        twoShieldCharacter
      ).selected.total,
      14
    );

    const magicWeaponNoAc =
      cloneData(fighterCharacter);

    magicWeaponNoAc.equipment.items = [
      normalizeSection15Item({
        id: "magic-sword",
        name: "Magic Sword",
        category: "weapon",
        weaponType: "martial melee",
        damageDice: "1d8",
        magicalBonus: 1,
        equipped: true
      })
    ];

    record(
      "+1 weapon does not grant AC",
      calculateArmorClassOptions(
        magicWeaponNoAc
      ).selected.total,
      12
    );

    creatorState.draft =
      createEmptyCharacter();

    creatorState.draft.equipment.items = [
      normalizeSection15Item({
        id: "mail",
        name: "Chain Mail",
        category: "armor",
        armorCategory: "heavy armor",
        baseArmorClass: 16,
        equipped: true
      }),
      normalizeSection15Item({
        id: "pack",
        name: "Pack",
        isContainer: true,
        capacityWeight: 30
      })
    ];

    moveSection15ItemToContainer(
      0,
      "pack",
      1
    );

    record(
      "Moving equipped armor into backpack unequips it",
      {
        equipped:
          creatorState.draft
            .equipment
            .items[0]
            .equipped,
        containerId:
          creatorState.draft
            .equipment
            .items[0]
            .containerId
      },
      {
        equipped: false,
        containerId: "pack"
      }
    );

    record(
      "Recursive nested-container weight",
      getContainerSummaries([
        normalizeSection15Item({
          id: "backpack",
          name: "Backpack",
          isContainer: true,
          weight: 5
        }),
        normalizeSection15Item({
          id: "pouch",
          name: "Pouch",
          isContainer: true,
          weight: 1,
          containerId: "backpack"
        }),
        normalizeSection15Item({
          id: "coins",
          name: "Coins",
          weight: 10,
          containerId: "pouch"
        })
      ])[0].knownWeight,
      11
    );

    record(
      "Missing container import repair",
      normalizeCharacter({
        equipment: {
          items: [
            {
              id: "gem",
              name: "Gem",
              containerId: "missing"
            }
          ]
        }
      }).equipment.items[0].containerId,
      ""
    );

    const warningTextFor = (character) => {
      return cleanArray(
        character
          ?.builder
          ?.validation
          ?.migrationWarnings
      ).join("\n");
    };

    const rawEquipmentWarningCharacter =
      normalizeCharacter({
        equipment: {
          items: [
            {
              id: "pack",
              name: "Backpack",
              isContainer: true,
              equipped: true
            },
            {
              id: "ring",
              name: "Ring of Testing",
              category: "magic-item",
              isMagical: true,
              requiresAttunement: true,
              equipped: true,
              attuned: true,
              containerId: "pack"
            },
            {
              id: "gem",
              name: "Gem",
              containerId: "missing"
            }
          ]
        }
      });

    record(
      "Container import migration warnings are recorded before repair",
      {
        equippedContainer:
          warningTextFor(
            rawEquipmentWarningCharacter
          ).includes(
            "equipped container"
          ),
        equippedContained:
          warningTextFor(
            rawEquipmentWarningCharacter
          ).includes(
            "equipped while stored"
          ),
        attunedContained:
          warningTextFor(
            rawEquipmentWarningCharacter
          ).includes(
            "attuned while stored"
          ),
        missingContainer:
          warningTextFor(
            rawEquipmentWarningCharacter
          ).includes(
            "referenced missing container"
          )
      },
      {
        equippedContainer: true,
        equippedContained: true,
        attunedContained: true,
        missingContainer: true
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    creatorState.showContainedItems = false;
    creatorState.openContainerId = "";
    creatorState.draft.equipment.items = [
      normalizeSection15Item({
        id: "panel-pack",
        name: "Panel Test Pack",
        isContainer: true
      }),
      normalizeSection15Item({
        id: "panel-coin",
        name: "Hidden Test Coin",
        containerId: "panel-pack"
      })
    ];

    record(
      "Contained inventory hides from main list by default",
      renderSection15Inventory()
        .includes("Hidden Test Coin"),
      false
    );

    creatorState.showContainedItems = true;

    record(
      "Contained inventory can show in main list",
      renderSection15Inventory()
        .includes("Hidden Test Coin"),
      true
    );

    creatorState.openContainerId =
      "panel-pack";

    record(
      "Open backpack panel lists contents",
      renderSection15OpenContainerPanel()
        .includes("Hidden Test Coin"),
      true
    );

    moveSection15ItemToContainer(
      1,
      "",
      null
    );

    record(
      "Moving item out of backpack clears container",
      creatorState.draft
        .equipment
        .items[1]
        .containerId,
      ""
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate(
      "dragonborn"
    );

    creatorState.draft
      .species
      .choices
      .draconicAncestry = "red";

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    record(
      "Dragonborn ancestry applies choice mechanics",
      {
        complete:
          isSection17SpeciesComplete(
            creatorState.draft
          ),
        resistance:
          creatorState.draft
            .species
            .damageResistances[0],
        trait:
          creatorState.draft
            .features
            .speciesTraits
            .some((trait) => {
              return trait.name ===
                "Red Dragon Ancestry";
            })
      },
      {
        complete: true,
        resistance: "Fire",
        trait: true
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate(
      "half-elf"
    );

    creatorState.draft
      .species
      .choices
      .halfElfAbilityOne = "dex";

    creatorState.draft
      .species
      .choices
      .halfElfAbilityTwo = "con";

    creatorState.draft
      .species
      .choices
      .halfElfSkillOne = "perception";

    creatorState.draft
      .species
      .choices
      .halfElfSkillTwo = "stealth";

    creatorState.draft
      .species
      .choices
      .halfElfLanguage = "Dwarvish";

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    record(
      "Half-Elf flexible bonuses apply",
      {
        complete:
          isSection17SpeciesComplete(
            creatorState.draft
          ),
        cha:
          creatorState.draft
            .abilities
            .bonuses
            .cha,
        dex:
          creatorState.draft
            .abilities
            .bonuses
            .dex,
        con:
          creatorState.draft
            .abilities
            .bonuses
            .con
      },
      {
        complete: true,
        cha: 2,
        dex: 1,
        con: 1
      }
    );

    const multiclassSpellSourceCharacter =
      createEmptyCharacter();

    multiclassSpellSourceCharacter
      .abilities
      .scores
      .int = 16;

    multiclassSpellSourceCharacter
      .abilities
      .scores
      .wis = 16;

    multiclassSpellSourceCharacter
      .combat
      .proficiencyBonus = 2;

    multiclassSpellSourceCharacter
      .classProgression
      .totalLevel = 4;

    multiclassSpellSourceCharacter
      .classProgression
      .classes = [
        {
          classId: "wizard",
          className: "Wizard",
          level: 1,
          templateSnapshot:
            DEFAULT_CLASS_TEMPLATES.find(
              (template) => {
                return template.id ===
                  "wizard";
              }
            )
        },
        {
          classId: "cleric",
          className: "Cleric",
          level: 3,
          templateSnapshot:
            DEFAULT_CLASS_TEMPLATES.find(
              (template) => {
                return template.id ===
                  "cleric";
              }
            )
        }
      ];

    const ownerlessSpell =
      normalizeSection16Spell({
        id: "ownerless-spell",
        name: "Ownerless Spell",
        level: 1
      });

    const tooHighWizardSpell =
      normalizeSection16Spell({
        id: "too-high",
        name: "Too High",
        level: 3,
        classId: "wizard"
      });

    const sourcedClericSpell =
      normalizeSection16Spell({
        id: "sourced-cleric",
        name: "Sourced Cleric",
        level: 1,
        classId: "cleric"
      });

    record(
      "Multiclass spell without source warns",
      getSpellSourceWarning(
        multiclassSpellSourceCharacter,
        ownerlessSpell
      ),
      "Ownerless Spell needs a class source."
    );

    record(
      "Spell source validates class level",
      getSpellSourceWarning(
        multiclassSpellSourceCharacter,
        tooHighWizardSpell
      ),
      "Too High is above Wizard's available spell level."
    );

    record(
      "Valid sourced spell has no source warning",
      getSpellSourceWarning(
        multiclassSpellSourceCharacter,
        sourcedClericSpell
      ),
      ""
    );

    creatorState.draft =
      cloneData(
        multiclassSpellSourceCharacter
      );

    creatorState.draft
      .magic
      .customSpells = [
        ownerlessSpell
      ];

    creatorState.draft
      .magic
      .knownSpellIds = [
        "ownerless-spell"
      ];

    record(
      "Review warns for ownerless multiclass spell",
      getSection17Warnings()
        .includes(
          "Ownerless Spell needs a class source."
        ),
      true
    );

    creatorState.draft =
      createEmptyCharacter();

    creatorState.draft
      .identity
      .name = "Review Clarity";

    creatorState.draft
      .classProgression
      .totalLevel = 1;

    creatorState.draft
      .classProgression
      .classes = [
        {
          classId: "wizard",
          className: "Wizard",
          level: 1,
          templateSnapshot:
            DEFAULT_CLASS_TEMPLATES.find(
              (template) => {
                return template.id ===
                  "wizard";
              }
            )
        }
      ];

    applySection13Scores({
      str: 15,
      dex: 10,
      con: 12,
      int: 16,
      wis: 10,
      cha: 10
    });

    setAbilityBonusSource(
      "species:test",
      {
        str: 2
      }
    );

    chooseSection14Background(
      "criminal"
    );

    setSection14BackgroundChoiceList(
      "toolProficiencies",
      [
        "Dice set",
        "Thieves' tools"
      ]
    );

    setSection14BackgroundChoiceList(
      "languageProficiencies",
      ["Infernal"]
    );

    setSourceProficiencyList(
      "tools",
      creatorState.draft
        .background
        .featureChoices
        .toolProficiencies,
      "background:criminal"
    );

    setSourceProficiencyList(
      "languages",
      creatorState.draft
        .background
        .featureChoices
        .languageProficiencies,
      "background:criminal"
    );

    applySection14BackgroundPackage(
      "criminal-pack"
    );

    creatorState.draft
      .magic
      .customSpells = [
        normalizeSection16Spell({
          id: "magic-missile",
          name: "Magic Missile",
          level: 1,
          classId: "wizard"
        })
      ];

    creatorState.draft
      .magic
      .knownSpellIds = [
        "magic-missile"
      ];

    creatorState.draft
      .magic
      .innateSpells = [
        normalizeSection16Spell(
          {
            id: "innate-light",
            name: "Light",
            level: 0,
            source: "species:test",
            innateSource:
              "species:test",
            innate: true,
            spellcastingAbility:
              "cha"
          },
          "species:test"
        )
      ];

    creatorState.draft
      .builder
      .validation
      .migrationWarnings = [
        "Review imported container repairs."
      ];

    const reviewClarityHtml =
      renderReviewStep();

    record(
      "Review screen shows clarified character details",
      {
        abilities:
          [
            "Base Score",
            "Bonus Sources",
            "species:test +2",
            "Final Score"
          ].every((text) => {
            return reviewClarityHtml
              .includes(text);
          }),
        backgroundItems:
          reviewClarityHtml.includes(
            "Background Items and Currency"
          ) &&
          reviewClarityHtml.includes(
            "criminal-pack"
          ) &&
          reviewClarityHtml.includes(
            "15 gp"
          ),
        exactChoices:
          [
            "Exact Tools, Instruments, and Gaming Sets",
            "Dice set",
            "Thieves&#039; tools",
            "Exact Background Languages",
            "Infernal"
          ].every((text) => {
            return reviewClarityHtml
              .includes(text);
          }),
        spells:
          reviewClarityHtml.includes(
            "Class Spells"
          ) &&
          reviewClarityHtml.includes(
            "Magic Missile"
          ) &&
          reviewClarityHtml.includes(
            "Innate Species Spells"
          ) &&
          reviewClarityHtml.includes(
            "Light"
          ),
        migration:
          reviewClarityHtml.includes(
            "Migration Warnings Requiring Review"
          ) &&
          reviewClarityHtml.includes(
            "Review imported container repairs."
          )
      },
      {
        abilities: true,
        backgroundItems: true,
        exactChoices: true,
        spells: true,
        migration: true
      }
    );

    creatorState.draft.identity.appearance =
      "Read-only appearance";
    creatorState.draft.background.backstory =
      "Read-only backstory";
    creatorState.draft.notes =
      "Read-only notes";
    creatorState.draft.feats = ["lucky"];
    creatorState.draft.selectedFeats = ["lucky"];
    creatorState.draft.featMechanics = {
      resources: [
        {
          id: "legacy-lucky:luck-points",
          name: "Luck Points",
          currentUses: 3,
          maximumUses: 3,
          recharge: "longRest"
        }
      ]
    };
    creatorState.draft.classMechanics = {
      resources: [
        {
          id: "fighter-test:rage",
          canonicalId: "rage",
          name: "Test Resource",
          className: "Fighter",
          currentUses: 1,
          maximumUses: 1,
          recharge: "longRest"
        }
      ],
      combatProfiles: [],
      passiveEffects: [],
      attackModifiers: [],
      armorClassModifiers: [],
      armorClassFormulas: [],
      spellModifiers: [],
      restrictions: []
    };

    creatorState.reviewRevision += 1;

    const reviewDraftBeforeRender =
      JSON.stringify(creatorState.draft);
    const readOnlyReviewHtml =
      renderReviewStep();
    const reviewDraftAfterRender =
      JSON.stringify(creatorState.draft);

    record(
      "Review rendering is read-only and does not mutate the draft",
      {
        draftUnchanged:
          reviewDraftAfterRender ===
          reviewDraftBeforeRender,
        noEditableFields:
          !readOnlyReviewHtml.includes(
            "data-cc-path="
          ) &&
          !readOnlyReviewHtml.includes(
            "<textarea"
          ),
        noRuleStateActions: [
          "adjust-class-resource",
          "adjust-feat-resource",
          "adjust-divine-smite-slot",
          "toggle-rage-state"
        ].every((action) => {
          return !readOnlyReviewHtml.includes(
            `data-cc-action=\"${action}\"`
          );
        }),
        storyStillVisible: [
          "Read-only appearance",
          "Read-only backstory",
          "Read-only notes"
        ].every((text) => {
          return readOnlyReviewHtml.includes(text);
        })
      },
      {
        draftUnchanged: true,
        noEditableFields: true,
        noRuleStateActions: true,
        storyStillVisible: true
      }
    );

    const staleInternalSnapshotRecords =
      readRealtimeSnapshotRecords({
        docs: [
          {
            id: "real-firestore-doc-id",
            data() {
              return {
                id: "stale-internal-id",
                identity: {
                  name:
                    "Document ID Test"
                }
              };
            }
          }
        ]
      });

    const staleInternalIdCharacter =
      normalizeSection19CharacterRecord(
        staleInternalSnapshotRecords[0]
      );

    record(
      "Firestore snapshot reader keeps real document ID available",
      {
        snapshotId:
          staleInternalSnapshotRecords[0]
            .id,
        snapshotDocId:
          staleInternalSnapshotRecords[0]
            .docId
      },
      {
        snapshotId: "stale-internal-id",
        snapshotDocId:
          "real-firestore-doc-id"
      }
    );

    creatorState.characterCache = [
      staleInternalIdCharacter
    ];

    record(
      "Loaded character uses Firestore document ID over stale internal ID",
      {
        id:
          staleInternalIdCharacter.id,
        docId:
          staleInternalIdCharacter.docId,
        firestoreDocumentId:
          staleInternalIdCharacter
            .firestoreDocumentId,
        internalDataId:
          staleInternalIdCharacter
            .internalDataId,
        foundByRealId:
          Boolean(
            findCachedCharacter(
              "real-firestore-doc-id"
            )
          ),
        foundByStaleId:
          Boolean(
            findCachedCharacter(
              "stale-internal-id"
            )
          )
      },
      {
        id: "real-firestore-doc-id",
        docId: "real-firestore-doc-id",
        firestoreDocumentId:
          "real-firestore-doc-id",
        internalDataId:
          "stale-internal-id",
        foundByRealId: true,
        foundByStaleId: false
      }
    );

    const catalogHas = (ids) => {
      return ids.every((id) => {
        return DEFAULT_EQUIPMENT_CATALOG
          .some((item) => {
            return item.id === id;
          });
      });
    };

    const getTemplate = (templates, id) => {
      return templates.find((template) => {
        return template.id === id;
      });
    };

    const multiclassUiDraft =
      createEmptyCharacter();

    multiclassUiDraft.identity.name =
      "Multiclass UI Test";

    multiclassUiDraft.classProgression.totalLevel =
      5;

    multiclassUiDraft.classProgression.classes = [
      {
        classId: "fighter",
        className: "Fighter",
        source: "srd-2014",
        level: 3,
        subclassName: "Champion",
        hitDie: "d10",
        choices: {
          fightingStyle: "Defense",
          subclassSnapshot: {
            id: "champion",
            featuresByLevel: {
              3: [
                {
                  id: "champion-improved-critical",
                  name: "Improved Critical"
                }
              ]
            }
          }
        },
        templateSnapshot:
          cloneData(
            getTemplate(
              DEFAULT_CLASS_TEMPLATES,
              "fighter"
            )
          )
      },
      {
        classId: "wizard",
        className: "Wizard",
        source: "srd-2014",
        level: 2,
        subclassName: "Evocation",
        hitDie: "d6",
        choices: {
          spellbook: "Imported"
        },
        templateSnapshot:
          cloneData(
            getTemplate(
              DEFAULT_CLASS_TEMPLATES,
              "wizard"
            )
          )
      }
    ];

    creatorState.draft =
      normalizeCharacter(multiclassUiDraft);

    const multiclassClassHtml =
      renderClassStep();

    const multiclassLevelHtml =
      renderLevelStep();

    const multiclassReviewHtml =
      renderReviewStep();

    const multiclassWarnings =
      getSection17Warnings();

    record(
      "Multiclass class and level screens expose progression controls",
      {
        classProgression:
          multiclassClassHtml.includes(
            "Class Progression"
          ),
        addClass:
          multiclassClassHtml.includes(
            "Split 1 Level Into Selected Class"
          ),
        addClassLabel:
          multiclassClassHtml.includes(
            "Choose class to add"
          ),
        addClassHelper:
          multiclassClassHtml.includes(
            "The total character level will not increase. For example, Fighter 2 becomes Fighter 1 / Wizard 1."
          ),
        levelFirst:
          multiclassClassHtml.includes(
            'data-level-first-panel="true"'
          ) &&
          multiclassClassHtml.includes(
            "Choose Total Character Level"
          ) &&
          multiclassClassHtml.includes(
            'data-multiclass-total="true"'
          ),
        localAddStatus:
          multiclassClassHtml.includes(
            'id="ccMulticlassAddStatus"'
          ) &&
          multiclassClassHtml.includes(
            "aria-live=\"polite\""
          ),
        levelUpWorkflow:
          multiclassClassHtml.includes(
            "Level Up Workflow"
          ) &&
          multiclassClassHtml.includes(
            "add-character-level"
          ) &&
          multiclassClassHtml.includes(
            "remove-last-character-level"
          ),
        fighterLevelInput:
          multiclassClassHtml.includes(
            "ccMulticlassLevel-0"
          ),
        wizardSubclassInput:
          multiclassClassHtml.includes(
            "ccMulticlassSubclass-1"
          ),
        fighterSummary:
          multiclassClassHtml.includes(
            "Fighter"
          ) &&
          multiclassClassHtml.includes(
            "Level 3"
          ) &&
          multiclassClassHtml.includes(
            "Defense"
          ),
        wizardSummary:
          multiclassClassHtml.includes(
            "Wizard"
          ) &&
          multiclassClassHtml.includes(
            "Level 2"
          ) &&
          multiclassClassHtml.includes(
            "Imported"
          ),
        levelOrder:
          multiclassLevelHtml.includes(
            "Level-by-Level Class Order"
          ) &&
          multiclassLevelHtml.includes(
            "Character Level 4"
          ) &&
          multiclassLevelHtml.includes(
            "move-character-level-order"
          ),
        levelOrderCollapsed:
          multiclassLevelHtml.includes(
            '<details class="hg-character-level-order-details">'
          ) &&
          multiclassLevelHtml.includes(
            "Show Advanced Level Order"
          ) &&
          !multiclassLevelHtml.includes(
            '<details class="hg-character-level-order-details" open'
          ),
        levelOrderCompact:
          multiclassLevelHtml.includes(
            "hg-character-level-order-row"
          ) &&
          multiclassLevelHtml.includes(
            "Advanced: this controls HP and hit dice when multiclassing. Most players do not need to change it."
          ),
        noReadOnlyWarning:
          !multiclassWarnings.some((warning) => {
            return warning.includes(
              "read-only"
            );
          }),
        reviewSummary:
          multiclassReviewHtml.includes(
            "Multiclass Summary"
          ) &&
          multiclassReviewHtml.includes(
            "Level-by-Level Class Order"
          ),
        reviewLevelOrderReadOnly:
          !multiclassReviewHtml.includes(
            "move-character-level-order"
          ) &&
          !multiclassReviewHtml.includes(
            "Show Advanced Level Order"
          ),
        reviewChoiceSummary:
          multiclassReviewHtml.includes(
            "Fighting Style: Defense"
          ) &&
          multiclassReviewHtml.includes(
            "Spellbook: Imported"
          ),
        reviewHidesInternalSnapshots:
          !multiclassReviewHtml.includes(
            "subclassSnapshot"
          ) &&
          !multiclassReviewHtml.includes(
            "champion-improved-critical"
          )
      },
      {
        classProgression: true,
        addClass: true,
        addClassLabel: true,
        addClassHelper: true,
        levelFirst: true,
        localAddStatus: true,
        levelUpWorkflow: true,
        fighterLevelInput: true,
        wizardSubclassInput: true,
        fighterSummary: true,
        wizardSummary: true,
        levelOrder: true,
        levelOrderCollapsed: true,
        levelOrderCompact: true,
        noReadOnlyWarning: true,
        reviewSummary: true,
        reviewLevelOrderReadOnly: true,
        reviewChoiceSummary: true,
        reviewHidesInternalSnapshots: true
      }
    );

    const portraitLibraryDraft =
      createEmptyCharacter();

    portraitLibraryDraft.id =
      "portrait-size-test";
    portraitLibraryDraft.identity.name =
      "Portrait Size Test";
    portraitLibraryDraft.identity.image.url =
      "https://example.invalid/portrait.png";

    const portraitLibraryHtml =
      createCharacterLibraryCard(
        portraitLibraryDraft
      );

    record(
      "Character library portraits have a stable maximum size",
      {
        portraitClass:
          portraitLibraryHtml.includes(
            "hg-character-library-portrait"
          ),
        fixedHeight:
          portraitLibraryHtml.includes(
            "height: 220px"
          ),
        maxHeight:
          portraitLibraryHtml.includes(
            "max-height: 220px"
          ),
        cropped:
          portraitLibraryHtml.includes(
            "object-fit: cover"
          )
      },
      {
        portraitClass: true,
        fixedHeight: true,
        maxHeight: true,
        cropped: true
      }
    );

    creatorState.draft.abilities.base = {
      ...creatorState.draft.abilities.base,
      str: 13,
      int: 13
    };

    recalculateAbilityTotals(
      creatorState.draft
    );

    const wizardLevelChanged =
      setMulticlassClassLevel(1, 3);

    const wizardSubclassChanged =
      setMulticlassSubclass(1, "evocation");

    creatorState.draft.abilities.base = {
      ...creatorState.draft.abilities.base,
      str: 13,
      dex: 13,
      int: 13
    };

    recalculateAbilityTotals(
      creatorState.draft
    );

    addCharacterLevelToClass(1);

    const rogueAdded =
      addMulticlassClass("rogue");

    const rogueMoved =
      moveMulticlassClass(2, -1);

    const rogueRemoved =
      removeMulticlassClass(1);

    record(
      "Multiclass progression edits update class records",
      {
        wizardLevelChanged,
        wizardSubclassChanged,
        rogueAdded,
        rogueMoved,
        rogueRemoved,
        totalLevel:
          creatorState.draft
            .classProgression
            .totalLevel,
        levels:
          creatorState.draft
            .classProgression
            .classes
            .map((entry) => {
              return `${entry.classId}:${entry.level}`;
            }),
        wizardSubclass:
          creatorState.draft
            .classProgression
            .classes[1]
            ?.subclassName,
        hitDice:
          calculateCharacterHitDice(
            creatorState.draft
          ).map((entry) => {
            return `${entry.classId}:${entry.count}${entry.die}`;
          })
      },
      {
        wizardLevelChanged: true,
        wizardSubclassChanged: true,
        rogueAdded: true,
        rogueMoved: true,
        rogueRemoved: true,
        totalLevel: 6,
        levels: [
          "fighter:3",
          "wizard:3"
        ],
        wizardSubclass: "Evocation",
        hitDice: [
          "fighter:3d10",
          "wizard:3d6"
        ]
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection12Class("wizard");

    setCharacterLevel(2);

    const rogueBlockedByPrereq =
      !addMulticlassClass("rogue");

    creatorState.draft.abilities.base = {
      ...creatorState.draft.abilities.base,
      dex: 13,
      int: 13
    };

    recalculateAbilityTotals(
      creatorState.draft
    );

    const rogueAllowedByPrereq =
      getMulticlassPrerequisiteResults(
        creatorState.draft,
        "rogue"
      ).every((result) => {
        return result.met;
      });

    const rogueSkillSelected =
      toggleMulticlassSkillChoice(
        1,
        "stealth"
      );

    const rogueSource =
      getClassSourceLabel(
        creatorState.draft
          .classProgression
          .classes[1]
      );

    record(
      "Multiclass requirement reminders and secondary proficiencies apply",
      {
        rogueBlockedByPrereq,
        rogueAllowedByPrereq,
        rogueSkillSelected,
        savingThrows:
          creatorState.draft
            .proficiencies
            .savingThrows,
        armor:
          creatorState.draft
            .proficiencies
            .armor,
        tools:
          creatorState.draft
            .proficiencies
            .tools,
        stealthSource:
          cleanArray(
            creatorState.draft
              .proficiencies
              .skills
              .stealth
              ?.source
          ).includes(rogueSource),
        noRogueSavingThrow:
          !creatorState.draft
            .proficiencies
            .savingThrows
            .includes("Dexterity")
      },
      {
        rogueBlockedByPrereq: false,
        rogueAllowedByPrereq: true,
        rogueSkillSelected: true,
        savingThrows: [
          "Intelligence",
          "Wisdom"
        ],
        armor: [
          "Light Armor"
        ],
        tools: [
          "Thieves' Tools"
        ],
        stealthSource: true,
        noRogueSavingThrow: true
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection12Class("fighter");

    setCharacterLevel(2);

    creatorState.draft.abilities.base = {
      ...creatorState.draft.abilities.base,
      str: 13,
      dex: 13,
      int: 13
    };

    recalculateAbilityTotals(
      creatorState.draft
    );

    const wizardAddedForOrder =
      addMulticlassClass("wizard");

    const fighterFirstHp =
      calculateCharacterHp(
        creatorState.draft
      ).maximumHp;

    const wizardMovedFirst =
      moveCharacterLevelOrder(1, -1);

    const wizardFirstHp =
      calculateCharacterHp(
        creatorState.draft
      ).maximumHp;

    const levelOrderRecords =
      getCharacterLevelHitDieRecords(
        creatorState.draft
      ).map((record) => {
        return `${record.characterLevel}:${record.classId}:${record.classLevel}:${record.hitDie}`;
      });

    record(
      "Level-by-level order controls multiclass HP and hit dice",
      {
        wizardAddedForOrder,
        wizardMovedFirst,
        levelOrder:
          creatorState.draft
            .classProgression
            .levelOrder,
        levelOrderRecords,
        fighterFirstHp,
        wizardFirstHp
      },
      {
        wizardAddedForOrder: true,
        wizardMovedFirst: true,
        levelOrder: [
          "wizard-2",
          "fighter-1"
        ],
        levelOrderRecords: [
          "1:wizard:1:d6",
          "2:fighter:1:d10"
        ],
        fighterFirstHp: 14,
        wizardFirstHp: 12
      }
    );

    const reorderedStartingClass =
      getStartingClassEntry(
        creatorState.draft
      );

    const reorderedFighterSummary =
      formatClassEntryProficiencySummary(
        creatorState.draft
          .classProgression
          .classes[0],
        0,
        creatorState.draft
      );

    const reorderedWizardSummary =
      formatClassEntryProficiencySummary(
        creatorState.draft
          .classProgression
          .classes[1],
        1,
        creatorState.draft
      );

    const reorderedClassHtml =
      renderMulticlassProgressionEditor(
        creatorState.draft
      );

    const startingClassRemovalBlocked =
      removeMulticlassClass(1);

    const reorderedRoundTrip =
      normalizeCharacter(
        cloneData(
          creatorState.draft
        )
      );

    reorderedRoundTrip
      .proficiencies
      .savingThrows = [
        "Strength",
        "Constitution"
      ];

    ensureProficiencySources(
      reorderedRoundTrip
    ).savingThrows = {
      Strength: [
        "class:fighter"
      ],
      Constitution: [
        "class:fighter"
      ]
    };

    replaceDraft(
      reorderedRoundTrip,
      {
        characterId: null,
        dirty: true,
        stepId: "review"
      }
    );

    const reorderedLoadedHp =
      calculateCharacterHp(
        creatorState.draft
      );

    record(
      "Character Level 1 controls every starting-class benefit",
      {
        cardOrder:
          creatorState.draft
            .classProgression
            .classes
            .map((entry) => entry.classId),
        startingClass:
          reorderedStartingClass?.classId,
        compatibilityClass:
          creatorState.draft.classId,
        savingThrows:
          creatorState.draft
            .proficiencies
            .savingThrows,
        noFighterSavingThrows:
          !creatorState.draft
            .proficiencies
            .savingThrows
            .includes("Strength") &&
          !reorderedFighterSummary.includes(
            "Saving throws"
          ),
        wizardStartingSummary:
          reorderedWizardSummary.includes(
            "Saving throws: Intelligence, Wisdom"
          ),
        fighterMulticlassArmor:
          reorderedFighterSummary.includes(
            "Armor: Light Armor, Medium Armor, Shields"
          ) &&
          !reorderedFighterSummary.includes(
            "Heavy Armor"
          ),
        startingClassLabel:
          reorderedClassHtml.includes(
            "Starting Class"
          ),
        secondaryRemoveButton:
          /data-cc-action="remove-multiclass-class"\s+data-class-index="0"/.test(
            reorderedClassHtml
          ) &&
          !/data-cc-action="remove-multiclass-class"\s+data-class-index="1"/.test(
            reorderedClassHtml
          ),
        startingClassRemovalBlocked,
        roundTripStartingClass:
          getStartingClassEntry(
            creatorState.draft
          )?.classId,
        roundTripCompatibilityClass:
          creatorState.draft.classId,
        roundTripFirstLevel:
          creatorState.draft
            .classProgression
            .levelOrder[0],
        loadedSavingThrows:
          creatorState.draft
            .proficiencies
            .savingThrows,
        loadedHitDie:
          reorderedLoadedHp.hitDie,
        loadedMaximumHp:
          reorderedLoadedHp.maximumHp
      },
      {
        cardOrder: [
          "fighter",
          "wizard"
        ],
        startingClass: "wizard",
        compatibilityClass: "wizard",
        savingThrows: [
          "Intelligence",
          "Wisdom"
        ],
        noFighterSavingThrows: true,
        wizardStartingSummary: true,
        fighterMulticlassArmor: true,
        startingClassLabel: true,
        secondaryRemoveButton: true,
        startingClassRemovalBlocked: false,
        roundTripStartingClass: "wizard",
        roundTripCompatibilityClass: "wizard",
        roundTripFirstLevel: "wizard-2",
        loadedSavingThrows: [
          "Intelligence",
          "Wisdom"
        ],
        loadedHitDie: "d6",
        loadedMaximumHp: 12
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection12Class("fighter");

    setCharacterLevel(2);

    creatorState.draft.abilities.base = {
      ...creatorState.draft.abilities.base,
      str: 13,
      dex: 13,
      int: 13
    };

    recalculateAbilityTotals(
      creatorState.draft
    );

    const wizardAddedForLevelUp =
      addMulticlassClass("wizard");

    const fighterLeveledUp =
      addCharacterLevelToClass(0);

    const wizardLeveledUp =
      addCharacterLevelToClass(1);

    const lastLevelRemoved =
      removeLastCharacterLevel();

    record(
      "Level-up workflow appends and removes ordered character levels",
      {
        wizardAddedForLevelUp,
        fighterLeveledUp,
        wizardLeveledUp,
        lastLevelRemoved,
        totalLevel:
          creatorState.draft
            .classProgression
            .totalLevel,
        levels:
          creatorState.draft
            .classProgression
            .classes
            .map((entry) => {
              return `${entry.classId}:${entry.level}`;
            }),
        levelOrder:
          creatorState.draft
            .classProgression
            .levelOrder,
        records:
          getCharacterLevelHitDieRecords(
            creatorState.draft
          ).map((record) => {
            return `${record.characterLevel}:${record.classId}:${record.classLevel}`;
          })
      },
      {
        wizardAddedForLevelUp: true,
        fighterLeveledUp: true,
        wizardLeveledUp: true,
        lastLevelRemoved: true,
        totalLevel: 3,
        levels: [
          "fighter:2",
          "wizard:1"
        ],
        levelOrder: [
          "fighter-1",
          "wizard-2",
          "fighter-1"
        ],
        records: [
          "1:fighter:1",
          "2:wizard:1",
          "3:fighter:2"
        ]
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection12Class("fighter");

    addCharacterLevelToClass(0);
    addCharacterLevelToClass(0);

    const fighterLevelThreeUnlockHtml =
      renderLevelUpWorkflow(
        creatorState.draft
      );

    const fighterLevelThreeClassHtml =
      renderClassStep();

    const championSelectedFromUnlock =
      setMulticlassSubclass(0, "champion");

    addCharacterLevelToClass(0);

    const fighterLevelFourUnlockHtml =
      renderLevelUpWorkflow(
        creatorState.draft
      );

    const fighterLevelFourAsiSlot =
      getUnlockedFeatChoiceSlots(
        creatorState.draft
      ).find((slot) => {
        return (
          slot.classId === "fighter" &&
          slot.classLevel === 4
        );
      });

    const fighterFeatModeSelected =
      setSection12AsiMode(
        fighterLevelFourAsiSlot?.id,
        "feat"
      );

    const fighterFeatPickerHtml =
      renderLevelUpWorkflow(
        creatorState.draft
      );

    const fighterAlertSelected =
      setSection12AsiFeat(
        fighterLevelFourAsiSlot?.id,
        "alert"
      );

    const fighterAlertHtml =
      renderLevelUpWorkflow(
        creatorState.draft
      );

    const fighterAlertClassHtml =
      renderClassStep();

    record(
      "Level-up workflow keeps subclass and feat unlocks compact",
      {
        levelThreeSubclass:
          fighterLevelThreeUnlockHtml.includes(
            "Latest Level Unlock"
          ) &&
          fighterLevelThreeUnlockHtml.includes(
            "Martial Archetype"
          ) &&
          fighterLevelThreeUnlockHtml.includes(
            "Choose or change this selection in Class Progression"
          ) &&
          !fighterLevelThreeUnlockHtml.includes(
            "ccLatestSubclass-0"
          ),
        singleSubclassPicker:
          (
            fighterLevelThreeClassHtml.match(
              /data-multiclass-subclass-index="0"/g
            ) || []
          ).length === 1 &&
          !fighterLevelThreeClassHtml.includes(
            'data-cc-action="choose-subclass"'
          ),
        championSelectedFromUnlock,
        levelFourAsi:
          fighterLevelFourUnlockHtml.includes(
            "ASI / Feat Unlocked"
          ) &&
          fighterLevelFourUnlockHtml.includes(
            "Ability Score Improvement"
          ) &&
          fighterLevelFourUnlockHtml.includes(
            "Pending ASI or feat choice"
          ),
        subclassUnlockNotRepeated:
          !fighterLevelFourUnlockHtml.includes(
            "Latest Level Unlock: Martial Archetype"
          ),
        fighterFeatModeSelected,
        compactFeatPicker:
          fighterFeatPickerHtml.includes(
            "hg-feat-picker-panel"
          ) &&
          fighterFeatPickerHtml.includes(
            "hg-feat-picker-scroll"
          ) &&
          fighterFeatPickerHtml.includes(
            "Search Feats"
          ),
        fighterAlertSelected,
        selectedFeatClosesPicker:
          fighterAlertHtml.includes(
            "Feat: Alert"
          ) &&
          fighterAlertHtml.includes(
            "Change Feat"
          ) &&
          !/<details[^>]*class="hg-feat-picker-panel"[^>]*\sopen(?:\s|>)/.test(
            fighterAlertHtml
          ),
        noDuplicateLatestFeatPicker:
          (
            fighterAlertClassHtml.match(
              /class="hg-feat-picker-panel"/g
            ) || []
          ).length <= 1,
        latestLevel:
          creatorState.draft
            .classProgression
            .totalLevel
      },
      {
        levelThreeSubclass: true,
        singleSubclassPicker: true,
        championSelectedFromUnlock: true,
        levelFourAsi: true,
        subclassUnlockNotRepeated: true,
        fighterFeatModeSelected: true,
        compactFeatPicker: true,
        fighterAlertSelected: true,
        selectedFeatClosesPicker: true,
        noDuplicateLatestFeatPicker: true,
        latestLevel: 4
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection12Class("fighter");

    creatorState.draft.abilities.base = {
      ...creatorState.draft.abilities.base,
      str: 13,
      int: 13
    };

    recalculateAbilityTotals(
      creatorState.draft
    );

    addCharacterLevelToClass(0);
    addCharacterLevelToClass(0);

    const wizardAddedForAsiAudit =
      addMulticlassClass("wizard");

    addCharacterLevelToClass(0);

    const fighterThreeWizardOneSlots =
      getUnlockedFeatChoiceSlots(
        creatorState.draft
      );

    addCharacterLevelToClass(0);

    const fighterFourWizardOneSlots =
      getUnlockedFeatChoiceSlots(
        creatorState.draft
      );

    addCharacterLevelToClass(1);
    addCharacterLevelToClass(1);
    addCharacterLevelToClass(1);

    const fighterFourWizardFourSlots =
      getUnlockedFeatChoiceSlots(
        creatorState.draft
      );

    record(
      "ASI slots use individual class levels instead of total character level",
      {
        wizardAddedForAsiAudit,
        fighterThreeWizardOne:
          fighterThreeWizardOneSlots.map((slot) => {
            return `${slot.classId}:${slot.classLevel}`;
          }),
        fighterFourWizardOne:
          fighterFourWizardOneSlots.map((slot) => {
            return `${slot.classId}:${slot.classLevel}`;
          }),
        fighterFourWizardFour:
          fighterFourWizardFourSlots.map((slot) => {
            return `${slot.classId}:${slot.classLevel}`;
          })
      },
      {
        wizardAddedForAsiAudit: true,
        fighterThreeWizardOne: [],
        fighterFourWizardOne: [
          "fighter:4"
        ],
        fighterFourWizardFour: [
          "fighter:4",
          "wizard:4"
        ]
      }
    );

    const fighterAsiSlot =
      fighterFourWizardFourSlots[0];
    const wizardAsiSlot =
      fighterFourWizardFourSlots[1];

    const fighterFeatModeForDuplicateTest =
      setSection12AsiMode(
        fighterAsiSlot?.id,
        "feat"
      );

    const fighterAlertForDuplicateTest =
      setSection12AsiFeat(
        fighterAsiSlot?.id,
        "alert"
      );

    const wizardFeatModeForDuplicateTest =
      setSection12AsiMode(
        wizardAsiSlot?.id,
        "feat"
      );

    const fighterFeatOptionHtml =
      renderSection12CompactAsiChoice(
        fighterAsiSlot
      );

    const wizardFeatOptionHtml =
      renderSection12CompactAsiChoice(
        wizardAsiSlot
      );

    const duplicateAlertRejected =
      !setSection12AsiFeat(
        wizardAsiSlot?.id,
        "alert"
      );

    record(
      "Feat picker labels and blocks duplicate non-repeatable feats",
      {
        fighterFeatModeForDuplicateTest,
        fighterAlertForDuplicateTest,
        wizardFeatModeForDuplicateTest,
        duplicateAlertRejected,
        selectedLabel:
          fighterFeatOptionHtml.includes(
            "Selected"
          ),
        duplicateLabel:
          wizardFeatOptionHtml.includes(
            "Already selected"
          ),
        prerequisiteLabel:
          wizardFeatOptionHtml.includes(
            "Prerequisite not met"
          ),
        chooseLabel:
          wizardFeatOptionHtml.includes(
            "Choose Feat"
          )
      },
      {
        fighterFeatModeForDuplicateTest: true,
        fighterAlertForDuplicateTest: true,
        wizardFeatModeForDuplicateTest: true,
        duplicateAlertRejected: true,
        selectedLabel: true,
        duplicateLabel: true,
        prerequisiteLabel: true,
        chooseLabel: true
      }
    );

    const stableMigrationDraft =
      cloneData(creatorState.draft);

    stableMigrationDraft.feats = [];
    stableMigrationDraft.classChoices = {};
    stableMigrationDraft
      .classProgression
      .classes
      .forEach((classEntry) => {
        classEntry.choices = {
          ...(classEntry.choices || {}),
          classFeatures: {}
        };
      });

    stableMigrationDraft.advancementChoices = [
      {
        id: fighterAsiSlot.id,
        classEntryId:
          fighterAsiSlot.classEntryId,
        classId: fighterAsiSlot.classId,
        classLevel:
          fighterAsiSlot.classLevel,
        mode: ""
      },
      {
        id: fighterAsiSlot.legacyId,
        classId: fighterAsiSlot.classId,
        classLevel:
          fighterAsiSlot.classLevel,
        mode: "feat",
        featId: "alert",
        featName: "Alert"
      }
    ];

    const migratedStableDraft =
      normalizeCharacter(
        stableMigrationDraft
      );

    const migratedStableChoices =
      migratedStableDraft
        .advancementChoices
        .filter((choice) => {
          return (
            choice.classId === "fighter" &&
            choice.classLevel === 4
          );
        });

    const duplicateImportDraft =
      cloneData(stableMigrationDraft);

    duplicateImportDraft.feats = [
      "alert"
    ];
    duplicateImportDraft.advancementChoices = [
      {
        id: fighterAsiSlot.id,
        classEntryId:
          fighterAsiSlot.classEntryId,
        classId: fighterAsiSlot.classId,
        classLevel:
          fighterAsiSlot.classLevel,
        mode: "feat",
        featId: "alert",
        featName: "Alert"
      },
      {
        id: wizardAsiSlot.id,
        classEntryId:
          wizardAsiSlot.classEntryId,
        classId: wizardAsiSlot.classId,
        classLevel:
          wizardAsiSlot.classLevel,
        mode: "feat",
        featId: "alert",
        featName: "Alert"
      }
    ];

    const cleanedDuplicateImport =
      normalizeCharacter(
        duplicateImportDraft
      );

    const cleanedDuplicateSlots =
      getUnlockedFeatChoiceSlots(
        cleanedDuplicateImport
      ).filter((slot) => {
        return (
          slot.selectedFeatId ===
          "alert"
        );
      });

    record(
      "ASI migration prefers stable slots and cleans duplicate imported feats",
      {
        migratedChoiceCount:
          migratedStableChoices.length,
        migratedChoiceId:
          migratedStableChoices[0]?.id,
        migratedFeatId:
          migratedStableChoices[0]?.featId,
        duplicateSelectedCount:
          cleanedDuplicateSlots.length,
        duplicateWarning:
          cleanArray(
            cleanedDuplicateImport
              ?.builder
              ?.validation
              ?.migrationWarnings
          ).includes(
            "Duplicate feat detected: Alert. Non-repeatable feats should only be selected once."
          )
      },
      {
        migratedChoiceCount: 1,
        migratedChoiceId:
          fighterAsiSlot.id,
        migratedFeatId: "alert",
        duplicateSelectedCount: 1,
        duplicateWarning: true
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection12Class("fighter");
    addCharacterLevelToClass(0);
    addCharacterLevelToClass(0);
    addCharacterLevelToClass(0);

    record(
      "Single-class Review warns about a pending ASI or feat choice",
      getSection17Warnings().some((warning) => {
        return warning.includes(
          "Fighter class level 4 has a pending ASI or feat choice."
        );
      }),
      true
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate(
      "half-elf"
    );

    creatorState.draft
      .species
      .choices
      .halfElfAbilityOne = "cha";

    creatorState.draft
      .species
      .choices
      .halfElfAbilityTwo = "dex";

    creatorState.draft
      .species
      .choices
      .halfElfSkillOne = "perception";

    creatorState.draft
      .species
      .choices
      .halfElfSkillTwo = "stealth";

    creatorState.draft
      .species
      .choices
      .halfElfLanguage = "Dwarvish";

    record(
      "Half-Elf rejects Charisma flexible ability",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .halfElfAbilityOne = "dex";

    creatorState.draft
      .species
      .choices
      .halfElfAbilityTwo = "dex";

    record(
      "Half-Elf rejects duplicate flexible ability",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .halfElfAbilityTwo = "con";

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    record(
      "Half-Elf grants exactly two chosen skills",
      Object.values(
        creatorState.draft
          .proficiencies
          .skills
      )
        .filter((entry) => {
          return cleanArray(
            entry.source
          ).includes(
            "species-choice:half-elf"
          );
        })
        .length,
      2
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate(
      "half-elf"
    );

    record(
      "Half-Elf blocks completion until choices are valid",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .halfElfAbilityOne = "dex";

    creatorState.draft
      .species
      .choices
      .halfElfAbilityTwo = "luck";

    creatorState.draft
      .species
      .choices
      .halfElfSkillOne = "perception";

    creatorState.draft
      .species
      .choices
      .halfElfSkillTwo = "stealth";

    creatorState.draft
      .species
      .choices
      .halfElfLanguage = "Dwarvish";

    record(
      "Half-Elf rejects invalid ability choices",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .halfElfAbilityTwo = "con";

    creatorState.draft
      .species
      .choices
      .halfElfSkillTwo = "not-a-skill";

    record(
      "Half-Elf rejects invalid skill choices",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .halfElfSkillTwo = "perception";

    record(
      "Half-Elf rejects duplicate skill choices",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .halfElfSkillTwo = "stealth";

    creatorState.draft
      .species
      .choices
      .halfElfLanguage = "Elvish";

    record(
      "Half-Elf rejects non-additional language choices",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .halfElfLanguage = "Dwarvish";

    record(
      "Half-Elf completes with two abilities two skills and a language",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      true
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate(
      "dragonborn"
    );

    creatorState.draft
      .species
      .choices
      .draconicAncestry = "sparkle";

    record(
      "Dragonborn rejects invalid ancestry choices",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate("elf");

    record(
      "Species with subraces require a valid subrace",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .subraceId = "moon-elf";

    record(
      "Species with subraces reject invalid subraces",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate("dwarf");
    chooseSection11Subrace("hill-dwarf");

    record(
      "Dwarf requires a valid tool choice",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .dwarfTool = "Thieves' tools";

    record(
      "Dwarf rejects invalid tool choices",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .dwarfTool = "Mason's tools";

    record(
      "Dwarf completes with a valid tool choice",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      true
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate("dwarf");

    creatorState.draft
      .species
      .choices
      .dwarfTool = "Smith's tools";

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    creatorState.draft
      .species
      .choices
      .dwarfTool =
        "Brewer's supplies";

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    record(
      "Dwarf tool choice replaces previous cleanly",
      {
        tools:
          creatorState.draft
            .proficiencies
            .tools,
        oldSource:
          ensureProficiencySources(
            creatorState.draft
          )
            .tools
            ?.[
              "Smith's tools"
            ] || [],
        newSource:
          ensureProficiencySources(
            creatorState.draft
          )
            .tools
            ?.[
              "Brewer's supplies"
            ] || []
      },
      {
        tools: [
          "Brewer's supplies"
        ],
        oldSource: [],
        newSource: [
          "species-choice:dwarf"
        ]
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate("human");

    record(
      "Human requires an additional language",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .humanLanguage = "Common";

    record(
      "Human rejects non-additional language choices",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .humanLanguage = "Elvish";

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    record(
      "Human language uses species choice source",
      ensureProficiencySources(
        creatorState.draft
      )
        .languages
        ?.Elvish || [],
      ["species-choice:human"]
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate("elf");
    chooseSection11Subrace("high-elf");

    record(
      "High Elf requires language and cantrip choices",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .highElfLanguage = "Common";

    creatorState.draft
      .species
      .choices
      .highElfCantrip = "Fire Bolt";

    record(
      "High Elf rejects non-additional language choices",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .highElfLanguage = "Dwarvish";

    creatorState.draft
      .species
      .choices
      .highElfCantrip = "Eldritch Blast";

    record(
      "High Elf rejects non-Wizard cantrip choices",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .highElfLanguage = "Dwarvish";

    creatorState.draft
      .species
      .choices
      .highElfCantrip = "Fire Bolt";

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    record(
      "High Elf cantrip is innate Intelligence spell",
      {
        knownCantrips:
          getSpellSelectionLimits(
            creatorState.draft
          ).knownCantripCount,
        spell:
          getSection16InnateSpells(
            creatorState.draft
          ).map((spell) => {
            return {
              name: spell.name,
              ability:
                spell.spellcastingAbility,
              source: spell.source
            };
          })
      },
      {
        knownCantrips: 0,
        spell: [
          {
            name: "Fire Bolt",
            ability: "int",
            source:
              "species-choice:high-elf"
          }
        ]
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    setSourceProficiencyList(
      "tools",
      ["Thieves' tools"],
      "manual"
    );

    setSourceProficiencyList(
      "languages",
      ["Abyssal"],
      "background:custom"
    );

    chooseSpeciesFromTemplate("dwarf");

    creatorState.draft
      .species
      .choices
      .dwarfTool = "Smith's tools";

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    chooseSpeciesFromTemplate("human");

    creatorState.draft
      .species
      .choices
      .humanLanguage = "Elvish";

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    const speciesChangeSources =
      ensureProficiencySources(
        creatorState.draft
      );

    record(
      "Changing species removes only species-granted choices",
      {
        tools:
          creatorState.draft
            .proficiencies
            .tools
            .slice()
            .sort(),
        smithSource:
          speciesChangeSources
            .tools
            ?.[
              "Smith's tools"
            ] || [],
        manualToolSource:
          speciesChangeSources
            .tools
            ?.[
              "Thieves' tools"
            ] || [],
        languages:
          creatorState.draft
            .proficiencies
            .languages
            .slice()
            .sort(),
        backgroundLanguageSource:
          speciesChangeSources
            .languages
            ?.Abyssal || [],
        commonSource:
          speciesChangeSources
            .languages
            ?.Common || [],
        humanLanguageSource:
          speciesChangeSources
            .languages
            ?.Elvish || []
      },
      {
        tools: [
          "Thieves' tools"
        ],
        smithSource: [],
        manualToolSource: ["manual"],
        languages: [
          "Abyssal",
          "Common",
          "Elvish"
        ],
        backgroundLanguageSource: [
          "background:custom"
        ],
        commonSource: [
          "species:human"
        ],
        humanLanguageSource: [
          "species-choice:human"
        ]
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    setSourceProficiencyList(
      "languages",
      ["Abyssal"],
      "manual"
    );

    chooseSpeciesFromTemplate("elf");
    chooseSection11Subrace("high-elf");

    creatorState.draft
      .species
      .choices
      .highElfLanguage = "Dwarvish";

    creatorState.draft
      .species
      .choices
      .highElfCantrip = "Fire Bolt";

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    chooseSection11Subrace("wood-elf");

    const subraceChangeSources =
      ensureProficiencySources(
        creatorState.draft
      );

    record(
      "Changing subrace removes only previous subrace choices",
      {
        languages:
          creatorState.draft
            .proficiencies
            .languages
            .slice()
            .sort(),
        oldLanguageSource:
          subraceChangeSources
            .languages
            ?.Dwarvish || [],
        manualLanguageSource:
          subraceChangeSources
            .languages
            ?.Abyssal || [],
        innateSpells:
          getSection16InnateSpells(
            creatorState.draft
          ).map((spell) => {
            return spell.name;
          })
      },
      {
        languages: [
          "Abyssal",
          "Common",
          "Elvish"
        ],
        oldLanguageSource: [],
        manualLanguageSource: [
          "manual"
        ],
        innateSpells: []
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate("elf");
    chooseSection11Subrace("dark-elf");

    creatorState.draft
      .classProgression
      .totalLevel = 1;

    creatorState.draft
      .classProgression
      .classes = [
        {
          classId: "barbarian",
          className: "Barbarian",
          level: 1,
          templateSnapshot:
            getTemplate(
              DEFAULT_CLASS_TEMPLATES,
              "barbarian"
            )
        }
      ];

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    const darkElfLevelOneSpells =
      getSection16InnateSpells(
        creatorState.draft
      ).map((spell) => {
        return {
          name: spell.name,
          level: spell.level,
          ability:
            spell.spellcastingAbility,
          source: spell.source
        };
      });

    creatorState.draft
      .classProgression
      .totalLevel = 3;

    creatorState.draft
      .classProgression
      .classes[0]
      .level = 3;

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    const darkElfLevelThreeNames =
      getSection16InnateSpells(
        creatorState.draft
      ).map((spell) => {
        return spell.name;
      });

    creatorState.draft
      .classProgression
      .totalLevel = 5;

    creatorState.draft
      .classProgression
      .classes[0]
      .level = 5;

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    const darkElfLevelFive =
      getSection16InnateSpells(
        creatorState.draft
      );

    record(
      "Dark Elf innate spells unlock by level",
      {
        levelOne:
          darkElfLevelOneSpells,
        levelThree:
          darkElfLevelThreeNames,
        levelFive:
          darkElfLevelFive.map((spell) => {
            return {
              name: spell.name,
              level: spell.level,
              ability:
                spell.spellcastingAbility,
              source: spell.source
            };
          })
      },
      {
        levelOne: [
          {
            name: "Dancing Lights",
            level: 0,
            ability: "cha",
            source:
              "subrace:dark-elf"
          }
        ],
        levelThree: [
          "Dancing Lights",
          "Faerie Fire"
        ],
        levelFive: [
          {
            name: "Dancing Lights",
            level: 0,
            ability: "cha",
            source:
              "subrace:dark-elf"
          },
          {
            name: "Faerie Fire",
            level: 1,
            ability: "cha",
            source:
              "subrace:dark-elf"
          },
          {
            name: "Darkness",
            level: 2,
            ability: "cha",
            source:
              "subrace:dark-elf"
          }
        ]
      }
    );

    const darkElfLimits =
      getSpellSelectionLimits(
        creatorState.draft
      );

    record(
      "Dark Elf innate spells do not count against class spell limits",
      {
        knownCantrips:
          darkElfLimits
            .knownCantripCount,
        knownLeveled:
          darkElfLimits
            .knownLeveledCount,
        prepared:
          darkElfLimits
            .preparedCount,
        slots:
          getSpellcastingSummary(
            creatorState.draft
          ).classes.map((entry) => {
            return entry.spellSlots || {};
          })
      },
      {
        knownCantrips: 0,
        knownLeveled: 0,
        prepared: 0,
        slots: [{}]
      }
    );

    const darkElfPayload =
      createCharacterPayload(
        creatorState.draft
      );

    const darkElfImported =
      normalizeCharacter(
        darkElfPayload
      );

    const darkElfDuplicated =
      normalizeCharacter(
        cloneData(creatorState.draft)
      );

    record(
      "Dark Elf innate spells persist through save import and duplication",
      {
        payload:
          darkElfPayload
            .magic
            .innateSpells
            .map((spell) => {
              return spell.name;
            }),
        imported:
          darkElfImported
            .magic
            .innateSpells
            .map((spell) => {
              return spell.name;
            }),
        duplicated:
          darkElfDuplicated
            .magic
            .innateSpells
            .map((spell) => {
              return spell.name;
            })
      },
      {
        payload: [
          "Dancing Lights",
          "Faerie Fire",
          "Darkness"
        ],
        imported: [
          "Dancing Lights",
          "Faerie Fire",
          "Darkness"
        ],
        duplicated: [
          "Dancing Lights",
          "Faerie Fire",
          "Darkness"
        ]
      }
    );

    chooseSpeciesFromTemplate("human");

    record(
      "Changing species removes Dark Elf innate spells",
      getSection16InnateSpells(
        creatorState.draft
      ).length,
      0
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate("gnome");
    chooseSection11Subrace("forest-gnome");

    creatorState.draft
      .classProgression
      .totalLevel = 1;

    creatorState.draft
      .classProgression
      .classes = [
        {
          classId: "barbarian",
          className: "Barbarian",
          level: 1,
          templateSnapshot:
            getTemplate(
              DEFAULT_CLASS_TEMPLATES,
              "barbarian"
            )
        }
      ];

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    const forestGnomeLimits =
      getSpellSelectionLimits(
        creatorState.draft
      );

    record(
      "Forest Gnome Minor Illusion is innate Intelligence spell",
      {
        spell:
          getSection16InnateSpells(
            creatorState.draft
          ).map((spell) => {
            return {
              name: spell.name,
              level: spell.level,
              ability:
                spell.spellcastingAbility,
              source: spell.source
            };
          }),
        knownCantrips:
          forestGnomeLimits
            .knownCantripCount,
        knownLeveled:
          forestGnomeLimits
            .knownLeveledCount,
        prepared:
          forestGnomeLimits
            .preparedCount,
        slots:
          getSpellcastingSummary(
            creatorState.draft
          ).classes.map((entry) => {
            return entry.spellSlots || {};
          })
      },
      {
        spell: [
          {
            name: "Minor Illusion",
            level: 0,
            ability: "int",
            source:
              "subrace:forest-gnome"
          }
        ],
        knownCantrips: 0,
        knownLeveled: 0,
        prepared: 0,
        slots: [{}]
      }
    );

    chooseSection11Subrace("rock-gnome");

    record(
      "Changing gnome subrace removes Forest Gnome innate spell",
      getSection16InnateSpells(
        creatorState.draft
      ).length,
      0
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate("dwarf");
    chooseSection11Subrace("hill-dwarf");

    creatorState.draft
      .abilities
      .scores
      .con = 10;

    creatorState.draft
      .classProgression
      .totalLevel = 5;

    creatorState.draft
      .classProgression
      .classes = [
        {
          classId: "fighter",
          className: "Fighter",
          level: 5,
          templateSnapshot:
            getTemplate(
              DEFAULT_CLASS_TEMPLATES,
              "fighter"
            )
        }
      ];

    record(
      "Hill Dwarf adds one HP per level",
      calculateCharacterHp(
        creatorState.draft
      ),
      {
        ...calculateCharacterHp(
          creatorState.draft
        ),
        maximumHp: 39,
        speciesHpBonus: 5
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate("tiefling");

    creatorState.draft
      .classProgression
      .totalLevel = 5;

    creatorState.draft
      .classProgression
      .classes = [
        {
          classId: "barbarian",
          className: "Barbarian",
          level: 5,
          templateSnapshot:
            getTemplate(
              DEFAULT_CLASS_TEMPLATES,
              "barbarian"
            )
        }
      ];

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    record(
      "Tiefling innate spells do not create class slots",
      {
        spells:
          getSection16InnateSpells(
            creatorState.draft
          ).map((spell) => {
            return {
              name: spell.name,
              level: spell.level,
              ability:
                spell.spellcastingAbility
            };
          }),
        slots:
          getSpellcastingSummary(
            creatorState.draft
          ).classes.map((entry) => {
            return entry.spellSlots || {};
          })
      },
      {
        spells: [
          {
            name: "Thaumaturgy",
            level: 0,
            ability: "cha"
          },
          {
            name: "Hellish Rebuke",
            level: 1,
            ability: "cha"
          },
          {
            name: "Darkness",
            level: 2,
            ability: "cha"
          }
        ],
        slots: [{}]
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection14Background(
      "charlatan"
    );

    setSection14BackgroundChoiceList(
      "toolProficiencies",
      [
        "Disguise kit",
        "Forgery kit"
      ]
    );

    setSourceProficiencyList(
      "tools",
      creatorState.draft
        .background
        .featureChoices
        .toolProficiencies,
      "background:charlatan"
    );

    record(
      "Background tool choices use background source",
      ensureProficiencySources(
        creatorState.draft
      )
        .tools
        ?.[
          "Disguise kit"
        ] || [],
      ["background:charlatan"]
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection14Background(
      "criminal"
    );

    const criminalSkillSource =
      "background:criminal";

    [
      "deception",
      "stealth"
    ].forEach((skillId) => {
      const skill =
        SKILL_DEFINITIONS.find(
          (candidate) => {
            return candidate.id ===
              skillId;
          }
        );

      setSection14SkillEntry(
        skill,
        {
          proficient: true,
          expertise: false,
          source: [criminalSkillSource]
        }
      );
    });

    const criminalToolOptions =
      getSection14BackgroundToolOptions(
        getSelectedSection14Background()
      );

    record(
      "Generic background tool choice expands to exact options",
      {
        generic:
          criminalToolOptions.includes(
            "One gaming set"
          ),
        dice:
          criminalToolOptions.includes(
            "Dice set"
          ),
        cards:
          criminalToolOptions.includes(
            "Playing card set"
          ),
        slotOneDice:
          getSection14BackgroundToolOptionsForIndex(
            getSelectedSection14Background(),
            0
          ).includes("Dice set"),
        slotTwoDice:
          getSection14BackgroundToolOptionsForIndex(
            getSelectedSection14Background(),
            1
          ).includes("Dice set"),
        slotTwoFixed:
          getSection14BackgroundToolOptionsForIndex(
            getSelectedSection14Background(),
            1
          ).includes(
            "Thieves' tools"
          )
      },
      {
        generic: false,
        dice: true,
        cards: true,
        slotOneDice: true,
        slotTwoDice: false,
        slotTwoFixed: true
      }
    );

    setSection14BackgroundChoiceList(
      "toolProficiencies",
      [
        "One gaming set",
        "Thieves' tools"
      ]
    );

    setSourceProficiencyList(
      "tools",
      creatorState.draft
        .background
        .featureChoices
        .toolProficiencies,
      criminalSkillSource
    );

    record(
      "Generic background tool value does not complete background",
      {
        valid:
          countSection14ValidBackgroundToolChoices(),
        complete:
          isSection17BackgroundComplete(
            creatorState.draft
          )
      },
      {
        valid: 1,
        complete: false
      }
    );

    setSection14BackgroundChoiceList(
      "toolProficiencies",
      [
        "Dice set",
        "Playing card set"
      ]
    );

    setSourceProficiencyList(
      "tools",
      creatorState.draft
        .background
        .featureChoices
        .toolProficiencies,
      criminalSkillSource
    );

    record(
      "Background tool choices must match their exact slots",
      {
        valid:
          countSection14ValidBackgroundToolChoices(),
        complete:
          isSection17BackgroundComplete(
            creatorState.draft
          )
      },
      {
        valid: 1,
        complete: false
      }
    );

    setSection14BackgroundChoiceList(
      "toolProficiencies",
      [
        "Dice set",
        "Thieves' tools"
      ]
    );

    setSourceProficiencyList(
      "tools",
      creatorState.draft
        .background
        .featureChoices
        .toolProficiencies,
      criminalSkillSource
    );

    record(
      "Exact background tool choices complete background",
      {
        valid:
          countSection14ValidBackgroundToolChoices(),
        complete:
          isSection17BackgroundComplete(
            creatorState.draft
          ),
        source:
          ensureProficiencySources(
            creatorState.draft
          )
            .tools
            ?.[
              "Dice set"
            ] || []
      },
      {
        valid: 2,
        complete: true,
        source: [criminalSkillSource]
      }
    );

    setSourceProficiencyList(
      "tools",
      ["Brewer's supplies"],
      "manual"
    );

    setSection14BackgroundChoiceList(
      "toolProficiencies",
      [
        "Playing card set",
        "Thieves' tools"
      ]
    );

    setSourceProficiencyList(
      "tools",
      creatorState.draft
        .background
        .featureChoices
        .toolProficiencies,
      criminalSkillSource
    );

    record(
      "Replacing background tool choice preserves manual tools",
      {
        tools:
          creatorState.draft
            .proficiencies
            .tools
            .slice()
            .sort(),
        oldSource:
          ensureProficiencySources(
            creatorState.draft
          )
            .tools
            ?.[
              "Dice set"
            ] || [],
        manualSource:
          ensureProficiencySources(
            creatorState.draft
          )
            .tools
            ?.[
              "Brewer's supplies"
            ] || [],
        newSource:
          ensureProficiencySources(
            creatorState.draft
          )
            .tools
            ?.[
              "Playing card set"
            ] || []
      },
      {
        tools: [
          "Brewer's supplies",
          "Playing card set",
          "Thieves' tools"
        ],
        oldSource: [],
        manualSource: ["manual"],
        newSource: [criminalSkillSource]
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection14Background("acolyte");

    setSection14BackgroundChoiceList(
      "languageProficiencies",
      ["Celestial", "Infernal"]
    );

    setSourceProficiencyList(
      "languages",
      creatorState.draft
        .background
        .featureChoices
        .languageProficiencies,
      "background:acolyte"
    );

    record(
      "Background language choices use background source",
      ensureProficiencySources(
        creatorState.draft
      )
        .languages
        ?.Celestial || [],
      ["background:acolyte"]
    );

    applySection14BackgroundPackage(
      "acolyte-pack"
    );

    const acolyteItemCount =
      creatorState.draft
        .equipment
        .items
        .filter((item) => {
          return item.source ===
            "background:acolyte";
        })
        .length;

    applySection14BackgroundPackage(
      "acolyte-pack"
    );

    record(
      "Background equipment package does not duplicate",
      {
        items:
          creatorState.draft
            .equipment
            .items
            .filter((item) => {
              return item.source ===
                "background:acolyte";
            })
            .length,
        gp:
          creatorState.draft
            .equipment
            .currency
            .gp
      },
      {
        items: acolyteItemCount,
        gp: 15
      }
    );

    record(
      "Background package currency is source tracked",
      creatorState.draft
        .equipment
        .currencySources
        ["background:acolyte"]
        ?.[
          "acolyte-pack"
        ]
        ?.gp || 0,
      15
    );

    const withSection14Confirm = (
      response,
      action
    ) => {
      const hadWindow =
        typeof window !== "undefined";

      const previousConfirm =
        hadWindow
          ? window.confirm
          : null;

      let confirmMessage = "";

      const confirmMock = (message) => {
        confirmMessage =
          String(message || "");

        return response;
      };

      if (hadWindow) {
        window.confirm = confirmMock;
      } else {
        globalThis.window = {
          confirm: confirmMock
        };
      }

      try {
        action();
      } finally {
        if (hadWindow) {
          window.confirm =
            previousConfirm;
        } else {
          delete globalThis.window;
        }
      }

      return confirmMessage;
    };

    creatorState.draft =
      createEmptyCharacter();

    chooseSection14Background("acolyte");
    applySection14BackgroundPackage(
      "acolyte-pack"
    );

    const cancelItemCount =
      creatorState.draft
        .equipment
        .items
        .filter((item) => {
          return item.source ===
            "background:acolyte";
        })
        .length;

    const cancelMessage =
      withSection14Confirm(
        false,
        () => {
          chooseSection14Background(
            "charlatan"
          );
        }
      );

    record(
      "Background replacement confirmation names items and currency",
      {
        asksAboutBoth:
          cancelMessage.includes(
            "items and currency"
          ),
        itemCount:
          cancelMessage.includes(
            `Items to remove: ${cancelItemCount}`
          ),
        currency:
          cancelMessage.includes(
            "Currency to remove: 15 gp"
          ),
        cancelKeeps:
          cancelMessage.includes(
            "Cancel keeps the existing background items and currency."
          )
      },
      {
        asksAboutBoth: true,
        itemCount: true,
        currency: true,
        cancelKeeps: true
      }
    );

    record(
      "Canceling background replacement keeps old items and currency",
      {
        items:
          creatorState.draft
            .equipment
            .items
            .filter((item) => {
              return item.source ===
                "background:acolyte";
            })
            .length,
        gp:
          creatorState.draft
            .equipment
            .currency
            .gp,
        source:
          creatorState.draft
            .equipment
            .currencySources
            ["background:acolyte"]
            ?.[
              "acolyte-pack"
            ]
            ?.gp || 0
      },
      {
        items: cancelItemCount,
        gp: 15,
        source: 15
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection14Background("acolyte");
    applySection14BackgroundPackage(
      "acolyte-pack"
    );

    withSection14Confirm(
      true,
      () => {
        chooseSection14Background(
          "charlatan"
        );
      }
    );

    record(
      "Confirming background replacement removes old items and currency",
      {
        items:
          creatorState.draft
            .equipment
            .items
            .filter((item) => {
              return item.source ===
                "background:acolyte";
            })
            .length,
        gp:
          creatorState.draft
            .equipment
            .currency
            .gp,
        source:
          Boolean(
            creatorState.draft
              .equipment
              .currencySources
              ["background:acolyte"]
          )
      },
      {
        items: 0,
        gp: 0,
        source: false
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection14Background("acolyte");
    applySection14BackgroundPackage(
      "acolyte-pack"
    );

    creatorState.draft
      .equipment
      .currency
      .gp = 25;

    removeSection14BackgroundEquipment(
      "background:acolyte",
      "acolyte-pack"
    );

    record(
      "Removing background package preserves manual currency",
      {
        items:
          creatorState.draft
            .equipment
            .items
            .filter((item) => {
              return item.source ===
                "background:acolyte";
            })
            .length,
        gp:
          creatorState.draft
            .equipment
            .currency
            .gp,
        source:
          Boolean(
            creatorState.draft
              .equipment
              .currencySources
              ["background:acolyte"]
          )
      },
      {
        items: 0,
        gp: 10,
        source: false
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection14Background("acolyte");
    applySection14BackgroundPackage(
      "acolyte-pack"
    );

    chooseSection14Background(
      "charlatan"
    );
    applySection14BackgroundPackage(
      "charlatan-pack"
    );

    removeSection14BackgroundEquipment(
      "background:acolyte",
      "acolyte-pack"
    );

    record(
      "Removing one background package preserves other source currency",
      {
        gp:
          creatorState.draft
            .equipment
            .currency
            .gp,
        acolyte:
          Boolean(
            creatorState.draft
              .equipment
              .currencySources
              ["background:acolyte"]
          ),
        charlatan:
          creatorState.draft
            .equipment
            .currencySources
            ["background:charlatan"]
            ?.[
              "charlatan-pack"
            ]
            ?.gp || 0,
        charlatanItems:
          creatorState.draft
            .equipment
            .items
            .filter((item) => {
              return item.source ===
                "background:charlatan";
            })
            .length
      },
      {
        gp: 15,
        acolyte: false,
        charlatan: 15,
        charlatanItems: 4
      }
    );

    creatorState.draft =
      normalizeCharacter({
        background: {
          id: "acolyte",
          name: "Acolyte",
          source: "template",
          featureChoices: {
            appliedEquipmentPackageIds: [
              "acolyte-pack"
            ]
          }
        },
        equipment: {
          currency: {
            gp: 20
          },
          items: []
        }
      });

    removeSection14BackgroundEquipment(
      "background:acolyte",
      "acolyte-pack"
    );

    record(
      "Legacy background package currency is backfilled and removable",
      {
        gp:
          creatorState.draft
            .equipment
            .currency
            .gp,
        source:
          Boolean(
            creatorState.draft
              .equipment
              .currencySources
              ["background:acolyte"]
          )
      },
      {
        gp: 5,
        source: false
      }
    );

    const rolledMulticlass =
      createEmptyCharacter();

    rolledMulticlass
      .abilities
      .scores
      .con = 14;

    rolledMulticlass
      .classProgression
      .totalLevel = 5;

    rolledMulticlass
      .classProgression
      .classes = [
        {
          classId: "fighter",
          className: "Fighter",
          level: 3,
          templateSnapshot:
            getTemplate(
              DEFAULT_CLASS_TEMPLATES,
              "fighter"
            )
        },
        {
          classId: "wizard",
          className: "Wizard",
          level: 2,
          templateSnapshot:
            getTemplate(
              DEFAULT_CLASS_TEMPLATES,
              "wizard"
            )
        }
      ];

    rolledMulticlass.combat
      .hpCalculation = {
        mode: "rolled",
        levelOneValue: null,
        laterLevelValues: [
          6,
          8,
          10,
          9
        ],
        manualOverride: null,
        lastCalculatedConModifier: 2
      };

    const rolledHp =
      calculateCharacterHp(
        rolledMulticlass
      );

    record(
      "Fighter 3 Wizard 2 rolled HP caps Wizard rolls",
      {
        hp: rolledHp.maximumHp,
        rolls:
          rolledHp.rolls.map((roll) => {
            return {
              level:
                roll.characterLevel,
              classId:
                roll.classId,
              hitDie:
                roll.hitDie,
              roll:
                roll.roll
            };
          })
      },
      {
        hp: 46,
        rolls: [
          {
            level: 2,
            classId: "fighter",
            hitDie: "d10",
            roll: 6
          },
          {
            level: 3,
            classId: "fighter",
            hitDie: "d10",
            roll: 8
          },
          {
            level: 4,
            classId: "wizard",
            hitDie: "d6",
            roll: 6
          },
          {
            level: 5,
            classId: "wizard",
            hitDie: "d6",
            roll: 6
          }
        ]
      }
    );

    record(
      "Old rolled HP migration warning is recorded",
      warningTextFor(
        rolledMulticlass
      ).includes(
        "Old rolled HP values were migrated"
      ),
      true
    );

    rolledMulticlass.combat
      .hpCalculation
      .laterLevelValues =
        rolledHp.rolls;

    creatorState.draft =
      cloneData(
        rolledMulticlass
      );

    const rolledHpLevelHtml =
      renderLevelStep();

    record(
      "Rolled HP UI shows class and hit die for every level",
      {
        levelOne:
          /Level 1[\s\S]*Fighter[\s\S]*d10/.test(
            rolledHpLevelHtml
          ),
        levelFour:
          /Level 4[\s\S]*Wizard[\s\S]*d6/.test(
            rolledHpLevelHtml
          ),
        levelFive:
          /Level 5[\s\S]*Wizard[\s\S]*d6/.test(
            rolledHpLevelHtml
          )
      },
      {
        levelOne: true,
        levelFour: true,
        levelFive: true
      }
    );

    record(
      "Rolled HP UI caps inputs by each level hit die",
      {
        fighter:
          /id="ccHpRollLevel-2"[\s\S]*max="10"/.test(
            rolledHpLevelHtml
          ),
        wizard:
          /id="ccHpRollLevel-4"[\s\S]*max="6"/.test(
            rolledHpLevelHtml
          )
      },
      {
        fighter: true,
        wizard: true
      }
    );

    setSection13HpRollValue(4, 12);

    record(
      "Rolled HP input value is capped by active hit die",
      calculateCharacterHp(
        creatorState.draft
      ).rolls.find((roll) => {
        return roll.characterLevel === 4;
      })?.roll,
      6
    );

    const shiftedRolledMulticlass =
      cloneData(
        rolledMulticlass
      );

    shiftedRolledMulticlass
      .classProgression
      .classes[0]
      .level = 2;

    shiftedRolledMulticlass
      .classProgression
      .classes[1]
      .level = 3;

    shiftedRolledMulticlass
      .classProgression
      .totalLevel = 5;

    const shiftedRollState =
      getSection13HpRollState(
        shiftedRolledMulticlass,
        shiftedRolledMulticlass
          .combat
          .hpCalculation
      );

    record(
      "Changing class levels preserves compatible rolled HP",
      shiftedRollState
        .activeRolls
        .map((roll) => {
          return {
            level:
              roll.characterLevel,
            classId:
              roll.classId,
            roll:
              roll.roll
          };
        }),
      [
        {
          level: 2,
          classId: "fighter",
          roll: 6
        },
        {
          level: 3,
          classId: "wizard",
          roll: 6
        },
        {
          level: 4,
          classId: "wizard",
          roll: 6
        },
        {
          level: 5,
          classId: "wizard",
          roll: 4
        }
      ]
    );

    record(
      "Changed rolled HP levels show an adjustment warning",
      shiftedRollState
        .warnings
        .some((warning) => {
          return warning.includes(
            "level 3 is inactive or incompatible"
          );
        }),
      true
    );

    const reducedRolledMulticlass =
      cloneData(
        rolledMulticlass
      );

    reducedRolledMulticlass
      .classProgression
      .classes[0]
      .level = 3;

    reducedRolledMulticlass
      .classProgression
      .classes[1]
      .level = 0;

    reducedRolledMulticlass
      .classProgression
      .totalLevel = 3;

    const reducedRollState =
      getSection13HpRollState(
        reducedRolledMulticlass,
        reducedRolledMulticlass
          .combat
          .hpCalculation
      );

    record(
      "Removed rolled HP levels are reported as inactive",
      reducedRollState
        .inactiveRecords
        .map((record) => {
          return record.characterLevel;
        }),
      [
        4,
        5
      ]
    );

    creatorState.draft =
      cloneData(
        reducedRolledMulticlass
      );

    setSection13HpRollValue(2, 7);

    record(
      "Editing active rolled HP preserves inactive removed levels",
      creatorState.draft
        .combat
        .hpCalculation
        .laterLevelValues
        .filter((record) => {
          return record.characterLevel > 3;
        })
        .map((record) => {
          return record.characterLevel;
        }),
      [
        4,
        5
      ]
    );

    const storedRollsBeforeConChange =
      JSON.stringify(
        rolledMulticlass
          .combat
          .hpCalculation
          .laterLevelValues
      );

    rolledMulticlass
      .abilities
      .scores
      .con = 16;

    record(
      "Constitution changes preserve multiclass HP rolls",
      calculateCharacterHp(
        rolledMulticlass
      ).rolls.map((roll) => {
        return roll.roll;
      }),
      [
        6,
        8,
        6,
        6
      ]
    );

    record(
      "Constitution changes never replace stored HP rolls",
      JSON.stringify(
        rolledMulticlass
          .combat
          .hpCalculation
          .laterLevelValues
      ),
      storedRollsBeforeConChange
    );

    const createPhase4ClassEntry = (
      classId,
      level = 1
    ) => {
      const template =
        getTemplate(
          DEFAULT_CLASS_TEMPLATES,
          classId
        );

      return {
        entryId:
          `phase4-${classId}`,
        classId,
        className:
          template?.name ||
          classId,
        level,
        hitDie:
          template?.hitDie ||
          "d8",
        templateSnapshot:
          cloneData(template)
      };
    };

    const createPhase4FourDieCharacter =
      ({
        levelOrder,
        constitution = 10
      }) => {
        const abilityScores = {
          str: 13,
          dex: 13,
          con: constitution,
          int: 13,
          wis: 13,
          cha: 13
        };

        return normalizeCharacter({
          abilities: {
            base:
              abilityScores,
            scores:
              abilityScores
          },
          classProgression: {
            totalLevel: 4,
            classes: [
              createPhase4ClassEntry(
                "wizard"
              ),
              createPhase4ClassEntry(
                "bard"
              ),
              createPhase4ClassEntry(
                "fighter"
              ),
              createPhase4ClassEntry(
                "barbarian"
              )
            ],
            levelOrder
          },
          combat: {
            hpCalculation: {
              mode: "fixed",
              laterLevelValues: []
            }
          }
        });
      };

    const phase4D6First =
      createPhase4FourDieCharacter({
        levelOrder: [
          "phase4-wizard",
          "phase4-bard",
          "phase4-fighter",
          "phase4-barbarian"
        ]
      });

    const phase4D12First =
      createPhase4FourDieCharacter({
        levelOrder: [
          "phase4-barbarian",
          "phase4-wizard",
          "phase4-bard",
          "phase4-fighter"
        ]
      });

    const phase4ConstitutionCharacter =
      createPhase4FourDieCharacter({
        levelOrder: [
          "phase4-wizard",
          "phase4-bard",
          "phase4-fighter",
          "phase4-barbarian"
        ],
        constitution: 14
      });

    record(
      "Phase 4 keeps a separate Hit Die pool for every class",
      calculateCharacterHitDice(
        phase4D6First
      ).map((pool) => {
        return (
          `${pool.classId}:` +
          `${pool.count}${pool.die}`
        );
      }),
      [
        "wizard:1d6",
        "bard:1d8",
        "fighter:1d10",
        "barbarian:1d12"
      ]
    );

    record(
      "Phase 4 level 1 uses the starting class Hit Die maximum",
      {
        startingClass:
          getCharacterLevelHitDieRecords(
            phase4D6First
          )[0]?.classId,
        startingDie:
          getCharacterLevelHitDieRecords(
            phase4D6First
          )[0]?.hitDie,
        maximumHp:
          calculateCharacterHp(
            phase4D6First
          ).maximumHp
      },
      {
        startingClass:
          "wizard",
        startingDie: "d6",
        maximumHp: 24
      }
    );

    record(
      "Phase 4 later levels use d6 4, d8 5, d10 6, and d12 7 fixed averages",
      {
        d6Later:
          calculateCharacterHp(
            phase4D12First
          ).maximumHp,
        d12Later:
          calculateCharacterHp(
            phase4D6First
          ).maximumHp
      },
      {
        d6Later: 27,
        d12Later: 24
      }
    );

    record(
      "Phase 4 applies Constitution once per total character level",
      (
        calculateCharacterHp(
          phase4ConstitutionCharacter
        ).maximumHp -
        calculateCharacterHp(
          phase4D6First
        ).maximumHp
      ),
      8
    );

    const phase4HillDwarf =
      cloneData(
        phase4ConstitutionCharacter
      );
    phase4HillDwarf.species = {
      ...phase4HillDwarf.species,
      id: "dwarf",
      name: "Dwarf",
      choices: {
        ...phase4HillDwarf.species
          .choices,
        subraceId:
          "hill-dwarf"
      }
    };

    record(
      "Phase 4 applies Hill Dwarf HP once per total character level",
      {
        bonus:
          getSpeciesHpBonus(
            phase4HillDwarf
          ),
        maximumHp:
          calculateCharacterHp(
            phase4HillDwarf
          ).maximumHp
      },
      {
        bonus: 4,
        maximumHp: 36
      }
    );

    const phase4Tough =
      cloneData(
        phase4ConstitutionCharacter
      );
    phase4Tough.feats = [
      "tough"
    ];
    phase4Tough.selectedFeats = [
      "tough"
    ];

    record(
      "Phase 4 applies Tough once per total character level",
      {
        bonus:
          calculateSelectedFeatNumericEffect(
            phase4Tough,
            "hpBonus"
          ),
        maximumHp:
          calculateCharacterHp(
            phase4Tough
          ).maximumHp
      },
      {
        bonus: 8,
        maximumHp: 40
      }
    );

    record(
      "Phase 4 covers multiclass d6, d8, d10, and d12 HP combinations",
      {
        d6Start:
          calculateCharacterHp(
            phase4D6First
          ).maximumHp,
        d12Start:
          calculateCharacterHp(
            phase4D12First
          ).maximumHp,
        dice:
          getCharacterLevelHitDieRecords(
            phase4D6First
          ).map((record) => {
            return record.hitDie;
          })
      },
      {
        d6Start: 24,
        d12Start: 27,
        dice: [
          "d6",
          "d8",
          "d10",
          "d12"
        ]
      }
    );

    creatorState.draft =
      cloneData(
        phase4D6First
      );
    const phase4HpUi =
      renderLevelStep();

    record(
      "Phase 4 level UI displays class-specific Hit Die pools",
      {
        guidance:
          phase4HpUi.includes(
            "Each class keeps its own pool."
          ),
        wizard:
          phase4HpUi.includes(
            "1d6 Wizard"
          ),
        bard:
          phase4HpUi.includes(
            "1d8 Bard"
          ),
        fighter:
          phase4HpUi.includes(
            "1d10 Fighter"
          ),
        barbarian:
          phase4HpUi.includes(
            "1d12 Barbarian"
          )
      },
      {
        guidance: true,
        wizard: true,
        bard: true,
        fighter: true,
        barbarian: true
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    chooseSection12Class(
      "fighter"
    );
    setCharacterLevel(2);
    creatorState.draft
      .abilities.base = {
        ...creatorState.draft
          .abilities.base,
        str: 13,
        int: 13
      };
    recalculateAbilityTotals(
      creatorState.draft
    );

    const phase4FightingStyle =
      getSection12ClassFeaturesThroughLevel()
        .find((feature) => {
          return (
            feature.id ===
            "fighting-style-fighter"
          );
        });
    const phase4StyleSelected =
      toggleSection12ClassFeatureChoice(
        getSection12FeatureChoiceKey(
          phase4FightingStyle
        ),
        "Defense"
      );
    const phase4FighterLevelAdded =
      addCharacterLevelToClass(0);

    creatorState.draft
      .combat
      .hpCalculation =
        normalizeHpCalculation({
          mode: "rolled",
          laterLevelValues: []
        });
    setSection13HpRollValue(
      2,
      8
    );

    const phase4WizardAdded =
      addMulticlassClass(
        "wizard"
      );
    setSection13HpRollValue(
      3,
      4
    );

    const phase4HpAfterAdd =
      calculateCharacterHp(
        creatorState.draft
      );

    record(
      "Phase 4 recalculates rolled HP after adding a class",
      {
        styleSelected:
          phase4StyleSelected,
        fighterLevelAdded:
          phase4FighterLevelAdded,
        wizardAdded:
          phase4WizardAdded,
        maximumHp:
          phase4HpAfterAdd
            .maximumHp,
        rolls:
          phase4HpAfterAdd.rolls
            .map((roll) => {
              return (
                `${roll.classId}:` +
                `${roll.roll}`
              );
            }),
        hitDice:
          calculateCharacterHitDice(
            creatorState.draft
          ).map((pool) => {
            return (
              `${pool.count}${pool.die}`
            );
          })
      },
      {
        styleSelected: true,
        fighterLevelAdded: true,
        wizardAdded: true,
        maximumHp: 22,
        rolls: [
          "fighter:8",
          "wizard:4"
        ],
        hitDice: [
          "2d10",
          "1d6"
        ]
      }
    );

    const phase4StoredRollsBeforeMove =
      JSON.stringify(
        creatorState.draft
          .combat
          .hpCalculation
          .laterLevelValues
      );

    const phase4MovedOnce =
      moveCharacterLevelOrder(
        2,
        -1
      );
    const phase4HpAfterMove =
      calculateCharacterHp(
        creatorState.draft
      );

    record(
      "Phase 4 recalculates rolled HP after moving character levels",
      {
        moved:
          phase4MovedOnce,
        order:
          getCharacterLevelHitDieRecords(
            creatorState.draft
          ).map((record) => {
            return record.classId;
          }),
        rolls:
          phase4HpAfterMove.rolls
            .map((roll) => {
              return (
                `${roll.classId}:` +
                `${roll.roll}`
              );
            }),
        maximumHp:
          phase4HpAfterMove
            .maximumHp
      },
      {
        moved: true,
        order: [
          "fighter",
          "wizard",
          "fighter"
        ],
        rolls: [
          "wizard:4",
          "fighter:8"
        ],
        maximumHp: 22
      }
    );

    const phase4MovedToStart =
      moveCharacterLevelOrder(
        1,
        -1
      );
    const phase4HpWithWizardStart =
      calculateCharacterHp(
        creatorState.draft
      );
    const phase4WizardStartRollState =
      getSection13HpRollState(
        creatorState.draft
      );

    record(
      "Phase 4 level-order changes update HP without corrupting class-owned rolls",
      {
        moved:
          phase4MovedToStart,
        startingClass:
          getCharacterLevelHitDieRecords(
            creatorState.draft
          )[0]?.classId,
        maximumHp:
          phase4HpWithWizardStart
            .maximumHp,
        activeRolls:
          phase4HpWithWizardStart
            .rolls
            .map((roll) => {
              return (
                `${roll.classId}:` +
                `${roll.roll}`
              );
            }),
        storedUnchanged:
          JSON.stringify(
            creatorState.draft
              .combat
              .hpCalculation
              .laterLevelValues
          ) ===
          phase4StoredRollsBeforeMove,
        incompatibleWizardRoll:
          phase4WizardStartRollState
            .inactiveRecords
            .some((record) => {
              return (
                record.classId ===
                "wizard"
              );
            })
      },
      {
        moved: true,
        startingClass:
          "wizard",
        maximumHp: 20,
        activeRolls: [
          "fighter:8",
          "fighter:6"
        ],
        storedUnchanged: true,
        incompatibleWizardRoll:
          true
      }
    );

    moveCharacterLevelOrder(
      0,
      1
    );
    moveCharacterLevelOrder(
      1,
      1
    );
    const phase4WizardRemoved =
      removeMulticlassClass(1);
    const phase4HpAfterRemove =
      calculateCharacterHp(
        creatorState.draft
      );

    record(
      "Phase 4 recalculates rolled HP after removing a class",
      {
        removed:
          phase4WizardRemoved,
        maximumHp:
          phase4HpAfterRemove
            .maximumHp,
        rolls:
          phase4HpAfterRemove.rolls
            .map((roll) => {
              return (
                `${roll.classId}:` +
                `${roll.roll}`
              );
            }),
        hitDice:
          calculateCharacterHitDice(
            creatorState.draft
          ).map((pool) => {
            return (
              `${pool.classId}:` +
              `${pool.count}${pool.die}`
            );
          })
      },
      {
        removed: true,
        maximumHp: 18,
        rolls: [
          "fighter:8"
        ],
        hitDice: [
          "fighter:2d10"
        ]
      }
    );

    const phase4RollsBeforeConstitution =
      JSON.stringify(
        creatorState.draft
          .combat
          .hpCalculation
          .laterLevelValues
      );
    creatorState.draft
      .abilities.base = {
        ...creatorState.draft
          .abilities.base,
        con: 16
      };
    recalculateAbilityTotals(
      creatorState.draft
    );
    const phase4HpAfterConstitution =
      calculateCharacterHp(
        creatorState.draft
      );

    record(
      "Phase 4 recalculates rolled HP after changing Constitution",
      {
        maximumHp:
          phase4HpAfterConstitution
            .maximumHp,
        activeRoll:
          phase4HpAfterConstitution
            .rolls[0]?.roll,
        storedUnchanged:
          JSON.stringify(
            creatorState.draft
              .combat
              .hpCalculation
              .laterLevelValues
          ) ===
          phase4RollsBeforeConstitution
      },
      {
        maximumHp: 24,
        activeRoll: 8,
        storedUnchanged: true
      }
    );

    const phase4LegacyMulticlass =
      normalizeCharacter({
        abilities: {
          base: {
            str: 13,
            dex: 13,
            con: 10,
            int: 13,
            wis: 10,
            cha: 10
          }
        },
        classProgression: {
          totalLevel: 3,
          classes: [
            createPhase4ClassEntry(
              "fighter",
              2
            ),
            createPhase4ClassEntry(
              "wizard",
              1
            )
          ],
          levelOrder: [
            "phase4-fighter",
            "phase4-fighter",
            "phase4-wizard"
          ]
        },
        combat: {
          hpCalculation: {
            mode: "rolled",
            laterLevelValues: [
              8,
              99
            ]
          }
        }
      });
    const phase4LegacyHp =
      calculateCharacterHp(
        phase4LegacyMulticlass
      );

    record(
      "Phase 4 imports legacy numeric HP rolls into per-level records",
      {
        schemaVersion:
          phase4LegacyMulticlass
            .combat
            .hpCalculation
            .schemaVersion,
        maximumHp:
          phase4LegacyHp
            .maximumHp,
        records:
          phase4LegacyHp.rolls
            .map((roll) => {
              return {
                classId:
                  roll.classId,
                hitDie:
                  roll.hitDie,
                roll:
                  roll.roll
              };
            })
      },
      {
        schemaVersion: 2,
        maximumHp: 24,
        records: [
          {
            classId:
              "fighter",
            hitDie: "d10",
            roll: 8
          },
          {
            classId:
              "wizard",
            hitDie: "d6",
            roll: 6
          }
        ]
      }
    );

    record(
      "Phase 4 warns when legacy multiclass rolls are uncertain",
      warningTextFor(
        phase4LegacyMulticlass
      ).includes(
        "cannot be assigned to classes with certainty"
      ),
      true
    );

    const phase4CappedStructuredRoll =
      normalizeHpRollRecordsForCharacter(
        [
          {
            characterLevel: 2,
            classEntryId:
              "phase4-fighter",
            classId: "fighter",
            className: "Fighter",
            hitDie: "d10",
            roll: 8
          },
          {
            characterLevel: 3,
            classEntryId:
              "phase4-wizard",
            classId: "wizard",
            className: "Wizard",
            hitDie: "d6",
            roll: 99
          }
        ],
        phase4LegacyMulticlass
      );

    record(
      "Phase 4 prevents saved rolls from exceeding their associated Hit Die",
      phase4CappedStructuredRoll
        .map((roll) => {
          return (
            `${roll.hitDie}:` +
            `${roll.roll}`
          );
        }),
      [
        "d10:8",
        "d6:6"
      ]
    );

    record(
      "Imported equipped backpack normalizes unequipped",
      normalizeCharacter({
        equipment: {
          items: [
            {
              id: "backpack",
              name: "Backpack",
              isContainer: true,
              equipped: true
            }
          ]
        }
      }).equipment.items[0].equipped,
      false
    );

    const containedArmorCharacter =
      cloneData(fighterCharacter);

    containedArmorCharacter
      .abilities
      .scores
      .dex = 10;

    containedArmorCharacter
      .equipment
      .items = [
        normalizeSection15Item({
          id: "pack",
          name: "Pack",
          isContainer: true
        }),
        normalizeSection15Item({
          id: "mail",
          name: "Chain Mail",
          category: "armor",
          armorCategory: "heavy armor",
          baseArmorClass: 16,
          equipped: true,
          containerId: "pack"
        })
      ];

    record(
      "Contained armor does not affect AC",
      calculateArmorClassOptions(
        containedArmorCharacter
      ).selected.total,
      10
    );

    record(
      "All standard armors are present",
      catalogHas([
        "padded-armor",
        "leather-armor",
        "studded-leather-armor",
        "hide-armor",
        "chain-shirt",
        "scale-mail",
        "breastplate",
        "half-plate",
        "ring-mail",
        "chain-mail",
        "splint-armor",
        "plate-armor",
        "shield"
      ]),
      true
    );

    record(
      "All standard weapons are present",
      catalogHas([
        "club",
        "dagger",
        "greatclub",
        "handaxe",
        "javelin",
        "light-hammer",
        "mace",
        "quarterstaff",
        "sickle",
        "spear",
        "light-crossbow",
        "dart",
        "shortbow",
        "sling",
        "battleaxe",
        "flail",
        "glaive",
        "greataxe",
        "greatsword",
        "halberd",
        "lance",
        "longsword",
        "maul",
        "morningstar",
        "pike",
        "rapier",
        "scimitar",
        "shortsword",
        "trident",
        "war-pick",
        "warhammer",
        "whip",
        "blowgun",
        "hand-crossbow",
        "heavy-crossbow",
        "longbow",
        "net"
      ]),
      true
    );

    creatorState.draft =
      createEmptyCharacter();

    skipSection14Background();

    record(
      "Skipped background is complete",
      isSection17BackgroundComplete(
        creatorState.draft
      ),
      true
    );

    const phase3PrerequisiteLabels = {
      artificer: "Intelligence 13",
      barbarian: "Strength 13",
      bard: "Charisma 13",
      cleric: "Wisdom 13",
      druid: "Wisdom 13",
      fighter:
        "Strength 13 or Dexterity 13",
      monk:
        "Dexterity 13 and Wisdom 13",
      paladin:
        "Strength 13 and Charisma 13",
      ranger:
        "Dexterity 13 and Wisdom 13",
      rogue: "Dexterity 13",
      sorcerer: "Charisma 13",
      warlock: "Charisma 13",
      wizard: "Intelligence 13"
    };

    const phase3PrerequisiteAudit =
      Object.entries(
        phase3PrerequisiteLabels
      ).map(([classId, label]) => {
        const passing =
          createEmptyCharacter();
        const requirements =
          getMulticlassPrerequisiteRequirements(
            classId,
            getAllClassTemplates()
              .find((entry) => {
                return entry.id === classId;
              })
          );

        passing.abilities.scores =
          createAbilityMap(12);

        requirements.forEach(
          (requirement) => {
            const items =
              Array.isArray(
                requirement.any
              )
                ? requirement.any
                : [requirement];

            items.forEach((item) => {
              passing.abilities
                .scores[item.ability] =
                  item.minimum;
            });
          }
        );

        const passingResult =
          getMulticlassPrerequisiteResultForClass(
            classId,
            passing
          );

        const failing =
          cloneData(passing);

        if (classId === "fighter") {
          failing.abilities.scores.str = 12;
          failing.abilities.scores.dex = 12;
        } else {
          const firstRequirement =
            requirements[0];
          const firstItem =
            Array.isArray(
              firstRequirement?.any
            )
              ? firstRequirement.any[0]
              : firstRequirement;

          failing.abilities
            .scores[
              firstItem.ability
            ] = 12;
        }

        return {
          classId,
          label:
            passingResult.label,
          labelMatches:
            passingResult.label === label,
          passesAtThirteen:
            passingResult.met,
          rejectsBelow:
            !getMulticlassPrerequisiteResultForClass(
              classId,
              failing
            ).met
        };
      });

    const fighterStrengthOnly =
      createEmptyCharacter();
    fighterStrengthOnly
      .abilities.scores =
        createAbilityMap(12);
    fighterStrengthOnly
      .abilities.scores.str = 13;

    const fighterDexterityOnly =
      cloneData(
        fighterStrengthOnly
      );
    fighterDexterityOnly
      .abilities.scores.str = 12;
    fighterDexterityOnly
      .abilities.scores.dex = 13;

    record(
      "Phase 3 verifies all 13 multiclass prerequisite formulas",
      {
        classCount:
          phase3PrerequisiteAudit.length,
        labels:
          phase3PrerequisiteAudit.every(
            (entry) => {
              return entry.labelMatches;
            }
          ),
        passing:
          phase3PrerequisiteAudit.every(
            (entry) => {
              return entry.passesAtThirteen;
            }
          ),
        failing:
          phase3PrerequisiteAudit.every(
            (entry) => {
              return entry.rejectsBelow;
            }
          ),
        fighterStrength:
          getMulticlassPrerequisiteResultForClass(
            "fighter",
            fighterStrengthOnly
          ).met,
        fighterDexterity:
          getMulticlassPrerequisiteResultForClass(
            "fighter",
            fighterDexterityOnly
          ).met
      },
      {
        classCount: 13,
        labels: true,
        passing: true,
        failing: true,
        fighterStrength: true,
        fighterDexterity: true
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    chooseSection12Class(
      "fighter"
    );
    setCharacterLevel(2);
    creatorState.draft
      .abilities.base = {
        ...creatorState.draft
          .abilities.base,
        str: 12,
        dex: 12,
        int: 12
      };
    recalculateAbilityTotals(
      creatorState.draft
    );

    const phase3BothFail =
      tryAddMulticlassClass(
        "wizard"
      );

    creatorState.draft =
      createEmptyCharacter();
    chooseSection12Class(
      "fighter"
    );
    setCharacterLevel(2);
    creatorState.draft
      .abilities.base = {
        ...creatorState.draft
          .abilities.base,
        str: 12,
        dex: 13,
        int: 12
      };
    recalculateAbilityTotals(
      creatorState.draft
    );

    const phase3NewOnlyFails =
      tryAddMulticlassClass(
        "wizard"
      );

    creatorState.draft =
      createEmptyCharacter();
    chooseSection12Class(
      "fighter"
    );
    setCharacterLevel(2);
    creatorState.draft
      .abilities.base = {
        ...creatorState.draft
          .abilities.base,
        str: 12,
        dex: 13,
        int: 13
      };
    recalculateAbilityTotals(
      creatorState.draft
    );

    const phase3BothPass =
      tryAddMulticlassClass(
        "wizard"
      );

    record(
      "Adding a class reports existing and new class requirements without blocking Class",
      {
        bothFailAdded:
          phase3BothFail.ok,
        bothFailures:
          phase3BothFail
            .failedPrerequisites
            .map((entry) => {
              return entry.classId;
            }),
        newOnlyFailure:
          phase3NewOnlyFails
            .failedPrerequisites
            .map((entry) => {
              return entry.classId;
            }),
        bothPass:
          phase3BothPass.ok,
        bothPassWarnings:
          phase3BothPass
            .failedPrerequisites
            .length
      },
      {
        bothFailAdded: true,
        bothFailures: [
          "fighter",
          "wizard"
        ],
        newOnlyFailure: [
          "wizard"
        ],
        bothPass: true,
        bothPassWarnings: 0
      }
    );

    const buildUnarmoredOrder = (
      firstClassId,
      secondClassId
    ) => {
      creatorState.draft =
        createEmptyCharacter();
      chooseSection12Class(
        firstClassId
      );
      setCharacterLevel(2);
      creatorState.draft
        .abilities.base = {
          ...creatorState.draft
            .abilities.base,
          str: 13,
          dex: 16,
          con: 14,
          wis: 18
        };
      recalculateAbilityTotals(
        creatorState.draft
      );

      const added =
        addMulticlassClass(
          secondClassId
        );
      const source =
        cloneData(
          creatorState.draft
            .classProgression
            .unarmoredDefenseSource
        );
      const formulas =
        cloneData(
          creatorState.draft
            .classMechanics
            .armorClassFormulas
        );
      const armorClass =
        calculateArmorClassOptions(
          creatorState.draft
        ).selected.total;

      return {
        added,
        source,
        formulas,
        armorClass,
        character:
          cloneData(
            creatorState.draft
          )
      };
    };

    const barbarianThenMonk =
      buildUnarmoredOrder(
        "barbarian",
        "monk"
      );
    const monkThenBarbarian =
      buildUnarmoredOrder(
        "monk",
        "barbarian"
      );
    const reorderedUnarmoredImport =
      cloneData(
        barbarianThenMonk.character
      );

    reorderedUnarmoredImport
      .classProgression.levelOrder =
        [
          ...reorderedUnarmoredImport
            .classProgression
            .levelOrder
        ].reverse();

    const preservedUnarmoredImport =
      normalizeCharacter(
        reorderedUnarmoredImport
      );
    const legacyUnarmoredImport =
      cloneData(
        monkThenBarbarian.character
      );

    delete legacyUnarmoredImport
      .classProgression
      .unarmoredDefenseSource;

    const migratedUnarmoredImport =
      normalizeCharacter(
        legacyUnarmoredImport
      );

    record(
      "First received Unarmored Defense is exclusive and survives migration",
      {
        barbarianThenMonk: {
          source:
            barbarianThenMonk
              .source.classId,
          formulas:
            barbarianThenMonk
              .formulas
              .map((entry) => {
                return entry.featureId;
              }),
          armorClass:
            barbarianThenMonk
              .armorClass
        },
        monkThenBarbarian: {
          source:
            monkThenBarbarian
              .source.classId,
          formulas:
            monkThenBarbarian
              .formulas
              .map((entry) => {
                return entry.featureId;
              }),
          armorClass:
            monkThenBarbarian
              .armorClass
        },
        reorderedImport:
          preservedUnarmoredImport
            .classProgression
            .unarmoredDefenseSource
            ?.classId,
        migratedImport:
          migratedUnarmoredImport
            .classProgression
            .unarmoredDefenseSource
            ?.classId
      },
      {
        barbarianThenMonk: {
          source: "barbarian",
          formulas: [
            "unarmored-defense-barbarian"
          ],
          armorClass: 15
        },
        monkThenBarbarian: {
          source: "monk",
          formulas: [
            "unarmored-defense-monk"
          ],
          armorClass: 17
        },
        reorderedImport:
          "barbarian",
        migratedImport:
          "monk"
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    chooseSection12Class(
      "fighter"
    );
    setCharacterLevel(2);
    creatorState.draft
      .abilities.base = {
        ...creatorState.draft
          .abilities.base,
        str: 13,
        int: 13
      };
    recalculateAbilityTotals(
      creatorState.draft
    );
    addMulticlassClass(
      "wizard"
    );

    creatorState.draft
      .abilities.base.int = 12;
    recalculateAbilityTotals(
      creatorState.draft
    );

    const directPendingChoiceBypass =
      setMulticlassClassLevel(
        1,
        2
      );
    const fighterStyleFeature =
      getSection12ClassFeaturesThroughLevel()
        .find((feature) => {
          return (
            feature.id ===
            "fighting-style-fighter"
          );
        });
    const fighterStyleSelected =
      toggleSection12ClassFeatureChoice(
        getSection12FeatureChoiceKey(
          fighterStyleFeature
        ),
        "Defense"
      );
    const directPrerequisiteDeferred =
      setMulticlassClassLevel(
        1,
        2
      );

    creatorState.draft
      .abilities.base.int = 13;
    recalculateAbilityTotals(
      creatorState.draft
    );

    const directSubclassBypass =
      setMulticlassClassLevel(
        1,
        3
      );
    const wizardSubclassSelected =
      setMulticlassSubclass(
        1,
        "evocation"
      );
    const directLevelAfterSubclass =
      setMulticlassClassLevel(
        1,
        3
      );

    record(
      "Direct multiclass level editing defers abilities but cannot bypass class choices",
      {
        pendingFeatureBypass:
          directPendingChoiceBypass,
        fighterStyleSelected,
        prerequisiteDeferred:
          directPrerequisiteDeferred,
        pendingSubclassBypass:
          directSubclassBypass,
        wizardSubclassSelected,
        afterSubclassChoice:
          directLevelAfterSubclass,
        wizardLevel:
          creatorState.draft
            .classProgression
            .classes[1].level
      },
      {
        pendingFeatureBypass: false,
        fighterStyleSelected: true,
        prerequisiteDeferred: true,
        pendingSubclassBypass: false,
        wizardSubclassSelected: true,
        afterSubclassChoice: true,
        wizardLevel: 3
      }
    );

    const overLevelImport =
      normalizeCharacter({
        classProgression: {
          totalLevel: 25,
          classes: [
            {
              entryId: "fighter-cap",
              classId: "fighter",
              className: "Fighter",
              level: 15
            },
            {
              entryId: "wizard-cap",
              classId: "wizard",
              className: "Wizard",
              level: 10
            }
          ],
          levelOrder: [
            ...Array(15).fill(
              "fighter-cap"
            ),
            ...Array(10).fill(
              "wizard-cap"
            )
          ]
        }
      });

    record(
      "Imported multiclass totals are capped at 20 and proficiency uses total level",
      {
        totalLevel:
          overLevelImport
            .classProgression
            .totalLevel,
        levels:
          overLevelImport
            .classProgression
            .classes
            .map((entry) => {
              return `${entry.classId}:${entry.level}`;
            }),
        levelOrderCount:
          overLevelImport
            .classProgression
            .levelOrder.length,
        proficiencyBonus:
          getCharacterProficiencyBonus(
            overLevelImport
          ),
        migrationWarning:
          cleanArray(
            overLevelImport.builder
              .validation
              .migrationWarnings
          ).some((warning) => {
            return warning.includes(
              "level 20"
            );
          })
      },
      {
        totalLevel: 20,
        levels: [
          "fighter:15",
          "wizard:5"
        ],
        levelOrderCount: 20,
        proficiencyBonus: 6,
        migrationWarning: true
      }
    );

    const expectedGrantSignatures = {
      artificer:
        "Light Armor|Medium Armor|Shields::::Thieves' Tools|Tinker's Tools::0::0",
      barbarian:
        "Light Armor|Medium Armor|Shields::Simple Weapons|Martial Weapons::::0::0",
      bard:
        "Light Armor::::::1::1",
      cleric:
        "Light Armor|Medium Armor|Shields::::::0::0",
      druid:
        "Light Armor|Medium Armor|Shields::::::0::0",
      fighter:
        "Light Armor|Medium Armor|Shields::Simple Weapons|Martial Weapons::::0::0",
      monk:
        "::Simple Weapons|Shortswords::::0::0",
      paladin:
        "Light Armor|Medium Armor|Shields::Simple Weapons|Martial Weapons::::0::0",
      ranger:
        "Light Armor|Medium Armor|Shields::Simple Weapons|Martial Weapons::::1::0",
      rogue:
        "Light Armor::::Thieves' Tools::1::0",
      sorcerer:
        "::::::0::0",
      warlock:
        "Light Armor::Simple Weapons::::0::0",
      wizard:
        "::::::0::0"
    };
    const actualGrantSignatures =
      Object.fromEntries(
        Object.keys(
          expectedGrantSignatures
        ).map((classId) => {
          const rule =
            getMulticlassProficiencyRule({
              classId,
              className:
                DEFAULT_CLASSES[classId]
                  .name
            });

          return [
            classId,
            [
              cleanArray(
                rule.armor
              ).join("|"),
              cleanArray(
                rule.weapons
              ).join("|"),
              cleanArray(
                rule.tools
              ).join("|"),
              safeNumber(
                rule.skillChoices
                  ?.choose,
                0
              ),
              safeNumber(
                rule.toolChoices
                  ?.choose,
                0
              )
            ].join("::")
          ];
        })
      );

    record(
      "Every secondary class proficiency grant matches the 2014 table",
      {
        classCount:
          Object.keys(
            actualGrantSignatures
          ).length,
        allMatch:
          Object.keys(
            expectedGrantSignatures
          ).every((classId) => {
            return (
              actualGrantSignatures[
                classId
              ] ===
              expectedGrantSignatures[
                classId
              ]
            );
          })
      },
      {
        classCount: 13,
        allMatch: true
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    chooseSection12Class(
      "wizard"
    );
    setCharacterLevel(2);
    creatorState.draft
      .abilities.base = {
        ...creatorState.draft
          .abilities.base,
        int: 13,
        cha: 13
      };
    recalculateAbilityTotals(
      creatorState.draft
    );
    addMulticlassClass(
      "bard"
    );

    const bardChoiceHtml =
      renderMulticlassProgressionEditor(
        creatorState.draft
      );
    const bardWarningsBefore = [
      ...getMulticlassPendingSkillChoiceWarnings(
        creatorState.draft
      ),
      ...getMulticlassPendingToolChoiceWarnings(
        creatorState.draft
      )
    ];
    const bardClassCompleteBefore =
      isSection17ClassComplete(
        creatorState.draft
      );
    const bardSkillSelected =
      toggleMulticlassSkillChoice(
        1,
        "persuasion"
      );
    const bardToolSelected =
      toggleMulticlassToolChoice(
        1,
        "Bagpipes"
      );
    const bardWarningsAfter = [
      ...getMulticlassPendingSkillChoiceWarnings(
        creatorState.draft
      ),
      ...getMulticlassPendingToolChoiceWarnings(
        creatorState.draft
      )
    ];

    record(
      "Pending multiclass skill and tool choices block completion and have controls",
      {
        warningCountBefore:
          bardWarningsBefore.length,
        classCompleteBefore:
          bardClassCompleteBefore,
        toolControl:
          bardChoiceHtml.includes(
            'data-cc-action="toggle-multiclass-tool"'
          ) &&
          bardChoiceHtml.includes(
            'data-tool-value="Bagpipes"'
          ),
        bardSkillSelected,
        bardToolSelected,
        warningCountAfter:
          bardWarningsAfter.length,
        skillGranted:
          creatorState.draft
            .proficiencies
            .skills.persuasion
            ?.proficient === true,
        toolGranted:
          creatorState.draft
            .proficiencies
            .tools
            .includes("Bagpipes"),
        classCompleteAfter:
          isSection17ClassComplete(
            creatorState.draft
          )
      },
      {
        warningCountBefore: 2,
        classCompleteBefore: false,
        toolControl: true,
        bardSkillSelected: true,
        bardToolSelected: true,
        warningCountAfter: 0,
        skillGranted: true,
        toolGranted: true,
        classCompleteAfter: true
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    chooseSection12Class(
      "wizard"
    );
    setCharacterLevel(2);
    creatorState.draft
      .equipment.items = [
        normalizeSection15Item({
          id: "phase3-kept-item",
          name: "Kept Item",
          category: "gear"
        })
      ];
    creatorState.draft
      .abilities.base = {
        ...creatorState.draft
          .abilities.base,
        int: 13,
        dex: 13,
        wis: 13
      };
    recalculateAbilityTotals(
      creatorState.draft
    );
    const equipmentBeforeMulticlass =
      JSON.stringify(
        creatorState.draft
          .equipment.items
      );
    addMulticlassClass(
      "ranger"
    );
    const startingBeforeCardMove =
      getStartingClassEntry(
        creatorState.draft
      )?.entryId;
    const classCardsMoved =
      moveMulticlassClass(
        1,
        -1
      );
    const startingAfterCardMove =
      getStartingClassEntry(
        creatorState.draft
      )?.entryId;

    record(
      "Starting class benefits survive class-card reordering",
      {
        classCardsMoved,
        startingStable:
          startingBeforeCardMove ===
          startingAfterCardMove,
        startingClass:
          getStartingClassEntry(
            creatorState.draft
          )?.classId,
        savingThrows:
          creatorState.draft
            .proficiencies
            .savingThrows,
        noRangerSavingThrows:
          !creatorState.draft
            .proficiencies
            .savingThrows
            .includes("Strength") &&
          !creatorState.draft
            .proficiencies
            .savingThrows
            .includes("Dexterity"),
        equipmentUnchanged:
          JSON.stringify(
            creatorState.draft
              .equipment.items
          ) ===
          equipmentBeforeMulticlass
      },
      {
        classCardsMoved: true,
        startingStable: true,
        startingClass: "wizard",
        savingThrows: [
          "Intelligence",
          "Wisdom"
        ],
        noRangerSavingThrows: true,
        equipmentUnchanged: true
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    chooseSection12Class(
      "wizard"
    );
    setCharacterLevel(2);
    creatorState.draft
      .abilities.base = {
        ...creatorState.draft
          .abilities.base,
        int: 13,
        dex: 13
      };
    recalculateAbilityTotals(
      creatorState.draft
    );
    addMulticlassClass(
      "rogue"
    );
    toggleMulticlassSkillChoice(
      1,
      "stealth"
    );
    const rogueClassSource =
      getClassSourceLabel(
        creatorState.draft
          .classProgression
          .classes[1]
      );
    const rogueProficienciesBefore = {
      armor:
        creatorState.draft
          .proficiencies.armor
          .includes("Light Armor"),
      tools:
        creatorState.draft
          .proficiencies.tools
          .includes("Thieves' Tools"),
      skill:
        cleanArray(
          creatorState.draft
            .proficiencies
            .skills.stealth
            ?.source
        ).includes(
          rogueClassSource
        )
    };
    const rogueRemovedForCleanup =
      removeMulticlassClass(1);
    const rogueProficienciesAfter = {
      armor:
        creatorState.draft
          .proficiencies.armor
          .includes("Light Armor"),
      tools:
        creatorState.draft
          .proficiencies.tools
          .includes("Thieves' Tools"),
      skill:
        cleanArray(
          creatorState.draft
            .proficiencies
            .skills.stealth
            ?.source
        ).includes(
          rogueClassSource
        )
    };

    record(
      "Removing a class removes its granted proficiencies",
      {
        before:
          rogueProficienciesBefore,
        removed:
          rogueRemovedForCleanup,
        after:
          rogueProficienciesAfter
      },
      {
        before: {
          armor: true,
          tools: true,
          skill: true
        },
        removed: true,
        after: {
          armor: false,
          tools: false,
          skill: false
        }
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    chooseSection12Class(
      "fighter"
    );
    creatorState.draft
      .abilities.base = {
        ...creatorState.draft
          .abilities.base,
        str: 13,
        int: 13
      };
    recalculateAbilityTotals(
      creatorState.draft
    );
    const cleanupFightingStyle =
      getSection12ClassFeaturesThroughLevel()
        .find((feature) => {
          return (
            feature.id ===
            "fighting-style-fighter"
          );
        });
    toggleSection12ClassFeatureChoice(
      getSection12FeatureChoiceKey(
        cleanupFightingStyle
      ),
      "Defense"
    );
    addCharacterLevelToClass(0);
    const fighterActionSurgeBefore =
      getSection12ClassFeaturesThroughLevel()
        .some((feature) => {
          return (
            feature.id ===
              "action-surge"
          );
        });
    const fighterLoweredForCleanup =
      setMulticlassClassLevel(
        0,
        1
      );
    const fighterActionSurgeAfter =
      getSection12ClassFeaturesThroughLevel()
        .some((feature) => {
          return (
            feature.id ===
              "action-surge"
          );
        });
    setCharacterLevel(2);
    addMulticlassClass(
      "wizard"
    );
    addCharacterLevelToClass(1);
    setMulticlassSubclass(
      1,
      "evocation"
    );
    refreshClassProgressionDerivedValues();

    const cleanupWizardEntry =
      creatorState.draft
        .classProgression
        .classes[1];
    const cleanupWizardKey =
      cleanupWizardEntry.entryId;
    cleanupWizardEntry.choices = {
      ...(cleanupWizardEntry.choices || {}),
      classFeatures: {
        ...normalizeClassChoiceMap(
          cleanupWizardEntry
            .choices
            ?.classFeatures
        ),
        [`${cleanupWizardKey}:arcane-tradition`]:
          ["Evocation"]
      }
    };
    getSection16ClassSourceStore()[
      cleanupWizardKey
    ] = {
      classEntryId:
        cleanupWizardKey,
      classId: "wizard",
      className: "Wizard",
      cantripIds: [],
      knownSpellIds: [
        "magic-missile"
      ],
      preparedSpellIds: [],
      spellbookSpellIds: [],
      alwaysPreparedSpellIds: [],
      mysticArcanumSpellIds: {}
    };
    creatorState.draft.magic
      .spellSourceModelVersion = 2;
    syncSection16LegacySpellAliases();

    const wizardSubclassBenefitsBefore =
      creatorState.draft
        .features
        .classFeatures
        .filter((feature) => {
          return (
            feature.classEntryId ===
              cleanupWizardKey &&
            feature.source ===
              "subclass"
          );
        }).length;
    const wizardLoweredForCleanup =
      setMulticlassClassLevel(
        1,
        1
      );
    const wizardSubclassBenefitsAfter =
      creatorState.draft
        .features
        .classFeatures
        .filter((feature) => {
          return (
            feature.classEntryId ===
              cleanupWizardKey &&
            feature.source ===
              "subclass"
          );
        }).length;
    const staleWizardChoiceRemoved =
      !Object.hasOwn(
        normalizeClassChoiceMap(
          creatorState.draft
            .classProgression
            .classes[1]
            .choices
            .classFeatures
        ),
        `${cleanupWizardKey}:arcane-tradition`
      );
    const wizardClassRemoved =
      removeMulticlassClass(1);

    record(
      "Lowering or removing a class prunes features, subclass benefits, spells, resources, and choices",
      {
        subclassBenefitsBefore:
          wizardSubclassBenefitsBefore >
          0,
        classFeatureBefore:
          fighterActionSurgeBefore,
        classLowered:
          fighterLoweredForCleanup,
        classFeatureAfter:
          fighterActionSurgeAfter,
        lowered:
          wizardLoweredForCleanup,
        subclassBenefitsAfter:
          wizardSubclassBenefitsAfter,
        staleChoiceRemoved:
          staleWizardChoiceRemoved,
        removed:
          wizardClassRemoved,
        removedEntryAbsent:
          !creatorState.draft
            .classProgression
            .classes
            .some((entry) => {
              return (
                entry.entryId ===
                cleanupWizardKey
              );
            }),
        spellSourceRemoved:
          !Object.hasOwn(
            getSection16ClassSourceStore(),
            cleanupWizardKey
          ),
        spellAliasRemoved:
          !creatorState.draft
            .magic.knownSpellIds
            .includes(
              "magic-missile"
            ),
        resourcesRemoved:
          !creatorState.draft
            .classMechanics
            .resources
            .some((resource) => {
              return (
                resource.classId ===
                "wizard"
              );
            }),
        featuresRemoved:
          !creatorState.draft
            .features
            .classFeatures
            .some((feature) => {
              return (
                feature.classEntryId ===
                cleanupWizardKey
              );
            })
      },
      {
        subclassBenefitsBefore: true,
        classFeatureBefore: true,
        classLowered: true,
        classFeatureAfter: false,
        lowered: true,
        subclassBenefitsAfter: 0,
        staleChoiceRemoved: true,
        removed: true,
        removedEntryAbsent: true,
        spellSourceRemoved: true,
        spellAliasRemoved: true,
        resourcesRemoved: true,
        featuresRemoved: true
      }
    );

    creatorState.draft =
      createEmptyCharacter();
    chooseSection12Class(
      "fighter"
    );
    creatorState.draft
      .abilities.base = {
        ...creatorState.draft
          .abilities.base,
        str: 13,
        int: 13
      };
    recalculateAbilityTotals(
      creatorState.draft
    );
    const asiCleanupFightingStyle =
      getSection12ClassFeaturesThroughLevel()
        .find((feature) => {
          return (
            feature.id ===
            "fighting-style-fighter"
          );
        });
    toggleSection12ClassFeatureChoice(
      getSection12FeatureChoiceKey(
        asiCleanupFightingStyle
      ),
      "Defense"
    );
    setCharacterLevel(2);
    addMulticlassClass(
      "wizard"
    );
    addCharacterLevelToClass(0);
    addCharacterLevelToClass(0);
    addCharacterLevelToClass(0);

    const abandonedAsiSlot =
      getUnlockedFeatChoiceSlots(
        creatorState.draft
      ).find((slot) => {
        return (
          slot.classId === "fighter" &&
          slot.classLevel === 4
        );
      });
    setSection12AsiMode(
      abandonedAsiSlot?.id,
      "feat"
    );
    setSection12AsiFeat(
      abandonedAsiSlot?.id,
      "alert"
    );
    const fighterLoweredBelowAsi =
      setMulticlassClassLevel(
        0,
        3
      );

    record(
      "Lowering class level removes abandoned ASI and feat selections",
      {
        lowered:
          fighterLoweredBelowAsi,
        unlockedSlots:
          getUnlockedFeatChoiceSlots(
            creatorState.draft
          ).filter((slot) => {
            return (
              slot.classId ===
              "fighter"
            );
          }).length,
        advancementChoices:
          creatorState.draft
            .advancementChoices
            .filter((choice) => {
              return (
                choice.classId ===
                "fighter" &&
                choice.classLevel === 4
              );
            }).length,
        alertStillSelected:
          creatorState.draft
            .feats.includes("alert"),
        compatibilityFeatRefs:
          Object.entries(
            normalizeClassChoiceMap(
              creatorState.draft
                .classChoices
            )
          )
            .filter(([, values]) => {
              return values.includes(
                "feat:alert"
              );
            })
            .map(([choiceId]) => {
              return choiceId;
            }),
        classEntryFeatRefs:
          getClassProgressionEntries(
            creatorState.draft
          ).flatMap((classEntry) => {
            return Object.entries(
              normalizeClassChoiceMap(
                classEntry?.choices
                  ?.classFeatures
              )
            )
              .filter(([, values]) => {
                return values.includes(
                  "feat:alert"
                );
              })
              .map(([choiceId]) => {
                return choiceId;
              });
          }),
        asiBonusSource:
          Object.keys(
            creatorState.draft
              .abilities
              .bonusSources
          ).some((sourceId) => {
            return sourceId.includes(
              abandonedAsiSlot?.id
            );
          })
      },
      {
        lowered: true,
        unlockedSlots: 0,
        advancementChoices: 0,
        alertStillSelected: false,
        compatibilityFeatRefs: [],
        classEntryFeatRefs: [],
        asiBonusSource: false
      }
    );

    const failed =
      results.filter((result) => {
        return !result.pass;
      });

    return {
      passed: failed.length === 0,
      total: results.length,
      failed,
      results
    };
    } finally {
      restoreSelfTestState();
    }
  }
