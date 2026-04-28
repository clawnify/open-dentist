import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/api";
import { useApp } from "@/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import type { Invoice } from "@/types";

const STATUS_STYLE: Record<Invoice["status"], string> = {
  open: "bg-amber-100 text-amber-800 border-amber-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  void: "bg-slate-100 text-slate-700 border-slate-200",
};

export function Billing({ patientId }: { patientId: number }) {
  const app = useApp();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await api<{ invoices: Invoice[] }>("GET", `/api/patients/${patientId}/invoices`);
        setInvoices(data.invoices);
      } catch (err) {
        app.setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId, app]);

  const summary = useMemo(() => {
    let billed = 0;
    let paid = 0;
    for (const i of invoices) {
      if (i.status === "void") continue;
      billed += i.total;
      paid += i.amount_paid;
    }
    return { billed, paid, balance: billed - paid };
  }, [invoices]);

  async function addInvoice(e: React.FormEvent) {
    e.preventDefault();
    const t = parseFloat(total || "0") || 0;
    if (t <= 0) {
      app.setError("Enter an amount greater than 0");
      return;
    }
    setAdding(true);
    try {
      const res = await api<{ invoice: Invoice }>("POST", "/api/invoices", {
        patient_id: patientId,
        total: t,
      });
      setInvoices((prev) => [res.invoice, ...prev]);
      setTotal("");
    } catch (err) {
      app.setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function setStatus(id: number, status: Invoice["status"]) {
    try {
      const patch: Partial<Invoice> = { status };
      if (status === "paid") {
        const inv = invoices.find((i) => i.id === id);
        if (inv) patch.amount_paid = inv.total;
      }
      const res = await api<{ invoice: Invoice }>("PUT", `/api/invoices/${id}`, patch);
      setInvoices((prev) => prev.map((i) => (i.id === id ? res.invoice : i)));
    } catch (err) {
      app.setError((err as Error).message);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this invoice?")) return;
    try {
      await api("DELETE", `/api/invoices/${id}`);
      setInvoices((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      app.setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryStat label="Billed"  amount={summary.billed}  tone="sky" />
        <SummaryStat label="Paid"    amount={summary.paid}    tone="emerald" />
        <SummaryStat label="Balance" amount={summary.balance} tone={summary.balance > 0 ? "rose" : "slate"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={addInvoice} className="grid grid-cols-1 items-end gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label className="text-xs">Quick invoice total</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Button type="submit" disabled={adding}>
              <Plus className="h-4 w-4" />
              Add invoice
            </Button>
          </form>

          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>
          ) : invoices.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">Issued</th>
                    <th className="px-3 py-2 text-right font-semibold">Total</th>
                    <th className="px-3 py-2 text-right font-semibold">Paid</th>
                    <th className="px-3 py-2 text-right font-semibold">Balance</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((i) => {
                    const balance = i.total - i.amount_paid;
                    return (
                      <tr key={i.id} className="border-b last:border-0">
                        <td className="px-3 py-2">{formatDate(i.issued_at, { year: "numeric", month: "short", day: "numeric" })}</td>
                        <td className="px-3 py-2 text-right tabular-nums">${i.total.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-700">${i.amount_paid.toFixed(2)}</td>
                        <td className={cn("px-3 py-2 text-right tabular-nums", balance > 0 ? "text-rose-700" : "text-muted-foreground")}>
                          ${balance.toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          <Select value={i.status} onValueChange={(v) => setStatus(i.id, v as Invoice["status"])}>
                            <SelectTrigger className={cn("h-7 w-[110px] text-xs", STATUS_STYLE[i.status])}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="void">Void</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button variant="ghost" size="icon" onClick={() => remove(i.id)} aria-label="Delete">
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({ label, amount, tone }: { label: string; amount: number; tone: "sky" | "emerald" | "rose" | "slate" }) {
  const styles = {
    sky:     { bg: "bg-sky-50",     border: "border-sky-200",     text: "text-sky-900" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900" },
    rose:    { bg: "bg-rose-50",    border: "border-rose-200",    text: "text-rose-900" },
    slate:   { bg: "bg-slate-50",   border: "border-slate-200",   text: "text-slate-900" },
  }[tone];
  return (
    <div className={cn("rounded-lg border p-4", styles.bg, styles.border)}>
      <div className={cn("text-xs font-semibold uppercase tracking-wider opacity-80", styles.text)}>{label}</div>
      <div className={cn("mt-1 text-2xl font-bold tabular-nums", styles.text)}>${amount.toFixed(2)}</div>
    </div>
  );
}
