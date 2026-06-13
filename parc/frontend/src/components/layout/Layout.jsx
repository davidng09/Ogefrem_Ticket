import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function Layout({ title, children }) {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-7">{children}</main>
      </div>
    </div>
  )
}
