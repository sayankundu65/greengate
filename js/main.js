/**
 * Green Gate Real Estate LLC — 60fps Luxury Animation Engine, Custom Carousel Controller,
 * Bento Property UI, Interactive Dubai Maps & Google Sheets Lead Capture System
 */
(function () {
  'use strict';

  // Configurable Google Sheets Apps Script Web App URL
  // Paste your deployed Google Apps Script Web App URL here or set via localStorage.setItem('gg_sheets_webhook_url', 'https://script.google.com/macros/s/.../exec')
  window.GG_GOOGLE_SHEETS_WEBHOOK_URL =
    window.GG_GOOGLE_SHEETS_WEBHOOK_URL ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('gg_sheets_webhook_url')) ||
    '';

  function trackEvent(eventName, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params || {});
    }
  }

  // Send lead payload to both local/production backend (/api/submit -> CSV + JSON + Webhook)
  // AND directly to Google Sheets Apps Script Webhook if configured
  function submitLeadToBackendAndSheets(payload) {
    const requests = [];

    requests.push(
      fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function () {
        return null;
      })
    );

    const webhookUrl = window.GG_GOOGLE_SHEETS_WEBHOOK_URL;
    if (webhookUrl && webhookUrl.indexOf('https://script.google.com') === 0) {
      requests.push(
        fetch(webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        }).catch(function () {
          return null;
        })
      );
    }

    return Promise.all(requests);
  }

  function initScrollRevealAnimations() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const fadeUpSelectors = [
      '.about_left-column .main_tag',
      '.main-wrap.is-about .text-wrap',
      '.destinations_top-wrap',
      '.why-us_title-wrap',
      '.video_top-wrap',
      '.blogs_top-wrap',
      '.cta_content-internal',
      '.contact-us_left-column',
      '.cta-3_left',
      '.cta-3_right',
      '.our-story_content > .text-base',
      '.our-story_p-wrap > h2, .our-story_p-wrap > h3',
      '.about_title-wrap',
      '.our-mission_title-wrap',
      '.our-mission_p-wrap',
      '.faq-title_wrap',
      '.testimonials_title-wrap',
      '.cta-2_item',
      '.listing_title-wrap',
      '.listing_left-wrap .text-rich-text',
      '.listing_right-wrap .listing_form',
      '.listing_bottom',
      '.gg-bento-card',
      '.gg-prop-header-row',
      '.gg-spec-strip',
      '.gg-desc-block',
      '.gg-map-block',
      '.gg-reserve-card',
      '.contact-1_top-form',
      '.footer_content',
      '.footer-img_wrap'
    ];

    fadeUpSelectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        if (!el.hasAttribute('data-gg-reveal')) {
          el.setAttribute('data-gg-reveal', 'fade-up');
        }
      });
    });

    const imageRevealSelectors = [
      '.about_image-1',
      '.about_image-2',
      '.video_item-wrap',
      '.contact-us_img-wrap',
      '.about_left-video',
      '.our-mission_main-img',
      '.our-mission_img'
    ];

    imageRevealSelectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el, idx) {
        if (!el.hasAttribute('data-gg-reveal')) {
          el.setAttribute('data-gg-reveal', 'image-reveal');
          el.style.setProperty('--gg-delay', (idx % 4) * 65 + 'ms');
        }
      });
    });

    const staggerGroups = [
      '.about_list > .about_item',
      '.destinations_list > .w-dyn-item',
      '.why-us_grid > .why-us_item',
      '.home-blog_list > .collection-item',
      '.listing_about-list > .listing_about-item_wrap, .listing_about-list > .listing_about-item',
      '.testimonials_grid > .testimonials_item-sec',
      '.gg-partners-grid > .gg-partner-card',
      '.gg-same-area-grid > .gg-same-area-card',
      '.gg-map-landmarks > .gg-landmark-pill',
      '.about_content-right-column > .faq_item'
    ];

    staggerGroups.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el, idx) {
        if (!el.hasAttribute('data-gg-reveal')) {
          el.setAttribute('data-gg-reveal', 'fade-up');
          const staggerMs = (idx % 6) * 60;
          el.style.setProperty('--gg-delay', staggerMs + 'ms');
        }
      });
    });

    document.documentElement.classList.add('gg-anim-ready');

    // Once an element has finished revealing, strip the reveal attribute so its
    // own hover transitions (transform/box-shadow) work instantly with no delay.
    function finishReveal(el) {
      if (!el) return;
      el.removeAttribute('data-gg-reveal');
      el.classList.remove('is-revealed');
      el.style.removeProperty('--gg-delay');
    }
    function reveal(el) {
      if (!el || !el.hasAttribute('data-gg-reveal') || el.classList.contains('is-revealed')) return;
      el.classList.add('is-revealed');
      const delay = parseInt(el.style.getPropertyValue('--gg-delay'), 10) || 0;
      const isImage = el.getAttribute('data-gg-reveal') === 'image-reveal';
      window.setTimeout(function () {
        finishReveal(el);
      }, delay + (isImage ? 1100 : 750));
    }

    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('[data-gg-reveal]').forEach(finishReveal);
      return;
    }

    function sweepViewportAndAbove(obs) {
      const h = window.innerHeight || document.documentElement.clientHeight;
      document.querySelectorAll('[data-gg-reveal]').forEach(function (el) {
        const r = el.getBoundingClientRect();
        if (r.top <= h * 0.96) {
          if (obs) obs.unobserve(el);
          reveal(el);
        }
      });
    }

    const observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting || entry.boundingClientRect.top <= (window.innerHeight || 900)) {
            obs.unobserve(entry.target);
            reveal(entry.target);
          }
        });
        sweepViewportAndAbove(obs);
      },
      { root: null, rootMargin: '0px 0px -4% 0px', threshold: 0.05 }
    );

    const winH = window.innerHeight || document.documentElement.clientHeight;
    document.querySelectorAll('[data-gg-reveal]').forEach(function (el) {
      const rect = el.getBoundingClientRect();
      if (rect.top <= winH * 0.96) {
        // Already on screen or above fold at load: show immediately, no flash
        finishReveal(el);
      } else {
        observer.observe(el);
      }
    });

    let scrollRaf = 0;
    window.addEventListener(
      'scroll',
      function () {
        if (scrollRaf) return;
        scrollRaf = window.requestAnimationFrame(function () {
          scrollRaf = 0;
          sweepViewportAndAbove(observer);
        });
      },
      { passive: true }
    );
  }

  // Green Gate carousel controller (independent of Webflow's slider module).
  // Moves one card per click, wraps around, supports drag/swipe and keyboard.
  function initSmoothSliders() {
    const sliders = document.querySelectorAll('.gg-slider');
    sliders.forEach(function (slider) {
      const mask = slider.querySelector('.gg-slider-mask');
      const slides = Array.from(slider.querySelectorAll('.gg-slide'));
      const prevBtn = slider.querySelector('.gg-arrow-prev');
      const nextBtn = slider.querySelector('.gg-arrow-next');
      if (!mask || slides.length < 2 || !prevBtn || !nextBtn) return;

      const EASE = 'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)';
      let index = 0;
      let offset = 0;

      function metrics() {
        const a = slides[0].getBoundingClientRect();
        const b = slides[1].getBoundingClientRect();
        const step = Math.abs(b.left - a.left) || a.width;
        const container = slider.getBoundingClientRect().width;
        const visible = Math.max(1, Math.floor((container + 1) / step));
        return { step: step, max: Math.max(0, slides.length - visible) };
      }

      function apply(px, animate) {
        const t = 'translate3d(' + px + 'px,0,0)';
        slides.forEach(function (s) {
          s.style.transition = animate ? EASE : 'none';
          s.style.transform = t;
        });
      }

      function go(i, animate) {
        const m = metrics();
        if (i > m.max) i = 0;
        if (i < 0) i = m.max;
        index = i;
        offset = -index * m.step;
        apply(offset, animate !== false);
        prevBtn.setAttribute('aria-label', 'Previous (' + (index + 1) + ' of ' + (m.max + 1) + ')');
      }

      function stop(e) {
        e.preventDefault();
        e.stopPropagation();
      }
      prevBtn.addEventListener('click', function (e) { stop(e); go(index - 1); });
      nextBtn.addEventListener('click', function (e) { stop(e); go(index + 1); });
      [prevBtn, nextBtn].forEach(function (btn, n) {
        btn.setAttribute('tabindex', '0');
        btn.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { stop(e); go(index + (n ? 1 : -1)); }
        });
      });
      slider.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') go(index + 1);
        if (e.key === 'ArrowLeft') go(index - 1);
      });

      // Pointer drag / touch swipe with live follow
      let dragging = false, startX = 0, startY = 0, dx = 0, locked = null;
      mask.addEventListener('pointerdown', function (e) {
        if (e.button !== 0 || e.target.closest('a, button, input, select')) return;
        dragging = true; locked = null; dx = 0;
        startX = e.clientX; startY = e.clientY;
      });
      window.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        const mx = e.clientX - startX, my = e.clientY - startY;
        if (locked === null && (Math.abs(mx) > 6 || Math.abs(my) > 6)) {
          locked = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
          if (locked === 'x') slider.classList.add('is-dragging');
        }
        if (locked !== 'x') return;
        dx = mx;
        apply(offset + dx * 0.9, false);
      });
      function endDrag() {
        if (!dragging) return;
        dragging = false;
        slider.classList.remove('is-dragging');
        if (locked === 'x' && Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
        else apply(offset, true);
      }
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
      // Prevent a drag from triggering a link click on the card
      mask.addEventListener('click', function (e) {
        if (Math.abs(dx) > 8) { e.preventDefault(); e.stopPropagation(); dx = 0; }
      }, true);

      let resizeRaf = 0;
      window.addEventListener('resize', function () {
        cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(function () { go(index, false); });
      });
    });
  }

  // Universal Lead Capture Modal & CTA Router
  function initLeadModalAndCTAs() {
    const backdrop = document.getElementById('gg-lead-modal-backdrop');
    if (!backdrop) return;

    const closeBtn = backdrop.querySelector('.gg-lead-modal-close');
    const contextPill = document.getElementById('gg-lead-modal-context');
    const interestSelect = document.getElementById('gg-lead-interest');
    const notesInput = document.getElementById('gg-lead-notes');
    const dateInput = document.getElementById('gg-lead-date');
    const modalForm = document.getElementById('gg-lead-modal-form');
    const successBox = document.getElementById('gg-lead-modal-success');

    function openLeadModal(options) {
      const opts = options || {};
      if (contextPill) {
        contextPill.textContent = opts.context || 'VIP Property & Investment Advisory';
      }
      if (interestSelect && opts.interest) {
        for (let i = 0; i < interestSelect.options.length; i++) {
          if (
            interestSelect.options[i].value.toLowerCase().indexOf(opts.interest.toLowerCase()) !== -1 ||
            opts.interest.toLowerCase().indexOf(interestSelect.options[i].value.toLowerCase()) !== -1
          ) {
            interestSelect.selectedIndex = i;
            break;
          }
        }
      }
      if (dateInput && opts.date) {
        dateInput.value = opts.date;
      }
      if (notesInput && opts.notes) {
        notesInput.value = opts.notes;
      }
      if (modalForm) modalForm.style.display = 'block';
      if (successBox) successBox.style.display = 'none';

      backdrop.classList.add('is-open');
      backdrop.setAttribute('aria-hidden', 'false');
      trackEvent('open_lead_modal', {
        cta_context: opts.context || 'General CTA',
        page_path: window.location.pathname
      });
    }

    function closeLeadModal() {
      backdrop.classList.remove('is-open');
      backdrop.setAttribute('aria-hidden', 'true');
    }

    window.openGreenGateLeadModal = openLeadModal;

    if (closeBtn) {
      closeBtn.addEventListener('click', closeLeadModal);
    }
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closeLeadModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && backdrop.classList.contains('is-open')) {
        closeLeadModal();
      }
    });

    if (modalForm) {
      modalForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const submitBtn = modalForm.querySelector('.gg-lead-submit-btn');
        const origText = submitBtn ? submitBtn.textContent : 'Submit Inquiry';
        if (submitBtn) {
          submitBtn.textContent = 'Syncing Lead to Google Sheets...';
          submitBtn.disabled = true;
        }

        const formData = new FormData(modalForm);
        const fields = {};
        formData.forEach(function (val, key) {
          fields[key] = val;
        });

        const payload = {
          formId: 'gg-universal-lead-modal',
          ctaContext: contextPill ? contextPill.textContent : 'Website CTA',
          pageUrl: window.location.pathname,
          pageTitle: document.title,
          timestamp: new Date().toISOString(),
          fields: fields
        };

        submitLeadToBackendAndSheets(payload).finally(function () {
          if (submitBtn) {
            submitBtn.textContent = origText;
            submitBtn.disabled = false;
          }
          modalForm.style.display = 'none';
          if (successBox) {
            successBox.style.display = 'block';
          }
          trackEvent('generate_lead', {
            form_id: 'gg-universal-lead-modal',
            cta_context: payload.ctaContext,
            page_path: payload.pageUrl
          });
        });
      });
    }

    // Route all [data-gg-cta] elements and CTA buttons to the Lead Capture Modal
    document.addEventListener('click', function (e) {
      const ctaEl = e.target.closest('[data-gg-cta]');
      if (ctaEl) {
        e.preventDefault();
        const ctx = ctaEl.getAttribute('data-gg-cta') || ctaEl.textContent.trim();
        const prop = ctaEl.getAttribute('data-gg-property') || document.querySelector('h1')?.textContent?.trim() || '';
        openLeadModal({
          context: prop ? prop + ' — ' + ctx : ctx,
          interest: prop,
          notes: ctaEl.getAttribute('data-gg-notes') || ''
        });
        return;
      }

      // Also intercept any general CTA button linking to contact.html or #inquiry-form
      const btnLink = e.target.closest('a.button, button.gg-reserve-btn');
      if (!btnLink) return;
      const href = (btnLink.getAttribute('href') || '').trim();
      const text = btnLink.textContent.trim();

      // Keep pure navigation links to listings/projects/blog/about working as page navigation
      // while turning all action CTAs (Get started, Book consultation, Schedule viewing, Reserve, etc.) into instant lead capture
      if (
        href === 'contact.html' ||
        href === '#inquiry-form' ||
        href === '#reserve' ||
        btnLink.classList.contains('gg-reserve-btn')
      ) {
        // If already on contact.html and clicking a button, scroll to #wf-form-Contact-Form
        const onContactPage = window.location.pathname.indexOf('contact') !== -1;
        const contactForm = document.getElementById('wf-form-Contact-Form');
        if (onContactPage && contactForm && !btnLink.closest('.navbar')) {
          e.preventDefault();
          contactForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const firstInput = contactForm.querySelector('input');
          if (firstInput) firstInput.focus();
          return;
        }

        e.preventDefault();
        const pageH1 = document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : 'Dubai Real Estate';
        openLeadModal({
          context: text + ' • ' + pageH1,
          interest: pageH1
        });
      }
    });
  }

  // Bento Property Detail Page Interactions (Matching Reference UI)
  function initPropertyDetailBentoUI() {
    // 1. Bento 5-photo gallery click-to-swap
    const mainBentoImg = document.querySelector('.gg-bento-item.is-main img');
    const subBentoItems = document.querySelectorAll('.gg-bento-item:not(.is-main) img');
    if (mainBentoImg && subBentoItems.length > 0) {
      subBentoItems.forEach(function (subImg) {
        subImg.parentElement.addEventListener('click', function () {
          const clickedSrc = subImg.getAttribute('src');
          const prevMainSrc = mainBentoImg.getAttribute('src');
          const clickedAlt = subImg.getAttribute('alt') || '';
          const prevMainAlt = mainBentoImg.getAttribute('alt') || '';

          mainBentoImg.style.opacity = '0.35';
          setTimeout(function () {
            mainBentoImg.setAttribute('src', clickedSrc);
            mainBentoImg.setAttribute('alt', clickedAlt);
            subImg.setAttribute('src', prevMainSrc);
            subImg.setAttribute('alt', prevMainAlt);
            mainBentoImg.style.opacity = '1';
          }, 150);
        });
      });
    }

    // 2. Save / Bookmark button toggle with "Saved" tooltip badge
    document.querySelectorAll('[data-gg-save]').forEach(function (saveBtn) {
      saveBtn.addEventListener('click', function () {
        saveBtn.classList.toggle('is-saved');
        const tooltip = saveBtn.querySelector('.gg-saved-tooltip');
        if (tooltip) {
          tooltip.textContent = saveBtn.classList.contains('is-saved') ? 'Saved' : 'Save';
        }
      });
    });

    // 3. Share button copy URL
    document.querySelectorAll('[data-gg-share]').forEach(function (shareBtn) {
      shareBtn.addEventListener('click', function () {
        if (navigator.share) {
          navigator.share({
            title: document.title,
            url: window.location.href
          }).catch(function () {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(window.location.href);
          shareBtn.setAttribute('title', 'Link copied!');
        }
      });
    });

    // 4. Description "Show More" / "Show Less" toggle
    document.querySelectorAll('.gg-show-more-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const moreEl = document.getElementById('gg-desc-more');
        if (!moreEl) return;
        const isOpen = moreEl.classList.toggle('is-open');
        btn.textContent = isOpen ? 'Show Less' : 'Show More';
      });
    });

    // 5. Selectable Payment Plan / Acquisition Policy Options in Right Sticky Card
    const policyOptions = document.querySelectorAll('.gg-policy-option');
    const totalPriceEl = document.getElementById('gg-reserve-total-val');
    policyOptions.forEach(function (opt) {
      opt.addEventListener('click', function () {
        policyOptions.forEach(function (o) {
          o.classList.remove('is-selected');
        });
        opt.classList.add('is-selected');
        const totalText = opt.getAttribute('data-total');
        if (totalPriceEl && totalText) {
          totalPriceEl.textContent = totalText;
        }
      });
    });

    // 6. Right Sticky Card "Reserve" Button passes selected Date, Viewing Mode, Guests & Payment Plan into Lead Modal
    const reserveBtn = document.getElementById('gg-sticky-reserve-btn');
    if (reserveBtn) {
      reserveBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const propTitle = reserveBtn.getAttribute('data-property') || document.querySelector('.gg-prop-title')?.textContent || 'Dubai Property';
        const checkin = document.getElementById('gg-booking-checkin')?.value || '';
        const checkout = document.getElementById('gg-booking-checkout')?.value || '';
        const guests = document.getElementById('gg-booking-guests')?.value || '';
        const selectedPolicy = document.querySelector('.gg-policy-option.is-selected')?.textContent?.trim().replace(/\s+/g, ' ') || '';

        if (typeof window.openGreenGateLeadModal === 'function') {
          window.openGreenGateLeadModal({
            context: 'Reserve Viewing / Dossier • ' + propTitle,
            interest: propTitle,
            date: checkin,
            notes:
              'Preferred Viewing: ' +
              (checkin || 'Flexible') +
              (checkout ? ' to ' + checkout : '') +
              ' | Buyer Profile: ' +
              guests +
              ' | Payment Plan: ' +
              selectedPolicy
          });
        }
      });
    }
  }

  // Interactive Leaflet Maps on Property Detail Pages (#gg-property-map) & Listings Page (#gg-listings-map)
  function initInteractiveDubaiMaps() {
    const propMapEl = document.getElementById('gg-property-map');
    const listMapEl = document.getElementById('gg-listings-map');
    if (!propMapEl && !listMapEl) return;

    function renderMaps() {
      if (typeof window.L === 'undefined') return;

      const ggPinIcon = window.L.divIcon({
        className: 'gg-custom-map-pin',
        html:
          '<div style="background:#161616;color:#dfd0a3;border:2px solid #dfd0a3;border-radius:999px;padding:4px 10px;font-weight:700;font-size:12px;box-shadow:0 6px 16px rgba(0,0,0,0.35);white-space:nowrap;display:inline-flex;align-items:center;gap:4px;">' +
          '<span style="width:7px;height:7px;border-radius:50%;background:#dfd0a3;display:inline-block;"></span>' +
          '<span>Green Gate</span></div>',
        iconSize: [96, 28],
        iconAnchor: [48, 14]
      });

      if (propMapEl) {
        const lat = parseFloat(propMapEl.getAttribute('data-lat') || '25.1124');
        const lng = parseFloat(propMapEl.getAttribute('data-lng') || '55.1390');
        const title = propMapEl.getAttribute('data-title') || 'Green Gate Signature Property';
        const price = propMapEl.getAttribute('data-price') || 'AED 24,500,000';
        const locationName = propMapEl.getAttribute('data-location') || 'Dubai, UAE';

        const map = window.L.map(propMapEl, { scrollWheelZoom: false }).setView([lat, lng], 14);
        window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        const popupHtml =
          '<div style="font-family:Inter,sans-serif;min-width:210px;padding:4px 2px;">' +
          '<div style="font-size:11px;font-weight:600;color:#8a7332;text-transform:uppercase;letter-spacing:0.04em;">' +
          locationName +
          '</div>' +
          '<div style="font-size:14px;font-weight:700;color:#161616;margin:3px 0;">' +
          title +
          '</div>' +
          '<div style="font-size:13px;font-weight:600;color:#333;margin-bottom:8px;">' +
          price +
          '</div>' +
          '<button type="button" data-gg-cta="Map Pin Inquiry" data-gg-property="' +
          title.replace(/"/g, '&quot;') +
          '" style="width:100%;background:#161616;color:#dfd0a3;border:none;border-radius:6px;padding:6px 10px;font-size:12px;font-weight:600;cursor:pointer;">Request Exact Plot &amp; Viewing</button>' +
          '</div>';

        window.L.marker([lat, lng], { icon: ggPinIcon }).addTo(map).bindPopup(popupHtml).openPopup();
      }

      if (listMapEl) {
        const map = window.L.map(listMapEl, { scrollWheelZoom: false }).setView([25.135, 55.225], 11);
        window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        const properties = [
          {
            title: 'Palm Jumeirah Signature Villas',
            area: 'Palm Jumeirah',
            price: 'AED 24.5M',
            lat: 25.1124,
            lng: 55.139,
            url: 'villas.html'
          },
          {
            title: 'Downtown Burj Sky Residences',
            area: 'Downtown Dubai',
            price: 'AED 4.2M',
            lat: 25.1972,
            lng: 55.2744,
            url: 'apartments.html'
          },
          {
            title: 'Dubai Hills Golf Park Townhouses',
            area: 'Dubai Hills Estate',
            price: 'AED 5.8M',
            lat: 25.1053,
            lng: 55.2456,
            url: 'townhouses.html'
          },
          {
            title: 'Marina Gate Sky Penthouses',
            area: 'Dubai Marina',
            price: 'AED 16.5M',
            lat: 25.0889,
            lng: 55.1456,
            url: 'project-marina-suites.html'
          },
          {
            title: 'Creek Harbour Lagoon Sanctuary',
            area: 'Dubai Creek Harbour',
            price: 'AED 3.1M',
            lat: 25.2048,
            lng: 55.3469,
            url: 'project-creek-sanctuary.html'
          },
          {
            title: 'District One Lagoon Mansions',
            area: 'MBR City',
            price: 'AED 38.0M',
            lat: 25.1645,
            lng: 55.2912,
            url: 'project-oasis-estates.html'
          }
        ];

        properties.forEach(function (p) {
          const pin = window.L.divIcon({
            className: 'gg-custom-map-pin',
            html:
              '<div style="background:#161616;color:#dfd0a3;border:1.5px solid #dfd0a3;border-radius:999px;padding:3px 9px;font-weight:700;font-size:11.5px;box-shadow:0 4px 12px rgba(0,0,0,0.3);white-space:nowrap;">' +
              p.price +
              '</div>',
            iconSize: [86, 24],
            iconAnchor: [43, 12]
          });

          const pop =
            '<div style="font-family:Inter,sans-serif;min-width:200px;padding:4px 2px;">' +
            '<div style="font-size:11px;font-weight:600;color:#8a7332;">' +
            p.area +
            '</div>' +
            '<div style="font-size:13.5px;font-weight:700;color:#161616;margin:2px 0;">' +
            p.title +
            '</div>' +
            '<div style="font-size:12.5px;font-weight:600;color:#333;margin-bottom:8px;">Starting from ' +
            p.price +
            '</div>' +
            '<div style="display:flex;gap:6px;">' +
            '<a href="' +
            p.url +
            '" style="flex:1;text-align:center;background:#f2efe6;color:#161616;text-decoration:none;border-radius:5px;padding:5px 8px;font-size:11.5px;font-weight:600;">View Listing</a>' +
            '<button type="button" data-gg-cta="Interactive Map Lead" data-gg-property="' +
            p.title +
            '" style="flex:1;background:#161616;color:#dfd0a3;border:none;border-radius:5px;padding:5px 8px;font-size:11.5px;font-weight:600;cursor:pointer;">Inquire</button>' +
            '</div></div>';

          window.L.marker([p.lat, p.lng], { icon: pin }).addTo(map).bindPopup(pop);
        });
      }
    }

    if (typeof window.L !== 'undefined') {
      renderMaps();
    } else {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = renderMaps;
      document.body.appendChild(script);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initScrollRevealAnimations();
    initSmoothSliders();
    initLeadModalAndCTAs();
    initPropertyDetailBentoUI();
    initInteractiveDubaiMaps();

    // 1. FAQ Accordion Toggle (.faq_item)
    const faqItems = document.querySelectorAll('.faq_item');
    faqItems.forEach(function (item, idx) {
      const bottomWrap = item.querySelector('.faq_bottom-wrap');
      const vertLine = item.querySelector('.about_item-button-line.is-vertical');
      if (!bottomWrap) return;

      bottomWrap.style.overflow = 'hidden';
      bottomWrap.style.transition =
        'height 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
      if (vertLine) {
        vertLine.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
      }

      if (idx === 0) {
        bottomWrap.style.height = 'auto';
        bottomWrap.style.opacity = '1';
        if (vertLine) vertLine.style.transform = 'rotate(90deg)';
        item.classList.add('is-open');
        item.setAttribute('aria-expanded', 'true');
      } else {
        bottomWrap.style.height = '0px';
        bottomWrap.style.opacity = '0';
        item.setAttribute('aria-expanded', 'false');
      }

      item.style.cursor = 'pointer';
      item.addEventListener('click', function () {
        const isOpen = item.classList.contains('is-open');
        if (isOpen) {
          bottomWrap.style.height = bottomWrap.scrollHeight + 'px';
          requestAnimationFrame(function () {
            bottomWrap.style.height = '0px';
            bottomWrap.style.opacity = '0';
          });
          if (vertLine) vertLine.style.transform = 'rotate(0deg)';
          item.classList.remove('is-open');
          item.setAttribute('aria-expanded', 'false');
        } else {
          bottomWrap.style.height = bottomWrap.scrollHeight + 'px';
          bottomWrap.style.opacity = '1';
          if (vertLine) vertLine.style.transform = 'rotate(90deg)';
          item.classList.add('is-open');
          item.setAttribute('aria-expanded', 'true');
        }
      });
    });

    // 2. Listings Page Interactive Filter (#wf-form-Listings-Filter)
    const filterForm = document.getElementById('wf-form-Listings-Filter');
    const propertyItems = document.querySelectorAll('#properties-grid .destinations_list > .w-dyn-item');
    if (filterForm && propertyItems.length > 0) {
      function applyFilter(scrollToGrid) {
        const activeTab = filterForm.querySelector('.listings_tab-link.w--current');
        const isApartmentTab = activeTab && activeTab.getAttribute('data-w-tab') === 'Tab 2';
        const locSelect = document.getElementById(isApartmentTab ? 'Location-Apt' : 'Location-Villa');
        const bedSelect = document.getElementById(isApartmentTab ? 'Bedrooms-Apt' : 'Bedrooms-Villa');
        const selectedLoc = locSelect ? locSelect.value : '';
        const selectedBeds = bedSelect ? bedSelect.value : '';

        let visibleCount = 0;
        propertyItems.forEach(function (card) {
          const loc = card.getAttribute('data-location') || '';
          const beds = card.getAttribute('data-beds') || '';

          let match = true;
          if (selectedLoc && loc !== selectedLoc) match = false;
          if (selectedBeds && beds !== selectedBeds) match = false;

          card.style.display = match ? '' : 'none';
          if (match) {
            card.classList.remove('is-revealed');
            requestAnimationFrame(function () {
              card.classList.add('is-revealed');
            });
            visibleCount++;
          }
        });

        if (visibleCount === 0) {
          propertyItems.forEach(function (card) {
            card.style.display = '';
          });
        }

        trackEvent('search', {
          search_term: (selectedLoc || 'All Dubai') + ' / ' + (selectedBeds || 'Any') + ' Beds'
        });

        if (scrollToGrid) {
          const gridEl = document.getElementById('properties-grid');
          if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }

      filterForm.addEventListener('submit', function (e) {
        e.preventDefault();
        e.stopPropagation();
        applyFilter(true);
      });
    }

    // 3. On-Page Forms (.w-form form) connected to Backend + Google Sheets Webhook
    const forms = document.querySelectorAll('.w-form form');
    forms.forEach(function (form) {
      if (form.id === 'wf-form-Listings-Filter') return;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const wrapper = form.closest('.w-form');
        if (!wrapper) return;
        const submitBtn = form.querySelector('input[type="submit"], button[type="submit"]');
        const origBtnVal = submitBtn ? submitBtn.value : '';
        if (submitBtn && submitBtn.getAttribute('data-wait')) {
          submitBtn.value = submitBtn.getAttribute('data-wait');
          submitBtn.disabled = true;
        }

        const formData = new FormData(form);
        const payload = {
          formId: form.id || form.getAttribute('name') || 'general-inquiry',
          ctaContext: 'On-Page Form (' + (form.getAttribute('name') || form.id) + ')',
          pageUrl: window.location.pathname,
          pageTitle: document.title,
          timestamp: new Date().toISOString(),
          fields: {}
        };
        formData.forEach(function (val, key) {
          payload.fields[key] = val;
        });

        function showSuccess() {
          const done = wrapper.querySelector('.w-form-done');
          const fail = wrapper.querySelector('.w-form-fail');
          form.style.display = 'none';
          if (fail) fail.style.display = 'none';
          if (done) {
            done.classList.remove('hide');
            done.style.display = 'block';
          }
          trackEvent('generate_lead', {
            form_id: payload.formId,
            page_path: payload.pageUrl
          });
        }

        submitLeadToBackendAndSheets(payload).finally(function () {
          showSuccess();
          if (submitBtn) {
            submitBtn.value = origBtnVal;
            submitBtn.disabled = false;
          }
        });
      });
    });

    // 4. Make entire destination / property card clickable
    document.querySelectorAll('.item_destination, .destinations_item-third').forEach(function (card) {
      const link = card.querySelector('a.button.is-none');
      if (link) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function (e) {
          if (!e.target.closest('a') && !e.target.closest('[data-gg-cta]')) {
            window.location.href = link.getAttribute('href');
          }
        });
      }
    });

    // 5. Track phone & email clicks in GA4
    document.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]').forEach(function (a) {
      a.addEventListener('click', function () {
        const href = a.getAttribute('href') || '';
        trackEvent(href.startsWith('tel:') ? 'click_phone' : 'click_email', {
          link_url: href,
          page_path: window.location.pathname
        });
      });
    });
  });
})();
