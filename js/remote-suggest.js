/**
 * İlker Teker VIP Transfer - Remote Place Suggestions
 *
 * Why: Customers may travel from/to places that are not in our local catalog
 *      (any city, district, hotel or address in Türkiye). Map place
 *      suggestions let them pick any location while typing.
 * What: Picks a provider and exposes one query() API:
 *      - Yandex Maps (when SiteConfig.yandexMapsApiKey is set). Its script is
 *        loaded lazily, only after a location field gets focus.
 *      - Photon / OpenStreetMap (keyless fallback, SiteConfig.photonApiUrl),
 *        restricted to Türkiye.
 *
 * Public API (window.RemoteSuggest):
 *   isEnabled()  -> boolean  true when any provider is configured
 *   preload()    -> void     starts loading the Yandex script (no-op for Photon)
 *   query(text)  -> Promise<{displayName: string}[]>  never rejects; [] on any failure
 *
 * Depends on: window.SiteConfig (config.js)
 */
(function (global) {
  'use strict';

  var config = global.SiteConfig || {};

  var SCRIPT_URL = 'https://api-maps.yandex.ru/2.1/';
  var LANGUAGE = 'tr_TR';
  var MAX_RESULTS = 7;
  var MIN_QUERY_LENGTH = 3;
  /* Türkiye bounding box [south-west, north-east]; biases Yandex ranking to the whole country. */
  var TURKEY_BOUNDS = [[35.8, 25.6], [42.2, 44.9]];

  /* Photon: Türkiye bounding box (minLon,minLat,maxLon,maxLat) and ranking bias point (Antalya). */
  var TURKEY_BBOX = '25.6,35.8,44.9,42.2';
  var BIAS_LATITUDE = 36.9;
  var BIAS_LONGITUDE = 30.7;
  var PHOTON_FETCH_LIMIT = 15;
  var TURKEY_COUNTRY_CODE = 'TR';
  var ADDRESS_SEPARATOR = ', ';
  /* Photon properties joined (in order) to build a readable address. */
  var PHOTON_ADDRESS_FIELDS = ['name', 'street', 'district', 'city', 'county', 'state'];

  var loadPromise = null;

  /** @returns {boolean} Whether a Yandex key is configured. */
  function usesYandex() {
    return Boolean(config.yandexMapsApiKey);
  }

  /** @returns {boolean} Whether any suggestion provider is available. */
  function isEnabled() {
    return usesYandex() || Boolean(config.photonApiUrl);
  }

  /** @returns {string} Script URL carrying the configured keys. */
  function buildScriptUrl() {
    var params = ['lang=' + LANGUAGE, 'apikey=' + encodeURIComponent(config.yandexMapsApiKey)];
    if (config.yandexSuggestApiKey) {
      params.push('suggest_apikey=' + encodeURIComponent(config.yandexSuggestApiKey));
    }
    return SCRIPT_URL + '?' + params.join('&');
  }

  /** @returns {Promise<void>} Resolves once ymaps is ready (loaded at most once). */
  function load() {
    if (loadPromise) return loadPromise;

    loadPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = buildScriptUrl();
      script.async = true;
      script.onload = function () { global.ymaps.ready(resolve); };
      script.onerror = function () { loadPromise = null; reject(new Error('yandex-load-failed')); };
      document.head.appendChild(script);
    });
    return loadPromise;
  }

  /** Starts loading the Yandex script without waiting for it. */
  function preload() {
    if (usesYandex()) load().catch(function () {});
  }

  /**
   * Fetches suggestions from Yandex.
   *
   * @param {string} typed - Trimmed customer text
   * @returns {Promise<{displayName: string}[]>} Suggestions
   */
  function queryYandex(typed) {
    return load()
      .then(function () {
        return global.ymaps.suggest(typed, { results: MAX_RESULTS, boundedBy: TURKEY_BOUNDS, strictBounds: false });
      })
      .then(function (items) {
        return items.map(function (item) { return { displayName: String(item.displayName) }; });
      });
  }

  /**
   * Builds "Name, Street, District, City, County, State" from a Photon feature,
   * dropping empty and repeated parts.
   *
   * @param {Object} properties - Photon feature properties
   * @returns {string} Address text ('' when the feature has no usable name)
   */
  function photonDisplayName(properties) {
    var parts = [];
    PHOTON_ADDRESS_FIELDS.forEach(function (field) {
      var value = properties[field];
      if (value && parts.indexOf(value) === -1) parts.push(String(value));
    });
    return parts.join(ADDRESS_SEPARATOR);
  }

  /** @returns {string} Photon request URL for the typed text. */
  function buildPhotonUrl(typed) {
    var params = [
      'q=' + encodeURIComponent(typed),
      'limit=' + PHOTON_FETCH_LIMIT,
      'bbox=' + TURKEY_BBOX,
      'lat=' + BIAS_LATITUDE,
      'lon=' + BIAS_LONGITUDE
    ];
    return config.photonApiUrl + '?' + params.join('&');
  }

  /**
   * Fetches suggestions from Photon, keeping only places inside Türkiye.
   *
   * @param {string} typed - Trimmed customer text
   * @returns {Promise<{displayName: string}[]>} Unique suggestions
   */
  function queryPhoton(typed) {
    return fetch(buildPhotonUrl(typed))
      .then(function (response) {
        if (!response.ok) throw new Error('photon-request-failed');
        return response.json();
      })
      .then(function (data) {
        var seen = {};
        return (data.features || [])
          .map(function (feature) { return feature.properties || {}; })
          .filter(function (properties) { return properties.countrycode === TURKEY_COUNTRY_CODE; })
          .map(photonDisplayName)
          .filter(function (name) {
            if (!name || seen[name]) return false;
            seen[name] = true;
            return true;
          })
          .slice(0, MAX_RESULTS)
          .map(function (name) { return { displayName: name }; });
      });
  }

  /**
   * Fetches place suggestions for the typed text.
   *
   * @param {string} text - Text typed by the customer
   * @returns {Promise<{displayName: string}[]>} Suggestions, or [] when disabled/failed
   */
  function query(text) {
    var typed = String(text || '').trim();
    if (!isEnabled() || typed.length < MIN_QUERY_LENGTH) return Promise.resolve([]);

    var provider = usesYandex() ? queryYandex : queryPhoton;
    return provider(typed).catch(function () { return []; });
  }

  global.RemoteSuggest = Object.freeze({
    isEnabled: isEnabled,
    preload: preload,
    query: query
  });
})(window);
