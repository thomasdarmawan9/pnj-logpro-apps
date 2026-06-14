'use strict'

const path = require('path')

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

const {
  sequelize,
  Customer,
  StockItem,
  StockReceipt,
  StockReceiptItem,
  StockDisbursement,
} = require('../src/models')
const { applyStockDelta, round2 } = require('../src/utils/stockBalance')

const CUSTOMER_NAME = 'PT. TONGGAK AMPUH GLOBAL'
const SOURCE_NOTE = 'Import PDF "Rekapan Tiang Tonggak Ampuh Global (2).pdf"'

const STOCK_ITEM = {
  code: 'TIANG',
  name: 'Tiang',
  category: 'Tiang',
  unit: 'Btg',
  description: 'Tiang dari rekapan PT. Tonggak Ampuh Global.',
}

const STOCK_CATEGORIES = {
  tm: 'TM 12/200',
  tr: 'TR 9/200',
}

const RECEIPTS = [
  {
    number: 'PDF-TAG-IN-KLOTER-14',
    date: '2026-01-01',
    document: 'KLOTER 14',
    supplier: 'KLOTER 14',
    notes: 'Sisa Stok Tiang Kloter 14 (3 Btg TR 9).',
    items: { tr: 3 },
  },
  {
    number: 'PDF-TAG-IN-SPAL-140',
    date: '2025-12-22',
    document: 'SPAL 140',
    supplier: 'Kapal Bahari 27',
    notes: 'Pengiriman Tgl 22/12/25 (Kapal Bahari 27 SPAL 140).',
    items: { tm: 37 },
  },
  {
    number: 'PDF-TAG-IN-SPAL-141',
    date: '2026-01-07',
    document: 'SPAL 141',
    supplier: 'Kapal Bahari 27',
    notes: 'Pengiriman Tgl 7/01/26 (Kapal Bahari 27 SPAL 141).',
    items: { tm: 450, tr: 200 },
  },
  {
    number: 'PDF-TAG-IN-SPAL-143',
    date: '2026-01-29',
    document: 'SPAL 143',
    supplier: 'Kapal Bahari 27',
    notes: 'Pengiriman Tgl 29/01/26 (Kapal Bahari 27 SPAL 143).',
    items: { tm: 78, tr: 86 },
  },
  {
    number: 'PDF-TAG-IN-SPAL-144',
    date: '2026-02-17',
    document: 'SPAL 144',
    supplier: 'Kapal Bahari 27',
    notes: 'Pengiriman Tgl 17/02/26 (Kapal Bahari 27 SPAL 144).',
    items: { tm: 114 },
  },
  {
    number: 'PDF-TAG-IN-SPAL-145',
    date: '2026-02-28',
    document: 'SPAL 145',
    supplier: 'Kapal STB 16',
    notes: 'Pengiriman Tgl 28/2/26 (Kapal STB 16 SPAL 145).',
    items: { tm: 152, tr: 165 },
  },
  {
    number: 'PDF-TAG-IN-SPAL-148',
    date: '2026-05-04',
    document: 'SPAL 148',
    supplier: 'Kapal STB 16',
    notes: 'Pengiriman Tgl 04/5/26 (Kapal STB 16 SPAL 148).',
    items: { tm: 116 },
  },
  {
    number: 'PDF-TAG-IN-SPAL-149',
    date: '2026-05-05',
    document: 'SPAL 149',
    supplier: 'Kapal Bahari 27',
    notes: 'Pengiriman Tgl 05/5/26 (Kapal Bahari 27 SPAL 149).',
    items: { tm: 228, tr: 270 },
  },
]

