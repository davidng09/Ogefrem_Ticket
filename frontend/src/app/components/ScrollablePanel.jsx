export function ScrollablePanel({ children, className = '' }) {
  return (
    <div className={`max-h-[60vh] overflow-y-auto ${className}`}>
      {children}
    </div>
  )
}
