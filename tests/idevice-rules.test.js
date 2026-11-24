/**
 * Tests for iDevice validation (js/validators/idevice-rules.js).
 */
const { validateIdevices } = require('../js/validators/idevice-rules');

function makeModel(components) {
    return {
        pages: [
            {
                odePageId: 'p1',
                pageName: 'Page',
                odeParentPageId: '',
                order: '1',
                blocks: [
                    {
                        odeBlockId: 'b1',
                        blockName: 'Block',
                        components: components
                    }
                ]
            }
        ],
        resources: {}
    };
}

describe('iDevice validation', () => {
    test('flags unknown iDevice types', () => {
        const model = makeModel([
            {
                odeIdeviceId: 'c1',
                odeIdeviceTypeName: 'custom-unknown',
                odePageId: 'p1',
                odeBlockId: 'b1',
                htmlView: '<p>Test</p>',
                jsonProperties: '{}',
                order: '1'
            }
        ]);
        const { findings, ideviceSummary } = validateIdevices(model);
        expect(findings.some((f) => f.code === 'IDEV001')).toBe(true);
        expect(ideviceSummary.unknown).toBe(1);
    });

    test('recognizes known iDevice types', () => {
        const model = makeModel([
            {
                odeIdeviceId: 'c1',
                odeIdeviceTypeName: 'text',
                odePageId: 'p1',
                odeBlockId: 'b1',
                htmlView: '<p>Test</p>',
                jsonProperties: '{"textTextarea":"Hi"}',
                order: '1'
            }
        ]);
        const { findings, ideviceSummary } = validateIdevices(model);
        expect(findings.some((f) => f.code === 'IDEV001')).toBe(false);
        expect(ideviceSummary.knownDeep).toBe(1);
    });

    test('flags unparseable jsonProperties', () => {
        const model = makeModel([
            {
                odeIdeviceId: 'c1',
                odeIdeviceTypeName: 'text',
                odePageId: 'p1',
                odeBlockId: 'b1',
                htmlView: '<p>Test</p>',
                jsonProperties: 'not{valid}json',
                order: '1'
            }
        ]);
        const { findings, ideviceSummary } = validateIdevices(model);
        expect(findings.some((f) => f.code === 'IDEV002')).toBe(true);
        expect(ideviceSummary.parseErrors).toBe(1);
    });

    test('flags empty htmlView', () => {
        const model = makeModel([
            {
                odeIdeviceId: 'c1',
                odeIdeviceTypeName: 'text',
                odePageId: 'p1',
                odeBlockId: 'b1',
                htmlView: '',
                jsonProperties: '{}',
                order: '1'
            }
        ]);
        const { findings } = validateIdevices(model);
        expect(findings.some((f) => f.code === 'IDEV003')).toBe(true);
    });

    test('flags image-gallery missing image references', () => {
        const model = makeModel([
            {
                odeIdeviceId: 'c1',
                odeIdeviceTypeName: 'image-gallery',
                odePageId: 'p1',
                odeBlockId: 'b1',
                htmlView: '<div>No images here</div>',
                jsonProperties: '{"data":[]}',
                order: '1'
            }
        ]);
        const { findings } = validateIdevices(model);
        expect(findings.some((f) => f.code === 'IDEV004')).toBe(true);
    });

    test('does not flag image-gallery with image references', () => {
        const model = makeModel([
            {
                odeIdeviceId: 'c1',
                odeIdeviceTypeName: 'image-gallery',
                odePageId: 'p1',
                odeBlockId: 'b1',
                htmlView: '<img src="content/resources/photo.jpg">',
                jsonProperties: '{}',
                order: '1'
            }
        ]);
        const { findings } = validateIdevices(model);
        expect(findings.some((f) => f.code === 'IDEV004')).toBe(false);
    });

    test('flags external-website missing URL', () => {
        const model = makeModel([
            {
                odeIdeviceId: 'c1',
                odeIdeviceTypeName: 'external-website',
                odePageId: 'p1',
                odeBlockId: 'b1',
                htmlView: '<div>No URL</div>',
                jsonProperties: '{}',
                order: '1'
            }
        ]);
        const { findings } = validateIdevices(model);
        expect(findings.some((f) => f.code === 'IDEV005')).toBe(true);
    });

    test('does not flag external-website with URL', () => {
        const model = makeModel([
            {
                odeIdeviceId: 'c1',
                odeIdeviceTypeName: 'external-website',
                odePageId: 'p1',
                odeBlockId: 'b1',
                htmlView: '<iframe src="https://example.com"></iframe>',
                jsonProperties: '{}',
                order: '1'
            }
        ]);
        const { findings } = validateIdevices(model);
        expect(findings.some((f) => f.code === 'IDEV005')).toBe(false);
    });

    test('flags download-source-file without isDownload flag', () => {
        const model = makeModel([
            {
                odeIdeviceId: 'c1',
                odeIdeviceTypeName: 'download-source-file',
                odePageId: 'p1',
                odeBlockId: 'b1',
                htmlView: '<p>Download</p>',
                jsonProperties: '{}',
                order: '1'
            }
        ]);
        model.resources = { isDownload: 'false' };
        const { findings } = validateIdevices(model);
        expect(findings.some((f) => f.code === 'IDEV006')).toBe(true);
    });

    test('counts type occurrences correctly', () => {
        const model = makeModel([
            {
                odeIdeviceId: 'c1',
                odeIdeviceTypeName: 'text',
                odePageId: 'p1',
                odeBlockId: 'b1',
                htmlView: '<p>',
                jsonProperties: '{}',
                order: '1'
            },
            {
                odeIdeviceId: 'c2',
                odeIdeviceTypeName: 'text',
                odePageId: 'p1',
                odeBlockId: 'b1',
                htmlView: '<p>',
                jsonProperties: '{}',
                order: '2'
            },
            {
                odeIdeviceId: 'c3',
                odeIdeviceTypeName: 'crossword',
                odePageId: 'p1',
                odeBlockId: 'b1',
                htmlView: '<p>',
                jsonProperties: '{}',
                order: '3'
            }
        ]);
        const { ideviceSummary } = validateIdevices(model);
        expect(ideviceSummary.total).toBe(3);
        expect(ideviceSummary.typeCounts['text']).toBe(2);
        expect(ideviceSummary.typeCounts['crossword']).toBe(1);
    });

    test('form with empty htmlView does not trigger IDEV003', () => {
        const model = makeModel([
            {
                odeIdeviceId: 'c1',
                odeIdeviceTypeName: 'form',
                odePageId: 'p1',
                odeBlockId: 'b1',
                htmlView: '',
                jsonProperties: '{"field":"value"}',
                order: '1'
            }
        ]);
        const { findings } = validateIdevices(model);
        expect(findings.some((f) => f.code === 'IDEV003')).toBe(false);
    });

    test('IDEV006 has info severity', () => {
        const model = makeModel([
            {
                odeIdeviceId: 'c1',
                odeIdeviceTypeName: 'download-source-file',
                odePageId: 'p1',
                odeBlockId: 'b1',
                htmlView: '<p>Download</p>',
                jsonProperties: '{}',
                order: '1'
            }
        ]);
        model.resources = { isDownload: 'false' };
        const { findings } = validateIdevices(model);
        const idev006 = findings.filter((f) => f.code === 'IDEV006');
        expect(idev006.length).toBe(1);
        expect(idev006[0].severity).toBe('info');
    });

    test('recognizes new types udl-content, scrambled-list, interactive-video', () => {
        const types = ['udl-content', 'scrambled-list', 'interactive-video'];
        types.forEach((typeName) => {
            const model = makeModel([
                {
                    odeIdeviceId: 'c1',
                    odeIdeviceTypeName: typeName,
                    odePageId: 'p1',
                    odeBlockId: 'b1',
                    htmlView: '<p>Content</p>',
                    jsonProperties: '{}',
                    order: '1'
                }
            ]);
            const { findings } = validateIdevices(model);
            expect(findings.some((f) => f.code === 'IDEV001')).toBe(false);
        });
    });
});

