import { Archive, BarChart3, CalendarDays, FileText, Inbox, AlertTriangle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DirectorMonthlyReports } from '../components/DirectorMonthlyReports'
import { UnresolvedConstraintsPanel } from '../components/UnresolvedConstraintsPanel'
import { DashboardTabNavItem } from '../components/DashboardTabButton'
import { ExecutiveDashboard } from '../components/ExecutiveDashboard'
import { RefreshButton } from '../components/RefreshButton'
import { Modal } from '../components/Modal'
import { OpenTicketsPanel } from '../components/OpenTicketsPanel'
import { PaginatedReportsPanel } from '../components/PaginatedReportsPanel'
import { apiRequest } from '../api'
import { useReportTabStats, useTicketTabStats } from '../hooks/useTabStats'
import { useSeenTabCounts } from '../hooks/useSeenTabCounts'
import { applyWorkspaceSearchParams } from '../workspaceNavigation'

function ReportDetailModal({ report, open, onClose, onValidate, onReject, comment, setComment }) {
  if (!report) return null
  return (
    <Modal open={open} onClose={onClose} title={`Rapport — ${report.ticket_number}`} wide>
      <div className="space-y-3 text-sm">
        <p className="text-xs text-on-surface-variant">
          Ticket : {report.ticket_number} — {report.category_label}
        </p>
        <p className="text-xs text-on-surface-variant">Auteur : {report.author_name}</p>
        <p className="rounded border border-outline-variant bg-surface-low p-3 whitespace-pre-wrap">
          {report.body}
        </p>
        <textarea
          placeholder="Commentaire (rejet ou validation)"
          className="w-full rounded border border-outline-variant p-2 text-sm"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded bg-primary px-3 py-2 text-xs text-on-primary"
            onClick={() => onValidate(report.id)}
          >
            Valider le rapport
          </button>
          <button
            type="button"
            className="rounded border border-error px-3 py-2 text-xs text-error"
            onClick={() => onReject(report.id)}
          >
            Rejeter le rapport
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function DirectorDashboard() {
  const [searchParams] = useSearchParams()
  const [notice, setNotice] = useState('')
  const [reportModal, setReportModal] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [comment, setComment] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [focusTicketId, setFocusTicketId] = useState(null)
  const [monthlyCount, setMonthlyCount] = useState(0)
  const [dashboardRefreshToken, setDashboardRefreshToken] = useState(0)
  const [openPanelRefreshToken, setOpenPanelRefreshToken] = useState(0)

  const openStats = useTicketTabStats(null, 'open')
  const reportStats = useReportTabStats('director')

  const tabs = useMemo(
    () => [
      {
        id: 'dashboard',
        label: 'Tableau de bord',
        icon: BarChart3,
        title: 'Pilotage DANTIC',
        subtitle: 'Indicateurs, tendances et alertes SLA',
        count: 0,
      },
      {
        id: 'open',
        label: 'Tickets ouverts',
        icon: Inbox,
        title: 'Tickets ouverts',
        subtitle: 'Incidents en cours de traitement',
        count: openStats.stats?.total ?? 0,
        variant: 'priority',
        priority: openStats.stats?.priority,
      },
      {
        id: 'reports',
        label: 'Rapports',
        icon: FileText,
        title: 'Rapports ticket',
        subtitle: 'En attente de validation directrice',
        count: reportStats.stats?.total ?? pendingCount,
      },
      {
        id: 'monthly',
        label: 'Mensuels',
        icon: CalendarDays,
        title: 'Rapports mensuels sous-directions',
        subtitle: 'Lecture, commentaire et archivage',
        count: monthlyCount,
      },
      {
        id: 'archives',
        label: 'Archives officielles',
        icon: Archive,
        title: 'Archives officielles',
        subtitle: 'Rapports ticket validés par la directrice (copie immuable)',
        count: 0,
      },
      {
        id: 'constraints',
        label: 'Contraintes',
        icon: AlertTriangle,
        title: 'Contraintes / non résolu',
        subtitle: 'Tickets clôturés non résolus et consignes de pilotage',
        count: 0,
      },
    ],
    [pendingCount, monthlyCount, openStats.stats, reportStats.stats],
  )

  const tabTotals = useMemo(
    () => Object.fromEntries(tabs.map((t) => [t.id, t.count])),
    [tabs],
  )
  const { hasNew, wasConsulted } = useSeenTabCounts(activeTab, tabTotals)

  const activeTabMeta = tabs.find((t) => t.id === activeTab)

  async function loadCounts() {
    try {
      const [pending, monthly] = await Promise.all([
        apiRequest('/reports?scope=director&group_by=month&page=1&per_page=1'),
        apiRequest('/periodic/monthly-reports?visibility=active&page=1&per_page=1'),
      ])
      setPendingCount(pending.pagination?.total ?? (pending.reports?.length || 0))
      setMonthlyCount(monthly.pagination?.total ?? (monthly.reports?.length || 0))
    } catch {
      setPendingCount(0)
      setMonthlyCount(0)
    }
    reportStats.reload()
    openStats.reload()
    setDashboardRefreshToken((t) => t + 1)
    setOpenPanelRefreshToken((t) => t + 1)
  }

  useEffect(() => {
    loadCounts()
  }, [])

  useEffect(() => {
    applyWorkspaceSearchParams(searchParams, {
      setTab: setActiveTab,
      setFocusTicketId,
    })
  }, [searchParams])

  function showNotice(msg) {
    setNotice(msg)
    setTimeout(() => setNotice(''), 2600)
  }

  async function validateReport(reportId) {
    await apiRequest(`/reports/${reportId}/validate`, {
      method: 'POST',
      body: JSON.stringify({ decision: 'approuve', comment }),
    })
    setComment('')
    setReportModal(null)
    showNotice('Rapport validé et archivé.')
    loadCounts()
  }

  async function rejectReport(reportId) {
    if (!comment.trim()) {
      showNotice('Un commentaire est requis pour rejeter le rapport.')
      return
    }
    await apiRequest(`/reports/${reportId}/validate`, {
      method: 'POST',
      body: JSON.stringify({ decision: 'rejete', comment: comment.trim() }),
    })
    setComment('')
    setReportModal(null)
    showNotice('Rapport rejeté — renvoyé à la sous-direction.')
    loadCounts()
  }

  return (
    <div className="space-y-4">
      {notice && (
        <div className="notice-info fixed right-4 top-4 z-40 rounded border px-3 py-2 text-sm shadow">
          {notice}
        </div>
      )}

      <nav className="sticky top-0 z-10 flex flex-wrap items-center gap-0 border-b border-outline-variant bg-surface/95 backdrop-blur">
        <div className="flex flex-wrap items-stretch">
          {tabs.map((tab) => (
            <DashboardTabNavItem
              key={tab.id}
              label={tab.label}
              icon={tab.icon}
              count={tab.count}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              hasNew={hasNew(tab.id)}
              variant={tab.id === 'open' ? 'priority' : 'simple'}
              priority={tab.id === 'open' ? tab.priority : undefined}
              consulted={tab.id === 'open' ? wasConsulted('open') : true}
            />
          ))}
        </div>
        {activeTabMeta && (
          <div className="flex min-w-0 flex-1 items-center gap-2 border-l border-outline-variant px-4 py-2">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold">{activeTabMeta.title}</h2>
              <p className="truncate text-xs text-on-surface-variant">{activeTabMeta.subtitle}</p>
            </div>
            <RefreshButton onRefresh={loadCounts} className="shrink-0" />
          </div>
        )}
      </nav>

      {activeTab === 'dashboard' && (
        <section className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
          <ExecutiveDashboard
            showSubDirectorateFilter
            showRefreshButton={false}
            refreshToken={dashboardRefreshToken}
            onNavigateToOpenTickets={() => setActiveTab('open')}
          />
        </section>
      )}

      {activeTab === 'open' && (
        <OpenTicketsPanel
          itemLabel="incidents"
          showSubDirectorateFilter
          showRefreshButton={false}
          refreshToken={openPanelRefreshToken}
        />
      )}

      {activeTab === 'reports' && (
        <PaginatedReportsPanel
          endpoint="/reports?scope=director"
          emptyMessage="Aucun rapport en attente."
          onSelectReport={setReportModal}
        />
      )}

      {activeTab === 'monthly' && (
        <section className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
          <DirectorMonthlyReports onNotice={showNotice} archived={false} />
        </section>
      )}

      {activeTab === 'archives' && (
        <>
          <section className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
            <div className="p-3">
              <DirectorMonthlyReports onNotice={showNotice} archived />
            </div>
          </section>
          <section className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
            <div className="border-b border-outline-variant p-3">
              <h3 className="font-semibold">Rapports ticket — archives officielles</h3>
              <p className="text-xs text-on-surface-variant">
                Copie immuable après validation directrice (distinct de l&apos;historique agent)
              </p>
            </div>
            <PaginatedReportsPanel
              endpoint="/reports/validated"
              emptyMessage="Aucun rapport archivé."
              variant="table"
            />
          </section>
        </>
      )}

      {activeTab === 'constraints' && (
        <UnresolvedConstraintsPanel focusTicketId={focusTicketId} />
      )}

      <ReportDetailModal
        report={reportModal}
        open={Boolean(reportModal)}
        onClose={() => setReportModal(null)}
        onValidate={validateReport}
        onReject={rejectReport}
        comment={comment}
        setComment={setComment}
      />
    </div>
  )
}
