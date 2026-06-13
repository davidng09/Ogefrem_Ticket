const variants = {
  primary: 'bg-primary text-on-primary border-primary hover:opacity-90',
  secondary: 'bg-surface-lowest text-on-surface border-outline-variant hover:bg-surface-low',
  danger: 'bg-error text-on-error border-error hover:opacity-90',
}

const sizes = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  onClick,
  disabled,
  loading,
  type = 'button',
  children,
  className = '',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded border font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? 'Chargement…' : children}
    </button>
  )
}
