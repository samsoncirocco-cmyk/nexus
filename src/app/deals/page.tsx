'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Deal, Activity, ActivityType, ActivityStatus, DealStage, DealPriority,
  getDeals, createDeal, updateDeal, deleteDeal,
  getActivities, createActivity, updateActivity, deleteActivity
} from '../actions/deals';

const ACTIVITY_TYPES: ActivityType[] = ['call', 'email', 'meeting', 'task', 'follow-up', 'quote', 'proposal', 'note'];
const ACTIVITY_STATUSES: ActivityStatus[] = ['planned', 'completed', 'overdue', 'cancelled'];
const DEAL_STAGES: DealStage[] = ['Prospecting', 'Discovery', 'Solution Presented', 'Negotiation', 'Closed Won', 'Closed Lost'];
const DEAL_PRIORITIES: DealPriority[] = ['low', 'medium', 'high', 'critical'];

const typeIcons: Record<ActivityType, string> = {
  call: '📞', email: '✉️', meeting: '🤝', task: '✅', 'follow-up': '🔁', quote: '💰', proposal: '📄', note: '📝'
};

const statusColors: Record<ActivityStatus, string> = {
  planned: 'bg-[#154733] text-[#FEE123] border-[#FEE123]/50',
  completed: 'bg-[#154733] text-[#4ADE80] border-[#4ADE80]/50',
  overdue: 'bg-red-900/30 text-red-300 border-red-500/50',
  cancelled: 'bg-[#1a1a1a] text-[#9CA3AF] border-[#262626]',
};

const priorityColors: Record<DealPriority, string> = {
  low: 'bg-[#1a1a1a] text-[#9CA3AF]',
  medium: 'bg-[#154733] text-[#4ADE80]',
  high: 'bg-[#FEE123]/20 text-[#FEE123]',
  critical: 'bg-red-900/30 text-red-300',
};

const stageColors: Record<DealStage, string> = {
  'Prospecting': 'bg-purple-900/40 text-purple-300',
  'Discovery': 'bg-[#154733] text-[#FEE123]',
  'Solution Presented': 'bg-cyan-900/40 text-cyan-300',
  'Negotiation': 'bg-[#FEE123]/20 text-[#FEE123]',
  'Closed Won': 'bg-[#154733] text-[#4ADE80]',
  'Closed Lost': 'bg-red-900/40 text-red-400',
};

