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
