/**
 * Package-level validation rules for .elpx / .elp packages.
 *
 * Validates ZIP structure: required files, recommended directories,
 * suspicious paths, duplicates, and path traversal attempts.
 */
(function (global, factory) {
    if (typeof module === 'object' && module.exports) {
        var rules = require('../core/rules');
        module.exports = factory(rules);
    } else {
        global.ELPXPackageRules = factory(global.ELPXRules);
    }
})(typeof self !== 'undefined' ? self : this, function (rules) {
    'use strict';

    var createFinding = rules.createFinding;

    /* Required files for modern .elpx */
    var REQUIRED_FILES = [
        { path: 'content.xml',  rule: 'PKG002', label: 'manifest' },
        { path: 'content.dtd',  rule: 'PKG003', label: 'DTD schema' },
        { path: 'index.html',   rule: 'PKG004', label: 'entry page' }
    ];

    /* Recommended directories */
    var RECOMMENDED_DIRS = [
        { prefix: 'html/',             rule: 'PKG005', label: 'rendered pages' },
        { prefix: 'content/resources/', rule: 'PKG006', label: 'project assets' },
        { prefix: 'theme/',            rule: 'PKG007', label: 'theme files' },
        { prefix: 'libs/',             rule: 'PKG008', label: 'library files' },
        { prefix: 'idevices/',         rule: 'PKG009', label: 'iDevice assets' }
    ];

    /* Suspicious filename patterns */
    var SUSPICIOUS_PATTERNS = [
        /^\.DS_Store$/i,
        /^Thumbs\.db$/i,
        /^desktop\.ini$/i,
        /^__MACOSX\//,
        /\.exe$/i,
        /\.bat$/i,
        /\.cmd$/i,
        /\.sh$/i,
        /\.php$/i
    ];

    /**
     * Legacy v3 per-asset UUID subfolder under content/resources/.
     *
     * eXeLearning v3 placed every uploaded asset inside its own subfolder
     * named after an ODE identifier (14 digits + 6 uppercase alphanumeric
     * characters, e.g. `20251009090601DKVACR`). v4 replaced this with a
     * flat layout where assets live directly under `content/resources/`,
     * optionally inside user-created folders preserved verbatim from the
     * file-manager UI. The legacy pattern is normalised away by the
     * `scripts/flatten-elpx.ts` tool in the eXeLearning repository, which
     * collapses ONLY folders matching this exact pattern.
     */
    var LEGACY_UUID_FOLDER_RE = /^content\/resources\/[0-9]{14}[A-Z0-9]{6}\//;

    /* PNG magic bytes (ISO/IEC 15948) */
    var PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

    /**
     * Best-effort check that a JSZip-style entry contains a valid PNG.
     *
     * The function only inspects bytes already present on the entry — it does
     * NOT decompress on demand, so it returns `null` (= unable to determine)
     * when the entry's binary contents are not directly accessible. The
     * caller must treat `null` as "skip the magic-byte check".
     *
     * @param {object} entry - A JSZip file entry.
     * @returns {boolean|null} true = valid PNG; false = bytes present but not PNG; null = unknown.
     */
    function isPngEntryMagicValid(entry) {
        if (!entry) return null;
        var bytes = null;
        if (entry._data && entry._data.compressedContent && entry._data.uncompressedSize === entry._data.compressedContent.length) {
            bytes = entry._data.compressedContent; // STORED (no compression) — bytes are the file
        }
        if (!bytes && typeof entry.asUint8Array === 'function') {
            try { bytes = entry.asUint8Array(); } catch (_) { /* ignore */ }
        }
        if (!bytes && typeof Uint8Array !== 'undefined' && entry.uint8array instanceof Uint8Array) {
            bytes = entry.uint8array;
        }
        if (!bytes || !bytes.length || bytes.length < PNG_MAGIC.length) {
            return null;
        }
        for (var i = 0; i < PNG_MAGIC.length; i++) {
            if (bytes[i] !== PNG_MAGIC[i]) return false;
        }
        return true;
    }

    /**
     * Validate the ZIP package structure.
     *
     * @param {object} zipFiles  - Map of filenames from JSZip (zip.files).
     * @param {string} format    - 'elpx' or 'elp'.
     * @returns {{ findings: object[], packageInfo: object }}
     */
    function validatePackage(zipFiles, format) {
        var findings = [];
        var fileNames = Object.keys(zipFiles);
        var fileNameSet = new Set(fileNames);

        var packageInfo = {
            totalFiles: fileNames.length,
            totalDirs: 0,
            hasContentXml: fileNameSet.has('content.xml'),
            hasContentV3Xml: fileNameSet.has('contentv3.xml'),
            hasContentDtd: fileNameSet.has('content.dtd'),
            hasIndexHtml: fileNameSet.has('index.html'),
            hasScreenshotPng: fileNameSet.has('screenshot.png'),
            directories: {},
            format: format || 'unknown'
        };

        // Count directories vs files
        fileNames.forEach(function (name) {
            if (zipFiles[name].dir) {
                packageInfo.totalDirs++;
            }
        });

        // Detect format if not specified
        if (!format) {
            if (packageInfo.hasContentXml) {
                packageInfo.format = 'elpx';
            } else if (packageInfo.hasContentV3Xml) {
                packageInfo.format = 'elp';
            }
        }

        // Check required files (only for modern elpx)
        if (packageInfo.format === 'elpx') {
            REQUIRED_FILES.forEach(function (req) {
                if (req.path === 'content.xml' && packageInfo.hasContentXml) return;
                if (req.path !== 'content.xml' && !fileNameSet.has(req.path)) {
                    findings.push(createFinding(req.rule, {
                        details: 'The file "' + req.path + '" (' + req.label + ') was not found in the package.',
                        suggestion: 'This file is expected in a standard .elpx package. Re-export from eXeLearning if possible.'
                    }));
                }
            });
        }

        // Check recommended directories
        RECOMMENDED_DIRS.forEach(function (dir) {
            var hasDir = fileNames.some(function (name) {
                return name.startsWith(dir.prefix) || name === dir.prefix.slice(0, -1);
            });
            packageInfo.directories[dir.prefix] = hasDir;
            if (!hasDir && packageInfo.format === 'elpx') {
                findings.push(createFinding(dir.rule, {
                    details: 'The directory "' + dir.prefix + '" (' + dir.label + ') was not found.',
                    suggestion: 'This directory is recommended for a complete .elpx package.'
                }));
            }
        });

        /*
         * v4 packages must ship a project thumbnail at the archive root
         * (`screenshot.png`, 1280×720 PNG). The importer does not require
         * it, but tooling (LMS thumbnails, file-manager previews,
         * repository indexes) does. A package without one can be patched
         * with the eXeLearning repository's `scripts/add-screenshot.ts`.
         */
        if (packageInfo.format === 'elpx' && !packageInfo.hasScreenshotPng) {
            findings.push(createFinding('PKG015', {
                details: 'The file "screenshot.png" was not found at the archive root.',
                suggestion: 'v4 packages should include a 1280×720 PNG thumbnail at the ZIP root. ' +
                    'Patch existing packages with `bun run scripts/add-screenshot.ts <file>.elpx` ' +
                    'or set a screenshot in Project Properties before exporting.'
            }));
        } else if (packageInfo.format === 'elpx' && packageInfo.hasScreenshotPng) {
            // Best-effort PNG magic-byte check
            var magic = isPngEntryMagicValid(zipFiles['screenshot.png']);
            if (magic === false) {
                findings.push(createFinding('PKG016', {
                    details: 'The file "screenshot.png" exists at the archive root but does not start with the PNG magic bytes (89 50 4E 47 0D 0A 1A 0A).',
                    location: { path: 'screenshot.png' },
                    suggestion: 'Ensure the file is a valid PNG. The exporter validates magic bytes before writing it.'
                }));
            }
        }

        /*
         * Legacy v3 per-asset UUID subfolders inside content/resources/ are
         * not a v4 feature. Flag any such entry but do NOT flag user-created
         * folders (any subfolder whose first segment is not 14 digits + 6
         * uppercase alphanumeric chars is a user folder and is valid).
         */
        var legacyFoldersSeen = {};
        fileNames.forEach(function (name) {
            var m = name.match(LEGACY_UUID_FOLDER_RE);
            if (!m) return;
            var folder = name.split('/').slice(0, 3).join('/'); // content/resources/<UUID>
            legacyFoldersSeen[folder] = true;
        });
        Object.keys(legacyFoldersSeen).forEach(function (folder) {
            findings.push(createFinding('PKG017', {
                details: 'Found legacy v3 per-asset UUID subfolder "' + folder + '/". v4 stores assets directly under content/resources/ (optionally inside user-created folders).',
                location: { path: folder + '/' },
                evidence: { folder: folder },
                suggestion: 'Run `bun run scripts/flatten-elpx.ts <file>.elpx` from the eXeLearning repository to normalise this layout. The script preserves user folders and only collapses subfolders matching the ODE-ID pattern (14 digits + 6 uppercase alphanumeric chars).'
            }));
        });

        // Check for path traversal
        fileNames.forEach(function (name) {
            if (/\.\.[\\/]/.test(name) || /[\\/]\.\.[\\/]/.test(name) || /[\\/]\.\.$/.test(name)) {
                findings.push(createFinding('PKG010', {
                    details: 'Path traversal sequence found in archive entry.',
                    location: { path: name },
                    evidence: { filename: name },
                    suggestion: 'This may indicate a malicious or corrupted archive. Do not extract to disk.'
                }));
            }
        });

        // Check for absolute paths
        fileNames.forEach(function (name) {
            if (/^[A-Za-z]:[\\/]/.test(name) || (name.startsWith('/') && name.length > 1)) {
                findings.push(createFinding('PKG011', {
                    details: 'Absolute path found in archive entry.',
                    location: { path: name },
                    evidence: { filename: name },
                    suggestion: 'Archive entries should use relative paths.'
                }));
            }
        });

        // Check for suspicious filenames
        fileNames.forEach(function (name) {
            var baseName = name.split('/').pop();
            SUSPICIOUS_PATTERNS.forEach(function (pattern) {
                if (pattern.test(baseName) || pattern.test(name)) {
                    findings.push(createFinding('PKG012', {
                        details: 'Suspicious or unexpected file found in the package.',
                        location: { path: name },
                        evidence: { filename: baseName, pattern: pattern.toString() },
                        suggestion: 'This file is typically not part of an .elpx package and may have been included accidentally.'
                    }));
                }
            });
        });

        // Check for duplicate normalized paths
        var normalizedMap = {};
        fileNames.forEach(function (name) {
            if (zipFiles[name].dir) return;
            var normalized = name.toLowerCase().replace(/\\/g, '/');
            if (!normalizedMap[normalized]) {
                normalizedMap[normalized] = [];
            }
            normalizedMap[normalized].push(name);
        });
        Object.keys(normalizedMap).forEach(function (key) {
            if (normalizedMap[key].length > 1) {
                findings.push(createFinding('PKG013', {
                    details: 'Multiple archive entries resolve to the same normalized path.',
                    evidence: { normalizedPath: key, entries: normalizedMap[key] },
                    suggestion: 'This may cause issues on case-insensitive file systems.'
                }));
            }
        });

        return { findings: findings, packageInfo: packageInfo };
    }

    return {
        validatePackage: validatePackage,
        REQUIRED_FILES: REQUIRED_FILES,
        RECOMMENDED_DIRS: RECOMMENDED_DIRS
    };
});
