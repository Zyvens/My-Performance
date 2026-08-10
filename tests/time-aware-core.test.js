"use strict";
const assert=require('assert');
const core=require('../time-aware-core.js');

let x=core.completionRelease({now:14*60+10,start:13*60,end:14*60,minGap:15});
assert.equal(x.early,false,'late completion must not recover time');
assert.equal(x.release,null,'late completion must not create a refill window');

x=core.completionRelease({now:13*60+35,start:13*60,end:14*60,minGap:15});
assert.equal(x.early,true);
assert.deepEqual(x.release,{start:13*60+35,end:14*60});
assert.equal(x.recoveredMin,25);

x=core.completionRelease({now:13*60+52,start:13*60,end:14*60,minGap:15});
assert.equal(x.early,true);
assert.equal(x.release,null,'less than 15 recovered minutes must not create a replacement');

let r=core.shouldCreateRelease({kind:'removed-today',now:12*60+20,start:12*60,end:13*60,minGap:15});
assert.equal(r.allowed,true);
assert.deepEqual(r.release,{start:12*60+20,end:13*60});

r=core.shouldCreateRelease({kind:'removed-today',now:13*60+5,start:12*60,end:13*60,minGap:15});
assert.equal(r.allowed,false,'removing an already expired task must not create past capacity');

const fill=core.authorizeFill({start:13*60+35,end:14*60+20},[{start:13*60+35,end:14*60,type:'early-completion'}],13*60+40,15);
assert.equal(fill.start,13*60+40,'replacement must respect the real current time');
assert.equal(fill.end,14*60,'replacement must not exceed recovered window');

assert.equal(core.authorizeFill({start:15*60,end:16*60},[],15*60,15),null,'ordinary empty gaps are not refillable');
console.log('Time-aware capacity policy tests passed');
