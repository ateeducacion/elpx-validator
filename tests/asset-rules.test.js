/**
 * Tests for asset validation (js/validators/asset-rules.js).
 */
const {
    buildInventory,
    extractReferences,
    validateAssets,
    normalizeResourcePath,
    resolveReferencePath,
    looksLikeAssetPath,
    extractPathsFromCss,
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
        const refsByPath = { '../../../etc/passwd': [{ sourceType: 'htmlView', source: {}, rawPath: '../../../etc/passwd', sourcePath: null }] };
        const { findings } = validateAssets(assets, refsByPath, {});
        expect(findings.some(f => f.code === 'ASSET004')).toBe(true);
    });
});

/* ------------------------------------------------------------------ */
/*  New tests for path resolution with source context                  */
/* ------------------------------------------------------------------ */

describe('resolveReferencePath', () => {
    test('../libs/common.js from html/foo.html resolves to libs/common.js', () => {
        expect(resolveReferencePath('../libs/common.js', 'html/foo.html')).toBe('libs/common.js');
    });

    test('../content/resources/a.jpg from html/section.html resolves to content/resources/a.jpg', () => {
        expect(resolveReferencePath('../content/resources/a.jpg', 'html/section.html')).toBe('content/resources/a.jpg');
    });

    test('../theme/style.css from html/page.html resolves to theme/style.css', () => {
        expect(resolveReferencePath('../theme/style.css', 'html/page.html')).toBe('theme/style.css');
    });

    test('../idevices/text/text.js from html/page.html resolves to idevices/text/text.js', () => {
        expect(resolveReferencePath('../idevices/text/text.js', 'html/page.html')).toBe('idevices/text/text.js');
    });

    test('content/resources/img.png without source resolves unchanged', () => {
        expect(resolveReferencePath('content/resources/img.png', null)).toBe('content/resources/img.png');
    });

    test('content/resources/img.png without ../ resolves unchanged regardless of source', () => {
        expect(resolveReferencePath('content/resources/img.png', 'html/foo.html')).toBe('content/resources/img.png');
    });

    test('../../etc/passwd from html/foo.html escapes root', () => {
        // The resolution silently drops escaping segments
        var resolved = resolveReferencePath('../../etc/passwd', 'html/foo.html');
        expect(resolved).toBe('etc/passwd');
    });

    test('handles {{context_path}} stripping before resolution', () => {
        expect(resolveReferencePath('{{context_path}}/libs/common.js', 'html/foo.html')).toBe('libs/common.js');
    });

    test('handles query strings and fragments', () => {
        expect(resolveReferencePath('../libs/file.js?v=123#hash', 'html/page.html')).toBe('libs/file.js');
    });

    test('html/../../libs/common.js normalizes properly', () => {
        expect(resolveReferencePath('../../libs/common.js', 'html/subdir/page.html')).toBe('libs/common.js');
    });
});

describe('looksLikeAssetPath', () => {
    test('rejects HTML content as a path', () => {
        expect(looksLikeAssetPath('<h2><img src="content/resources/img.jpg"></h2>')).toBe(false);
    });

    test('rejects multi-line text', () => {
        expect(looksLikeAssetPath('line1\nline2 content/resources/img.jpg')).toBe(false);
    });

    test('accepts isolated content/ path', () => {
        expect(looksLikeAssetPath('content/resources/photo.jpg')).toBe(true);
    });

    test('accepts isolated theme/ path', () => {
        expect(looksLikeAssetPath('theme/style.css')).toBe(true);
    });

    test('accepts isolated libs/ path', () => {
        expect(looksLikeAssetPath('libs/jquery/jquery.min.js')).toBe(true);
    });

    test('accepts paths with ../', () => {
        expect(looksLikeAssetPath('../libs/common.js')).toBe(true);
    });

    test('accepts paths with {{context_path}}', () => {
        expect(looksLikeAssetPath('{{context_path}}/content/resources/img.png')).toBe(true);
    });

    test('rejects plain text mentioning content/', () => {
        expect(looksLikeAssetPath('This is some text about the content/ directory and more description')).toBe(false);
    });
});

describe('Path traversal detection - context-aware', () => {
    test('../libs/common.js from html/foo.html is NOT path traversal', () => {
        const assets = [
            { path: 'libs/common.js', normalizedPath: 'libs/common.js', referenced: false, referencedBy: [], isAssetDir: true }
        ];
        const refsByPath = { 'libs/common.js': [{ sourceType: 'exportedHtml', source: { htmlFile: 'html/foo.html' }, rawPath: '../libs/common.js', sourcePath: 'html/foo.html' }] };
        const { findings } = validateAssets(assets, refsByPath, {});
        expect(findings.some(f => f.code === 'ASSET004')).toBe(false);
    });

    test('../../etc/passwd from html/foo.html IS path traversal', () => {
        const assets = [];
        const refsByPath = { 'etc/passwd': [{ sourceType: 'exportedHtml', source: { htmlFile: 'html/foo.html' }, rawPath: '../../etc/passwd', sourcePath: 'html/foo.html' }] };
        const { findings } = validateAssets(assets, refsByPath, {});
        expect(findings.some(f => f.code === 'ASSET004')).toBe(true);
    });

    test('../content/resources/a.jpg from html/page.html is NOT path traversal', () => {
        const assets = [
            { path: 'content/resources/a.jpg', normalizedPath: 'content/resources/a.jpg', referenced: false, referencedBy: [], isAssetDir: true }
        ];
        const refsByPath = { 'content/resources/a.jpg': [{ sourceType: 'exportedHtml', source: { htmlFile: 'html/page.html' }, rawPath: '../content/resources/a.jpg', sourcePath: 'html/page.html' }] };
        const { findings } = validateAssets(assets, refsByPath, {});
        expect(findings.some(f => f.code === 'ASSET004')).toBe(false);
    });
});

