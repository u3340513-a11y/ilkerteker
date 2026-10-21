/**
 * İlker Teker VIP Transfer - Remote Place Suggestions
 *
 * Why: Customers may travel from/to places that are not in our local catalog
 *      (any city, district, hotel or address in Türkiye). Map place
 *      suggestions let them pick any location while typing.
 * What: Picks a provider and exposes one query() API:
 *      - Yandex Geosuggest HTTP API (when SiteConfig.yandexSuggestApiKey is set).
 *        No map script is loaded; one small JSON request per lookup.
 *      - Photon / OpenStreetMap (keyless fallback, SiteConfig.photonApiUrl) when
 *        Yandex is not configured or fails.
 *
 * Public API (window.RemoteSuggest):
 *   isEnabled()  -> boolean  true when any provider is configured
 *   query(text)  -> Promise<{displayName: string}[]>  never rejects; [] on any failure
 *
 * Depends on: window.SiteConfig (config.js)
 */
(function (global) {
  'use strict';

  var config = global.SiteConfig || {};

  var YANDEX_SUGGEST_URL = 'https://suggest-maps.yandex.ru/v1/suggest';
  var YANDEX_LANGUAGE = 'tr_TR';
  var MAX_RESULTS = 7;
  var MIN_QUERY_LENGTH = 3;
  var ADDRESS_SEPARATOR = ', ';

  /* Türkiye bounding box. Yandex: "lon,lat~lon,lat"; Photon: "minLon,minLat,maxLon,maxLat". */
  var YANDEX_TURKEY_BBOX = '25.6,35.8~44.9,42.2';
  var PHOTON_TURKEY_BBOX = '25.6,35.8,44.9,42.2';
  var BIAS_LATITUDE = 36.9;
  var BIAS_LONGITUDE = 30.7;
  var PHOTON_FETCH_LIMIT = 15;
  var TURKEY_COUNTRY_CODE = 'TR';
  /* Photon properties joined (in order) to build a readable address. */
  var PHOTON_ADDRESS_FIELDS = ['name', 'street', 'district', 'city', 'county', 'state'];

  /** @returns {boolean} Whether a Yandex Geosuggest key is configured. */
  function usesYandex() {
    return Boolean(config.yandexSuggestApiKey);
  }

  /** @returns {boolean} Whether any suggestion provider is available. */
  function isEnabled() {
    return usesYandex() || Boolean(config.photonApiUrl);
  }

  /**
   * Fetches JSON and fails on any non-2xx status.
   *
   * @param {string} url - Request URL
   * @returns {Promise<Object>} Parsed body
   */
  function fetchJson(url) {
    return fetch(url).then(function (response) {
      if (!response.ok) throw new Error('suggest-request-failed');
      return response.json();
    });
  }

  /** Removes empty and repeated entries, keeping first occurrences. */
  function uniqueNonEmpty(values) {
    var seen = {};
    return values.filter(function (value) {
      if (!value || seen[value]) return false;
      seen[value] = true;
      return true;
    });
  }

  /** @returns {string} Yandex Geosuggest request URL for the typed text. */
  function buildYandexUrl(typed) {
    var params = [
      'apikey=' + encodeURIComponent(config.yandexSuggestApiKey),
      'text=' + encodeURIComponent(typed),
      'lang=' + YANDEX_LANGUAGE,
      'results=' + MAX_RESULTS,
      'print_address=1',
      'bbox=' + YANDEX_TURKEY_BBOX,
      'strict_bounds=0'
    ];
    return YANDEX_SUGGEST_URL + '?' + params.join('&');
  }

  /**
   * Builds "Title, Subtitle" from a Yandex suggestion (subtitle carries the address).
   *
   * @param {Object} item - One entry of the Yandex "results" array
   * @returns {string} Display text ('' when the item has no title)
   */
  function yandexDisplayName(item) {
    var title = item.title && item.title.text;
    var subtitle = item.subtitle && item.subtitle.text;
    return uniqueNonEmpty([title, subtitle]).join(ADDRESS_SEPARATOR);
  }

  /**
   * Fetches suggestions from the Yandex Geosuggest HTTP API.
   *
   * @param {string} typed - Trimmed customer text
   * @returns {Promise<{displayName: string}[]>} Unique suggestions
   */
  function queryYandex(typed) {
    return fetchJson(buildYandexUrl(typed)).then(function (data) {
      return uniqueNonEmpty((data.results || []).map(yandexDisplayName))
        .map(function (name) { return { displayName: name }; });
    });
  }

  /**
   * Builds "Name, Street, District, City, County, State" from a Photon feature.
   *
   * @param {Object} properties - Photon feature properties
   * @returns {string} Address text ('' when the feature has no usable name)
   */
  function photonDisplayName(properties) {
    var parts = PHOTON_ADDRESS_FIELDS.map(function (field) { return properties[field]; });
    return uniqueNonEmpty(parts.map(function (part) { return part && String(part); })).join(ADDRESS_SEPARATOR);
  }

  /** @returns {string} Photon request URL for the typed text. */
  function buildPhotonUrl(typed) {
    var params = [
      'q=' + encodeURIComponent(typed),
      'limit=' + PHOTON_FETCH_LIMIT,
      'bbox=' + PHOTON_TURKEY_BBOX,
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
    return fetchJson(buildPhotonUrl(typed)).then(function (data) {
      var names = (data.features || [])
        .map(function (feature) { return feature.properties || {}; })
        .filter(function (properties) { return properties.countrycode === TURKEY_COUNTRY_CODE; })
        .map(photonDisplayName);
      return uniqueNonEmpty(names)
        .slice(0, MAX_RESULTS)
        .map(function (name) { return { displayName: name }; });
    });
  }

  /**
   * Fetches place suggestions for the typed text. Yandex is preferred; Photon
   * answers when Yandex is not configured or fails.
   *
   * @param {string} text - Text typed by the customer
   * @returns {Promise<{displayName: string}[]>} Suggestions, or [] when disabled/failed
   */
  function query(text) {
    var typed = String(text || '').trim();
    if (!isEnabled() || typed.length < MIN_QUERY_LENGTH) return Promise.resolve([]);

    var primary = usesYandex() ? queryYandex(typed) : queryPhoton(typed);
    var withFallback = usesYandex() && config.photonApiUrl
      ? primary.catch(function () { return queryPhoton(typed); })
      : primary;
    return withFallback.catch(function () { return []; });
  }

  global.RemoteSuggest = Object.freeze({
    isEnabled: isEnabled,
    query: query
  });
})(window);
