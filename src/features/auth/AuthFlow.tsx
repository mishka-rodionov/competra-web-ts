import { useState, type FormEvent, type ReactNode } from 'react'
import { authRepository, ERROR_USER_NOT_FOUND } from '../../api/authRepository'
import { ErrorMessage } from '../../components/ErrorMessage'
import { GenderSelector } from '../../components/GenderSelector'
import { analytics } from '../../lib/analytics/analytics'
import { AnalyticsEvents } from '../../lib/analytics/events'
import type { Gender } from '../../types/user'
import { AuthHeader, CompetraLogo, MailIcon, PersonIcon } from './AuthHeader'

type Step = 'choice' | 'login' | 'register' | 'code'

/** Длина кода подтверждения — eSport генерирует 6 цифр (createAndSendVerificationCode). */
const CODE_LENGTH = 6

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Ссылка на политику открывается в новой вкладке — чтобы не терять заполненную форму регистрации. */
const PRIVACY_POLICY_HREF = '#/privacy'

const inputClass =
  'w-full rounded-md border border-outline bg-surface px-3 py-2.5 text-fg outline-none focus:border-primary focus:ring-1 focus:ring-primary'
const primaryButtonClass =
  'rounded-md bg-primary px-4 py-3 text-sm font-medium text-on-primary transition-opacity disabled:opacity-50'
const secondaryButtonClass = 'rounded-md border border-outline px-4 py-3 text-sm font-medium text-fg'
const linkButtonClass = 'text-sm font-medium text-primary hover:underline'

/** В аналитику уходит только домен email — сам адрес это PII. */
function emailDomain(email: string): string {
  return email.split('@')[1]?.trim().toLowerCase() ?? ''
}

interface FieldProps {
  label: string
  required?: boolean
  hint?: string
  error?: string | null
  children: ReactNode
}

/** Подпись + поле + подсказка (или ошибка) под ним. */
function Field({ label, required, hint, error, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-on-surface-variant">
        {label}
        {required && ' *'}
      </span>
      {children}
      {error ? (
        <span className="text-xs text-error">{error}</span>
      ) : (
        hint && <span className="text-xs text-on-surface-variant">{hint}</span>
      )}
    </label>
  )
}

interface AuthFlowProps {
  onLoginSuccess: () => void
}

/**
 * Встраивается прямо в ProfilePage вместо навигации на отдельный роут — так же, как в старом
 * приложении (LoginPage подменяла содержимое Profile/Management, не была отдельной страницей).
 *
 * Повторяет флоу Android-приложения: отдельный вход (email → код) и отдельная регистрация
 * (имя, фамилия, дата рождения, пол, email, согласие → код) — оба ведут на общий шаг ввода кода.
 * Согласие на обработку персональных данных запрашивается только при регистрации: у уже
 * существующего пользователя оно уже получено на бэкенде (privacyAcceptedAt).
 */
