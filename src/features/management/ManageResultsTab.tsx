import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { competitionRepository } from '../../api/competitionRepository'
import { groupRepository } from '../../api/groupRepository'
import { EmptyState } from '../../components/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Loading } from '../../components/Loading'
import { buildPastResultsPlan } from '../../lib/pastResultsImportPlanner'
import { parseResultsExcel } from '../../lib/resultsExcelParser'
import { buildResultsDiff, parseResultsHtml, type ImportResultsDiff } from '../../lib/resultsHtmlParser'
import type { PastResultsImportPlan } from '../../lib/pastResultsImportPlanner'
import type { OrienteeringCompetition } from '../../types/competition'
import { useParticipants, useResults } from '../competition-detail/hooks'
import { ImportPastResultsReviewDialog } from './ImportPastResultsReviewDialog'
import { ImportResultsReviewDialog } from './ImportResultsReviewDialog'
import { competitionToFields } from './types'

export function ManageResultsTab({ competition }: { competition: OrienteeringCompetition }) {
  const queryClient = useQueryClient()
  const competitionId = competition.competitionId
  const { data: results, isLoading, isError, error } = useResults(competitionId, competition.competition.status)
  const { data: participants } = useParticipants(competitionId)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  const [htmlDiff, setHtmlDiff] = useState<ImportResultsDiff | null>(null)
  const [pastPlan, setPastPlan] = useState<PastResultsImportPlan | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [parsingExcel, setParsingExcel] = useState(false)

  const resultsStatus = competition.competition.resultsStatus

  async function handlePublish() {
    setPublishing(true)
    setPublishError(null)
    const result = await competitionRepository.createCompetition({
      competitionId,
      competition: competitionToFields(competition.competition, { resultsStatus: 'OFFICIAL' }),
      direction: competition.direction,
      punchingSystem: competition.punchingSystem,
      startTimeMode: competition.startTimeMode,
      startIntervalSeconds: competition.startIntervalSeconds,
      // Публикация результатов переотправляет соревнование целиком — КВ и политику надо
      // пробросить как есть, иначе сохранение обнулило бы их.
      controlTimeMinutes: competition.controlTimeMinutes,
      overtimePolicy: competition.overtimePolicy,
    })
    if (result.kind === 'success') {
      await queryClient.invalidateQueries({ queryKey: ['managed-competition', competitionId] })
      setShowPublishConfirm(false)
    } else {
      setPublishError(result.message)
    }
    setPublishing(false)
  }

  async function invalidateResults() {
    await queryClient.invalidateQueries({ queryKey: ['results', competitionId] })
    await queryClient.invalidateQueries({ queryKey: ['participants', competitionId] })
  }

  async function handlePickHtml(file: File) {
    setImportError(null)
    const html = await file.text()
    const parsedRows = parseResultsHtml(html)
    const diff = buildResultsDiff(parsedRows, participants ?? [], results ?? [], competitionId)
    if (diff.changed.length === 0 && diff.unmatched.length === 0) {
      setImportError('Не удалось распознать ни одной строки в файле')
      return
    }
    setHtmlDiff(diff)
  }

  async function handlePickExcel(file: File) {
    setImportError(null)
    setParsingExcel(true)
    const parsed = await parseResultsExcel(file)
    if (!parsed) {
      setParsingExcel(false)
      setImportError('Не удалось разобрать файл — проверьте формат')
      return
    }
    const groupsResult = await groupRepository.getGroups(competitionId)
    setParsingExcel(false)
    if (groupsResult.kind === 'error') {
      setImportError(groupsResult.message)
      return
    }
    const plan = buildPastResultsPlan(parsed, groupsResult.data, participants ?? [])
    if (plan.rowPlans.length === 0) {
      setImportError('Не удалось распознать ни одной строки в файле')
      return
    }
    setPastPlan(plan)
  }

  if (htmlDiff) {
    return (
      <ImportResultsReviewDialog
        competition={competition}
        participants={participants ?? []}
        currentResults={results ?? []}
        diff={htmlDiff}
        onDismiss={() => setHtmlDiff(null)}
        onImported={async () => {
          setHtmlDiff(null)
          await invalidateResults()
        }}
      />
    )
  }

  if (pastPlan) {
    return (
      <ImportPastResultsReviewDialog
        competition={competition}
        plan={pastPlan}
        existingResults={results ?? []}
        onDismiss={() => setPastPlan(null)}
        onImported={async () => {
          setPastPlan(null)
          await invalidateResults()
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-base font-medium text-fg">Результаты</h2>

      <div className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface p-3">
        <span className="text-sm font-semibold text-fg">Импорт результатов</span>
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-md border border-outline px-3 py-1.5 text-center text-sm text-fg">
            Импорт из HTML-протокола
            <input
              type="file"
              accept=".html,.htm"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) handlePickHtml(file)
              }}
            />
          </label>
          <label className="cursor-pointer rounded-md border border-outline px-3 py-1.5 text-center text-sm text-fg">
            {parsingExcel ? 'Разбор файла…' : 'Импорт прошедших результатов (Excel)'}
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              disabled={parsingExcel}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) handlePickExcel(file)
              }}
            />
          </label>
        </div>
        {importError && <ErrorMessage message={importError} />}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-on-surface-variant">
          {resultsStatus === 'OFFICIAL' ? 'Статус: результаты официальные' : 'Статус: результаты не опубликованы'}
        </span>
        {resultsStatus !== 'OFFICIAL' && (
          <button
            type="button"
            disabled={isLoading || !results || results.length === 0}
            onClick={() => setShowPublishConfirm(true)}
            className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg disabled:opacity-50"
          >
            Опубликовать результаты
          </button>
        )}
      </div>

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorMessage message={(error as Error).message} />
      ) : !results || results.length === 0 ? (
        <EmptyState text="Результаты ещё не опубликованы." />
      ) : (
        <p className="text-base text-fg">
          Всего результатов: {results.length} (финишировали: {results.filter((r) => r.status === 'FINISHED').length})
        </p>
      )}

      {showPublishConfirm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-surface p-4">
            <h3 className="text-lg font-medium text-fg">Опубликовать результаты?</h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Результаты станут официальными и видимыми участникам. Это действие необратимо.
            </p>
            {publishError && <ErrorMessage message={publishError} />}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={publishing}
                onClick={() => setShowPublishConfirm(false)}
                className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={publishing}
                onClick={handlePublish}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50"
              >
                {publishing ? 'Публикация…' : 'Опубликовать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
