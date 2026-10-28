import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Search, Scan, Newspaper, Crosshair, History, Wallet, Shield, Bell, BarChart3, Users, Briefcase, Settings, Menu, X, LogIn, User, Clock3 } from 'lucide-react'
import { useStore } from '../lib/store'
import { ws } from '../lib/ws'
import { api } from '../lib/api'

const nav = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, desc:'Overview' },
  { path: '/scanner', label: 'Scanner', icon: Scan, desc:'ORB • Daily' },
  { path: '/markets', label: 'Live Market', icon: BarChart3, desc:'Real-time' },
  { path: '/watchlist', label: 'Watchlist', icon: Search, desc:'Per account' },
  { path: '/news', label: 'News', icon: Newspaper, desc:'SEC 8-K' },
  { path: '/entry', label: 'Entry', icon: Crosshair, desc:'Bar confirm' },
  { path: '/exit', label: 'Exit Plan', icon: Clock3, desc:'Stop/Target' },
  { path: '/timemachine', label: 'Time Machine', icon: History, desc:'10k replays' },
  { path: '/risk', label: 'Risk', icon: Shield, desc:'PASS/BLOCK' },
  { path: '/budget', label: 'Budget', icon: Wallet, desc:'Position size' },
  { path: '/alerts', label: 'Alerts', icon: Bell, desc:'Live' },
  { path: '/analyst', label: 'Analyst', icon: BarChart3, desc:'XBRL' },
  { path: '/pelosi', label: 'Congress', icon: Users, desc:'Public' },
  { path: '/paper', label: 'Paper Trading', icon: Briefcase, desc:'Sim only' },
  { path: '/settings', label: 'Settings', icon: Settings, desc:'Config' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { symbol, setSymbol, connectionStatus, setConnectionStatus, isAuthenticated, setUser } = useStore()
  const [search, setSearch] = useState(symbol)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [marketStatus, setMarketStatus] = useState<any>(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    ws.connect()
    const off1 = ws.on('system.status', (d:any) => { if(d.status) setConnectionStatus(d.status) })
    return () => { off1() }
  }, [])

  useEffect(() => {
    api.marketStatus().then(setMarketStatus).catch(()=>{})
    const t = setInterval(()=>api.marketStatus().then(setMarketStatus).catch(()=>{}), 60000)
    return () => clearInterval(t)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const s = search.trim().toUpperCase()
    if (s) { setSymbol(s); navigate(`/markets?symbol=${s}`) }
  }

  return (
    <div className="min-h-screen flex bg-[#070b14]">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-[264px] shrink-0 bg-[#0a0f1e] border-r border-[#162032] sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e1a33]/40 via-transparent to-transparent pointer-events-none" />
        <div className="relative p-5 border-b border-[#162032]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 flex items-center justify-center font-black text-white text-[12px] shadow-[0_0_20px_rgba(6,182,214,0.3)]">AB</div>
            <div>
              <div className="font-black text-white tracking-wide text-[15px] leading-none">ALi BOSS</div>
              <div className="text-[10px] tracking-[0.20em] text-cyan-300/90 font-bold">PREMIUM TERMINAL</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] font-black text-amber-300 text-center tracking-widest">PAPER</div>
            <div className="px-2.5 py-1.5 rounded-xl bg-slate-800/60 border border-[#1e2f52] text-[10px] font-bold text-slate-400 text-center tracking-widest">Power By ALi</div>
          </div>
        </div>

        <nav className="relative flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map(item => {
            const active = location.pathname === item.path || (item.path!=='/' && location.pathname.startsWith(item.path))
            return (
              <Link key={item.path} to={item.path}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${active ? 'bg-[#111d36] text-white border border-[#1e3a6e] shadow-[0_0_18px_rgba(59,130,246,0.15)]' : 'text-slate-400 hover:bg-[#0f1a30] hover:text-white border border-transparent'}`}>
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${active?'bg-gradient-to-br from-cyan-500 to-blue-600 text-white':'bg-[#0f1a30] text-slate-400 group-hover:text-white'}`}>
                  <item.icon size={15} className={active?'text-white':''} />
                </span>
                <span className="flex-1 leading-none">{item.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${active?'bg-cyan-500/15 text-cyan-300 border-cyan-500/20':'bg-slate-800/50 text-slate-500 border-slate-800'}`}>{item.desc}</span>
              </Link>
            )
          })}
        </nav>

        <div className="relative p-4 border-t border-[#162032] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-slate-400 font-medium">
              <span className={`w-2 h-2 rounded-full ${connectionStatus==='Connected'?'bg-emerald-500 pulse-dot':'bg-amber-500 pulse-dot'}`} /> {connectionStatus}
            </span>
            <span className="text-[10px] tracking-widest font-bold text-slate-500">{marketStatus?.status || '...'}</span>
          </div>
          <a href="https://t.me/alionera" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-xs font-black tracking-wide shadow-[0_0_20px_rgba(6,182,214,0.25)] hover:from-sky-400 hover:to-cyan-400 transition">
            ✈ Support @alionera
          </a>
          <div className="text-center text-[10px] leading-3 text-slate-500">
            <div className="font-bold tracking-widest">© ALi BOSS • Power By ALi</div>
            <div className="opacity-60">Day Trader Skill v2 • MIT • No fake data</div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0f1e]/90 backdrop-blur border-t border-[#162032] flex overflow-x-auto">
        {nav.slice(0,7).map(item => (
          <Link key={item.path} to={item.path} className={`flex flex-col items-center gap-1 p-3 min-w-[66px] text-[10px] font-bold ${location.pathname===item.path?'text-cyan-400':'text-slate-500'}`}>
            <item.icon size={18} /> {item.label.split(' ')[0]}
          </Link>
        ))}
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 bg-[#070b14]/70 backdrop-blur-xl border-b border-[#162032]">
          <div className="px-4 lg:px-6 py-3 flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-xl bg-[#0f1a30] border border-[#162032] text-slate-300" onClick={()=>setMobileOpen(!mobileOpen)}><Menu size={16} /></button>

            <div className="hidden sm:flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border ${marketStatus?.is_open ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800/60 text-slate-400 border-slate-700/50'}`}>
                <span className={`w-2 h-2 rounded-full ${marketStatus?.is_open?'bg-emerald-500 pulse-dot':'bg-slate-500'}`} /> {marketStatus?.status || 'CLOSED'}
              </span>
              <span className="text-xs text-slate-500 hidden md:block">{marketStatus?.et_time || ''}</span>
            </div>

            <form onSubmit={handleSearch} className="flex-1 max-w-[560px] ml-auto flex gap-2">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input value={search} onChange={e=>setSearch(e.target.value.toUpperCase())} placeholder="Search symbol: TSLA, NVDA, AAPL..." className="w-full pl-10 pr-3 py-2.5 bg-[#0e1528] border border-[#1b2b4a] rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_0_3px_rgba(6,182,214,0.1)]" />
              </div>
              <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-sm font-black shadow-[0_0_20px_rgba(6,182,214,0.25)]">Go</button>
            </form>

            <a href="https://t.me/alionera" target="_blank" className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500/10 text-sky-300 border border-sky-500/20 text-xs font-black">✈ @alionera</a>

            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <button onClick={()=>{localStorage.removeItem('token'); setUser(null)}} className="p-2 rounded-xl bg-[#0f1a30] border border-[#162032] text-slate-300"><User size={16} /></button>
              ) : (
                <Link to="/login" className="px-3 py-2 rounded-xl bg-[#0f1a30] border border-[#162032] text-sm text-white flex items-center gap-1.5"><LogIn size={14}/> Login</Link>
              )}
              <span className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border ${connectionStatus==='Connected'?'bg-emerald-500/10 text-emerald-400 border-emerald-500/20':'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>● {connectionStatus}</span>
            </div>
          </div>
        </header>

        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={()=>setMobileOpen(false)}>
            <div className="w-[300px] h-full bg-[#0a0f1e] border-r border-[#162032] p-4 overflow-y-auto" onClick={e=>e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4"><span className="font-black text-white">ALi BOSS</span><button onClick={()=>setMobileOpen(false)} className="p-2 rounded-xl bg-[#0f1a30]"><X size={16} /></button></div>
              <div className="text-[10px] tracking-widest font-bold text-cyan-400 mb-4">Power By ALi • @alionera</div>
              <nav className="space-y-1">
                {nav.map(item => (
                  <Link key={item.path} to={item.path} onClick={()=>setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm border ${location.pathname===item.path?'bg-[#111d36] text-white border-[#1e3a6e]':'text-slate-400 border-transparent'}`}>
                    <item.icon size={16}/> {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">
          {children}
        </main>

        <footer className="px-6 py-3 border-t border-[#162032] bg-[#070b14]/50 hidden lg:flex items-center justify-between text-[11px] text-slate-500">
          <span>© <b className="text-slate-300">ALi BOSS</b> • Power By ALi • No fake prices • Real Yahoo/SEC/House data</span>
          <span className="flex items-center gap-3">
            <span>Rate-limit safe • Exponential backoff • Crash-proof workers</span>
            <a href="https://t.me/alionera" target="_blank" className="text-sky-400 hover:text-sky-300 font-bold">Support @alionera →</a>
          </span>
        </footer>
      </div>
    </div>
  )
}
