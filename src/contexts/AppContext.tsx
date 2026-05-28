import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import {
  Lead,
  User,
  View,
  MapPosition,
  LeadStatus,
  RepCredential,
  TEAM_MEMBERS as DEFAULT_TEAM_MEMBERS,
  DEFAULT_REP_CREDENTIALS,
} from '../types'
import {
  getLeads,
  saveLeads,
  getUser,
  saveUser,
  getMapPosition,
  saveMapPosition,
  isInitialized,
  setInitialized,
  clearAllData,
  getTeamMembers,
  saveTeamMembers,
  getRepCredentials,
  saveRepCredentials,
} from '../utils/storage'
import { DEMO_LEADS } from '../data/demoData'

interface FlyToTarget {
  lat: number
  lng: number
  zoom?: number
  leadId?: string
}

interface AppContextValue {
  // Auth
  user: User | null
  isAdmin: boolean
  login: (email: string, password: string) => boolean
  logout: () => void
  updateUser: (updates: Partial<User>) => void

  // Leads
  leads: Lead[]
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Lead
  updateLead: (lead: Lead) => void
  deleteLead: (id: string) => void
  canEditLead: (lead: Lead) => boolean

  // Navigation
  currentView: View
  setCurrentView: (v: View) => void

  // Map
  mapPosition: MapPosition
  setMapPosition: (p: MapPosition) => void
  flyToTarget: FlyToTarget | null
  flyTo: (target: FlyToTarget) => void
  clearFlyTo: () => void

  // Filters
  activeFilters: LeadStatus[]
  toggleFilter: (s: LeadStatus) => void
  clearFilters: () => void

  // Selected lead (list → map)
  selectedLeadId: string | null
  selectLead: (id: string | null) => void

  // Team
  teamMembers: string[]
  setTeamMembers: (members: string[]) => void

  // Rep credentials (admin only)
  repCredentials: RepCredential[]
  addRepCredential: (cred: Omit<RepCredential, 'id'>) => void
  updateRepCredential: (id: string, updates: Partial<RepCredential>) => void
  deleteRepCredential: (id: string) => void

