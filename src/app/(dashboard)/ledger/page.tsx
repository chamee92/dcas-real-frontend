"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AddTransactionDialog } from "@/components/ledger/add-transaction-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Search, Loader2, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUser } from "@/context/user-context";

export default function LedgerPage() {
    const { hasPermission } = useUser();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter states matching backend JSON structure
    const [searchQuery, setSearchQuery] = useState("");
    const [customerId, setCustomerId] = useState("");
    const [transactionType, setTransactionType] = useState("");
    const [transactionCategoryId, setTransactionCategoryId] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Metadata lists for dropdown filters
    const [categories, setCategories] = useState<any[]>([]);
    const [transactionTypes, setTransactionTypes] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);

    // Delete Confirmation State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // 1. Fetch metadata on mount
    useEffect(() => {
        const loadFilterMetadata = async () => {
            console.log("Transactions Page: Loading filter dropdown metadata...");

            // Isolate Customer List Fetch
            try {
                // Fetch customers using Customer All API (max 500 perPage records)
                const customersRes = await api.customers.list({ per_page: 100 });
                console.log("Customer list API response:", customersRes);

                if (customersRes && (customersRes.success || Array.isArray(customersRes))) {
                    let items: any[] = [];
                    const rawData = customersRes.data || customersRes;

                    const candidates = [
                        rawData,
                        rawData.customer_list,
                        rawData.items,
                        rawData.data,
                        rawData.customers,
                        customersRes.items,
                        customersRes.customers
                    ];

                    for (const cand of candidates) {
                        if (cand && Array.isArray(cand)) {
                            items = cand;
                            break;
                        }
                    }

                    console.log("Normalized raw customer items:", items);
                    const normalized = items.map((c: any) => ({
                        id: c.id ?? c.customer_id ?? 0,
                        name: c.customer_full_name || c.full_name || c.name || c.user_full_name || `Customer #${c.id ?? c.customer_id ?? 0}`
                    }));

                    console.log("Final normalized customers for select:", normalized);
                    setCustomers(normalized);
                } else {
                    console.warn("Customer list API did not return success:", customersRes);
                }
            } catch (e) {
                console.error("Failed to load customers from customer list API:", e);
            }

            // Isolate Invoice Basic Data Fetch for Types and Categories
            try {
                const basicRes = await api.invoices.getBasicData();
                console.log("Invoice basic data API response:", basicRes);

                if (basicRes && (basicRes.success || basicRes.data)) {
                    const dataPayload = basicRes.data || basicRes;

                    // 1. Types: fallback to Income/Expense defaults if not in response
                    const rawTypes = dataPayload.transaction_types || dataPayload.types || dataPayload.transactionTypes;
                    const fallbackTypes = [
                        { id: 1, name: "Income" },
                        { id: 2, name: "Expense" }
                    ];

                    let typesList = fallbackTypes;
                    if (rawTypes && Array.isArray(rawTypes)) {
                        typesList = rawTypes.map((t: any) => ({
                            id: t.id,
                            name: t.name || t.label || `Type #${t.id}`
                        }));
                    }
                    console.log("Final transaction types for select:", typesList);
                    setTransactionTypes(typesList);

                    // 2. Categories: check transaction_categories, item_types, or categories
                    const rawCats =
                        dataPayload.transaction_categories ||
                        dataPayload.item_types ||
                        dataPayload.categories ||
                        dataPayload.itemTypes ||
                        [];

                    let categoriesList: any[] = [];
                    if (Array.isArray(rawCats)) {
                        categoriesList = rawCats.map((item: any) => ({
                            id: item.id,
                            name: item.label || item.name || item.transaction_category || `Category #${item.id}`,
                            transaction_type: item.transaction_type ?? null
                        }));
                    }
                    console.log("Final categories for select:", categoriesList);
                    setCategories(categoriesList);
                } else {
                    console.warn("Invoice basic data API did not return success/data:", basicRes);
                    // Safe fallback
                    setTransactionTypes([
                        { id: 1, name: "Income" },
                        { id: 2, name: "Expense" }
                    ]);
                }
            } catch (e) {
                console.error("Failed to load metadata from invoice basic data API:", e);
                // Safe offline fallback for Types
                setTransactionTypes([
                    { id: 1, name: "Income" },
                    { id: 2, name: "Expense" }
                ]);
            }
        };

        loadFilterMetadata();
    }, []);

    // 2. Fetch filtered transaction records
    useEffect(() => {
        fetchLedgerData();
    }, [searchQuery, customerId, transactionType, transactionCategoryId, dateFrom, dateTo, page]);

    const fetchLedgerData = async () => {
        setLoading(true);
        try {
            const txnRes = await api.transactions.list({
                search: searchQuery || null,
                customer_id: customerId ? Number(customerId) : null,
                transaction_type: transactionType ? Number(transactionType) : null,
                transaction_category_id: transactionCategoryId ? Number(transactionCategoryId) : null,
                date_from: dateFrom || null,
                date_to: dateTo || null,
                page: page,
                per_page: 10,
            });

            if (txnRes.success && (txnRes.data || Array.isArray(txnRes))) {
                const rawData = txnRes.data || txnRes;
                const items = rawData.items || (Array.isArray(rawData) ? rawData : []);
                setTransactions(items);

                const meta = rawData.meta || txnRes.meta || rawData;
                if (meta && meta.last_page) {
                    setTotalPages(meta.last_page);
                } else if (meta && meta.total && meta.per_page) {
                    setTotalPages(Math.ceil(meta.total / meta.per_page));
                } else {
                    // Fallback: assume at least one page
                    setTotalPages(1);
                }
            }
        } catch (e) {
            console.error("Error fetching transactions", e);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };


    const handleDelete = (id: number) => {
        setDeleteTargetId(id);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTargetId) return;
        setDeleteLoading(true);
        try {
            const res = await api.transactions.delete(deleteTargetId);
            if (res.success) {
                setDeleteConfirmOpen(false);
                setDeleteTargetId(null);
                fetchLedgerData();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setDeleteLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `LKR ${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Transactions</h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Log cash inflows and outflows, view historical transaction logs, and manage account settlements.
                    </p>
                </div>
                {hasPermission("transaction_add") && (
                    <AddTransactionDialog onSave={fetchLedgerData} />
                )}
            </div>

            {/* Filter and Search Panel */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">

                    {/* Search Query */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                placeholder="Search title, description..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-9 h-9 border-slate-200 text-xs rounded-lg font-medium text-slate-800"
                            />
                        </div>
                    </div>

                    {/* Customer */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Customer</label>
                        <select
                            value={customerId}
                            onChange={(e) => {
                                setCustomerId(e.target.value);
                                setPage(1);
                            }}
                            className="h-9 px-3 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                            <option value="">All Customers</option>
                            {customers.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Transaction Type */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Type</label>
                        <select
                            value={transactionType}
                            onChange={(e) => {
                                setTransactionType(e.target.value);
                                setTransactionCategoryId(""); // reset category on type change
                                setPage(1);
                            }}
                            className="h-9 px-3 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                            <option value="">All Types</option>
                            {transactionTypes.map((t: any) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Transaction Category */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Category</label>
                        <select
                            value={transactionCategoryId}
                            onChange={(e) => {
                                setTransactionCategoryId(e.target.value);
                                setPage(1);
                            }}
                            className="h-9 px-3 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                            <option value="">All Categories</option>
                            {categories
                                .filter((cat: any) => !transactionType || Number(cat.transaction_type) === Number(transactionType))
                                .map((cat: any) => (
                                    <option key={cat.id} value={cat.id}>{cat.transaction_category || cat.name || `Category #${cat.id}`}</option>
                                ))}
                        </select>
                    </div>

                    {/* Date From */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Date From</label>
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => {
                                setDateFrom(e.target.value);
                                setPage(1);
                            }}
                            className="h-9 border-slate-200 text-xs rounded-lg font-semibold text-slate-700"
                        />
                    </div>

                    {/* Date To */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Date To</label>
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => {
                                setDateTo(e.target.value);
                                setPage(1);
                            }}
                            className="h-9 border-slate-200 text-xs rounded-lg font-semibold text-slate-700"
                        />
                    </div>

                </div>

                {/* Reset Filters Option if any filter is active */}
                {Boolean(searchQuery || customerId || transactionType || transactionCategoryId || dateFrom || dateTo) && (
                    <div className="flex justify-end border-t border-slate-100 pt-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearchQuery("");
                                setCustomerId("");
                                setTransactionType("");
                                setTransactionCategoryId("");
                                setDateFrom("");
                                setDateTo("");
                                setPage(1);
                            }}
                            className="h-8 text-slate-500 hover:text-rose-600 font-semibold text-xs hover:bg-rose-50/50 rounded-lg px-3 transition-colors"
                        >
                            Reset Active Filters
                        </Button>
                    </div>
                )}
            </div>

            {/* Desktop View: Table */}
            {loading ? (
                <div className="py-24 bg-white rounded-2xl border flex flex-col justify-center items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    <span className="text-xs font-semibold text-slate-500 animate-pulse">Syncing transaction logs...</span>
                </div>
            ) : transactions.length > 0 ? (
                <>
                    <div className="hidden md:block rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-50/75 border-b border-slate-100">
                                <TableRow>
                                    <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-5">Date & Time</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs">Type</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs">Category</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs">Title</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs">Description</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs">Related Client / User</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700 text-xs">Amount</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700 text-xs pr-6">Delete</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((transaction) => {
                                    const isIncome = Number(transaction.transaction_type) === 1;
                                    const isInvoiceRelated = Boolean(
                                        transaction.invoice_id ||
                                        transaction.customer_invoice_id ||
                                        transaction.related_invoice_id ||
                                        transaction.invoice_no ||
                                        transaction.is_invoice_related ||
                                        (transaction.description && String(transaction.description).toLowerCase().includes("invoice")) ||
                                        (transaction.title && String(transaction.title).toLowerCase().includes("invoice"))
                                    );
                                    const { formattedDate, formattedTime } = formatTransactionDateTime(transaction);
                                    return (
                                        <TableRow key={transaction.id} className="hover:bg-slate-50/50 border-b border-slate-100">
                                            <TableCell className="text-xs font-medium text-slate-600 py-3.5 pl-5">
                                                <div className="font-bold text-slate-800">{formattedDate}</div>
                                                {formattedTime ? (
                                                    <div className="text-[10px] text-slate-400 font-medium">{formattedTime}</div>
                                                ) : null}
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${isIncome
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                        : "bg-rose-50 text-rose-700 border-rose-100"
                                                        }`}
                                                >
                                                    {isIncome ? "Income" : "Expense"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold text-slate-800">
                                                {transaction.transaction_category || transaction.category || "General"}
                                            </TableCell>
                                            <TableCell className="text-xs font-bold text-slate-900">
                                                {transaction.title}
                                            </TableCell>
                                            <TableCell className="text-xs font-medium text-slate-500 max-w-xs truncate">
                                                {transaction.description}
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold text-slate-600">
                                                {transaction.customer_full_name ? (
                                                    <div>
                                                        <div className="font-bold text-slate-800">{transaction.customer_full_name}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium">Passport: {transaction.customer_passport_number || "None"}</div>
                                                    </div>
                                                ) : transaction.user_full_name ? (
                                                    <div>
                                                        <div className="font-bold text-slate-700">Agent: {transaction.user_full_name}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium">Username: {transaction.user_name}</div>
                                                    </div>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                            <TableCell
                                                className={`text-right font-extrabold text-xs ${isIncome ? "text-emerald-600" : "text-rose-600"
                                                    }`}
                                            >
                                                {isIncome ? "+" : "-"} {formatCurrency(transaction.amount)}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                {hasPermission("transaction_delete") && (
                                                    isInvoiceRelated ? (
                                                        <span title="Invoice related transactions cannot be deleted" className="inline-block cursor-not-allowed">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                disabled
                                                                className="h-7 w-7 text-rose-300 opacity-40 blur-[0.5px] pointer-events-none rounded-lg p-0"
                                                            >
                                                                <Trash2 className="h-4 w-4 text-rose-300" />
                                                            </Button>
                                                        </span>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(transaction.id)}
                                                            className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg p-0"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile View: Cards */}
                    <div className="grid gap-4 md:hidden">
                        {transactions.map((transaction) => {
                            const isIncome = Number(transaction.transaction_type) === 1;
                            const isInvoiceRelated = Boolean(
                                transaction.invoice_id ||
                                transaction.customer_invoice_id ||
                                transaction.related_invoice_id ||
                                transaction.invoice_no ||
                                transaction.is_invoice_related ||
                                (transaction.description && String(transaction.description).toLowerCase().includes("invoice")) ||
                                (transaction.title && String(transaction.title).toLowerCase().includes("invoice"))
                            );
                            const { formattedDate, formattedTime } = formatTransactionDateTime(transaction);
                            return (
                                <Card key={transaction.id} className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-slate-100/60 bg-slate-50/20">
                                        <CardTitle className="text-sm font-bold text-slate-900">
                                            {transaction.transaction_category || transaction.category || "General"}
                                        </CardTitle>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${isIncome
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                : "bg-rose-50 text-rose-700 border-rose-100"
                                                }`}
                                        >
                                            {isIncome ? "Income" : "Expense"}
                                        </span>
                                    </CardHeader>
                                    <CardContent className="pt-3">
                                        <div className="grid gap-2 text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400 font-medium">Date:</span>
                                                <span className="font-semibold text-slate-700">
                                                    {formattedDate} {formattedTime ? `(${formattedTime})` : ""}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400 font-medium">Title:</span>
                                                <span className="font-semibold text-slate-800">{transaction.title}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400 font-medium">Description:</span>
                                                <span className="font-semibold text-slate-500 truncate max-w-[150px]">{transaction.description}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400 font-medium">Associated:</span>
                                                <span className="font-semibold text-slate-700">
                                                    {transaction.customer_full_name || transaction.user_full_name || "-"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-2">
                                                <span className="text-slate-600 font-bold">Amount:</span>
                                                <span
                                                    className={`font-black ${isIncome ? "text-emerald-600" : "text-rose-600"
                                                        }`}
                                                >
                                                    {isIncome ? "+" : "-"} {formatCurrency(transaction.amount)}
                                                </span>
                                            </div>
                                            {hasPermission("transaction_delete") && (
                                                <div className="flex justify-end pt-2">
                                                    {isInvoiceRelated ? (
                                                        <span title="Invoice related transactions cannot be deleted" className="w-full cursor-not-allowed">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                disabled
                                                                className="w-full text-rose-300 border-rose-100 opacity-40 blur-[0.5px] pointer-events-none text-xs rounded-lg"
                                                            >
                                                                Delete Transaction
                                                            </Button>
                                                        </span>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDelete(transaction.id)}
                                                            className="w-full text-rose-600 hover:bg-rose-50 border-rose-100 text-xs rounded-lg"
                                                        >
                                                            Delete Transaction
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
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
                                className="text-xs border-slate-200 rounded-lg"
                            >
                                Previous
                            </Button>
                            <span className="text-xs font-semibold text-slate-600">Page {page} of {totalPages}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                className="text-xs border-slate-200 rounded-lg"
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed flex flex-col items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400">No transaction logs recorded.</span>
                    <AddTransactionDialog onSave={fetchLedgerData} />
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={deleteConfirmOpen}
                onOpenChange={(open) => {
                    if (!open) { setDeleteConfirmOpen(false); setDeleteTargetId(null); }
                }}
                title="Delete Transaction Record?"
                description="This transaction record will be permanently deleted and cannot be recovered. Are you sure you want to continue?"
                confirmLabel="Delete Transaction"
                cancelLabel="Cancel"
                variant="danger"
                loading={deleteLoading}
                onConfirm={handleDeleteConfirm}
            />
        </div>
    );
}
