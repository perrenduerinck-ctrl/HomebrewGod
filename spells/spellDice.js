export function isSupportedSpellDice(formula,{allowModifier=false}={}) {
 let source=String(formula).replace(/\s/g,'').toLowerCase();if(allowModifier)source=source.replace(/mod/g,'0');
 if(!/^[+-]?(?:\d+d\d+|\d+)(?:[+-](?:\d+d\d+|\d+))*$/.test(source))return false;
 let dice=0;
 for(const term of source.match(/[+-]?[^+-]+/g)||[]){const part=term.replace(/^[+-]/,'');if(part.includes('d')){const [count,faces]=part.split('d').map(Number);dice+=count;if(count<1||dice>100||faces<2||faces>1000)return false;}else if(!Number.isSafeInteger(Number(part))||Number(part)>100000)return false;}
 return true;
}
export function rollSpellDice(formula, random=Math.random) {
 const source=String(formula).replace(/\s/g,'').toLowerCase();
 if(!isSupportedSpellDice(formula))throw new Error('This formula needs manual resolution: '+formula);
 let total=0;const rolls=[];
 for(const term of source.match(/[+-]?[^+-]+/g)||[]){const sign=term[0]==='-'?-1:1,part=term.replace(/^[+-]/,'');
  if(part.includes('d')){const [count,faces]=part.split('d').map(Number);for(let i=0;i<count;i++){const value=random();if(!Number.isFinite(value)||value<0||value>=1)throw new Error('Invalid dice source.');const roll=1+Math.floor(value*faces);rolls.push(roll);total+=sign*roll;}}
  else total+=sign*Number(part);
 }
 if(!Number.isSafeInteger(total)||Math.abs(total)>100000)throw new Error('Spell amount is too large.');
 return {formula:String(formula),total:Math.max(0,total),rolls};
}
export function rollCriticalSpellDice(formula,random=Math.random){
 const dice=(String(formula).replace(/\s/g,'').match(/[+-]?\d+d\d+/gi)||[]).join('');return rollSpellDice(dice||'0',random).total;
}
