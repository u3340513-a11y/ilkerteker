/**
 * İlker Teker VIP Transfer - Main JavaScript
 *
 * Handles: navigation, booking form with vehicle pricing cards,
 * scroll effects, intersection observer animations, and scroll-to-top.
 *
 * When the user submits the booking form, instead of redirecting to WhatsApp
 * directly, vehicle packages are rendered with per-route pricing. Selecting
 * a vehicle and clicking "WhatsApp ile Rezervasyon" builds a detailed
 * message and opens WhatsApp.
 */
(function () {
  'use strict';

  var WHATSAPP_NUMBER = '905069374638';

  /* ====================================================================
     Vehicle Definitions — mirrors toprakviptransfer.com fleet
     ==================================================================== */
  var VEHICLES = [
    {
      id: 'exclusive',
      name: 'MAYBACH EXCLUSİVE VİP',
      pax: '1-6',
      bagaj: 5,
      popular: false,
      features: [
        'Atıştırmalık',
        'Soğuk İçecekler (Alkolsüz)',
        'Wifi',
        'Tv',
        'Bebek Koltuğu',
        'Lüks Dizayn Araç',
        'Kaptan ile bağlantı yok'
      ],
      description: ''
    },
    {
      id: 'royal',
      name: 'MAYBACH ROYAL CLASS VIP',
      pax: '1-6',
      bagaj: 5,
      popular: true,
      features: [
        'Atıştırmalık',
        'Soğuk İçecekler (Alkolsüz)',
        'Rolls-royce Tavan',
        'Bebek Koltuğu',
        'Tv',
        'Wifi',
        'Özel Tasarım',
        'Koltuk Masaj',
        'Koltuk Soğutma',
        'Kaptan ile bağlantı yok',
        'Ultra Top Lux Dizayn',
        'Full Vip Servis'
      ],
      description: 'Tasarım ödüllü, üstün donanımlı, benzersiz konfor sunan; filomuzun en lüks ve en ayrıcalıklı serisi.'
    },
    {
      id: 'prime',
      name: 'PRİME XL COMFORT LUXURY',
      pax: '1-6',
      bagaj: 8,
      popular: true,
      features: [
        'Atıştırmalık',
        'Soğuk İçecekler (Alkolsüz)',
        'Geniş ve Büyük',
        'Özel Tasarım',
        'Wifi',
        'Tv',
        'Full Vip Servis',
        'Koltuk Soğutma',
        'Premium Ses Sistemi',
        'Bebek Koltuğu',
        'Kaptan ile bağlantı yok',
        'Ultra Top Lux Dizayn'
      ],
      description: 'Lüks ve konforu ferah ve havadar bir iç mekanla birleştiren özel bir seri.'
    },
    {
      id: 'sprinter10',
      name: 'Sprinter ULTRA VIP',
      pax: '1-10',
      bagaj: 10,
      popular: false,
      isDividerBefore: true,
      features: [
        'Atıştırmalık',
        'Soğuk İçecekler (Alkolsüz)',
        'Wifi',
        'Tv',
        'Lüks Dizayn Araç',
        'Bebek Koltuğu',
        'Kaptan ile bağlantı yok'
      ],
      description: ''
    },
    {
      id: 'sprinter14',
      name: 'Sprinter ULTRA VIP',
      pax: '1-14',
      bagaj: 14,
      popular: true,
      features: [
        'Atıştırmalık',
        'Soğuk İçecekler (Alkolsüz)',
        'Wifi',
        'Tv',
        'Lüks Dizayn Araç',
        'Bebek Koltuğu',
        'Kaptan ile bağlantı yok'
      ],
      description: ''
    }
  ];

  /* ====================================================================
     Pricing Table — per-region, per-vehicle one-way prices (€)
     Key order: [exclusive, royal, prime, sprinter10, sprinter14]
     ==================================================================== */
  var PRICING = {
    'antalya merkez':  [40, 45, 60, 55, 65],
    'lara':            [40, 45, 60, 55, 65],
    'kundu':           [40, 45, 60, 55, 65],
    'konyaaltı':       [40, 45, 60, 55, 65],
    'kaleiçi':         [40, 45, 60, 55, 65],
    'belek':           [50, 55, 70, 65, 75],
    'boğazkent':       [50, 55, 70, 65, 75],
    'serik':           [45, 50, 65, 60, 70],
    'beldibi':         [55, 60, 75, 70, 80],
    'göynük':          [55, 60, 75, 70, 80],
    'kemer':           [55, 60, 75, 70, 80],
    'side':            [60, 65, 75, 80, 85],
    'manavgat':        [60, 65, 75, 80, 85],
    'sorgun':          [60, 65, 75, 80, 85],
    'çolaklı':         [60, 65, 75, 80, 85],
    'evrenseki':       [60, 65, 75, 80, 85],
    'kumköy':          [60, 65, 75, 80, 85],
    'gündoğdu':        [60, 65, 75, 80, 85],
    'titreyengöl':     [60, 65, 75, 80, 85],
    'denizyaka':       [60, 65, 75, 80, 85],
    'kızılot':         [70, 75, 85, 90, 100],
    'kızılağaç':       [70, 75, 85, 90, 100],
    'çamyuva':         [70, 75, 85, 90, 100],
    'kiriş':           [70, 75, 85, 90, 100],
    'tekirova':        [70, 75, 85, 90, 100],
    'okurcalar':       [80, 85, 95, 100, 110],
    'avsallar':        [80, 85, 95, 100, 110],
    'i̇ncekum':        [80, 85, 95, 100, 110],
    'incekum':         [80, 85, 95, 100, 110],
    'çenger':          [80, 85, 95, 100, 110],
    'konaklı':         [85, 90, 100, 110, 120],
    'türkler':         [85, 90, 100, 110, 120],
    'alanya':          [85, 90, 100, 110, 120],
    'olimpos':         [85, 90, 100, 110, 120],
    'adrasan':         [100, 105, 115, 125, 135],
    'mahmutlar':       [110, 115, 125, 135, 145],
    'kargıcak':        [110, 115, 125, 135, 145],
    'kestel':          [110, 115, 125, 135, 145],
    'kaş':             [120, 125, 140, 150, 160],
    'kalkan':          [120, 125, 140, 150, 160]
  };

  /**
   * Attempts to find a matching region key from user-entered text.
   * Uses normalized substring matching against known region names.
   *
   * @param {string} text - The destination text entered by the user
   * @returns {string|null} The matched region key, or null if no match
   */
  function matchRegion(text) {
    if (!text) return null;
    var normalized = text.toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    /* Direct match */
    if (PRICING[normalized] !== undefined) return normalized;

    /* Substring match — check if any known region appears in the input */
    var regionKeys = Object.keys(PRICING);
    var bestMatch = null;
    var bestLen = 0;

    for (var i = 0; i < regionKeys.length; i++) {
      var key = regionKeys[i];
      if (normalized.indexOf(key) !== -1 && key.length > bestLen) {
        bestMatch = key;
        bestLen = key.length;
      }
    }

    return bestMatch;
  }

  /* ====================================================================
     SVG Icon Helpers
     ==================================================================== */
  var SVG_CHECK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
  var SVG_LUGGAGE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="8" y="2" width="8" height="4" rx="1"/><rect x="4" y="6" width="16" height="16" rx="2"/></svg>';
  var SVG_PEOPLE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="9" cy="7" r="3"/><path d="M2 21c0-3.31 2.69-5 7-5s7 1.69 7 5"/><circle cx="17" cy="9" r="2.5"/><path d="M22 21c0-2.76-2.24-4-5-4"/></svg>';
  var SVG_WHATSAPP = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.004 2.003c-5.514 0-9.997 4.483-9.997 9.997 0 1.762.463 3.482 1.343 4.997L2 22l5.117-1.334a9.96 9.96 0 0 0 4.887 1.246h.004c5.514 0 9.997-4.483 9.997-9.997 0-2.67-1.04-5.182-2.929-7.07a9.935 9.935 0 0 0-7.072-2.842zm0 18.187a8.15 8.15 0 0 1-4.152-1.137l-.298-.177-3.037.792.811-2.96-.194-.304a8.184 8.184 0 0 1-1.256-4.377c0-4.522 3.679-8.201 8.203-8.201 2.19 0 4.25.854 5.799 2.403a8.15 8.15 0 0 1 2.399 5.801c0 4.523-3.679 8.16-8.275 8.16z"/></svg>';
  var SVG_ARROW_RIGHT = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M10 17l5-5-5-5v10z"/></svg>';
  var SVG_ARROW_DOWN = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 16l-6-6h12z"/></svg>';
  var SVG_STAR = '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>';
  var SVG_SEARCH_BIG = '<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>';

  /* ====================================================================
     Render Vehicle Results
     ==================================================================== */

  /**
   * Builds a single vehicle card HTML string.
   *
   * @param {Object} vehicle - Vehicle definition object
   * @param {number} oneWay - One-way price in euros
   * @param {number} cardIndex - Index for unique radio button naming
   * @param {Object} formData - Form values for WhatsApp message
   * @returns {string} HTML string of the vehicle card
   */
  function buildVehicleCard(vehicle, oneWay, cardIndex, formData) {
    var roundTrip = oneWay * 2;
    var radioName = 'pricing_' + cardIndex;

    /* Header */
    var headerExtra = '';
    if (vehicle.popular) {
      headerExtra = '<span class="vehicle-badge-popular">' + SVG_STAR + ' POPÜLER</span>';
    }

    var html = '<div class="vehicle-card" data-vehicle-id="' + escapeAttr(vehicle.id) + '">';
    html += '<div class="vehicle-card-header">';
    html += '<span>' + escapeHtml(vehicle.name) + ' (' + vehicle.pax + ') PAX | ' + SVG_LUGGAGE + ' ' + vehicle.bagaj + ' Bagaj</span>';
    html += headerExtra;
    html += '</div>';

    /* Body */
    html += '<div class="vehicle-card-body">';

    /* Features */
    html += '<div class="vehicle-card-features">';
    html += '<span class="vehicle-card-features-title">Araç Özellikleri ve fiyata dahil ücretsiz hizmetler</span>';
    html += '<div class="vehicle-features-grid">';
    for (var i = 0; i < vehicle.features.length; i++) {
      html += '<div class="vehicle-feature-item">' + SVG_CHECK + ' ' + escapeHtml(vehicle.features[i]) + '</div>';
    }
    html += '</div>';
    html += '</div>';

    /* Pricing */
    html += '<div class="vehicle-card-pricing-area">';
    html += '<div class="vehicle-pricing-options">';

    /* Tek Yön */
    html += '<div class="vehicle-pricing-option">';
    html += '<input type="radio" id="' + radioName + '_ow" name="' + radioName + '" value="oneway" checked>';
    html += '<label for="' + radioName + '_ow" class="vehicle-pricing-label">';
    html += '<span class="vehicle-pricing-type"><span class="radio-dot"></span> Tek Yön</span>';
    html += '<span class="vehicle-pricing-amount">' + oneWay + ' €</span>';
    html += '</label>';
    html += '</div>';

    /* Gidiş / Dönüş */
    html += '<div class="vehicle-pricing-option">';
    html += '<input type="radio" id="' + radioName + '_rt" name="' + radioName + '" value="roundtrip">';
    html += '<label for="' + radioName + '_rt" class="vehicle-pricing-label">';
    html += '<span class="vehicle-pricing-type"><span class="radio-dot"></span> Gidiş / Dönüş</span>';
    html += '<span class="vehicle-pricing-amount">' + roundTrip + ' €</span>';
    html += '</label>';
    html += '</div>';

    html += '</div>';

    html += '<div class="vehicle-pricing-note">Kişi Başı Değildir, Aracın Toplam Fiyatıdır.</div>';

    if (vehicle.description) {
      html += '<div class="vehicle-card-desc">' + escapeHtml(vehicle.description) + '</div>';
    }

    html += '</div>';
    html += '</div>';

    /* Footer */
    html += '<div class="vehicle-card-footer">';
    html += '<button type="button" class="btn-vehicle-whatsapp" data-card-index="' + cardIndex + '">';
    html += SVG_WHATSAPP + ' REZERVASYON';
    html += '</button>';
    html += '</div>';

    html += '</div>';

    return html;
  }

  /**
   * Renders all vehicle cards into the results container.
   *
   * @param {number[]} prices - Array of 5 one-way prices
   * @param {string} fromText - Origin text
   * @param {string} toText - Destination text
   * @param {Object} formData - All form field values
   */
  function renderVehicleResults(prices, fromText, toText, formData) {
    var container = document.getElementById('vehicleResults');
    if (!container) return;

    var html = '';

    /* Heading */
    html += '<div class="vehicle-results-heading">';
    html += '<h3>Lütfen Size Uygun Aracı Seçiniz</h3>';
    html += '<div class="vehicle-results-route">';
    html += escapeHtml(fromText) + ' ' + SVG_ARROW_RIGHT + ' ' + escapeHtml(toText);
    html += '</div>';
    html += '<p>Araçlarımız Konfor ve Donanım Seviyelerine Göre Sıralanmıştır.</p>';
    html += '</div>';

    /* Vehicle Cards */
    for (var i = 0; i < VEHICLES.length; i++) {
      /* Divider before sprinter section */
      if (VEHICLES[i].isDividerBefore) {
        html += '<div class="vehicle-divider-banner">';
        html += SVG_ARROW_DOWN;
        html += ' Kalabalık aileler ve fazla bagajı olanlar için geniş araçlarımız aşağıdadır. ';
        html += SVG_ARROW_DOWN;
        html += '</div>';
      }

      html += buildVehicleCard(VEHICLES[i], prices[i], i, formData);
    }

    container.innerHTML = html;
    container.hidden = false;

    /* Smooth scroll to results */
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });

    /* Attach WhatsApp button handlers */
    var buttons = container.querySelectorAll('.btn-vehicle-whatsapp');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-card-index'), 10);
        handleVehicleReservation(idx, prices, formData);
      });
    });
  }

  /**
   * Handles WhatsApp reservation when a vehicle is selected.
   * Reads the selected pricing option (one-way vs round-trip) from
   * the card's radio buttons, builds a message, and opens WhatsApp.
   *
   * @param {number} vehicleIndex - Index in VEHICLES array
   * @param {number[]} prices - Price array for the matched region
   * @param {Object} formData - Original form values
   */
  function handleVehicleReservation(vehicleIndex, prices, formData) {
    var vehicle = VEHICLES[vehicleIndex];
    var oneWay = prices[vehicleIndex];
    var radioName = 'pricing_' + vehicleIndex;
    var selectedRadio = document.querySelector('input[name="' + radioName + '"]:checked');
    var isRoundTrip = selectedRadio && selectedRadio.value === 'roundtrip';
    var price = isRoundTrip ? oneWay * 2 : oneWay;
    var tripType = isRoundTrip ? 'Gidiş / Dönüş' : 'Tek Yön';

    var lines = [
      'Merhaba, transfer rezervasyonu yapmak istiyorum.',
      '',
      '🚗 Araç: ' + vehicle.name + ' (' + vehicle.pax + ' PAX)',
      '📍 Nereden: ' + formData.from,
      '📍 Nereye: ' + formData.to,
      '👥 Yolcu Sayısı: ' + formData.passengers,
      '📅 Alınış Tarihi: ' + formData.date,
      '🕐 Alınış Saati: ' + formData.time,
      '💰 ' + tripType + ': ' + price + ' €'
    ];

    if (formData.hasReturn && formData.returnDate && formData.returnTime) {
      lines.push('📅 Dönüş Tarihi: ' + formData.returnDate);
      lines.push('🕐 Dönüş Saati: ' + formData.returnTime);
    }

    if (formData.note) {
      lines.push('📝 Not: ' + formData.note);
    }

    lines.push('', 'Rezervasyon onayı alabilir miyim?');

    var message = lines.join('\n');
    var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
    window.open(url, '_blank', 'noopener');
  }

  /* ====================================================================
     Security Helpers
     ==================================================================== */

  /**
   * Escapes HTML special characters to prevent XSS.
   *
   * @param {string} str - Raw string
   * @returns {string} Escaped string safe for innerHTML
   */
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /**
   * Escapes attribute-unsafe characters.
   *
   * @param {string} str - Raw string
   * @returns {string} Escaped string safe for HTML attributes
   */
  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
  }

  /**
   * Formats an ISO date string (YYYY-MM-DD) to Turkish format (DD.MM.YYYY).
   *
   * @param {string} isoDate - ISO date string
   * @returns {string} Formatted date string
   */
  function formatDate(isoDate) {
    var parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return parts[2] + '.' + parts[1] + '.' + parts[0];
  }

  /* ====================================================================
     DOM Ready — Event Binding
     ==================================================================== */

  /* ---- Footer year ---- */
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /* ---- Mobile menu toggle ---- */
  var hamburger = document.getElementById('hamburgerBtn');
  var nav = document.getElementById('mainNav');

  if (hamburger && nav) {
    hamburger.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---- Swap from/to fields ---- */
  var swapBtn = document.getElementById('swapBtn');
  var fromInput = document.getElementById('fromInput');
  var toInput = document.getElementById('toInput');

  if (swapBtn && fromInput && toInput) {
    swapBtn.addEventListener('click', function () {
      var tmp = fromInput.value;
      fromInput.value = toInput.value;
      toInput.value = tmp;
    });
  }

  /* ---- Toggle return date/time row ---- */
  var returnToggle = document.getElementById('returnToggle');
  var returnRow = document.getElementById('returnRow');

  if (returnToggle && returnRow) {
    returnToggle.addEventListener('change', function () {
      returnRow.hidden = !returnToggle.checked;
    });
  }

  /* ---- Set default pickup date min ---- */
  var pickupDate = document.getElementById('pickupDate');
  var returnDate = document.getElementById('returnDate');
  var today = new Date().toISOString().split('T')[0];

  if (pickupDate) {
    pickupDate.min = today;
  }
  if (returnDate) {
    returnDate.min = today;
  }

  /* ---- Booking form → Vehicle Results ---- */
  var bookingForm = document.getElementById('bookingForm');

  if (bookingForm) {
    bookingForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var from = document.getElementById('fromInput').value.trim();
      var to = document.getElementById('toInput').value.trim();
      var passengers = document.getElementById('passengers').value;
      var date = document.getElementById('pickupDate').value;
      var time = document.getElementById('pickupTime').value;
      var hasReturn = document.getElementById('returnToggle').checked;
      var rDate = document.getElementById('returnDate').value;
      var rTime = document.getElementById('returnTime').value;
      var note = document.getElementById('note').value.trim();

      if (!from || !to || !date || !time) {
        alert('Lütfen tüm zorunlu alanları doldurun.');
        return;
      }

      /* Try matching destination to a region */
      var regionKey = matchRegion(to) || matchRegion(from);

      if (!regionKey) {
        /* No region match — show helpful message and WhatsApp fallback */
        var container = document.getElementById('vehicleResults');
        if (container) {
          container.innerHTML =
            '<div class="vehicle-no-results">' +
              SVG_SEARCH_BIG +
              '<h4>Bölge bulunamadı</h4>' +
              '<p>Girdiğiniz konum için otomatik fiyatlandırma bulunamadı. Lütfen WhatsApp üzerinden bizimle iletişime geçin.</p>' +
              '<a href="https://wa.me/' + WHATSAPP_NUMBER + '?text=' +
              encodeURIComponent(
                'Merhaba, transfer fiyat bilgisi almak istiyorum.\n\nNereden: ' + from +
                '\nNereye: ' + to +
                '\nYolcu: ' + passengers +
                '\nTarih: ' + formatDate(date) +
                '\nSaat: ' + time
              ) +
              '" target="_blank" rel="noopener" class="btn btn-whatsapp">' +
              SVG_WHATSAPP + ' WhatsApp ile İletişim</a>' +
            '</div>';
          container.hidden = false;
          container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }

      var prices = PRICING[regionKey];

      var formData = {
        from: from,
        to: to,
        passengers: passengers,
        date: formatDate(date),
        time: time,
        hasReturn: hasReturn,
        returnDate: rDate ? formatDate(rDate) : '',
        returnTime: rTime || '',
        note: note
      };

      renderVehicleResults(prices, from, to, formData);
    });
  }

  /* ---- Header scroll effect ---- */
  var header = document.getElementById('siteHeader');

  if (header) {
    var onScroll = function () {
      if (window.scrollY > 10) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- Scroll to top button ---- */
  var scrollTopBtn = document.getElementById('scrollTopBtn');

  if (scrollTopBtn) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 400) {
        scrollTopBtn.classList.add('visible');
      } else {
        scrollTopBtn.classList.remove('visible');
      }
    }, { passive: true });

    scrollTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---- Intersection Observer for fade-in animations ---- */
  var fadeElements = document.querySelectorAll('.fade-in');

  if (fadeElements.length > 0 && 'IntersectionObserver' in window) {
    var fadeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          fadeObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    });

    fadeElements.forEach(function (el) {
      fadeObserver.observe(el);
    });
  } else {
    /* Fallback: show all elements immediately */
    fadeElements.forEach(function (el) {
      el.classList.add('visible');
    });
  }
})();
