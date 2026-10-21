/**
 * İlker Teker VIP Transfer - Site Configuration
 *
 * Why: Keeps every deploy-time value (contact number, third-party keys) in a
 *      single file so no other script hardcodes them.
 * What: Exposes window.SiteConfig (frozen).
 *   - whatsappNumber      : WhatsApp number in international format, digits only.
 *   - yandexMapsApiKey    : Yandex "JavaScript API" key (https://developer.tech.yandex.com).
 *   - yandexSuggestApiKey : Yandex "Geosuggest" key; leave empty if the JS API key covers it.
 *   - photonApiUrl        : Keyless Photon (OpenStreetMap) search endpoint used for Türkiye-wide
 *                           place suggestions when yandexMapsApiKey is empty; set '' to disable.
 *
 * Map suggestions come from Yandex when yandexMapsApiKey is set, otherwise from Photon.
 * They extend the built-in hotel/region catalog (locations.js).
 * Restrict the Yandex keys to this website's domain in the Yandex cabinet.
 */
(function (global) {
  'use strict';

  global.SiteConfig = Object.freeze({
    whatsappNumber: '905069374638',
    yandexMapsApiKey: '',
    yandexSuggestApiKey: '',
    photonApiUrl: 'https://photon.komoot.io/api/'
  });
})(window);
