import { useNavigate } from 'react-router-dom'
import {
  EFFECTIVE_DATE,
  PRIVACY_POLICY_SECTIONS,
  USER_AGREEMENT_SECTIONS,
  type LegalSection,
} from '../features/legal/privacyPolicyContent'

export function PrivacyPolicyPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="text-lg font-medium">Политика конфиденциальности</h1>
      </header>

      <div className="flex flex-col gap-6 px-5 py-4">
        <p className="text-sm text-on-surface-variant">
          Действует с {EFFECTIVE_DATE}. Применяется к мобильному приложению Competra (Google Play, RuStore) и
          веб-версии competra.ru.
        </p>

        {PRIVACY_POLICY_SECTIONS.map((section) => (
          <Section key={section.title} section={section} />
        ))}

        <hr className="border-outline-variant" />

        {USER_AGREEMENT_SECTIONS.map((section) => (
          <Section key={section.title} section={section} />
        ))}
      </div>
    </div>
  )
}

function Section({ section }: { section: LegalSection }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-base font-semibold text-fg">{section.title}</h2>
      {section.content.map((item, idx) =>
        item.type === 'p' ? (
          <p key={idx} className="text-base text-fg">
            {item.text}
          </p>
        ) : (
          <ul key={idx} className="flex flex-col gap-1">
            {item.items.map((bullet) => (
              <li key={bullet} className="text-base text-fg">
                •&nbsp;&nbsp;{bullet}
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  )
}
