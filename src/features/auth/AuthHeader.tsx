import type { ReactNode } from 'react'

/** Логотип Competra (монохромный слой иконки приложения) — красится через currentColor. */
export function CompetraLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="80 76 360 360" fill="none" stroke="currentColor" strokeLinecap="round" className={className} aria-hidden>
      <path d="M 241,195 A 80,80 0 1 0 241,317" strokeWidth={42} />
      <path d="M 320,220 A 40,40 0 0 1 320,292" strokeWidth={22} strokeOpacity={0.7} />
      <path d="M 352,195 A 80,80 0 0 1 352,317" strokeWidth={22} strokeOpacity={0.45} />
      <path d="M 384,170 A 120,120 0 0 1 384,342" strokeWidth={22} strokeOpacity={0.25} />
    </svg>
  )
}

/** Иконка пользователя (Material Symbols «person»). */
export function PersonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 -960 960 960" fill="currentColor" className={className} aria-hidden>
      <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Z" />
    </svg>
  )
}

/** Иконка конверта (Material Symbols «mail»). */
export function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 -960 960 960" fill="currentColor" className={className} aria-hidden>
      <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z" />
    </svg>
  )
}

interface AuthHeaderProps {
  icon: ReactNode
  title: string
  subtitle: ReactNode
}

/**
 * Шапка шагов входа/регистрации: иконка в круге, заголовок и пояснение — как AuthHeader в
 * Android (:feature:profile), чтобы обе платформы выглядели одинаково.
 */
export function AuthHeader({ icon, title, subtitle }: AuthHeaderProps) {
  return (
    <div className="mb-4 flex flex-col items-center gap-2 text-center">
      <div className="mb-2 flex h-18 w-18 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
        {icon}
      </div>
      <h1 className="text-2xl font-semibold text-fg">{title}</h1>
      <p className="text-sm text-on-surface-variant">{subtitle}</p>
    </div>
  )
}
