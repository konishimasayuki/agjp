'use client';
import { getLang, setLang } from '../lib/i18n';

// 日本語 / 中文 の切り替え（選んだ言語はこの端末に保存されます）
export default function LangSwitch({ className = '' }) {
  const cur = getLang();
  const Item = ({ code, label, name }) => (
    <button type="button" lang={code === 'zh' ? 'zh-CN' : 'ja'} className={cur === code ? 'on' : ''}
      aria-pressed={cur === code} aria-label={name} onClick={() => { if (cur !== code) setLang(code); }}>
      {label}
    </button>
  );
  return (
    <div className={'lang-sw ' + className} role="group" aria-label="Language / 语言 / 言語">
      <Item code="ja" label="日本語" name="日本語" />
      <Item code="zh" label="中文" name="中文" />
    </div>
  );
}
