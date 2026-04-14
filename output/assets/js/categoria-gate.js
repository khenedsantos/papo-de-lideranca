document.addEventListener('DOMContentLoaded', function () {
  var gate = document.querySelector('[data-gate-page]');
  if (!gate) return;

  var pageKey = gate.getAttribute('data-gate-page') || 'categoria';
  var storageKey = 'lead_capturado_' + pageKey;
  var submitted = false;

  function unlock() {
    gate.classList.remove('gate-locked');
    gate.classList.add('gate-unlocked');
    try {
      localStorage.setItem(storageKey, 'true');
    } catch (e) {}
  }

  function bindSubmit() {
    var form = gate.querySelector('form');
    if (!form || form.dataset.gateBound === 'true') return;

    form.dataset.gateBound = 'true';
    form.addEventListener('submit', function () {
      submitted = true;
    });
  }

  function detectSuccess() {
    if (!submitted) return;

    var success = gate.querySelector('.ml-form-successBody');
    if (!success) return;

    var visible =
      window.getComputedStyle(success).display !== 'none' &&
      success.offsetHeight > 0;

    if (visible) unlock();
  }

  try {
    if (localStorage.getItem(storageKey) === 'true') {
      unlock();
      return;
    }
  } catch (e) {}

  bindSubmit();

  var observer = new MutationObserver(function () {
    bindSubmit();
    detectSuccess();
  });

  observer.observe(gate, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });

  setTimeout(bindSubmit, 800);
  setTimeout(bindSubmit, 1600);
});
