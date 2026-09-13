import { useMemo, useState } from 'react'
import { resultRepository } from '../../api/resultRepository'
import { ErrorMessage } from '../../components/ErrorMessage'
import { formatTime } from '../../lib/dateUtils'
import type { ImportResultRow, ImportResultsDiff } from '../../lib/resultsHtmlParser'
import { resultStatusColorClass, resultStatusLabel } from '../competitions/labels'
import type { OrienteeringCompetition } from '../../types/competition'
import type { OrienteeringParticipant, OrienteeringResult } from '../../types/participant'

/** Значения одной строки результата для отображения — общая форма для текущего результата и для изменения из HTML. */
interface DisplayResult {
  rank: number | null
  totalTime: number | null
  status: string
  totalScore: number | null
}

interface ReviewRow {
  participant: OrienteeringParticipant
  display: DisplayResult | null
  change: ImportResultRow | null
}

function buildRows(
  participants: OrienteeringParticipant[],
  currentResults: OrienteeringResult[],
  changed: ImportResultRow[],
  checkedById: Map<string, boolean>,
  useImported: boolean,
): ReviewRow[] {
  const participantsById = new Map(participants.map((p) => [p.id, p]))
  const currentByParticipantId = new Map(currentResults.map((r) => [r.participantId, r]))
  const changeByParticipantId = new Map(changed.map((c) => [c.participant.id, c]))
  const participantIds = new Set([...currentByParticipantId.keys(), ...changeByParticipantId.keys()])

  const rows: ReviewRow[] = []
  for (const pid of participantIds) {
    const participant = participantsById.get(pid) ?? changeByParticipantId.get(pid)?.participant
    if (!participant) continue
    const change = changeByParticipantId.get(pid) ?? null
    const current = currentByParticipantId.get(pid) ?? null
    const display: DisplayResult | null =
      useImported && change && checkedById.get(change.request.id)
        ? { rank: change.request.rank, totalTime: change.request.totalTime, status: change.request.status, totalScore: current?.totalScore ?? null }
        : current
          ? { rank: current.rank, totalTime: current.totalTime, status: current.status, totalScore: current.totalScore }
          : null
    rows.push({ participant, display, change })
  }
  return rows
}

function groupRows(rows: ReviewRow[]): [string, ReviewRow[]][] {
  const byGroup = new Map<string, ReviewRow[]>()
  for (const row of rows) {
    const title = row.participant.groupName?.trim() || 'Без группы'
    const list = byGroup.get(title) ?? []
    list.push(row)
    byGroup.set(title, list)
  }
  return [...byGroup.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([title, groupRows]) => [
    title,
    [...groupRows].sort((a, b) => (a.display?.rank ?? Infinity) - (b.display?.rank ?? Infinity)),
  ])
}

interface ImportResultsReviewDialogProps {
  competition: OrienteeringCompetition
  participants: OrienteeringParticipant[]
  currentResults: OrienteeringResult[]
  diff: ImportResultsDiff
  onDismiss: () => void
  onImported: () => void
}

