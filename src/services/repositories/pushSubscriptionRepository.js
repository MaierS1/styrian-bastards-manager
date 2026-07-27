import { supabase } from '../../lib/supabase'
import {
  createPushSubscriptionRepository,
  PUSH_SUBSCRIPTION_SELECT,
} from './pushSubscriptionRepositoryCore'

export { createPushSubscriptionRepository, PUSH_SUBSCRIPTION_SELECT }

const defaultPushSubscriptionRepository = createPushSubscriptionRepository(supabase)

export const {
  getOwnSubscriptions,
  fetchOwnPushSubscriptions,
  findByEndpoint,
  upsertOwnSubscription,
  savePushSubscription,
  updateDeviceLabel,
  deactivateSubscription,
  deactivatePushSubscription,
  markSeen,
  markPushSubscriptionSeen,
  reconcileOwnSubscription,
} = defaultPushSubscriptionRepository
