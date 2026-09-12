import { useState } from 'react'
import { authRepository } from '../../api/authRepository'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Loading } from '../../components/Loading'

type Step = 'email' | 'code'

interface LoginFormProps {
  onLoginSuccess: () => void
  onPrivacyClick: () => void
}

/**
 * Встраивается прямо в ProfilePage вместо навигации на отдельный роут — так же, как в старом
 * приложении (LoginPage подменяла содержимое Profile/Management, не была отдельной страницей).
 */
export function LoginForm({ onLoginSuccess, onPrivacyClick }: LoginFormProps) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [consentChecked, setConsentChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSendCode() {
    setLoading(true)
    setError(null)
    const result = await authRepository.sendCode(email)
    if (result.kind === 'success') setStep('code')
    else setError(result.message)
    setLoading(false)
  }

  async function handleVerifyCode() {
    setLoading(true)
    setError(null)
    const result = await authRepository.verifyCode(email, code)
    if (result.kind === 'success') onLoginSuccess()
    else setError(result.message)
    setLoading(false)
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="mb-2 text-center text-3xl font-semibold text-fg">Competra</h1>

        {step === 'email' ? (
          <>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
              placeholder="Email"
              className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
            />
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} />
              <span className="text-sm text-fg">Согласен с обработкой персональных данных</span>
            </label>
            <button type="button" onClick={onPrivacyClick} className="text-left text-sm text-primary underline">
              Политика конфиденциальности
            </button>
            <button
              type="button"
              onClick={handleSendCode}
              disabled={!email.trim() || !consentChecked || loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
            >
              Получить код
            </button>
          </>
        ) : (
          <>
            <p className="text-base text-fg">Код отправлен на {email}</p>
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setError(null)
              }}
              placeholder="Код из письма"
              className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
            />
            <button
              type="button"
              onClick={handleVerifyCode}
              disabled={!code.trim() || loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
            >
              Войти
            </button>
          </>
        )}

        {loading && <Loading />}
        {error && <ErrorMessage message={error} />}
      </div>
    </div>
  )
}
