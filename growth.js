/* Ashvamedha Finance — growth layer (loaded on every page).
   1) Analytics  2) Sticky lead bar + callback form  3) Calculator cards in blogs
   4) Guides block on calculators page  5) Mobile fixes
   ----------------------------------------------------------------------- */
(function () {
  'use strict';

  /* ═══════ CONFIG — paste your IDs here, nothing else needs editing ═══════ */
  var CFG = {
    GA_ID: '',          // e.g. 'G-XXXXXXXXXX'  (Google Analytics 4)
    CLARITY_ID: '',     // e.g. 'abcd1234ef'    (Microsoft Clarity — free heatmaps)
    LEAD_ENDPOINT: '',  // optional: 'https://formsubmit.co/ajax/YOUR_EMAIL' — emails every callback request
    WA_NUMBER: '918790109022',
    PHONE: '+918790109022',
    WA_LINK: 'https://wa.link/rwwzd4'
  };

  var path = location.pathname.replace(/\/+$/, '') || '/';
  var isBlogArticle = /^\/blog\/[^/]+/.test(path);
  var isCalc = /^\/calculators/.test(path);

  function safe(fn) { try { return fn(); } catch (e) { return null; } }
  function track(name, params) {
    safe(function () { if (window.gtag) window.gtag('event', name, params || {}); });
  }

  /* ═══════ 1. ANALYTICS ═══════ */
  if (CFG.GA_ID) {
    var g = document.createElement('script');
    g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + CFG.GA_ID;
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date()); window.gtag('config', CFG.GA_ID);
  }
  if (CFG.CLARITY_ID) {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CFG.CLARITY_ID);
  }

  /* ═══════ 5. MOBILE FIXES + STYLES ═══════ */
  var css = '' +
    /* sticky lead bar */
    '#avg-bar{position:fixed;z-index:9990;left:0;right:0;bottom:0;display:flex;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:rgba(6,14,26,.96);border-top:1px solid rgba(201,168,76,.35);backdrop-filter:blur(8px);font-family:Inter,system-ui,sans-serif}' +
    '#avg-bar a,#avg-bar button{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:12px 8px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;border:0;cursor:pointer;line-height:1.1;font-family:inherit}' +
    '#avg-bar .avg-wa{background:#25d366;color:#04230f}#avg-bar .avg-call{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.18)}#avg-bar .avg-cb{background:linear-gradient(135deg,#c9a84c,#e8c96a);color:#0b1626}' +
    'body.avg-pad{padding-bottom:74px}' +
    '@media(min-width:861px){#avg-bar{left:auto;right:20px;bottom:20px;width:auto;border:1px solid rgba(201,168,76,.4);border-radius:16px;padding:10px;box-shadow:0 10px 40px rgba(0,0,0,.5)}#avg-bar a,#avg-bar button{flex:none;padding:11px 16px}body.avg-pad{padding-bottom:0}}' +
    /* modal */
    '#avg-ov{position:fixed;inset:0;z-index:9995;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;padding:16px;font-family:Inter,system-ui,sans-serif}#avg-ov.open{display:flex}' +
    '#avg-box{position:relative;width:100%;max-width:400px;background:#0e1c30;border:1px solid rgba(201,168,76,.4);border-radius:18px;padding:28px 24px;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.6)}' +
    '#avg-box h3{font-family:"Cormorant Garamond",Georgia,serif;font-size:26px;margin:0 0 6px;color:#fff}#avg-box p{font-size:13px;color:rgba(255,255,255,.62);line-height:1.6;margin:0 0 16px}' +
    '#avg-box label{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#c9a84c;margin:12px 0 5px;font-weight:700}' +
    '#avg-box input,#avg-box select{width:100%;box-sizing:border-box;padding:13px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#fff;font-size:16px;font-family:inherit}' +
    '#avg-box select option{color:#000}#avg-go{width:100%;margin-top:18px;padding:14px;border:0;border-radius:11px;background:linear-gradient(135deg,#c9a84c,#e8c96a);color:#0b1626;font-weight:800;font-size:15px;cursor:pointer}' +
    '#avg-x{position:absolute;top:10px;right:14px;background:none;border:0;color:#fff;font-size:26px;cursor:pointer;line-height:1}#avg-err{color:#ff8a80;font-size:12px;margin-top:8px;min-height:14px}' +
    '#avg-fine{font-size:11px;color:rgba(255,255,255,.4);margin-top:12px;line-height:1.5}' +
    /* blog calculator card */
    '.avg-calc{margin:28px 0;padding:22px 20px;border-radius:14px;border:1px solid rgba(201,168,76,.45);background:linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.03));font-family:Inter,system-ui,sans-serif}' +
    '.avg-calc b{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#c9a84c;margin-bottom:6px}.avg-calc h4{margin:0 0 6px;font-size:19px;color:#fff;font-family:"Cormorant Garamond",Georgia,serif}' +
    '.avg-calc p{margin:0 0 14px;font-size:13.5px;color:rgba(255,255,255,.7);line-height:1.6}.avg-calc a.go{display:inline-block;padding:11px 20px;border-radius:10px;background:linear-gradient(135deg,#c9a84c,#e8c96a);color:#0b1626;font-weight:800;font-size:14px;text-decoration:none}' +
    '.avg-guides{max-width:1060px;margin:0 auto;padding:40px 5%;font-family:Inter,system-ui,sans-serif}.avg-guides h3{font-family:"Cormorant Garamond",Georgia,serif;font-size:28px;color:#fff;margin:0 0 6px}.avg-guides p.s{font-size:13px;color:rgba(255,255,255,.55);margin:0 0 18px}' +
    '.avg-gl{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}.avg-gl a{display:block;padding:14px 16px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#fff;text-decoration:none;font-size:13.5px;line-height:1.45}.avg-gl a:hover{border-color:rgba(201,168,76,.5)}.avg-gl a small{display:block;color:#c9a84c;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;font-weight:700}' +
    /* mobile: portfolio page two-column layouts, form padding, overflow */
    '@media(max-width:760px){' +
    'html,body{overflow-x:hidden}' +
    '[style*="grid-template-columns:1fr 1fr;gap:60px"]{grid-template-columns:minmax(0,1fr)!important;gap:28px!important}' +
    '[style*="grid-template-columns:1fr 1fr;gap:8px"]{grid-template-columns:minmax(0,1fr)!important}' +
    '[style*="border-radius:18px"][style*="padding:40px"]{padding:22px 16px!important}' +
    'input,select,textarea{font-size:16px!important;max-width:100%}' +
        /* reviews carousel: one full card per view, no fade overlays */
    '.carousel-outer::before,.carousel-outer::after{display:none!important}' +
    '.carousel-outer{padding:0 2px}' +
    '.carousel-track{gap:24px}' +
    '.t-card{min-width:100%!important;max-width:100%!important;flex:0 0 100%!important;box-sizing:border-box;padding:24px 20px!important}' +
    '.t-text{font-size:14px!important}' +
    '}';
  var st = document.createElement('style'); st.id = 'avg-style'; st.textContent = css;
  document.head.appendChild(st);

  /* carousel: resync on resize, swipe on touch */
  function carouselFix() {
    if (typeof window.goTo !== 'function' || typeof window.moveCarousel !== 'function') return;
    ['homeCarousel', 'aboutCarousel'].forEach(function (id) {
      var tr = document.getElementById(id); if (!tr) return;
      var x0 = null;
      tr.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      tr.addEventListener('touchend', function (e) {
        if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (Math.abs(dx) > 40) window.moveCarousel(id, dx < 0 ? 1 : -1);
      }, { passive: true });
    });
    var t; window.addEventListener('resize', function () {
      clearTimeout(t); t = setTimeout(function () {
        ['homeCarousel', 'aboutCarousel'].forEach(function (id) {
          if (window.cState && window.cState[id]) window.goTo(id, window.cState[id].index);
        });
      }, 150);
    });
  }

  /* ═══════ 2. STICKY LEAD BAR + CALLBACK FORM ═══════ */
  function waUrl(text) { return 'https://wa.me/' + CFG.WA_NUMBER + '?text=' + encodeURIComponent(text); }

  function buildBar() {
    if (document.getElementById('avg-bar')) return;
    var bar = document.createElement('div'); bar.id = 'avg-bar';
    bar.innerHTML =
      '<a class="avg-wa" href="' + CFG.WA_LINK + '" target="_blank" rel="noopener" data-ev="whatsapp">WhatsApp</a>' +
      '<a class="avg-call" href="tel:' + CFG.PHONE + '" data-ev="call">Call</a>' +
      '<button class="avg-cb" type="button" data-ev="callback">Free callback</button>';
    document.body.appendChild(bar); document.body.classList.add('avg-pad');
    bar.addEventListener('click', function (e) {
      var t = e.target.closest('[data-ev]'); if (!t) return;
      var ev = t.getAttribute('data-ev'); track('lead_click', { method: ev, page: path });
      if (ev === 'callback') openForm();
    });

    var ov = document.createElement('div'); ov.id = 'avg-ov';
    ov.innerHTML =
      '<div id="avg-box" role="dialog" aria-modal="true" aria-labelledby="avg-t">' +
      '<button id="avg-x" type="button" aria-label="Close">&times;</button>' +
      '<div id="avg-form"><h3 id="avg-t">Get a free call from Manoj</h3>' +
      '<p>Share your number and Manoj will call you back, in Telugu, Hindi or English. No spam, no obligation.</p>' +
      '<label for="avg-n">Your name</label><input id="avg-n" autocomplete="name" placeholder="Full name">' +
      '<label for="avg-m">Mobile number</label><input id="avg-m" type="tel" inputmode="numeric" maxlength="10" autocomplete="tel-national" placeholder="10-digit mobile">' +
      '<label for="avg-i">I need help with</label><select id="avg-i"><option>Mutual funds / SIP planning</option><option>Term & health insurance</option><option>Retirement or FIRE planning</option><option>NRI investing</option><option>Unlisted shares</option><option>Portfolio review</option><option>Something else</option></select>' +
      '<div id="avg-err"></div><button id="avg-go" type="button">Request free callback</button>' +
      '<div id="avg-fine">Educational guidance only, not investment advice. Ashvamedha Finance’s SEBI RA registration is in application. We use your number only to contact you about your request.</div></div>' +
      '<div id="avg-ok" style="display:none"><h3>Thank you!</h3><p>Your request is in. For the fastest reply, tap below to message Manoj on WhatsApp now.</p><a id="avg-wa2" style="display:block;text-align:center;padding:14px;border-radius:11px;background:#25d366;color:#04230f;font-weight:800;text-decoration:none" target="_blank" rel="noopener">Continue on WhatsApp</a></div>' +
      '</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) closeForm(); });
    document.getElementById('avg-x').onclick = closeForm;
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeForm(); });
    document.getElementById('avg-go').onclick = submitForm;
  }
  function openForm(topic) {
    var ov = document.getElementById('avg-ov'); if (!ov) return;
    document.getElementById('avg-form').style.display = ''; document.getElementById('avg-ok').style.display = 'none';
    document.getElementById('avg-err').textContent = '';
    if (topic) { var s = document.getElementById('avg-i'); for (var i = 0; i < s.options.length; i++) if (s.options[i].text === topic) s.selectedIndex = i; }
    ov.classList.add('open'); setTimeout(function () { var n = document.getElementById('avg-n'); if (n) n.focus(); }, 60);
  }
  function closeForm() { var ov = document.getElementById('avg-ov'); if (ov) ov.classList.remove('open'); }
  window.avOpenCallback = openForm;

  function submitForm() {
    var name = document.getElementById('avg-n').value.trim();
    var ph = document.getElementById('avg-m').value.replace(/\D/g, '');
    var topic = document.getElementById('avg-i').value;
    var err = document.getElementById('avg-err');
    if (name.length < 2) { err.textContent = 'Please enter your name.'; return; }
    if (!/^[6-9]\d{9}$/.test(ph)) { err.textContent = 'Enter a valid 10-digit Indian mobile number.'; return; }
    var lead = { name: name, phone: ph, topic: topic, page: location.href, at: new Date().toISOString(), source: 'callback-form' };
    safe(function () { var a = JSON.parse(localStorage.getItem('av_leads') || '[]'); a.push(lead); localStorage.setItem('av_leads', JSON.stringify(a)); });
    if (CFG.LEAD_ENDPOINT) {
      safe(function () {
        fetch(CFG.LEAD_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ _subject: 'New callback request — ' + name, name: name, mobile: ph, topic: topic, page: lead.page }) });
      });
    }
    track('generate_lead', { method: 'callback_form', page: path });
    var msg = 'Hi Manoj, I’d like a free callback.\nName: ' + name + '\nMobile: ' + ph + '\nTopic: ' + topic + '\nPage: ' + location.href;
    document.getElementById('avg-wa2').href = waUrl(msg);
    document.getElementById('avg-form').style.display = 'none'; document.getElementById('avg-ok').style.display = '';
  }

  /* soft nudge on long articles: once per session, after 55% scroll */
  function scrollNudge() {
    if (!isBlogArticle) return;
    var shown = safe(function () { return sessionStorage.getItem('avg_nudge'); }); if (shown) return;
    function onS() {
      var h = document.documentElement; var p = (h.scrollTop + window.innerHeight) / h.scrollHeight;
      if (p > 0.55) {
        window.removeEventListener('scroll', onS);
        safe(function () { sessionStorage.setItem('avg_nudge', '1'); });
        var b = document.querySelector('#avg-bar .avg-cb'); if (b) { b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 700, iterations: 3 }); }
      }
    }
    window.addEventListener('scroll', onS, { passive: true });
  }

  /* ═══════ 3. CALCULATOR CARD IN BLOGS ═══════ */
  var CALCS = {
    sip: ['SIP Calculator', 'See what your monthly SIP can become, with step-up, lumpsum and SWP in one place.'],
    stepup: ['Step-Up SIP Calculator', 'Increase your SIP every year and see the difference on your final corpus.'],
    lumpsum: ['Lumpsum Calculator', 'Check what a one-time investment grows to, with return scenarios and a PDF report.'],
    retirement: ['Retirement Calculator', 'Find the corpus you need and the monthly SIP that gets you there.'],
    fire: ['FIRE Number Calculator', 'Work out your financial-independence number and the year you can reach it.'],
    goal: ['Goal Planner', 'Plan for a child’s education, a wedding or a house: how much to invest each month.'],
    homeloan: ['Home Loan vs Investing Calculator', 'Pay EMIs and invest, or pay cash and invest later? See the realistic numbers, inflation included.'],
    carloan: ['Car Loan vs Cash Calculator', 'Should you take a car loan or pay cash? Compare both with real costs.'],
    rentbuy: ['Rent vs Buy Calculator', 'Includes registration cost, maintenance and the return on the money you would have invested.'],
    mfre: ['Mutual Funds vs Real Estate Calculator', 'Compare a property with the same money in mutual funds, after registration, brokerage and tax.'],
    fdmf: ['FD vs Mutual Fund Calculator', 'See post-tax FD returns against mutual funds on the same amount and time.']
  };
  var RULES = [
    [/(^|-)fire(-|$)|financial-independence|early-retire/, 'fire'],
    [/rent-vs-buy|renting-vs-buying|buy-vs-rent/, 'rentbuy'],
    [/real-estate|property|mutual-fund-vs-real/, 'mfre'],
    [/car-loan|vehicle/, 'carloan'],
    [/home-loan|housing-loan|(^|-)emi(-|$)|prepay/, 'homeloan'],
    [/fd-|fixed-deposit|ppf|debt-m|fd-alternatives/, 'fdmf'],
    [/retire|pension|corpus|(^|-)nps(-|$)|(^|-)swp(-|$)/, 'retirement'],
    [/education|child|wedding|goal|house-down/, 'goal'],
    [/lumpsum|where-to-invest|1cr|50l|2cr|idle-money|windfall|bonus/, 'lumpsum'],
    [/step-up|stepup/, 'stepup'],
    [/(^|-)sip(-|$)|mutual-fund|index-fund|invest|nri|financial-plan|wealth|saving|emergency/, 'sip']
  ];
  function pickCalc() {
    var slug = path.split('/').pop().toLowerCase();
    for (var i = 0; i < RULES.length; i++) if (RULES[i][0].test(slug)) return RULES[i][1];
    return null;
  }
  function addCalcCard() {
    if (!isBlogArticle) return;
    if (document.querySelector('a[href*="/calculators"]')) return; /* article already links */
    var id = pickCalc(); if (!id) return;
    var art = document.querySelector('article'); if (!art) return;
    var c = CALCS[id];
    var d = document.createElement('div'); d.className = 'avg-calc';
    d.innerHTML = '<b>Free tool</b><h4>' + c[0] + '</h4><p>' + c[1] + '</p><a class="go" href="/calculators#calc=' + id + '" data-calc="' + id + '">Try the calculator</a>';
    d.querySelector('a').addEventListener('click', function () { track('calc_card_click', { calc: id, page: path }); });
    var anchor = art.querySelector('.cta') || art.querySelector('.rp');
    if (anchor) anchor.parentNode.insertBefore(d, anchor); else art.appendChild(d);
  }

  /* ═══════ 4. GUIDES BLOCK ON CALCULATORS PAGE ═══════ */
  var GUIDES = [
    ['SIP', 'sip-stepup-calculator-guide', 'SIP and step-up SIP: how to use the calculator'],
    ['SWP', 'swp-calculator-how-long-money-lasts', 'SWP: how long will your money last?'],
    ['Retirement', 'retirement-corpus-calculator-telugu', 'Retirement corpus calculator (Telugu guide)'],
    ['FIRE', 'how-to-calculate-fire-number', 'How to calculate your FIRE number'],
    ['Home loan', 'home-loan-vs-cash-calculator-real-numbers', 'Home loan vs paying cash: the real numbers'],
    ['Home loan', 'home-loan-emi-calculator-how-to-use', 'Home loan EMI calculator: how to use it'],
    ['Car loan', 'car-loan-vs-cash-calculator', 'Car loan vs cash: which is cheaper?'],
    ['Rent vs buy', 'rent-vs-buy-calculator-real-numbers', 'Rent vs buy: real numbers with registration cost'],
    ['Real estate', 'mutual-fund-vs-real-estate-calculator', 'Mutual funds vs real estate calculator'],
    ['FD vs MF', 'fd-vs-mutual-fund-calculator', 'FD vs mutual fund: post-tax comparison'],
    ['Lumpsum', 'where-to-invest-lumpsum-50l-1cr-2cr', 'Where to invest a lumpsum: 50L, 1Cr, 2Cr']
  ];
  function addGuides() {
    if (!isCalc || document.getElementById('avg-guides')) return;
    var d = document.createElement('section'); d.id = 'avg-guides'; d.className = 'avg-guides';
    d.innerHTML = '<h3>Learn how each calculator works</h3><p class="s">Short guides with worked examples, so you trust the numbers before you act on them.</p><div class="avg-gl">' +
      GUIDES.map(function (g) { return '<a href="/blog/' + g[1] + '"><small>' + g[0] + '</small>' + g[2] + '</a>'; }).join('') + '</div>';
    var f = document.querySelector('footer');
    if (f && f.parentNode) f.parentNode.insertBefore(d, f); else document.body.appendChild(d);
  }

  /* ═══════ INIT ═══════ */
  function init() {
    buildBar(); addCalcCard(); addGuides(); scrollNudge();
    setTimeout(carouselFix, 400);
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href*="wa.link"],a[href*="wa.me"]');
      if (a && !a.closest('#avg-bar')) track('lead_click', { method: 'whatsapp_inline', page: path });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
