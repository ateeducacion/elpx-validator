const path = require('path');

const MODULE_PATH = path.resolve(__dirname, '../js/theme.js');

function loadTheme() {
    jest.resetModules();
    return require(MODULE_PATH);
}

describe('ELPXTheme', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-theme');
        localStorage.clear();
        jest.restoreAllMocks();
    });

    test('defaults to light mode and stores the selected theme', () => {
        const theme = loadTheme();

        expect(theme.init()).toBe('light');
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');

        expect(theme.setTheme('dark')).toBe('dark');
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(localStorage.getItem('elpx-validator.theme')).toBe('dark');
    });

    test('toggle switches between light and dark mode', () => {
        const theme = loadTheme();

        theme.init('dark');

        expect(theme.toggleTheme()).toBe('light');
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');

        expect(theme.toggleTheme()).toBe('dark');
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
});
