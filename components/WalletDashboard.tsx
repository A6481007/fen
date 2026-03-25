"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  getUserWalletBalance,
  getWalletTransactions,
  requestWithdrawal,
  cancelWithdrawalRequest,
  getWithdrawalRequests,
} from "@/actions/walletActions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import PriceFormatter from "./PriceFormatter";

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  orderId?: string;
  status: string;
  createdAt: string;
}

interface WithdrawalRequest {
  _id: string;
  amount: number;
  method: string;
  bankDetails?: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
  };
  paypalEmail?: string;
  status: string;
  requestedAt: string;
  rejectionReason?: string;
}

export default function WalletDashboard() {
  const { user } = useUser();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<
    WithdrawalRequest[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("bank");
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    routingNumber: "",
  });
  const [paypalEmail, setPaypalEmail] = useState("");

  useEffect(() => {
    if (user) {
      loadWalletData();
    }
  }, [user]);

  const loadWalletData = async () => {
    setIsLoading(true);
    try {
      const [balanceData, transactionsData, withdrawalsData] =
        await Promise.all([
          getUserWalletBalance(),
          getWalletTransactions(),
          getWithdrawalRequests(),
        ]);

      if (balanceData.success && balanceData.balance !== undefined)
        setBalance(balanceData.balance);
      if (transactionsData.success && transactionsData.transactions) {
        setTransactions(
          transactionsData.transactions.map((t, index) => ({
            ...t,
            _id: t.id || `transaction-${index}`,
          }))
        );
      }
      if (withdrawalsData.success && withdrawalsData.requests) {
        setWithdrawalRequests(
          withdrawalsData.requests.map((r, index) => ({
            ...r,
            _id: r.id || `withdrawal-${index}`,
          }))
        );
      }
    } catch (error) {
      console.error("Error loading wallet data:", error);
      toast.error("Failed to load wallet data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount);

    if (isNaN(amount) || amount < 10) {
      toast.error("Minimum withdrawal amount is $10");
      return;
    }

    if (amount > balance) {
      toast.error("Insufficient balance");
      return;
    }

    if (
      withdrawMethod === "bank" &&
      (!bankDetails.accountHolderName ||
        !bankDetails.accountNumber ||
        !bankDetails.bankName)
    ) {
      toast.error("Please fill in all bank details");
      return;
    }

    if (withdrawMethod === "paypal" && !paypalEmail) {
      toast.error("Please enter PayPal email");
      return;
    }

    const result = await requestWithdrawal({
      amount,
      method: withdrawMethod as "bank" | "paypal",
      bankDetails: withdrawMethod === "bank" ? bankDetails : undefined,
      paypalEmail: withdrawMethod === "paypal" ? paypalEmail : undefined,
    });

    if (result.success) {
      toast.success(result.message);
      setShowWithdrawDialog(false);
      setWithdrawAmount("");
      setBankDetails({
        accountHolderName: "",
        bankName: "",
        accountNumber: "",
        routingNumber: "",
      });
      setPaypalEmail("");
      loadWalletData();
    } else {
      toast.error(result.message);
    }
  };

  const handleCancelWithdrawal = async (requestId: string) => {
    const result = await cancelWithdrawalRequest(requestId);
    if (result.success) {
      toast.success(result.message);
      loadWalletData();
    } else {
      toast.error(result.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success-base";
      case "pending":
        return "bg-yellow-500";
      case "failed":
        return "bg-red-500";
      case "cancelled":
        return "bg-gray-500";
      case "approved":
        return "bg-blue-500";
      case "processing":
        return "bg-purple-500";
      case "rejected":
        return "bg-red-600";
      default:
        return "bg-gray-400";
    }
  };

  const getTransactionIcon = (type: string) => {
    if (type.includes("credit"))
      return <ArrowUpFromLine className="w-4 h-4 text-success-base" />;
    return <ArrowDownToLine className="w-4 h-4 text-red-600" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        Loading wallet...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Balance Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-6 h-6 text-primary" />
              <CardTitle>Wallet Balance</CardTitle>
            </div>
            <Button onClick={loadWalletData} variant="outline" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription>Available balance in your wallet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">
                <PriceFormatter amount={balance} />
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Can be used for future orders or withdrawn
              </p>
            </div>
            <Dialog
              open={showWithdrawDialog}
              onOpenChange={setShowWithdrawDialog}
            >
              <DialogTrigger asChild>
                <Button disabled={balance < 10}>
                  <ArrowDownToLine className="w-4 h-4 mr-2" />
                  Withdraw
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Withdraw Funds</DialogTitle>
                  <DialogDescription>
                    Minimum withdrawal amount is $10. Funds will be transferred
                    within 3-5 business days.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      min="10"
                      max={balance}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Available: <PriceFormatter amount={balance} />
                    </p>
                  </div>

                  <div>
                    <Label>Withdrawal Method</Label>
                    <RadioGroup
                      value={withdrawMethod}
                      onValueChange={setWithdrawMethod}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="bank" id="bank" />
                        <Label htmlFor="bank" className="cursor-pointer">
                          Bank Transfer
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="paypal" id="paypal" />
                        <Label htmlFor="paypal" className="cursor-pointer">
                          PayPal
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {withdrawMethod === "bank" && (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="accountHolder">
                          Account Holder Name
                        </Label>
                        <Input
                          id="accountHolder"
                          value={bankDetails.accountHolderName}
                          onChange={(e) =>
                            setBankDetails({
                              ...bankDetails,
                              accountHolderName: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="bankName">Bank Name</Label>
                        <Input
                          id="bankName"
                          value={bankDetails.bankName}
                          onChange={(e) =>
                            setBankDetails({
                              ...bankDetails,
                              bankName: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="accountNumber">Account Number</Label>
                        <Input
                          id="accountNumber"
                          value={bankDetails.accountNumber}
                          onChange={(e) =>
                            setBankDetails({
                              ...bankDetails,
                              accountNumber: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="routingNumber">Routing Number</Label>
                        <Input
                          id="routingNumber"
                          value={bankDetails.routingNumber}
                          onChange={(e) =>
                            setBankDetails({
                              ...bankDetails,
                              routingNumber: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}

                  {withdrawMethod === "paypal" && (
                    <div>
                      <Label htmlFor="paypalEmail">PayPal Email</Label>
                      <Input
                        id="paypalEmail"
                        type="email"
                        value={paypalEmail}
                        onChange={(e) => setPaypalEmail(e.target.value)}
                      />
                    </div>
                  )}

                  <Button onClick={handleWithdrawal} className="w-full">
                    Request Withdrawal
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Requests */}
      {withdrawalRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Requests</CardTitle>
            <CardDescription>Track your withdrawal requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {withdrawalRequests.map((request) => (
                <div
                  key={request._id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <PriceFormatter
                        amount={request.amount}
                        className="font-semibold"
                      />
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {request.method.toUpperCase()} •{" "}
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                    {request.rejectionReason && (
                      <p className="text-sm text-red-600 mt-1">
                        Reason: {request.rejectionReason}
                      </p>
                    )}
                  </div>
                  {request.status === "pending" && (
                    <Button
                      onClick={() => handleCancelWithdrawal(request._id)}
                      variant="ghost"
                      size="icon"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>All wallet transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction._id}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                >
                  <div className="mt-1">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-semibold ${
                            transaction.type.includes("credit")
                              ? "text-success-base"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.type.includes("credit") ? "+" : "-"}
                          <PriceFormatter amount={transaction.amount} />
                        </p>
                        <Badge
                          className={`${getStatusColor(
                            transaction.status
                          )} mt-1`}
                          variant="secondary"
                        >
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Balance:{" "}
                      <PriceFormatter amount={transaction.balanceBefore} /> →{" "}
                      <PriceFormatter amount={transaction.balanceAfter} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
