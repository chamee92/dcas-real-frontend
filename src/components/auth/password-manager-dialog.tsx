"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, KeyRound } from "lucide-react";
import { api } from "@/lib/api-client";

export function PasswordManagerDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    
    // Form states
    const [username, setUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const resetState = () => {
        setErrorMsg("");
        setSuccessMsg("");
        setUsername("");
        setNewPassword("");
        setConfirmPassword("");
    };

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            resetState();
        }
    };

    const validateUser = async () => {
        if (!username) {
            setErrorMsg("Username is required.");
            return null;
        }
        
        try {
            const res = await api.auth.validateUsername(username);
            if (res.success && res.data) {
                return res.data.user_id || res.data.id || res.data.customer_id;
            } else {
                throw new Error("Invalid username.");
            }
        } catch (e: any) {
            setErrorMsg(e.message || "Failed to validate username.");
            return null;
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");
        setSuccessMsg("");
        
        if (newPassword !== confirmPassword) {
            setErrorMsg("Passwords do not match.");
            return;
        }
        
        setLoading(true);
        try {
            const userId = await validateUser();
            if (!userId) {
                setLoading(false);
                return;
            }

            const res = await api.auth.resetPassword({
                user_id: Number(userId),
                new_password: newPassword,
                new_password_confirmation: confirmPassword
            }, Number(userId)); // pass authUserId as well just in case

            if (res.success) {
                setSuccessMsg("Password reset successfully. You can now log in.");
                setUsername("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                throw new Error(res.message || "Failed to reset password.");
            }
        } catch (e: any) {
            setErrorMsg(e.message || "An error occurred while resetting the password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <button
                    type="button"
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                    Forgot password?
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5 text-emerald-600" />
                        Reset Password
                    </DialogTitle>
                    <DialogDescription>
                        Enter your username and new password to reset your account access.
                    </DialogDescription>
                </DialogHeader>

                {errorMsg && (
                    <div className="p-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg text-center">
                        {errorMsg}
                    </div>
                )}
                {successMsg && (
                    <div className="p-3 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg text-center">
                        {successMsg}
                    </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4 mt-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Username *</label>
                        <Input
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="h-9 text-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">New Password *</label>
                        <Input
                            type="password"
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            className="h-9 text-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Confirm New Password *</label>
                        <Input
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="h-9 text-sm"
                        />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-9 bg-emerald-600 hover:bg-emerald-500">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Reset Password
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
