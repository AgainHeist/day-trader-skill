import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Search, Scan, Newspaper, Crosshair, LogOut as ExitIcon, History, Wallet, Shield, Bell, BarChart3, Users, Briefcase, Settings, Menu, X, LogIn, User } from 'lucide-react'
import { useStore } from '../lib/store'
import { ws } from '../lib/ws'
import { api } from '../lib/api'

const nav = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/scanner', label: 'Scanner', icon: Scan },
  { path: '/markets', label: 'Live Market', icon: BarChart3 },
  { path: '/watchlist', label: 'Watchlist', icon: Search },
  { path: '/news', label: 'News', icon: Newspaper },
  { path: '/entry', label: 'Entry Signals', icon: Crosshair },
  { path: '/exit', label: 'Exit Plan', icon: ExitIcon },
  { path: '/timemachine', label: 'Time Machine', icon: History },
  { path: '/risk', label: 'Risk Management', icon: Shield },
  { path: '/budget', label: 'Budget & Sizing', icon: Wallet },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/analyst', label: 'Analyst', icon: BarChart3 },
  { path: '/pelosi', label: 'Pelosi Tracker', icon: Users },
  { path: '/paper', label: 'Paper Trading', icon: Briefcase },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { symbol, setSymbol, paperMode, connectionStatus, setConnectionStatus, isAuthenticated, setUser } = useStore()
  const [search, setSearch] = useState(symbol)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [marketStatus, setMarketStatus] = useState<any>(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    ws.connect()
    const off1 = ws.on('system.status', (d) => {
      if (d.status) setConnectionStatus(d.status)
    })
    const off2 = ws.on('*', (d) => {
      // Could show toasts for alerts etc
    })
    return () => { off1(); off2(); }
  }, [])

  useEffect(() => {
    api.marketStatus().then(setMarketStatus).catch(()=>{})
    const t = setInterval(() => api.marketStatus().then(setMarketStatus).catch(()=>{}), 60000)
    return () => clearInterval(t)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const sym = search.trim().toUpperCase()
    if (sym) { setSymbol(sym); navigate(`/markets?symbol=${sym}`) }
  }

  return (
    <div className="min-h-screen flex bg-[#0a0e1a]">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex flex-col w-[260px] shrink-0 bg-[#0f1629] border-r border-[#1e2d4a] sticky top-0 h-screen overflow-y-auto">
        <div className="p-5 border-b border-[#1e2d4a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-white text-xs">AB</div>
            <div>
              <div className="font-bold text-white leading-none tracking-wide">ALi BOSS</div>
              <div className="text-[10px] tracking-[0.2em] text-cyan-400">PREMIUM TERMINAL</div>
            </div>
          </div>
          <div className="mt-3 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-400 text-center tracking-widest">PAPER MODE</div>
          <div className="mt-2 text-center text-[10px] tracking-widest font-bold text-slate-500">Power By ALi</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(item => {
            const active = location.pathname === item.path
            return (
              <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${active ? 'bg-[#1e2d4a] text-white' : 'text-slate-400 hover:bg-[#162040] hover:text-white'}`}>
                <item.icon size={16} className={active ? 'text-cyan-400' : ''} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-[#1e2d4a] text-xs text-slate-500 space-y-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connectionStatus==='Connected' ? 'bg-emerald-500' : connectionStatus==='Reconnecting' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`}></span>
            {connectionStatus}
          </div>
          <a href="https://t.me/alionera" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-semibold">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.16 19.5c-.07-.55-.13-1.4-.05-2l1.02-4.02L12 18l4.5-2.7-1.5 4.02c.08.6.02 1.45-.05 2A10 10 0 0 0 12 2z"/></svg>
            Support: @alionera
          </a>
          <div className="text-[11px]">© ALi BOSS • Power By ALi</div>
          <div className="text-[10px] opacity-60">Day Trader Skill v2 • MIT</div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0f1629] border-t border-[#1e2d4a] flex overflow-x-auto z-50">
        {nav.slice(0,7).map(item => (
          <Link key={item.path} to={item.path} className={`flex flex-col items-center gap-1 p-3 min-w-[64px] text-[10px] ${location.pathname===item.path ? 'text-cyan-400' : 'text-slate-400'}`}>
            <item.icon size={18} />
            {item.label.split(' ')[0]}
          </Link>
        ))}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-[#0a0e1a]/80 backdrop-blur border-b border-[#1e2d4a] px-4 lg:px-6 py-3 flex items-center gap-4">
          <button className="lg:hidden p-2 rounded bg-[#1e2d4a]" onClick={()=>setMobileOpen(!mobileOpen)}><Menu size={18} /></button>
          <div className="flex items-center gap-3">
            <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${marketStatus?.is_open ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
              <span className={`w-2 h-2 rounded-full ${marketStatus?.is_open ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span>
              {marketStatus?.status || '...'}
            </span>
            <span className="text-xs text-slate-400 hidden md:block">{marketStatus?.et_time || ''}</span>
          </div>
          <form onSubmit={handleSearch} className="flex-1 max-w-md ml-auto flex gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={e=>setSearch(e.target.value.toUpperCase())} placeholder="Search symbol: AAPL, TSLA..." className="w-full pl-9 pr-3 py-2 bg-[#111c36] border border-[#1e2d4a] rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500" />
            </div>
            <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold">Go</button>
          </form>
          <a href="https://t.me/alionera" target="_blank" rel="noopener noreferrer" className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 text-xs font-bold hover:bg-sky-500/25">
            ✈ @alionera
          </a>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <button onClick={()=>{ localStorage.removeItem('token'); setUser(null); }} className="p-2 rounded-lg bg-[#1e2d4a] text-slate-300"><User size={16} /></button>
            ) : (
              <Link to="/login" className="px-3 py-1.5 rounded-lg bg-[#1e2d4a] text-sm text-white flex items-center gap-1.5"><LogIn size={14} /> Login</Link>
            )}
            <span className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${connectionStatus==='Connected' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
              ● {connectionStatus}
            </span>
          </div>
        </header>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/60" onClick={()=>setMobileOpen(false)}>
            <div className="w-[280px] h-full bg-[#0f1629] p-4 overflow-y-auto" onClick={e=>e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4"><span className="font-bold text-white">Menu</span><button onClick={()=>setMobileOpen(false)}><X size={18} /></button></div>
              <nav className="space-y-1">
                {nav.map(item => (
                  <Link key={item.path} to={item.path} onClick={()=>setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${location.pathname===item.path ? 'bg-[#1e2d4a] text-white' : 'text-slate-400'}`}>
                    <item.icon size={16} /> {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  )
}
