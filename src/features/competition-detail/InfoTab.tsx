import { DEFAULT_TIME_ZONE, toLocaleDateString, utcMillisToZonedTime } from '../../lib/dateUtils'
import type { CompetitionDetail } from '../../types/competition'
import { sportLabel, statusColorClass, statusLabel } from '../competitions/labels'
import { Field, LinkField } from './Field'
import { useOrganizerClubName } from './hooks'
import { InfoCard } from './InfoCard'
import { ParticipantsProgress } from './ParticipantsProgress'

function registrationPeriodText(detail: CompetitionDetail): string | null {
  const start = detail.registrationStart != null ? toLocaleDateString(detail.registrationStart) : null
  const end = detail.registrationEnd != null ? toLocaleDateString(detail.registrationEnd) : null
  if (start && end) return `${start} – ${end}`
  if (start) return `с ${start}`
  if (end) return `до ${end}`
  return null
}

/**
 * organizerName (свободный текст) имеет приоритет над ФИО из аккаунта mainOrganizerId — иначе
 * у прошедшего соревнования organizerLine всегда показывал бы того, кто вносил данные, а не
 * реального организатора события. См. аналогичный комментарий в старом CompetitionDetailPage.kt.
 */
function buildOrganizerLine(clubName: string | null | undefined, detail: CompetitionDetail): string | null {
  const personalName = [detail.organizerLastName, detail.organizerFirstName, detail.organizerMiddleName]
    .filter((v): v is string => !!v?.trim())
    .join(' ')
  const displayName = detail.organizerName?.trim() || personalName
  const parts = [clubName, displayName || null].filter((v): v is string => !!v)
  return parts.length > 0 ? parts.join(' · ') : null
}

/** Бэкенд шлёт "" вместо null для незаполненных опциональных строк — сводим к null. */
function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function InfoTab({ detail }: { detail: CompetitionDetail }) {
  const { data: organizerClubName } = useOrganizerClubName(detail.organizingClubId)

  const registeredTotal = detail.participantGroups.reduce((sum, g) => sum + g.registeredCount, 0)
  const zone = detail.timeZoneId || DEFAULT_TIME_ZONE
  const hasCoordinates = detail.coordinates != null && (detail.coordinates.latitude !== 0 || detail.coordinates.longitude !== 0)
  const mapUrl =
    blankToNull(detail.mapUrl) ?? (hasCoordinates ? `https://maps.google.com/?q=${detail.coordinates!.latitude},${detail.coordinates!.longitude}` : null)
  const regulationUrl = blankToNull(detail.regulationUrl)
  const website = blankToNull(detail.website)
  const contactEmail = blankToNull(detail.contactEmail)
  const contactPhone = blankToNull(detail.contactPhone)
  const organizerLine = buildOrganizerLine(organizerClubName, detail)
  const registrationPeriod = registrationPeriodText(detail)
  const hasRegistrationInfo =
    detail.registrationStart != null || detail.registrationEnd != null || detail.maxParticipants != null || (detail.feeAmount ?? 0) > 0
  const hasOrganizerInfo = organizerLine != null || contactEmail != null || contactPhone != null
  const hasLinks = mapUrl != null || regulationUrl != null || website != null

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex gap-2">
        <span className={`rounded-full bg-surface-variant px-3 py-1 text-xs font-medium ${statusColorClass(detail.status)}`}>
          {statusLabel(detail.status)}
        </span>
        <span className="rounded-full bg-surface-variant px-3 py-1 text-xs font-medium text-on-surface-variant">
          {sportLabel(detail.kindOfSport)}
        </span>
      </div>

      <InfoCard title="Когда и где">
        <span className="text-base font-semibold text-fg">{toLocaleDateString(detail.startDate)}</span>
        {detail.startTime != null && (
          <span className="text-base text-on-surface-variant">Старт в {utcMillisToZonedTime(detail.startTime, zone)}</span>
        )}
        {detail.endDate != null && detail.endDate !== detail.startDate && (
          <span className="text-base text-on-surface-variant">Окончание: {toLocaleDateString(detail.endDate)}</span>
        )}
        {detail.address && <Field label="Место проведения" value={detail.address} />}
      </InfoCard>

      {hasRegistrationInfo && (
        <InfoCard title="Регистрация">
          {registrationPeriod && <Field label="Приём заявок" value={registrationPeriod} />}
          {detail.maxParticipants != null && <ParticipantsProgress registered={registeredTotal} max={detail.maxParticipants} />}
          {(detail.feeAmount ?? 0) > 0 && (
            <Field label="Стартовый взнос" value={`${Math.trunc(detail.feeAmount!)} ${detail.feeCurrency ?? 'руб.'}`} />
          )}
        </InfoCard>
      )}

      {hasOrganizerInfo && (
        <InfoCard title="Организатор">
          {organizerLine && <Field label="Организатор" value={organizerLine} />}
          {contactEmail && <LinkField label="Email" value={contactEmail} url={`mailto:${contactEmail}`} />}
          {contactPhone && <LinkField label="Телефон" value={contactPhone} url={`tel:${contactPhone}`} />}
        </InfoCard>
      )}

      {hasLinks && (
        <InfoCard title="Документы и ссылки">
          {mapUrl && <LinkField label="Как добраться" value="Открыть карту" url={mapUrl} />}
          {regulationUrl && <LinkField label="Регламент соревнования" value="Открыть" url={regulationUrl} />}
          {website && <LinkField label="Сайт организатора" value={website} url={website} />}
        </InfoCard>
      )}

      {detail.description?.trim() && (
        <InfoCard title="Описание">
          <p className="text-base text-fg">{detail.description}</p>
        </InfoCard>
      )}
    </div>
  )
}
