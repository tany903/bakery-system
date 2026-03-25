'use client'

import type { RestockRequestWithDetails } from '@/lib/restock-requests'

interface RestockRequestCardProps {
  request: RestockRequestWithDetails
  onAcknowledge?: (id: string) => void
  onStartProduction?: (id: string) => void
  onFulfill?: (id: string) => void
  onDecline?: (id: string) => void
  showActions?: boolean
  userRole: 'manager' | 'cashier' | 'production'
}

export default function RestockRequestCard({
  request,
  onAcknowledge,
  onStartProduction,
  onFulfill,
  onDecline,
  showActions = true,
  userRole,
}: RestockRequestCardProps) {
const statusColors = {
  requested: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  acknowledged: 'bg-blue-100 text-blue-800 border-blue-300',  // ← Changed back to 'acknowledged'
  in_progress: 'bg-purple-100 text-purple-800 border-purple-300',
  fulfilled: 'bg-green-100 text-green-800 border-green-300',
  partially_fulfilled: 'bg-orange-100 text-orange-800 border-orange-300',
  declined: 'bg-red-100 text-red-800 border-red-300',
  pending: 'bg-gray-100 text-gray-800 border-gray-300',
}

const statusLabels = {
  requested: 'Requested',
  acknowledged: 'Acknowledged',  // ← Changed back to 'acknowledged'
  in_progress: 'In Progress',
  fulfilled: 'Fulfilled',
  partially_fulfilled: 'Partially Fulfilled',
  declined: 'Declined',
  pending: 'Pending',
}

const typeLabels = {
  auto_alert: '🤖 Auto',      // ← Changed from 'auto'
  manual_order: '👤 Manual',  // ← Changed from 'manual'
}

  return (
    <div className="bg-white rounded-lg shadow border-2 border-gray-200 p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-lg font-bold text-gray-900">
              {request.products.name}
            </h3>
            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
            {(typeLabels as any)[request.request_type] || '❓'}
</span>

          </div>
          <p className="text-sm text-gray-600">
            Request #{request.id.slice(0, 8)}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium border ${
            statusColors[request.status]
          }`}
        >
          {statusLabels[request.status]}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Requested Quantity:</span>
          <span className="font-bold text-gray-900">{request.requested_quantity}</span>
        </div>

        {request.fulfilled_quantity !== null && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Fulfilled Quantity:</span>
            <span className="font-bold text-green-600">{request.fulfilled_quantity}</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Current Shop Stock:</span>
          <span className="font-medium text-gray-900">
            {request.products.shop_current_stock}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Production Stock:</span>
          <span className="font-medium text-gray-900">
            {request.products.production_current_stock}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Requested By:</span>
          <span className="font-medium text-gray-900">
            {request.requested_by_profile?.full_name || 'Unknown'}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Requested At:</span>
          <span className="text-gray-900">
            {new Date(request.created_at).toLocaleString()}
          </span>
        </div>

        {request.acknowledged_at && request.acknowledged_by_profile && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Acknowledged By:</span>
            <span className="text-gray-900">
               {request.acknowledged_by_profile?.full_name || 'Unknown'}
            </span>
          </div>
        )}

       {request.completed_at && request.fulfilled_by_profile && (  // ← Changed from fulfilled_at
  <div className="flex justify-between text-sm">
    <span className="text-gray-600">Fulfilled By:</span>
    <span className="text-gray-900">
      {request.fulfilled_by_profile?.full_name || 'Unknown'}
    </span>
  </div>
)}

        {request.notes && request.status !== 'requested' && (
  <div className="pt-2 border-t">
    <p className="text-sm text-gray-600 mb-1">Fulfillment Notes:</p>
    <p className="text-sm text-gray-900">{request.notes}</p>  {/* ← Just use notes, not fulfillment_notes */}
  </div>
)}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex flex-wrap gap-2 pt-4 border-t">
         {/* Production actions */}
{userRole === 'production' || userRole === 'manager' ? (
  <>
    {request.status === 'requested' && onAcknowledge && (
      <button
        onClick={() => onAcknowledge(request.id)}
        className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
      >
        👍 Acknowledge
      </button>
    )}

    {request.status === 'acknowledged' && onStartProduction && (
      <button
        onClick={() => onStartProduction(request.id)}
        className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium"
      >
        🔨 Start Production
      </button>
    )}

    {(request.status === 'acknowledged' || request.status === 'in_progress') && (
      <>
        {onFulfill && (
          <button
            onClick={() => onFulfill(request.id)}
            className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
          >
            ✅ Fulfill
          </button>
        )}
        {onDecline && (
          <button
            onClick={() => onDecline(request.id)}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
          >
            ❌ Decline
          </button>
        )}
      </>
    )}
  </>
) : null}

          {/* Cashier can only view */}
          {userRole === 'cashier' && request.status === 'requested' && (
            <p className="text-sm text-gray-600 italic">
              Waiting for production to acknowledge...
            </p>
          )}
        </div>
      )}
    </div>
  )
}