import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { distanceRepository } from '../../api/distanceRepository'
import { DistanceMapView } from '../../components/DistanceMapView'
import { EmptyState } from '../../components/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Loading } from '../../components/Loading'
import { importedCoursesWarning, isMinControls, minControlsLabel, requiredControlNumbers } from '../../lib/byChoiceMode'
import { distanceMapCorners } from '../../lib/mapCorners'
import type { Distance } from '../../types/distance'
import { AttachMapDialog } from '../management/AttachMapDialog'
import { DistanceDetailsDialog } from '../management/DistanceDetailsDialog'
import { DistanceDialog } from '../management/DistanceDialog'
import { DistanceRulesDialog } from '../management/DistanceRulesDialog'
import { useGroups } from '../management/hooks'
import type { PendingDistance } from '../management/types'
import { useDistances } from './hooks'

interface DistancesTabProps {
  competitionId: string
  /** Организаторский режим: создание вручную + импорт IOF XML (ManageCompetitionPage). */
  showImport?: boolean
  /** Направление соревнования — для «по выбору» на карточках показываются правила дистанции. */
  direction?: string
  /** SCORE / MIN_CONTROLS — итог формата «по выбору». */
  byChoiceMode?: string
  /** Режим старта BY_START_STATION — у новой дистанции обязательно стартовое КП. */
  isStartCpRequired?: boolean
}

/**
 * Карта дистанции — обычная ссылка на файл вместо интерактивного canvas-рендера с пан/зумом
 * (DistanceMapView) — решение по нему отложено до отдельной задачи с картами/треками, как и в
 * вертикали 1.
 */
