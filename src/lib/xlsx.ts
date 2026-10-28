// Writes a simple Excel (.xlsx) file without any library.
// An .xlsx file is a zip archive of small XML files; this builds those XML files and zips them (uncompressed).

export type CellValue = string | number | null
export type CellFormat = 'text' | 'number' | 'money' | 'date'

export interface Column {
  header: string
  format: CellFormat
  width: number // in characters
}

export interface Sheet {
  name: string
  columns: Column[]
  rows: CellValue[][] // one value per column; money in cents, dates as "YYYY-MM-DD"
}

// Index of each format's style in styles.xml below. Style 1 is the bold header.
const STYLE: Record<CellFormat, number> = { text: 0, number: 0, money: 2, date: 3 }

export function createXlsx(sheets: Sheet[]): Uint8Array<ArrayBuffer> {
  const files: [string, string][] = [
    ['[Content_Types].xml', contentTypes(sheets.length)],
    ['_rels/.rels', ROOT_RELS],
    ['xl/workbook.xml', workbook(sheets)],
    ['xl/_rels/workbook.xml.rels', workbookRels(sheets.length)],
    ['xl/styles.xml', STYLES],
    ...sheets.map((sheet, i): [string, string] => [`xl/worksheets/sheet${i + 1}.xml`, worksheet(sheet)]),
  ]
  return zip(files)
}

function worksheet(sheet: Sheet): string {
  const cols = sheet.columns.map((col, i) => `<col min="${i + 1}" max="${i + 1}" width="${col.width}" customWidth="1"/>`).join('')
  const header = `<row r="1">${sheet.columns.map((col, i) => textCell(cellRef(i, 1), col.header, 1)).join('')}</row>`
  const rows = sheet.rows.map((values, r) => {
    const cells = values.map((value, i) => cell(cellRef(i, r + 2), value, sheet.columns[i].format)).join('')
    return `<row r="${r + 2}">${cells}</row>`
  })
  // The frozen pane keeps the header row visible while scrolling; rightToLeft shows column A on the right, for Arabic.
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${header}${rows.join('')}</sheetData></worksheet>`
}

function cell(ref: string, value: CellValue, format: CellFormat): string {
  if (value === null || value === '') return ''
  if (format === 'money' && typeof value === 'number') return `<c r="${ref}" s="${STYLE.money}"><v>${value / 100}</v></c>`
  if (format === 'date' && typeof value === 'string') return `<c r="${ref}" s="${STYLE.date}"><v>${excelDate(value)}</v></c>`
  if (typeof value === 'number') return `<c r="${ref}"><v>${value}</v></c>`
  return textCell(ref, value, 0)
}

// Text is always written as text, so part numbers such as "0123" keep their leading zero.
function textCell(ref: string, text: string, style: number): string {
  return `<c r="${ref}" t="inlineStr"${style ? ` s="${style}"` : ''}><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`
}

/** Excel stores a date as the number of days since 30 Dec 1899. */
function excelDate(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(1899, 11, 30)) / 86_400_000)
}

/** Column 0, row 1 -> "A1"; column 26 -> "AA". */
function cellRef(column: number, row: number): string {
  let letters = ''
  for (let n = column + 1; n > 0; n = Math.floor((n - 1) / 26)) letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters
  return `${letters}${row}`
}

function escapeXml(text: string): string {
  // Control characters are not allowed in XML at all, so they are dropped.
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)
}

function workbook(sheets: Sheet[]): string {
  const list = sheets.map((sheet, i) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${list}</sheets></workbook>`
}

function workbookRels(count: number): string {
  const sheetRels = Array.from({ length: count }, (_, i) =>
    `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetRels.join('')}<Relationship Id="rId${count + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
}

function contentTypes(count: number): string {
  const sheetTypes = Array.from({ length: count }, (_, i) =>
    `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheetTypes.join('')}</Types>`
}

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`

// Styles: 0 normal, 1 bold header, 2 money "1,234.50", 3 date "2026-10-28".
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`

// --- Zip (stored, no compression) ---

function zip(files: [string, string][]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const [name, text] of files) {
    const nameBytes = encoder.encode(name)
    const data = encoder.encode(text)
    const crc = crc32(data)
    // Local file header, then the file's bytes.
    const local = header(0x04034b50, [[20, 2], [0x0800, 2], [0, 2], [0, 4], [crc, 4], [data.length, 4], [data.length, 4], [nameBytes.length, 2], [0, 2]])
    parts.push(local, nameBytes, data)
    central.push(
      header(0x02014b50, [[20, 2], [20, 2], [0x0800, 2], [0, 2], [0, 4], [crc, 4], [data.length, 4], [data.length, 4],
        [nameBytes.length, 2], [0, 2], [0, 2], [0, 2], [0, 2], [0, 4], [offset, 4]]),
      nameBytes,
    )
    offset += local.length + nameBytes.length + data.length
  }

  const centralSize = central.reduce((sum, bytes) => sum + bytes.length, 0)
  const end = header(0x06054b50, [[0, 2], [0, 2], [files.length, 2], [files.length, 2], [centralSize, 4], [offset, 4], [0, 2]])
  return concat([...parts, ...central, end])
}

/** A zip record: a 4-byte signature followed by little-endian fields of 2 or 4 bytes. */
function header(signature: number, fields: [number, 2 | 4][]): Uint8Array {
  const bytes = new Uint8Array(4 + fields.reduce((sum, [, size]) => sum + size, 0))
  const view = new DataView(bytes.buffer)
  view.setUint32(0, signature, true)
  let at = 4
  for (const [value, size] of fields) {
    if (size === 2) view.setUint16(at, value, true)
    else view.setUint32(at, value, true)
    at += size
  }
  return bytes
}

function concat(chunks: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0))
  let at = 0
  for (const chunk of chunks) {
    result.set(chunk, at)
    at += chunk.length
  }
  return result
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

/** The checksum zip uses to detect damaged files. */
export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
