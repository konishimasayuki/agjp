'use client';
import { useEffect, useRef } from 'react';
import { Icon } from './icons';

export function Btn({ kind = 'primary', size, icon, children, className = '', ...p }) {
  return (
    <button type="button" className={`btn btn-${kind}${size ? ' btn-' + size : ''} ${className}`} {...p}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}{children}
    </button>
  );
}

export function Field({ label, hint, children, wide, className = '' }) {
  return (
    <label className={'field' + (wide ? ' wide' : '') + ' ' + className}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Modal({ title, onClose, children, footer, size }) {
  const ref = useRef(onClose); ref.current = onClose;
  const box = useRef(null);
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') ref.current(); };
    window.addEventListener('keydown', h);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const first = box.current && box.current.querySelector('input,select,textarea');
    if (first && window.matchMedia('(min-width: 900px)').matches) first.focus();
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="modal-back" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'modal ' + (size || '')} role="dialog" aria-modal="true" aria-label={title} ref={box}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="閉じる">×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export const Chip = ({ tone = 'plain', children }) => <span className={'chip chip-' + tone}>{children}</span>;

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children && <p className="empty-text">{children}</p>}
      {action}
    </div>
  );
}

export function PageHead({ title, desc, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {desc && <p className="page-desc">{desc}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Tabs({ value, onChange, items }) {
  return (
    <div className="tabs" role="tablist">
      {items.map(it => (
        <button key={it.value} type="button" role="tab" aria-selected={value === it.value}
          className={'tab' + (value === it.value ? ' on' : '')} onClick={() => onChange(it.value)}>
          {it.label}{it.count != null && <span className="tab-count">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, min = 0, label }) {
  const v = Number(value) || 0;
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, v - 1))} aria-label={label + 'を1減らす'} disabled={v <= min}>−</button>
      <input type="number" inputMode="numeric" min={min} value={v || ''} placeholder="0" aria-label={label}
        onChange={e => onChange(Math.max(min, parseInt(e.target.value || '0', 10) || 0))} />
      <button type="button" onClick={() => onChange(v + 1)} aria-label={label + 'を1増やす'}>＋</button>
    </div>
  );
}

export function BottleArt({ color = '#1B3F8B' }) {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true">
      <rect width="40" height="40" fill="#EEF3FB" />
      <path d="M17.2 5h5.6v6.4c0 1.4 4.2 3 4.2 7.2v15.2a1.8 1.8 0 0 1-1.8 1.8H14.8a1.8 1.8 0 0 1-1.8-1.8V18.6c0-4.2 4.2-5.8 4.2-7.2V5Z" fill={color} />
      <rect x="13" y="21.5" width="14" height="8" fill="#fff" opacity=".88" />
      <rect x="16.5" y="3.6" width="7" height="2.4" rx=".8" fill={color} opacity=".75" />
    </svg>
  );
}

export function ProductThumb({ product, size = 44 }) {
  return (
    <span className="thumb" style={{ width: size, height: size }}>
      {product && product.image ? <img src={product.image} alt="" /> : <BottleArt color={product ? product.color : undefined} />}
    </span>
  );
}

export const Stat = ({ label, value, sub, tone }) => (
  <div className={'stat' + (tone ? ' stat-' + tone : '')}>
    <span className="stat-label">{label}</span>
    <span className="stat-value num">{value}</span>
    {sub && <span className="stat-sub">{sub}</span>}
  </div>
);
