export default function TabIcon({ name }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    {name === 'today' && <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />}
    {name === 'calendar' && <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>}
    {name === 'tasks' && <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>}
    {name === 'play' && <><rect x="3" y="7" width="18" height="11" rx="5" /><path d="M8 11v3M6.5 12.5h3M15 12h.01M17 14h.01" /></>}
    {name === 'settings' && <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>}
  </svg>
}
