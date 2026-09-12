import { EmptyState } from '../../components/EmptyState'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Loading } from '../../components/Loading'
import { useDistances } from './hooks'

/**
 * Только просмотр (в старом приложении — showImport=false): без создания/импорта дистанций,
 * это организаторские действия из вертикали "Управление". Карта дистанции — обычная ссылка на
 * файл вместо интерактивного canvas-рендера с пан/зумом (DistanceMapView) — решение по нему
 * отложено до отдельной задачи с картами/треками.
 */
export function DistancesTab({ competitionId }: { competitionId: string }) {
  const { data: distances, isLoading, isError, error } = useDistances(competitionId)

  if (isLoading) return <Loading />
  if (isError) return <ErrorMessage message={(error as Error).message} />
  if (!distances || distances.length === 0) return <EmptyState text="Дистанции не добавлены" />

  return (
    <div className="flex flex-col gap-2 p-4">
      {distances.map((distance) => (
        <div key={distance.id} className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface p-4">
          <span className="text-sm font-semibold text-fg">{distance.name ?? 'Без названия'}</span>
          <div className="flex gap-6">
            {distance.lengthMeters > 0 && <Stat label="Длина" value={`${distance.lengthMeters} м`} />}
            {distance.climbMeters > 0 && <Stat label="Набор" value={`${distance.climbMeters} м`} />}
            <Stat label="КП" value={`${distance.controlsCount}`} />
          </div>
          {distance.mapUrl && (
            <a href={distance.mapUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
              Открыть карту дистанции
            </a>
          )}
        </div>
      ))}
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
