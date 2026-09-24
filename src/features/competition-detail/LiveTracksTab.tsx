import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../../components/EmptyState'
import { Loading } from '../../components/Loading'
import { distanceMapCorners } from '../../lib/mapCorners'
import { useDistances, useTrackedDistances } from './hooks'

interface LiveTracksTabProps {
  competitionId: string
}

/**
 * Вкладка «Онлайн-треки»: дистанции, по которым участники включили трекинг. У каждой дистанции
 * своя карта — выбор дистанции открывает полноэкранную карту её треков. Список обновляется раз
 * в 15 с (счётчики «на дистанции»).
 */
export function LiveTracksTab({ competitionId }: LiveTracksTabProps) {
  const navigate = useNavigate()
  const { data: tracked, isLoading } = useTrackedDistances(competitionId, true)
  const { data: distances } = useDistances(competitionId)

  if (isLoading) return <Loading />
  if (!tracked || tracked.length === 0) {
    return <EmptyState text="Пока никто не включил онлайн-трек. Треки появятся, когда участники включат их в приложении Competra перед стартом." />
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {tracked.map((item) => {
        const distance = distances?.find((d) => d.id === item.distanceId)
        const hasMap = distance != null && distanceMapCorners(distance) != null
        return (
          <button
            key={item.distanceId}
            type="button"
            onClick={() => navigate(`/competition/${competitionId}/live-tracks/${item.distanceId}`)}
            className="flex flex-col gap-1 rounded-lg border border-outline-variant bg-surface p-4 text-left"
          >
            <span className="text-base font-semibold text-fg">{item.name ?? distance?.name ?? 'Дистанция'}</span>
            <span className="text-sm text-fg">
              {item.activeCount > 0 && `На дистанции: ${item.activeCount} • `}Треков: {item.totalCount}
            </span>
            {!hasMap && <span className="text-xs text-on-surface-variant">Карта дистанции не загружена — треки на обычной карте</span>}
          </button>
        )
      })}
    </div>
  )
}
