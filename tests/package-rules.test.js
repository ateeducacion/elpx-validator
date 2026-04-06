/**
 * Tests for package-level validation (js/validators/package-rules.js).
 */
const { validatePackage } = require('../js/validators/package-rules');

function makeZipFiles(paths) {
    const files = {};
    paths.forEach(p => {
        files[p] = { dir: p.endsWith('/') };
    });
    return files;
}

describe('Package validation', () => {
    test('flags missing content.dtd for elpx', () => {
        const files = makeZipFiles(['content.xml', 'index.html']);
        const { findings } = validatePackage(files, 'elpx');
        expect(findings.some(f => f.code === 'PKG003')).toBe(true);
    });

    test('flags missing index.html for elpx', () => {
        const files = makeZipFiles(['content.xml', 'content.dtd']);
        const { findings } = validatePackage(files, 'elpx');
        expect(findings.some(f => f.code === 'PKG004')).toBe(true);
    });

    test('flags missing recommended directories', () => {
        const files = makeZipFiles(['content.xml', 'content.dtd', 'index.html']);
        const { findings } = validatePackage(files, 'elpx');
        expect(findings.some(f => f.code === 'PKG005')).toBe(true); // html/
        expect(findings.some(f => f.code === 'PKG006')).toBe(true); // content/resources/
        expect(findings.some(f => f.code === 'PKG007')).toBe(true); // theme/
    });

    test('does not flag present recommended directories', () => {
        const files = makeZipFiles([
            'content.xml', 'content.dtd', 'index.html',
            'html/', 'html/page1.html',
            'content/resources/', 'content/resources/img.png',
            'theme/', 'theme/style.css',
            'libs/', 'libs/jquery.min.js',
            'idevices/'
        ]);
        const { findings } = validatePackage(files, 'elpx');
        expect(findings.some(f => f.code === 'PKG005')).toBe(false);
        expect(findings.some(f => f.code === 'PKG006')).toBe(false);
        expect(findings.some(f => f.code === 'PKG007')).toBe(false);
    });

    test('detects path traversal', () => {
        const files = makeZipFiles(['content.xml', '../etc/passwd']);
        const { findings } = validatePackage(files, 'elpx');
        expect(findings.some(f => f.code === 'PKG010')).toBe(true);
    });

    test('detects suspicious filenames', () => {
        const files = makeZipFiles(['content.xml', '.DS_Store', 'Thumbs.db']);
        const { findings } = validatePackage(files, 'elpx');
        expect(findings.filter(f => f.code === 'PKG012').length).toBeGreaterThanOrEqual(2);
    });

    test('detects duplicate normalized paths', () => {
        const files = makeZipFiles(['content/Image.PNG', 'content/image.png']);
        // Both are non-dirs
        files['content/Image.PNG'] = { dir: false };
        files['content/image.png'] = { dir: false };
        const { findings } = validatePackage(files, 'elpx');
        expect(findings.some(f => f.code === 'PKG013')).toBe(true);
    });

    test('auto-detects elpx format', () => {
        const files = makeZipFiles(['content.xml']);
        const { packageInfo } = validatePackage(files);
        expect(packageInfo.format).toBe('elpx');
    });

    test('auto-detects elp format', () => {
        const files = makeZipFiles(['contentv3.xml']);
        const { packageInfo } = validatePackage(files);
        expect(packageInfo.format).toBe('elp');
    });

    test('packageInfo tracks file counts', () => {
        const files = makeZipFiles(['content.xml', 'a.txt', 'b/', 'b/c.txt']);
        const { packageInfo } = validatePackage(files, 'elpx');
        expect(packageInfo.totalFiles).toBe(4);
    });
});
