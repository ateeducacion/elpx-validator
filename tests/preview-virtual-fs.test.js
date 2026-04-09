const {
    createPreviewUrl,
    buildVirtualFS,
    rewriteHtmlForPreview
} = require('../js/preview/virtual-fs');

function createZipEntry(name, base64Data) {
    return {
        name,
        async: jest.fn(async (type) => {
            if (type !== 'base64') {
                throw new Error('Unsupported type: ' + type);
            }
            return base64Data;
        })
    };
}

describe('Preview virtual file system', () => {
    test('createPreviewUrl returns a data URL with the requested mime type', async () => {
        const entry = createZipEntry('assets/app.js', 'Y29uc29sZS5sb2coJ29rJyk7');

        const url = await createPreviewUrl(entry, 'application/javascript');

        expect(url).toBe('data:application/javascript;base64,Y29uc29sZS5sb2coJ29rJyk7');
        expect(entry.async).toHaveBeenCalledWith('base64');
    });

    test('buildVirtualFS maps package files to data URLs', async () => {
        const htmlEntry = createZipEntry('html/page1.html', 'PGgxPkhlbGxvPC9oMT4=');
        const imageEntry = createZipEntry('content/resources/pic.png', 'cG5n');
        const zip = {
            files: {
                'html/page1.html': { dir: false },
                'content/resources/pic.png': { dir: false },
                'content/resources/': { dir: true }
            },
            file(name) {
                return {
                    'html/page1.html': htmlEntry,
                    'content/resources/pic.png': imageEntry
                }[name];
            }
        };

        const urlMap = await buildVirtualFS(zip, (name) => (
            name.endsWith('.html') ? 'text/html' : 'image/png'
        ));

        expect(urlMap).toEqual({
            'html/page1.html': 'data:text/html;base64,PGgxPkhlbGxvPC9oMT4=',
            'content/resources/pic.png': 'data:image/png;base64,cG5n'
        });
    });

    test('rewriteHtmlForPreview rewrites relative asset paths to preview URLs', () => {
        const html = [
            '<!doctype html>',
            '<html><head><link rel="stylesheet" href="../content/resources/site.css"></head>',
            '<body><img src="../content/resources/pic.png"></body></html>'
        ].join('');
        const rewritten = rewriteHtmlForPreview(html, {
            'content/resources/site.css': 'data:text/css;base64,Ym9keXt9',
            'content/resources/pic.png': 'data:image/png;base64,cG5n'
        }, 'html/');

        expect(rewritten).toContain('href="data:text/css;base64,Ym9keXt9"');
        expect(rewritten).toContain('src="data:image/png;base64,cG5n"');
    });
});
