/**
 * EDIA Validation – Criteria definitions and evaluation logic.
 *
 * This module defines the full set of EDIA / CEDEC open educational resource
 * quality criteria and evaluates them against a parsed validator report.
 *
 * EDIA checklist reference:
 *   https://cedec.intef.es/recursos/criterios-edia/
 *
 * Each criterion object has the following fields:
 *   id            – unique identifier (e.g. "EDIA-COV-01")
 *   section       – section key (e.g. "cover")
 *   sectionLabel  – human-readable section name
 *   sectionIcon   – emoji icon for the section
 *   title         – short criterion title
 *   description   – plain-language explanation of the criterion
 *   validationType – "automatic" | "heuristic" | "manual"
 *   status        – "green" | "orange" | "red" (computed at evaluation time)
 *   statusLabel   – "Compliant" | "Needs review" | "Missing"
 *   evidence      – string describing what was detected (may be empty)
 *   recommendation – actionable improvement hint
 *   details       – extended explanation of the current finding
 *   links         – array of { label, url } for external resources
 *
 * ----------------------------------------------------------------------------
 * NOTE FOR FUTURE INTEGRATION
 * When connecting real automated rule results, update the `evaluate` functions
 * inside evaluateEdiaCriteria(). Each criterion's status, evidence, and details
 * should be derived from the validator report fields (report.metadata,
 * report.findings, report.ideviceSummary, report.assetSummary, etc.).
 * The static definitions below serve as the authoritative registry; only the
 * evaluation logic needs to change, not the criterion objects themselves.
 * ----------------------------------------------------------------------------
 */
