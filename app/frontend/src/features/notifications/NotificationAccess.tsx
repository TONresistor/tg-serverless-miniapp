import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { WebAppUser } from '../../api/index'
import { createNotificationAccess } from './notification-access'

const Context = createContext<{
  allowed: boolean
  request: (explicit?: boolean) => void
} | null>(null)

export function NotificationAccessProvider({
  user,
  botURL,
  children,
}: {
  user: WebAppUser
  botURL: string
  children: ReactNode
}) {
  const [allowed, setAllowed] = useState(user.allows_write_to_pm === true)
  const access = useMemo(() => {
    let storage: Storage | undefined
    try {
      storage = window.localStorage
    } catch {}
    return createNotificationAccess({
      userID: user.id,
      initiallyAllowed: user.allows_write_to_pm === true,
      botURL,
      getWebApp: () => window.Telegram?.WebApp,
      storage,
      onAllowed: () => setAllowed(true),
    })
  }, [user.id, user.allows_write_to_pm, botURL])
  useEffect(() => () => access.dispose(), [access])
  return (
    <Context.Provider value={{ allowed, request: access.request }}>
      {children}
    </Context.Provider>
  )
}

export function useNotificationAccess() {
  const value = useContext(Context)
  if (!value) throw new Error('NotificationAccessProvider is missing')
  return value
}
