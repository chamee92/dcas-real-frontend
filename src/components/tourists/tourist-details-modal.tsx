"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { Loader2, FileText, Download, User, Globe, Compass, PhoneCall } from "lucide-react";
import { TouristDocumentsTab } from "./tourist-documents-tab";
import { formatPhoneNumberForDisplay } from "@/lib/utils";

interface TouristDetailsModalProps {
    tourist: any | null;
    isOpen: boolean;
    onClose: () => void;
    onRefresh: () => void;
}

export function TouristDetailsModal({
    tourist,
    isOpen,
    onClose,
    onRefresh,
}: TouristDetailsModalProps) {
    const [customerData, setCustomerData] = useState<any | null>(null);
    const [ledgerData, setLedgerData] = useState<any | null>(null);
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"profile" | "ledger" | "documents">("profile");
    const [metadata, setMetadata] = useState<any | null>(null);

    const isStatusActive = () => {
        if (!customerData) return false;
        let statusVal = customerData.status;
        if (statusVal && typeof statusVal === "object") {
            statusVal = statusVal.id;
        }
        return Number(statusVal) === 1;
    };

    useEffect(() => {
        if (isOpen && tourist) {
            setCustomerData(tourist);
            const cid = Number(tourist.customer_id || tourist.id);
            if (cid) {
                fetchCustomerLedger(cid);
                
                const fetchFullProfile = async () => {
                    try {
                        const res = await api.customers.get(cid);
                        if (res.success && res.data) {
                            const raw = res.data;
                            const unwrapped = (raw.customer && typeof raw.customer === "object") ? raw.customer :
                                (raw.customer_data && typeof raw.customer_data === "object") ? raw.customer_data :
                                (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) ? raw.data :
                                (Array.isArray(raw) && raw.length > 0) ? raw[0] : raw;
                            setCustomerData((prev: any) => ({ ...prev, ...unwrapped }));
                        }
                    } catch (e) {
                        console.error("Error fetching full customer profile:", e);
                    }
                };
                fetchFullProfile();
            }
        } else {
            setActiveTab("profile");
        }
    }, [isOpen, tourist]);

    useEffect(() => {
        const fetchBasicData = async () => {
            try {
                const res = await api.customers.getBasicData();
                if (res.success && res.data) {
                    setMetadata(res.data);
                }
            } catch (err) {
                console.error("Failed to load customer basic metadata in details modal:", err);
            }
        };

        if (isOpen) {
            fetchBasicData();
        }
    }, [isOpen]);

    const fetchCustomerLedger = async (cid: number) => {
        setLedgerLoading(true);
        try {
            const res = await api.transactions.getCustomerLedger({ customer_id: cid });
            if (res.success && res.data) {
                setLedgerData(res.data);
            }
        } catch (e) {
            console.error("Error fetching customer ledger", e);
        } finally {
            setLedgerLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `LKR ${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 shadow-2xl p-6">
                <DialogHeader className="pb-3 border-b">
                    <DialogTitle className="text-xl font-extrabold text-slate-900 flex items-center justify-between">
                        <span>Customer Profile Details</span>
                        {customerData && (
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase border ${
                                isStatusActive() 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}>
                                {isStatusActive() ? "Active" : "Inactive"}
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {customerData ? (
                    <div className="space-y-5 py-2">
                        {/* Upper Header Grid */}
                        <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start pb-5 border-b border-slate-100">
                            {(customerData.profile_picture || customerData.profile_image_url || customerData.profile_image) ? (
                                <div className="h-16 w-16 rounded-full overflow-hidden relative border border-slate-200 shadow-sm shrink-0">
                                    <img
                                        src={customerData.profile_picture || customerData.profile_image_url || customerData.profile_image}
                                        alt={customerData.full_name}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-700 text-lg border border-slate-200 shrink-0 shadow-sm">
                                    {customerData.full_name?.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1 space-y-1 text-center sm:text-left">
                                <h3 className="text-lg font-black text-slate-900 leading-tight">{customerData.full_name}</h3>
                                <p className="text-xs text-slate-500 font-bold">
                                    Customer Code: <span className="font-extrabold text-slate-700">{customerData.customer_code || "N/A"}</span>
                                </p>
                                <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1 pt-1.5 text-xs text-slate-500 font-semibold">
                                    <div>Phone: <span className="font-extrabold text-slate-800">{formatPhoneNumberForDisplay(customerData.contact_number)}</span></div>
                                    <div className="hidden sm:block text-slate-300">|</div>
                                    <div>Email: <span className="font-extrabold text-slate-800">{customerData.email_address || "-"}</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Custom Tab Switcher */}
                        <div className="flex border-b border-slate-100 pb-3">
                            <button
                                onClick={() => setActiveTab("profile")}
                                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                                    activeTab === "profile"
                                        ? "bg-slate-900 text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                                }`}
                            >
                                Profile & Travel Information
                            </button>
                            <button
                                onClick={() => setActiveTab("ledger")}
                                className={`ml-2 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                                    activeTab === "ledger"
                                        ? "bg-slate-900 text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                                }`}
                            >
                                Client Ledger Logs
                            </button>
                            <button
                                onClick={() => setActiveTab("documents")}
                                className={`ml-2 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                                    activeTab === "documents"
                                        ? "bg-slate-900 text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                                }`}
                            >
                                Documents
                            </button>
                        </div>

                        {activeTab === "profile" ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50/50 p-5 rounded-2xl border border-slate-200/50 shadow-inner">
                                {/* Demographic Info */}
                                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 border-b pb-1.5 flex items-center gap-1.5">
                                        <User className="h-4 w-4 text-emerald-500" /> Demographic Information
                                    </h4>
                                    <div className="grid grid-cols-2 gap-y-2.5 text-xs font-semibold">
                                        <span className="text-slate-400">Date of Birth:</span>
                                        <span className="text-slate-800 text-right sm:text-left">{customerData.date_of_birth || "N/A"}</span>
                                        
                                        <span className="text-slate-400">Gender:</span>
                                        <span className="text-slate-800 text-right sm:text-left">
                                            {(() => {
                                                const genderVal = typeof customerData.gender === 'object' ? customerData.gender?.id : customerData.gender;
                                                const idNum = Number(genderVal);
                                                return metadata?.gender_list?.find((g: any) => g.id === idNum)?.label || 
                                                       (idNum === 1 ? "Male" : idNum === 2 ? "Female" : idNum === 3 ? "Other" : "Male");
                                            })()}
                                        </span>
                                        
                                        <span className="text-slate-400">Occupation:</span>
                                        <span className="text-slate-800 text-right sm:text-left">{customerData.occupation || "Customer"}</span>

                                        <span className="text-slate-400">Customer Type:</span>
                                        <span className="text-slate-800 text-right sm:text-left">
                                            {(() => {
                                                const ctVal = typeof customerData.customer_type === 'object' ? customerData.customer_type?.id : customerData.customer_type_id || customerData.customer_type;
                                                const idNum = Number(ctVal);
                                                return metadata?.customer_type_list?.find((ct: any) => ct.id === idNum)?.customer_type || 
                                                       (typeof customerData.customer_type === 'object' && customerData.customer_type?.customer_type) || "Standard";
                                            })()}
                                        </span>

                                        <span className="text-slate-400">Lead Source:</span>
                                        <span className="text-slate-800 text-right sm:text-left">
                                            {(() => {
                                                const sVal = typeof customerData.source === 'object' ? customerData.source?.id : customerData.source_id || customerData.source;
                                                const idNum = Number(sVal);
                                                return metadata?.source_list?.find((s: any) => s.id === idNum)?.source || 
                                                       (typeof customerData.source === 'object' && customerData.source?.source) || "Website";
                                            })()}
                                        </span>
                                    </div>
                                </div>

                                {/* Contact Details */}
                                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 border-b pb-1.5 flex items-center gap-1.5">
                                        <Globe className="h-4 w-4 text-emerald-500" /> Contact & Language
                                    </h4>
                                    <div className="grid grid-cols-2 gap-y-2.5 text-xs font-semibold">
                                        <span className="text-slate-400">WhatsApp No:</span>
                                        <span className="text-slate-800 text-right sm:text-left">{formatPhoneNumberForDisplay(customerData.whatsapp_number)}</span>
                                        
                                        <span className="text-slate-400">Email:</span>
                                        <span className="text-slate-800 text-right sm:text-left break-all">{customerData.email_address || "N/A"}</span>
                                        
                                        <span className="text-slate-400">Language:</span>
                                        <span className="text-slate-800 text-right sm:text-left">
                                            {(() => {
                                                const langVal = typeof customerData.preferred_language === 'object' ? customerData.preferred_language?.id : customerData.preferred_language_id || customerData.preferred_language;
                                                const idNum = Number(langVal);
                                                return metadata?.language_list?.find((l: any) => l.id === idNum)?.language || 
                                                       (typeof customerData.preferred_language === 'object' && customerData.preferred_language?.language) || "English";
                                            })()}
                                        </span>
                                    </div>
                                </div>

                                {/* Travel Permits */}
                                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 border-b pb-1.5 flex items-center gap-1.5">
                                        <Compass className="h-4 w-4 text-emerald-500" /> Passport & Visa
                                    </h4>
                                    <div className="grid grid-cols-2 gap-y-2.5 text-xs font-semibold">
                                        <span className="text-slate-400">Passport No:</span>
                                        <span className="text-slate-800 text-right sm:text-left">{customerData.passport_number || "N/A"}</span>
                                        
                                        <span className="text-slate-400">Passport Expiry:</span>
                                        <span className="text-slate-800 text-right sm:text-left">{customerData.passport_expiry_date || "N/A"}</span>
                                        
                                        <span className="text-slate-400">Origin Country:</span>
                                        <span className="text-slate-800 text-right sm:text-left">
                                            {(() => {
                                                const countryVal = typeof customerData.country === 'object' ? customerData.country?.id : customerData.country_id || customerData.country;
                                                const idNum = Number(countryVal);
                                                return metadata?.country_list?.find((c: any) => c.id === idNum)?.country || 
                                                       (typeof customerData.country === 'object' && customerData.country?.country) || "N/A";
                                            })()}
                                        </span>
                                        
                                        <span className="text-slate-400">Visa Type:</span>
                                        <span className="text-slate-800 text-right sm:text-left">
                                            {(() => {
                                                const visaVal = typeof customerData.visa_type === 'object' ? customerData.visa_type?.id : customerData.visa_type_id || customerData.visa_type;
                                                const idNum = Number(visaVal);
                                                return metadata?.visa_type_list?.find((v: any) => v.id === idNum)?.visa_type || 
                                                       (typeof customerData.visa_type === 'object' && customerData.visa_type?.visa_type) || "Tourist ETA";
                                            })()}
                                        </span>

                                        <span className="text-slate-400">Visa Expiry:</span>
                                        <span className="text-slate-800 text-right sm:text-left">{customerData.visa_expiry_date || "N/A"}</span>
                                    </div>
                                </div>

                                {/* Emergency Info */}
                                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 border-b pb-1.5 flex items-center gap-1.5">
                                        <PhoneCall className="h-4 w-4 text-emerald-500" /> Emergency Support
                                    </h4>
                                    <div className="grid grid-cols-2 gap-y-2.5 text-xs font-semibold">
                                        <span className="text-slate-400">Contact Name:</span>
                                        <span className="text-slate-800 text-right sm:text-left">{customerData.emergency_contact_name || "N/A"}</span>
                                        
                                        <span className="text-slate-400">Phone Number:</span>
                                        <span className="text-slate-800 text-right sm:text-left">{formatPhoneNumberForDisplay(customerData.emergency_contact_number)}</span>
                                    </div>
                                </div>

                                {/* Addresses Details (Full span) */}
                                <div className="space-y-3 md:col-span-2 bg-white p-4 rounded-xl border border-slate-100 shadow-sm pt-3">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 border-b pb-1.5 flex items-center gap-1.5">
                                        <Globe className="h-4 w-4 text-emerald-500" /> Addresses Details
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
                                        <div className="flex flex-col gap-1 p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl">
                                            <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Current Residing Address</span>
                                            <span className="text-slate-700 font-extrabold mt-0.5">{customerData.current_address || "N/A"}</span>
                                        </div>
                                        <div className="flex flex-col gap-1 p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl">
                                            <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Permanent Address (Origin Country)</span>
                                            <span className="text-slate-700 font-extrabold mt-0.5">{customerData.permanent_address || "N/A"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Internal Notes (Full span) */}
                                <div className="space-y-3 md:col-span-2 bg-white p-4 rounded-xl border border-slate-100 shadow-sm pt-3">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 border-b pb-1.5 flex items-center gap-1.5">
                                        <FileText className="h-4 w-4 text-emerald-500" /> Internal Travel Notes
                                    </h4>
                                    <div className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 whitespace-pre-line leading-relaxed">
                                        {customerData.notes || "No custom travel notes recorded."}
                                    </div>
                                </div>
                            </div>
                        ) : activeTab === "ledger" ? (
                            <div className="space-y-4">
                                {ledgerLoading ? (
                                    <div className="py-20 flex flex-col justify-center items-center gap-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                        <Loader2 className="h-7 w-7 animate-spin text-slate-600" />
                                        <span className="text-xs font-bold text-slate-500 animate-pulse">Syncing client ledger balances...</span>
                                    </div>
                                ) : ledgerData ? (
                                    <div className="space-y-4">
                                        {/* Ledger Balance Summary */}
                                        <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-lg">
                                            <div>
                                                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Statement of Account</div>
                                                <div className="text-lg font-black mt-0.5">{customerData.full_name}</div>
                                            </div>
                                            <div className="text-right">
                                                {Number(ledgerData.summary?.current_balance || 0) < 0 ? (
                                                    <span className="text-rose-400 font-black text-sm">
                                                        Outstanding: {formatCurrency(ledgerData.summary.current_balance)}
                                                    </span>
                                                ) : (
                                                    <span className="text-emerald-400 font-black text-sm">
                                                        Credit Balance: {formatCurrency(ledgerData.summary?.current_balance || 0)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Ledger Logs Table */}
                                        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                                            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b p-4 bg-slate-50/50">
                                                Ledger Entries ({ledgerData.items?.length || 0})
                                            </h4>
                                            {ledgerData.items?.length > 0 ? (
                                                <div className="overflow-x-auto max-h-[300px]">
                                                    <table className="w-full text-left text-xs font-semibold text-slate-600">
                                                        <thead className="bg-slate-50 border-b text-[10px] uppercase tracking-wider text-slate-500">
                                                            <tr>
                                                                <th className="p-3 pl-4">Date</th>
                                                                <th className="p-3">Reference / Description</th>
                                                                <th className="p-3">Transaction Type</th>
                                                                <th className="p-3 text-right pr-4">Amount</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {ledgerData.items.map((item: any) => {
                                                                const isDebit = Number(item.transaction_type) === 1;
                                                                return (
                                                                    <tr key={item.id} className="border-b hover:bg-slate-50/50">
                                                                        <td className="p-3 pl-4 text-slate-500">
                                                                            {new Date(item.created_at || item.transaction_date).toLocaleDateString()}
                                                                        </td>
                                                                        <td className="p-3 font-extrabold text-slate-800">
                                                                            {item.description || item.title || "Manual Ledger Entry"}
                                                                        </td>
                                                                        <td className="p-3">
                                                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase border ${
                                                                                isDebit 
                                                                                    ? "bg-rose-50 text-rose-700 border-rose-100" 
                                                                                    : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                                            }`}>
                                                                                {isDebit ? "Debit (Charge)" : "Credit (Payment)"}
                                                                            </span>
                                                                        </td>
                                                                        <td className={`p-3 text-right pr-4 font-black ${isDebit ? "text-rose-600" : "text-emerald-600"}`}>
                                                                            {isDebit ? "+" : "-"} {formatCurrency(item.amount)}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="text-center py-10 text-xs font-semibold text-slate-400">
                                                    No account entries matching criteria.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-xs font-semibold text-slate-400 bg-slate-50/50 border border-dashed rounded-2xl">
                                        Failed to load customer statement summary.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/50 shadow-inner">
                                <TouristDocumentsTab customerId={customerData.id || customerData.customer_id} />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-20 flex justify-center items-center">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