describe('JSON extraction - HTML embedded strings', () => {
    test('extracts src from HTML embedded in JSON, not the whole string', () => {
        const model = {
            pages: [{
                odePageId: 'p1', pageName: 'Page', odeParentPageId: '', order: '1',
                blocks: [{
                    odeBlockId: 'b1', blockName: 'Block', components: [{
                        odeIdeviceId: 'c1', odeIdeviceTypeName: 'text',
                        odePageId: 'p1', odeBlockId: 'b1',
                        htmlView: '',
                        jsonProperties: '{"text":"<h2>Title</h2><img src=\\"content/resources/photo.jpg\\"><p>Description</p>"}',
                        order: '1'
                    }]
                }]
            }]
        };
        const { references, referencesByPath } = extractReferences(model);
        // Should extract the image path, not the whole HTML blob
        expect(Object.keys(referencesByPath)).toContain('content/resources/photo.jpg');
        // Ensure the full HTML string was NOT added as a reference
        const allPaths = Object.keys(referencesByPath);
        const longPaths = allPaths.filter(p => p.length > 100);
        expect(longPaths.length).toBe(0);
    });

    test('ignores plain text mentioning content/ in JSON', () => {
        const model = {
            pages: [{
                odePageId: 'p1', pageName: 'Page', odeParentPageId: '', order: '1',
                blocks: [{
                    odeBlockId: 'b1', blockName: 'Block', components: [{
                        odeIdeviceId: 'c1', odeIdeviceTypeName: 'text',
                        odePageId: 'p1', odeBlockId: 'b1',
                        htmlView: '',
                        jsonProperties: '{"description":"The content/resources directory stores images"}',
                        order: '1'
                    }]
                }]
            }]
        };
        const { referencesByPath } = extractReferences(model);
        // The description text should NOT be treated as a path
        expect(Object.keys(referencesByPath).length).toBe(0);
    });
});

describe('CSS reference extraction', () => {
    test('extracts url() references from CSS', () => {
        const model = { pages: [] };
        const cssContents = {
            'theme/style.css': 'body { background: url(img/icons.png); } .logo { background-image: url("img/licenses.gif"); }'
        };
        const { referencesByPath } = extractReferences(model, {}, cssContents);
        expect(Object.keys(referencesByPath)).toContain('theme/img/icons.png');
        expect(Object.keys(referencesByPath)).toContain('theme/img/licenses.gif');
    });

    test('resolves relative CSS paths from subdirectories', () => {
        const model = { pages: [] };
        const cssContents = {
            'libs/exe_media/exe_media.css': '.play { background: url(exe_media_bigplay.svg); }'
        };
        const { referencesByPath } = extractReferences(model, {}, cssContents);
        expect(Object.keys(referencesByPath)).toContain('libs/exe_media/exe_media_bigplay.svg');
    });

    test('skips data URIs and absolute URLs in CSS', () => {
        const model = { pages: [] };
        const cssContents = {
            'theme/style.css': 'body { background: url(data:image/png;base64,abc); } a { background: url(https://example.com/img.png); }'
        };
        const { referencesByPath } = extractReferences(model, {}, cssContents);
        expect(Object.keys(referencesByPath).length).toBe(0);
    });
});

describe('Orphaned asset classification', () => {
    test('skips .map files from orphaned check', () => {
        const assets = [
            { path: 'libs/some.js.map', normalizedPath: 'libs/some.js.map', referenced: false, referencedBy: [], isAssetDir: true, extension: '.map', mimeType: 'application/octet-stream' }
        ];
        const { findings } = validateAssets(assets, {}, {});
        expect(findings.some(f => f.code === 'ASSET002')).toBe(false);
    });

    test('skips theme/icons/ from orphaned check', () => {
        const assets = [
            { path: 'theme/icons/arrow.png', normalizedPath: 'theme/icons/arrow.png', referenced: false, referencedBy: [], isAssetDir: true, extension: '.png', mimeType: 'image/png' }
        ];
        const { findings } = validateAssets(assets, {}, {});
        expect(findings.some(f => f.code === 'ASSET002')).toBe(false);
    });

    test('skips idevice template HTML from orphaned check', () => {
        const assets = [
            { path: 'idevices/text/text.html', normalizedPath: 'idevices/text/text.html', referenced: false, referencedBy: [], isAssetDir: true, extension: '.html', mimeType: 'text/html' }
        ];
        const { findings } = validateAssets(assets, {}, {});
        expect(findings.some(f => f.code === 'ASSET002')).toBe(false);
    });

    test('still flags orphaned content/resources files', () => {
        const assets = [
            { path: 'content/resources/unused.png', normalizedPath: 'content/resources/unused.png', referenced: false, referencedBy: [], isAssetDir: true, extension: '.png', mimeType: 'image/png' }
        ];
        const { findings } = validateAssets(assets, {}, {});
        expect(findings.some(f => f.code === 'ASSET002')).toBe(true);
    });
});
