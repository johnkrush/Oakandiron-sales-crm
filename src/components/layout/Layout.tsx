import { useApp } from '../../contexts/AppContext'
import Header from './Header'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import MapView from '../map/MapView'
import LeadList from '../leads/LeadList'
import Dashboard from '../dashboard/Dashboard'
import SettingsPage from '../settings/Settings'

export default function Layout() {
  const { currentView, isAdmin } = useApp()

  // Guard: reps cannot access settings
  const safeView = !isAdmin && currentView === 'settings' ? 'map' : currentView

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Map always mounted — preserves Leaflet state across view switches */}
          <div
            className="flex-1 overflow-hidden"
            style={{ display: safeView === 'map' ? 'flex' : 'none' }}
          >
            <MapView />
          </div>

          {safeView === 'list' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <LeadList />
            </div>
          )}

          {safeView === 'dashboard' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <Dashboard />
            </div>
          )}

          {safeView === 'settings' && isAdmin && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <SettingsPage />
            </div>
          )}
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
