'use client';

import { useEffect } from 'react';

// Browser autofill / saved-entry suggestions are switched off on every input in
// the app (they cover pickers and fill wrong values). The login page keeps them
// so saved passwords still work. New inputs (modals, lists) are caught as they appear.

const FIELDS = 'input:not([type=password]):not([type=hidden]), textarea, select';

function mark(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(FIELDS).forEach((el) => {
    if (el.getAttribute('autocomplete') !== 'off') el.setAttribute('autocomplete', 'off');
  });
  root.querySelectorAll('form').forEach((f) => f.setAttribute('autocomplete', 'off'));
}

export function NoAutofill() {
  useEffect(() => {
    if (window.location.pathname.startsWith('/login')) return;
    mark(document);
    const observer = new MutationObserver((changes) => {
      for (const change of changes) {
        change.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches(FIELDS) && node.getAttribute('autocomplete') !== 'off') node.setAttribute('autocomplete', 'off');
          mark(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
