const fs=require('fs'),assert=require('assert');
const policy=fs.readFileSync('sidequest-priority-v11.js','utf8');
const ui=fs.readFileSync('sidequest-priority-ui-v11.js','utf8');
assert(policy.includes('VERSION=12'));
assert(ui.includes('VERSION=12'));
console.log('Priority V12 smoke OK');
