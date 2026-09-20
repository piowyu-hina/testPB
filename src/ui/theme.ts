import { onClick } from './dom';

const key = 'testpb.theme';
const sun =
  '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>';
const moon = '<path d="M20 14a8.5 8.5 0 0 1-10-10A8.5 8.5 0 1 0 20 14Z"/>';

export function mountTheme() {
  let theme = 'dark';
  try {
    if (localStorage.getItem(key) === 'light') theme = 'light';
  } catch {
    /* Storage may be disabled. */
  }
  const buttons = document.querySelectorAll<HTMLButtonElement>('.theme-toggle');
  function render() {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#171c1b' : '#eee7d9');
    buttons.forEach((button) => {
      const label = theme === 'dark' ? '切換為淺色背景' : '切換為深色背景';
      button.setAttribute('aria-label', label);
      button.title = label;
      button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${theme === 'dark' ? sun : moon}</svg>`;
    });
  }
  buttons.forEach((button) =>
    onClick(button, () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(key, theme);
      } catch {
        /* Keep the current session usable. */
      }
      render();
    })
  );
  render();
}
