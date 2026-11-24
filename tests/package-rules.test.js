/**
 * Tests for package-level validation (js/validators/package-rules.js).
 */
const { validatePackage, validateElpxManifest, BASE_LIBRARIES } = require('../js/validators/package-rules');

function makeZipFiles(paths) {
    const files = {};
    paths.forEach((p) => {
        files[p] = { dir: p.endsWith('/') };
    });
    return files;
}

describe('Package validation', () => {
    test('flags missing content.dtd for elpx', () => {
        const files = makeZipFiles(['content.xml', 'index.html']);
        const { findings } = validatePackage(files, 'elpx');
        expect(findings.some((f) => f.code === 'PKG003')).toBe(true);
    });

    test('flags missing screenshot.png for elpx (PKG015)', () => {
        const files = makeZipFiles(['content.xml', 'content.dtd', 'index.html']);
        const { findings, packageInfo } = validatePackage(files, 'elpx');
        expect(packageInfo.hasScreenshotPng).toBe(false);
        expect(findings.some((f) => f.code === 'PKG015')).toBe(true);
    });

    test('does not flag screenshot.png when present', () => {
        const files = makeZipFiles(['content.xml', 'content.dtd', 'index.html', 'screenshot.png']);
        const { findings, packageInfo } = validatePackage(files, 'elpx');
        expect(packageInfo.hasScreenshotPng).toBe(true);
        expect(findings.some((f) => f.code === 'PKG015')).toBe(false);
    });

    test('flags screenshot.png with invalid PNG magic bytes (PKG016)', () => {
        const files = makeZipFiles(['content.xml', 'content.dtd', 'index.html']);
        files['screenshot.png'] = {
            dir: false,
            uint8array: new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07])
        };
        const { findings } = validatePackage(files, 'elpx');
        expect(findings.some((f) => f.code === 'PKG016')).toBe(true);
    });

    test('does not flag screenshot.png with valid PNG magic bytes', () => {
        const files = makeZipFiles(['content.xml', 'content.dtd', 'index.html']);
        files['screenshot.png'] = {
            dir: false,
            uint8array: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
        };
        const { findings } = validatePackage(files, 'elpx');
        expect(findings.some((f) => f.code === 'PKG016')).toBe(false);
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
        const legacy = findings.filter((f) => f.code === 'PKG017');
        expect(legacy.length).toBe(2);
        const reportedFolders = legacy.map((f) => f.evidence.folder).sort();
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
        expect(findings.some((f) => f.code === 'PKG017')).toBe(false);
    });

    test('flags missing index.html for elpx', () => {
        const files = makeZipFiles(['content.xml', 'content.dtd']);
        const { findings } = validatePackage(files, 'elpx');
        expect(findings.some((f) => f.code === 'PKG004')).toBe(true);
    });

    test('flags missing recommended directories', () => {
        const files = makeZipFiles(['content.xml', 'content.dtd', 'index.html']);
        const { findings } = validatePackage(files, 'elpx');
        expect(findings.some((f) => f.code === 'PKG005')).toBe(true); // html/
        expect(findings.some((f) => f.code === 'PKG006')).toBe(true); // content/resources/
        expect(findings.some((f) => f.code === 'PKG007')).toBe(true); // theme/
    });

    test('does not flag present recommended directories', () => {
        const files = makeZipFiles([
            'content.xml',
            'content.dtd',
            'index.html',
            'html/',
            'html/page1.html',
            'content/resources/',
            'content/resources/img.png',
            'theme/',
            'theme/style.css',
            'libs/',
            'libs/jquery.min.js',
            'idevices/'
        ]);
        const { findings } = validatePackage(files, 'elpx');
        expect(findings.some((f) => f.code === 'PKG005')).toBe(false);
        expect(findings.some((f) => f.code === 'PKG006')).toBe(false);
        expect(findings.some((f) => f.code === 'PKG007')).toBe(false);
    });

    test('detects path traversal', () => {
        const files = makeZipFiles(['content.xml', '../etc/passwd']);
        const { findings } = validatePackage(files, 'elpx');
        expect(findings.some((f) => f.code === 'PKG010')).toBe(true);
    });

    test('detects suspicious filenames', () => {
        const files = makeZipFiles(['content.xml', '.DS_Store', 'Thumbs.db']);
        const { findings } = validatePackage(files, 'elpx');
        expect(findings.filter((f) => f.code === 'PKG012').length).toBeGreaterThanOrEqual(2);
    });

    test('detects duplicate normalized paths', () => {
        const files = makeZipFiles(['content/Image.PNG', 'content/image.png']);
        // Both are non-dirs
        files['content/Image.PNG'] = { dir: false };
        files['content/image.png'] = { dir: false };
        const { findings } = validatePackage(files, 'elpx');
        expect(findings.some((f) => f.code === 'PKG013')).toBe(true);
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

describe('theme, libraries and nested packages', () => {
    const codes = (paths, format) => validatePackage(makeZipFiles(paths), format || 'elpx').findings.map((f) => f.code);
    const libs = BASE_LIBRARIES.map((lib) => 'libs/' + lib);

    test('a default theme and a custom theme with other file names are both complete', () => {
        expect(codes(['content.xml', 'theme/config.xml', 'theme/style.css', 'theme/style.js'])).not.toContain('PKG018');
        expect(codes(['content.xml', 'theme/config.xml', 'theme/content.css', 'theme/default.js'])).not.toContain(
            'PKG018'
        );
    });

    test('PKG018 names what the theme lacks', () => {
        const { findings } = validatePackage(makeZipFiles(['content.xml', 'theme/icons/info.png']), 'elpx');
        const finding = findings.find((f) => f.code === 'PKG018');
        expect(finding.evidence.missing).toEqual(['theme/config.xml', 'theme/*.css']);
        expect(codes(['content.xml', 'theme/config.xml', 'theme/img/x.css'])).toContain('PKG018');
    });

    test('no PKG018 or PKG019 for a package without those folders (PKG007 and PKG008 cover that)', () => {
        const found = codes(['content.xml']);
        expect(found).not.toContain('PKG018');
        expect(found).not.toContain('PKG019');
    });

    test('PKG019 lists the base libraries that are missing', () => {
        expect(codes(['content.xml'].concat(libs))).not.toContain('PKG019');
        const { findings } = validatePackage(makeZipFiles(['content.xml'].concat(libs.slice(1))), 'elpx');
        expect(findings.find((f) => f.code === 'PKG019').evidence.missing).toEqual([BASE_LIBRARIES[0]]);
    });

    test('PKG021 for several packages at the root, PKG022 for exactly one', () => {
        expect(codes(['a.elpx', 'b.elp'], 'unknown')).toContain('PKG021');
        const one = codes(['curso.elpx', 'leeme.txt'], 'unknown');
        expect(one).toContain('PKG022');
        expect(one).not.toContain('PKG021');
    });

    test('nested packages are only a finding when the ZIP has no manifest, and only at the root', () => {
        const withManifest = codes(['content.xml', 'a.elpx', 'b.elpx']);
        expect(withManifest).not.toContain('PKG021');
        expect(withManifest).not.toContain('PKG022');
        expect(codes(['content/resources/a.elpx', 'content/resources/b.elpx'], 'unknown')).not.toContain('PKG021');
    });
});

describe('libs/elpx-manifest.js', () => {
    const js = (body) => '/**\n * ELPX Manifest\n */\nwindow.__ELPX_MANIFEST__=' + body + ';\n';

    test('the file eXeLearning writes is valid', () => {
        const manifest = { version: 1, files: ['index.html', 'content.xml'], projectTitle: 'Curso' };
        expect(validateElpxManifest(js(JSON.stringify(manifest, null, 2)))).toEqual([]);
    });

    test.each([
        ['no assignment', 'var x = 1;', /__ELPX_MANIFEST__/],
        ['broken JSON', js('{"files": ['), /__ELPX_MANIFEST__|JSON/],
        ['not JSON', js('{files: []}'), /JSON/],
        ['files is not a list', js('{"files": "all", "projectTitle": "x"}'), /"files"/],
        ['no projectTitle', js('{"files": []}'), /"projectTitle"/]
    ])('PKG020: %s', (_name, text, reason) => {
        const findings = validateElpxManifest(text);
        expect(findings).toHaveLength(1);
        expect(findings[0].code).toBe('PKG020');
        expect(findings[0].details).toMatch(reason);
        expect(findings[0].location.path).toBe('libs/elpx-manifest.js');
    });
});
