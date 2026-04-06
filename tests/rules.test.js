/**
 * Tests for the Rule catalog (js/core/rules.js).
 */
const { SEVERITY, CATEGORY, RULES, createFinding } = require('../js/core/rules');

describe('Rule catalog', () => {
    test('SEVERITY contains expected values', () => {
        expect(SEVERITY.ERROR).toBe('error');
        expect(SEVERITY.WARNING).toBe('warning');
        expect(SEVERITY.INFO).toBe('info');
    });

    test('CATEGORY contains expected values', () => {
        expect(CATEGORY.PACKAGE).toBe('package');
        expect(CATEGORY.XML).toBe('xml');
        expect(CATEGORY.NAVIGATION).toBe('navigation');
        expect(CATEGORY.IDEVICE).toBe('idevice');
        expect(CATEGORY.ASSET).toBe('asset');
        expect(CATEGORY.METADATA).toBe('metadata');
    });

    test('all rules have required fields', () => {
        Object.entries(RULES).forEach(([key, rule]) => {
            expect(rule.code).toBe(key);
            expect(['error', 'warning', 'info']).toContain(rule.severity);
            expect(rule.category).toBeTruthy();
            expect(rule.message).toBeTruthy();
        });
    });

    test('createFinding returns a valid finding object', () => {
        const finding = createFinding('PKG001', {
            details: 'Test detail',
            location: { path: '/test' },
            evidence: { filename: 'test.zip' },
            suggestion: 'Re-export.'
        });
        expect(finding.code).toBe('PKG001');
        expect(finding.severity).toBe('error');
        expect(finding.category).toBe('package');
        expect(finding.message).toBe('Invalid ZIP archive');
        expect(finding.details).toBe('Test detail');
        expect(finding.location.path).toBe('/test');
        expect(finding.evidence.filename).toBe('test.zip');
        expect(finding.suggestion).toBe('Re-export.');
    });

    test('createFinding throws for unknown rule', () => {
        expect(() => createFinding('UNKNOWN999')).toThrow('Unknown rule code');
    });

    test('createFinding returns frozen objects', () => {
        const finding = createFinding('PKG001');
        expect(Object.isFrozen(finding)).toBe(true);
    });
});
