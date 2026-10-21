// Eksport tabel z src/p1_config.js do JSON (załącznik A). Użycie z katalogu repo: node docs/unity/tools/dump.js [src/p1_config.js] [docs/unity/data]
const fs = require('fs');
const src = fs.readFileSync(process.argv[2] || 'src/p1_config.js', 'utf8');
const names = ['WW','DEFAULTS','RUN_WAVES','SLIDERS','GAME_SETTINGS','RANKS','SLOT_LABEL','ITEMS','TABS','ITEM_ORDER','START_UNLOCKED','ONB_FULL','ONB_ITEM','ONB_CARD','ONB_STAGES','TRAPS','MONSTERS','SCARE','CURSED','DRIFT','ROOMTYPES','RT_INFO','KIND_INFO','KINDS','KIND_OF','KIND_POW','KIND_COST','TOOLS','MODES','LOOT_KIND','COMBO_POW','COMBO_HP','LOOT_GREED','RARITY_NAME','SIZE_BONUS','DISARMABLE','BUILDINGS','SMASHABLE_OBJ','LOOKS_TRAP','UPG_COST','TRAITS','HERO_TRAITS','ARM_TIME','DMG_TYPES','DMG_OF','CLASS_RES','CLASS_RES_TEXT','CLASS_SKILL','PHYS','SCAR_RES','PHOBIAS','PHOBIA_OF_ATTR','HEROES','PARTY','CLASSIC','LEADER_ORDER','NAMES_M','NAMES_F','TIERS','BOSS_NAME','KIT','HITEMS','GEAR_POOL','UPGRADES','RAR_NAME','DECK_SIZE','OBJ_KINDS','HEART','MON_FACTOR','DMG_FACTOR','GZ','ACTS','SAY','CHAT_REPLY','CONVO','CONVO_ALIAS','CONVO_P','SOLO','SOLO_MUTE','CGX','ROCK'];
const body = src + '\nreturn {' + names.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(',') + ', levelStats, tierOf, makeKit, powerCharges};';
let out;
try { out = new Function('run','mods','fl','S','$', body)(null, null, null, {}, () => null); } catch (e) { console.error('ERR', e.message); process.exit(1); }
const fnSrc = (k, v) => typeof v === 'function' ? 'fn: ' + v.toString().replace(/\s+/g, ' ') : v;
const skip = new Set(['levelStats','tierOf','makeKit','powerCharges']);
for (const [k, v] of Object.entries(out)) {
  if (skip.has(k) || v === undefined) continue;
  fs.writeFileSync((process.argv[3] || 'docs/unity/data') + '/' + k + '.json', JSON.stringify(v, (kk, vv) => vv instanceof Set ? [...vv] : fnSrc(kk, vv), 1));
}
// level table
const L = [];
for (let l = 1; l <= 30; l++) L.push(Object.assign({ lvl: l, tier: out.tierOf(l) }, out.levelStats(l)));
fs.writeFileSync((process.argv[3] || 'docs/unity/data') + '/levelStats_1_30.json', JSON.stringify(L, (k, v) => typeof v === 'number' ? Math.round(v * 10000) / 10000 : v, 1));
console.log(Object.keys(out).filter(k => out[k] !== undefined).length, 'exported');
console.log('levelStats src:', out.levelStats.toString().slice(0, 1500));
console.log('tierOf src:', out.tierOf.toString());
console.log('makeKit src:', out.makeKit.toString().slice(0, 1200));
