export function OnlinePresenceBadge({ onlineCount, className = '' }) {
  if (!onlineCount) return null
  return (
    <div
      className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-900 shadow-lg ${className}`}
      role="status"
    >
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" aria-hidden />
      <span>
        <strong>{onlineCount}</strong> subordonné{onlineCount > 1 ? 's' : ''} connecté{onlineCount > 1 ? 's' : ''}
      </span>
    </div>
  )
}
