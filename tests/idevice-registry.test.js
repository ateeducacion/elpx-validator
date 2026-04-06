/**
 * Tests for iDevice registry (js/registries/idevice-types.js).
 */
const { KNOWN_TYPES, lookup, allKnownTypes } = require('../js/registries/idevice-types');

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
});
