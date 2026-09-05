// categories.js
export const CATEGORIES = [
  {
    id: 'pop',
    name: '流行',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>`
  },
  {
    id: 'rock',
    name: '摇滚',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14.5 3L3 14.5l2.5 2.5L17 5.5 14.5 3z" />
      <path d="M17 5.5l2.5 2.5" />
      <path d="M12 8l-4 4" />
      <circle cx="19.5" cy="6.5" r="1.5" />
      <rect x="2" y="17" width="3" height="4" rx="1" />
      <path d="M5 19h14" />
    </svg>`
  },
  {
    id: 'jazz',
    name: '爵士',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 21c3.5-2 6-6.5 8-12" />
      <path d="M13 9c1.5-2 3-3.5 5-4" />
      <path d="M17 5c1 1.5 2 4 1 7" />
      <path d="M18 12c-1 2-2.5 3.5-4.5 4.5" />
      <path d="M13.5 16.5c-2 1-4 1.5-5.5 1" />
      <path d="M8 17.5c-1 .5-2 1-2.5 1.5" />
      <circle cx="14" cy="10" r="1" />
    </svg>`
  },
  {
    id: 'classical',
    name: '古典',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3v18" />
      <path d="M8 7l4 4 4-4" />
      <path d="M8 17l4-4 4 4" />
      <path d="M5 10c2 1 4 1.5 7 1.5s5-.5 7-1.5" />
      <path d="M5 14c2 1 4 1.5 7 1.5s5-.5 7-1.5" />
      <path d="M3 6l2-2h14l2 2" />
      <path d="M3 18l2 2h14l2-2" />
    </svg>`
  },
  {
    id: 'electronic',
    name: '电子',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="1" />
      <line x1="6" y1="6" x2="6" y2="18" />
      <line x1="10" y1="6" x2="10" y2="18" />
      <line x1="14" y1="6" x2="14" y2="18" />
      <line x1="18" y1="6" x2="18" y2="18" />
      <circle cx="8" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="16" cy="12" r="1" fill="currentColor" />
      <path d="M20 10v4" />
      <path d="M4 10v4" />
    </svg>`
  },
  {
    id: 'hiphop',
    name: '说唱',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v2" />
      <path d="M12 18v2" />
      <path d="M4 12h2" />
      <path d="M18 12h2" />
      <path d="M6.5 6.5l1.5 1.5" />
      <path d="M16 16l1.5 1.5" />
      <path d="M6.5 17.5l1.5-1.5" />
      <path d="M16 8l1.5-1.5" />
      <path d="M12 12l2-2" />
    </svg>`
  },
  {
    id: 'rnb',
    name: '蓝调',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 21c3.5 0 6-2.5 6-6V9" />
      <path d="M12 21c-3.5 0-6-2.5-6-6V9" />
      <rect x="6" y="3" width="12" height="6" rx="3" />
      <path d="M9 9v6c0 1.5 1.5 3 3 3s3-1.5 3-3V9" />
      <line x1="9" y1="6" x2="15" y2="6" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <path d="M8 21c2-1 4-1 4-1s2 0 4 1" />
    </svg>`
  },
  {
    id: 'ambient',
    name: '氛围',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 12c2-3 5-5 9-5s7 2 9 5" />
      <path d="M5 16c2-2 4.5-3 7-3s5 1 7 3" />
      <path d="M7 20c2-1.5 4.5-2 7-2s5 .5 7 2" />
      <circle cx="12" cy="6" r="1" fill="currentColor" />
      <circle cx="6" cy="14" r="0.8" fill="currentColor" opacity="0.6" />
      <circle cx="18" cy="14" r="0.8" fill="currentColor" opacity="0.6" />
      <circle cx="4" cy="18" r="0.6" fill="currentColor" opacity="0.4" />
      <circle cx="20" cy="18" r="0.6" fill="currentColor" opacity="0.4" />
    </svg>`
  }
]
