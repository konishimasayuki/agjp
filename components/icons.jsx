const P = {
  home: <><path d="M4 11.5 12 5l8 6.5" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></>,
  send: <><path d="M4 12 20 5l-5 15-3-6.5L4 12Z" /><path d="m12 13.5 3.5-3.5" /></>,
  box: <><path d="M4 8 12 4l8 4v8l-8 4-8-4V8Z" /><path d="m4 8 8 4 8-4" /><path d="M12 12v8" /></>,
  inbox: <><path d="M4 13 6.5 6h11L20 13v5H4v-5Z" /><path d="M4 13h4.5l1 2h5l1-2H20" /></>,
  doc: <><path d="M7 3.5h7l4 4V20.5H7V3.5Z" /><path d="M14 3.5v4h4" /><path d="M10 12h5M10 15.5h5" /></>,
  tag: <><path d="M4 4h7l9 9-7 7-9-9V4Z" /><circle cx="8.5" cy="8.5" r="1.4" /></>,
  yen: <><path d="m7 4 5 7 5-7" /><path d="M12 11v9M8 13h8M8 16.5h8" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  print: <><path d="M7 8V3.5h10V8" /><rect x="4" y="8" width="16" height="8" rx="1.5" /><path d="M7 13h10v7.5H7z" /></>,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="1.5" /><path d="m4 7 8 6 8-6" /></>,
  back: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  truck: <><path d="M3.5 6.5h10v9h-10z" /><path d="M13.5 9.5h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  download: <><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><path d="M5 19.5h14" /></>,
  copy: <><rect x="8" y="8" width="11" height="11" rx="1.5" /><path d="M5 15V5h10" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
  alert: <><path d="M12 4 21 19.5H3L12 4Z" /><path d="M12 10v4.5M12 17v.5" /></>,
  chev: <path d="m9.5 6 6 6-6 6" />,
};
export function Icon({ name, size = 20, className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name]}
    </svg>
  );
}