describe('iDevice files and placeholders', () => {
    const modelWith = (type, htmlView) => ({
        pages: [
            {
                odePageId: 'p1',
                pageName: 'Page',
                blocks: [
                    {
                        odeBlockId: 'b1',
                        components: [
                            { odeIdeviceId: 'i1', odeIdeviceTypeName: type, htmlView: htmlView, jsonProperties: '{}' },
                            {
                                odeIdeviceId: 'i2',
                                odeIdeviceTypeName: type,
                                htmlView: '<p>ok</p>',
                                jsonProperties: '{}'
                            }
                        ]
                    }
                ]
            }
        ]
    });
    const codes = (model, zipFiles) => validateIdevices(model, zipFiles).findings.map((f) => f.code);

    test('IDEV007 once per type whose idevices/<type>/ folder is not in the package', () => {
        const zipFiles = { 'idevices/text/text.js': {}, 'content.xml': {} };
        expect(codes(modelWith('puzzle', '<p>x</p>'), zipFiles).filter((c) => c === 'IDEV007')).toHaveLength(1);
        expect(codes(modelWith('text', '<p>x</p>'), zipFiles)).not.toContain('IDEV007');
    });

    test('no IDEV007 for a package that ships no iDevice folders at all', () => {
        expect(codes(modelWith('puzzle', '<p>x</p>'), { 'content.xml': {} })).not.toContain('IDEV007');
        expect(codes(modelWith('puzzle', '<p>x</p>'))).not.toContain('IDEV007');
    });

    test.each(['asset://abc123/photo.png', '__PLACEHOLDER__', 'UUID-PAGINA', 'UUID-BLOQUE'])(
        'IDEV008 when htmlView still contains %s',
        (placeholder) => {
            const findings = validateIdevices(modelWith('text', '<img src="' + placeholder + '">')).findings;
            const found = findings.filter((f) => f.code === 'IDEV008');
            expect(found).toHaveLength(1);
            expect(found[0].location.ideviceId).toBe('i1');
        }
    );

    test('no IDEV008 for resolved content', () => {
        expect(codes(modelWith('text', '<img src="{{context_path}}/photo.png">'))).not.toContain('IDEV008');
    });
});
