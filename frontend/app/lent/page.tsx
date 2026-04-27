"use client";

import { useEffect, useState } from "react";
import { expenseApi } from "@/lib/api";
import { formatINR } from "@/lib/currency";
import {
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";

interface SplitDetail {
  split_id: number;
  amount_owed: number;
  expense_title: string;
  created_at: string;
}

interface AggregatedPerson {
  person_name: string;
  total_amount: number;
  splits: SplitDetail[];
}

export default function LentPage() {
  const [people, setPeople] = useState<AggregatedPerson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settlingId, setSettlingId] = useState<number | null>(null);
  const [expandedPeople, setExpandedPeople] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await expenseApi.getLentAggregated();
      setPeople(Array.isArray(data) ? data : []);
    } catch {
      // fallback: build aggregated from flat list
      try {
        const flat = await expenseApi.getLent();
        const grouped: Record<string, AggregatedPerson> = {};
        for (const item of flat as any[]) {
          const key = item.person_name.toLowerCase();
          if (!grouped[key]) {
            grouped[key] = {
              person_name: item.person_name,
              total_amount: 0,
              splits: [],
            };
          }
          grouped[key].total_amount += item.amount_owed;
          grouped[key].splits.push({
            split_id: item.split_id,
            amount_owed: item.amount_owed,
            expense_title: item.expense_title,
            created_at: item.created_at,
          });
        }
        setPeople(Object.values(grouped));
      } catch {
        toast.error("Failed to load lent data");
        setPeople([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkSettled = async (splitId: number, personKey: string) => {
    setSettlingId(splitId);
    try {
      await expenseApi.markSplitSettled(splitId);
      toast.success("Marked as settled!");
      // Remove that split
      setPeople((prev) =>
        prev
          .map((p) =>
            p.person_name.toLowerCase() === personKey
              ? {
                  ...p,
                  total_amount:
                    p.total_amount -
                    (p.splits.find((s) => s.split_id === splitId)
                      ?.amount_owed ?? 0),
                  splits: p.splits.filter((s) => s.split_id !== splitId),
                }
              : p,
          )
          .filter((p) => p.splits.length > 0),
      );
    } catch {
      toast.error("Failed to mark as settled");
    } finally {
      setSettlingId(null);
    }
  };

  const handleSettleAll = async (person: AggregatedPerson) => {
    for (const split of person.splits) {
      try {
        await expenseApi.markSplitSettled(split.split_id);
      } catch {}
    }
    toast.success(`All settled with ${person.person_name}!`);
    setPeople((prev) =>
      prev.filter((p) => p.person_name !== person.person_name),
    );
  };

  const toggleExpand = (name: string) => {
    setExpandedPeople((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const filtered = people.filter((p) =>
    p.person_name.toLowerCase().includes(search.toLowerCase()),
  );
  const totalLent = people.reduce((s, p) => s + p.total_amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-foreground mb-1">
            💰 Money Lent
          </h1>
          <p className="text-muted-foreground text-sm">
            Track money you&apos;ve lent — grouped by person
          </p>
        </div>

        {/* Total Card */}
        {people.length > 0 && (
          <div className="mb-5 rounded-xl border border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-5 flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">
                Total Outstanding
              </p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatINR(totalLent)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {people.length} {people.length === 1 ? "person" : "people"} owe
                you
              </p>
            </div>
            <span className="text-4xl">💚</span>
          </div>
        )}

        {/* Search */}
        {people.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors"
            />
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card text-center py-14 px-6">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-muted-foreground font-medium">
              {search
                ? `No results for "${search}"`
                : "No outstanding lent money"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Split expenses will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {filtered.map((person) => {
              const key = person.person_name.toLowerCase();
              const isExpanded = expandedPeople.has(key);
              return (
                <div
                  key={key}
                  className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden"
                >
                  {/* Person header row */}
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {person.person_name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground leading-tight">
                        {person.person_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {person.splits.length}{" "}
                        {person.splits.length === 1
                          ? "transaction"
                          : "transactions"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-primary">
                        {formatINR(person.total_amount)}
                      </p>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-2 px-4 pb-3">
                    <button
                      onClick={() => toggleExpand(key)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                      {isExpanded ? "Hide" : "Show"} details
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => handleSettleAll(person)}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Settle All
                    </button>
                  </div>

                  {/* Expandable transaction list */}
                  {isExpanded && (
                    <div className="border-t border-border/50 bg-secondary/30">
                      {person.splits.map((split) => (
                        <div
                          key={split.split_id}
                          className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30 last:border-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {split.expense_title}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(split.created_at).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-primary shrink-0">
                            {formatINR(split.amount_owed)}
                          </p>
                          <button
                            onClick={() =>
                              handleMarkSettled(split.split_id, key)
                            }
                            disabled={settlingId === split.split_id}
                            className="px-2.5 py-1.5 bg-green-600/10 hover:bg-green-600 text-green-600 hover:text-white rounded-lg text-[11px] font-medium border border-green-600/20 hover:border-green-600 transition-all disabled:opacity-50 flex items-center gap-1"
                          >
                            {settlingId === split.split_id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            Settle
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Info */}
        <div className="mt-6 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4">
          <p className="text-sm font-medium mb-1">💡 How it works</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Split expenses are grouped by person — no duplicate cards</li>
            <li>Expand a person to see individual transactions</li>
            <li>Settle individual transactions or all at once</li>
            <li>
              Use <strong>@name</strong> in chat to refer to existing people
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
