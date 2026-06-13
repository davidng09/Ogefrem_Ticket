import { AlertTriangle, Monitor, Package, Warehouse } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Layout } from '../components/layout/Layout'
import { Badge } from '../components/ui/Badge'
import { StatCard } from '../components/ui/StatCard'

export function Dashboard() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/dashboard')
      .then((data) => setStats(data.stats))
      .catch((err) => setError(err.message))
  }, [])

  return (
    <Layout title="Tableau de bord">
      {error && <p className="mb-4 text-sm text-error">{error}</p>}
      {stats && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Package} label="Total équipements" value={stats.total} color="#000000" />
            <StatCard icon={Warehouse} label="En stock" value={stats.en_stock} color="#6B7A99" />
            <StatCard icon={Monitor} label="En service" value={stats.en_service} color="#00C48C" />
            <StatCard
              icon={AlertTriangle}
              label="Garantie expirée"
              value={stats.garantie_expiree}
              color="#FFB020"
              sub="Hors réformés"
            />
          </div>
          <section className="rounded border border-outline-variant bg-surface-lowest p-4">
            <h2 className="mb-3 text-sm font-semibold">Répartition par état</h2>
            <div className="flex flex-wrap gap-2">
              {stats.par_etat?.map((row) => (
                <div key={row.code} className="flex items-center gap-2 rounded border border-outline-variant px-3 py-2">
                  <Badge label={row.label} color={row.couleur} />
                  <span className="text-sm font-semibold">{row.total}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      {!stats && !error && <p className="text-sm text-on-surface-variant">Chargement des statistiques…</p>}
    </Layout>
  )
}