export function DistancesTab({
  competitionId,
  showImport = false,
  direction = 'FORWARD',
  byChoiceMode = 'SCORE',
  isStartCpRequired = false,
}: DistancesTabProps) {
  const queryClient = useQueryClient()
  const { data: distances, isLoading, isError, error } = useDistances(competitionId)
  // Группы нужны только организатору — чтобы не удалить дистанцию, на которую они ссылаются.
  const { data: groups } = useGroups(competitionId, showImport)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importWarning, setImportWarning] = useState<string | null>(null)
  const [expandedMapDistance, setExpandedMapDistance] = useState<Distance | null>(null)
  const [deletingDistance, setDeletingDistance] = useState<Distance | null>(null)
  /** Текст лоадера поверх списка дистанций, пока идёт создание/удаление и перезагрузка списка. */
  const [busyText, setBusyText] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const expandedMapCorners = expandedMapDistance ? distanceMapCorners(expandedMapDistance) : null

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ['distances', competitionId] })
  }

  async function handleImportXml(file: File) {
    setImporting(true)
    setImportError(null)
    setImportWarning(null)
    const content = await file.text()
    const result = await distanceRepository.importFromXml(competitionId, content)
    if (result.kind === 'success') {
      setImportWarning(importedCoursesWarning(result.data, direction, byChoiceMode))
      await invalidate()
    } else {
      setImportError(result.message)
    }
    setImporting(false)
  }

  /**
   * Дистанцию, на которую ссылаются группы, не удаляем — иначе группы остались бы без дистанции
   * (сервер это не проверяет). То же правило, что в мастере и в competra-android.
   */
  function requestDelete(distance: Distance) {
    setActionError(null)
    const usedBy = (groups ?? []).filter((g) => g.distanceId === distance.id).map((g) => g.title)
    if (usedBy.length > 0) {
      setActionError(`Дистанция используется в группах ${usedBy.join(', ')} — сначала смените им дистанцию или удалите их`)
      return
    }
    setDeletingDistance(distance)
  }

  async function handleDelete() {
    if (!deletingDistance) return
    const distanceId = deletingDistance.id
    setDeletingDistance(null)
    setBusyText('Удаляю дистанцию…')
    const result = await distanceRepository.deleteDistance(distanceId)
    // Лоадер держим и на перезагрузку списка — иначе удалённая дистанция ещё мелькает на экране.
    if (result.kind === 'success') await invalidate()
    else setActionError('Не удалось удалить дистанцию')
    setBusyText(null)
  }

  async function handleCreate(pending: PendingDistance) {
    setShowCreateDialog(false)
    setActionError(null)
    setBusyText('Сохраняю дистанцию…')
    const result = await distanceRepository.saveDistances([
      {
        distanceId: null,
        competitionId,
        name: pending.name,
        lengthMeters: pending.lengthMeters,
        climbMeters: pending.climbMeters,
        controlsCount: pending.controlPoints.length,
        description: pending.description ?? '',
        controlPoints: pending.controlPoints,
        finishControlPoint: pending.finishControlPoint,
        startControlPoint: pending.startControlPoint,
        minControlsCount: pending.minControlsCount ?? 0,
      },
    ])
    if (result.kind === 'success') await invalidate()
    else setActionError(`Не удалось сохранить дистанцию: ${result.message}`)
    setBusyText(null)
  }

  if (isLoading) return <Loading />
  if (isError) return <ErrorMessage message={(error as Error).message} />

  return (
    <div className="flex flex-col gap-2 p-4">
      {showImport && (
        <div className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-fg">Дистанции</span>
            <button
              type="button"
              disabled={busyText != null}
              onClick={() => setShowCreateDialog(true)}
              className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg disabled:opacity-50"
            >
              + Создать
            </button>
          </div>
          <span className="text-sm font-semibold text-fg">Импорт из Mapper</span>
          <label className="cursor-pointer rounded-md border border-outline px-4 py-2 text-center text-sm text-fg">
            {importing ? 'Импортирую…' : 'Загрузить IOF XML файл'}
            <input
              type="file"
              accept=".xml"
              className="hidden"
              disabled={importing}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImportXml(file)
              }}
            />
          </label>
          {importError && <ErrorMessage message={importError} />}
          {importWarning && <p className="text-sm text-error">{importWarning}</p>}
        </div>
      )}

      {actionError && <ErrorMessage message={actionError} />}

      {/*
        Лоадер — отдельной строкой над списком, а не полупрозрачным слоем поверх: слой просвечивал и
        его текст накладывался на карточки. Блокируется только список, остальная страница доступна.
      */}
      {busyText && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface p-3" role="status">
          <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          <span className="text-sm text-on-surface-variant">{busyText}</span>
        </div>
      )}
      <div
        className={`flex flex-col gap-2 ${busyText ? 'pointer-events-none opacity-40' : ''}`}
        aria-busy={busyText != null}
      >
        {!distances || distances.length === 0 ? (
          !busyText && (
            <EmptyState text={showImport ? 'Нет дистанций. Создайте или импортируйте из Mapper.' : 'Дистанции не добавлены'} />
          )
        ) : (
          distances.map((distance) => (
            <DistanceCard
              key={distance.id}
              distance={distance}
              canEditMap={showImport}
              direction={direction}
              byChoiceMode={byChoiceMode}
              onExpandMap={setExpandedMapDistance}
              onMapUpdated={invalidate}
              onDelete={() => requestDelete(distance)}
            />
          ))
        )}
      </div>

      {expandedMapDistance?.mapUrl && expandedMapCorners && (
        <div className="fixed inset-0 z-20 flex flex-col bg-bg">
          <div className="flex items-center gap-2 border-b border-outline-variant bg-surface/90 px-2 py-3">
            <button type="button" onClick={() => setExpandedMapDistance(null)} aria-label="Закрыть" className="px-2 text-xl">
              ×
            </button>
            <h3 className="text-base font-medium text-fg">{expandedMapDistance.name ?? 'Карта дистанции'}</h3>
          </div>
          <div className="flex flex-1">
            <DistanceMapView mapUrl={expandedMapDistance.mapUrl} corners={expandedMapCorners} />
          </div>
        </div>
      )}

      {deletingDistance && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-surface p-4">
            <h3 className="text-lg font-medium text-fg">Удалить дистанцию?</h3>
            <p className="mt-2 text-sm text-on-surface-variant">{deletingDistance.name ?? 'Без названия'}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingDistance(null)}
                className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg"
              >
                Отмена
              </button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-md bg-error px-4 py-2 text-sm text-on-error">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateDialog && (
        <DistanceDialog
          direction={direction}
          byChoiceMode={byChoiceMode}
          isStartCpRequired={isStartCpRequired}
          onDismiss={() => setShowCreateDialog(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className="text-base font-medium text-fg">{value}</span>
    </div>
  )
}

