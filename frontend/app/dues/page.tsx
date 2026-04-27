"use client";

import { useEffect, useState } from "react";
import { AddDueForm, DueCard } from "@/components";
import { expenseApi } from "@/lib/api";
import { formatINR } from "@/lib/currency";
import { Loader2, Search } from "lucide-react";
import toast from "react-hot-toast";

interface Due {
  id: number;
  title: string;
  amount: number;
  creditor: string;
  due_date: string;
  category: string;
  status: "pending" | "paid" | "overdue";
  created_at: string;
  notes?: string;
}

export default function DuesPage() {
  const [dues, setDues] = useState<Due[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "paid">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchDues();
  }, []);

  const fetchDues = async () => {
    setIsLoading(true);
    try {
      const data = await expenseApi.getDues();
      setDues(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch dues error:", error);
      toast.error("Failed to fetch dues");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDue = (deletedId: number) => {
    setDues(dues.filter((due) => due.id !== deletedId));
  };

  const handleStatusChange = (updatedId: number, newStatus: string) => {
    setDues(
      dues.map((due) =>
        due.id === updatedId
          ? { ...due, status: newStatus as "pending" | "paid" | "overdue" }
          : due,
      ),
    );
  };

  const filteredDues = dues.filter((due) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "pending" && due.status === "pending") ||
      (activeTab === "paid" && due.status === "paid");
    const matchesSearch =
      search === "" ||
      due.creditor.toLowerCase().includes(search.toLowerCase()) ||
      due.title.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const totalPending = dues
    .filter((d) => d.status === "pending")
    .reduce((sum, d) => sum + d.amount, 0);

  const totalPaid = dues
    .filter((d) => d.status === "paid")
    .reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent mb-2">
            Manage Your Dues
          </h1>
          <p className="text-muted-foreground mb-8">
            Track money you owe to others and stay on top of your obligations
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-2">Total Dues</p>
            <p className="text-3xl font-bold text-foreground">
              {formatINR(totalPending + totalPaid)}
            </p>
          </div>
          <div className="bg-card border border-yellow-500/30 rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-2">
              Pending Payment
            </p>
            <p className="text-3xl font-bold text-yellow-500">
              {formatINR(totalPending)}
            </p>
          </div>
          <div className="bg-card border border-green-500/30 rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-2">Already Paid</p>
            <p className="text-3xl font-bold text-green-500">
              {formatINR(totalPaid)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Dues List */}
          <div>
            <div className="bg-card border border-border rounded-lg p-6">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name or title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-colors"
                />
              </div>

              {/* Tabs */}
              <div className="flex gap-3 mb-6 border-b border-border pb-4">
                {["all", "pending", "paid"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      activeTab === tab
                        ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === "all" && "All Dues"}
                    {tab === "pending" && "Pending"}
                    {tab === "paid" && "Paid"}
                  </button>
                ))}
              </div>

              {/* Dues List */}
              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredDues.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      {activeTab === "all" && "No dues recorded yet. Great!"}
                      {activeTab === "pending" &&
                        "No pending dues. You are all clear!"}
                      {activeTab === "paid" && "No paid dues yet."}
                    </p>
                  </div>
                ) : (
                  filteredDues.map((due) => (
                    <DueCard
                      key={due.id}
                      due={due}
                      onDelete={handleDeleteDue}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Add Due Button - Bottom Right */}
        <div className="fixed bottom-8 right-8">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition-all flex items-center gap-2"
          >
            <span>+ Add Due</span>
          </button>
        </div>

        {/* Add Due Form Modal */}
        <AddDueForm
          isOpen={showAddForm}
          onClose={() => setShowAddForm(false)}
        />
      </div>
    </div>
  );
}
