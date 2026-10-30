"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";

interface IncomeExpensesChartProps {
    items?: any[];
    loading?: boolean;
}

const MONTH_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

interface CustomTooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        // Explicitly sort so Income is always first (top) and Expenses is second (bottom)
        const sorted = [...payload].sort((a, b) => {
            const aKey = a.dataKey || a.name;
            const bKey = b.dataKey || b.name;
            if (aKey === "income" || aKey === "Income") return -1;
            if (bKey === "income" || bKey === "Income") return 1;
            return 0;
        });

        return (
            <div className="bg-slate-900 border border-slate-800 text-white px-3.5 py-2.5 rounded-xl shadow-2xl min-w-[190px]">
                <p className="font-bold text-xs text-slate-200 pb-1 border-b border-slate-800/80 mb-2">
                    {label}
                </p>
                <div className="flex flex-col gap-1.5">
                    {sorted.map((entry, idx) => {
                        const isIncome = entry.dataKey === "income" || entry.name === "Income";
                        const labelName = isIncome ? "Income" : "Expenses";
                        const dotColor = isIncome ? "#10b981" : "#f97316";
                        const val = (Number(entry.value) || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        });

                        return (
                            <div key={idx} className="flex items-center justify-between gap-3 text-xs font-semibold">
                                <div className="flex items-center gap-1.5">
                                    <span
                                        className="w-2 h-2 rounded-full inline-block"
                                        style={{ backgroundColor: dotColor }}
                                    />
                                    <span className="text-slate-300">{labelName} :</span>
                                </div>
                                <span className="font-extrabold text-white">
                                    LKR {val}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return null;
};

export function IncomeExpensesChart({ items: initialItems, loading: initialLoading = false }: IncomeExpensesChartProps) {
    const [fetchedItems, setFetchedItems] = useState<any[]>([]);
    const [fetching, setFetching] = useState<boolean>(false);

    useEffect(() => {
        if (!initialItems || initialItems.length === 0) {
            let isMounted = true;
            setFetching(true);
            api.transactions.getCompanyLedger({ per_page: 500 })
                .then((res) => {
                    if (isMounted && res?.success && res?.data) {
                        const rawItems = res.data.items || res.data.data || (Array.isArray(res.data) ? res.data : []);
                        setFetchedItems(rawItems);
                    }
                })
                .catch((err) => {
                    console.error("Error fetching company ledger for chart:", err);
                })
                .finally(() => {
                    if (isMounted) setFetching(false);
                });
            return () => {
                isMounted = false;
            };
        }
    }, [initialItems]);

    const itemsToUse = initialItems && initialItems.length > 0 ? initialItems : fetchedItems;
    const isLoading = initialLoading || (fetching && (!initialItems || initialItems.length === 0));

    const chartData = useMemo(() => {
        const monthlyMap: Record<number, { income: number; expenses: number }> = {};
        for (let i = 0; i < 12; i++) {
            monthlyMap[i] = { income: 0, expenses: 0 };
        }

        if (Array.isArray(itemsToUse)) {
            itemsToUse.forEach((item) => {
                const dateStr = item.transaction_date || item.created_at;
                if (!dateStr) return;

                const date = new Date(dateStr);
                if (isNaN(date.getTime())) return;

                const monthIdx = date.getMonth();
                const amount = parseFloat(item.amount) || 0;
                const type = Number(item.transaction_type);

                if (type === 1) {
                    // Income (transaction_type === 1)
                    monthlyMap[monthIdx].income += amount;
                } else if (type === 2) {
                    // Expense (transaction_type === 2)
                    monthlyMap[monthIdx].expenses += amount;
                }
            });
        }

        return MONTH_NAMES.map((name, index) => ({
            name,
            income: Math.round(monthlyMap[index].income * 100) / 100,
            expenses: Math.round(monthlyMap[index].expenses * 100) / 100,
        }));
    }, [itemsToUse]);

    if (isLoading) {
        return (
            <div className="flex h-[400px] w-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{
                        top: 10,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#94a3b8"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => {
                            if (value === 0) return "LKR 0k";
                            if (value >= 1000000) return `LKR ${(value / 1000000).toFixed(1)}M`;
                            if (value >= 1000) return `LKR ${Math.round(value / 1000)}k`;
                            return `LKR ${value}`;
                        }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                    />
                    <Line
                        type="monotone"
                        dataKey="income"
                        name="Income"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="expenses"
                        name="Expenses"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
