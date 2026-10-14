export type AppIconName = 'dashboard' | 'catalog' | 'quotes' | 'business' | 'team' | 'search' | 'menu' | 'logout' | 'chevron' | 'close' | 'user'
const paths: Record<AppIconName, string[]> = {
  dashboard: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z'],
  catalog: ['M4 4h16v16H4z', 'M8 4v16', 'M12 8h4', 'M12 12h4', 'M12 16h4'],
  quotes: ['M6 3h9l4 4v14H6z', 'M14 3v5h5', 'M9 12h7', 'M9 16h5'],
  business: ['M3 21h18', 'M5 21V7l7-4 7 4v14', 'M9 10h1', 'M14 10h1', 'M9 14h1', 'M14 14h1', 'M10 21v-4h4v4'],
  team: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M20 21v-2a4 4 0 0 0-3-3.9', 'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8', 'M16 3a4 4 0 0 1 0 8'],
  search: ['M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15', 'm16 16 5 5'],
  menu: ['M4 6h16', 'M4 12h12', 'M4 18h16'],
  logout: ['M9 3H4v18h5', 'M9 12h12', 'm17 8 4 4-4 4'],
  chevron: ['m6 9 6 6 6-6'],
  close: ['m6 6 12 12', 'M18 6 6 18'],
  user: ['M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8', 'M4 21v-2a8 8 0 0 1 16 0v2'],
}
export default function AppIcon({ name }: { name: AppIconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name].map((d, index) => <path d={d} key={index}/>)}</svg>
}
