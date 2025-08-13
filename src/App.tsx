import { Routes, Route } from 'react-router-dom'
import VIPLayout from './components/Layout/VIPLayout'
import VIPDashboard from './pages/Dashboard/VIPDashboard'
import SoftwarePage from './pages/Software/SoftwarePage'
import PortableAppsPage from './pages/PortableApps/PortableAppsPage'
import AnalyticsPage from './pages/Analytics/AnalyticsPage'
import GodModePage from './pages/GodMode/GodModePage'
import FileConverterPage from './pages/FileConverter/FileConverterPage'
import NasExplorerPage from './pages/NasExplorer/NasExplorerPage'
import ChocolateyPage from './pages/Chocolatey/ChocolateyPage'
import ErrorBoundary from './components/ErrorBoundary'
import SettingsPage from './pages/Settings/SettingsPage'
import { Toaster } from './ui/components/Toaster'

function App() {
  return (
    <>
      <Toaster />
      <ErrorBoundary>
        <VIPLayout>
          <Routes>
            <Route path="/" element={<VIPDashboard />} />
            <Route path="/software" element={<SoftwarePage />} />
            <Route path="/portable-apps" element={<PortableAppsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/god-mode" element={<GodModePage />} />
            <Route path="/file-converter" element={<FileConverterPage />} />
            <Route path="/nas-explorer" element={<NasExplorerPage />} />
            <Route path="/chocolatey" element={<ChocolateyPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </VIPLayout>
      </ErrorBoundary>
    </>
  )
}

export default App
