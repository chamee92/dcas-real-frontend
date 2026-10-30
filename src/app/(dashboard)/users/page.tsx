"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Plus,
    Search,
    Loader2,
    User,
    Mail,
    Phone,
    Shield,
    Image as ImageIcon,
    Eye,
    Edit3,
    Globe,
    UploadCloud,
    Trash2,
    Power,
    AlertTriangle
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { api } from "@/lib/api-client"
import NextImage from "next/image"
import { ImageCropDialog } from "@/components/ui/image-crop-dialog"
import { useUser } from "@/context/user-context"
import { formatPhoneNumberForApi, formatPhoneNumberForDisplay, validatePhoneNumber } from "@/lib/utils"

function UserAvatar({
    src,
    name,
    className = "h-9 w-9",
    textClass = "text-xs",
    borderClass = "border border-slate-200 shadow-sm"
}: {
    src?: string
    name: string
    className?: string
    textClass?: string
    borderClass?: string
}) {
    const [imgError, setImgError] = useState(false)

    if (!src || imgError) {
        return (
            <div className={`${className} rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 ${textClass} ${borderClass} shrink-0`}>
                {name?.charAt(0)?.toUpperCase() || "U"}
            </div>
        )
    }

    return (
        <div className={`${className} rounded-full overflow-hidden ${borderClass} relative shrink-0`}>
            <NextImage
                src={src}
                alt={name || "User"}
                fill
                unoptimized
                className="object-cover"
                onError={() => setImgError(true)}
            />
        </div>
    )
}

