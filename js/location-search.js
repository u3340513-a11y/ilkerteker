/**
 * İlker Teker VIP Transfer - Location Search
 *
 * Why: Customers type hotel / place names (often misspelled) instead of
 *      picking districts. This module resolves free text to a catalog entry
 *      (see locations.js) with Turkish-aware, typo-tolerant matching, and
 *      provides an accessible autocomplete (ARIA combobox) for text inputs.
 *
 * Public API (window.LocationSearch):
 *   resolve(text)               -> { status, location, label, suggestions }
 *       status: 'match' | 'suggest' | 'none'
 *   regionName(regionKey)       -> display name of a pricing region
 *   attach(inputEl, listEl)     -> binds the autocomplete dropdown
 *
 * Depends on: window.TransferLocations (locations.js)
 */
(function (global) {
  'use strict';

  var catalog = global.TransferLocations;
  if (!catalog) return;

  /* ---- Tunable matching thresholds ---- */
  var MIN_SUGGEST_SCORE = 0.6;
  var MIN_DROPDOWN_SCORE = 0.5;
  var AUTO_ACCEPT_SCORE = 0.85;
  var TIE_MARGIN = 0.05;
  var PREFIX_SCORE = 0.92;
  var TOKEN_PREFIX_SCORE = 0.95;
  var TOKEN_PARTIAL_WEIGHT = 0.9;
  var TOKEN_SCORE_CAP = 0.95;
  var MIN_PREFIX_LENGTH = 2;
  var MIN_PARTIAL_LENGTH = 3;
  var MAX_SUGGESTIONS = 4;
  var MAX_DROPDOWN_ITEMS = 7;
  var DEFAULT_REGION_COUNT = 6;

  var KIND_LABELS = { airport: 'Havalimanı', region: 'Bölge', hotel: 'Otel' };

  /**
   * Lowercases (Turkish rules), strips diacritics and punctuation so that
   * "Çamyuva", "camyuva" and "ÇAMYUVA!" compare equal.
   *
   * @param {string} text - Raw user text
   * @returns {string} Normalized text (a-z, 0-9 and single spaces)
   */
  function normalize(text) {
    return String(text || '')
      .toLocaleLowerCase('tr')
      .replace(/ı/g, 'i')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  /**
   * Classic Levenshtein edit distance (single-row dynamic programming).
   *
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {number} Minimum number of single-character edits
   */
  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    var row = [];
    var i;
    var j;
    for (j = 0; j <= b.length; j++) row[j] = j;

    for (i = 1; i <= a.length; i++) {
      var previousDiagonal = row[0];
      row[0] = i;
      for (j = 1; j <= b.length; j++) {
        var temp = row[j];
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previousDiagonal + cost);
        previousDiagonal = temp;
      }
    }
    return row[b.length];
  }

  /** @returns {number} Similarity between 0 and 1 (1 = identical). */
  function similarity(a, b) {
    var longest = Math.max(a.length, b.length);
    return longest === 0 ? 1 : 1 - levenshtein(a, b) / longest;
  }

  /**
   * Scores one query token against one term token.
   *
   * @param {string} queryToken - Normalized query word
   * @param {string} termToken - Normalized catalog word
   * @returns {number} Score between 0 and 1
   */
  function scoreToken(queryToken, termToken) {
    if (queryToken === termToken) return 1;
    if (queryToken.length >= MIN_PREFIX_LENGTH && termToken.indexOf(queryToken) === 0) {
      return TOKEN_PREFIX_SCORE;
    }
    var best = similarity(queryToken, termToken);
    if (queryToken.length >= MIN_PARTIAL_LENGTH) {
      var termPrefix = termToken.slice(0, queryToken.length);
      best = Math.max(best, similarity(queryToken, termPrefix) * TOKEN_PARTIAL_WEIGHT);
    }
    return best;
  }

  /**
   * Scores a whole query against one normalized catalog term.
   *
   * @param {string} query - Normalized query
   * @param {string[]} queryTokens - Query split on spaces
   * @param {string} term - Normalized catalog term
   * @returns {number} Score between 0 and 1
   */
  function scoreTerm(query, queryTokens, term) {
    if (query === term) return 1;
    if (query.length >= MIN_PREFIX_LENGTH && term.indexOf(query) === 0) return PREFIX_SCORE;

    var termTokens = term.split(' ');
    var total = 0;
    queryTokens.forEach(function (queryToken) {
      var best = 0;
      termTokens.forEach(function (termToken) {
        best = Math.max(best, scoreToken(queryToken, termToken));
      });
      total += best;
    });
    var tokenScore = Math.min(total / queryTokens.length, TOKEN_SCORE_CAP);

    return Math.max(tokenScore, similarity(query, term));
  }

  /* ---- Pre-computed search index ---- */
  var index = catalog.LOCATIONS.map(function (location) {
    var terms = [location.name].concat(location.aliases).map(normalize).filter(Boolean);
    return { location: location, terms: terms };
  });

  var regionNames = {};
  catalog.LOCATIONS.forEach(function (location) {
    if (location.kind === 'region') regionNames[location.region] = location.name;
  });

  /**
   * Ranks catalog entries for a query, best first.
   *
   * @param {string} text - Raw user text
   * @param {number} minScore - Minimum score to include
   * @returns {{location: Object, score: number}[]} Ranked matches
   */
  function rank(text, minScore) {
    var query = normalize(text);
    if (!query) return [];
    var queryTokens = query.split(' ');

    return index
      .map(function (entry) {
        var best = 0;
        entry.terms.forEach(function (term) {
          best = Math.max(best, scoreTerm(query, queryTokens, term));
        });
        return { location: entry.location, score: best };
      })
      .filter(function (item) { return item.score >= minScore; })
      .sort(function (a, b) { return b.score - a.score; });
  }

  /**
   * Resolves free text into a pricing-relevant location.
   *
   * @param {string} text - Raw user text
   * @returns {{status: string, location: (Object|null), label: string, suggestions: Object[]}}
   *   status 'match'  -> location is reliable, label is the text to show
   *   status 'suggest'-> ambiguous / probable typo, suggestions has candidates
   *   status 'none'   -> nothing similar in catalog
   */
  function resolve(text) {
    var typed = String(text || '').trim();
    var ranked = rank(typed, MIN_SUGGEST_SCORE);

    if (!ranked.length) {
      return { status: 'none', location: null, label: typed, suggestions: [] };
    }

    var top = ranked[0];
    var tied = ranked.filter(function (item) { return top.score - item.score < TIE_MARGIN; });
    var sameRegion = tied.every(function (item) { return item.location.region === top.location.region; });

    if (top.score >= AUTO_ACCEPT_SCORE && (tied.length === 1 || sameRegion)) {
      return {
        status: 'match',
        location: top.location,
        label: tied.length === 1 ? top.location.name : typed,
        suggestions: []
      };
    }

    return {
      status: 'suggest',
      location: null,
      label: typed,
      suggestions: ranked.slice(0, MAX_SUGGESTIONS).map(function (item) { return item.location; })
    };
  }

  /** @returns {string} Region display name for a pricing key ('' if unknown). */
  function regionName(regionKey) {
    return regionNames[regionKey] || '';
  }

  /** @returns {string} Short descriptor shown next to a suggestion. */
  function describe(location) {
    var kind = KIND_LABELS[location.kind];
    if (location.kind === 'hotel') return kind + ' · ' + regionName(location.region);
    return kind;
  }

  /** Default dropdown content: airport plus the first few regions. */
  function defaultItems() {
    var regions = catalog.LOCATIONS.filter(function (l) { return l.kind === 'region'; });
    var airport = catalog.LOCATIONS.filter(function (l) { return l.kind === 'airport'; });
    return airport.concat(regions.slice(0, DEFAULT_REGION_COUNT));
  }

  /** @returns {Object[]} Catalog entries to show for the current input text. */
  function dropdownItems(text) {
    if (!normalize(text)) return defaultItems();
    return rank(text, MIN_DROPDOWN_SCORE)
      .slice(0, MAX_DROPDOWN_ITEMS)
      .map(function (item) { return item.location; });
  }

  /**
   * Binds an accessible autocomplete dropdown (ARIA 1.2 combobox) to an input.
   * Option text is rendered with textContent only (no HTML injection).
   *
   * @param {HTMLInputElement} input - Text input to enhance
   * @param {HTMLUListElement} list - Empty <ul> used as the listbox
   */
  function attach(input, list) {
    var items = [];
    var activeIndex = -1;

    function setExpanded(expanded) {
      list.hidden = !expanded;
      input.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      if (!expanded) {
        activeIndex = -1;
        input.removeAttribute('aria-activedescendant');
      }
    }

    function setActive(newIndex) {
      var options = list.children;
      if (activeIndex >= 0 && options[activeIndex]) {
        options[activeIndex].setAttribute('aria-selected', 'false');
      }
      activeIndex = newIndex;
      if (activeIndex >= 0 && options[activeIndex]) {
        options[activeIndex].setAttribute('aria-selected', 'true');
        input.setAttribute('aria-activedescendant', options[activeIndex].id);
        options[activeIndex].scrollIntoView({ block: 'nearest' });
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    }

    function choose(location) {
      input.value = location.name;
      setExpanded(false);
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function buildOption(location, position) {
      var option = document.createElement('li');
      option.id = list.id + '-option-' + position;
      option.className = 'location-option';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');

      var name = document.createElement('span');
      name.className = 'location-option-name';
      name.textContent = location.name;

      var meta = document.createElement('span');
      meta.className = 'location-option-meta';
      meta.textContent = describe(location);

      option.appendChild(name);
      option.appendChild(meta);
      option.addEventListener('mousedown', function (event) {
        event.preventDefault();
        choose(location);
      });
      return option;
    }

    function render() {
      items = dropdownItems(input.value);
      list.textContent = '';
      items.forEach(function (location, position) {
        list.appendChild(buildOption(location, position));
      });
      setExpanded(items.length > 0);
    }

    input.addEventListener('input', render);
    input.addEventListener('focus', function () {
      input.select();
      render();
    });
    input.addEventListener('blur', function () { setExpanded(false); });

    input.addEventListener('keydown', function (event) {
      var isOpen = !list.hidden;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!isOpen) render();
        if (!items.length) return;
        var step = event.key === 'ArrowDown' ? 1 : -1;
        setActive((activeIndex + step + items.length) % items.length);
      } else if (event.key === 'Enter' && isOpen && activeIndex >= 0) {
        event.preventDefault();
        choose(items[activeIndex]);
      } else if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        setExpanded(false);
      }
    });

    setExpanded(false);
  }

  global.LocationSearch = Object.freeze({
    resolve: resolve,
    regionName: regionName,
    attach: attach
  });
})(window);
