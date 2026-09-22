(function () {
  var FRAMEWORKS = ['EUAIA', 'GDPR', 'ISO42001', 'NIST'];
  var LABELS = { EUAIA: 'EU AI Act', GDPR: 'GDPR', ISO42001: 'ISO/IEC 42001', NIST: 'NIST AI RMF' };

  var docs = window.REQUIREMENTS.map(function (r) {
    return { id: r.id, text: [r.title, r.summary].join(' '), record: r };
  });
  var index = window.BM25.buildIndex(docs);

  var activeFilters = new Set(FRAMEWORKS);
  var input = document.getElementById('q');
  var results = document.getElementById('results');
  var meta = document.getElementById('meta');
  var filterBar = document.getElementById('filters');

  function highlight(text, matched) {
    if (!matched.length) return escapeHtml(text);
    var pattern = new RegExp('(' + matched.map(escapeRegex).join('|') + ')', 'gi');
    return escapeHtml(text).replace(pattern, '<b>$1</b>');
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]; });
  }
  function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function renderResult(r) {
    var rec = r.doc.record;
    var div = document.createElement('div');
    div.className = 'result';
    div.innerHTML =
      '<div class="top">' +
        '<span class="badge ' + rec.framework + '">' + LABELS[rec.framework] + '</span>' +
        '<span class="ref">' + escapeHtml(rec.ref) + '</span>' +
        '<span class="score">bm25 ' + r.score.toFixed(2) + '</span>' +
      '</div>' +
      '<h3>' + highlight(rec.title, r.matched) + '</h3>' +
      '<p>' + highlight(rec.summary, r.matched) + '</p>' +
      '<div class="matched">matched: ' + (r.matched.length ? r.matched.join(', ') : '&mdash;') + '</div>';
    return div;
  }

  function renderBrowse() {
    var visible = window.REQUIREMENTS.filter(function (r) { return activeFilters.has(r.framework); });
    meta.textContent = visible.length + ' of 56 requirements &mdash; type to search, or browse by framework.'
      .replace('&mdash;', '\u2014');
    results.innerHTML = '';
    visible.forEach(function (rec) {
      var div = document.createElement('div');
      div.className = 'result';
      div.innerHTML =
        '<div class="top">' +
          '<span class="badge ' + rec.framework + '">' + LABELS[rec.framework] + '</span>' +
          '<span class="ref">' + escapeHtml(rec.ref) + '</span>' +
        '</div>' +
        '<h3>' + escapeHtml(rec.title) + '</h3>' +
        '<p>' + escapeHtml(rec.summary) + '</p>';
      results.appendChild(div);
    });
  }

  function runSearch() {
    var q = input.value.trim();
    if (!q) { renderBrowse(); return; }

    var filteredDocs = docs.filter(function (d) { return activeFilters.has(d.record.framework); });
    var r = window.BM25.search(index, filteredDocs, q, { topN: 12 });

    results.innerHTML = '';
    if (!r.length) {
      meta.textContent = 'No requirement matches "' + q + '".';
      results.innerHTML = '<div class="empty">Nothing scored above zero. Try a shorter or more literal term ' +
        '&mdash; this is BM25 term matching, not a semantic model, so it will not infer a synonym you didn\'t type.</div>';
      return;
    }
    meta.textContent = r.length + ' result' + (r.length === 1 ? '' : 's') + ' for "' + q + '", ranked by BM25.';
    r.forEach(function (res) { results.appendChild(renderResult(res)); });
  }

  FRAMEWORKS.forEach(function (fw) {
    var chip = document.createElement('span');
    chip.className = 'filter active';
    chip.textContent = LABELS[fw];
    chip.dataset.fw = fw;
    chip.addEventListener('click', function () {
      if (activeFilters.has(fw) && activeFilters.size === 1) return; // never allow zero frameworks selected
      if (activeFilters.has(fw)) { activeFilters.delete(fw); chip.classList.remove('active'); }
      else { activeFilters.add(fw); chip.classList.add('active'); }
      runSearch();
    });
    filterBar.appendChild(chip);
  });

  input.addEventListener('input', runSearch);
  renderBrowse();
})();
