import { describe, expect, it } from 'vitest'
import type { AppData } from '../types'
import { buildExportSheets } from './excelExport'
import { calculateStock } from './stock'
import { crc32, createXlsx } from './xlsx'

/** Reads the files out of an uncompressed zip, checking each file's checksum. */
function unzip(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset)
  const decoder = new TextDecoder()
  const files = new Map<string, string>()
  let at = 0
  while (view.getUint32(at, true) === 0x04034b50) {
    const crc = view.getUint32(at + 14, true)
    const size = view.getUint32(at + 18, true)
    const nameLength = view.getUint16(at + 26, true)
    const name = decoder.decode(bytes.subarray(at + 30, at + 30 + nameLength))
    const data = bytes.subarray(at + 30 + nameLength, at + 30 + nameLength + size)
    expect(crc32(data)).toBe(crc)
    files.set(name, decoder.decode(data))
    at += 30 + nameLength + size
  }
  return files
}

describe('Excel export', () => {
  it('computes the standard zip checksum', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('writes every sheet with text, money and dates', () => {
    const files = unzip(createXlsx([{
      name: 'Parts',
      columns: [
        { header: 'Name', format: 'text', width: 20 },
        { header: 'Part number', format: 'text', width: 10 },
        { header: 'Price', format: 'money', width: 10 },
        { header: 'Date', format: 'date', width: 10 },
      ],
      rows: [['Coupling & seal', '0123', 1250, '2026-10-28']],
    }]))

    expect([...files.keys()]).toContain('xl/worksheets/sheet1.xml')
    expect(files.get('xl/workbook.xml')).toContain('name="Parts"')
    const sheet = files.get('xl/worksheets/sheet1.xml')!
    expect(sheet).toContain('<t xml:space="preserve">Coupling &#38; seal</t>') // special characters are escaped
    expect(sheet).toContain('<t xml:space="preserve">0123</t>') // leading zero kept
    expect(sheet).toContain('<c r="C2" s="2"><v>12.5</v></c>') // cents shown as money
    expect(sheet).toContain('<c r="D2" s="3"><v>46323</v></c>') // Excel's day number for 2026-10-28
  })

  it('lists parts with their stock and sales with their profit', () => {
    const data: AppData = {
      parts: [{ id: 1, name: 'Coupling', partNumber: 'C-1', condition: 'new', vehicle: 'Civic', salePrice: 2000,
        minStock: 1, openingQuantity: 2, openingUnitCost: 1000, notes: '', createdAt: 1 }],
      purchases: [{ id: 1, date: '2026-10-01', supplier: 'Parts Co', lines: [{ partId: 1, quantity: 2, unitPrice: 1400 }], notes: '', createdAt: 2 }],
      sales: [{ id: 1, date: '2026-10-02', customer: 'Walk-in', lines: [{ partId: 1, quantity: 1, unitPrice: 2000 }], notes: '', createdAt: 3 }],
      repairs: [{ id: 1, date: '2026-10-03', customer: 'Sami', vehicle: 'Civic', description: 'Fix', lines: [{ partId: 1, quantity: 1, unitPrice: 2000 }], labor: 3000, createdAt: 4 }],
      expenses: [{ id: 1, date: '2026-10-04', category: 'Rent', description: 'October', amount: 1500, createdAt: 5 }],
    }
    const [parts, sales, repairs, purchases, expenses] = buildExportSheets(data, calculateStock(data))

    expect(parts.rows).toEqual([['Coupling', 'Civic', 2, 1200, 2400, 2000, 1, '']])
    expect(sales.rows).toEqual([['2026-10-02', 'Walk-in', 'Coupling ×1', 2000, 1200, 800, '']])
    expect(repairs.rows).toEqual([['2026-10-03', 'Sami', 'Civic', 'Fix', 'Coupling ×1', 2000, 3000, 5000, 1200, 3800]])
    expect(purchases.rows).toEqual([['2026-10-01', 'Parts Co', 'Coupling ×2', 2800, '']])
    expect(expenses.rows).toEqual([['2026-10-04', 'إيجار', 'October', 1500]])
  })
})
