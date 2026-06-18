import { AppProvider, useApp } from './contexts/AppContext'
import LoginScreen from './components/auth/LoginScreen'
import Layout from './components/layout/Layout'
import Toaster from './components/ui/Toaster'

function AppInner() {
  const { user } = useApp()
  return user ? <Layout /> : <LoginScreen />
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
      <Toaster />
    </AppProvider>
  )
}
