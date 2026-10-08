// Marsella Event Venue — the party menu board (pick services → quote), menu, gallery, quote form.
(() => {
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };
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

  // ---- Quote form: validate, then hand the message to email or text (no backend in the proposal) ----
  const form = document.querySelector('[data-quote-form]');
  if (form) {
    const sent = document.querySelector('[data-sent]');
    const fieldOf = (el) => el.closest('.field');
    form.addEventListener('submit', (e) => {
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
      form.hidden = true; sent.hidden = false; sent.focus();
    });
    form.querySelectorAll('input, select').forEach((el) => el.addEventListener('input', () => fieldOf(el)?.classList.remove('bad')));
  }
})();
