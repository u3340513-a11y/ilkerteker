/**
 * İlker Teker VIP Transfer - Site Configuration
 *
 * Why: Keeps every deploy-time value (contact number, third-party keys) in a
 *      single file so no other script hardcodes them.
 * What: Exposes window.SiteConfig (frozen).
 *   - whatsappNumber      : WhatsApp number in international format, digits only.
 *   - yandexSuggestApiKey : Yandex "Geosuggest API" key (https://developer.tech.yandex.com).
 *   - photonApiUrl        : Keyless Photon (OpenStreetMap) endpoint, used when Yandex is not
 *                           configured or fails; set '' to disable.
 *
 * Map suggestions come from Yandex when yandexSuggestApiKey is set, otherwise from Photon.
 * They extend the built-in hotel/region catalog (locations.js).
 * Restrict the Yandex key to this website's domain in the Yandex cabinet.
 */
(function (global) {
  'use strict';

  global.SiteConfig = Object.freeze({
    whatsappNumber: '905069374638',
    yandexSuggestApiKey: 'ff85aa07-0a78-437d-a868-45d709fd8a91',
    photonApiUrl: 'https://photon.komoot.io/api/'
  });
})(window);
