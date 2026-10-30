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
    DialogClose,
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
import { Plus, Loader2 } from "lucide-react"
import { api, getStoredUser } from "@/lib/api-client"

interface AddTransactionDialogProps {
    onSave?: () => void
}

export function AddTransactionDialog({ onSave }: AddTransactionDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [fetchingData, setFetchingData] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    // Form states
    const [type, setType] = React.useState<"income" | "expense">("income")
    const [date, setDate] = React.useState(new Date().toISOString().split('T')[0])
    const [categoryId, setCategoryId] = React.useState<string>("")
    const [touristId, setTouristId] = React.useState<string>("")
    const [title, setTitle] = React.useState("")
    const [description, setDescription] = React.useState("")
    const [amount, setAmount] = React.useState("")

    // Data lists
    const [categories, setCategories] = React.useState<any[]>([])
    const [tourists, setTourists] = React.useState<any[]>([])

    // Load categories based on type
    const fetchCategories = async (txnType: "income" | "expense") => {
        try {
            const typeNum = txnType === "income" ? 1 : 2
            const res = await api.transactions.listCategories(typeNum)
            if (res.success && res.data) {
                // Check if categories is directly in res.data or res.data.categories
                const cats = res.data.categories || res.data || []
                // Filter categories matching type if the API returns all, or if they are type-specific
                const filtered = Array.isArray(cats) 
                    ? cats.filter((c: any) => Number(c.transaction_type) === typeNum)
                    : []
                setCategories(filtered)
                if (filtered.length > 0) {
                    setCategoryId(String(filtered[0].id))
                } else {
                    setCategoryId("")
                }
            }
        } catch (err) {
            console.error("Failed to load transaction categories:", err)
        }
    }

    // Load tourists list
    const fetchTourists = async () => {
        try {
            const res = await api.customers.list({ per_page: 100 })
            if (res.success && res.data) {
                let items = []
                const rawData = res.data
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
        } catch (err) {
            console.error("Failed to load customers:", err)
        }
    }

    // Initialize/Refetch on dialog open
    React.useEffect(() => {
        if (open) {
            const init = async () => {
                setFetchingData(true)
                setError(null)
                await Promise.all([
                    fetchCategories(type),
                    fetchTourists()
                ])
                setFetchingData(false)
            }
            init()
        }
    }, [open])

    // Load categories when type changes
    React.useEffect(() => {
        if (open && !fetchingData) {
            fetchCategories(type)
        }
    }, [type])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!title.trim()) {
            setError("Please enter a title")
            return
        }
        if (!categoryId) {
            setError("Please select a transaction category")
            return
        }
        if (!amount || Number(amount) <= 0) {
            setError("Please enter a valid amount greater than 0")
            return
        }

        setLoading(true)
        try {
            const user = getStoredUser()
            const payload = {
                user_id: user?.user_id || user?.id || 1,
                transaction_type: type === "income" ? 1 : 2,
                type: type === "income" ? 1 : 2, // Support both naming structures for backend flexibility
                transaction_category_id: Number(categoryId),
                customer_id: touristId ? Number(touristId) : null,
                title: title.trim(),
                description: description.trim(),
                amount: Number(amount),
                transaction_date: date,
                files: [] // No files by default for manual logging
            }

            console.log("Recording transaction with payload:", payload)
            const res = await api.transactions.add(payload)
            if (res.success) {
                setOpen(false)
                // Reset form fields
                setTitle("")
                setDescription("")
                setAmount("")
                setTouristId("")
                if (onSave) onSave()
            } else {
                setError(res.message || "Failed to record transaction")
            }
        } catch (err: any) {
            setError(err.message || "Something went wrong while recording the transaction")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm border border-emerald-500/10">
                    <Plus className="mr-2 h-4 w-4" /> Add Transaction
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] h-[90vh] sm:h-auto overflow-y-auto rounded-3xl border border-slate-200/80 shadow-2xl">
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="pb-4 border-b border-slate-100">
                        <DialogTitle className="text-xl text-slate-900 font-extrabold tracking-tight">Record Manual Transaction</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 font-medium">
                            Record a new transaction entry and update customer balance.
                        </DialogDescription>
                    </DialogHeader>

                    {error && (
                        <div className="mt-4 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-600 animate-shake">
                            {error}
                        </div>
                    )}

                    <div className="grid gap-5 py-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="grid gap-1.5">
                                <Label htmlFor="type" className="text-xs font-bold text-slate-700">
                                    Type
                                </Label>
                                <Select 
                                    value={type} 
                                    onValueChange={(val: any) => setType(val)}
                                    disabled={loading || fetchingData}
                                >
                                    <SelectTrigger className="h-10 text-xs font-semibold border-slate-200 rounded-xl focus:ring-emerald-500/20">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="income" className="text-emerald-600 font-bold text-xs">Income (Cash In)</SelectItem>
                                        <SelectItem value="expense" className="text-rose-600 font-bold text-xs">Expense (Cash Out)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="date" className="text-xs font-bold text-slate-700">
                                    Date
                                </Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="h-10 text-xs border-slate-200 rounded-xl focus:ring-emerald-500/20"
                                    disabled={loading || fetchingData}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="title" className="text-xs font-bold text-slate-700">
                                Title
                            </Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Tour Booking Advance, Flight Purchase"
                                className="h-10 text-xs border-slate-200 rounded-xl focus:ring-emerald-500/20"
                                disabled={loading || fetchingData}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="grid gap-1.5">
                                <Label htmlFor="category" className="text-xs font-bold text-slate-700">
                                    Category
                                </Label>
                                <Select 
                                    value={categoryId} 
                                    onValueChange={setCategoryId}
                                    disabled={loading || fetchingData || categories.length === 0}
                                >
                                    <SelectTrigger className="h-10 text-xs border-slate-200 rounded-xl focus:ring-emerald-500/20">
                                        <SelectValue placeholder={fetchingData ? "Loading categories..." : "Select category"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={String(cat.id)} className="text-xs font-medium text-slate-700">
                                                {cat.transaction_category}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="tourist" className="text-xs font-bold text-slate-700">
                                    Related Customer (Optional)
                                </Label>
                                <Select 
                                    value={touristId} 
                                    onValueChange={(value) => setTouristId(value === "none" ? "" : value)}
                                    disabled={loading || fetchingData}
                                >
                                    <SelectTrigger className="h-10 text-xs border-slate-200 rounded-xl focus:ring-emerald-500/20">
                                        <SelectValue placeholder={fetchingData ? "Loading customers..." : "Select related customer"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none" className="text-xs font-semibold text-slate-400">None (General Transaction)</SelectItem>
                                        {tourists.map((tourist) => (
                                            <SelectItem key={tourist.id} value={String(tourist.id)} className="text-xs font-medium text-slate-700">
                                                {tourist.full_name} ({tourist.passport_number || "No Passport"})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="description" className="text-xs font-bold text-slate-700">
                                Description
                            </Label>
                            <Input
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add optional details..."
                                className="h-10 text-xs border-slate-200 rounded-xl focus:ring-emerald-500/20"
                                disabled={loading || fetchingData}
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="amount" className="text-xs font-bold text-slate-700">
                                Amount
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3 top-[11px] text-[10px] text-slate-400 font-extrabold">LKR</span>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={amount}
                                    onKeyDown={(e) => {
                                        if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
                                            e.preventDefault();
                                        }
                                    }}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9.]/g, "");
                                        setAmount(val);
                                    }}
                                    placeholder="0.00"
                                    className="pl-12 h-10 text-xs border-slate-200 rounded-xl focus:ring-emerald-500/20 font-bold"
                                    disabled={loading || fetchingData}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-slate-100">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => setOpen(false)}
                            className="font-bold text-xs hover:bg-slate-50 cursor-pointer rounded-xl"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            className="bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs px-6 cursor-pointer rounded-xl flex items-center gap-1.5"
                            disabled={loading || fetchingData}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Saving...
                                </>
                            ) : "Save Transaction"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

