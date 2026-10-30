"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, AlertTriangle } from "lucide-react"

interface ConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title?: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: "danger" | "warning" | "default"
    loading?: boolean
    onConfirm: () => void
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title = "Are you sure?",
    description = "This action cannot be undone.",
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "danger",
    loading = false,
    onConfirm,
}: ConfirmDialogProps) {
    const confirmStyles = {
        danger: "bg-rose-600 hover:bg-rose-700 text-white",
        warning: "bg-amber-500 hover:bg-amber-600 text-white",
        default: "bg-indigo-600 hover:bg-indigo-700 text-white",
    }

    const iconStyles = {
        danger: "text-rose-500 bg-rose-50 border-rose-100",
        warning: "text-amber-500 bg-amber-50 border-amber-100",
        default: "text-indigo-500 bg-indigo-50 border-indigo-100",
    }

    return (
        <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
            <DialogContent className="sm:max-w-[420px] rounded-3xl border border-slate-200/80 shadow-2xl p-0 overflow-hidden">
                <div className="p-6 pb-4 flex flex-col items-center text-center gap-4">
                    {/* Icon */}
                    <div
                        className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center ${iconStyles[variant]}`}
                    >
                        <AlertTriangle className="h-6 w-6" />
                    </div>

                    <DialogHeader className="space-y-1.5">
                        <DialogTitle className="text-base font-extrabold text-slate-900 tracking-tight">
                            {title}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                            {description}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <DialogFooter className="flex flex-row gap-2 px-6 pb-6 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                        className="flex-1 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 ${confirmStyles[variant]}`}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            confirmLabel
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
