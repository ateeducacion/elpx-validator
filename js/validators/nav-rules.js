/**
 * Navigation, ID, and reference validation rules.
 *
 * Validates page/block/component IDs, uniqueness, cross-references,
 * hierarchy cycles, order fields, and containment consistency.
 */
(function (global, factory) {
    if (typeof module === 'object' && module.exports) {
        var rules = require('../core/rules');
        module.exports = factory(rules);
    } else {
        global.ELPXNavRules = factory(global.ELPXRules);
    }
})(typeof self !== 'undefined' ? self : this, function (rules) {
    'use strict';

    var createFinding = rules.createFinding;

    /**
     * ODE ID format: 14-digit timestamp + 6 uppercase alphanumeric characters.
     * Example: 20251125215855LURLBW
     */
    var ODE_ID_PATTERN = /^\d{14}[A-Z0-9]{6}$/;

    /**
     * Validate the full project model for navigation, ID, and reference issues.
     *
     * @param {object} model - The normalized project model from ELPXModel.buildModel().
     * @returns {object[]} Array of findings.
     */
    function validateNavigation(model) {
        var findings = [];

        if (!model || !model.pages) {
            return findings;
        }

        // No pages at all
        if (model.pages.length === 0) {
            findings.push(createFinding('NAV001', {
                details: 'No pages were found in the project. The project appears empty.',
                suggestion: 'Add at least one page in eXeLearning before exporting.'
            }));
            return findings;
        }

        var pageIdMap = {};  // pageId -> page object
        var blockIdMap = {}; // blockId -> block object
        var ideviceIdMap = {}; // ideviceId -> component object

        /* ---------------------------------------------------------------- */
        /*  Pass 1: Collect IDs and check for duplicates / missing          */
        /* ---------------------------------------------------------------- */

        model.pages.forEach(function (page, pageIndex) {
            var pageLabel = 'Page #' + (pageIndex + 1);

            // Page ID
            if (!page.odePageId) {
                findings.push(createFinding('NAV002', {
                    details: pageLabel + ' is missing an odePageId.',
                    location: { pageIndex: pageIndex },
                    suggestion: 'Every page must have a unique odePageId.'
                }));
            } else {
                if (pageIdMap[page.odePageId]) {
                    findings.push(createFinding('NAV005', {
                        details: 'Duplicate page ID "' + page.odePageId + '" found at pages #' + (pageIdMap[page.odePageId].index + 1) + ' and #' + (pageIndex + 1) + '.',
                        location: { pageId: page.odePageId, pageIndex: pageIndex },
                        evidence: { duplicateId: page.odePageId },
                        suggestion: 'Page IDs must be unique within the project.'
                    }));
                } else {
                    pageIdMap[page.odePageId] = { page: page, index: pageIndex };
                }
            }

            // Page name
            if (!page.pageName) {
                findings.push(createFinding('NAV003', {
                    details: pageLabel + ' (ID: ' + (page.odePageId || '?') + ') is missing a pageName.',
                    location: { pageId: page.odePageId, pageIndex: pageIndex }
                }));
            }

            // Page order
            if (!page.order && page.order !== '0') {
                findings.push(createFinding('NAV004', {
                    details: pageLabel + ' is missing an order value.',
                    location: { pageId: page.odePageId, pageIndex: pageIndex }
                }));
            } else if (isNaN(Number(page.order))) {
                findings.push(createFinding('NAV019', {
                    details: pageLabel + ' has non-numeric order value "' + page.order + '".',
                    location: { pageId: page.odePageId, pageIndex: pageIndex },
                    evidence: { orderValue: page.order }
                }));
            }

            // Blocks within page
            page.blocks.forEach(function (block, blockIndex) {
                var blockLabel = 'Block #' + (blockIndex + 1) + ' in ' + pageLabel;

                // Block ID
                if (!block.odeBlockId) {
                    findings.push(createFinding('NAV009', {
                        details: blockLabel + ' is missing an odeBlockId.',
                        location: { pageId: page.odePageId, blockIndex: blockIndex }
                    }));
                } else {
                    if (blockIdMap[block.odeBlockId]) {
                        findings.push(createFinding('NAV010', {
                            details: 'Duplicate block ID "' + block.odeBlockId + '".',
                            location: { pageId: page.odePageId, blockId: block.odeBlockId },
                            evidence: { duplicateId: block.odeBlockId }
                        }));
                    } else {
                        blockIdMap[block.odeBlockId] = { block: block, pageId: page.odePageId };
                    }
                }

                // Block name — only warn if the block has multiple components
                // and lacks any descriptive properties. Single-component anonymous
                // blocks are common in modern .elpx exports.
                if (!block.blockName && block.components.length > 1) {
                    findings.push(createFinding('NAV011', {
                        details: blockLabel + ' is missing a blockName and contains ' + block.components.length + ' components.',
                        location: { pageId: page.odePageId, blockId: block.odeBlockId }
                    }));
                }

                // Components within block
                block.components.forEach(function (comp, compIndex) {
                    var compLabel = 'Component #' + (compIndex + 1) + ' in ' + blockLabel;
                    validateComponent(findings, comp, compLabel, page, block, ideviceIdMap);
                });
            });
        });

        /* ---------------------------------------------------------------- */
        /*  Pass 2: Cross-reference validation                              */
        /* ---------------------------------------------------------------- */

        // Validate parent page references
        model.pages.forEach(function (page, pageIndex) {
            if (page.odeParentPageId && page.odeParentPageId.trim() !== '') {
                if (!pageIdMap[page.odeParentPageId]) {
                    findings.push(createFinding('NAV006', {
                        details: 'Page "' + (page.pageName || page.odePageId) + '" references parent page ID "' + page.odeParentPageId + '" which does not exist.',
                        location: { pageId: page.odePageId, parentPageId: page.odeParentPageId },
                        evidence: { danglingRef: page.odeParentPageId },
                        suggestion: 'Check that the parent page exists or clear the odeParentPageId.'
                    }));
                }
            }
        });

        // Detect cycles in the page hierarchy
        var cycleFindings = detectPageCycles(model.pages, pageIdMap);
        findings = findings.concat(cycleFindings);

        // Validate sibling ordering consistency
        var siblingOrderFindings = validateSiblingOrdering(model.pages, pageIdMap);
        findings = findings.concat(siblingOrderFindings);

        // Validate component cross-references to pages/blocks
        model.pages.forEach(function (page) {
            page.blocks.forEach(function (block) {
                block.components.forEach(function (comp) {
                    // Component references a page that doesn't exist
                    if (comp.odePageId && !pageIdMap[comp.odePageId]) {
                        findings.push(createFinding('NAV021', {
                            details: 'Component "' + comp.odeIdeviceId + '" references page ID "' + comp.odePageId + '" which does not exist.',
                            location: { pageId: comp.odePageId, blockId: comp.odeBlockId, ideviceId: comp.odeIdeviceId },
                            evidence: { referencedPageId: comp.odePageId }
                        }));
                    }
                    // Component references a block that doesn't exist
                    if (comp.odeBlockId && !blockIdMap[comp.odeBlockId]) {
                        findings.push(createFinding('NAV022', {
                            details: 'Component "' + comp.odeIdeviceId + '" references block ID "' + comp.odeBlockId + '" which does not exist.',
                            location: { pageId: comp.odePageId, blockId: comp.odeBlockId, ideviceId: comp.odeIdeviceId },
                            evidence: { referencedBlockId: comp.odeBlockId }
                        }));
                    }
                });
            });
        });

        return findings;
    }

    /**
     * Validate a single component/iDevice.
     */
    function validateComponent(findings, comp, compLabel, page, block, ideviceIdMap) {
        // iDevice ID
        if (!comp.odeIdeviceId) {
            findings.push(createFinding('NAV014', {
                details: compLabel + ' is missing an odeIdeviceId.',
                location: { pageId: page.odePageId, blockId: block.odeBlockId }
            }));
        } else {
            if (ideviceIdMap[comp.odeIdeviceId]) {
                findings.push(createFinding('NAV015', {
                    details: 'Duplicate iDevice ID "' + comp.odeIdeviceId + '".',
                    location: { pageId: page.odePageId, blockId: block.odeBlockId, ideviceId: comp.odeIdeviceId },
                    evidence: { duplicateId: comp.odeIdeviceId }
                }));
            } else {
                ideviceIdMap[comp.odeIdeviceId] = { comp: comp, pageId: page.odePageId, blockId: block.odeBlockId };
            }
        }

        // iDevice type name
        if (!comp.odeIdeviceTypeName) {
            findings.push(createFinding('NAV016', {
                details: compLabel + ' is missing an odeIdeviceTypeName.',
                location: { pageId: page.odePageId, blockId: block.odeBlockId, ideviceId: comp.odeIdeviceId }
            }));
        }

        // htmlView and jsonProperties — conditional by iDevice type.
        // Not all types need both; validate based on type requirements.
        var typeName = (comp.odeIdeviceTypeName || '').toLowerCase().trim();

        // Types that need jsonProperties but not necessarily htmlView
        var jsonOnlyTypes = { 'form': true };
        // Types that need htmlView but not necessarily jsonProperties
        var htmlOnlyTypes = { 'rubric': true, 'download-source-file': true };

        var needsHtmlView = !jsonOnlyTypes[typeName];
        var needsJsonProps = !htmlOnlyTypes[typeName];

        if (needsHtmlView && needsJsonProps) {
            // Generic: at least one of htmlView/jsonProperties should be present
            if (!comp.htmlView && !comp.jsonProperties) {
                findings.push(createFinding('NAV017', {
                    details: compLabel + ' has an empty htmlView and empty jsonProperties. At least one should have content.',
                    location: { pageId: page.odePageId, blockId: block.odeBlockId, ideviceId: comp.odeIdeviceId }
                }));
            }
        } else if (needsHtmlView && !comp.htmlView) {
            findings.push(createFinding('NAV017', {
                details: compLabel + ' (' + typeName + ') has an empty htmlView, which is expected for this type.',
                location: { pageId: page.odePageId, blockId: block.odeBlockId, ideviceId: comp.odeIdeviceId }
            }));
        } else if (needsJsonProps && !comp.jsonProperties) {
            findings.push(createFinding('NAV018', {
                details: compLabel + ' (' + typeName + ') has empty jsonProperties, which is expected for this type.',
                location: { pageId: page.odePageId, blockId: block.odeBlockId, ideviceId: comp.odeIdeviceId }
            }));
        }

        // Component order
        if (!comp.order && comp.order !== '0') {
            findings.push(createFinding('NAV020', {
                details: compLabel + ' is missing odeComponentsOrder.',
                location: { pageId: page.odePageId, blockId: block.odeBlockId, ideviceId: comp.odeIdeviceId }
            }));
        } else if (isNaN(Number(comp.order))) {
            findings.push(createFinding('NAV019', {
                details: compLabel + ' has non-numeric odeComponentsOrder value "' + comp.order + '".',
                location: { pageId: page.odePageId, blockId: block.odeBlockId, ideviceId: comp.odeIdeviceId },
                evidence: { orderValue: comp.order }
            }));
        }

        // Component page/block containment mismatch
        if (comp.odePageId && page.odePageId && comp.odePageId !== page.odePageId) {
            findings.push(createFinding('NAV012', {
                details: compLabel + ' declares odePageId "' + comp.odePageId + '" but is contained in page "' + page.odePageId + '".',
                location: { pageId: page.odePageId, blockId: block.odeBlockId, ideviceId: comp.odeIdeviceId },
                evidence: { declaredPageId: comp.odePageId, containingPageId: page.odePageId },
                suggestion: 'The component\'s odePageId should match its containing page.'
            }));
        }
        if (comp.odeBlockId && block.odeBlockId && comp.odeBlockId !== block.odeBlockId) {
            findings.push(createFinding('NAV013', {
                details: compLabel + ' declares odeBlockId "' + comp.odeBlockId + '" but is contained in block "' + block.odeBlockId + '".',
                location: { pageId: page.odePageId, blockId: block.odeBlockId, ideviceId: comp.odeIdeviceId },
                evidence: { declaredBlockId: comp.odeBlockId, containingBlockId: block.odeBlockId },
                suggestion: 'The component\'s odeBlockId should match its containing block.'
            }));
        }
    }

    /**
     * Detect cycles in the page hierarchy using parent references.
     */
    function detectPageCycles(pages, pageIdMap) {
        var findings = [];
        var visited = {};

        pages.forEach(function (page) {
            if (!page.odePageId || visited[page.odePageId]) return;

            var path = [];
            var pathSet = {};
            var currentId = page.odePageId;

            while (currentId && !visited[currentId]) {
                if (pathSet[currentId]) {
                    // Cycle detected
                    var cycleStart = path.indexOf(currentId);
                    var cycle = path.slice(cycleStart).concat([currentId]);
                    findings.push(createFinding('NAV007', {
                        details: 'A cycle was detected in the page hierarchy: ' + cycle.join(' → ') + '.',
                        evidence: { cycle: cycle },
                        suggestion: 'Fix parent page references to form a proper tree (no circular references).'
                    }));
                    break;
                }

                path.push(currentId);
                pathSet[currentId] = true;

                var pageEntry = pageIdMap[currentId];
                if (!pageEntry || !pageEntry.page.odeParentPageId || pageEntry.page.odeParentPageId.trim() === '') {
                    break;
                }
                currentId = pageEntry.page.odeParentPageId;
            }

            // Mark all in path as visited
            path.forEach(function (id) { visited[id] = true; });
        });

        return findings;
    }

    /**
     * Validate that sibling pages (same parent) have consistent ordering.
     */
    function validateSiblingOrdering(pages, pageIdMap) {
        var findings = [];
        var siblingGroups = {};

        pages.forEach(function (page) {
            var parentId = page.odeParentPageId || '__root__';
            if (!siblingGroups[parentId]) {
                siblingGroups[parentId] = [];
            }
            siblingGroups[parentId].push(page);
        });

        Object.keys(siblingGroups).forEach(function (parentId) {
            var siblings = siblingGroups[parentId];
            if (siblings.length < 2) return;

            var orderValues = {};
            siblings.forEach(function (page) {
                var orderNum = Number(page.order);
                if (!isNaN(orderNum)) {
                    if (orderValues[orderNum]) {
                        findings.push(createFinding('NAV008', {
                            details: 'Pages "' + (orderValues[orderNum].pageName || orderValues[orderNum].odePageId) + '" and "' + (page.pageName || page.odePageId) + '" share the same sibling order value ' + orderNum + ' under parent "' + (parentId === '__root__' ? 'root' : parentId) + '".',
                            location: { parentPageId: parentId === '__root__' ? '' : parentId },
                            evidence: { orderValue: orderNum, pages: [orderValues[orderNum].odePageId, page.odePageId] },
                            suggestion: 'Each sibling page should have a unique order value.'
                        }));
                    } else {
                        orderValues[orderNum] = page;
                    }
                }
            });
        });

        return findings;
    }

    /**
     * Validate ID format for odeId and odeVersionId.
     * Uses the documented pattern: 14-digit timestamp + 6 uppercase alphanumeric.
     *
     * @param {object} resources - The odeResources map from the model.
     * @returns {object[]} Array of findings.
     */
    function validateIdFormats(resources) {
        var findings = [];

        if (!resources) return findings;

        if (!resources.odeId) {
            findings.push(createFinding('META001', {
                details: 'The odeId resource key is missing.',
                suggestion: 'Every .elpx package should have an odeId in odeResources.'
            }));
        } else if (!ODE_ID_PATTERN.test(resources.odeId)) {
            findings.push(createFinding('META004', {
                details: 'The odeId "' + resources.odeId + '" does not match the expected format (14-digit timestamp + 6 uppercase alphanumeric characters).',
                evidence: { odeId: resources.odeId, expectedPattern: ODE_ID_PATTERN.source },
                suggestion: 'Expected format: YYYYMMDDHHmmss followed by 6 characters from [A-Z0-9].'
            }));
        }

        if (!resources.odeVersionId) {
            findings.push(createFinding('META002', {
                details: 'The odeVersionId resource key is missing.',
                suggestion: 'Every .elpx package should have an odeVersionId in odeResources.'
            }));
        } else if (!ODE_ID_PATTERN.test(resources.odeVersionId)) {
            findings.push(createFinding('META005', {
                details: 'The odeVersionId "' + resources.odeVersionId + '" does not match the expected format.',
                evidence: { odeVersionId: resources.odeVersionId, expectedPattern: ODE_ID_PATTERN.source },
                suggestion: 'Expected format: YYYYMMDDHHmmss followed by 6 characters from [A-Z0-9].'
            }));
        }

        if (!resources.eXeVersion && !resources.exe_version && !resources.pp_exelearning_version) {
            findings.push(createFinding('META003', {
                details: 'The eXeVersion resource key is missing (also checked exe_version and pp_exelearning_version).',
                suggestion: 'This key identifies which eXeLearning version created the package.'
            }));
        } else if (!resources.eXeVersion) {
            // Found under an alias name — show the detected value
            var detectedKey = resources.exe_version ? 'exe_version' : 'pp_exelearning_version';
            var detectedValue = resources.exe_version || resources.pp_exelearning_version;
            findings.push(createFinding('META003', {
                details: 'eXeVersion key not found, but detected "' + detectedKey + '" with value "' + detectedValue + '".',
                evidence: { detectedKey: detectedKey, detectedValue: detectedValue },
                suggestion: 'The package uses an alternative key name for the eXe version. This is acceptable.'
            }));
        }

        return findings;
    }

    /**
     * Validate project properties (metadata).
     *
     * @param {object} properties - The odeProperties map from the model.
     * @returns {object[]} Array of findings.
     */
    function validateMetadata(properties) {
        var findings = [];
        if (!properties) return findings;

        if (!properties.pp_title) {
            findings.push(createFinding('META006', {
                details: 'The project title (pp_title) is not set.',
                suggestion: 'Set a meaningful title in eXeLearning project properties.'
            }));
        }

        return findings;
    }

    return {
        validateNavigation: validateNavigation,
        validateIdFormats: validateIdFormats,
        validateMetadata: validateMetadata,
        detectPageCycles: detectPageCycles,
        ODE_ID_PATTERN: ODE_ID_PATTERN
    };
});
