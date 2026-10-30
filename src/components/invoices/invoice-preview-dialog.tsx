"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { X } from "lucide-react"
import html2canvas from "html2canvas-pro"
import { jsPDF } from "jspdf"



interface LineItem {
    id: string
    description: string
    qty: number
    price: number
    discount: number
}

interface InvoicePreviewDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    data: {
        invoiceNo: string
        date: string
        billTo: string
        lineItems: any[]
        subtotal: number
        globalDiscount: number
        grandTotal: number
        currencyCode?: string
        passport?: string
    }
}

export function InvoicePreviewDialog({ open, onOpenChange, data }: InvoicePreviewDialogProps) {
    const invoiceRef = React.useRef<HTMLDivElement>(null)

    const formatCurrency = (amount: number) => {
        const currency = data.currencyCode || "LKR"
        return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    const handlePrint = () => {
        window.print()
    }

    const handleDownload = async () => {
        if (!invoiceRef.current) return

        try {
            const canvas = await html2canvas(invoiceRef.current, {
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
            pdf.save(`invoice-${data.invoiceNo}.pdf`)
        } catch (error) {
            console.error("Error generating PDF:", error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] p-0 gap-0 overflow-hidden bg-gray-50/50 block">
                <div className="p-4 flex items-center justify-between border-b bg-white">
                    <DialogTitle className="text-lg font-semibold text-blue-950">
                        Invoice Preview - #{data.invoiceNo}
                    </DialogTitle>
                </div>

                <div className="p-6 overflow-y-auto max-h-[80vh]">
                    {/* Invoice Content to capture */}
                    <div
                        ref={invoiceRef}
                        className="bg-white p-8 shadow-sm border rounded-lg min-h-[800px] text-sm text-gray-800"
                        id="invoice-content"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h1 className="text-4xl font-bold tracking-tight mb-4">INVOICE</h1>
                                <div className="space-y-1 text-gray-600">
                                    <div className="flex gap-4">
                                        <span className="w-24 font-medium">Invoice No:</span>
                                        <span className="font-semibold text-gray-900">{data.invoiceNo}</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <span className="w-24 font-medium">Invoice Date:</span>
                                        <span>{data.date}</span>
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
                                    <p className="font-semibold text-gray-700">VoyageLedger Travel & Tours</p>
                                    <p>45 Business District, Colombo 00100, Sri Lanka</p>
                                    <p>+94 11 234 5678 | billing@voyageledger.com</p>
                                </div>
                            </div>
                        </div>

                        {/* Bill To */}
                        <div className="bg-gray-50 p-6 rounded-lg mb-8">
                            <h3 className="font-semibold text-gray-900 mb-4">Billed To</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <div className="flex gap-4">
                                        <span className="w-24 text-gray-500">Name:</span>
                                        <span className="font-medium">{data.billTo}</span>
                                    </div>
                                    {/* Mock data for visualization based on screenshot */}
                                    <div className="flex gap-4">
                                        <span className="w-24 text-gray-500">Passport:</span>
                                        <span className="font-medium">{data.passport || "N12345678"}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex gap-4">
                                        <span className="w-24 text-gray-500">Group Size:</span>
                                        <span className="font-medium">4 People</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <span className="w-24 text-gray-500">Tour Ref:</span>
                                        <span className="font-medium">Southern Coast Day Trip</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="mb-8">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b text-xs text-gray-500">
                                        <th className="text-left font-medium py-3">Item / Service</th>
                                        <th className="text-center font-medium py-3 w-16">QTY.</th>
                                        <th className="text-right font-medium py-3 w-32">Unit Price ({data.currencyCode || "LKR"})</th>
                                        <th className="text-center font-medium py-3 w-24">Discount</th>
                                        <th className="text-right font-medium py-3 w-32">Total ({data.currencyCode || "LKR"})</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {data.lineItems.map((item, index) => {
                                        const total = (item.qty * item.price) - (item.qty * item.price * (item.discount / 100))
                                        return (
                                            <tr key={index} className="border-b border-gray-100 last:border-0">
                                                <td className="py-4">{item.description || "Item"}</td>
                                                <td className="py-4 text-center">{item.qty}</td>
                                                <td className="py-4 text-right">{item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td className="py-4 text-center text-gray-500">
                                                    {item.discount > 0 ? `${item.discount}%` : "-"}
                                                </td>
                                                <td className="py-4 text-right font-medium">{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end border-t pt-4">
                            <div className="w-72 space-y-2">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(data.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Global Discount ({data.globalDiscount > 0 ? `${data.globalDiscount}%` : "-"})</span>
                                    <span className="text-red-500">
                                        - {formatCurrency(data.subtotal - data.grandTotal)}
                                    </span>
                                </div>
                                <div className="flex justify-between font-bold text-lg text-gray-900 border-t border-gray-200 pt-2 mt-2">
                                    <span>Grand Total</span>
                                    <span>{formatCurrency(data.grandTotal)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-white flex justify-end gap-3">
                    <Button variant="outline" onClick={handlePrint} className="min-w-[100px]">
                        Print
                    </Button>
                    <Button onClick={handleDownload} className="min-w-[140px] bg-black text-white hover:bg-black/90">
                        Download Invoice
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