export function AuthFlow({ onLoginSuccess }: AuthFlowProps) {
  const [step, setStep] = useState<Step>('choice')
  // Шаг, с которого пришли на ввод кода, — туда возвращает «Изменить email»
  const [codeOrigin, setCodeOrigin] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDateStr, setBirthDateStr] = useState('')
  const [gender, setGender] = useState<Gender | null>(null)
  const [consentChecked, setConsentChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userNotFound, setUserNotFound] = useState(false)

  const trimmedEmail = email.trim()
  const isEmailValid = EMAIL_PATTERN.test(trimmedEmail)
  const emailError = trimmedEmail !== '' && !isEmailValid ? 'Некорректный адрес почты' : null
  const today = new Date().toISOString().slice(0, 10)

  const canRegister =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    birthDateStr !== '' &&
    gender != null &&
    isEmailValid &&
    consentChecked

  function resetError() {
    setError(null)
    setUserNotFound(false)
  }

  function goTo(next: Step) {
    resetError()
    setStep(next)
  }

  function openCodeStep(origin: 'login' | 'register') {
    setCodeOrigin(origin)
    setCode('')
    setStep('code')
  }

  async function handleSendLoginCode(e: FormEvent) {
    e.preventDefault()
    if (!isEmailValid || loading) return
    setLoading(true)
    resetError()
    analytics.trackEvent(AnalyticsEvents.authLoginRequested(emailDomain(trimmedEmail)))
    const result = await authRepository.sendCode(trimmedEmail)
    if (result.kind === 'success') openCodeStep('login')
    else {
      setError(result.message)
      setUserNotFound(result.code === ERROR_USER_NOT_FOUND)
    }
    setLoading(false)
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    if (!canRegister || gender == null || loading) return
    setLoading(true)
    setError(null)
    analytics.trackEvent(AnalyticsEvents.registrationSubmitted)
    const result = await authRepository.register({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      birth_date: new Date(birthDateStr).getTime(),
      gender,
      email: trimmedEmail,
      privacy_accepted: consentChecked,
    })
    if (result.kind === 'success') {
      analytics.trackEvent(AnalyticsEvents.registrationSuccess)
      openCodeStep('register')
    } else setError(result.message)
    setLoading(false)
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault()
    if (code.length !== CODE_LENGTH || loading) return
    setLoading(true)
    setError(null)
    analytics.trackEvent(AnalyticsEvents.authCodeSubmitted)
    const result = await authRepository.verifyCode(trimmedEmail, code)
    if (result.kind === 'success') {
      analytics.trackEvent(AnalyticsEvents.authLoginSuccess)
      onLoginSuccess()
    } else {
      analytics.trackEvent(AnalyticsEvents.authLoginFailed(result.code != null ? 'invalid_code' : 'network'))
      setError(result.message)
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm rounded-lg border border-outline-variant bg-surface p-6 shadow-sm">
        {step === 'choice' && (
          <div className="flex flex-col gap-3">
            <AuthHeader
              icon={<CompetraLogo className="h-16 w-16" />}
              title="Добро пожаловать в Competra"
              subtitle="Войдите или создайте аккаунт, чтобы регистрироваться на старты и следить за своими результатами"
            />
            <button type="button" onClick={() => goTo('login')} className={primaryButtonClass}>
              Войти
            </button>
            <button type="button" onClick={() => goTo('register')} className={secondaryButtonClass}>
              Создать аккаунт
            </button>
          </div>
        )}

        {step === 'login' && (
          <form onSubmit={handleSendLoginCode} className="flex flex-col gap-4" noValidate>
            <AuthHeader
              icon={<CompetraLogo className="h-16 w-16" />}
              title="Вход в Competra"
              subtitle="Введите email, указанный при регистрации, — мы пришлём на него код для входа"
            />
            <Field label="Email" error={emailError}>
              <input
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  resetError()
                }}
                placeholder="name@example.com"
                className={inputClass}
              />
            </Field>
            <button type="submit" disabled={!isEmailValid || loading} className={primaryButtonClass}>
              {loading ? 'Отправляем код…' : 'Получить код'}
            </button>
            {error && <ErrorMessage message={error} />}
            {userNotFound && (
              <button type="button" onClick={() => goTo('register')} className={secondaryButtonClass}>
                Создать аккаунт с этим email
              </button>
            )}
            <p className="text-center text-sm text-on-surface-variant">
              Нет аккаунта?{' '}
              <button type="button" onClick={() => goTo('register')} className={linkButtonClass}>
                Зарегистрироваться
              </button>
            </p>
          </form>
        )}

        {step === 'register' && (
          <form onSubmit={handleRegister} className="flex flex-col gap-4" noValidate>
            <AuthHeader
              icon={<PersonIcon className="h-10 w-10" />}
              title="Регистрация"
              subtitle="Заполните данные о себе — они понадобятся для участия в соревнованиях"
            />
            <Field label="Имя" required>
              <input
                autoComplete="given-name"
                autoFocus
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Фамилия" required>
              <input
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Дата рождения" required>
              <input
                type="date"
                autoComplete="bday"
                min="1920-01-01"
                max={today}
                value={birthDateStr}
                onChange={(e) => setBirthDateStr(e.target.value)}
                className={inputClass}
              />
            </Field>
            <GenderSelector value={gender} onChange={setGender} required />
            <Field label="Email" required hint="На этот адрес придёт код для входа" error={emailError}>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  resetError()
                }}
                placeholder="name@example.com"
                className={inputClass}
              />
            </Field>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span className="text-sm text-on-surface-variant">
                Я согласен(-на) с обработкой персональных данных и{' '}
                <a href={PRIVACY_POLICY_HREF} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  политикой конфиденциальности
                </a>
              </span>
            </label>
            <button type="submit" disabled={!canRegister || loading} className={primaryButtonClass}>
              {loading ? 'Отправляем…' : 'Зарегистрироваться'}
            </button>
            {error && <ErrorMessage message={error} />}
            <p className="text-center text-sm text-on-surface-variant">
              Уже есть аккаунт?{' '}
              <button type="button" onClick={() => goTo('login')} className={linkButtonClass}>
                Войти
              </button>
            </p>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleVerifyCode} className="flex flex-col gap-4" noValidate>
            <AuthHeader
              icon={<MailIcon className="h-10 w-10" />}
              title="Введите код"
              subtitle={
                <>
                  Мы отправили код для входа на <span className="font-medium text-fg">{trimmedEmail}</span>
                </>
              }
            />
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={CODE_LENGTH}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))
                resetError()
              }}
              placeholder={'•'.repeat(CODE_LENGTH)}
              aria-label="Код из письма"
              className={`${inputClass} py-3 text-center font-mono text-2xl tracking-[0.5em]`}
            />
            <button type="submit" disabled={code.length !== CODE_LENGTH || loading} className={primaryButtonClass}>
              {loading ? 'Проверяем…' : 'Войти'}
            </button>
            {error && <ErrorMessage message={error} />}
            <p className="text-center text-sm text-on-surface-variant">
              Не тот адрес?{' '}
              <button type="button" onClick={() => goTo(codeOrigin)} className={linkButtonClass}>
                Изменить email
              </button>
            </p>
          </form>
        )}

        {step !== 'choice' && step !== 'code' && (
          <button
            type="button"
            onClick={() => goTo('choice')}
            className="mt-3 w-full text-center text-sm text-on-surface-variant"
          >
            ← Назад
          </button>
        )}
      </div>
    </div>
  )
}
