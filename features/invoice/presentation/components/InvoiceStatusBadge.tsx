import { InvoiceStatus } from '../../domain/entities/Invoice'

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  draft:       { label: 'Draft',       bg: '#F3F4F6', text: '#374151'   },
  sent:        { label: 'Terkirim',    bg: '#DBEAFE', text: '#1E40AF'   },
  outstanding: { label: 'Outstanding', bg: '#FFEDD5', text: '#9A3412'   },
  paid:        { label: 'Lunas',       bg: '#DCFCE7', text: '#166534'   },
  void:        { label: 'Void',        bg: '#FEE2E2', text: '#991B1B'   },
}

interface Props {
  status: InvoiceStatus | string
  size?: 'sm' | 'md'
}

export default function InvoiceStatusBadge({ status, size = 'md' }: Props) {
  const config = statusConfig[status] ?? statusConfig.draft
  const padding = size === 'sm' ? '2px 8px' : '3px 10px'
  const fontSize = size === 'sm' ? '11px' : '12px'
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding,
      borderRadius: '999px',
      backgroundColor: config.bg,
      color: config.text,
      fontSize,
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {config.label}
    </span>
  )
}
