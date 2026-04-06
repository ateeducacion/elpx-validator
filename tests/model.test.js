/**
 * Tests for the project model builder (js/core/model.js).
 */
const { buildModel } = require('../js/core/model');
const { parseContentXml } = require('../js/validator');

describe('Project model builder', () => {
    const fullXml = `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE ode SYSTEM "content.dtd">
    <ode xmlns="http://www.intef.es/xsd/ode" version="2.0">
        <odeResources>
            <odeResource><key>odeId</key><value>20251125215855LURLBW</value></odeResource>
            <odeResource><key>odeVersionId</key><value>20251125220103ABCXYZ</value></odeResource>
            <odeResource><key>eXeVersion</key><value>v3.0.0</value></odeResource>
        </odeResources>
        <odeProperties>
            <odeProperty><key>pp_title</key><value>Test Project</value></odeProperty>
            <odeProperty><key>pp_author</key><value>Author</value></odeProperty>
        </odeProperties>
        <odeNavStructures>
            <odeNavStructure>
                <odePageId>20251125215855PAGE01</odePageId>
                <pageName>Home</pageName>
                <odeParentPageId></odeParentPageId>
                <odeNavStructureOrder>1</odeNavStructureOrder>
                <odePagStructures>
                    <odePagStructure>
                        <odePageId>20251125215855PAGE01</odePageId>
                        <odeBlockId>20251125215855BLK001</odeBlockId>
                        <blockName>Main Block</blockName>
                        <odeComponents>
                            <odeComponent>
                                <odePageId>20251125215855PAGE01</odePageId>
                                <odeBlockId>20251125215855BLK001</odeBlockId>
                                <odeIdeviceId>20251125215855IDEV01</odeIdeviceId>
                                <odeIdeviceTypeName>text</odeIdeviceTypeName>
                                <htmlView>&lt;p&gt;Hello&lt;/p&gt;</htmlView>
                                <jsonProperties>{"textTextarea":"Hello"}</jsonProperties>
                                <odeComponentsOrder>1</odeComponentsOrder>
                            </odeComponent>
                        </odeComponents>
                    </odePagStructure>
                </odePagStructures>
            </odeNavStructure>
            <odeNavStructure>
                <odePageId>20251125215855PAGE02</odePageId>
                <pageName>About</pageName>
                <odeParentPageId>20251125215855PAGE01</odeParentPageId>
                <odeNavStructureOrder>2</odeNavStructureOrder>
                <odePagStructures></odePagStructures>
            </odeNavStructure>
        </odeNavStructures>
    </ode>`;

    test('builds a model from valid content.xml', () => {
        const { document } = parseContentXml(fullXml);
        const model = buildModel(document);

        expect(model).not.toBeNull();
        expect(model.rootTag).toMatch(/ode/i);
        expect(model.namespace).toBe('http://www.intef.es/xsd/ode');
        expect(model.version).toBe('2.0');
    });

    test('extracts resources correctly', () => {
        const { document } = parseContentXml(fullXml);
        const model = buildModel(document);

        expect(model.resources.odeId).toBe('20251125215855LURLBW');
        expect(model.resources.odeVersionId).toBe('20251125220103ABCXYZ');
        expect(model.resources.eXeVersion).toBe('v3.0.0');
    });

    test('extracts properties correctly', () => {
        const { document } = parseContentXml(fullXml);
        const model = buildModel(document);

        expect(model.properties.pp_title).toBe('Test Project');
        expect(model.properties.pp_author).toBe('Author');
    });

    test('extracts pages correctly', () => {
        const { document } = parseContentXml(fullXml);
        const model = buildModel(document);

        expect(model.pages).toHaveLength(2);
        expect(model.pages[0].odePageId).toBe('20251125215855PAGE01');
        expect(model.pages[0].pageName).toBe('Home');
        expect(model.pages[1].odePageId).toBe('20251125215855PAGE02');
        expect(model.pages[1].odeParentPageId).toBe('20251125215855PAGE01');
    });

    test('extracts blocks and components', () => {
        const { document } = parseContentXml(fullXml);
        const model = buildModel(document);

        expect(model.pages[0].blocks).toHaveLength(1);
        expect(model.pages[0].blocks[0].odeBlockId).toBe('20251125215855BLK001');
        expect(model.pages[0].blocks[0].components).toHaveLength(1);
        expect(model.pages[0].blocks[0].components[0].odeIdeviceTypeName).toBe('text');
    });

    test('tracks all IDs in sets', () => {
        const { document } = parseContentXml(fullXml);
        const model = buildModel(document);

        expect(model.allPageIds.has('20251125215855PAGE01')).toBe(true);
        expect(model.allPageIds.has('20251125215855PAGE02')).toBe(true);
        expect(model.allBlockIds.has('20251125215855BLK001')).toBe(true);
        expect(model.allIdeviceIds.has('20251125215855IDEV01')).toBe(true);
    });

    test('tracks root child element ordering', () => {
        const { document } = parseContentXml(fullXml);
        const model = buildModel(document);

        expect(model.rootChildOrder).toEqual(['odeResources', 'odeProperties', 'odeNavStructures']);
    });

    test('returns null for invalid document', () => {
        expect(buildModel(null)).toBeNull();
    });
});
