'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile, signOut } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import ManagerSidebar from '@/components/ManagerSidebar'

interface CashEntry {
  id: string
  created_at: string
  type: 'float' | 'cash_in' | 'cash_out'
  amount: number
  notes: string | null
  profiles: { full_name: string } | null
}

export default function CashRegisterLogPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<CashEntry[]>([])
  const [filtered, setFiltered] = useState<CashEntry[]>([])
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filters
  const [filterType, setFilterType] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  useEffect(() => { checkAuth() }, [])
  useEffect(() => { applyFilters() }, [entries, filterType, filterDateFrom, filterDateTo])

  async function checkAuth() {
    const user = await getCurrentUser()
    if (!user) { router.push('/login'); return }
    const profile = await getUserProfile(user.id)
    if (!profile || profile.role !== 'manager') { router.push('/login'); return }
    await loadData()
    setLoading(false)
  }

  async function loadData() {
    try {
      const { data, error: err } = await supabase
        .from('cash_register')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(500)
      if (err) throw err
      setEntries(data || [])
    } catch {
      setError('Failed to load cash register log')
    }
  }

  function applyFilters() {
    setCurrentPage(1)
    let result = entries

    if (filterType !== 'all') result = result.filter(e => e.type === filterType)

    if (filterDateFrom) result = result.filter(e => new Date(e.created_at) >= new Date(filterDateFrom))
    if (filterDateTo) {
      const to = new Date(filterDateTo)
      to.setHours(23, 59, 59, 999)
      result = result.filter(e => new Date(e.created_at) <= to)
    }

    setFiltered(result)
  }

  function clearFilters() {
    setFilterType('all')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  const handleLogout = async () => { await signOut(); router.push('/login') }

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Summary totals from filtered
  const totalCashIn = filtered.filter(e => e.type === 'cash_in').reduce((sum, e) => sum + Number(e.amount), 0)
  const totalCashOut = filtered.filter(e => e.type === 'cash_out').reduce((sum, e) => sum + Number(e.amount), 0)
  const totalFloat = filtered.filter(e => e.type === 'float').reduce((sum, e) => sum + Number(e.amount), 0)

  // const sidebarLinks = [
  //   { href: '/restock-requests', icon: '/icons/Plus_square.svg', label: 'Restock' },
  //   { href: '/inventory', icon: '/icons/Box.svg', label: 'Inventory' },
  //   { href: '/expenses', icon: '/icons/payment.svg', label: 'Expenses' },
  //   { href: '/analytics', icon: '/icons/Bar_chart.svg', label: 'Analytics' },
  //   { href: '/users', icon: '/icons/person.svg', label: 'Staff' },
  //   { href: '/products', icon: '/icons/Tag.svg', label: 'Products' },
  //   { href: '/ingredients', icon: '/icons/flour.svg', label: 'Ingredients' },
  //   { href: '/audit-logs', icon: '/icons/Book.svg', label: 'Audit' },
  //   { href: '/dashboard', icon: '/icons/menu.svg', label: 'Dashboard', active: true },
  // ]

  function getTypeBadge(type: string) {
    const map: Record<string, { label: string; color: string }> = {
      float:    { label: 'Float',    color: '#F5A623' },
      cash_in:  { label: 'Cash In',  color: '#10B981' },
      cash_out: { label: 'Cash Out', color: '#EF4444' },
    }
    const t = map[type] || { label: type, color: '#6B7280' }
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: t.color }}>
        {t.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5A623' }}>
        <div className="text-2xl font-black text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5A623' }}>

      {/* TOP NAVBAR */}
      <div className="w-full flex items-center justify-between px-6 py-3 shrink-0 z-10" style={{ backgroundColor: '#7B1111' }}>
        <div className="flex items-center gap-3">
          <span className="text-white font-black text-xl tracking-wide">IS FREDS</span>
          <div className="w-10 h-10 rounded-full bg-yellow-300 border-2 border-white flex items-center justify-center overflow-hidden">
            <img src="/FREDS_ICON1.png" alt="Logo" className="w-10 h-10 object-contain" />
          </div>
          <span className="text-white font-black text-xl tracking-wide">IS GOOD</span>
        </div>
        <button onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 px-5 py-2 bg-white rounded-sm text-gray-800 hover:bg-gray-100 transition-colors">
          <span className="text-base font-bold">→</span>
          <span className="text-xs font-semibold">Logout</span>
        </button>
      </div>

      {/* BODY */}
      <div className="flex flex-1 relative">

        {/* Watermark */}
        <img src="/logo-big.png" alt="" className="fixed pointer-events-none select-none"
          style={{ opacity: 0.3, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '50%', height: 'auto', zIndex: 0 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />

        {/* SIDEBAR */}
             <ManagerSidebar />

        {/* MAIN CONTENT */}
        <div className="relative z-10 flex-1 p-6 overflow-y-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-black text-gray-900">Cash Register Log</h1>
              <p className="text-gray-700 font-medium mt-1">{filtered.length} record{filtered.length !== 1 ? 's' : ''} found</p>
            </div>
            <div className="flex gap-3">
              <a href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-sm font-bold text-gray-900 text-sm no-underline"
                style={{ backgroundColor: 'white', boxShadow: '2px 2px 7px rgba(0,0,0,0.2)' }}>
                ← Back to Dashboard
              </a>
              <button onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 rounded-sm font-bold text-gray-900 text-sm"
                style={{ backgroundColor: 'white', boxShadow: '2px 2px 7px rgba(0,0,0,0.2)' }}>
                ✕ Clear Filters
              </button>
            </div>
          </div>

          {error && <div className="mb-4 px-4 py-3 rounded-sm text-sm font-semibold text-white bg-red-500">{error}</div>}

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-sm p-6" style={{ backgroundColor: '#220901', boxShadow: '4px 4px 10px rgba(0,0,0,0.3)' }}>
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-2 opacity-60">Total Float</p>
              <p className="text-3xl font-black text-white">₱{totalFloat.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="rounded-sm p-6" style={{ backgroundColor: '#220901', boxShadow: '4px 4px 10px rgba(0,0,0,0.3)' }}>
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-2 opacity-60">Total Cash In</p>
              <p className="text-3xl font-black text-green-400">₱{totalCashIn.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="rounded-sm p-6" style={{ backgroundColor: '#220901', boxShadow: '4px 4px 10px rgba(0,0,0,0.3)' }}>
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-2 opacity-60">Total Cash Out</p>
              <p className="text-3xl font-black text-red-400">₱{totalCashOut.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* FILTERS */}
          <div className="bg-white rounded-sm p-4 mb-5 grid grid-cols-2 lg:grid-cols-4 gap-3 text-gray-900"
            style={{ boxShadow: '0px 0px 10px rgba(0,0,0,0.15)' }}>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Type</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-sm border border-gray-200 bg-gray-50 focus:outline-none">
                <option value="all">All Types</option>
                <option value="float">Float</option>
                <option value="cash_in">Cash In</option>
                <option value="cash_out">Cash Out</option>
              </select>
            </div>
            <div /> {/* spacer */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">From</label>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-sm border border-gray-200 bg-gray-50 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">To</label>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-sm border border-gray-200 bg-gray-50 focus:outline-none" />
            </div>
          </div>

          {/* TABLE */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-sm flex flex-col items-center justify-center py-16" style={{ boxShadow: '0px 0px 10px rgba(0,0,0,0.3)' }}>
              <div className="text-5xl mb-3">💵</div>
              <p className="text-lg font-bold text-gray-600">No records found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="bg-white rounded-sm overflow-hidden" style={{ boxShadow: '0px 0px 10px rgba(0,0,0,0.3)' }}>
              <div className="flex items-center gap-2 px-5 py-4" style={{ backgroundColor: '#1a2340' }}>
                <img src="/icons/Book.svg" alt="" className="w-5 h-5" style={{ filter: 'brightness(0) invert(1)' }} />
                <h2 className="font-bold text-white">Cash Register History</h2>
                <span className="ml-auto text-xs text-white opacity-60">{filtered.length} records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                      <th className="px-5 py-3 font-semibold">Date & Time</th>
                      <th className="px-5 py-3 font-semibold">Type</th>
                      <th className="px-5 py-3 font-semibold">Amount</th>
                      <th className="px-5 py-3 font-semibold">By</th>
                      <th className="px-5 py-3 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })}
                        </td>
                        <td className="px-5 py-3">{getTypeBadge(entry.type)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-sm font-black ${entry.type === 'cash_out' ? 'text-red-500' : entry.type === 'cash_in' ? 'text-green-600' : 'text-gray-900'}`}>
                            {entry.type === 'cash_out' ? '-' : '+'}₱{Number(entry.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {(entry.profiles as any)?.full_name || '—'}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-400 max-w-xs truncate">{entry.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200">
                  <span className="text-xs text-gray-500">
                    Page {currentPage} of {totalPages} — {filtered.length} total records
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-sm text-xs font-bold disabled:opacity-40"
                      style={{ backgroundColor: '#1a2340', color: 'white' }}>
                      ← Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, idx, arr) => (
                        <span key={p} className="flex items-center gap-2">
                          {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-xs text-gray-400">...</span>}
                          <button onClick={() => setCurrentPage(p)}
                            className="px-3 py-1.5 rounded-sm text-xs font-bold"
                            style={currentPage === p
                              ? { backgroundColor: '#1a2340', color: 'white' }
                              : { backgroundColor: 'white', color: '#374151', boxShadow: '2px 2px 7px rgba(0,0,0,0.15)' }}>
                            {p}
                          </button>
                        </span>
                      ))}
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-sm text-xs font-bold disabled:opacity-40"
                      style={{ backgroundColor: '#1a2340', color: 'white' }}>
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
