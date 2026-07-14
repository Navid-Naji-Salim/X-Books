import type { Bill, Contact, Invoice, Item, Summary, User } from "./types";

type LoginResponse = {
  token: string;
  user: User;
};

type MeResponse = {
  user: User;
};

export class ApiError extends Error {}

export const request = async <T>(
  path: string,
  token: string | null,
  options: RequestInit = {},
) => {
  const send = () => fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  let response: Response;
  try {
    response = await send();
  } catch (error) {
    if ((options.method ?? "GET") !== "GET") throw error;
    await new Promise((resolve) => setTimeout(resolve, 250));
    response = await send();
  }

  if (response.status >= 500 && (options.method ?? "GET") === "GET") {
    await new Promise((resolve) => setTimeout(resolve, 250));
    response = await send();
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(payload.error ?? "Request failed.");
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
};

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/api/auth/login", null, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: (token: string) => request<MeResponse>("/api/auth/me", token),
  summary: (token: string) => request<Summary>("/api/summary", token),
  items: (token: string) => request<Item[]>("/api/items", token),
  customers: (token: string) => request<Contact[]>("/api/customers", token),
  vendors: (token: string) => request<Contact[]>("/api/vendors", token),
  invoices: (token: string) => request<Invoice[]>("/api/invoices", token),
  bills: (token: string) => request<Bill[]>("/api/bills", token),
  nextBillNumber: (token: string) => request<{ billNumber: string }>("/api/bills/next-number", token),
  createBill: (token: string, payload: Record<string, unknown>) => request<Bill>("/api/bills", token, { method: "POST", body: JSON.stringify(payload) }),
  updateBill: (token: string, id: string, payload: Record<string, unknown>) => request<Bill>(`/api/bills/${id}`, token, { method: "PATCH", body: JSON.stringify(payload) }),
  recordBillPayment: (token: string, id: string, payload: { paymentDate: string; amount: number }) => request<null>(`/api/bills/${id}/payment`, token, { method: "POST", body: JSON.stringify(payload) }),
  deleteBill: (token: string, id: string) => request<null>(`/api/bills/${id}`, token, { method: "DELETE" }),
  createInvoice: (token: string, payload: Record<string, unknown>) =>
    request<Invoice>("/api/invoices", token, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateInvoice: (token: string, id: string, payload: Record<string, unknown>) =>
    request<Invoice>(`/api/invoices/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  recordInvoicePayment: (token: string, id: string, payload: { paymentDate: string; amount: number }) =>
    request<null>(`/api/invoices/${id}/payment`, token, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteInvoice: (token: string, id: string) =>
    request<null>(`/api/invoices/${id}`, token, { method: "DELETE" }),
  createItem: (token: string, payload: Record<string, FormDataEntryValue>) =>
    request<Item>("/api/items", token, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteItem: (token: string, id: string) =>
    request<null>(`/api/items/${id}`, token, {
      method: "DELETE",
    }),
  deleteCustomer: (token: string, id: string) =>
    request<null>(`/api/customers/${id}`, token, { method: "DELETE" }),
  updateVendor: (token: string, id: string, payload: Record<string, FormDataEntryValue>) =>
    request<Contact>(`/api/vendors/${id}`, token, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteVendor: (token: string, id: string) =>
    request<null>(`/api/vendors/${id}`, token, { method: "DELETE" }),
  createContact: (
    token: string,
    kind: "customers" | "vendors",
    payload: Record<string, FormDataEntryValue>,
  ) =>
    request<Contact>(`/api/${kind}`, token, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
