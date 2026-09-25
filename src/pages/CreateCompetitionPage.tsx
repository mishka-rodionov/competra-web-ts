import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { competitionRepository } from '../api/competitionRepository'
import { distanceRepository } from '../api/distanceRepository'
import { groupRepository } from '../api/groupRepository'
import { ErrorMessage } from '../components/ErrorMessage'
import { Loading } from '../components/Loading'
import { DistanceDialog } from '../features/management/DistanceDialog'
import { GroupDialog } from '../features/management/GroupDialog'
import {
  BasicStep,
  DistancesStep,
  GroupsStep,
  OrganizerStep,
  RegistrationStep,
} from '../features/management/CreateCompetitionSteps'
import { parseXmlCoursePreviews } from '../features/management/types'
import type { CreateCompetitionFormState, PendingDistance, PendingGroup, XmlCoursePreview } from '../features/management/types'
import { useUserProfile } from '../features/profile/hooks'
import { analytics } from '../lib/analytics/analytics'
import { AnalyticsEvents, type CreateCompetitionStep } from '../lib/analytics/events'
import { DEFAULT_TIME_ZONE, zonedDateTimeToUtcMillis } from '../lib/dateUtils'
import { isDebugEnvironment } from '../lib/debugEnv'
import type { CreateGroupRequest } from '../types/group'
import type { Distance, SaveDistanceRequest } from '../types/distance'

const DAY_MS = 24 * 60 * 60 * 1000

const INITIAL_FORM: CreateCompetitionFormState = {
  title: '',
  startDateStr: '',
  startTime: '10:00',
  zoneId: DEFAULT_TIME_ZONE,
  address: '',
  latitude: null,
  longitude: null,
  description: '',
  direction: 'FORWARD',
  punchingSystem: 'SPORTIDENT',
  startTimeMode: 'USER_SET',
  startInterval: 60,
  controlTimeMinutes: '',
  overtimePolicy: 'IGNORE',
  registrationOpenImmediately: true,
  regStartDateStr: '',
  regStartTime: '10:00',
  registrationEndMode: 'AT_COMPETITION_START',
  maxParticipants: '',
  feeAmount: '',
  organizerName: '',
  contactPhone: '',
  contactEmail: '',
  website: '',
  regulationUrl: '',
  mapUrl: '',
  isTest: false,
}

const STEP_TITLES = ['Основное', 'Регистрация', 'Организатор', 'Дистанции', 'Группы']

const STEP_NAMES: CreateCompetitionStep[] = ['common', 'registration', 'organizator', 'distance', 'groups']
const KIND_OF_SPORT = 'Orienteering'

