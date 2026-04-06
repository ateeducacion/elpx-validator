/**
 * XML and schema validation rules for content.xml.
 *
 * Validates well-formedness, root element, namespace, version,
 * DOCTYPE hint, and expected child element ordering.
 */
(function (global, factory) {
    if (typeof module === 'object' && module.exports) {
        var rules = require('../core/rules');
        module.exports = factory(rules);
    } else {
        global.ELPXXmlRules = factory(global.ELPXRules);
    }
})(typeof self !== 'undefined' ? self : this, function (rules) {
    'use strict';

    var createFinding = rules.createFinding;
    var EXPECTED_NAMESPACE = 'http://www.intef.es/xsd/ode';

    /**
     * Expected ordering of root child elements.
     * Elements marked optional may be absent but must not appear
     * after a later-ordered element.
     */
    var EXPECTED_ROOT_CHILDREN = [
        'userPreferences',
        'odeResources',
        'odeProperties',
        'odeNavStructures'
    ];

    /**
     * Parse an XML string and return structured findings.
     *
     * @param {string} xmlString
     * @returns {{ findings: object[], document: Document|null }}
     */
    function parseAndValidateXml(xmlString) {
        var findings = [];

        if (typeof xmlString !== 'string') {
            findings.push(createFinding('XML001', {
                details: 'The provided XML payload is not a string.'
            }));
            return { findings: findings, document: null };
        }

        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(xmlString, 'application/xml');
        var parserError = xmlDoc.querySelector('parsererror');

        if (parserError) {
            var detail = (parserError.textContent || '').trim();
            findings.push(createFinding('XML001', {
                details: detail || 'The XML document is not well-formed.',
                evidence: { parserError: detail }
            }));
            return { findings: findings, document: null };
        }

        return { findings: findings, document: xmlDoc };
    }

    /**
     * Validate root element, namespace, version, and structure.
     *
     * @param {Document} xmlDoc
     * @param {string}   xmlString  - The raw XML string (for DOCTYPE check).
     * @returns {object[]} Array of findings.
     */
    function validateSchema(xmlDoc, xmlString) {
        var findings = [];
        var root = xmlDoc.documentElement;

        if (!root) {
            findings.push(createFinding('XML002', {
                details: 'Unable to read the XML root element.'
            }));
            return findings;
        }

        // Check root tag name
        var tagName = (root.localName || root.tagName || '').toLowerCase();
        if (tagName !== 'ode') {
            findings.push(createFinding('XML002', {
                details: 'Expected the root element to be <ode>, found <' + (root.tagName || root.localName) + '> instead.',
                evidence: { rootTag: root.tagName || root.localName },
                suggestion: 'The content.xml in a standard .elpx package must have <ode> as root.'
            }));
            return findings;
        }

        // Check namespace
        var ns = root.namespaceURI || root.getAttribute('xmlns') || '';
        if (!ns) {
            findings.push(createFinding('XML003', {
                details: 'The <ode> element does not declare an xmlns namespace.',
                suggestion: 'Add xmlns="' + EXPECTED_NAMESPACE + '" to the root element.'
            }));
        } else if (ns !== EXPECTED_NAMESPACE) {
            findings.push(createFinding('XML003', {
                details: 'The namespace "' + ns + '" does not match the expected "' + EXPECTED_NAMESPACE + '".',
                evidence: { actual: ns, expected: EXPECTED_NAMESPACE },
                suggestion: 'Update the xmlns attribute to "' + EXPECTED_NAMESPACE + '".'
            }));
        }

        // Check version attribute
        var version = root.getAttribute('version') || '';
        if (!version) {
            findings.push(createFinding('XML004', {
                details: 'The <ode> element does not have a version attribute.',
                suggestion: 'Modern .elpx packages should have version="2.0" on the root element.'
            }));
        }

        // Check DOCTYPE declaration in raw XML
        if (xmlString) {
            var hasDoctypeOde = /<!DOCTYPE\s+ode\s+SYSTEM\s+["']content\.dtd["']\s*>/i.test(xmlString);
            if (!hasDoctypeOde) {
                findings.push(createFinding('XML005', {
                    details: 'No DOCTYPE declaration for "ode" referencing "content.dtd" was found.',
                    suggestion: 'Add <!DOCTYPE ode SYSTEM "content.dtd"> before the <ode> element.'
                }));
            }
        }

        // Check odeNavStructures presence
        var navStructures = root.getElementsByTagName('odeNavStructures');
        if (!navStructures || navStructures.length === 0) {
            findings.push(createFinding('XML007', {
                details: 'The <odeNavStructures> element is missing from the document.',
                suggestion: 'Every .elpx content.xml must have an <odeNavStructures> section.'
            }));
        }

        // Check root child ordering
        var childElements = [];
        var childNodes = root.childNodes;
        for (var i = 0; i < childNodes.length; i++) {
            if (childNodes[i].nodeType === 1) {
                childElements.push(childNodes[i].localName || childNodes[i].tagName);
            }
        }

        var lastSeenIndex = -1;
        var knownSet = new Set(EXPECTED_ROOT_CHILDREN);
        childElements.forEach(function (name) {
            var idx = EXPECTED_ROOT_CHILDREN.indexOf(name);
            if (idx === -1) {
                if (!knownSet.has(name)) {
                    findings.push(createFinding('XML008', {
                        details: 'The element <' + name + '> is not a recognized root child of <ode>.',
                        evidence: { element: name },
                        suggestion: 'Expected children are: ' + EXPECTED_ROOT_CHILDREN.join(', ') + '.'
                    }));
                }
            } else {
                if (idx < lastSeenIndex) {
                    findings.push(createFinding('XML006', {
                        details: 'The element <' + name + '> appears after <' + EXPECTED_ROOT_CHILDREN[lastSeenIndex] + '>, but the expected order is: ' + EXPECTED_ROOT_CHILDREN.join(', ') + '.',
                        evidence: { element: name, expectedOrder: EXPECTED_ROOT_CHILDREN },
                        suggestion: 'Reorder root children to match the specification.'
                    }));
                }
                if (idx > lastSeenIndex) {
                    lastSeenIndex = idx;
                }
            }
        });

        return findings;
    }

    return {
        parseAndValidateXml: parseAndValidateXml,
        validateSchema: validateSchema,
        EXPECTED_NAMESPACE: EXPECTED_NAMESPACE,
        EXPECTED_ROOT_CHILDREN: EXPECTED_ROOT_CHILDREN
    };
});
