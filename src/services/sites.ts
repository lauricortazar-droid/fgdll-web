export function sitesOrigin(){ return (window.FGDLL_CONFIG && window.FGDLL_CONFIG.sitesOrigin) || 'https://fgdll.org'; }
export function openSites(path){ const base=sitesOrigin().replace(/\/$/,''); window.location.href=base + (path.startsWith('/')?path:'/'+path); }
