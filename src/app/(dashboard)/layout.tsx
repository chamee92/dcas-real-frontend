import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { DashboardGuard } from "@/components/layout/dashboard-guard";

export const metadata: Metadata = {
    title: "Dashboard - Tourism Company",
    description: "Overview of your agency's financial health and performance.",
};

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <DashboardGuard>
            <div className="flex w-full h-screen bg-gray-50/50">
                <Sidebar />
                <div className="flex flex-col flex-1 h-screen overflow-hidden">
                    <MobileSidebar />
                    <main className="flex-1 overflow-y-auto p-4 md:p-8">
                        {children}
                    </main>
                </div>
            </div>
        </DashboardGuard>
    );
}
