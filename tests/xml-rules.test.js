/**
 * Tests for XML/schema validation (js/validators/xml-rules.js).
 */
const { parseAndValidateXml, validateSchema, EXPECTED_NAMESPACE } = require('../js/validators/xml-rules');

describe('XML parsing', () => {
    test('rejects non-string input', () => {
        const result = parseAndValidateXml(42);
        expect(result.document).toBeNull();
        expect(result.findings.some(f => f.code === 'XML001')).toBe(true);
    });

    test('rejects malformed XML', () => {
        const result = parseAndValidateXml('<ode><unclosed></ode>');
        expect(result.document).toBeNull();
        expect(result.findings.some(f => f.code === 'XML001')).toBe(true);
    });

    test('parses valid XML', () => {
        const result = parseAndValidateXml('<?xml version="1.0"?><ode></ode>');
        expect(result.document).not.toBeNull();
        expect(result.findings.length).toBe(0);
    });
});

describe('XML schema validation', () => {
    function parse(xml) {
        return parseAndValidateXml(xml).document;
    }

    test('flags non-ode root element', () => {
        const doc = parse('<?xml version="1.0"?><root></root>');
        const findings = validateSchema(doc);
        expect(findings.some(f => f.code === 'XML002')).toBe(true);
    });

    test('flags missing namespace', () => {
        const doc = parse('<?xml version="1.0"?><ode><odeNavStructures></odeNavStructures></ode>');
        const findings = validateSchema(doc);
        expect(findings.some(f => f.code === 'XML003')).toBe(true);
    });

    test('flags wrong namespace', () => {
        const doc = parse('<?xml version="1.0"?><ode xmlns="http://wrong.example.com"><odeNavStructures></odeNavStructures></ode>');
        const findings = validateSchema(doc);
        expect(findings.some(f => f.code === 'XML003')).toBe(true);
    });

    test('flags missing version attribute', () => {
        const xml = '<?xml version="1.0"?><ode xmlns="' + EXPECTED_NAMESPACE + '"><odeNavStructures></odeNavStructures></ode>';
        const doc = parse(xml);
        const findings = validateSchema(doc);
        expect(findings.some(f => f.code === 'XML004')).toBe(true);
    });

    test('flags missing DOCTYPE from raw string', () => {
        const rawXml = '<?xml version="1.0"?><ode xmlns="' + EXPECTED_NAMESPACE + '" version="2.0"><odeNavStructures></odeNavStructures></ode>';
        const doc = parse(rawXml);
        const findings = validateSchema(doc, rawXml);
        expect(findings.some(f => f.code === 'XML005')).toBe(true);
    });

    test('does not flag DOCTYPE when present', () => {
        const rawXml = '<?xml version="1.0"?><!DOCTYPE ode SYSTEM "content.dtd"><ode xmlns="' + EXPECTED_NAMESPACE + '" version="2.0"><odeNavStructures></odeNavStructures></ode>';
        const doc = parse(rawXml);
        const findings = validateSchema(doc, rawXml);
        expect(findings.some(f => f.code === 'XML005')).toBe(false);
    });

    test('flags missing odeNavStructures', () => {
        const doc = parse('<?xml version="1.0"?><ode xmlns="' + EXPECTED_NAMESPACE + '" version="2.0"></ode>');
        const findings = validateSchema(doc);
        expect(findings.some(f => f.code === 'XML007')).toBe(true);
    });

    test('flags unknown root child elements', () => {
        const doc = parse('<?xml version="1.0"?><ode xmlns="' + EXPECTED_NAMESPACE + '" version="2.0"><unknownElement/><odeNavStructures></odeNavStructures></ode>');
        const findings = validateSchema(doc);
        expect(findings.some(f => f.code === 'XML008')).toBe(true);
    });

    test('flags incorrect root child ordering', () => {
        const doc = parse('<?xml version="1.0"?><ode xmlns="' + EXPECTED_NAMESPACE + '" version="2.0"><odeNavStructures></odeNavStructures><odeResources></odeResources></ode>');
        const findings = validateSchema(doc);
        expect(findings.some(f => f.code === 'XML006')).toBe(true);
    });

    test('passes correct structure with all elements in order', () => {
        const rawXml = '<?xml version="1.0"?><!DOCTYPE ode SYSTEM "content.dtd">'
            + '<ode xmlns="' + EXPECTED_NAMESPACE + '" version="2.0">'
            + '<odeResources></odeResources>'
            + '<odeProperties></odeProperties>'
            + '<odeNavStructures></odeNavStructures>'
            + '</ode>';
        const doc = parse(rawXml);
        const findings = validateSchema(doc, rawXml);
        const errors = findings.filter(f => f.severity === 'error');
        expect(errors.length).toBe(0);
    });
});
