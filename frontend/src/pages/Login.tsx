import { useState } from 'react'
import { api } from '../lib/api'
import { useStore } from '../lib/store'
import { useNavigate, Link } from 'react-router-dom'
import { Card } from '../components/Card'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser, setAuthenticated } = useStore()
  const navigate = useNavigate()

  const submit = async (e:any) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = mode==='login' ? await api.login({ email, password }) : await api.signup({ email, password })
      localStorage.setItem('token', res.token)
      setUser(res.user); setAuthenticated(true)
      const me = await api.me().catch(()=>res.user)
      setUser(me)
      navigate('/')
    } catch(e:any){ setError(e.message) }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto">
      <Card title={mode==='login' ? 'Login' : 'Sign Up'} subtitle="Session/token auth • Password hashing • Rate limiting">
        <form onSubmit={submit} className="space-y-4">
          <div><label className="text-sm text-slate-400">Email</label><input value={email} onChange={e=>setEmail(e.target.value)} type="email" required className="w-full mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" placeholder="you@example.com" /></div>
          <div><label className="text-sm text-slate-400">Password</label><input value={password} onChange={e=>setPassword(e.target.value)} type="password" required className="w-full mt-1 px-3 py-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-sm text-white" placeholder="••••••••" /></div>
          {error && <div className="text-sm text-red-400">{error}</div>}
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg font-bold">{loading ? 'Please wait...' : mode==='login' ? 'Login' : 'Create Account'}</button>
          <div className="text-center text-sm text-slate-400">
            {mode==='login' ? <>No account? <button type="button" onClick={()=>setMode('signup')} className="text-cyan-400 underline">Sign up</button></> : <>Have account? <button type="button" onClick={()=>setMode('login')} className="text-cyan-400 underline">Login</button></>}
          </div>
        </form>
      </Card>
    </div>
  )
}
