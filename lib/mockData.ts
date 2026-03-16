export const MOCK_CREDENTIALS = {
  email: 'admin@pnj.co.id',
  password: 'pnj2026',
}

export const MOCK_USER = {
  name: 'Admin PNJ',
  email: 'admin@pnj.co.id',
  role: 'super_admin' as const,
}

export const metricCards = [
  {
    id: 'piutang',
    badge: 'outstanding',
    badgeVariant: 'gray',
    value: 'Rp 847.500.000',
    label: 'Piutang Belum Lunas',
    trend: '↑ +12.3%',
    trendColor: '#81C784',
  },
  {
    id: 'invoice',
    badge: 'urgent',
    badgeVariant: 'red',
    value: '8',
    label: 'Invoice Terlambat Bayar',
    trend: '↑ +3 dari bulan lalu',
    trendColor: '#D97706',
  },
  {
    id: 'sj',
    badge: 'normal',
    badgeVariant: 'green',
    value: '34',
    label: 'Surat Jalan Delivered',
    trend: '↑ +8.5%',
    trendColor: '#81C784',
  },
  {
    id: 'sj-invoice',
    badge: 'perlu tindakan',
    badgeVariant: 'amber',
    value: '7',
    label: 'SJ Belum Dilampirkan',
    trend: '● Perlu perhatian',
    trendColor: '#D97706',
  },
]

export const donutData = [
  { name: 'Delivered', value: 20, color: '#2D5A42' },
  { name: 'Assigned', value: 9, color: '#3E8055' },
  { name: 'Draft', value: 5, color: '#81C784' },
]

export const armadaList = [
  { plat: 'KB 1234 AB', nama: 'Toyota Zenix', status: 'Assigned', hari: '22 hari aktif', aktif: true },
  { plat: 'KB 5678 CD', nama: 'Mitsubishi Colt', status: 'Delivered', hari: '18 hari aktif', aktif: true },
  { plat: 'KB 9012 EF', nama: 'Daihatsu Gran', status: 'Draft', hari: '—', aktif: false },
]

export const revenueData = [
  { bulan: 'Okt', revenue: 820, biaya: 210 },
  { bulan: 'Nov', revenue: 940, biaya: 280 },
  { bulan: 'Des', revenue: 780, biaya: 190 },
  { bulan: 'Jan', revenue: 1100, biaya: 320 },
  { bulan: 'Feb', revenue: 1050, biaya: 290 },
  { bulan: 'Mar', revenue: 1240, biaya: 387 },
]

export const activityData = [
  {
    id: 1,
    noDokumen: 'SJ-2026-089',
    proyek: 'PT. ATP BIO / Proyek Sewa Maret',
    armada: 'Toyota Zenix KB 1561 HX',
    statusOps: 'DELIVERED',
    statusInvoice: 'terlampir',
    invoiceNo: 'INV-2829',
    tanggal: '14 Mar 2026',
  },
  {
    id: 2,
    noDokumen: 'SJ-2026-088',
    proyek: 'PT. Borneo Maju / Logistik Q1',
    armada: 'Mitsubishi Colt KB 2233 CD',
    statusOps: 'DELIVERED',
    statusInvoice: 'belum',
    invoiceNo: null,
    tanggal: '13 Mar 2026',
  },
  {
    id: 3,
    noDokumen: 'SJ-2026-087',
    proyek: 'PT. ATP BIO / Proyek Sewa Maret',
    armada: 'Toyota Veloz KB 8821 HX',
    statusOps: 'ASSIGNED',
    statusInvoice: 'terlampir',
    invoiceNo: 'INV-2829',
    tanggal: '12 Mar 2026',
  },
  {
    id: 4,
    noDokumen: 'SJ-2026-086',
    proyek: 'PT. Kalbar Energi / Kontrak Feb',
    armada: 'Daihatsu Gran KB 4455 AB',
    statusOps: 'DELIVERED',
    statusInvoice: 'belum',
    invoiceNo: null,
    tanggal: '11 Mar 2026',
  },
  {
    id: 5,
    noDokumen: 'INV-2829',
    proyek: 'PT. ATP BIO / 002/HRD/III/2026',
    armada: '3 unit kendaraan',
    statusOps: 'OUTSTANDING',
    statusInvoice: null,
    invoiceNo: null,
    tanggal: '11 Mar 2026',
  },
]
