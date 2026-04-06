/**
 * Rule catalog and finding factory for the ELPX validator.
 *
 * Every validation finding carries a stable rule code, severity,
 * category, and contextual information so the UI can present
 * actionable diagnostics.
 */
(function (global, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        global.ELPXRules = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /* ------------------------------------------------------------------ */
    /*  Constants                                                         */
    /* ------------------------------------------------------------------ */

    var SEVERITY = Object.freeze({
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    });

    var CATEGORY = Object.freeze({
        PACKAGE: 'package',
        XML: 'xml',
        NAVIGATION: 'navigation',
        METADATA: 'metadata',
        IDEVICE: 'idevice',
        ASSET: 'asset',
        COMPATIBILITY: 'compatibility'
    });

    /* ------------------------------------------------------------------ */
    /*  Rule definitions                                                  */
    /* ------------------------------------------------------------------ */

    var RULES = Object.freeze({
        /* Package -------------------------------------------------------- */
        PKG001: { code: 'PKG001', severity: SEVERITY.ERROR,   category: CATEGORY.PACKAGE, message: 'Invalid ZIP archive' },
        PKG002: { code: 'PKG002', severity: SEVERITY.ERROR,   category: CATEGORY.PACKAGE, message: 'Missing content.xml manifest' },
        PKG003: { code: 'PKG003', severity: SEVERITY.WARNING, category: CATEGORY.PACKAGE, message: 'Missing content.dtd' },
        PKG004: { code: 'PKG004', severity: SEVERITY.WARNING, category: CATEGORY.PACKAGE, message: 'Missing index.html' },
        PKG005: { code: 'PKG005', severity: SEVERITY.INFO,    category: CATEGORY.PACKAGE, message: 'Missing html/ directory' },
        PKG006: { code: 'PKG006', severity: SEVERITY.INFO,    category: CATEGORY.PACKAGE, message: 'Missing content/resources/ directory' },
        PKG007: { code: 'PKG007', severity: SEVERITY.INFO,    category: CATEGORY.PACKAGE, message: 'Missing theme/ directory' },
        PKG008: { code: 'PKG008', severity: SEVERITY.INFO,    category: CATEGORY.PACKAGE, message: 'Missing libs/ directory' },
        PKG009: { code: 'PKG009', severity: SEVERITY.INFO,    category: CATEGORY.PACKAGE, message: 'Missing idevices/ directory' },
        PKG010: { code: 'PKG010', severity: SEVERITY.ERROR,   category: CATEGORY.PACKAGE, message: 'Path traversal detected' },
        PKG011: { code: 'PKG011', severity: SEVERITY.WARNING, category: CATEGORY.PACKAGE, message: 'Absolute path in archive' },
        PKG012: { code: 'PKG012', severity: SEVERITY.WARNING, category: CATEGORY.PACKAGE, message: 'Suspicious filename' },
        PKG013: { code: 'PKG013', severity: SEVERITY.WARNING, category: CATEGORY.PACKAGE, message: 'Duplicate normalized paths' },
        PKG014: { code: 'PKG014', severity: SEVERITY.INFO,    category: CATEGORY.PACKAGE, message: 'Legacy contentv3.xml detected' },

        /* XML / schema --------------------------------------------------- */
        XML001: { code: 'XML001', severity: SEVERITY.ERROR,   category: CATEGORY.XML, message: 'XML is not well-formed' },
        XML002: { code: 'XML002', severity: SEVERITY.ERROR,   category: CATEGORY.XML, message: 'Root element is not <ode>' },
        XML003: { code: 'XML003', severity: SEVERITY.WARNING, category: CATEGORY.XML, message: 'Incorrect or missing namespace' },
        XML004: { code: 'XML004', severity: SEVERITY.INFO,    category: CATEGORY.XML, message: 'Missing version attribute on <ode>' },
        XML005: { code: 'XML005', severity: SEVERITY.INFO,    category: CATEGORY.XML, message: 'Missing DOCTYPE declaration' },
        XML006: { code: 'XML006', severity: SEVERITY.WARNING, category: CATEGORY.XML, message: 'Unexpected root child ordering' },
        XML007: { code: 'XML007', severity: SEVERITY.ERROR,   category: CATEGORY.XML, message: 'Missing <odeNavStructures>' },
        XML008: { code: 'XML008', severity: SEVERITY.WARNING, category: CATEGORY.XML, message: 'Unknown root child element' },

        /* Navigation / structure ----------------------------------------- */
        NAV001: { code: 'NAV001', severity: SEVERITY.WARNING, category: CATEGORY.NAVIGATION, message: 'No pages found' },
        NAV002: { code: 'NAV002', severity: SEVERITY.ERROR,   category: CATEGORY.NAVIGATION, message: 'Missing page ID' },
        NAV003: { code: 'NAV003', severity: SEVERITY.ERROR,   category: CATEGORY.NAVIGATION, message: 'Missing page name' },
        NAV004: { code: 'NAV004', severity: SEVERITY.WARNING, category: CATEGORY.NAVIGATION, message: 'Missing page order' },
        NAV005: { code: 'NAV005', severity: SEVERITY.ERROR,   category: CATEGORY.NAVIGATION, message: 'Duplicate page ID' },
        NAV006: { code: 'NAV006', severity: SEVERITY.ERROR,   category: CATEGORY.NAVIGATION, message: 'Dangling parent page reference' },
        NAV007: { code: 'NAV007', severity: SEVERITY.ERROR,   category: CATEGORY.NAVIGATION, message: 'Page hierarchy cycle detected' },
        NAV008: { code: 'NAV008', severity: SEVERITY.WARNING, category: CATEGORY.NAVIGATION, message: 'Inconsistent sibling order' },
        NAV009: { code: 'NAV009', severity: SEVERITY.ERROR,   category: CATEGORY.NAVIGATION, message: 'Missing block ID' },
        NAV010: { code: 'NAV010', severity: SEVERITY.ERROR,   category: CATEGORY.NAVIGATION, message: 'Duplicate block ID' },
        NAV011: { code: 'NAV011', severity: SEVERITY.WARNING, category: CATEGORY.NAVIGATION, message: 'Missing block name' },
        NAV012: { code: 'NAV012', severity: SEVERITY.ERROR,   category: CATEGORY.NAVIGATION, message: 'Component page ID mismatch' },
        NAV013: { code: 'NAV013', severity: SEVERITY.ERROR,   category: CATEGORY.NAVIGATION, message: 'Component block ID mismatch' },
        NAV014: { code: 'NAV014', severity: SEVERITY.ERROR,   category: CATEGORY.NAVIGATION, message: 'Missing component iDevice ID' },
        NAV015: { code: 'NAV015', severity: SEVERITY.ERROR,   category: CATEGORY.NAVIGATION, message: 'Duplicate iDevice ID' },
        NAV016: { code: 'NAV016', severity: SEVERITY.ERROR,   category: CATEGORY.NAVIGATION, message: 'Missing iDevice type name' },
        NAV017: { code: 'NAV017', severity: SEVERITY.WARNING, category: CATEGORY.NAVIGATION, message: 'Missing htmlView' },
        NAV018: { code: 'NAV018', severity: SEVERITY.WARNING, category: CATEGORY.NAVIGATION, message: 'Missing jsonProperties' },
        NAV019: { code: 'NAV019', severity: SEVERITY.WARNING, category: CATEGORY.NAVIGATION, message: 'Non-numeric order value' },
        NAV020: { code: 'NAV020', severity: SEVERITY.WARNING, category: CATEGORY.NAVIGATION, message: 'Missing component order' },
        NAV021: { code: 'NAV021', severity: SEVERITY.ERROR,   category: CATEGORY.NAVIGATION, message: 'Component references non-existent page' },
        NAV022: { code: 'NAV022', severity: SEVERITY.ERROR,   category: CATEGORY.NAVIGATION, message: 'Component references non-existent block' },

        /* Metadata ------------------------------------------------------- */
        META001: { code: 'META001', severity: SEVERITY.WARNING, category: CATEGORY.METADATA, message: 'Missing odeId' },
        META002: { code: 'META002', severity: SEVERITY.WARNING, category: CATEGORY.METADATA, message: 'Missing odeVersionId' },
        META003: { code: 'META003', severity: SEVERITY.INFO,    category: CATEGORY.METADATA, message: 'Missing eXeVersion' },
        META004: { code: 'META004', severity: SEVERITY.WARNING, category: CATEGORY.METADATA, message: 'Invalid odeId format' },
        META005: { code: 'META005', severity: SEVERITY.WARNING, category: CATEGORY.METADATA, message: 'Invalid odeVersionId format' },
        META006: { code: 'META006', severity: SEVERITY.INFO,    category: CATEGORY.METADATA, message: 'Missing project title' },

        /* iDevice -------------------------------------------------------- */
        IDEV001: { code: 'IDEV001', severity: SEVERITY.INFO,    category: CATEGORY.IDEVICE, message: 'Unknown iDevice type' },
        IDEV002: { code: 'IDEV002', severity: SEVERITY.WARNING, category: CATEGORY.IDEVICE, message: 'jsonProperties not parseable' },
        IDEV003: { code: 'IDEV003', severity: SEVERITY.INFO,    category: CATEGORY.IDEVICE, message: 'Empty htmlView' },
        IDEV004: { code: 'IDEV004', severity: SEVERITY.WARNING, category: CATEGORY.IDEVICE, message: 'Image iDevice missing image references' },
        IDEV005: { code: 'IDEV005', severity: SEVERITY.WARNING, category: CATEGORY.IDEVICE, message: 'External website missing URL' },
        IDEV006: { code: 'IDEV006', severity: SEVERITY.WARNING, category: CATEGORY.IDEVICE, message: 'Download iDevice inconsistency' },

        /* Asset ---------------------------------------------------------- */
        ASSET001: { code: 'ASSET001', severity: SEVERITY.WARNING, category: CATEGORY.ASSET, message: 'Referenced asset missing from package' },
        ASSET002: { code: 'ASSET002', severity: SEVERITY.INFO,    category: CATEGORY.ASSET, message: 'Orphaned asset' },
        ASSET003: { code: 'ASSET003', severity: SEVERITY.WARNING, category: CATEGORY.ASSET, message: 'Reference outside allowed asset paths' },
        ASSET004: { code: 'ASSET004', severity: SEVERITY.ERROR,   category: CATEGORY.ASSET, message: 'Path traversal in asset reference' },
        ASSET005: { code: 'ASSET005', severity: SEVERITY.WARNING, category: CATEGORY.ASSET, message: 'Casing mismatch in asset reference' },

        /* Compatibility -------------------------------------------------- */
        COMPAT001: { code: 'COMPAT001', severity: SEVERITY.INFO, category: CATEGORY.COMPATIBILITY, message: 'Legacy .elp package detected' },
        COMPAT002: { code: 'COMPAT002', severity: SEVERITY.INFO, category: CATEGORY.COMPATIBILITY, message: 'Modern .elpx package detected' }
    });

    /* ------------------------------------------------------------------ */
    /*  Finding factory                                                   */
    /* ------------------------------------------------------------------ */

    /**
     * Create a structured validation finding.
     *
     * @param {string} ruleCode   - One of the keys from RULES (e.g. 'PKG001').
     * @param {object} [options]  - Extra context for this finding.
     * @param {string} [options.details]    - Human-readable explanation.
     * @param {object} [options.location]   - Where the issue was found.
     * @param {object} [options.evidence]   - Raw data supporting the finding.
     * @param {string} [options.suggestion] - Repair / mitigation advice.
     * @returns {object} A frozen finding object.
     */
    function createFinding(ruleCode, options) {
        var rule = RULES[ruleCode];
        if (!rule) {
            throw new Error('Unknown rule code: ' + ruleCode);
        }
        var opts = options || {};
        return Object.freeze({
            code: rule.code,
            severity: rule.severity,
            category: rule.category,
            message: rule.message,
            details: opts.details || '',
            location: opts.location || {},
            evidence: opts.evidence || {},
            suggestion: opts.suggestion || ''
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Public API                                                        */
    /* ------------------------------------------------------------------ */

    return {
        SEVERITY: SEVERITY,
        CATEGORY: CATEGORY,
        RULES: RULES,
        createFinding: createFinding
    };
});
