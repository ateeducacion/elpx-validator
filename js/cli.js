/**
 * Command line interface (Node only). The validation itself is js/validator.js,
 * the same code the web app runs.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');

const pkg = require('../package.json');

const EXIT = { OK: 0, INVALID: 1, ERROR: 2 };

const HELP = `elpx-validator ${pkg.version} — validate eXeLearning packages (.elpx, .elp)

Usage:
  elpx-validator <file.elpx> [more files…] [options]

Options:
  --json             the report as one JSON document
  --strict           warnings also make the package fail
  --all              also list informational findings
  --edia             add the EDIA quality criteria evaluation
  -o, --output FILE  write to FILE instead of standard output
  --lang es|en       language of the output (default: from LANG)
  --no-color         plain text without colours
  -h, --help         this help
  -v, --version      version

Exit status: 0 valid (warnings allowed unless --strict), 1 invalid, 2 error.
`;

const UI = {
    en: {
        verdicts: { valid: 'VALID', 'valid-with-warnings': 'VALID WITH WARNINGS', invalid: 'INVALID' },
        counts: (c) => `${c.errors} errors, ${c.warnings} warnings, ${c.infos} info`,
        severities: { error: 'ERROR', warning: 'WARN ', info: 'INFO ' },
        edia: (e) => `EDIA: ${e.green} compliant, ${e.orange} to review, ${e.red} missing`,
        notFile: (p) => `${p} is not a file`
    },
    es: {
        verdicts: { valid: 'VÁLIDO', 'valid-with-warnings': 'VÁLIDO CON ADVERTENCIAS', invalid: 'NO VÁLIDO' },
        counts: (c) => `${c.errors} errores, ${c.warnings} advertencias, ${c.infos} informativos`,
        severities: { error: 'ERROR', warning: 'AVISO', info: 'INFO ' },
        edia: (e) => `EDIA: ${e.green} cumplidos, ${e.orange} por revisar, ${e.red} ausentes`,
        notFile: (p) => `${p} no es un archivo`
    }
};

/**
 * Validate the bytes of a package.
 *
 * @param {Buffer|Uint8Array|ArrayBuffer} data
 * @param {object} [options]
 * @param {boolean} [options.edia] - also evaluate the EDIA criteria.
 * @returns {Promise<object>} format, verdict, counts, findings, metadata, pages,
 *   ideviceSummary, assetSummary and (optionally) edia.
 */
async function validateBuffer(data, options) {
    if (typeof DOMParser === 'undefined') {
        // ponytail: jsdom is heavy for one DOMParser, but it is the parser the tests run on,
        // so the CLI and the browser agree. Swap for a lighter XML DOM if start-up time matters.
        global.DOMParser = new (require('jsdom').JSDOM)('').window.DOMParser;
    }
    const validator = require('./validator');
    let report;
    try {
        report = await validator.runFullValidation(await require('jszip').loadAsync(data));
    } catch (error) {
        report = {
            format: 'unknown',
            findings: [validator.rules.createFinding('PKG001', { details: error.message })],
            counts: { errors: 1, warnings: 0, infos: 0 }
        };
    }
    const result = {
        format: report.format,
        verdict: report.counts.errors ? 'invalid' : report.counts.warnings ? 'valid-with-warnings' : 'valid',
        counts: report.counts,
        findings: report.findings,
        metadata: report.metadata || null,
        pages: report.pageTitles || [],
        ideviceSummary: report.ideviceSummary || null,
        assetSummary: report.assetSummary || null
    };
    if (options && options.edia) {
        const criteria = require('./edia/edia-criteria').evaluateEdiaCriteria(report);
        result.edia = { green: 0, orange: 0, red: 0, criteria: criteria };
        criteria.forEach((c) => {
            result.edia[c.status]++;
        });
    }
    return result;
}

function renderText(file, result, opts) {
    const i18n = require('./i18n');
    i18n.setLanguage(opts.lang, { skipStorage: true, silent: true });
    const ui = UI[opts.lang];
    const paint = (code, text) => (opts.color ? `\x1b[${code}m${text}\x1b[0m` : text);
    const colors = { error: 31, warning: 33, info: 36 };
    const lines = [
        `${file} — ${result.format} · ${paint(result.counts.errors ? 31 : result.counts.warnings ? 33 : 32, ui.verdicts[result.verdict])}`,
        ui.counts(result.counts)
    ];
    ['error', 'warning', 'info'].forEach((severity) => {
        if (severity === 'info' && !opts.all) return;
        result.findings
            .filter((f) => f.severity === severity)
            .forEach((f) => {
                lines.push(
                    '',
                    `${paint(colors[severity], ui.severities[severity])}  ${f.code}  ${i18n.findingText(f, 'message')}`
                );
                ['details', 'suggestion'].forEach((field) => {
                    const text = i18n.findingText(f, field);
                    if (text) lines.push(`       ${field === 'suggestion' ? '→ ' : ''}${text}`);
                });
            });
    });
    if (result.edia) {
        lines.push('', ui.edia(result.edia));
        result.edia.criteria
            .filter((c) => c.status !== 'green' && c.validationType !== 'manual')
            .forEach((c) => {
                const key = `edia.criteria.${c.id}.title`;
                const title = i18n.t(key);
                lines.push(`  ${c.status === 'red' ? '✗' : '?'} ${c.id}  ${title === key ? c.title : title}`);
            });
    }
    return lines.join('\n') + '\n';
}

/**
 * @param {string[]} argv
 * @param {{stdout: function(string), stderr: function(string), env: object, color: boolean}} io
 * @returns {Promise<number>} the exit status.
 */
async function main(argv, io) {
    try {
        const { values, positionals } = parseArgs({
            args: argv,
            allowPositionals: true,
            options: {
                json: { type: 'boolean' },
                strict: { type: 'boolean' },
                all: { type: 'boolean' },
                edia: { type: 'boolean' },
                output: { type: 'string', short: 'o' },
                lang: { type: 'string' },
                'no-color': { type: 'boolean' },
                help: { type: 'boolean', short: 'h' },
                version: { type: 'boolean', short: 'v' }
            }
        });
        if (values.version) return (io.stdout(`${pkg.version}\n`), EXIT.OK);
        if (values.help) return (io.stdout(HELP), EXIT.OK);
        if (positionals.length === 0) return (io.stderr(HELP), EXIT.ERROR);

        const lang = (values.lang || io.env.LC_ALL || io.env.LANG || '').startsWith('es') ? 'es' : 'en';
        const results = [];
        for (const file of positionals) {
            if (!fs.statSync(file).isFile()) throw new Error(UI[lang].notFile(file));
            const result = await validateBuffer(fs.readFileSync(file), { edia: values.edia });
            results.push(Object.assign({ file: path.basename(file) }, result));
        }
        const text = values.json
            ? JSON.stringify(results.length === 1 ? results[0] : results, null, 2) + '\n'
            : results
                  .map((r) =>
                      renderText(r.file, r, {
                          lang: lang,
                          all: values.all,
                          color: io.color && !values['no-color'] && !values.output
                      })
                  )
                  .join('\n');
        if (values.output) fs.writeFileSync(values.output, text);
        else io.stdout(text);

        const failed = results.some((r) => r.verdict === 'invalid' || (values.strict && r.verdict !== 'valid'));
        return failed ? EXIT.INVALID : EXIT.OK;
    } catch (error) {
        io.stderr(`elpx-validator: ${error.message}\n`);
        return EXIT.ERROR;
    }
}

module.exports = { main: main, validateBuffer: validateBuffer, EXIT: EXIT };
