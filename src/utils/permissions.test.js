import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MODULES,
  MODULE_LABELS,
  PERMISSION_ACTIONS,
  getModuleLabel,
  hasPermission,
} from './permissions.js'
import { notificationPreferenceConfig } from '../components/portal/notificationPreferenceConfig.js'

const existingModules = [
  'mitglieder',
  'beitraege',
  'kassa',
  'vorfinanzierungen',
  'rechnungen',
  'dokumente',
  'events',
  'shop',
  'sponsoren',
  'medien_presse',
  'homepage',
  'inventar',
  'einkauf',
  'backup',
  'systemeinstellungen',
]

test('exposes communication in the frontend module list', () => {
  assert.equal(MODULES.includes('kommunikation'), true)
  assert.equal(MODULE_LABELS.kommunikation, 'Kommunikation')
  assert.equal(getModuleLabel('kommunikation'), 'Kommunikation')
})

test('keeps existing frontend modules available', () => {
  for (const module of existingModules) {
    assert.equal(MODULES.includes(module), true)
    assert.equal(typeof MODULE_LABELS[module], 'string')
  }
})

test('supports the four existing communication actions', () => {
  assert.deepEqual(PERMISSION_ACTIONS, ['view', 'create', 'edit', 'delete'])

  for (const action of PERMISSION_ACTIONS) {
    assert.equal(hasPermission('super_admin', 'kommunikation', action), true)
    assert.equal(hasPermission('administrator', 'kommunikation', action), true)
  }
})

test('mirrors existing database communication role grants', () => {
  for (const role of ['vorstand', 'schriftfuehrer', 'kassier']) {
    assert.equal(hasPermission(role, 'kommunikation', 'view'), true)
    assert.equal(hasPermission(role, 'kommunikation', 'create'), true)
    assert.equal(hasPermission(role, 'kommunikation', 'edit'), true)
    assert.equal(hasPermission(role, 'kommunikation', 'delete'), false)
  }
})

test('blocks administrative communication access for users without communication.view', () => {
  assert.equal(hasPermission('mitglied', 'kommunikation', 'view'), false)
  assert.equal(hasPermission('rechnungspruefer', 'kommunikation', 'view'), false)
  assert.equal(hasPermission({ app_role: 'mitglied' }, 'kommunikation', 'view'), false)
})

test('mirrors financing liabilities role grants in the frontend permission matrix', () => {
  for (const action of ['view', 'create', 'edit', 'delete']) {
    assert.equal(hasPermission('super_admin', 'vorfinanzierungen', action), true)
    assert.equal(hasPermission('administrator', 'vorfinanzierungen', action), true)
    assert.equal(hasPermission('kassier', 'vorfinanzierungen', action), true)
    assert.equal(hasPermission('cashier', 'vorfinanzierungen', action), true)
  }

  assert.equal(hasPermission('vorstand', 'vorfinanzierungen', 'view'), true)
  assert.equal(hasPermission('vorstand', 'vorfinanzierungen', 'create'), true)
  assert.equal(hasPermission('vorstand', 'vorfinanzierungen', 'edit'), false)
  assert.equal(hasPermission('schriftfuehrer', 'vorfinanzierungen', 'view'), true)
  assert.equal(hasPermission('schriftfuehrer', 'vorfinanzierungen', 'create'), false)
  assert.equal(hasPermission('rechnungspruefer', 'vorfinanzierungen', 'view'), true)
  assert.equal(hasPermission('mitglied', 'vorfinanzierungen', 'view'), false)
})

test('keeps own notification preferences independent from admin communication permissions', () => {
  assert.equal(hasPermission('mitglied', 'kommunikation', 'view'), false)
  assert.equal(notificationPreferenceConfig.length > 0, true)
  assert.equal(
    notificationPreferenceConfig.some((item) => item.notification_type === 'system_account'),
    true
  )
})
