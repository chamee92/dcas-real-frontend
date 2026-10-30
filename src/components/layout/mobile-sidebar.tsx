"use client";

import { useState, useEffect } from "react";
import { Menu, X, LogOut, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

import { sidebarItems } from "./sidebar";
import Link from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Since we don't have a Sheet component in ui folder (checked earlier), 
// I will implement a custom simple drawer here to avoid dependency hell for now.

import { useUser } from "@/context/user-context";

export function MobileSidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const { user, logout } = useUser();

    const displayName = user?.full_name || "Admin User";
    const displayEmail = user?.email_address || "admin@aventureit.com";
    const displayInitial = displayName.charAt(0).toUpperCase();

    const handleLogout = async () => {
        setIsOpen(false);
        await logout();
    };

    return (
        <div className="md:hidden flex items-center p-4 bg-white border-b">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
                <Menu className="h-6 w-6" />
            </Button>
            <div className="ml-2">
                <NextImage
                    src="/logo.png"
                    alt="DCAS Logo"
                    width={120}
                    height={40}
                    className="h-8 w-auto object-contain"
                    priority
                />
            </div>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 transition-opacity"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Drawer */}
                    <div className="relative flex w-64 flex-col bg-white p-4 shadow-xl animate-in slide-in-from-left duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <NextImage
                                    src="/logo.png"
                                    alt="DCAS Logo"
                                    width={120}
                                    height={40}
                                    className="h-8 w-auto object-contain"
                                    priority
                                />
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <nav className="flex-1 space-y-2">
                            {sidebarItems.map((item) => {
                                if (item.isGroup && item.children) {
                                    return (
                                        <MobileSidebarGroupItem
                                            key={item.label}
                                            label={item.label}
                                            icon={item.icon}
                                            children={item.children}
                                            onClose={() => setIsOpen(false)}
                                        />
                                    );
                                }
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href!}
                                        onClick={() => setIsOpen(false)}
                                        className={cn(
                                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
                                            pathname === item.href ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                                        )}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="border-t pt-4 mt-auto">
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
                                onClick={handleLogout}
                                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                                <LogOut className="h-4 w-4" />
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
function MobileSidebarGroupItem({
    label,
    icon: Icon,
    children,
    onClose,
}: {
    label: string;
    icon: React.ElementType;
    children: any[];
    onClose: () => void;
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
                                onClick={onClose}
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
