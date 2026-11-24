// main() finds the preloaded DOMParser here (tests/support/dom.js). The last test runs the real
// bin script in plain Node, where the CLI brings its own.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const JSZip = require('jszip');

const { main, validateBuffer, EXIT } = require('../js/cli');
const pkg = require('../package.json');

const CONTENT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ode SYSTEM "content.dtd">
<ode xmlns="http://www.intef.es/xsd/ode" version="2.0">
  <odeProperties>
    <odeProperty><key>pp_title</key><value>Curso</value></odeProperty>
  </odeProperties>
  <odeNavStructures>
    <odeNavStructure>
      <odePageId>page-1</odePageId>
      <pageName>Inicio</pageName>
      <odeNavStructureOrder>1</odeNavStructureOrder>
      <odePagStructures>
        <odePagStructure>
          <odeBlockId>block-1</odeBlockId>
          <blockName>Bloque</blockName>
          <odePagStructureOrder>1</odePagStructureOrder>
          <odeComponents>
            <odeComponent>
              <odeIdeviceId>idevice-1</odeIdeviceId>
              <odeIdeviceTypeName>text</odeIdeviceTypeName>
              <htmlView><![CDATA[<p>Hola</p>]]></htmlView>
              <jsonProperties>{}</jsonProperties>
              <odeComponentsOrder>1</odeComponentsOrder>
            </odeComponent>
          </odeComponents>
        </odePagStructure>
      </odePagStructures>
    </odeNavStructure>
  </odeNavStructures>
