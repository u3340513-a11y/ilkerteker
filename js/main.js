/**
 * İlker Teker VIP Transfer - Main JavaScript
 *
 * Handles: navigation, booking form, scroll effects,
 * intersection observer animations, and scroll-to-top.
 */
(function () {
  'use strict';

  var WHATSAPP_NUMBER = '905069374638';

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

  /* ---- Booking form → WhatsApp redirect ---- */
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
