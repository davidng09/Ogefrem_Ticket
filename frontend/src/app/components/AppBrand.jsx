import { Link } from 'react-router-dom'

export function AppBrand({ linkTo, className = '' }) {
  const content = (
    <>
      <img
        src="/ogefrem_LOGO.png"
        alt="OGEFREM"
        className="h-9 w-auto shrink-0 rounded-sm object-contain"
      />
      <span className="text-sm font-semibold text-primary md:text-base">OGEFREM Tickets</span>
    </>
  )

  const classes = `inline-flex items-center gap-2 ${className}`.trim()

  if (linkTo) {
    return (
      <Link to={linkTo} className={classes}>
        {content}
      </Link>
    )
  }

  return <div className={classes}>{content}</div>
}
