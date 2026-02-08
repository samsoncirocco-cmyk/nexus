export interface SearchResult {
  id: string;
  title: string;
  preview: string;
  source: 'note' | 'email' | 'task' | 'agent';
  score: number;
  timestamp: string;
  url?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    title: 'E-Rate Modernization Strategy',
    preview: 'Key insights on E-Rate funding modernization for K-12 districts. Focus on cybersecurity requirements and infrastructure upgrades for the 2026 funding year.',
    source: 'note',
    score: 0.95,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    url: '/vault/notes/erate-modernization',
    tags: ['erate', 'strategy', 'k12'],
  },
  {
    id: '2',
    title: 'Meeting with Portland School District',
    preview: 'Discussed Fortinet security solutions for their upcoming network refresh. Follow-up on pricing for FortiGate 600F and FortiSwitch deployment.',
    source: 'email',
    score: 0.92,
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    tags: ['meeting', 'portland', 'fortinet'],
    metadata: { from: 'john.smith@psd.edu', subject: 'Network Security Proposal' },
  },
  {
    id: '3',
    title: 'Complete Salesforce quote for Eugene School District',
    preview: 'Build quote for FortiGate-600F, FortiSwitch 448E-POE (x12), and FortiManager licenses. Due by Friday.',
    source: 'task',
    score: 0.88,
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    url: '/tasks',
    tags: ['salesforce', 'quote', 'urgent'],
  },
  {
    id: '4',
    title: 'PAUL Agent Deployment',
    preview: 'Successfully deployed PAUL agent for autonomous email monitoring and calendar management. Currently handling daily E-Rate intelligence gathering.',
    source: 'agent',
    score: 0.85,
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['deployment', 'automation', 'paul'],
    metadata: { agent: 'paul', status: 'active' },
  },
  {
    id: '5',
    title: 'Fortinet Security Fabric Architecture',
    preview: 'Comprehensive notes on Security Fabric integration patterns for K-12 environments. Includes ZTNA, SD-WAN, and endpoint protection best practices.',
    source: 'note',
    score: 0.82,
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    url: '/vault/notes/security-fabric',
    tags: ['fortinet', 'architecture', 'security'],
  },
  {
    id: '6',
    title: 'FW: E-Rate Funding Application Deadline',
    preview: 'Reminder: Category 1 and 2 applications due March 28th. Coordinate with districts on their infrastructure upgrade plans and Fortinet proposals.',
    source: 'email',
    score: 0.78,
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['erate', 'deadline', 'urgent'],
    metadata: { from: 'notifications@usac.org', subject: 'E-Rate Application Deadline' },
  },
  {
    id: '7',
    title: 'Research competitive SD-WAN solutions',
    preview: 'Compare Fortinet SD-WAN with Cisco Meraki and Aruba for upcoming K-12 RFP responses.',
    source: 'task',
    score: 0.75,
    timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    url: '/tasks',
    tags: ['research', 'sdwan', 'competitive'],
  },
  {
    id: '8',
    title: 'Calendar Sync Agent Update',
    preview: 'Enhanced calendar integration for better conflict detection and automatic meeting prep. Now supports Outlook calendar via Windows VM automation.',
    source: 'agent',
    score: 0.72,
    timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['calendar', 'automation', 'outlook'],
    metadata: { agent: 'calendar-sync', status: 'updated' },
  },
  {
    id: '9',
    title: 'K-12 Cybersecurity Grant Opportunities',
    preview: 'Collection of federal and state grant programs for K-12 cybersecurity improvements. Includes eligibility requirements and application timelines.',
    source: 'note',
    score: 0.68,
    timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    url: '/vault/notes/grant-opportunities',
    tags: ['grants', 'k12', 'funding'],
  },
  {
    id: '10',
    title: 'Weekly sales pipeline review',
    preview: 'Reviewed open opportunities across Oregon K-12 districts. Focus on E-Rate eligible projects and security modernization initiatives.',
    source: 'email',
    score: 0.65,
    timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['sales', 'pipeline', 'weekly'],
    metadata: { from: 'manager@fortinet.com', subject: 'Pipeline Review - Week 5' },
  },
];

// Filter function for mock data
export function filterMockResults(
  query: string,
  sources?: ('note' | 'email' | 'task' | 'agent')[]
): SearchResult[] {
  let results = mockSearchResults;

  // Filter by source
  if (sources && sources.length > 0) {
    results = results.filter(r => sources.includes(r.source));
  }

  // Filter by query
  if (query && query.trim().length > 0) {
    const q = query.toLowerCase();
    results = results.filter(r => 
      r.title.toLowerCase().includes(q) || 
      r.preview.toLowerCase().includes(q) ||
      r.tags?.some(tag => tag.toLowerCase().includes(q))
    );
  }

  return results;
}