const DISBURSEMENTS = [
  [2, '2026-01-09', 'Setyo', 'BE 8330 OU', 4, 0, 'Perum Puri Agung , Perum Griya', '', '354'],
  [3, '2026-01-19', 'Wawan', 'KB 8693 HC', 24, 0, 'Desa Nyin , Kab Landak', '2654', '356'],
  [4, '2026-01-19', 'Abray', 'KB 8873 WC', 24, 0, 'Desa Nyin , Kab Landak', '2656', '357'],
  [5, '2026-01-19', '', 'B 9169 TEJ', 24, 0, 'Desa Nyin , Kab Landak', '2657', '358'],
  [6, '2026-01-19', 'Budi', 'KB 8332 HM', 24, 0, 'Desa Nyin , Kab Landak', '2658', '359'],
  [7, '2026-01-16', 'Iqbal', 'KB 8211 WB', 24, 0, 'Desa Nyin , Kab Landak', '2659', '360'],
  [8, '2026-01-20', 'Anto', 'KB 8989 MA', 24, 0, 'Desa Nyin , Kab Landak', '2660', '361'],
  [9, '2026-01-20', 'Rudi', 'KB 8991 NA', 24, 0, 'Desa Nyin , Kab Landak', '2661', '362'],
  [10, '2026-01-21', 'Lana', 'B 9804 KYX', 0, 40, 'Desa Nyin , Kab Landak', '2662', '363'],
  [11, '2026-01-21', 'Abray', 'KB 8873 WC', 26, 0, 'Desa Nyin , Kab Landak', '2663', '364'],
  [12, '2026-01-21', 'Wawan', 'KB 8693 HC', 15, 13, 'Desa Nyin , Kab Landak', '2664', '365'],
  [13, '2026-01-26', 'Gundul', 'KB 8989 MA', 24, 1, 'Nanga Dedai , Sintang', '2693', '366'],
  [14, '2026-01-26', 'Lana', 'B 9804 KYX', 24, 1, 'Nanga Dedai , Sintang', '2694', '367'],
  [15, '2026-01-26', 'Abray', 'KB 8873 WC', 24, 0, 'Nanga Dedai , Sintang', '2695', '368'],
  [16, '2026-01-28', 'Ndun', 'B 9812 KYX', 24, 1, 'Sintang', '2696', '370'],
  [17, '2026-01-28', 'Lukman', 'B 9881 UEM', 24, 1, 'Sintang', '2697', '371'],
  [18, '2026-01-28', 'Wawan', 'BK 8693 HC', 18, 0, 'Tayan', '2692', '369'],
  [19, '2026-01-28', 'Wawan', 'BK 8693 HC', 10, 0, 'Balai Karangan', '2692', '369'],
  [20, '2026-01-29', 'Wawan', 'KB 8693 HC', 25, 0, 'Sintang / Nanga Dedai', '2698', '372'],
  [21, '2026-01-29', 'Linoy', 'BK 8183 GR', 25, 0, 'Sintang / Nanga Dedai', '2699', '374'],
  [22, '2026-01-30', 'Alek', 'BE 8326 SU', 4, 0, 'Perum Kentura Residence', '', '375'],
  [23, '2026-01-30', 'Alek', 'BE 8326 SU', 2, 0, 'PT Artha Pelita Karya', '', '376'],
  [24, '2026-01-30', 'Alek', 'BE 8326 SU', 1, 0, 'Perum Kentura Residence', '', '376'],
  [25, '2026-01-31', 'Hendy', 'KB 8873 WC', 1, 0, 'Pangkalan Batu', '2700', '377'],
  [26, '2026-01-31', 'Hendi', 'KB 8873 WC', 21, 13, 'Pangkalan Batu', '2700', '377'],
  [27, '2026-02-02', 'Uray', 'BK 8183 GK', 25, 0, 'Sintang / Nanga Dedai', '2745', '380'],
  [28, '2026-02-04', 'Andri', 'KB 8889 MA', 0, 40, 'Desa Nyin , Kab Landak', '2747', '384'],
  [29, '2026-02-06', 'Uray', 'BK 8183 GR', 18, 0, 'KP. Baru Kec Toba , Sanggau', '2749', '387'],
  [30, '2026-02-07', 'Uray', 'BK 8183 GR', 24, 0, 'Nanga Dedai , Sintang', '2752', '390'],
  [31, '2026-02-04', 'Wawan', 'BK 8693 HC', 0, 40, 'Pangkalan Batu', '2746', '383'],
  [32, '2026-02-06', '', 'KB 8308 HM', 0, 40, 'Desa Nyin , Kab Landak', '2750', '388'],
  [33, '2026-02-08', 'Lukman', 'BK 8183 GR', 0, 42, 'Nanga Dedai , Sintang', '2751', '389'],
  [34, '2026-02-10', 'Uray', 'BK 8183 GR', 20, 0, 'Sungai Jelaian , Ketapang', '2753', '393'],
  [35, '2026-02-10', '', 'KB 8202 WJ', 0, 33, 'Sungai Jelaian , Ketapang', '2754', '394'],
  [36, '2026-02-10', 'Wawan', 'BK 8693 HC', 25, 0, 'Sungai Jelaian , Ketapang', '2755', '395'],
  [37, '2026-02-11', 'Riski', 'BE 8307 QU', 2, 0, 'PT Kaolin', '', '396'],
  [38, '2026-02-11', 'Riski', 'BE 8307 QU', 2, 0, 'Lim Thun Kie', '', '396'],
  [39, '2026-02-20', 'Budi', 'N 9060 UT', 4, 0, 'Bagendang Mall', '', '1252'],
  [40, '2026-02-20', 'Riski', 'BE 8307 QU', 2, 0, 'Lokale Sungai Duri', '', '1251'],
  [41, '2026-02-20', 'Riski', 'BE 8307 QU', 2, 0, 'CV Kerbau Laut', '', '1251'],
  [42, '2026-02-23', 'Riski', 'BE 8307 QU', 0, 9, 'Kandang Ayam , M Shalahudin', '', '1253'],
  [43, '2026-02-23', 'Ndun', 'B 9819 KYX', 23, 0, 'Sungai Jelaian , Ketapang', '2787', '1303'],
  [44, '2026-02-23', 'Aruw', 'B 9804 KYX', 23, 0, 'Sungai Jelaian , Ketapang', '2788', '1304'],
  [45, '2026-02-23', 'Uray', 'BK 8183 GR', 20, 0, 'Sungai Jelaian , Ketapang', '2789', '1306'],
  [46, '2026-02-23', 'Abray', 'KB 8873 WC', 24, 0, 'Sungai Jelaian , Ketapang', '2790', '1307'],
  [47, '2026-02-23', 'Riski', 'BE 8307 QU', 2, 0, 'PT Antam / PT ICHA', '', '1308'],
  [48, '2026-02-23', 'Lukman', 'B 0881 UEM', 22, 3, 'Sungai Jelaian , Ketapang', '2791', '1309'],
  [49, '2026-02-25', 'Riski', 'BE 8307 QU', 0, 3, 'Benyamin Mempawah', '', '1312'],
  [51, '2026-02-25', 'Riski', 'BE 8307 QU', 0, 2, 'CV Putra Agro', '', '1312'],
  [52, '2026-03-06', 'Wawan', 'BK 8653 HC', 25, 0, 'PT KSA AFO 1 DAN 3', '2816', '1256'],
  [53, '2026-03-06', 'Hendy', 'KB 8873 WC', 25, 0, 'PT KSA AFO 1 DAN 3', '2817', '1257'],
  [54, '2026-03-06', 'Uray', 'KB 8183 GR', 4, 17, 'PT KSA AFO 1 DAN 3', '2818', '1258'],
  [55, '2026-03-07', 'Ade', 'B 9169 TEJ', 8, 19, 'Kandang Ayam , Haryanto', '2861', '1259'],
  [56, '2026-03-07', 'Ade', 'B 9169 TEJ', 2, 2, 'PB. Edy Kurniawan', '2861', '1259'],
  [57, '2026-03-11', 'Widodo', 'BE 8332 OU', 0, 4, 'Perum Amisa Residence', '', '1260'],
  [58, '2026-03-11', 'Widodo', 'BE 8332 OU', 0, 7, 'RPH Kandang Babi', '', '1261'],
  [59, '2026-03-12', 'Widodo', 'BE 8332 OU', 0, 6, 'RPH Kandang Babi', '', '1262'],
  [60, '2026-03-06', 'Riski', 'BE 8307 QU', 0, 8, 'Perum Mitra Jiwa Properti', '', '1255'],
  [61, '2026-04-01', 'Widodo', 'BE 8332 OU', 2, 0, 'Edy Kurniawan , Mempawah', '', '1264'],
  [62, '2026-04-08', 'Widodo', 'BE 8332 OU', 0, 3, 'PT Baruna Sambas', '', '1266'],
  [63, '2026-04-08', 'Widodo', 'BE 8332 OU', 0, 4, 'PB KOMP SAMANGAU', '', '1266'],
  [64, '2026-04-10', '', 'KB 8207 WO', 0, 17, 'Sintang', '2889', '1269'],
  [65, '2026-04-10', '', 'KB 8207 WO', 0, 14, 'Silat', '2889', '1269'],
  [66, '2026-04-10', 'Anca', 'M 8193 WO', 0, 14, 'Sanggau', '2891', '1270'],
  [67, '2026-04-15', 'Uray', 'BK 8183 GK', 15, 0, 'PT Landai Semesta , Sintang', '2892', '1277'],
  [69, '2026-04-24', 'Sutiyono', 'BE 8332 OU', 4, 0, 'PT. SARI GUNA PRIMATIRTA', '', '1289'],
  [70, '2026-04-25', 'Sutiyono', 'BE 8332 OU', 2, 0, 'LASARUS ULP SINTANG', '', '1290'],
  [71, '2026-04-30', 'Dedy Ranga Satri', 'KB 8307 OU', 1, 4, 'KMP KAYU TANAM ulp Mempawah', '', '1293'],
  [72, '2026-05-01', 'Uray', 'BK 8183 GK', 0, 12, 'SUNGAI DURI', '2950', '51'],
  [73, '2026-05-01', 'Uray', 'BK 8283 GK', 0, 27, 'PEMANGKAT', '2950', '51'],
  [74, '2026-05-07', 'Dedy Ranga Satri', 'BE 8307 QU', 0, 3, 'PRM ANUGERAH ILAHI MANSION', '', '56'],
  [75, '2026-05-07', 'Dedy Ranga Satri', 'BE 8307 QU', 0, 1, 'PRM MARISA MANSION 4', '', '56'],
  [76, '2026-05-08', 'Dedy Ranga Satri', 'BE 8307 QU', 3, 0, 'SUPARMAN', '', '57'],
  [77, '2026-05-08', 'Dedy Ranga Satri', 'BE 8307 QU', 1, 0, 'PRM MARISA MANSION 4', '', '57'],
  [78, '2026-05-08', 'Lukman', 'B 9881 UEM', 25, 0, 'SIMPANG NANGA MAU', '2982', '58'],
  [79, '2026-05-11', 'Subhan', 'KB 8453 SJ', 25, 0, 'PT PSP MEMPAWAH', '2984', '75'],
  [80, '2026-05-12', 'Subhan', 'KB 8453 SJ', 25, 0, 'SIMPANG NANGA MAU', '3000', '89'],
  [81, '2026-05-14', 'Dedy Ranga Satri', 'BE 8307 QU', 4, 0, 'ENGGANG MILL PT. PSP', '', '710'],
  [82, '2026-05-15', 'Subhan', 'KB 8453 SJ', 28, 0, 'PT PSP MEMPAWAH', '2994', '715'],
  [83, '2026-05-15', 'Uray', 'BK 8183 GK', 25, 0, 'MERAKAI SINTANG', '2993', '713'],
  [84, '2026-05-15', 'Lukman', 'BM 9881 UEM', 25, 0, 'SIMPANG NANGA MAU', '2992', '714'],
  [85, '2026-05-19', 'Subhan', 'KB 8453 SJ', 25, 0, 'SIMPANG NANGA MAU', '2999', '720'],
  [86, '2026-05-20', 'Koko', 'KB 8202 HM', 23, 0, 'SIMPANG NANGA MAU', '3008', '721'],
  [87, '2026-05-20', 'Uray', 'BK 8183 GK', 22, 0, 'MERAKAI SINTANG', '3006', '718'],
  [88, '2026-05-20', 'Lukman', 'BM 9881 UEM', 25, 0, 'SIMPANG NANGA MAU', '3007', '719'],
  [89, '2026-05-22', 'Subhan', 'KB 8453 SJ', 22, 0, 'MERAKAI SINTANG', '3017', '724'],
  [90, '2026-05-24', 'Sutyono', 'BE 8332 OU', 0, 8, 'GG KENANGA', '', '726'],
  [91, '2026-05-25', 'SUTYONO', 'BE 8332 OU', 0, 9, 'GG KENANGA', '', '725'],
  [92, '2026-05-25', 'Uray', 'BK 8183 GK', 22, 0, 'MERAKAI SINTANG', '3018', '727'],
  [93, '2026-05-25', 'Subhan', 'KB 8453 SJ', 22, 0, 'SIMPANG NANGA MAU', '3019', '728'],
  [94, '2026-05-26', 'Sutyono', 'BE 8332 OU', 0, 8, 'TERSIER 6168', '', '729', 'PDF tertulis 26/05/2025; dikoreksi menjadi 2026 mengikuti urutan rekapan.'],
  [95, '2026-05-28', 'Sutyono', 'BE 8332 OU', 0, 8, 'Tersier 678 & Jl. Palu Alam', '', '730'],
  [96, '2026-05-28', 'Sutyono', 'BE 8332 OU', 2, 0, 'PRM MAMURAJA TARIGAS', '', '731'],
  [97, '2026-05-29', 'Sutyono', 'BE 8332 OU', 0, 6, 'Pasar Lama Rasau', '', '732'],
  [98, '2026-05-29', 'Sutyono', 'BE 8332 OU', 0, 3, 'Jl Paku Alam', '', '732'],
]

