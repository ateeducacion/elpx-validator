/**
 * EDIA Validation – UI rendering helpers.
 *
 * Renders the EDIA quality dashboard inside the #tab-edia panel.
 * Consumes the structured criteria objects produced by EdiaCriteria.evaluateEdiaCriteria().
 *
 * Public API:
 *   EdiaView.renderEdiaDashboard(container, criteriaResults, report)
 *
 * ----------------------------------------------------------------------------
 * NOTE FOR FUTURE INTEGRATION
 * To connect real automated validation rule results, update only
 * js/edia/edia-criteria.js (the EVALUATORS map). The rendering code here
 * does not need to change – it reads status/evidence/details from the
 * criterion objects it receives.
 * ----------------------------------------------------------------------------
 */
(function () {
    'use strict';

    /* ====================================================================
     *  Helpers
     * ==================================================================== */

    function escHtml(str) {
        if (str == null) return '';
        var d = document.createElement('div');
        d.textContent = String(str);
        return d.innerHTML;
    }

    var STATUS_CONFIG = {
        green:  { cssClass: 'edia-green',  label: 'Compliant',    icon: '✅' },
        orange: { cssClass: 'edia-orange', label: 'Needs review', icon: '⚠️' },
        red:    { cssClass: 'edia-red',    label: 'Missing',      icon: '❌' }
    };

    var VALIDATION_TYPE_CONFIG = {
        automatic: { cssClass: 'edia-badge-auto',     label: 'Automatic',      icon: '🤖' },
        heuristic: { cssClass: 'edia-badge-heuristic',label: 'Heuristic',      icon: '🔍' },
        manual:    { cssClass: 'edia-badge-manual',   label: 'Manual review',  icon: '👁️' }
    };

    /* ====================================================================
     *  Hero header
     * ==================================================================== */

    function buildHero() {
        var div = document.createElement('div');
        div.className = 'edia-hero';
        div.innerHTML = [
            '<div class="edia-hero-content">',
            '  <div class="edia-hero-text">',
            '    <h3 class="edia-hero-title">EDIA Quality Dashboard</h3>',
            '    <p class="edia-hero-subtitle">',
            '      This dashboard evaluates your eXeLearning resource against the ',
            '      <strong>EDIA / CEDEC</strong> open educational resource quality checklist.',
            '      Some criteria are checked automatically from the package; others require',
            '      human judgement and are flagged for manual review.',
            '    </p>',
            '    <div class="edia-hero-links">',
            '      <a href="https://cedec.intef.es/recursos/criterios-edia/"',
            '         target="_blank" rel="noopener noreferrer"',
            '         class="edia-hero-btn edia-hero-btn-primary">',
            '        🌐 EDIA Checklist (CEDEC)',
            '      </a>',
            '      <a href="https://cedec.intef.es/wp-content/uploads/2021/11/EDIA-Rubrica-2021.pdf"',
            '         target="_blank" rel="noopener noreferrer"',
            '         class="edia-hero-btn edia-hero-btn-secondary">',
            '        📄 Download EDIA Rubric (PDF)',
            '      </a>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join('');
        return div;
    }

    /* ====================================================================
     *  Legend row
     * ==================================================================== */

    function buildLegend() {
        var div = document.createElement('div');
        div.className = 'edia-legend';
        div.setAttribute('aria-label', 'Status colour legend');
        div.innerHTML = [
            '<span class="edia-legend-label">Status key:</span>',
            '<span class="edia-legend-chip edia-green-chip">✅ Compliant</span>',
            '<span class="edia-legend-chip edia-orange-chip">⚠️ Needs review</span>',
            '<span class="edia-legend-chip edia-red-chip">❌ Missing</span>',
            '<span class="edia-legend-divider" aria-hidden="true">|</span>',
            '<span class="edia-legend-chip edia-badge-auto">🤖 Automatic</span>',
            '<span class="edia-legend-chip edia-badge-heuristic">🔍 Heuristic</span>',
            '<span class="edia-legend-chip edia-badge-manual">👁️ Manual review</span>'
        ].join('');
        return div;
    }

    /* ====================================================================
     *  Summary cards
     * ==================================================================== */

    function buildSummaryCards(criteria) {
        var total   = criteria.length;
        var greens  = criteria.filter(function (c) { return c.status === 'green';  }).length;
        var oranges = criteria.filter(function (c) { return c.status === 'orange'; }).length;
        var reds    = criteria.filter(function (c) { return c.status === 'red';    }).length;
        var score   = total > 0 ? Math.round((greens / total) * 100) : 0;

        var grid = document.createElement('div');
        grid.className = 'edia-summary-grid';

        var cards = [
            { value: total,   label: 'Total criteria',    cls: 'edia-card-total',   icon: '📋', desc: 'All criteria evaluated' },
            { value: greens,  label: 'Compliant',         cls: 'edia-card-green',   icon: '✅', desc: 'Criteria that are met' },
            { value: oranges, label: 'Needs review',      cls: 'edia-card-orange',  icon: '⚠️', desc: 'Criteria needing attention' },
            { value: reds,    label: 'Missing / failing', cls: 'edia-card-red',     icon: '❌', desc: 'Criteria not met' }
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

        // Readiness score card
        var scoreCard = document.createElement('div');
        scoreCard.className = 'edia-summary-card edia-card-score';
        var barColor = score >= 70 ? 'var(--color-success)' : score >= 40 ? 'var(--color-warning)' : 'var(--color-error)';
        scoreCard.innerHTML = [
            '<div class="edia-summary-icon" aria-hidden="true">📊</div>',
            '<div class="edia-summary-value">' + score + '%</div>',
            '<div class="edia-summary-label">Readiness score</div>',
            '<div class="edia-readiness-bar" role="progressbar" aria-valuenow="' + score + '" aria-valuemin="0" aria-valuemax="100" aria-label="Readiness ' + score + '%">',
            '  <div class="edia-readiness-fill" style="width:' + score + '%;background:' + barColor + '"></div>',
            '</div>',
            '<div class="edia-summary-desc">Based on automatically checkable criteria</div>'
        ].join('');
        grid.appendChild(scoreCard);

        return grid;
    }

    /* ====================================================================
     *  Individual criterion card
     * ==================================================================== */

    function buildCriterionCard(crit) {
        var st   = STATUS_CONFIG[crit.status]   || STATUS_CONFIG.orange;
        var vt   = VALIDATION_TYPE_CONFIG[crit.validationType] || VALIDATION_TYPE_CONFIG.manual;
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

        // Description
        var desc = document.createElement('p');
        desc.className = 'edia-criterion-description';
        desc.textContent = crit.description;
        body.appendChild(desc);

        // Evidence
        if (crit.evidence) {
            var ev = document.createElement('div');
            ev.className = 'edia-criterion-evidence';
            ev.innerHTML = '<span class="edia-evidence-label">Detected:</span> ' + escHtml(crit.evidence);
            body.appendChild(ev);
        }

        // Details / finding explanation
        if (crit.details) {
            var det = document.createElement('p');
            det.className = 'edia-criterion-details';
            det.textContent = crit.details;
            body.appendChild(det);
        }

        // Recommendation
        if (crit.recommendation) {
            var rec = document.createElement('div');
            rec.className = 'edia-criterion-recommendation';
            rec.innerHTML = '<span class="edia-rec-icon" aria-hidden="true">💡</span> ' + escHtml(crit.recommendation);
            body.appendChild(rec);
        }

        card.appendChild(body);

        // Footer: optional "Learn more" links
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

    /* ====================================================================
     *  Accordion section
     * ==================================================================== */

    function buildSectionAccordion(section, criteria, sectionIndex) {
        var sectionCriteria = criteria.filter(function (c) { return c.section === section.key; });
        if (sectionCriteria.length === 0) return null;

        var greens  = sectionCriteria.filter(function (c) { return c.status === 'green';  }).length;
        var oranges = sectionCriteria.filter(function (c) { return c.status === 'orange'; }).length;
        var reds    = sectionCriteria.filter(function (c) { return c.status === 'red';    }).length;

        // Derive section-level status from contents
        var sectionStatusCls = reds > 0 ? 'edia-section-has-red' : (oranges > 0 ? 'edia-section-has-orange' : 'edia-section-has-green');

        var details = document.createElement('details');
        details.className = 'edia-section-accordion ' + sectionStatusCls;
        // Open first three sections by default
        if (sectionIndex < 3) details.open = true;

        var summary = document.createElement('summary');
        summary.className = 'edia-section-summary';
        summary.innerHTML = [
            '<span class="edia-section-icon" aria-hidden="true">' + (section.icon || '📋') + '</span>',
            '<span class="edia-section-name">' + escHtml(section.label) + '</span>',
            '<span class="edia-section-counts">',
            '  <span class="edia-section-count edia-sc-green" title="Compliant">✅ ' + greens + '</span>',
            '  <span class="edia-section-count edia-sc-orange" title="Needs review">⚠️ ' + oranges + '</span>',
            '  <span class="edia-section-count edia-sc-red" title="Missing">❌ ' + reds + '</span>',
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

    /* ====================================================================
     *  No-file notice
     * ==================================================================== */

    function buildNoFileNotice() {
        var div = document.createElement('div');
        div.className = 'edia-no-file-notice';
        div.innerHTML = [
            '<div class="edia-no-file-icon" aria-hidden="true">📂</div>',
            '<p class="edia-no-file-text">',
            '  Load an <strong>.elpx</strong> or <strong>.elp</strong> file using the upload area above',
            '  to see your personalised EDIA quality assessment.',
            '</p>',
            '<p class="edia-no-file-subtext">',
            '  The criteria below are shown with placeholder statuses. They will update',
            '  automatically once a file has been loaded.',
            '</p>'
        ].join('');
        return div;
    }

    /* ====================================================================
     *  Main entry point
     * ==================================================================== */

    /**
     * Renders the complete EDIA dashboard into the given container element.
     *
     * @param {HTMLElement} container     – the #tab-edia panel element
     * @param {Array}       criteriaResults – output of EdiaCriteria.evaluateEdiaCriteria(report)
     * @param {object|null} report        – the validator report (may be null before file load)
     */
    function renderEdiaDashboard(container, criteriaResults, report) {
        if (!container) return;
        container.innerHTML = '';

        var sections = (typeof EdiaCriteria !== 'undefined' && EdiaCriteria.getSections)
            ? EdiaCriteria.getSections()
            : [];

        // Hero
        container.appendChild(buildHero());

        // No-file notice when no report yet
        if (!report) {
            container.appendChild(buildNoFileNotice());
        }

        // Legend
        container.appendChild(buildLegend());

        // Summary cards
        container.appendChild(buildSummaryCards(criteriaResults));

        // Section accordions
        var accordionWrapper = document.createElement('div');
        accordionWrapper.className = 'edia-sections';

        sections.forEach(function (section, idx) {
            var accordion = buildSectionAccordion(section, criteriaResults, idx);
            if (accordion) accordionWrapper.appendChild(accordion);
        });

        container.appendChild(accordionWrapper);
    }

    /* ====================================================================
     *  UMD export
     * ==================================================================== */

    var EdiaView = {
        renderEdiaDashboard: renderEdiaDashboard
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = EdiaView;
    } else {
        window.EdiaView = EdiaView;
    }
}());
