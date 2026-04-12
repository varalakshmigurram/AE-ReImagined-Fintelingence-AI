import { Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import AEBuddiee from './components/AEBuddiee'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import Rules from './pages/Rules'
import StateConfig from './pages/StateConfig'
import ChannelConfig from './pages/ChannelConfig'
import ReviewQueue from './pages/ReviewQueue'
import PromoteToProd from './pages/PromoteToProd'
import VersionHistoryLog from './pages/VersionHistoryLog'
import EmbeddedRuleEngine from './pages/embedded/EmbeddedRuleEngine'
import OfferConfigLoader from './pages/embedded/OfferConfigLoader'
import CutoffManager from './pages/embedded/CutoffManager'
import CutoffTracker from './pages/embedded/CutoffTracker'
import RuleBuilder from './pages/embedded/RuleBuilder'
import ConfigVersionManager from './pages/embedded/ConfigVersionManager'
import UWIngestion from './pages/embedded/UWIngestion'
import Simulator from './pages/embedded/Simulator'
import { getPendingRules, getPendingStates, getPendingChannels } from './services/api'
import { Toaster } from 'react-hot-toast'

export default function App() {
  const [pendingCount, setPendingCount] = useState(0)
  useEffect(() => {
    const load = () => Promise.all([getPendingRules(), getPendingStates(), getPendingChannels()])
      .then(([r,s,c]) => setPendingCount(r.length+s.length+c.length)).catch(()=>{})
    load()
    const i = setInterval(load, 30000)
    return () => clearInterval(i)
  }, [])
  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style:{ background:'#1C2333', color:'#F1F5F9', border:'1px solid rgba(255,255,255,.1)', fontSize:13 },
        success:{ iconTheme:{primary:'#059669',secondary:'#fff'} },
        error:{ iconTheme:{primary:'#DC2626',secondary:'#fff'} }
      }}/>
      <div className="layout">
        <Sidebar pendingCount={pendingCount} />
        <main className="main">
          <Routes>
            <Route path="/"                element={<Dashboard />} />
            <Route path="/analytics"       element={<Analytics />} />
            <Route path="/rules"           element={<Rules />} />
            <Route path="/states"          element={<StateConfig />} />
            <Route path="/channels"        element={<ChannelConfig />} />
            <Route path="/reviews"         element={<ReviewQueue />} />
            <Route path="/promote"         element={<PromoteToProd />} />
            <Route path="/audit"           element={<VersionHistoryLog />} />
            <Route path="/uw-ingestion"    element={<UWIngestion />} />
            <Route path="/embedded"        element={<EmbeddedRuleEngine />} />
            <Route path="/rule-builder"    element={<RuleBuilder />} />
            <Route path="/cutoff-builder"  element={<CutoffManager />} />
            <Route path="/cutoff-tracker"  element={<CutoffTracker />} />
            <Route path="/offer-config"    element={<OfferConfigLoader />} />
            <Route path="/config-versions" element={<ConfigVersionManager />} />
            <Route path="/simulator"       element={<Simulator />} />
          </Routes>
        </main>
      </div>
      {/* AE Buddiee — floating AI chatbot, always visible */}
      <AEBuddiee />
    </>
  )
}
