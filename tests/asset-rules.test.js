/**
 * Tests for asset validation (js/validators/asset-rules.js).
 */
const {
    buildInventory,
    extractReferences,
    validateAssets,
    normalizeResourcePath,
    inferMime,
    previewType,
    getExtension
} = require('../js/validators/asset-rules');

describe('Asset utilities', () => {
    test('normalizeResourcePath strips {{context_path}}', () => {
        expect(normalizeResourcePath('{{context_path}}/content/resources/img.png')).toBe('content/resources/img.png');
    });

    test('normalizeResourcePath strips query strings and fragments', () => {
        expect(normalizeResourcePath('content/resources/img.png?v=123')).toBe('content/resources/img.png');
        expect(normalizeResourcePath('content/resources/img.png#section')).toBe('content/resources/img.png');
    });

    test('normalizeResourcePath handles relative and encoded paths', () => {
        expect(normalizeResourcePath('./content/My%20File.png')).toBe('content/My File.png');
        expect(normalizeResourcePath('/content\\file.txt')).toBe('content/file.txt');
    });

    test('inferMime returns correct types', () => {
        expect(inferMime('photo.jpg')).toBe('image/jpeg');
        expect(inferMime('script.js')).toBe('application/javascript');
        expect(inferMime('styles.css')).toBe('text/css');
        expect(inferMime('unknown.xyz')).toBe('application/octet-stream');
    });

    test('previewType categorizes correctly', () => {
        expect(previewType('.jpg')).toBe('image');
        expect(previewType('.mp3')).toBe('audio');
        expect(previewType('.mp4')).toBe('video');
        expect(previewType('.pdf')).toBe('pdf');
        expect(previewType('.js')).toBe('code');
        expect(previewType('.zip')).toBe('binary');
    });

    test('getExtension extracts extension', () => {
        expect(getExtension('photo.jpg')).toBe('.jpg');
        expect(getExtension('path/to/file.PNG')).toBe('.png');
        expect(getExtension('noextension')).toBe('');
    });
});

describe('Asset inventory', () => {
    test('builds inventory from zip files', () => {
        const zipFiles = {
            'content.xml': { dir: false },
            'content/resources/': { dir: true },
            'content/resources/photo.jpg': { dir: false },
            'content/resources/doc.pdf': { dir: false },
            'theme/style.css': { dir: false },
            'index.html': { dir: false }
        };
        const assets = buildInventory(zipFiles);
        expect(assets.length).toBe(5); // 5 non-dir files
        const photo = assets.find(a => a.path === 'content/resources/photo.jpg');
        expect(photo).toBeTruthy();
        expect(photo.mimeType).toBe('image/jpeg');
        expect(photo.previewType).toBe('image');
        expect(photo.isAssetDir).toBe(true);
    });
});

describe('Reference extraction', () => {
    test('extracts references from htmlView', () => {
        const model = {
            pages: [{
                odePageId: 'p1', pageName: 'Page', odeParentPageId: '', order: '1',
                blocks: [{
                    odeBlockId: 'b1', blockName: 'Block', components: [{
                        odeIdeviceId: 'c1', odeIdeviceTypeName: 'text',
                        odePageId: 'p1', odeBlockId: 'b1',
                        htmlView: '<img src="content/resources/photo.jpg"><a href="content/resources/doc.pdf">link</a>',
                        jsonProperties: '{}', order: '1'
                    }]
                }]
            }]
        };
        const { referencesByPath } = extractReferences(model);
        expect(Object.keys(referencesByPath)).toContain('content/resources/photo.jpg');
        expect(Object.keys(referencesByPath)).toContain('content/resources/doc.pdf');
    });

    test('extracts references from jsonProperties', () => {
        const model = {
            pages: [{
                odePageId: 'p1', pageName: 'Page', odeParentPageId: '', order: '1',
                blocks: [{
                    odeBlockId: 'b1', blockName: 'Block', components: [{
                        odeIdeviceId: 'c1', odeIdeviceTypeName: 'text',
                        odePageId: 'p1', odeBlockId: 'b1',
                        htmlView: '',
                        jsonProperties: '{"image":"content/resources/bg.png","nested":{"file":"content/resources/a.mp3"}}',
                        order: '1'
                    }]
                }]
            }]
        };
        const { referencesByPath } = extractReferences(model);
        expect(Object.keys(referencesByPath)).toContain('content/resources/bg.png');
        expect(Object.keys(referencesByPath)).toContain('content/resources/a.mp3');
    });

    test('handles {{context_path}} in references', () => {
        const model = {
            pages: [{
                odePageId: 'p1', pageName: 'Page', odeParentPageId: '', order: '1',
                blocks: [{
                    odeBlockId: 'b1', blockName: 'Block', components: [{
                        odeIdeviceId: 'c1', odeIdeviceTypeName: 'text',
                        odePageId: 'p1', odeBlockId: 'b1',
                        htmlView: '<img src="{{context_path}}/content/resources/photo.jpg">',
                        jsonProperties: '{}', order: '1'
                    }]
                }]
            }]
        };
        const { referencesByPath } = extractReferences(model);
        expect(Object.keys(referencesByPath)).toContain('content/resources/photo.jpg');
    });
});

describe('Asset validation', () => {
    test('flags missing referenced assets', () => {
        const assets = [{ path: 'content/resources/a.png', normalizedPath: 'content/resources/a.png', referenced: false, referencedBy: [], isAssetDir: true }];
        const refsByPath = { 'content/resources/missing.jpg': [{ sourceType: 'htmlView', source: {} }] };
        const { findings, assetSummary } = validateAssets(assets, refsByPath, {});
        expect(findings.some(f => f.code === 'ASSET001')).toBe(true);
        expect(assetSummary.missingAssets).toBe(1);
    });

    test('flags orphaned assets', () => {
        const assets = [
            { path: 'content/resources/unused.png', normalizedPath: 'content/resources/unused.png', referenced: false, referencedBy: [], isAssetDir: true }
        ];
        const refsByPath = {};
        const { findings, assetSummary } = validateAssets(assets, refsByPath, {});
        expect(findings.some(f => f.code === 'ASSET002')).toBe(true);
        expect(assetSummary.orphanedAssets).toBe(1);
    });

    test('marks referenced assets correctly', () => {
        const assets = [
            { path: 'content/resources/used.png', normalizedPath: 'content/resources/used.png', referenced: false, referencedBy: [], isAssetDir: true }
        ];
        const refsByPath = { 'content/resources/used.png': [{ sourceType: 'htmlView', source: {} }] };
        const { assetSummary } = validateAssets(assets, refsByPath, {});
        expect(assetSummary.referencedAssets).toBe(1);
        expect(assets[0].referenced).toBe(true);
    });

    test('detects casing mismatches', () => {
        const assets = [
            { path: 'content/resources/Photo.JPG', normalizedPath: 'content/resources/photo.jpg', referenced: false, referencedBy: [], isAssetDir: true }
        ];
        const refsByPath = { 'content/resources/photo.jpg': [{ sourceType: 'htmlView', source: {} }] };
        const { findings } = validateAssets(assets, refsByPath, {});
        expect(findings.some(f => f.code === 'ASSET005')).toBe(true);
    });

    test('flags path traversal in references', () => {
        const assets = [];
        const refsByPath = { '../../../etc/passwd': [{ sourceType: 'htmlView', source: {} }] };
        const { findings } = validateAssets(assets, refsByPath, {});
        expect(findings.some(f => f.code === 'ASSET004')).toBe(true);
    });
});