function DistanceSummary({ distance }: { distance: Distance }) {
  return (
    <>
      <span className="text-sm font-semibold text-fg">{distance.name ?? 'Без названия'}</span>
      <div className="flex gap-6">
        {distance.lengthMeters > 0 && <Stat label="Длина" value={`${distance.lengthMeters} м`} />}
        {distance.climbMeters > 0 && <Stat label="Набор" value={`${distance.climbMeters} м`} />}
        <Stat label="КП" value={`${distance.controlsCount}`} />
      </div>
    </>
  )
}

interface DistanceCardProps {
  distance: Distance
  canEditMap: boolean
  direction: string
  byChoiceMode: string
  onExpandMap: (distance: Distance) => void
  onMapUpdated: () => void
  onDelete: () => void
}

function DistanceCard({ distance, canEditMap, direction, byChoiceMode, onExpandMap, onMapUpdated, onDelete }: DistanceCardProps) {
  const [showAttachDialog, setShowAttachDialog] = useState(false)
  const [showRulesDialog, setShowRulesDialog] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const hasMap = distanceMapCorners(distance) != null
  // Карта есть, но бэкенд её не отдал — до старта её видят только организаторы.
  const isMapHidden = !hasMap && distance.hasMap === true && distance.mapUrl == null
  const isByChoice = direction === 'BY_CHOICE'
  const hasMinControls = isMinControls(direction, byChoiceMode)
  const required = requiredControlNumbers(distance)

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface p-4">
      {/* Организатору по клику — порядок КП и координаты, чтобы проверить, что дистанция загрузилась. */}
      {canEditMap ? (
        <button
          type="button"
          onClick={() => setShowDetails(true)}
          aria-label={`Подробнее о дистанции ${distance.name ?? ''}`.trim()}
          className="-m-2 flex items-center gap-2 rounded-md p-2 text-left hover:bg-surface-variant"
        >
          <div className="flex flex-1 flex-col gap-2">
            <DistanceSummary distance={distance} />
          </div>
          <span className="text-xl text-on-surface-variant" aria-hidden>
            ›
          </span>
        </button>
      ) : (
        <DistanceSummary distance={distance} />
      )}
      {hasMinControls && (
        <span className="text-sm text-fg">{minControlsLabel(distance.minControlsCount, distance.controlPoints.length)}</span>
      )}
      {isByChoice && required.length > 0 && (
        <span className="text-sm text-fg">Обязательные КП: {required.join(', ')}</span>
      )}
      {hasMap && (
        <button
          type="button"
          onClick={() => onExpandMap(distance)}
          className="flex items-center gap-2 rounded-md bg-surface-variant px-3 py-2 text-sm text-on-surface-variant"
        >
          Открыть карту дистанции
        </button>
      )}
      {isMapHidden && <span className="text-sm text-on-surface-variant">Карта дистанции откроется после старта</span>}
      {canEditMap && isByChoice && (
        <button type="button" onClick={() => setShowRulesDialog(true)} className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg">
          {hasMinControls ? 'Минимум и обязательные КП' : 'Обязательные КП'}
        </button>
      )}
      {canEditMap && (
        <button type="button" onClick={() => setShowAttachDialog(true)} className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg">
          {distance.mapUrl != null ? 'Заменить карту' : 'Прикрепить карту'}
        </button>
      )}
      {canEditMap && (
        <button type="button" onClick={onDelete} className="self-start text-sm text-error">
          Удалить дистанцию
        </button>
      )}

      {showDetails && (
        <DistanceDetailsDialog
          distance={distance}
          direction={direction}
          byChoiceMode={byChoiceMode}
          onDismiss={() => setShowDetails(false)}
        />
      )}
      {showRulesDialog && (
        <DistanceRulesDialog
          distance={distance}
          hasMinControls={hasMinControls}
          onDismiss={() => setShowRulesDialog(false)}
          onSaved={() => {
            setShowRulesDialog(false)
            onMapUpdated()
          }}
        />
      )}
      {showAttachDialog && (
        <AttachMapDialog
          distance={distance}
          onDismiss={() => setShowAttachDialog(false)}
          onSaved={() => {
            setShowAttachDialog(false)
            onMapUpdated()
          }}
        />
      )}
    </div>
  )
}
