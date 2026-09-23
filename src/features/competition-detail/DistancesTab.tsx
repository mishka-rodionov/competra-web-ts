import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { distanceRepository } from '../../api/distanceRepository'
import { DistanceMapView } from '../../components/DistanceMapView'
import { EmptyState } from '../../components/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Loading } from '../../components/Loading'
import { distanceMapCorners } from '../../lib/mapCorners'
import type { Distance } from '../../types/distance'
import { AttachMapDialog } from '../management/AttachMapDialog'
import { DistanceDialog } from '../management/DistanceDialog'
import { useDistances } from './hooks'

interface DistancesTabProps {
  competitionId: string
  /** Организаторский режим: создание вручную + импорт IOF XML (ManageCompetitionPage). */
  showImport?: boolean
  isByChoice?: boolean
  /** Режим старта BY_START_STATION — у новой дистанции обязательно стартовое КП. */
  isStartCpRequired?: boolean
}

/**
 * Карта дистанции — обычная ссылка на файл вместо интерактивного canvas-рендера с пан/зумом
 * (DistanceMapView) — решение по нему отложено до отдельной задачи с картами/треками, как и в
 * вертикали 1.
 */
export function DistancesTab({ competitionId, showImport = false, isByChoice = false, isStartCpRequired = false }: DistancesTabProps) {
  const queryClient = useQueryClient()
  const { data: distances, isLoading, isError, error } = useDistances(competitionId)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [expandedMapDistance, setExpandedMapDistance] = useState<Distance | null>(null)
  const expandedMapCorners = expandedMapDistance ? distanceMapCorners(expandedMapDistance) : null

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ['distances', competitionId] })
  }

  async function handleImportXml(file: File) {
    setImporting(true)
    setImportError(null)
    const content = await file.text()
    const result = await distanceRepository.importFromXml(competitionId, content)
    if (result.kind === 'success') {
      await invalidate()
    } else {
      setImportError(result.message)
    }
    setImporting(false)
  }

  if (isLoading) return <Loading />
  if (isError) return <ErrorMessage message={(error as Error).message} />

  return (
    <div className="flex flex-col gap-2 p-4">
      {showImport && (
        <div className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-fg">Дистанции</span>
            <button type="button" onClick={() => setShowCreateDialog(true)} className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg">
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
        </div>
      )}

      {!distances || distances.length === 0 ? (
        <EmptyState text={showImport ? 'Нет дистанций. Создайте или импортируйте из Mapper.' : 'Дистанции не добавлены'} />
      ) : (
        distances.map((distance) => (
          <DistanceCard
            key={distance.id}
            distance={distance}
            canEditMap={showImport}
            onExpandMap={setExpandedMapDistance}
            onMapUpdated={invalidate}
          />
        ))
      )}

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

      {showCreateDialog && (
        <DistanceDialog
          isByChoice={isByChoice}
          isStartCpRequired={isStartCpRequired}
          onDismiss={() => setShowCreateDialog(false)}
          onSave={async (pending) => {
            setShowCreateDialog(false)
            await distanceRepository.saveDistances([
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
              },
            ])
            await invalidate()
          }}
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

interface DistanceCardProps {
  distance: Distance
  canEditMap: boolean
  onExpandMap: (distance: Distance) => void
  onMapUpdated: () => void
}

function DistanceCard({ distance, canEditMap, onExpandMap, onMapUpdated }: DistanceCardProps) {
  const [showAttachDialog, setShowAttachDialog] = useState(false)
  const hasMap = distanceMapCorners(distance) != null

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface p-4">
      <span className="text-sm font-semibold text-fg">{distance.name ?? 'Без названия'}</span>
      <div className="flex gap-6">
        {distance.lengthMeters > 0 && <Stat label="Длина" value={`${distance.lengthMeters} м`} />}
        {distance.climbMeters > 0 && <Stat label="Набор" value={`${distance.climbMeters} м`} />}
        <Stat label="КП" value={`${distance.controlsCount}`} />
      </div>
      {hasMap && (
        <button
          type="button"
          onClick={() => onExpandMap(distance)}
          className="flex items-center gap-2 rounded-md bg-surface-variant px-3 py-2 text-sm text-on-surface-variant"
        >
          Открыть карту дистанции
        </button>
      )}
      {canEditMap && (
        <button type="button" onClick={() => setShowAttachDialog(true)} className="rounded-md border border-outline px-3 py-1.5 text-sm text-fg">
          {distance.mapUrl != null ? 'Заменить карту' : 'Прикрепить карту'}
        </button>
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
