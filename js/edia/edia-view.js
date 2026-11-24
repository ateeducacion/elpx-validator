/**
 * EDIA Validation – UI rendering helpers.
 *
 * Renders the EDIA quality dashboard inside the #tab-edia panel.
 * Consumes the structured criteria objects produced by EdiaCriteria.evaluateEdiaCriteria().
 *
 * Public API:
 *   EdiaView.renderEdiaDashboard(container, criteriaResults, report)
 */
(function () {
    'use strict';

    var i18n = typeof ELPXI18n !== 'undefined' ? ELPXI18n : null;

    function escHtml(str) {
        if (str == null) return '';
        var d = document.createElement('div');
        d.textContent = String(str);
        return d.innerHTML;
    }

    function translate(key, fallback, params) {
        if (!i18n || typeof i18n.t !== 'function') {
            return fallback;
        }
        var value = i18n.t(key, params || {});
        return value === key ? fallback : value;
    }

    function getStatusConfig() {
        return {
            green: { cssClass: 'edia-green', label: translate('edia.statuses.green', 'Compliant'), icon: '✓' },
            orange: { cssClass: 'edia-orange', label: translate('edia.statuses.orange', 'Needs review'), icon: '!' },
            red: { cssClass: 'edia-red', label: translate('edia.statuses.red', 'Missing'), icon: '✕' }
        };
    }

    function getValidationTypeConfig() {
        return {
            automatic: {
                cssClass: 'edia-badge-auto',
                label: translate('edia.validationTypes.automatic', 'Automatic'),
                icon: ''
            },
            heuristic: {
                cssClass: 'edia-badge-heuristic',
                label: translate('edia.validationTypes.heuristic', 'Heuristic'),
                icon: ''
            },
            manual: {
                cssClass: 'edia-badge-manual',
                label: translate('edia.validationTypes.manual', 'Manual review'),
                icon: ''
            }
        };
    }

    function localizeCriterion(crit) {
        var localized = Object.assign({}, crit);
        localized.title = translate('edia.criteria.' + crit.id + '.title', crit.title);
        localized.description = translate('edia.criteria.' + crit.id + '.description', crit.description);
        localized.sectionLabel = translate('edia.sections.' + crit.section, crit.sectionLabel || crit.section);
        localized.statusLabel = translate('edia.statuses.' + crit.status, crit.statusLabel || crit.status);
        return localized;
    }

    function localizeSection(section) {
        return {
            key: section.key,
            icon: section.icon,
            label: translate('edia.sections.' + section.key, section.label)
        };
    }

    // What the panel is, in two sentences, and where the criteria come from.
    function buildHero() {
        var div = document.createElement('div');
        div.className = 'edia-intro';
        div.innerHTML = [
            '<h3 data-i18n="edia.hero.title">EDIA Quality Dashboard</h3>',
            '<p data-i18n-html="edia.hero.subtitleHtml">This dashboard evaluates your eXeLearning resource against the <strong>EDIA / CEDEC</strong> open educational resource quality checklist. Some criteria are checked automatically from the package; others require human judgement and are flagged for manual review.</p>',
            '<p class="edia-links">',
            '  <a href="https://cedec.intef.es/recursos/criterios-edia/" target="_blank" rel="noopener noreferrer" data-i18n="edia.hero.checklistLink">EDIA Checklist (CEDEC)</a>',
            '  <a href="https://cedec.intef.es/wp-content/uploads/2021/11/EDIA-Rubrica-2021.pdf" target="_blank" rel="noopener noreferrer" data-i18n="edia.hero.rubricLink">Download EDIA Rubric (PDF)</a>',
            '</p>'
        ].join('');
        if (i18n && typeof i18n.translateDom === 'function') {
            i18n.translateDom(div);
        }
        return div;
    }

    function countByStatus(criteria) {
        var counts = { green: 0, orange: 0, red: 0 };
        criteria.forEach(function (c) {
            counts[c.status]++;
        });
        return counts;
    }

    // "✓ 13  ! 32  ✕ 3", each mark with its meaning as tooltip and accessible name.
    function tallyHtml(counts) {
        var statusConfig = getStatusConfig();
        return ['green', 'orange', 'red']
            .map(function (status) {
                var st = statusConfig[status];
                return (
                    '<span class="' +
                    st.cssClass +
                    '" title="' +
                    escHtml(st.label) +
                    '">' +
                    '<b aria-hidden="true">' +
                    st.icon +
                    '</b> ' +
                    counts[status] +
                    '<span class="sr-only"> ' +
                    escHtml(st.label) +
                    '</span></span>'
                );
            })
            .join('');
    }

    // One line: how many criteria there are and how they came out.
    function buildSummary(criteria) {
        var statusConfig = getStatusConfig();
        var counts = countByStatus(criteria);
        var dl = document.createElement('dl');
        dl.className = 'edia-tally';
        var items = [
            { value: criteria.length, label: translate('edia.summary.totalCriteria', 'Total criteria'), cls: '' },
            { value: counts.green, label: statusConfig.green.label, cls: statusConfig.green.cssClass },
            { value: counts.orange, label: statusConfig.orange.label, cls: statusConfig.orange.cssClass },
            { value: counts.red, label: statusConfig.red.label, cls: statusConfig.red.cssClass }
        ];
        dl.innerHTML = items
            .map(function (item) {
                return (
                    '<div class="' +
                    item.cls +
                    '"><dt>' +
                    escHtml(item.label) +
                    '</dt><dd>' +
                    item.value +
                    '</dd></div>'
                );
            })
            .join('');
        return dl;
    }

    // A criterion is one line (mark, title, how it was checked); the explanation opens on demand.
    function buildCriterion(criterion) {
        var crit = localizeCriterion(criterion);
        var st = getStatusConfig()[crit.status] || getStatusConfig().orange;
        var vt = getValidationTypeConfig()[crit.validationType] || getValidationTypeConfig().manual;

        var details = document.createElement('details');
        details.className = 'edia-criterion ' + st.cssClass;
        details.setAttribute('data-criterion-id', crit.id);

        var summary = document.createElement('summary');
        summary.innerHTML = [
            '<b class="edia-mark" title="' +
                escHtml(crit.statusLabel || st.label) +
                '" aria-hidden="true">' +
                st.icon +
                '</b>',
            '<span class="edia-criterion-title">' +
                escHtml(crit.title) +
                '<span class="sr-only"> — ' +
                escHtml(crit.statusLabel || st.label) +
                '</span></span>',
            '<span class="edia-criterion-meta">' + escHtml(vt.label) + ' · ' + escHtml(crit.id) + '</span>'
        ].join('');
        details.appendChild(summary);

        var body = document.createElement('div');
        body.className = 'edia-criterion-body';
        function line(className, text, prefix) {
            if (!text) return;
            var p = document.createElement('p');
            p.className = className;
            p.textContent = (prefix ? prefix + ' ' : '') + text;
            body.appendChild(p);
        }
        line('edia-criterion-description', crit.description);
        line('edia-criterion-evidence', crit.evidence, translate('edia.labels.detected', 'Detected:'));
        line('edia-criterion-details', crit.details);
        line('edia-criterion-recommendation', crit.recommendation, translate('edia.labels.recommendationPrefix', '→'));
        (crit.links || []).forEach(function (link) {
            var a = document.createElement('a');
            a.href = link.url;
            a.textContent = link.label;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            body.appendChild(a);
        });
        details.appendChild(body);
        return details;
    }

    function buildSection(section, criteria) {
        var sectionCriteria = criteria.filter(function (c) {
            return c.section === section.key;
        });
        if (sectionCriteria.length === 0) return null;

        var el = document.createElement('section');
        el.className = 'edia-section';
        var header = document.createElement('h4');
        header.innerHTML =
            '<span>' +
            escHtml(localizeSection(section).label) +
            '</span>' +
            '<span class="edia-section-counts">' +
            tallyHtml(countByStatus(sectionCriteria)) +
            '</span>';
        el.appendChild(header);
        sectionCriteria.forEach(function (crit) {
            el.appendChild(buildCriterion(crit));
        });
        return el;
    }

    function buildNoFileNotice() {
        var div = document.createElement('div');
        div.className = 'edia-no-file-notice';
        div.innerHTML = [
            '<p class="edia-no-file-text" data-i18n-html="edia.noFile.textHtml">Load an <strong>.elpx</strong> or <strong>.elp</strong> file using the upload area above to see your personalized EDIA quality assessment.</p>',
            '<p class="edia-no-file-subtext" data-i18n="edia.noFile.subtext">The criteria below are shown with placeholder statuses. They will update automatically once a file has been loaded.</p>'
        ].join('');
        if (i18n && typeof i18n.translateDom === 'function') {
            i18n.translateDom(div);
        }
        return div;
    }

    function renderEdiaDashboard(container, criteriaResults, report) {
        if (!container) return;
        container.innerHTML = '';

        var sections =
            typeof EdiaCriteria !== 'undefined' && EdiaCriteria.getSections ? EdiaCriteria.getSections() : [];

        container.appendChild(buildHero());

        if (!report) {
            container.appendChild(buildNoFileNotice());
        }

        container.appendChild(buildSummary(criteriaResults));
        sections.forEach(function (section) {
            var el = buildSection(section, criteriaResults);
            if (el) container.appendChild(el);
        });
    }

    var EdiaView = {
        renderEdiaDashboard: renderEdiaDashboard
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = EdiaView;
    } else {
        window.EdiaView = EdiaView;
    }
})();
