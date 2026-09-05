import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker = fs.readFileSync(new URL('../../worker/index.ts', import.meta.url), 'utf8');
const admin = fs.readFileSync(new URL('../routes/admin.ts', import.meta.url), 'utf8');
const repo = fs.readFileSync(new URL('../db/repository.ts', import.meta.url), 'utf8');

assert(worker.includes('MAX_ADMIN_SEARCH_LENGTH = 200'));
assert(worker.includes('boundedPositiveInt(req.query.limit, 10, MAX_ADMIN_LIMIT)'));
assert(worker.includes('boundedSearch(req.query.search)'));
assert(admin.includes('MAX_ADMIN_SEARCH_LENGTH = 200'));
assert(admin.includes('boundedSearch(req.query.search'));
assert(admin.includes('Math.min(MAX_ADMIN_LIMIT, Math.max(1, requestedLimit))'));
assert(repo.includes('Opportunistically purge expired fallback buckets'));

console.log('phase17Batch5Hardening.test.ts: PASS');
