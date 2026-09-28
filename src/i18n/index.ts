import { chooseLocale, preferenceKey, translate, type Locale } from './translate';
export { chooseLocale, preferenceKey, translate, type Locale } from './translate';
let locale: Locale = 'zh-Hant';
let activeRoot: HTMLElement | undefined;
type Binding = { source: string; rendered: string };
const textBindings = new WeakMap<Text, Binding>();
const attributeBindings = new WeakMap<Element, Map<string, Binding>>();
const attributes = ['aria-label', 'title', 'alt', 'placeholder'];
const missing = new Set<string>();
export const getLocale = () => locale;
export const missingTranslations = () => [...missing];
export const clearMissingTranslations = () => missing.clear();
function render(value: string): string {
  const result = translate(value, locale);
  if (locale === 'en' && /\p{Script=Han}/u.test(result) && result !== '繁體中文') missing.add(value);
  return result;
}
function excluded(node: Node): boolean {
  const element = node instanceof Element ? node : node.parentElement;
  return !!element?.closest('script, style, noscript, [data-i18n-skip]');
}
function localizeText(node: Text) {
  if (excluded(node)) return;
  let binding = textBindings.get(node);
  if (!binding || node.data !== binding.rendered) {
    binding = { source: node.data, rendered: node.data }; textBindings.set(node, binding);
  }
  binding.rendered = render(binding.source);
  if (node.data !== binding.rendered) node.data = binding.rendered;
}
function localizeAttributes(element: Element) {
  if (excluded(element)) return;
  let bindings = attributeBindings.get(element);
  if (!bindings) { bindings = new Map(); attributeBindings.set(element, bindings); }
  for (const name of attributes) {
    const value = element.getAttribute(name);
    if (value === null) { bindings.delete(name); continue; }
    let binding = bindings.get(name);
    if (!binding || value !== binding.rendered) { binding = { source: value, rendered: value }; bindings.set(name, binding); }
    binding.rendered = render(binding.source);
    if (value !== binding.rendered) element.setAttribute(name, binding.rendered);
  }
}
function visit(node: Node) {
  if (excluded(node)) return;
  if (node instanceof Text) { localizeText(node); return; }
  if (node instanceof Element) localizeAttributes(node);
  for (const child of node.childNodes) visit(child);
}
/** Clone original-language content, not the displayed translation. */
export function cloneLocalized(node: Node): Node {
  const copy = node.cloneNode(false);
  if (node instanceof Text) {
    const binding = textBindings.get(node);
    (copy as Text).data = binding && node.data === binding.rendered ? binding.source : node.data;
  }
  if (node instanceof Element && copy instanceof Element) for (const [name, binding] of attributeBindings.get(node) ?? []) {
    if (node.getAttribute(name) === binding.rendered) copy.setAttribute(name, binding.source);
  }
  for (const child of node.childNodes) copy.appendChild(cloneLocalized(child));
  return copy;
}
export function setLocale(next: Locale) {
  locale = next;
  try { localStorage.setItem(preferenceKey, next); } catch { /* Storage may be unavailable. */ }
  document.documentElement.lang = next;
  if (activeRoot) visit(activeRoot);
  updateControls();
}
function updateControls() {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-language]')) button.setAttribute('aria-pressed', String(button.dataset.language === locale));
}
/** Localizes presentation without remounting Screens or touching gameplay state. */
export function mountLocalization(root: HTMLElement = document.body) {
  let saved: string | null = null;
  try { saved = localStorage.getItem(preferenceKey); } catch { /* Follow system language. */ }
  locale = chooseLocale(saved, navigator.languages.length ? navigator.languages : [navigator.language]);
  activeRoot = root; document.documentElement.lang = locale;
  visit(root); updateControls();
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'childList') { for (const node of record.addedNodes) visit(node); }
      else if (record.type === 'characterData') localizeText(record.target as Text);
      else if (record.target instanceof Element) localizeAttributes(record.target);
    }
    if (records.some(record => record.type === 'childList')) updateControls();
  });
  observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes });
  const onLanguageClick = (event: MouseEvent) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-language]');
    const language = button?.dataset.language;
    if (event.detail > 0 && (language === 'en' || language === 'zh-Hant')) setLocale(language);
  };
  root.addEventListener('click', onLanguageClick);
  return () => { observer.disconnect(); root.removeEventListener('click', onLanguageClick); activeRoot = undefined; };
}
