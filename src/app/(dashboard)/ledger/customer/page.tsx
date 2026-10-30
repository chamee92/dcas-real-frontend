"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Search, Loader2, DollarSign, ArrowDownLeft, ArrowUpRight, User } from "lucide-react";
import { api } from "@/lib/api-client";
import { Input } from "@/components/ui/input";

export default function CustomerLedgerPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [transactions, setTransactions] = useState<any[]>([]);
    const [balance, setBalance] = useState<number>(0);
    const [loadingCustomers, setLoadingCustomers] = useState(true);
    const [loadingLedger, setLoadingLedger] = useState(false);

    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // 1. Fetch Customers list
    useEffect(() => {
        const loadCustomersList = async () => {
            setLoadingCustomers(true);
            try {
                const res = await api.customers.list({ per_page: 200 });
                if (res && (res.success || Array.isArray(res))) {
                    let items: any[] = [];
                    const rawData = res.data || res;
                    const candidates = [
                        rawData,
                        rawData.customer_list,
                        rawData.items,
                        rawData.data,
                        rawData.customers
                    ];

                    for (const cand of candidates) {
                        if (cand && Array.isArray(cand)) {
                            items = cand;
                            break;
                        }
                    }

                    const normalized = items.map((c: any) => ({
                        id: c.id ?? c.customer_id ?? 0,
                        name: c.customer_full_name || c.full_name || c.name || `Customer #${c.id ?? c.customer_id ?? 0}`
                    }));

                    setCustomers(normalized);
                    if (normalized.length > 0) {
                        setSelectedCustomerId(String(normalized[0].id));
                    }
                }
            } catch (e) {
                console.error("Failed to load customers for select dropdown:", e);
            } finally {
                setLoadingCustomers(false);
            }
        };

        loadCustomersList();
    }, []);

    // 2. Fetch Customer Ledger on selected customer change or filters change
    useEffect(() => {
        if (selectedCustomerId) {
            fetchCustomerLedger();
        } else {
            setTransactions([]);
            setBalance(0);
            setTotalPages(1);
        }
    }, [selectedCustomerId, searchQuery, dateFrom, dateTo, page]);

    const fetchCustomerLedger = async () => {
        setLoadingLedger(true);
        try {
            const res = await api.transactions.getCustomerLedger({
                customer_id: Number(selectedCustomerId),
                search: searchQuery || null,
                date_from: dateFrom || null,
                date_to: dateTo || null,
                page: page,
                per_page: 20
            });

            if (res.success && res.data) {
                setTransactions(res.data.items || []);
                setBalance(res.data.summary?.current_balance ?? 0);

                const meta = res.data.meta || res.meta;
                if (meta && meta.last_page) {
                    setTotalPages(meta.last_page);
                } else if (meta && meta.total && meta.per_page) {
                    setTotalPages(Math.ceil(meta.total / meta.per_page));
                } else {
                    setTotalPages(1);
                }
            }
        } catch (e) {
            console.error("Error fetching customer ledger:", e);
            setTransactions([]);
            setBalance(0);
            setTotalPages(1);
        } finally {
            setLoadingLedger(false);
        }
    };

    const resetFilters = () => {
        setSearchQuery("");
        setDateFrom("");
        setDateTo("");
        setPage(1);
    };

    const hasActiveFilters = Boolean(searchQuery.trim() || dateFrom || dateTo);

    const formatCurrency = (amount: number) => {
        return `Rs. ${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatTransactionDateTime = (item: any) => {
        const dateRaw = item.transaction_date || item.created_at || item.created_date;
        let formattedDate = "-";
        if (dateRaw) {
            const d = new Date(dateRaw);
            formattedDate = !isNaN(d.getTime())
                ? d.toLocaleDateString(undefined, { dateStyle: "short" })
                : String(dateRaw);
        }

        let formattedTime = "";
        const timeRaw = item.created_at || item.created_date || item.transaction_date;
        if (timeRaw && typeof timeRaw === "string") {
            const hasTime = timeRaw.includes("T") || (timeRaw.includes(" ") && timeRaw.includes(":"));
            const isMidnightOnly = timeRaw.endsWith("00:00:00") || timeRaw.endsWith("00:00:00.000Z") || timeRaw.endsWith("T00:00:00");
            if (hasTime && !isMidnightOnly) {
                const td = new Date(timeRaw);
                if (!isNaN(td.getTime())) {
                    formattedTime = td.toLocaleTimeString(undefined, { timeStyle: "short" });
                }
            }
        }

        return { formattedDate, formattedTime };
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Customer Ledger</h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Track individual customer balance and transaction history.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasActiveFilters}
                    onClick={resetFilters}
                    className={`h-9 px-4 text-xs font-semibold border-slate-200 rounded-xl transition-all ${
                        hasActiveFilters
                            ? "text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
                            : "text-slate-300 bg-slate-50/50 cursor-not-allowed opacity-50 pointer-events-none"
                    }`}
                >
                    Reset Filters
                </Button>
            </div>

            {/* Select Customer */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-2 max-w-md">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Select Customer</label>
                {loadingCustomers ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                        Loading customers...
                    </div>
                ) : (
                    <select
                        value={selectedCustomerId}
                        onChange={(e) => {
                            setSelectedCustomerId(e.target.value);
                            setPage(1);
                        }}
                        className="h-10 px-3 w-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                        <option value="">Choose a customer...</option>
                        {customers.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                )}
            </div>

            {selectedCustomerId ? (
                <>
                    {/* Customer Balance Card */}
                    <Card className="max-w-xs border-slate-200/80 shadow-sm bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Balance</span>
                                <span className={`text-2xl font-black mt-1 ${balance < 0 ? "text-rose-600" : "text-slate-950"}`}>
                                    Rs. {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shadow-sm">
                                <DollarSign className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Filter Panel */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {/* Search */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Search</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <Input
                                        placeholder="Search ledger..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setPage(1);
                                        }}
                                        className="pl-9 h-9 border-slate-200 text-xs rounded-lg font-medium text-slate-800 bg-white"
                                    />
                                </div>
                            </div>

                            {/* From Date */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">From</label>
                                <Input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => {
                                        setDateFrom(e.target.value);
                                        setPage(1);
                                    }}
                                    className="h-9 border-slate-200 text-xs rounded-lg font-semibold text-slate-700 bg-white"
                                />
                            </div>

                            {/* To Date */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">To</label>
                                <Input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => {
                                        setDateTo(e.target.value);
                                        setPage(1);
                                    }}
                                    className="h-9 border-slate-200 text-xs rounded-lg font-semibold text-slate-700 bg-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Desktop Table View */}
                    {loadingLedger ? (
                        <div className="py-24 bg-white rounded-2xl border flex flex-col justify-center items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                            <span className="text-xs font-semibold text-slate-500 animate-pulse">Syncing customer ledger logs...</span>
                        </div>
                    ) : transactions.length > 0 ? (
                        <>
                            <div className="hidden md:block rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
                                <Table>
                                    <TableHeader className="bg-slate-50/75 border-b border-slate-100">
                                        <TableRow>
                                            <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-5">DATE</TableHead>
                                            <TableHead className="font-bold text-slate-700 text-xs">DETAILS</TableHead>
                                            <TableHead className="font-bold text-slate-700 text-xs">ASSOCIATED AGENT</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700 text-xs">AMOUNT</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700 text-xs pr-6">BALANCE</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.map((item) => {
                                            const isIncome = Number(item.transaction_type) === 1;
                                            const { formattedDate, formattedTime } = formatTransactionDateTime(item);

                                            return (
                                                <TableRow key={item.id} className="hover:bg-slate-50/50 border-b border-slate-100">
                                                    {/* DATE */}
                                                    <TableCell className="text-xs font-medium text-slate-600 py-3.5 pl-5">
                                                        <div className="font-bold text-slate-800">{formattedDate}</div>
                                                        {formattedTime ? (
                                                            <div className="text-[10px] text-slate-400 font-medium">{formattedTime}</div>
                                                        ) : null}
                                                    </TableCell>

                                                    {/* DETAILS */}
                                                    <TableCell className="text-xs">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${isIncome
                                                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                                    : "bg-rose-50 text-rose-600 border-rose-100"
                                                                }`}>
                                                                {isIncome ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-900">{item.transaction_title || item.title || "Transaction"}</div>
                                                                <div className="text-[10px] text-slate-500 font-medium max-w-xs truncate">{item.description}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    {/* ASSOCIATED AGENT */}
                                                    <TableCell className="text-xs">
                                                        <div className="flex items-center gap-1.5 text-slate-700">
                                                            <div className="h-5 w-5 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center border border-slate-200">
                                                                <User className="h-3 w-3" />
                                                            </div>
                                                            <span className="font-bold">
                                                                {item.user_full_name || "N/A"}
                                                            </span>
                                                        </div>
                                                    </TableCell>

                                                    {/* AMOUNT */}
                                                    <TableCell className={`text-right font-extrabold text-xs ${isIncome ? "text-emerald-600" : "text-rose-600"
                                                        }`}>
                                                        {isIncome ? "+ " : "- "} {formatCurrency(item.amount)}
                                                    </TableCell>

                                                    {/* BALANCE */}
                                                    <TableCell className="text-right font-bold text-slate-800 text-xs pr-6">
                                                        Rs. {Number(item.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile View: Cards */}
                            <div className="grid gap-4 md:hidden">
                                {transactions.map((item) => {
                                    const isIncome = Number(item.transaction_type) === 1;
                                    const { formattedDate, formattedTime } = formatTransactionDateTime(item);
                                    return (
                                        <Card key={item.id} className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white">
                                            <div className="p-4 flex flex-col gap-3">
                                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                    <span className="text-xs font-bold text-slate-900">{item.transaction_title || item.title || "Transaction"}</span>
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${isIncome
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                            : "bg-rose-50 text-rose-700 border-rose-100"
                                                        }`}>
                                                        {isIncome ? "Income" : "Expense"}
                                                    </span>
                                                </div>
                                                <div className="grid gap-2 text-xs">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400">Date:</span>
                                                        <span className="font-semibold text-slate-700">
                                                            {formattedDate} {formattedTime ? `(${formattedTime})` : ""}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400">Description:</span>
                                                        <span className="font-semibold text-slate-600 text-right max-w-[180px] truncate">{item.description}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400">Agent:</span>
                                                        <span className="font-semibold text-slate-700">
                                                            {item.user_full_name || "N/A"}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between border-t border-slate-100 pt-2">
                                                        <span className="text-slate-600 font-bold">Amount:</span>
                                                        <span className={`font-black ${isIncome ? "text-emerald-600" : "text-rose-600"}`}>
                                                            {isIncome ? "+ " : "- "} {formatCurrency(item.amount)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-600 font-bold">Running Balance:</span>
                                                        <span className="font-black text-slate-900">
                                                            Rs. {Number(item.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 pt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page === 1}
                                        onClick={() => setPage((p) => p - 1)}
                                        className="text-xs border-slate-200 rounded-lg bg-white"
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-xs font-semibold text-slate-600">Page {page} of {totalPages}</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page === totalPages}
                                        onClick={() => setPage((p) => p + 1)}
                                        className="text-xs border-slate-200 rounded-lg bg-white"
                                    >
                                        Next
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-2xl border border-dashed flex flex-col items-center justify-center gap-3">
                            <span className="text-xs font-semibold text-slate-400">No transactions recorded for this customer.</span>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed flex flex-col items-center justify-center gap-3">
                    <span className="text-xs font-semibold text-slate-400">Please choose a customer from the dropdown to view their ledger.</span>
                </div>
            )}
        </div>
    );
}
