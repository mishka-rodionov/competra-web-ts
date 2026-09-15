import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { diaryRepository } from '../api/diaryRepository'
import { useIsLoggedIn } from '../auth/useIsLoggedIn'
import { ErrorMessage } from '../components/ErrorMessage'
import { LabeledSelect } from '../components/LabeledSelect'
import { Loading } from '../components/Loading'
import { TextInput } from '../components/TextInput'
import { AuthFlow } from '../features/auth/AuthFlow'
import { useWorkout } from '../features/diary/hooks'
import { SKI_STYLE_OPTIONS, SPORT_TYPE_OPTIONS, WORKOUT_STATUS_OPTIONS } from '../features/diary/labels'
import { parseGpxTrackPoints } from '../lib/gpxParser'
import { TrackCodec } from '../lib/trackCodec'
import type { Workout } from '../types/workout'

interface FormState {
  sportType: string
  status: string
  dateStr: string
  durationH: string
  durationM: string
  durationS: string
  distanceKm: string
  elevationGain: string
  notes: string
  cadenceSpm: string
  cadenceRpm: string
  powerWatts: string
  skiStyle: string
  trackEncoded: string | null
}

const INITIAL_FORM: FormState = {
  sportType: 'RUNNING',
  status: 'COMPLETED',
  dateStr: '',
  durationH: '',
  durationM: '',
  durationS: '',
  distanceKm: '',
  elevationGain: '',
  notes: '',
  cadenceSpm: '',
  cadenceRpm: '',
  powerWatts: '',
  skiStyle: 'CLASSIC',
  trackEncoded: null,
}

function formFromWorkout(w: Workout): FormState {
  const dateMillis = w.startedAt ?? w.scheduledDate
  return {
    sportType: w.sportType,
    status: w.status,
    dateStr: dateMillis != null ? new Date(dateMillis).toISOString().slice(0, 10) : '',
    durationH: w.durationSeconds != null ? String(Math.floor(w.durationSeconds / 3600)) : '',
    durationM: w.durationSeconds != null ? String(Math.floor((w.durationSeconds % 3600) / 60)) : '',
    durationS: w.durationSeconds != null ? String(w.durationSeconds % 60) : '',
    distanceKm: w.distanceMeters != null ? String(w.distanceMeters / 1000) : '',
    elevationGain: w.elevationGainMeters != null ? String(w.elevationGainMeters) : '',
    notes: w.notes ?? '',
    cadenceSpm: w.runDetails?.cadenceSpm != null ? String(w.runDetails.cadenceSpm) : '',
    cadenceRpm: w.bikeDetails?.cadenceRpm != null ? String(w.bikeDetails.cadenceRpm) : '',
    powerWatts: w.bikeDetails?.powerWatts != null ? String(w.bikeDetails.powerWatts) : '',
    skiStyle: w.skiDetails?.style ?? 'CLASSIC',
    trackEncoded: w.trackEncoded,
  }
}

