"use client";

import * as React from "react";
import { useUser } from "@/context/user-context";
import { Loader2 } from "lucide-react";

export function DashboardGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useUser();

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                    <p className="text-sm font-semibold text-slate-500">Validating active session...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return <>{children}</>;
}
