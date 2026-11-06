export default function TabIcon({ name }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    {name === 'today' && <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />}
    {name === 'calendar' && <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>}
    {name === 'play' && <><rect x="2" y="5" width="20" height="15" rx="6" /><path d="M7.5 10.5v4M5.5 12.5h4M15 11h.01M17.5 14h.01" /></>}
    {name === 'family' && <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.5a5 5 0 0 1 6 5" /></>}
  </svg>
}
