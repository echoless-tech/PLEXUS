import React, { useMemo, useRef, useState } from 'react';
import { ScanLine, Upload, FileText, Trash2, Loader2, Camera, Sparkles, Receipt, Landmark, File } from 'lucide-react';
import { PageHeader, Tile, Button, Label, SegmentTabs } from '../components/ui';
import { useAppStore } from '../stores/appStore';
import { addDocument, removeDocument, type DocumentInput } from '../services/profile';
import { fileToDataUrl } from '../lib/files';
import { zar, fmtDate, todayIso } from '../lib/format';
import { LIMITS, type BusinessDocument, type DocumentKind } from '../types';

const KINDS: { value: DocumentKind; label: string; icon: React.ElementType; hint: string }[] = [
  { value: 'invoice', label: 'Invoice', icon: FileText, hint: 'Invoices you issued to customers' },
  { value: 'receipt', label: 'Receipt', icon: Receipt, hint: 'Proof of what you bought or were paid' },
  { value: 'bank_statement', label: 'Bank statement', icon: Landmark, hint: 'Monthly statements (redact nothing — stored privately)' },
  { value: 'other', label: 'Other', icon: File, hint: 'Contracts, tax clearance, certificates' },
];

const KIND_LABEL: Record<DocumentKind, string> = { invoice: 'Invoice', receipt: 'Receipt', bank_statement: 'Bank statement', other: 'Other' };

const fieldCls =
  'w-full rounded-2xl bg-surface-inset/60 px-3.5 py-2.5 text-[0.875rem] text-ink focus:bg-surface-inset focus:outline-none';

const emptyInput = (kind: DocumentKind = 'invoice'): DocumentInput => ({
  kind,
  title: '',
  documentDate: todayIso(),
  amount: null,
  counterparty: '',
  note: '',
  fileName: null,
  mimeType: null,
  dataUrl: null,
});

/**
 * Run — the business records how it actually performs: invoices, receipts and
 * bank statements, scanned from a phone camera or uploaded. Documents are
 * owner-only in Firestore and enter a "pending review" state for the AI
 * analysis layer that lands later. Nothing here is visible to funders.
 */
