export const ToolRegistry = [
  {
    id: 'get_public_events',
    description: 'Liest oeffentliche Vereins-Events fuer Chat-Kontext.',
    requiredRole: 'public',
    repository: 'eventsRepository',
    rpcName: 'get_public_events',
    enabled: true,
  },
  {
    id: 'get_public_sponsors',
    description: 'Liest oeffentliche Sponsoreninformationen fuer Chat-Kontext.',
    requiredRole: 'public',
    repository: 'sponsorsRepository',
    rpcName: 'get_public_sponsors',
    enabled: true,
  },
  {
    id: 'get_public_media_items',
    description: 'Liest oeffentliche Medieninhalte fuer Chat-Kontext.',
    requiredRole: 'public',
    repository: 'mediaRepository',
    rpcName: 'get_public_media_items',
    enabled: true,
  },
  {
    id: 'get_public_merch_items',
    description: 'Liest oeffentliche Merch-Artikel fuer Chat-Kontext.',
    requiredRole: 'public',
    repository: 'merchRepository',
    rpcName: 'get_public_merch_items',
    enabled: true,
  },
  {
    id: 'get_public_home_stats',
    description: 'Liest oeffentliche Startseiten-Statistiken fuer Chat-Kontext.',
    requiredRole: 'public',
    repository: 'homeStatsRepository',
    rpcName: 'get_public_home_stats',
    enabled: true,
  },
  {
    id: 'get_fee_status',
    description: 'Mock fuer kuenftige Mitgliedsbeitrags-Auskunft.',
    requiredRole: 'Member',
    repository: null,
    rpcName: null,
    enabled: true,
  },
  {
    id: 'get_member_profile',
    description: 'Mock fuer kuenftige Mitgliedsprofil-Auskunft.',
    requiredRole: 'Member',
    repository: null,
    rpcName: null,
    enabled: true,
  },
]

export function getEnabledTools() {
  return ToolRegistry.filter((tool) => tool.enabled)
}
