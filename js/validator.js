/**
 * eXeLearning Package Validator – main module.
 *
 * This module orchestrates all validation sub-modules and exposes both
 * the new structured-finding API and the original legacy helpers so
 * that existing tests and consumers continue to work.
 *
 * @module ELPValidator
 */
(function (global, factory) {
    if (typeof module === 'object' && module.exports) {
        var rulesModule      = require('./core/rules');
        var modelModule      = require('./core/model');
        var packageRules     = require('./validators/package-rules');
        var xmlRules         = require('./validators/xml-rules');
        var navRules         = require('./validators/nav-rules');
        var ideviceRules     = require('./validators/idevice-rules');
        var assetRules       = require('./validators/asset-rules');
        var ideviceRegistry  = require('./registries/idevice-types');
        module.exports = factory(rulesModule, modelModule, packageRules, xmlRules, navRules, ideviceRules, assetRules, ideviceRegistry);
    } else {
        global.ELPValidator = factory(
            global.ELPXRules,
            global.ELPXModel,
            global.ELPXPackageRules,
            global.ELPXXmlRules,
            global.ELPXNavRules,
            global.ELPXIdeviceRules,
            global.ELPXAssetRules,
            global.ELPXIdeviceRegistry
        );
    }
})(typeof self !== 'undefined' ? self : this, function (rulesModule, modelModule, packageRules, xmlRules, navRules, ideviceRules, assetRules, ideviceRegistry) {
    'use strict';

    /* ================================================================== */
    /*  New structured validation API                                     */
    /* ================================================================== */

    /**
     * Run the full validation pipeline on a loaded ZIP.
     *
     * @param {object} zip      - A JSZip instance.
     * @param {object} [opts]   - Optional settings.
     * @returns {Promise<object>} The complete validation report.
     */
    async function runFullValidation(zip, opts) {
        var options = opts || {};
        var report = {
            format: 'unknown',
            findings: [],
            model: null,
            metadata: null,
            packageInfo: null,
            ideviceSummary: null,
            assetInventory: [],
            assetSummary: null,
            pageTitles: [],
            counts: { errors: 0, warnings: 0, infos: 0 }
        };

        var zipFiles = zip.files;

        /* -------------------------------------------------------------- */
        /*  1. Package-level validation                                   */
        /* -------------------------------------------------------------- */

        var hasContentXml = !!zip.file('content.xml');
        var hasContentV3 = !!zip.file('contentv3.xml');

        if (hasContentXml) {
            report.format = 'elpx';
        } else if (hasContentV3) {
            report.format = 'elp';
        }

        var pkgResult = packageRules.validatePackage(zipFiles, report.format);
        report.findings = report.findings.concat(pkgResult.findings);
        report.packageInfo = pkgResult.packageInfo;

        /* -------------------------------------------------------------- */
        /*  2. Read and parse manifest XML                                */
        /* -------------------------------------------------------------- */

        var manifestName = report.format === 'elp' ? 'contentv3.xml' : 'content.xml';
        var manifestFile = zip.file(manifestName);

        if (!manifestFile) {
            // Already reported by package rules; add compatibility finding
            report.findings.push(rulesModule.createFinding(report.format === 'elp' ? 'COMPAT001' : 'PKG002', {
                details: 'No usable manifest file was found in the package.'
            }));
            tallyFindings(report);
            return report;
        }

        var xmlString;
        try {
            xmlString = await manifestFile.async('string');
        } catch (e) {
            report.findings.push(rulesModule.createFinding('XML001', {
                details: 'Unable to read ' + manifestName + ' from the archive: ' + e.message
            }));
            tallyFindings(report);
            return report;
        }

        var parseResult = xmlRules.parseAndValidateXml(xmlString);
        report.findings = report.findings.concat(parseResult.findings);

        if (!parseResult.document) {
            tallyFindings(report);
            return report;
        }

        var xmlDoc = parseResult.document;

        /* -------------------------------------------------------------- */
        /*  3. Legacy .elp handling                                       */
        /* -------------------------------------------------------------- */

        if (report.format === 'elp') {
            report.findings.push(rulesModule.createFinding('COMPAT001', {
                details: 'This is a legacy .elp package using contentv3.xml. Structural and semantic validation is limited.'
            }));
            report.metadata = normalizeLegacyMetadata(extractLegacyMetadata(xmlDoc));
            tallyFindings(report);
            return report;
        }

        /* -------------------------------------------------------------- */
        /*  4. XML schema validation (modern .elpx)                       */
        /* -------------------------------------------------------------- */

        report.findings.push(rulesModule.createFinding('COMPAT002', {
            details: 'Modern .elpx package detected with content.xml ODE 2.0 format.'
        }));

        var schemaFindings = xmlRules.validateSchema(xmlDoc, xmlString);
        report.findings = report.findings.concat(schemaFindings);

        /* -------------------------------------------------------------- */
        /*  5. Build project model                                        */
        /* -------------------------------------------------------------- */

        var model = modelModule.buildModel(xmlDoc);
        report.model = model;

        if (!model) {
            tallyFindings(report);
            return report;
        }

        /* -------------------------------------------------------------- */
        /*  6. Extract metadata                                           */
        /* -------------------------------------------------------------- */

        report.metadata = {
            properties: model.properties || {},
            resources: model.resources || {}
        };

        // Metadata & ID validation
        var metaFindings = navRules.validateMetadata(model.properties);
        report.findings = report.findings.concat(metaFindings);

        var idFindings = navRules.validateIdFormats(model.resources);
        report.findings = report.findings.concat(idFindings);

        /* -------------------------------------------------------------- */
        /*  7. Navigation & reference validation                          */
        /* -------------------------------------------------------------- */

        var navFindings = navRules.validateNavigation(model);
        report.findings = report.findings.concat(navFindings);

        // Extract page titles
        report.pageTitles = model.pages.map(function (p) {
            return p.pageName || p.odePageId || '(untitled)';
        });

        /* -------------------------------------------------------------- */
        /*  8. iDevice validation                                         */
        /* -------------------------------------------------------------- */

        var idevResult = ideviceRules.validateIdevices(model);
        report.findings = report.findings.concat(idevResult.findings);
        report.ideviceSummary = idevResult.ideviceSummary;

        /* -------------------------------------------------------------- */
        /*  9. Asset inventory & validation                               */
        /* -------------------------------------------------------------- */

        report.assetInventory = assetRules.buildInventory(zipFiles);

        // Optionally read exported HTML for cross-references
        var htmlContents = {};
        if (!options.skipHtmlCrossCheck) {
            var htmlFiles = Object.keys(zipFiles).filter(function (name) {
                return (name === 'index.html' || name.startsWith('html/')) && name.endsWith('.html');
            });
            for (var i = 0; i < htmlFiles.length; i++) {
                try {
                    htmlContents[htmlFiles[i]] = await zip.file(htmlFiles[i]).async('string');
                } catch (e) {
                    // Skip unreadable files
                }
            }
        }

        // Read CSS files for url(...) cross-references
        var cssContents = {};
        if (!options.skipHtmlCrossCheck) {
            var cssFiles = Object.keys(zipFiles).filter(function (name) {
                return name.endsWith('.css') && !zipFiles[name].dir;
            });
            for (var j = 0; j < cssFiles.length; j++) {
                try {
                    cssContents[cssFiles[j]] = await zip.file(cssFiles[j]).async('string');
                } catch (e) {
                    // Skip unreadable files
                }
            }
        }

        var refResult = assetRules.extractReferences(model, htmlContents, cssContents);
        var assetResult = assetRules.validateAssets(report.assetInventory, refResult.referencesByPath, zipFiles);
        report.findings = report.findings.concat(assetResult.findings);
        report.assetSummary = assetResult.assetSummary;

        /* -------------------------------------------------------------- */
        /*  10. Tally                                                     */
        /* -------------------------------------------------------------- */

        tallyFindings(report);
        return report;
    }

    function tallyFindings(report) {
        report.counts = { errors: 0, warnings: 0, infos: 0 };
        report.findings.forEach(function (f) {
            if (f.severity === 'error') report.counts.errors++;
            else if (f.severity === 'warning') report.counts.warnings++;
            else report.counts.infos++;
        });
    }

    /* ================================================================== */
    /*  Legacy API (backward-compatible)                                  */
    /* ================================================================== */

    var REQUIRED_NAV_FIELDS = [
        'odePageId',
        'pageName',
        ['odeNavStructureSyncOrder', 'odeNavStructureOrder']
    ];
    var REQUIRED_BLOCK_FIELDS = ['odeBlockId', 'blockName'];
    var REQUIRED_COMPONENT_FIELDS = ['odeIdeviceId', 'odeIdeviceTypeName', 'htmlView', 'jsonProperties'];

    function parseContentXml(xmlString) {
        if (typeof xmlString !== 'string') {
            return { status: 'error', message: 'The provided XML payload is not a string.' };
        }

        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(xmlString, 'application/xml');
        var parserError = xmlDoc.querySelector('parsererror');

        if (parserError) {
            var detail = (parserError.textContent || '').trim();
            var message = detail
                ? 'The XML document is not well-formed: ' + detail
                : 'The XML document is not well-formed.';
            return { status: 'error', message: message };
        }

        return { status: 'success', document: xmlDoc };
    }

    function checkRootElement(xmlDoc) {
        if (!xmlDoc || !xmlDoc.documentElement) {
            return { status: 'error', message: 'Unable to read the XML root element.' };
        }

        var tagName = xmlDoc.documentElement.tagName;
        if (!tagName) {
            return { status: 'error', message: 'The XML root element is missing a tag name.' };
        }

        if (tagName.toLowerCase() !== 'ode') {
            return {
                status: 'error',
                message: 'Expected the root element to be <ode>, found <' + tagName + '> instead.'
            };
        }

        return { status: 'success', message: 'The root element is <ode>.' };
    }

    function checkNavStructures(xmlDoc) {
        var navStructures = xmlDoc.getElementsByTagName('odeNavStructures');
        if (!navStructures || navStructures.length === 0) {
            return { status: 'error', message: 'The <odeNavStructures> element is missing.' };
        }

        return { status: 'success', message: 'Navigation structures found.' };
    }

    function checkPagePresence(xmlDoc) {
        var pages = xmlDoc.getElementsByTagName('odeNavStructure');
        if (!pages || pages.length === 0) {
            return {
                status: 'warning',
                message: 'No <odeNavStructure> entries were found. The project appears to be empty.'
            };
        }

        return { status: 'success', message: 'Found ' + pages.length + ' page' + (pages.length === 1 ? '' : 's') + '.' };
    }

    function extractPageTitles(xmlDoc) {
        if (!xmlDoc) {
            return [];
        }
        var navStructures = Array.from(xmlDoc.getElementsByTagName('odeNavStructure'));
        return navStructures.map(function (nav) {
            var nameNode = nav.getElementsByTagName('pageName')[0];
            var idNode = nav.getElementsByTagName('odePageId')[0];
            var title = nameNode && nameNode.textContent ? nameNode.textContent.trim() : '';
            if (title) return title;
            var fallback = idNode && idNode.textContent ? idNode.textContent.trim() : '';
            return fallback || '(untitled)';
        });
    }

    function formatRequirement(requirement) {
        return Array.isArray(requirement) ? requirement.join(' / ') : requirement;
    }

    function ensureChildTags(node, requiredTags) {
        var missing = [];
        requiredTags.forEach(function (requirement) {
            var tags = Array.isArray(requirement) ? requirement : [requirement];
            var hasAny = tags.some(function (tag) { return node.getElementsByTagName(tag)[0]; });
            if (!hasAny) {
                missing.push(formatRequirement(requirement));
            }
        });
        return missing;
    }

    function validateStructuralIntegrity(xmlDoc) {
        var issues = [];
        var navStructures = Array.from(xmlDoc.getElementsByTagName('odeNavStructure'));

        navStructures.forEach(function (navStructure, index) {
            var missingNavFields = ensureChildTags(navStructure, REQUIRED_NAV_FIELDS);
            if (missingNavFields.length > 0) {
                issues.push('Navigation structure #' + (index + 1) + ' is missing fields: ' + missingNavFields.join(', '));
            }

            var pageStructures = navStructure.getElementsByTagName('odePagStructure');
            Array.from(pageStructures).forEach(function (pageStructure, blockIndex) {
                var missingBlockFields = ensureChildTags(pageStructure, REQUIRED_BLOCK_FIELDS);
                if (missingBlockFields.length > 0) {
                    issues.push('Block #' + (blockIndex + 1) + ' in page #' + (index + 1) + ' is missing fields: ' + missingBlockFields.join(', '));
                }

                var components = pageStructure.getElementsByTagName('odeComponent');
                Array.from(components).forEach(function (component, componentIndex) {
                    var missingComponentFields = ensureChildTags(component, REQUIRED_COMPONENT_FIELDS);
                    if (missingComponentFields.length > 0) {
                        issues.push('Component #' + (componentIndex + 1) + ' in block #' + (blockIndex + 1) + ' of page #' + (index + 1) + ' is missing fields: ' + missingComponentFields.join(', '));
                    }
                });
            });
        });

        if (issues.length > 0) {
            return {
                status: 'error',
                message: issues.join(' ')
            };
        }

        return { status: 'success', message: 'The internal XML structure matches the expected layout.' };
    }

    function extractResourcePaths(xmlDoc) {
        var resourcePaths = new Set();
        var htmlNodes = Array.from(xmlDoc.getElementsByTagName('htmlView'));
        var jsonNodes = Array.from(xmlDoc.getElementsByTagName('jsonProperties'));
        var attributeRegex = /(?:src|href)=["']([^"']+)["']/gi;
        var resourceRegex = /(content|custom)\//i;

        htmlNodes.forEach(function (node) {
            var text = node.textContent || '';
            var match;
            while ((match = attributeRegex.exec(text)) !== null) {
                var value = match[1];
                if (resourceRegex.test(value)) {
                    resourcePaths.add(normalizeResourcePath(value));
                }
            }
        });

        jsonNodes.forEach(function (node) {
            var text = node.textContent || '';
            try {
                var json = JSON.parse(text);
                collectPathsFromJson(json, resourcePaths);
            } catch (error) {
                var match;
                while ((match = attributeRegex.exec(text)) !== null) {
                    var value = match[1];
                    if (resourceRegex.test(value)) {
                        resourcePaths.add(normalizeResourcePath(value));
                    }
                }
            }
        });

        return Array.from(resourcePaths);
    }

    function collectPathsFromJson(value, accumulator) {
        if (!value) {
            return;
        }

        if (typeof value === 'string') {
            if (/(content|custom)\//i.test(value)) {
                accumulator.add(normalizeResourcePath(value));
            }
            return;
        }

        if (Array.isArray(value)) {
            value.forEach(function (item) { collectPathsFromJson(item, accumulator); });
            return;
        }

        if (typeof value === 'object') {
            Object.values(value).forEach(function (item) { collectPathsFromJson(item, accumulator); });
        }
    }

    function normalizeResourcePath(path) {
        return decodeURIComponent(path.trim())
            .replace(/^\.\//, '')
            .replace(/^\//, '')
            .replace(/\\/g, '/');
    }

    function findMissingResources(paths, zip) {
        if (!paths || paths.length === 0) {
            return [];
        }

        var missing = [];
        paths.forEach(function (path) {
            var normalized = normalizeResourcePath(path);
            if (!zip.file(normalized)) {
                var encoded = encodeURI(normalized);
                if (!zip.file(encoded)) {
                    missing.push(path);
                }
            }
        });
        return missing;
    }

    function extractMetadata(xmlDoc) {
        var metadata = { properties: {}, resources: {} };

        var propertyNodes = Array.from(xmlDoc.getElementsByTagName('odeProperty'));
        propertyNodes.forEach(function (property) {
            var keyNode = property.getElementsByTagName('key')[0];
            if (!keyNode || !keyNode.textContent) {
                return;
            }
            var valueNode = property.getElementsByTagName('value')[0];
            var key = keyNode.textContent.trim();
            var value = valueNode && valueNode.textContent ? valueNode.textContent.trim() : '';
            if (key) {
                metadata.properties[key] = value;
            }
        });

        var resourceNodes = Array.from(xmlDoc.getElementsByTagName('odeResource'));
        resourceNodes.forEach(function (resource) {
            var keyNode = resource.getElementsByTagName('key')[0];
            if (!keyNode || !keyNode.textContent) {
                return;
            }
            var valueNode = resource.getElementsByTagName('value')[0];
            var key = keyNode.textContent.trim();
            var value = valueNode && valueNode.textContent ? valueNode.textContent.trim() : '';
            if (key) {
                metadata.resources[key] = value;
            }
        });

        return metadata;
    }

    function extractLegacyMetadata(xmlDoc) {
        if (!xmlDoc || !xmlDoc.documentElement) {
            return null;
        }

        var metadata = { properties: {}, resources: {} };
        var root = xmlDoc.documentElement;
        var topDictionary = findFirstChildByLocalName(root, 'dictionary');

        if (!topDictionary) {
            return metadata;
        }

        metadata.properties = extractLegacyDictionary(topDictionary);

        var version = root.getAttribute('version');
        if (version) {
            metadata.properties.legacy_manifest_version = version;
        }

        var legacyClass = root.getAttribute('class');
        if (legacyClass) {
            metadata.properties.legacy_manifest_class = legacyClass;
        }

        return metadata;
    }

    function normalizeLegacyMetadata(metadata) {
        if (!metadata) {
            return null;
        }

        var normalized = {
            properties: {},
            resources: Object.assign({}, metadata.resources || {})
        };

        var properties = Object.assign({}, metadata.properties || {});

        if (properties._title && !properties.pp_title) {
            properties.pp_title = properties._title;
        }
        if (properties._author && !properties.pp_author) {
            properties.pp_author = properties._author;
        }
        if (properties._lang && !properties.pp_lang) {
            properties.pp_lang = properties._lang;
        }
        if (properties._description && !properties.pp_description) {
            properties.pp_description = properties._description;
        }
        if (properties._newlicense && !properties.license) {
            properties.license = properties._newlicense;
        }

        normalized.properties = properties;
        return normalized;
    }

    function findFirstChildByLocalName(node, localName) {
        if (!node || !node.children) {
            return null;
        }
        return Array.from(node.children).find(function (child) { return child.localName === localName; });
    }

    function extractLegacyDictionary(dictionaryNode) {
        var result = {};
        if (!dictionaryNode || !dictionaryNode.children) {
            return result;
        }

        var children = Array.from(dictionaryNode.children);
        for (var index = 0; index < children.length; index += 1) {
            var child = children[index];
            if (!child.getAttribute) {
                continue;
            }
            var role = child.getAttribute('role');
            if (role !== 'key') {
                continue;
            }

            var key = child.getAttribute('value') || child.textContent || '';
            if (!key) {
                continue;
            }

            var valueNode = children[index + 1];
            if (valueNode) {
                result[key] = extractLegacyValue(valueNode);
                index += 1;
            }
        }

        return result;
    }

    function extractLegacyInstance(instanceNode) {
        if (!instanceNode || !instanceNode.children) {
            return {};
        }

        var dictionary = findFirstChildByLocalName(instanceNode, 'dictionary');
        return dictionary ? extractLegacyDictionary(dictionary) : {};
    }

    function extractLegacyList(listNode) {
        if (!listNode || !listNode.children) {
            return [];
        }
        return Array.from(listNode.children).map(function (child) { return extractLegacyValue(child); });
    }

    function extractLegacyValue(node) {
        if (!node) {
            return '';
        }

        var name = node.localName || node.tagName;
        switch (name) {
            case 'unicode':
            case 'string':
            case 'bool':
            case 'int':
                return node.getAttribute('value') !== null ? node.getAttribute('value') : (node.textContent || '');
            case 'list':
                return extractLegacyList(node);
            case 'dictionary':
                return extractLegacyDictionary(node);
            case 'instance':
                return extractLegacyInstance(node);
            default:
                return node.textContent || '';
        }
    }

    /* ================================================================== */
    /*  Public API                                                        */
    /* ================================================================== */

    return {
        // New structured API
        runFullValidation: runFullValidation,

        // Sub-modules (for direct access)
        rules: rulesModule,
        model: modelModule,
        packageRules: packageRules,
        xmlRules: xmlRules,
        navRules: navRules,
        ideviceRules: ideviceRules,
        assetRules: assetRules,
        ideviceRegistry: ideviceRegistry,

        // Legacy API (backward-compatible)
        parseContentXml: parseContentXml,
        checkRootElement: checkRootElement,
        checkNavStructures: checkNavStructures,
        checkPagePresence: checkPagePresence,
        validateStructuralIntegrity: validateStructuralIntegrity,
        extractResourcePaths: extractResourcePaths,
        findMissingResources: findMissingResources,
        normalizeResourcePath: normalizeResourcePath,
        extractMetadata: extractMetadata,
        extractLegacyMetadata: extractLegacyMetadata,
        normalizeLegacyMetadata: normalizeLegacyMetadata,
        extractPageTitles: extractPageTitles
    };
});
