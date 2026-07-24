import { supabase } from '../../lib/supabase'
import { createNotificationRepository } from './notificationRepositoryCore'

export { createNotificationRepository } from './notificationRepositoryCore'

const defaultNotificationRepository = createNotificationRepository(supabase)

export const {
  fetchInAppNotifications,
  fetchNotificationPreferences,
  upsertNotificationPreference,
  saveNotificationPreferences,
  fetchUnreadNotificationCount,
  markInAppNotificationRead,
  markInAppNotificationUnread,
  markAllInAppNotificationsRead,
  archiveInAppNotification,
  unarchiveInAppNotification,
  softDeleteInAppNotification,
  subscribeToInAppNotifications,
} = defaultNotificationRepository
