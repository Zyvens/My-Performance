const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const source=fs.readFileSync('fixed-commitments.js','utf8');
const context={QUEST_SEED:[],window:{}};
vm.createContext(context);
vm.runInContext(source,context);

const therapy=context.QUEST_SEED.find(q=>q.id==='personal-therapy-weekly');
assert(therapy,'Tuesday therapy commitment must be seeded');
assert.deepStrictEqual(Array.from(therapy.weekdays),[2]);
assert.strictEqual(therapy.timeStart,'08:00');
assert.strictEqual(therapy.timeEnd,'08:30');
assert.strictEqual(therapy.durationMin,30);
assert.strictEqual(therapy.fixedTime,true);
assert.strictEqual(therapy.essential,true);
assert.strictEqual(therapy.externalActivity,true);
assert.strictEqual(therapy.commuteOutMin,60);
assert.strictEqual(therapy.commuteReturnMin,30);

const zion=context.QUEST_SEED.find(q=>q.id==='personal-zion-brave-weekly');
assert(zion,'Thursday Zion Brave commitment must be seeded');
assert.deepStrictEqual(Array.from(zion.weekdays),[4]);
assert.strictEqual(zion.timeStart,'19:00');
assert.strictEqual(zion.timeEnd,'23:00');
assert.strictEqual(zion.commuteReturnMin,15);
assert.strictEqual(zion.fixedTime,true);
assert.strictEqual(zion.essential,true);
console.log('Fixed therapy and Zion Brave commitments passed');
