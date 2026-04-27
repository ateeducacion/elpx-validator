(function (global, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        global.ELPXTheme = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var STORAGE_KEY = 'elpx-validator.theme';
    var themes = { light: true, dark: true };
    var currentTheme = 'light';

    function canUseLocalStorage() {
        try {
            return typeof localStorage !== 'undefined';
        } catch (error) {
            return false;
        }
    }

    function normalizeTheme(value) {
        var theme = String(value || '').trim().toLowerCase();
        return themes[theme] ? theme : 'light';
    }

    function detectTheme(fallback) {
        if (canUseLocalStorage()) {
            var stored = localStorage.getItem(STORAGE_KEY);
            if (stored) return normalizeTheme(stored);
        }
        return normalizeTheme(fallback || 'light');
    }

    function applyTheme(theme) {
        currentTheme = normalizeTheme(theme);
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.setAttribute('data-theme', currentTheme);
        }
        return currentTheme;
    }

    function setTheme(theme, options) {
        var nextTheme = applyTheme(theme);
        var opts = options || {};
        if (!opts.skipStorage && canUseLocalStorage()) {
            localStorage.setItem(STORAGE_KEY, nextTheme);
        }
        return nextTheme;
    }

    function getTheme() {
        return currentTheme;
    }

    function toggleTheme() {
        return setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    }

    function init(fallback) {
        return setTheme(detectTheme(fallback), { skipStorage: true });
    }

    return {
        STORAGE_KEY: STORAGE_KEY,
        init: init,
        getTheme: getTheme,
        setTheme: setTheme,
        toggleTheme: toggleTheme
    };
});
