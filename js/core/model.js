/**
 * Normalized project model extracted from a parsed content.xml.
 *
 * The model provides a structured, easy-to-validate representation
 * of the ODE project: pages, blocks, components, metadata, and
 * asset references.
 */
(function (global, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        global.ELPXModel = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /* ------------------------------------------------------------------ */
    /*  Helper: read a direct child element's text content                */
    /* ------------------------------------------------------------------ */

    function childText(node, tagName) {
        var child = node.getElementsByTagName(tagName)[0];
        return child && child.textContent ? child.textContent.trim() : '';
    }

    /* ------------------------------------------------------------------ */
    /*  Extract key/value maps                                            */
    /* ------------------------------------------------------------------ */

    function extractKeyValueMap(xmlDoc, wrapperTag, itemTag) {
        var map = {};
        var nodes = Array.from(xmlDoc.getElementsByTagName(itemTag));
        nodes.forEach(function (node) {
            var keyNode = node.getElementsByTagName('key')[0];
            if (!keyNode || !keyNode.textContent) return;
            var valueNode = node.getElementsByTagName('value')[0];
            var key = keyNode.textContent.trim();
            var value = valueNode && valueNode.textContent ? valueNode.textContent.trim() : '';
            if (key) map[key] = value;
        });
        return map;
    }

    /* ------------------------------------------------------------------ */
    /*  Extract properties from odeNavStructureProperties, etc.           */
    /* ------------------------------------------------------------------ */

    function extractProperties(containerNode, propertyTag) {
        var props = {};
        if (!containerNode) return props;
        var items = containerNode.getElementsByTagName(propertyTag);
        for (var i = 0; i < items.length; i++) {
            var keyNode = items[i].getElementsByTagName('key')[0];
            if (!keyNode || !keyNode.textContent) continue;
            var valueNode = items[i].getElementsByTagName('value')[0];
            var key = keyNode.textContent.trim();
            var value = valueNode && valueNode.textContent ? valueNode.textContent.trim() : '';
            if (key) props[key] = value;
        }
        return props;
    }

    /* ------------------------------------------------------------------ */
    /*  Build the project model from a parsed xmlDoc                      */
    /* ------------------------------------------------------------------ */

    function buildModel(xmlDoc) {
        if (!xmlDoc || !xmlDoc.documentElement) {
            return null;
        }

        var root = xmlDoc.documentElement;
        var model = {
            rootTag: root.tagName || root.localName || '',
            namespace: root.namespaceURI || root.getAttribute('xmlns') || '',
            version: root.getAttribute('version') || '',
            resources: extractKeyValueMap(xmlDoc, 'odeResources', 'odeResource'),
            properties: extractKeyValueMap(xmlDoc, 'odeProperties', 'odeProperty'),
            pages: [],
            allPageIds: new Set(),
            allBlockIds: new Set(),
            allIdeviceIds: new Set(),
            componentsByPage: {},
            componentsByBlock: {}
        };

        // Detect root child element ordering
        var rootChildren = [];
        var childNodes = root.childNodes;
        for (var i = 0; i < childNodes.length; i++) {
            var n = childNodes[i];
            if (n.nodeType === 1) { // Element node
                rootChildren.push(n.localName || n.tagName);
            }
        }
        model.rootChildOrder = rootChildren;

        // Extract userPreferences if present
        var userPrefs = root.getElementsByTagName('userPreferences')[0];
        if (userPrefs) {
            model.userPreferences = extractProperties(userPrefs, 'userPreference');
        } else {
            model.userPreferences = {};
        }

        // Extract pages
        var navStructures = Array.from(xmlDoc.getElementsByTagName('odeNavStructure'));
        navStructures.forEach(function (navNode) {
            var page = extractPage(navNode);
            model.pages.push(page);
            model.allPageIds.add(page.odePageId);

            page.blocks.forEach(function (block) {
                model.allBlockIds.add(block.odeBlockId);
                block.components.forEach(function (comp) {
                    model.allIdeviceIds.add(comp.odeIdeviceId);
                    // Index components by page/block
                    if (!model.componentsByPage[comp.odePageId]) {
                        model.componentsByPage[comp.odePageId] = [];
                    }
                    model.componentsByPage[comp.odePageId].push(comp);
                    if (!model.componentsByBlock[comp.odeBlockId]) {
                        model.componentsByBlock[comp.odeBlockId] = [];
                    }
                    model.componentsByBlock[comp.odeBlockId].push(comp);
                });
            });
        });

        return model;
    }

    function extractPage(navNode) {
        var page = {
            odePageId: childText(navNode, 'odePageId'),
            pageName: childText(navNode, 'pageName'),
            odeParentPageId: childText(navNode, 'odeParentPageId'),
            order: childText(navNode, 'odeNavStructureOrder') || childText(navNode, 'odeNavStructureSyncOrder'),
            properties: {},
            blocks: []
        };

        // Extract page properties
        var propsContainer = navNode.getElementsByTagName('odeNavStructureProperties')[0];
        if (propsContainer) {
            page.properties = extractProperties(propsContainer, 'odeNavStructureProperty');
        }

        // Extract blocks
        var blockNodes = navNode.getElementsByTagName('odePagStructure');
        for (var i = 0; i < blockNodes.length; i++) {
            page.blocks.push(extractBlock(blockNodes[i], page.odePageId));
        }

        return page;
    }

    function extractBlock(blockNode, containingPageId) {
        var block = {
            odePageId: childText(blockNode, 'odePageId'),
            odeBlockId: childText(blockNode, 'odeBlockId'),
            blockName: childText(blockNode, 'blockName'),
            iconName: childText(blockNode, 'iconName'),
            order: childText(blockNode, 'odePagStructureOrder'),
            containingPageId: containingPageId,
            properties: {},
            components: []
        };

        var propsContainer = blockNode.getElementsByTagName('odePagStructureProperties')[0];
        if (propsContainer) {
            block.properties = extractProperties(propsContainer, 'odePagStructureProperty');
        }

        var compNodes = blockNode.getElementsByTagName('odeComponent');
        for (var i = 0; i < compNodes.length; i++) {
            block.components.push(extractComponent(compNodes[i], containingPageId, block.odeBlockId));
        }

        return block;
    }

    function extractComponent(compNode, containingPageId, containingBlockId) {
        var comp = {
            odePageId: childText(compNode, 'odePageId'),
            odeBlockId: childText(compNode, 'odeBlockId'),
            odeIdeviceId: childText(compNode, 'odeIdeviceId'),
            odeIdeviceTypeName: childText(compNode, 'odeIdeviceTypeName'),
            htmlView: childText(compNode, 'htmlView'),
            jsonProperties: childText(compNode, 'jsonProperties'),
            order: childText(compNode, 'odeComponentsOrder'),
            containingPageId: containingPageId,
            containingBlockId: containingBlockId,
            properties: {}
        };

        var propsContainer = compNode.getElementsByTagName('odeComponentsProperties')[0];
        if (propsContainer) {
            comp.properties = extractProperties(propsContainer, 'odeComponentsProperty');
        }

        return comp;
    }

    /* ------------------------------------------------------------------ */
    /*  Public API                                                        */
    /* ------------------------------------------------------------------ */

    return {
        buildModel: buildModel,
        childText: childText
    };
});
