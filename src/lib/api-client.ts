"use client";

// API URL - falls back toaventureit's API parsed from Postman examples
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Helper to get authentication token
export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("tourism_auth_token");
  }
  return null;
}

// Helper to set authentication token
export function setAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("tourism_auth_token", token);
  }
}

// Helper to get logged in user data
export function getStoredUser(): any | null {
  if (typeof window !== "undefined") {
    const user = localStorage.getItem("tourism_user");
    return user ? JSON.parse(user) : null;
  }
  return null;
}

// Helper to store user data
export function setStoredUser(user: any) {
  if (typeof window !== "undefined") {
    localStorage.setItem("tourism_user", JSON.stringify(user));
  }
}

// Helper to clear authentication
export function clearAuth() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("tourism_auth_token");
    localStorage.removeItem("tourism_user");
  }
}

// Common headers config
async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const user = getStoredUser();

  const headers = new Headers(options.headers || {});

  // Content-Type default to JSON unless sending FormData
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Inject Bearer token
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Inject USER-ID header if user exists (many Postman requests demand it)
  if (user && user.user_id) {
    headers.set("USER-ID", String(user.user_id));
  } else if (user && user.id) {
    headers.set("USER-ID", String(user.id));
  }

  const url = `${API_BASE_URL}/${path.replace(/^\//, "")}`;

  // Prepare request body with per_page clamp (numeric safe)
  let requestBody = options.body;
  if (requestBody instanceof FormData) {
    // keep as is
  } else if (typeof requestBody === "object" && requestBody !== null) {
    const cloned = JSON.parse(JSON.stringify(requestBody));
    if ("per_page" in cloned) {
      const perPageNum = Number(cloned.per_page);
      if (!isNaN(perPageNum) && perPageNum > 100) {
        console.warn("per_page exceeds 100, clamping to 100");
        cloned.per_page = 100;
      }
    }
    requestBody = JSON.stringify(cloned);
  } else if (typeof requestBody === "string") {
    try {
      const parsed = JSON.parse(requestBody);
      if ("per_page" in parsed) {
        const perPageNum = Number(parsed.per_page);
        if (!isNaN(perPageNum) && perPageNum > 100) {
          console.warn("per_page exceeds 100, clamping to 100");
          parsed.per_page = 100;
        }
      }
      requestBody = JSON.stringify(parsed);
    } catch {}
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body: requestBody,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `API request failed with status ${response.status}`,
    );
  }

  return response.json();
}