function assertExpectedBalances() {
  const received = RECEIPTS.reduce((acc, receipt) => {
    acc.tm += Number(receipt.items.tm || 0)
    acc.tr += Number(receipt.items.tr || 0)
    return acc
  }, { tm: 0, tr: 0 })
  const issued = DISBURSEMENTS.reduce((acc, row) => {
    acc.tm += Number(row[4] || 0)
    acc.tr += Number(row[5] || 0)
    return acc
  }, { tm: 0, tr: 0 })
  const balance = {
    tm: received.tm - issued.tm,
    tr: received.tr - issued.tr,
  }
  if (balance.tm !== 85 || balance.tr !== 238) {
    throw new Error(`Saldo PDF tidak cocok. Terhitung TM=${balance.tm}, TR=${balance.tr}.`)
  }
  return { received, issued, balance }
}

async function findOrCreateCustomer(transaction) {
  const [customer] = await Customer.findOrCreate({
    where: { name: CUSTOMER_NAME },
    defaults: { name: CUSTOMER_NAME, is_pkp: false },
    transaction,
  })
  return customer
}

async function findOrCreateStockItem(transaction) {
  const config = STOCK_ITEM
  const [item] = await StockItem.findOrCreate({
    where: { code: config.code },
    defaults: {
      ...config,
      is_active: true,
      current_stock: 0,
      peak_stock: 0,
      created_by: null,
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  })
  return item
}

async function importReceipts(customer, items, transaction) {
  let created = 0
  let skipped = 0

  for (const receiptData of RECEIPTS) {
    const existing = await StockReceipt.findOne({
      where: { receipt_number: receiptData.number },
      transaction,
    })
    if (existing) {
      await existing.update({
        supplier_name:   receiptData.supplier || null,
        document_number: receiptData.document,
        notes:           `${receiptData.notes} ${SOURCE_NOTE}`,
      }, { transaction })
      skipped += 1
      continue
    }

    const receipt = await StockReceipt.create({
      receipt_number: receiptData.number,
      receipt_date: receiptData.date,
      supplier_name: receiptData.supplier || null,
      document_number: receiptData.document,
      customer_id: customer.id,
      notes: `${receiptData.notes} ${SOURCE_NOTE}`,
      created_by: null,
    }, { transaction })

    for (const [itemKey, qty] of Object.entries(receiptData.items)) {
      const stockItem = items[itemKey]
      await StockReceiptItem.create({
        receipt_id: receipt.id,
        stock_item_id: stockItem.id,
        qty: round2(qty),
        kategori_name: STOCK_CATEGORIES[itemKey],
        notes: receiptData.notes,
      }, { transaction })
      await applyStockDelta(stockItem, round2(qty), transaction)
    }

    created += 1
  }

  return { created, skipped }
}

async function importDisbursements(customer, items, transaction) {
  let created = 0
  let skipped = 0

  for (const row of DISBURSEMENTS) {
    const [
      rowNo, date, driver, plate, tmQty, trQty,
      destination, invoiceNumber, sjNumber, extraNote,
    ] = row

    for (const [itemKey, qty] of [['tm', tmQty], ['tr', trQty]]) {
      if (!qty) continue

      const stockItem = items[itemKey]
      const disbursementNumber = `PDF-TAG-OUT-${String(rowNo).padStart(3, '0')}-${itemKey.toUpperCase()}`
      const existing = await StockDisbursement.findOne({
        where: { disbursement_number: disbursementNumber },
        transaction,
      })
      if (existing) {
        skipped += 1
        continue
      }

      await applyStockDelta(stockItem, -round2(qty), transaction)
      await StockDisbursement.create({
        disbursement_number: disbursementNumber,
        disbursement_date: date,
        stock_item_id: stockItem.id,
        qty: round2(qty),
        kategori_name: STOCK_CATEGORIES[itemKey],
        source_type: 'manual',
        delivery_order_id: null,
        sj_number_manual: sjNumber || null,
        invoice_number_manual: invoiceNumber || null,
        driver_name: driver || null,
        vehicle_plate: plate || null,
        destination: destination || null,
        customer_id: customer.id,
        notes: [`Baris PDF No ${rowNo}.`, extraNote, SOURCE_NOTE].filter(Boolean).join(' '),
        created_by: null,
      }, { transaction })

      created += 1
    }
  }

  return { created, skipped }
}

async function main() {
  const expected = assertExpectedBalances()

  const result = await sequelize.transaction(async (transaction) => {
    const customer = await findOrCreateCustomer(transaction)
    const stockItem = await findOrCreateStockItem(transaction)
    const items = { tm: stockItem, tr: stockItem }

    const receipts = await importReceipts(customer, items, transaction)
    const disbursements = await importDisbursements(customer, items, transaction)

    await stockItem.reload({ transaction })

    return {
      customer_id: customer.id,
      receipts,
      disbursements,
      stock: {
        tiang: Number(stockItem.current_stock),
      },
    }
  })

  console.log('Validasi PDF:', expected)
  console.log('Import selesai:', result)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await sequelize.close().catch(() => {})
  })
