import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate, Link } from "react-router-dom";
import { getWalletBalance, getTransactions, sendPayment } from "@/lib/payment-api";
import { Card } from "@/components/ui/card";
import { Wallet, ArrowDownLeft, ArrowUpRight, ArrowLeft, TrendingUp, Loader2 } from "lucide-react";

interface Transaction {
  customer_reference: string;
  provider: string;
  msisdn: string;
  transaction_type: string;
  transaction_method: string;
  currency: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function AdminWalletPage() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState("");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    setFetching(true);
    try {
      const [balRes, txRes] = await Promise.all([getWalletBalance(), getTransactions()]);
      if (balRes?.success) {
        const bal =
          balRes.balance ??
          balRes.available_balance ??
          balRes.relworx?.balance ??
          balRes.relworx?.available_balance ??
          0;
        setBalance(Number(bal) || 0);
      }
      if (txRes?.success) {
        const list = txRes.transactions ?? txRes.relworx?.transactions ?? [];
        setTransactions(list);
      }
    } catch (e) {
      console.error("Fetch wallet error:", e);
    } finally {
      setFetching(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount) || balance;
    if (!amount || amount <= 0) return;
    if (!phoneNumber || phoneNumber.length < 10) { setWithdrawMsg("Enter a valid phone number"); return; }

    const msisdn = phoneNumber.startsWith("+") ? phoneNumber : phoneNumber.startsWith("0") ? `+256${phoneNumber.slice(1)}` : `+256${phoneNumber}`;

    setWithdrawing(true);
    setWithdrawMsg("");
    try {
      const res = await sendPayment(msisdn, amount, "LUO CINEMA");
      if (res.success) {
        setWithdrawMsg(`Withdrawal of UGX ${amount.toLocaleString()} initiated successfully!`);
        setShowWithdraw(false);
        setWithdrawAmount("");
        setPhoneNumber("");
        setTimeout(fetchData, 3000);
      } else {
        setWithdrawMsg("Withdrawal failed. Try again.");
      }
    } catch {
      setWithdrawMsg("Network error.");
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const collections = transactions.filter((t) => t.transaction_type === "collection" && t.status === "success");
  const payouts = transactions.filter((t) => t.transaction_type === "payout");
  const successTotal = collections.reduce((sum, t) => sum + t.amount, 0);
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Wallet className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Wallet</h1>
              <p className="text-muted-foreground text-xs">Manage your earnings</p>
            </div>
          </div>
          <Link to="/admin" className="text-primary hover:underline text-sm flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>

        <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 mb-6">
          <p className="text-muted-foreground text-xs mb-1">Available Balance</p>
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-muted-foreground text-sm">UGX</span>
            <span className="text-3xl md:text-4xl font-bold text-foreground">{balance.toLocaleString()}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setWithdrawAmount(balance.toString()); setShowWithdraw(true); }} className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-bold transition">
              Withdraw All
            </button>
            <button onClick={() => { setWithdrawAmount(""); setShowWithdraw(true); }} className="px-5 py-2.5 bg-secondary hover:bg-muted border border-border text-foreground rounded-lg text-sm font-medium transition">
              Custom Withdraw
            </button>
            <button onClick={fetchData} className="px-4 py-2.5 bg-secondary border border-border text-foreground rounded-lg text-sm transition">
              Refresh
            </button>
          </div>
        </Card>

        {withdrawMsg && <p className="text-sm text-accent mb-3">{withdrawMsg}</p>}

        {showWithdraw && (
          <Card className="p-5 mb-6 border-primary/30">
            <h3 className="text-foreground font-bold text-sm mb-3">Withdraw Funds</h3>
            <div className="space-y-3">
              <div>
                <label className="text-muted-foreground text-xs mb-1 block">Amount (UGX)</label>
                <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm" placeholder="Enter amount" />
              </div>
              <div>
                <label className="text-muted-foreground text-xs mb-1 block">Mobile Money Number</label>
                <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm" placeholder="e.g. 0770123456" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleWithdraw} disabled={withdrawing} className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg text-sm font-bold transition flex items-center gap-2">
                  {withdrawing && <Loader2 className="w-4 h-4 animate-spin" />} Confirm Withdraw
                </button>
                <button onClick={() => setShowWithdraw(false)} className="px-4 py-2 bg-secondary border border-border text-foreground rounded-lg text-sm transition">Cancel</button>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-3 bg-card border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-lg font-bold text-foreground">{collections.length}</p>
                <p className="text-[10px] text-muted-foreground">Collections</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-card border-border">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-lg font-bold text-foreground">{payouts.length}</p>
                <p className="text-[10px] text-muted-foreground">Payouts</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-card border-border">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              <div>
                <p className="text-lg font-bold text-foreground">UGX {successTotal.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Total Collected</p>
              </div>
            </div>
          </Card>
        </div>

        <div>
          <h3 className="text-foreground font-bold text-sm mb-3">Transaction History</h3>
          {transactions.length === 0 ? (
            <Card className="p-8 bg-card border-border text-center">
              <p className="text-muted-foreground text-sm">No transactions yet</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => {
                const isCollection = tx.transaction_type === "collection";
                const isSuccess = tx.status === "success";
                return (
                  <Card key={tx.customer_reference} className="p-3 bg-card border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        {isCollection ? <ArrowDownLeft className={`w-4 h-4 ${isSuccess ? "text-green-500" : "text-red-500"}`} /> : <ArrowUpRight className="w-4 h-4 text-red-500" />}
                      </div>
                      <div>
                        <p className="text-foreground text-sm font-medium">
                          {isCollection ? "Payment Collection" : "Payout"} • {tx.provider.replace("_", " ")}
                        </p>
                        <p className="text-muted-foreground text-[10px]">📱 {tx.msisdn}</p>
                        <p className="text-muted-foreground text-[10px]">
                          {new Date(tx.created_at).toLocaleString()} • <span className={isSuccess ? "text-green-500" : "text-red-500"}>{tx.status}</span>
                          {` • Ref: ${tx.customer_reference}`}
                        </p>
                      </div>
                    </div>
                    <p className={`font-bold text-sm ${isCollection && isSuccess ? "text-green-500" : isCollection ? "text-muted-foreground" : "text-red-500"}`}>
                      {isCollection ? "+" : "-"}{tx.currency} {tx.amount.toLocaleString()}
                    </p>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
