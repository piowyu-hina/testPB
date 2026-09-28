import { english, patterns } from './catalog.ts';
export type Locale = 'zh-Hant' | 'en';
export const preferenceKey = 'testpb.language';
export function chooseLocale(saved: string | null, languages: readonly string[]): Locale {
  if (saved === 'en' || saved === 'zh-Hant') return saved;
  return /^zh(?:-|$)/i.test(languages[0] ?? '') ? 'zh-Hant' : 'en';
}
const names = ['露雪', '青禾', '戀喵', '槍刺', '突進', '橫掃', '側步', '槍柄推擊', '收刃', '破曉一槍', '飛刀', '追影', '小刀', '絕影', '前進', '短步', '斜步', '躍步', '追擊', '重擊', '迴旋', '長鋒'];
function resolve(source: string, depth = 0): string {
  if (depth > 12 || !/\p{Script=Han}/u.test(source)) return source;
  const trimmed = source.trim();
  if (trimmed !== source) return source.replace(trimmed, resolve(trimmed, depth + 1));
  if (Object.hasOwn(english, source)) return english[source];
  for (const phrase of Object.keys(english)) {
    if (phrase.length > 10 && source.startsWith(phrase) && /^\s/.test(source.slice(phrase.length))) return english[phrase] + resolve(source.slice(phrase.length), depth + 1);
  }
  for (const [pattern, template] of patterns) {
    const match = source.match(pattern);
    if (match) return template.replace(/\$(\d+)/g, (_, index: string) => resolve(match[Number(index)], depth + 1));
  }
  if (source.startsWith('精英・')) return `Elite ${resolve(source.slice(3), depth + 1)}`;
  for (const separator of [' · ', '\n', '：', '，', '。', ' ']) {
    if (!source.includes(separator)) continue;
    const parts = source.split(separator), translated = parts.map(part => resolve(part, depth + 1));
    if (translated.some((part, index) => part !== parts[index])) return translated.join(separator === '，' ? ', ' : separator === '。' ? '. ' : separator === '：' ? ': ' : separator);
  }
  for (const prefix of names) {
    if (source.startsWith(prefix) && source !== prefix) {
      const suffix = source.slice(prefix.length);
      if (names.includes(suffix)) return `${english[prefix]} ${english[suffix]}`;
    }
  }
  if (source.endsWith('（已用）')) return `${resolve(source.slice(0, -4), depth + 1)} (used)`;
  if (source.startsWith('‹ ')) return `‹ ${resolve(source.slice(2), depth + 1)}`;
  return source;
}
export function translate(source: string, locale: Locale): string {
  return locale === 'zh-Hant' ? source : resolve(source);
}
