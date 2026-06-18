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
  hasStoredLeads,
  getUser,
  saveUser,
  getMapPosition,
  saveMapPosition,
  clearAllData,
  getTeamMembers,
  saveTeamMembers,
  hasStoredTeamMembers,
  getRepCredentials,
  saveRepCredentials,
  hasStoredRepCredentials,
} from '../utils/storage'
import {
  supabase,
  LeadRow,
  TeamMemberRow,
  rowToLead,
  leadToRow,
  rowToRepCredential,
} from '../utils/supabase'
import { DEMO_LEADS } from '../data/demoData'
import { reportSyncError } from '../utils/toast'

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
  login: (email: string, password: string) => Promise<boolean>
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

// Owner / admin logins — hardcoded, full admin access. Emails are lowercase.
const OWNER_ACCOUNTS = [
  { email: 'admin@canvass.app', password: 'Oakandiron26', name: 'Admin User' },
  { email: 'johnnie.krush@canvass.app', password: 'Bangjob123', name: 'Johnnie Krush' },
  { email: 'chris.araujo@canvass.app', password: 'Bangjob123', name: 'Chris Araujo' },
]

const AppContext = createContext<AppContextValue | null>(null)

// ── Build initial teamMemberRows from localStorage ────────────────
function buildInitialRows(): TeamMemberRow[] {
  const names = hasStoredTeamMembers() ? getTeamMembers() : DEFAULT_TEAM_MEMBERS
  const creds = hasStoredRepCredentials() ? getRepCredentials() : DEFAULT_REP_CREDENTIALS
  return names.map((name) => {
    const cred = creds.find((c) => c.name === name)
    return {
      id: cred?.id ?? crypto.randomUUID(),
      name,
      email: cred?.email ?? null,
      password: cred?.password ?? null,
      role: 'rep' as const,
      created_at: '',
    }
  })
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const u = getUser()
    if (u && (u.role as string) === 'Team Lead') return { ...u, role: 'admin' }
    return u
  })

  // Leads — start from localStorage, Supabase overwrites on mount
  const [leads, setLeads] = useState<Lead[]>(() =>
    hasStoredLeads() ? getLeads() : DEMO_LEADS
  )

  // Team members — internal rows (email/password included), derived publicly
  const [teamMemberRows, setTeamMemberRows] = useState<TeamMemberRow[]>(buildInitialRows)

  const [currentView, setCurrentView] = useState<View>('map')
  const [mapPosition, setMapPositionState] = useState<MapPosition>(() => getMapPosition())
  const [flyToTarget, setFlyToTarget] = useState<FlyToTarget | null>(null)
  const [activeFilters, setActiveFilters] = useState<LeadStatus[]>([])
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  // Publicly exposed derivations
  const teamMembers = useMemo(() => teamMemberRows.map((r) => r.name), [teamMemberRows])
  const repCredentials = useMemo(
    () => teamMemberRows.filter((r) => !!r.email).map(rowToRepCredential),
    [teamMemberRows]
  )

  // ── localStorage sync (backup whenever state changes) ────────────
  useEffect(() => { saveLeads(leads) }, [leads])
  useEffect(() => {
    saveTeamMembers(teamMemberRows.map((r) => r.name))
    saveRepCredentials(teamMemberRows.filter((r) => !!r.email).map(rowToRepCredential))
  }, [teamMemberRows])

  // ── Supabase: initial fetch + real-time subscription ─────────────
  useEffect(() => {
    let mounted = true

    async function init() {
      // Fetch both tables in parallel
      const [
        { data: leadsData, error: leadsErr },
        { data: teamData, error: teamErr },
      ] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: true }),
        supabase.from('team_members').select('*').order('created_at', { ascending: true }),
      ])

      if (!mounted) return

      if (leadsErr) console.error('[supabase] fetch leads:', leadsErr.message)
      if (teamErr) console.error('[supabase] fetch team_members:', teamErr.message)

      // Pull whatever is in localStorage so we can detect unsynced leads
      const localLeads = hasStoredLeads() ? getLeads() : []

      // True first run = both Supabase tables empty AND nothing in localStorage yet
      const isFirstRun = !leadsErr && !teamErr
        && leadsData!.length === 0
        && teamData!.length === 0
        && localLeads.length === 0

      // Leads
      if (!leadsErr && leadsData) {
        if (isFirstRun) {
          const seeded = DEMO_LEADS.map((d) => ({ ...d, id: crypto.randomUUID() }))
          setLeads(seeded)
          const { error } = await supabase.from('leads').insert(seeded.map(leadToRow))
          if (error) console.error('[supabase] seed leads:', error.message)
        } else if (leadsData.length === 0 && localLeads.length > 0) {
          // Supabase is empty but localStorage has leads — previous inserts likely failed.
          // Keep the local leads and re-sync them to Supabase now.
          setLeads(localLeads)
          const { error } = await supabase.from('leads').insert(localLeads.map(leadToRow))
          if (error) console.error('[supabase] resync local leads:', error.message)
        } else {
          // Supabase has data — use it as the primary source, but also check for any
          // locally-stored leads that never made it to Supabase (failed inserts).
          const supabaseLeads = (leadsData as LeadRow[]).map(rowToLead)
          const supabaseIds = new Set(supabaseLeads.map((l) => l.id))
          const unsyncedLeads = localLeads.filter((l) => !supabaseIds.has(l.id))

          if (unsyncedLeads.length > 0) {
            // Try to push the unsynced leads up to Supabase now
            supabase
              .from('leads')
              .insert(unsyncedLeads.map(leadToRow))
              .then(({ error }) => {
                if (error) console.error('[supabase] sync unsynced leads:', error.message)
              })
            setLeads([...supabaseLeads, ...unsyncedLeads])
          } else {
            setLeads(supabaseLeads)
          }
        }
      }

      // Team members
      if (!teamErr && teamData) {
        if (isFirstRun) {
          const seeded: TeamMemberRow[] = DEFAULT_REP_CREDENTIALS.map((c) => ({
            id: crypto.randomUUID(),
            name: c.name,
            email: c.email,
            password: c.password,
            role: 'rep' as const,
            created_at: new Date().toISOString(),
          }))
          setTeamMemberRows(seeded)
          const { error } = await supabase.from('team_members').insert(seeded)
          if (error) console.error('[supabase] seed team_members:', error.message)
        } else {
          setTeamMemberRows(teamData as TeamMemberRow[])
        }
      }
    }

    init().catch((err) => console.error('[supabase] init:', err))

    // Real-time
    const channel = supabase
      .channel('oakandiron-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          if (!mounted) return
          if (payload.eventType === 'INSERT') {
            setLeads((prev) =>
              prev.some((l) => l.id === (payload.new as LeadRow).id)
                ? prev
                : [...prev, rowToLead(payload.new as LeadRow)]
            )
          } else if (payload.eventType === 'UPDATE') {
            setLeads((prev) =>
              prev.map((l) =>
                l.id === (payload.new as LeadRow).id ? rowToLead(payload.new as LeadRow) : l
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setLeads((prev) =>
              prev.filter((l) => l.id !== (payload.old as { id: string }).id)
            )
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_members' },
        (payload) => {
          if (!mounted) return
          if (payload.eventType === 'INSERT') {
            setTeamMemberRows((prev) =>
              prev.some((r) => r.id === (payload.new as TeamMemberRow).id)
                ? prev
                : [...prev, payload.new as TeamMemberRow]
            )
          } else if (payload.eventType === 'UPDATE') {
            setTeamMemberRows((prev) =>
              prev.map((r) =>
                r.id === (payload.new as TeamMemberRow).id
                  ? (payload.new as TeamMemberRow)
                  : r
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setTeamMemberRows((prev) =>
              prev.filter((r) => r.id !== (payload.old as { id: string }).id)
            )
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[supabase] realtime channel error — falling back to polling')
        }
      })

    // Fallback poll every 30 s in case the WebSocket drops
    const pollInterval = setInterval(async () => {
      if (!mounted) return
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: true })
      if (!error && data) {
        setLeads((prev) => {
          const incoming = (data as LeadRow[]).map(rowToLead)
          const incomingIds = new Set(incoming.map((l) => l.id))

          // Keep any local leads that aren't in Supabase yet — these are
          // recently-added leads whose insert hasn't landed (or failed).
          // Without this the poll would silently drop them after 30 s.
          const unsynced = prev.filter((l) => !incomingIds.has(l.id))

          if (unsynced.length > 0) {
            // Retry pushing the unsynced leads up to Supabase
            supabase
              .from('leads')
              .upsert(unsynced.map(leadToRow))
              .then(({ error }) => {
                if (error) console.error('[supabase] poll resync:', error.message)
              })
          }

          const merged = [...incoming, ...unsynced]

          // Only update state if something actually changed
          const prevKey = prev.map((l) => l.id + l.updatedAt).join()
          const nextKey = merged.map((l) => l.id + l.updatedAt).join()
          return prevKey === nextKey ? prev : merged
        })
      }
    }, 30_000)

    return () => {
      mounted = false
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [])

  // ── Auth ──────────────────────────────────────────────────────────
  const isAdmin = user?.role === 'admin'

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      const trimEmail = email.trim().toLowerCase()

      // Owners / admins — hardcoded, no DB query needed
      const owner = OWNER_ACCOUNTS.find(
        (a) => a.email === trimEmail && a.password === password
      )
      if (owner) {
        const u: User = { email: trimEmail, name: owner.name, role: 'admin' }
        setUser(u)
        saveUser(u)
        return true
      }

      // Rep — query Supabase for up-to-date credentials
      try {
        const { data, error } = await supabase
          .from('team_members')
          .select('*')
          .eq('email', trimEmail)
          .single()

        if (!error && data && (data as TeamMemberRow).password === password) {
          const row = data as TeamMemberRow
          const u: User = { email: trimEmail, name: row.name, role: 'rep' }
          setUser(u)
          saveUser(u)
          return true
        }
      } catch {
        // Supabase unreachable — fall back to local state
        const row = teamMemberRows.find(
          (r) => r.email?.toLowerCase() === trimEmail && r.password === password
        )
        if (row) {
          const u: User = { email: trimEmail, name: row.name, role: 'rep' }
          setUser(u)
          saveUser(u)
          return true
        }
      }

      return false
    },
    [teamMemberRows]
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

  // ── Lead CRUD ─────────────────────────────────────────────────────
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
      const lead: Lead = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
      setLeads((prev) => [...prev, lead])
      supabase
        .from('leads')
        .insert(leadToRow(lead))
        .then(({ error }) => { if (error) reportSyncError('addLead', error.message) })
      return lead
    },
    []
  )

  const updateLead = useCallback((updated: Lead) => {
    const now = new Date().toISOString()
    const withTs = { ...updated, updatedAt: now }
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? withTs : l)))
    supabase
      .from('leads')
      .update({ ...leadToRow(withTs), updated_at: now })
      .eq('id', updated.id)
      .then(({ error }) => { if (error) reportSyncError('updateLead', error.message) })
  }, [])

  const deleteLead = useCallback((id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id))
    supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .then(({ error }) => { if (error) reportSyncError('deleteLead', error.message) })
  }, [])

  // ── Map ───────────────────────────────────────────────────────────
  const setMapPosition = useCallback((p: MapPosition) => {
    setMapPositionState(p)
    saveMapPosition(p)
  }, [])

  const flyTo = useCallback((target: FlyToTarget) => setFlyToTarget(target), [])
  const clearFlyTo = useCallback(() => setFlyToTarget(null), [])

  // ── Filters ───────────────────────────────────────────────────────
  const toggleFilter = useCallback(
    (s: LeadStatus) =>
      setActiveFilters((prev) =>
        prev.includes(s) ? prev.filter((f) => f !== s) : [...prev, s]
      ),
    []
  )
  const clearFilters = useCallback(() => setActiveFilters([]), [])
  const selectLead = useCallback((id: string | null) => setSelectedLeadId(id), [])

  // ── Team member CRUD ──────────────────────────────────────────────
  // Takes a plain string[] and reconciles against current rows
  const setTeamMembers = useCallback((newNames: string[]) => {
    setTeamMemberRows((prev) => {
      const prevNameSet = new Set(prev.map((r) => r.name))
      const nextNameSet = new Set(newNames)
      const toAdd = newNames.filter((n) => !prevNameSet.has(n))
      const toRemove = [...prevNameSet].filter((n) => !nextNameSet.has(n))

      let updated = prev.filter((r) => !toRemove.includes(r.name))

      for (const name of toAdd) {
        const id = crypto.randomUUID()
        updated = [
          ...updated,
          { id, name, email: null, password: null, role: 'rep', created_at: new Date().toISOString() },
        ]
        supabase
          .from('team_members')
          .insert({ id, name, role: 'rep' })
          .then(({ error }) => { if (error) console.error('[supabase] addTeamMember:', error.message) })
      }

      for (const name of toRemove) {
        supabase
          .from('team_members')
          .delete()
          .eq('name', name)
          .then(({ error }) => { if (error) console.error('[supabase] removeTeamMember:', error.message) })
      }

      return updated
    })
  }, [])

  // Adds email+password to an existing team member row (or inserts if missing)
  const addRepCredential = useCallback((cred: Omit<RepCredential, 'id'>) => {
    setTeamMemberRows((prev) => {
      const existing = prev.find((r) => r.name === cred.name)
      if (existing) {
        supabase
          .from('team_members')
          .update({ email: cred.email, password: cred.password })
          .eq('id', existing.id)
          .then(({ error }) => { if (error) console.error('[supabase] addRepCredential:', error.message) })
        return prev.map((r) =>
          r.id === existing.id ? { ...r, email: cred.email, password: cred.password } : r
        )
      }
      // Fallback: insert new row (name was not in team list yet)
      const id = crypto.randomUUID()
      supabase
        .from('team_members')
        .insert({ id, name: cred.name, email: cred.email, password: cred.password, role: 'rep' })
        .then(({ error }) => { if (error) console.error('[supabase] addRepCredential (insert):', error.message) })
      return [
        ...prev,
        { id, name: cred.name, email: cred.email, password: cred.password, role: 'rep', created_at: new Date().toISOString() },
      ]
    })
  }, [])

  const updateRepCredential = useCallback((id: string, updates: Partial<RepCredential>) => {
    setTeamMemberRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              ...(updates.email !== undefined ? { email: updates.email } : {}),
              ...(updates.password !== undefined ? { password: updates.password } : {}),
            }
          : r
      )
    )
    const dbUpdates: Partial<{ email: string; password: string }> = {}
    if (updates.email !== undefined) dbUpdates.email = updates.email
    if (updates.password !== undefined) dbUpdates.password = updates.password
    if (Object.keys(dbUpdates).length > 0) {
      supabase
        .from('team_members')
        .update(dbUpdates)
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('[supabase] updateRepCredential:', error.message) })
    }
  }, [])

  // Clears email/password (removes login ability) but keeps the name in the team list
  const deleteRepCredential = useCallback((id: string) => {
    setTeamMemberRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, email: null, password: null } : r))
    )
    supabase
      .from('team_members')
      .update({ email: null, password: null })
      .eq('id', id)
      .then(({ error }) => { if (error) console.error('[supabase] deleteRepCredential:', error.message) })
  }, [])

  // ── Data reset ────────────────────────────────────────────────────
  const clearData = useCallback(() => {
    const freshLeads = DEMO_LEADS.map((d) => ({ ...d, id: crypto.randomUUID() }))
    const freshTeam: TeamMemberRow[] = DEFAULT_REP_CREDENTIALS.map((c) => ({
      id: crypto.randomUUID(),
      name: c.name,
      email: c.email,
      password: c.password,
      role: 'rep' as const,
      created_at: new Date().toISOString(),
    }))

    clearAllData()
    setLeads(freshLeads)
    setTeamMemberRows(freshTeam)
    setActiveFilters([])
    setSelectedLeadId(null)

    async function resetSupabase() {
      // Wipe and re-seed leads
      await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      const { error: leadsErr } = await supabase.from('leads').insert(freshLeads.map(leadToRow))
      if (leadsErr) console.error('[supabase] clearData leads:', leadsErr.message)

      // Wipe and re-seed team members
      await supabase.from('team_members').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      const { error: teamErr } = await supabase.from('team_members').insert(freshTeam)
      if (teamErr) console.error('[supabase] clearData team_members:', teamErr.message)
    }
    resetSupabase().catch(console.error)
  }, [])

  // ── Context value ─────────────────────────────────────────────────
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
