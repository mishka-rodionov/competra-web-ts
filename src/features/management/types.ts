import type { TeamScoring } from '../../types/teamStandings'
import { DEFAULT_TIME_ZONE } from '../../lib/dateUtils'
import type { Competition, CompetitionFields } from '../../types/competition'
import type { ControlPoint } from '../../types/distance'

/** Клонирует поля соревнования для повторной отправки в save/competitions (апдейт по тому же id). */
export function competitionToFields(c: Competition, overrides: Partial<CompetitionFields> = {}): CompetitionFields {
  return {
    title: c.title,
    startDate: c.startDate,
    endDate: c.endDate,
    kindOfSport: c.kindOfSport,
    description: c.description,
    address: c.address,
    coordinates: c.coordinates,
    status: c.status,
    registrationStart: c.registrationStart,
    registrationEnd: c.registrationEnd,
    maxParticipants: c.maxParticipants,
    feeAmount: c.feeAmount,
    feeCurrency: c.feeCurrency,
    mainOrganizerId: c.mainOrganizerId,
    organizerName: c.organizerName,
    contactPhone: c.contactPhone,
    contactEmail: c.contactEmail,
    website: c.website,
    regulationUrl: c.regulationUrl,
    mapUrl: c.mapUrl,
    imageUrl: c.imageUrl,
    organizingClubId: c.organizingClubId ?? null,
    coverCropX: c.coverCropX ?? null,
    coverCropY: c.coverCropY ?? null,
    coverCropWidth: c.coverCropWidth ?? null,
    coverCropHeight: c.coverCropHeight ?? null,
    resultsStatus: c.resultsStatus,
    timeZoneId: c.timeZoneId || DEFAULT_TIME_ZONE,
    isTest: c.isTest,
    ...overrides,
  }
}

/** Локальная дистанция, накопленная в мастере до публикации. */
export interface PendingDistance {
  /** Стабильный ключ в мастере: группы ссылаются на дистанцию по нему, а не по позиции в списке. */
  key: string
  name: string | null
  lengthMeters: number
  climbMeters: number
  controlPoints: ControlPoint[]
  finishControlPoint: number | null
  startControlPoint: number | null
  description: string | null
  /** Минимум КП («по выбору» с минимумом КП); null — все КП. */
  minControlsCount: number | null
}

/** [PendingGroup.distanceKey] группы, которой дистанция ещё не назначена. */
export const NO_DISTANCE_KEY = ''

/**
 * Локальная группа — ссылается на дистанцию по ключу: [PendingDistance.key] у добавленной вручную,
 * [xmlCourseKey] у дистанции из IOF XML, [NO_DISTANCE_KEY] — дистанция ещё не назначена.
 */
export interface PendingGroup {
  title: string
  /** "M" / "F"; null — без ограничения по полу. */
  gender: string | null
  minAge: number | null
  maxAge: number | null
  maxParticipants: number | null
  distanceKey: string
  /** Своё КВ группы; null — наследовать КВ соревнования. */
  timeLimitMinutes: number | null
  scorePenaltyPerMinute: number | null
  maxLatenessMinutes: number | null
  /** Своё N командного зачёта; null — как у соревнования. */
  teamCountedResults: number | null
}

export interface CreateCompetitionFormState {
  title: string
  startDateStr: string
  startTime: string
  zoneId: string
  address: string
  latitude: number | null
  longitude: number | null
  description: string
  direction: string
  /** SCORE / MIN_CONTROLS — итог формата «по выбору». */
  byChoiceMode: string
  /** Командный зачёт; null — зачёта нет. */
  teamScoring: TeamScoring | null
  punchingSystem: string
  startTimeMode: string
  startInterval: number
  /** КВ соревнования в минутах, строкой из поля ввода; пусто — КВ не задано. */
  controlTimeMinutes: string
  overtimePolicy: string
  registrationOpenImmediately: boolean
  regStartDateStr: string
  regStartTime: string
  registrationEndMode: string
  maxParticipants: string
  feeAmount: string
  feeCurrency: string
  /** Обложка (уже загруженная, обрезанная до 16:9). */
  imageUrl: string | null
  /** Клуб-организатор; null — от своего имени. */
  organizingClubId: string | null
  organizerName: string
  contactPhone: string
  contactEmail: string
  website: string
  regulationUrl: string
  mapUrl: string
  isTest: boolean
}

/**
 * Превью дистанции из импортируемого IOF XML — только для отображения и выбора в группах.
 * Реальный парсинг (с координатами КП) делает сервер при публикации (importFromXml); до тех пор,
 * пока соревнование не создано, читаем из XML только имя, длину и номера КП — так же, как их
 * разбирает `IOFXmlParser.kt` в eSport (старт и финиш в список КП не входят).
 */
export interface XmlCoursePreview {
  name: string
  lengthMeters: number
  /** Номера КП по порядку дистанции, без старта и финиша. */
  controlNumbers: number[]
}

/** Ключ дистанции из IOF XML для [PendingGroup.distanceKey] — по порядку Course в файле. */
export function xmlCourseKey(index: number): string {
  return `xml:${index}`
}

export function parseXmlCoursePreviews(xmlContent: string): XmlCoursePreview[] {
  const doc = new DOMParser().parseFromString(xmlContent, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) return []
  const raceCourseData = doc.getElementsByTagName('RaceCourseData')[0]
  if (!raceCourseData) return []
  return [...raceCourseData.getElementsByTagName('Course')].map((course): XmlCoursePreview => {
    const name = course.getElementsByTagName('Name')[0]?.textContent?.trim() || 'Без названия'
    const lengthMeters = parseInt(course.getElementsByTagName('Length')[0]?.textContent?.trim() ?? '', 10) || 0
    const controlNumbers = [...course.getElementsByTagName('CourseControl')].flatMap((cc, j) => {
      const type = cc.getAttribute('type')
      if (type === 'Start' || type === 'Finish') return []
      // Как в eSport: номер — цифры из ссылки на КП («31», «C31»), без цифр — позиция в Course.
      const code = parseInt((cc.getElementsByTagName('Control')[0]?.textContent ?? '').replace(/\D/g, ''), 10)
      return [Number.isNaN(code) ? j : code]
    })
    return { name, lengthMeters, controlNumbers }
  })
}
