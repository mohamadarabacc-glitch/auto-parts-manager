import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { loadAll } from '../db/db'
import { calculateStock } from '../lib/stock'

/**
 * Every record, kept up to date as data changes, plus what is worked out from them:
 * `stock` per part, `saleCosts`, `repairCosts` and stock `problems`. Undefined while loading.
 */
export function useAppData() {
  const data = useLiveQuery(loadAll)
  return useMemo(() => (data ? { ...data, ...calculateStock(data) } : undefined), [data])
}

export type LoadedData = NonNullable<ReturnType<typeof useAppData>>
