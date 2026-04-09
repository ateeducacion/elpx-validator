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
            green:  { cssClass: 'edia-green',  label: translate('edia.statuses.green', 'Compliant'),    icon: '✅' },
            orange: { cssClass: 'edia-orange', label: translate('edia.statuses.orange', 'Needs review'), icon: '⚠️' },
            red:    { cssClass: 'edia-red',    label: translate('edia.statuses.red', 'Missing'),         icon: '❌' }
        };
    }

    function getValidationTypeConfig() {
        return {
            automatic: { cssClass: 'edia-badge-auto',      label: translate('edia.validationTypes.automatic', 'Automatic'),     icon: '🤖' },
            heuristic: { cssClass: 'edia-badge-heuristic', label: translate('edia.validationTypes.heuristic', 'Heuristic'),     icon: '🔍' },
            manual:    { cssClass: 'edia-badge-manual',    label: translate('edia.validationTypes.manual', 'Manual review'),   icon: '👁️' }
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

    function buildHero() {
        var div = document.createElement('div');
        div.className = 'edia-hero';
        div.innerHTML = [
            '<div class="edia-hero-content">',
            '  <div class="edia-hero-text">',
            '    <h3 class="edia-hero-title">' + escHtml(translate('edia.hero.title', 'EDIA Quality Dashboard')) + '</h3>',
            '    <p class="edia-hero-subtitle">' + translate('edia.hero.subtitleHtml', 'This dashboard evaluates your eXeLearning resource against the <strong>EDIA / CEDEC</strong> open educational resource quality checklist. Some criteria are checked automatically from the package; others require human judgement and are flagged for manual review.') + '</p>',
            '    <div class="edia-hero-links">',
            '      <a href="https://cedec.intef.es/recursos/criterios-edia/" target="_blank" rel="noopener noreferrer" class="edia-hero-btn edia-hero-btn-primary">',
            '        ' + escHtml(translate('edia.hero.checklistLink', '🌐 EDIA Checklist (CEDEC)')),
            '      </a>',
            '      <a href="https://cedec.intef.es/wp-content/uploads/2021/11/EDIA-Rubrica-2021.pdf" target="_blank" rel="noopener noreferrer" class="edia-hero-btn edia-hero-btn-secondary">',
            '        ' + escHtml(translate('edia.hero.rubricLink', '📄 Download EDIA Rubric (PDF)')),
            '      </a>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join('');
        return div;
    }

    function buildLegend() {
        var statusConfig = getStatusConfig();
        var validationTypeConfig = getValidationTypeConfig();
        var div = document.createElement('div');
        div.className = 'edia-legend';
        div.setAttribute('aria-label', translate('edia.legend.ariaLabel', 'Status colour legend'));
        div.innerHTML = [
            '<span class="edia-legend-label">' + escHtml(translate('edia.legend.label', 'Status key:')) + '</span>',
            '<span class="edia-legend-chip edia-green-chip">✅ ' + escHtml(statusConfig.green.label) + '</span>',
            '<span class="edia-legend-chip edia-orange-chip">⚠️ ' + escHtml(statusConfig.orange.label) + '</span>',
            '<span class="edia-legend-chip edia-red-chip">❌ ' + escHtml(statusConfig.red.label) + '</span>',
            '<span class="edia-legend-divider" aria-hidden="true">|</span>',
            '<span class="edia-legend-chip edia-badge-auto">🤖 ' + escHtml(validationTypeConfig.automatic.label) + '</span>',
            '<span class="edia-legend-chip edia-badge-heuristic">🔍 ' + escHtml(validationTypeConfig.heuristic.label) + '</span>',
            '<span class="edia-legend-chip edia-badge-manual">👁️ ' + escHtml(validationTypeConfig.manual.label) + '</span>'
        ].join('');
        return div;
    }

    function buildSummaryCards(criteria) {
        var total = criteria.length;
        var greens = criteria.filter(function (c) { return c.status === 'green'; }).length;
        var oranges = criteria.filter(function (c) { return c.status === 'orange'; }).length;
        var reds = criteria.filter(function (c) { return c.status === 'red'; }).length;
        var score = total > 0 ? Math.round((greens / total) * 100) : 0;

        var grid = document.createElement('div');
        grid.className = 'edia-summary-grid';

        var cards = [
            {
                value: total,
                label: translate('edia.summary.totalCriteria', 'Total criteria'),
                cls: 'edia-card-total',
                icon: '📋',
                desc: translate('edia.summary.totalCriteriaDesc', 'All criteria evaluated')
            },
            {
                value: greens,
                label: translate('edia.summary.compliant', 'Compliant'),
                cls: 'edia-card-green',
                icon: '✅',
                desc: translate('edia.summary.compliantDesc', 'Criteria that are met')
            },
            {
                value: oranges,
                label: translate('edia.summary.needsReview', 'Needs review'),
                cls: 'edia-card-orange',
                icon: '⚠️',
                desc: translate('edia.summary.needsReviewDesc', 'Criteria needing attention')
            },
            {
                value: reds,
                label: translate('edia.summary.missing', 'Missing / failing'),
                cls: 'edia-card-red',
                icon: '❌',
                desc: translate('edia.summary.missingDesc', 'Criteria not met')
            }
        ];

        cards.forEach(function (card) {
            var c = document.createElement('div');
            c.className = 'edia-summary-card ' + card.cls;
            c.innerHTML = [
                '<div class="edia-summary-icon" aria-hidden="true">' + card.icon + '</div>',
                '<div class="edia-summary-value">' + card.value + '</div>',
                '<div class="edia-summary-label">' + escHtml(card.label) + '</div>',
                '<div class="edia-summary-desc">' + escHtml(card.desc) + '</div>'
            ].join('');
            grid.appendChild(c);
        });

        var scoreCard = document.createElement('div');
        scoreCard.className = 'edia-summary-card edia-card-score';
        var barColor = score >= 70 ? 'var(--color-success)' : score >= 40 ? 'var(--color-warning)' : 'var(--color-error)';
        scoreCard.innerHTML = [
            '<div class="edia-summary-icon" aria-hidden="true">📊</div>',
            '<div class="edia-summary-value">' + score + '%</div>',
            '<div class="edia-summary-label">' + escHtml(translate('edia.summary.readinessScore', 'Readiness score')) + '</div>',
            '<div class="edia-readiness-bar" role="progressbar" aria-valuenow="' + score + '" aria-valuemin="0" aria-valuemax="100" aria-label="' + escHtml(translate('edia.summary.readinessAria', 'Readiness {score}%', { score: score })) + '">',
            '  <div class="edia-readiness-fill" style="width:' + score + '%;background:' + barColor + '"></div>',
            '</div>',
            '<div class="edia-summary-desc">' + escHtml(translate('edia.summary.readinessDesc', 'Based on automatically checkable criteria')) + '</div>'
        ].join('');
        grid.appendChild(scoreCard);

        return grid;
    }

    function buildCriterionCard(criterion) {
        var crit = localizeCriterion(criterion);
        var statusConfig = getStatusConfig();
        var validationTypeConfig = getValidationTypeConfig();
        var st = statusConfig[crit.status] || statusConfig.orange;
        var vt = validationTypeConfig[crit.validationType] || validationTypeConfig.manual;
        var card = document.createElement('div');
        card.className = 'edia-criterion-card edia-criterion-' + crit.status;
        card.setAttribute('data-criterion-id', crit.id);

        var header = document.createElement('div');
        header.className = 'edia-criterion-header';
        header.innerHTML = [
            '<div class="edia-criterion-title-row">',
            '  <span class="edia-criterion-id">' + escHtml(crit.id) + '</span>',
            '  <span class="edia-criterion-title">' + escHtml(crit.title) + '</span>',
            '</div>',
            '<div class="edia-criterion-badges">',
            '  <span class="edia-type-badge ' + vt.cssClass + '">' + vt.icon + ' ' + escHtml(vt.label) + '</span>',
            '  <span class="edia-status-badge ' + st.cssClass + '">' + st.icon + ' ' + escHtml(crit.statusLabel || st.label) + '</span>',
            '</div>'
        ].join('');
        card.appendChild(header);

        var body = document.createElement('div');
        body.className = 'edia-criterion-body';

        var desc = document.createElement('p');
        desc.className = 'edia-criterion-description';
        desc.textContent = crit.description;
        body.appendChild(desc);

        if (crit.evidence) {
            var ev = document.createElement('div');
            ev.className = 'edia-criterion-evidence';
            ev.innerHTML = '<span class="edia-evidence-label">' + escHtml(translate('edia.labels.detected', 'Detected:')) + '</span> ' + escHtml(crit.evidence);
            body.appendChild(ev);
        }

        if (crit.details) {
            var det = document.createElement('p');
            det.className = 'edia-criterion-details';
            det.textContent = crit.details;
            body.appendChild(det);
        }

        if (crit.recommendation) {
            var rec = document.createElement('div');
            rec.className = 'edia-criterion-recommendation';
            rec.innerHTML = '<span class="edia-rec-icon" aria-hidden="true">' + escHtml(translate('edia.labels.recommendationPrefix', '💡')) + '</span> ' + escHtml(crit.recommendation);
            body.appendChild(rec);
        }

        card.appendChild(body);

        if (crit.links && crit.links.length > 0) {
            var footer = document.createElement('div');
            footer.className = 'edia-criterion-footer';
            crit.links.forEach(function (link) {
                var a = document.createElement('a');
                a.href = link.url;
                a.textContent = link.label;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.className = 'edia-learn-more';
                footer.appendChild(a);
            });
            card.appendChild(footer);
        }

        return card;
    }

    function buildSectionAccordion(section, criteria, sectionIndex) {
        var localizedSection = localizeSection(section);
        var sectionCriteria = criteria.filter(function (c) { return c.section === section.key; });
        if (sectionCriteria.length === 0) return null;

        var greens = sectionCriteria.filter(function (c) { return c.status === 'green'; }).length;
        var oranges = sectionCriteria.filter(function (c) { return c.status === 'orange'; }).length;
        var reds = sectionCriteria.filter(function (c) { return c.status === 'red'; }).length;
        var statusConfig = getStatusConfig();
        var sectionStatusCls = reds > 0 ? 'edia-section-has-red' : (oranges > 0 ? 'edia-section-has-orange' : 'edia-section-has-green');

        var details = document.createElement('details');
        details.className = 'edia-section-accordion ' + sectionStatusCls;
        if (sectionIndex < 3) details.open = true;

        var summary = document.createElement('summary');
        summary.className = 'edia-section-summary';
        summary.innerHTML = [
            '<span class="edia-section-icon" aria-hidden="true">' + (localizedSection.icon || '📋') + '</span>',
            '<span class="edia-section-name">' + escHtml(localizedSection.label) + '</span>',
            '<span class="edia-section-counts">',
            '  <span class="edia-section-count edia-sc-green" title="' + escHtml(statusConfig.green.label) + '">✅ ' + greens + '</span>',
            '  <span class="edia-section-count edia-sc-orange" title="' + escHtml(statusConfig.orange.label) + '">⚠️ ' + oranges + '</span>',
            '  <span class="edia-section-count edia-sc-red" title="' + escHtml(statusConfig.red.label) + '">❌ ' + reds + '</span>',
            '</span>'
        ].join('');
        details.appendChild(summary);

        var content = document.createElement('div');
        content.className = 'edia-section-content';
        sectionCriteria.forEach(function (crit) {
            content.appendChild(buildCriterionCard(crit));
        });
        details.appendChild(content);

        return details;
    }

    function buildNoFileNotice() {
        var div = document.createElement('div');
        div.className = 'edia-no-file-notice';
        div.innerHTML = [
            '<div class="edia-no-file-icon" aria-hidden="true">📂</div>',
            '<p class="edia-no-file-text">' + translate('edia.noFile.textHtml', 'Load an <strong>.elpx</strong> or <strong>.elp</strong> file using the upload area above to see your personalized EDIA quality assessment.') + '</p>',
            '<p class="edia-no-file-subtext">' + escHtml(translate('edia.noFile.subtext', 'The criteria below are shown with placeholder statuses. They will update automatically once a file has been loaded.')) + '</p>'
        ].join('');
        return div;
    }

    function renderEdiaDashboard(container, criteriaResults, report) {
        if (!container) return;
        container.innerHTML = '';

        var sections = (typeof EdiaCriteria !== 'undefined' && EdiaCriteria.getSections)
            ? EdiaCriteria.getSections()
            : [];

        container.appendChild(buildHero());

        if (!report) {
            container.appendChild(buildNoFileNotice());
        }

        container.appendChild(buildLegend());
        container.appendChild(buildSummaryCards(criteriaResults));

        var accordionWrapper = document.createElement('div');
        accordionWrapper.className = 'edia-sections';

        sections.forEach(function (section, idx) {
            var accordion = buildSectionAccordion(section, criteriaResults, idx);
            if (accordion) accordionWrapper.appendChild(accordion);
        });

        container.appendChild(accordionWrapper);
    }

    var EdiaView = {
        renderEdiaDashboard: renderEdiaDashboard
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = EdiaView;
    } else {
        window.EdiaView = EdiaView;
    }
}());
