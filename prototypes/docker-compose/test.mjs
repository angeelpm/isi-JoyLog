// Prototype: can Docker Compose bring up multiple containers on a shared
// internal network and reach each one from the host by its mapped port?
// This is a minimal stand-in for JoyLog's real 5-service stack — it proves
// the orchestration mechanics (build/up, internal network, port mapping,
// teardown) before any real service code exists.
// Run: node prototypes/docker-compose/test.mjs
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cwd = path.dirname(fileURLToPath(import.meta.url));

const CHECKS = [
    ['service-a', 'http://localhost:8080/'],
    ['service-b', 'http://localhost:8081/'],
];

function run(cmd, args) {
    console.log(`$ ${cmd} ${args.join(' ')}`);
    return spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true }).status === 0;
}

async function ping(url) {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
        return res.ok;
    } catch {
        return false;
    }
}

if (!run('docker', ['compose', 'up', '-d'])) {
    console.error('FAIL: docker compose up did not exit cleanly');
    process.exit(1);
}

await new Promise((r) => setTimeout(r, 3000));

let allOk = true;
for (const [name, url] of CHECKS) {
    const ok = await ping(url);
    console.log(`${ok ? 'PASS' : 'FAIL'}: ${name} -> ${url}`);
    if (!ok) allOk = false;
}

run('docker', ['compose', 'down']);

if (!allOk) process.exit(1);
console.log('PASS: multiple containers came up on a shared compose network and were both reachable');
