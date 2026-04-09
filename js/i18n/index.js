(function (global, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(
            require('./locales/en'),
            require('./locales/es')
        );
    } else {
        global.ELPXI18n = factory(global.ELPXI18nEn, global.ELPXI18nEs);
    }
})(typeof self !== 'undefined' ? self : this, function (en, es) {
    'use strict';

    var STORAGE_KEY = 'elpx-validator.language';
    var LANGUAGE_CHANGE_EVENT = 'elpx:languagechange';
    var locales = {
        en: en || {},
        es: es || {}
    };
    var currentLanguage = 'en';

    function canUseLocalStorage() {
        try {
            return typeof localStorage !== 'undefined';
        } catch (error) {
            return false;
        }
    }

    function resolveValue(source, key) {
        if (!source || !key) return undefined;
        return key.split('.').reduce(function (value, segment) {
            if (value && Object.prototype.hasOwnProperty.call(value, segment)) {
                return value[segment];
            }
            return undefined;
        }, source);
    }

    function interpolate(template, params) {
        if (typeof template !== 'string') return template;
        return template.replace(/\{(\w+)\}/g, function (match, token) {
            return Object.prototype.hasOwnProperty.call(params, token) ? params[token] : match;
        });
    }

    function appendText(parent, text) {
        if (!text) return;
        parent.appendChild(document.createTextNode(text));
    }

    function createAllowedElement(tagName) {
        if (tagName === 'strong') return document.createElement('strong');
        if (tagName === 'code') return document.createElement('code');
        if (tagName === 'em') return document.createElement('em');
        return null;
    }

    function createSafeHtmlFragment(html) {
        var fragment = document.createDocumentFragment();
        var stack = [fragment];
        var tokenRegex = /(<\/?(?:code|em|strong)>)/ig;
        var tagRegex = /^<([a-z]+)>$/i;
        var closeTagRegex = /^<\/([a-z]+)>$/i;
        var lastIndex = 0;
        var match;

        while ((match = tokenRegex.exec(html))) {
            appendText(stack[stack.length - 1], html.slice(lastIndex, match.index));

            var token = match[0];
            var closeMatch = token.match(closeTagRegex);
            if (closeMatch) {
                var closingTag = closeMatch[1].toUpperCase();
                if (stack.length > 1 && stack[stack.length - 1].nodeName === closingTag) {
                    stack.pop();
                } else {
                    appendText(stack[stack.length - 1], token);
                }
                lastIndex = match.index + token.length;
                continue;
            }

            var openMatch = token.match(tagRegex);
            if (!openMatch) {
                appendText(stack[stack.length - 1], token);
                lastIndex = match.index + token.length;
                continue;
            }

            var tagName = openMatch[1].toLowerCase();
            var element = createAllowedElement(tagName);
            if (!element) {
                appendText(stack[stack.length - 1], token);
                lastIndex = match.index + token.length;
                continue;
            }
            stack[stack.length - 1].appendChild(element);
            stack.push(element);
            lastIndex = match.index + token.length;
        }

        appendText(stack[stack.length - 1], html.slice(lastIndex));
        return fragment;
    }

    function normalizeLanguage(lang) {
        var value = String(lang || '').trim().toLowerCase();
        if (locales[value]) return value;
        if (value.indexOf('es') === 0) return 'es';
        return 'en';
    }

    function updateDocumentLanguage() {
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.lang = currentLanguage;
        }
    }

    function detectLanguage() {
        if (canUseLocalStorage()) {
            var stored = localStorage.getItem(STORAGE_KEY);
            if (stored) return normalizeLanguage(stored);
        }

        if (typeof navigator !== 'undefined') {
            if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
                return normalizeLanguage(navigator.languages[0]);
            }
            if (navigator.language) {
                return normalizeLanguage(navigator.language);
            }
        }

        return 'en';
    }

    function getLanguage() {
        return currentLanguage;
    }

    function dispatchLanguageChange(language) {
        if (typeof document === 'undefined' || typeof CustomEvent === 'undefined') return;
        document.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, {
            detail: { language: language }
        }));
    }

    function setLanguage(lang, options) {
        var nextLanguage = normalizeLanguage(lang);
        var opts = options || {};
        var changed = currentLanguage !== nextLanguage;
        currentLanguage = nextLanguage;
        updateDocumentLanguage();

        if (!opts.skipStorage && canUseLocalStorage()) {
            localStorage.setItem(STORAGE_KEY, currentLanguage);
        }

        if (changed && !opts.silent) {
            dispatchLanguageChange(currentLanguage);
        }

        return currentLanguage;
    }

    function t(key, params) {
        var options = params || {};
        var value = resolveValue(locales[currentLanguage], key);
        if (value === undefined) value = resolveValue(locales.en, key);
        if (value === undefined) return key;
        if (typeof value === 'function') return value(options);
        if (typeof value !== 'string') return value;
        return interpolate(value, options);
    }

    function translateElement(element) {
        if (!element || element.nodeType !== 1) return;

        var textKey = element.getAttribute('data-i18n');
        if (textKey) {
            element.textContent = t(textKey);
        }

        var htmlKey = element.getAttribute('data-i18n-html');
        if (htmlKey) {
            element.replaceChildren(createSafeHtmlFragment(t(htmlKey)));
        }

        var placeholderKey = element.getAttribute('data-i18n-placeholder');
        if (placeholderKey) {
            element.setAttribute('placeholder', t(placeholderKey));
        }

        var titleKey = element.getAttribute('data-i18n-title');
        if (titleKey) {
            element.setAttribute('title', t(titleKey));
        }

        var ariaLabelKey = element.getAttribute('data-i18n-aria-label');
        if (ariaLabelKey) {
            element.setAttribute('aria-label', t(ariaLabelKey));
        }
    }

    function translateDom(root) {
        var scope = root || (typeof document !== 'undefined' ? document : null);
        if (!scope) return;

        if (scope.nodeType === 1) {
            translateElement(scope);
        }

        if (typeof scope.querySelectorAll !== 'function') return;
        scope.querySelectorAll('[data-i18n], [data-i18n-html], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria-label]')
            .forEach(translateElement);
    }

    currentLanguage = detectLanguage();
    updateDocumentLanguage();

    return {
        LANGUAGE_CHANGE_EVENT: LANGUAGE_CHANGE_EVENT,
        STORAGE_KEY: STORAGE_KEY,
        detectLanguage: detectLanguage,
        getLanguage: getLanguage,
        setLanguage: setLanguage,
        t: t,
        translateDom: translateDom,
        locales: locales
    };
});
