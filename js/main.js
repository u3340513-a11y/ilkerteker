// İlker Teker VIP Transfer - Main JS
(function () {
  'use strict';

  var WHATSAPP_NUMBER = '905069374638';

  // Footer year
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile menu toggle
  var hamburger = document.getElementById('hamburgerBtn');
  var nav = document.getElementById('mainNav');
  if (hamburger && nav) {
    hamburger.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Swap from/to fields
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

  // Toggle return date/time row
  var returnToggle = document.getElementById('returnToggle');
  var returnRow = document.getElementById('returnRow');
  if (returnToggle && returnRow) {
    returnToggle.addEventListener('change', function () {
      returnRow.hidden = !returnToggle.checked;
    });
  }

  // Set default pickup date to today (min)
  var pickupDate = document.getElementById('pickupDate');
  var returnDate = document.getElementById('returnDate');
  if (pickupDate) {
    var today = new Date().toISOString().split('T')[0];
    pickupDate.min = today;
  }
  if (returnDate) {
    var todayR = new Date().toISOString().split('T')[0];
    returnDate.min = todayR;
  }

  // Booking form -> WhatsApp redirect
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

      var lines = [
        'Merhaba, transfer rezervasyonu yapmak istiyorum.',
        '',
        'Nereden: ' + from,
        'Nereye: ' + to,
        'Yolcu Sayısı: ' + passengers,
        'Alınış Tarihi: ' + formatDate(date),
        'Alınış Saati: ' + time
      ];

      if (hasReturn && rDate && rTime) {
        lines.push('Dönüş Tarihi: ' + formatDate(rDate));
        lines.push('Dönüş Saati: ' + rTime);
      }

      if (note) {
        lines.push('Not: ' + note);
      }

      lines.push('', 'Fiyat bilgisi alabilir miyim?');

      var message = lines.join('\n');
      var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
      window.open(url, '_blank', 'noopener');
    });
  }

  function formatDate(isoDate) {
    var parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return parts[2] + '.' + parts[1] + '.' + parts[0];
  }

  // Header shadow on scroll
  var header = document.getElementById('siteHeader');
  if (header) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 10) {
        header.style.boxShadow = '0 4px 20px rgba(28,28,40,0.08)';
      } else {
        header.style.boxShadow = 'none';
      }
    });
  }
})();
