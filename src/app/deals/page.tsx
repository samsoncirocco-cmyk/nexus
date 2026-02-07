'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Deal, Activity, ActivityType, ActivityStatus, DealStage, DealPriority,
  getDeals, createDeal, updateDeal, deleteDeal,
  getActivities, createActivity, updateActivity, deleteActivity
} from '../actions/deals';

const ACTIVITY_TYPES: ActivityType[] = ['call', 'email', 'meeting', 'task', 'follow-up', 'quote', 'proposal', 'note'];
const ACTIVITY_STATUSES: ActivityStatus[] = ['planned', 'completed', 'overdue', 'cancelled'];
const DEAL_STAGES: DealStage[] = ['Prospecting', 'Discovery', 'Solution Presented', 'Negotiation', 'Closed Won', 'Closed Lost'];
const DEAL_PRIORITIES: DealPriority[] = ['low', 'medium', 'high', 'critical'];
const STAGE_TABS: DealStage[] = ['Prospecting', 'Discovery', 'Solution Presented', 'Negotiation', 'Closed Won'];
const TERRITORIES = ['All Territories', 'IA', 'NE', 'SD'];

const typeIcons: Record<ActivityType, string> = {
  call: '📞', email: '✉️', meeting: '🤝', task: '✅', 'follow-up': '🔁', quote: '💰', proposal: '📄', note: '📝'
};

const statusColors: Record<ActivityStatus, string> = {
  planned: 'bg-secondary-dark text-primary border-primary/50',
  completed: 'bg-secondary-dark text-emerald-400 border-emerald-400/50',
  overdue: 'bg-red-900/30 text-red-300 border-red-500/50',
  cancelled: 'bg-card-dark text-foreground-muted border-border',
};

