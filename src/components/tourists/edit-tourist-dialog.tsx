"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Edit2, Loader2, User, Globe, Compass, PhoneCall, UploadCloud } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { api } from "@/lib/api-client"
import { ImageCropDialog } from "@/components/ui/image-crop-dialog"
import { formatPhoneNumberForApi, formatPhoneNumberForDisplay, validatePhoneNumber } from "@/lib/utils"

interface EditTouristDialogProps {
    tourist: any;
    onSave: () => void;
    triggerButton?: React.ReactNode;
}

export function EditTouristDialog({ tourist, onSave, triggerButton }: EditTouristDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchingMetadata, setFetchingMetadata] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [uploadingImage, setUploadingImage] = useState(false);
    const [profileImgUrl, setProfileImgUrl] = useState("");
    const [cropDialogOpen, setCropDialogOpen] = useState(false);

    // Form states matching backend keys
    // Form states matching backend keys
    const [fullName, setFullName] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [email, setEmail] = useState("");
    const [passportNumber, setPassportNumber] = useState("");
    const [passportExpiryDate, setPassportExpiryDate] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [gender, setGender] = useState("1");
    const [countryId, setCountryId] = useState("1");
    const [customerTypeId, setCustomerTypeId] = useState("1");
    const [sourceId, setSourceId] = useState("1");
    const [occupation, setOccupation] = useState("");
    const [currentAddress, setCurrentAddress] = useState("");
    const [permanentAddress, setPermanentAddress] = useState("");
    const [visaTypeId, setVisaTypeId] = useState("1");
    const [visaExpiryDate, setVisaExpiryDate] = useState("");
    const [preferredLanguageId, setPreferredLanguageId] = useState("1");
    const [status, setStatus] = useState("1");
    const [emergencyContactName, setEmergencyContactName] = useState("");
    const [emergencyContactNumber, setEmergencyContactNumber] = useState("");
    const [notes, setNotes] = useState("");
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Metadata lists for dropdown filters loaded from /api/customer/basic/data
    const [genders, setGenders] = useState<any[]>([]);
    const [countries, setCountries] = useState<any[]>([]);
    const [visaTypes, setVisaTypes] = useState<any[]>([]);
    const [languages, setLanguages] = useState<any[]>([]);
    const [customerTypes, setCustomerTypes] = useState<any[]>([]);
    const [sources, setSources] = useState<any[]>([]);

    useEffect(() => {
        const fetchBasicData = async () => {
            setFetchingMetadata(true);
            try {
                const res = await api.customers.getBasicData();
                if (res.success && res.data) {
                    setGenders(res.data.gender_list || []);
                    setCountries(res.data.country_list || []);
                    setVisaTypes(res.data.visa_type_list || []);
                    setLanguages(res.data.language_list || []);
                    setCustomerTypes(res.data.customer_type_list || []);
                    setSources(res.data.source_list || []);
                }
            } catch (err) {
                console.error("Failed to load customer basic metadata in edit dialog:", err);
            } finally {
                setFetchingMetadata(false);
            }
        };

        if (isOpen) {
            fetchBasicData();
        }
    }, [isOpen]);

    const formatForDateInput = (val: any) => {
        if (!val || val === "N/A") return "";
        try {
            if (typeof val === "string" && val.includes("T")) {
                return val.split("T")[0];
            }
            if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
                return val;
            }
            const dt = new Date(val);
            if (!isNaN(dt.getTime())) {
                return dt.toISOString().split("T")[0];
            }
        } catch { }
        return typeof val === "string" ? val : "";
    };

    const extractCustomerObject = (raw: any) => {
        if (!raw) return null;
        if (raw.customer && typeof raw.customer === "object" && !Array.isArray(raw.customer)) return raw.customer;
        if (raw.customer_data && typeof raw.customer_data === "object" && !Array.isArray(raw.customer_data)) return raw.customer_data;
        if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) return raw.data;
        if (Array.isArray(raw) && raw.length > 0) return raw[0];
        if (Array.isArray(raw.customer_list) && raw.customer_list.length > 0) return raw.customer_list[0];
        if (Array.isArray(raw.items) && raw.items.length > 0) return raw.items[0];
        return raw;
    };

    const populateData = (source: any) => {
        const d = extractCustomerObject(source);
        if (!d) return;

        if (d.profile_picture || d.profile_image_url) {
            setProfileImgUrl(d.profile_picture || d.profile_image_url || "");
        }
        if (d.full_name || d.name) {
            setFullName(d.full_name || d.name || "");
        }
        if (d.contact_number || d.mobile_number || d.phone) {
            setContactNumber(formatPhoneNumberForDisplay(d.contact_number || d.mobile_number || d.phone || ""));
        }
        if (d.whatsapp_number !== undefined && d.whatsapp_number !== null) {
            setWhatsappNumber(formatPhoneNumberForDisplay(d.whatsapp_number || ""));
        }
        if (d.email_address || d.email) {
            setEmail(d.email_address || d.email || "");
        }
        if (d.passport_number !== undefined && d.passport_number !== null && d.passport_number !== "N/A") {
            setPassportNumber(d.passport_number);
        }
        if (d.passport_expiry_date) {
            const exp = formatForDateInput(d.passport_expiry_date);
            if (exp) setPassportExpiryDate(exp);
        }
        if (d.date_of_birth || d.dob) {
            const dob = formatForDateInput(d.date_of_birth || d.dob);
            if (dob) setDateOfBirth(dob);
        }
        if (d.visa_expiry_date) {
            const ve = formatForDateInput(d.visa_expiry_date);
            if (ve) setVisaExpiryDate(ve);
        }

        // Gender
        if (d.gender !== undefined && d.gender !== null) {
            if (typeof d.gender === "object" && d.gender.id !== undefined) {
                setGender(String(d.gender.id));
            } else {
                setGender(String(d.gender));
            }
        } else if (d.gender_id !== undefined && d.gender_id !== null) {
            setGender(String(d.gender_id));
        }

        // Country
        if (d.country_id !== undefined && d.country_id !== null) {
            setCountryId(String(d.country_id));
        } else if (d.country && typeof d.country === "object" && d.country.id !== undefined) {
            setCountryId(String(d.country.id));
        }

        // Occupation
        if (d.occupation !== undefined && d.occupation !== null) {
            setOccupation(d.occupation || "");
        }

        // Addresses
        if (d.current_address !== undefined && d.current_address !== null) {
            setCurrentAddress(d.current_address === "N/A" ? "" : (d.current_address || ""));
        }
        if (d.permanent_address !== undefined && d.permanent_address !== null) {
            setPermanentAddress(d.permanent_address === "N/A" ? "" : (d.permanent_address || ""));
        }

        // Visa Type
        if (d.visa_type_id !== undefined && d.visa_type_id !== null) {
            setVisaTypeId(String(d.visa_type_id));
        } else if (d.visa_type && typeof d.visa_type === "object" && d.visa_type.id !== undefined) {
            setVisaTypeId(String(d.visa_type.id));
        }

        // Preferred Language
        if (d.preferred_language_id !== undefined && d.preferred_language_id !== null) {
            setPreferredLanguageId(String(d.preferred_language_id));
        } else if (d.preferred_language && typeof d.preferred_language === "object" && d.preferred_language.id !== undefined) {
            setPreferredLanguageId(String(d.preferred_language.id));
        } else if (d.language && typeof d.language === "object" && d.language.id !== undefined) {
            setPreferredLanguageId(String(d.language.id));
        }

        // Customer Type
        if (d.customer_type_id !== undefined && d.customer_type_id !== null) {
            setCustomerTypeId(String(d.customer_type_id));
        } else if (d.customer_type && typeof d.customer_type === "object" && d.customer_type.id !== undefined) {
            setCustomerTypeId(String(d.customer_type.id));
        }

        // Source
        if (d.source_id !== undefined && d.source_id !== null) {
            setSourceId(String(d.source_id));
        } else if (d.source && typeof d.source === "object" && d.source.id !== undefined) {
            setSourceId(String(d.source.id));
        }

        // Status
        if (d.status !== undefined && d.status !== null) {
            if (typeof d.status === "object" && d.status.id !== undefined) {
                setStatus(String(d.status.id));
            } else {
                setStatus(String(d.status));
            }
        }

        // Emergency Contact & Notes
        if (d.emergency_contact_name !== undefined && d.emergency_contact_name !== null) {
            setEmergencyContactName(d.emergency_contact_name || "");
        }
        if (d.emergency_contact_number !== undefined && d.emergency_contact_number !== null) {
            setEmergencyContactNumber(formatPhoneNumberForDisplay(d.emergency_contact_number || ""));
        }
        if (d.notes !== undefined && d.notes !== null) {
            setNotes(d.notes || "");
        }
    };

    // Populate data when dialog opens
    useEffect(() => {
        if (isOpen && tourist) {
            // Immediately populate from the tourist object
            setFullName(tourist.full_name || tourist.name || "");
            setContactNumber(formatPhoneNumberForDisplay(tourist.contact_number || tourist.mobile_number || tourist.phone || ""));
            setWhatsappNumber(formatPhoneNumberForDisplay(tourist.whatsapp_number || ""));
            setEmail(tourist.email_address || tourist.email || "");
            setPassportNumber(tourist.passport_number && tourist.passport_number !== "N/A" ? tourist.passport_number : "");
            setProfileImgUrl(tourist.profile_picture || tourist.profile_image_url || "");
            setPassportExpiryDate(formatForDateInput(tourist.passport_expiry_date));
            setDateOfBirth(formatForDateInput(tourist.date_of_birth || tourist.dob));
            setVisaExpiryDate(formatForDateInput(tourist.visa_expiry_date));
            setOccupation(tourist.occupation || "");
            setCurrentAddress(tourist.current_address && tourist.current_address !== "N/A" ? tourist.current_address : "");
            setPermanentAddress(tourist.permanent_address && tourist.permanent_address !== "N/A" ? tourist.permanent_address : "");
            setEmergencyContactName(tourist.emergency_contact_name || "");
            setEmergencyContactNumber(formatPhoneNumberForDisplay(tourist.emergency_contact_number || ""));
            setNotes(tourist.notes || "");

            if (tourist.status !== undefined && tourist.status !== null) {
                setStatus(String(typeof tourist.status === "object" ? tourist.status.id : tourist.status));
            } else {
                setStatus("1");
            }
            if (tourist.gender) setGender(String(typeof tourist.gender === "object" ? tourist.gender.id : tourist.gender));
            if (tourist.country_id) setCountryId(String(tourist.country_id));
            else if (tourist.country && typeof tourist.country === "object") setCountryId(String(tourist.country.id));
            if (tourist.visa_type_id) setVisaTypeId(String(tourist.visa_type_id));
            else if (tourist.visa_type && typeof tourist.visa_type === "object") setVisaTypeId(String(tourist.visa_type.id));
            if (tourist.preferred_language_id) setPreferredLanguageId(String(tourist.preferred_language_id));

            if (tourist.customer_type_id !== undefined && tourist.customer_type_id !== null) {
                setCustomerTypeId(String(tourist.customer_type_id));
            } else if (tourist.customer_type && typeof tourist.customer_type === "object" && tourist.customer_type.id !== undefined) {
                setCustomerTypeId(String(tourist.customer_type.id));
            } else {
                setCustomerTypeId("1");
            }

            if (tourist.source_id !== undefined && tourist.source_id !== null) {
                setSourceId(String(tourist.source_id));
            } else if (tourist.source && typeof tourist.source === "object" && tourist.source.id !== undefined) {
                setSourceId(String(tourist.source.id));
            } else {
                setSourceId("1");
            }

            setErrorMsg("");
            setFieldErrors({});
            setTouched({});

            // Asynchronously fetch complete profile from server and merge missing fields
            const cid = Number(tourist.customer_id || tourist.id);
            if (cid) {
                const fetchFullCustomerData = async () => {
                    setLoadingDetails(true);
                    try {
                        const res = await api.customers.get(cid);
                        if (res.success && res.data) {
                            populateData(res.data);
                        }
                    } catch (err) {
                        console.error("Failed to fetch full customer profile in edit modal:", err);
                    } finally {
                        setLoadingDetails(false);
                    }
                };
                fetchFullCustomerData();
            }
        }
    }, [isOpen, tourist]);

    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const isSelectedCountrySriLanka = (targetCountryId?: string) => {
        const idToCheck = targetCountryId || countryId;
        if (!idToCheck) return true;
        const c = countries.find((item: any) => String(item.id) === String(idToCheck));
        if (!c) return true;
        return c.country.toLowerCase().includes("sri lanka");
    };

    const validateField = (name: string, value: string, currentCountryId?: string): string => {
        const isSl = isSelectedCountrySriLanka(currentCountryId);
        switch (name) {
            case "fullName": {
                const trimmed = value.trim();
                if (!trimmed) return "Full Name is required.";
                if (trimmed.length < 2) return "Full Name must be at least 2 characters long.";
                if (trimmed.length > 60) return "Full Name cannot exceed 60 characters.";
                if (!/[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]/.test(trimmed)) return "Full Name must contain valid alphabetic letters.";
                return "";
            }
            case "contactNumber": {
                return validatePhoneNumber(value, true, isSl);
            }
            case "whatsappNumber": {
                return validatePhoneNumber(value, false, isSl);
            }
            case "emergencyContactNumber": {
                return validatePhoneNumber(value, false, isSl);
            }
            case "email": {
                if (value.trim()) {
                    if (value.trim().length > 80) return "Email Address cannot exceed 80 characters.";
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value.trim())) return "Please enter a valid Email Address (e.g. name@example.com).";
                }
                return "";
            }
            case "occupation": {
                if (value.trim() && value.trim().length > 50) return "Occupation cannot exceed 50 characters.";
                return "";
            }
            case "dateOfBirth": {
                const todayStr = new Date().toISOString().split("T")[0];
                if (value && value > todayStr) return "Date of Birth cannot be in the future.";
                return "";
            }
            case "passportExpiryDate": {
                const todayStr = new Date().toISOString().split("T")[0];
                if (value && value < todayStr) return "Passport Expiry Date cannot be in the past.";
                return "";
            }
            case "visaExpiryDate": {
                const todayStr = new Date().toISOString().split("T")[0];
                if (value && value < todayStr) return "Visa Expiry Date cannot be in the past.";
                return "";
            }
            case "passportNumber": {
                const trimmed = value.trim();
                if (trimmed && trimmed.toUpperCase() !== "N/A") {
                    if (trimmed.length < 3 || trimmed.length > 20) return "Passport Number must be between 3 and 20 characters.";
                }
                return "";
            }
            case "currentAddress": {
                if (value.trim() && value.trim().length > 150) return "Current Address cannot exceed 150 characters.";
                return "";
            }
            case "permanentAddress": {
                if (value.trim() && value.trim().length > 150) return "Permanent Address cannot exceed 150 characters.";
                return "";
            }
            case "emergencyContactName": {
                const trimmed = value.trim();
                if (trimmed) {
                    if (trimmed.length < 2) return "Emergency Contact Name must be at least 2 characters long.";
                    if (trimmed.length > 60) return "Emergency Contact Name cannot exceed 60 characters.";
                }
                return "";
            }
            case "notes": {
                if (value.trim() && value.trim().length > 500) return "Internal Notes cannot exceed 500 characters.";
                return "";
            }
            default:
                return "";
        }
    };

    const handleFieldChange = (fieldName: string, value: string, setter: (v: string) => void) => {
        setter(value);
        const err = validateField(fieldName, value);
        setFieldErrors((prev) => ({ ...prev, [fieldName]: err }));
        setTouched((prev) => ({ ...prev, [fieldName]: true }));
    };

    const handleBlur = (fieldName: string, value: string) => {
        setTouched((prev) => ({ ...prev, [fieldName]: true }));
        const err = validateField(fieldName, value);
        setFieldErrors((prev) => ({ ...prev, [fieldName]: err }));
    };

    const handleCropSuccess = async (croppedBlob: Blob) => {
        setUploadingImage(true);
        setErrorMsg("");
        try {
            const customerId = Number(tourist.customer_id || tourist.id);

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
            setProfileImgUrl(url);

            // Notify backend about picture change using the exact API requested
            const res = await api.customers.changeProfilePictureUrl({
                customer_id: customerId,
                profile_picture: url
            });

            if (!res.success) {
                throw new Error(res.message || "Failed to update profile picture on server.");
            }
        } catch (err: any) {
            setErrorMsg("Image upload failed: " + err.message);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const allErrors: Record<string, string> = {
            fullName: validateField("fullName", fullName),
            contactNumber: validateField("contactNumber", contactNumber),
            whatsappNumber: validateField("whatsappNumber", whatsappNumber),
            email: validateField("email", email),
            dateOfBirth: validateField("dateOfBirth", dateOfBirth),
            passportExpiryDate: validateField("passportExpiryDate", passportExpiryDate),
            visaExpiryDate: validateField("visaExpiryDate", visaExpiryDate),
            passportNumber: validateField("passportNumber", passportNumber),
            emergencyContactNumber: validateField("emergencyContactNumber", emergencyContactNumber),
            emergencyContactName: validateField("emergencyContactName", emergencyContactName),
            occupation: validateField("occupation", occupation),
            notes: validateField("notes", notes),
        };

        setFieldErrors(allErrors);
        setTouched({
            fullName: true,
            contactNumber: true,
            whatsappNumber: true,
            email: true,
            dateOfBirth: true,
            passportExpiryDate: true,
            visaExpiryDate: true,
            passportNumber: true,
            emergencyContactNumber: true,
            emergencyContactName: true,
            occupation: true,
            notes: true,
        });

        const firstErr = Object.values(allErrors).find((err) => Boolean(err));
        if (firstErr) {
            setErrorMsg(firstErr);
            return;
        }

        setLoading(true);
        setErrorMsg("");
        try {
            const formattedContact = formatPhoneNumberForApi(contactNumber);
            const formattedWhatsapp = formatPhoneNumberForApi(whatsappNumber) || formattedContact;
            const formattedEmergency = emergencyContactNumber.trim() ? formatPhoneNumberForApi(emergencyContactNumber) : undefined;

            const res = await api.customers.edit({
                customer_id: Number(tourist.customer_id || tourist.id),
                full_name: fullName.trim(),
                contact_number: formattedContact,
                whatsapp_number: formattedWhatsapp,
                email_address: email.trim() || `${fullName.trim().toLowerCase().replace(/\s+/g, "")}@example.com`,
                passport_number: passportNumber.trim() || undefined,
                passport_expiry_date: passportExpiryDate.trim() || undefined,
                country_id: Number(countryId),
                date_of_birth: dateOfBirth.trim() || undefined,
                gender: Number(gender),
                occupation: occupation.trim() || undefined,
                current_address: currentAddress.trim() || undefined,
                permanent_address: permanentAddress.trim() || undefined,
                visa_type_id: Number(visaTypeId),
                visa_expiry_date: visaExpiryDate.trim() || undefined,
                preferred_language_id: Number(preferredLanguageId),
                emergency_contact_name: emergencyContactName.trim() || undefined,
                emergency_contact_number: formattedEmergency,
                customer_type_id: Number(customerTypeId),
                source_id: Number(sourceId),
                notes: notes.trim() || undefined,
                status: Number(status),
                profile_picture: profileImgUrl || undefined
            });

            if (res.success) {
                if (Number(status) !== Number(tourist.status)) {
                    try {
                        await api.customers.changeStatus(Number(tourist.customer_id || tourist.id), Number(status));
                    } catch (stErr) {
                        console.error("Status change error", stErr);
                    }
                }
                setIsOpen(false);
                onSave();
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to update customer record.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    {triggerButton || (
                        <Button className="cursor-pointer h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg p-0" variant="ghost" size="icon">
                            <Edit2 className="h-4 w-4" />
                        </Button>
                    )}
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200/80 shadow-2xl">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader className="pb-3 border-b border-slate-100">
                            <DialogTitle className="text-xl text-slate-800 font-extrabold tracking-tight">Edit Customer Profile</DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 mt-1 font-medium">
                                Modify demographic, contact, permitting and address details for {tourist.full_name}.
                            </DialogDescription>
                        </DialogHeader>

                        {errorMsg && (
                            <div className="mt-4 p-3.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl text-center animate-shake">
                                {errorMsg}
                            </div>
                        )}

                        {fetchingMetadata ? (
                            <div className="py-24 flex flex-col justify-center items-center gap-3">
                                <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
                                <span className="text-xs font-bold text-slate-400">Loading system countries and visa options...</span>
                            </div>
                        ) : (
                            <div className="grid gap-6 py-4 mt-2">

                                {/* Section 0: Profile Picture */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                                        <UploadCloud className="h-4 w-4 text-emerald-600" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Profile Picture</h3>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 shrink-0 flex items-center justify-center">
                                            {profileImgUrl ? (
                                                <img src={profileImgUrl} alt="Profile" className="h-full w-full object-cover" />
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
                                                disabled={uploadingImage}
                                                className="bg-white hover:bg-slate-50 text-xs h-8"
                                            >
                                                {uploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <UploadCloud className="h-3.5 w-3.5 mr-1" />}
                                                {uploadingImage ? "Uploading..." : "Change Image"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 1: Demographics */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                                        <User className="h-4 w-4 text-emerald-600" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Demographic Information</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="fullname" className="text-xs font-bold text-slate-600">Full Name *</Label>
                                            <Input
                                                id="fullname"
                                                placeholder="e.g. Ivan Petrov"
                                                value={fullName}
                                                maxLength={60}
                                                onChange={(e) => handleFieldChange("fullName", e.target.value, setFullName)}
                                                onBlur={(e) => handleBlur("fullName", e.target.value)}
                                                className={`h-9 rounded-xl text-xs font-medium transition-colors ${touched.fullName && fieldErrors.fullName
                                                        ? "border-rose-400 bg-rose-50/20 focus:ring-rose-500/20"
                                                        : "border-slate-200 focus:ring-emerald-500"
                                                    }`}
                                                required
                                            />
                                            {touched.fullName && fieldErrors.fullName && (
                                                <span className="text-[11px] font-medium text-rose-500">{fieldErrors.fullName}</span>
                                            )}
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="dob" className="text-xs font-bold text-slate-600">Date of Birth</Label>
                                            <Input
                                                id="dob"
                                                type="date"
                                                max={new Date().toISOString().split("T")[0]}
                                                value={dateOfBirth}
                                                onChange={(e) => handleFieldChange("dateOfBirth", e.target.value, setDateOfBirth)}
                                                onBlur={(e) => handleBlur("dateOfBirth", e.target.value)}
                                                className={`h-9 rounded-xl text-xs font-semibold text-slate-700 ${touched.dateOfBirth && fieldErrors.dateOfBirth
                                                        ? "border-rose-400 bg-rose-50/20 focus:ring-rose-500/20"
                                                        : "border-slate-200 focus:ring-emerald-500"
                                                    }`}
                                            />
                                            {touched.dateOfBirth && fieldErrors.dateOfBirth && (
                                                <span className="text-[11px] font-medium text-rose-500">{fieldErrors.dateOfBirth}</span>
                                            )}
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="gender" className="text-xs font-bold text-slate-600">Gender</Label>
                                            <select
                                                id="gender"
                                                value={gender}
                                                onChange={(e) => setGender(e.target.value)}
                                                className="h-9 px-3 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            >
                                                {genders.map((g: any) => (
                                                    <option key={g.id} value={g.id}>{g.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="occupation" className="text-xs font-bold text-slate-600">Occupation</Label>
                                            <Input
                                                id="occupation"
                                                placeholder="e.g. Software Engineer"
                                                value={occupation}
                                                maxLength={50}
                                                onChange={(e) => handleFieldChange("occupation", e.target.value, setOccupation)}
                                                onBlur={(e) => handleBlur("occupation", e.target.value)}
                                                className={`h-9 rounded-xl text-xs font-medium ${touched.occupation && fieldErrors.occupation
                                                        ? "border-rose-400 bg-rose-50/20 focus:ring-rose-500/20"
                                                        : "border-slate-200 focus:ring-emerald-500"
                                                    }`}
                                            />
                                            {touched.occupation && fieldErrors.occupation && (
                                                <span className="text-[11px] font-medium text-rose-500">{fieldErrors.occupation}</span>
                                            )}
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="customer_type" className="text-xs font-bold text-slate-600">Customer Type</Label>
                                            <select
                                                id="customer_type"
                                                value={customerTypeId}
                                                onChange={(e) => setCustomerTypeId(e.target.value)}
                                                className="h-9 px-3 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            >
                                                <option value="" disabled className="text-slate-400">Select Customer Type</option>
                                                {customerTypes.map((ct: any) => (
                                                    <option key={ct.id} value={ct.id}>{ct.customer_type}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="source" className="text-xs font-bold text-slate-600">Lead / Booking Source</Label>
                                            <select
                                                id="source"
                                                value={sourceId}
                                                onChange={(e) => setSourceId(e.target.value)}
                                                className="h-9 px-3 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            >
                                                <option value="" disabled className="text-slate-400">Select Lead / Booking Source</option>
                                                {sources.map((s: any) => (
                                                    <option key={s.id} value={s.id}>{s.source}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="status" className="text-xs font-bold text-slate-600">Profile Status *</Label>
                                            <select
                                                id="status"
                                                value={status}
                                                onChange={(e) => setStatus(e.target.value)}
                                                className="h-9 px-3 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            >
                                                <option value="1">Active</option>
                                                <option value="0">Inactive</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Contact & Language */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                                        <Globe className="h-4 w-4 text-emerald-600" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Contact & Language Settings</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="mobile" className="text-xs font-bold text-slate-600">Contact / Mobile Number *</Label>
                                            <Input
                                                id="mobile"
                                                placeholder="e.g. 0771234567 or +94771234567"
                                                value={contactNumber}
                                                maxLength={20}
                                                onChange={(e) => handleFieldChange("contactNumber", e.target.value, setContactNumber)}
                                                onBlur={(e) => handleBlur("contactNumber", e.target.value)}
                                                className={`h-9 rounded-xl text-xs font-semibold text-slate-700 ${touched.contactNumber && fieldErrors.contactNumber
                                                        ? "border-rose-400 bg-rose-50/20 focus:ring-rose-500/20"
                                                        : "border-slate-200 focus:ring-emerald-500"
                                                    }`}
                                                required
                                            />
                                            {touched.contactNumber && fieldErrors.contactNumber && (
                                                <span className="text-[11px] font-medium text-rose-500">{fieldErrors.contactNumber}</span>
                                            )}
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="whatsapp" className="text-xs font-bold text-slate-600">WhatsApp Number</Label>
                                            <Input
                                                id="whatsapp"
                                                placeholder="e.g. 0771234567 or +94771234567 (if different)"
                                                value={whatsappNumber}
                                                maxLength={20}
                                                onChange={(e) => handleFieldChange("whatsappNumber", e.target.value, setWhatsappNumber)}
                                                onBlur={(e) => handleBlur("whatsappNumber", e.target.value)}
                                                className={`h-9 rounded-xl text-xs font-semibold text-slate-700 ${touched.whatsappNumber && fieldErrors.whatsappNumber
                                                        ? "border-rose-400 bg-rose-50/20 focus:ring-rose-500/20"
                                                        : "border-slate-200 focus:ring-emerald-500"
                                                    }`}
                                            />
                                            {touched.whatsappNumber && fieldErrors.whatsappNumber && (
                                                <span className="text-[11px] font-medium text-rose-500">{fieldErrors.whatsappNumber}</span>
                                            )}
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="email" className="text-xs font-bold text-slate-600">Email Address</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="e.g. ivan.petrov@gmail.com"
                                                value={email}
                                                maxLength={80}
                                                onChange={(e) => handleFieldChange("email", e.target.value, setEmail)}
                                                onBlur={(e) => handleBlur("email", e.target.value)}
                                                className={`h-9 rounded-xl text-xs font-medium ${touched.email && fieldErrors.email
                                                        ? "border-rose-400 bg-rose-50/20 focus:ring-rose-500/20"
                                                        : "border-slate-200 focus:ring-emerald-500"
                                                    }`}
                                            />
                                            {touched.email && fieldErrors.email && (
                                                <span className="text-[11px] font-medium text-rose-500">{fieldErrors.email}</span>
                                            )}
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="language" className="text-xs font-bold text-slate-600">Preferred Language</Label>
                                            <select
                                                id="language"
                                                value={preferredLanguageId}
                                                onChange={(e) => setPreferredLanguageId(e.target.value)}
                                                className="h-9 px-3 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            >
                                                {languages.map((l: any) => (
                                                    <option key={l.id} value={l.id}>{l.language}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Identity & Visa */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                                        <Compass className="h-4 w-4 text-emerald-600" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Identity & Travel Permits</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="passport" className="text-xs font-bold text-slate-600">Passport Number</Label>
                                            <Input
                                                id="passport"
                                                placeholder="RU12345678"
                                                value={passportNumber}
                                                maxLength={20}
                                                onChange={(e) => handleFieldChange("passportNumber", e.target.value, setPassportNumber)}
                                                onBlur={(e) => handleBlur("passportNumber", e.target.value)}
                                                className={`h-9 rounded-xl text-xs font-semibold text-slate-700 ${touched.passportNumber && fieldErrors.passportNumber
                                                        ? "border-rose-400 bg-rose-50/20 focus:ring-rose-500/20"
                                                        : "border-slate-200 focus:ring-emerald-500"
                                                    }`}
                                            />
                                            {touched.passportNumber && fieldErrors.passportNumber && (
                                                <span className="text-[11px] font-medium text-rose-500">{fieldErrors.passportNumber}</span>
                                            )}
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="passport_expiry" className="text-xs font-bold text-slate-600">Passport Expiry Date</Label>
                                            <Input
                                                id="passport_expiry"
                                                type="date"
                                                min={new Date().toISOString().split("T")[0]}
                                                value={passportExpiryDate}
                                                onChange={(e) => handleFieldChange("passportExpiryDate", e.target.value, setPassportExpiryDate)}
                                                onBlur={(e) => handleBlur("passportExpiryDate", e.target.value)}
                                                className={`h-9 rounded-xl text-xs font-semibold text-slate-700 ${touched.passportExpiryDate && fieldErrors.passportExpiryDate
                                                        ? "border-rose-400 bg-rose-50/20 focus:ring-rose-500/20"
                                                        : "border-slate-200 focus:ring-emerald-500"
                                                    }`}
                                            />
                                            {touched.passportExpiryDate && fieldErrors.passportExpiryDate && (
                                                <span className="text-[11px] font-medium text-rose-500">{fieldErrors.passportExpiryDate}</span>
                                            )}
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="country" className="text-xs font-bold text-slate-600">Country of Origin</Label>
                                            <select
                                                id="country"
                                                value={countryId}
                                                onChange={(e) => {
                                                    const newCountryId = e.target.value;
                                                    setCountryId(newCountryId);
                                                    if (touched.contactNumber) {
                                                        const err = validateField("contactNumber", contactNumber, newCountryId);
                                                        setFieldErrors((prev) => ({ ...prev, contactNumber: err }));
                                                    }
                                                    if (touched.whatsappNumber && whatsappNumber) {
                                                        const err = validateField("whatsappNumber", whatsappNumber, newCountryId);
                                                        setFieldErrors((prev) => ({ ...prev, whatsappNumber: err }));
                                                    }
                                                    if (touched.emergencyContactNumber && emergencyContactNumber) {
                                                        const err = validateField("emergencyContactNumber", emergencyContactNumber, newCountryId);
                                                        setFieldErrors((prev) => ({ ...prev, emergencyContactNumber: err }));
                                                    }
                                                }}
                                                className="h-9 px-3 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            >
                                                {countries.map((c: any) => (
                                                    <option key={c.id} value={c.id}>{c.country}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="visa_type" className="text-xs font-bold text-slate-600">Visa Category Type</Label>
                                            <select
                                                id="visa_type"
                                                value={visaTypeId}
                                                onChange={(e) => setVisaTypeId(e.target.value)}
                                                className="h-9 px-3 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            >
                                                {visaTypes.map((v: any) => (
                                                    <option key={v.id} value={v.id}>{v.visa_type}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="grid gap-1.5 sm:col-span-2">
                                            <Label htmlFor="visa_expiry" className="text-xs font-bold text-slate-600">Visa Expiry Date</Label>
                                            <Input
                                                id="visa_expiry"
                                                type="date"
                                                min={new Date().toISOString().split("T")[0]}
                                                value={visaExpiryDate}
                                                onChange={(e) => handleFieldChange("visaExpiryDate", e.target.value, setVisaExpiryDate)}
                                                onBlur={(e) => handleBlur("visaExpiryDate", e.target.value)}
                                                className={`h-9 rounded-xl text-xs font-semibold text-slate-700 ${touched.visaExpiryDate && fieldErrors.visaExpiryDate
                                                        ? "border-rose-400 bg-rose-50/20 focus:ring-rose-500/20"
                                                        : "border-slate-200 focus:ring-emerald-500"
                                                    }`}
                                            />
                                            {touched.visaExpiryDate && fieldErrors.visaExpiryDate && (
                                                <span className="text-[11px] font-medium text-rose-500">{fieldErrors.visaExpiryDate}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Section 4: Address Details */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                                        <Globe className="h-4 w-4 text-emerald-600" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Addresses Details</h3>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="current-addr" className="text-xs font-bold text-slate-600">Current Residing Address</Label>
                                            <Input
                                                id="current-addr"
                                                placeholder="e.g. Cinnamon Grand Hotel, Colombo 03"
                                                value={currentAddress}
                                                maxLength={150}
                                                onChange={(e) => handleFieldChange("currentAddress", e.target.value, setCurrentAddress)}
                                                onBlur={(e) => handleBlur("currentAddress", e.target.value)}
                                                className={`h-9 rounded-xl text-xs font-medium ${touched.currentAddress && fieldErrors.currentAddress
                                                        ? "border-rose-400 bg-rose-50/20 focus:ring-rose-500/20"
                                                        : "border-slate-200 focus:ring-emerald-500"
                                                    }`}
                                            />
                                            {touched.currentAddress && fieldErrors.currentAddress && (
                                                <span className="text-[11px] font-medium text-rose-500">{fieldErrors.currentAddress}</span>
                                            )}
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="perm-addr" className="text-xs font-bold text-slate-600">Permanent Address (Origin Country)</Label>
                                            <Input
                                                id="perm-addr"
                                                placeholder="e.g. 123 Moscow St, Russia"
                                                value={permanentAddress}
                                                maxLength={150}
                                                onChange={(e) => handleFieldChange("permanentAddress", e.target.value, setPermanentAddress)}
                                                onBlur={(e) => handleBlur("permanentAddress", e.target.value)}
                                                className={`h-9 rounded-xl text-xs font-medium ${touched.permanentAddress && fieldErrors.permanentAddress
                                                        ? "border-rose-400 bg-rose-50/20 focus:ring-rose-500/20"
                                                        : "border-slate-200 focus:ring-emerald-500"
                                                    }`}
                                            />
                                            {touched.permanentAddress && fieldErrors.permanentAddress && (
                                                <span className="text-[11px] font-medium text-rose-500">{fieldErrors.permanentAddress}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Section 5: Emergency Contact */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                                        <PhoneCall className="h-4 w-4 text-emerald-600" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Emergency Support Details</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="emergency_name" className="text-xs font-bold text-slate-600">Emergency Contact Name</Label>
                                            <Input
                                                id="emergency_name"
                                                placeholder="e.g. Anastasia Petrova"
                                                value={emergencyContactName}
                                                maxLength={60}
                                                onChange={(e) => handleFieldChange("emergencyContactName", e.target.value, setEmergencyContactName)}
                                                onBlur={(e) => handleBlur("emergencyContactName", e.target.value)}
                                                className={`h-9 rounded-xl text-xs font-medium ${touched.emergencyContactName && fieldErrors.emergencyContactName
                                                        ? "border-rose-400 bg-rose-50/20 focus:ring-rose-500/20"
                                                        : "border-slate-200 focus:ring-emerald-500"
                                                    }`}
                                            />
                                            {touched.emergencyContactName && fieldErrors.emergencyContactName && (
                                                <span className="text-[11px] font-medium text-rose-500">{fieldErrors.emergencyContactName}</span>
                                            )}
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="emergency_phone" className="text-xs font-bold text-slate-600">Emergency Contact Number</Label>
                                            <Input
                                                id="emergency_phone"
                                                placeholder="e.g. 0771234567 or +94771234567"
                                                value={emergencyContactNumber}
                                                maxLength={20}
                                                onChange={(e) => handleFieldChange("emergencyContactNumber", e.target.value, setEmergencyContactNumber)}
                                                onBlur={(e) => handleBlur("emergencyContactNumber", e.target.value)}
                                                className={`h-9 rounded-xl text-xs font-semibold text-slate-700 ${touched.emergencyContactNumber && fieldErrors.emergencyContactNumber
                                                        ? "border-rose-400 bg-rose-50/20 focus:ring-rose-500/20"
                                                        : "border-slate-200 focus:ring-emerald-500"
                                                    }`}
                                            />
                                            {touched.emergencyContactNumber && fieldErrors.emergencyContactNumber && (
                                                <span className="text-[11px] font-medium text-rose-500">{fieldErrors.emergencyContactNumber}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Travel Notes */}
                                <div className="grid gap-1.5">
                                    <Label htmlFor="notes" className="text-xs font-bold text-slate-600">Internal Travel Notes</Label>
                                    <textarea
                                        id="notes"
                                        placeholder="Food allergies, customized travel routes, specific flight timings or hotel check-in preferences..."
                                        value={notes}
                                        maxLength={500}
                                        onChange={(e) => handleFieldChange("notes", e.target.value, setNotes)}
                                        onBlur={(e) => handleBlur("notes", e.target.value)}
                                        className={`min-h-[70px] p-3.5 border rounded-xl text-xs font-medium outline-none text-slate-700 ${touched.notes && fieldErrors.notes
                                                ? "border-rose-400 bg-rose-50/20 focus:ring-rose-500/20"
                                                : "border-slate-200 focus:ring-2 focus:ring-emerald-500/20"
                                            }`}
                                    />
                                    {touched.notes && fieldErrors.notes && (
                                        <span className="text-[11px] font-medium text-rose-500">{fieldErrors.notes}</span>
                                    )}
                                </div>
                            </div>
                        )}

                        <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t border-slate-100 pt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="ghost" className="text-xs font-bold rounded-xl h-9">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                disabled={loading || fetchingMetadata}
                                className="bg-indigo-600 text-white hover:bg-indigo-500 px-6 rounded-xl text-xs font-bold h-9 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating...
                                    </>
                                ) : (
                                    "Update Customer Profile"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ImageCropDialog
                isOpen={cropDialogOpen}
                onOpenChange={setCropDialogOpen}
                currentImageUrl={profileImgUrl}
                onCropSuccess={handleCropSuccess}
            />
        </>
    )
}