export const api = {
  // === 1. AUTH & USERS ===
  auth: {
    // 1. User Login API [POST]
    login: async (payload: any) => {
      const data = await apiFetch("/api/user/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (data.success && data.data?.token) {
        setAuthToken(data.data.token);
        setStoredUser(data.data);
      }
      return data;
    },

    // 2. Username Validate API [POST]
    validateUsername: async (userName: string) => {
      return apiFetch("/api/username/validate", {
        method: "POST",
        body: JSON.stringify({ user_name: userName }),
      });
    },

    // 3. User Register API [POST] (Public registration, logs user in)
    register: async (payload: any) => {
      const data = await apiFetch("/api/user/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (data.success && data.data?.token) {
        setAuthToken(data.data.token);
        setStoredUser(data.data);
      }
      return data;
    },

    // 3.a Admin User Create API [POST] (Admin creating user - does NOT overwrite logged-in session)
    createUser: async (payload: any) => {
      return apiFetch("/api/user/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // 4. User Auth API [POST] (Fetch detailed profile data)
    getUserData: async (userId: number) => {
      const data = await apiFetch("/api/user/data", {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      });
      if (data.success && data.data) {
        // Sync stored user info only for matching user
        const currentUser = getStoredUser();
        if (currentUser && (currentUser.id === userId || currentUser.user_id === userId)) {
          setStoredUser({ ...currentUser, ...data.data });
        }
      }
      return data;
    },

    // 5. User All API [POST]
    getAllUsers: async (params: any = {}) => {
      return apiFetch("/api/user/all", {
        method: "POST",
        body: JSON.stringify({
          status: params.status ?? 1,
          role_id: params.role_id ?? "",
          search: params.search ?? "",
          page: params.page ?? 1,
          per_page: params.per_page ?? 10,
        }),
      });
    },

    // 6. User Manage API [POST]
    manageUser: async (payload: any) => {
      const data = await apiFetch("/api/user/manage", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (data.success) {
        const currentUser = getStoredUser();
        const updatedUserId = payload.user_id;
        if (currentUser && (currentUser.id === updatedUserId || currentUser.user_id === updatedUserId)) {
          setStoredUser({
            ...currentUser,
            full_name: payload.full_name ?? currentUser.full_name,
            nic_number: payload.nic_number ?? currentUser.nic_number,
            contact_number: payload.contact_number ?? currentUser.contact_number,
            profile_picture: payload.profile_picture ?? currentUser.profile_picture,
            email_address: payload.email_address ?? currentUser.email_address,
            current_address: payload.current_address ?? currentUser.current_address,
            permanent_address: payload.permanent_address ?? currentUser.permanent_address,
            role_id: payload.role_id ?? currentUser.role_id,
          });
        }
      }
      return data;
    },

    // 7. Password Reset API [POST]
    resetPassword: async (payload: { user_id: number, new_password: string, new_password_confirmation: string }, authUserId?: number) => {
      const headers: any = {};
      if (authUserId) headers["USER-ID"] = String(authUserId);
      return apiFetch("/api/user/password/reset", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    },

    // 7.a Password Change API [POST]
    changePassword: async (payload: { current_password: string, new_password: string, new_password_confirmation: string }, userId?: number) => {
      const headers: any = {};
      if (userId) headers["USER-ID"] = String(userId);
      return apiFetch("/api/user/password/change", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    },

    // 8. User Logout API [POST]
    logout: async () => {
      try {
        await apiFetch("/api/user/logout", { method: "POST" });
      } catch (e) {
        // Silently ignore if already logged out from server
      } finally {
        clearAuth();
      }
    },

    // 9. User Profile Picture Change API [POST]
    changeProfilePicture: async (formData: FormData) => {
      return apiFetch("/api/user/profile/image/change", {
        method: "POST",
        body: formData,
      });
    },
    // 9.a User Profile Picture Change API (URL based) [POST]
    changeProfilePictureUrl: async (payload: {
      user_id: number;
      profile_image_url: string;
    }) => {
      return apiFetch("/api/user/profile/image/change", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // 10. User Delete API [POST]
    deleteUser: async (userId: number) => {
      return apiFetch("/api/user/delete", {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      });
    },

    // 10.a User Status Change API [POST]
    changeUserStatus: async (userId: number, status: number) => {
      return apiFetch("/api/user/status/change", {
        method: "POST",
        body: JSON.stringify({ user_id: userId, status }),
      });
    },
  },

  // === 2. ROLES & PERMISSIONS ===
  roles: {
    // 11. User Role Permission List API [POST]
    listPermissions: async (roleId: number, search: string = "") => {
      return apiFetch("/api/permission/list", {
        method: "POST",
        body: JSON.stringify({ role_id: roleId, search }),
      });
    },

    // 11.a User Role List API [POST]
    listRoles: async (status: number = 1, search: string = "") => {
      return apiFetch("/api/role/list", {
        method: "POST",
        body: JSON.stringify({ status, search }),
      });
    },

    // 12. User Role Permission Change API [POST]
    changePermission: async (payload: any) => {
      return apiFetch("/api/permission/change", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // 13. User Role Permission Change Bulk API [POST]
    changePermissionBulk: async (payload: any) => {
      return apiFetch("/api/permission/change-bulk", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  },

  // === 3. CUSTOMERS ===
  customers: {
    // 14. Customer Basic Data API [POST]
    getBasicData: async () => {
      return apiFetch("/api/customer/basic/data", { method: "POST" });
    },

    // 15. Customer Add API [POST]
    add: async (payload: any) => {
      return apiFetch("/api/customer/add", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // 16. Customer Edit API [POST]
    edit: async (payload: any) => {
      return apiFetch("/api/customer/edit", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // 17. Customer All API / 17.a List API [POST]
    list: async (params: any = {}) => {
      const payload: any = {
        search: params.search || null,
        status:
          params.status !== undefined && params.status !== ""
            ? Number(params.status)
            : null,
        visa_type_id: params.visa_type_id ? Number(params.visa_type_id) : null,
        country_id: params.country_id ? Number(params.country_id) : null,
        preferred_language_id: params.preferred_language_id
          ? Number(params.preferred_language_id)
          : null,
        customer_type_id: params.customer_type_id
          ? Number(params.customer_type_id)
          : null,
        source_id: params.source_id ? Number(params.source_id) : null,
        page: params.page ?? 1,
        per_page: params.per_page ?? 10,
      };
      return apiFetch("/api/customer/list", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // 18. Customer Profile Picture Change API [POST]
    changeProfilePicture: async (formData: FormData) => {
      return apiFetch("/api/customer/profile/image/change", {
        method: "POST",
        body: formData,
      });
    },
    // 18.a Customer Profile Picture Change API (URL based) [POST]
    changeProfilePictureUrl: async (payload: {
      customer_id: number;
      profile_picture: string;
    }) => {
      return apiFetch("/api/customer/profile/image/change", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // 19. Customer Delete API [POST]
    delete: async (customerId: number) => {
      return apiFetch("/api/customer/delete", {
        method: "POST",
        body: JSON.stringify({ customer_id: customerId }),
      });
    },

    // 20. Customer Status Change API [POST]
    changeStatus: async (customerId: number, status: number) => {
      return apiFetch("/api/customer/status/change", {
        method: "POST",
        body: JSON.stringify({ customer_id: customerId, status }),
      });
    },

    // 21. Customer Data Get API [POST] (View detail profile)
    get: async (customerId: number) => {
      return apiFetch("/api/customer/data", {
        method: "POST",
        body: JSON.stringify({ customer_id: customerId }),
      });
    },

    // === CUSTOMER DOCUMENTS ===
    // 22. Customer Document Add API [POST]
    addDocument: async (payload: any) => {
      return apiFetch("/api/customer/document/add", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // 23. Customer Document Edit API [POST]
    editDocument: async (payload: any) => {
      return apiFetch("/api/customer/document/edit", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // 24. Customer Document Delete API [POST]
    deleteDocument: async (documentId: number) => {
      return apiFetch("/api/customer/document/delete", {
        method: "POST",
        body: JSON.stringify({ document_id: documentId }),
      });
    },

    // 25. Customer Document File Upload API [POST]
    uploadDocumentFile: async (payload: { document_id: number; files: { file_url: string; file_name: string }[] }) => {
      return apiFetch("/api/customer/document/file/upload", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // 26. Customer Document File Delete API [POST]
    deleteDocumentFile: async (documentId: number, fileId?: number) => {
      return apiFetch("/api/customer/document/file/delete", {
        method: "POST",
        body: JSON.stringify({ document_file_id: fileId }),
      });
    },

    // 27. Customer Document View API [POST]
    // Lists all documents for a customer (customer_id, status: -1 = all)
    viewDocument: async (customerId: number) => {
      return apiFetch("/api/customer/document/view", {
        method: "POST",
        body: JSON.stringify({ customer_id: customerId, status: -1, page: 1, per_page: 50 }),
      });
    },

    // 28. Customer Document File View API [POST]
    // Lists all files attached to a document
    viewDocumentFile: async (documentId: number) => {
      return apiFetch("/api/customer/document/file/view", {
        method: "POST",
        body: JSON.stringify({ document_id: documentId }),
      });
    },
  },

  // === 4. TRANSACTIONS & LEDGER ===
  transactions: {
    // 29. Transaction Category List API [POST]
    listCategories: async (transactionType: number = 1) => {
      return apiFetch("/api/transaction/category/list", {
        method: "POST",
        body: JSON.stringify({ transaction_type: transactionType }),
      });
    },

    // 39. Transaction Add API [POST]
    add: async (payload: any) => {
      return apiFetch("/api/transaction/add", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // 40. Transaction List API [POST]
    list: async (params: any = {}) => {
      return apiFetch("/api/transaction/list", {
        method: "POST",
        body: JSON.stringify({
          search: params.search ?? null,
          customer_id: params.customer_id ?? null,
          transaction_type: params.transaction_type ?? null,
          transaction_category_id: params.transaction_category_id ?? null,
          date_from: params.date_from ?? null,
          date_to: params.date_to ?? null,
          page: params.page ?? 1,
          per_page: params.per_page ?? 20,
        }),
      });
    },

    // 41. Company Ledger API [POST]
    getCompanyLedger: async (params: any = {}) => {
      return apiFetch("/api/ledger/company", {
        method: "POST",
        body: JSON.stringify({
          search: params.search ?? "",
          transaction_type: params.transaction_type ?? "",
          date_from: params.date_from ?? params.start_date ?? "",
          date_to: params.date_to ?? params.end_date ?? "",
          page: params.page ?? 1,
          per_page: params.per_page ?? 20,
        }),
      });
    },

    // 42. Customer Ledger API [POST]
    getCustomerLedger: async (params: any = {}) => {
      return apiFetch("/api/ledger/customer", {
        method: "POST",
        body: JSON.stringify({
          customer_id: params.customer_id ?? null,
          search: params.search ?? "",
          date_from: params.date_from ?? "",
          date_to: params.date_to ?? "",
          page: params.page ?? 1,
          per_page: params.per_page ?? 20,
        }),
      });
    },

    // 43. Transaction Delete API [POST]
    delete: async (transactionId: number, reason: string = "Deleted from dashboard") => {
      const user = getStoredUser();
      const userId = user?.user_id || user?.id || 1;
      return apiFetch("/api/transaction/delete", {
        method: "POST",
        body: JSON.stringify({
          transaction_id: transactionId,
          user_id: userId,
          reason,
        }),
      });
    },
  },

  // === 5. TASKS ===
  tasks: {
    // 44. Task Add API [POST]
    add: async (payload: any) => {
      return apiFetch("/api/task/add", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // 45. Task Edit API [POST]
    edit: async (payload: any) => {
      return apiFetch("/api/task/edit", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // 46. Task Delete API [POST]
    delete: async (taskId: number) => {
      return apiFetch("/api/task/delete", {
        method: "POST",
        body: JSON.stringify({ task_id: taskId }),
      });
    },

    // 47. Task List API [POST]
    list: async (params: any = {}) => {
      return apiFetch("/api/task/list", {
        method: "POST",
        body: JSON.stringify({
          status: params.status ?? "",
          search: params.search ?? "",
          page: params.page ?? 1,
          per_page: params.per_page ?? 10,
        }),
      });
    },

    // 48. Task View API [POST]
    view: async (taskId: number) => {
      return apiFetch("/api/task/view", {
        method: "POST",
        body: JSON.stringify({ task_id: taskId }),
      });
    },

    // 49. Task Status Change API [POST]
    changeStatus: async (taskId: number, status: number) => {
      const user = getStoredUser();
      const userId = user?.user_id || user?.id || 1;
      return apiFetch("/api/task/status/change", {
        method: "POST",
        body: JSON.stringify({
          task_id: taskId,
          task_status: status,
          user_id: userId,
        }),
      });
    },

    // 50. My Task List API [POST]
    listMy: async (params: any = {}) => {
      const user = getStoredUser();
      const userId = user?.user_id || user?.id || 1;
      return apiFetch("/api/task/my", {
        method: "POST",
        body: JSON.stringify({
          user_id: params.user_id ?? userId,
          status: params.status ?? "",
          search: params.search ?? "",
          page: params.page ?? 1,
          per_page: params.per_page ?? 10,
        }),
      });
    },
  },

  // === 6. INVOICES ===
  invoices: {
    // 51. Invoice Basic Data Get API [POST]
    getBasicData: async () => {
      return apiFetch("/api/customer/invoice/basic-data", { method: "POST" });
    },

    // 52. Invoice Add API [POST]
    add: async (payload: any) => {
      return apiFetch("/api/customer/invoice/add", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // 53. Invoice Edit API [POST]
    edit: async (payload: any) => {
      return apiFetch("/api/customer/invoice/edit", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // 54. Invoice Status Change API [POST]
    changeStatus: async (invoiceId: number, status: any) => {
      const user = getStoredUser();
      const userId = user?.user_id || user?.id || 1;

      const bodyPayload =
        typeof status === "object"
          ? { invoice_id: invoiceId, user_id: userId, ...status }
          : {
              invoice_id: invoiceId,
              user_id: userId,
              invoice_status: status,
              description:
                status === 2
                  ? "Invoice issued to customer"
                  : status === 5
                    ? "Invoice cancelled"
                    : "Invoice status updated",
            };

      return apiFetch("/api/customer/invoice/status/change", {
        method: "POST",
        body: JSON.stringify(bodyPayload),
      });
    },

    // 55. Invoice Pay API [POST]
    pay: async (payload: any) => {
      return apiFetch("/api/customer/invoice/pay", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // 56. Invoice List API [POST]
    list: async (params: any = {}) => {
      const payload: any = {
        search: params.search ?? "",
        customer_id: params.customer_id || null,
        invoice_status:
          params.status !== undefined && params.status !== ""
            ? Number(params.status)
            : null,
        currency_code: params.currency_code || null,
        from_date: params.from_date || null,
        to_date: params.to_date || null,
        per_page: params.per_page ?? 10,
        page: params.page ?? 1,
      };
      return apiFetch("/api/customer/invoice/list", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // 57. Invoice Data API [POST]
    getData: async (invoiceId: number) => {
      return apiFetch("/api/customer/invoice/data", {
        method: "POST",
        body: JSON.stringify({ invoice_id: invoiceId }),
      });
    },

    // 64. Invoice Delete API [POST]
    delete: async (invoiceId: number, description: string = "Deleted from dashboard") => {
      const user = getStoredUser();
      const userId = user?.user_id || user?.id || 1;
      return apiFetch("/api/customer/invoice/delete", {
        method: "POST",
        body: JSON.stringify({
          invoice_id: invoiceId,
          user_id: userId,
          description,
        }),
      });
    },
  },

  // === 7. QUOTATIONS ===
  quotations: {
    // 58. Quotation Add API [POST]
    add: async (payload: any) => {
      return apiFetch("/api/customer/quotation/add", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // 59. Quotation List API [POST]
    list: async (params: any = {}) => {
      const payload: any = {
        search: params.search ?? "",
        quotation_status:
          params.quotation_status !== undefined &&
          params.quotation_status !== ""
            ? Number(params.quotation_status)
            : null,
        currency_code: params.currency_code || null,
        from_date: params.from_date || null,
        to_date: params.to_date || null,
        page: params.page ?? 1,
        per_page: params.per_page ?? 10,
      };
      return apiFetch("/api/customer/quotation/list", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // 60. Quotation Data API [POST]
    getData: async (quotationId: number) => {
      return apiFetch("/api/customer/quotation/data", {
        method: "POST",
        body: JSON.stringify({ quotation_id: quotationId }),
      });
    },

    // 61. Quotation Status Change API [POST]
    changeStatus: async (quotationId: number, status: any) => {
      const bodyPayload =
        typeof status === "object"
          ? { quotation_id: quotationId, ...status }
          : { quotation_id: quotationId, status };
      return apiFetch("/api/customer/quotation/status/change", {
        method: "POST",
        body: JSON.stringify(bodyPayload),
      });
    },

    // 62. Quotation Manage API [POST]
    manage: async (payload: any) => {
      return apiFetch("/api/customer/quotation/manage", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    // 63. Quotation Delete API [POST]
    delete: async (quotationId: number, description: string = "Deleted from dashboard") => {
      const user = getStoredUser();
      const userId = user?.user_id || user?.id || 1;
      return apiFetch("/api/customer/quotation/delete", {
        method: "POST",
        body: JSON.stringify({
          quotation_id: quotationId,
          user_id: userId,
          description,
        }),
      });
    },
  },
};
