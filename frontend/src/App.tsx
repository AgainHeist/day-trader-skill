import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Scanner from './pages/Scanner'
import Markets from './pages/Markets'
import Watchlist from './pages/Watchlist'
import News from './pages/News'
import Entry from './pages/Entry'
import Exit from './pages/Exit'
import TimeMachine from './pages/TimeMachine'
import Risk from './pages/Risk'
import Budget from './pages/Budget'
import Alerts from './pages/Alerts'
import Analyst from './pages/Analyst'
import Pelosi from './pages/Pelosi'
import Paper from './pages/Paper'
import Settings from './pages/Settings'
import Login from './pages/Login'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/news" element={<News />} />
          <Route path="/entry" element={<Entry />} />
          <Route path="/exit" element={<Exit />} />
          <Route path="/timemachine" element={<TimeMachine />} />
          <Route path="/risk" element={<Risk />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/analyst" element={<Analyst />} />
          <Route path="/pelosi" element={<Pelosi />} />
          <Route path="/congress" element={<Pelosi />} />
          <Route path="/paper" element={<Paper />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
