"use client";

import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { Button, EmptyState, Spinner, StatusPill } from "./ui";

type AuditEvent = {
  eventID: string; eventTime: string; eventSource: string; eventName: string;
  resourceId: number | null; userIdentity: { email: string | null; role: string };
  outcome: "SUCCESS" | "FAILURE"; statusCode: number | null; readOnly: boolean;
};
type Result = {items: AuditEvent[]; total: number; page: number; totalPages: number};
const empty: Result = {items:[], total:0, page:1, totalPages:1};
const initial = {eventSource:"",eventName:"",actor:"",outcome:"",from:"",to:""};

const actions = new Map([
  ["CreateBooking", { action: "create", completed: "Created", resource: "booking" }],
  ["ChangeBookingStatus", { action: "change the status of", completed: "Changed the status of", resource: "booking" }],
  ["UpdateCustomer", { action: "update", completed: "Updated", resource: "customer" }],
  ["CreateService", { action: "create", completed: "Created", resource: "service" }],
  ["UpdateService", { action: "update", completed: "Updated", resource: "service" }],
  ["ArchiveService", { action: "archive", completed: "Archived", resource: "service" }],
  ["EnqueueJob", { action: "queue", completed: "Queued", resource: "job" }],
  ["RetryJob", { action: "retry", completed: "Retried", resource: "job" }],
  ["ProcessJob", { action: "process", completed: "Processed", resource: "job" }],
]);

const utcDateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "UTC",
});

function operationMessage(event: AuditEvent) {
  const action = actions.get(event.eventName);
  if (!action) {
    return `${event.eventName} ${event.outcome === "SUCCESS" ? "succeeded" : "failed"}`;
  }
  const verb = event.outcome === "SUCCESS" ? action.completed : `Failed to ${action.action}`;
  const resource = event.resourceId === null ? action.resource : `${action.resource} #${event.resourceId}`;
  return `${verb} ${resource}`;
}

