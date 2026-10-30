"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Compass, Loader2 } from "lucide-react";
import { IncomeExpensesChart } from "@/components/dashboard/income-chart";
import { api } from "@/lib/api-client";

export default function DashboardPage() {
    const [stats, setStats] = useState({
        netProfit: 0,
        totalCustomers: 0,
        activeCustomers: 0
    });
    const [ledgerItems, setLedgerItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardStats = async () => {
            setLoading(true);
            try {
                const [ledgerRes, customersRes] = await Promise.all([
                    api.transactions.getCompanyLedger({ per_page: 500 }),
                    api.customers.list({ per_page: 100 })
                ]);

                let profit = 0;
                if (ledgerRes.success && ledgerRes.data) {
                    const rawItems = ledgerRes.data.items || ledgerRes.data.data || (Array.isArray(ledgerRes.data) ? ledgerRes.data : []);
                    setLedgerItems(rawItems);

                    let totalIncome = Number(ledgerRes.data.total_income || 0);
                    let totalExpenses = Number(ledgerRes.data.total_expense || 0);

                    if (totalIncome === 0 && totalExpenses === 0 && rawItems.length > 0) {
                        rawItems.forEach((item: any) => {
                            const amt = parseFloat(item.amount) || 0;
                            const type = Number(item.transaction_type);
                            if (type === 1) totalIncome += amt;
                            else if (type === 2) totalExpenses += amt;
                        });
                    }

                    if (ledgerRes.data.summary?.current_balance !== undefined) {
                        profit = Number(ledgerRes.data.summary.current_balance);
                    } else {
                        profit = totalIncome - totalExpenses;
                    }
                }

                let total = 0;
                let active = 0;
                if (customersRes.success && customersRes.data) {
                    let items = [];
                    const rawData = customersRes.data;
                    const candidates = [
                        rawData,
                        rawData.customer_list,
                        rawData.items,
                        rawData.data,
                        rawData.customers
                    ];

                    for (const cand of candidates) {
                        if (Array.isArray(cand)) {
                            items = cand;
                            break;
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
                    total = normalized.length;
                    active = normalized.filter((item: any) => Number(item.status) === 1).length;
                }

                setStats({
                    netProfit: profit,
                    totalCustomers: total,
                    activeCustomers: active
                });
            } catch (error) {
                console.error("Failed to load dashboard metrics", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardStats();
    }, []);

    const formatCurrency = (amount: number) => {
        return `LKR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                    <p className="text-sm font-semibold text-slate-500">Loading dynamic workspace telemetry...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
                <p className="text-sm text-slate-500 font-medium">
                    Overview of your agency's financial health, customer registrations, and performance.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-slate-200/80 shadow-sm bg-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Net Profit</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-black ${stats.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {stats.netProfit >= 0 ? "+" : "-"} {formatCurrency(Math.abs(stats.netProfit))}
                        </div>
                        <p className="text-xs text-slate-400 pt-1 font-medium">
                            Real-time corporate cashflow
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200/80 shadow-sm bg-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Customers</CardTitle>
                        <Compass className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-slate-800">{stats.totalCustomers}</div>
                        <p className="text-xs text-slate-400 pt-1 font-medium">
                            Registered clients in directory
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200/80 shadow-sm bg-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Customers</CardTitle>
                        <Users className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-slate-800">{stats.activeCustomers}</div>
                        <p className="text-xs text-slate-400 pt-1 font-medium">
                            Clients actively exploring trips
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-1">
                <Card className="border-slate-200/80 shadow-sm bg-white">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-slate-900">Income vs Expenses Chart</CardTitle>
                        <p className="text-xs text-slate-400 font-medium">Historical Cash Flow & Performance Overview</p>
                    </CardHeader>
                    <CardContent>
                        <IncomeExpensesChart items={ledgerItems} loading={loading} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