export function CreateCompetitionPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const isPastEvent = searchParams.get('past') === '1'
  const { data: profile } = useUserProfile()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<CreateCompetitionFormState>(INITIAL_FORM)
  const [distances, setDistances] = useState<PendingDistance[]>([])
  const [groups, setGroups] = useState<PendingGroup[]>([])
  const [showDistanceDialog, setShowDistanceDialog] = useState(false)
  const [showGroupDialog, setShowGroupDialog] = useState(false)
  const [importXmlName, setImportXmlName] = useState<string | null>(null)
  const [importXmlContent, setImportXmlContent] = useState<string | null>(null)
  const [importedPreviews, setImportedPreviews] = useState<XmlCoursePreview[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prefilledProfileId, setPrefilledProfileId] = useState<string | null>(null)

  // Организатор по умолчанию — текущий пользователь; не перетираем, если поле уже заполнено.
  if (profile && profile.id !== prefilledProfileId) {
    setPrefilledProfileId(profile.id)
    const fullName = [profile.lastName, profile.firstName, profile.middleName].filter(Boolean).join(' ')
    if (fullName && !form.organizerName) setForm((prev) => ({ ...prev, organizerName: fullName }))
  }

  function patchForm(patch: Partial<CreateCompetitionFormState>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  const distanceOptions: [number, string][] = [
    ...distances.map((d, i): [number, string] => [i, d.name ?? `Дистанция ${i + 1}`]),
    ...importedPreviews.map((p, i): [number, string] => [distances.length + i, p.name]),
  ]

  function goBack() {
    setError(null)
    if (step > 0) setStep(step - 1)
    else navigate('/management')
  }

  // Дистанцию можно добавить до смены режима старта на «по стартовой станции» — тогда у неё не будет
  // стартового КП, и чтение чипа на финише уйдёт в DSQ. Не даём пройти шаг, пока такие дистанции есть.
  const distancesWithoutStartCp =
    form.startTimeMode === 'BY_START_STATION' ? distances.filter((d) => d.startControlPoint == null) : []

  const nextEnabled =
    step === 0
      ? form.title.trim() !== '' && form.startDateStr !== '' && form.zoneId !== ''
      : step === 3
        ? (distances.length > 0 || importXmlContent != null || isPastEvent) && distancesWithoutStartCp.length === 0
        : step === 4
          ? groups.length > 0 || isPastEvent
          : true

  async function handlePickXml(file: File) {
    const content = await file.text()
    setImportXmlName(file.name)
    setImportXmlContent(content)
    setImportedPreviews(parseXmlCoursePreviews(content))
  }

  function clearXml() {
    setImportXmlName(null)
    setImportXmlContent(null)
    setImportedPreviews([])
  }

  function fillTestData() {
    const now = Date.now()
    setForm((prev) => ({
      ...prev,
      title: `[ТЕСТ] Соревнование ${now % 100000}`,
      startDateStr: new Date(now + 7 * DAY_MS).toISOString().slice(0, 10),
      startTime: '11:00',
      address: 'Москва, Лосиный Остров',
      description: 'Тестовое соревнование для отладки. Создано автозаполнением.',
      direction: 'FORWARD',
      punchingSystem: 'SPORTIDENT',
      startTimeMode: 'STRICT',
      startInterval: 60,
      registrationOpenImmediately: true,
      registrationEndMode: 'AT_COMPETITION_START',
      maxParticipants: '100',
      feeAmount: '500',
      contactPhone: '+79990000000',
      contactEmail: 'test@example.com',
      website: 'https://example.com',
      isTest: true,
    }))
  }

  useEffect(() => {
    analytics.trackEvent(AnalyticsEvents.createCompetitionStarted(KIND_OF_SPORT))
  }, [])

  function goNext() {
    analytics.trackEvent(AnalyticsEvents.createCompetitionStepCompleted(STEP_NAMES[step]))
    if (step < 4) {
      setError(null)
      setStep(step + 1)
    } else {
      publish()
    }
  }

  async function publish() {
    if (!form.startDateStr) return
    setSaving(true)
    setError(null)

    const startMs = zonedDateTimeToUtcMillis(form.startDateStr, form.startTime, form.zoneId)
    const regStart = form.registrationOpenImmediately
      ? null
      : form.regStartDateStr
        ? zonedDateTimeToUtcMillis(form.regStartDateStr, form.regStartTime, form.zoneId)
        : null
    const regEnd = form.registrationEndMode === 'DAY_BEFORE_START' ? startMs - DAY_MS : startMs

    const createResult = await competitionRepository.createCompetition({
      competitionId: crypto.randomUUID(),
      competition: {
        title: form.title.trim(),
        startDate: startMs,
        endDate: null,
        kindOfSport: KIND_OF_SPORT,
        description: form.description.trim() || null,
        address: form.address.trim() || null,
        coordinates: form.latitude != null && form.longitude != null ? { latitude: form.latitude, longitude: form.longitude } : null,
        status: isPastEvent ? 'FINISHED' : regStart == null ? 'REGISTRATION_OPEN' : 'CREATED',
        registrationStart: regStart,
        registrationEnd: regEnd,
        maxParticipants: form.maxParticipants ? parseInt(form.maxParticipants, 10) : null,
        feeAmount: form.feeAmount ? parseFloat(form.feeAmount) : null,
        feeCurrency: form.feeAmount ? 'RUB' : null,
        mainOrganizerId: profile?.id ?? null,
        organizerName: form.organizerName.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        website: form.website.trim() || null,
        regulationUrl: form.regulationUrl.trim() || null,
        mapUrl: form.mapUrl.trim() || null,
        timeZoneId: form.zoneId,
        isTest: form.isTest,
        resultsStatus: 'NOT_PUBLISHED',
      },
      direction: form.direction,
      punchingSystem: form.punchingSystem,
      startTimeMode: form.startTimeMode,
      startIntervalSeconds: form.startInterval,
      controlTimeMinutes: form.controlTimeMinutes ? parseInt(form.controlTimeMinutes, 10) : null,
      overtimePolicy: form.overtimePolicy,
    })
    if (createResult.kind === 'error') {
      setError(createResult.message)
      setSaving(false)
      return
    }
    const competitionId = createResult.data.competitionId
    if (!competitionId) {
      setError('Сервер не вернул идентификатор соревнования')
      setSaving(false)
      return
    }

    // Дистанции: ответ приходит в порядке запроса -> сопоставляем по индексу.
    let savedManualDistances: Distance[] = []
    if (distances.length > 0) {
      const distRequests: SaveDistanceRequest[] = distances.map((d) => ({
        distanceId: null,
        competitionId,
        name: d.name,
        lengthMeters: d.lengthMeters,
        climbMeters: d.climbMeters,
        controlsCount: d.controlPoints.length,
        description: d.description ?? '',
        controlPoints: d.controlPoints,
        finishControlPoint: d.finishControlPoint,
        startControlPoint: d.startControlPoint,
      }))
      const dr = await distanceRepository.saveDistances(distRequests)
      if (dr.kind === 'error') {
        setError(`Дистанции: ${dr.message}`)
        setSaving(false)
        return
      }
      savedManualDistances = dr.data
    }

    // Импорт из IOF XML — сервер парсит файл сам и возвращает id в порядке Course-элементов,
    // тот же порядок, что и (distances.length + i) в distanceOptions.
    let importedDistances: Distance[] = []
    if (importXmlContent != null) {
      const ir = await distanceRepository.importFromXml(competitionId, importXmlContent)
      if (ir.kind === 'error') {
        setError(`Импорт XML: ${ir.message}`)
        setSaving(false)
        return
      }
      importedDistances = ir.data
    }
    const savedDistances = [...savedManualDistances, ...importedDistances]

    if (groups.length > 0) {
      const groupRequests: CreateGroupRequest[] = groups.map((g) => ({
        groupId: null,
        competitionId,
        title: g.title,
        gender: g.gender,
        minAge: g.minAge,
        maxAge: g.maxAge,
        distanceId: savedDistances[g.distanceIndex]?.id ?? null,
        maxParticipants: g.maxParticipants,
        timeLimitMinutes: g.timeLimitMinutes,
        scorePenaltyPerMinute: g.scorePenaltyPerMinute,
        maxLatenessMinutes: g.maxLatenessMinutes,
      }))
      const gr = await groupRepository.saveGroups(groupRequests)
      if (gr.kind === 'error') {
        setError(`Группы: ${gr.message}`)
        setSaving(false)
        return
      }
    }

    analytics.trackEvent(AnalyticsEvents.createCompetitionFinished(competitionId, KIND_OF_SPORT))
    await queryClient.invalidateQueries({ queryKey: ['my-competitions'] })
    navigate(`/management/${competitionId}`)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 border-b border-outline-variant px-2 py-3">
        <button type="button" onClick={goBack} aria-label="Назад" className="px-2 text-xl">
          ←
        </button>
        <h1 className="truncate text-lg font-medium">
          {isPastEvent ? 'Прошедшее' : 'Создать'} · {STEP_TITLES[step]} ({step + 1}/5)
        </h1>
      </header>

      {saving ? (
        <Loading />
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-4">
            {step === 0 && isDebugEnvironment() && (
              <DebugTestToolsCard isTest={form.isTest} onIsTest={(isTest) => patchForm({ isTest })} onFill={fillTestData} />
            )}

            {step === 0 && <BasicStep form={form} onPatch={patchForm} />}
            {step === 1 && <RegistrationStep form={form} onPatch={patchForm} />}
            {step === 2 && <OrganizerStep form={form} onPatch={patchForm} />}
            {step === 3 && (
              <DistancesStep
                distances={distances}
                importXmlName={importXmlName}
                importedPreviews={importedPreviews}
                isPastEvent={isPastEvent}
                onAdd={() => setShowDistanceDialog(true)}
                onRemove={(idx) => setDistances(distances.filter((_, i) => i !== idx))}
                onPickXml={handlePickXml}
                onClearXml={clearXml}
              />
            )}
            {step === 4 && (
              <GroupsStep
                groups={groups}
                distanceOptions={distanceOptions}
                isPastEvent={isPastEvent}
                onAdd={() => setShowGroupDialog(true)}
                onRemove={(idx) => setGroups(groups.filter((_, i) => i !== idx))}
              />
            )}

            {step === 3 && distancesWithoutStartCp.length > 0 && (
              <ErrorMessage
                message={`У дистанций (${distancesWithoutStartCp.map((d) => d.name ?? 'без названия').join(', ')}) не указано стартовое КП — удалите и добавьте их заново`}
              />
            )}
            {error && <ErrorMessage message={error} />}
          </div>
        </div>
      )}

      {!saving && (
        <div className="flex items-center justify-between border-t border-outline-variant p-4">
          <button type="button" onClick={goBack} className="rounded-md border border-outline px-4 py-2 text-sm text-fg">
            ← Назад
          </button>
          <button
            type="button"
            disabled={!nextEnabled}
            onClick={goNext}
            className="rounded-md bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50"
          >
            {step < 4 ? 'Далее' : 'Завершить'}
          </button>
        </div>
      )}

      {showDistanceDialog && (
        <DistanceDialog
          isByChoice={form.direction === 'BY_CHOICE'}
          isStartCpRequired={form.startTimeMode === 'BY_START_STATION'}
          onDismiss={() => setShowDistanceDialog(false)}
          onSave={(distance) => {
            setDistances([...distances, distance])
            setShowDistanceDialog(false)
          }}
        />
      )}
      {showGroupDialog && (
        <GroupDialog
          distanceOptions={distanceOptions}
          isByChoice={form.direction === 'BY_CHOICE'}
          competitionControlTimeMinutes={form.controlTimeMinutes ? parseInt(form.controlTimeMinutes, 10) : null}
          onDismiss={() => setShowGroupDialog(false)}
          onSave={(group) => {
            setGroups([...groups, group])
            setShowGroupDialog(false)
          }}
        />
      )}
    </div>
  )
}

function DebugTestToolsCard({
  isTest,
  onIsTest,
  onFill,
}: {
  isTest: boolean
  onIsTest: (value: boolean) => void
  onFill: () => void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-tertiary/20 p-4">
      <span className="text-sm font-bold text-fg">DEBUG · инструменты отладки</span>
      <label className="flex items-center justify-between gap-2">
        <span className="flex flex-col">
          <span className="text-base text-fg">Тестовое соревнование</span>
          <span className="text-sm text-on-surface-variant">Скрыто из публичной ленты, видно только вам</span>
        </span>
        <input type="checkbox" checked={isTest} onChange={(e) => onIsTest(e.target.checked)} />
      </label>
      <button type="button" onClick={onFill} className="rounded-md bg-primary px-4 py-2 text-sm text-on-primary">
        Заполнить тестовыми данными
      </button>
    </div>
  )
}
