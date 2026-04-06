/**
 * Tests for navigation and reference validation (js/validators/nav-rules.js).
 */
const { validateNavigation, validateIdFormats, validateMetadata, ODE_ID_PATTERN } = require('../js/validators/nav-rules');

describe('ID format validation', () => {
    test('ODE_ID_PATTERN matches valid IDs', () => {
        expect(ODE_ID_PATTERN.test('20251125215855LURLBW')).toBe(true);
        expect(ODE_ID_PATTERN.test('20240101000000AAAAAA')).toBe(true);
        expect(ODE_ID_PATTERN.test('99991231235959Z9Z9Z9')).toBe(true);
    });

    test('ODE_ID_PATTERN rejects invalid IDs', () => {
        expect(ODE_ID_PATTERN.test('123')).toBe(false);
        expect(ODE_ID_PATTERN.test('20251125215855lurlbw')).toBe(false); // lowercase
        expect(ODE_ID_PATTERN.test('2025112521585LURLBW')).toBe(false); // too short timestamp
        expect(ODE_ID_PATTERN.test('20251125215855LURLB')).toBe(false); // too short suffix
        expect(ODE_ID_PATTERN.test('')).toBe(false);
    });

    test('validateIdFormats flags missing odeId', () => {
        const findings = validateIdFormats({});
        const metaFindings = findings.filter(f => f.code === 'META001');
        expect(metaFindings.length).toBe(1);
    });

    test('validateIdFormats flags invalid odeId format', () => {
        const findings = validateIdFormats({ odeId: 'bad-id', odeVersionId: '20251125215855ABCXYZ' });
        const formatFindings = findings.filter(f => f.code === 'META004');
        expect(formatFindings.length).toBe(1);
    });

    test('validateIdFormats passes valid IDs', () => {
        const findings = validateIdFormats({
            odeId: '20251125215855LURLBW',
            odeVersionId: '20251125220103ABCXYZ',
            eXeVersion: 'v3.0.0'
        });
        const errors = findings.filter(f => f.severity === 'error');
        expect(errors.length).toBe(0);
    });
});

describe('Navigation validation', () => {
    test('flags empty project', () => {
        const model = { pages: [] };
        const findings = validateNavigation(model);
        expect(findings.some(f => f.code === 'NAV001')).toBe(true);
    });

    test('flags duplicate page IDs', () => {
        const model = {
            pages: [
                { odePageId: 'p1', pageName: 'Page 1', odeParentPageId: '', order: '1', blocks: [] },
                { odePageId: 'p1', pageName: 'Page 2', odeParentPageId: '', order: '2', blocks: [] }
            ]
        };
        const findings = validateNavigation(model);
        expect(findings.some(f => f.code === 'NAV005')).toBe(true);
    });

    test('flags dangling parent page reference', () => {
        const model = {
            pages: [
                { odePageId: 'p1', pageName: 'Page 1', odeParentPageId: 'nonexistent', order: '1', blocks: [] }
            ]
        };
        const findings = validateNavigation(model);
        expect(findings.some(f => f.code === 'NAV006')).toBe(true);
    });

    test('detects page hierarchy cycles', () => {
        const model = {
            pages: [
                { odePageId: 'p1', pageName: 'A', odeParentPageId: 'p2', order: '1', blocks: [] },
                { odePageId: 'p2', pageName: 'B', odeParentPageId: 'p1', order: '2', blocks: [] }
            ]
        };
        const findings = validateNavigation(model);
        expect(findings.some(f => f.code === 'NAV007')).toBe(true);
    });

    test('flags duplicate block IDs', () => {
        const model = {
            pages: [
                {
                    odePageId: 'p1', pageName: 'Page', odeParentPageId: '', order: '1',
                    blocks: [
                        { odeBlockId: 'b1', blockName: 'Block 1', components: [] },
                        { odeBlockId: 'b1', blockName: 'Block 2', components: [] }
                    ]
                }
            ]
        };
        const findings = validateNavigation(model);
        expect(findings.some(f => f.code === 'NAV010')).toBe(true);
    });

    test('flags duplicate iDevice IDs', () => {
        const model = {
            pages: [{
                odePageId: 'p1', pageName: 'Page', odeParentPageId: '', order: '1',
                blocks: [{
                    odeBlockId: 'b1', blockName: 'Block', components: [
                        { odeIdeviceId: 'c1', odeIdeviceTypeName: 'text', odePageId: 'p1', odeBlockId: 'b1', htmlView: '<p>', jsonProperties: '{}', order: '1' },
                        { odeIdeviceId: 'c1', odeIdeviceTypeName: 'text', odePageId: 'p1', odeBlockId: 'b1', htmlView: '<p>', jsonProperties: '{}', order: '2' }
                    ]
                }]
            }]
        };
        const findings = validateNavigation(model);
        expect(findings.some(f => f.code === 'NAV015')).toBe(true);
    });

    test('flags component page ID mismatch', () => {
        const model = {
            pages: [{
                odePageId: 'p1', pageName: 'Page', odeParentPageId: '', order: '1',
                blocks: [{
                    odeBlockId: 'b1', blockName: 'Block', components: [
                        { odeIdeviceId: 'c1', odeIdeviceTypeName: 'text', odePageId: 'WRONG', odeBlockId: 'b1', htmlView: '<p>', jsonProperties: '{}', order: '1' }
                    ]
                }]
            }]
        };
        const findings = validateNavigation(model);
        expect(findings.some(f => f.code === 'NAV012')).toBe(true);
    });

    test('flags non-numeric order values', () => {
        const model = {
            pages: [{
                odePageId: 'p1', pageName: 'Page', odeParentPageId: '', order: 'abc',
                blocks: []
            }]
        };
        const findings = validateNavigation(model);
        expect(findings.some(f => f.code === 'NAV019')).toBe(true);
    });

    test('flags inconsistent sibling ordering', () => {
        const model = {
            pages: [
                { odePageId: 'p1', pageName: 'A', odeParentPageId: '', order: '1', blocks: [] },
                { odePageId: 'p2', pageName: 'B', odeParentPageId: '', order: '1', blocks: [] }
            ]
        };
        const findings = validateNavigation(model);
        expect(findings.some(f => f.code === 'NAV008')).toBe(true);
    });

    test('passes valid simple model', () => {
        const model = {
            pages: [{
                odePageId: 'p1', pageName: 'Home', odeParentPageId: '', order: '1',
                blocks: [{
                    odeBlockId: 'b1', blockName: 'Block', components: [
                        { odeIdeviceId: 'c1', odeIdeviceTypeName: 'text', odePageId: 'p1', odeBlockId: 'b1', htmlView: '<p>', jsonProperties: '{}', order: '1' }
                    ]
                }]
            }]
        };
        const findings = validateNavigation(model);
        const errors = findings.filter(f => f.severity === 'error');
        expect(errors.length).toBe(0);
    });
});

