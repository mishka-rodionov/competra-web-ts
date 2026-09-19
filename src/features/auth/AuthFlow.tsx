import { useState } from 'react'
import { authRepository, ERROR_USER_NOT_FOUND } from '../../api/authRepository'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Loading } from '../../components/Loading'
import { TextInput } from '../../components/TextInput'

type Step = 'choice' | 'login' | 'register' | 'code'

interface AuthFlowProps {
  onLoginSuccess: () => void
  onPrivacyClick: () => void
}

/**
 * Встраивается прямо в ProfilePage вместо навигации на отдельный роут — так же, как в старом
 * приложении (LoginPage подменяла содержимое Profile/Management, не была отдельной страницей).
 *
 * Повторяет флоу Android-приложения: отдельный вход (email → код) и отдельная регистрация
 * (имя, фамилия, дата рождения, email, согласие → код) — оба ведут на общий шаг ввода кода.
 * Согласие на обработку персональных данных запрашивается только при регистрации: у уже
 * существующего пользователя оно уже получено на бэкенде (privacyAcceptedAt).
 */
export function AuthFlow({ onLoginSuccess, onPrivacyClick }: AuthFlowProps) {
  const [step, setStep] = useState<Step>('choice')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDateStr, setBirthDateStr] = useState('')
  const [consentChecked, setConsentChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userNotFound, setUserNotFound] = useState(false)

  function resetError() {
    setError(null)
    setUserNotFound(false)
  }

  async function handleSendLoginCode() {
    setLoading(true)
    resetError()
    const result = await authRepository.sendCode(email)
    if (result.kind === 'success') setStep('code')
    else {
      setError(result.message)
      setUserNotFound(result.code === ERROR_USER_NOT_FOUND)
    }
    setLoading(false)
  }

  async function handleRegister() {
    setLoading(true)
    setError(null)
    const result = await authRepository.register({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      birth_date: new Date(birthDateStr).getTime(),
      email: email.trim(),
      privacy_accepted: consentChecked,
    })
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

  const canRegister =
    firstName.trim() !== '' && lastName.trim() !== '' && birthDateStr !== '' && email.trim() !== '' && consentChecked

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="mb-2 text-center text-3xl font-semibold text-fg">Competra</h1>

        {step === 'choice' && (
          <>
            <button
              type="button"
              onClick={() => setStep('login')}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary"
            >
              Войти
            </button>
            <button
              type="button"
              onClick={() => setStep('register')}
              className="rounded-md border border-outline px-4 py-2 text-sm text-fg"
            >
              Создать аккаунт
            </button>
          </>
        )}

        {step === 'login' && (
          <>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                resetError()
              }}
              placeholder="Email"
              className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
            />
            <button
              type="button"
              onClick={handleSendLoginCode}
              disabled={!email.trim() || loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
            >
              Получить код
            </button>
            <button type="button" onClick={() => setStep('choice')} className="text-sm text-on-surface-variant">
              ← Назад
            </button>
          </>
        )}

        {step === 'register' && (
          <>
            <TextInput label="Имя" value={firstName} onChange={setFirstName} required />
            <TextInput label="Фамилия" value={lastName} onChange={setLastName} required />
            <label className="flex flex-col gap-1">
              <span className="text-sm text-on-surface-variant">Дата рождения *</span>
              <input
                type="date"
                value={birthDateStr}
                onChange={(e) => setBirthDateStr(e.target.value)}
                className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
              />
            </label>
            <TextInput label="Email" value={email} onChange={setEmail} type="email" required />
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} />
              <span className="text-sm text-fg">Согласен с обработкой персональных данных</span>
            </label>
            <button type="button" onClick={onPrivacyClick} className="text-left text-sm text-primary underline">
              Политика конфиденциальности
            </button>
            <button
              type="button"
              onClick={handleRegister}
              disabled={!canRegister || loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
            >
              Зарегистрироваться
            </button>
            <button type="button" onClick={() => setStep('choice')} className="text-sm text-on-surface-variant">
              ← Назад
            </button>
          </>
        )}

        {step === 'code' && (
          <>
            <p className="text-base text-fg">Код отправлен на {email}</p>
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                resetError()
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
        {step === 'login' && userNotFound && (
          <button
            type="button"
            onClick={() => {
              resetError()
              setStep('register')
            }}
            className="rounded-md border border-outline px-4 py-2 text-sm text-fg"
          >
            Создать аккаунт
          </button>
        )}
      </div>
    </div>
  )
}
