"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreVertical, Search, Loader2, Trash2, Eye, Plus } from "lucide-react";
import { AddTouristDialog } from "@/components/tourists/add-tourist-dialog";
import { EditTouristDialog } from "@/components/tourists/edit-tourist-dialog";
import { TouristDetailsModal } from "@/components/tourists/tourist-details-modal";
import { api } from "@/lib/api-client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUser } from "@/context/user-context";
import { formatPhoneNumberForDisplay } from "@/lib/utils";

export default function TouristsPage() {
  const { hasPermission } = useUser();
  const [tourists, setTourists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Filter lists from basic data api
  const [countries, setCountries] = useState<any[]>([]);
  const [visaTypes, setVisaTypes] = useState<any[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);
  const [customerTypes, setCustomerTypes] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);

  // Selected filter values
  const [visaTypeFilter, setVisaTypeFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const [selectedTourist, setSelectedTourist] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Status Confirmation State
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [statusTargetTourist, setStatusTargetTourist] = useState<any | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const getCountryName = (t: any) => {
    if (!t.country) return "-";
    if (typeof t.country === "object") return t.country.country || "-";
    return String(t.country);
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await api.customers.getBasicData();
        if (res.success && res.data) {
          setCountries(res.data.country_list || []);
          setVisaTypes(res.data.visa_type_list || []);
          setLanguages(res.data.language_list || []);
          setCustomerTypes(res.data.customer_type_list || []);
          setSources(res.data.source_list || []);
        }
      } catch (err) {
        console.error("Failed to load basic metadata for filters:", err);
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchTourists();
  }, [
    searchQuery,
    statusFilter,
    visaTypeFilter,
    countryFilter,
    languageFilter,
    customerTypeFilter,
    sourceFilter,
    page
  ]);

  const fetchTourists = async () => {
    setLoading(true);
    try {
      const res = await api.customers.list({
        search: searchQuery,
        status: statusFilter,
        visa_type_id: visaTypeFilter,
        country_id: countryFilter,
        preferred_language_id: languageFilter,
        customer_type_id: customerTypeFilter,
        source_id: sourceFilter,
        page: page,
        per_page: 10,
      });
      if (res.success && res.data) {
        let items = [];
        const rawData = res.data;
        const candidates = [
          rawData,
          rawData.customer_list,
          rawData.items,
          rawData.data,
          rawData.customers,
        ];

        for (const cand of candidates) {
          if (Array.isArray(cand)) {
            items = cand;
            break;
          }
        }

        const normalized = items.map((item: any) => {
          let normalizedStatus = 0;
          if (item.status && typeof item.status === "object") {
            normalizedStatus = Number(item.status.id);
          } else {
            normalizedStatus = Number(item.status ?? 0);
          }
          return {
            ...item,
            id: item.id ?? item.customer_id ?? 0,
            customer_id: item.customer_id ?? item.id ?? 0,
            status: normalizedStatus,
          };
        });

        setTourists(normalized);
        setTotalPages(
          res.data.pagination?.last_page || res.data.meta?.last_page || 1,
        );
      }
    } catch (e) {
      console.error("Error fetching customers", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: number, name: string) => {
    setDeleteTargetId(id);
    setDeleteTargetName(name);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setDeleteLoading(true);
    try {
      const res = await api.customers.delete(deleteTargetId);
      if (res.success) {
        setDeleteConfirmOpen(false);
        setDeleteTargetId(null);
        setDeleteTargetName("");
        fetchTourists();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleStatusToggleClick = (tourist: any) => {
    setStatusTargetTourist(tourist);
    setStatusConfirmOpen(true);
  };

  const handleStatusConfirm = async () => {
    if (!statusTargetTourist) return;
    setStatusLoading(true);
    try {
      const currentStatus = Number(statusTargetTourist.status);
      const newStatus = currentStatus === 1 ? 0 : 1;
      const customerId = Number(statusTargetTourist.customer_id || statusTargetTourist.id);
      const res = await api.customers.changeStatus(customerId, newStatus);
      if (res.success) {
        setStatusConfirmOpen(false);
        setStatusTargetTourist(null);
        fetchTourists();
      }
    } catch (e) {
      console.error("Failed to change customer status:", e);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleViewDetails = (tourist: any) => {
    setSelectedTourist(tourist);
    setIsDetailsOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Customers Directory
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Manage your client database, passport records, and visa documents.
          </p>
        </div>
        {hasPermission("customer_add") && <AddTouristDialog onSave={fetchTourists} />}
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">

          {/* Search Query */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search name, passport..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 border-slate-200 text-xs rounded-lg font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Country */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Country</label>
            <select
              value={countryFilter}
              onChange={(e) => {
                setCountryFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Countries</option>
              {countries.map((c: any) => (
                <option key={c.id} value={c.id}>{c.country}</option>
              ))}
            </select>
          </div>

          {/* Visa Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Visa Type</label>
            <select
              value={visaTypeFilter}
              onChange={(e) => {
                setVisaTypeFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Visa Types</option>
              {visaTypes.map((v: any) => (
                <option key={v.id} value={v.id}>{v.visa_type}</option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Language</label>
            <select
              value={languageFilter}
              onChange={(e) => {
                setLanguageFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Languages</option>
              {languages.map((l: any) => (
                <option key={l.id} value={l.id}>{l.language}</option>
              ))}
            </select>
          </div>

          {/* Customer Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Customer Type</label>
            <select
              value={customerTypeFilter}
              onChange={(e) => {
                setCustomerTypeFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Customer Types</option>
              {customerTypes.map((ct: any) => (
                <option key={ct.id} value={ct.id}>{ct.customer_type}</option>
              ))}
            </select>
          </div>

          {/* Source */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Sources</option>
              {sources.map((s: any) => (
                <option key={s.id} value={s.id}>{s.source}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Statuses</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex flex-col justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={!searchQuery && !statusFilter && !visaTypeFilter && !countryFilter && !languageFilter && !customerTypeFilter && !sourceFilter}
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("");
                setVisaTypeFilter("");
                setCountryFilter("");
                setLanguageFilter("");
                setCustomerTypeFilter("");
                setSourceFilter("");
                setPage(1);
              }}
              className="h-9 text-xs font-semibold border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer disabled:opacity-40"
            >
              Reset Filters
            </Button>
          </div>

        </div>
      </div>

      {/* Table / List Panel */}
      {loading ? (
        <div className="py-24 bg-white rounded-2xl border flex flex-col justify-center items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <span className="text-xs font-semibold text-slate-500 animate-pulse">
            Syncing travel database...
          </span>
        </div>
      ) : tourists.length > 0 ? (
        <>
          {/* Desktop View */}
          <div className="hidden md:block rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/75 border-b border-slate-100">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 text-xs py-3.5 pl-6 w-[60px]">
                    Profile
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs w-[90px]">
                    Code
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[150px]">
                    Full Name
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs w-[150px]">
                    Contact / WhatsApp
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[165px]">
                    Email
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs w-[110px]">
                    Country
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs w-[120px]">
                    NIC / Passport
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs w-[90px]">
                    Status
                  </TableHead>
                  <TableHead className="text-right font-bold text-slate-700 text-xs pr-6 w-[130px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tourists.map((tourist) => (
                  <TableRow
                    key={tourist.id}
                    className="hover:bg-slate-50/50 border-b border-slate-100"
                  >
                    {/* Profile Pic */}
                    <TableCell className="py-3 pl-6">
                      {(tourist.profile_picture || tourist.profile_image_url || tourist.profile_image) ? (
                        <div className="h-8 w-8 rounded-full overflow-hidden border border-slate-200 shadow-sm">
                          <img
                            src={tourist.profile_picture || tourist.profile_image_url || tourist.profile_image}
                            alt={tourist.full_name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 text-xs border border-slate-200 shadow-sm">
                          {tourist.full_name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </TableCell>

                    {/* Customer Code */}
                    <TableCell className="font-semibold text-xs text-slate-500">
                      {tourist.customer_code || "-"}
                    </TableCell>

                    {/* Full Name */}
                    <TableCell className="font-bold text-slate-900 text-xs">
                      {tourist.full_name}
                    </TableCell>

                    {/* Contact / WhatsApp */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 text-xs">
                          {formatPhoneNumberForDisplay(tourist.contact_number)}
                        </span>
                        {tourist.whatsapp_number ? (
                          <span className="text-[10px] text-slate-400">
                            WA: {formatPhoneNumberForDisplay(tourist.whatsapp_number)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300">
                            WA: -
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell className="text-xs font-semibold text-slate-600 break-all">
                      {tourist.email_address || "-"}
                    </TableCell>

                    {/* Country */}
                    <TableCell className="text-xs font-semibold text-slate-600">
                      {getCountryName(tourist)}
                    </TableCell>

                    {/* Passport / NIC */}
                    <TableCell className="text-xs font-semibold text-slate-600">
                      {tourist.passport_number || tourist.nic_number || "-"}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {hasPermission("customer_edit") ? (
                        <button
                          type="button"
                          onClick={() => handleStatusToggleClick(tourist)}
                          title={`Click to mark as ${tourist.status === 1 ? "Inactive" : "Active"}`}
                          className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all duration-150 cursor-pointer shadow-xs hover:scale-105 active:scale-95 ${
                            tourist.status === 1
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              tourist.status === 1
                                ? "bg-emerald-500 group-hover:bg-rose-500"
                                : "bg-slate-400 group-hover:bg-emerald-500"
                            }`}
                          />
                          <span>{tourist.status === 1 ? "Active" : "Inactive"}</span>
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            tourist.status === 1
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {tourist.status === 1 ? "Active" : "Inactive"}
                        </span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1.5 items-center">
                        {hasPermission("customer_view") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(tourist)}
                            className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {hasPermission("customer_edit") && (
                          <EditTouristDialog
                            tourist={tourist}
                            onSave={fetchTourists}
                          />
                        )}
                        {hasPermission("customer_delete") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleDelete(tourist.id, tourist.full_name)
                            }
                            className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="grid gap-4 md:hidden">
            {tourists.map((tourist) => (
              <Card
                key={tourist.id}
                className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white"
              >
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3 border-b border-slate-100/60 bg-slate-50/20">
                  {(tourist.profile_picture || tourist.profile_image_url || tourist.profile_image) ? (
                    <div className="h-10 w-10 rounded-full overflow-hidden border border-slate-200 shrink-0">
                      <img
                        src={tourist.profile_picture || tourist.profile_image_url || tourist.profile_image}
                        alt={tourist.full_name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 text-sm border border-slate-200 shrink-0 shadow-inner">
                      {tourist.full_name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-slate-400 font-bold tracking-wider block">
                      {tourist.customer_code}
                    </span>
                    <CardTitle className="text-sm font-bold text-slate-900 truncate">
                      {tourist.full_name}
                    </CardTitle>
                  </div>
                  {hasPermission("customer_edit") ? (
                    <button
                      type="button"
                      onClick={() => handleStatusToggleClick(tourist)}
                      title={`Click to mark as ${tourist.status === 1 ? "Inactive" : "Active"}`}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 transition-all cursor-pointer ${
                        tourist.status === 1
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${tourist.status === 1 ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {tourist.status === 1 ? "Active" : "Inactive"}
                    </button>
                  ) : (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                        tourist.status === 1
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}
                    >
                      {tourist.status === 1 ? "Active" : "Inactive"}
                    </span>
                  )}
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="grid gap-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">
                        Contact:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {formatPhoneNumberForDisplay(tourist.contact_number)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">
                        WhatsApp:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {formatPhoneNumberForDisplay(tourist.whatsapp_number)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Email:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                        {tourist.email_address || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">
                        Country:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {getCountryName(tourist)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">
                        NIC/Passport:
                      </span>
                      <span className="font-semibold text-slate-700">
                        {tourist.passport_number || tourist.nic_number || "-"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(tourist)}
                        className="flex-1 min-w-[100px] text-xs border-slate-200 rounded-lg text-emerald-600 hover:bg-emerald-50"
                      >
                        View Profile
                      </Button>
                      <EditTouristDialog
                        tourist={tourist}
                        onSave={fetchTourists}
                        triggerButton={
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 min-w-[100px] text-xs border-indigo-100 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 cursor-pointer"
                          >
                            Edit Profile
                          </Button>
                        }
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDelete(tourist.id, tourist.full_name)
                        }
                        className="flex-1 min-w-[100px] text-xs border-rose-100 rounded-lg text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                      >
                        Delete Client
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-xs border-slate-200 rounded-lg"
              >
                Previous
              </Button>
              <span className="text-xs font-semibold text-slate-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs border-slate-200 rounded-lg"
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed flex flex-col items-center gap-3">
          <span className="text-xs font-semibold text-slate-400">
            No customers found matching criteria.
          </span>
          <AddTouristDialog onSave={fetchTourists} />
        </div>
      )}

      {/* Profile and Document Drawer */}
      <TouristDetailsModal
        tourist={selectedTourist}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedTourist(null);
        }}
        onRefresh={fetchTourists}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open) { setDeleteConfirmOpen(false); setDeleteTargetId(null); setDeleteTargetName(""); }
        }}
        title="Delete Customer Profile?"
        description={`Customer profile for "${deleteTargetName}" will be permanently deleted and cannot be recovered. Are you sure?`}
        confirmLabel="Delete Profile"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
      />

      {/* Status Confirmation Dialog */}
      <ConfirmDialog
        open={statusConfirmOpen}
        onOpenChange={(open) => {
          if (!open) { setStatusConfirmOpen(false); setStatusTargetTourist(null); }
        }}
        title={statusTargetTourist?.status === 1 ? "Deactivate Customer Profile?" : "Activate Customer Profile?"}
        description={`Are you sure you want to mark "${statusTargetTourist?.full_name}" as ${
          statusTargetTourist?.status === 1 ? "Inactive" : "Active"
        }?`}
        confirmLabel={statusTargetTourist?.status === 1 ? "Deactivate" : "Activate"}
        cancelLabel="Cancel"
        variant={statusTargetTourist?.status === 1 ? "warning" : "default"}
        loading={statusLoading}
        onConfirm={handleStatusConfirm}
      />
    </div>
  );
}
