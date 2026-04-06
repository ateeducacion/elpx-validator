/**
 * iDevice validation rules.
 *
 * Validates iDevice types against the known registry, checks
 * jsonProperties parseability, htmlView content, and type-specific
 * requirements (image references, URLs, etc.).
 */
(function (global, factory) {
    if (typeof module === 'object' && module.exports) {
        var rules = require('../core/rules');
        var registry = require('../registries/idevice-types');
        module.exports = factory(rules, registry);
    } else {
        global.ELPXIdeviceRules = factory(global.ELPXRules, global.ELPXIdeviceRegistry);
    }
})(typeof self !== 'undefined' ? self : this, function (rules, registry) {
    'use strict';

    var createFinding = rules.createFinding;

    /**
     * Validate all iDevices in the project model.
     *
     * @param {object} model  - The normalized project model.
     * @returns {{ findings: object[], ideviceSummary: object }}
     */
    function validateIdevices(model) {
        var findings = [];
        var summary = {
            total: 0,
            knownDeep: 0,
            knownShallow: 0,
            unknown: 0,
            typeCounts: {},
            parseErrors: 0
        };

        if (!model || !model.pages) {
            return { findings: findings, ideviceSummary: summary };
        }

        model.pages.forEach(function (page) {
            page.blocks.forEach(function (block) {
                block.components.forEach(function (comp) {
                    summary.total++;
                    var result = validateSingleIdevice(comp, page, block, model);
                    findings = findings.concat(result.findings);

                    // Tally
                    var typeName = (comp.odeIdeviceTypeName || 'unknown').toLowerCase();
                    summary.typeCounts[typeName] = (summary.typeCounts[typeName] || 0) + 1;

                    var lookupResult = registry.lookup(comp.odeIdeviceTypeName);
                    if (lookupResult.status === 'deep-validated') {
                        summary.knownDeep++;
                    } else if (lookupResult.status === 'shallow-validated') {
                        summary.knownShallow++;
                    } else {
                        summary.unknown++;
                    }

                    if (result.parseError) {
                        summary.parseErrors++;
                    }
                });
            });
        });

        return { findings: findings, ideviceSummary: summary };
    }

    /**
     * Validate a single iDevice/component.
     */
    function validateSingleIdevice(comp, page, block, model) {
        var findings = [];
        var parseError = false;
        var location = {
            pageId: page.odePageId,
            pageName: page.pageName,
            blockId: block.odeBlockId,
            ideviceId: comp.odeIdeviceId
        };

        // Type lookup
        var lookupResult = registry.lookup(comp.odeIdeviceTypeName);
        if (!lookupResult.known) {
            findings.push(createFinding('IDEV001', {
                details: 'The iDevice type "' + comp.odeIdeviceTypeName + '" is not in the known registry.',
                location: location,
                evidence: { odeIdeviceTypeName: comp.odeIdeviceTypeName },
                suggestion: 'This may be a custom iDevice. Verify it is intentional and not a typo.'
            }));
        }

        // jsonProperties parseability
        var parsedJson = null;
        if (comp.jsonProperties) {
            try {
                parsedJson = JSON.parse(comp.jsonProperties);
            } catch (e) {
                parseError = true;
                findings.push(createFinding('IDEV002', {
                    details: 'The jsonProperties for iDevice "' + (comp.odeIdeviceId || '?') + '" could not be parsed as JSON: ' + e.message,
                    location: location,
                    evidence: { error: e.message, preview: comp.jsonProperties.substring(0, 200) },
                    suggestion: 'Verify the jsonProperties contains valid JSON. Template variables like {{context_path}} may need resolution first.'
                }));
            }
        }

        // Empty htmlView check — skip for types that don't require htmlView
        var jsonOnlyIdeviceTypes = { 'form': true };
        var compTypeName = (comp.odeIdeviceTypeName || '').toLowerCase().trim();
        if (comp.htmlView !== undefined && comp.htmlView.trim() === '' && !jsonOnlyIdeviceTypes[compTypeName]) {
            findings.push(createFinding('IDEV003', {
                details: 'The htmlView for iDevice "' + (comp.odeIdeviceId || '?') + '" is empty.',
                location: location,
                suggestion: 'Most iDevices should have non-empty htmlView content.'
            }));
        }

        // Type-specific validation
        if (lookupResult.known && lookupResult.definition) {
            var def = lookupResult.definition;

            // Image-based iDevices should reference images
            if (def.requiresImages && comp.htmlView) {
                var hasImageRef = /(?:src|data-src)=["'][^"']*\.(jpg|jpeg|png|gif|svg|webp|bmp)/i.test(comp.htmlView);
                var jsonHasImage = comp.jsonProperties && /\.(jpg|jpeg|png|gif|svg|webp|bmp)/i.test(comp.jsonProperties);
                if (!hasImageRef && !jsonHasImage) {
                    findings.push(createFinding('IDEV004', {
                        details: 'The "' + comp.odeIdeviceTypeName + '" iDevice does not appear to reference any images.',
                        location: location,
                        evidence: { odeIdeviceTypeName: comp.odeIdeviceTypeName },
                        suggestion: 'Image-based iDevices like image-gallery and magnifier typically need image assets.'
                    }));
                }
            }

            // URL-based iDevices should contain a URL
            if (def.requiresUrl) {
                var hasUrl = false;
                if (comp.htmlView && /https?:\/\/[^\s"'<>]+/i.test(comp.htmlView)) {
                    hasUrl = true;
                }
                if (!hasUrl && comp.jsonProperties && /https?:\/\/[^\s"'<>]+/i.test(comp.jsonProperties)) {
                    hasUrl = true;
                }
                if (!hasUrl && parsedJson) {
                    hasUrl = jsonContainsUrl(parsedJson);
                }
                if (!hasUrl) {
                    findings.push(createFinding('IDEV005', {
                        details: 'The "' + comp.odeIdeviceTypeName + '" iDevice does not appear to contain a URL.',
                        location: location,
                        evidence: { odeIdeviceTypeName: comp.odeIdeviceTypeName },
                        suggestion: 'An external-website iDevice typically needs a valid URL.'
                    }));
                }
            }

            // download-source-file consistency — check functional chain
            // rather than just the isDownload flag, which may not be set in all exports.
            if (comp.odeIdeviceTypeName === 'download-source-file') {
                if (model.resources && model.resources.isDownload !== 'true') {
                    findings.push(createFinding('IDEV006', {
                        details: 'A download-source-file iDevice is present but odeResources.isDownload is not "true". This may be normal for some eXeLearning exports.',
                        location: location,
                        evidence: { isDownload: model.resources ? model.resources.isDownload : 'missing' },
                        suggestion: 'Verify the download iDevice works correctly in the exported package.'
                    }));
                }
            }
        }

        return { findings: findings, parseError: parseError };
    }

    /**
     * Recursively check if a JSON structure contains a URL.
     */
    function jsonContainsUrl(value) {
        if (!value) return false;
        if (typeof value === 'string') {
            return /https?:\/\/[^\s"'<>]+/i.test(value);
        }
        if (Array.isArray(value)) {
            return value.some(function (item) { return jsonContainsUrl(item); });
        }
        if (typeof value === 'object') {
            return Object.values(value).some(function (item) { return jsonContainsUrl(item); });
        }
        return false;
    }

    return {
        validateIdevices: validateIdevices,
        validateSingleIdevice: validateSingleIdevice
    };
});
