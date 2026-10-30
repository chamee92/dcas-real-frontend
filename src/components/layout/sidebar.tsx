"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    FileText,
    BookOpen,
    Settings,
    LogOut,
    User,
    FileSpreadsheet,
    CheckSquare,
    Wallet,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { useUser } from "@/context/user-context";

export interface SidebarGroupChild {
    href: string;
    label: string;
}

export interface SidebarItemType {
    href?: string;
    icon: React.ElementType;
    label: string;
    isGroup?: boolean;
    children?: SidebarGroupChild[];
}

export const sidebarItems: SidebarItemType[] = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/customers", icon: Users, label: "Customers" },
    { href: "/quotations", icon: FileSpreadsheet, label: "Quotations" },
    { href: "/invoices", icon: FileText, label: "Invoice" },
    { href: "/ledger", icon: BookOpen, label: "Transactions" },
    { href: "/tasks", icon: CheckSquare, label: "Tasks" },
    { href: "/users", icon: User, label: "Users" },
    {
        label: "Ledgers",
        icon: Wallet,
        isGroup: true,
        children: [
            { href: "/ledger/company", label: "Company Ledger" },
            { href: "/ledger/customer", label: "Customer Ledger" },
        ],
    },
    { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
    const { user, logout } = useUser();
    const displayName = user?.full_name || "Admin User";
    const displayEmail = user?.email_address || "admin@aventureit.com";
    const displayInitial = displayName.charAt(0).toUpperCase();

    return (
        <aside className="hidden h-screen w-64 flex-col border-r bg-white p-4 md:flex">
            <div className="flex items-center gap-2 px-2 py-4">
                <NextImage
                    src="/logo.png"
                    alt="DCAS Logo"
                    width={180}
                    height={60}
                    className="h-10 w-auto object-contain"
                    priority
                />
            </div>

            <nav className="flex-1 space-y-2 py-6">
                {sidebarItems.map((item) => {
                    if (item.isGroup && item.children) {
                        return (
                            <SidebarGroupItem
                                key={item.label}
                                label={item.label}
                                icon={item.icon}
                                children={item.children}
                            />
                        );
                    }
                    return (
                        <SidebarItem
                            key={item.href}
                            href={item.href!}
                            icon={item.icon}
                            label={item.label}
                        />
                    );
                })}
            </nav>

            <div className="border-t pt-4">
                <div className="flex items-center gap-3 px-2 py-2 mb-2">
                    {user?.profile_picture ? (
                        <div className="h-8 w-8 rounded-full overflow-hidden relative border border-slate-100">
                            <NextImage
                                src={user.profile_picture}
                                alt={displayName}
                                fill
                                className="object-cover"
                            />
                        </div>
                    ) : (
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-700 border border-slate-200">
                            {displayInitial}
                        </div>
                    )}
                    <div className="flex flex-col overflow-hidden max-w-[150px]">
                        <span className="text-sm font-semibold text-slate-800 truncate">{displayName}</span>
                        <span className="text-xs text-slate-400 truncate">{displayEmail}</span>
                    </div>
                </div>
                <button 
                    onClick={logout}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                    <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                        <LogOut className="h-4 w-4" />
                    </div>
                    Log Out
                </button>
            </div>
        </aside>
    );
}


// Helper component for sidebar items
function SidebarItem({
    href,
    icon: Icon,
    label,
}: {
    href: string;
    icon: React.ElementType;
    label: string;
}) {
    const pathname = usePathname();
    const isActive = pathname === href || (href === "/customers" && pathname === "/tourists");

    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
                isActive ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "text-muted-foreground"
            )}
        >
            <Icon className="h-4 w-4" />
            {label}
        </Link>
    );
}

function SidebarGroupItem({
    label,
    icon: Icon,
    children,
}: {
    label: string;
    icon: React.ElementType;
    children: SidebarGroupChild[];
}) {
    const pathname = usePathname();
    const isChildActive = children.some((child) => pathname === child.href);
    const [isOpen, setIsOpen] = useState(isChildActive);

    useEffect(() => {
        if (isChildActive) {
            setIsOpen(true);
        }
    }, [pathname, isChildActive]);

    return (
        <div className="flex flex-col gap-1">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            >
                <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
            </button>
            
            {isOpen && (
                <div className="border-l border-slate-200 ml-5 pl-4 flex flex-col gap-1 my-1">
                    {children.map((child) => {
                        const isActive = pathname === child.href;
                        return (
                            <Link
                                key={child.href}
                                href={child.href}
                                className={cn(
                                    "block py-1.5 px-2 text-xs font-semibold rounded-md transition-colors",
                                    isActive 
                                        ? "text-primary bg-primary/5 font-bold" 
                                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                                )}
                            >
                                {child.label}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