type ViewTab = 'pipeline' | 'activities' | 'timeline';

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<DealStage>('Prospecting');
  const [activeTerritory, setActiveTerritory] = useState('All Territories');
  const [viewTab, setViewTab] = useState<ViewTab>('pipeline');
  const [searchQ, setSearchQ] = useState('');

  // Modals
  const [showDealModal, setShowDealModal] = useState(false);
  const [showActModal, setShowActModal] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [editAct, setEditAct] = useState<Activity | null>(null);

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

  const today = new Date().toISOString().slice(0, 10);

  const enrichedActivities = useMemo(() =>
    activities.map(a => ({
      ...a,
      _effectiveStatus: (a.status === 'planned' && a.dueDate < today) ? 'overdue' as ActivityStatus : a.status,
      _dealName: deals.find(d => d.id === a.dealId)?.account || 'Unknown'
    })),
    [activities, deals, today]
  );

  // Pipeline stats
  const stats = useMemo(() => {
    const open = deals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost');
    const pipeline = open.reduce((s, d) => s + (d.amount || 0), 0);
    const weighted = open.reduce((s, d) => {
      const prob = d.stage === 'Prospecting' ? 0.2 : d.stage === 'Discovery' ? 0.4 : d.stage === 'Solution Presented' ? 0.6 : d.stage === 'Negotiation' ? 0.8 : 1;
      return s + (d.amount || 0) * prob;
    }, 0);
    const winRate = deals.length > 0 ? Math.round(deals.filter(d => d.stage === 'Closed Won').length / Math.max(1, deals.filter(d => d.stage === 'Closed Won' || d.stage === 'Closed Lost').length) * 100) : 0;
    return { active: open.length, pipeline, weighted, winRate };
  }, [deals]);

  const stageDeals = useMemo(() => {
    return deals.filter(d => d.stage === activeStage);
  }, [deals, activeStage]);

  const stageProbability: Record<DealStage, number> = {
    'Prospecting': 20, 'Discovery': 40, 'Solution Presented': 60, 'Negotiation': 80, 'Closed Won': 100, 'Closed Lost': 0
  };

  // Handlers
  function openNewDeal() { setEditDeal(null); setDealForm(emptyDeal); setShowDealModal(true); }
  function openEditDeal(d: Deal) { setEditDeal(d); setDealForm({ account: d.account, oppName: d.oppName, stage: d.stage, amount: d.amount, closeDate: d.closeDate, priority: d.priority, partner: d.partner || '', contact: d.contact || '', contactEmail: d.contactEmail || '', contactPhone: d.contactPhone || '', notes: d.notes, tags: d.tags || [], sfdc_id: d.sfdc_id || '' }); setShowDealModal(true); }
  function openNewAct(dealId?: string) { setEditAct(null); setActForm({ ...emptyAct, dealId: dealId || (deals[0]?.id || ''), dueDate: today }); setShowActModal(true); }
  function openEditAct(a: Activity) { setEditAct(a); setActForm({ dealId: a.dealId, type: a.type, status: a.status, title: a.title, description: a.description, dueDate: a.dueDate, contact: a.contact || '', partner: a.partner || '' }); setShowActModal(true); }

  async function saveDeal(e: React.FormEvent) {
    e.preventDefault();
    if (editDeal) {
      const updated = { ...editDeal, ...dealForm } as Deal;
      await updateDeal(updated); setDeals(prev => prev.map(d => d.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : d));
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
      await updateActivity(updated); setActivities(prev => prev.map(a => a.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : a));
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
    if (editDeal && confirm(`Delete "${editDeal.account}"?`)) {
      await deleteDeal(editDeal.id); setDeals(prev => prev.filter(d => d.id !== editDeal.id)); setActivities(prev => prev.filter(a => a.dealId !== editDeal.id)); setShowDealModal(false);
    }
  }

  async function removeAct() {
    if (editAct && confirm('Delete this activity?')) {
      await deleteActivity(editAct.id); setActivities(prev => prev.filter(a => a.id !== editAct.id)); setShowActModal(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-primary font-bold animate-pulse">Loading pipeline...</div></div>;
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-bg-dark/80 backdrop-blur-md px-4 pt-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary rounded-lg p-1">
              <span className="material-symbols-outlined text-bg-dark text-2xl font-bold">rocket_launch</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Sales Pipeline</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={openNewDeal} className="p-2 rounded-full hover:bg-secondary-dark/30 transition-colors">
              <span className="material-symbols-outlined text-primary">add_circle</span>
            </button>
            <button onClick={() => openNewAct()} className="p-2 rounded-full hover:bg-secondary-dark/30 transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-card-dark border border-white/5 p-4 rounded-xl">
            <p className="text-[10px] uppercase tracking-widest text-foreground-muted font-bold mb-1">Total Pipeline</p>
            <p className="text-xl font-bold text-primary">${(stats.pipeline / 1000).toFixed(stats.pipeline >= 1000000 ? 1 : 0)}{stats.pipeline >= 1000000 ? 'M' : 'K'}</p>
          </div>
          <div className="bg-card-dark border border-white/5 p-4 rounded-xl">
            <p className="text-[10px] uppercase tracking-widest text-foreground-muted font-bold mb-1">Weighted</p>
            <p className="text-xl font-bold text-primary">${(stats.weighted / 1000).toFixed(stats.weighted >= 1000000 ? 1 : 0)}{stats.weighted >= 1000000 ? 'M' : 'K'}</p>
          </div>
          <div className="bg-card-dark border border-white/5 p-4 rounded-xl">
            <p className="text-[10px] uppercase tracking-widest text-foreground-muted font-bold mb-1">Active Deals</p>
            <p className="text-xl font-bold text-primary">{stats.active}</p>
          </div>
          <div className="bg-card-dark border border-white/5 p-4 rounded-xl">
            <p className="text-[10px] uppercase tracking-widest text-foreground-muted font-bold mb-1">Win Rate</p>
            <p className="text-xl font-bold text-primary">{stats.winRate}%</p>
          </div>
        </div>

        {/* Territory Filters */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          {TERRITORIES.map(t => (
            <button
              key={t}
              onClick={() => setActiveTerritory(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                activeTerritory === t
                  ? 'bg-primary text-bg-dark'
                  : 'bg-secondary-dark/20 border border-white/10 hover:bg-secondary-dark/40'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {/* View Tabs */}
      <div className="px-4 pt-2">
        <div className="flex gap-1 bg-card-dark rounded-lg p-1 mb-4">
          {(['pipeline', 'activities', 'timeline'] as ViewTab[]).map(t => (
            <button
              key={t}
              onClick={() => setViewTab(t)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${
                viewTab === t ? 'bg-secondary-dark text-primary' : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <main className="px-4 pb-32">
        {/* ==================== PIPELINE VIEW ==================== */}
        {viewTab === 'pipeline' && (
          <>
            {/* Stage Tabs */}
            <div className="flex border-b border-white/10 mb-6 overflow-x-auto hide-scrollbar">
              {STAGE_TABS.map(stage => (
                <button
                  key={stage}
                  onClick={() => setActiveStage(stage)}
                  className={`flex-none px-4 py-3 border-b-2 text-sm font-bold transition-colors ${
                    activeStage === stage
                      ? 'border-primary text-primary'
                      : 'border-transparent text-foreground-muted hover:text-foreground'
                  }`}
                >
                  {stage}
                </button>
              ))}
            </div>

            {/* Deal Cards */}
            <div className="space-y-4">
              {stageDeals.length === 0 ? (
                <div className="text-center py-16 bg-card-dark rounded-xl border border-white/5">
                  <span className="material-symbols-outlined text-primary mb-3 block" style={{ fontSize: 40 }}>inbox</span>
                  <p className="text-foreground-muted">No deals in {activeStage}. Click + to add one.</p>
                </div>
              ) : (
                stageDeals.map(deal => {
                  const prob = stageProbability[deal.stage];
                  return (
                    <div key={deal.id} className="bg-card-dark border border-white/10 rounded-xl overflow-hidden shadow-sm hover:border-primary/30 transition-colors">
                      <div className="p-4 cursor-pointer" onClick={() => openEditDeal(deal)}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-bold leading-none mb-1">{deal.account}</h3>
                            <div className="flex items-center gap-1.5 text-foreground-muted">
                              <span className="material-symbols-outlined text-sm">calendar_today</span>
                              <span className="text-xs">Close: {deal.closeDate || 'TBD'}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            {deal.amount && <p className="text-lg font-bold text-primary leading-none">${deal.amount.toLocaleString()}</p>}
                            <p className="text-[10px] text-foreground-muted uppercase font-bold mt-1 tracking-tighter">{deal.oppName}</p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[11px] font-bold">
                            <span className="text-foreground-muted uppercase">Probability</span>
                            <span className="text-primary">{prob}%</span>
                          </div>
                          <div className="w-full h-2 bg-secondary-dark/40 rounded-full overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-full shadow-[0_0_8px_rgba(250,222,41,0.4)] transition-all"
                              style={{ width: `${prob}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="bg-white/5 px-4 py-2 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-xs text-foreground-muted">
                          {deal.partner && <span>{deal.partner}</span>}
                          {deal.contact && <span>• {deal.contact}</span>}
                        </div>
                        <button
                          onClick={() => openEditDeal(deal)}
                          className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                        >
                          VIEW DEAL <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* ==================== ACTIVITIES VIEW ==================== */}
        {viewTab === 'activities' && (
          <div className="space-y-2">
            {enrichedActivities.length === 0 ? (
              <div className="text-center py-16 bg-card-dark rounded-xl border border-white/5">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-foreground-muted">No activities yet. Click + to log your first one.</p>
              </div>
            ) : (
              enrichedActivities.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(act => (
                <div key={act.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-card-dark px-4 py-3 hover:border-primary/30 transition-colors group">
                  {act.status !== 'completed' && act.status !== 'cancelled' && (
                    <button onClick={() => completeAct(act)} className="w-6 h-6 rounded-full border-2 border-foreground-muted hover:border-emerald-400 hover:bg-emerald-400/20 transition-all shrink-0" />
                  )}
                  {act.status === 'completed' && <span className="text-emerald-400 text-lg shrink-0">✓</span>}
                  {act.status === 'cancelled' && <span className="text-foreground-muted text-lg shrink-0">✕</span>}
                  <span className="text-lg shrink-0">{typeIcons[act.type]}</span>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEditAct(act)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold text-sm ${act.status === 'completed' ? 'line-through text-foreground-muted' : ''}`}>{act.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${statusColors[act._effectiveStatus]}`}>{act._effectiveStatus}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-foreground-muted">
                      <span className="font-semibold text-primary">{act._dealName}</span>
                      {act.contact && <span>→ {act.contact}</span>}
                    </div>
                  </div>
                  <div className={`text-xs shrink-0 font-medium ${act._effectiveStatus === 'overdue' ? 'text-red-400' : 'text-foreground-muted'}`}>
                    {act.dueDate}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ==================== TIMELINE VIEW ==================== */}
        {viewTab === 'timeline' && (
          <div className="relative pl-8">
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-secondary-dark via-primary/30 to-secondary-dark" />
            {enrichedActivities.filter(a => a.status === 'completed').sort((a, b) => (b.completedDate || b.dueDate).localeCompare(a.completedDate || a.dueDate)).map(act => (
              <div key={act.id} className="relative mb-4">
                <div className="absolute -left-5 top-3 w-4 h-4 rounded-full bg-emerald-400 border-2 border-bg-dark shadow-lg shadow-emerald-400/30" />
                <div className="rounded-xl border border-white/10 bg-card-dark p-4">
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span>{typeIcons[act.type]}</span>
                    <span className="font-bold">{act.title}</span>
                    <span className="text-primary">— {act._dealName}</span>
                  </div>
                  {act.description && <p className="text-xs text-foreground-muted mt-2">{act.description}</p>}
                  <div className="text-[11px] text-foreground-muted mt-2 font-medium">{act.completedDate || act.dueDate}</div>
                </div>
              </div>
            ))}
            {enrichedActivities.filter(a => a.status === 'completed').length === 0 && (
              <div className="text-center py-16 bg-card-dark rounded-xl border border-white/5 ml-4">
                <p className="text-4xl mb-3">📅</p>
                <p className="text-foreground-muted">Complete activities to see your timeline.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => viewTab === 'pipeline' ? openNewDeal() : openNewAct()}
        className="fixed bottom-28 md:bottom-8 right-6 size-14 bg-primary text-bg-dark rounded-full shadow-lg shadow-primary/20 flex items-center justify-center z-30 active:scale-95 transition-transform hover:scale-105"
      >
        <span className="material-symbols-outlined text-3xl font-bold">add</span>
      </button>

      {/* Deal Modal */}
      {showDealModal && (
        <Modal title={editDeal ? 'Edit Deal' : 'New Deal'} onClose={() => setShowDealModal(false)}>
          <form onSubmit={saveDeal} className="space-y-4">
            <Field label="Account Name" required><input type="text" required value={dealForm.account} onChange={e => setDealForm({ ...dealForm, account: e.target.value })} className="inp" /></Field>
            <Field label="Opportunity Name"><input type="text" value={dealForm.oppName} onChange={e => setDealForm({ ...dealForm, oppName: e.target.value })} className="inp" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stage"><select value={dealForm.stage} onChange={e => setDealForm({ ...dealForm, stage: e.target.value as DealStage })} className="inp">{DEAL_STAGES.map(s => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Priority"><select value={dealForm.priority} onChange={e => setDealForm({ ...dealForm, priority: e.target.value as DealPriority })} className="inp">{DEAL_PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount ($)"><input type="number" step="0.01" value={dealForm.amount ?? ''} onChange={e => setDealForm({ ...dealForm, amount: e.target.value ? parseFloat(e.target.value) : null })} className="inp" /></Field>
              <Field label="Close Date"><input type="date" value={dealForm.closeDate} onChange={e => setDealForm({ ...dealForm, closeDate: e.target.value })} className="inp" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Partner"><input type="text" value={dealForm.partner} onChange={e => setDealForm({ ...dealForm, partner: e.target.value })} className="inp" /></Field>
              <Field label="SFDC ID"><input type="text" value={dealForm.sfdc_id} onChange={e => setDealForm({ ...dealForm, sfdc_id: e.target.value })} className="inp" placeholder="006Hr000..." /></Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Contact"><input type="text" value={dealForm.contact} onChange={e => setDealForm({ ...dealForm, contact: e.target.value })} className="inp" /></Field>
              <Field label="Email"><input type="email" value={dealForm.contactEmail} onChange={e => setDealForm({ ...dealForm, contactEmail: e.target.value })} className="inp" /></Field>
              <Field label="Phone"><input type="text" value={dealForm.contactPhone} onChange={e => setDealForm({ ...dealForm, contactPhone: e.target.value })} className="inp" /></Field>
            </div>
            <Field label="Notes"><textarea value={dealForm.notes} onChange={e => setDealForm({ ...dealForm, notes: e.target.value })} className="inp h-20 resize-none" /></Field>
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
            <Field label="Title" required><input type="text" required value={actForm.title} onChange={e => setActForm({ ...actForm, title: e.target.value })} className="inp" placeholder="e.g., Call partner about PO" /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Type"><select value={actForm.type} onChange={e => setActForm({ ...actForm, type: e.target.value as ActivityType })} className="inp text-xs">{ACTIVITY_TYPES.map(t => <option key={t} value={t}>{typeIcons[t]} {t}</option>)}</select></Field>
              <Field label="Status"><select value={actForm.status} onChange={e => setActForm({ ...actForm, status: e.target.value as ActivityStatus })} className="inp text-xs">{ACTIVITY_STATUSES.map(s => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Due Date"><input type="date" value={actForm.dueDate} onChange={e => setActForm({ ...actForm, dueDate: e.target.value })} className="inp" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact"><input type="text" value={actForm.contact} onChange={e => setActForm({ ...actForm, contact: e.target.value })} className="inp" /></Field>
              <Field label="Partner"><input type="text" value={actForm.partner} onChange={e => setActForm({ ...actForm, partner: e.target.value })} className="inp" /></Field>
            </div>
            <Field label="Description"><textarea value={actForm.description} onChange={e => setActForm({ ...actForm, description: e.target.value })} className="inp h-20 resize-none" /></Field>
            <ModalFooter onDelete={editAct ? removeAct : undefined} onClose={() => setShowActModal(false)} />
          </form>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">{label}{required && <span className="text-primary ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-bg-secondary border border-border p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-6">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onDelete, onClose }: { onDelete?: () => void; onClose: () => void }) {
  return (
    <div className="flex justify-between pt-4 border-t border-border mt-4">
      {onDelete ? <button type="button" onClick={onDelete} className="text-sm text-red-400 hover:text-red-300 font-semibold">Delete</button> : <div />}
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-foreground-muted hover:text-foreground font-semibold">Cancel</button>
        <button type="submit" className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-bg-dark hover:brightness-110 transition-all">Save</button>
      </div>
    </div>
  );
}
