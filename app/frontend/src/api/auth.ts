import { call } from './serverless'
import type { InitResponse } from './types'

export function postInit(): Promise<InitResponse> {
  return call<InitResponse>('init')
}
