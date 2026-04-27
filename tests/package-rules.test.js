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

    test('flags missing screenshot.png for elpx (PKG015)', () => {
        const files = makeZipFiles(['content.xml', 'content.dtd', 'index.html']);
        const { findings, packageInfo } = validatePackage(files, 'elpx');
        expect(packageInfo.hasScreenshotPng).toBe(false);
        expect(findings.some(f => f.code === 'PKG015')).toBe(true);
    });

    test('does not flag screenshot.png when present', () => {
        const files = makeZipFiles(['content.xml', 'content.dtd', 'index.html', 'screenshot.png']);
        const { findings, packageInfo } = validatePackage(files, 'elpx');
        expect(packageInfo.hasScreenshotPng).toBe(true);
        expect(findings.some(f => f.code === 'PKG015')).toBe(false);
    });

    test('flags screenshot.png with invalid PNG magic bytes (PKG016)', () => {
        const files = makeZipFiles(['content.xml', 'content.dtd', 'index.html']);
        files['screenshot.png'] = {
            dir: false,
            uint8array: new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07])
        };
        const { findings } = validatePackage(files, 'elpx');
        expect(findings.some(f => f.code === 'PKG016')).toBe(true);
    });

    test('does not flag screenshot.png with valid PNG magic bytes', () => {
        const files = makeZipFiles(['content.xml', 'content.dtd', 'index.html']);
        files['screenshot.png'] = {
            dir: false,
            uint8array: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
        };
        const { findings } = validatePackage(files, 'elpx');
        expect(findings.some(f => f.code === 'PKG016')).toBe(false);
    });

    test('flags legacy v3 UUID-pattern subfolder under content/resources/ (PKG017)', () => {
        const files = makeZipFiles([
            'content.xml',
            'content.dtd',
            'index.html',
            'screenshot.png',
            'content/resources/20251009090601DKVACR/01.jpg',
            'content/resources/20251009090601IYVTRY/image001.jpg'
        ]);
        const { findings } = validatePackage(files, 'elpx');
        const legacy = findings.filter(f => f.code === 'PKG017');
        expect(legacy.length).toBe(2);
        const reportedFolders = legacy.map(f => f.evidence.folder).sort();
        expect(reportedFolders).toEqual([
            'content/resources/20251009090601DKVACR',
            'content/resources/20251009090601IYVTRY'
        ]);
    });

    test('does not flag user-created folders under content/resources/', () => {
        const files = makeZipFiles([
            'content.xml',
            'content.dtd',
            'index.html',
            'screenshot.png',
            'content/resources/photos/cover.jpg',
            'content/resources/photos/vacation/sunset.jpg',
            'content/resources/handouts/lesson-1/slides.pdf'
        ]);
        const { findings } = validatePackage(files, 'elpx');
        expect(findings.some(f => f.code === 'PKG017')).toBe(false);
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