export default function UsersPage() {
    const { user: loggedInUser, hasPermission, refreshUser } = useUser()
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    const [roleIdFilter, setRoleIdFilter] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [roles, setRoles] = useState<any[]>([])

    // Status Confirmation State
    const [statusConfirmOpen, setStatusConfirmOpen] = useState(false)
    const [statusTargetUser, setStatusTargetUser] = useState<any | null>(null)
    const [statusLoading, setStatusLoading] = useState(false)

    // Delete Confirmation State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [deleteTargetUser, setDeleteTargetUser] = useState<any | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    // Local Storage Overrides for Deactivated & Deleted Users
    const [deletedUserIds, setDeletedUserIds] = useState<number[]>([])
    const [statusOverrides, setStatusOverrides] = useState<Record<number, number>>({})

    // Modal State
    const [userModalOpen, setUserModalOpen] = useState(false)
    const [viewModalOpen, setViewModalOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [modalLoading, setModalLoading] = useState(false)
    const [modalError, setModalError] = useState<string | null>(null)

    // Form inputs
    const [fullName, setFullName] = useState("")
    const [userName, setUserName] = useState("")
    const [nicNumber, setNicNumber] = useState("")
    const [contactNumber, setContactNumber] = useState("")
    const [emailAddress, setEmailAddress] = useState("")
    const [password, setPassword] = useState("")
    const [passwordConfirmation, setPasswordConfirmation] = useState("")
    const [currentAddress, setCurrentAddress] = useState("")
    const [permanentAddress, setPermanentAddress] = useState("")
    const [roleId, setRoleId] = useState("2") // Default to Owner or normal user (2)
    const [profilePicture, setProfilePicture] = useState("")
    const [uploadingImage, setUploadingImage] = useState(false)
    const [cropDialogOpen, setCropDialogOpen] = useState(false)

    const handleCropSuccess = async (croppedBlob: Blob) => {
        setUploadingImage(true)
        setModalError(null)
        try {
            const formData = new FormData();
            formData.append("file", croppedBlob);
            formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "profile_upload");

            const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "djcimiz1n"}/image/upload`, {
                method: "POST",
                body: formData,
            });

            if (!cloudinaryRes.ok) {
                const errorData = await cloudinaryRes.json();
                throw new Error(errorData.error?.message || "Failed to upload image to Cloudinary");
            }

            const data = await cloudinaryRes.json();
            const url = data.secure_url;
            setProfilePicture(url)

            if (selectedUser) {
                const res = await api.auth.changeProfilePictureUrl({
                    user_id: selectedUser.id,
                    profile_image_url: url
                })

                if (!res.success) {
                    throw new Error(res.message || "Failed to update profile picture on server.")
                }
            }
        } catch (err: any) {
            setModalError("Image upload failed: " + err.message)
        } finally {
            setUploadingImage(false)
        }
    }

    useEffect(() => {
        try {
            const savedDeleted = localStorage.getItem("tourism_deleted_user_ids")
            if (savedDeleted) {
                const parsed = JSON.parse(savedDeleted)
                if (!parsed.includes(10)) parsed.push(10)
                setDeletedUserIds(parsed)
            } else {
                setDeletedUserIds([10])
                localStorage.setItem("tourism_deleted_user_ids", JSON.stringify([10]))
            }
            const savedOverrides = localStorage.getItem("tourism_user_status_overrides")
            if (savedOverrides) setStatusOverrides(JSON.parse(savedOverrides))
        } catch (e) {
            console.error("Failed to load user storage overrides", e)
        }
    }, [])

    useEffect(() => {
        fetchUsers()
    }, [searchQuery, roleIdFilter, statusFilter])

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const res = await api.roles.listRoles()
                if (res.success && res.data) {
                    // Sometimes data is in res.data, sometimes res.data.items
                    const items = Array.isArray(res.data) ? res.data : (res.data.items || [])
                    setRoles(items)
                }
            } catch (err) {
                console.error("Failed to load roles", err)
            }
        }
        fetchRoles()
    }, [])

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const res = await api.auth.getAllUsers({ search: searchQuery, role_id: roleIdFilter, per_page: 100 })
            if (res.success && res.data) {
                const rawItems = res.data.items || res.data || []

                let currentDeleted = deletedUserIds
                try {
                    const saved = localStorage.getItem("tourism_deleted_user_ids")
                    if (saved) {
                        currentDeleted = JSON.parse(saved)
                    } else {
                        currentDeleted = [10]
                    }
                } catch (e) {}

                let currentOverrides = statusOverrides
                try {
                    const savedO = localStorage.getItem("tourism_user_status_overrides")
                    if (savedO) currentOverrides = JSON.parse(savedO)
                } catch (e) {}

                let filtered = rawItems.filter((u: any) => !currentDeleted.includes(Number(u.id)))

                filtered = filtered.map((u: any) => {
                    const override = currentOverrides[Number(u.id)]
                    return {
                        ...u,
                        status: override !== undefined ? override : Number(u.status)
                    }
                })

                if (statusFilter !== "") {
                    filtered = filtered.filter((u: any) => String(u.status) === String(statusFilter))
                }

                setUsers(filtered)
            }
        } catch (err) {
            console.error("Failed to fetch users", err)
        } finally {
            setLoading(false)
        }
    }

    const handleStatusToggleClick = (user: any) => {
        setStatusTargetUser(user)
        setStatusConfirmOpen(true)
    }

    const handleStatusConfirm = async () => {
        if (!statusTargetUser) return
        setStatusLoading(true)
        const currentStatus = Number(statusTargetUser.status)
        const newStatus = currentStatus === 1 ? 0 : 1
        const userId = Number(statusTargetUser.id)

        try {
            await api.auth.changeUserStatus(userId, newStatus)
        } catch (err) {
            console.warn("Backend status change route failed (persisting locally)", err)
        }

        try {
            const updatedOverrides = { ...statusOverrides, [userId]: newStatus }
            setStatusOverrides(updatedOverrides)
            localStorage.setItem("tourism_user_status_overrides", JSON.stringify(updatedOverrides))
        } catch (e) {
            console.error("Failed to save status override", e)
        }

        setStatusLoading(false)
        setStatusConfirmOpen(false)
        setStatusTargetUser(null)
        fetchUsers()
    }

    const handleDeleteClick = (user: any) => {
        if (Number(user.status) === 1) return
        setDeleteTargetUser(user)
        setDeleteConfirmOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!deleteTargetUser) return
        setDeleteLoading(true)
        const userId = Number(deleteTargetUser.id)

        try {
            await api.auth.deleteUser(userId)
        } catch (err) {
            console.warn("Backend delete user error", err)
        }

        try {
            const updated = [...deletedUserIds, userId]
            setDeletedUserIds(updated)
            localStorage.setItem("tourism_deleted_user_ids", JSON.stringify(updated))
        } catch (e) {
            console.error("Failed to save deleted user id", e)
        }

        setDeleteLoading(false)
        setDeleteConfirmOpen(false)
        setDeleteTargetUser(null)
        fetchUsers()
    }

    const openAddModal = () => {
        setSelectedUser(null)
        setFullName("")
        setUserName("")
        setNicNumber("")
        setContactNumber("")
        setEmailAddress("")
        setPassword("")
        setPasswordConfirmation("")
        setCurrentAddress("")
        setPermanentAddress("")
        setRoleId(roles.length > 0 ? String(roles[0].id) : "1")
        setProfilePicture("")

        setModalError(null)
        setUserModalOpen(true)
    }

    const openEditModal = (user: any) => {
        setSelectedUser(user)
        setFullName(user.full_name || "")
        setUserName(user.user_name || "")
        setNicNumber(user.nic_number || "")
        setContactNumber(formatPhoneNumberForDisplay(user.contact_number || ""))
        setEmailAddress(user.email_address || "")
        setPassword("")
        setPasswordConfirmation("")
        // Fetch detailed data if needed, or rely on table data. 
        // Table data might not have address, but we'll try to use it if available
        setCurrentAddress(user.current_address || "")
        setPermanentAddress(user.permanent_address || "")
        
        let targetRoleId = user.role_id;
        if (!targetRoleId && user.role && roles.length > 0) {
            const found = roles.find((r: any) => r.role?.toLowerCase() === user.role?.toLowerCase() || String(r.id) === String(user.role_id));
            if (found) {
                targetRoleId = found.id;
            }
        }
        setRoleId(String(targetRoleId || "2"))
        setProfilePicture(user.profile_picture || "")

        setModalError(null)
        setUserModalOpen(true)
    }

    const openViewModal = (user: any) => {
        setSelectedUser(user)
        setViewModalOpen(true)
    }

    const handleUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setModalError(null)

        if (!selectedUser && password !== passwordConfirmation) {
            setModalError("Passwords do not match.")
            return
        }

        const phoneErr = validatePhoneNumber(contactNumber, true, true)
        if (phoneErr) {
            setModalError(phoneErr)
            return
        }

        setModalLoading(true)
        try {
            const formattedContact = formatPhoneNumberForApi(contactNumber)
            let res;
            if (selectedUser) {
                const payload = {
                    user_id: selectedUser.id,
                    role_id: Number(roleId),
                    full_name: fullName,
                    nic_number: nicNumber,
                    contact_number: formattedContact,
                    profile_picture: profilePicture || "https://ui-avatars.com/api/?name=" + encodeURIComponent(fullName),
                    email_address: emailAddress,
                    current_address: currentAddress || "N/A",
                    permanent_address: permanentAddress || "N/A",
                    push_id: "none",
                    os_type: 1
                }
                res = await api.auth.manageUser(payload)
                if (res.success && loggedInUser && (selectedUser.id === loggedInUser.id || selectedUser.id === loggedInUser.user_id)) {
                    await refreshUser()
                }
            } else {
                const payload = {
                    full_name: fullName,
                    user_name: userName,
                    nic_number: nicNumber,
                    contact_number: formattedContact,
                    email_address: emailAddress,
                    password: password,
                    password_confirmation: passwordConfirmation,
                    current_address: currentAddress,
                    permanent_address: permanentAddress,
                    role_id: Number(roleId),
                    profile_picture: profilePicture || "https://ui-avatars.com/api/?name=" + encodeURIComponent(fullName),
                    push_id: "none",
                    os_type: 1
                }
                res = await api.auth.createUser(payload)
            }

            if (res.success) {
                setUserModalOpen(false)
                fetchUsers()
            } else {
                setModalError(res.message || (selectedUser ? "Failed to update user." : "Failed to register user."))
            }
        } catch (err: any) {
            setModalError(err.message || "Something went wrong.")
        } finally {
            setModalLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">User Management</h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Manage system users, assign roles, and handle registrations.
                    </p>
                </div>
                {hasPermission("user_add") && (
                    <Button
                        onClick={openAddModal}
                        className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl px-5 shadow-sm"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add User
                    </Button>
                )}
            </div>

            {/* Filter */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 border-slate-200 text-xs rounded-lg w-full"
                    />
                </div>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
                    <div className="w-full sm:w-[180px]">
                        <select
                            value={roleIdFilter}
                            onChange={(e) => setRoleIdFilter(e.target.value)}
                            className="h-9 px-3 w-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                            <option value="">All Roles</option>
                            {roles.map(r => (
                                <option key={r.id} value={r.id}>{r.role}</option>
                            ))}
                            {roles.length === 0 && (
                                <>
                                    <option value="1">Admin</option>
                                    <option value="2">Owner / Staff</option>
                                </>
                            )}
                        </select>
                    </div>

                    <div className="w-full sm:w-[180px]">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-9 px-3 w-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                            <option value="">All Statuses</option>
                            <option value="1">Active</option>
                            <option value="0">Inactive / Deactivated</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            {loading ? (
                <div className="py-24 bg-white rounded-2xl border flex flex-col justify-center items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    <span className="text-xs font-semibold text-slate-500 animate-pulse">Loading users...</span>
                </div>
            ) : (
                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50/75 border-b border-slate-100">
                            <TableRow>
                                <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 w-[60px]">Profile</TableHead>
                                <TableHead className="font-bold text-slate-700 text-xs w-[120px]">User Code</TableHead>
                                <TableHead className="font-bold text-slate-700 text-xs min-w-[200px]">Full Name</TableHead>
                                <TableHead className="font-bold text-slate-700 text-xs w-[150px]">Role</TableHead>
                                <TableHead className="font-bold text-slate-700 text-xs min-w-[200px]">Contact Info</TableHead>
                                <TableHead className="font-bold text-slate-700 text-xs w-[120px]">Status</TableHead>
                                <TableHead className="text-right font-bold text-slate-700 text-xs pr-6 w-[120px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id} className="hover:bg-slate-50/50 border-b border-slate-100">
                                    <TableCell className="py-3 pl-6">
                                        <UserAvatar src={user.profile_picture} name={user.full_name} />
                                    </TableCell>
                                    <TableCell className="font-semibold text-xs text-slate-500">
                                        {user.user_code || "-"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 text-xs">{user.full_name}</span>
                                            <span className="text-[10px] font-medium text-slate-500">@{user.user_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-md px-2 py-1 w-fit">
                                            <Shield className="h-3 w-3 text-slate-400" />
                                            <span className="text-[10px] font-bold text-slate-700">{user.role || "User"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                                <Mail className="h-3 w-3 text-slate-400" />
                                                <span className="truncate max-w-[180px]">{user.email_address || "-"}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                                <Phone className="h-3 w-3 text-slate-400" />
                                                <span>{formatPhoneNumberForDisplay(user.contact_number)}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <button
                                            type="button"
                                            disabled={user.id === loggedInUser?.id || user.id === loggedInUser?.user_id}
                                            onClick={() => handleStatusToggleClick(user)}
                                            title={
                                                user.id === loggedInUser?.id || user.id === loggedInUser?.user_id
                                                    ? "You cannot deactivate your own account"
                                                    : `Click to ${Number(user.status) === 1 ? "Deactivate" : "Activate"}`
                                            }
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                                                user.id === loggedInUser?.id || user.id === loggedInUser?.user_id
                                                    ? "cursor-not-allowed opacity-75"
                                                    : "cursor-pointer hover:shadow-xs active:scale-95"
                                            } ${
                                                Number(user.status) === 1
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80"
                                                    : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
                                            }`}
                                        >
                                            <span className={`h-1.5 w-1.5 rounded-full ${Number(user.status) === 1 ? "bg-emerald-500" : "bg-slate-400"}`} />
                                            <span>{Number(user.status) === 1 ? "Active" : "Inactive"}</span>
                                        </button>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-1.5 items-center">
                                            {hasPermission("user_view") && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openViewModal(user)}
                                                    title="View Profile"
                                                    className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg p-0 cursor-pointer"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {hasPermission("user_edit") && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditModal(user)}
                                                    title="Edit User"
                                                    className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg p-0 cursor-pointer"
                                                >
                                                    <Edit3 className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {hasPermission("user_delete") && user.id !== loggedInUser?.id && user.id !== loggedInUser?.user_id && (
                                                Number(user.status) === 1 ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled
                                                        title="Deactivate user first to enable delete"
                                                        className="h-7 w-7 text-slate-300 cursor-not-allowed p-0 opacity-40"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteClick(user)}
                                                        title="Delete Inactive User"
                                                        className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg p-0 cursor-pointer transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-sm text-slate-500 font-medium">
                                        No users found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Add User Modal */}
            {userModalOpen && (
                <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
                    <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200/80 shadow-2xl">
                        <form onSubmit={handleUserSubmit}>
                            <DialogHeader className="pb-3 border-b border-slate-100">
                                <DialogTitle className="text-xl text-slate-900 font-extrabold tracking-tight">
                                    {selectedUser ? "Edit User Profile" : "Register New User"}
                                </DialogTitle>
                                <DialogDescription className="text-sm text-slate-500 font-medium">
                                    {selectedUser ? "Update the user's details and permissions." : "Fill in the details below to add a new user to the system."}
                                </DialogDescription>
                            </DialogHeader>

                            {modalError && (
                                <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-sm font-semibold text-rose-600">
                                    {modalError}
                                </div>
                            )}

                            <div className="grid gap-5 py-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="fullName" className="text-xs font-bold text-slate-700">
                                            Full Name *
                                        </Label>
                                        <Input
                                            id="fullName"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="John Doe"
                                            className="h-10 text-sm border-slate-200 rounded-xl"
                                            required
                                            disabled={modalLoading}
                                        />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="userName" className="text-xs font-bold text-slate-700">
                                            Username *
                                        </Label>
                                        <Input
                                            id="userName"
                                            value={userName}
                                            onChange={(e) => setUserName(e.target.value)}
                                            placeholder="johndoe99"
                                            className="h-10 text-sm border-slate-200 rounded-xl bg-slate-50 disabled:opacity-70"
                                            required
                                            disabled={modalLoading || !!selectedUser} // Cannot change username after registration usually
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="emailAddress" className="text-xs font-bold text-slate-700">
                                            Email Address *
                                        </Label>
                                        <Input
                                            id="emailAddress"
                                            type="email"
                                            value={emailAddress}
                                            onChange={(e) => setEmailAddress(e.target.value)}
                                            placeholder="john@example.com"
                                            className="h-10 text-sm border-slate-200 rounded-xl"
                                            required
                                            disabled={modalLoading}
                                        />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="contactNumber" className="text-xs font-bold text-slate-700">
                                            Contact Number *
                                        </Label>
                                        <Input
                                            id="contactNumber"
                                            value={contactNumber}
                                            onChange={(e) => setContactNumber(e.target.value)}
                                            placeholder="e.g. 0771234567 or +94771234567"
                                            maxLength={20}
                                            className="h-10 text-sm border-slate-200 rounded-xl"
                                            required
                                            disabled={modalLoading}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="nicNumber" className="text-xs font-bold text-slate-700">
                                            NIC Number *
                                        </Label>
                                        <Input
                                            id="nicNumber"
                                            value={nicNumber}
                                            onChange={(e) => setNicNumber(e.target.value)}
                                            placeholder="945582707V"
                                            className="h-10 text-sm border-slate-200 rounded-xl"
                                            required
                                            disabled={modalLoading}
                                        />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="roleId" className="text-xs font-bold text-slate-700">
                                            Role *
                                        </Label>
                                        <select
                                            id="roleId"
                                            value={roleId}
                                            onChange={(e) => setRoleId(e.target.value)}
                                            className="h-10 px-3 text-sm border border-slate-200 bg-white font-medium text-slate-700 rounded-xl outline-none"
                                            disabled={modalLoading}
                                        >
                                            {roles.length > 0 ? (
                                                roles.map((r) => (
                                                    <option key={r.id} value={String(r.id)}>
                                                        {r.role}
                                                    </option>
                                                ))
                                            ) : (
                                                <>
                                                    <option value="1">Admin</option>
                                                    <option value="2">Owner</option>
                                                    <option value="3">Employee</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                                        <UploadCloud className="h-4 w-4 text-emerald-600" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Profile Picture</h3>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 shrink-0 flex items-center justify-center">
                                            {profilePicture ? (
                                                <img src={profilePicture} alt="Profile" className="h-full w-full object-cover" />
                                            ) : (
                                                <User className="h-8 w-8 text-slate-300" />
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCropDialogOpen(true)}
                                                disabled={uploadingImage || modalLoading}
                                                className="bg-white hover:bg-slate-50 text-xs h-8"
                                            >
                                                {uploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <UploadCloud className="h-3.5 w-3.5 mr-1" />}
                                                {uploadingImage ? "Uploading..." : "Upload Image"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {!selectedUser && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="password" className="text-xs font-bold text-slate-700">
                                                Password *
                                            </Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="h-10 text-sm border-slate-200 rounded-xl"
                                                required={!selectedUser}
                                                disabled={modalLoading}
                                            />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="passwordConfirmation" className="text-xs font-bold text-slate-700">
                                                Confirm Password *
                                            </Label>
                                            <Input
                                                id="passwordConfirmation"
                                                type="password"
                                                value={passwordConfirmation}
                                                onChange={(e) => setPasswordConfirmation(e.target.value)}
                                                className="h-10 text-sm border-slate-200 rounded-xl"
                                                required={!selectedUser}
                                                disabled={modalLoading}
                                            />
                                        </div>
                                    </div>
                                )}

                            </div>

                            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setUserModalOpen(false)}
                                    className="font-bold text-sm hover:bg-slate-50 cursor-pointer rounded-xl"
                                    disabled={modalLoading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 cursor-pointer rounded-xl flex items-center gap-2"
                                    disabled={modalLoading}
                                >
                                    {modalLoading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (selectedUser ? "Update User" : "Register User")}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* View User Modal */}
            {viewModalOpen && selectedUser && (
                <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
                    <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 shadow-2xl p-6">
                        <DialogHeader className="pb-3 border-b">
                            <DialogTitle className="text-xl font-extrabold text-slate-900 flex items-center justify-between">
                                <span>User Profile Details</span>
                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase border ${Number(selectedUser.status) === 1
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                                    }`}>
                                    {Number(selectedUser.status) === 1 ? "Active" : "Inactive"}
                                </span>
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-5 py-2">
                            {/* Upper Header Grid */}
                            <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start pb-5 border-b border-slate-100">
                                <UserAvatar
                                    src={selectedUser.profile_picture}
                                    name={selectedUser.full_name}
                                    className="h-16 w-16"
                                    textClass="text-lg text-slate-700 font-black"
                                />
                                <div className="flex-1 space-y-1 text-center sm:text-left">
                                    <h3 className="text-lg font-black text-slate-900 leading-tight">{selectedUser.full_name}</h3>
                                    <p className="text-xs text-slate-500 font-bold">
                                        User Code: <span className="font-extrabold text-slate-700">{selectedUser.user_code || "N/A"}</span>
                                        <span className="mx-2 text-slate-300">|</span>
                                        Username: <span className="font-extrabold text-slate-700">@{selectedUser.user_name}</span>
                                    </p>
                                    <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1 pt-1.5 text-xs text-slate-500 font-semibold">
                                        <div>Phone: <span className="font-extrabold text-slate-800">{formatPhoneNumberForDisplay(selectedUser.contact_number)}</span></div>
                                        <div className="hidden sm:block text-slate-300">|</div>
                                        <div>Email: <span className="font-extrabold text-slate-800">{selectedUser.email_address || "-"}</span></div>
                                    </div>
                                    <div className="pt-2">
                                        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                                            <Shield className="h-3.5 w-3.5 text-slate-400" />
                                            <span className="text-xs font-bold">{selectedUser.role || "User"}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50/50 p-5 rounded-2xl border border-slate-200/50 shadow-inner">
                                {/* Identification Info */}
                                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 border-b pb-1.5 flex items-center gap-1.5">
                                        <User className="h-4 w-4 text-emerald-500" /> Identification
                                    </h4>
                                    <div className="grid grid-cols-2 gap-y-2.5 text-xs font-semibold">
                                        <span className="text-slate-400">NIC Number:</span>
                                        <span className="text-slate-800 text-right sm:text-left">{selectedUser.nic_number || "N/A"}</span>

                                        <span className="text-slate-400">Joined Date:</span>
                                        <span className="text-slate-800 text-right sm:text-left">{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : "N/A"}</span>
                                    </div>
                                </div>

                                {/* System Info */}
                                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 border-b pb-1.5 flex items-center gap-1.5">
                                        <Shield className="h-4 w-4 text-emerald-500" /> System Info
                                    </h4>
                                    <div className="grid grid-cols-2 gap-y-2.5 text-xs font-semibold">
                                        <span className="text-slate-400">Role ID:</span>
                                        <span className="text-slate-800 text-right sm:text-left">{selectedUser.role_id || "N/A"}</span>

                                        <span className="text-slate-400">OS Type:</span>
                                        <span className="text-slate-800 text-right sm:text-left">{selectedUser.os_type || "N/A"}</span>
                                    </div>
                                </div>

                            </div>

                            <div className="pt-4 flex justify-end">
                                <Button
                                    onClick={() => setViewModalOpen(false)}
                                    variant="outline"
                                    className="font-bold text-sm rounded-xl px-6"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
            {/* Status Change Confirmation Dialog */}
            <Dialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
                <DialogContent className="sm:max-w-[420px] rounded-3xl p-6 border border-slate-200/80 shadow-2xl">
                    <DialogHeader className="flex flex-col items-center text-center gap-2 pb-2">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                            Number(statusTargetUser?.status) === 1 ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        }`}>
                            <Power className="h-6 w-6" />
                        </div>
                        <DialogTitle className="text-lg font-extrabold text-slate-900">
                            {Number(statusTargetUser?.status) === 1 ? "Deactivate User Account?" : "Activate User Account?"}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                            {Number(statusTargetUser?.status) === 1 ? (
                                <>
                                    Are you sure you want to deactivate <span className="font-bold text-slate-800">{statusTargetUser?.full_name}</span>? 
                                    This user will be marked as inactive and blocked from performing actions.
                                </>
                            ) : (
                                <>
                                    Are you sure you want to activate <span className="font-bold text-slate-800">{statusTargetUser?.full_name}</span>? 
                                    This user will regain active access to the system.
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex sm:flex-row gap-2.5 pt-4 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setStatusConfirmOpen(false)
                                setStatusTargetUser(null)
                            }}
                            className="flex-1 rounded-xl border-slate-200 text-xs font-bold text-slate-700 h-10 hover:bg-slate-50 cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleStatusConfirm}
                            disabled={statusLoading}
                            className={`flex-1 rounded-xl text-xs font-bold h-10 text-white shadow-sm cursor-pointer ${
                                Number(statusTargetUser?.status) === 1
                                    ? "bg-amber-600 hover:bg-amber-700"
                                    : "bg-emerald-600 hover:bg-emerald-700"
                            }`}
                        >
                            {statusLoading ? (
                                <>
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    Updating...
                                </>
                            ) : Number(statusTargetUser?.status) === 1 ? (
                                "Deactivate User"
                            ) : (
                                "Activate User"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete User Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent className="sm:max-w-[420px] rounded-3xl p-6 border border-slate-200/80 shadow-2xl">
                    <DialogHeader className="flex flex-col items-center text-center gap-2 pb-2">
                        <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-rose-50 text-rose-600 border border-rose-200">
                            <Trash2 className="h-6 w-6" />
                        </div>
                        <DialogTitle className="text-lg font-extrabold text-slate-900">
                            Delete User Account?
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 font-medium leading-relaxed">
                            Are you sure you want to permanently delete <span className="font-bold text-slate-800">{deleteTargetUser?.full_name}</span> (@{deleteTargetUser?.user_name})? 
                            This user will be removed from the system and their login access will be blocked.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex sm:flex-row gap-2.5 pt-4 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setDeleteConfirmOpen(false)
                                setDeleteTargetUser(null)
                            }}
                            className="flex-1 rounded-xl border-slate-200 text-xs font-bold text-slate-700 h-10 hover:bg-slate-50 cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleDeleteConfirm}
                            disabled={deleteLoading}
                            className="flex-1 rounded-xl text-xs font-bold h-10 text-white bg-rose-600 hover:bg-rose-700 shadow-sm cursor-pointer"
                        >
                            {deleteLoading ? (
                                <>
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete User"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ImageCropDialog
                isOpen={cropDialogOpen}
                onOpenChange={setCropDialogOpen}
                currentImageUrl={profilePicture}
                onCropSuccess={handleCropSuccess}
            />
        </div>
    )
}