export function ImportResultsReviewDialog({ competition, participants, currentResults, diff, onDismiss, onImported }: ImportResultsReviewDialogProps) {
  const isByChoice = competition.direction === 'BY_CHOICE'
  const resultsStatus = competition.competition.resultsStatus

  const [checkedById, setCheckedById] = useState<Map<string, boolean>>(new Map(diff.changed.map((c) => [c.request.id, true])))
  const [selectedTab, setSelectedTab] = useState<'server' | 'after'>('server')
  const [showUnmatched, setShowUnmatched] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedCount = [...checkedById.values()].filter(Boolean).length
  const rows = useMemo(
    () => groupRows(buildRows(participants, currentResults, diff.changed, checkedById, selectedTab === 'after')),
    [participants, currentResults, diff, checkedById, selectedTab],
  )

  function setAllChecked(value: boolean) {
    setCheckedById(new Map(diff.changed.map((c) => [c.request.id, value])))
  }

  function toggleChecked(id: string, value: boolean) {
    setCheckedById((prev) => new Map(prev).set(id, value))
  }

  async function handleImport() {
    setImporting(true)
    setError(null)
    const toSave = diff.changed.filter((c) => checkedById.get(c.request.id)).map((c) => c.request)
    const result = await resultRepository.saveResults(toSave)
    setImporting(false)
    if (result.kind === 'success') {
      setShowConfirm(false)
      onImported()
    } else {
      setShowConfirm(false)
      setError(result.message)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-bg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={onDismiss} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="truncate text-lg font-medium">Импорт результатов: {competition.competition.title}</h1>
      </header>

      <div className="flex flex-col gap-2 px-4 py-3">
        <p className="text-base text-fg">
          Изменений: {diff.changed.length} • Не распознано: {diff.unmatched.length}
        </p>
        {diff.unmatched.length > 0 && (
          <>
            <button type="button" onClick={() => setShowUnmatched((v) => !v)} className="self-start text-sm text-primary underline">
              {showUnmatched ? 'Скрыть нераспознанные' : `Показать нераспознанные (${diff.unmatched.length})`}
            </button>
            {showUnmatched && (
              <div className="flex flex-col gap-1">
                <p className="text-sm text-on-surface-variant">Стартовый номер не найден среди участников — эти строки будут пропущены:</p>
                {diff.unmatched.map((row, i) => (
                  <p key={i} className="text-sm text-on-surface-variant">
                    №{row.startNumber} {row.fullName}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
        {resultsStatus === 'OFFICIAL' && (
          <div className="rounded-md bg-error/10 p-2 text-sm text-error">
            Результаты уже опубликованы как официальные — импорт перезапишет их для всех участников.
          </div>
        )}
        {error && <ErrorMessage message={error} />}
      </div>

      <div className="flex border-b border-outline-variant px-4">
        <button
          type="button"
          onClick={() => setSelectedTab('server')}
          className={`px-3 py-2 text-sm ${selectedTab === 'server' ? 'border-b-2 border-primary font-medium text-primary' : 'text-on-surface-variant'}`}
        >
          На сервере
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab('after')}
          className={`px-3 py-2 text-sm ${selectedTab === 'after' ? 'border-b-2 border-primary font-medium text-primary' : 'text-on-surface-variant'}`}
        >
          После импорта
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {rows.length === 0 && <p className="pt-4 text-on-surface-variant">Нет данных для отображения</p>}
        {rows.map(([groupTitle, groupRowsList]) => (
          <div key={groupTitle}>
            <h3 className="pt-3 pb-1 text-sm font-medium text-fg">{groupTitle}</h3>
            <hr className="border-outline-variant" />
            {groupRowsList.map((row) => (
              <ReviewResultRow
                key={row.participant.id}
                row={row}
                isByChoice={isByChoice}
                showCheckbox={selectedTab === 'after'}
                checked={row.change ? (checkedById.get(row.change.request.id) ?? false) : false}
                onCheckedChange={(checked) => row.change && toggleChecked(row.change.request.id, checked)}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-outline-variant p-3">
        <div className="flex gap-2">
          <button type="button" disabled={diff.changed.length === 0 || importing} onClick={() => setAllChecked(true)} className="text-sm text-primary disabled:opacity-50">
            Выбрать все
          </button>
          <button type="button" disabled={diff.changed.length === 0 || importing} onClick={() => setAllChecked(false)} className="text-sm text-primary disabled:opacity-50">
            Снять все
          </button>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onDismiss} disabled={importing} className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg disabled:opacity-50">
            Отмена
          </button>
          <button
            type="button"
            disabled={selectedCount === 0 || importing}
            onClick={() => setShowConfirm(true)}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-on-primary disabled:opacity-50"
          >
            Импортировать ({selectedCount})
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-fg/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-surface p-4">
            <h3 className="text-lg font-medium text-fg">Применить изменения?</h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Будет применено {selectedCount} изменений. Текущие результаты будут перезаписаны без проверки конфликтов.
            </p>
            <div className="mt-4 flex gap-2">
              <button type="button" disabled={importing} onClick={() => setShowConfirm(false)} className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg disabled:opacity-50">
                Отмена
              </button>
              <button type="button" disabled={importing} onClick={handleImport} className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50">
                {importing ? 'Импорт…' : 'Импортировать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewResultRow({
  row,
  isByChoice,
  showCheckbox,
  checked,
  onCheckedChange,
}: {
  row: ReviewRow
  isByChoice: boolean
  showCheckbox: boolean
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const { display, change } = row
  const isGroupMismatch = change?.changeSummary.startsWith('⚠') ?? false
  const highlighted = showCheckbox && checked && change != null
  const bgClass = highlighted ? (isGroupMismatch ? 'bg-error/10' : 'bg-primary-container/40') : ''

  return (
    <div className={`flex flex-col gap-0.5 py-1 ${bgClass}`}>
      <div className="flex items-center gap-2">
        <div className="w-8">{showCheckbox && change && <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} />}</div>
        <span className="w-8 text-sm text-fg">{display?.rank ?? '—'}</span>
        <div className={isByChoice ? 'w-32 flex-none' : 'flex-1'}>
          <div className="text-fg">{`${row.participant.lastName} ${row.participant.firstName}`}</div>
          {row.participant.startNumber && <div className="text-xs text-on-surface-variant">№{row.participant.startNumber}</div>}
        </div>
        {isByChoice && <span className="w-14 text-fg">{display?.totalScore ?? '—'}</span>}
        <span className="w-20 text-fg">{display?.totalTime != null ? formatTime(display.totalTime) : '—'}</span>
        <span className={`w-20 text-xs font-medium ${display ? resultStatusColorClass(display.status) : ''}`}>{display ? resultStatusLabel(display.status) : '—'}</span>
      </div>
      {highlighted && change && <p className="pl-10 text-sm text-on-surface-variant">{change.changeSummary}</p>}
    </div>
  )
}
