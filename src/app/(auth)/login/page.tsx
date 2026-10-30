"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useUser } from "@/context/user-context";
import { PasswordManagerDialog } from "@/components/auth/password-manager-dialog";

export default function LoginPage() {
    const { login } = useUser();
    const [showPassword, setShowPassword] = useState(false);
    const [loadingState, setLoadingState] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    
    // Login form fields
    const [loginUsername, setLoginUsername] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);

    // Load saved credentials if Remember me was previously enabled
    useEffect(() => {
        try {
            const saved = localStorage.getItem("tourism_remember_user");
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.username) setLoginUsername(parsed.username);
                if (parsed.password) setLoginPassword(parsed.password);
                setRememberMe(true);
            }
        } catch (e) {
            console.error("Failed to load remembered credentials", e);
        }
    }, []);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginUsername || !loginPassword) {
            setErrorMsg("Username and password are required.");
            return;
        }
        
        setErrorMsg("");
        setLoadingState(true);
        try {
            await login({
                user_name: loginUsername,
                password: loginPassword,
                os_type: 1,
                push_id: "web_admin_token"
            });

            // Save or clear credentials based on Remember me checkbox
            if (rememberMe) {
                localStorage.setItem("tourism_remember_user", JSON.stringify({
                    username: loginUsername,
                    password: loginPassword
                }));
            } else {
                localStorage.removeItem("tourism_remember_user");
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to log in. Please check your credentials.");
        } finally {
            setLoadingState(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50/50 p-4">
            <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col lg:flex-row min-h-[650px] border border-gray-100">
                {/* Left Side - Image Panel */}
                <div className="hidden lg:block relative w-1/2 bg-slate-900">
                    <Image
                        src="/container.png"
                        alt="Sri Lanka Tourism"
                        fill
                        className="object-cover opacity-90 transition-transform duration-700 hover:scale-105"
                        priority
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-12 text-white">
                        <h2 className="text-3xl font-extrabold tracking-tight mb-2">Welcome Ceylon</h2>
                        <p className="text-sm text-slate-200/90 font-medium max-w-md">
                            Experience real-time travel management, invoicing, quotations, and financial tracking in one streamlined portal.
                        </p>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 py-12 overflow-y-auto">
                    <div className="mx-auto w-full max-w-md space-y-6">
                        {/* Logo Header */}
                        <div className="flex flex-col items-center space-y-2 text-center">
                            <div className="relative w-44 h-14 mb-2">
                                <Image
                                    src="/logo.png"
                                    alt="DCAS Logo"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                    Welcome back
                                </h1>
                                <p className="text-sm text-slate-500">
                                    Sign in to your manager session
                                </p>
                            </div>
                        </div>

                        {/* Error Banner */}
                        {errorMsg && (
                            <div className="p-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg text-center animate-fade-in">
                                {errorMsg}
                            </div>
                        )}

                        {/* LOGIN FORM */}
                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label htmlFor="login-username" className="text-xs font-semibold text-slate-700">
                                    Username *
                                </label>
                                <Input
                                    id="login-username"
                                    type="text"
                                    placeholder="e.g. chamika92"
                                    value={loginUsername}
                                    onChange={(e) => setLoginUsername(e.target.value)}
                                    className="h-10 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 rounded-lg bg-slate-50/50"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="login-password" className="text-xs font-semibold text-slate-700">
                                    Password *
                                </label>
                                <div className="relative">
                                    <Input
                                        id="login-password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        className="h-10 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 rounded-lg pr-10 bg-slate-50/50"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-1">
                                <div className="flex items-center space-x-2">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            id="remember"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="peer h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 appearance-none bg-white border checked:bg-emerald-600 checked:border-emerald-600 transition-all cursor-pointer"
                                        />
                                        <Check className="absolute left-0.5 top-0.5 h-3 w-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                                    </div>
                                    <label htmlFor="remember" className="text-xs text-slate-600 cursor-pointer select-none font-medium">
                                        Remember me
                                    </label>
                                </div>
                                <PasswordManagerDialog />
                            </div>

                            <Button
                                type="submit"
                                disabled={loadingState}
                                className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-emerald-600/10 flex justify-center items-center gap-2 cursor-pointer"
                            >
                                {loadingState ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" /> Logging in...
                                    </>
                                ) : (
                                    "Log In"
                                )}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
