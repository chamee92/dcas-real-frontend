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
    Trash2,
    Edit3,
    ArrowRight,
    ArrowLeft,
    CheckCircle,
    Clock,
    User,
    Calendar,
    AlertCircle,
    Briefcase,
    MoreVertical
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { api, getStoredUser } from "@/lib/api-client"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useUser } from "@/context/user-context"

export default function TasksPage() {
    const { hasPermission } = useUser()
    const [tasks, setTasks] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [boardType, setBoardType] = useState<"company" | "my">("company") // Toggles between global org and self assigned

    // Dialog state
    const [taskModalOpen, setTaskModalOpen] = useState(false)
    const [selectedTask, setSelectedTask] = useState<any>(null)
    const [users, setUsers] = useState<any[]>([])
    const [modalLoading, setModalLoading] = useState(false)
    const [modalError, setModalError] = useState<string | null>(null)

    // Delete Confirmation State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    // Form inputs
    const [taskTitle, setTaskTitle] = useState("")
    const [taskDesc, setTaskDesc] = useState("")
    const [taskStatus, setTaskStatus] = useState("0")
    const [priority, setPriority] = useState("2") // 1 - Low / 2 - Medium / 3 - High
    const [assignedTo, setAssignedTo] = useState("")
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
    const [dueDate, setDueDate] = useState("")

    useEffect(() => {
        fetchTasks()
    }, [searchQuery, boardType])

    // Load users list for drop-downs
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await api.auth.getAllUsers({ per_page: 100 })
                if (res.success && res.data) {
                    setUsers(res.data.items || res.data || [])
                }
            } catch (err) {
                console.error("Failed to load users", err)
            }
        }
        fetchUsers()
    }, [])

    const fetchTasks = async () => {
        setLoading(true)
        try {
            const storedUser = getStoredUser()
            const currentUserId = storedUser?.user_id || storedUser?.id || 1
            const currentUserName = storedUser?.name || storedUser?.full_name || storedUser?.user_name || ""

            // Always fetch list with full metadata (priority, due_date, start_date, assigned_to)
            const res = await api.tasks.list({ search: searchQuery, per_page: 100 })

            if (res.success && res.data) {
                const allItems: any[] = res.data.items || res.data || []
                if (boardType === "my") {
                    const myItems = allItems.filter((t: any) => 
                        Number(t.assigned_to) === Number(currentUserId) ||
                        (currentUserName && t.assigned_to_name && t.assigned_to_name.toLowerCase() === currentUserName.toLowerCase())
                    )
                    setTasks(myItems)
                } else {
                    setTasks(allItems)
                }
            }
        } catch (err) {
            console.error("Failed to fetch tasks", err)
        } finally {
            setLoading(false)
        }
    }

    const openAddModal = () => {
        setSelectedTask(null)
        setTaskTitle("")
        setTaskDesc("")
        setTaskStatus("0")
        setPriority("2")

        // Default assigned_to to first user or current logged in user
        const storedUser = getStoredUser()
        setAssignedTo(String(storedUser?.user_id || storedUser?.id || ""))

        setStartDate(new Date().toISOString().split('T')[0])
        const defaultDue = new Date()
        defaultDue.setDate(defaultDue.getDate() + 7)
        setDueDate(defaultDue.toISOString().split('T')[0])

        setModalError(null)
        setTaskModalOpen(true)
    }

    const openEditModal = async (task: any) => {
        setSelectedTask(task)
        setTaskTitle(task.task_title || "")
        setTaskDesc(task.task_description || "")
        setTaskStatus(String(task.task_status || 0))
        setPriority(String(task.priority || 2))

        const matchedUser = users.find(u => 
            Number(u.id) === Number(task.assigned_to) || 
            (task.assigned_to_name && (u.full_name?.toLowerCase() === task.assigned_to_name?.toLowerCase() || u.user_name?.toLowerCase() === task.assigned_to_name?.toLowerCase()))
        )
        const storedUser = getStoredUser()
        const initialAssignedTo = matchedUser 
            ? String(matchedUser.id) 
            : (task.assigned_to ? String(task.assigned_to) : (boardType === "my" ? String(storedUser?.user_id || storedUser?.id || "") : ""))
        setAssignedTo(initialAssignedTo)

        setStartDate(task.start_date ? new Date(task.start_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
        setDueDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])

        setModalError(null)
        setTaskModalOpen(true)

        // Fetch full task view from backend to ensure all fields are populated
        try {
            const res = await api.tasks.view(task.id)
            if (res.success && res.data) {
                const d = res.data
                if (d.task_title) setTaskTitle(d.task_title)
                if (d.task_description !== undefined) setTaskDesc(d.task_description || "")
                if (d.task_status !== undefined) setTaskStatus(String(d.task_status))
                if (d.priority !== undefined) setPriority(String(d.priority))
                if (d.assigned_to) setAssignedTo(String(d.assigned_to))
                if (d.start_date) setStartDate(new Date(d.start_date).toISOString().split('T')[0])
                if (d.due_date) setDueDate(new Date(d.due_date).toISOString().split('T')[0])
            }
        } catch (err) {
            console.error("Failed to load task details in modal:", err)
        }
    }

    const handleTaskSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setModalError(null)

        if (!taskTitle.trim()) {
            setModalError("Please specify a task title.")
            return
        }

        if (startDate && dueDate && dueDate < startDate) {
            setModalError("Due Date cannot be earlier than Start Date.")
            return
        }

        setModalLoading(true)
        try {
            const storedUser = getStoredUser()
            const payload = {
                task_title: taskTitle.trim(),
                task_description: taskDesc.trim(),
                task_status: Number(taskStatus),
                priority: Number(priority),
                assigned_by: Number(storedUser?.user_id || storedUser?.id || 1),
                assigned_to: Number(assignedTo),
                start_date: startDate,
                due_date: dueDate
            }

            let res;
            if (selectedTask) {
                res = await api.tasks.edit({
                    ...payload,
                    task_id: selectedTask.id
                })
            } else {
                res = await api.tasks.add(payload)
            }

            if (res.success) {
                setTaskModalOpen(false)
                fetchTasks()
            } else {
                setModalError(res.message || "Failed to save task.")
            }
        } catch (err: any) {
            setModalError(err.message || "Something went wrong.")
        } finally {
            setModalLoading(false)
        }
    }

    const handleStatusMove = async (task: any, currentStatus: number, direction: "next" | "prev") => {
        let newStatus = currentStatus
        if (direction === "next" && currentStatus < 2) {
            newStatus = currentStatus + 1
        } else if (direction === "prev" && currentStatus > 0) {
            newStatus = currentStatus - 1
        }

        if (newStatus === currentStatus) return

        // For forward transitions (next), try changeStatus first
        if (direction === "next") {
            try {
                const res = await api.tasks.changeStatus(task.id, newStatus)
                if (res.success) {
                    fetchTasks()
                    return
                }
            } catch {
                // fall through to edit
            }
        }

        // For backward transitions (prev) or fallback, use Task Edit API directly to avoid 422 error
        try {
            let fullTask = task
            if (!task.assigned_to || !task.due_date || task.assigned_by === undefined) {
                try {
                    const viewRes = await api.tasks.view(task.id)
                    if (viewRes.success && viewRes.data) {
                        fullTask = { ...task, ...viewRes.data }
                    }
                } catch {
                    // ignore view fallback error
                }
            }

            const storedUser = getStoredUser()
            const editRes = await api.tasks.edit({
                task_id: fullTask.id,
                task_title: fullTask.task_title || "Task",
                task_description: fullTask.task_description || "",
                task_status: newStatus,
                priority: Number(fullTask.priority || 2),
                assigned_by: Number(fullTask.assigned_by || storedUser?.user_id || storedUser?.id || 1),
                assigned_to: Number(fullTask.assigned_to || storedUser?.user_id || storedUser?.id || 1),
                start_date: fullTask.start_date ? new Date(fullTask.start_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                due_date: fullTask.due_date ? new Date(fullTask.due_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
            })

            if (editRes.success) {
                fetchTasks()
            }
        } catch (err) {
            console.error("Failed to update task status:", err)
        }
    }

    const handleDelete = (id: number) => {
        setDeleteTargetId(id)
        setDeleteConfirmOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!deleteTargetId) return
        setDeleteLoading(true)
        try {
            const res = await api.tasks.delete(deleteTargetId)
            if (res.success) {
                setDeleteConfirmOpen(false)
                setDeleteTargetId(null)
                fetchTasks()
            }
        } catch (err) {
            console.error("Delete failed", err)
        } finally {
            setDeleteLoading(false)
        }
    }

    // Filter tasks into Kanban categories
    const getTasksByStatus = (statusVal: number) => {
        return tasks.filter(t => Number(t.task_status) === statusVal)
    }

    const getPriorityStyles = (priorityVal: number) => {
        switch (priorityVal) {
            case 3: // High
                return "bg-rose-50 text-rose-700 border-rose-100/60"
            case 2: // Medium
                return "bg-amber-50 text-amber-700 border-amber-100/60"
            default: // Low
                return "bg-slate-50 text-slate-700 border-slate-200/60"
        }
    }

    const getPriorityLabel = (priorityVal: number) => {
        switch (priorityVal) {
            case 3: return "High"
            case 2: return "Medium"
            default: return "Low"
        }
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Task board</h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Coordinate deliverables, monitor operations, and transition workflows seamlessly using our real-time Kanban system.
                    </p>
                </div>
                {hasPermission("task_add") && (
                    <Button
                        onClick={openAddModal}
                        className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl px-5 shadow-sm"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Create Task
                    </Button>
                )}
            </div>

            {/* Filter and Board Switcher */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 border-slate-200 text-xs rounded-lg"
                    />
                </div>

                {/* Segmented Switcher */}
                <div className="flex bg-slate-100/80 p-1 rounded-xl border w-full md:w-auto">
                    <button
                        onClick={() => setBoardType("company")}
                        className={`flex-1 md:flex-none text-xs font-bold py-1.5 px-4 rounded-lg transition-all cursor-pointer ${boardType === "company"
                            ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                            : "text-slate-500 hover:text-slate-800"
                            }`}
                    >
                        Company Board
                    </button>
                    <button
                        onClick={() => setBoardType("my")}
                        className={`flex-1 md:flex-none text-xs font-bold py-1.5 px-4 rounded-lg transition-all cursor-pointer ${boardType === "my"
                            ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                            : "text-slate-500 hover:text-slate-800"
                            }`}
                    >
                        My Assigned Tasks
                    </button>
                </div>
            </div>

            {/* Kanban Columns */}
            {loading ? (
                <div className="py-24 bg-white rounded-2xl border flex flex-col justify-center items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
                    <span className="text-xs font-semibold text-slate-500 animate-pulse">Syncing tasks board...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* COLUMN 1: TO DO */}
                    <div className="flex flex-col gap-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 min-h-[500px]">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/40">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">To Do (Pending)</h3>
                            </div>
                            <span className="bg-slate-200/60 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                                {getTasksByStatus(0).length}
                            </span>
                        </div>

                        <div className="flex flex-col gap-3 overflow-y-auto">
                            {getTasksByStatus(0).map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onEdit={openEditModal}
                                    onDelete={handleDelete}
                                    onMove={(dir) => handleStatusMove(task, 0, dir)}
                                    users={users}
                                />
                            ))}
                            {getTasksByStatus(0).length === 0 && (
                                <div className="text-center py-8 text-xs text-slate-400 font-medium border border-dashed rounded-xl border-slate-200 bg-white/50">
                                    No tasks pending.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUMN 2: IN PROGRESS */}
                    <div className="flex flex-col gap-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 min-h-[500px]">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/40">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">In Progress</h3>
                            </div>
                            <span className="bg-slate-200/60 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                                {getTasksByStatus(1).length}
                            </span>
                        </div>

                        <div className="flex flex-col gap-3 overflow-y-auto">
                            {getTasksByStatus(1).map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onEdit={openEditModal}
                                    onDelete={handleDelete}
                                    onMove={(dir) => handleStatusMove(task, 1, dir)}
                                    users={users}
                                />
                            ))}
                            {getTasksByStatus(1).length === 0 && (
                                <div className="text-center py-8 text-xs text-slate-400 font-medium border border-dashed rounded-xl border-slate-200 bg-white/50">
                                    No active tasks in progress.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUMN 3: COMPLETED */}
                    <div className="flex flex-col gap-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 min-h-[500px]">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/40">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Completed / Approved</h3>
                            </div>
                            {/* We filter both status 2 (completed) and above */}
                            <span className="bg-slate-200/60 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                                {tasks.filter(t => Number(t.task_status) >= 2).length}
                            </span>
                        </div>

                        <div className="flex flex-col gap-3 overflow-y-auto">
                            {tasks.filter(t => Number(t.task_status) >= 2).map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onEdit={openEditModal}
                                    onDelete={handleDelete}
                                    onMove={(dir) => handleStatusMove(task, Number(task.task_status), dir)}
                                    users={users}
                                />
                            ))}
                            {tasks.filter(t => Number(t.task_status) >= 2).length === 0 && (
                                <div className="text-center py-8 text-xs text-slate-400 font-medium border border-dashed rounded-xl border-slate-200 bg-white/50">
                                    No completed deliverables logged.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Task Add / Edit Modal */}
            {taskModalOpen && (
                <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
                    <DialogContent className="sm:max-w-[550px] rounded-3xl border border-slate-200/80 shadow-2xl">
                        <form onSubmit={handleTaskSubmit}>
                            <DialogHeader className="pb-3 border-b border-slate-100">
                                <DialogTitle className="text-lg text-slate-900 font-extrabold tracking-tight">
                                    {selectedTask ? "Modify Task Parameters" : "Compile New Task Delivery"}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-500 font-medium">
                                    Set task objectives, choose assignees, and define delivery timelines.
                                </DialogDescription>
                            </DialogHeader>

                            {modalError && (
                                <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-600">
                                    {modalError}
                                </div>
                            )}

                            <div className="grid gap-4 py-4">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="taskTitle" className="text-xs font-bold text-slate-700">
                                        Task Title / Objective *
                                    </Label>
                                    <Input
                                        id="taskTitle"
                                        value={taskTitle}
                                        onChange={(e) => setTaskTitle(e.target.value)}
                                        placeholder="Brief delivery summary..."
                                        className="h-10 text-xs border-slate-200 rounded-xl focus:ring-emerald-500/20"
                                        required
                                        disabled={modalLoading}
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="taskDesc" className="text-xs font-bold text-slate-700">
                                        Task Specifications / Details
                                    </Label>
                                    <textarea
                                        id="taskDesc"
                                        value={taskDesc}
                                        onChange={(e) => setTaskDesc(e.target.value)}
                                        placeholder="Add background context..."
                                        className="w-full text-xs p-3 border border-slate-200 rounded-xl h-24 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                        disabled={modalLoading}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="taskStatus" className="text-xs font-bold text-slate-700">
                                            Status
                                        </Label>
                                        <select
                                            id="taskStatus"
                                            value={taskStatus}
                                            onChange={(e) => setTaskStatus(e.target.value)}
                                            className="h-10 px-3 text-xs border border-slate-200 bg-white font-semibold text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            disabled={modalLoading}
                                        >
                                            <option value="0">To Do (Pending)</option>
                                            <option value="1">In Progress</option>
                                            <option value="2">Completed / Settle</option>
                                        </select>
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label htmlFor="priority" className="text-xs font-bold text-slate-700">
                                            Priority Level
                                        </Label>
                                        <select
                                            id="priority"
                                            value={priority}
                                            onChange={(e) => setPriority(e.target.value)}
                                            className="h-10 px-3 text-xs border border-slate-200 bg-white font-semibold text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            disabled={modalLoading}
                                        >
                                            <option value="1">Low Priority</option>
                                            <option value="2">Medium Priority</option>
                                            <option value="3">High Priority</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="assignee" className="text-xs font-bold text-slate-700">
                                        Assign Work to
                                    </Label>
                                    <select
                                        id="assignee"
                                        value={assignedTo}
                                        onChange={(e) => setAssignedTo(e.target.value)}
                                        className="h-10 px-3 text-xs border border-slate-200 bg-white font-medium text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        disabled={modalLoading}
                                    >
                                        <option value="">Select assignee...</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.full_name} ({u.role_name || "Staff"})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="startDate" className="text-xs font-bold text-slate-700">
                                            Start Date
                                        </Label>
                                        <Input
                                            id="startDate"
                                            type="date"
                                            min={!selectedTask ? new Date().toISOString().split('T')[0] : undefined}
                                            value={startDate}
                                            onChange={(e) => {
                                                setStartDate(e.target.value)
                                                if (dueDate && e.target.value > dueDate) {
                                                    setDueDate(e.target.value)
                                                }
                                            }}
                                            className="h-10 text-xs border-slate-200 rounded-xl"
                                            disabled={modalLoading}
                                        />
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label htmlFor="dueDate" className="text-xs font-bold text-slate-700">
                                            Due Date
                                        </Label>
                                        <Input
                                            id="dueDate"
                                            type="date"
                                            min={startDate || new Date().toISOString().split('T')[0]}
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            className="h-10 text-xs border-slate-200 rounded-xl"
                                            disabled={modalLoading}
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setTaskModalOpen(false)}
                                    className="font-bold text-xs hover:bg-slate-50 cursor-pointer rounded-xl"
                                    disabled={modalLoading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 cursor-pointer rounded-xl flex items-center gap-1.5"
                                    disabled={modalLoading}
                                >
                                    {modalLoading ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Saving...
                                        </>
                                    ) : "Save Task"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={deleteConfirmOpen}
                onOpenChange={(open) => {
                    if (!open) { setDeleteConfirmOpen(false); setDeleteTargetId(null); }
                }}
                title="Delete Task?"
                description="This task will be permanently deleted and cannot be recovered. Are you sure you want to continue?"
                confirmLabel="Delete Task"
                cancelLabel="Cancel"
                variant="danger"
                loading={deleteLoading}
                onConfirm={handleDeleteConfirm}
            />
        </div>
    )
}

