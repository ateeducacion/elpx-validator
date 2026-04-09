const path = require('path');

const MODULE_PATH = path.resolve(__dirname, '../js/i18n/index.js');

function loadI18n() {
    jest.resetModules();
    return require(MODULE_PATH);
}

describe('ELPXI18n', () => {
    beforeEach(() => {
        document.documentElement.lang = 'en';
        document.body.innerHTML = '';
        localStorage.clear();
        jest.restoreAllMocks();
        Object.defineProperty(window.navigator, 'languages', {
            configurable: true,
            value: ['en-US']
        });
    });

    test('defaults to English when browser language is not Spanish', () => {
        Object.defineProperty(window.navigator, 'language', {
            configurable: true,
            value: 'en-US'
        });
        Object.defineProperty(window.navigator, 'languages', {
            configurable: true,
            value: ['en-US']
        });

        const i18n = loadI18n();

        expect(i18n.getLanguage()).toBe('en');
        expect(document.documentElement.lang).toBe('en');
    });

    test('uses Spanish when browser language starts with es', () => {
        Object.defineProperty(window.navigator, 'language', {
            configurable: true,
            value: 'es-ES'
        });
        Object.defineProperty(window.navigator, 'languages', {
            configurable: true,
            value: ['es-ES']
        });

        const i18n = loadI18n();

        expect(i18n.getLanguage()).toBe('es');
        expect(document.documentElement.lang).toBe('es');
    });

    test('saved language overrides browser language', () => {
        localStorage.setItem('elpx-validator.language', 'en');
        Object.defineProperty(window.navigator, 'language', {
            configurable: true,
            value: 'es-ES'
        });
        Object.defineProperty(window.navigator, 'languages', {
            configurable: true,
            value: ['es-ES']
        });

        const i18n = loadI18n();

        expect(i18n.detectLanguage()).toBe('en');
        expect(i18n.getLanguage()).toBe('en');
    });

    test('falls back to English and then to the key string', () => {
        Object.defineProperty(window.navigator, 'language', {
            configurable: true,
            value: 'es-ES'
        });
        Object.defineProperty(window.navigator, 'languages', {
            configurable: true,
            value: ['es-ES']
        });

        const i18n = loadI18n();

        expect(i18n.t('app.title')).toBe('Validador de paquetes eXeLearning');
        expect(i18n.t('common.english')).toBe('English');
        expect(i18n.t('missing.key')).toBe('missing.key');
    });

    test('interpolates parameters and translates DOM attributes', () => {
        const i18n = loadI18n();
        document.body.innerHTML = [
            '<div>',
            '  <h1 data-i18n="app.heading"></h1>',
            '  <p data-i18n-html="app.subtitleHtml"></p>',
            '  <input data-i18n-placeholder="preview.placeholder">',
            '  <button data-i18n-title="summary.errorsTitle" data-i18n-aria-label="common.language"></button>',
            '</div>'
        ].join('');

        expect(i18n.t('checklist.pages.found', { count: 2, pageLabel: 'pages' })).toBe('Found 2 pages.');

        i18n.translateDom(document);

        expect(document.querySelector('h1').textContent).toBe('eXeLearning Package Validator');
        expect(document.querySelector('p').innerHTML).toContain('<code>.elp</code>');
        expect(document.querySelector('input').getAttribute('placeholder')).toBe('— select a page —');
        expect(document.querySelector('button').getAttribute('title')).toBe('Errors');
        expect(document.querySelector('button').getAttribute('aria-label')).toBe('Language');
    });

    test('setLanguage persists the value and emits a custom event', () => {
        const i18n = loadI18n();
        const handler = jest.fn();
        document.addEventListener(i18n.LANGUAGE_CHANGE_EVENT, handler);

        i18n.setLanguage('es');

        expect(i18n.getLanguage()).toBe('es');
        expect(document.documentElement.lang).toBe('es');
        expect(localStorage.getItem('elpx-validator.language')).toBe('es');
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail).toEqual({ language: 'es' });
    });
});
