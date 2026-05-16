import { StatusEvent, StatusOperasional } from '../../domain/entities/SuratJalan'
import { formatShortDate, formatTimeWIB } from '../utils/format'

interface SJTimelineProps {
  events: StatusEvent[]
}

const statusLabel: Record<StatusOperasional, string> = {
  draft: 'DRAFT',
  assigned: 'TERBIT',
  delivered: 'TERKIRIM',
  void: 'DIBATALKAN',
}

export default function SJTimeline({ events }: SJTimelineProps) {
  return (
    <div className="space-y-4">
      {events.map((event, idx) => (
        <div key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#2E7D32' }} />
            {idx !== events.length - 1 && <div className="w-px flex-1 bg-gray-200" />}
          </div>
          <div className="pb-4">
            <div className="text-sm font-semibold">
              {statusLabel[event.status]} <span className="text-xs text-gray-400">{formatShortDate(event.timestamp)}, {formatTimeWIB(event.timestamp)}</span>
            </div>
            <div className="text-xs text-gray-500">oleh: {event.actor}</div>
            <div className="text-xs text-gray-600 mt-1">{event.note}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
