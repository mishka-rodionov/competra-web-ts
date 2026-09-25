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
    resultsStatus: c.resultsStatus,
    timeZoneId: c.timeZoneId || DEFAULT_TIME_ZONE,
    isTest: c.isTest,
    ...overrides,
  }
}

/** Локальная дистанция, накопленная в мастере до публикации. */
export interface PendingDistance {
  name: string | null
  lengthMeters: number
  climbMeters: number
  controlPoints: ControlPoint[]
  finishControlPoint: number | null
  startControlPoint: number | null
  description: string | null
}

/** Локальная группа — ссылается на дистанцию по индексу в списке шага «Дистанции». */
export interface PendingGroup {
  title: string
  /** "M" / "F"; null — без ограничения по полу. */
  gender: string | null
  minAge: number | null
  maxAge: number | null
  maxParticipants: number | null
  distanceIndex: number
  /** Своё КВ группы; null — наследовать КВ соревнования. */
  timeLimitMinutes: number | null
  scorePenaltyPerMinute: number | null
  maxLatenessMinutes: number | null
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
 * Реальный парсинг (с координатами КП) делает сервер при публикации (importFromXml);
 * до тех пор, пока соревнование не создано, читаем из XML только имя/длину/число КП
 * простым регэкспом.
 */
export interface XmlCoursePreview {
  name: string
  lengthMeters: number
  controlsCount: number
}

const COURSE_REGEX = /<Course>([\s\S]*?)<\/Course>/g
const NAME_REGEX = /<Name>([\s\S]*?)<\/Name>/
const LENGTH_REGEX = /<Length>([\s\S]*?)<\/Length>/
const COURSE_CONTROL_REGEX = /<CourseControl\b/g

export function parseXmlCoursePreviews(xmlContent: string): XmlCoursePreview[] {
  const previews: XmlCoursePreview[] = []
  for (const match of xmlContent.matchAll(COURSE_REGEX)) {
    const block = match[1]
    const name = NAME_REGEX.exec(block)?.[1]?.trim() || 'Без названия'
    const lengthMeters = parseInt(LENGTH_REGEX.exec(block)?.[1]?.trim() ?? '', 10) || 0
    const controlsCount = [...block.matchAll(COURSE_CONTROL_REGEX)].length
    previews.push({ name, lengthMeters, controlsCount })
  }
  return previews
}