export function AuditLogManager() {
  const [draft,setDraft] = useState(initial);
  const [filters,setFilters] = useState(initial);
  const [page,setPage] = useState(1);
  const [refresh,setRefresh] = useState(0);
  const [result,setResult] = useState<Result>(empty);
  const [selected,setSelected] = useState<AuditEvent|null>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({page:String(page)});
    for (const [key,value] of Object.entries(filters)) if(value.trim()) params.set(key,value.trim());
    setLoading(true); setError(""); setSelected(null);
    void (async () => {
      try {
        const response = await fetch("/api/audit-logs?"+params, {cache:"no-store",signal:controller.signal});
        if (!response.ok) throw new Error("Could not load audit logs ("+response.status+")");
        const data = await response.json() as Result;
        if (!controller.signal.aborted) setResult(data);
      } catch(e) {
        if (!controller.signal.aborted) {setError(e instanceof Error ? e.message : "Could not load audit logs");setResult(empty);}
      } finally {if(!controller.signal.aborted) setLoading(false);}
    })();
    return () => controller.abort();
  }, [filters,page,refresh]);
  useEffect(() => {
    const dialog = detailDialog.current;
    if (selected && !dialog?.open) dialog?.showModal();
    if (!selected && dialog?.open) dialog.close();
  }, [selected]);

  const details = selected ? [
    ["Event time (UTC)", new Date(selected.eventTime).toISOString().replace("T", " ").replace("Z", "")],
    ["Outcome", selected.outcome === "SUCCESS" ? "Success" : "Failed"],
    ["Actor", selected.userIdentity.email || "System"],
    ["Role", selected.userIdentity.role],
    ["Source", selected.eventSource],
    ["Event name", selected.eventName],
    ["Resource ID", selected.resourceId ?? "—"],
    ["HTTP status", selected.statusCode ?? "—"],
    ["Read only", selected.readOnly ? "Yes" : "No"],
    ["Event ID", selected.eventID],
  ] : [];

  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-extrabold">Audit logs</h1><p className="mt-1 text-sm text-slate-500">Business event history · timestamps in UTC</p></div>
      <button className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold" onClick={()=>setRefresh(n=>n+1)}>Refresh</button>
    </header>
    <form className="surface grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3" onSubmit={e=>{e.preventDefault();setPage(1);setFilters({...draft});}}>
      <label className="text-sm font-semibold">Event source<input className="field mt-2" list="audit-sources" value={draft.eventSource} onChange={e=>setDraft({...draft,eventSource:e.target.value})} placeholder="All sources" maxLength={64}/><datalist id="audit-sources">{["bookings","customers","services","queue"].map(s=><option key={s} value={s}/>)}</datalist></label>
      <label className="text-sm font-semibold">Event name<input className="field mt-2" value={draft.eventName} onChange={e=>setDraft({...draft,eventName:e.target.value})} placeholder="CreateBooking" maxLength={64}/></label>
      <label className="text-sm font-semibold">Actor email<input className="field mt-2" value={draft.actor} onChange={e=>setDraft({...draft,actor:e.target.value})} placeholder="admin@example.com" maxLength={255}/></label>
      <label className="text-sm font-semibold">Outcome<select className="field mt-2" value={draft.outcome} onChange={e=>setDraft({...draft,outcome:e.target.value})}><option value="">All outcomes</option><option value="SUCCESS">Success</option><option value="FAILURE">Failure</option></select></label>
      <label className="text-sm font-semibold">From (UTC)<input className="field mt-2" type="date" value={draft.from} max={draft.to||undefined} onChange={e=>setDraft({...draft,from:e.target.value})}/></label>
      <label className="text-sm font-semibold">To (UTC)<input className="field mt-2" type="date" value={draft.to} min={draft.from||undefined} onChange={e=>setDraft({...draft,to:e.target.value})}/></label>
      <div className="flex gap-2"><button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Apply filters</button><button type="button" className="rounded-xl border px-4 py-2 text-sm" onClick={()=>{setDraft(initial);setFilters({...initial});setPage(1);}}>Reset</button></div>
    </form>
    <section className="surface overflow-hidden" aria-label="Event history">
      {loading ? <Spinner label="Loading audit logs..."/> : error ? <p role="alert" className="p-5 text-sm text-rose-600">{error}</p>
        : result.items.length === 0 ? <EmptyState title="No audit events found" description="Try changing or clearing the filters."/> :
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-[13px]">
            <thead className="table-head bg-[#fafbfe]">
              <tr>
                <th scope="col" className="px-6 py-3">Operation</th>
                <th scope="col" className="px-4 py-3">Actor</th>
                <th scope="col" className="px-4 py-3">Event time (UTC)</th>
                <th scope="col" className="px-4 py-3">Outcome</th>
                <th scope="col" className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map(event => {
                const message = operationMessage(event);
                return (
                  <tr key={event.eventID} className="table-row">
                    <th scope="row" className="px-6 py-4">
                      <div className="break-words font-bold">{message}</div>
                      <div className="mt-1 text-[11px] font-normal capitalize text-[#a0aabd]">{event.eventSource}</div>
                    </th>
                    <td className="max-w-60 px-4 py-4">
                      <div className="break-all font-semibold">{event.userIdentity.email || "System"}</div>
                      <div className="mt-1 text-[11px] capitalize text-[#a0aabd]">{event.userIdentity.role}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-[#67748c]">
                      <time dateTime={event.eventTime}>{utcDateTime.format(new Date(event.eventTime))}</time>
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill status={event.outcome === "SUCCESS" ? "SUCCESS" : "FAILED"}/>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        aria-label={`View event details: ${message}`}
                        onClick={() => setSelected(event)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-[#6e6adf] hover:bg-[#f1f0ff]"
                      >
                        <Eye size={15} aria-hidden="true"/> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef1f5] px-6 py-4 text-xs text-[#67748c]">
        <span>Page {result.page} of {result.totalPages} · {result.total} {result.total === 1 ? "event" : "events"}</span>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={loading || !!error || result.page <= 1} onClick={() => setPage(result.page - 1)}>Previous</Button>
          <Button variant="secondary" disabled={loading || !!error || result.page >= result.totalPages} onClick={() => setPage(result.page + 1)}>Next</Button>
        </div>
      </footer>
    </section>
    <dialog
      ref={detailDialog}
      aria-labelledby="audit-detail-title"
      onClose={() => setSelected(null)}
      className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-white text-slate-900 shadow-xl backdrop:bg-slate-950/50"
    >
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 id="audit-detail-title" className="text-lg font-bold">Event details</h2>
        {selected && <p className="mt-1 break-words text-sm text-slate-700">{operationMessage(selected)}</p>}
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 px-6 py-5 text-sm sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold text-slate-600">{label}</dt>
            <dd className="mt-1 break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex justify-end border-t border-slate-200 px-6 py-4">
        <Button variant="secondary" onClick={() => detailDialog.current?.close()}>Close</Button>
      </div>
    </dialog>
  </div>;
}
