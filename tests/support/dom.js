// Preloaded by `bun test` (bunfig.toml): the browser globals the web code expects, from jsdom,
// the same DOM the CLI uses in Node.
const { JSDOM } = require('jsdom');

const { window } = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true
});

for (const name of Object.getOwnPropertyNames(window)) {
    if (name in globalThis) continue;
    Object.defineProperty(globalThis, name, {
        configurable: true,
        get: () => window[name],
        set: (v) => {
            window[name] = v;
        }
    });
}
// Bun and Node have their own of these; the web code must see the page's.
for (const name of ['navigator', 'localStorage', 'Event', 'CustomEvent', 'Blob', 'File', 'URL']) {
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: window[name] });
}
globalThis.window = window;