describe('Metadata validation', () => {
    test('flags missing project title', () => {
        const findings = validateMetadata({});
        expect(findings.some(f => f.code === 'META006')).toBe(true);
    });

    test('passes when title is present', () => {
        const findings = validateMetadata({ pp_title: 'My Project' });
        expect(findings.some(f => f.code === 'META006')).toBe(false);
    });
});

describe('META003 eXeVersion aliases', () => {
    test('accepts exe_version as alias', () => {
        const findings = validateIdFormats({
            odeId: '20251125215855LURLBW',
            odeVersionId: '20251125220103ABCXYZ',
            exe_version: '3.0'
        });
        // Should not produce a fully missing META003
        const meta003 = findings.filter(f => f.code === 'META003');
        // Should detect the alias and note it
        expect(meta003.length).toBe(1);
        expect(meta003[0].details).toContain('exe_version');
    });

    test('accepts pp_exelearning_version as alias', () => {
        const findings = validateIdFormats({
            odeId: '20251125215855LURLBW',
            odeVersionId: '20251125220103ABCXYZ',
            pp_exelearning_version: '3.0.1'
        });
        const meta003 = findings.filter(f => f.code === 'META003');
        expect(meta003.length).toBe(1);
        expect(meta003[0].details).toContain('pp_exelearning_version');
    });

    test('no META003 when eXeVersion is present', () => {
        const findings = validateIdFormats({
            odeId: '20251125215855LURLBW',
            odeVersionId: '20251125220103ABCXYZ',
            eXeVersion: 'v3.0.0'
        });
        const meta003 = findings.filter(f => f.code === 'META003');
        expect(meta003.length).toBe(0);
    });

    test('flags fully missing version when no aliases exist', () => {
        const findings = validateIdFormats({
            odeId: '20251125215855LURLBW',
            odeVersionId: '20251125220103ABCXYZ'
        });
        const meta003 = findings.filter(f => f.code === 'META003');
        expect(meta003.length).toBe(1);
        expect(meta003[0].details).toContain('missing');
    });
});

