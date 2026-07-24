import { supabase } from '../../lib/supabase'
import {
  createNotificationDispatcher,
  normalizeNotificationDispatchError,
} from './notificationServiceCore'

export const dispatchNotification = createNotificationDispatcher(supabase)

export {
  createNotificationDispatcher,
  normalizeNotificationDispatchError,
}
