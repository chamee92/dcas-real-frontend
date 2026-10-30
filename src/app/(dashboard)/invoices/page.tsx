"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { InvoiceBuilderDialog } from "@/components/invoices/invoice-builder-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  MoreVertical,
  Search,
  Loader2,
  Trash2,
  CreditCard,
  Eye,
  Ban,
  Info,
  FileText,
  Calendar,
  DollarSign,
  Edit3,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, getStoredUser } from "@/lib/api-client";
import { InvoicePreviewDialog } from "@/components/invoices/invoice-preview-dialog";
import { InvoiceEditDialog } from "@/components/invoices/invoice-edit-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUser } from "@/context/user-context";

export default function InvoicesPage() {
  const { hasPermission } = useUser();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Filter parameters
  const [currencyCodeFilter, setCurrencyCodeFilter] = useState("");
  const [fromDateFilter, setFromDateFilter] = useState("");
  const [toDateFilter, setToDateFilter] = useState("");

  // Dropdown lists
  const [currencies, setCurrencies] = useState<any[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Pay Modal States
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [payMethod, setPayMethod] = useState("1"); // 1 = Cash
  const [payDesc, setPayDesc] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Preview Modal States
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // Edit State
  const [editInvoiceData, setEditInvoiceData] = useState<any>(null);

  // Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Cancel/Void Confirmation State
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Issue Invoice Confirmation State
  const [issueConfirmOpen, setIssueConfirmOpen] = useState(false);
  const [issueTargetId, setIssueTargetId] = useState<number | null>(null);
  const [issueLoading, setIssueLoading] = useState(false);

  useEffect(() => {
    const fetchFilterMetadata = async () => {
      try {
        const res = await api.invoices.getBasicData();
        if (res.success && res.data) {
          setCurrencies(res.data.currency_codes || []);
        }
      } catch (err) {
        console.error("Failed to load currencies in invoices page:", err);
      }
    };
    fetchFilterMetadata();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [
    searchQuery,
    statusFilter,
    currencyCodeFilter,
    fromDateFilter,
    toDateFilter,
    page,
  ]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.invoices.list({
        search: searchQuery,
        status: statusFilter,
        currency_code: currencyCodeFilter,
        from_date: fromDateFilter,
        to_date: toDateFilter,
        page: page,
        per_page: 10,
      });

      if (res.success && res.data) {
        const items = res.data.items || res.data || [];
        const normalized = items.map((item: any) => ({
          ...item,
          id: item.id ?? item.invoice_id ?? 0,
          invoice_id: item.invoice_id ?? item.id ?? 0,
        }));
        setInvoices(normalized);
        setTotalPages(res.data.pagination?.last_page || 1);
      }
    } catch (err) {
      console.error("Failed to load invoices", err);
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
      const res = await api.invoices.delete(deleteTargetId);
      if (res.success) {
        setDeleteConfirmOpen(false);
        setDeleteTargetId(null);
        fetchInvoices();
      }
    } catch (err) {
      console.error("Delete failed", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancel = (id: number) => {
    setCancelTargetId(id);
    setCancelConfirmOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!cancelTargetId) return;
    setCancelLoading(true);
    try {
      const res = await api.invoices.changeStatus(cancelTargetId, 5); // 5 = Cancelled
      if (res.success) {
        setCancelConfirmOpen(false);
        setCancelTargetId(null);
        fetchInvoices();
      }
    } catch (err) {
      console.error("Void failed", err);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleIssueInvoice = (id: number) => {
    setIssueTargetId(id);
    setIssueConfirmOpen(true);
  };

  const handleIssueConfirm = async () => {
    if (!issueTargetId) return;
    setIssueLoading(true);
    try {
      const res = await api.invoices.changeStatus(issueTargetId, 2); // 2 = Issued
      if (res.success) {
        setIssueConfirmOpen(false);
        setIssueTargetId(null);
        fetchInvoices();
      } else {
        setIssueConfirmOpen(false);
      }
    } catch (err: any) {
      console.error("Issue failed", err);
      setIssueConfirmOpen(false);
    } finally {
      setIssueLoading(false);
    }
  };

  const openPayModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPayAmount(String(invoice.due_amount || invoice.grand_total || ""));
    setPayDesc(`Payment for invoice ${invoice.invoice_no}`);
    setPayError(null);
    setPayModalOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError(null);

    if (!payAmount || Number(payAmount) <= 0) {
      setPayError("Please specify a valid payment amount above zero.");
      return;
    }

    setPayLoading(true);
    try {
      const user = getStoredUser();
      const payload = {
        user_id: user?.user_id || user?.id || 1,
        invoice_id: Number(selectedInvoice.id),
        payment_amount: Number(payAmount),
        payment_date: payDate,
        payment_method_id: Number(payMethod),
        description: payDesc.trim(),
      };

      const res = await api.invoices.pay(payload);
      if (res.success) {
        setPayModalOpen(false);
        fetchInvoices();
      } else {
        setPayError(res.message || "Failed to log payment on server.");
      }
    } catch (err: any) {
      setPayError(err.message || "Something went wrong.");
    } finally {
      setPayLoading(false);
    }
  };

  const openPreview = (invoice: any) => {
    // Build mock preview structured line items
    // The API returns individual invoice items if we query `getData(id)` but to avoid loading delays,
    // we can fetch the full detailed data first
    const loadPreview = async () => {
      try {
        const res = await api.invoices.getData(invoice.id);
        if (res.success && res.data) {
          const data = res.data;
          // Map items from server response items
          const items = (data.items || []).map((i: any) => ({
            id: String(i.id),
            description: i.item_name || i.description || "Service",
            qty: Number(i.quantity || 1),
            price: Number(i.unit_price || 0),
            discount: Number(i.discount_value || 0),
          }));

          setPreviewData({
            invoiceNo: data.invoice_no,
            date: new Date(data.invoice_date).toISOString().split("T")[0],
            billTo: data.full_name || "Client Directory",
            lineItems: items,
            subtotal: Number(data.sub_total || 0),
            globalDiscount: Number(data.invoice_discount_value || 0),
            grandTotal: Number(data.grand_total || 0),
            currencyCode: data.currency_code || "LKR",
            passport: data.passport_number || "None",
          });
          setPreviewOpen(true);
        }
      } catch (err) {
        console.error("Failed to load invoice items:", err);
      }
    };
    loadPreview();
  };

  const openEditDialog = async (invoice: any) => {
    try {
      const res = await api.invoices.getData(invoice.id);
      if (res.success && res.data) {
        setEditInvoiceData(res.data);
      }
    } catch (err) {
      console.error("Failed to load invoice edit data:", err);
    }
  };

  const formatCurrencyValue = (amount: any, currency: string) => {
    const val = Number(amount || 0);
    return `${currency} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusStyles = (status: number) => {
    switch (status) {
      case 1: // Pending
        return "bg-amber-50 text-amber-700 border-amber-100";
      case 2: // Issued / Unpaid
        return "bg-blue-50 text-blue-700 border-blue-100";
      case 3: // Partially Paid
        return "bg-cyan-50 text-cyan-700 border-cyan-100";
      case 4: // Paid
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case 5: // Cancelled
        return "bg-rose-50 text-rose-700 border-rose-100";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Invoices Directory
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Create, inspect and settle outstanding invoices. entries reflect
            live modifications in accounts ledger balances.
          </p>
        </div>
        {hasPermission("customer_invoice_add") && (
          <InvoiceBuilderDialog onSave={fetchInvoices} />
        )}
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {/* Search */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search invoice no, client..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 border-slate-200 text-xs rounded-lg font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Statuses</option>
              <option value="1">Pending (Draft)</option>
              <option value="2">Issued (Unpaid)</option>
              <option value="3">Partially Paid</option>
              <option value="4">Paid (Cleared)</option>
              <option value="5">Cancelled (Void)</option>
            </select>
          </div>

          {/* Currency */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              Currency
            </label>
            <select
              value={currencyCodeFilter}
              onChange={(e) => {
                setCurrencyCodeFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Currencies</option>
              {currencies.map((c: any) => (
                <option key={c.id ?? c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              From Date
            </label>
            <Input
              type="date"
              value={fromDateFilter}
              onChange={(e) => {
                setFromDateFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 border-slate-200 text-xs rounded-lg font-semibold text-slate-700"
            />
          </div>

          {/* To Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              To Date
            </label>
            <Input
              type="date"
              value={toDateFilter}
              onChange={(e) => {
                setToDateFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 border-slate-200 text-xs rounded-lg font-semibold text-slate-700"
            />
          </div>
        </div>
      </div>

      {/* Loader / Content */}
      {loading ? (
        <div className="py-24 bg-white rounded-2xl border flex flex-col justify-center items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-950" />
          <span className="text-xs font-semibold text-slate-500 animate-pulse">
            Syncing invoice directory...
          </span>
        </div>
      ) : invoices.length > 0 ? (
        <>
          {/* Desktop View: Table */}
          <div className="hidden md:block rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50/75 border-b border-slate-100">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-5">
                    Invoice No
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">
                    Date
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">
                    Bill To
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-center">
                    Status
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right">
                    Total Amount
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right">
                    Remaining Due
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="hover:bg-slate-50/30 border-b border-slate-100"
                  >
                    <TableCell className="font-extrabold text-xs text-slate-900 py-3.5 pl-5">
                      {invoice.invoice_no}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-600">
                      {new Date(
                        invoice.invoice_date || invoice.created_at,
                      ).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-800">
                      <div>{invoice.full_name}</div>
                      <div className="text-[10px] font-medium text-slate-400">
                        Passport: {invoice.passport_number || "None"}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getStatusStyles(
                          Number(invoice.invoice_status),
                        )}`}
                      >
                        {invoice.invoice_status_label || "Issued"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-xs text-slate-800">
                      {formatCurrencyValue(
                        invoice.grand_total,
                        invoice.currency_code,
                      )}
                    </TableCell>
                    <TableCell className="text-right font-black text-xs text-rose-600">
                      {Number(invoice.due_amount) > 0 ? (
                        formatCurrencyValue(
                          invoice.due_amount,
                          invoice.currency_code,
                        )
                      ) : (
                        <span className="text-emerald-600 font-bold">
                          Cleared
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg"
                          >
                            <MoreVertical className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-44 rounded-xl border-slate-200/80 shadow-lg"
                        >
                          {hasPermission("customer_invoice_view") && (
                            <DropdownMenuItem
                              onClick={() => openPreview(invoice)}
                              className="text-xs font-semibold text-slate-700 flex gap-2 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-400" /> View
                              & Print
                            </DropdownMenuItem>
                          )}
                          {hasPermission("customer_invoice_manage") && Number(invoice.invoice_status) === 1 && (
                            <>
                              <DropdownMenuItem
                                onClick={() => openEditDialog(invoice)}
                                className="text-xs font-semibold text-blue-700 flex gap-2 cursor-pointer focus:text-blue-700 focus:bg-blue-50"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-blue-600" />{" "}
                                Edit Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleIssueInvoice(invoice.id)}
                                className="text-xs font-semibold text-blue-700 flex gap-2 cursor-pointer focus:text-blue-700 focus:bg-blue-50"
                              >
                                <FileText className="h-3.5 w-3.5 text-blue-600" />{" "}
                                Issue Invoice
                              </DropdownMenuItem>
                            </>
                          )}
                          {hasPermission("customer_invoice_manage") && (Number(invoice.invoice_status) === 2 ||
                            Number(invoice.invoice_status) === 3) && (
                              <DropdownMenuItem
                                onClick={() => openPayModal(invoice)}
                                className="text-xs font-semibold text-emerald-700 flex gap-2 cursor-pointer focus:text-emerald-700 focus:bg-emerald-50"
                              >
                                <CreditCard className="h-3.5 w-3.5 text-emerald-600" />{" "}
                                Settle/Pay Amount
                              </DropdownMenuItem>
                            )}
                          {hasPermission("customer_invoice_manage") && Number(invoice.invoice_status) !== 5 &&
                            Number(invoice.invoice_status) !== 4 && (
                              <DropdownMenuItem
                                onClick={() => handleCancel(invoice.id)}
                                className="text-xs font-semibold text-amber-700 flex gap-2 cursor-pointer focus:text-amber-700 focus:bg-amber-50"
                              >
                                <Ban className="h-3.5 w-3.5 text-amber-600" />{" "}
                                Cancel/Void
                              </DropdownMenuItem>
                            )}
                          {hasPermission("customer_invoice_delete") && Number(invoice.invoice_status) === 1 && (
                            <>
                              <DropdownMenuSeparator className="border-slate-100" />
                              <DropdownMenuItem
                                onClick={() => handleDelete(invoice.id)}
                                className="text-xs font-semibold text-rose-600 flex gap-2 cursor-pointer focus:text-rose-600 focus:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-rose-500" />{" "}
                                Delete Invoice
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View: Cards */}
          <div className="grid gap-4 md:hidden">
            {invoices.map((invoice) => (
              <Card
                key={invoice.id}
                className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-slate-100/60 bg-slate-50/20">
                  <CardTitle className="text-xs font-black text-slate-900">
                    {invoice.invoice_no}
                  </CardTitle>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getStatusStyles(
                      Number(invoice.invoice_status),
                    )}`}
                  >
                    {invoice.invoice_status_label || "Issued"}
                  </span>
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="grid gap-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">
                        Billed To:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {invoice.full_name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Date:</span>
                      <span className="font-semibold text-slate-700">
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-2">
                      <span className="text-slate-600 font-bold">
                        Total Amount:
                      </span>
                      <span className="font-extrabold text-slate-800">
                        {formatCurrencyValue(
                          invoice.grand_total,
                          invoice.currency_code,
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-rose-600 font-bold">
                        Remaining Due:
                      </span>
                      <span className="font-black text-rose-600">
                        {Number(invoice.due_amount) > 0 ? (
                          formatCurrencyValue(
                            invoice.due_amount,
                            invoice.currency_code,
                          )
                        ) : (
                          <span className="text-emerald-600">Cleared</span>
                        )}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-3 border-t border-slate-100 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPreview(invoice)}
                        className="flex-1 text-slate-700 border-slate-200 text-xs rounded-xl h-8 font-bold flex gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                      {Number(invoice.invoice_status) === 1 && (
                        <Button
                          onClick={() => handleIssueInvoice(invoice.id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl h-8 font-bold flex gap-1 cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5" /> Issue
                        </Button>
                      )}
                      {(Number(invoice.invoice_status) === 2 ||
                        Number(invoice.invoice_status) === 3) && (
                          <Button
                            onClick={() => openPayModal(invoice)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl h-8 font-bold flex gap-1 cursor-pointer"
                          >
                            <CreditCard className="h-3.5 w-3.5" /> Pay
                          </Button>
                        )}
                      {hasPermission("customer_invoice_delete") && Number(invoice.invoice_status) === 1 && (
                        <Button
                          variant="ghost"
                          onClick={() => handleDelete(invoice.id)}
                          className="text-rose-600 hover:bg-rose-50 rounded-xl h-8 px-2 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
              <span className="text-xs font-semibold text-slate-600">
                Page {page} of {totalPages}
              </span>
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
          <span className="text-xs font-semibold text-slate-400">
            No invoices logged.
          </span>
          <InvoiceBuilderDialog onSave={fetchInvoices} />
        </div>
      )}

      {/* Settle / Pay Invoice Dialog */}
      {payModalOpen && selectedInvoice && (
        <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-3xl border border-slate-200/80 shadow-2xl">
            <form onSubmit={handlePaymentSubmit}>
              <DialogHeader className="pb-3 border-b border-slate-100">
                <DialogTitle className="text-lg text-slate-900 font-extrabold tracking-tight">
                  Record Invoice Payment
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  Apply manual payment entries for invoice{" "}
                  <span className="font-bold text-slate-800">
                    #{selectedInvoice.invoice_no}
                  </span>
                  .
                </DialogDescription>
              </DialogHeader>

              {payError && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-600">
                  {payError}
                </div>
              )}

              <div className="grid gap-4 py-4">
                <div className="grid gap-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold">
                      Total Bill:
                    </span>
                    <span className="font-bold text-slate-700">
                      {formatCurrencyValue(
                        selectedInvoice.grand_total,
                        selectedInvoice.currency_code,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-slate-200/50 pt-2 mt-2">
                    <span className="text-rose-600 font-bold">
                      Remaining Balance due:
                    </span>
                    <span className="font-black text-rose-600">
                      {formatCurrencyValue(
                        selectedInvoice.due_amount ||
                        selectedInvoice.grand_total,
                        selectedInvoice.currency_code,
                      )}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label
                      htmlFor="payAmount"
                      className="text-xs font-bold text-slate-700"
                    >
                      Payment Amount ({selectedInvoice.currency_code}) *
                    </Label>
                    <Input
                      id="payAmount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={payAmount}
                      onKeyDown={(e) => {
                        if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, "");
                        setPayAmount(val);
                      }}
                      className="h-10 text-xs border-slate-200 rounded-xl font-bold"
                      required
                      disabled={payLoading}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label
                      htmlFor="payDate"
                      className="text-xs font-bold text-slate-700"
                    >
                      Payment Date *
                    </Label>
                    <Input
                      id="payDate"
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="h-10 text-xs border-slate-200 rounded-xl"
                      required
                      disabled={payLoading}
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label
                    htmlFor="payMethod"
                    className="text-xs font-bold text-slate-700"
                  >
                    Payment Method
                  </Label>
                  <Select
                    value={payMethod}
                    onValueChange={setPayMethod}
                    disabled={payLoading}
                  >
                    <SelectTrigger className="h-10 text-xs border-slate-200 rounded-xl">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1" className="text-xs font-medium">
                        Cash
                      </SelectItem>
                      <SelectItem value="2" className="text-xs font-medium">
                        Bank Transfer
                      </SelectItem>
                      <SelectItem value="3" className="text-xs font-medium">
                        Card Payment
                      </SelectItem>
                      <SelectItem value="4" className="text-xs font-medium">
                        Online Payment
                      </SelectItem>
                      <SelectItem value="5" className="text-xs font-medium">
                        Cheque
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label
                    htmlFor="payDesc"
                    className="text-xs font-bold text-slate-700"
                  >
                    Payment Remarks / Reference
                  </Label>
                  <Input
                    id="payDesc"
                    value={payDesc}
                    onChange={(e) => setPayDesc(e.target.value)}
                    placeholder="Add payment context..."
                    className="h-10 text-xs border-slate-200 rounded-xl"
                    disabled={payLoading}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPayModalOpen(false)}
                  className="font-bold text-xs hover:bg-slate-50 cursor-pointer rounded-xl"
                  disabled={payLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 cursor-pointer rounded-xl flex items-center gap-1.5"
                  disabled={payLoading}
                >
                  {payLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Submit Payment"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Preview Dialog */}
      {previewOpen && previewData && (
        <InvoicePreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          data={previewData}
        />
      )}

      {/* Edit Invoice Dialog */}
      {editInvoiceData && (
        <InvoiceEditDialog
          open={!!editInvoiceData}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditInvoiceData(null);
          }}
          onSave={fetchInvoices}
          invoiceToEdit={editInvoiceData}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open) { setDeleteConfirmOpen(false); setDeleteTargetId(null); }
        }}
        title="Delete Invoice?"
        description="This invoice will be permanently deleted and cannot be recovered. Are you sure you want to continue?"
        confirmLabel="Delete Invoice"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
      />

      {/* Cancel / Void Confirmation Dialog */}
      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={(open) => {
          if (!open) { setCancelConfirmOpen(false); setCancelTargetId(null); }
        }}
        title="Cancel / Void Invoice?"
        description="This invoice will be marked as void/cancelled. This action cannot be undone. Are you sure?"
        confirmLabel="Cancel Invoice"
        cancelLabel="Cancel"
        variant="warning"
        loading={cancelLoading}
        onConfirm={handleCancelConfirm}
      />

      {/* Issue Invoice Confirmation Dialog */}
      <ConfirmDialog
        open={issueConfirmOpen}
        onOpenChange={(open) => {
          if (!open) { setIssueConfirmOpen(false); setIssueTargetId(null); }
        }}
        title="Issue Invoice?"
        description="Once issued, the client can make payments and the invoice cannot be modified. Are you sure you want to issue this invoice?"
        confirmLabel="Issue Invoice"
        cancelLabel="Not Yet"
        variant="default"
        loading={issueLoading}
        onConfirm={handleIssueConfirm}
      />
    </div>
  );
}
