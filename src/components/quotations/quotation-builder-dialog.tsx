"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, Trash, Info, Loader2, Edit3 } from "lucide-react"
import { api, getStoredUser } from "@/lib/api-client"
import { QuotationPreviewDialog } from "./quotation-preview-dialog"

interface LineItem {
    id: string
    itemType: string
    description: string
    qty: number
    price: number
    discount: number
}

interface QuotationBuilderDialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onSave?: () => void
    quotationToEdit?: any
    triggerButton?: React.ReactNode
}

export function QuotationBuilderDialog({ open: controlledOpen, onOpenChange: controlledOnOpenChange, onSave, quotationToEdit, triggerButton }: QuotationBuilderDialogProps) {
    const [localOpen, setLocalOpen] = React.useState(false)
    const open = controlledOpen !== undefined ? controlledOpen : localOpen
    const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setLocalOpen
    const [loading, setLoading] = React.useState(false)
    const [fetchingMetadata, setFetchingMetadata] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    // Preview
    const [previewOpen, setPreviewOpen] = React.useState(false)
    const [previewData, setPreviewData] = React.useState<any>(null)

    // Metadata list states
    const [tourists, setTourists] = React.useState<any[]>([])
    const [currencies, setCurrencies] = React.useState<any[]>([])
    const [itemTypes, setItemTypes] = React.useState<any[]>([])

    // Quotation Form state
    const [touristId, setTouristId] = React.useState("")
    const [quotationDate, setQuotationDate] = React.useState(new Date().toISOString().split('T')[0])
    const [validUntil, setValidUntil] = React.useState("")
    const [currencyCode, setCurrencyCode] = React.useState("LKR")
    const [exchangeRate, setExchangeRate] = React.useState(1)
    const [globalDiscount, setGlobalDiscount] = React.useState(0)
    const [notes, setNotes] = React.useState("This is an official travel quotation.")
    const [terms, setTerms] = React.useState("This quote is valid for 30 days. Prices are subject to availability.")

    const [lineItems, setLineItems] = React.useState<LineItem[]>([
        { id: "1", itemType: "6", description: "Custom Item", qty: 1, price: 0, discount: 0 }
    ])

    // Sync state if editing
    React.useEffect(() => {
        if (quotationToEdit) {
            setTouristId(String(quotationToEdit.customer_id || ""))
            setQuotationDate(new Date(quotationToEdit.quotation_date || new Date()).toISOString().split('T')[0])
            setValidUntil(new Date(quotationToEdit.valid_until || new Date()).toISOString().split('T')[0])
            setCurrencyCode(quotationToEdit.currency_code || "LKR")
            setExchangeRate(Number(quotationToEdit.exchange_rate || 1))
            setGlobalDiscount(Number(quotationToEdit.quotation_discount_value || 0))
            setNotes(quotationToEdit.notes || "")
            setTerms(quotationToEdit.terms_and_conditions || "")
            
            if (quotationToEdit.items && quotationToEdit.items.length > 0) {
                setLineItems(
                    quotationToEdit.items.map((i: any) => ({
                        id: String(i.id || Math.random()),
                        itemType: String(i.item_type || "6"),
                        description: i.item_name || i.description || "",
                        qty: Number(i.quantity || 1),
                        price: Number(i.unit_price || 0),
                        discount: Number(i.discount_value || 0)
                    }))
                )
            }
        }
    }, [quotationToEdit, open])

    // Load dynamic data from backend
    React.useEffect(() => {
        if (open) {
            const loadData = async () => {
                setFetchingMetadata(true)
                setError(null)
                try {
                    const [basicRes, touristsRes] = await Promise.all([
                        api.invoices.getBasicData(), // Exchange rates are shared with Invoices Basic Data API
                        api.customers.list({ per_page: 100 })
                    ])

                    if (basicRes.success && basicRes.data) {
                        setCurrencies(basicRes.data.currency_codes || [])
                        setItemTypes(basicRes.data.item_types || [])
                    }

                    if (touristsRes.success && touristsRes.data) {
                        let items = []
                        const rawData = touristsRes.data
                        const candidates = [
                            rawData,
                            rawData.customer_list,
                            rawData.items,
                            rawData.data,
                            rawData.customers
                        ]
                        
                        for (const cand of candidates) {
                            if (Array.isArray(cand)) {
                                items = cand
                                break
                            }
                        }

                        const normalized = items.map((item: any) => {
                            let normalizedStatus = 0;
                            if (item.status && typeof item.status === "object") {
                                normalizedStatus = Number(item.status.id);
                            } else {
                                normalizedStatus = Number(item.status ?? 0);
                            }
                            return {
                                ...item,
                                id: item.id ?? item.customer_id ?? 0,
                                customer_id: item.customer_id ?? item.id ?? 0,
                                status: normalizedStatus
                            };
                        });
                        setTourists(normalized)
                    }

                    if (!quotationToEdit) {
                        // Default valid until to 30 days from now
                        const thirtyDays = new Date()
                        thirtyDays.setDate(thirtyDays.getDate() + 30)
                        setValidUntil(thirtyDays.toISOString().split('T')[0])
                    }

                } catch (err: any) {
                    setError("Failed to load quotation parameters: " + err.message)
                } finally {
                    setFetchingMetadata(false)
                }
            }
            loadData()
        }
    }, [open])

    // Update exchange rate automatically when currency code changes
    React.useEffect(() => {
        if (!quotationToEdit || currencies.length > 0) {
            const selected = currencies.find(c => c.code === currencyCode)
            if (selected) {
                setExchangeRate(Number(selected.exchange_rate_to_lkr || 1))
            }
        }
    }, [currencyCode, currencies])

    const addItem = () => {
        setLineItems([
            ...lineItems,
            { id: Math.random().toString(), itemType: "6", description: "", qty: 1, price: 0, discount: 0 }
        ])
    }

    const removeItem = (id: string) => {
        if (lineItems.length > 1) {
            setLineItems(lineItems.filter(item => item.id !== id))
        }
    }

    const updateItem = (id: string, field: keyof LineItem, value: any) => {
        setLineItems(lineItems.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value }
            }
            return item
        }))
    }

    const calculateItemTotal = (item: LineItem) => {
        const sub = item.qty * item.price
        const discountAmount = sub * (item.discount / 100)
        return sub - discountAmount
    }

    const subtotal = lineItems.reduce((acc, item) => acc + calculateItemTotal(item), 0)
    const globalDiscountAmount = subtotal * (globalDiscount / 100)
    const grandTotal = subtotal - globalDiscountAmount

    const formatCurrency = (amount: number) => {
        const sym = currencies.find(c => c.code === currencyCode)?.symbol || "LKR"
        return `${sym} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    const handleFinalize = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!touristId) {
            setError("Please select a customer to quote to")
            return
        }
        if (!validUntil) {
            setError("Please select a validity end date")
            return
        }

        const invalidItems = lineItems.some(i => !i.description.trim() || Number(i.price) <= 0)
        if (invalidItems) {
            setError("Please complete all item descriptions and verify pricing is above zero")
            return
        }

        setLoading(true)
        try {
            const user = getStoredUser()
            const payload: any = {
                user_id: user?.user_id || user?.id || 1,
                customer_id: Number(touristId),
                quotation_date: quotationDate,
                valid_until: validUntil,
                currency_code: currencyCode,
                exchange_rate: Number(exchangeRate),
                quotation_discount_type: globalDiscount > 0 ? 2 : 0, // 2 = Percentage
                quotation_discount_value: Number(globalDiscount),
                notes: notes,
                terms_and_conditions: terms,
                items: lineItems.map((item) => ({
                    item_type: Number(item.itemType),
                    reference_id: null,
                    item_name: item.description.trim(),
                    description: item.description.trim(),
                    quantity: Number(item.qty),
                    unit_price: Number(item.price),
                    discount_type: Number(item.discount) > 0 ? 2 : 0, // 2 = Percentage
                    discount_value: Number(item.discount),
                    tax_type: 0,
                    tax_name: null,
                    tax_rate: 0
                }))
            }

            let res;
            if (quotationToEdit) {
                payload.quotation_id = Number(quotationToEdit.id ?? quotationToEdit.quotation_id)
                res = await api.quotations.manage(payload)
            } else {
                res = await api.quotations.add(payload)
            }

            if (res.success && res.data) {
                const client = tourists.find(t => String(t.id) === touristId)
                setPreviewData({
                    quotationNo: res.data.quotation_no || `QTN-T-${res.data.quotation_id || Math.floor(Math.random() * 1000)}`,
                    date: quotationDate,
                    validUntil: validUntil,
                    billTo: client?.full_name || "Client Directory",
                    lineItems: lineItems,
                    subtotal: subtotal,
                    globalDiscount: globalDiscount,
                    grandTotal: grandTotal,
                    currencyCode: currencyCode,
                    passport: client?.passport_number || "None"
                })

                setOpen(false)
                setPreviewOpen(true)
                if (onSave) onSave()
            } else {
                setError(res.message || "Failed to finalize quotation on server.")
            }
        } catch (err: any) {
            setError(err.message || "Something went wrong while saving the quotation.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    {triggerButton || (
                        <Button className="cursor-pointer bg-indigo-950 hover:bg-indigo-900 text-white font-semibold rounded-xl px-5 shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> Create Quotation
                        </Button>
                    )}
                </DialogTrigger>
                <DialogContent className="sm:max-w-[1250px] w-[96vw] sm:w-full max-h-[92vh] h-[92vh] flex flex-col p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden bg-white">
                    <form onSubmit={handleFinalize} className="flex flex-col h-full overflow-hidden min-h-0">
                        <DialogHeader className="pb-3 border-b border-slate-100 shrink-0">
                            <DialogTitle className="text-xl text-slate-900 font-extrabold tracking-tight">
                                {quotationToEdit ? "Quotation Revision Builder" : "Quotation Builder"}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 font-medium">
                                Design and compile itemized quotations for customers. Quotes can be converted directly into invoices.
                            </DialogDescription>
                        </DialogHeader>

                        {error && (
                            <div className="mt-3 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-600 shrink-0">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-5 sm:gap-6 py-3 sm:py-4 flex-1 overflow-y-auto lg:overflow-hidden min-h-0">
                            {/* Left Column: Details & Items */}
                            <div className="flex flex-col gap-4 sm:gap-5 h-full min-h-0 lg:overflow-hidden">
                                {/* Details */}
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 flex flex-col gap-4 shrink-0 shadow-sm">
                                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Quotation Config</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="tourist" className="text-xs font-bold text-slate-700">
                                                Customer *
                                            </Label>
                                            <Select 
                                                value={touristId} 
                                                onValueChange={setTouristId}
                                                disabled={fetchingMetadata || loading}
                                            >
                                                <SelectTrigger className="h-10 text-xs border-slate-200 rounded-xl focus:ring-indigo-500/20">
                                                    <SelectValue placeholder={fetchingMetadata ? "Loading clients..." : "Select client"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {tourists.map((t) => (
                                                        <SelectItem key={t.id} value={String(t.id)} className="text-xs font-medium text-slate-700">
                                                            {t.full_name} ({t.passport_number || "No Passport"})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-1.5">
                                            <Label htmlFor="date" className="text-xs font-bold text-slate-700">
                                                Quotation Date *
                                            </Label>
                                            <Input
                                                id="date"
                                                type="date"
                                                className="h-10 text-xs border-slate-200 rounded-xl focus:ring-indigo-500/20"
                                                value={quotationDate}
                                                onChange={(e) => setQuotationDate(e.target.value)}
                                                disabled={loading}
                                                required
                                            />
                                        </div>

                                        <div className="grid gap-1.5">
                                            <Label htmlFor="validUntil" className="text-xs font-bold text-slate-700">
                                                Valid Until *
                                            </Label>
                                            <Input
                                                id="validUntil"
                                                type="date"
                                                className="h-10 text-xs border-slate-200 rounded-xl focus:ring-indigo-500/20"
                                                value={validUntil}
                                                onChange={(e) => setValidUntil(e.target.value)}
                                                disabled={loading}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="currency" className="text-xs font-bold text-slate-700">
                                                Billing Currency
                                            </Label>
                                            <Select 
                                                value={currencyCode} 
                                                onValueChange={setCurrencyCode}
                                                disabled={fetchingMetadata || loading}
                                            >
                                                <SelectTrigger className="h-10 text-xs border-slate-200 rounded-xl focus:ring-indigo-500/20">
                                                    <SelectValue placeholder="Select currency" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {currencies.map((c) => (
                                                        <SelectItem key={c.code} value={c.code} className="text-xs font-medium text-slate-700">
                                                            {c.code} - {c.label} ({c.symbol})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-1.5">
                                            <Label htmlFor="rate" className="text-xs font-bold text-slate-700">
                                                Exchange Rate (to LKR)
                                            </Label>
                                            <Input
                                                id="rate"
                                                type="number"
                                                step="0.0001"
                                                className="h-10 text-xs border-slate-200 rounded-xl font-bold bg-slate-50"
                                                value={exchangeRate}
                                                onChange={(e) => setExchangeRate(Number(e.target.value))}
                                                disabled={currencyCode === "LKR" || loading}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Line Items */}
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 flex flex-col gap-4 flex-1 min-h-[220px] overflow-hidden shadow-sm">
                                    <div className="flex items-center justify-between shrink-0">
                                        <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Line Items</h3>
                                        <Button 
                                            type="button"
                                            variant="outline" 
                                            size="sm" 
                                            onClick={addItem} 
                                            className="cursor-pointer border-slate-200 text-xs font-bold rounded-lg h-8 text-slate-700 hover:bg-slate-50"
                                        >
                                            <Plus className="mr-1.5 h-3.5 w-3.5 text-indigo-600" /> Add Item
                                        </Button>
                                    </div>

                                    <div className="flex-1 overflow-auto pr-1 gap-2.5 flex flex-col min-h-0">
                                        <div className="min-w-[760px] flex flex-col gap-2.5">
                                            {/* Header Row */}
                                            <div className="grid grid-cols-[120px_minmax(220px,1fr)_65px_100px_75px_105px_32px] gap-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/80 border border-slate-100 px-3 py-2 rounded-xl shrink-0 items-center">
                                                <div>Item Type</div>
                                                <div className="pl-1">Description</div>
                                                <div className="text-center">Qty</div>
                                                <div className="text-right pr-1">Price</div>
                                                <div className="text-right pr-2">Disc %</div>
                                                <div className="text-right pr-1">Total</div>
                                                <div></div>
                                            </div>

                                            {lineItems.map((item) => (
                                                <div key={item.id} className="grid grid-cols-[120px_minmax(220px,1fr)_65px_100px_75px_105px_32px] gap-2.5 items-center bg-slate-50/40 hover:bg-slate-50/80 border border-slate-100 px-3 py-2 rounded-2xl shrink-0 transition-colors">
                                                    <div>
                                                        <Select
                                                            value={item.itemType}
                                                            onValueChange={(val) => updateItem(item.id, "itemType", val)}
                                                            disabled={loading}
                                                        >
                                                            <SelectTrigger className="h-9 text-xs border-slate-200 rounded-xl bg-white">
                                                                <SelectValue placeholder="Type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {itemTypes.map((it) => (
                                                                    <SelectItem key={it.id} value={String(it.id)} className="text-xs font-medium">
                                                                        {it.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <Input
                                                            placeholder="Tour package, service details..."
                                                            className="h-9 text-xs border-slate-200 rounded-xl bg-white focus:ring-indigo-500/20"
                                                            value={item.description}
                                                            onChange={(e) => updateItem(item.id, "description", e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <Input
                                                            type="number"
                                                            placeholder="1"
                                                            className="h-9 text-xs border-slate-200 rounded-xl bg-white text-center font-bold pl-2 pr-1"
                                                            min="1"
                                                            value={item.qty}
                                                            onChange={(e) => updateItem(item.id, "qty", e.target.value === "" ? 1 : parseFloat(e.target.value))}
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <Input
                                                            type="number"
                                                            placeholder="0.00"
                                                            className="h-9 text-xs border-slate-200 rounded-xl bg-white text-right font-semibold pl-2 pr-1"
                                                            min="0"
                                                            value={item.price || ""}
                                                            onChange={(e) => updateItem(item.id, "price", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            placeholder="0"
                                                            className="h-9 pl-2 pr-7 text-xs border-slate-200 rounded-xl bg-white text-right font-semibold"
                                                            min="0"
                                                            max="100"
                                                            value={item.discount || ""}
                                                            onChange={(e) => updateItem(item.id, "discount", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                                                        />
                                                        <span className="absolute right-[19px] top-2.5 text-[10px] text-slate-400 font-bold pointer-events-none">%</span>
                                                    </div>
                                                    <div className="text-right pr-1">
                                                        <span className="font-extrabold text-xs text-slate-800 truncate block">
                                                            {formatCurrency(calculateItemTotal(item))}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer shrink-0"
                                                            onClick={() => removeItem(item.id)}
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Summary */}
                            <div className="h-full flex flex-col min-h-0">
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 flex flex-col flex-1 shadow-sm min-h-0 overflow-hidden">
                                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider shrink-0 pb-1">Grand Total Summary</h3>

                                    <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 py-2 min-h-0">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-400 font-bold">Subtotal</span>
                                            <span className="font-bold text-slate-800">{formatCurrency(subtotal)}</span>
                                        </div>

                                        <div className="space-y-1.5 border-t border-slate-100 pt-3">
                                            <Label className="text-xs font-bold text-slate-700">Global discount percentage</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    className="h-10 text-xs border-slate-200 rounded-xl pr-12 focus:ring-indigo-500/20"
                                                    placeholder="0"
                                                    min="0"
                                                    max="100"
                                                    value={globalDiscount || ""}
                                                    onChange={(e) => setGlobalDiscount(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                                                />
                                                <div className="absolute right-0 top-0 h-full px-3 flex items-center bg-slate-50 border border-slate-200 rounded-r-xl text-xs text-slate-500 font-bold border-l-0">
                                                    %
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 pt-1">
                                            <Label className="text-xs font-bold text-slate-700">Quotation Terms & Notes</Label>
                                            <textarea
                                                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl h-16 resize-none focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder="Notes..."
                                            />
                                        </div>

                                        <div className="bg-indigo-50/50 border border-indigo-100 text-indigo-800 p-2.5 rounded-2xl text-[11px] font-semibold flex gap-2 shrink-0">
                                            <Info className="h-4 w-4 shrink-0 mt-0.5 text-indigo-600" />
                                            <p className="leading-snug">Submitting stores this quote as pending until approved by client.</p>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-100 pt-3 mt-2 space-y-2.5 shrink-0 bg-white">
                                        <div className="flex justify-between items-center">
                                            <span className="font-extrabold text-sm text-slate-700">Total Quotation</span>
                                            <span className="text-lg font-black text-indigo-600">{formatCurrency(grandTotal)}</span>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full bg-slate-900 text-white hover:bg-slate-800 font-bold rounded-xl h-11 cursor-pointer shrink-0 flex justify-center items-center gap-2"
                                            disabled={loading || fetchingMetadata}
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Processing & finalising...
                                                </>
                                            ) : (
                                                quotationToEdit ? "Update & Save Quotation" : "Save & Finalize Quotation"
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {previewOpen && previewData && (
                <QuotationPreviewDialog
                    open={previewOpen}
                    onOpenChange={setPreviewOpen}
                    data={{
                        quotationNo: previewData.quotationNo,
                        date: previewData.date,
                        validUntil: previewData.validUntil,
                        billTo: previewData.billTo,
                        lineItems: previewData.lineItems,
                        subtotal: previewData.subtotal,
                        globalDiscount: previewData.globalDiscount,
                        grandTotal: previewData.grandTotal,
                        currencyCode: previewData.currencyCode,
                        passport: previewData.passport
                    }}
                />
            )}
        </>
    )
}
