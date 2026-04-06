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
     * Resolve a raw reference path relative to the source file that contains it,
     * then normalize to a ZIP-root-relative path using POSIX semantics.
     *
     * @param {string} rawPath       - The raw path as found in the source.
     * @param {string} [sourcePath]  - ZIP-root-relative path of the source file (e.g. "html/page1.html").
     * @returns {string} ZIP-root-relative normalized path.
     */
    function resolveReferencePath(rawPath, sourcePath) {
        var cleaned = normalizeResourcePath(rawPath);
        if (!cleaned) return cleaned;

        // If the path doesn't contain ../ or is already absolute-style, return as-is
        if (cleaned.indexOf('../') === -1 && cleaned.indexOf('./') === -1) {
            return cleaned;
        }

        // Resolve relative to the directory of the source file
        var baseDir = '';
        if (sourcePath) {
            var lastSlash = sourcePath.lastIndexOf('/');
            if (lastSlash !== -1) {
                baseDir = sourcePath.substring(0, lastSlash);
            }
        }

        // Combine base directory with relative path and normalize
        var combined = baseDir ? baseDir + '/' + cleaned : cleaned;
        return posixNormalize(combined);
    }

    /**
     * Normalize a POSIX-style path, resolving `.` and `..` segments.
     * Returns '' if the path resolves to the root.
     *
     * @param {string} path
     * @returns {string}
     */
    function posixNormalize(path) {
        var parts = path.split('/');
        var resolved = [];
        for (var i = 0; i < parts.length; i++) {
            var segment = parts[i];
            if (segment === '.' || segment === '') {
                continue;
            } else if (segment === '..') {
                if (resolved.length > 0 && resolved[resolved.length - 1] !== '..') {
                    resolved.pop();
                }
                // If we can't go further up, the segment is silently dropped
                // (it would escape the ZIP root)
            } else {
                resolved.push(segment);
            }
        }
        return resolved.join('/');
    }

    /**
     * Check whether a resolved path has escaped the ZIP root.
     * This happens when there are more `..` segments than parent directories.
     *
     * @param {string} rawPath       - The raw path before resolution.
     * @param {string} [sourcePath]  - ZIP-root-relative path of the source file.
     * @returns {boolean} True if the path escapes the ZIP root.
     */
    function escapesZipRoot(rawPath, sourcePath) {
        var cleaned = normalizeResourcePath(rawPath);
        if (!cleaned) return false;

        // Count the depth of the source directory
        var depth = 0;
        if (sourcePath) {
            var lastSlash = sourcePath.lastIndexOf('/');
            if (lastSlash !== -1) {
                var baseDir = sourcePath.substring(0, lastSlash);
                depth = baseDir.split('/').length;
            }
        }

        // Count leading ../ segments in the cleaned path
        var parts = cleaned.split('/');
        var upCount = 0;
        for (var i = 0; i < parts.length; i++) {
            if (parts[i] === '..') {
                upCount++;
            } else {
                break;
            }
        }

        return upCount > depth;
    }

    /**
     * Extract all resource references from the project model.
     *
     * @param {object} model     - The project model.
     * @param {object} [htmlContents] - Map of filename → HTML string for exported pages.
     * @param {object} [cssContents]  - Map of filename → CSS string for stylesheets.
     * @returns {{ references: object[], referencesByPath: object }}
     */
    function extractReferences(model, htmlContents, cssContents) {
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

                        // Extract from htmlView (content.xml lives at root)
                        if (comp.htmlView) {
                            extractPathsFromString(comp.htmlView, 'htmlView', source, references, referencesByPath, null);
                        }

                        // Extract from jsonProperties
                        if (comp.jsonProperties) {
                            try {
                                var json = JSON.parse(comp.jsonProperties);
                                extractPathsFromJson(json, 'jsonProperties', source, references, referencesByPath, null);
                            } catch (e) {
                                // Fallback to regex
                                extractPathsFromString(comp.jsonProperties, 'jsonProperties', source, references, referencesByPath, null);
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
                extractPathsFromString(html, 'exportedHtml', source, references, referencesByPath, htmlFile);
            });
        }

        // Extract from CSS files
        if (cssContents) {
            Object.keys(cssContents).forEach(function (cssFile) {
                var css = cssContents[cssFile];
                var source = { cssFile: cssFile };
                extractPathsFromCss(css, source, references, referencesByPath, cssFile);
            });
        }

        return { references: references, referencesByPath: referencesByPath };
    }

    var ATTR_REGEX = /(?:src|href|data-src|poster|content|url)\s*=\s*["']([^"']+)["']/gi;
    var URL_REGEX = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
    var RESOURCE_MATCH = /(content|custom|theme|libs|idevices)\//i;

    function extractPathsFromString(text, sourceType, source, references, referencesByPath, sourcePath) {
        var regexes = [ATTR_REGEX, URL_REGEX];
        regexes.forEach(function (regex) {
            regex.lastIndex = 0;
            var match;
            while ((match = regex.exec(text)) !== null) {
                var raw = match[1];
                if (!RESOURCE_MATCH.test(raw)) continue;
                addReference(raw, sourceType, source, references, referencesByPath, sourcePath);
            }
        });
    }

    /**
     * Check if a string looks like an isolated asset path (not HTML, not prose).
     */
    function looksLikeAssetPath(value) {
        // Reject if it looks like HTML
        if (/<[^>]+>/.test(value)) return false;
        // Reject if it contains newlines (multi-line text)
        if (/\n/.test(value)) return false;
        // Accept if it starts with a known asset prefix or relative path
        if (/^(content\/|custom\/|theme\/|libs\/|idevices\/|\.\.\/|\.\/|\{\{context_path\}\})/.test(value)) return true;
        // Accept if it looks like a filename with a known extension
        if (/\.(jpg|jpeg|png|gif|svg|webp|bmp|ico|mp3|ogg|wav|mp4|webm|ogv|pdf|json|xml|html|htm|css|js|woff|woff2|ttf|eot|zip|txt|map)(\?[^"']*)?$/i.test(value)) return true;
        return false;
    }

    function extractPathsFromJson(value, sourceType, source, references, referencesByPath, sourcePath) {
        if (!value) return;
        if (typeof value === 'string') {
            // If the string looks like HTML, extract paths from HTML attributes
            if (/<[^>]+(?:src|href|poster|data-src)=/.test(value)) {
                extractPathsFromString(value, sourceType, source, references, referencesByPath, sourcePath);
                return;
            }
            // If it contains url(...) CSS patterns, extract them
            if (URL_REGEX.test(value)) {
                URL_REGEX.lastIndex = 0;
                var urlMatch;
                while ((urlMatch = URL_REGEX.exec(value)) !== null) {
                    var urlRaw = urlMatch[1];
                    if (RESOURCE_MATCH.test(urlRaw)) {
                        addReference(urlRaw, sourceType, source, references, referencesByPath, sourcePath);
                    }
                }
                return;
            }
            // Only treat as path if it looks like an isolated asset path
            if (RESOURCE_MATCH.test(value) && looksLikeAssetPath(value)) {
                addReference(value, sourceType, source, references, referencesByPath, sourcePath);
            }
            return;
        }
        if (Array.isArray(value)) {
            value.forEach(function (item) { extractPathsFromJson(item, sourceType, source, references, referencesByPath, sourcePath); });
            return;
        }
        if (typeof value === 'object') {
            Object.values(value).forEach(function (item) { extractPathsFromJson(item, sourceType, source, references, referencesByPath, sourcePath); });
        }
    }

    /**
     * Extract url(...) references from CSS content.
     * CSS url() paths are always relative to the CSS file's directory,
     * so we resolve them accordingly even when they don't contain ../
     */
    function extractPathsFromCss(css, source, references, referencesByPath, sourcePath) {
        URL_REGEX.lastIndex = 0;
        var match;
        while ((match = URL_REGEX.exec(css)) !== null) {
            var raw = match[1];
            // Skip data URIs and absolute URLs
            if (/^(data:|https?:|\/\/)/.test(raw)) continue;

            // Resolve the path relative to the CSS file's directory
            var cleaned = normalizeResourcePath(raw);
            if (!cleaned) continue;

            var baseDir = '';
            if (sourcePath) {
                var lastSlash = sourcePath.lastIndexOf('/');
                if (lastSlash !== -1) {
                    baseDir = sourcePath.substring(0, lastSlash);
                }
            }
            var resolved = baseDir ? posixNormalize(baseDir + '/' + cleaned) : cleaned;
            if (!resolved) continue;

            var ref = {
                rawPath: raw,
                normalizedPath: resolved,
                sourceType: 'css',
                source: source,
                sourcePath: sourcePath || null
            };
            references.push(ref);

            if (!referencesByPath[resolved]) {
                referencesByPath[resolved] = [];
            }
            referencesByPath[resolved].push(ref);
        }
    }

    function addReference(rawPath, sourceType, source, references, referencesByPath, sourcePath) {
        var normalized = resolveReferencePath(rawPath, sourcePath);
        if (!normalized) return;

        var ref = {
            rawPath: rawPath,
            normalizedPath: normalized,
            sourceType: sourceType,
            source: source,
            sourcePath: sourcePath || null
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
                        referencedFrom: refs.map(function (r) { return r.sourceType + ': ' + (r.source.ideviceId || r.source.htmlFile || r.source.cssFile || 'unknown'); })
                    },
                    suggestion: 'Ensure the asset exists in the package or update the reference.'
                }));
            }

            // Check for path traversal in references.
            // Only flag if the raw path actually escapes the ZIP root
            // after resolving relative to its source file.
            var hasTraversal = false;
            refs.forEach(function (r) {
                if (/\.\.[\\/]/.test(r.rawPath) && escapesZipRoot(r.rawPath, r.sourcePath)) {
                    hasTraversal = true;
                }
            });
            if (hasTraversal) {
                findings.push(createFinding('ASSET004', {
                    details: 'Path traversal detected in asset reference "' + refPath + '" — the resolved path escapes the package root.',
                    evidence: { path: refPath },
                    suggestion: 'Asset references should not escape the package root directory.'
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

        // File extensions/paths to skip when checking for orphaned assets
        var ORPHAN_IGNORE_EXTENSIONS = new Set(['.map']);
        var ORPHAN_IGNORE_PATTERNS = [
            /^theme\/icons\//i,                // Theme icon sets
            /^idevices\/[^/]+\/[^/]+\.html$/i  // iDevice HTML templates
        ];

        // Find orphaned assets (in asset dirs but never referenced)
        assets.forEach(function (asset) {
            if (!asset.referenced && asset.isAssetDir) {
                // Skip non-content files (DTDs, manifests, HTML pages, etc.)
                var isContentFile = /^(content\.xml|content\.dtd|contentv3\.xml|index\.html)$/i.test(asset.path);
                var isHtmlPage = /^html\//i.test(asset.path);
                if (!isContentFile && !isHtmlPage) {
                    // Skip source maps and other non-essential files by default
                    var ext = getExtension(asset.path);
                    if (ORPHAN_IGNORE_EXTENSIONS.has(ext)) return;

                    // Skip known structural patterns that are rarely directly referenced
                    var isIgnoredPattern = ORPHAN_IGNORE_PATTERNS.some(function (pattern) {
                        return pattern.test(asset.path);
                    });
                    if (isIgnoredPattern) return;

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
        resolveReferencePath: resolveReferencePath,
        looksLikeAssetPath: looksLikeAssetPath,
        extractPathsFromCss: extractPathsFromCss,
        inferMime: inferMime,
        previewType: previewType,
        getExtension: getExtension,
        MIME_MAP: MIME_MAP
    };
});
