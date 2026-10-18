// Marsella Event Venue — day/night, the event picker (services → quote), menu, gallery, quote form.
(() => {
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };

  // ---- Day / night: every [data-phase] shows its own phase until the visitor flips the switch ----
  const TKEY = 'marsella-time';
  const sess = { get(k) { try { return sessionStorage.getItem(k); } catch { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } } };
  const qt = new URLSearchParams(location.search).get('t');
  let mode = qt === 'day' || qt === 'night' ? qt : sess.get(TKEY);
  if (mode !== 'day' && mode !== 'night') mode = null;
  const chrome = [...document.querySelectorAll('[data-chrome]')];
  let chromePhase = (chrome[0] && chrome[0].dataset.phase) || 'day';
  const effOf = (el) => mode || el.dataset.phase;
  const apply = () => {
    document.querySelectorAll('[data-phase]').forEach((el) => {
      el.dataset.eff = el.hasAttribute('data-chrome') ? (mode || chromePhase) : effOf(el);
    });
    const night = (mode || chromePhase) === 'night';
    document.querySelectorAll('[data-tod]').forEach((b) => b.setAttribute('aria-checked', String(night)));
  };
  const flip = (fromEl) => {
    const current = fromEl ? fromEl.dataset.eff : (mode || chromePhase);
    mode = current === 'night' ? 'day' : 'night';
    sess.set(TKEY, mode);
    apply();
  };
  document.querySelectorAll('[data-tod]').forEach((b) => b.addEventListener('click', () => flip()));
  document.querySelectorAll('[data-lights]').forEach((b) => b.addEventListener('click', () => flip(b.closest('[data-phase]'))));
  // Home hero: daytime photos take turns every 6s (paused at night, in a hidden tab, with reduced motion, or after a manual pick).
  document.querySelectorAll('[data-carousel]').forEach((swap) => {
    const slides = [...swap.querySelectorAll('img.d')];
    const hero = swap.closest('.hero');
    if (slides.length < 2 || !hero) return;
    const es = document.documentElement.lang.startsWith('es');
    const dots = document.createElement('div');
    dots.className = 'hero-dots';
    dots.setAttribute('role', 'group');
    dots.setAttribute('aria-label', es ? 'Fotos del salón de día' : 'Daytime photos of the venue');
    let at = 0; let timer = null; let paused = false;
    const show = (i) => {
      at = (i + slides.length) % slides.length;
      slides.forEach((im, k) => im.classList.toggle('on', k === at));
      [...dots.children].forEach((b, k) => b.setAttribute('aria-current', String(k === at)));
    };
    const stop = () => { clearInterval(timer); timer = null; };
    const start = () => { if (!timer && !paused && !matchMedia('(prefers-reduced-motion: reduce)').matches && hero.dataset.eff !== 'night' && !document.hidden) timer = setInterval(() => show(at + 1), 6000); };
    slides.forEach((im, k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', (es ? 'Foto ' : 'Photo ') + (k + 1) + (es ? ' de ' : ' of ') + slides.length);
      b.addEventListener('click', () => { paused = true; stop(); show(k); });
      dots.appendChild(b);
    });
    hero.appendChild(dots);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    new MutationObserver(() => (hero.dataset.eff === 'night' ? stop() : start())).observe(hero, { attributes: true, attributeFilter: ['data-eff'] });
    show(0);
    start();
  });
  // Reviews: the quotes are shuffled on load; four show at once and the button brings in the next four.
  document.querySelectorAll('[data-cluster]').forEach((box) => {
    const figs = [...box.querySelectorAll('.quote')];
    if (figs.length < 5) return;
    for (let i = figs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [figs[i], figs[j]] = [figs[j], figs[i]]; }
    figs.forEach((f) => box.appendChild(f));
    const SIZE = 4; let start = 0;
    const render = () => figs.forEach((f, k) => {
      const idx = (k - start + figs.length) % figs.length;
      if (idx < SIZE) { f.dataset.slot = String(idx + 1); f.removeAttribute('aria-hidden'); } else { delete f.dataset.slot; f.setAttribute('aria-hidden', 'true'); }
    });
    render();
    box.setAttribute('aria-live', 'polite');
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'rv-more';
    btn.innerHTML = '<span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4"/></svg>';
    btn.firstChild.textContent = box.dataset.labelMore;
    box.after(btn);
    btn.addEventListener('click', () => {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const go = () => { start = (start + SIZE) % figs.length; render(); box.classList.remove('swap'); };
      if (reduce) return go();
      box.classList.add('swap'); setTimeout(go, 260);
    });
  });
  // The dusk band lights its string of bulbs once, when it scrolls into view.
  const dusk = document.querySelector('[data-dusk] .bulbs');
  if (dusk) {
    if (!('IntersectionObserver' in window)) dusk.dataset.eff = 'night';
    else { const dio = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { dusk.dataset.eff = 'night'; dio.disconnect(); } }, { threshold: .6 }); dio.observe(dusk.parentElement); }
  }
  // Header and phone bar follow the section passing under the header.
  const sections = [...document.querySelectorAll('main [data-phase]')];
  const under = () => {
    const y = 74;
    const s = sections.find((el) => { const r = el.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
    const p = s ? s.dataset.phase : (sections[0] && sections[0].dataset.phase) || 'day';
    if (p !== chromePhase) { chromePhase = p; if (!mode) apply(); }
  };
  let ticking = false;
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { under(); ticking = false; }); } }, { passive: true });
  under();
  apply();
  const KEY = 'marsella-menu';
  let picked = [];
  try { picked = JSON.parse(store.get(KEY) || '[]'); } catch { picked = []; }
  if (!Array.isArray(picked)) picked = [];

  const items = () => [...document.querySelectorAll('[data-item]')];
  const labelOf = (id) => { const el = document.querySelector(`[data-item="${id}"] .nm`); return el ? el.textContent.trim() : id; };

  const paint = (bump) => {
    items().forEach((b) => b.setAttribute('aria-pressed', String(picked.includes(b.dataset.item))));
    document.querySelectorAll('[data-count]').forEach((c) => {
      c.textContent = picked.length ? String(picked.length) : '';
      if (bump) { c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
    });
    const box = document.querySelector('[data-picked]');
    if (box) {
      box.innerHTML = picked.length
        ? picked.map((id) => `<span>${labelOf(id)}</span>`).join('')
        : `<em>${box.dataset.empty || ''}</em>`;
    }
    const hidden = document.querySelector('input[name="services"]');
    if (hidden) hidden.value = picked.map(labelOf).join(', ');
  };
  items().forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.item;
    picked = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
    store.set(KEY, JSON.stringify(picked));
    paint(true);
  }));
  paint(false);

  // ---- Mobile menu ----
  const menu = document.getElementById('menu');
  const openBtn = document.querySelector('[data-menu-open]');
  const closeBtn = document.querySelector('[data-menu-close]');
  if (menu && openBtn) {
    const close = () => { menu.hidden = true; openBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; openBtn.focus(); };
    openBtn.addEventListener('click', () => { menu.hidden = false; openBtn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; closeBtn && closeBtn.focus(); });
    closeBtn && closeBtn.addEventListener('click', close);
    menu.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  // ---- Gallery filter + lightbox ----
  const gal = document.querySelector('[data-gallery]');
  if (gal) {
    const btns = [...gal.querySelectorAll('button[data-full]')];
    const balance = () => {
      const cols = getComputedStyle(gal).gridTemplateColumns.split(' ').length;
      const vis = btns.filter((i) => !i.hidden);
      btns.forEach((i) => { i.style.gridColumn = ''; i.classList.remove('fill'); });
      const rem = vis.length % cols;
      if (rem && vis.length) { const last = vis[vis.length - 1]; last.style.gridColumn = 'span ' + (cols - rem + 1); last.classList.add('fill'); }
    };
    balance();
    window.addEventListener('resize', balance);
    document.querySelectorAll('[data-filter]').forEach((f) => f.addEventListener('click', () => {
      const k = f.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === f)));
      btns.forEach((it) => { it.hidden = k !== 'all' && !it.dataset.cat.split(' ').includes(k); });
      balance();
    }));
    const dlg = document.getElementById('lightbox');
    const img = dlg.querySelector('img');
    const cap = dlg.querySelector('.lb-cap');
    let cur = 0;
    const visible = () => btns.filter((i) => !i.hidden);
    const show = (btn) => { const list = visible(); cur = list.indexOf(btn); img.src = btn.dataset.full; img.alt = btn.querySelector('img').alt; cap.textContent = btn.querySelector('img').alt; };
    btns.forEach((b) => b.addEventListener('click', () => { show(b); dlg.showModal(); }));
    const step = (d) => { const list = visible(); show(list[(cur + d + list.length) % list.length]); };
    dlg.querySelector('[data-lb-prev]').addEventListener('click', () => step(-1));
    dlg.querySelector('[data-lb-next]').addEventListener('click', () => step(1));
    dlg.querySelector('[data-lb-close]').addEventListener('click', () => dlg.close());
    dlg.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  }

  // ---- Quote form: validate, save the request in Base44 (Inquiry), and fall back to email or text if that fails ----
  const B44_APP = '6acb0b2e48d69d259ca33e1b';
  const onLiveHost = () => /\.base44\.app$/.test(location.hostname);
  const form = document.querySelector('[data-quote-form]');
  if (form) {
    const sent = document.querySelector('[data-sent]');
    const fieldOf = (el) => el.closest('.field');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let ok = true;
      form.querySelectorAll('.field').forEach((f) => f.classList.remove('bad'));
      ['name', 'event'].forEach((n) => { const el = form.elements[n]; if (!el.value.trim()) { fieldOf(el).classList.add('bad'); ok = false; } });
      const phone = form.elements.phone, email = form.elements.email;
      if (!phone.value.trim() && !email.value.trim()) { fieldOf(phone).classList.add('bad'); ok = false; }
      if (email.value.trim() && !email.checkValidity()) { fieldOf(email).classList.add('bad'); ok = false; }
      if (!ok) { form.querySelector('.bad input, .bad select')?.focus(); return; }
      const fd = new FormData(form);
      const d = Object.fromEntries(fd);
      d.want = fd.getAll('want').join(', ');
      const es = form.dataset.lang === 'es';
      const lines = es
        ? ['Hola, quiero una cotización en Marsella Event Venue.', `Nombre: ${d.name}`, `Teléfono: ${d.phone || '-'}`, `Correo: ${d.email || '-'}`, `Evento: ${d.event}`, `Fecha: ${d.date || 'por definir'}`, `Invitados: ${d.guests || 'por definir'}`, `Servicios y extras: ${d.services || 'por definir'}`, `También quiero: ${d.want || '-'}`, `Idioma: ${d.lang}`, d.msg ? `Mensaje: ${d.msg}` : '']
        : ["Hi, I'd like a quote from Marsella Event Venue.", `Name: ${d.name}`, `Phone: ${d.phone || '-'}`, `Email: ${d.email || '-'}`, `Event: ${d.event}`, `Date: ${d.date || 'not set'}`, `Guests: ${d.guests || 'not set'}`, `Services and extras: ${d.services || 'not set'}`, `I also want: ${d.want || '-'}`, `Language: ${d.lang}`, d.msg ? `Message: ${d.msg}` : ''];
      const body = encodeURIComponent(lines.filter(Boolean).join('\n'));
      const subj = encodeURIComponent(es ? `Cotización · ${d.event}` : `Quote request · ${d.event}`);
      sent.querySelector('[data-mail]').href = `mailto:marsellaeventvenue@gmail.com?subject=${subj}&body=${body}`;
      sent.querySelector('[data-sms]').href = `sms:+13855289529?&body=${body}`;
      const btn = form.querySelector('[data-send]');
      const label = btn.textContent;
      btn.disabled = true; btn.textContent = btn.dataset.sending;
      let saved = false;
      if (onLiveHost()) {
        try {
          const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000);
          const res = await fetch(`https://base44.app/api/apps/${B44_APP}/entities/Inquiry`, {
            method: 'POST', signal: ctl.signal,
            headers: { 'Content-Type': 'application/json', 'X-App-Id': B44_APP },
            body: JSON.stringify({
              name: d.name.trim(), phone: (d.phone || '').trim(), email: (d.email || '').trim(), event_type: d.event,
              event_date: d.date || '', guests: d.guests || '', services: [...(d.services ? d.services.split(', ') : []), ...fd.getAll('want')], preferred_language: d.lang || '',
              message: (d.msg || '').trim(), site_language: form.dataset.lang, source_page: location.pathname,
            }),
          });
          clearTimeout(t); saved = res.ok;
        } catch { saved = false; }
      }
      btn.disabled = false; btn.textContent = label;
      sent.querySelector('[data-ok]').hidden = !saved;
      sent.querySelector('[data-fallback]').hidden = saved;
      form.hidden = true; sent.hidden = false; sent.focus();
    });
    form.querySelectorAll('input, select').forEach((el) => el.addEventListener('input', () => fieldOf(el)?.classList.remove('bad')));
  }
})();
