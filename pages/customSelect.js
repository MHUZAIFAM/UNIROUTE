// ═══════════════════════════════════════════════
// UNIROUTE — customSelect.js
// Replaces the native <select> popup (which can't be
// themed consistently across browsers) with a styled
// dropdown, while keeping the underlying <select> as
// the source of truth so existing page code (.value,
// 'change' listeners) keeps working unchanged.
// ═══════════════════════════════════════════════

(function () {
  const nativeValueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');

  function enhance(selectEl) {
    if (selectEl.dataset.csEnhanced) return;
    selectEl.dataset.csEnhanced = 'true';

    const wrap = document.createElement('span');
    wrap.className = 'cs-select';
    selectEl.parentNode.insertBefore(wrap, selectEl);
    wrap.appendChild(selectEl);
    selectEl.classList.add('cs-native');
    selectEl.tabIndex = -1;
    selectEl.setAttribute('aria-hidden', 'true');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'cs-trigger';
    trigger.innerHTML = `<span class="cs-trigger-label"></span><span class="cs-chevron">${ICONS.chevron}</span>`;
    wrap.appendChild(trigger);
    const labelEl = trigger.querySelector('.cs-trigger-label');

    const list = document.createElement('div');
    list.className = 'cs-list';
    list.setAttribute('role', 'listbox');
    wrap.appendChild(list);

    function renderList() {
      list.innerHTML = '';
      Array.from(selectEl.options).forEach(opt => {
        const item = document.createElement('div');
        item.className = 'cs-option' + (opt.value === selectEl.value ? ' selected' : '');
        item.setAttribute('role', 'option');
        item.textContent = opt.textContent;
        item.addEventListener('click', () => {
          if (selectEl.value !== opt.value) {
            selectEl.value = opt.value;
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          }
          close();
          trigger.focus();
        });
        list.appendChild(item);
      });
    }

    function syncLabel() {
      const opt = selectEl.options[selectEl.selectedIndex];
      labelEl.textContent = opt ? opt.textContent : '';
    }

    function open() {
      renderList();
      wrap.classList.add('cs-open');
      document.addEventListener('click', onDocClick, true);
      document.addEventListener('keydown', onKeydown);
    }
    function close() {
      wrap.classList.remove('cs-open');
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onKeydown);
    }
    function onDocClick(e) {
      if (!wrap.contains(e.target)) close();
    }
    function onKeydown(e) {
      if (e.key === 'Escape') { close(); trigger.focus(); }
    }

    trigger.addEventListener('click', () => {
      wrap.classList.contains('cs-open') ? close() : open();
    });

    // Programmatic `select.value = x` from page code should still update the UI
    Object.defineProperty(selectEl, 'value', {
      configurable: true,
      get() { return nativeValueDesc.get.call(selectEl); },
      set(v) {
        nativeValueDesc.set.call(selectEl, v);
        syncLabel();
        if (wrap.classList.contains('cs-open')) renderList();
      },
    });

    // Programmatic `select.innerHTML = '<option>...'` (rebuilding options) should too
    new MutationObserver(() => {
      syncLabel();
      if (wrap.classList.contains('cs-open')) renderList();
    }).observe(selectEl, { childList: true });

    syncLabel();
  }

  function scan(root) {
    root.querySelectorAll('select.filter-select').forEach(enhance);
  }

  scan(document);
  new MutationObserver(mutations => {
    for (const m of mutations) {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.matches && node.matches('select.filter-select')) enhance(node);
        if (node.querySelectorAll) scan(node);
      });
    }
  }).observe(document.body, { childList: true, subtree: true });
})();