(function () {
    'use strict';

    /* ====================================================================
     *  Section registry
     * ==================================================================== */

    var SECTIONS = [
        { key: 'cover',        label: 'Cover / Identification',   icon: '🪪' },
        { key: 'methodology',  label: 'Didactic Methodology',     icon: '🎓' },
        { key: 'contents',     label: 'Contents',                 icon: '📚' },
        { key: 'activities',   label: 'Activities & Tasks',       icon: '✏️' },
        { key: 'teacher',      label: 'Teacher Guide',            icon: '👩‍🏫' },
        { key: 'learning',     label: 'Learning Potential',       icon: '🧠' },
        { key: 'adaptability', label: 'Adaptability',             icon: '🔄' },
        { key: 'interactivity',label: 'Interactivity',            icon: '🖱️' },
        { key: 'technical',    label: 'Technical Requirements',   icon: '⚙️' },
        { key: 'format',       label: 'Format & Style',           icon: '🎨' },
        { key: 'accessibility',label: 'Accessibility',            icon: '♿' },
        { key: 'licensing',    label: 'Licensing & Copyright',    icon: '⚖️' },
        { key: 'inclusive',    label: 'Inclusive Communication',  icon: '🤝' }
    ];

    /* ====================================================================
     *  Static criterion registry
     *  status / evidence / details are placeholders; they are replaced by
     *  evaluateEdiaCriteria() when a real report is available.
     * ==================================================================== */

    var CRITERIA_REGISTRY = [

        /* ── COVER / IDENTIFICATION ──────────────────────────────────── */
        {
            id: 'EDIA-COV-01', section: 'cover',
            title: 'Resource has a title',
            description: 'Every learning resource should have a clear, descriptive title so that learners and teachers can quickly identify its subject.',
            validationType: 'automatic',
            links: []
        },
        {
            id: 'EDIA-COV-02', section: 'cover',
            title: 'Author / creator is identified',
            description: 'The resource should credit its author(s) so that users know who created it and can contact them for questions.',
            validationType: 'automatic',
            links: []
        },
        {
            id: 'EDIA-COV-03', section: 'cover',
            title: 'Language is declared',
            description: 'Declaring the language helps learners and cataloguing systems find resources in the right language.',
            validationType: 'automatic',
            links: []
        },
        {
            id: 'EDIA-COV-04', section: 'cover',
            title: 'Short description or summary is present',
            description: 'A short abstract helps users decide whether the resource is relevant before opening it.',
            validationType: 'automatic',
            links: []
        },
        {
            id: 'EDIA-COV-05', section: 'cover',
            title: 'Target educational level is indicated',
            description: 'The resource should specify the target audience (e.g. primary, secondary, university) so it can be used appropriately.',
            validationType: 'manual',
            links: []
        },
        {
            id: 'EDIA-COV-06', section: 'cover',
            title: 'Subject / topic area is stated',
            description: 'Tagging the subject area (e.g. Mathematics, History) improves discoverability in repositories.',
            validationType: 'manual',
            links: []
        },

        /* ── DIDACTIC METHODOLOGY ─────────────────────────────────────── */
        {
            id: 'EDIA-MET-01', section: 'methodology',
            title: 'Learning objectives are stated',
            description: 'Clearly stated learning objectives help learners understand what they will achieve and let teachers align the resource with the curriculum.',
            validationType: 'manual',
            links: []
        },
        {
            id: 'EDIA-MET-02', section: 'methodology',
            title: 'Resource has a coherent didactic sequence',
            description: 'Content should be organised in a logical progression that builds knowledge step by step.',
            validationType: 'heuristic',
            links: []
        },
        {
            id: 'EDIA-MET-03', section: 'methodology',
            title: 'Resource promotes active learning',
            description: 'Good digital resources include activities that require learners to engage actively rather than just read or watch.',
            validationType: 'heuristic',
            links: []
        },
        {
            id: 'EDIA-MET-04', section: 'methodology',
            title: 'Feedback mechanisms are present',
            description: 'Learners benefit from immediate feedback on their answers or actions. This can be automatic (quiz scoring) or guidance in text.',
            validationType: 'heuristic',
            links: []
        },

        /* ── CONTENTS ─────────────────────────────────────────────────── */
        {
            id: 'EDIA-CON-01', section: 'contents',
            title: 'Content is organised into pages / sections',
            description: 'Breaking content into clearly delimited pages or sections makes it easier to navigate and digest.',
            validationType: 'automatic',
            links: []
        },
        {
            id: 'EDIA-CON-02', section: 'contents',
            title: 'Multimedia resources are used',
            description: 'Images, audio, and video make learning more engaging and help learners with different learning styles.',
            validationType: 'heuristic',
            links: []
        },
        {
            id: 'EDIA-CON-03', section: 'contents',
            title: 'Content is scientifically accurate and up to date',
            description: 'The information presented should be correct and current. This can only be verified by a domain expert.',
            validationType: 'manual',
            links: []
        },
        {
            id: 'EDIA-CON-04', section: 'contents',
            title: 'Content language is appropriate for the audience',
            description: 'The vocabulary and complexity of the language should match the target learners\' level.',
            validationType: 'manual',
            links: []
        },
        {
            id: 'EDIA-CON-05', section: 'contents',
            title: 'External links are referenced clearly',
            description: 'If the resource refers to external websites, those links should be clearly labelled and open in a new tab.',
            validationType: 'heuristic',
            links: []
        },

        /* ── ACTIVITIES & TASKS ───────────────────────────────────────── */
        {
            id: 'EDIA-ACT-01', section: 'activities',
            title: 'Interactive activities are included',
            description: 'The resource should include at least one interactive element (quiz, exercise, drag-and-drop, etc.) that actively engages learners.',
            validationType: 'heuristic',
            links: []
        },
        {
            id: 'EDIA-ACT-02', section: 'activities',
            title: 'Activities are aligned with learning objectives',
            description: 'Each activity should connect to at least one of the stated learning objectives.',
            validationType: 'manual',
            links: []
        },
        {
            id: 'EDIA-ACT-03', section: 'activities',
            title: 'Activities include clear instructions',
            description: 'Learners should be told clearly what to do in each activity without needing additional explanation from a teacher.',
            validationType: 'manual',
            links: []
        },
        {
            id: 'EDIA-ACT-04', section: 'activities',
            title: 'Variety of activity types',
            description: 'Using different types of activities (multiple choice, open answer, sorting, simulation) caters to diverse learners.',
            validationType: 'heuristic',
            links: []
        },

        /* ── TEACHER GUIDE ────────────────────────────────────────────── */
        {
            id: 'EDIA-TCH-01', section: 'teacher',
            title: 'Teacher guidance is provided',
            description: 'A teacher guide or notes section helps educators understand how to use the resource effectively in the classroom.',
            validationType: 'manual',
            links: []
        },
        {
            id: 'EDIA-TCH-02', section: 'teacher',
            title: 'Estimated duration is stated',
            description: 'Indicating the approximate time needed to complete the resource helps teachers plan their lessons.',
            validationType: 'manual',
            links: []
        },
        {
            id: 'EDIA-TCH-03', section: 'teacher',
            title: 'Curriculum alignment is indicated',
            description: 'Linking the resource to specific curriculum standards or competences increases its usability in formal education.',
            validationType: 'manual',
            links: []
        },

        /* ── LEARNING POTENTIAL ───────────────────────────────────────── */
        {
            id: 'EDIA-LRN-01', section: 'learning',
            title: 'Resource supports higher-order thinking',
            description: 'The best resources ask learners to analyse, evaluate, or create — not just recall facts.',
            validationType: 'manual',
            links: []
        },
        {
            id: 'EDIA-LRN-02', section: 'learning',
            title: 'Resource encourages collaboration or social learning',
            description: 'Activities that prompt discussion, peer review, or group work amplify learning impact.',
            validationType: 'manual',
            links: []
        },

        /* ── ADAPTABILITY ─────────────────────────────────────────────── */
        {
            id: 'EDIA-ADP-01', section: 'adaptability',
            title: 'Resource is packaged in an open, reusable format',
            description: 'The ELPX / ELP format allows the resource to be imported into any eXeLearning-compatible platform and modified by others.',
            validationType: 'automatic',
            links: []
        },
        {
            id: 'EDIA-ADP-02', section: 'adaptability',
            title: 'Content can be used independently of a specific platform',
            description: 'The resource should work without requiring a specific proprietary system or subscription.',
            validationType: 'heuristic',
            links: []
        },
        {
            id: 'EDIA-ADP-03', section: 'adaptability',
            title: 'Resource can be adapted or remixed',
            description: 'An open license and modular structure make it easy for teachers to customise the resource for their own context.',
            validationType: 'heuristic',
            links: []
        },

        /* ── INTERACTIVITY ────────────────────────────────────────────── */
        {
            id: 'EDIA-INT-01', section: 'interactivity',
            title: 'Interactive iDevices are present',
            description: 'eXeLearning iDevices such as quizzes, SCORM activities, or interactive exercises increase engagement.',
            validationType: 'automatic',
            links: []
        },
        {
            id: 'EDIA-INT-02', section: 'interactivity',
            title: 'Interactivity goes beyond passive navigation',
            description: 'Simply clicking "next page" is not enough. The resource should require the learner to respond, choose, or create.',
            validationType: 'heuristic',
            links: []
        },

        /* ── TECHNICAL REQUIREMENTS ───────────────────────────────────── */
        {
            id: 'EDIA-TEC-01', section: 'technical',
            title: 'Package integrity is valid',
            description: 'The file must be a valid ZIP archive with no corruption errors, ensuring it can be opened reliably.',
            validationType: 'automatic',
            links: []
        },
        {
            id: 'EDIA-TEC-02', section: 'technical',
            title: 'XML manifest is well-formed',
            description: 'The content.xml manifest file must be syntactically valid XML so that any eXeLearning-compatible tool can parse it.',
            validationType: 'automatic',
            links: []
        },
        {
            id: 'EDIA-TEC-03', section: 'technical',
            title: 'All referenced assets are present',
            description: 'Images, audio, and other files referenced in the resource must be included in the package. Missing assets break the learning experience.',
            validationType: 'automatic',
            links: []
        },
        {
            id: 'EDIA-TEC-04', section: 'technical',
            title: 'Resource uses modern ELPX format',
            description: 'The modern ELPX format (eXeLearning ≥ 3.0) is recommended for best compatibility with current platforms.',
            validationType: 'automatic',
            links: []
        },
        {
            id: 'EDIA-TEC-05', section: 'technical',
            title: 'No critical validation errors detected',
            description: 'The package should pass all structural validation rules without critical errors that would prevent it from loading correctly.',
            validationType: 'automatic',
            links: []
        },

        /* ── FORMAT & STYLE ───────────────────────────────────────────── */
        {
            id: 'EDIA-FMT-01', section: 'format',
            title: 'Visual layout is consistent',
            description: 'A consistent visual style (fonts, colours, spacing) across all pages creates a professional and focused learning experience.',
            validationType: 'manual',
            links: []
        },
        {
            id: 'EDIA-FMT-02', section: 'format',
            title: 'Images and media are of appropriate quality',
            description: 'Blurry images or low-quality audio negatively affect the learning experience.',
            validationType: 'manual',
            links: []
        },
        {
            id: 'EDIA-FMT-03', section: 'format',
            title: 'Text is readable and well-formatted',
            description: 'Content should use headings, lists, and white space appropriately to aid reading and comprehension.',
            validationType: 'manual',
            links: []
        },

        /* ── ACCESSIBILITY ────────────────────────────────────────────── */
        {
            id: 'EDIA-ACC-01', section: 'accessibility',
            title: 'Alternative text for images is provided',
            description: 'Every meaningful image should have descriptive alternative text so that screen reader users can access the content.',
            validationType: 'heuristic',
            links: [
                { label: 'WCAG 2.1 – Non-text content', url: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html' }
            ]
        },
        {
            id: 'EDIA-ACC-02', section: 'accessibility',
            title: 'Colour contrast is sufficient',
            description: 'Text should have sufficient contrast against its background to be readable by users with low vision or colour blindness.',
            validationType: 'manual',
            links: [
                { label: 'WCAG 2.1 – Contrast (minimum)', url: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html' }
            ]
        },
        {
            id: 'EDIA-ACC-03', section: 'accessibility',
            title: 'Content does not rely solely on colour',
            description: 'Information conveyed by colour must also be communicated through text or another visual cue.',
            validationType: 'manual',
            links: []
        },
        {
            id: 'EDIA-ACC-04', section: 'accessibility',
            title: 'Multimedia has captions or transcripts',
            description: 'Audio and video content should include captions or text transcripts for deaf or hard-of-hearing learners.',
            validationType: 'manual',
            links: []
        },
        {
            id: 'EDIA-ACC-05', section: 'accessibility',
            title: 'Resource has no flickering or rapidly flashing elements',
            description: 'Flashing or flickering content can trigger photosensitive seizures. The resource should avoid such elements.',
            validationType: 'manual',
            links: []
        },

        /* ── LICENSING & COPYRIGHT ────────────────────────────────────── */
        {
            id: 'EDIA-LIC-01', section: 'licensing',
            title: 'License is declared',
            description: 'Every open educational resource should clearly state its license so that users know how they can reuse, share, or adapt it.',
            validationType: 'automatic',
            links: [
                { label: 'Creative Commons licenses', url: 'https://creativecommons.org/licenses/' }
            ]
        },
        {
            id: 'EDIA-LIC-02', section: 'licensing',
            title: 'License allows educational reuse',
            description: 'Ideally the license should permit free use in educational contexts. Creative Commons licenses are recommended for OERs.',
            validationType: 'heuristic',
            links: [
                { label: 'Open Educational Resources guide', url: 'https://www.unesco.org/en/open-educational-resources' }
            ]
        },
        {
            id: 'EDIA-LIC-03', section: 'licensing',
            title: 'Third-party content rights are respected',
            description: 'Any images, audio, or video from external sources should either be original or used under a license that permits inclusion.',
            validationType: 'manual',
            links: []
        },

        /* ── INCLUSIVE COMMUNICATION ──────────────────────────────────── */
        {
            id: 'EDIA-INC-01', section: 'inclusive',
            title: 'Language is gender-neutral or inclusive',
            description: 'The resource should use inclusive language that does not exclude or stereotype learners based on gender.',
            validationType: 'manual',
            links: []
        },
        {
            id: 'EDIA-INC-02', section: 'inclusive',
            title: 'Images and examples reflect diversity',
            description: 'Visual materials and examples should represent a diverse range of people, backgrounds, and perspectives.',
            validationType: 'manual',
            links: []
        },
        {
            id: 'EDIA-INC-03', section: 'inclusive',
            title: 'Content avoids cultural or social bias',
            description: 'The resource should be respectful of different cultures, religions, and social groups.',
            validationType: 'manual',
            links: []
        }
    ];

    /* ====================================================================
     *  Status helper
     * ==================================================================== */

    function makeStatus(status, statusLabel, evidence, details, recommendation) {
        return {
            status: status,
            statusLabel: statusLabel,
            evidence: evidence || '',
            details: details || '',
            recommendation: recommendation || ''
        };
    }

    /* ====================================================================
     *  Per-criterion evaluators
     *  Each function receives the parsed report and returns a status object.
     *  Replace these stubs with real rule logic as the validator evolves.
     * ==================================================================== */

    // --- helpers ----------------------------------------------------------

    function metaProp(report, key) {
        if (!report || !report.metadata || !report.metadata.properties) return '';
        return report.metadata.properties[key] || '';
    }

    function hasIdeviceType(report, partialName) {
        if (!report || !report.ideviceSummary || !report.ideviceSummary.typeCounts) return false;
        return Object.keys(report.ideviceSummary.typeCounts).some(function (t) {
            return t.toLowerCase().indexOf(partialName.toLowerCase()) >= 0;
        });
    }

    function countIdeviceTypes(report) {
        if (!report || !report.ideviceSummary || !report.ideviceSummary.typeCounts) return 0;
        return Object.keys(report.ideviceSummary.typeCounts).length;
    }

    function hasMediaAssets(report) {
        if (!report || !report.assetInventory) return false;
        var mediaExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'mp4', 'webm', 'mp3', 'ogg', 'wav'];
        return report.assetInventory.some(function (a) {
            return a.extension && mediaExts.indexOf(a.extension.toLowerCase()) >= 0;
        });
    }

    // --- evaluators -------------------------------------------------------

    var EVALUATORS = {

        'EDIA-COV-01': function (report) {
            var title = metaProp(report, 'pp_title') || metaProp(report, 'title');
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file has been loaded yet.', 'Load an ELPX file to check this criterion automatically.');
            if (title) return makeStatus('green', 'Compliant', 'Title found: "' + title + '"', 'A title was detected in the package metadata.', 'The title looks good. Make sure it is descriptive enough for catalogue searches.');
            return makeStatus('red', 'Missing', '', 'No title was found in the package metadata.', 'Open the project in eXeLearning and set a descriptive title in Project Properties.');
        },

        'EDIA-COV-02': function (report) {
            var author = metaProp(report, 'pp_author');
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Load an ELPX file to check automatically.');
            if (author) return makeStatus('green', 'Compliant', 'Author: "' + author + '"', 'An author name was found in the package metadata.', 'Good. Ensure the author entry is complete (name and institution if applicable).');
            return makeStatus('red', 'Missing', '', 'No author information was found in the metadata.', 'Set the author name in eXeLearning → Project Properties → Author.');
        },

        'EDIA-COV-03': function (report) {
            var lang = metaProp(report, 'pp_lang') || metaProp(report, 'language');
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Load an ELPX file to check automatically.');
            if (lang) return makeStatus('green', 'Compliant', 'Language code: "' + lang + '"', 'A language is declared in the metadata.', 'Good. Verify the language code matches the content language (e.g. "en", "es").');
            return makeStatus('red', 'Missing', '', 'No language declaration found in metadata.', 'Set the content language in eXeLearning → Project Properties → Language.');
        },

        'EDIA-COV-04': function (report) {
            var desc = metaProp(report, 'pp_description');
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Load an ELPX file to check automatically.');
            if (desc && desc.trim().length > 10) return makeStatus('green', 'Compliant', 'Description found (' + desc.trim().length + ' characters).', 'A description is present in the package metadata.', 'Make sure the description clearly conveys the learning goals and target audience.');
            if (desc) return makeStatus('orange', 'Needs review', 'Description found but very short.', 'A description exists but may be too brief to be useful in catalogues.', 'Expand the description to at least 2–3 sentences covering the topic and learning objectives.');
            return makeStatus('red', 'Missing', '', 'No description found in the package metadata.', 'Add a description in eXeLearning → Project Properties → Description.');
        },

        'EDIA-COV-05': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required after loading a file.');
            return makeStatus('orange', 'Needs review', '', 'Target educational level cannot be detected automatically from the package.', 'Check whether the educational level is stated in the title, description, or introductory page.');
        },

        'EDIA-COV-06': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('orange', 'Needs review', '', 'Subject area cannot be inferred automatically from the package structure.', 'Include subject tags or keywords in the description, or add a cover page that clearly states the subject.');
        },

        'EDIA-MET-01': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('orange', 'Needs review', '', 'Learning objectives cannot be automatically detected. They may be stated in the text but require human judgement.', 'Add a dedicated section or box at the beginning of the resource that clearly lists the learning objectives.');
        },

        'EDIA-MET-02': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Heuristic check requires a loaded file.');
            var pages = (report.pageTitles || []).length;
            if (pages >= 3) return makeStatus('green', 'Compliant', pages + ' pages detected.', 'The resource contains multiple pages, suggesting a structured sequence.', 'Review the page order to ensure it follows a logical progression from introduction to main content to assessment.');
            if (pages === 1 || pages === 2) return makeStatus('orange', 'Needs review', pages + ' page(s) detected.', 'The resource has very few pages. It may lack a full didactic sequence.', 'Consider splitting content into at least three stages: introduction, development, and conclusion/activity.');
            return makeStatus('red', 'Missing', '', 'No pages were detected. A didactic sequence cannot be assessed.', 'Ensure the resource has content pages before publishing.');
        },

        'EDIA-MET-03': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Heuristic check requires a loaded file.');
            var total = report.ideviceSummary ? report.ideviceSummary.total : 0;
            if (total > 0) return makeStatus('green', 'Compliant', total + ' iDevice(s) detected.', 'Interactive iDevices encourage active engagement beyond passive reading.', 'Ensure activities require the learner to respond, not just observe.');
            return makeStatus('orange', 'Needs review', '', 'No interactive iDevices were detected. The resource may be purely passive.', 'Add activities (quizzes, tasks, exercises) using eXeLearning iDevices.');
        },

        'EDIA-MET-04': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Heuristic check requires a loaded file.');
            var hasFeedback = hasIdeviceType(report, 'quiz') || hasIdeviceType(report, 'question') || hasIdeviceType(report, 'scorm') || hasIdeviceType(report, 'test');
            if (hasFeedback) return makeStatus('green', 'Compliant', 'Activity iDevices with potential feedback detected.', 'At least one activity type that typically provides feedback was found.', 'Verify that each activity provides meaningful feedback — not just "correct/incorrect" but an explanation.');
            return makeStatus('orange', 'Needs review', '', 'No explicit feedback mechanisms were automatically detected.', 'Add quiz or activity iDevices that give learners feedback on their answers.');
        },

        'EDIA-CON-01': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Automatic check requires a loaded file.');
            var pages = (report.pageTitles || []).length;
            if (pages >= 2) return makeStatus('green', 'Compliant', pages + ' pages found.', 'Content is organised across multiple pages.', 'Good. Consider also using headings and sections within pages for longer content.');
            if (pages === 1) return makeStatus('orange', 'Needs review', '1 page found.', 'All content is on a single page. This may be appropriate for short resources, but longer content benefits from pagination.', 'If the resource is long, split it into logical sections across multiple pages.');
            return makeStatus('red', 'Missing', '', 'No content pages were found in the package.', 'Create at least one content page in eXeLearning before publishing.');
        },

        'EDIA-CON-02': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Heuristic check requires a loaded file.');
            var hasMedia = hasMediaAssets(report);
            if (hasMedia) {
                var mediaCount = report.assetInventory ? report.assetInventory.filter(function (a) {
                    var exts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'mp4', 'webm', 'mp3', 'ogg', 'wav'];
                    return a.extension && exts.indexOf(a.extension.toLowerCase()) >= 0;
                }).length : 0;
                return makeStatus('green', 'Compliant', mediaCount + ' media asset(s) detected.', 'Multimedia files (images, audio or video) are included in the package.', 'Check that each media file has a clear purpose and is not just decorative.');
            }
            return makeStatus('orange', 'Needs review', '', 'No media assets were detected. The resource may be text-only.', 'Consider adding images, diagrams, or short videos to improve engagement and comprehension.');
        },

        'EDIA-CON-03': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('orange', 'Needs review', '', 'Scientific accuracy and currency cannot be verified automatically.', 'Have a subject-matter expert review the content for accuracy and ensure it reflects current knowledge.');
        },

        'EDIA-CON-04': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('orange', 'Needs review', '', 'Language appropriateness for the target audience requires human assessment.', 'Review the vocabulary and sentence complexity against the declared educational level.');
        },

        'EDIA-CON-05': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Heuristic check requires a loaded file.');
            return makeStatus('orange', 'Needs review', '', 'Presence and quality of external links cannot be fully verified without content parsing.', 'Check that any external links open in a new tab and include a brief description of the destination.');
        },

        'EDIA-ACT-01': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Heuristic check requires a loaded file.');
            var total = report.ideviceSummary ? report.ideviceSummary.total : 0;
            var knownDeep = report.ideviceSummary ? report.ideviceSummary.knownDeep : 0;
            if (knownDeep > 0 || total > 2) return makeStatus('green', 'Compliant', total + ' iDevice(s) found, ' + knownDeep + ' deeply parsed.', 'Interactive iDevices are present in the resource.', 'Good. Ensure each activity has a clear purpose linked to a learning objective.');
            if (total > 0) return makeStatus('orange', 'Needs review', total + ' iDevice(s) found.', 'Some iDevices are present but may not be fully interactive.', 'Review whether each iDevice requires active learner input or is mainly presentational.');
            return makeStatus('red', 'Missing', '', 'No interactive iDevices were detected in the resource.', 'Add at least one interactive activity using eXeLearning iDevices (quiz, exercise, etc.).');
        },

        'EDIA-ACT-02': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('orange', 'Needs review', '', 'Alignment between activities and learning objectives requires manual verification.', 'Review each activity and confirm it maps to at least one of the stated learning objectives.');
        },

        'EDIA-ACT-03': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('orange', 'Needs review', '', 'Clarity of activity instructions can only be assessed by reading the content.', 'Read through every activity as a learner and check whether the instructions are self-explanatory.');
        },

        'EDIA-ACT-04': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Heuristic check requires a loaded file.');
            var typeCount = countIdeviceTypes(report);
            if (typeCount >= 3) return makeStatus('green', 'Compliant', typeCount + ' different iDevice types detected.', 'A variety of activity types is present.', 'Good variety. Ensure the mix of activity types is intentional and pedagogically sound.');
            if (typeCount === 2) return makeStatus('orange', 'Needs review', typeCount + ' iDevice types detected.', 'Some variety in activity types exists.', 'Consider adding one more type of activity (e.g. open-ended question, sorting task, case study).');
            if (typeCount === 1) return makeStatus('orange', 'Needs review', '1 iDevice type used throughout.', 'All activities use the same type. This can be repetitive.', 'Introduce at least one additional activity type to keep learners engaged.');
            return makeStatus('red', 'Missing', '', 'No iDevices detected. Activity variety cannot be assessed.', 'Add interactive activities using a variety of eXeLearning iDevice types.');
        },

        'EDIA-TCH-01': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('orange', 'Needs review', '', 'Teacher guidance sections cannot be automatically identified.', 'Consider adding a "Teacher Notes" or "How to Use This Resource" page visible only in author mode or as an appendix.');
        },

        'EDIA-TCH-02': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('orange', 'Needs review', '', 'Estimated duration is not present in the package metadata.', 'State the approximate time needed to complete the resource on the cover page or in the description.');
        },

        'EDIA-TCH-03': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('orange', 'Needs review', '', 'Curriculum alignment information cannot be detected automatically.', 'Add curriculum references (e.g. learning competences or standards codes) to the description or teacher notes.');
        },

        'EDIA-LRN-01': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('orange', 'Needs review', '', 'The cognitive level of activities requires pedagogical judgement.', 'Review activities against Bloom\'s taxonomy and check for tasks that require analysis, evaluation, or creation.');
        },

        'EDIA-LRN-02': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('orange', 'Needs review', '', 'Collaborative elements cannot be detected from the package structure.', 'Consider adding discussion prompts, peer review tasks, or group activities if appropriate for the context.');
        },

        'EDIA-ADP-01': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Automatic check requires a loaded file.');
            if (report.format === 'elpx') return makeStatus('green', 'Compliant', 'Format: ELPX (eXeLearning ≥ 3.0)', 'The resource uses the modern ELPX format, which is fully portable and reusable.', 'Good. This format supports sharing and remixing in open educational repositories.');
            if (report.format === 'elp') return makeStatus('orange', 'Needs review', 'Format: legacy ELP', 'The legacy ELP format is less portable than ELPX. Some tools may not support it fully.', 'Consider re-saving the resource as ELPX using eXeLearning 3.0 or later.');
            return makeStatus('red', 'Missing', '', 'Package format could not be determined.', 'Ensure the file is a valid ELP or ELPX package.');
        },

        'EDIA-ADP-02': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Heuristic check requires a loaded file.');
            return makeStatus('green', 'Compliant', '', 'eXeLearning resources are platform-independent HTML5 packages and do not require proprietary software to view.', 'Good. Ensure no embedded content (e.g. iframes) links to paywalled or platform-locked resources.');
        },

        'EDIA-ADP-03': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Heuristic check requires a loaded file.');
            var license = metaProp(report, 'license');
            var isOpen = license && (license.toLowerCase().indexOf('cc') >= 0 || license.toLowerCase().indexOf('creative') >= 0 || license.toLowerCase().indexOf('open') >= 0);
            if (isOpen) return makeStatus('green', 'Compliant', 'Open license detected: "' + license + '"', 'An open license allows others to adapt and remix the resource.', 'Excellent. Ensure the license terms match your intended reuse permissions.');
            if (license) return makeStatus('orange', 'Needs review', 'License: "' + license + '"', 'A license is present but may not explicitly permit remixing or adaptation.', 'Check whether your license allows derivative works. Creative Commons CC-BY or CC-BY-SA are common OER choices.');
            return makeStatus('orange', 'Needs review', '', 'No license information detected. Adaptability cannot be confirmed.', 'Declare an open license (e.g. Creative Commons) to make it clear that others may adapt the resource.');
        },

        'EDIA-INT-01': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Automatic check requires a loaded file.');
            var total = report.ideviceSummary ? report.ideviceSummary.total : 0;
            if (total >= 3) return makeStatus('green', 'Compliant', total + ' iDevice(s) detected.', 'Multiple interactive iDevices are present in the resource.', 'Good. Ensure each iDevice is functional and contributes to the learning experience.');
            if (total > 0) return makeStatus('orange', 'Needs review', total + ' iDevice(s) detected.', 'A small number of iDevices are present. More may be needed for a fully interactive experience.', 'Consider adding more activities to increase learner engagement.');
            return makeStatus('red', 'Missing', '', 'No iDevices were detected in the resource.', 'Add interactive iDevices using eXeLearning to make the resource engaging.');
        },

        'EDIA-INT-02': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Heuristic check requires a loaded file.');
            var total = report.ideviceSummary ? report.ideviceSummary.total : 0;
            var knownDeep = report.ideviceSummary ? report.ideviceSummary.knownDeep : 0;
            if (knownDeep >= 2) return makeStatus('green', 'Compliant', knownDeep + ' deeply interactive iDevice(s).', 'The resource includes iDevices that require meaningful learner input.', 'Good. Verify that each activity supports learning rather than just demonstrating content.');
            if (total > 0) return makeStatus('orange', 'Needs review', total + ' iDevice(s), limited deep interactivity.', 'Some iDevices are present but may be mostly presentational (e.g. plain text iDevices).', 'Replace or supplement presentational iDevices with interactive ones (quizzes, exercises).');
            return makeStatus('red', 'Missing', '', 'No interactive content detected.', 'Add activities that require the learner to actively respond or make choices.');
        },

        'EDIA-TEC-01': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Automatic check requires a loaded file.');
            var zipError = report.findings && report.findings.some(function (f) { return f.code === 'PKG001' || f.code === 'PKG002'; });
            if (zipError) return makeStatus('red', 'Missing', '', 'A critical package error was detected.', 'Re-export the resource from eXeLearning or check the ZIP file for corruption.');
            return makeStatus('green', 'Compliant', '', 'The package archive loaded without errors.', 'The ZIP structure is intact. No action needed.');
        },

        'EDIA-TEC-02': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Automatic check requires a loaded file.');
            var xmlError = report.findings && report.findings.some(function (f) { return f.code === 'XML001'; });
            if (xmlError) return makeStatus('red', 'Missing', '', 'The XML manifest contains syntax errors.', 'Open the package in eXeLearning and re-export it to regenerate a valid manifest.');
            return makeStatus('green', 'Compliant', '', 'The content.xml manifest is well-formed XML.', 'No action needed. The manifest can be parsed by any eXeLearning-compatible platform.');
        },

        'EDIA-TEC-03': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Automatic check requires a loaded file.');
            var missing = report.assetSummary ? report.assetSummary.missingAssets : 0;
            if (missing === 0) {
                var refs = report.assetSummary ? report.assetSummary.totalReferences : 0;
                return makeStatus('green', 'Compliant', 'All ' + refs + ' referenced asset(s) are present.', 'No missing files were detected in the package.', 'Good. Ensure all media files are embedded in the package rather than linked externally when possible.');
            }
            return makeStatus('red', 'Missing', missing + ' missing asset(s) detected.', 'Some referenced files are missing from the package. Learners will see broken images or media.', 'Open the resource in eXeLearning, locate and re-add the missing files, then re-export.');
        },

        'EDIA-TEC-04': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Automatic check requires a loaded file.');
            if (report.format === 'elpx') return makeStatus('green', 'Compliant', 'ELPX format detected.', 'The modern ELPX format is used. This ensures full compatibility with current eXeLearning tools.', 'Good. Keep using eXeLearning 3.0+ for future edits.');
            if (report.format === 'elp') return makeStatus('orange', 'Needs review', 'Legacy ELP format detected.', 'The resource uses the older ELP format. This format is still supported but may have limited functionality.', 'Re-save the resource in eXeLearning 3.0+ to upgrade to the modern ELPX format.');
            return makeStatus('red', 'Missing', '', 'Package format could not be determined.', 'Ensure the file is a valid ELP or ELPX export from eXeLearning.');
        },

        'EDIA-TEC-05': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Automatic check requires a loaded file.');
            var errors = report.counts ? report.counts.errors : 0;
            var warnings = report.counts ? report.counts.warnings : 0;
            if (errors === 0 && warnings === 0) return makeStatus('green', 'Compliant', 'No errors or warnings detected.', 'The resource passes all structural validation rules.', 'Excellent. No technical issues were found.');
            if (errors === 0) return makeStatus('orange', 'Needs review', warnings + ' warning(s) detected.', 'The resource has warnings but no critical errors. It should still load correctly.', 'Review the Findings tab for details and address warnings where possible.');
            return makeStatus('red', 'Missing', errors + ' error(s) and ' + warnings + ' warning(s) detected.', 'Critical errors were found. The resource may not load correctly on all platforms.', 'Go to the Findings tab to see the details and fix the issues before publishing.');
        },

        'EDIA-FMT-01': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('orange', 'Needs review', '', 'Visual consistency cannot be assessed from the package structure alone.', 'Open the resource in a browser and check that fonts, colours, and spacing are consistent across all pages.');
        },

        'EDIA-FMT-02': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('orange', 'Needs review', '', 'Media quality requires visual and auditory inspection.', 'Review all images and media files for clarity and quality before publishing.');
        },

        'EDIA-FMT-03': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('orange', 'Needs review', '', 'Text readability and formatting requires manual review.', 'Read through the content as a learner would. Check for consistent use of headings, bullet points, and line spacing.');
        },

        'EDIA-ACC-01': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Heuristic check requires a loaded file.');
            var hasImages = report.assetInventory && report.assetInventory.some(function (a) {
                var imgExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
                return a.extension && imgExts.indexOf(a.extension.toLowerCase()) >= 0;
            });
            if (!hasImages) return makeStatus('green', 'Compliant', 'No images detected in the package.', 'There are no images that would require alternative text.', 'If you add images later, remember to provide descriptive alt text for each one.');
            return makeStatus('orange', 'Needs review', 'Images detected — alt text cannot be verified from package structure.', 'Images are present but alt text can only be verified by inspecting the HTML content.', 'Open the HTML source or preview and verify that every meaningful image has a descriptive alt attribute.');
        },

        'EDIA-ACC-02': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('orange', 'Needs review', '', 'Colour contrast requires visual inspection or an automated tool on the rendered output.', 'Use a tool like the WebAIM Contrast Checker to verify text contrast. Aim for a ratio of at least 4.5:1 for normal text.');
        },

        'EDIA-ACC-03': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('orange', 'Needs review', '', 'Colour-only information requires manual inspection.', 'Check that any information conveyed by colour (e.g. correct/incorrect feedback) also uses a text label or icon.');
        },

        'EDIA-ACC-04': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            var hasVideo = report.assetInventory && report.assetInventory.some(function (a) {
                return a.extension && ['mp4', 'webm', 'ogv', 'avi'].indexOf(a.extension.toLowerCase()) >= 0;
            });
            var hasAudio = report.assetInventory && report.assetInventory.some(function (a) {
                return a.extension && ['mp3', 'ogg', 'wav', 'm4a'].indexOf(a.extension.toLowerCase()) >= 0;
            });
            if (!hasVideo && !hasAudio) return makeStatus('green', 'Compliant', 'No audio or video assets detected.', 'No multimedia requiring captions was found.', 'If you add audio or video later, provide captions or a transcript.');
            return makeStatus('orange', 'Needs review', (hasVideo ? 'Video' : '') + (hasVideo && hasAudio ? ' and ' : '') + (hasAudio ? 'audio' : '') + ' assets detected.', 'Audio or video content is present. Captions and transcripts cannot be verified automatically.', 'Ensure all audio and video has captions or a text transcript. Use tools like Amara or YouTube auto-captions as a starting point.');
        },

        'EDIA-ACC-05': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('green', 'Compliant', '', 'Flashing content cannot be detected from the package structure, but eXeLearning-generated content does not typically include such elements.', 'Review any embedded animations or third-party content for flashing or strobing effects.');
        },

        'EDIA-LIC-01': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Automatic check requires a loaded file.');
            var license = metaProp(report, 'license');
            if (license && license.trim()) return makeStatus('green', 'Compliant', 'License: "' + license + '"', 'A license declaration is present in the package metadata.', 'Verify that the license text is correct and visible to learners within the resource itself, not only in the metadata.');
            return makeStatus('red', 'Missing', '', 'No license declaration was found in the metadata.', 'Set a license in eXeLearning → Project Properties → License (e.g. Creative Commons CC-BY-SA 4.0).');
        },

        'EDIA-LIC-02': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Heuristic check requires a loaded file.');
            var license = metaProp(report, 'license');
            if (!license) return makeStatus('orange', 'Needs review', '', 'No license found — reuse permissions are unknown.', 'Choose an open license that explicitly permits educational reuse. Creative Commons CC-BY or CC-BY-SA are widely recommended.');
            var lower = license.toLowerCase();
            var isOpen = lower.indexOf('cc') >= 0 || lower.indexOf('creative commons') >= 0 || lower.indexOf('by') >= 0 || lower.indexOf('open') >= 0 || lower.indexOf('libre') >= 0;
            var hasND = lower.indexOf('-nd') >= 0 || lower.indexOf('no deriv') >= 0;
            if (isOpen && !hasND) return makeStatus('green', 'Compliant', 'License: "' + license + '"', 'The detected license appears to be an open license that permits educational reuse.', 'Good. Check that the specific license version matches your intentions (e.g. CC BY 4.0 vs CC BY-SA 4.0).');
            if (isOpen && hasND) return makeStatus('orange', 'Needs review', 'License: "' + license + '"', 'The license is open but "NoDerivatives" clauses restrict adaptation by others.', 'If you want to allow remixing, consider switching to a CC-BY or CC-BY-SA license.');
            return makeStatus('orange', 'Needs review', 'License: "' + license + '"', 'The license type could not be conclusively identified as permitting educational reuse.', 'Verify that your chosen license explicitly allows use in educational contexts.');
        },

        'EDIA-LIC-03': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('orange', 'Needs review', '', 'Third-party copyright compliance requires manual verification.', 'Check that every image, audio clip, or video in the resource is either original, licensed for reuse, or in the public domain. Document sources and attributions.');
        },

        'EDIA-INC-01': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('orange', 'Needs review', '', 'Inclusive language requires reading the content.', 'Read through the resource text and check for gender-neutral language. Replace gendered pronouns with inclusive alternatives where possible.');
        },

        'EDIA-INC-02': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('orange', 'Needs review', '', 'Diversity in visual materials requires human inspection.', 'Review images and examples: do they represent people of diverse genders, ethnicities, ages, and abilities?');
        },

        'EDIA-INC-03': function (report) {
            if (!report) return makeStatus('orange', 'Needs review', '', 'No file loaded.', 'Manual review required.');
            return makeStatus('orange', 'Needs review', '', 'Cultural and social bias requires careful reading of the content.', 'Review all text, examples, and images for implicit cultural assumptions. Have someone from a different background check the resource if possible.');
        }
    };

    /* ====================================================================
     *  Public API
     * ==================================================================== */

    /**
     * Returns the list of all section descriptors.
     */
    function getSections() {
        return SECTIONS.slice();
    }

    /**
     * Evaluates all EDIA criteria against an optional validator report.
     * Pass null or undefined for report to get placeholder / no-file statuses.
     *
     * @param {object|null} report – full validator report from ELPValidator.runFullValidation()
     * @returns {Array} – annotated criterion objects, each with status, evidence, etc.
     */
    function evaluateEdiaCriteria(report) {
        return CRITERIA_REGISTRY.map(function (crit) {
            var sectionMeta = SECTIONS.find(function (s) { return s.key === crit.section; }) || {};
            var evaluator = EVALUATORS[crit.id];
            var computed = evaluator ? evaluator(report) : makeStatus('orange', 'Needs review', '', 'Evaluator not yet implemented.', '');
            return Object.assign({}, crit, {
                sectionLabel: sectionMeta.label || crit.section,
                sectionIcon: sectionMeta.icon || '📋',
                status: computed.status,
                statusLabel: computed.statusLabel,
                evidence: computed.evidence,
                details: computed.details,
                recommendation: computed.recommendation
            });
        });
    }

    /* ====================================================================
     *  UMD export
     * ==================================================================== */

    var EdiaCriteria = {
        getSections: getSections,
        evaluateEdiaCriteria: evaluateEdiaCriteria
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = EdiaCriteria;
    } else {
        window.EdiaCriteria = EdiaCriteria;
    }
}());
