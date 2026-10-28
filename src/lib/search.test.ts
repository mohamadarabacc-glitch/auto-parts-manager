import { describe, expect, it } from 'vitest'
import { matchesPartSearch, matchesRecordSearch } from './search'

const brakePadsC200 = { name: 'Brake pads', vehicle: 'Mercedes C200 2010-2015' }
const brakePadsC300 = { name: 'Brake pads front', vehicle: 'Mercedes C300 2016' }
const oilFilterE300 = { name: 'Oil filter', vehicle: 'Mercedes E300' }
const airFilterCorolla = { name: 'Air filter', vehicle: 'Toyota Corolla 2018' }
const collectorC300 = { name: 'كوليه', vehicle: 'Mercedes C300' }
const collectorCorolla = { name: 'كوليه شكمان', vehicle: 'Toyota Corolla' }
const parts = [brakePadsC200, brakePadsC300, oilFilterE300, airFilterCorolla, collectorC300, collectorCorolla]

const found = (search: string) => parts.filter((part) => matchesPartSearch(part, search)).map((part) => part.name)

describe('matchesPartSearch', () => {
  it('shows every part when the search is empty', () => {
    expect(found('')).toHaveLength(6)
    expect(found('   ')).toHaveLength(6)
  })

  it('finds parts by name, whatever car they fit', () => {
    expect(found('filter')).toEqual(['Oil filter', 'Air filter'])
    expect(found('BRAKE')).toEqual(['Brake pads', 'Brake pads front'])
    expect(found('pads brake')).toEqual(['Brake pads', 'Brake pads front']) // word order does not matter
    expect(found('كوليه')).toEqual(['كوليه', 'كوليه شكمان'])
    expect(found('ilter')).toEqual(['Oil filter', 'Air filter']) // part of a name is enough
  })

  it('finds every part for a car make, whatever the model or year', () => {
    expect(found('mercedes')).toEqual(['Brake pads', 'Brake pads front', 'Oil filter', 'كوليه'])
    expect(found('Merc')).toEqual(['Brake pads', 'Brake pads front', 'Oil filter', 'كوليه']) // the start of a word is enough
  })

  it('finds only one model when the model is typed, with or without the make', () => {
    expect(found('C300')).toEqual(['Brake pads front', 'كوليه'])
    expect(found('c200')).toEqual(['Brake pads'])
    expect(found('Mercedes C200')).toEqual(['Brake pads'])
    expect(found('c300 mercedes')).toEqual(['Brake pads front', 'كوليه'])
    expect(found('Mercedes S500')).toEqual([])
  })

  it('does not match the middle of a word in Fits', () => {
    expect(found('300')).toEqual([]) // "300" is inside "C300", not the start of a word
  })
})

describe('matchesRecordSearch', () => {
  const sales = [
    { date: '2026-10-05', names: ['Coupling', 'Oil filter'] },
    { date: '2026-09-30', names: ['Coupling'] },
    { date: '2025-10-12', names: ['كوليه'] },
  ]
  const found = (search: string) => sales.filter((sale) => matchesRecordSearch(sale.date, sale.names, search)).map((sale) => sale.date)

  it('shows every sale when the search is empty', () => {
    expect(found('')).toHaveLength(3)
    expect(found('  ')).toHaveLength(3)
  })

  it('finds every sale that contains a part', () => {
    expect(found('coupling')).toEqual(['2026-10-05', '2026-09-30'])
    expect(found('COUP')).toEqual(['2026-10-05', '2026-09-30'])
    expect(found('oil filter')).toEqual(['2026-10-05'])
    expect(found('كوليه')).toEqual(['2025-10-12'])
    expect(found('brake')).toEqual([])
  })

  it('finds sales by month name, month number, year or full date', () => {
    expect(found('October')).toEqual(['2026-10-05', '2025-10-12'])
    expect(found('oct')).toEqual(['2026-10-05', '2025-10-12'])
    expect(found('10')).toEqual(['2026-10-05', '2025-10-12'])
    expect(found('9')).toEqual(['2026-09-30'])
    expect(found('2026')).toEqual(['2026-10-05', '2026-09-30'])
    expect(found('2026-10')).toEqual(['2026-10-05'])
    expect(found('2026-9')).toEqual(['2026-09-30'])
    expect(found('2026-10-05')).toEqual(['2026-10-05'])
    expect(found('2026-10-06')).toEqual([])
    expect(found('13')).toEqual([])
  })

  it('finds sales by Arabic month name, with or without hamza', () => {
    expect(found('تشرين الأول')).toEqual(['2026-10-05', '2025-10-12'])
    expect(found('تشرين الاول 2026')).toEqual(['2026-10-05'])
    expect(found('أيلول')).toEqual(['2026-09-30'])
    expect(found('سبتمبر')).toEqual(['2026-09-30'])
    expect(found('كانون')).toEqual([])
  })

  it('needs every word to match, so a part and a month can be combined', () => {
    expect(found('coupling october')).toEqual(['2026-10-05'])
    expect(found('coupling october 2025')).toEqual([])
    expect(found('كوليه 2025')).toEqual(['2025-10-12'])
  })
})
