/**
 * Asset preview system using in-memory URLs.
 *
 * Provides a virtual file system layer for browsing and previewing
 * assets from the ZIP package without a server.
 */
(function (global, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        global.ELPXPreview = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var previewUrls = {};

    /**
     * Create a preview URL for a ZIP file entry.
     *
     * @param {object} zipEntry - A JSZip file object.
     * @param {string} mimeType - The MIME type for the blob.
     * @returns {Promise<string>} The preview URL.
     */
    async function createPreviewUrl(zipEntry, mimeType) {
        var data = await zipEntry.async('base64');
        var url = 'data:' + (mimeType || 'application/octet-stream') + ';base64,' + data;
        previewUrls[zipEntry.name] = url;
        return url;
    }

    /**
     * Build a virtual file system map of preview URLs for all files in the ZIP.
     *
     * @param {object} zip         - A JSZip instance.
     * @param {function} mimeResolver - Function to resolve MIME type from filename.
     * @returns {Promise<object>}   Map of path → Blob URL.
     */
    async function buildVirtualFS(zip, mimeResolver) {
        revokeAll();
        var fileNames = Object.keys(zip.files).filter(function (name) {
            return !zip.files[name].dir;
        });
        var urlMap = {};

        for (var i = 0; i < fileNames.length; i++) {
            var name = fileNames[i];
            var mime = mimeResolver ? mimeResolver(name) : 'application/octet-stream';
            urlMap[name] = await createPreviewUrl(zip.file(name), mime);
        }

        return urlMap;
    }

    /**
     * Prepare an HTML string for sandboxed preview by rewriting asset
     * references to Blob URLs.
     *
     * @param {string} html     - The raw HTML content.
     * @param {object} urlMap   - Map of path → Blob URL.
     * @param {string} basePath - The base path of the HTML file in the ZIP (e.g. 'html/').
     * @returns {string} The rewritten HTML.
     */
    function rewriteHtmlForPreview(html, urlMap, basePath) {
        if (!html || !urlMap) return html;

        return html.replace(/(src|href|poster|content)=(["'])([^"']+)\2/gi, function (match, attr, quote, path) {
            var resolved = resolvePath(path, basePath);
            var blobUrl = urlMap[resolved] || urlMap[path] || null;
            if (blobUrl) {
                return attr + '=' + quote + blobUrl + quote;
            }
            return match;
        }).replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi, function (match, path) {
            var resolved = resolvePath(path, basePath);
            var blobUrl = urlMap[resolved] || urlMap[path] || null;
            if (blobUrl) {
                return 'url("' + blobUrl + '")';
            }
            return match;
        });
    }

    /**
     * Resolve a relative path against a base path.
     */
    function resolvePath(relativePath, basePath) {
        if (!relativePath) return '';
        // Strip leading ./
        var cleaned = relativePath.replace(/^\.\//, '');
        if (cleaned.startsWith('/') || cleaned.match(/^https?:/)) {
            return cleaned;
        }
        if (!basePath) return cleaned;
        // Navigate up for ../
        var parts = basePath.split('/').filter(Boolean);
        var relParts = cleaned.split('/');
        for (var i = 0; i < relParts.length; i++) {
            if (relParts[i] === '..') {
                parts.pop();
            } else if (relParts[i] !== '.') {
                parts.push(relParts[i]);
            }
        }
        return parts.join('/');
    }

    /**
     * Clear cached preview URLs.
     */
    function revokeAll() {
        previewUrls = {};
    }

    var createBlobUrl = createPreviewUrl;

    return {
        // Deprecated alias kept for backwards compatibility with existing consumers.
        createBlobUrl: createBlobUrl,
        createPreviewUrl: createPreviewUrl,
        buildVirtualFS: buildVirtualFS,
        rewriteHtmlForPreview: rewriteHtmlForPreview,
        resolvePath: resolvePath,
        revokeAll: revokeAll
    };
});
