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
assert.strictEqual(therapy.commuteReturnMin,60);
console.log('Tuesday therapy fixed commitment passed');