describe('NAV011 blockName relaxed', () => {
    test('does not flag single-component blocks without blockName', () => {
        const model = {
            pages: [{
                odePageId: 'p1', pageName: 'Page', odeParentPageId: '', order: '1',
                blocks: [{
                    odeBlockId: 'b1', blockName: '', components: [
                        { odeIdeviceId: 'c1', odeIdeviceTypeName: 'text', odePageId: 'p1', odeBlockId: 'b1', htmlView: '<p>x</p>', jsonProperties: '{}', order: '1' }
                    ]
                }]
            }]
        };
        const findings = validateNavigation(model);
        expect(findings.some(f => f.code === 'NAV011')).toBe(false);
    });

    test('flags multi-component blocks without blockName', () => {
        const model = {
            pages: [{
                odePageId: 'p1', pageName: 'Page', odeParentPageId: '', order: '1',
                blocks: [{
                    odeBlockId: 'b1', blockName: '', components: [
                        { odeIdeviceId: 'c1', odeIdeviceTypeName: 'text', odePageId: 'p1', odeBlockId: 'b1', htmlView: '<p>x</p>', jsonProperties: '{}', order: '1' },
                        { odeIdeviceId: 'c2', odeIdeviceTypeName: 'text', odePageId: 'p1', odeBlockId: 'b1', htmlView: '<p>y</p>', jsonProperties: '{}', order: '2' }
                    ]
                }]
            }]
        };
        const findings = validateNavigation(model);
        expect(findings.some(f => f.code === 'NAV011')).toBe(true);
    });
});

describe('NAV017/NAV018 conditional by type', () => {
    test('form with empty htmlView and valid jsonProperties — no NAV017', () => {
        const model = {
            pages: [{
                odePageId: 'p1', pageName: 'Page', odeParentPageId: '', order: '1',
                blocks: [{
                    odeBlockId: 'b1', blockName: 'Block', components: [{
                        odeIdeviceId: 'c1', odeIdeviceTypeName: 'form',
                        odePageId: 'p1', odeBlockId: 'b1',
                        htmlView: '', jsonProperties: '{"field":"value"}', order: '1'
                    }]
                }]
            }]
        };
        const findings = validateNavigation(model);
        expect(findings.some(f => f.code === 'NAV017')).toBe(false);
    });

    test('rubric with valid htmlView and empty jsonProperties — no NAV018', () => {
        const model = {
            pages: [{
                odePageId: 'p1', pageName: 'Page', odeParentPageId: '', order: '1',
                blocks: [{
                    odeBlockId: 'b1', blockName: 'Block', components: [{
                        odeIdeviceId: 'c1', odeIdeviceTypeName: 'rubric',
                        odePageId: 'p1', odeBlockId: 'b1',
                        htmlView: '<table>rubric</table>', jsonProperties: '', order: '1'
                    }]
                }]
            }]
        };
        const findings = validateNavigation(model);
        expect(findings.some(f => f.code === 'NAV018')).toBe(false);
    });

    test('download-source-file with valid htmlView and empty jsonProperties — no NAV018', () => {
        const model = {
            pages: [{
                odePageId: 'p1', pageName: 'Page', odeParentPageId: '', order: '1',
                blocks: [{
                    odeBlockId: 'b1', blockName: 'Block', components: [{
                        odeIdeviceId: 'c1', odeIdeviceTypeName: 'download-source-file',
                        odePageId: 'p1', odeBlockId: 'b1',
                        htmlView: '<p>Download</p>', jsonProperties: '', order: '1'
                    }]
                }]
            }]
        };
        const findings = validateNavigation(model);
        expect(findings.some(f => f.code === 'NAV018')).toBe(false);
    });

    test('generic type with both empty triggers NAV017', () => {
        const model = {
            pages: [{
                odePageId: 'p1', pageName: 'Page', odeParentPageId: '', order: '1',
                blocks: [{
                    odeBlockId: 'b1', blockName: 'Block', components: [{
                        odeIdeviceId: 'c1', odeIdeviceTypeName: 'text',
                        odePageId: 'p1', odeBlockId: 'b1',
                        htmlView: '', jsonProperties: '', order: '1'
                    }]
                }]
            }]
        };
        const findings = validateNavigation(model);
        expect(findings.some(f => f.code === 'NAV017')).toBe(true);
    });

    test('generic type with htmlView only — no warnings', () => {
        const model = {
            pages: [{
                odePageId: 'p1', pageName: 'Page', odeParentPageId: '', order: '1',
                blocks: [{
                    odeBlockId: 'b1', blockName: 'Block', components: [{
                        odeIdeviceId: 'c1', odeIdeviceTypeName: 'text',
                        odePageId: 'p1', odeBlockId: 'b1',
                        htmlView: '<p>Hello</p>', jsonProperties: '', order: '1'
                    }]
                }]
            }]
        };
        const findings = validateNavigation(model);
        expect(findings.some(f => f.code === 'NAV017')).toBe(false);
        expect(findings.some(f => f.code === 'NAV018')).toBe(false);
    });
});
