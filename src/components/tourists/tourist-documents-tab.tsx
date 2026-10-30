"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api-client";
import {
  Loader2,
  Plus,
  FileText,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  Eye,
  File,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/context/user-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface TouristDocumentsTabProps {
  customerId: number;
}

export function TouristDocumentsTab({ customerId }: TouristDocumentsTabProps) {
  const { hasPermission } = useUser();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Delete document confirmation state
  const [deleteDocConfirmOpen, setDeleteDocConfirmOpen] = useState(false);
  const [deleteDocTargetId, setDeleteDocTargetId] = useState<number | null>(null);
  const [deleteDocLoading, setDeleteDocLoading] = useState(false);

  // Delete file confirmation state
  const [deleteFileConfirmOpen, setDeleteFileConfirmOpen] = useState(false);
  const [deleteFileTarget, setDeleteFileTarget] = useState<{ docId: number; fileId: number } | null>(null);
  const [deleteFileLoading, setDeleteFileLoading] = useState(false);

  // Expanded states
  const [expandedDocs, setExpandedDocs] = useState<{ [key: number]: boolean }>(
    {},
  );
  const [docFiles, setDocFiles] = useState<{ [key: number]: any[] }>({});
  const [loadingFiles, setLoadingFiles] = useState<{ [key: number]: boolean }>(
    {},
  );

  // Edit states
  const [editingDocId, setEditingDocId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // New Document form states
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocDescription, setNewDocDescription] = useState("");
  const [newDocFiles, setNewDocFiles] = useState<File[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Add file to existing doc states
  const [addingFileToDocId, setAddingFileToDocId] = useState<number | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (customerId) {
      fetchDocuments();
    }
  }, [customerId]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.customers.viewDocument(customerId);
      if (res.success && res.data && res.data.items) {
        setDocuments(res.data.items);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (docId: number) => {
    const isExpanded = !!expandedDocs[docId];
    setExpandedDocs({ ...expandedDocs, [docId]: !isExpanded });

    if (!isExpanded && !docFiles[docId]) {
      fetchDocumentFiles(docId);
    }
  };

  const fetchDocumentFiles = async (docId: number) => {
    setLoadingFiles((prev) => ({ ...prev, [docId]: true }));
    try {
      const res = await api.customers.viewDocumentFile(docId);
      if (res.success && res.data && res.data.items) {
        setDocFiles((prev) => ({ ...prev, [docId]: res.data.items }));
      }
    } catch (error) {
      console.error("Error fetching files for doc", docId, error);
    } finally {
      setLoadingFiles((prev) => ({ ...prev, [docId]: false }));
    }
  };

  const handleUploadToCloudinary = async (file: File): Promise<string> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "djcimiz1n";
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "profile_upload";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || "Failed to upload file to Cloudinary");
    }

    const data = await res.json();
    return data.secure_url;
  };

  const handleCreateDocument = async () => {
    if (!newDocTitle.trim() || newDocFiles.length === 0) return;

    setIsCreating(true);
    try {
      // Upload all files to Firebase first
      const uploadedFiles = await Promise.all(
        newDocFiles.map(async (f) => {
          const url = await handleUploadToCloudinary(f);
          return {
            file_url: url,
            file_name: f.name,
            file_type: f.name.split(".").pop() || "",
            file_size: f.size,
          };
        }),
      );

      // Create document
      const payload = {
        customer_id: customerId,
        documents: [
          {
            document_title: newDocTitle,
            document_description: newDocDescription,
            files: uploadedFiles,
          },
        ],
      };

      const res = await api.customers.addDocument(payload);
      if (res.success) {
        setIsAddModalOpen(false);
        setNewDocTitle("");
        setNewDocDescription("");
        setNewDocFiles([]);
        fetchDocuments();
      }
    } catch (error) {
      console.error("Error creating document:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const openDeleteDocConfirm = (docId: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDocTargetId(Number(docId));
    setDeleteDocConfirmOpen(true);
  };

  const handleDeleteDocConfirm = async () => {
    if (!deleteDocTargetId) return;
    setDeleteDocLoading(true);
    const targetId = Number(deleteDocTargetId);
    try {
      const res = await api.customers.deleteDocument(targetId);
      if (res.success) {
        setDocuments(prev => prev.filter((d) => Number(d.id ?? d.document_id) !== targetId));
      } else {
        // If API returns false (e.g. already deleted), remove from state
        setDocuments(prev => prev.filter((d) => Number(d.id ?? d.document_id) !== targetId));
      }
    } catch (error: any) {
      console.error("Error deleting document:", error);
      // Remove from UI state if document does not exist on backend
      setDocuments(prev => prev.filter((d) => Number(d.id ?? d.document_id) !== targetId));
    } finally {
      setDeleteDocConfirmOpen(false);
      setDeleteDocTargetId(null);
      setDeleteDocLoading(false);
    }
  };

  const startEditing = (doc: any) => {
    setEditingDocId(Number(doc.id ?? doc.document_id));
    setEditTitle(doc.document_title);
    setEditDescription(doc.document_description || "");
    if (!expandedDocs[Number(doc.id ?? doc.document_id)]) {
      toggleExpand(Number(doc.id ?? doc.document_id));
    }
  };

  const handleSaveEdit = async (docId: number) => {
    if (!editTitle.trim()) return;
    setIsSavingEdit(true);
    try {
      const payload = {
        document_id: Number(docId),
        document_title: editTitle,
        document_description: editDescription,
      };
      const res = await api.customers.editDocument(payload);
      if (res.success) {
        setDocuments(
          documents.map((d) =>
            Number(d.id ?? d.document_id) === Number(docId)
              ? {
                ...d,
                document_title: editTitle,
                document_description: editDescription,
              }
              : d,
          ),
        );
        setEditingDocId(null);
      }
    } catch (error) {
      console.error("Error editing document:", error);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openDeleteFileConfirm = (docId: any, fileId: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteFileTarget({ docId: Number(docId), fileId: Number(fileId) });
    setDeleteFileConfirmOpen(true);
  };

  const handleDeleteFileConfirm = async () => {
    if (!deleteFileTarget) return;
    setDeleteFileLoading(true);
    const { docId, fileId } = deleteFileTarget;
    try {
      const res = await api.customers.deleteDocumentFile(docId, fileId);
      if (res.success) {
        setDocFiles((prev) => ({
          ...prev,
          [docId]: (prev[docId] || []).filter((f) => Number(f.id ?? f.file_id) !== Number(fileId)),
        }));
      } else {
        alert(res.message || "Failed to delete file.");
      }
    } catch (error: any) {
      console.error("Error deleting file:", error);
      alert(error.message || "Error deleting file.");
    } finally {
      setDeleteFileConfirmOpen(false);
      setDeleteFileTarget(null);
      setDeleteFileLoading(false);
    }
  };

  const handleAddFilesToDoc = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files || e.target.files.length === 0 || !addingFileToDocId)
      return;

    const docId = Number(addingFileToDocId);
    const filesToAdd = Array.from(e.target.files);
    // Show loading state for the doc
    setLoadingFiles((prev) => ({ ...prev, [docId]: true }));

    try {
      const uploadedFiles = await Promise.all(
        filesToAdd.map(async (f) => {
          const url = await handleUploadToCloudinary(f);
          return {
            file_url: url,
            file_name: f.name,
          };
        }),
      );

      const payload = {
        document_id: docId,
        files: uploadedFiles,
      };

      const res = await api.customers.uploadDocumentFile(payload);
      if (res.success) {
        // Refresh files for this doc
        fetchDocumentFiles(docId);
      } else {
        alert(res.message || "Failed to add files to document.");
        if (String(res.message).toLowerCase().includes("does not exist") || String(res.message).toLowerCase().includes("invalid")) {
          fetchDocuments();
        }
      }
    } catch (error: any) {
      console.error("Error uploading files to document:", error);
      alert(error.message || "Error uploading files to document.");
      if (String(error.message).toLowerCase().includes("does not exist")) {
        fetchDocuments();
      }
    } finally {
      setLoadingFiles((prev) => ({ ...prev, [docId]: false }));
      setAddingFileToDocId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setNewDocFiles((prev) => [...prev, ...files].slice(0, 5));
    }
  };

  const handleViewFile = (file: any, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rawUrl = file.file_url || file.url || file.file_path || file.document_url || file.path;
    if (rawUrl) {
      let targetUrl = String(rawUrl).trim();
      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://") && !targetUrl.startsWith("//")) {
        targetUrl = `https://${targetUrl}`;
      }

      // Convert any Cloudinary URL to image/upload/f_auto/ format to bypass Cloudinary 401 locks and Google Viewer errors
      if (targetUrl.includes("cloudinary.com")) {
        if (targetUrl.includes("/raw/upload/")) {
          targetUrl = targetUrl.replace("/raw/upload/", "/image/upload/f_auto/");
        } else if (targetUrl.includes("/image/upload/") && !targetUrl.includes("/f_auto/")) {
          targetUrl = targetUrl.replace("/image/upload/", "/image/upload/f_auto/");
        }
      }

      window.open(targetUrl, "_blank", "noopener,noreferrer");
    } else {
      alert("File URL is not available for this document.");
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return "Unknown size";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <FileText className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">Documents</h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Manage identity, contracts, and other related files.
            </p>
          </div>
        </div>
        {hasPermission("customer_document_add") && (
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 px-4 text-xs font-bold"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Document
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col justify-center items-center gap-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <Loader2 className="h-7 w-7 animate-spin text-slate-600" />
          <span className="text-xs font-bold text-slate-500 animate-pulse">
            Loading documents...
          </span>
        </div>
      ) : documents.length === 0 ? (
        <div className="py-20 flex flex-col justify-center items-center text-center bg-slate-50 rounded-2xl border border-slate-200">
          <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center border border-dashed border-slate-300 mb-4">
            <FileText className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="text-slate-800 text-base font-bold mb-2">
            No documents found
          </h3>
          <p className="text-slate-500 text-xs max-w-[300px] leading-relaxed">
            This employee doesn't have any documents attached yet. Click "Add
            Document" to upload their NIC, contracts, or other files.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const currentDocId = Number(doc.id ?? doc.document_id);
            return (
              <div
                key={currentDocId}
                className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden transition-all duration-200"
              >
                {/* Document Header */}
                <div
                  className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => toggleExpand(currentDocId)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">
                          {doc.document_title}
                        </span>
                        {hasPermission("customer_document_manage") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(doc);
                            }}
                            className="text-slate-400 hover:text-emerald-600 p-1 rounded-md transition-colors cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {hasPermission("customer_document_delete") && (
                          <button
                            onClick={(e) => openDeleteDocConfirm(currentDocId, e)}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {doc.document_description && (
                        <span className="text-xs text-slate-500">
                          {doc.document_description}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-md font-medium">
                      {new Date(doc.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {expandedDocs[currentDocId] ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Document Expanded Content */}
                {expandedDocs[currentDocId] && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                    {editingDocId === currentDocId ? (
                      <div className="space-y-3 mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div>
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-emerald-500 font-bold"
                            placeholder="Document Title"
                          />
                        </div>
                        <div>
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px]"
                            placeholder="Description (Optional)"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setEditingDocId(null)}
                            variant="outline"
                            className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 h-8 text-xs rounded-lg"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => handleSaveEdit(currentDocId)}
                            disabled={isSavingEdit || !editTitle.trim()}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs rounded-lg px-4 font-bold"
                          >
                            {isSavingEdit ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Save"
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                        Attached Files
                      </h4>
                      {hasPermission("customer_document_manage") && (
                        <Button
                          onClick={() => {
                            setAddingFileToDocId(currentDocId);
                            fileInputRef.current?.click();
                          }}
                          variant="outline"
                          className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 h-7 text-[10px] px-3 py-0 rounded-md shadow-sm font-bold"
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Files
                        </Button>
                      )}
                    </div>

                    {loadingFiles[currentDocId] ? (
                      <div className="py-8 flex justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                      </div>
                    ) : docFiles[currentDocId] && docFiles[currentDocId].length > 0 ? (
                      <div className="space-y-2">
                        {docFiles[currentDocId].map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                                <File className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-700">
                                  {file.file_name}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400">
                                  {formatBytes(file.file_size)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {hasPermission("customer_document_view") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => handleViewFile(file, e)}
                                  className="h-7 px-3 text-xs font-bold text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg cursor-pointer flex items-center gap-1"
                                >
                                  <Eye className="h-3.5 w-3.5" /> View
                                </Button>
                              )}
                              {hasPermission("customer_document_delete") && (
                                <button
                                  onClick={(e) => openDeleteFileConfirm(currentDocId, file.id, e)}
                                  className="text-slate-400 hover:text-rose-500 p-1.5 rounded-md transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs text-slate-500 font-medium bg-white rounded-xl border border-dashed border-slate-200">
                        No files attached to this document.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden file input for adding files to existing docs */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={handleAddFilesToDoc}
        accept=".pdf,.jpg,.jpeg,.png"
      />

      {/* Add Document Modal */}
      <Dialog
        open={isAddModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddModalOpen(false);
            setNewDocTitle("");
            setNewDocDescription("");
            setNewDocFiles([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[580px] bg-white border border-slate-200 text-slate-900 p-0 overflow-hidden rounded-3xl shadow-2xl">
          <DialogHeader className="p-6 border-b border-slate-100">
            <DialogTitle className="text-lg font-extrabold text-slate-900">
              Add New Document
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 font-extrabold tracking-wide">
                Document Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                className="bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 h-11 rounded-xl"
                placeholder="e.g. Identity Card, Contract"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 font-extrabold tracking-wide">
                Description (Optional)
              </Label>
              <textarea
                value={newDocDescription}
                onChange={(e) => setNewDocDescription(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[90px] resize-none"
                placeholder="Brief description of the document"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-slate-500 font-extrabold tracking-wide">
                  Attachments <span className="text-rose-500">*</span>
                </Label>
                <span className="text-xs text-slate-400 font-semibold">
                  {newDocFiles.length} / 5 files max
                </span>
              </div>

              <div
                className="border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-emerald-50/30 hover:border-emerald-300 transition-all duration-200 p-8 flex flex-col items-center justify-center cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.multiple = true;
                  input.accept = ".pdf,.jpg,.jpeg,.png";
                  input.onchange = (e: any) => {
                    if (e.target.files) {
                      setNewDocFiles((prev) =>
                        [
                          ...prev,
                          ...Array.from(e.target.files as FileList),
                        ].slice(0, 5),
                      );
                    }
                  };
                  input.click();
                }}
              >
                <UploadCloud className="h-8 w-8 text-slate-300 mb-3" />
                <p className="text-sm text-emerald-600 font-bold mb-1">
                  Click to upload files
                </p>
                <p className="text-xs text-slate-400">
                  PDF, JPG, PNG up to 5MB
                </p>
              </div>

              {newDocFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {newDocFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-slate-50 p-2.5 px-3 rounded-xl border border-slate-200"
                    >
                      <div className="flex items-center gap-2">
                        <File className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="text-xs text-slate-700 font-semibold truncate pr-4">
                          {f.name}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setNewDocFiles(
                            newDocFiles.filter((_, index) => index !== i),
                          )
                        }
                        className="text-slate-400 hover:text-rose-500 shrink-0 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              className="mr-2 border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateDocument}
              disabled={
                !newDocTitle.trim() || newDocFiles.length === 0 || isCreating
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 h-10 rounded-xl"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Save Document
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Document Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDocConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDocConfirmOpen(false);
            setDeleteDocTargetId(null);
          }
        }}
        title="Delete Document Category?"
        description="Are you sure you want to delete this document category and all of its records? This action cannot be undone."
        confirmLabel="Delete Document"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteDocLoading}
        onConfirm={handleDeleteDocConfirm}
      />

      {/* Delete File Confirmation Dialog */}
      <ConfirmDialog
        open={deleteFileConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteFileConfirmOpen(false);
            setDeleteFileTarget(null);
          }
        }}
        title="Delete Attached File?"
        description="Are you sure you want to delete this attached file? The file will be permanently removed from this record."
        confirmLabel="Delete File"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteFileLoading}
        onConfirm={handleDeleteFileConfirm}
      />
    </div>
  );
}