const Run: React.FC = () => {
  const profile = useAppStore((s) => s.profile);
  const documents = useAppStore((s) => s.documents);
  const loadDocuments = useAppStore((s) => s.loadDocuments);
  const showToast = useAppStore((s) => s.showToast);

  const [input, setInput] = useState<DocumentInput>(emptyInput());
  const [tab, setTab] = useState(0);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (tab === 0) return documents;
    const kind = KINDS[tab - 1].value;
    return documents.filter((d) => d.kind === kind);
  }, [documents, tab]);

  // Sum of the amounts in view — meaningful for invoices/receipts, so it sits with the list.
  const filteredTotal = useMemo(() => filtered.reduce((s, d) => s + (d.amount || 0), 0), [filtered]);
  const filterLabel = tab === 0 ? 'record' : KINDS[tab - 1].label.toLowerCase();

  const set = <K extends keyof DocumentInput>(k: K, v: DocumentInput[K]) => setInput((i) => ({ ...i, [k]: v }));

  const attach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setReading(true);
    setError(null);
    try {
      const dataUrl = await fileToDataUrl(file, { maxEdge: 1600, maxBytes: LIMITS.documentDataUrl });
      setInput((i) => ({
        ...i,
        fileName: file.name.slice(0, LIMITS.fileName),
        mimeType: dataUrl.startsWith('data:image') ? 'image/jpeg' : file.type,
        dataUrl,
        title: i.title || file.name.replace(/\.[^.]+$/, '').slice(0, 160),
      }));
    } catch (err: any) {
      setError(err?.message || 'Could not read that file.');
    } finally {
      setReading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!input.title.trim()) return setError('Give the document a short title.');
    if (!input.dataUrl && input.kind !== 'other') return setError('Scan or upload the document so it can be analysed.');
    setBusy(true);
    try {
      await addDocument(input);
      await loadDocuments();
      setInput(emptyInput(input.kind));
      showToast('Saved. It will be analysed once AI review is switched on.', 'success');
    } catch (err: any) {
      setError(err?.code === 'permission-denied' ? 'Not allowed — check the file size and try again.' : err?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d: BusinessDocument) => {
    if (!confirm(`Delete "${d.title}"?`)) return;
    setDeleting(d.id);
    try {
      await removeDocument(d.id);
      await loadDocuments();
    } catch (err: any) {
      showToast(err?.message || 'Could not delete.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const gated = !profile || profile.verificationStatus === 'unverified';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Run"
        title="Business records"
        subtitle="Scan invoices, receipts and bank statements. They build the performance picture behind your rating and stay private to you."
      />

      <Tile className="flex-row items-start gap-3 bg-surface-inset/60">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <p className="text-[0.8125rem] text-muted">
          <span className="font-semibold text-ink">AI review is coming.</span> Every document you add is queued as{' '}
          <em>pending review</em>. When the analysis layer is switched on it will cross-check these records against
          your agreements and flag anything that does not add up — so your Statistics can be trusted by funders.
        </p>
      </Tile>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        {/* ── Capture form ─────────────────────────────────────────── */}
        <form onSubmit={save} className="space-y-4">
          <Tile className="gap-4">
            <Label>Add a document</Label>
            <div className="grid grid-cols-2 gap-2">
              {KINDS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('kind', value)}
                  className={
                    'flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-[0.8125rem] font-semibold transition-colors ' +
                    (input.kind === value ? 'bg-ink text-canvas' : 'bg-surface-inset text-muted hover:text-ink')
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" /> {label}
                </button>
              ))}
            </div>
            <p className="-mt-1 text-[0.75rem] text-faint">{KINDS.find((k) => k.value === input.kind)?.hint}</p>

            {/* Scan / upload */}
            <div className="rounded-2xl border border-dashed border-hairline p-3">
              {input.dataUrl ? (
                <div className="flex items-center gap-3">
                  {input.dataUrl.startsWith('data:image') ? (
                    <img src={input.dataUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-surface-inset text-muted">
                      <FileText className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.8125rem] font-semibold text-ink">{input.fileName}</p>
                    <p className="text-[0.75rem] text-faint">{Math.round((input.dataUrl.length * 0.75) / 1024)} KB · ready</p>
                  </div>
                  <button type="button" onClick={() => setInput((i) => ({ ...i, dataUrl: null, fileName: null, mimeType: null }))} className="text-[0.75rem] text-muted hover:text-negative">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="accent" onClick={() => cameraRef.current?.click()} disabled={reading} className="flex-1">
                    {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Scan with camera
                  </Button>
                  <Button type="button" variant="soft" onClick={() => fileRef.current?.click()} disabled={reading} className="flex-1">
                    <Upload className="h-4 w-4" /> Upload file
                  </Button>
                </div>
              )}
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={attach} />
              <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={attach} />
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[0.75rem] font-medium text-muted">Title *</span>
              <input value={input.title} onChange={(e) => set('title', e.target.value)} maxLength={160} className={fieldCls} placeholder={input.kind === 'bank_statement' ? 'FNB business account — March' : 'INV-0042 — Example Retail'} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.75rem] font-medium text-muted">{input.kind === 'bank_statement' ? 'Statement date' : 'Document date'} *</span>
                <input type="date" value={input.documentDate} max={todayIso()} onChange={(e) => set('documentDate', e.target.value)} className={fieldCls} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.75rem] font-medium text-muted">{input.kind === 'bank_statement' ? 'Closing balance (ZAR)' : 'Amount (ZAR)'}</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={input.amount ?? ''}
                  onChange={(e) => set('amount', e.target.value === '' ? null : Number(e.target.value))}
                  className={fieldCls}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.75rem] font-medium text-muted">{input.kind === 'bank_statement' ? 'Bank' : 'Customer / supplier'}</span>
              <input value={input.counterparty} onChange={(e) => set('counterparty', e.target.value)} maxLength={160} className={fieldCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.75rem] font-medium text-muted">Note</span>
              <textarea value={input.note} onChange={(e) => set('note', e.target.value)} maxLength={1000} rows={2} className={fieldCls + ' resize-none'} />
            </label>

            {error && <p className="rounded-2xl bg-negative/10 px-4 py-2.5 text-[0.8125rem] font-medium text-negative">{error}</p>}

            <Button type="submit" variant="solid" disabled={busy || reading || gated} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />} Save to records
            </Button>
            {gated && <p className="text-center text-[0.75rem] text-faint">Verify your business first to add records.</p>}
          </Tile>
        </form>

        {/* ── Records list ─────────────────────────────────────────── */}
        <div className="space-y-3">
          <SegmentTabs tabs={['All', ...KINDS.map((k) => k.label)]} value={tab} onChange={setTab} className="w-full overflow-x-auto [&>button]:flex-1 [&>button]:whitespace-nowrap" />
          {filtered.length > 0 && (
            <div className="flex items-baseline justify-between gap-3 px-1">
              <Label>
                {filtered.length} {filterLabel}{filtered.length === 1 ? '' : 's'}
              </Label>
              {filteredTotal > 0 && tab !== 0 && (
                <span className="tnum text-[0.8125rem] font-semibold text-ink">{zar(filteredTotal)} total</span>
              )}
            </div>
          )}
          {filtered.length === 0 ? (
            <Tile className="items-center gap-2 py-12 text-center">
              <ScanLine className="h-8 w-8 text-faint" />
              <p className="text-[0.9375rem] font-semibold text-ink">No records yet</p>
              <p className="max-w-sm text-[0.8125rem] text-muted">
                Point your camera at an invoice or statement to start building your performance history.
              </p>
            </Tile>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((d) => (
                <Tile key={d.id} className="flex-row items-center gap-3 py-3">
                  {d.dataUrl && d.dataUrl.startsWith('data:image') ? (
                    <img src={d.dataUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface-inset text-muted">
                      <FileText className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.875rem] font-semibold text-ink">{d.title}</p>
                    <p className="truncate text-[0.75rem] text-muted">
                      {KIND_LABEL[d.kind]} · {fmtDate(d.documentDate)}
                      {d.counterparty ? ` · ${d.counterparty}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    {d.amount !== null && <p className="tnum text-[0.875rem] font-semibold text-ink">{zar(d.amount)}</p>}
                    <span
                      className={
                        'inline-block rounded-full px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.06em] ' +
                        (d.analysisStatus === 'pending_review'
                          ? 'bg-surface-inset text-muted'
                          : d.analysisStatus === 'analysed'
                            ? 'bg-positive/15 text-positive'
                            : 'bg-negative/10 text-negative')
                      }
                    >
                      {d.analysisStatus === 'pending_review' ? 'Pending AI review' : d.analysisStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {d.dataUrl && (
                      <a href={d.dataUrl} download={d.fileName || d.title} className="rounded-xl p-2 text-muted hover:bg-surface-inset hover:text-ink" title="Download">
                        <Upload className="h-4 w-4 rotate-180" />
                      </a>
                    )}
                    <button onClick={() => remove(d)} disabled={deleting === d.id} className="rounded-xl p-2 text-muted hover:bg-negative/10 hover:text-negative" title="Delete">
                      {deleting === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </Tile>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Run;
