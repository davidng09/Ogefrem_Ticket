import { FileUp, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest } from '../api'
import { useAuth } from '../AuthContext'
import { formatSubDirectorateCompact, getUserSubDirectorateId, subDirectorates } from '../uiHelpers'
import { getDefaultReportMonth } from '../utils/calendarWeeks'
import { ScrollablePanel } from '../components/ScrollablePanel'

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export function MonthlyRedactorInbox({ onNotice }) {
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const defaultPeriod = getDefaultReportMonth()
  const defaultSubDirectorateId = useMemo(() => getUserSubDirectorateId(user), [user])
  const isFieldStaff = ['TECHNICIEN', 'CHEF_BUREAU'].includes(user?.role_code)
  const canUploadMonthlyToDirector = ['TECHNICIEN', 'CHEF_BUREAU', 'SOUS_DIRECTEUR'].includes(user?.role_code)
  const [bundles, setBundles] = useState([])
  const [file, setFile] = useState(null)
  const [year, setYear] = useState(defaultPeriod.year)
  const [month, setMonth] = useState(defaultPeriod.month)
  const [subDirectorateId, setSubDirectorateId] = useState('')
  const [duplicate, setDuplicate] = useState(null)
  const [uploading, setUploading] = useState(false)

  const subDirectorateOptions = useMemo(() => {
    if (isFieldStaff && defaultSubDirectorateId) {
      return subDirectorates.filter((sd) => String(sd.id) === defaultSubDirectorateId)
    }
    return subDirectorates
  }, [isFieldStaff, defaultSubDirectorateId])

  const sdLabel = formatSubDirectorateCompact(subDirectorateId)
  const lockSubDirectorate = isFieldStaff && Boolean(defaultSubDirectorateId)

  async function load() {
    const data = await apiRequest('/periodic/monthly-bundle/inbox')
    setBundles(data.bundles || [])
  }

  useEffect(() => {
    load().catch(() => {})
  }, [])

  useEffect(() => {
    if (defaultSubDirectorateId) {
      setSubDirectorateId(defaultSubDirectorateId)
    }
  }, [defaultSubDirectorateId])

  useEffect(() => {
    if (!subDirectorateId || !year || !month) {
      setDuplicate(null)
      return
    }
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      sub_directorate_id: subDirectorateId,
    })
    apiRequest(`/periodic/monthly-reports/check?${params}`)
      .then((data) => setDuplicate(data.exists ? data.report : null))
      .catch(() => setDuplicate(null))
  }, [year, month, subDirectorateId])

  function clearFile() {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function uploadReport(replace = false) {
    if (!file) {
      onNotice?.('Sélectionnez un fichier PDF ou Word.')
      return
    }
    if (!subDirectorateId) {
      onNotice?.('Sélectionnez la sous-direction concernée.')
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('year', String(year))
      form.append('month', String(month))
      form.append('sub_directorate_id', subDirectorateId)
      if (replace) form.append('replace_existing', '1')
      await apiRequest('/periodic/monthly-reports', { method: 'POST', body: form })
      onNotice?.(
        replace
          ? 'Rapport mensuel remplacé et transmis à la directrice.'
          : 'Rapport mensuel transmis à la directrice.',
      )
      clearFile()
      setDuplicate(null)
    } catch (err) {
      onNotice?.(err.message || "Échec de l'envoi.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="space-y-3 rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide">
        {isFieldStaff ? 'Rapport mensuel — transmission à la directrice' : 'Rédaction mensuelle sous-direction'}
      </h2>
      <ScrollablePanel className="space-y-2 bg-surface-lowest p-2">
        {bundles.length === 0 ? (
          <p className="p-2 text-sm text-on-surface-variant">Aucun paquet reçu pour le moment.</p>
        ) : (
          bundles.map((b) => (
            <details key={b.id} className="rounded border border-outline-variant p-2">
              <summary className="cursor-pointer text-sm font-semibold">
                {b.sender_prenom} {b.sender_nom} — {b.month}/{b.year}
              </summary>
              <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs">{b.concatenated_body}</pre>
            </details>
          ))
        )}
      </ScrollablePanel>
      {canUploadMonthlyToDirector && (
      <div className="space-y-3 border-t border-outline-variant pt-3">
        <p className="text-xs text-on-surface-variant">
          Indiquez la période et la sous-direction avant de transmettre le rapport final à la directrice.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs uppercase text-on-surface-variant">
            Année
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="mt-1 block w-full rounded border border-outline-variant px-2 py-1 text-sm normal-case"
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs uppercase text-on-surface-variant">
            Mois
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="mt-1 block w-full rounded border border-outline-variant px-2 py-1 text-sm normal-case"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs uppercase text-on-surface-variant">
            Sous-direction
            {lockSubDirectorate ? (
              <div
                className="mt-1 flex min-h-[30px] w-full items-center rounded border border-outline-variant bg-surface-low px-2 py-1 text-sm font-semibold normal-case text-on-surface"
                title={subDirectorates.find((sd) => String(sd.id) === subDirectorateId)?.label}
              >
                {sdLabel}
              </div>
            ) : (
              <select
                value={subDirectorateId}
                onChange={(e) => setSubDirectorateId(e.target.value)}
                className="mt-1 block w-full rounded border border-outline-variant px-2 py-1 text-sm normal-case"
              >
                {!defaultSubDirectorateId && <option value="">Choisir…</option>}
                {subDirectorateOptions.map((sd) => (
                  <option key={sd.id} value={String(sd.id)}>
                    {formatSubDirectorateCompact(sd)}
                  </option>
                ))}
              </select>
            )}
          </label>
        </div>

        {duplicate && (
          <div className="rounded border border-amber-300 bg-amber-50/90 p-3 text-sm text-amber-950">
            <p className="font-semibold">Rapport déjà en stockage</p>
            <p className="mt-1 text-xs">
              {sdLabel} — {MONTH_NAMES[month - 1]} {year} : « {duplicate.original_name} » déposé par{' '}
              {duplicate.uploader_name} le {new Date(duplicate.uploaded_at).toLocaleDateString('fr-FR')}.
            </p>
            <button
              type="button"
              disabled={uploading || !file}
              onClick={() => uploadReport(true)}
              className="mt-2 rounded bg-amber-900 px-3 py-1.5 text-xs text-white disabled:opacity-50"
            >
              Remplacer le rapport existant
            </button>
          </div>
        )}

        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />
          {file ? (
            <div className="relative rounded-lg border-2 border-primary/30 bg-primary/5 p-4 pr-10">
              <button
                type="button"
                onClick={clearFile}
                className="absolute right-2 top-2 rounded-full p-1 text-on-surface-variant transition hover:bg-surface-high hover:text-error"
                aria-label="Retirer le fichier"
              >
                <X size={16} strokeWidth={2.25} />
              </button>
              <p className="text-sm font-semibold text-on-surface">{file.name}</p>
              <p className="mt-1 text-xs text-on-surface-variant">
                {(file.size / 1024).toFixed(0)} Ko — PDF ou Word
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 px-4 py-4 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
            >
              <FileUp size={18} strokeWidth={2.25} />
              Choisir un fichier
            </button>
          )}
          <p className="text-xs text-on-surface-variant">Formats acceptés : PDF ou Word (.docx), 10 Mo max.</p>
        </div>

        <button
          type="button"
          disabled={uploading || Boolean(duplicate) || !file}
          className="rounded bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"
          onClick={() => uploadReport(false)}
        >
          {uploading ? 'Envoi…' : 'Transmettre à la directrice'}
        </button>
      </div>
      )}
    </section>
  )
}
