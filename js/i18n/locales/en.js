(function (global, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        global.ELPXI18nEn = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    return {
        app: {
            title: 'eXeLearning Package Validator',
            heading: 'eXeLearning Package Validator',
            subtitleHtml: 'Validate the structure of your <code>.elp</code> or <code>.elpx</code> projects directly in your browser.',
            githubRibbonAriaLabel: 'Fork me on GitHub'
        },
        common: {
            language: 'Language',
            english: 'English',
            spanish: 'Español',
            notAvailable: '—',
            untitled: '(untitled)',
            unknown: 'Unknown',
            showPageTitles: 'Show page titles ({count})',
            page: 'page',
            pages: 'pages',
            block: 'block',
            blocks: 'blocks',
            component: 'component',
            components: 'components'
        },
        tabs: {
            overview: 'Overview',
            findings: 'Findings',
            pages: 'Pages',
            idevices: 'iDevices',
            assets: 'Assets',
            preview: 'Preview',
            edia: '🎓 EDIA Validation'
        },
        upload: {
            ariaLabel: 'Upload .elp, .elpx, or .zip file',
            titleHtml: 'Drag &amp; drop your <strong>.elp</strong>, <strong>.elpx</strong>, or <strong>.zip</strong> file here',
            subtitle: 'or click to choose a file from your device'
        },
        summary: {
            errorsTitle: 'Errors',
            warningsTitle: 'Warnings',
            infoTitle: 'Info',
            format: {
                elpx: 'Modern ELPX',
                elp: 'Legacy ELP',
                unknown: 'Unknown'
            },
            validationResults: 'Validation results:'
        },
        metadata: {
            packageDetails: 'Package details',
            fileSize: 'File size',
            title: 'Title',
            author: 'Author',
            language: 'Language',
            description: 'Description',
            license: 'License',
            version: 'Version',
            identifier: 'Identifier',
            showRawMetadata: 'Show raw metadata',
            properties: 'Properties',
            resources: 'Resources'
        },
        checklist: {
            runningCheck: 'Running check',
            zip: {
                label: 'Verifying ZIP archive integrity',
                labelHtml: 'Verifying ZIP archive integrity',
                success: 'The archive was loaded successfully.',
                error: 'The file is not a valid ZIP archive or is corrupted.'
            },
            contentXml: {
                label: 'Looking for manifest',
                labelHtml: 'Looking for manifest (<code>content.xml</code> / <code>contentv3.xml</code>)',
                legacyFound: 'content.xml is missing, but legacy contentv3.xml was found. This package was created with an eXeLearning version earlier than 3.0.',
                found: 'Found content.xml in the package.',
                missing: 'Neither content.xml nor legacy contentv3.xml were found.',
                validationFailed: 'Validation failed: {message}'
            },
            folders: {
                label: 'Checking recommended resource folders',
                labelHtml: 'Checking recommended resource folders',
                recommendedMissing: 'Recommended resource folders were not found.',
                detected: '{name} detected'
            },
            xmlWellFormed: {
                label: 'Validating XML syntax',
                labelHtml: 'Validating <code>content.xml</code> syntax',
                wellFormed: '{manifest} is well-formed.'
            },
            rootElement: {
                label: 'Checking root element',
                labelHtml: 'Checking root element',
                success: 'The root element is <ode>.',
                skipped: 'Legacy manifest format detected. Structural checks skipped.'
            },
            navStructures: {
                label: 'Looking for navigation structure',
                labelHtml: 'Verifying navigation structures',
                success: 'Navigation structures found.',
                skipped: 'Skipped: legacy eXeLearning manifests (contentv3.xml) do not expose modern navigation structures.'
            },
            pages: {
                label: 'Checking for pages',
                labelHtml: 'Checking for pages',
                found: 'Found {count} {pageLabel}.',
                empty: 'No pages found. The project appears empty.',
                skipped: 'Skipped: legacy eXeLearning manifests (contentv3.xml) do not expose modern navigation structures.'
            },
            structure: {
                label: 'Validating internal structure',
                labelHtml: 'Validating internal structure',
                error: '{count} structural {issueLabel} found. See the Findings tab for details.',
                warning: '{count} structural {warningLabel}. See the Findings tab.',
                success: 'The internal XML structure matches the expected layout.',
                skipped: 'Skipped: legacy manifest layout is incompatible with modern structural rules.'
            },
            resources: {
                label: 'Checking linked resources',
                labelHtml: 'Checking linked resources',
                missing: 'Missing assets: {paths} — see Assets tab.',
                allPresent: 'All {count} referenced {assetLabel} are present.',
                noneDetected: 'No linked resources were detected.',
                skipped: 'Resource validation is unavailable for legacy manifests.'
            },
            issue: 'issue',
            issues: 'issues',
            warningSingle: 'warning',
            warningPlural: 'warnings',
            assetSingle: 'asset',
            assetPlural: 'assets'
        },
        filters: {
            filter: 'Filter:',
            category: 'Category:',
            show: 'Show:',
            page: 'Page:',
            allSeverities: 'All severities',
            errorsOnly: 'Errors only',
            warningsOnly: 'Warnings only',
            infoOnly: 'Info only',
            allCategories: 'All categories',
            allAssets: 'All assets',
            referenced: 'Referenced',
            orphaned: 'Orphaned / unreferenced',
            missing: 'Missing (referenced but absent)'
        },
        severity: {
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        },
        category: {
            package: 'Package',
            xml: 'XML / Schema',
            navigation: 'Navigation',
            metadata: 'Metadata',
            idevice: 'iDevice',
            asset: 'Asset',
            compatibility: 'Compatibility'
        },
        findings: {
            empty: 'No findings to display.',
            filteredEmpty: 'No findings match the current filters.',
            location: 'Location',
            suggestionPrefix: '💡 ',
            PKG001: { message: 'Invalid ZIP archive' },
            PKG002: { message: 'Missing content.xml manifest' },
            PKG003: { message: 'Missing content.dtd' },
            PKG004: { message: 'Missing index.html' },
            PKG005: { message: 'Missing html/ directory' },
            PKG006: { message: 'Missing content/resources/ directory' },
            PKG007: { message: 'Missing theme/ directory' },
            PKG008: { message: 'Missing libs/ directory' },
            PKG009: { message: 'Missing idevices/ directory' },
            PKG010: { message: 'Path traversal detected' },
            PKG011: { message: 'Absolute path in archive' },
            PKG012: { message: 'Suspicious filename' },
            PKG013: { message: 'Duplicate normalized paths' },
            PKG014: { message: 'Legacy contentv3.xml detected' },
            XML001: { message: 'XML is not well-formed' },
            XML002: { message: 'Root element is not <ode>' },
            XML003: { message: 'Incorrect or missing namespace' },
            XML004: { message: 'Missing version attribute on <ode>' },
            XML005: { message: 'Missing DOCTYPE declaration' },
            XML006: { message: 'Unexpected root child ordering' },
            XML007: { message: 'Missing <odeNavStructures>' },
            XML008: { message: 'Unknown root child element' },
            NAV001: { message: 'No pages found' },
            NAV002: { message: 'Missing page ID' },
            NAV003: { message: 'Missing page name' },
            NAV004: { message: 'Missing page order' },
            NAV005: { message: 'Duplicate page ID' },
            NAV006: { message: 'Dangling parent page reference' },
            NAV007: { message: 'Page hierarchy cycle detected' },
            NAV008: { message: 'Inconsistent sibling order' },
            NAV009: { message: 'Missing block ID' },
            NAV010: { message: 'Duplicate block ID' },
            NAV011: { message: 'Missing block name' },
            NAV012: { message: 'Component page ID mismatch' },
            NAV013: { message: 'Component block ID mismatch' },
            NAV014: { message: 'Missing component iDevice ID' },
            NAV015: { message: 'Duplicate iDevice ID' },
            NAV016: { message: 'Missing iDevice type name' },
            NAV017: { message: 'Missing htmlView' },
            NAV018: { message: 'Missing jsonProperties' },
            NAV019: { message: 'Non-numeric order value' },
            NAV020: { message: 'Missing component order' },
            NAV021: { message: 'Component references non-existent page' },
            NAV022: { message: 'Component references non-existent block' },
            META001: { message: 'Missing odeId' },
            META002: { message: 'Missing odeVersionId' },
            META003: { message: 'Missing eXeVersion' },
            META004: { message: 'Invalid odeId format' },
            META005: { message: 'Invalid odeVersionId format' },
            META006: { message: 'Missing project title' },
            IDEV001: { message: 'Unknown iDevice type' },
            IDEV002: { message: 'jsonProperties not parseable' },
            IDEV003: { message: 'Empty htmlView' },
            IDEV004: { message: 'Image iDevice missing image references' },
            IDEV005: { message: 'External website missing URL' },
            IDEV006: { message: 'Download iDevice inconsistency' },
            ASSET001: { message: 'Referenced asset missing from package' },
            ASSET002: { message: 'Orphaned asset' },
            ASSET003: { message: 'Reference outside allowed asset paths' },
            ASSET004: { message: 'Path traversal in asset reference' },
            ASSET005: { message: 'Casing mismatch in asset reference' },
            COMPAT001: { message: 'Legacy .elp package detected' },
            COMPAT002: { message: 'Modern .elpx package detected' }
        },
        pages: {
            empty: 'No pages found in this package.',
            orphaned: 'Orphaned pages (dangling parent reference)'
        },
        idevice: {
            empty: 'No iDevice information available.',
            total: 'Total',
            knownDeep: 'Known (deep)',
            knownShallow: 'Known (shallow)',
            unknown: 'Unknown',
            parseErrors: 'Parse errors',
            typesUsed: 'Types used',
            type: 'Type',
            count: 'Count',
            status: 'Status',
            statuses: {
                missing: 'missing',
                unknown: 'unknown',
                'deep-validated': 'deep-validated',
                'shallow-validated': 'shallow-validated',
                'package-local': 'package-local'
            }
        },
        assets: {
            totalFiles: 'Total files',
            referenced: 'Referenced',
            missing: 'Missing',
            orphaned: 'Orphaned',
            path: 'Path',
            type: 'Type',
            extension: 'Extension',
            status: 'Status',
            preview: 'Preview',
            empty: 'No assets found.',
            missingEmpty: 'No missing assets detected.',
            showingLimit: 'Showing {shown} of {total} assets…',
            statuses: {
                missing: 'missing',
                referenced: 'referenced',
                orphaned: 'orphaned',
                structural: 'structural'
            }
        },
        preview: {
            placeholder: '— select a page —',
            frameTitle: 'Page preview',
            errorLoading: 'Error loading preview: {message}'
        },
        footer: {
            processing: 'All processing happens in your browser. No files are uploaded to a server.',
            builtWith: 'Built with JSZip and vanilla JavaScript.',
            creditsHtml: '&copy; 2025 &ndash; <a href="https://www3.gobiernodecanarias.org/medusa/ecoescuela/ate" target="_blank" rel="noopener noreferrer">Área de Tecnología Educativa</a> &ndash; Gobierno de Canarias'
        },
        edia: {
            tabAriaLabel: 'Validation sections',
            hero: {
                title: 'EDIA Quality Dashboard',
                subtitleHtml: 'This dashboard evaluates your eXeLearning resource against the <strong>EDIA / CEDEC</strong> open educational resource quality checklist. Some criteria are checked automatically from the package; others require human judgement and are flagged for manual review.',
                checklistLink: '🌐 EDIA Checklist (CEDEC)',
                rubricLink: '📄 Download EDIA Rubric (PDF)'
            },
            legend: {
                ariaLabel: 'Status colour legend',
                label: 'Status key:'
            },
            statuses: {
                green: 'Compliant',
                orange: 'Needs review',
                red: 'Missing'
            },
            validationTypes: {
                automatic: 'Automatic',
                heuristic: 'Heuristic',
                manual: 'Manual review'
            },
            summary: {
                totalCriteria: 'Total criteria',
                totalCriteriaDesc: 'All criteria evaluated',
                compliant: 'Compliant',
                compliantDesc: 'Criteria that are met',
                needsReview: 'Needs review',
                needsReviewDesc: 'Criteria needing attention',
                missing: 'Missing / failing',
                missingDesc: 'Criteria not met',
                readinessScore: 'Readiness score',
                readinessAria: 'Readiness {score}%',
                readinessDesc: 'Based on automatically checkable criteria'
            },
            labels: {
                detected: 'Detected:',
                recommendationPrefix: '💡'
            },
            noFile: {
                textHtml: 'Load an <strong>.elpx</strong> or <strong>.elp</strong> file using the upload area above to see your personalized EDIA quality assessment.',
                subtext: 'The criteria below are shown with placeholder statuses. They will update automatically once a file has been loaded.'
            },
            sections: {
                cover: 'Cover / Identification',
                methodology: 'Didactic Methodology',
                contents: 'Contents',
                activities: 'Activities & Tasks',
                teacher: 'Teacher Guide',
                learning: 'Learning Potential',
                adaptability: 'Adaptability',
                interactivity: 'Interactivity',
                technical: 'Technical Requirements',
                format: 'Format & Style',
                accessibility: 'Accessibility',
                licensing: 'Licensing & Copyright',
                inclusive: 'Inclusive Communication'
            }
        }
    };
});
