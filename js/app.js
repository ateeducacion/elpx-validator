/**
 * eXeLearning Package Validator – UI layer.
 *
 * Provides the interactive interface:
 *  - Drag-and-drop upload
 *  - Tabbed navigation (Overview, Findings, Pages, iDevices, Assets, Preview)
 *  - Summary banner with error/warning/info counts
 *  - Structured finding display with filtering
 *  - Asset explorer with preview capabilities
 *  - Page tree view
 *  - iDevice summary
 *  - HTML page preview in sandboxed iframe
 */
(function () {
    var validator = typeof ELPValidator !== 'undefined' ? ELPValidator : {};
    var preview   = typeof ELPXPreview !== 'undefined' ? ELPXPreview : {};
    var assetRules = validator.assetRules || (typeof ELPXAssetRules !== 'undefined' ? ELPXAssetRules : {});
    var ideviceRegistry = validator.ideviceRegistry || (typeof ELPXIdeviceRegistry !== 'undefined' ? ELPXIdeviceRegistry : {});
    var ediaCriteria = typeof EdiaCriteria !== 'undefined' ? EdiaCriteria : null;
    var ediaView     = typeof EdiaView     !== 'undefined' ? EdiaView     : null;
    var i18n         = typeof ELPXI18n     !== 'undefined' ? ELPXI18n     : null;

    /* ================================================================== */
    /*  DOM references                                                    */
    /* ================================================================== */

    var dropzone          = document.getElementById('dropzone');
    var fileInput         = document.getElementById('fileInput');
    var resultsSection    = document.getElementById('results');
    var fileNameElement   = document.getElementById('fileName');
    var checklist         = document.getElementById('checklist');
    var metadataSection   = document.getElementById('packageMetadata');
    var summaryBanner     = document.getElementById('summaryBanner');
    var badgeFormat       = document.getElementById('badgeFormat');
    var countErrors       = document.getElementById('countErrors');
    var countWarnings     = document.getElementById('countWarnings');
    var countInfos        = document.getElementById('countInfos');

    var metadataFields = {
        title: document.getElementById('meta-title'),
        author: document.getElementById('meta-author'),
        language: document.getElementById('meta-language'),
        description: document.getElementById('meta-description'),
        license: document.getElementById('meta-license'),
        version: document.getElementById('meta-version'),
        identifier: document.getElementById('meta-identifier'),
        fileSize: document.getElementById('meta-filesize')
    };
    var metadataMore              = document.getElementById('metadataMore');
    var metadataPropertiesList    = document.getElementById('meta-properties');
    var metadataResourcesList     = document.getElementById('meta-resources');
    var metadataPropertiesSection = document.getElementById('meta-properties-section');
    var metadataResourcesSection  = document.getElementById('meta-resources-section');

    // Findings
    var findingsList              = document.getElementById('findingsList');
    var findingsFilterSeverity    = document.getElementById('findingsFilterSeverity');
    var findingsFilterCategory    = document.getElementById('findingsFilterCategory');

    // Pages
    var pagesTree = document.getElementById('pagesTree');

    // iDevices
    var ideviceSummaryPanel = document.getElementById('ideviceSummaryPanel');
    var ideviceList         = document.getElementById('ideviceList');

    // Assets
    var assetSummaryPanel    = document.getElementById('assetSummaryPanel');
    var assetTableBody       = document.getElementById('assetTableBody');
    var assetsFilter         = document.getElementById('assetsFilter');

    // Preview
    var previewPageSelect   = document.getElementById('previewPageSelect');
    var previewFrame        = document.getElementById('previewFrame');
    var languageSelect      = document.getElementById('languageSelect');

    // EDIA Validation
    var ediaPanel = document.getElementById('ediaPanel');

    if (!dropzone || !fileInput || !checklist) {
        console.error('The validator UI elements are missing.');
        return;
    }

    /* ================================================================== */
    /*  State                                                             */
    /* ================================================================== */

    var currentReport = null;
    var currentZip    = null;
    var virtualFS     = null;
    var currentFileInfo = null;

    /* ================================================================== */
    /*  Helpers                                                           */
    /* ================================================================== */

    var iconMap = {
        pending: '⏳',
        success: '✅',
        warning: '⚠️',
        error:   '❌'
    };

    var severityIcon = {
        error:   '❌',
        warning: '⚠️',
        info:    'ℹ️'
    };

    function formatBytes(bytes) {
        if (!Number.isFinite(bytes)) return '—';
        var thresh = 1024;
        if (Math.abs(bytes) < thresh) return bytes + ' B';
        var units = ['KB', 'MB', 'GB', 'TB'];
        var u = -1;
        var value = bytes;
        do { value /= thresh; u += 1; }
        while (Math.abs(value) >= thresh && u < units.length - 1);
        return (value < 10 ? value.toFixed(2) : value < 100 ? value.toFixed(1) : value.toFixed(0)) + ' ' + units[u];
    }

    function escapeHtml(str) {
        if (str == null) return '';
        var div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function translate(key, fallback, params) {
        if (!i18n || typeof i18n.t !== 'function') return fallback != null ? fallback : key;
        var value = i18n.t(key, params || {});
        return value === key && fallback != null ? fallback : value;
    }

    function getEmptyValue() {
        return translate('common.notAvailable', '—');
    }

    function getUntitledLabel() {
        return translate('common.untitled', '(untitled)');
    }

    function getPageWord(count) {
        return translate(count === 1 ? 'common.page' : 'common.pages', count === 1 ? 'page' : 'pages');
    }

    function getBlockWord(count) {
        return translate(count === 1 ? 'common.block' : 'common.blocks', count === 1 ? 'block' : 'blocks');
    }

    function getComponentWord(count) {
        return translate(count === 1 ? 'common.component' : 'common.components', count === 1 ? 'component' : 'components');
    }

    function getCategoryLabel(category) {
        return translate('category.' + category, category);
    }

    function getIdeviceStatusLabel(status) {
        return translate('idevice.statuses.' + status, status);
    }

    function getAssetStatusLabel(status) {
        return translate('assets.statuses.' + status, status);
    }

    function getFindingTranslationParams(finding) {
        var params = {
            code: finding.code,
            severity: finding.severity,
            category: finding.category
        };
        if (finding.location) {
            Object.keys(finding.location).forEach(function (key) {
                params[key] = finding.location[key];
            });
        }
        if (finding.evidence) {
            Object.keys(finding.evidence).forEach(function (key) {
                params[key] = finding.evidence[key];
            });
        }
        return params;
    }

    function getFindingText(finding, field) {
        var key = 'findings.' + finding.code + '.' + field;
        var translated = translate(key, null, getFindingTranslationParams(finding));
        if (translated !== key && translated != null) return translated;
        return finding[field] || '';
    }

    function getPreviewPlaceholder() {
        return translate('preview.placeholder', '— select a page —');
    }

    function syncLanguageSelector() {
        if (languageSelect && i18n && typeof i18n.getLanguage === 'function') {
            languageSelect.value = i18n.getLanguage();
        }
    }

    function applyStaticTranslations() {
        if (i18n && typeof i18n.translateDom === 'function') {
            i18n.translateDom(document);
        }
        syncLanguageSelector();
    }

    function getChecklistLabel(item, asHtml) {
        if (!item) return '';
        var key = asHtml ? item.dataset.labelHtmlI18n : item.dataset.labelI18n;
        if (!key) return item.dataset.label || '';
        return translate(key, item.dataset.label || '');
    }

    /* ================================================================== */
    /*  Tab navigation                                                    */
    /* ================================================================== */

    var tabButtons = document.querySelectorAll('.tab[data-tab]');
    var tabPanels  = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var targetId = btn.dataset.tab;
            tabButtons.forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
            tabPanels.forEach(function (p) { p.classList.remove('active'); p.hidden = true; });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            var panel = document.getElementById(targetId);
            if (panel) { panel.classList.add('active'); panel.hidden = false; }
        });
    });

    /* ================================================================== */
    /*  Checklist (legacy overview)                                       */
    /* ================================================================== */

    function resetChecklist() {
        var items = checklist.querySelectorAll('.check-item');
        items.forEach(function (item) {
            item.className = 'check-item pending';
            var icon = item.querySelector('.icon');
            var label = getChecklistLabel(item, false) || translate('checklist.runningCheck', 'Running check');
            var labelHtml = getChecklistLabel(item, true) || label;
            var details = item.querySelector('.details');
            item.dataset.label = label;
            if (icon) icon.textContent = iconMap.pending;
            var labelElement = item.querySelector('.label');
            if (labelElement) labelElement.innerHTML = labelHtml + '...';
            if (details) { details.textContent = ''; details.style.display = 'none'; }
        });
        var pagesItem = document.getElementById('check-pages');
        if (pagesItem) {
            var extra = pagesItem.querySelector('.pages-collapsible');
            if (extra) extra.remove();
        }
    }

    function setChecklistStatus(id, status, message) {
        var item = document.getElementById(id);
        if (!item) return;
        item.className = 'check-item ' + status;
        var icon = item.querySelector('.icon');
        var details = item.querySelector('.details');
        var labelElement = item.querySelector('.label');
        if (icon && iconMap[status]) icon.textContent = iconMap[status];
        if (details) {
            if (message) { details.textContent = message; details.style.display = 'block'; }
            else { details.textContent = ''; details.style.display = 'none'; }
        }
        if (labelElement && status !== 'pending') {
            var label = item.dataset.label || getChecklistLabel(item, false) || labelElement.textContent;
            labelElement.textContent = label + (status === 'success' ? ' ✓' : '');
        }
    }

    function renderPageTitles(titles) {
        var item = document.getElementById('check-pages');
        if (!item) return;
        var container = item.querySelector('div');
        if (!container) return;
        var existing = item.querySelector('.pages-collapsible');
        if (existing) existing.remove();
        if (!titles || titles.length === 0) return;

        var details = document.createElement('details');
        details.className = 'pages-collapsible';
        details.open = false;
        var summary = document.createElement('summary');
        summary.textContent = translate('common.showPageTitles', 'Show page titles ({count})', { count: titles.length });
        details.appendChild(summary);

        var list = document.createElement('ul');
        list.className = 'pages-list';
        titles.forEach(function (title) {
            var li = document.createElement('li');
            li.textContent = title || getUntitledLabel();
            list.appendChild(li);
        });
        details.appendChild(list);
        container.appendChild(details);
    }

    /* ================================================================== */
    /*  Metadata panel                                                    */
    /* ================================================================== */

    function clearMetadata() {
        if (metadataSection) metadataSection.hidden = true;
        Object.values(metadataFields).forEach(function (field) { if (field) field.textContent = getEmptyValue(); });
        if (metadataMore) { metadataMore.hidden = true; metadataMore.open = false; }
        if (metadataPropertiesList) metadataPropertiesList.innerHTML = '';
        if (metadataResourcesList)  metadataResourcesList.innerHTML = '';
        if (metadataPropertiesSection) metadataPropertiesSection.style.display = 'none';
        if (metadataResourcesSection)  metadataResourcesSection.style.display = 'none';
    }

    function populateKeyValueList(container, entries) {
        if (!container) return;
        container.innerHTML = '';
        entries.forEach(function (entry) {
            var key = entry[0];
            var value = entry[1];
            var item = document.createElement('li');
            var keyElement = document.createElement('code');
            keyElement.textContent = key;
            var valueElement = document.createElement('span');
            valueElement.className = 'metadata-value';
            var displayValue = value;
            if (displayValue === null || displayValue === undefined || displayValue === '') {
                displayValue = getEmptyValue();
            } else if (typeof displayValue === 'object') {
                try { displayValue = JSON.stringify(displayValue, null, 2); }
                catch (e) { displayValue = String(displayValue); }
            }
            valueElement.textContent = displayValue;
            item.appendChild(keyElement);
            item.appendChild(document.createTextNode(': '));
            item.appendChild(valueElement);
            container.appendChild(item);
        });
    }

    function renderMetadata(metadata) {
        if (!metadataSection || !metadata) return;
        var properties = metadata.properties || {};
        var resources = metadata.resources || {};
        var hasMetadata = Object.keys(properties).length > 0 || Object.keys(resources).length > 0;
        if (!hasMetadata) {
            metadataSection.hidden = true;
            if (metadataMore) metadataMore.hidden = true;
            return;
        }

        var fieldValues = {
            title: properties.pp_title || properties.title || '',
            author: properties.pp_author || '',
            language: properties.pp_lang || properties.language || '',
            description: properties.pp_description || '',
            license: properties.license || '',
            version: resources.odeVersionName || properties.version || '',
            identifier: resources.odeId || resources.odeVersionId || ''
        };

        Object.entries(fieldValues).forEach(function (entry) {
            var field = metadataFields[entry[0]];
            if (field) field.textContent = entry[1] || getEmptyValue();
        });

        var primaryPropertyKeys = new Set(['pp_title', 'pp_author', 'pp_lang', 'pp_description', 'license', 'title', 'language', 'version']);
        var primaryResourceKeys = new Set(['odeVersionName', 'odeId', 'odeVersionId']);
        var extraPropertyEntries = Object.entries(properties).filter(function (e) { return !primaryPropertyKeys.has(e[0]); });
        var extraResourceEntries = Object.entries(resources).filter(function (e) { return !primaryResourceKeys.has(e[0]); });

        if (metadataPropertiesSection) metadataPropertiesSection.style.display = extraPropertyEntries.length > 0 ? '' : 'none';
        if (metadataResourcesSection)  metadataResourcesSection.style.display = extraResourceEntries.length > 0 ? '' : 'none';
        populateKeyValueList(metadataPropertiesList, extraPropertyEntries);
        populateKeyValueList(metadataResourcesList, extraResourceEntries);
        if (metadataMore) {
            var hasExtra = extraPropertyEntries.length > 0 || extraResourceEntries.length > 0;
            metadataMore.hidden = !hasExtra;
            if (!hasExtra) metadataMore.open = false;
        }
        metadataSection.hidden = false;
    }

    /* ================================================================== */
    /*  Summary banner                                                    */
    /* ================================================================== */

    function renderSummary(report) {
        if (!summaryBanner) return;
        summaryBanner.hidden = false;

        // Format badge
        if (badgeFormat) {
            if (report.format === 'elpx') {
                badgeFormat.textContent = translate('summary.format.elpx', 'Modern ELPX');
                badgeFormat.className = 'badge-format badge-elpx';
            } else if (report.format === 'elp') {
                badgeFormat.textContent = translate('summary.format.elp', 'Legacy ELP');
                badgeFormat.className = 'badge-format badge-elp';
            } else {
                badgeFormat.textContent = translate('summary.format.unknown', 'Unknown');
                badgeFormat.className = 'badge-format badge-unknown';
            }
        }

        if (countErrors)   countErrors.innerHTML   = '❌ <strong>' + report.counts.errors   + '</strong>';
        if (countWarnings) countWarnings.innerHTML = '⚠️ <strong>' + report.counts.warnings + '</strong>';
        if (countInfos)    countInfos.innerHTML    = 'ℹ️ <strong>' + report.counts.infos    + '</strong>';
    }

    /* ================================================================== */
    /*  Findings panel                                                    */
    /* ================================================================== */

    function renderFindings(findings) {
        if (!findingsList) return;
        findingsList.innerHTML = '';

        if (!findings || findings.length === 0) {
            findingsList.innerHTML = '<p class="findings-empty">' + escapeHtml(translate('findings.empty', 'No findings to display.')) + '</p>';
            return;
        }

        var severityFilter = findingsFilterSeverity ? findingsFilterSeverity.value : 'all';
        var categoryFilter = findingsFilterCategory ? findingsFilterCategory.value : 'all';

        var filtered = findings.filter(function (f) {
            if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
            if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
            return true;
        });

        if (filtered.length === 0) {
            findingsList.innerHTML = '<p class="findings-empty">' + escapeHtml(translate('findings.filteredEmpty', 'No findings match the current filters.')) + '</p>';
            return;
        }

        filtered.forEach(function (f) {
            var message = getFindingText(f, 'message');
            var details = getFindingText(f, 'details');
            var suggestionText = getFindingText(f, 'suggestion');
            var card = document.createElement('div');
            card.className = 'finding-card finding-' + f.severity;

            var header = document.createElement('div');
            header.className = 'finding-header';
            header.innerHTML = '<span class="finding-icon">' + (severityIcon[f.severity] || '') + '</span>'
                + '<code class="finding-code">' + escapeHtml(f.code) + '</code>'
                + '<span class="finding-category">' + escapeHtml(getCategoryLabel(f.category)) + '</span>'
                + '<span class="finding-message">' + escapeHtml(message) + '</span>';
            card.appendChild(header);

            if (details) {
                var detailsEl = document.createElement('p');
                detailsEl.className = 'finding-details';
                detailsEl.textContent = details;
                card.appendChild(detailsEl);
            }

            if (suggestionText) {
                var suggestion = document.createElement('p');
                suggestion.className = 'finding-suggestion';
                suggestion.textContent = translate('findings.suggestionPrefix', '💡 ') + suggestionText;
                card.appendChild(suggestion);
            }

            if (f.location && Object.keys(f.location).length > 0) {
                var loc = document.createElement('p');
                loc.className = 'finding-location';
                loc.textContent = '📍 ' + translate('findings.location', 'Location') + ': '
                    + Object.entries(f.location).map(function (e) { return e[0] + ': ' + e[1]; }).join(', ');
                card.appendChild(loc);
            }

            findingsList.appendChild(card);
        });
    }

    if (findingsFilterSeverity) findingsFilterSeverity.addEventListener('change', function () { if (currentReport) renderFindings(currentReport.findings); });
    if (findingsFilterCategory) findingsFilterCategory.addEventListener('change', function () { if (currentReport) renderFindings(currentReport.findings); });

    /* ================================================================== */
    /*  Pages tree panel                                                  */
    /* ================================================================== */

    function renderPagesTree(model) {
        if (!pagesTree) return;
        pagesTree.innerHTML = '';

        if (!model || !model.pages || model.pages.length === 0) {
            pagesTree.innerHTML = '<p class="panel-empty">' + escapeHtml(translate('pages.empty', 'No pages found in this package.')) + '</p>';
            return;
        }

        // Build page lookup
        var pageMap = {};
        model.pages.forEach(function (p) { if (p.odePageId) pageMap[p.odePageId] = p; });

        // Group by parent
        var children = {};
        model.pages.forEach(function (p) {
            var parentId = p.odeParentPageId || '__root__';
            if (!children[parentId]) children[parentId] = [];
            children[parentId].push(p);
        });

        // Sort siblings by order
        Object.keys(children).forEach(function (key) {
            children[key].sort(function (a, b) { return (Number(a.order) || 0) - (Number(b.order) || 0); });
        });

        function buildTree(parentId) {
            var items = children[parentId] || [];
            if (items.length === 0) return null;
            var ul = document.createElement('ul');
            ul.className = 'tree-list';
            items.forEach(function (page) {
                var li = document.createElement('li');
                li.className = 'tree-item';
                var label = document.createElement('span');
                label.className = 'tree-label';
                var blockCount = page.blocks.length;
                var componentCount = page.blocks.reduce(function (sum, b) { return sum + b.components.length; }, 0);
                label.innerHTML = '<strong>' + escapeHtml(page.pageName || getUntitledLabel()) + '</strong>'
                    + ' <code>' + escapeHtml(page.odePageId || '?') + '</code>'
                    + ' <span class="tree-meta">' + blockCount + ' ' + getBlockWord(blockCount) + ', '
                    + componentCount + ' ' + getComponentWord(componentCount) + '</span>';
                li.appendChild(label);

                // Blocks
                if (page.blocks.length > 0) {
                    var blockList = document.createElement('ul');
                    blockList.className = 'tree-blocks';
                    page.blocks.forEach(function (block) {
                        var bli = document.createElement('li');
                        bli.className = 'tree-block';
                        bli.innerHTML = '📦 <strong>' + escapeHtml(block.blockName || getUntitledLabel()) + '</strong>'
                            + ' <code>' + escapeHtml(block.odeBlockId || '?') + '</code>';

                        if (block.components.length > 0) {
                            var compList = document.createElement('ul');
                            compList.className = 'tree-components';
                            block.components.forEach(function (comp) {
                                var cli = document.createElement('li');
                                cli.className = 'tree-component';
                                var lookup = ideviceRegistry.lookup ? ideviceRegistry.lookup(comp.odeIdeviceTypeName) : { known: false };
                                var typeClass = lookup.known ? 'type-known' : 'type-unknown';
                                cli.innerHTML = '🧩 <span class="' + typeClass + '">' + escapeHtml(comp.odeIdeviceTypeName || '?') + '</span>'
                                    + ' <code>' + escapeHtml(comp.odeIdeviceId || '?') + '</code>';
                                compList.appendChild(cli);
                            });
                            bli.appendChild(compList);
                        }
                        blockList.appendChild(bli);
                    });
                    li.appendChild(blockList);
                }

                // Child pages
                var childTree = buildTree(page.odePageId);
                if (childTree) li.appendChild(childTree);

                ul.appendChild(li);
            });
            return ul;
        }

        var tree = buildTree('__root__');
        // Also handle orphaned pages (parent not found)
        var orphaned = model.pages.filter(function (p) {
            return p.odeParentPageId && p.odeParentPageId.trim() !== '' && !pageMap[p.odeParentPageId] && !children['__root__'].includes(p);
        });

        if (tree) pagesTree.appendChild(tree);

        if (orphaned.length > 0) {
            var orphanHeader = document.createElement('h4');
            orphanHeader.textContent = translate('pages.orphaned', 'Orphaned pages (dangling parent reference)');
            orphanHeader.className = 'orphan-header';
            pagesTree.appendChild(orphanHeader);
            var orphanTree = buildTree('__orphaned__');
            if (orphanTree) pagesTree.appendChild(orphanTree);
        }
    }

    /* ================================================================== */
    /*  iDevice panel                                                     */
    /* ================================================================== */

    function renderIdeviceSummary(ideviceSummary, model) {
        if (!ideviceSummaryPanel) return;
        ideviceSummaryPanel.innerHTML = '';

        if (!ideviceSummary) {
            ideviceSummaryPanel.innerHTML = '<p class="panel-empty">' + escapeHtml(translate('idevice.empty', 'No iDevice information available.')) + '</p>';
            return;
        }

        var html = '<div class="idevice-counts">'
            + '<span>' + escapeHtml(translate('idevice.total', 'Total')) + ': <strong>' + ideviceSummary.total + '</strong></span>'
            + '<span>' + escapeHtml(translate('idevice.knownDeep', 'Known (deep)')) + ': <strong>' + ideviceSummary.knownDeep + '</strong></span>'
            + '<span>' + escapeHtml(translate('idevice.knownShallow', 'Known (shallow)')) + ': <strong>' + ideviceSummary.knownShallow + '</strong></span>'
            + '<span>' + escapeHtml(translate('idevice.unknown', 'Unknown')) + ': <strong>' + ideviceSummary.unknown + '</strong></span>'
            + (ideviceSummary.parseErrors > 0 ? '<span class="parse-errors">' + escapeHtml(translate('idevice.parseErrors', 'Parse errors')) + ': <strong>' + ideviceSummary.parseErrors + '</strong></span>' : '')
            + '</div>';

        // Type breakdown
        if (ideviceSummary.typeCounts && Object.keys(ideviceSummary.typeCounts).length > 0) {
            html += '<h4>' + escapeHtml(translate('idevice.typesUsed', 'Types used')) + '</h4><table class="idevice-type-table"><thead><tr><th>'
                + escapeHtml(translate('idevice.type', 'Type')) + '</th><th>'
                + escapeHtml(translate('idevice.count', 'Count')) + '</th><th>'
                + escapeHtml(translate('idevice.status', 'Status')) + '</th></tr></thead><tbody>';
            var sorted = Object.entries(ideviceSummary.typeCounts).sort(function (a, b) { return b[1] - a[1]; });
            sorted.forEach(function (entry) {
                var typeName = entry[0];
                var count = entry[1];
                var lookup = ideviceRegistry.lookup ? ideviceRegistry.lookup(typeName) : { known: false, status: 'unknown' };
                var statusBadge = lookup.known
                    ? '<span class="badge badge-success">' + escapeHtml(getIdeviceStatusLabel(lookup.status)) + '</span>'
                    : '<span class="badge badge-warning">' + escapeHtml(getIdeviceStatusLabel('unknown')) + '</span>';
                html += '<tr><td><code>' + escapeHtml(typeName) + '</code></td><td>' + count + '</td><td>' + statusBadge + '</td></tr>';
            });
            html += '</tbody></table>';
        }

        ideviceSummaryPanel.innerHTML = html;
    }

    /* ================================================================== */
    /*  Asset panel                                                       */
    /* ================================================================== */

    function renderAssetSummary(assetSummary) {
        if (!assetSummaryPanel) return;
        if (!assetSummary) {
            assetSummaryPanel.innerHTML = '';
            return;
        }
        assetSummaryPanel.innerHTML = '<div class="asset-counts">'
            + '<span>' + escapeHtml(translate('assets.totalFiles', 'Total files')) + ': <strong>' + assetSummary.totalAssets + '</strong></span>'
            + '<span>' + escapeHtml(translate('assets.referenced', 'Referenced')) + ': <strong>' + assetSummary.referencedAssets + '</strong></span>'
            + '<span>' + escapeHtml(translate('assets.missing', 'Missing')) + ': <strong>' + assetSummary.missingAssets + '</strong></span>'
            + '<span>' + escapeHtml(translate('assets.orphaned', 'Orphaned')) + ': <strong>' + assetSummary.orphanedAssets + '</strong></span>'
            + '</div>';
    }

    function renderAssetTable(assets, findings, filter) {
        if (!assetTableBody) return;
        assetTableBody.innerHTML = '';

        if (!assets || assets.length === 0) {
            assetTableBody.innerHTML = '<tr><td colspan="5">' + escapeHtml(translate('assets.empty', 'No assets found.')) + '</td></tr>';
            return;
        }

        // Build a set of missing referenced paths from findings
        var missingPaths = new Set();
        if (findings) {
            findings.forEach(function (f) {
                if (f.code === 'ASSET001' && f.evidence && f.evidence.path) {
                    missingPaths.add(f.evidence.path);
                }
            });
        }

        var filterValue = filter || 'all';
        var filtered = assets;

        if (filterValue === 'referenced') {
            filtered = assets.filter(function (a) { return a.referenced; });
        } else if (filterValue === 'orphaned') {
            filtered = assets.filter(function (a) { return !a.referenced && a.isAssetDir; });
        } else if (filterValue === 'missing') {
            // Show missing references as virtual rows
            assetTableBody.innerHTML = '';
            missingPaths.forEach(function (path) {
                var tr = document.createElement('tr');
                tr.className = 'asset-missing';
                tr.innerHTML = '<td>' + escapeHtml(path) + '</td><td>' + escapeHtml(getEmptyValue()) + '</td><td>' + escapeHtml(getEmptyValue()) + '</td><td><span class="badge badge-error">' + escapeHtml(getAssetStatusLabel('missing')) + '</span></td><td>' + escapeHtml(getEmptyValue()) + '</td>';
                assetTableBody.appendChild(tr);
            });
            if (missingPaths.size === 0) {
                assetTableBody.innerHTML = '<tr><td colspan="5">' + escapeHtml(translate('assets.missingEmpty', 'No missing assets detected.')) + '</td></tr>';
            }
            return;
        }

        // Sort: asset dirs first, then alphabetically
        filtered.sort(function (a, b) {
            if (a.isAssetDir !== b.isAssetDir) return a.isAssetDir ? -1 : 1;
            return a.path.localeCompare(b.path);
        });

        // Limit display for large packages
        var limit = 500;
        var shown = filtered.slice(0, limit);

        shown.forEach(function (asset) {
            var tr = document.createElement('tr');
            var status = asset.referenced
                ? '<span class="badge badge-success">' + escapeHtml(getAssetStatusLabel('referenced')) + '</span>'
                : (asset.isAssetDir
                    ? '<span class="badge badge-warning">' + escapeHtml(getAssetStatusLabel('orphaned')) + '</span>'
                    : '<span class="badge badge-muted">' + escapeHtml(getAssetStatusLabel('structural')) + '</span>');
            var previewCell = getEmptyValue();
            if (asset.previewType === 'image') {
                previewCell = '🖼️';
            } else if (asset.previewType === 'audio') {
                previewCell = '🔊';
            } else if (asset.previewType === 'video') {
                previewCell = '🎬';
            } else if (asset.previewType === 'pdf') {
                previewCell = '📄';
            } else if (asset.previewType === 'code') {
                previewCell = '📝';
            }
            tr.innerHTML = '<td title="' + escapeHtml(asset.path) + '">' + escapeHtml(asset.path) + '</td>'
                + '<td>' + escapeHtml(asset.mimeType) + '</td>'
                + '<td>' + escapeHtml(asset.extension || getEmptyValue()) + '</td>'
                + '<td>' + status + '</td>'
                + '<td>' + previewCell + '</td>';
            assetTableBody.appendChild(tr);
        });

        if (filtered.length > limit) {
            var tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="5"><em>' + escapeHtml(translate('assets.showingLimit', 'Showing {shown} of {total} assets…', {
                shown: limit,
                total: filtered.length
            })) + '</em></td>';
            assetTableBody.appendChild(tr);
        }
    }

    if (assetsFilter) {
        assetsFilter.addEventListener('change', function () {
            if (currentReport) {
                renderAssetTable(currentReport.assetInventory, currentReport.findings, assetsFilter.value);
            }
        });
    }

    /* ================================================================== */
    /*  Preview panel                                                     */
    /* ================================================================== */

    function renderPreviewOptions(zip, selectedValue) {
        if (!previewPageSelect) return;
        previewPageSelect.innerHTML = '<option value="">' + escapeHtml(getPreviewPlaceholder()) + '</option>';

        if (!zip) return;
        var htmlFiles = Object.keys(zip.files).filter(function (name) {
            return (name === 'index.html' || name.startsWith('html/')) && name.endsWith('.html') && !zip.files[name].dir;
        }).sort();

        htmlFiles.forEach(function (name) {
            var opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            previewPageSelect.appendChild(opt);
        });

        if (selectedValue) {
            previewPageSelect.value = selectedValue;
        }
    }

    if (previewPageSelect) {
        previewPageSelect.addEventListener('change', async function () {
            var selected = previewPageSelect.value;
            if (!selected || !currentZip || !previewFrame) return;

            try {
                // Build virtual FS if not cached
                if (!virtualFS && preview.buildVirtualFS && assetRules.inferMime) {
                    virtualFS = await preview.buildVirtualFS(currentZip, assetRules.inferMime);
                }

                var htmlContent = await currentZip.file(selected).async('string');
                var basePath = selected.includes('/') ? selected.substring(0, selected.lastIndexOf('/') + 1) : '';

                if (virtualFS && preview.rewriteHtmlForPreview) {
                    htmlContent = preview.rewriteHtmlForPreview(htmlContent, virtualFS, basePath);
                }

                var blob = new Blob([htmlContent], { type: 'text/html' });
                var url = URL.createObjectURL(blob);
                previewFrame.src = url;
            } catch (e) {
                console.error('Preview error:', e);
                previewFrame.srcdoc = '<p style="padding:1rem;color:red;">' + escapeHtml(translate('preview.errorLoading', 'Error loading preview: {message}', {
                    message: e.message
                })) + '</p>';
            }
        });
    }

    /* ================================================================== */
    /*  EDIA Validation panel                                             */
    /* ================================================================== */

    /**
     * Renders (or re-renders) the EDIA quality dashboard.
     * Called after each file load and also once on page initialisation
     * so the EDIA tab shows useful content even before a file is loaded.
     *
     * @param {object|null} report – validator report, or null if no file loaded
     */
    function renderEdiaPanel(report) {
        if (!ediaPanel || !ediaCriteria || !ediaView) return;
        var criteria = ediaCriteria.evaluateEdiaCriteria(report || null);
        ediaView.renderEdiaDashboard(ediaPanel, criteria, report || null);
    }

    function rerenderCurrentState() {
        applyStaticTranslations();
        resetChecklist();

        if (!currentReport) {
            if (previewPageSelect) previewPageSelect.innerHTML = '<option value="">' + escapeHtml(getPreviewPlaceholder()) + '</option>';
            renderEdiaPanel(null);
            return;
        }

        var selectedPreview = previewPageSelect ? previewPageSelect.value : '';
        renderSummary(currentReport);
        renderMetadata(currentReport.metadata);
        if (metadataFields.fileSize && currentFileInfo) metadataFields.fileSize.textContent = formatBytes(currentFileInfo.size);
        populateLegacyChecklist(currentReport, currentZip);
        renderFindings(currentReport.findings);
        renderPagesTree(currentReport.model);
        renderIdeviceSummary(currentReport.ideviceSummary, currentReport.model);
        renderAssetSummary(currentReport.assetSummary);
        renderAssetTable(currentReport.assetInventory, currentReport.findings, assetsFilter ? assetsFilter.value : 'all');
        renderPreviewOptions(currentZip, selectedPreview);
        renderEdiaPanel(currentReport);
    }

    /* ================================================================== */
    /*  Main file handler                                                 */
    /* ================================================================== */

    async function handleFile(file) {
        if (!file) return;

        // Reset state
        currentReport = null;
        currentZip = null;
        virtualFS = null;
        currentFileInfo = { size: file.size };
        if (preview.revokeAll) preview.revokeAll();

        resultsSection.hidden = false;
        fileNameElement.textContent = file.name;
        clearMetadata();
        if (metadataFields.fileSize) metadataFields.fileSize.textContent = formatBytes(file.size);
        if (metadataSection) metadataSection.hidden = false;
        resetChecklist();

        // Reset all panels
        if (summaryBanner) summaryBanner.hidden = true;
        if (findingsList) findingsList.innerHTML = '';
        if (pagesTree) pagesTree.innerHTML = '';
        if (ideviceSummaryPanel) ideviceSummaryPanel.innerHTML = '';
        if (ideviceList) ideviceList.innerHTML = '';
        if (assetSummaryPanel) assetSummaryPanel.innerHTML = '';
        if (assetTableBody) assetTableBody.innerHTML = '';
        if (previewPageSelect) previewPageSelect.innerHTML = '<option value="">' + escapeHtml(getPreviewPlaceholder()) + '</option>';
        if (previewFrame) previewFrame.srcdoc = '';

        // Activate overview tab
        tabButtons.forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
        tabPanels.forEach(function (p) { p.classList.remove('active'); p.hidden = true; });
        var overviewBtn = document.getElementById('btn-tab-overview');
        var overviewPanel = document.getElementById('tab-overview');
        if (overviewBtn) { overviewBtn.classList.add('active'); overviewBtn.setAttribute('aria-selected', 'true'); }
        if (overviewPanel) { overviewPanel.classList.add('active'); overviewPanel.hidden = false; }

        /* -------------------------------------------------------------- */
        /*  Load ZIP                                                      */
        /* -------------------------------------------------------------- */

        var zip;
        try {
            var arrayBuffer = await file.arrayBuffer();
            zip = await JSZip.loadAsync(arrayBuffer);
            currentZip = zip;
            setChecklistStatus('check-zip', 'success', translate('checklist.zip.success', 'The archive was loaded successfully.'));
        } catch (error) {
            console.error(error);
            setChecklistStatus('check-zip', 'error', translate('checklist.zip.error', 'The file is not a valid ZIP archive or is corrupted.'));
            return;
        }

        /* -------------------------------------------------------------- */
        /*  Run full structured validation                                */
        /* -------------------------------------------------------------- */

        var report;
        try {
            report = await validator.runFullValidation(zip);
            currentReport = report;
        } catch (err) {
            console.error('Validation error:', err);
            setChecklistStatus('check-content-xml', 'error', translate('checklist.contentXml.validationFailed', 'Validation failed: {message}', {
                message: err.message
            }));
            return;
        }

        /* -------------------------------------------------------------- */
        /*  Populate legacy checklist from report                         */
        /* -------------------------------------------------------------- */

        populateLegacyChecklist(report, zip);

        /* -------------------------------------------------------------- */
        /*  Populate new panels                                           */
        /* -------------------------------------------------------------- */

        renderSummary(report);
        renderMetadata(report.metadata);
        if (metadataFields.fileSize) metadataFields.fileSize.textContent = formatBytes(file.size);
        if (metadataSection) metadataSection.hidden = false;

        renderFindings(report.findings);
        renderPagesTree(report.model);
        renderIdeviceSummary(report.ideviceSummary, report.model);
        renderAssetSummary(report.assetSummary);
        renderAssetTable(report.assetInventory, report.findings, assetsFilter ? assetsFilter.value : 'all');
        renderPreviewOptions(zip);
        renderEdiaPanel(report);
    }

    /**
     * Map the structured report back to the legacy checklist items.
     */
    function populateLegacyChecklist(report, zip) {
        // Manifest detection
        if (report.format === 'elp') {
            setChecklistStatus('check-content-xml', 'warning',
                translate('checklist.contentXml.legacyFound', 'content.xml is missing, but legacy contentv3.xml was found. This package was created with an eXeLearning version earlier than 3.0.'));
        } else if (report.format === 'elpx') {
            setChecklistStatus('check-content-xml', 'success', translate('checklist.contentXml.found', 'Found content.xml in the package.'));
        } else {
            setChecklistStatus('check-content-xml', 'error', translate('checklist.contentXml.missing', 'Neither content.xml nor legacy contentv3.xml were found.'));
            return;
        }

        // Folders
        var pkgInfo = report.packageInfo;
        if (pkgInfo) {
            var folderMsgs = [];
            if (pkgInfo.directories['content/resources/']) folderMsgs.push(translate('checklist.folders.detected', '{name} detected', { name: 'content/resources/' }));
            if (pkgInfo.directories['theme/']) folderMsgs.push(translate('checklist.folders.detected', '{name} detected', { name: 'theme/' }));
            if (pkgInfo.directories['html/']) folderMsgs.push(translate('checklist.folders.detected', '{name} detected', { name: 'html/' }));
            if (pkgInfo.directories['libs/']) folderMsgs.push(translate('checklist.folders.detected', '{name} detected', { name: 'libs/' }));
            if (folderMsgs.length > 0) {
                setChecklistStatus('check-folders', 'success', folderMsgs.join(' • '));
            } else {
                var hasContentDir = Object.keys(zip.files).some(function (n) { return n.startsWith('content/'); });
                var hasCustomDir = Object.keys(zip.files).some(function (n) { return n.startsWith('custom/'); });
                if (hasContentDir || hasCustomDir) {
                    var msgs = [];
                    if (hasContentDir) msgs.push(translate('checklist.folders.detected', '{name} detected', { name: 'content/' }));
                    if (hasCustomDir) msgs.push(translate('checklist.folders.detected', '{name} detected', { name: 'custom/' }));
                    setChecklistStatus('check-folders', 'success', msgs.join(' • '));
                } else {
                    setChecklistStatus('check-folders', 'warning', translate('checklist.folders.recommendedMissing', 'Recommended resource folders were not found.'));
                }
            }
        }

        // XML well-formedness
        var hasXmlError = report.findings.some(function (f) { return f.code === 'XML001'; });
        if (hasXmlError) {
            var xmlErr = report.findings.find(function (f) { return f.code === 'XML001'; });
            setChecklistStatus('check-xml-well-formed', 'error', xmlErr.details);
            return;
        }
        var manifestLabel = report.format === 'elp' ? 'contentv3.xml' : 'content.xml';
        setChecklistStatus('check-xml-well-formed', 'success', translate('checklist.xmlWellFormed.wellFormed', '{manifest} is well-formed.', {
            manifest: manifestLabel
        }));

        // For legacy, skip remaining
        if (report.format === 'elp') {
            var skippedMsg = translate('checklist.navStructures.skipped', 'Skipped: legacy eXeLearning manifests (contentv3.xml) do not expose modern navigation structures.');
            setChecklistStatus('check-root-element', 'warning', translate('checklist.rootElement.skipped', 'Legacy manifest format detected. Structural checks skipped.'));
            setChecklistStatus('check-nav-structures', 'warning', skippedMsg);
            setChecklistStatus('check-pages', 'warning', skippedMsg);
            renderPageTitles([]);
            setChecklistStatus('check-structure', 'warning', translate('checklist.structure.skipped', 'Skipped: legacy manifest layout is incompatible with modern structural rules.'));
            setChecklistStatus('check-resources', 'warning', translate('checklist.resources.skipped', 'Resource validation is unavailable for legacy manifests.'));
            return;
        }

        // Root element
        var rootErr = report.findings.find(function (f) { return f.code === 'XML002'; });
        if (rootErr) {
            setChecklistStatus('check-root-element', rootErr.severity, rootErr.details);
            return;
        }
        setChecklistStatus('check-root-element', 'success', translate('checklist.rootElement.success', 'The root element is <ode>.'));

        // Nav structures
        var navErr = report.findings.find(function (f) { return f.code === 'XML007'; });
        if (navErr) {
            setChecklistStatus('check-nav-structures', 'error', navErr.details);
            return;
        }
        setChecklistStatus('check-nav-structures', 'success', translate('checklist.navStructures.success', 'Navigation structures found.'));

        // Pages
        if (report.pageTitles && report.pageTitles.length > 0) {
            setChecklistStatus('check-pages', 'success', translate('checklist.pages.found', 'Found {count} {pageLabel}.', {
                count: report.pageTitles.length,
                pageLabel: getPageWord(report.pageTitles.length)
            }));
            renderPageTitles(report.pageTitles);
        } else {
            setChecklistStatus('check-pages', 'warning', translate('checklist.pages.empty', 'No pages found. The project appears empty.'));
            renderPageTitles([]);
        }

        // Structure
        var navIssues = report.findings.filter(function (f) { return f.category === 'navigation' && f.severity === 'error'; });
        if (navIssues.length > 0) {
            setChecklistStatus('check-structure', 'error', translate('checklist.structure.error', '{count} structural {issueLabel} found. See the Findings tab for details.', {
                count: navIssues.length,
                issueLabel: translate(navIssues.length === 1 ? 'checklist.issue' : 'checklist.issues', navIssues.length === 1 ? 'issue' : 'issues')
            }));
        } else {
            var navWarnings = report.findings.filter(function (f) { return f.category === 'navigation' && f.severity === 'warning'; });
            if (navWarnings.length > 0) {
                setChecklistStatus('check-structure', 'warning', translate('checklist.structure.warning', '{count} structural {warningLabel}. See the Findings tab.', {
                    count: navWarnings.length,
                    warningLabel: translate(navWarnings.length === 1 ? 'checklist.warningSingle' : 'checklist.warningPlural', navWarnings.length === 1 ? 'warning' : 'warnings')
                }));
            } else {
                setChecklistStatus('check-structure', 'success', translate('checklist.structure.success', 'The internal XML structure matches the expected layout.'));
            }
        }

        // Resources
        var missingAssets = report.findings.filter(function (f) { return f.code === 'ASSET001'; });
        if (missingAssets.length > 0) {
            var paths = missingAssets.map(function (f) { return f.evidence.path || 'unknown'; });
            setChecklistStatus('check-resources', 'warning',
                translate('checklist.resources.missing', 'Missing assets: {paths} — see Assets tab.', {
                    paths: paths.slice(0, 5).join(', ') + (paths.length > 5 ? ', …' : '')
                })
            );
        } else {
            var refCount = report.assetSummary ? report.assetSummary.totalReferences : 0;
            if (refCount > 0) {
                setChecklistStatus('check-resources', 'success', translate('checklist.resources.allPresent', 'All {count} referenced {assetLabel} are present.', {
                    count: refCount,
                    assetLabel: translate(refCount === 1 ? 'checklist.assetSingle' : 'checklist.assetPlural', refCount === 1 ? 'asset' : 'assets')
                }));
            } else {
                setChecklistStatus('check-resources', 'success', translate('checklist.resources.noneDetected', 'No linked resources were detected.'));
            }
        }
    }

    /* ================================================================== */
    /*  Event handlers (drag & drop, file input)                          */
    /* ================================================================== */

    function preventDefaults(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    dropzone.addEventListener('click', function () { fileInput.click(); });
    dropzone.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            fileInput.click();
        }
    });

    ['dragenter', 'dragover'].forEach(function (eventName) {
        dropzone.addEventListener(eventName, function (event) {
            preventDefaults(event);
            dropzone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(function (eventName) {
        dropzone.addEventListener(eventName, function (event) {
            preventDefaults(event);
            dropzone.classList.remove('dragover');
        });
    });

    dropzone.addEventListener('drop', async function (event) {
        var files = event.dataTransfer && event.dataTransfer.files;
        if (files && files.length > 0) {
            await handleFile(files[0]);
        }
    });

    fileInput.addEventListener('change', async function (event) {
        var files = event.target.files;
        if (files && files.length > 0) {
            await handleFile(files[0]);
            fileInput.value = '';
        }
    });

    if (languageSelect && i18n && typeof i18n.setLanguage === 'function') {
        syncLanguageSelector();
        languageSelect.addEventListener('change', function () {
            i18n.setLanguage(languageSelect.value);
        });
    }

    if (i18n && i18n.LANGUAGE_CHANGE_EVENT) {
        document.addEventListener(i18n.LANGUAGE_CHANGE_EVENT, function () {
            rerenderCurrentState();
        });
    }

    rerenderCurrentState();
})();
