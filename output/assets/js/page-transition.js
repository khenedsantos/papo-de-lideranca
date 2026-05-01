/*
  Shared page transition script.
  Usage:
  - include this file before </body>
  - keep normal links in HTML
  - internal links will fade out before navigation

  Notes:
  - same-page anchors, mailto:, tel:, downloads and modified clicks are ignored
  - modern browsers can also use the CSS View Transition navigation enhancement
*/
(function () {
  function isInternalNavigableLink(link, event) {
    if (!link) return false;
    if (link.target && link.target !== '_self') return false;
    if (link.hasAttribute('download')) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;

    var href = link.getAttribute('href');
    if (!href) return false;
    if (href.charAt(0) === '#') return false;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;

    var url;
    try {
      url = new URL(href, window.location.href);
    } catch (error) {
      return false;
    }

    if (url.origin !== window.location.origin) return false;
    if (url.pathname === window.location.pathname && url.hash) return false;

    return true;
  }

  window.addEventListener('pageshow', function () {
    document.documentElement.classList.remove('page-transition-leaving');
  });

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href]');
    if (!isInternalNavigableLink(link, event)) return;

    var href = link.href;
    event.preventDefault();
    document.documentElement.classList.add('page-transition-leaving');

    window.setTimeout(function () {
      window.location.href = href;
    }, 220);
  });
})();