// Helper Card Subcomponent
function TaskCard({ task, onEdit, onDelete, onMove, users }: { task: any, onEdit: (task: any) => void, onDelete: (id: number) => void, onMove: (dir: "next" | "prev") => void, users: any[] }) {
    const { hasPermission } = useUser()
    const formatTaskDate = (dString: string) => {
        if (!dString) return ""
        return new Date(dString).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    }

    const assignee = users.find(u => 
        Number(u.id) === Number(task.assigned_to) || 
        (task.assigned_to_name && (u.full_name?.toLowerCase() === task.assigned_to_name?.toLowerCase() || u.user_name?.toLowerCase() === task.assigned_to_name?.toLowerCase()))
    )
    const assigneeName = task.assigned_to_name || assignee?.full_name || "Unassigned"
    const assigneeInitials = assigneeName.charAt(0).toUpperCase()

    const getPriorityColor = (priorityVal: number) => {
        switch (Number(priorityVal)) {
            case 3: return "bg-rose-500 text-rose-50"
            case 2: return "bg-amber-500 text-amber-50"
            default: return "bg-slate-400 text-slate-50"
        }
    }

    const priorityLabel = Number(task.priority) === 3 ? "High" : Number(task.priority) === 2 ? "Medium" : "Low"

    return (
        <Card className="border-slate-200/80 shadow-sm hover:shadow bg-white rounded-2xl overflow-hidden transition-all duration-200 border">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black tracking-wider uppercase ${getPriorityColor(task.priority)}`}>
                    {priorityLabel}
                </span>

                {(hasPermission("task_manage") || hasPermission("task_delete")) && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg">
                                <MoreVertical className="h-3.5 w-3.5 text-slate-500" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36 rounded-xl border border-slate-200/80 shadow-lg">
                            {hasPermission("task_manage") && (
                                <DropdownMenuItem onClick={() => onEdit(task)} className="text-xs font-semibold text-slate-700 flex gap-2 cursor-pointer">
                                    <Edit3 className="h-3.5 w-3.5 text-slate-400" /> Modify/Edit
                                </DropdownMenuItem>
                            )}
                            {hasPermission("task_manage") && hasPermission("task_delete") && (
                                <DropdownMenuSeparator className="border-slate-100" />
                            )}
                            {hasPermission("task_delete") && (
                                <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-xs font-semibold text-rose-600 flex gap-2 cursor-pointer focus:text-rose-600 focus:bg-rose-50">
                                    <Trash2 className="h-3.5 w-3.5 text-rose-500" /> Delete Task
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <h4 className="font-extrabold text-xs text-slate-900 tracking-tight leading-snug line-clamp-2 mb-1.5">
                    {task.task_title}
                </h4>
                {task.task_description && (
                    <p className="text-[10px] font-medium text-slate-400 line-clamp-2 leading-relaxed mb-4">
                        {task.task_description}
                    </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100/60 mt-2 text-[10px] font-bold text-slate-400">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>Due {formatTaskDate(task.due_date)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <div className="h-6 w-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-700" title={assigneeName}>
                            {assigneeInitials}
                        </div>
                    </div>
                </div>

                {/* Column Transition Buttons */}
                <div className="flex justify-between items-center gap-2 border-t border-slate-100/60 mt-3 pt-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onMove("prev")}
                        disabled={Number(task.task_status) === 0}
                        className="h-6 w-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {Number(task.task_status) === 0 ? "Pending" : Number(task.task_status) === 1 ? "In Work" : "Done"}
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onMove("next")}
                        disabled={Number(task.task_status) >= 2}
                        className="h-6 w-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                    >
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
