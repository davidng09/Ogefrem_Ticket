import { Building2, Factory, LayoutDashboard, Package, Settings, Ticket } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/inventaire', label: 'Inventaire', icon: Package },
  { to: '/directions', label: 'Directions', icon: Building2 },
  { to: '/fournisseurs', label: 'Fournisseurs', icon: Factory },
  { to: '/parametres', label: 'Paramètres', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col bg-primary text-on-primary">
      <div className="border-b border-white/10 px-4 py-5">
        <img src="/ogefrem_LOGO.png" alt="OGEFREM" className="mb-2 h-10 w-auto brightness-0 invert" />
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Parc informatique</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded px-3 py-2 text-sm transition ${
                isActive ? 'bg-white/15 font-semibold' : 'opacity-85 hover:bg-white/10'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-2 border-t border-white/10 p-3 text-xs opacity-80">
        <a
          href="http://localhost:5173/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded px-3 py-2 hover:bg-white/10"
        >
          <Ticket size={14} /> App Tickets
        </a>
        <p className="px-3">v1.0.0</p>
      </div>
    </aside>
  )
}
