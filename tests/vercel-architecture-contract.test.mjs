import fs from 'node:fs';
import assert from 'node:assert/strict';

const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const health = fs.readFileSync('api/health.js', 'utf8');

assert.equal(config.$schema, 'https://openapi.vercel.sh/vercel.json');
assert.ok(Array.isArray(config.headers), 'Vercel headers policy is required');
assert.ok(config.headers.some(rule => rule.source === '/sw.js'), 'Service worker cache policy is required');
assert.ok(config.headers.some(rule => rule.source === '/version.json'), 'Version endpoint must bypass cache');
assert.match(health, /runtime:\s*['"]vercel-function['"]/, 'Health endpoint must prove server execution');
assert.match(health, /Cache-Control/, 'Health endpoint must not be cached');
console.log('Vercel architecture contract OK');
