import 'fake-indexeddb/auto' // an in-memory IndexedDB, so database code can be tested outside a browser
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { db } from '../db/db'

// Remove anything a test rendered and empty the database, so the next test starts fresh.
afterEach(async () => {
  cleanup()
  await Promise.all(db.tables.map((table) => table.clear()))
})
