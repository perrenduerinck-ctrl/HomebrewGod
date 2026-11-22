import {expect,test} from '@playwright/test';
test('compact character sheet keeps controls, independent spell details, and mobile layout usable',async({page})=>{
 await page.setViewportSize({width:1366,height:900});await page.goto('tests/browser-pages/playable-character-sheet.html');await expect(page.locator('body')).toHaveAttribute('data-test-status','pass');
 const header=page.locator('.hg-character-sheet-header');expect(await header.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(160);
 await expect(page.locator('.hg-sheet-stat-card--hp')).toHaveCount(0);await expect(page.locator('.hg-sheet-hp-display')).toContainText('36');
 await page.evaluate(()=>{const t=window.__PLAYABLE_SHEET_TEST__;t.view.open({...t.character,combat:{...t.character.combat,deathSaves:{successes:0,failures:0}}});});
 const saves=page.locator('[data-sheet-death-saves]');await expect(saves).not.toHaveAttribute('open','');await expect(saves.locator('[data-character-sheet-action="reset-death-saves"]')).not.toBeVisible();await saves.locator('summary').click();
 await page.locator('[data-character-sheet-action="damage"]').click();await expect(saves).toHaveAttribute('open','');
 await page.locator('[data-character-sheet-tab="spells"]').click();
 const extra=page.locator('[data-sheet-utility="extra-casting"]');await expect(extra).not.toHaveAttribute('open','');await extra.locator('summary').click();
 const feat=extra.locator('[data-feat-spell-resource="magic-initiate:spell:healing-word"]');await feat.getByRole('button',{name:'Spend',exact:true}).click();
 await expect(extra).toHaveAttribute('open','');await expect(feat).toContainText('0 / 1 use remaining');
 const shield=page.locator('[data-sheet-spell-id="shield"]');expect(await shield.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(240);
 const origin=shield.locator('[data-spell-provenance]');const description=shield.locator('[data-character-sheet-spell-description]');
 await origin.locator('summary').click();await description.locator('summary').click();await expect(origin).toHaveAttribute('open','');await expect(description.locator('[data-spell-description-body]')).toBeVisible();
 const areas=await shield.evaluate(el=>{const a=el.querySelector('[data-spell-provenance]').getBoundingClientRect(),b=el.querySelector('[data-character-sheet-spell-description]').getBoundingClientRect();return {originBottom:a.bottom,descriptionTop:b.top};});expect(areas.descriptionTop).toBeGreaterThanOrEqual(areas.originBottom);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
 await expect(description.locator('[data-spell-description-body]')).toBeVisible();
});


test('custom spell references and print metadata remain available without a description',async({page})=>{
 await page.goto('tests/browser-pages/playable-character-sheet.html');await expect(page.locator('body')).toHaveAttribute('data-test-status','pass');
 await page.evaluate(()=>{const {character,view}=window.__PLAYABLE_SHEET_TEST__;const spell={id:"reference-only-spell",name:"Reference Only",level:1,description:"",summary:"",components:"V, S, M (silver wire)",castingTime:"1 action",range:"Touch",duration:"1 minute",known:true,prepared:true,manualOverride:true};view.open({...character,magic:{...character.magic,knownSpellIds:[...(character.magic.knownSpellIds || []),spell.id],customSpells:[...(character.magic.customSpells || []),spell]}});});
 await page.locator('[data-character-sheet-tab="spells"]').click();await page.locator('[data-character-sheet-input="spell-search"]').fill('Reference Only');
 const card=page.locator('.hg-sheet-screen-panel [data-sheet-spell-id="reference-only-spell"]'),details=card.locator('[data-character-sheet-spell-description]');
 await details.getByText('Spell details',{exact:true}).click();await expect(details.locator('.hg-sheet-spell-reference')).toContainText('silver wire');await details.locator('summary').click();
 await page.evaluate(()=>window.print=()=>{});await page.locator('.hg-sheet-more-menu > summary').click();await page.getByRole('button',{name:'Print',exact:true}).click();
 await expect(page.locator('[data-character-sheet-print-area] [data-sheet-spell-id="reference-only-spell"]')).toContainText('silver wire');
 await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));await expect(details).not.toHaveAttribute('open','');
});
