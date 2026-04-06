/**
 * Asset inventory and validation rules.
 *
 * Inventories all assets in the ZIP, extracts references from
 * htmlView, jsonProperties, and exported HTML, and detects
 * missing, orphaned, and suspicious assets.
 */
(function (global, factory) {
    if (typeof module === 'object' && module.exports) {
        var rules = require('../core/rules');
        module.exports = factory(rules);
    } else {
        global.ELPXAssetRules = factory(global.ELPXRules);
    }
})(typeof self !== 'undefined' ? self : this, function (rules) {
    'use strict';

    var createFinding = rules.createFinding;

    /* ------------------------------------------------------------------ */
    /*  MIME type inference by extension                                   */
    /* ------------------------------------------------------------------ */

    var MIME_MAP = {
        '.jpg':  'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png':  'image/png',
        '.gif':  'image/gif',
        '.svg':  'image/svg+xml',
        '.webp': 'image/webp',
        '.bmp':  'image/bmp',
        '.ico':  'image/x-icon',
        '.mp3':  'audio/mpeg',
        '.ogg':  'audio/ogg',
        '.wav':  'audio/wav',
        '.mp4':  'video/mp4',
        '.webm': 'video/webm',
        '.ogv':  'video/ogg',
        '.pdf':  'application/pdf',
        '.json': 'application/json',
        '.xml':  'application/xml',
        '.html': 'text/html',
        '.htm':  'text/html',
        '.css':  'text/css',
        '.js':   'application/javascript',
        '.txt':  'text/plain',
        '.woff': 'font/woff',
        '.woff2':'font/woff2',
        '.ttf':  'font/ttf',
        '.eot':  'application/vnd.ms-fontobject',
        '.zip':  'application/zip'
    };

    var PREVIEWABLE_IMAGE = new Set(['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.ico']);
    var PREVIEWABLE_AUDIO = new Set(['.mp3', '.ogg', '.wav']);
    var PREVIEWABLE_VIDEO = new Set(['.mp4', '.webm', '.ogv']);
    var PREVIEWABLE_CODE  = new Set(['.html', '.htm', '.css', '.js', '.json', '.xml', '.txt', '.svg']);

    /**
     * Determine the preview type for a file extension.
     */
    function previewType(ext) {
        if (PREVIEWABLE_IMAGE.has(ext)) return 'image';
        if (PREVIEWABLE_AUDIO.has(ext)) return 'audio';
        if (PREVIEWABLE_VIDEO.has(ext)) return 'video';
        if (ext === '.pdf') return 'pdf';
        if (PREVIEWABLE_CODE.has(ext)) return 'code';
        return 'binary';
    }

    function inferMime(filename) {
        var ext = getExtension(filename);
        return MIME_MAP[ext] || 'application/octet-stream';
    }

    function getExtension(filename) {
        var dotIndex = filename.lastIndexOf('.');
        if (dotIndex === -1) return '';
        return filename.substring(dotIndex).toLowerCase();
    }

    /* ------------------------------------------------------------------ */
    /*  Asset inventory                                                   */
    /* ------------------------------------------------------------------ */

    /**
     * Build a complete asset inventory from the ZIP.
     *
     * @param {object} zipFiles - The zip.files map from JSZip.
     * @returns {object[]} Array of asset descriptors.
     */
    function buildInventory(zipFiles) {
        var assets = [];
        var fileNames = Object.keys(zipFiles);

        fileNames.forEach(function (name) {
            if (zipFiles[name].dir) return;

            var ext = getExtension(name);
            var baseName = name.split('/').pop();

            assets.push({
                path: name,
                normalizedPath: name.toLowerCase().replace(/\\/g, '/'),
                baseName: baseName,
                extension: ext,
                mimeType: inferMime(name),
                previewType: previewType(ext),
                size: null,   // Will be populated async if needed
                referenced: false,
                referencedBy: [],
                isAssetDir: isAssetPath(name)
            });
        });

        return assets;
    }

    /**
     * Check if a path is under a standard asset directory.
     */
    function isAssetPath(path) {
        return /^(content\/resources|content\/css|theme|libs|idevices)\//i.test(path);
    }

    /* ------------------------------------------------------------------ */
    /*  Reference extraction                                              */
    /* ------------------------------------------------------------------ */

    /**
     * Normalize a resource path for comparison.
     */
    function normalizeResourcePath(path) {
        return decodeURIComponent(path.trim())
            .replace(/\{\{context_path\}\}\/?/g, '')
            .replace(/^\.\//, '')
            .replace(/^\//, '')
            .replace(/\\/g, '/')
            .replace(/\?.*$/, '')   // strip query strings
            .replace(/#.*$/, '');   // strip fragments
    }

    /**
     * Extract all resource references from the project model.
     *
     * @param {object} model     - The project model.
     * @param {object} [htmlContents] - Map of filename → HTML string for exported pages.
     * @returns {{ references: object[], referencesByPath: object }}
     */
    function extractReferences(model, htmlContents) {
        var references = [];
        var referencesByPath = {};

        if (model && model.pages) {
            model.pages.forEach(function (page) {
                page.blocks.forEach(function (block) {
                    block.components.forEach(function (comp) {
                        var source = {
                            pageId: page.odePageId,
                            pageName: page.pageName,
                            blockId: block.odeBlockId,
                            ideviceId: comp.odeIdeviceId,
                            ideviceType: comp.odeIdeviceTypeName
                        };

                        // Extract from htmlView
                        if (comp.htmlView) {
                            extractPathsFromString(comp.htmlView, 'htmlView', source, references, referencesByPath);
                        }

                        // Extract from jsonProperties
                        if (comp.jsonProperties) {
                            try {
                                var json = JSON.parse(comp.jsonProperties);
                                extractPathsFromJson(json, 'jsonProperties', source, references, referencesByPath);
                            } catch (e) {
                                // Fallback to regex
                                extractPathsFromString(comp.jsonProperties, 'jsonProperties', source, references, referencesByPath);
                            }
                        }
                    });
                });
            });
        }

        // Extract from exported HTML pages
        if (htmlContents) {
            Object.keys(htmlContents).forEach(function (htmlFile) {
                var html = htmlContents[htmlFile];
                var source = { htmlFile: htmlFile };
                extractPathsFromString(html, 'exportedHtml', source, references, referencesByPath);
            });
        }

        return { references: references, referencesByPath: referencesByPath };
    }

    var ATTR_REGEX = /(?:src|href|data-src|poster|content|url)\s*=\s*["']([^"']+)["']/gi;
    var URL_REGEX = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
    var RESOURCE_MATCH = /(content|custom|theme|libs|idevices)\//i;

    function extractPathsFromString(text, sourceType, source, references, referencesByPath) {
        var regexes = [ATTR_REGEX, URL_REGEX];
        regexes.forEach(function (regex) {
            regex.lastIndex = 0;
            var match;
            while ((match = regex.exec(text)) !== null) {
                var raw = match[1];
                if (!RESOURCE_MATCH.test(raw)) continue;
                addReference(raw, sourceType, source, references, referencesByPath);
            }
        });
    }

    function extractPathsFromJson(value, sourceType, source, references, referencesByPath) {
        if (!value) return;
        if (typeof value === 'string') {
            if (RESOURCE_MATCH.test(value)) {
                addReference(value, sourceType, source, references, referencesByPath);
            }
            // Also check for paths embedded in HTML strings
            if (/<[^>]+(?:src|href)=/.test(value)) {
                extractPathsFromString(value, sourceType, source, references, referencesByPath);
            }
            return;
        }
        if (Array.isArray(value)) {
            value.forEach(function (item) { extractPathsFromJson(item, sourceType, source, references, referencesByPath); });
            return;
        }
        if (typeof value === 'object') {
            Object.values(value).forEach(function (item) { extractPathsFromJson(item, sourceType, source, references, referencesByPath); });
        }
    }

    function addReference(rawPath, sourceType, source, references, referencesByPath) {
        var normalized = normalizeResourcePath(rawPath);
        if (!normalized) return;

        var ref = {
            rawPath: rawPath,
            normalizedPath: normalized,
            sourceType: sourceType,
            source: source
        };
        references.push(ref);

        if (!referencesByPath[normalized]) {
            referencesByPath[normalized] = [];
        }
        referencesByPath[normalized].push(ref);
    }

    /* ------------------------------------------------------------------ */
    /*  Asset validation                                                  */
    /* ------------------------------------------------------------------ */

    /**
     * Cross-reference the asset inventory with extracted references.
     *
     * @param {object[]} assets         - From buildInventory().
     * @param {object}   referencesByPath - From extractReferences().
     * @param {object}   zipFiles       - The zip.files map.
     * @returns {{ findings: object[], assetSummary: object }}
     */
    function validateAssets(assets, referencesByPath, zipFiles) {
        var findings = [];
        var assetMap = {};
        var assetLowerMap = {};

        // Build lookup maps
        assets.forEach(function (asset) {
            assetMap[asset.path] = asset;
            assetLowerMap[asset.normalizedPath] = asset;
        });

        var referencedPaths = Object.keys(referencesByPath);
        var foundReferencedCount = 0;
        var missingCount = 0;
        var orphanedCount = 0;

        // Check each reference
        referencedPaths.forEach(function (refPath) {
            var refs = referencesByPath[refPath];

            // Try exact match
            var asset = assetMap[refPath];

            // Try case-insensitive match
            if (!asset) {
                var lowerPath = refPath.toLowerCase();
                asset = assetLowerMap[lowerPath];
                if (asset && asset.path !== refPath) {
                    // Casing mismatch
                    findings.push(createFinding('ASSET005', {
                        details: 'Reference "' + refPath + '" matches asset "' + asset.path + '" only with case-insensitive comparison.',
                        evidence: { reference: refPath, actualPath: asset.path },
                        suggestion: 'Use consistent casing to avoid issues on case-sensitive file systems.'
                    }));
                }
            }

            // Try encoded match
            if (!asset) {
                var encoded = encodeURI(refPath);
                asset = assetMap[encoded];
                if (!asset) {
                    asset = assetLowerMap[encoded.toLowerCase()];
                }
            }

            if (asset) {
                foundReferencedCount++;
                asset.referenced = true;
                asset.referencedBy = asset.referencedBy.concat(refs.map(function (r) { return r.source; }));
            } else {
                missingCount++;
                findings.push(createFinding('ASSET001', {
                    details: 'The referenced asset "' + refPath + '" was not found in the package.',
                    evidence: {
                        path: refPath,
                        referencedFrom: refs.map(function (r) { return r.sourceType + ': ' + (r.source.ideviceId || r.source.htmlFile || 'unknown'); })
                    },
                    suggestion: 'Ensure the asset exists in the package or update the reference.'
                }));
            }

            // Check for path traversal in references
            if (/\.\.[\\/]/.test(refPath)) {
                findings.push(createFinding('ASSET004', {
                    details: 'Path traversal detected in asset reference "' + refPath + '".',
                    evidence: { path: refPath },
                    suggestion: 'Asset references should not use ".." path segments.'
                }));
            }

            // Check for references outside allowed paths
            if (refPath && !RESOURCE_MATCH.test(refPath)) {
                findings.push(createFinding('ASSET003', {
                    details: 'Reference "' + refPath + '" points outside standard asset directories.',
                    evidence: { path: refPath },
                    suggestion: 'Assets should typically be under content/, theme/, libs/, or idevices/.'
                }));
            }
        });

        // Find orphaned assets (in asset dirs but never referenced)
        assets.forEach(function (asset) {
            if (!asset.referenced && asset.isAssetDir) {
                // Skip non-content files (DTDs, manifests, HTML pages, etc.)
                var isContentFile = /^(content\.xml|content\.dtd|contentv3\.xml|index\.html)$/i.test(asset.path);
                var isHtmlPage = /^html\//i.test(asset.path);
                if (!isContentFile && !isHtmlPage) {
                    orphanedCount++;
                    findings.push(createFinding('ASSET002', {
                        details: 'The asset "' + asset.path + '" exists in the package but is not referenced by any content.',
                        location: { path: asset.path },
                        evidence: { path: asset.path, mimeType: asset.mimeType, extension: asset.extension },
                        suggestion: 'This may be an unused asset that could be removed to reduce package size.'
                    }));
                }
            }
        });

        var summary = {
            totalAssets: assets.length,
            referencedAssets: foundReferencedCount,
            missingAssets: missingCount,
            orphanedAssets: orphanedCount,
            totalReferences: referencedPaths.length
        };

        return { findings: findings, assetSummary: summary };
    }

    return {
        buildInventory: buildInventory,
        extractReferences: extractReferences,
        validateAssets: validateAssets,
        normalizeResourcePath: normalizeResourcePath,
        inferMime: inferMime,
        previewType: previewType,
        getExtension: getExtension,
        MIME_MAP: MIME_MAP
    };
});