type Tab = 'activities' | 'deals' | 'timeline';
type ActivityFilter = 'all' | ActivityStatus;

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('activities');
  const [actFilter, setActFilter] = useState<ActivityFilter>('all');
  const [dealFilter, setDealFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQ, setSearchQ] = useState('');

  // Modals
  const [showDealModal, setShowDealModal] = useState(false);
  const [showActModal, setShowActModal] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [editAct, setEditAct] = useState<Activity | null>(null);

  // Forms
  const emptyDeal = { account: '', oppName: '', stage: 'Prospecting' as DealStage, amount: null as number | null, closeDate: '', priority: 'medium' as DealPriority, partner: '', contact: '', contactEmail: '', contactPhone: '', notes: '', tags: [] as string[], sfdc_id: '' };
  const emptyAct = { dealId: '', type: 'call' as ActivityType, status: 'planned' as ActivityStatus, title: '', description: '', dueDate: '', contact: '', partner: '' };
  const [dealForm, setDealForm] = useState(emptyDeal);
  const [actForm, setActForm] = useState(emptyAct);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [d, a] = await Promise.all([getDeals(), getActivities()]);
      setDeals(d); setActivities(a);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  // Auto-mark overdue
  const today = new Date().toISOString().slice(0, 10);

  const enrichedActivities = useMemo(() =>
    activities.map(a => ({
      ...a,
      _effectiveStatus: (a.status === 'planned' && a.dueDate < today) ? 'overdue' as ActivityStatus : a.status,
      _dealName: deals.find(d => d.id === a.dealId)?.account || 'Unknown'
    })),
    [activities, deals, today]
  );

  const filteredActivities = useMemo(() => {
    let list = enrichedActivities;
    if (actFilter !== 'all') list = list.filter(a => a._effectiveStatus === actFilter);
    if (dealFilter !== 'all') list = list.filter(a => a.dealId === dealFilter);
    if (typeFilter !== 'all') list = list.filter(a => a.type === typeFilter);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a._dealName.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [enrichedActivities, actFilter, dealFilter, typeFilter, searchQ]);

  const filteredDeals = useMemo(() => {
    let list = [...deals];
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(d => d.account.toLowerCase().includes(q) || d.oppName.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.closeDate.localeCompare(b.closeDate));
  }, [deals, searchQ]);

  // Stats
  const stats = useMemo(() => {
    const openDeals = deals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost');
    const pipeline = openDeals.reduce((s, d) => s + (d.amount || 0), 0);
    const overdueCount = enrichedActivities.filter(a => a._effectiveStatus === 'overdue').length;
    const plannedCount = enrichedActivities.filter(a => a._effectiveStatus === 'planned').length;
    const completedThisWeek = enrichedActivities.filter(a => a.status === 'completed' && a.completedDate && a.completedDate >= getWeekStart()).length;
    return { openDeals: openDeals.length, pipeline, overdueCount, plannedCount, completedThisWeek };
  }, [deals, enrichedActivities]);

  // Handlers
  function openNewDeal() { setEditDeal(null); setDealForm(emptyDeal); setShowDealModal(true); }
  function openEditDeal(d: Deal) { setEditDeal(d); setDealForm({ account: d.account, oppName: d.oppName, stage: d.stage, amount: d.amount, closeDate: d.closeDate, priority: d.priority, partner: d.partner || '', contact: d.contact || '', contactEmail: d.contactEmail || '', contactPhone: d.contactPhone || '', notes: d.notes, tags: d.tags || [], sfdc_id: d.sfdc_id || '' }); setShowDealModal(true); }
  function openNewAct(dealId?: string) { setEditAct(null); setActForm({ ...emptyAct, dealId: dealId || (deals[0]?.id || ''), dueDate: today }); setShowActModal(true); }
  function openEditAct(a: Activity) { setEditAct(a); setActForm({ dealId: a.dealId, type: a.type, status: a.status, title: a.title, description: a.description, dueDate: a.dueDate, contact: a.contact || '', partner: a.partner || '' }); setShowActModal(true); }

  async function saveDeal(e: React.FormEvent) {
    e.preventDefault();
    if (editDeal) {
      const updated = { ...editDeal, ...dealForm } as Deal;
      await updateDeal(updated);
      setDeals(prev => prev.map(d => d.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : d));
    } else {
      const created = await createDeal(dealForm as any);
      setDeals(prev => [...prev, created]);
    }
    setShowDealModal(false);
  }

  async function saveAct(e: React.FormEvent) {
    e.preventDefault();
    if (editAct) {
      const updated = { ...editAct, ...actForm } as Activity;
      await updateActivity(updated);
      setActivities(prev => prev.map(a => a.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : a));
    } else {
      const created = await createActivity(actForm as any);
      setActivities(prev => [...prev, created]);
    }
    setShowActModal(false);
  }

  async function completeAct(act: Activity) {
    const updated = { ...act, status: 'completed' as ActivityStatus, completedDate: today };
    await updateActivity(updated);
    setActivities(prev => prev.map(a => a.id === act.id ? { ...updated, updatedAt: new Date().toISOString() } : a));
  }

  async function removeDeal() {
    if (editDeal && confirm(`Delete deal "${editDeal.account}" and all its activities?`)) {
      await deleteDeal(editDeal.id);
      setDeals(prev => prev.filter(d => d.id !== editDeal.id));
      setActivities(prev => prev.filter(a => a.dealId !== editDeal.id));
      setShowDealModal(false);
    }
  }

  async function removeAct() {
    if (editAct && confirm('Delete this activity?')) {
      await deleteActivity(editAct.id);
      setActivities(prev => prev.filter(a => a.id !== editAct.id));
      setShowActModal(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#FEE123] font-bold animate-pulse">Loading pipeline...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] pt-14 md:pt-0 pb-20 md:pb-0">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-40 md:hidden bg-[#111111] border-b border-[#262626] px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🧠</span>
          <span className="font-bold">Pipeline</span>
        </Link>
        <div className="flex gap-2">
          <button onClick={openNewDeal} className="bg-[#154733] text-[#FEE123] px-3 py-1.5 rounded-lg text-xs font-bold tap-target">+ Deal</button>
          <button onClick={() => openNewAct()} className="bg-[#FEE123] text-[#004F27] px-3 py-1.5 rounded-lg text-xs font-bold tap-target">+ Act</button>
        </div>
      </div>

      {/* Desktop Top bar */}
      <div className="hidden md:block border-b border-[#262626] bg-[#111111] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl hover:scale-110 transition-transform">🧠</Link>
            <h1 className="text-xl font-bold">Pipeline &amp; Activity Tracker</h1>
            <div className="w-12 h-1 bg-[#FEE123] rounded-full" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={openNewDeal} className="rounded-lg bg-[#154733] border border-[#FEE123]/50 px-4 py-2 text-sm font-bold text-[#FEE123] hover:bg-[#154733]/80 transition-colors">+ Deal</button>
            <button onClick={() => openNewAct()} className="rounded-lg bg-[#FEE123] px-4 py-2 text-sm font-bold text-[#004F27] hover:bg-[#FFE94D] transition-colors">+ Activity</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
        {/* Stats - Responsive */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
          <Stat label="Open Deals" value={stats.openDeals} />
          <Stat label="Pipeline" value={`$${(stats.pipeline / 1000).toFixed(1)}K`} color="text-[#FEE123]" />
          <Stat label="Overdue" value={stats.overdueCount} color={stats.overdueCount > 0 ? 'text-red-400' : undefined} />
          <Stat label="Planned" value={stats.plannedCount} />
          <Stat label="Done This Week" value={stats.completedThisWeek} color="text-[#4ADE80]" className="col-span-2 md:col-span-1" />
        </div>

        {/* Tabs & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <div className="flex gap-1 bg-[#111111] rounded-lg p-1 overflow-x-auto">
            {(['activities', 'deals', 'timeline'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors capitalize whitespace-nowrap tap-target ${tab === t ? 'bg-[#154733] text-[#FEE123]' : 'text-[#9CA3AF] hover:text-[#FAFAFA]'}`}>{t}</button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text" placeholder="Search..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
              className="inp w-full md:w-48"
            />

            {tab === 'activities' && (
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                <select value={actFilter} onChange={e => setActFilter(e.target.value as any)} className="inp text-xs md:text-sm flex-1 md:flex-none">
                  <option value="all">All Status</option>
                  {ACTIVITY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="inp text-xs md:text-sm flex-1 md:flex-none">
                  <option value="all">All Types</option>
                  {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{typeIcons[t]} {t}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {tab === 'activities' && (
          <div className="space-y-2">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-16 gradient-oregon rounded-2xl border border-[#FEE123]/20">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-[#FAFAFA]/70">No activities yet. Click &quot;+ Activity&quot; to log your first one.</p>
              </div>
            ) : (
              filteredActivities.map(act => (
                <div key={act.id} className="flex items-center gap-3 rounded-xl border border-[#262626] bg-[#111111] px-4 py-3 hover:border-[#FEE123]/50 transition-colors group tap-target">
                  {/* Complete button */}
                  {act.status !== 'completed' && act.status !== 'cancelled' && (
                    <button onClick={() => completeAct(act)} className="w-6 h-6 rounded-full border-2 border-[#9CA3AF] hover:border-[#4ADE80] hover:bg-[#4ADE80]/20 transition-all shrink-0 tap-target" title="Mark complete" />
                  )}
                  {act.status === 'completed' && <span className="text-[#4ADE80] text-lg shrink-0">✓</span>}
                  {act.status === 'cancelled' && <span className="text-[#9CA3AF] text-lg shrink-0">✕</span>}

                  {/* Icon */}
                  <span className="text-lg shrink-0">{typeIcons[act.type]}</span>

                  {/* Content */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEditAct(act)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold text-sm ${act.status === 'completed' ? 'line-through text-[#9CA3AF]' : 'text-[#FAFAFA]'}`}>{act.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${statusColors[act._effectiveStatus]}`}>{act._effectiveStatus}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[#9CA3AF]">
                      <span className="font-semibold text-[#FEE123]">{act._dealName}</span>
                      {act.contact && <span>→ {act.contact}</span>}
                    </div>
                  </div>

                  {/* Due date */}
                  <div className={`text-xs shrink-0 font-medium ${act._effectiveStatus === 'overdue' ? 'text-red-400' : 'text-[#9CA3AF]'}`}>
                    {act.dueDate}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'deals' && (
          <div className="space-y-3">
            {filteredDeals.length === 0 ? (
              <div className="text-center py-16 gradient-oregon rounded-2xl border border-[#FEE123]/20">
                <p className="text-4xl mb-3">🎯</p>
                <p className="text-[#FAFAFA]/70">No deals yet. Click &quot;+ Deal&quot; to add your pipeline.</p>
              </div>
            ) : (
              filteredDeals.map(deal => {
                const dealActs = enrichedActivities.filter(a => a.dealId === deal.id);
                const overdue = dealActs.filter(a => a._effectiveStatus === 'overdue').length;
                const nextAct = dealActs.filter(a => a._effectiveStatus === 'planned').sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
                return (
                  <div key={deal.id} className="rounded-xl border border-[#262626] bg-[#111111] p-4 hover:border-[#FEE123]/50 transition-colors tap-target">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEditDeal(deal)}>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-bold text-[#FAFAFA]">{deal.account}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${stageColors[deal.stage]}`}>{deal.stage}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${priorityColors[deal.priority]}`}>{deal.priority}</span>
                          {overdue > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/50 text-red-300 font-bold">{overdue} overdue</span>}
                        </div>
                        <p className="text-xs text-[#9CA3AF] truncate">{deal.oppName}</p>
                        <div className="flex items-center flex-wrap gap-4 mt-2 text-xs text-[#9CA3AF]">
                          {deal.amount && <span className="text-[#FEE123] font-bold">${deal.amount.toLocaleString()}</span>}
                          <span>Close: {deal.closeDate}</span>
                          {deal.partner && <span>Partner: {deal.partner}</span>}
                        </div>
                        {nextAct && (
                          <div className="mt-2 text-xs text-[#FEE123] font-medium">
                            Next: {typeIcons[nextAct.type]} {nextAct.title} — {nextAct.dueDate}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-[#9CA3AF]">{dealActs.length} activities</span>
                        <button onClick={() => openNewAct(deal.id)} className="text-xs px-3 py-1.5 rounded-lg bg-[#154733] text-[#FEE123] hover:bg-[#154733]/80 transition-colors font-bold tap-target">+ Act</button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'timeline' && (
          <div className="relative pl-8">
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#154733] via-[#FEE123]/30 to-[#154733]" />
            {enrichedActivities
              .filter(a => a.status === 'completed')
              .sort((a, b) => (b.completedDate || b.dueDate).localeCompare(a.completedDate || a.dueDate))
              .map(act => (
                <div key={act.id} className="relative mb-4">
                  <div className="absolute -left-5 top-3 w-4 h-4 rounded-full bg-[#4ADE80] border-2 border-[#0A0A0A] shadow-lg shadow-[#4ADE80]/30" />
                  <div className="rounded-xl border border-[#262626] bg-[#111111] p-4 tap-target">
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <span>{typeIcons[act.type]}</span>
                      <span className="font-bold text-[#FAFAFA]">{act.title}</span>
                      <span className="text-[#FEE123]">— {act._dealName}</span>
                    </div>
                    {act.description && <p className="text-xs text-[#9CA3AF] mt-2">{act.description}</p>}
                    <div className="text-[11px] text-[#9CA3AF] mt-2 font-medium">{act.completedDate || act.dueDate}</div>
                  </div>
                </div>
              ))
            }
            {enrichedActivities.filter(a => a.status === 'completed').length === 0 && (
              <div className="text-center py-16 gradient-oregon rounded-2xl border border-[#FEE123]/20 ml-4">
                <p className="text-4xl mb-3">📅</p>
                <p className="text-[#FAFAFA]/70">Complete some activities to see your timeline.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#111111] border-t border-[#262626] pb-safe">
        <div className="flex justify-around items-center py-2">
          <Link href="/" className="mobile-nav-item">
            <span className="text-xl">🏠</span>
            <span className="text-[10px] font-semibold">Home</span>
          </Link>
          <Link href="/tasks" className="mobile-nav-item">
            <span className="text-xl">📋</span>
            <span className="text-[10px] font-semibold">Tasks</span>
          </Link>
          <Link href="/activity" className="mobile-nav-item">
            <span className="text-xl">⚡</span>
            <span className="text-[10px] font-semibold">Activity</span>
          </Link>
          <Link href="/deals" className="mobile-nav-item active">
            <span className="text-xl">🎯</span>
            <span className="text-[10px] font-semibold">Pipeline</span>
          </Link>
        </div>
      </nav>

      {/* Deal Modal */}
      {showDealModal && (
        <Modal title={editDeal ? 'Edit Deal' : 'New Deal'} onClose={() => setShowDealModal(false)}>
          <form onSubmit={saveDeal} className="space-y-4">
            <Field label="Account Name" required>
              <input type="text" required value={dealForm.account} onChange={e => setDealForm({ ...dealForm, account: e.target.value })} className="inp" />
            </Field>
            <Field label="Opportunity Name">
              <input type="text" value={dealForm.oppName} onChange={e => setDealForm({ ...dealForm, oppName: e.target.value })} className="inp" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stage">
                <select value={dealForm.stage} onChange={e => setDealForm({ ...dealForm, stage: e.target.value as DealStage })} className="inp">{DEAL_STAGES.map(s => <option key={s}>{s}</option>)}</select>
              </Field>
              <Field label="Priority">
                <select value={dealForm.priority} onChange={e => setDealForm({ ...dealForm, priority: e.target.value as DealPriority })} className="inp">{DEAL_PRIORITIES.map(p => <option key={p}>{p}</option>)}</select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount ($)">
                <input type="number" step="0.01" value={dealForm.amount ?? ''} onChange={e => setDealForm({ ...dealForm, amount: e.target.value ? parseFloat(e.target.value) : null })} className="inp" />
              </Field>
              <Field label="Close Date">
                <input type="date" value={dealForm.closeDate} onChange={e => setDealForm({ ...dealForm, closeDate: e.target.value })} className="inp" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Partner"><input type="text" value={dealForm.partner || ''} onChange={e => setDealForm({ ...dealForm, partner: e.target.value })} className="inp" /></Field>
              <Field label="SFDC ID"><input type="text" value={dealForm.sfdc_id || ''} onChange={e => setDealForm({ ...dealForm, sfdc_id: e.target.value })} className="inp" placeholder="006Hr000..." /></Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Contact"><input type="text" value={dealForm.contact || ''} onChange={e => setDealForm({ ...dealForm, contact: e.target.value })} className="inp" /></Field>
              <Field label="Email"><input type="email" value={dealForm.contactEmail || ''} onChange={e => setDealForm({ ...dealForm, contactEmail: e.target.value })} className="inp" /></Field>
              <Field label="Phone"><input type="text" value={dealForm.contactPhone || ''} onChange={e => setDealForm({ ...dealForm, contactPhone: e.target.value })} className="inp" /></Field>
            </div>
            <Field label="Notes">
              <textarea value={dealForm.notes} onChange={e => setDealForm({ ...dealForm, notes: e.target.value })} className="inp h-20 resize-none" />
            </Field>
            <ModalFooter onDelete={editDeal ? removeDeal : undefined} onClose={() => setShowDealModal(false)} />
          </form>
        </Modal>
      )}

      {/* Activity Modal */}
      {showActModal && (
        <Modal title={editAct ? 'Edit Activity' : 'Log Activity'} onClose={() => setShowActModal(false)}>
          <form onSubmit={saveAct} className="space-y-4">
            <Field label="Deal" required>
              <select required value={actForm.dealId} onChange={e => setActForm({ ...actForm, dealId: e.target.value })} className="inp">
                <option value="">Select deal...</option>
                {deals.map(d => <option key={d.id} value={d.id}>{d.account} — {d.oppName}</option>)}
              </select>
            </Field>
            <Field label="Title" required>
              <input type="text" required value={actForm.title} onChange={e => setActForm({ ...actForm, title: e.target.value })} className="inp" placeholder="e.g., Call partner about PO status" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Type">
                <select value={actForm.type} onChange={e => setActForm({ ...actForm, type: e.target.value as ActivityType })} className="inp text-xs md:text-sm">{ACTIVITY_TYPES.map(t => <option key={t} value={t}>{typeIcons[t]} {t}</option>)}</select>
              </Field>
              <Field label="Status">
                <select value={actForm.status} onChange={e => setActForm({ ...actForm, status: e.target.value as ActivityStatus })} className="inp text-xs md:text-sm">{ACTIVITY_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
              </Field>
              <Field label="Due Date">
                <input type="date" value={actForm.dueDate} onChange={e => setActForm({ ...actForm, dueDate: e.target.value })} className="inp" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact"><input type="text" value={actForm.contact || ''} onChange={e => setActForm({ ...actForm, contact: e.target.value })} className="inp" placeholder="e.g., Chad Borgan" /></Field>
              <Field label="Partner"><input type="text" value={actForm.partner || ''} onChange={e => setActForm({ ...actForm, partner: e.target.value })} className="inp" placeholder="e.g., SHI, High Point" /></Field>
            </div>
            <Field label="Description">
              <textarea value={actForm.description} onChange={e => setActForm({ ...actForm, description: e.target.value })} className="inp h-20 resize-none" placeholder="What happened / what needs to happen..." />
            </Field>
            <ModalFooter onDelete={editAct ? removeAct : undefined} onClose={() => setShowActModal(false)} />
          </form>
        </Modal>
      )}
    </div>
  );
}

// --- Helper Components ---

function Stat({ label, value, color, className }: { label: string; value: string | number; color?: string; className?: string }) {
  return (
    <div className={`rounded-xl border border-[#262626] bg-[#111111] px-4 py-3 ${className || ''}`}>
      <div className={`text-xl md:text-2xl font-bold ${color || 'text-[#FAFAFA]'}`}>{value}</div>
      <div className="text-xs text-[#9CA3AF] mt-0.5 font-medium">{label}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#9CA3AF] mb-2 uppercase tracking-wider">{label}{required && <span className="text-[#FEE123] ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-[#111111] border border-[#262626] p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-6 text-[#FAFAFA]">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onDelete, onClose }: { onDelete?: () => void; onClose: () => void }) {
  return (
    <div className="flex justify-between pt-4 border-t border-[#262626] mt-4">
      {onDelete ? <button type="button" onClick={onDelete} className="text-sm text-red-400 hover:text-red-300 font-semibold">Delete</button> : <div />}
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[#9CA3AF] hover:text-[#FAFAFA] font-semibold">Cancel</button>
        <button type="submit" className="rounded-lg bg-[#FEE123] px-5 py-2 text-sm font-bold text-[#004F27] hover:bg-[#FFE94D] transition-colors">Save</button>
      </div>
    </div>
  );
}

function getWeekStart(): string {
  const d = new Date(); d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}
