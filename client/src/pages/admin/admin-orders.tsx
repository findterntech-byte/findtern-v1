import { useMemo, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import newlogo from "@assets/logo-remove.png";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  MoreVertical,
  Eye,
  Download,
  FileText,
  Receipt,
  Calendar,
  Clock,
  X,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";

type OrderItem = {
  id: string;
  internName: string;
  projectName: string;
  monthlyAmount: number | null;
};

type Employer = {
  id: string;
  companyName: string;
  companyEmail: string;
};

type Order = {
  id: string;
  orderId: string;
  employerId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  paidAt: string | null;
  createdAt: string;
  raw: any;
  employer: Employer | null;
  internName: string;
};

type AdminOrdersResponse = {
  items: Order[];
  totals: {
    totalOrders: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
  };
};

export default function AdminOrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const invoicePrintRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery<AdminOrdersResponse>({
    queryKey: [
      "/api/admin/orders",
      `?currency=${encodeURIComponent(currencyFilter)}&status=${encodeURIComponent(statusFilter)}&q=${encodeURIComponent(searchQuery)}`,
    ],
  });

  const orders = data?.items ?? [];
  const totals = data?.totals ?? { totalOrders: 0, totalAmount: 0, paidAmount: 0, pendingAmount: 0 };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = !searchQuery || 
        order.employer?.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.internName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const orderDate = order.createdAt ? new Date(order.createdAt) : null;
      let matchesDate = true;
      if (fromDate && orderDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        if (orderDate < from) matchesDate = false;
      }
      if (toDate && orderDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (orderDate > to) matchesDate = false;
      }
      
      return matchesSearch && matchesDate;
    });
  }, [orders, searchQuery, fromDate, toDate]);

  const formatCurrency = (amount: number, currency: string) => {
    const c = String(currency ?? "INR").toUpperCase();
    return new Intl.NumberFormat(c === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: c,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatAmount = (amountMinor: number, currencyCode: string) => {
    const cur = String(currencyCode || "INR").toUpperCase();
    const locale = cur === "INR" ? "en-IN" : "en-US";
    const major = Number.isFinite(amountMinor) ? amountMinor / 100 : 0;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(major || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs px-2.5 py-1 font-medium shadow-sm">Paid</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 text-xs px-2.5 py-1 font-medium shadow-sm">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs px-2.5 py-1 font-medium shadow-sm">Failed</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs px-2.5 py-1 font-medium shadow-sm">{status}</Badge>;
    }
  };

  const loadInvoice = async (order: Order) => {
    setSelectedOrder(order);
    setInvoiceLoading(true);
    setInvoiceOpen(true);
    try {
      const res = await apiRequest("GET", `/api/admin/orders/${order.orderId}/invoice`);
      const data = await res.json();
      setInvoiceData(data);
    } catch (err) {
      console.error("Failed to load invoice:", err);
      setInvoiceData({ error: "Failed to load invoice" });
    } finally {
      setInvoiceLoading(false);
    }
  };

  const [printLoading, setPrintLoading] = useState(false);

  const openInvoiceInNewTab = async () => {
    if (!invoiceData || invoiceLoading || printLoading) return;
    
    setPrintLoading(true);
    try {
      const el = invoicePrintRef.current;
      if (!el) return;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let position = 0;
      
      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      } else {
        pdf.addPage();
        while (position < imgHeight) {
          pdf.addImage(imgData, "PNG", 0, -position, imgWidth, imgHeight);
          position += pageHeight;
          if (position < imgHeight) {
            pdf.addPage();
          }
        }
      }
      
      pdf.autoPrint();
      window.open(pdf.output("bloburl"), "_blank");
    } catch (err) {
      console.error("Failed to print invoice:", err);
    } finally {
      setPrintLoading(false);
    }
  };

  const [invoiceDownloading, setInvoiceDownloading] = useState(false);

  const downloadInvoice = async () => {
    if (!invoiceData || invoiceLoading || !invoicePrintRef.current || invoiceDownloading) return;
    
    setInvoiceDownloading(true);
    try {
      const el = invoicePrintRef.current;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let position = 0;
      
      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      } else {
        pdf.addPage();
        while (position < imgHeight) {
          pdf.addImage(imgData, "PNG", 0, -position, imgWidth, imgHeight);
          position += pageHeight;
          if (position < imgHeight) {
            pdf.addPage();
          }
        }
      }
      
      const invoiceNumber = String(invoiceData?.invoiceNumber ?? "").trim() || "invoice";
      pdf.save(`${invoiceNumber}.pdf`);
    } catch (err) {
      console.error("Failed to download invoice:", err);
    } finally {
      setInvoiceDownloading(false);
    }
  };

  const renderInvoiceContent = () => {
    if (invoiceLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <span className="ml-2 text-slate-600">Loading invoice...</span>
        </div>
      );
    }

    if (!invoiceData || invoiceData.error) {
      return (
        <div className="text-center p-8 text-red-600">
          {invoiceData?.error || "Failed to load invoice"}
        </div>
      );
    }

    const payment = invoiceData.payment ?? {};
    const employer = invoiceData.employer ?? {};
    const items = Array.isArray(invoiceData.items) ? invoiceData.items : [];
    const currencyCode = String(payment?.currency ?? "INR").toUpperCase();

    const rawPaidAt = payment?.paidAt ?? payment?.paid_at ?? payment?.createdAt ?? payment?.created_at;
    const paidAt = rawPaidAt ? new Date(rawPaidAt) : null;
    const invoiceDate = paidAt && !Number.isNaN(paidAt.getTime()) ? paidAt : null;
    const invoiceDateLabel = invoiceDate
      ? `${String(invoiceDate.getDate()).padStart(2, "0")}-${String(invoiceDate.getMonth() + 1).padStart(2, "0")}-${String(invoiceDate.getFullYear() % 100).padStart(2, "0")}`
      : "—";
    const invoiceNumber = String(invoiceData.invoiceNumber ?? "").trim() || "—";
    const employerCompany = String(employer?.companyName ?? "—").trim() || "—";
    const employerEmail = String(employer?.companyEmail ?? "").trim();

    const isFullTimeInvoice = items.some((it: any) => {
      const offer = (it?.offerDetails ?? {}) as any;
      const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
      const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
      const duration = String(offer?.duration ?? "").trim();
      return hasFullTimeOffer || /full[-\s]?time/i.test(duration);
    });

    const invoiceItemBaseMinor = (it: any) => {
      if (!isFullTimeInvoice) {
        return Math.round(Math.max(0, Number(it?.totalPrice ?? 0)) * 100);
      }
      const offer = (it?.offerDetails ?? {}) as any;
      const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
      const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
      if (!hasFullTimeOffer) {
        return Math.round(Math.max(0, Number(it?.totalPrice ?? 0)) * 100);
      }
      const annualCtcMajor = Number((fullTimeOffer as any)?.annualCtc ?? 0);
      if (!Number.isFinite(annualCtcMajor) || annualCtcMajor <= 0) return 0;
      const feeMajor = Math.max(0, Math.round((annualCtcMajor * 8.33) / 100));
      return Math.round(feeMajor * 100);
    };

    const subtotalMinor = items.reduce((sum: number, it: any) => sum + invoiceItemBaseMinor(it), 0);
    const totalMinor = Number(payment?.amountMinor ?? payment?.amount_minor ?? subtotalMinor);

    const gstRate = 18;
    const gstApplicable = !isFullTimeInvoice && currencyCode === "INR" && Number.isFinite(totalMinor) && totalMinor > 0;

    const subtotalFromTotalMinor = gstApplicable ? Math.round((Math.max(0, totalMinor) * 100) / 118) : 0;
    const gstMinor = gstApplicable ? Math.max(0, Math.max(0, totalMinor) - subtotalFromTotalMinor) : 0;
    const totalWithTaxMinor = Math.max(0, totalMinor);

    const discountMinorRaw = Math.max(0, subtotalMinor - totalWithTaxMinor);
    const discountRatio = subtotalMinor > 0 ? discountMinorRaw / subtotalMinor : 0;
    const showTenPercentDiscount = discountMinorRaw > 0 && Math.abs(discountRatio - 0.1) <= 0.02;
    const discountMinor = showTenPercentDiscount ? discountMinorRaw : 0;

    const subtotalDisplayMinor = isFullTimeInvoice
      ? totalWithTaxMinor
      : gstApplicable
        ? subtotalFromTotalMinor
        : subtotalMinor;

    return (
      <div ref={invoicePrintRef} className="invoice-print-root mx-auto w-full max-w-[980px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-emerald-900 text-white">
          <div className="px-6 py-5 flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <img src={newlogo} alt="Findtern" className="h-14 w-auto" />
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-white">Findtern Private Limited</p>
                  <p className="text-[11px] text-white/90">386, Jagatpura, Jaipur, Rajasthan (302017)</p>
                  <p className="text-[11px] text-white/90">GST: 08AAGCF2512F1Z0</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold tracking-wide text-white">INVOICE</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-slate-700">Invoice Date :</p>
              <p className="text-sm text-slate-900 mt-1">{invoiceDateLabel}</p>

              <p className="text-xs font-semibold text-slate-700 mt-4">Invoice Number :</p>
              <p className="text-sm text-slate-900 mt-1">{invoiceNumber}</p>
            </div>

            <div className="md:text-right">
              <p className="text-xs font-semibold text-slate-700">Invoice to :</p>
              <p className="text-sm text-slate-900 mt-1">{employerCompany}</p>
              {employerEmail ? <p className="text-sm text-slate-700">{employerEmail}</p> : null}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-emerald-950 text-white">
                  <th className="text-left text-xs font-semibold px-3 py-2">ITEM DESCRIPTION</th>
                  <th className="text-right text-xs font-semibold px-3 py-2">PRICE ({currencyCode})</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-sm text-slate-700" colSpan={2}>
                      No items
                    </td>
                  </tr>
                ) : (
                  items.map((item: any, idx: number) => {
                    const offer = (item?.offerDetails ?? {}) as any;
                    const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
                    const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
                    const duration = String(offer?.duration ?? item?.duration ?? "").trim();
                    const monthlyAmount = offer?.monthlyAmount;
                    const roleTitle = String(offer?.roleTitle ?? "").trim();

                    const descriptionMain = String(item?.internName ?? "").trim()
                      ? `${String(item?.internName)}${roleTitle ? ` — ${roleTitle}` : ""}`
                      : String(item?.projectName ?? "").trim()
                        ? String(item?.projectName)
                        : `Proposal ${String(item?.proposalId ?? "")}`;

                    const detailParts: string[] = [];
                    if (duration) detailParts.push(duration);

                    const isFullTimeOffer = hasFullTimeOffer || /full[-\s]?time/i.test(duration);
                    const annualCtc = Number(
                      (hasFullTimeOffer ? (fullTimeOffer as any)?.annualCtc : undefined) ??
                        offer?.annualCtc ??
                        offer?.annual_ctc ??
                        offer?.ctcAmount ??
                        offer?.ctc_amount ??
                        offer?.ctc ??
                        0,
                    );

                    if (isFullTimeOffer) {
                      if (Number.isFinite(annualCtc) && annualCtc > 0) {
                        detailParts.push(`Annual CTC: ${formatAmount(Math.round(annualCtc * 100), currencyCode)}`);
                      }
                    } else if (typeof monthlyAmount === "number" && Number.isFinite(monthlyAmount) && monthlyAmount > 0) {
                      detailParts.push(`${monthlyAmount}/month`);
                    }

                    const detail = detailParts.join(" · ");
                    const rowMinor = invoiceItemBaseMinor(item);
                    const displayPriceMinor = isFullTimeOffer && Number.isFinite(annualCtc) && annualCtc > 0
                      ? Math.round(annualCtc * 100)
                      : rowMinor;
                    const rowKey = String(item?.proposalId ?? item?.id ?? item?.internId ?? idx);

                    const displayTitle = isFullTimeOffer
                      ? `${descriptionMain || "—"}  Full time consulting fee (8.33% of the total mentioned CTC)`
                      : (descriptionMain || "—");

                    return (
                      <tr key={rowKey} className="border-b border-slate-200">
                        <td className="px-3 py-3">
                          <p className="text-sm font-medium text-slate-900">{displayTitle}</p>
                          {detail ? <p className="text-xs text-slate-600 mt-1">{detail}</p> : null}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <p className="text-sm font-semibold text-slate-900">{formatAmount(displayPriceMinor, currencyCode)}</p>
                        </td>
                      </tr>
                    );
                  })
                )}

                {showTenPercentDiscount ? (
                  <tr>
                    <td className="px-3 py-2 text-sm font-semibold text-slate-900">Discount (10%)</td>
                    <td className="px-3 py-2 text-right text-sm text-slate-900">
                      -{formatAmount(discountMinor, currencyCode)}
                    </td>
                  </tr>
                ) : null}

                {isFullTimeInvoice ? (
                  <tr>
                  </tr>
                ) : (
                  <>
                    <tr>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900">Subtotal</td>
                      <td className="px-3 py-2 text-right text-sm text-slate-900">
                        {formatAmount(subtotalDisplayMinor, currencyCode)}
                      </td>
                    </tr>

                    <tr className="bg-slate-50">
                      <td className="px-3 py-2 text-sm font-semibold text-slate-900">GST</td>
                      <td className="px-3 py-2 text-right text-sm text-slate-900">
                        {gstApplicable ? `${gstRate}% (${formatAmount(gstMinor, currencyCode)})` : "—" }
                      </td>
                    </tr>
                  </>
                )}
                <tr>
                  <td className="px-3 py-2 text-sm font-semibold text-slate-900">Total</td>
                  <td className="px-3 py-2 text-right text-sm font-semibold text-slate-900">
                    {formatAmount(totalWithTaxMinor, currencyCode)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-emerald-900 text-white">
          <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold !text-white">SEND PAYMENTS TO:</p>
              <div className="mt-2 text-[12px] !text-white leading-5">
                <p className="!text-white ">Bank Account No:&nbsp;&nbsp;5949973545</p>
                <p className="!text-white ">Bank Name:&nbsp;&nbsp;Kotak Mahindra Bank</p>
                <p className="!text-white ">IFSC:&nbsp;&nbsp;KKBK0003572</p>
              </div>
            </div>
            <div className="md:text-right">
              <p className="text-xs font-semibold !text-white">CONTACT</p>
              <p className="mt-2 text-[12px] text-white">admin@findtern.in</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout
      title="Orders"
      description="View and manage all employer orders and invoices."
    >
      <div className="space-y-6">
        {error ? (
          <Card className="p-6 border-red-200 bg-red-50/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <X className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-800">Failed to load orders</p>
                <p className="text-xs text-red-600/80 mt-0.5">
                  {error instanceof Error ? error.message : "Please try again."}
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Orders</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage employer payments and invoices
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-blue-500">
            <p className="text-xs text-muted-foreground uppercase">Total Orders</p>
            <p className="text-2xl font-bold">{isLoading ? "..." : totals.totalOrders}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-purple-500">
            <p className="text-xs text-muted-foreground uppercase">Total Amount</p>
            <p className="text-2xl font-bold">{isLoading ? "..." : formatCurrency(totals.totalAmount, "INR")}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-emerald-500">
            <p className="text-xs text-muted-foreground uppercase">Paid</p>
            <p className="text-2xl font-bold text-emerald-600">{isLoading ? "..." : formatCurrency(totals.paidAmount, "INR")}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-yellow-500">
            <p className="text-xs text-muted-foreground uppercase">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{isLoading ? "..." : formatCurrency(totals.pendingAmount, "INR")}</p>
          </Card>
        </div>

        {/* Orders Table */}
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-muted/10 to-transparent">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Receipt className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-semibold">All Orders</h2>
                  <p className="text-xs text-muted-foreground">
                    {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""} found
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {/* Filters */}
            <div className="flex flex-col lg:flex-row flex-wrap gap-3 mb-5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by company, order ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-sm h-10"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-3 py-1.5">
                  <span className="text-[11px] text-muted-foreground font-medium">From</span>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-8 w-[130px] text-xs border-0 bg-transparent p-0 focus:ring-0"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-3 py-1.5">
                  <span className="text-[11px] text-muted-foreground font-medium">To</span>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-8 w-[130px] text-xs border-0 bg-transparent p-0 focus:ring-0"
                  />
                </div>
                {(fromDate || toDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                  <SelectTrigger className="w-[100px] h-10 text-xs">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[110px] h-10 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : filteredOrders.length > 0 ? (
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-xs font-semibold">#</TableHead>
                      <TableHead className="text-xs font-semibold">Order ID</TableHead>
                      <TableHead className="text-xs font-semibold">Employer</TableHead>
                      <TableHead className="text-xs font-semibold hidden md:table-cell">Intern</TableHead>
                      <TableHead className="text-xs font-semibold">Amount</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Date</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order, index) => (
                      <TableRow key={order.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="text-xs py-3 font-medium text-muted-foreground">
                          {String(index + 1).padStart(2, "0")}
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="font-mono text-xs bg-muted/50 px-2 py-1 rounded-md">
                            {order.orderId?.slice(0, 12)}...
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="font-medium text-sm">{order.employer?.companyName || "-"}</span>
                        </TableCell>
                        <TableCell className="py-3 text-xs hidden md:table-cell">
                          {order.internName || "-"}
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="font-semibold text-sm">
                            {formatCurrency(order.amount || 0, order.currency || "INR")}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          {getStatusBadge(order.status || "pending")}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-col text-xs">
                            <span>{order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN") : "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => setSelectedOrder(order)} className="cursor-pointer">
                                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => loadInvoice(order)} className="cursor-pointer">
                                <Receipt className="h-4 w-4 mr-2 text-muted-foreground" />
                                View Invoice
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Receipt className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-sm font-medium text-muted-foreground">No orders found</h3>
                <p className="text-xs text-muted-foreground/70 mt-1 max-w-[260px]">
                  Try adjusting your filters or search query
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder && !invoiceOpen} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (() => {
            const raw = selectedOrder.raw || {};
            const orderInfo = raw.order;
            const verificationInfo = raw.verification;
            
            return (
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Order ID</p>
                      <p className="font-mono text-sm bg-muted/50 px-2 py-1.5 rounded-lg mt-1">{selectedOrder.orderId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Status</p>
                      <div className="mt-1">{getStatusBadge(selectedOrder.status || "pending")}</div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Employer</p>
                      <p className="font-medium mt-1">{selectedOrder.employer?.companyName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Intern</p>
                      <p className="font-medium mt-1">{selectedOrder.internName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Amount</p>
                      <p className="font-bold text-lg mt-1">{formatCurrency(selectedOrder.amount || 0, selectedOrder.currency || "INR")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Payment Method</p>
                      <p className="font-medium mt-1">{selectedOrder.paymentMethod || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Created</p>
                      <p className="font-medium mt-1">{selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString("en-IN") : "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Paid At</p>
                      <p className="font-medium mt-1">{selectedOrder.paidAt ? new Date(selectedOrder.paidAt).toLocaleString("en-IN") : "-"}</p>
                    </div>
                  </div>
            
                  
         
                  
                  {raw && Object.keys(raw).length > 0 && !orderInfo && !verificationInfo && (
                    <div className="border-t pt-4">
                      <p className="text-xs text-muted-foreground uppercase mb-2">Additional Details</p>
                      <div className="bg-muted/30 p-3 rounded-lg text-sm space-y-1">
                        {Object.entries(raw).map(([key, value]) => {
                          if (value && typeof value === "object") {
                            return (
                              <div key={key} className="flex flex-col">
                                <span className="text-muted-foreground capitalize">{key}:</span>
                                <pre className="text-xs mt-1 whitespace-pre-wrap break-all">
                                  {JSON.stringify(value, null, 2)}
                                </pre>
                              </div>
                            );
                          }
                          return (
                            <div key={key} className="flex justify-between">
                              <span className="text-muted-foreground capitalize">{key}:</span>
                              <span className="font-medium">{String(value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => loadInvoice(selectedOrder)}>
                  <Receipt className="h-4 w-4 mr-2" />
                  View Invoice
                </Button>
              </div>
            </div>
            </ScrollArea>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={invoiceOpen} onOpenChange={(open) => { setInvoiceOpen(open); if (!open) setInvoiceData(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-gradient-to-r from-[#0E6049] to-[#065f46] text-white">
            <DialogTitle>Invoice</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto p-4">
            {renderInvoiceContent()}
            <div className="p-4 border-t flex gap-3 justify-end">
            <Button 
              variant="outline" 
              onClick={openInvoiceInNewTab}
              disabled={!invoiceData || invoiceLoading || printLoading}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {printLoading ? "Preparing..." : "Print"}
            </Button>
            <Button 
              variant="default" 
              onClick={downloadInvoice}
              disabled={!invoiceData || invoiceLoading || invoiceDownloading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Download className="h-4 w-4 mr-2" />
              {invoiceDownloading ? "Generating..." : "Download PDF"}
            </Button>
          </div>
          </div>
          
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
