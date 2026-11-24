const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const pkg = require('../package.json');

function load() {
    jest.resetModules();
    document.documentElement.innerHTML = html.replace(/<script[\s\S]*?<\/script>/g, '');
    localStorage.clear();
    // jsdom has no layout: dialogs only need to record that they were opened and closed.
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
    const i18n = require('../js/i18n');
    i18n.setLanguage('en', { silent: true });
    const shell = require('../js/shell');
    shell.init(document);
    i18n.translateDom(document);
    return { i18n, shell };
}

describe('page shell', () => {
    test('the page loads nothing from other origins', () => {
        const external = html.match(/<(?:script|link|img)[^>]+(?:src|href)="(?:https?:)?\/\/[^"]+"/g);
        expect(external).toBeNull();
    });

    test('every local script, style and image the page names exists', () => {
        const refs = Array.from(html.matchAll(/<(?:script|link|img)[^>]+(?:src|href)="([^"]+)"/g)).map((m) => m[1]);
        expect(refs.length).toBeGreaterThan(15);
        refs.forEach((ref) => expect([ref, fs.existsSync(path.join(ROOT, ref))]).toEqual([ref, true]));
    });

    test('the vendored JSZip is the installed one', () => {
        const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
        expect(read('vendor/jszip.min.js')).toBe(read('node_modules/jszip/dist/jszip.min.js'));
    });

    test('header: name, tagline and the four controls', () => {
        load();
        const header = document.querySelector('header.app-header');
        expect(header.querySelector('h1').textContent).toBe('elpx-validator');
        expect(header.querySelector('.tagline').textContent).toMatch(/never leave your computer/);
        expect(Array.from(header.querySelectorAll('button')).map((b) => b.id || b.dataset.open))
            .toEqual(['cli-panel', 'skill-panel', 'languageToggle', 'themeToggle']);
    });

    test('footer: ATE, source, version and licence', () => {
        const { shell } = load();
        const footer = document.querySelector('footer.app-footer');
        expect(shell.VERSION).toBe(pkg.version);
        expect(footer.querySelector('#version').textContent).toBe('v' + pkg.version);
        expect(footer.querySelector('.ate img').getAttribute('src')).toBe('img/ate-logo.png');
        expect(footer.querySelector('a[href="https://github.com/ateeducacion/elpx-validator"]').textContent).toBe('Source code');
        expect(footer.querySelector('.licence').textContent).toContain('AGPL-3.0');
    });

    test('the language button switches language and names the other one', () => {
        const { i18n } = load();
        const toggle = document.getElementById('languageToggle');
        expect(toggle.textContent).toBe('Español');
        toggle.click();
        i18n.translateDom(document); // app.js does this on the language event
        expect(i18n.getLanguage()).toBe('es');
        expect(toggle.textContent).toBe('English');
        expect(toggle.lang).toBe('en');
        expect(document.documentElement.lang).toBe('es');
        expect(document.querySelector('.tagline').textContent).toMatch(/no salen de tu equipo/);
        expect(document.getElementById('themeToggle').getAttribute('aria-label')).toBe('Cambiar a modo oscuro');
    });

    test('the theme button toggles, remembers and relabels itself', () => {
        load();
        const toggle = document.getElementById('themeToggle');
        expect(toggle.getAttribute('aria-label')).toBe('Switch to dark mode');
        toggle.click();
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(localStorage.getItem('elpx-validator.theme')).toBe('dark');
        expect(toggle.getAttribute('aria-label')).toBe('Switch to light mode');
    });

    test('with nothing stored the theme follows the system', () => {
        window.matchMedia = () => ({ matches: true });
        load();
        delete window.matchMedia;
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(localStorage.getItem('elpx-validator.theme')).toBeNull();
    });

    test('CLI, Skill and licences open as dialogs and close', () => {
        load();
        ['cli-panel', 'skill-panel', 'licenses-panel'].forEach((id) => {
            const dialog = document.getElementById(id);
            expect(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent).not.toBe('');
            document.querySelector('[data-open="' + id + '"]').click();
            expect(dialog.hasAttribute('open')).toBe(true);
            dialog.querySelector('[data-close]').click();
            expect(dialog.hasAttribute('open')).toBe(false);
        });
    });

    test('the commands shown are the real CLI and can be copied', async () => {
        load();
        const commands = Array.from(document.querySelectorAll('#cli-panel code')).map((c) => c.textContent);
        expect(commands[0]).toBe('npx ' + Object.keys(pkg.bin)[0] + ' course.elpx');
        const help = fs.readFileSync(path.join(ROOT, 'js/cli.js'), 'utf8');
        commands.join(' ').match(/--[a-z-]+/g).forEach((flag) => expect(help).toContain(flag));

        const writeText = jest.fn().mockResolvedValue();
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
        const button = document.querySelector('#cli-panel [data-copy]');
        button.click();
        await Promise.resolve();
        expect(writeText).toHaveBeenCalledWith(commands[0]);
        expect(button.textContent).toBe('Copied');
    });

    test('every translation key the page uses exists in both languages', () => {
        const { i18n } = load();
        const keys = Array.from(html.matchAll(/data-(?:label-html-|label-)?i18n(?:-[a-z-]+)?="([^"]+)"/g)).map((m) => m[1]);
        expect(keys.length).toBeGreaterThan(80);
        ['en', 'es'].forEach((lang) => {
            i18n.setLanguage(lang, { silent: true });
            keys.forEach((key) => expect(i18n.t(key)).not.toBe(key));
        });
    });
});
