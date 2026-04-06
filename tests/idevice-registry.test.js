/**
 * Tests for iDevice registry (js/registries/idevice-types.js).
 */
const { KNOWN_TYPES, lookup, lookupOrLocal, allKnownTypes } = require('../js/registries/idevice-types');

describe('iDevice registry', () => {
    test('all known types have required fields', () => {
        Object.entries(KNOWN_TYPES).forEach(([name, def]) => {
            expect(def.label).toBeTruthy();
            expect(def.group).toBeTruthy();
            expect(typeof def.requiresImages).toBe('boolean');
            expect(typeof def.requiresUrl).toBe('boolean');
            expect(typeof def.deep).toBe('boolean');
        });
    });

    test('lookup returns known for registered types', () => {
        expect(lookup('text').known).toBe(true);
        expect(lookup('image-gallery').known).toBe(true);
        expect(lookup('external-website').known).toBe(true);
        expect(lookup('download-source-file').known).toBe(true);
    });

    test('lookup is case-insensitive', () => {
        expect(lookup('TEXT').known).toBe(true);
        expect(lookup('Image-Gallery').known).toBe(true);
    });

    test('lookup returns unknown for unregistered types', () => {
        expect(lookup('custom-idevice').known).toBe(false);
        expect(lookup('custom-idevice').status).toBe('unknown');
    });

    test('lookup returns missing for empty/null types', () => {
        expect(lookup('').known).toBe(false);
        expect(lookup('').status).toBe('missing');
        expect(lookup(null).status).toBe('missing');
        expect(lookup(undefined).status).toBe('missing');
    });

    test('allKnownTypes returns all types', () => {
        const types = allKnownTypes();
        expect(types.length).toBe(27);
        expect(types).toContain('text');
        expect(types).toContain('crossword');
        expect(types).toContain('download-source-file');
        expect(types).toContain('udl-content');
        expect(types).toContain('scrambled-list');
        expect(types).toContain('interactive-video');
    });

    test('image types require images', () => {
        expect(KNOWN_TYPES['image-gallery'].requiresImages).toBe(true);
        expect(KNOWN_TYPES['magnifier'].requiresImages).toBe(true);
    });

    test('URL types require URL', () => {
        expect(KNOWN_TYPES['external-website'].requiresUrl).toBe(true);
    });

    test('new types are in registry', () => {
        expect(lookup('udl-content').known).toBe(true);
        expect(lookup('scrambled-list').known).toBe(true);
        expect(lookup('interactive-video').known).toBe(true);
        expect(lookup('dialogue').known).toBe(true);
        expect(lookup('accordion').known).toBe(true);
        expect(lookup('tabs').known).toBe(true);
        expect(lookup('timeline').known).toBe(true);
        expect(lookup('carousel').known).toBe(true);
        expect(lookup('quiz-score-report').known).toBe(true);
    });

    test('lookupOrLocal finds package-local types', () => {
        const zipFiles = {
            'idevices/custom-widget/custom-widget.js': { dir: false },
            'idevices/custom-widget/custom-widget.css': { dir: false }
        };
        const result = lookupOrLocal('custom-widget', zipFiles);
        expect(result.known).toBe(true);
        expect(result.status).toBe('package-local');
    });

    test('lookupOrLocal returns unknown if type not in registry or ZIP', () => {
        const result = lookupOrLocal('totally-unknown', {});
        expect(result.known).toBe(false);
        expect(result.status).toBe('unknown');
    });

    test('lookupOrLocal prefers registry over ZIP', () => {
        const zipFiles = {
            'idevices/text/text.js': { dir: false }
        };
        const result = lookupOrLocal('text', zipFiles);
        expect(result.known).toBe(true);
        expect(result.status).toBe('deep-validated');
    });
});
