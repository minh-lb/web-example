"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, EmptyState, Modal, Spinner, Toast } from "./ui";

type Customer = { id: number; name: string; email: string; phone: string; _count: { bookings: number } };
type PageData = { items: Customer[]; total: number; page: number; pageSize: number };

export function CustomersManager() {
  const [data, setData] = useState<PageData>({ items: [], total: 0, page: 1, pageSize: 20 });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ search, page: String(page) });
    fetch("/api/customers?" + query, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Could not load customers");
        const result = await response.json() as PageData;
        if (!controller.signal.aborted) {
          const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
          if (page > lastPage) setPage(lastPage);
          else setData(result);
        }
      })
      .catch(() => { if (!controller.signal.aborted) setError("Could not load customers"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, page, revision]);

  async function openCustomer(id: number) {
    setOpening(true);
    setFormError("");
    setToast("");
    try {
      const response = await fetch("/api/customers/" + id);
      if (!response.ok) throw new Error("Could not load customer details");
      setSelected(await response.json() as Customer);
    } catch (caught) {
      setToast(caught instanceof Error ? caught.message : "Could not load customer details");
    } finally { setOpening(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || saving) return;
    setSaving(true);
    setFormError("");
    try {
      const { id, name, email, phone } = selected;
      const response = await fetch("/api/customers/" + id, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update customer");
      setSelected(null);
      setRevision(value => value + 1);
      setToast("Customer updated");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not update customer");
    } finally { setSaving(false); }
  }

  return <div className="space-y-6">
    <div><h1 className="section-title">Customers</h1>
      <p className="mt-2 text-sm text-[#929db0]">Manage contacts created through bookings.</p>
    </div>
    <section className="surface overflow-hidden">
      <div className="border-b border-[#ecf0f5] p-5">
        <label htmlFor="customer-search" className="field-label">Search customers</label>
        <input id="customer-search" className="field max-w-sm" placeholder="Search customers..." value={search}
          onChange={event => { setSearch(event.target.value); setPage(1); }}/>
      </div>
      {loading ? <Spinner label="Loading customers..."/> : error ? (
        <EmptyState title="Could not load customers" description="Try refreshing the page."/>
      ) : data.items.length === 0 ? (
        <EmptyState title="No customers found" description="Customers are added when bookings are created."/>
      ) : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm">
        <thead className="table-head bg-[#fafbfe]"><tr>
          <th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Phone</th>
          <th className="p-4">Bookings</th><th className="p-4">Actions</th>
        </tr></thead>
        <tbody>{data.items.map(customer => <tr key={customer.id} className="table-row">
          <td className="p-4 font-semibold">{customer.name}</td><td className="p-4">{customer.email}</td>
          <td className="p-4">{customer.phone}</td><td className="p-4">{customer._count.bookings}</td>
          <td className="p-4"><Button variant="secondary" disabled={opening} onClick={() => void openCustomer(customer.id)}>Edit {customer.name}</Button></td>
        </tr>)}</tbody>
      </table></div>}
      <div className="flex items-center justify-between border-t border-[#eef1f5] p-5 text-xs">
        <span>{data.total} matching customers</span>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</Button>
          <Button variant="secondary" disabled={page * data.pageSize >= data.total || loading} onClick={() => setPage(value => value + 1)}>Next</Button>
        </div>
      </div>
    </section>
    {selected && <Modal title="Edit customer" onClose={() => { if (!saving) setSelected(null); }}>
      <form onSubmit={save} className="space-y-4">
        <div><label className="field-label" htmlFor="customer-name">Name</label>
          <input id="customer-name" className="field" required minLength={2} maxLength={100} value={selected.name}
            onChange={event => setSelected({ ...selected, name: event.target.value })}/></div>
        <div><label className="field-label" htmlFor="customer-email">Email</label>
          <input id="customer-email" className="field" type="email" required maxLength={255} value={selected.email}
            onChange={event => setSelected({ ...selected, email: event.target.value })}/></div>
        <div><label className="field-label" htmlFor="customer-phone">Phone</label>
          <input id="customer-phone" className="field" required minLength={8} maxLength={20} value={selected.phone}
            onChange={event => setSelected({ ...selected, phone: event.target.value })}/></div>
        <p className="text-xs">Bookings: {selected._count.bookings}</p>
        {formError && <p role="alert" className="text-sm text-rose-600">{formError}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={saving} onClick={() => setSelected(null)}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save customer"}</Button>
        </div>
      </form>
    </Modal>}
    {toast && <Toast message={toast} kind={toast === "Customer updated" ? "success" : "error"} onClose={() => setToast("")}/>}
  </div>;
}
