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
 *   resolveInput(inputEl)       -> like resolve(), but honours a suggestion picked from the dropdown
 *   swapSelections(a, b)        -> swaps picked-suggestion state between two inputs
 *
 * Depends on: window.TransferLocations (locations.js)
 * Optional:   window.RemoteSuggest (remote-suggest.js) for map-based place suggestions
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

  var KIND_LABELS = { airport: 'Havalimanı', region: 'Bölge', hotel: 'Otel', place: 'Harita önerisi' };
  var REMOTE_DEBOUNCE_MS = 300;
  var MAX_REMOTE_ITEMS = 7;
  /* Address segments that name a country/province, never a pricing region. */
  var GENERIC_ADDRESS_SEGMENTS = ['turkiye', 'turkey', 'antalya', 'antalya ili', 'antalya province'];
  var COUNTRY_SEGMENTS = ['turkiye', 'turkey'];

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

  var regionTerms = catalog.LOCATIONS
    .filter(function (location) { return location.kind === 'region'; })
    .map(function (location) {
      var terms = [location.name].concat(location.aliases).map(normalize).filter(function (term) {
        return term && GENERIC_ADDRESS_SEGMENTS.indexOf(term) === -1;
      });
      return { region: location.region, terms: terms };
    });

  /**
   * Finds the first pricing region whose name matches a normalized segment.
   *
   * @param {string} segment - Normalized address segment
   * @param {boolean} wholeWord - true: segment contains the term as whole words; false: segment equals the term
   * @returns {string|null} Pricing region key
   */
  function regionInSegment(segment, wholeWord) {
    var padded = ' ' + segment + ' ';
    for (var i = 0; i < regionTerms.length; i++) {
      var hit = regionTerms[i].terms.some(function (term) {
        return wholeWord ? padded.indexOf(' ' + term + ' ') !== -1 : segment === term;
      });
      if (hit) return regionTerms[i].region;
    }
    return null;
  }

  /**
   * Derives the pricing region from a map address such as
   * "Türkiye, Antalya, Kemer, Göynük, Hotel X". Exact segment matches win over
   * whole-word matches; the most specific segment wins (last when the address
   * starts with the country, otherwise first).
   *
   * Why: Remote suggestions are free text, so the price region must be read
   *      from the address instead of the catalog.
   *
   * @param {string} address - Full address text of a map suggestion
   * @returns {string|null} Pricing region key, or null when none is recognised
   */
  function regionFromAddress(address) {
    var segments = String(address || '').split(',').map(normalize).filter(Boolean);
    if (!segments.length) return null;
    var ordered = COUNTRY_SEGMENTS.indexOf(segments[0]) !== -1 ? segments.slice().reverse() : segments;

    var passes = [false, true];
    for (var p = 0; p < passes.length; p++) {
      for (var i = 0; i < ordered.length; i++) {
        var region = regionInSegment(ordered[i], passes[p]);
        if (region) return region;
      }
    }
    return null;
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
    var localItems = [];
    var remoteItems = [];
    var remoteTimer = null;
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
      input.dataset.selectedValue = location.name;
      input.dataset.selectedKind = location.kind;
      input.dataset.selectedRegion = location.region || '';
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

    function paint() {
      items = localItems.concat(remoteItems);
      list.textContent = '';
      items.forEach(function (location, position) {
        list.appendChild(buildOption(location, position));
      });
      setExpanded(items.length > 0);
    }

    function fetchRemote() {
      clearTimeout(remoteTimer);
      remoteItems = [];
      if (!global.RemoteSuggest || !global.RemoteSuggest.isEnabled()) return;

      var requestedText = input.value;
      remoteTimer = setTimeout(function () {
        global.RemoteSuggest.query(requestedText).then(function (results) {
          if (input.value !== requestedText || document.activeElement !== input) return;
          remoteItems = results.slice(0, MAX_REMOTE_ITEMS).map(function (result) {
            return { name: result.displayName, kind: 'place', region: regionFromAddress(result.displayName), aliases: [] };
          });
          paint();
        });
      }, REMOTE_DEBOUNCE_MS);
    }

    function render() {
      localItems = dropdownItems(input.value);
      remoteItems = [];
      paint();
      fetchRemote();
    }

    input.addEventListener('input', function () {
      delete input.dataset.selectedValue;
      render();
    });
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

  /**
   * Resolves what an input currently means. A suggestion picked from the
   * dropdown (still unchanged) is trusted as-is; anything typed by hand goes
   * through resolve().
   *
   * @param {HTMLInputElement} input - Location input
   * @returns {{status: string, location: (Object|null), label: string, suggestions: Object[]}}
   */
  function resolveInput(input) {
    if (input.dataset.selectedValue && input.dataset.selectedValue === input.value) {
      return {
        status: 'match',
        location: {
          name: input.value,
          kind: input.dataset.selectedKind,
          region: input.dataset.selectedRegion || null
        },
        label: input.value,
        suggestions: []
      };
    }
    return resolve(input.value);
  }

  /** Swaps the picked-suggestion state of two inputs (used with the swap button). */
  function swapSelections(first, second) {
    ['selectedValue', 'selectedKind', 'selectedRegion'].forEach(function (key) {
      var firstValue = first.dataset[key];
      var secondValue = second.dataset[key];
      if (secondValue === undefined) delete first.dataset[key]; else first.dataset[key] = secondValue;
      if (firstValue === undefined) delete second.dataset[key]; else second.dataset[key] = firstValue;
    });
  }

  global.LocationSearch = Object.freeze({
    resolve: resolve,
    resolveInput: resolveInput,
    swapSelections: swapSelections,
    regionName: regionName,
    attach: attach
  });
})(window);
