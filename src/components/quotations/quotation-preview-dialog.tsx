"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import html2canvas from "html2canvas-pro"
import { jsPDF } from "jspdf"

interface LineItem {
    id: string
    description: string
    qty: number
    price: number
    discount: number
}

interface QuotationPreviewDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    data: {
        quotationNo: string
        date: string
        validUntil: string
        billTo: string
        lineItems: LineItem[]
        subtotal: number
        globalDiscount: number
        grandTotal: number
        currencyCode: string
        passport?: string
    }
}

export function QuotationPreviewDialog({ open, onOpenChange, data }: QuotationPreviewDialogProps) {
    const quotationRef = React.useRef<HTMLDivElement>(null)

    const formatCurrency = (amount: number) => {
        return `${data.currencyCode} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    const handlePrint = () => {
        window.print()
    }

    const handleDownload = async () => {
        if (!quotationRef.current) return

        try {
            const canvas = await html2canvas(quotationRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff"
            })

            const imgData = canvas.toDataURL("image/png")
            const ResolvedjsPDF = typeof jsPDF === "function" ? jsPDF : (jsPDF as any).jsPDF
            const pdf = new ResolvedjsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            })

            const imgWidth = 210 // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width

            pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight)
            pdf.save(`quotation-${data.quotationNo}.pdf`)
        } catch (error) {
            console.error("Error generating PDF:", error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] p-0 gap-0 overflow-hidden bg-gray-50/50 block border rounded-3xl shadow-2xl">
                <div className="p-4 flex items-center justify-between border-b bg-white">
                    <DialogTitle className="text-lg font-semibold text-indigo-950">
                        Quotation Preview - #{data.quotationNo}
                    </DialogTitle>
                </div>

                <div className="p-6 overflow-y-auto max-h-[80vh]">
                    {/* Quotation Content */}
                    <div
                        ref={quotationRef}
                        className="bg-white p-8 shadow-sm border rounded-lg min-h-[800px] text-sm text-gray-800"
                        id="quotation-content"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h1 className="text-4xl font-black tracking-tight mb-4 text-indigo-900">TRAVEL QUOTATION</h1>
                                <div className="space-y-1 text-gray-600">
                                    <div className="flex gap-4">
                                        <span className="w-24 font-bold">Quote No:</span>
                                        <span className="font-semibold text-gray-900">{data.quotationNo}</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <span className="w-24 font-bold">Issued:</span>
                                        <span>{data.date}</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <span className="w-24 font-bold text-rose-600">Valid Until:</span>
                                        <span className="text-rose-600 font-semibold">{data.validUntil}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center justify-end gap-2 mb-4">
                                    <img
                                        src="/logo.png"
                                        alt="DCAS Logo"
                                        style={{ width: '180px', height: 'auto', objectFit: 'contain' }}
                                    />
                                </div>
                                <div className="text-xs text-gray-500 space-y-1">
                                    <p className="font-bold text-gray-700">VoyageLedger Travel & Tours</p>
                                    <p>45 Business District, Colombo 00100, Sri Lanka</p>
                                    <p>+94 11 234 5678 | quotes@voyageledger.com</p>
                                </div>
                            </div>
                        </div>

                        {/* Customer Info */}
                        <div className="bg-indigo-50/30 border border-indigo-100/60 p-6 rounded-2xl mb-8">
                            <h3 className="font-black text-indigo-950 uppercase tracking-wider text-[11px] mb-4">Prepared For</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <div className="flex gap-4">
                                        <span className="w-24 text-gray-500 font-medium">Name:</span>
                                        <span className="font-bold text-slate-800">{data.billTo}</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <span className="w-24 text-gray-500 font-medium">Passport:</span>
                                        <span className="font-semibold text-slate-800">{data.passport || "None"}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex gap-4">
                                        <span className="w-24 text-gray-500 font-medium">Type:</span>
                                        <span className="font-semibold text-slate-800">Tour Proposal</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <span className="w-24 text-gray-500 font-medium">Agent Ref:</span>
                                        <span className="font-semibold text-indigo-600">VoyageLedger Live Portal</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="mb-8">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b text-xs text-gray-500">
                                        <th className="text-left font-bold py-3 uppercase tracking-wider">Line Item Description</th>
                                        <th className="text-center font-bold py-3 w-16 uppercase tracking-wider">QTY.</th>
                                        <th className="text-right font-bold py-3 w-32 uppercase tracking-wider">Unit Price</th>
                                        <th className="text-center font-bold py-3 w-24 uppercase tracking-wider">Discount</th>
                                        <th className="text-right font-bold py-3 w-32 uppercase tracking-wider">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {data.lineItems.map((item, index) => {
                                        const total = (item.qty * item.price) - (item.qty * item.price * (item.discount / 100))
                                        return (
                                            <tr key={index} className="border-b border-gray-100 last:border-0 hover:bg-slate-50/20">
                                                <td className="py-4 font-medium text-slate-800">{item.description || "Tour Service"}</td>
                                                <td className="py-4 text-center font-semibold text-slate-700">{item.qty}</td>
                                                <td className="py-4 text-right font-semibold text-slate-700">{item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td className="py-4 text-center font-medium text-indigo-600 bg-indigo-50/20 rounded-md">
                                                    {item.discount > 0 ? `${item.discount}%` : "-"}
                                                </td>
                                                <td className="py-4 text-right font-bold text-slate-900">{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end border-t pt-4">
                            <div className="w-72 space-y-2">
                                <div className="flex justify-between text-gray-600 text-xs font-semibold">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(data.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600 text-xs font-semibold">
                                    <span>Global Proposal Discount ({data.globalDiscount > 0 ? `${data.globalDiscount}%` : "-"})</span>
                                    <span className="text-red-500">
                                        - {formatCurrency(data.subtotal - data.grandTotal)}
                                    </span>
                                </div>
                                <div className="flex justify-between font-black text-lg text-indigo-900 border-t border-gray-200 pt-2 mt-2">
                                    <span>Estimate Cost</span>
                                    <span>{formatCurrency(data.grandTotal)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 pt-6 border-t border-dashed border-gray-200 text-center text-xs text-gray-400">
                            <p className="font-semibold text-indigo-900/60">Thank you for traveling with AventureIt!</p>
                            <p className="mt-1">For modifications or confirmations, please contact your travel planner directly.</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-white flex justify-end gap-3">
                    <Button variant="outline" onClick={handlePrint} className="min-w-[100px] rounded-xl font-bold cursor-pointer text-xs">
                        Print Quote
                    </Button>
                    <Button onClick={handleDownload} className="min-w-[140px] bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-bold cursor-pointer text-xs shadow-sm">
                        Download PDF
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
