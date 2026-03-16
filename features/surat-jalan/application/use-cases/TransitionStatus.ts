import { StatusOperasional } from '../../domain/entities/SuratJalan'

const ALLOWED_TRANSITIONS: Record<StatusOperasional, StatusOperasional[]> = {
  [StatusOperasional.DRAFT]: [StatusOperasional.ASSIGNED, StatusOperasional.VOID],
  [StatusOperasional.ASSIGNED]: [StatusOperasional.DELIVERED, StatusOperasional.VOID],
  [StatusOperasional.DELIVERED]: [StatusOperasional.VOID],
  [StatusOperasional.VOID]: [],
}

export function canTransition(current: StatusOperasional, next: StatusOperasional): boolean {
  return ALLOWED_TRANSITIONS[current].includes(next)
}

export function getAllowedTransitions(current: StatusOperasional): StatusOperasional[] {
  return ALLOWED_TRANSITIONS[current]
}
