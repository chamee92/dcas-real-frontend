"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { QuotationBuilderDialog } from "@/components/quotations/quotation-builder-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Plus,
    MoreVertical,
    Search,
    Loader2,
    Trash2,
    CheckCircle,
    Eye,
    XCircle,
    Calendar,
    FileSpreadsheet,
    Edit3
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api, getStoredUser } from "@/lib/api-client"
import { QuotationPreviewDialog } from "@/components/quotations/quotation-preview-dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useUser } from "@/context/user-context"

export default function QuotationsPage() {
    const { hasPermission } = useUser()
    const [quotations, setQuotations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    // Filter parameters
    const [quotationStatusFilter, setQuotationStatusFilter] = useState("")
    const [currencyCodeFilter, setCurrencyCodeFilter] = useState("")
    const [fromDateFilter, setFromDateFilter] = useState("")
    const [toDateFilter, setToDateFilter] = useState("")

    // Dropdown lists
    const [currencies, setCurrencies] = useState<any[]>([])

    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    // Approve & Convert Modal States
    const [approveModalOpen, setApproveModalOpen] = useState(false)
    const [selectedQuote, setSelectedQuote] = useState<any>(null)
    const [invoiceDueDate, setInvoiceDueDate] = useState("")
    const [approveDesc, setApproveDesc] = useState("Quotation approved by customer")
    const [approveLoading, setApproveLoading] = useState(false)
    const [approveError, setApproveError] = useState<string | null>(null)

    // Reject Modal States
    const [rejectModalOpen, setRejectModalOpen] = useState(false)
    const [rejectReason, setRejectReason] = useState("")
    const [rejectLoading, setRejectLoading] = useState(false)
    const [rejectError, setRejectError] = useState<string | null>(null)

    // Preview Modal States
    const [previewOpen, setPreviewOpen] = useState(false)
    const [previewData, setPreviewData] = useState<any>(null)

    // Edit State
    const [editQuoteData, setEditQuoteData] = useState<any>(null)

    // Delete Confirmation State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    useEffect(() => {
        const fetchFilterMetadata = async () => {
            try {
                const res = await api.invoices.getBasicData()
                if (res.success && res.data) {
                    setCurrencies(res.data.currency_codes || [])
                }
            } catch (err) {
                console.error("Failed to load currencies in quotations page:", err)
            }
        }
        fetchFilterMetadata()
    }, [])

    useEffect(() => {
        fetchQuotations()
    }, [searchQuery, quotationStatusFilter, currencyCodeFilter, fromDateFilter, toDateFilter, page])

    const fetchQuotations = async () => {
        setLoading(true)
        try {
            const res = await api.quotations.list({
                search: searchQuery,
                quotation_status: quotationStatusFilter,
                currency_code: currencyCodeFilter,
                from_date: fromDateFilter,
                to_date: toDateFilter,
                page: page,
                per_page: 10
            })

            if (res.success && res.data) {
                const items = res.data.items || res.data || []
                const normalized = items.map((item: any) => ({
                    ...item,
                    id: item.id ?? item.quotation_id ?? 0,
                    quotation_id: item.quotation_id ?? item.id ?? 0
                }))
                setQuotations(normalized)
                setTotalPages(res.data.pagination?.last_page || 1)
            }
        } catch (err) {
            console.error("Failed to load quotations", err)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = (id: number) => {
        setDeleteTargetId(id)
        setDeleteConfirmOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!deleteTargetId) return
        setDeleteLoading(true)
        try {
            const res = await api.quotations.delete(deleteTargetId)
            if (res.success) {
                setDeleteConfirmOpen(false)
                setDeleteTargetId(null)
                fetchQuotations()
            }
        } catch (err) {
            console.error("Delete failed", err)
        } finally {
            setDeleteLoading(false)
        }
    }

    const openApproveModal = (quote: any) => {
        setSelectedQuote(quote)
        const tenDays = new Date()
        tenDays.setDate(tenDays.getDate() + 10)
        setInvoiceDueDate(tenDays.toISOString().split('T')[0])
        setApproveDesc(`Quotation ${quote.quotation_no} approved by customer`)
        setApproveError(null)
        setApproveModalOpen(true)
    }

    const handleApproveSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setApproveError(null)

        if (!invoiceDueDate) {
            setApproveError("Please choose a payment due date for the invoice.")
            return
        }

        setApproveLoading(true)
        try {
            const user = getStoredUser()
            const payload = {
                user_id: user?.user_id || user?.id || 1,
                quotation_id: Number(selectedQuote.id),
                quotation_status: 2, // 2 = Approved
                invoice_due_date: invoiceDueDate,
                description: approveDesc.trim()
            }

            const res = await api.quotations.changeStatus(selectedQuote.id, payload as any)
            if (res.success) {
                setApproveModalOpen(false)
                fetchQuotations()
            } else {
                setApproveError(res.message || "Failed to approve quotation.")
            }
        } catch (err: any) {
            setApproveError(err.message || "Something went wrong.")
        } finally {
            setApproveLoading(false)
        }
    }

    const openRejectModal = (quote: any) => {
        setSelectedQuote(quote)
        setRejectReason("")
        setRejectError(null)
        setRejectModalOpen(true)
    }

    const handleRejectSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setRejectError(null)

        if (!rejectReason.trim()) {
            setRejectError("Please specify a reason for rejecting this quote proposal.")
            return
        }

        setRejectLoading(true)
        try {
            const user = getStoredUser()
            const payload = {
                user_id: user?.user_id || user?.id || 1,
                quotation_id: Number(selectedQuote.id),
                quotation_status: 3, // 3 = Rejected
                reject_reason: rejectReason.trim()
            }

            const res = await api.quotations.changeStatus(selectedQuote.id, payload as any)
            if (res.success) {
                setRejectModalOpen(false)
                fetchQuotations()
            } else {
                setRejectError(res.message || "Failed to reject quotation.")
            }
        } catch (err: any) {
            setRejectError(err.message || "Something went wrong.")
        } finally {
            setRejectLoading(false)
        }
    }

    const openPreview = (quote: any) => {
        const loadPreview = async () => {
            try {
                const res = await api.quotations.getData(quote.id)
                if (res.success && res.data) {
                    const data = res.data
                    const items = (data.items || []).map((i: any) => ({
                        id: String(i.id),
                        description: i.item_name || i.description || "Tour Service",
                        qty: Number(i.quantity || 1),
                        price: Number(i.unit_price || 0),
                        discount: Number(i.discount_value || 0)
                    }))

                    setPreviewData({
                        quotationNo: data.quotation_no,
                        date: new Date(data.quotation_date).toISOString().split('T')[0],
                        validUntil: new Date(data.valid_until).toISOString().split('T')[0],
                        billTo: data.customer?.full_name || "Client Directory",
                        lineItems: items,
                        subtotal: Number(data.sub_total || 0),
                        globalDiscount: Number(data.quotation_discount_value || 0),
                        grandTotal: Number(data.grand_total || 0),
                        currencyCode: data.currency_code || "LKR",
                        passport: data.customer?.passport_number || "None"
                    })
                    setPreviewOpen(true)
                }
            } catch (err) {
                console.error("Failed to load quotation items:", err)
            }
        }
        loadPreview()
    }

    const openEditDialog = async (quote: any) => {
        try {
            const res = await api.quotations.getData(quote.id)
            if (res.success && res.data) {
                setEditQuoteData(res.data)
            }
        } catch (err) {
            console.error("Failed to load quotation edit data:", err)
        }
    }

    const formatCurrencyValue = (amount: any, currency: string) => {
        const val = Number(amount || 0)
        return `${currency} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    const getStatusStyles = (status: number) => {
        switch (status) {
            case 1: // Pending
                return "bg-amber-50 text-amber-700 border-amber-100"
            case 2: // Approved / Converted
                return "bg-emerald-50 text-emerald-700 border-emerald-100"
            case 3: // Rejected
                return "bg-rose-50 text-rose-700 border-rose-100"
            case 5: // Cancelled
                return "bg-slate-50 text-slate-700 border-slate-100"
            default:
                return "bg-slate-50 text-slate-700 border-slate-100"
        }
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Quotations Directory</h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Create tour proposals, track customer approvals, and compile approved estimates directly into payable invoices.
                    </p>
                </div>
                {hasPermission("customer_quotation_add") && (
                    <QuotationBuilderDialog onSave={fetchQuotations} />
                )}
            </div>

            {/* Filter and Search Panel */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">

                    {/* Search */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                placeholder="Search quote no, client..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value)
                                    setPage(1)
                                }}
                                className="pl-9 h-9 border-slate-200 text-xs rounded-lg font-medium text-slate-800"
                            />
                        </div>
                    </div>

                    {/* Status */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Status</label>
                        <select
                            value={quotationStatusFilter}
                            onChange={(e) => {
                                setQuotationStatusFilter(e.target.value)
                                setPage(1)
                            }}
                            className="h-9 px-3 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            <option value="">All Statuses</option>
                            <option value="1">Pending (Review)</option>
                            <option value="2">Approved (Converted)</option>
                            <option value="3">Rejected (Declined)</option>
                        </select>
                    </div>

                    {/* Currency */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Currency</label>
                        <select
                            value={currencyCodeFilter}
                            onChange={(e) => {
                                setCurrencyCodeFilter(e.target.value)
                                setPage(1)
                            }}
                            className="h-9 px-3 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            <option value="">All Currencies</option>
                            {currencies.map((c: any) => (
                                <option key={c.id ?? c.code} value={c.code}>{c.code}</option>
                            ))}
                        </select>
                    </div>

                    {/* From Date */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">From Date</label>
                        <Input
                            type="date"
                            value={fromDateFilter}
                            onChange={(e) => {
                                setFromDateFilter(e.target.value)
                                setPage(1)
                            }}
                            className="h-9 border-slate-200 text-xs rounded-lg font-semibold text-slate-700"
                        />
                    </div>

                    {/* To Date */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">To Date</label>
                        <Input
                            type="date"
                            value={toDateFilter}
                            onChange={(e) => {
                                setToDateFilter(e.target.value)
                                setPage(1)
                            }}
                            className="h-9 border-slate-200 text-xs rounded-lg font-semibold text-slate-700"
                        />
                    </div>

                </div>
            </div>

            {/* Loader / Content */}
            {loading ? (
                <div className="py-24 bg-white rounded-2xl border flex flex-col justify-center items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-950" />
                    <span className="text-xs font-semibold text-slate-500 animate-pulse">Syncing quotation directory...</span>
                </div>
            ) : quotations.length > 0 ? (
                <>
                    {/* Desktop View: Table */}
                    <div className="hidden md:block rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-50/75 border-b border-slate-100">
                                <TableRow>
                                    <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-5">Quote No</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs">Date</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs">Client Name</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs text-center">Status</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs text-right">Estimate Cost</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs text-right">Value (LKR)</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs text-right pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quotations.map((quote) => (
                                    <TableRow key={quote.id} className="hover:bg-slate-50/30 border-b border-slate-100">
                                        <TableCell className="font-extrabold text-xs text-slate-900 py-3.5 pl-5">
                                            {quote.quotation_no}
                                        </TableCell>
                                        <TableCell className="text-xs font-semibold text-slate-600">
                                            {new Date(quote.quotation_date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-xs font-semibold text-slate-800">
                                            <div>{quote.full_name}</div>
                                            <div className="text-[10px] font-medium text-slate-400">Passport: {quote.passport_number || "None"}</div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getStatusStyles(
                                                    Number(quote.quotation_status)
                                                )}`}
                                            >
                                                {quote.quotation_status_label || "Pending"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-xs text-slate-800">
                                            {formatCurrencyValue(quote.grand_total, quote.currency_code)}
                                        </TableCell>
                                        <TableCell className="text-right font-extrabold text-xs text-indigo-900">
                                            {formatCurrencyValue(quote.grand_total_lkr || (Number(quote.grand_total) * Number(quote.exchange_rate)), "LKR")}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                                                        <MoreVertical className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-200/80 shadow-lg">
                                                    {hasPermission("customer_quotation_view") && (
                                                        <DropdownMenuItem onClick={() => openPreview(quote)} className="text-xs font-semibold text-slate-700 flex gap-2 cursor-pointer">
                                                            <Eye className="h-3.5 w-3.5 text-slate-400" /> View & Print
                                                        </DropdownMenuItem>
                                                    )}

                                                    {hasPermission("customer_quotation_manage") && Number(quote.quotation_status) === 1 && (
                                                        <>
                                                            <DropdownMenuItem onClick={() => openEditDialog(quote)} className="text-xs font-semibold text-slate-700 flex gap-2 cursor-pointer">
                                                                <Edit3 className="h-3.5 w-3.5 text-slate-400" /> Revise / Edit
                                                            </DropdownMenuItem>

                                                            <DropdownMenuItem onClick={() => openApproveModal(quote)} className="text-xs font-semibold text-emerald-700 flex gap-2 cursor-pointer focus:text-emerald-700 focus:bg-emerald-50">
                                                                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Convert to Invoice
                                                            </DropdownMenuItem>

                                                            <DropdownMenuItem onClick={() => openRejectModal(quote)} className="text-xs font-semibold text-rose-700 flex gap-2 cursor-pointer focus:text-rose-700 focus:bg-rose-50">
                                                                <XCircle className="h-3.5 w-3.5 text-rose-600" /> Decline / Reject
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}

                                                    {hasPermission("customer_quotation_delete") && Number(quote.quotation_status) === 1 && (
                                                        <>
                                                            <DropdownMenuSeparator className="border-slate-100" />
                                                            <DropdownMenuItem onClick={() => handleDelete(quote.id)} className="text-xs font-semibold text-rose-600 flex gap-2 cursor-pointer focus:text-rose-600 focus:bg-rose-50">
                                                                <Trash2 className="h-3.5 w-3.5 text-rose-500" /> Delete Proposal
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
                        {quotations.map((quote) => (
                            <Card key={quote.id} className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-slate-100/60 bg-slate-50/20">
                                    <CardTitle className="text-xs font-black text-slate-900">
                                        {quote.quotation_no}
                                    </CardTitle>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getStatusStyles(
                                            Number(quote.quotation_status)
                                        )}`}
                                    >
                                        {quote.quotation_status_label || "Pending"}
                                    </span>
                                </CardHeader>
                                <CardContent className="pt-3">
                                    <div className="grid gap-2 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400 font-medium">Billed To:</span>
                                            <span className="font-semibold text-slate-800">{quote.full_name}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400 font-medium">Date:</span>
                                            <span className="font-semibold text-slate-700">{new Date(quote.quotation_date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-2">
                                            <span className="text-slate-600 font-bold">Estimate Cost:</span>
                                            <span className="font-extrabold text-slate-800">{formatCurrencyValue(quote.grand_total, quote.currency_code)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-indigo-900 font-bold">Value in LKR:</span>
                                            <span className="font-black text-indigo-900">{formatCurrencyValue(quote.grand_total_lkr || (Number(quote.grand_total) * Number(quote.exchange_rate)), "LKR")}</span>
                                        </div>
                                        <div className="flex gap-2 pt-3 border-t border-slate-100 mt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openPreview(quote)}
                                                className="flex-1 text-slate-700 border-slate-200 text-xs rounded-xl h-8 font-bold flex gap-1"
                                            >
                                                <Eye className="h-3.5 w-3.5" /> Preview
                                            </Button>

                                            {Number(quote.quotation_status) === 1 && (
                                                <>
                                                    <Button
                                                        onClick={() => openApproveModal(quote)}
                                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl h-8 font-bold flex gap-1 cursor-pointer"
                                                    >
                                                        <CheckCircle className="h-3.5 w-3.5" /> Approve
                                                    </Button>
                                                    <Button
                                                        onClick={() => openRejectModal(quote)}
                                                        className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-xl h-8 font-bold flex gap-1 cursor-pointer"
                                                    >
                                                        <XCircle className="h-3.5 w-3.5" /> Reject
                                                    </Button>
                                                </>
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
                    <span className="text-xs font-semibold text-slate-400">No quotation proposals logged yet.</span>
                    <QuotationBuilderDialog onSave={fetchQuotations} />
                </div>
            )}

            {/* Approve / Convert to Invoice Dialog */}
            {approveModalOpen && selectedQuote && (
                <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
                    <DialogContent className="sm:max-w-[500px] rounded-3xl border border-slate-200/80 shadow-2xl">
                        <form onSubmit={handleApproveSubmit}>
                            <DialogHeader className="pb-3 border-b border-slate-100">
                                <DialogTitle className="text-lg text-slate-900 font-extrabold tracking-tight">Approve Travel Proposal</DialogTitle>
                                <DialogDescription className="text-xs text-slate-500 font-medium">
                                    Approve and convert travel quotation <span className="font-bold text-slate-800">#{selectedQuote.quotation_no}</span> into a payable invoice.
                                </DialogDescription>
                            </DialogHeader>

                            {approveError && (
                                <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-600">
                                    {approveError}
                                </div>
                            )}

                            <div className="grid gap-4 py-4">
                                <div className="grid gap-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400 font-bold">Client:</span>
                                        <span className="font-bold text-slate-700">{selectedQuote.full_name}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs pt-1.5">
                                        <span className="text-slate-400 font-bold">Cost Estimate:</span>
                                        <span className="font-black text-slate-800">{formatCurrencyValue(selectedQuote.grand_total, selectedQuote.currency_code)}</span>
                                    </div>
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="invoiceDueDate" className="text-xs font-bold text-slate-700">
                                        Invoice Payment Due Date *
                                    </Label>
                                    <Input
                                        id="invoiceDueDate"
                                        type="date"
                                        value={invoiceDueDate}
                                        onChange={(e) => setInvoiceDueDate(e.target.value)}
                                        className="h-10 text-xs border-slate-200 rounded-xl"
                                        required
                                        disabled={approveLoading}
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="approveDesc" className="text-xs font-bold text-slate-700">
                                        Approval Description / Comments
                                    </Label>
                                    <Input
                                        id="approveDesc"
                                        value={approveDesc}
                                        onChange={(e) => setApproveDesc(e.target.value)}
                                        placeholder="Comments..."
                                        className="h-10 text-xs border-slate-200 rounded-xl"
                                        disabled={approveLoading}
                                    />
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setApproveModalOpen(false)}
                                    className="font-bold text-xs hover:bg-slate-50 cursor-pointer rounded-xl"
                                    disabled={approveLoading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 cursor-pointer rounded-xl flex items-center gap-1.5"
                                    disabled={approveLoading}
                                >
                                    {approveLoading ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Converting...
                                        </>
                                    ) : "Approve & Convert"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* Reject Quotation Dialog */}
            {rejectModalOpen && selectedQuote && (
                <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                    <DialogContent className="sm:max-w-[500px] rounded-3xl border border-slate-200/80 shadow-2xl">
                        <form onSubmit={handleRejectSubmit}>
                            <DialogHeader className="pb-3 border-b border-slate-100">
                                <DialogTitle className="text-lg text-slate-900 font-extrabold tracking-tight">Decline Quotation Proposal</DialogTitle>
                                <DialogDescription className="text-xs text-slate-500 font-medium">
                                    Log client rejection/decline for quotation <span className="font-bold text-slate-800">#{selectedQuote.quotation_no}</span>.
                                </DialogDescription>
                            </DialogHeader>

                            {rejectError && (
                                <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-600">
                                    {rejectError}
                                </div>
                            )}

                            <div className="grid gap-4 py-4">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="rejectReason" className="text-xs font-bold text-slate-700">
                                        Client Rejection Reason *
                                    </Label>
                                    <textarea
                                        id="rejectReason"
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        placeholder="e.g. Budget limitations, requested alternative dates..."
                                        className="w-full text-xs p-3 border border-slate-200 rounded-xl h-24 focus:ring-2 focus:ring-rose-500/20 outline-none"
                                        required
                                        disabled={rejectLoading}
                                    />
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setRejectModalOpen(false)}
                                    className="font-bold text-xs hover:bg-slate-50 cursor-pointer rounded-xl"
                                    disabled={rejectLoading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-6 cursor-pointer rounded-xl flex items-center gap-1.5"
                                    disabled={rejectLoading}
                                >
                                    {rejectLoading ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Logging Rejection...
                                        </>
                                    ) : "Submit Rejection"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* Preview Dialog */}
            {previewOpen && previewData && (
                <QuotationPreviewDialog
                    open={previewOpen}
                    onOpenChange={setPreviewOpen}
                    data={previewData}
                />
            )}

            {/* Hidden edit builder trigger */}
            {editQuoteData && (
                <QuotationBuilderDialog
                    open={!!editQuoteData}
                    onOpenChange={(openState) => {
                        if (!openState) setEditQuoteData(null);
                    }}
                    onSave={() => {
                        setEditQuoteData(null)
                        fetchQuotations()
                    }}
                    quotationToEdit={editQuoteData}
                    triggerButton={<span className="hidden">Trigger</span>}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={deleteConfirmOpen}
                onOpenChange={(open) => {
                    if (!open) { setDeleteConfirmOpen(false); setDeleteTargetId(null) }
                }}
                title="Delete Quotation Proposal?"
                description="This quotation proposal will be permanently deleted and cannot be recovered. Are you sure you want to continue?"
                confirmLabel="Delete Proposal"
                cancelLabel="Cancel"
                variant="danger"
                loading={deleteLoading}
                onConfirm={handleDeleteConfirm}
            />
        </div>
    )
}