</ode>`;

function elpx(files) {
    const zip = new JSZip();
    Object.keys(files).forEach((name) => zip.file(name, files[name]));
    return zip.generateAsync({ type: 'nodebuffer' });
}

function run(argv, env) {
    const out = { stdout: '', stderr: '' };
    return main(argv, {
        stdout: (text) => { out.stdout += text; },
        stderr: (text) => { out.stderr += text; },
        env: env || {},
        color: false
    }).then((code) => Object.assign(out, { code }));
}

describe('elpx-validator CLI', () => {
    let dir, good, broken, notZip;

    beforeAll(async () => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'elpx-validator-'));
        good = path.join(dir, 'good.elpx');
        broken = path.join(dir, 'broken.elpx');
        notZip = path.join(dir, 'not-a-zip.elpx');
        fs.writeFileSync(good, await elpx({ 'content.xml': CONTENT_XML, 'index.html': '<html></html>' }));
        fs.writeFileSync(broken, await elpx({ 'content.xml': '<ode><unclosed></ode>' }));
        fs.writeFileSync(notZip, 'this is not a zip archive');
    });

    afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

    test('--version and --help print and succeed', async () => {
        expect(await run(['--version'])).toMatchObject({ code: EXIT.OK, stdout: pkg.version + '\n' });
        const help = await run(['-h']);
        expect(help.code).toBe(EXIT.OK);
        expect(help.stdout).toContain('Usage:');
    });

    test('no arguments is a usage error', async () => {
        const result = await run([]);
        expect(result.code).toBe(EXIT.ERROR);
        expect(result.stderr).toContain('Usage:');
    });

    test('an unknown option and a missing file are errors, reported on stderr', async () => {
        expect((await run([good, '--nope'])).code).toBe(EXIT.ERROR);
        const missing = await run([path.join(dir, 'missing.elpx')]);
        expect(missing.code).toBe(EXIT.ERROR);
        expect(missing.stderr).toMatch(/^elpx-validator: /);
        expect((await run([dir])).stderr).toContain('is not a file');
    });

    test('a package without errors exits 0; --strict fails it when it has warnings', async () => {
        const result = await run([good]);
        expect(result.code).toBe(EXIT.OK);
        expect(result.stdout).toContain('good.elpx — elpx');
        expect(result.stdout).toMatch(/0 errors, \d+ warnings/);
        const report = await validateBuffer(fs.readFileSync(good));
        expect(report.counts.warnings).toBeGreaterThan(0); // no screenshot.png, at least
        expect(report.verdict).toBe('valid-with-warnings');
        expect((await run([good, '--strict'])).code).toBe(EXIT.INVALID);
    });

    test('malformed XML is invalid and names the rule', async () => {
        const result = await run([broken]);
        expect(result.code).toBe(EXIT.INVALID);
        expect(result.stdout).toContain('INVALID');
        expect(result.stdout).toMatch(/ERROR {2}XML001/);
    });

    test('a file that is not a ZIP is invalid with PKG001', async () => {
        const result = await run([notZip, '--json']);
        expect(result.code).toBe(EXIT.INVALID);
        expect(JSON.parse(result.stdout)).toMatchObject({
            file: 'not-a-zip.elpx',
            verdict: 'invalid',
            findings: [{ code: 'PKG001', severity: 'error' }]
        });
    });

    test('a legacy .elp is recognised: metadata only, with a compatibility note', async () => {
        const legacy = path.join(dir, 'old.elp');
        const xml = '<instance><dictionary><string value="_title"/><unicode value="Curso antiguo"/></dictionary></instance>';
        fs.writeFileSync(legacy, await elpx({ 'contentv3.xml': xml }));
        const report = JSON.parse((await run([legacy, '--json'])).stdout);
        expect(report.format).toBe('elp');
        expect(report.findings.map((f) => f.code)).toContain('COMPAT001');
        expect(report.pages).toEqual([]);
    });

    test('a ZIP without a manifest is invalid with PKG002', async () => {
        const empty = path.join(dir, 'empty.elpx');
        fs.writeFileSync(empty, await elpx({ 'readme.txt': 'nothing here' }));
        const result = await run([empty, '--json']);
        expect(result.code).toBe(EXIT.INVALID);
        expect(JSON.parse(result.stdout)).toMatchObject({ format: 'unknown', verdict: 'invalid' });
        expect(JSON.parse(result.stdout).findings.map((f) => f.code)).toContain('PKG002');
    });

    test('--json prints one report, or an array for several files', async () => {
        const one = JSON.parse((await run([good, '--json'])).stdout);
        expect(one).toMatchObject({ file: 'good.elpx', format: 'elpx', pages: ['Inicio'] });
        expect(one.metadata.properties.pp_title).toBe('Curso');
        expect(one.edia).toBeUndefined();

        const many = await run([good, broken, '--json']);
        expect(many.code).toBe(EXIT.INVALID);
        expect(JSON.parse(many.stdout).map((r) => r.verdict)).toEqual(['valid-with-warnings', 'invalid']);
    });

    test('--edia adds the 48 criteria and their tally', async () => {
        const { edia } = JSON.parse((await run([good, '--json', '--edia'])).stdout);
        expect(edia.criteria).toHaveLength(48);
        expect(edia.green + edia.orange + edia.red).toBe(48);
        expect((await run([good, '--edia'])).stdout).toMatch(/EDIA: \d+ compliant/);
    });

    test('--lang es (or LANG) localises the text; --all lists the informational findings', async () => {
        const es = await run([broken, '--lang', 'es']);
        expect(es.stdout).toContain('NO VÁLIDO');
        expect((await run([broken], { LANG: 'es_ES.UTF-8' })).stdout).toContain('NO VÁLIDO');
        expect((await run([good])).stdout).not.toContain('INFO ');
        expect((await run([good, '--all'])).stdout).toContain('INFO ');
    });

    test('-o writes the report to a file and prints nothing', async () => {
        const target = path.join(dir, 'report.json');
        const result = await run([good, '--json', '-o', target]);
        expect(result.stdout).toBe('');
        expect(JSON.parse(fs.readFileSync(target, 'utf8')).file).toBe('good.elpx');
    });

    test('colours only when the terminal takes them', async () => {
        let stdout = '';
        const io = { stdout: (text) => { stdout += text; }, stderr: () => {}, env: {}, color: true };
        await main([broken], io);
        expect(stdout).toContain('\x1b[31m');
        stdout = '';
        await main([broken, '--no-color'], io);
        expect(stdout).not.toContain('\x1b[');
    });

    test('the bin script runs in plain Node, quietly, and sets the exit status', () => {
        const bin = path.resolve(__dirname, '../bin/elpx-validator.js');
        const run = (args) => {
            try {
                return { status: 0, stdout: execFileSync(process.execPath, [bin].concat(args), { encoding: 'utf8', stdio: 'pipe' }) };
            } catch (error) {
                return { status: error.status, stdout: error.stdout, stderr: error.stderr };
            }
        };
        expect(run(['--version'])).toEqual({ status: 0, stdout: pkg.version + '\n' });
        const invalid = run([broken]);
        expect(invalid.status).toBe(1);
        expect(invalid.stderr).toBe(''); // no Node warnings leaking into the output
    });
});
