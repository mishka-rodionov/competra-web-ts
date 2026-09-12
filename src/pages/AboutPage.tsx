import { useNavigate } from 'react-router-dom'

const APP_VERSION = '1.0.0'
const SITE_URL = 'https://competra.ru'
const SUPPORT_EMAIL = 'support@competra.ru'

export function AboutPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="text-lg font-medium">О приложении</h1>
      </header>

      <div className="flex flex-col gap-4 p-4">
        <h2 className="text-xl font-semibold">Competra</h2>
        <p className="text-base text-on-surface-variant">
          Сервис для организации и участия в соревнованиях по спортивному ориентированию.
        </p>
        <AboutRow label="Версия" value={APP_VERSION} />
        <AboutRow label="Сайт" value={SITE_URL} />
        <AboutRow label="Поддержка" value={SUPPORT_EMAIL} />
      </div>
    </div>
  )
}

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className="text-base text-fg">{value}</span>
    </div>
  )
}
