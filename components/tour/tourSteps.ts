import { Step } from 'react-joyride'

export interface TourStep extends Step {
  route?: string
}

export const TOUR_STEPS: TourStep[] = [
  // ==================== WELCOME ====================
  {
    target: 'body',
    placement: 'center',
    title: '👋 Selamat Datang di LogPro!',
    content:
      'Kami akan memandu Anda mengenal dua fitur utama: Master Data dan Dashboard. Klik Lanjut untuk mulai.',
  },

  // ==================== MASTER DATA ====================
  {
    target: '[data-tour="sidebar-master"]',
    placement: 'right',
    route: '/dashboard',
    title: '📂 Menu Master Data',
    content:
      'Semua data induk — Customer, Armada, Supir, dan Proyek — dikelola dari sini. Klik grup ini untuk membuka sub-menu.',
  },

  // --- Customer ---
  {
    target: '[data-tour="customer-header"]',
    placement: 'bottom',
    route: '/master/customer',
    title: '👥 Master Customer',
    content:
      'Halaman ini menampilkan semua pelanggan yang terdaftar. Setiap invoice dan proyek terhubung ke data customer di sini.',
  },
  {
    target: '[data-tour="customer-add-btn"]',
    placement: 'bottom',
    route: '/master/customer',
    title: '➕ Tambah Customer',
    content:
      'Klik tombol ini untuk mendaftarkan customer baru. Anda bisa mengisi nama, PIC, nomor NPWP, dan status PKP.',
  },
  {
    target: '[data-tour="customer-filter"]',
    placement: 'bottom',
    route: '/master/customer',
    title: '🔍 Filter & Pencarian',
    content:
      'Cari customer berdasarkan nama, email, atau NPWP. Filter juga berdasarkan status PKP dan ada/tidaknya piutang.',
  },
  {
    target: '[data-tour="customer-table"]',
    placement: 'top',
    route: '/master/customer',
    title: '📋 Daftar Customer',
    content:
      'Tabel ini menampilkan semua customer beserta info kontak, status PKP, total piutang, dan jumlah proyek aktif.',
  },

  // --- Armada ---
  {
    target: '[data-tour="armada-header"]',
    placement: 'bottom',
    route: '/master/armada',
    title: '🚛 Master Armada',
    content:
      'Kelola data kendaraan operasional di sini. Setiap armada dapat di-assign ke Surat Jalan untuk tracking pengiriman.',
  },
  {
    target: '[data-tour="armada-summary"]',
    placement: 'bottom',
    route: '/master/armada',
    title: '📊 Ringkasan Status Armada',
    content:
      'Lihat sekilas jumlah armada Aktif, Tidak Aktif, dan Terjual. Memudahkan monitoring ketersediaan kendaraan.',
  },
  {
    target: '[data-tour="armada-add-btn"]',
    placement: 'bottom',
    route: '/master/armada',
    title: '➕ Tambah Armada',
    content:
      'Daftarkan kendaraan baru dengan nomor polisi, merek, kategori, dan kapasitas muatan.',
  },

  // --- Supir ---
  {
    target: '[data-tour="supir-header"]',
    placement: 'bottom',
    route: '/master/supir',
    title: '🧑‍✈️ Master Supir',
    content:
      'Kelola data pengemudi di sini. Supir dapat di-assign ke Surat Jalan, dan sistem akan memantau status SIM secara otomatis.',
  },
  {
    target: '[data-tour="supir-add-btn"]',
    placement: 'bottom',
    route: '/master/supir',
    title: '➕ Tambah Supir',
    content:
      'Daftarkan supir baru lengkap dengan nomor SIM dan tanggal kedaluwarsa. Sistem akan mengingatkan jika SIM hampir habis.',
  },
  {
    target: '[data-tour="supir-table"]',
    placement: 'top',
    route: '/master/supir',
    title: '⚠️ Status SIM Supir',
    content:
      'Baris supir dengan SIM yang akan atau sudah kedaluwarsa akan ditandai warna berbeda agar mudah diperhatikan.',
  },

  // --- Proyek ---
  {
    target: '[data-tour="proyek-header"]',
    placement: 'bottom',
    route: '/master/proyek',
    title: '📁 Proyek & Kontrak',
    content:
      'Setiap pengiriman dan invoice dikaitkan ke proyek. Di sini Anda bisa memantau progres dan performa finansial tiap kontrak.',
  },
  {
    target: '[data-tour="proyek-summary"]',
    placement: 'bottom',
    route: '/master/proyek',
    title: '📊 Ringkasan Proyek',
    content:
      'Lihat jumlah proyek Aktif, Selesai, dan Ditunda sekilas.',
  },
  {
    target: '[data-tour="proyek-add-btn"]',
    placement: 'bottom',
    route: '/master/proyek',
    title: '➕ Tambah Proyek',
    content:
      'Buat proyek/kontrak baru, pilih customer, isi nomor kontrak, dan tentukan periode. Proyek aktif siap digunakan di Surat Jalan.',
  },

  // ==================== DASHBOARD ====================
  {
    target: 'body',
    placement: 'center',
    route: '/dashboard',
    title: '🖥️ Sekarang ke Dashboard!',
    content:
      'Master Data sudah dikenal. Sekarang kita lihat Dashboard — pusat kendali operasional harian Anda.',
  },
  {
    target: '[data-tour="sidebar-dashboard"]',
    placement: 'right',
    route: '/dashboard',
    title: '🏠 Menu Dashboard',
    content:
      'Klik menu ini kapan saja untuk kembali ke halaman utama Dashboard.',
  },
  {
    target: '[data-tour="dashboard-filter"]',
    placement: 'bottom',
    route: '/dashboard',
    title: '🗂️ Filter Periode & Modul',
    content:
      'Filter tampilan dashboard berdasarkan modul dan periode waktu. Klik "Terapkan Filter" untuk memperbarui semua data yang tampil.',
  },
  {
    target: '[data-tour="dashboard-metrics"]',
    placement: 'bottom',
    route: '/dashboard',
    title: '📈 Kartu Metrik Utama',
    content:
      'Empat KPI terpenting bisnis Anda dalam satu pandangan: total piutang, SJ berjalan, pendapatan bulan ini, dan status armada.',
  },
  {
    target: '[data-tour="dashboard-charts"]',
    placement: 'top',
    route: '/dashboard',
    title: '📊 Grafik Analitik',
    content:
      'Donut chart menampilkan komposisi status invoice, sementara grafik revenue memperlihatkan tren pendapatan bulanan.',
  },
  {
    target: '[data-tour="dashboard-activity"]',
    placement: 'top',
    route: '/dashboard',
    title: '🕐 Aktivitas Terkini',
    content:
      'Log aktivitas real-time dari seluruh modul — Surat Jalan terkirim, invoice dibuat, pembayaran masuk, dan lainnya.',
  },

  // ==================== FINAL ====================
  {
    target: 'body',
    placement: 'center',
    route: '/dashboard',
    title: '🎉 Tour Selesai!',
    content:
      'Anda sudah mengenal Master Data dan Dashboard. Mulailah dengan mengisi data Customer, Armada, Supir, dan Proyek, lalu pantau semuanya dari Dashboard. Selamat bekerja!',
  },
]
