// Товчноос нээгдэх хөвөх самбар: гадна дарах, Escape-ээр хаагдана; хаагдахад фокус товч руу буцна.
export function dropdown(button, panel) {
  const onDocClick = (event) => { if (!panel.contains(event.target) && !button.contains(event.target)) close(); };
  const onKey = (event) => { if (event.key === 'Escape') { close(); button.focus(); } };
  function open() {
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
  }
  function close() {
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('keydown', onKey);
  }
  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', () => (panel.hidden ? open() : close()));
  return { open, close, destroy: close };
}
