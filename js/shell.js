/**
 * Page shell: the header controls (language, colour mode, CLI and Skill panels)
 * and the footer (version, licences). The validation UI itself is app.js.
 */
(function (global, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./i18n'), require('./theme'));
    } else {
        global.ELPXShell = factory(global.ELPXI18n, global.ELPXTheme);
        global.ELPXShell.init(document);
    }
})(typeof self !== 'undefined' ? self : this, function (i18n, theme) {
    'use strict';

    // Kept equal to package.json by tests/shell.test.js: the page has no build step to inject it.
    var VERSION = '1.2.0';
    var LANGUAGE_NAMES = { en: 'English', es: 'Español' };

    function init(doc) {
        var languageToggle = doc.getElementById('languageToggle');
        var themeToggle = doc.getElementById('themeToggle');

        function otherLanguage() {
            return i18n.getLanguage() === 'es' ? 'en' : 'es';
        }

        // Each control names what it switches to.
        function sync() {
            languageToggle.textContent = LANGUAGE_NAMES[otherLanguage()];
            languageToggle.lang = otherLanguage();
            var label = i18n.t(theme.getTheme() === 'dark' ? 'theme.toLight' : 'theme.toDark');
            themeToggle.setAttribute('aria-label', label);
            themeToggle.title = label;
        }

        theme.init();
        languageToggle.addEventListener('click', function () {
            i18n.setLanguage(otherLanguage());
        });
        themeToggle.addEventListener('click', function () {
            theme.toggleTheme();
            sync();
        });
        doc.addEventListener(i18n.LANGUAGE_CHANGE_EVENT, sync);

        doc.querySelectorAll('[data-open]').forEach(function (button) {
            button.addEventListener('click', function () {
                doc.getElementById(button.dataset.open).showModal();
            });
        });
        doc.querySelectorAll('[data-close]').forEach(function (button) {
            button.addEventListener('click', function () {
                button.closest('dialog').close();
            });
        });
        doc.querySelectorAll('[data-copy]').forEach(function (button) {
            button.addEventListener('click', function () {
                navigator.clipboard.writeText(button.parentElement.querySelector('code').textContent).then(function () {
                    button.textContent = i18n.t('shell.copied');
                });
            });
        });

        doc.getElementById('version').textContent = 'v' + VERSION;
        sync();
    }

    return { VERSION: VERSION, init: init };
});
