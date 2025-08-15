import { Route, Routes } from 'react-router-dom'
import VIPLayout from './components/Layout/VIPLayout'
import AnalyticsPage from './pages/Analytics/AnalyticsPage'
import BillingPage from './pages/Billing/BillingPage'
import ChocolateyPage from './pages/Chocolatey/ChocolateyPage'
import VIPDashboard from './pages/Dashboard/VIPDashboard'
import FileConverterPage from './pages/FileConverter/FileConverterPage'
import GodModePage from './pages/GodMode/GodModePage'
import NasExplorerPage from './pages/NasExplorer/NasExplorerPage'
import PortableAppsPage from './pages/PortableApps/PortableAppsPage'
import SettingsPage from './pages/Settings/SettingsPage'
import SoftwarePage from './pages/Software/SoftwarePage'

function App() {
  return (
    <VIPLayout>
      <Routes>
        <Route path="/" element={<VIPDashboard />} />
        <Route path="/software" element={<SoftwarePage />} />
        <Route path="/portable-apps" element={<PortableAppsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/god-mode" element={<GodModePage />} />
        <Route path="/file-converter" element={<FileConverterPage />} />
        <Route path="/nas-explorer" element={<NasExplorerPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/chocolatey" element={<ChocolateyPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </VIPLayout>
  )
}

export default App
