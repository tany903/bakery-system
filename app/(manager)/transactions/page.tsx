'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getUserProfile, signOut } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import ManagerSidebar from '@/components/ManagerSidebar'

interface Sale {
  id: string
  sale_number: string
  payment_method: string
  total_amount: number
  cashier_id: string
  created_at: string
  is_voided: boolean
  voided_at: string | null
  void_reason: string | null
  cashier: { full_name: string } | null
  sale_items: {
    id: string
    product_id: string
    product_name: string
    quantity: number
    unit_price: number
    subtotal: number
  }[]
}

interface Transfer {
  id: string
  product_id: string
  quantity: number
  transfer_date: string
  created_at: string
  notes: string | null
  is_voided: boolean
  voided_at: string | null
  void_reason: string | null
  transferred_by_profile: { full_name: string } | null
  product: { name: string } | null
}

type TabType = 'sales' | 'transfers'

export default function TransactionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<TabType>('sales')
  const [error, setError] = useState('')

  // Sales state
  const [sales, setSales] = useState<Sale[]>([])
  const [filteredSales, setFilteredSales] = useState<Sale[]>([])
  const [salesPage, setSalesPage] = useState(1)
  const [filterSaleStatus, setFilterSaleStatus] = useState('all')
  const [filterPayment, setFilterPayment] = useState('all')
  const [filterCashier, setFilterCashier] = useState('all')
  const [filterSaleDateFrom, setFilterSaleDateFrom] = useState('')
  const [filterSaleDateTo, setFilterSaleDateTo] = useState('')
  const [searchSaleNum, setSearchSaleNum] = useState('')

  // Transfers state
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [filteredTransfers, setFilteredTransfers] = useState<Transfer[]>([])
  const [transfersPage, setTransfersPage] = useState(1)
  const [filterTransferStatus, setFilterTransferStatus] = useState('all')
  const [filterTransferDateFrom, setFilterTransferDateFrom] = useState('')
  const [filterTransferDateTo, setFilterTransferDateTo] = useState('')
  const [searchProduct, setSearchProduct] = useState('')

  // Void modal
  const [voidTarget, setVoidTarget] = useState<{ id: string; type: TabType; label: string; detail: string } | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [voidLoading, setVoidLoading] = useState(false)
  const [voidError, setVoidError] = useState('')

  // Detail modal
  const [detailSale, setDetailSale] = useState<Sale | null>(null)

  const itemsPerPage = 10

  useEffect(() => { checkAuth() }, [])
  useEffect(() => { applyFilters() }, [sales, filteredSales, filterSaleStatus, filterPayment, filterCashier, filterSaleDateFrom, filterSaleDateTo, searchSaleNum])
  useEffect(() => { applyTransferFilters() }, [transfers, filterTransferStatus, filterTransferDateFrom, filterTransferDateTo, searchProduct])

  async function checkAuth() {
    const user = await getCurrentUser()
    if (!user) { router.push('/login'); return }
    const profile = await getUserProfile(user.id)
    if (!profile || profile.role !== 'manager') { router.push('/login'); return }
    setCurrentUser({ ...user, ...profile })
    await loadData()
    setLoading(false)
  }

  async function loadData() {
    try {
      const [salesRes, transfersRes] = await Promise.all([
        supabase
          .from('sales')
          .select(`
            *,
            cashier:profiles!sales_cashier_id_fkey (full_name),
            sale_items (*)
          `)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('inventory_transfers')
          .select(`
            *,
            transferred_by_profile:profiles!inventory_transfers_transferred_by_fkey (full_name),
            product:products (name)
          `)
          .order('created_at', { ascending: false })
          .limit(500),
      ])

      if (salesRes.error) throw salesRes.error
      if (transfersRes.error) throw transfersRes.error

      setSales(salesRes.data || [])
      setTransfers(transfersRes.data || [])
    } catch (err: any) {
      setError('Failed to load transactions')
    }
  }

  function applyFilters() {
    setSalesPage(1)
    let result = sales
    if (filterSaleStatus === 'active') result = result.filter(s => !s.is_voided)
    if (filterSaleStatus === 'voided') result = result.filter(s => s.is_voided)
    if (filterPayment !== 'all') result = result.filter(s => s.payment_method === filterPayment)
    if (filterCashier !== 'all') result = result.filter(s => s.cashier?.full_name === filterCashier)
    if (searchSaleNum) result = result.filter(s => s.sale_number.toLowerCase().includes(searchSaleNum.toLowerCase()))
    if (filterSaleDateFrom) result = result.filter(s => new Date(s.created_at) >= new Date(filterSaleDateFrom))
    if (filterSaleDateTo) {
      const to = new Date(filterSaleDateTo)
      to.setHours(23, 59, 59, 999)
      result = result.filter(s => new Date(s.created_at) <= to)
    }
    setFilteredSales(result)
  }

  function applyTransferFilters() {
    setTransfersPage(1)
    let result = transfers
    if (filterTransferStatus === 'active') result = result.filter(t => !t.is_voided)
    if (filterTransferStatus === 'voided') result = result.filter(t => t.is_voided)
    if (searchProduct) result = result.filter(t => t.product?.name?.toLowerCase().includes(searchProduct.toLowerCase()))
    if (filterTransferDateFrom) result = result.filter(t => new Date(t.created_at) >= new Date(filterTransferDateFrom))
    if (filterTransferDateTo) {
      const to = new Date(filterTransferDateTo)
      to.setHours(23, 59, 59, 999)
      result = result.filter(t => new Date(t.created_at) <= to)
    }
    setFilteredTransfers(result)
  }

  function clearSaleFilters() {
    setFilterSaleStatus('all')
    setFilterPayment('all')
    setFilterCashier('all')
    setFilterSaleDateFrom('')
    setFilterSaleDateTo('')
    setSearchSaleNum('')
  }

  function clearTransferFilters() {
    setFilterTransferStatus('all')
    setFilterTransferDateFrom('')
    setFilterTransferDateTo('')
    setSearchProduct('')
  }

  async function handleVoidConfirm() {
    if (!voidTarget || !voidReason.trim()) {
      setVoidError('Please enter a reason for voiding.')
      return
    }
    setVoidLoading(true)
    setVoidError('')
    try {
      const endpoint = voidTarget.type === 'sales'
        ? '/api/transactions/void-sale'
        : '/api/transactions/void-transfer'

      const body = voidTarget.type === 'sales'
        ? { saleId: voidTarget.id, voidReason: voidReason.trim(), managerId: currentUser?.id }
        : { transferId: voidTarget.id, voidReason: voidReason.trim(), managerId: currentUser?.id }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to void')

      if (voidTarget.type === 'sales') {
        setSales(prev => prev.map(s =>
          s.id === voidTarget.id
            ? { ...s, is_voided: true, void_reason: voidReason.trim(), voided_at: new Date().toISOString() }
            : s
        ))
      } else {
        setTransfers(prev => prev.map(t =>
          t.id === voidTarget.id
            ? { ...t, is_voided: true, void_reason: voidReason.trim(), voided_at: new Date().toISOString() }
            : t
        ))
      }

      setVoidTarget(null)
      setVoidReason('')
    } catch (err: any) {
      setVoidError(err.message)
    } finally {
      setVoidLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  const cashierNames = [...new Set(sales.map(s => s.cashier?.full_name).filter(Boolean))] as string[]

  // Sales pagination
  const salesTotalPages = Math.ceil(filteredSales.length / itemsPerPage)
  const paginatedSales = filteredSales.slice((salesPage - 1) * itemsPerPage, salesPage * itemsPerPage)

  // Transfers pagination
  const transfersTotalPages = Math.ceil(filteredTransfers.length / itemsPerPage)
  const paginatedTransfers = filteredTransfers.slice((transfersPage - 1) * itemsPerPage, transfersPage * itemsPerPage)

  // Summary
  const activeRevenue = filteredSales.filter(s => !s.is_voided).reduce((sum, s) => sum + Number(s.total_amount), 0)
  const voidedSales = filteredSales.filter(s => s.is_voided).length
  const voidedTransfers = filteredTransfers.filter(t => t.is_voided).length

  function getPaymentBadge(method: string) {
    const map: Record<string, string> = { cash: '#10B981', online: '#3B82F6' }
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white capitalize"
        style={{ backgroundColor: map[method] || '#6B7280' }}>
        {method}
      </span>
    )
  }

  function getStatusBadge(isVoided: boolean) {
    return isVoided
      ? <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white bg-red-500">Voided</span>
      : <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white bg-green-500">Active</span>
  }

  function renderPagination(currentPage: number, totalPages: number, setPage: (p: number) => void) {
    if (totalPages <= 1) return null
    return (
      <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200">
        <span className="text-xs text-gray-500">Page {currentPage} of {totalPages}</span>
        <div className="flex gap-2">
          <button onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-sm text-xs font-bold disabled:opacity-40"
            style={{ backgroundColor: '#1a2340', color: 'white' }}>← Prev</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((p, idx, arr) => (
              <span key={p} className="flex items-center gap-2">
                {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-xs text-gray-400">...</span>}
                <button onClick={() => setPage(p)} className="px-3 py-1.5 rounded-sm text-xs font-bold"
                  style={currentPage === p
                    ? { backgroundColor: '#1a2340', color: 'white' }
                    : { backgroundColor: 'white', color: '#374151', boxShadow: '2px 2px 7px rgba(0,0,0,0.15)' }}>
                  {p}
                </button>
              </span>
            ))}
          <button onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-sm text-xs font-bold disabled:opacity-40"
            style={{ backgroundColor: '#1a2340', color: 'white' }}>Next →</button>
        </div>
      </div>
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
          <div className="w-10 h-10 rounded-full bg-yellow-300 border-2 border-white flex items-center justify-center">
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
              <h1 className="text-4xl font-black text-gray-900">Transactions</h1>
              <p className="text-gray-700 font-medium mt-1">Manage and void sales & production transfers</p>
            </div>
          </div>

          {error && <div className="mb-4 px-4 py-3 rounded-sm text-sm font-semibold text-white bg-red-500">{error}</div>}

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            <div className="bg-white rounded-sm p-4" style={{ boxShadow: '0px 0px 10px rgba(0,0,0,0.15)' }}>
              <p className="text-xs font-bold text-gray-500">Active Revenue</p>
              <p className="text-2xl font-black text-gray-900 mt-1">₱{activeRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white rounded-sm p-4" style={{ boxShadow: '0px 0px 10px rgba(0,0,0,0.15)' }}>
              <p className="text-xs font-bold text-gray-500">Total Sales</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{filteredSales.length}</p>
            </div>
            <div className="bg-white rounded-sm p-4" style={{ boxShadow: '0px 0px 10px rgba(0,0,0,0.15)' }}>
              <p className="text-xs font-bold text-gray-500">Voided Sales</p>
              <p className="text-2xl font-black text-red-500 mt-1">{voidedSales}</p>
            </div>
            <div className="bg-white rounded-sm p-4" style={{ boxShadow: '0px 0px 10px rgba(0,0,0,0.15)' }}>
              <p className="text-xs font-bold text-gray-500">Voided Transfers</p>
              <p className="text-2xl font-black text-red-500 mt-1">{voidedTransfers}</p>
            </div>
          </div>

          {/* TABS */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setActiveTab('sales')}
              className="px-5 py-2 rounded-sm text-sm font-black transition-colors"
              style={activeTab === 'sales'
                ? { backgroundColor: '#1a2340', color: 'white' }
                : { backgroundColor: 'white', color: '#374151', boxShadow: '2px 2px 7px rgba(0,0,0,0.15)' }}
            >
              🧾 Sales
            </button>
            <button
              onClick={() => setActiveTab('transfers')}
              className="px-5 py-2 rounded-sm text-sm font-black transition-colors"
              style={activeTab === 'transfers'
                ? { backgroundColor: '#1a2340', color: 'white' }
                : { backgroundColor: 'white', color: '#374151', boxShadow: '2px 2px 7px rgba(0,0,0,0.15)' }}
            >
              📦 Production Transfers
            </button>
          </div>

          {/* ── SALES TAB ── */}
          {activeTab === 'sales' && (
            <>
              {/* Sales Filters */}
              <div className="bg-white rounded-sm p-4 mb-5 grid grid-cols-2 lg:grid-cols-6 gap-3 text-gray-900" style={{ boxShadow: '0px 0px 10px rgba(0,0,0,0.15)' }}>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Search</label>
                  <input type="text" placeholder="Sale #..." value={searchSaleNum}
                    onChange={e => setSearchSaleNum(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-sm border border-gray-200 bg-gray-50 focus:outline-none text-gray-900 placeholder-gray-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Status</label>
                  <select value={filterSaleStatus} onChange={e => setFilterSaleStatus(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-sm border border-gray-200 bg-gray-50 focus:outline-none">
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="voided">Voided</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Payment</label>
                  <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-sm border border-gray-200 bg-gray-50 focus:outline-none">
                    <option value="all">All Methods</option>
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Cashier</label>
                  <select value={filterCashier} onChange={e => setFilterCashier(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-sm border border-gray-200 bg-gray-50 focus:outline-none">
                    <option value="all">All Cashiers</option>
                    {cashierNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">From</label>
                  <input type="date" value={filterSaleDateFrom} onChange={e => setFilterSaleDateFrom(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-sm border border-gray-200 bg-gray-50 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">To</label>
                  <input type="date" value={filterSaleDateTo} onChange={e => setFilterSaleDateTo(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-sm border border-gray-200 bg-gray-50 focus:outline-none" />
                </div>
              </div>

              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-bold text-gray-700">{filteredSales.length} record{filteredSales.length !== 1 ? 's' : ''} found</p>
                <button onClick={clearSaleFilters}
                  className="flex items-center gap-2 px-4 py-2 rounded-sm font-bold text-gray-900 text-sm"
                  style={{ backgroundColor: 'white', boxShadow: '2px 2px 7px rgba(0,0,0,0.2)' }}>
                  ✕ Clear Filters
                </button>
              </div>

              {filteredSales.length === 0 ? (
                <div className="bg-white rounded-sm flex flex-col items-center justify-center py-16" style={{ boxShadow: '0px 0px 10px rgba(0,0,0,0.3)' }}>
                  <div className="text-5xl mb-3">🧾</div>
                  <p className="text-lg font-bold text-gray-600">No sales found</p>
                  <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="bg-white rounded-sm overflow-hidden" style={{ boxShadow: '0px 0px 10px rgba(0,0,0,0.3)' }}>
                  <div className="flex items-center gap-2 px-5 py-4" style={{ backgroundColor: '#1a2340' }}>
                    <span className="text-white text-lg">🧾</span>
                    <h2 className="font-bold text-white">Sales History</h2>
                    <span className="ml-auto text-xs text-white opacity-60">{filteredSales.length} records</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                          <th className="px-5 py-3 font-semibold">Date & Time</th>
                          <th className="px-5 py-3 font-semibold">Sale #</th>
                          <th className="px-5 py-3 font-semibold">Cashier</th>
                          <th className="px-5 py-3 font-semibold">Payment</th>
                          <th className="px-5 py-3 font-semibold">Items</th>
                          <th className="px-5 py-3 font-semibold">Total</th>
                          <th className="px-5 py-3 font-semibold">Status</th>
                          <th className="px-5 py-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedSales.map((sale) => (
                          <tr key={sale.id}
                            className={`border-b border-gray-100 last:border-0 transition-colors ${sale.is_voided ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                            <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                              {new Date(sale.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-5 py-3 text-sm font-bold text-gray-800 whitespace-nowrap">
                              <span className={sale.is_voided ? 'line-through text-gray-400' : ''}>{sale.sale_number}</span>
                            </td>
                            <td className="px-5 py-3 text-xs text-gray-600 whitespace-nowrap">{sale.cashier?.full_name || '—'}</td>
                            <td className="px-5 py-3">{getPaymentBadge(sale.payment_method)}</td>
                            <td className="px-5 py-3 text-xs text-gray-500">{sale.sale_items?.length ?? 0} item{(sale.sale_items?.length ?? 0) !== 1 ? 's' : ''}</td>
                            <td className="px-5 py-3 text-sm font-black text-gray-800 whitespace-nowrap">
                              <span className={sale.is_voided ? 'line-through text-gray-400' : ''}>
                                ₱{Number(sale.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="px-5 py-3">{getStatusBadge(sale.is_voided)}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <button onClick={() => setDetailSale(sale)}
                                  className="text-xs font-bold px-3 py-1.5 rounded-sm text-white"
                                  style={{ backgroundColor: '#1a2340' }}>
                                  View
                                </button>
                                {!sale.is_voided && (
                                  <button
                                    onClick={() => {
                                      setVoidTarget({
                                        id: sale.id,
                                        type: 'sales',
                                        label: sale.sale_number,
                                        detail: `₱${Number(sale.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })} • ${sale.sale_items?.length ?? 0} item(s) • Cashier: ${sale.cashier?.full_name || '—'}`,
                                      })
                                      setVoidReason('')
                                      setVoidError('')
                                    }}
                                    className="text-xs font-bold px-3 py-1.5 rounded-sm text-white bg-red-500 hover:bg-red-600 transition-colors">
                                    Void
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderPagination(salesPage, salesTotalPages, setSalesPage)}
                </div>
              )}
            </>
          )}

          {/* ── TRANSFERS TAB ── */}
          {activeTab === 'transfers' && (
            <>
              {/* Transfer Filters */}
              <div className="bg-white rounded-sm p-4 mb-5 grid grid-cols-2 lg:grid-cols-4 gap-3 text-gray-900" style={{ boxShadow: '0px 0px 10px rgba(0,0,0,0.15)' }}>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Search Product</label>
                  <input type="text" placeholder="Product name..." value={searchProduct}
                    onChange={e => setSearchProduct(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-sm border border-gray-200 bg-gray-50 focus:outline-none text-gray-900 placeholder-gray-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Status</label>
                  <select value={filterTransferStatus} onChange={e => setFilterTransferStatus(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-sm border border-gray-200 bg-gray-50 focus:outline-none">
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="voided">Voided</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">From</label>
                  <input type="date" value={filterTransferDateFrom} onChange={e => setFilterTransferDateFrom(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-sm border border-gray-200 bg-gray-50 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">To</label>
                  <input type="date" value={filterTransferDateTo} onChange={e => setFilterTransferDateTo(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-sm border border-gray-200 bg-gray-50 focus:outline-none" />
                </div>
              </div>

              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-bold text-gray-700">{filteredTransfers.length} record{filteredTransfers.length !== 1 ? 's' : ''} found</p>
                <button onClick={clearTransferFilters}
                  className="flex items-center gap-2 px-4 py-2 rounded-sm font-bold text-gray-900 text-sm"
                  style={{ backgroundColor: 'white', boxShadow: '2px 2px 7px rgba(0,0,0,0.2)' }}>
                  ✕ Clear Filters
                </button>
              </div>

              {filteredTransfers.length === 0 ? (
                <div className="bg-white rounded-sm flex flex-col items-center justify-center py-16" style={{ boxShadow: '0px 0px 10px rgba(0,0,0,0.3)' }}>
                  <div className="text-5xl mb-3">📦</div>
                  <p className="text-lg font-bold text-gray-600">No transfers found</p>
                  <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="bg-white rounded-sm overflow-hidden" style={{ boxShadow: '0px 0px 10px rgba(0,0,0,0.3)' }}>
                  <div className="flex items-center gap-2 px-5 py-4" style={{ backgroundColor: '#1a2340' }}>
                    <span className="text-white text-lg">📦</span>
                    <h2 className="font-bold text-white">Production Transfer History</h2>
                    <span className="ml-auto text-xs text-white opacity-60">{filteredTransfers.length} records</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                          <th className="px-5 py-3 font-semibold">Date & Time</th>
                          <th className="px-5 py-3 font-semibold">Product</th>
                          <th className="px-5 py-3 font-semibold">Quantity</th>
                          <th className="px-5 py-3 font-semibold">Transferred By</th>
                          <th className="px-5 py-3 font-semibold">Notes</th>
                          <th className="px-5 py-3 font-semibold">Status</th>
                          <th className="px-5 py-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedTransfers.map((transfer) => (
                          <tr key={transfer.id}
                            className={`border-b border-gray-100 last:border-0 transition-colors ${transfer.is_voided ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                            <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                              {new Date(transfer.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-5 py-3 text-sm font-semibold text-gray-800 whitespace-nowrap">
                              <span className={transfer.is_voided ? 'line-through text-gray-400' : ''}>{transfer.product?.name || '—'}</span>
                            </td>
                            <td className="px-5 py-3 text-sm font-black whitespace-nowrap">
                              <span className={transfer.is_voided ? 'line-through text-gray-400' : 'text-gray-800'}>
                                {transfer.quantity} units
                              </span>
                            </td>
                            <td className="px-5 py-3 text-xs text-gray-600 whitespace-nowrap">
                              {transfer.transferred_by_profile?.full_name || '—'}
                            </td>
                            <td className="px-5 py-3 text-xs text-gray-400 max-w-xs truncate">{transfer.notes || '—'}</td>
                            <td className="px-5 py-3">{getStatusBadge(transfer.is_voided)}</td>
                            <td className="px-5 py-3">
                              {!transfer.is_voided ? (
                                <button
                                  onClick={() => {
                                    setVoidTarget({
                                      id: transfer.id,
                                      type: 'transfers',
                                      label: `Transfer — ${transfer.product?.name || '—'}`,
                                      detail: `${transfer.quantity} units • By: ${transfer.transferred_by_profile?.full_name || '—'}`,
                                    })
                                    setVoidReason('')
                                    setVoidError('')
                                  }}
                                  className="text-xs font-bold px-3 py-1.5 rounded-sm text-white bg-red-500 hover:bg-red-600 transition-colors">
                                  Void
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400 italic">
                                  Voided {transfer.voided_at ? new Date(transfer.voided_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : ''}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderPagination(transfersPage, transfersTotalPages, setTransfersPage)}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* VOID MODAL */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-sm w-full max-w-md mx-4 overflow-hidden" style={{ boxShadow: '0px 0px 30px rgba(0,0,0,0.3)' }}>
            <div className="px-6 py-4" style={{ backgroundColor: '#220901' }}>
              <h2 className="text-white font-black text-lg">Void Transaction</h2>
              <p className="text-red-200 text-xs mt-0.5">This action cannot be undone</p>
            </div>
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-sm p-3 mb-4">
                <p className="text-xs font-bold text-red-700">{voidTarget.label}</p>
                <p className="text-xs text-red-600 mt-1">{voidTarget.detail}</p>
                {voidTarget.type === 'sales' && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">⚠ Shop stock will be restored for all items.</p>
                )}
                {voidTarget.type === 'transfers' && (
                  <p className="text-xs text-red-600 mt-1 font-semibold">⚠ Shop stock will be reduced and production stock restored.</p>
                )}
              </div>
              <label className="text-xs font-bold text-gray-700 mb-1 block">Reason for voiding *</label>
              <textarea
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                placeholder="Enter reason (e.g. wrong quantity, duplicate entry...)"
                rows={3}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-sm focus:outline-none resize-none bg-gray-50 text-gray-900 placeholder-gray-400"
              />
              {voidError && <p className="text-xs text-red-500 font-semibold mt-2">{voidError}</p>}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setVoidTarget(null); setVoidReason(''); setVoidError('') }}
                  className="flex-1 px-4 py-2 rounded-sm text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleVoidConfirm}
                  disabled={voidLoading || !voidReason.trim()}
                  className="flex-1 px-4 py-2 rounded-sm text-sm font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors">
                  {voidLoading ? 'Voiding...' : 'Confirm Void'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SALE DETAIL MODAL */}
      {detailSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-sm w-full max-w-lg mx-4 overflow-hidden" style={{ boxShadow: '0px 0px 30px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '#1a2340' }}>
              <div>
                <h2 className="text-white font-black text-lg">{detailSale.sale_number}</h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  {new Date(detailSale.created_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => setDetailSale(null)} className="text-gray-400 hover:text-white text-xl font-bold">✕</button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-xs text-gray-500 font-bold">Cashier</p>
                  <p className="text-sm font-semibold text-gray-800">{detailSale.cashier?.full_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold">Payment</p>
                  <div className="mt-0.5">{getPaymentBadge(detailSale.payment_method)}</div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold">Status</p>
                  <div className="mt-0.5">{getStatusBadge(detailSale.is_voided)}</div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold">Total</p>
                  <p className="text-sm font-black text-gray-900">₱{Number(detailSale.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              {detailSale.is_voided && (
                <div className="bg-red-50 border border-red-200 rounded-sm p-3 mb-4">
                  <p className="text-xs font-bold text-red-700">
                    Voided on {detailSale.voided_at ? new Date(detailSale.voided_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                  <p className="text-xs text-red-600 mt-1">Reason: {detailSale.void_reason}</p>
                </div>
              )}

              <p className="text-xs font-bold text-gray-500 mb-2">Items ({detailSale.sale_items?.length ?? 0})</p>
              <div className="border border-gray-200 rounded-sm overflow-hidden mb-4">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
                      <th className="px-3 py-2 text-left font-semibold">Product</th>
                      <th className="px-3 py-2 text-center font-semibold">Qty</th>
                      <th className="px-3 py-2 text-right font-semibold">Unit Price</th>
                      <th className="px-3 py-2 text-right font-semibold">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detailSale.sale_items || []).map(item => (
                      <tr key={item.id} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-2 text-xs text-gray-800 font-medium">{item.product_name}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 text-center">{item.quantity}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 text-right">₱{Number(item.unit_price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-xs font-bold text-gray-800 text-right">₱{Number(item.subtotal).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td colSpan={3} className="px-3 py-2 text-xs font-bold text-gray-700 text-right">Total</td>
                      <td className="px-3 py-2 text-sm font-black text-gray-900 text-right">₱{Number(detailSale.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <button onClick={() => setDetailSale(null)}
                className="w-full px-4 py-2 rounded-sm text-sm font-bold text-white"
                style={{ backgroundColor: '#1a2340' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
