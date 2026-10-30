"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/context/user-context";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Camera, Loader2, CheckCircle2, AlertCircle, ShieldAlert, KeyRound, User, Settings2, ShieldCheck, UploadCloud } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatPhoneNumberForApi, validatePhoneNumber } from "@/lib/utils";

interface Service {
    id: string;
    name: string;
    category: string;
    price: number;
}

export default function SettingsPage() {
    const { user, refreshUser, refreshPermissions } = useUser();
    
    // --- Profile State ---
    const [fullName, setFullName] = useState("");
    const [nicNumber, setNicNumber] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [emailAddress, setEmailAddress] = useState("");
    const [currentAddress, setCurrentAddress] = useState("");
    const [permanentAddress, setPermanentAddress] = useState("");
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Photo upload
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);

    // Sync profile on user load
    useEffect(() => {
        if (user) {
            setFullName(user.full_name || "");
            setNicNumber(user.nic_number || "");
            setContactNumber(user.contact_number || user.phone || "");
            setEmailAddress(user.email_address || user.email || "");
            setCurrentAddress(user.current_address || "");
            setPermanentAddress(user.permanent_address || "");
            // Sync profile picture from user (only if we don't have a locally-updated one)
            const pic = user.profile_picture || user.profile_image_url || user.profile_image || null;
            if (pic) setProfilePicUrl(pic);
        }
    }, [user]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileMessage(null);

        const phoneErr = validatePhoneNumber(contactNumber, true, true);
        if (phoneErr) {
            setProfileMessage({ type: "error", text: phoneErr });
            return;
        }

        setIsSavingProfile(true);
        try {
            const payload = {
                user_id: user?.user_id || user?.id,
                role_id: Number(user?.role_id || user?.role?.id || 1),
                full_name: fullName,
                nic_number: nicNumber,
                contact_number: formatPhoneNumberForApi(contactNumber),
                profile_picture: profilePicUrl || user?.profile_picture || "",
                email_address: emailAddress,
                current_address: currentAddress,
                permanent_address: permanentAddress,
                push_id: user?.push_id || "none",
                os_type: 1
            };
            const res = await api.auth.manageUser(payload);
            if (res.success) {
                setProfileMessage({ type: "success", text: "Profile details updated successfully." });
                await refreshUser();
            } else {
                setProfileMessage({ type: "error", text: res.message || "Failed to update profile details." });
            }
        } catch (err: any) {
            setProfileMessage({ type: "error", text: err.message || "Something went wrong saving profile details." });
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleCropSuccess = async (croppedBlob: Blob) => {
        setIsUploadingPhoto(true);
        setProfileMessage(null);
        try {
            const formData = new FormData();
            formData.append("file", croppedBlob);
            formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "profile_upload");

            const cloudinaryRes = await fetch(
                `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "djcimiz1n"}/image/upload`,
                { method: "POST", body: formData }
            );

            if (!cloudinaryRes.ok) {
                const errorData = await cloudinaryRes.json();
                throw new Error(errorData.error?.message || "Failed to upload image to Cloudinary");
            }

            const data = await cloudinaryRes.json();
            const url = data.secure_url;

            // Save URL to backend
            const userId = user?.user_id || user?.id;
            if (userId) {
                const res = await api.auth.changeProfilePictureUrl({
                    user_id: userId,
                    profile_image_url: url,
                });
                if (!res.success) {
                    throw new Error(res.message || "Failed to update profile picture on server.");
                }
            }

            // Immediately show the new picture
            setProfilePicUrl(url);
            setProfileMessage({ type: "success", text: "Profile picture updated successfully." });
            await refreshUser();
        } catch (err: any) {
            setProfileMessage({ type: "error", text: "Image upload failed: " + err.message });
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    // --- Security / Password State ---
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [securityMessage, setSecurityMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setSecurityMessage({ type: "error", text: "New passwords do not match." });
            return;
        }
        setIsChangingPassword(true);
        setSecurityMessage(null);
        try {
            const payload = {
                current_password: currentPassword,
                new_password: newPassword,
                new_password_confirmation: confirmPassword
            };
            const res = await api.auth.changePassword(payload);
            if (res.success) {
                setSecurityMessage({ type: "success", text: "Password updated successfully." });
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                setSecurityMessage({ type: "error", text: res.message || "Failed to change password." });
            }
        } catch (err: any) {
            setSecurityMessage({ type: "error", text: err.message || "Something went wrong changing password." });
        } finally {
            setIsChangingPassword(false);
        }
    };

    // --- Roles & Permissions State ---
    const [roles, setRoles] = useState<any[]>([]);
    const [selectedRole, setSelectedRole] = useState<string>("");
    const [permissions, setPermissions] = useState<any[]>([]);
    const [isLoadingRoles, setIsLoadingRoles] = useState(false);
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
    const [permissionsSearch, setPermissionsSearch] = useState("");
    const [permissionStatuses, setPermissionStatuses] = useState<Record<number, number>>({});
    const [isSavingPermissions, setIsSavingPermissions] = useState(false);
    const [permissionsMessage, setPermissionsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Load active roles on mount
    useEffect(() => {
        async function loadRoles() {
            setIsLoadingRoles(true);
            try {
                const res = await api.roles.listRoles(1);
                if (res.success && res.data?.items) {
                    setRoles(res.data.items);
                    if (res.data.items.length > 0) {
                        setSelectedRole(String(res.data.items[0].id));
                    }
                }
            } catch (err) {
                console.error("Failed to load roles", err);
            } finally {
                setIsLoadingRoles(false);
            }
        }
        loadRoles();
    }, []);

    // Load permissions for selectedRole
    useEffect(() => {
        if (!selectedRole) return;

        async function loadPermissions() {
            setIsLoadingPermissions(true);
            setPermissionsMessage(null);
            try {
                const res = await api.roles.listPermissions(Number(selectedRole), permissionsSearch);
                if (res.success && res.data?.items) {
                    setPermissions(res.data.items);
                    // Map permissions state, converting string IDs and statuses to numbers
                    const statuses: Record<number, number> = {};
                    res.data.items.forEach((item: any) => {
                        const pId = Number(item.permission_id ?? item.id);
                        const pStatus = Number(item.status) === 1 ? 1 : 0;
                        statuses[pId] = pStatus;
                    });
                    setPermissionStatuses(statuses);
                }
            } catch (err) {
                console.error("Failed to load permissions", err);
            } finally {
                setIsLoadingPermissions(false);
            }
        }
        loadPermissions();
    }, [selectedRole, permissionsSearch]);

    const handleTogglePermission = async (permissionId: number | string) => {
        const pId = Number(permissionId);
        const currentStatus = Number(permissionStatuses[pId]) === 1 ? 1 : 0;
        const newStatus = currentStatus === 1 ? 0 : 1;

        // Optimistically update local state with numeric 1 or 0
        setPermissionStatuses(prev => ({
            ...prev,
            [pId]: newStatus
        }));

        try {
            const res = await api.roles.changePermission({
                role_id: Number(selectedRole),
                permission_id: pId,
                status: newStatus
            });

            if (res.success) {
                setPermissionsMessage({ type: "success", text: "Permission updated successfully." });
                if (Number(selectedRole) === Number(user?.role_id)) {
                    refreshPermissions();
                }
            } else {
                // Revert state if API returned success = false
                setPermissionStatuses(prev => ({
                    ...prev,
                    [pId]: currentStatus
                }));
                setPermissionsMessage({ type: "error", text: res.message || "Failed to update permission." });
            }
        } catch (err: any) {
            // Revert state on exception
            setPermissionStatuses(prev => ({
                ...prev,
                [pId]: currentStatus
            }));
            setPermissionsMessage({ type: "error", text: err.message || "Something went wrong updating permission." });
        }
    };

    const handleSavePermissions = async () => {
        setIsSavingPermissions(true);
        setPermissionsMessage(null);
        try {
            const items = Object.entries(permissionStatuses).map(([permId, status]) => ({
                permission_id: Number(permId),
                status: Number(status) === 1 ? 1 : 0
            }));

            const payload = {
                role_id: Number(selectedRole),
                items: items
            };

            const res = await api.roles.changePermissionBulk(payload);
            if (res.success) {
                setPermissionsMessage({ type: "success", text: "Role permissions saved successfully." });
                if (Number(selectedRole) === Number(user?.role_id)) {
                    refreshPermissions();
                }
                // Refresh list from API to ensure full sync
                const listRes = await api.roles.listPermissions(Number(selectedRole), permissionsSearch);
                if (listRes.success && listRes.data?.items) {
                    setPermissions(listRes.data.items);
                    const statuses: Record<number, number> = {};
                    listRes.data.items.forEach((item: any) => {
                        const pId = Number(item.permission_id ?? item.id);
                        const pStatus = Number(item.status) === 1 ? 1 : 0;
                        statuses[pId] = pStatus;
                    });
                    setPermissionStatuses(statuses);
                }
            } else {
                setPermissionsMessage({ type: "error", text: res.message || "Failed to save permissions." });
            }
        } catch (err: any) {
            setPermissionsMessage({ type: "error", text: err.message || "Something went wrong saving permissions." });
        } finally {
            setIsSavingPermissions(false);
        }
    };

    // Group permissions by type for premium visual classification
    const groupedPermissions = permissions.reduce<Record<string, any[]>>((acc, curr) => {
        const type = curr.permission_type || "General";
        if (!acc[type]) acc[type] = [];
        acc[type].push(curr);
        return acc;
    }, {});

    // --- Service Catalog State (Mock Playground) ---
    const [services, setServices] = useState<Service[]>([
        { id: "1", name: "Airport Transfer (Standard)", category: "Transport", price: 11150 },
        { id: "2", name: "Airport Transfer (Luxury)", category: "Transport", price: 18500 },
        { id: "3", name: "City Tour (Half Day)", category: "Tour", price: 15000 },
        { id: "4", name: "Hotel Booking Fee", category: "Service Fee", price: 2500 },
        { id: "5", name: "Travel Insurance", category: "Insurance", price: 4200 },
        { id: "6", name: "Visa Processing", category: "Administrative", price: 8500 }
    ]);
    const [newServiceName, setNewServiceName] = useState("");
    const [newServiceCategory, setNewServiceCategory] = useState("");
    const [newServicePrice, setNewServicePrice] = useState("");

    const handleAddService = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newServiceName || !newServiceCategory || !newServicePrice) return;
        const newService: Service = {
            id: Date.now().toString(),
            name: newServiceName,
            category: newServiceCategory,
            price: Number(newServicePrice)
        };
        setServices([newService, ...services]);
        setNewServiceName("");
        setNewServiceCategory("");
        setNewServicePrice("");
    };

    // Service Delete Confirmation State
    const [deleteServiceConfirmOpen, setDeleteServiceConfirmOpen] = useState(false);
    const [deleteServiceTargetId, setDeleteServiceTargetId] = useState<string | null>(null);
    const [deleteServiceTargetName, setDeleteServiceTargetName] = useState<string>("");

    const openDeleteServiceConfirm = (service: Service) => {
        setDeleteServiceTargetId(service.id);
        setDeleteServiceTargetName(service.name);
        setDeleteServiceConfirmOpen(true);
    };

    const handleDeleteServiceConfirm = () => {
        if (!deleteServiceTargetId) return;
        setServices(services.filter(s => s.id !== deleteServiceTargetId));
        setDeleteServiceConfirmOpen(false);
        setDeleteServiceTargetId(null);
        setDeleteServiceTargetName("");
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
                <div className="flex flex-col gap-1.5">
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Settings</h1>
                    <p className="text-sm text-gray-500">
                        Manage your user profile, role configurations, permissions registry, and service catalog.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="admin-profile" className="space-y-6">
                <TabsList className="bg-gray-100/80 p-1 border rounded-lg flex flex-wrap gap-1 h-auto w-full justify-start md:w-max">
                    <TabsTrigger value="admin-profile" className="flex items-center gap-2 py-2 px-3 text-xs md:text-sm font-medium">
                        <User className="h-4 w-4" />
                        Profile Details
                    </TabsTrigger>
                    <TabsTrigger value="roles-permissions" className="flex items-center gap-2 py-2 px-3 text-xs md:text-sm font-medium">
                        <ShieldCheck className="h-4 w-4" />
                        Roles & Permissions
                    </TabsTrigger>
                    <TabsTrigger value="service-catalog" className="flex items-center gap-2 py-2 px-3 text-xs md:text-sm font-medium">
                        <Settings2 className="h-4 w-4" />
                        Service Catalog
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2 py-2 px-3 text-xs md:text-sm font-medium">
                        <KeyRound className="h-4 w-4" />
                        Security
                    </TabsTrigger>
                </TabsList>

                {/* --- 1. PROFILE TAB --- */}
                <TabsContent value="admin-profile">
                    <Card className="border-gray-200/80 shadow-md overflow-hidden bg-white/70 backdrop-blur-md">
                        <CardHeader className="bg-gray-50/50 border-b py-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-lg font-bold text-gray-900">Personal & Profile Details</CardTitle>
                                    <CardDescription>Update your personal information and profile credentials.</CardDescription>
                                </div>
                                {user?.role && (
                                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 rounded-full px-3 py-1 text-xs font-bold text-emerald-700 shadow-xs w-fit">
                                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                        <span>Role: {user.role}</span>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            {profileMessage && (
                                <div className={`p-4 rounded-lg flex items-start gap-3 border ${
                                    profileMessage.type === "success" 
                                        ? "bg-green-50 border-green-200 text-green-800" 
                                        : "bg-red-50 border-red-200 text-red-800"
                                }`}>
                                    {profileMessage.type === "success" ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                    )}
                                    <span className="text-sm font-medium">{profileMessage.text}</span>
                                </div>
                            )}

                            {/* Avatar Uploader */}
                            <div className="flex flex-col sm:flex-row items-center gap-5 border-b pb-6">
                                <div
                                    className="relative group cursor-pointer"
                                    onClick={() => setCropDialogOpen(true)}
                                >
                                    <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center">
                                        {profilePicUrl ? (
                                            <img
                                                src={profilePicUrl}
                                                alt={user?.full_name || "Profile"}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center bg-linear-to-tr from-gray-700 to-gray-900 text-white text-3xl font-extrabold">
                                                {fullName ? fullName.charAt(0).toUpperCase() : "A"}
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <Camera className="h-6 w-6 text-white" />
                                    </div>
                                    {isUploadingPhoto && (
                                        <div className="absolute inset-0 bg-black/75 rounded-full flex items-center justify-center">
                                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <div className="text-center sm:text-left space-y-1">
                                    <h3 className="font-bold text-gray-900 text-base">Profile Photograph</h3>
                                    <p className="text-xs text-gray-500">Supports JPG, PNG or WebP. Click the photo or button to change.</p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="mt-2 text-xs"
                                        onClick={() => setCropDialogOpen(true)}
                                        disabled={isUploadingPhoto}
                                    >
                                        {isUploadingPhoto ? (
                                            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Uploading...</>
                                        ) : (
                                            <><UploadCloud className="h-3.5 w-3.5 mr-1" /> Upload Photo</>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Info Form */}
                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="fullname" className="text-sm font-semibold text-gray-700">Full Name *</Label>
                                        <Input
                                            id="fullname"
                                            value={fullName}
                                            onChange={e => setFullName(e.target.value)}
                                            placeholder="Enter your full name"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="nic_number" className="text-sm font-semibold text-gray-700">NIC / Passport Number *</Label>
                                        <Input
                                            id="nic_number"
                                            value={nicNumber}
                                            onChange={e => setNicNumber(e.target.value)}
                                            placeholder="e.g. 920970834V or N1234567"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">Phone Number *</Label>
                                        <Input
                                            id="phone"
                                            value={contactNumber}
                                            onChange={e => setContactNumber(e.target.value)}
                                            placeholder="e.g. 0771234567 or +94771234567"
                                            maxLength={20}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address *</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={emailAddress}
                                            onChange={e => setEmailAddress(e.target.value)}
                                            placeholder="e.g. name@company.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="current_address" className="text-sm font-semibold text-gray-700">Current Address</Label>
                                        <Input
                                            id="current_address"
                                            value={currentAddress}
                                            onChange={e => setCurrentAddress(e.target.value)}
                                            placeholder="Enter your current address"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="permanent_address" className="text-sm font-semibold text-gray-700">Permanent Address</Label>
                                        <Input
                                            id="permanent_address"
                                            value={permanentAddress}
                                            onChange={e => setPermanentAddress(e.target.value)}
                                            placeholder="Enter your permanent address"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t">
                                    <Button
                                        type="submit"
                                        className="bg-black hover:bg-black/90 text-white min-w-[120px] transition-all duration-200"
                                        disabled={isSavingProfile}
                                    >
                                        {isSavingProfile ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            "Save Details"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- 2. ROLES & PERMISSIONS TAB --- */}
                <TabsContent value="roles-permissions">
                    <Card className="border-gray-200/80 shadow-md bg-white/70 backdrop-blur-md">
                        <CardHeader className="bg-gray-50/50 border-b py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <CardTitle className="text-lg font-bold text-gray-900">Roles & Permissions</CardTitle>
                                <CardDescription>Modify authorization capabilities and granular API permissions across roles.</CardDescription>
                            </div>
                            <div className="flex items-center gap-3">
                                {isLoadingRoles ? (
                                    <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                                ) : (
                                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                                        <SelectTrigger className="w-[180px] bg-white">
                                            <SelectValue placeholder="Select user role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map(r => (
                                                <SelectItem key={r.id} value={String(r.id)}>
                                                    {r.role}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            {permissionsMessage && (
                                <div className={`p-4 rounded-lg flex items-start gap-3 border ${
                                    permissionsMessage.type === "success" 
                                        ? "bg-green-50 border-green-200 text-green-800" 
                                        : "bg-red-50 border-red-200 text-red-800"
                                }`}>
                                    {permissionsMessage.type === "success" ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                    )}
                                    <span className="text-sm font-medium">{permissionsMessage.text}</span>
                                </div>
                            )}

                            {/* Search Filter */}
                            <div className="flex justify-between items-center gap-4">
                                <Input
                                    placeholder="Filter permission keys..."
                                    value={permissionsSearch}
                                    onChange={e => setPermissionsSearch(e.target.value)}
                                    className="max-w-xs bg-white"
                                />
                                <Button
                                    onClick={handleSavePermissions}
                                    disabled={isSavingPermissions || isLoadingPermissions || permissions.length === 0}
                                    className="bg-black hover:bg-black/90 text-white transition-all duration-200"
                                >
                                    {isSavingPermissions ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving Changes...
                                        </>
                                    ) : (
                                        "Save Permissions"
                                    )}
                                </Button>
                            </div>

                            {/* Permissions Registry Table */}
                            {isLoadingPermissions ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="h-10 w-10 animate-spin text-black" />
                                    <span className="text-sm font-medium text-gray-500">Querying permissions catalog...</span>
                                </div>
                            ) : permissions.length === 0 ? (
                                <div className="text-center py-16 border rounded-lg border-dashed bg-gray-50/50">
                                    <ShieldAlert className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                                    <h3 className="font-bold text-gray-900 text-base">No Permissions Found</h3>
                                    <p className="text-xs text-gray-500 mt-1">Try resetting the filter search term or role selection.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {Object.entries(groupedPermissions).map(([type, items]) => (
                                        <div key={type} className="rounded-lg border overflow-hidden shadow-sm bg-white">
                                            <div className="bg-gray-100/80 px-4 py-2.5 border-b flex items-center justify-between">
                                                <h3 className="font-bold text-gray-800 text-sm tracking-wide uppercase">{type} Module Actions</h3>
                                                <span className="bg-black/10 text-black text-xs font-semibold px-2 py-0.5 rounded-full">
                                                    {items.length} Options
                                                </span>
                                            </div>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-1/2">Permission Item</TableHead>
                                                        <TableHead>System Endpoint Name</TableHead>
                                                        <TableHead className="text-right">Authorized Status</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {items.map((perm) => {
                                                        const pId = Number(perm.permission_id ?? perm.id);
                                                        const isChecked = Number(permissionStatuses[pId]) === 1;
                                                        return (
                                                            <TableRow key={pId} className="hover:bg-gray-50/50 transition-colors">
                                                                <TableCell className="font-semibold text-gray-900">{perm.permission}</TableCell>
                                                                <TableCell>
                                                                    <code className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">
                                                                        {perm.permission.toLowerCase().replace(/\s+/g, "_")}
                                                                    </code>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleTogglePermission(pId)}
                                                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                                            isChecked ? "bg-green-600" : "bg-gray-200"
                                                                        }`}
                                                                    >
                                                                        <span
                                                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                                                isChecked ? "translate-x-5" : "translate-x-0"
                                                                            }`}
                                                                        />
                                                                    </button>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- 3. SERVICE CATALOG TAB --- */}
                <TabsContent value="service-catalog" className="space-y-6">
                    {/* Add New Service Card */}
                    <Card className="border-gray-200/80 shadow-md bg-white/70 backdrop-blur-md">
                        <CardHeader className="bg-gray-50/50 border-b py-4">
                            <CardTitle className="text-lg font-bold text-gray-900">Add New Service</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleAddService} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                <div className="md:col-span-4 space-y-2">
                                    <Label className="text-sm font-semibold text-gray-700">Name</Label>
                                    <Input
                                        placeholder="e.g. City Tour (Luxury Coach)"
                                        value={newServiceName}
                                        onChange={e => setNewServiceName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="md:col-span-4 space-y-2">
                                    <Label className="text-sm font-semibold text-gray-700">Category</Label>
                                    <Select value={newServiceCategory} onValueChange={setNewServiceCategory} required>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Tour">Tour</SelectItem>
                                            <SelectItem value="Transport">Transport</SelectItem>
                                            <SelectItem value="Accommodation">Accommodation</SelectItem>
                                            <SelectItem value="Service Fee">Service Fee</SelectItem>
                                            <SelectItem value="Insurance">Insurance</SelectItem>
                                            <SelectItem value="Administrative">Administrative</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="md:col-span-3 space-y-2">
                                    <Label className="text-sm font-semibold text-gray-700">Default Price (LKR)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={newServicePrice}
                                        onChange={e => setNewServicePrice(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <Button type="submit" className="w-full bg-black text-white hover:bg-black/90">
                                        <Plus className="mr-2 h-4 w-4 md:hidden" />
                                        <span className="hidden md:inline">+ Add</span>
                                        <span className="md:hidden">Add</span>
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Existing Services Card */}
                    <Card className="border-gray-200/80 shadow-md bg-white/70 backdrop-blur-md">
                        <CardHeader className="bg-gray-50/50 border-b py-4">
                            <CardTitle className="text-lg font-bold text-gray-900">Existing Services</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="rounded-md border bg-white overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-gray-50">
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Default Price</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {services.map(service => (
                                            <TableRow key={service.id} className="hover:bg-gray-50/50 transition-colors">
                                                <TableCell className="font-semibold text-gray-900">{service.name}</TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                                        {service.category}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="font-mono font-medium text-gray-700">
                                                    LKR {service.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openDeleteServiceConfirm(service)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- 4. SECURITY TAB --- */}
                <TabsContent value="security">
                    <Card className="border-gray-200/80 shadow-md bg-white/70 backdrop-blur-md">
                        <CardHeader className="bg-gray-50/50 border-b py-4">
                            <CardTitle className="text-lg font-bold text-gray-900">Change password</CardTitle>
                            <CardDescription>Update your system login credentials to secure your workspace.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            {securityMessage && (
                                <div className={`p-4 rounded-lg flex items-start gap-3 border ${
                                    securityMessage.type === "success" 
                                        ? "bg-green-50 border-green-200 text-green-800" 
                                        : "bg-red-50 border-red-200 text-red-800"
                                }`}>
                                    {securityMessage.type === "success" ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                    )}
                                    <span className="text-sm font-medium">{securityMessage.text}</span>
                                </div>
                            )}

                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="current-password" className="text-sm font-semibold text-gray-700">Current Password *</Label>
                                    <PasswordInput
                                        id="current-password"
                                        placeholder="Enter your current password"
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="new-password" className="text-sm font-semibold text-gray-700">New Password *</Label>
                                    <PasswordInput
                                        id="new-password"
                                        placeholder="Create a new password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="confirm-password" className="text-sm font-semibold text-gray-700">Re-Enter New Password *</Label>
                                    <PasswordInput
                                        id="confirm-password"
                                        placeholder="Confirm your new password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="flex justify-end pt-4 border-t">
                                    <Button
                                        type="submit"
                                        disabled={isChangingPassword}
                                        className="bg-black hover:bg-black/90 text-white min-w-[120px] transition-all duration-200"
                                    >
                                        {isChangingPassword ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Changing...
                                            </>
                                        ) : (
                                            "Change Password"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            <ImageCropDialog
                isOpen={cropDialogOpen}
                onOpenChange={setCropDialogOpen}
                currentImageUrl={profilePicUrl || ""}
                onCropSuccess={handleCropSuccess}
            />

            {/* Service Delete Confirmation Dialog */}
            <ConfirmDialog
                open={deleteServiceConfirmOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleteServiceConfirmOpen(false);
                        setDeleteServiceTargetId(null);
                        setDeleteServiceTargetName("");
                    }
                }}
                title="Delete Service?"
                description={`Service "${deleteServiceTargetName}" will be permanently removed from the catalog. Are you sure you want to continue?`}
                confirmLabel="Delete Service"
                cancelLabel="Cancel"
                variant="danger"
                onConfirm={handleDeleteServiceConfirm}
            />
        </div>
    );
}
