// 画面の言語切り替え（日本語 / 中文）
// 使い方：文言を t('日本語') で包む。テンプレート文字列は t`...${x}...` と書く。
// 辞書（lib/zh.js）に無い文言は日本語のまま表示されます。
import { ZH } from './zh';

let LANG = 'ja';
try { if (typeof window !== 'undefined') LANG = window.localStorage.getItem('ag-lang') === 'zh' ? 'zh' : 'ja'; } catch {}

try { if (typeof document !== 'undefined') document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : 'ja'; } catch {}

export const getLang = () => LANG;
export const isZh = () => LANG === 'zh';

// 切り替えたあと、全画面を新しい言語で組み直すため再読み込みします（データは保存済み）
export function setLang(l) {
  try { window.localStorage.setItem('ag-lang', l); } catch {}
  window.location.reload();
}

const fill = (s, vals) => s.replace(/\{(\d+)\}/g, (_, i) => (vals[i] == null ? '' : vals[i]));

export function t(s, ...vals) {
  if (Array.isArray(s) && s.raw) {
    const key = s.reduce((a, p, i) => a + p + (i < vals.length ? `{${i}}` : ''), '');
    return fill(LANG === 'zh' && ZH[key] != null ? ZH[key] : key, vals);
  }
  return LANG === 'zh' && ZH[s] != null ? ZH[s] : s;
}
