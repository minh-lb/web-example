"use client";

import { useEffect, useState } from "react";

type AuditEvent = {
  eventID: string; eventTime: string; eventSource: string; eventName: string;
  resourceId: number | null; userIdentity: { email: string | null; role: string };
  outcome: "SUCCESS" | "FAILURE"; statusCode: number | null; readOnly: boolean;
};
type Result = {items: AuditEvent[]; total: number; page: number; totalPages: number};
const empty: Result = {items:[], total:0, page:1, totalPages:1};
const initial = {eventSource:"",eventName:"",actor:"",outcome:"",from:"",to:""};

export function AuditLogManager() {
  const [draft,setDraft] = useState(initial);
  const [filters,setFilters] = useState(initial);
  const [page,setPage] = useState(1);
  const [refresh,setRefresh] = useState(0);
  const [result,setResult] = useState<Result>(empty);
  const [selected,setSelected] = useState<AuditEvent|null>(null);
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
      <div className="border-b p-5 text-sm font-semibold">Event history ({result.total})</div>
      {error && <p role="alert" className="p-5 text-red-700">{error}</p>}
      {loading ? <p role="status" className="p-5">Loading audit logs…</p> : !error && (result.items.length === 0 ? <p className="p-5 text-slate-500">No audit events found.</p> :
        <div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr>{["Event time (UTC)","Event name","Source","Actor","Resource ID","Outcome","Details"].map(c=><th key={c} scope="col" className="px-4 py-3">{c}</th>)}</tr></thead>
          <tbody>{result.items.map(event=><tr key={event.eventID} className="border-t">
            <td className="px-4 py-3">{new Date(event.eventTime).toISOString().replace("T"," ").replace("Z","")}</td>
            <td className="px-4 py-3 font-semibold">{event.eventName}</td><td className="px-4 py-3">{event.eventSource}</td>
            <td className="px-4 py-3">{event.userIdentity.email||"System"} <span className="text-slate-500">({event.userIdentity.role})</span></td>
            <td className="px-4 py-3">{event.resourceId??"—"}</td><td className="px-4 py-3"><span className={event.outcome==="SUCCESS"?"text-emerald-700":"text-red-700"}>{event.outcome}</span></td>
            <td className="px-4 py-3"><button className="font-semibold text-indigo-700 underline" onClick={()=>setSelected(event)} aria-label={"View event "+event.eventID}>View</button></td>
          </tr>)}</tbody></table></div>)}
      <footer className="flex items-center justify-between border-t p-4 text-sm">
        <button className="rounded-lg border px-3 py-2 disabled:opacity-40" disabled={loading||!!error||result.page<=1} onClick={()=>setPage(result.page-1)}>Previous</button>
        <span>Page {result.page} of {result.totalPages}</span>
        <button className="rounded-lg border px-3 py-2 disabled:opacity-40" disabled={loading||!!error||result.page>=result.totalPages} onClick={()=>setPage(result.page+1)}>Next</button>
      </footer>
    </section>
    {selected && <section className="surface p-5" aria-label="Event details"><div className="mb-4 flex justify-between"><h2 className="font-bold">Event details</h2><button className="text-sm font-semibold underline" onClick={()=>setSelected(null)}>Close details</button></div><pre className="overflow-x-auto rounded-lg bg-slate-50 p-4 text-xs">{JSON.stringify(selected,null,2)}</pre></section>}
  </div>;
}
