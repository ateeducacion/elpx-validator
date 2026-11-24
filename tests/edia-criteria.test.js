const { getSections, evaluateEdiaCriteria } = require('../js/edia/edia-criteria');

describe('EDIA criteria', () => {
    test('48 criteria with unique ids, each in a known section', () => {
        const criteria = evaluateEdiaCriteria(null);
        const sections = getSections().map((s) => s.key);
        expect(criteria).toHaveLength(48);
        expect(new Set(criteria.map((c) => c.id)).size).toBe(48);
        criteria.forEach((c) => {
            expect(sections).toContain(c.section);
            expect(['automatic', 'heuristic', 'manual']).toContain(c.validationType);
            expect(['green', 'orange', 'red']).toContain(c.status);
            expect(c.title).toBeTruthy();
        });
    });

    test('manual criteria are never reported as compliant', () => {
        evaluateEdiaCriteria(null)
            .filter((c) => c.validationType === 'manual')
            .forEach((c) => expect([c.id, c.status]).toEqual([c.id, 'orange']));
    });

    test('cover metadata turns its criteria green', () => {
        const status = (properties) => {
            const report = { metadata: { properties: properties }, findings: [], model: null };
            const byId = {};
            evaluateEdiaCriteria(report).forEach((c) => {
                byId[c.id] = c.status;
            });
            return byId;
        };
        const empty = status({});
        const filled = status({
            pp_title: 'Curso',
            pp_author: 'ATE',
            pp_lang: 'es',
            pp_description: 'Un curso de prueba sobre volcanes'
        });
        ['EDIA-COV-01', 'EDIA-COV-02', 'EDIA-COV-03', 'EDIA-COV-04'].forEach((id) => {
            expect([id, empty[id]]).toEqual([id, 'red']);
            expect([id, filled[id]]).toEqual([id, 'green']);
        });
    });
});
