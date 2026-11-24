// bun.lock must stay at lockfileVersion 1 until Dependabot reads v2 (dependabot-core#16026). Bun 1.4 keeps an
// existing v1 lockfile on install/add/remove; only regenerating it from scratch writes v2. To regenerate:
//   rm bun.lock && bunx bun@1.3.14 install
const { readFileSync } = require('node:fs');

const match = /"lockfileVersion":\s*(\d+)/.exec(readFileSync('bun.lock', 'utf8'));
if (!match || match[1] !== '1') {
    console.error(
        `bun.lock has lockfileVersion ${match ? match[1] : '?'}; it must be 1 for Dependabot. Regenerate it with:\n  rm bun.lock && bunx bun@1.3.14 install`
    );
    process.exit(1);
}
