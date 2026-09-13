import { FIXED_RATING_POINTS } from './labels'

export function RatingPointsInfoDialog({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-fg/40 p-4" onClick={onDismiss}>
      <div
        className="flex max-h-[80vh] w-full max-w-sm flex-col gap-3 overflow-y-auto rounded-lg bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-medium text-fg">Как начисляются очки</h3>
        <p className="text-base text-fg">
          За каждый старт, добавленный в рейтинг, участник получает очки по месту, занятому в своей группе зачёта.
          Результат в рейтинге — сумма очков за все старты.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant text-left text-xs text-on-surface-variant">
              <th className="py-1 font-normal">Место</th>
              <th className="py-1 font-normal">Очки</th>
            </tr>
          </thead>
          <tbody>
            {FIXED_RATING_POINTS.map(([place, points]) => (
              <tr key={place} className="border-b border-outline-variant last:border-0">
                <td className="py-1.5 text-fg">{place}</td>
                <td className="py-1.5 text-fg">{points}</td>
              </tr>
            ))}
            <tr>
              <td className="py-1.5 text-fg">10–40</td>
              <td className="py-1.5 text-fg">41 − место</td>
            </tr>
          </tbody>
        </table>
        <p className="text-sm text-on-surface-variant">С 41-го места очки не начисляются.</p>
        <p className="text-sm text-on-surface-variant">
          Если несколько участников набрали одинаковую сумму очков, они делят место — например, при двух третьих
          местах следующий участник получает пятое.
        </p>
        <button type="button" onClick={onDismiss} className="mt-2 rounded-md border border-outline px-4 py-2 text-sm text-fg">
          Понятно
        </button>
      </div>
    </div>
  )
}