  // Settings
  clearData: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const u = getUser()
    // Migrate old "Team Lead" role string to 'admin'
    if (u && (u.role as string) === 'Team Lead') {
      return { ...u, role: 'admin' }
    }
    return u
  })

  const [leads, setLeads] = useState<Lead[]>(() => {
    if (!isInitialized()) {
      saveLeads(DEMO_LEADS)
      setInitialized()
      return DEMO_LEADS
    }
    return getLeads()
  })

  const [repCredentials, setRepCredentialsState] = useState<RepCredential[]>(() => {
    const stored = getRepCredentials()
    if (stored.length === 0) {
      saveRepCredentials(DEFAULT_REP_CREDENTIALS)
      return DEFAULT_REP_CREDENTIALS
    }
    // Merge: add any new default accounts not yet in localStorage
    const storedEmails = new Set(stored.map((c) => c.email.toLowerCase()))
    const missing = DEFAULT_REP_CREDENTIALS.filter(
      (c) => !storedEmails.has(c.email.toLowerCase())
    )
    if (missing.length > 0) {
      const merged = [...stored, ...missing]
      saveRepCredentials(merged)
      return merged
    }
    return stored
  })

  const [currentView, setCurrentView] = useState<View>('map')
  const [mapPosition, setMapPositionState] = useState<MapPosition>(() => getMapPosition())
  const [flyToTarget, setFlyToTarget] = useState<FlyToTarget | null>(null)
  const [activeFilters, setActiveFilters] = useState<LeadStatus[]>([])
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  const [teamMembers, setTeamMembersState] = useState<string[]>(() => {
    const stored = getTeamMembers()
    return stored.length > 0 ? stored : DEFAULT_TEAM_MEMBERS
  })

  useEffect(() => {
    saveLeads(leads)
  }, [leads])

  const isAdmin = user?.role === 'admin'

  const login = useCallback(
    (email: string, password: string): boolean => {
      const trimEmail = email.trim().toLowerCase()
      // Admin account
      if (trimEmail === 'admin@canvass.app' && password === 'admin123') {
        const u: User = { email: trimEmail, name: 'Admin User', role: 'admin' }
        setUser(u)
        saveUser(u)
        return true
      }
      // Rep accounts (read fresh from state so changes are reflected)
      const match = repCredentials.find(
        (c) => c.email.toLowerCase() === trimEmail && c.password === password
      )
      if (match) {
        const u: User = { email: trimEmail, name: match.name, role: 'rep' }
        setUser(u)
        saveUser(u)
        return true
      }
      return false
    },
    [repCredentials]
  )

  const logout = useCallback(() => {
    setUser(null)
    saveUser(null)
    setCurrentView('map')
    setActiveFilters([])
    setSelectedLeadId(null)
  }, [])

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev
      const updated = { ...prev, ...updates }
      saveUser(updated)
      return updated
    })
  }, [])

  const canEditLead = useCallback(
    (lead: Lead): boolean => {
      if (!user) return false
      if (user.role === 'admin') return true
      return lead.assignedRep === user.name
    },
    [user]
  )

  const addLead = useCallback(
    (data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Lead => {
      const now = new Date().toISOString()
      const lead: Lead = {
        ...data,
        id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      }
      setLeads((prev) => [...prev, lead])
      return lead
    },
    []
  )

  const updateLead = useCallback((updated: Lead) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : l
      )
    )
  }, [])

  const deleteLead = useCallback((id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id))
  }, [])

  const setMapPosition = useCallback((p: MapPosition) => {
    setMapPositionState(p)
    saveMapPosition(p)
  }, [])

  const flyTo = useCallback((target: FlyToTarget) => setFlyToTarget(target), [])
  const clearFlyTo = useCallback(() => setFlyToTarget(null), [])

  const toggleFilter = useCallback((s: LeadStatus) => {
    setActiveFilters((prev) =>
      prev.includes(s) ? prev.filter((f) => f !== s) : [...prev, s]
    )
  }, [])

  const clearFilters = useCallback(() => setActiveFilters([]), [])
  const selectLead = useCallback((id: string | null) => setSelectedLeadId(id), [])

  const setTeamMembers = useCallback((members: string[]) => {
    setTeamMembersState(members)
    saveTeamMembers(members)
  }, [])

  // ── Rep credential management (admin only) ───────────────────
  const addRepCredential = useCallback((cred: Omit<RepCredential, 'id'>) => {
    const newCred: RepCredential = {
      ...cred,
      id: `rep-${Date.now()}`,
    }
    setRepCredentialsState((prev) => {
      const updated = [...prev, newCred]
      saveRepCredentials(updated)
      return updated
    })
  }, [])

  const updateRepCredential = useCallback(
    (id: string, updates: Partial<RepCredential>) => {
      setRepCredentialsState((prev) => {
        const updated = prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
        saveRepCredentials(updated)
        return updated
      })
    },
    []
  )

  const deleteRepCredential = useCallback((id: string) => {
    setRepCredentialsState((prev) => {
      const updated = prev.filter((c) => c.id !== id)
      saveRepCredentials(updated)
      return updated
    })
  }, [])

  const clearData = useCallback(() => {
    clearAllData()
    saveLeads(DEMO_LEADS)
    setInitialized()
    setLeads(DEMO_LEADS)
    setTeamMembersState(DEFAULT_TEAM_MEMBERS)
    saveRepCredentials(DEFAULT_REP_CREDENTIALS)
    setRepCredentialsState(DEFAULT_REP_CREDENTIALS)
    setActiveFilters([])
    setSelectedLeadId(null)
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      isAdmin,
      login,
      logout,
      updateUser,
      leads,
      addLead,
      updateLead,
      deleteLead,
      canEditLead,
      currentView,
      setCurrentView,
      mapPosition,
      setMapPosition,
      flyToTarget,
      flyTo,
      clearFlyTo,
      activeFilters,
      toggleFilter,
      clearFilters,
      selectedLeadId,
      selectLead,
      teamMembers,
      setTeamMembers,
      repCredentials,
      addRepCredential,
      updateRepCredential,
      deleteRepCredential,
      clearData,
    }),
    [
      user,
      isAdmin,
      login,
      logout,
      updateUser,
      leads,
      addLead,
      updateLead,
      deleteLead,
      canEditLead,
      currentView,
      mapPosition,
      setMapPosition,
      flyToTarget,
      flyTo,
      clearFlyTo,
      activeFilters,
      toggleFilter,
      clearFilters,
      selectedLeadId,
      selectLead,
      teamMembers,
      setTeamMembers,
      repCredentials,
      addRepCredential,
      updateRepCredential,
      deleteRepCredential,
      clearData,
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
