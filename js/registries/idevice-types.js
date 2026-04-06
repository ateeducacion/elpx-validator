/**
 * Registry of known eXeLearning iDevice types.
 *
 * Types are sourced from the ELPX format documentation at
 * https://github.com/exelearning/exelearning/blob/main/doc/elpx-format.md
 *
 * Each entry describes:
 *  - label          human-readable name
 *  - group          functional grouping
 *  - requiresImages whether the type is expected to reference images
 *  - requiresUrl    whether the type should contain a URL
 *  - deep           true when type-specific validation is implemented
 */
(function (global, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        global.ELPXIdeviceRegistry = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var KNOWN_TYPES = Object.freeze({
        'text':                            { label: 'Text',                           group: 'content',  requiresImages: false, requiresUrl: false, deep: true  },
        'form':                            { label: 'Form',                           group: 'content',  requiresImages: false, requiresUrl: false, deep: false },
        'matching':                        { label: 'Matching',                       group: 'activity', requiresImages: false, requiresUrl: false, deep: false },
        'sort':                            { label: 'Sort',                           group: 'activity', requiresImages: false, requiresUrl: false, deep: false },
        'classify':                        { label: 'Classify',                       group: 'activity', requiresImages: false, requiresUrl: false, deep: false },
        'guess':                           { label: 'Guess',                          group: 'activity', requiresImages: false, requiresUrl: false, deep: false },
        'checklist':                       { label: 'Checklist',                      group: 'activity', requiresImages: false, requiresUrl: false, deep: false },
        'crossword':                       { label: 'Crossword',                      group: 'activity', requiresImages: false, requiresUrl: false, deep: false },
        'image-gallery':                   { label: 'Image Gallery',                  group: 'media',    requiresImages: true,  requiresUrl: false, deep: true  },
        'magnifier':                       { label: 'Magnifier',                      group: 'media',    requiresImages: true,  requiresUrl: false, deep: true  },
        'casestudy':                       { label: 'Case Study',                     group: 'content',  requiresImages: false, requiresUrl: false, deep: false },
        'external-website':                { label: 'External Website',               group: 'embed',    requiresImages: false, requiresUrl: true,  deep: true  },
        'rubric':                          { label: 'Rubric',                         group: 'content',  requiresImages: false, requiresUrl: false, deep: false },
        'trueorfalse':                     { label: 'True or False',                  group: 'quiz',     requiresImages: false, requiresUrl: false, deep: false },
        'quick-questions':                 { label: 'Quick Questions',                group: 'quiz',     requiresImages: false, requiresUrl: false, deep: false },
        'quick-questions-multiple-choice': { label: 'Quick Questions (Multiple Choice)',  group: 'quiz',     requiresImages: false, requiresUrl: false, deep: false },
        'complete':                        { label: 'Complete (Fill in the Blanks)',   group: 'activity', requiresImages: false, requiresUrl: false, deep: false },
        'download-source-file':            { label: 'Download Source File',            group: 'system',   requiresImages: false, requiresUrl: false, deep: true  },
        'udl-content':                     { label: 'UDL Content',                    group: 'content',  requiresImages: false, requiresUrl: false, deep: false },
        'scrambled-list':                  { label: 'Scrambled List',                 group: 'activity', requiresImages: false, requiresUrl: false, deep: false },
        'interactive-video':               { label: 'Interactive Video',              group: 'media',    requiresImages: false, requiresUrl: false, deep: false },
        'dialogue':                        { label: 'Dialogue',                       group: 'content',  requiresImages: false, requiresUrl: false, deep: false },
        'accordion':                       { label: 'Accordion',                      group: 'content',  requiresImages: false, requiresUrl: false, deep: false },
        'tabs':                            { label: 'Tabs',                           group: 'content',  requiresImages: false, requiresUrl: false, deep: false },
        'timeline':                        { label: 'Timeline',                       group: 'content',  requiresImages: false, requiresUrl: false, deep: false },
        'carousel':                        { label: 'Carousel',                       group: 'media',    requiresImages: false, requiresUrl: false, deep: false },
        'quiz-score-report':               { label: 'Quiz Score Report',              group: 'quiz',     requiresImages: false, requiresUrl: false, deep: false }
    });

    var GROUPS = Object.freeze({
        content:  { label: 'Content',    description: 'Rich content iDevices' },
        activity: { label: 'Activities', description: 'Interactive learning activities' },
        media:    { label: 'Media',      description: 'Image / audio / video iDevices' },
        embed:    { label: 'Embed',      description: 'Embedded external content' },
        quiz:     { label: 'Quiz',       description: 'Question-based iDevices' },
        system:   { label: 'System',     description: 'System-level iDevices' }
    });

    /**
     * Look up a type name in the registry.
     * @param {string} typeName
     * @returns {{ known: boolean, definition: object|null, status: string }}
     */
    function lookup(typeName) {
        if (!typeName) {
            return { known: false, definition: null, status: 'missing' };
        }
        var normalized = typeName.toLowerCase().trim();
        var definition = KNOWN_TYPES[normalized] || null;
        if (definition) {
            return {
                known: true,
                definition: definition,
                status: definition.deep ? 'deep-validated' : 'shallow-validated'
            };
        }
        return { known: false, definition: null, status: 'unknown' };
    }

    /**
     * Look up a type name, falling back to checking if the iDevice
     * directory exists in the package (package-local type).
     *
     * @param {string} typeName
     * @param {object} [zipFiles] - The zip.files map to check for idevices/<type>/
     * @returns {{ known: boolean, definition: object|null, status: string }}
     */
    function lookupOrLocal(typeName, zipFiles) {
        var result = lookup(typeName);
        if (result.known) return result;
        if (!typeName) return result;

        // Check if idevices/<type>/ directory exists in the ZIP
        if (zipFiles) {
            var prefix = 'idevices/' + typeName.toLowerCase().trim() + '/';
            var found = Object.keys(zipFiles).some(function (name) {
                return name.toLowerCase().startsWith(prefix);
            });
            if (found) {
                return { known: true, definition: null, status: 'package-local' };
            }
        }

        return result;
    }

    /**
     * Return array of all known type names.
     * @returns {string[]}
     */
    function allKnownTypes() {
        return Object.keys(KNOWN_TYPES);
    }

    return {
        KNOWN_TYPES: KNOWN_TYPES,
        GROUPS: GROUPS,
        lookup: lookup,
        lookupOrLocal: lookupOrLocal,
        allKnownTypes: allKnownTypes
    };
});
