/**
 * İlker Teker VIP Transfer - Checkout (booking step 3)
 *
 * Why: After picking a vehicle the customer must give trip, flight and contact
 *      details. This module owns that step so main.js only has to hand over
 *      the chosen order.
 * What: Fills the order summary, reveals optional sections (return transfer,
 *      child seat), validates every input and, on completion, opens WhatsApp
 *      with a complete reservation message.
 *
 * Public API (window.Checkout):
 *   isAvailable()          -> boolean  true when the checkout markup exists
 *   open(order, onBack)    -> void     shows the step; onBack runs when the customer goes back
 *   close()                -> void     hides the step
 *
 * order = {
 *   vehicleName, oneWayPrice, roundTrip, from, to, direction, passengers
 * }
 *
 * Depends on: window.SiteConfig (config.js)
 */
(function (global) {
  'use strict';

  var CURRENCY_SYMBOL = '€';
  var MIN_NAME_LENGTH = 2;
  var MIN_PHONE_DIGITS = 10;
  var MAX_PHONE_DIGITS = 15;
  var PHONE_ALLOWED_CHARS = /^\+?[0-9\s()-]+$/;
  var FLIGHT_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 -]{1,10}[A-Za-z0-9]$/;
  var TOGGLE_ON_LABEL = 'Evet';
  var TOGGLE_OFF_LABEL = 'Hayır';

  var section = document.getElementById('checkout');
  if (!section) {
    global.Checkout = Object.freeze({
      isAvailable: function () { return false; },
      open: function () {},
      close: function () {}
    });
    return;
  }

  var form = document.getElementById('checkoutForm');
  var errorBox = document.getElementById('checkoutError');
  var backButton = document.getElementById('checkoutBack');
  var returnToggle = document.getElementById('returnToggle');
  var childSeatToggle = document.getElementById('childSeatToggle');
  var welcomeSignToggle = document.getElementById('welcomeSignToggle');
  var returnFields = document.getElementById('returnFields');
  var childSeatFields = document.getElementById('childSeatFields');

  var order = null;
  var onBackHandler = null;

  function field(id) {
    return document.getElementById(id);
  }

  /** @returns {string} Today as YYYY-MM-DD in the visitor's local time zone. */
  function todayIso() {
    var now = new Date();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    return now.getFullYear() + '-' + month + '-' + day;
  }

  /** @returns {string} Turkish formatted date (DD.MM.YYYY) from an ISO date. */
  function formatDate(isoDate) {
    var parts = isoDate.split('-');
    return parts.length === 3 ? parts[2] + '.' + parts[1] + '.' + parts[0] : isoDate;
  }

  /** @returns {number} Total price for the current order and return toggle. */
  function totalPrice() {
    return order.oneWayPrice * (returnToggle.checked ? 2 : 1);
  }

  function setText(id, text) {
    field(id).textContent = text;
  }

  /** Refreshes the live parts of the summary card (trip type and total). */
  function renderTotals() {
    setText('sumTripType', returnToggle.checked ? 'Gidiş / Dönüş' : 'Tek Yön');
    setText('sumTotal', totalPrice() + ' ' + CURRENCY_SYMBOL);
  }

  /** Writes the fixed order details into the summary card. */
  function renderSummary() {
    setText('sumDirection', order.direction);
    setText('sumFrom', order.from);
    setText('sumTo', order.to);
    setText('sumVehicle', order.vehicleName);
    setText('sumPassengers', order.passengers);
    renderTotals();
  }

  /** Shows/hides the fields tied to a toggle and updates its Evet/Hayır label. */
  function syncToggle(toggle, revealedFields) {
    var label = section.querySelector('[data-toggle-for="' + toggle.id + '"]');
    if (label) label.textContent = toggle.checked ? TOGGLE_ON_LABEL : TOGGLE_OFF_LABEL;
    if (revealedFields) revealedFields.hidden = !toggle.checked;
  }

  function showError(message, invalidField) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    if (invalidField) invalidField.focus();
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.hidden = true;
  }

  /** @returns {boolean} Whether the phone text holds a plausible phone number. */
  function isValidPhone(text) {
    var digits = text.replace(/\D/g, '');
    return PHONE_ALLOWED_CHARS.test(text) && digits.length >= MIN_PHONE_DIGITS && digits.length <= MAX_PHONE_DIGITS;
  }

  /**
   * Validates the whole form.
   *
   * @returns {{message: string, field: HTMLElement}|null} First problem found, or null when valid
   */
  function findProblem() {
    var today = todayIso();
    var date = field('transferDate');
    var time = field('transferTime');
    var flight = field('flightNo');

    if (!date.value || date.value < today) return { message: 'Lütfen bugünden sonraki geçerli bir transfer tarihi seçin.', field: date };
    if (!time.value) return { message: 'Lütfen transfer saatini girin.', field: time };
    if (!FLIGHT_NUMBER_PATTERN.test(flight.value.trim())) {
      return { message: 'Lütfen geçerli bir uçuş numarası girin (örn: XQ0707).', field: flight };
    }

    if (returnToggle.checked) {
      var returnDate = field('returnDate');
      var returnTime = field('returnTime');
      if (!returnDate.value || returnDate.value < date.value) {
        return { message: 'Dönüş tarihi, transfer tarihinden önce olamaz.', field: returnDate };
      }
      if (!returnTime.value) return { message: 'Lütfen dönüş saatini girin.', field: returnTime };
    }

    var name = field('customerName');
    var email = field('customerEmail');
    var phone = field('customerPhone');
    if (name.value.trim().length < MIN_NAME_LENGTH) return { message: 'Lütfen adınızı ve soyadınızı girin.', field: name };
    if (!email.value.trim() || !email.checkValidity()) return { message: 'Lütfen geçerli bir e-posta adresi girin.', field: email };
    if (!isValidPhone(phone.value.trim())) return { message: 'Lütfen geçerli bir telefon numarası girin.', field: phone };
    if (!field('checkoutConsent').checked) return { message: 'Devam etmek için onay kutusunu işaretleyin.', field: field('checkoutConsent') };
    return null;
  }

  /** @returns {string} Reservation message text for WhatsApp. */
  function buildMessage() {
    var lines = [
      'Merhaba, transfer rezervasyonu yapmak istiyorum.',
      '',
      '🚗 Araç: ' + order.vehicleName,
      '📍 Nereden: ' + order.from,
      '📍 Nereye: ' + order.to,
      '👥 Yolcu Sayısı: ' + order.passengers,
      '📅 Transfer Tarihi: ' + formatDate(field('transferDate').value),
      '🕐 Transfer Saati: ' + field('transferTime').value
    ];

    var flight = field('flightNo').value.trim();
    if (flight) lines.push('✈️ Uçuş No: ' + flight);

    if (returnToggle.checked) {
      lines.push('🔁 Dönüş Tarihi: ' + formatDate(field('returnDate').value));
      lines.push('🔁 Dönüş Saati: ' + field('returnTime').value);
      var returnFlight = field('returnFlightNo').value.trim();
      if (returnFlight) lines.push('✈️ Dönüş Uçuş No: ' + returnFlight);
    }

    if (childSeatToggle.checked) lines.push('👶 Çocuk Koltuğu: ' + field('childSeatCount').value + ' adet');
    if (welcomeSignToggle.checked) lines.push('🪧 İsimli Karşılama: Evet');

    var note = field('specialNote').value.trim();
    if (note) lines.push('📝 Not: ' + note);

    lines.push(
      '',
      '👤 Ad Soyad: ' + field('customerName').value.trim(),
      '📧 E-posta: ' + field('customerEmail').value.trim(),
      '📞 Telefon: ' + field('customerPhone').value.trim(),
      '💳 Ödeme: ' + form.querySelector('input[name="paymentMethod"]:checked').value,
      '💰 ' + (returnToggle.checked ? 'Gidiş / Dönüş' : 'Tek Yön') + ': ' + totalPrice() + ' ' + CURRENCY_SYMBOL,
      '',
      'Rezervasyon onayı alabilir miyim?'
    );
    return lines.join('\n');
  }

  function submitReservation(event) {
    event.preventDefault();
    clearError();

    var problem = findProblem();
    if (problem) {
      showError(problem.message, problem.field);
      return;
    }

    var url = 'https://wa.me/' + global.SiteConfig.whatsappNumber + '?text=' + encodeURIComponent(buildMessage());
    global.open(url, '_blank', 'noopener');
  }

  function resetForm() {
    form.reset();
    clearError();
    syncToggle(returnToggle, returnFields);
    syncToggle(childSeatToggle, childSeatFields);
    syncToggle(welcomeSignToggle, null);
  }

  function close() {
    section.hidden = true;
  }

  /**
   * Shows the checkout for a chosen vehicle.
   *
   * @param {Object} newOrder - See file header for the shape
   * @param {Function} onBack - Called when the customer returns to vehicle selection
   */
  function open(newOrder, onBack) {
    order = newOrder;
    onBackHandler = onBack;

    resetForm();
    var today = todayIso();
    field('transferDate').min = today;
    field('returnDate').min = today;
    returnToggle.checked = Boolean(order.roundTrip);
    syncToggle(returnToggle, returnFields);

    renderSummary();
    section.hidden = false;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  [[returnToggle, returnFields], [childSeatToggle, childSeatFields], [welcomeSignToggle, null]].forEach(function (pair) {
    pair[0].addEventListener('change', function () {
      syncToggle(pair[0], pair[1]);
      if (order) renderTotals();
    });
  });

  backButton.addEventListener('click', function () {
    close();
    if (onBackHandler) onBackHandler();
  });
  form.addEventListener('submit', submitReservation);

  global.Checkout = Object.freeze({
    isAvailable: function () { return true; },
    open: open,
    close: close
  });
})(window);