export function WorkoutEditorPage() {
  const { id } = useParams<{ id: string }>()
  const workoutId = id != null ? Number(id) : null
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isLoggedIn = useIsLoggedIn()

  const { data: existingWorkout, isLoading: workoutLoading } = useWorkout(workoutId ?? -1)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Инициализация формы данными тренировки во время рендера (не в эффекте) — тот же паттерн,
  // что и в RatingFormPage: React-рекомендуемый способ синхронизировать состояние с пропом.
  const [loadedWorkoutId, setLoadedWorkoutId] = useState<number | null>(null)
  if (existingWorkout && existingWorkout.id !== loadedWorkoutId) {
    setLoadedWorkoutId(existingWorkout.id)
    setForm(formFromWorkout(existingWorkout))
  }

  if (!isLoggedIn) {
    return <AuthFlow onLoginSuccess={() => {}} onPrivacyClick={() => navigate('/privacy')} />
  }
  if (workoutId != null && workoutLoading) return <Loading />

  function patch(p: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...p }))
  }

  function totalDurationSeconds(): number | null {
    if (!form.durationH && !form.durationM && !form.durationS) return null
    const h = parseInt(form.durationH, 10) || 0
    const m = parseInt(form.durationM, 10) || 0
    const s = parseInt(form.durationS, 10) || 0
    return h * 3600 + m * 60 + s
  }

  async function handlePickGpx(file: File) {
    const content = await file.text()
    const points = parseGpxTrackPoints(content)
    if (points.length > 0) {
      const startedAtMs = form.dateStr ? new Date(form.dateStr).getTime() : Date.now()
      patch({ trackEncoded: TrackCodec.encode(startedAtMs, points) })
    }
  }

  async function handleSave() {
    if (!form.dateStr) {
      setError('Укажите дату')
      return
    }
    const dateMillis = new Date(form.dateStr).getTime()
    const isCompleted = form.status === 'COMPLETED'
    setError(null)
    setSaving(true)

    const result = await diaryRepository.saveWorkout({
      workoutId,
      sportType: form.sportType,
      status: form.status,
      scheduledDate: isCompleted ? null : dateMillis,
      startedAt: isCompleted ? dateMillis : null,
      durationSeconds: isCompleted ? totalDurationSeconds() : null,
      distanceMeters: isCompleted && form.distanceKm ? Math.round(parseFloat(form.distanceKm) * 1000) : null,
      elevationGainMeters: isCompleted && form.elevationGain ? parseInt(form.elevationGain, 10) : null,
      notes: form.notes.trim() || null,
      trackEncoded: isCompleted ? form.trackEncoded : null,
      runDetails: isCompleted && form.sportType === 'RUNNING' ? { cadenceSpm: form.cadenceSpm ? parseInt(form.cadenceSpm, 10) : null } : null,
      bikeDetails:
        isCompleted && form.sportType === 'CYCLING'
          ? {
              cadenceRpm: form.cadenceRpm ? parseInt(form.cadenceRpm, 10) : null,
              powerWatts: form.powerWatts ? parseInt(form.powerWatts, 10) : null,
            }
          : null,
      skiDetails: isCompleted && form.sportType === 'SKIING' ? { style: form.skiStyle } : null,
    })

    if (result.kind === 'success') {
      const saved = result.data[0]
      await queryClient.invalidateQueries({ queryKey: ['workouts'] })
      if (saved) navigate(`/diary/${saved.id}`)
      else navigate('/diary')
    } else {
      setError(result.message)
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="text-lg font-medium">{workoutId == null ? 'Новая тренировка' : 'Редактирование тренировки'}</h1>
      </header>

      <div className="flex flex-col gap-4 p-4">
        <LabeledSelect label="Вид спорта" value={form.sportType} options={SPORT_TYPE_OPTIONS} onChange={(sportType) => patch({ sportType })} />

        <div className="flex gap-2">
          {WORKOUT_STATUS_OPTIONS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => patch({ status: key })}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                form.status === key ? 'border-primary bg-primary text-on-primary' : 'border-outline text-fg'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-on-surface-variant">Дата</span>
          <input
            type="date"
            value={form.dateStr}
            onChange={(e) => patch({ dateStr: e.target.value })}
            className="rounded-md border border-outline bg-surface px-3 py-2 text-fg"
          />
        </label>

        {form.status === 'COMPLETED' && (
          <>
            <h2 className="text-base font-medium text-fg">Длительность</h2>
            <div className="flex gap-2">
              <input value={form.durationH} onChange={(e) => patch({ durationH: e.target.value.replace(/\D/g, '') })} placeholder="Ч" inputMode="numeric" className="w-1/3 rounded-md border border-outline bg-surface px-3 py-2 text-fg" />
              <input value={form.durationM} onChange={(e) => patch({ durationM: e.target.value.replace(/\D/g, '') })} placeholder="М" inputMode="numeric" className="w-1/3 rounded-md border border-outline bg-surface px-3 py-2 text-fg" />
              <input value={form.durationS} onChange={(e) => patch({ durationS: e.target.value.replace(/\D/g, '') })} placeholder="С" inputMode="numeric" className="w-1/3 rounded-md border border-outline bg-surface px-3 py-2 text-fg" />
            </div>

            <TextInput label="Дистанция, км" value={form.distanceKm} onChange={(v) => patch({ distanceKm: v.replace(/[^\d.]/g, '') })} />
            <TextInput label="Набор высоты, м" value={form.elevationGain} onChange={(v) => patch({ elevationGain: v.replace(/\D/g, '') })} />

            {form.sportType === 'RUNNING' && (
              <TextInput label="Каденс, шаг/мин" value={form.cadenceSpm} onChange={(v) => patch({ cadenceSpm: v.replace(/\D/g, '') })} />
            )}
            {form.sportType === 'CYCLING' && (
              <>
                <TextInput label="Каденс, об/мин" value={form.cadenceRpm} onChange={(v) => patch({ cadenceRpm: v.replace(/\D/g, '') })} />
                <TextInput label="Мощность, Вт" value={form.powerWatts} onChange={(v) => patch({ powerWatts: v.replace(/\D/g, '') })} />
              </>
            )}
            {form.sportType === 'SKIING' && (
              <LabeledSelect label="Стиль" value={form.skiStyle} options={SKI_STYLE_OPTIONS} onChange={(skiStyle) => patch({ skiStyle })} />
            )}

            <div className="flex flex-col gap-2">
              <h2 className="text-base font-medium text-fg">Трек</h2>
              {form.trackEncoded && (
                <p className="text-sm text-on-surface-variant">
                  Трек загружен: {form.trackEncoded.split(';').length} точек
                </p>
              )}
              <div className="flex gap-2">
                <label className="cursor-pointer rounded-md border border-outline px-3 py-1.5 text-sm text-fg">
                  Импортировать GPX
                  <input
                    type="file"
                    accept=".gpx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handlePickGpx(file)
                    }}
                  />
                </label>
                {form.trackEncoded && (
                  <button type="button" onClick={() => patch({ trackEncoded: null })} className="rounded-md border border-outline px-3 py-1.5 text-sm text-error">
                    Убрать трек
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        <TextInput label="Заметка" multiline value={form.notes} onChange={(notes) => patch({ notes })} />

        {error && <ErrorMessage message={error} />}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-primary px-4 py-3 text-sm font-medium text-on-primary disabled:opacity-50"
        >
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}
