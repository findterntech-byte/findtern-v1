import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  FileText,
  Loader2,
  ExternalLink,
  Download,
  Calendar,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import newlogo from "@assets/logo-remove.png";

type InternPayment = {
  id: string;
  internId: string;
  internName: string;
  email: string;
  amountMinor: number;
  currency: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
  invoiceNumber?: string | null;
};

type AdminInternPaymentsResponse = {
  items: InternPayment[];
  totals: {
    totalPayments: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
  };
};

export default function AdminInternInvoicesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<InternPayment | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const invoicePrintRef = useRef<HTMLDivElement>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    return params.toString() ? `?${params.toString()}` : "";
  }, [statusFilter, fromDate, toDate]);

  const { data, isLoading, error } = useQuery<AdminInternPaymentsResponse>({
    queryKey: ["/api/admin/interns/payments", queryString],
  });

  const payments = data?.items ?? [];
  const totals = data?.totals ?? { totalPayments: 0, totalAmount: 0, paidAmount: 0, pendingAmount: 0 };

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesSearch = !searchQuery || 
        payment.internName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const paymentDate = payment.createdAt ? new Date(payment.createdAt) : null;
      let matchesDate = true;
      if (fromDate && paymentDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        if (paymentDate < from) matchesDate = false;
      }
      if (toDate && paymentDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (paymentDate > to) matchesDate = false;
      }
      
      return matchesSearch && matchesDate;
    });
  }, [payments, searchQuery, fromDate, toDate]);

  const formatCurrency = (amountMinor: number, currency: string) => {
    const cur = String(currency || "INR").toUpperCase();
    const amountMajor = amountMinor / 100;
    const locale = cur === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amountMajor);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs px-2.5 py-1 font-medium shadow-sm">Paid</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 text-xs px-2.5 py-1 font-medium shadow-sm">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs px-2.5 py-1 font-medium shadow-sm">Failed</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs px-2.5 py-1 font-medium shadow-sm">{status}</Badge>;
    }
  };

  const loadInvoice = async (payment: InternPayment) => {
    setSelectedPayment(payment);
    setInvoiceLoading(true);
    setInvoiceOpen(true);
    try {
      const orderId = `intern_activation:${payment.internId}`;
      const res = await apiRequest("GET", `/api/admin/orders/${encodeURIComponent(orderId)}/invoice`);
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
    const intern = invoiceData.intern ?? {};
    const currencyCode = String(payment?.currency ?? "INR").toUpperCase();

    const rawPaidAt = invoiceData.invoiceDate ?? payment?.paidAt ?? payment?.paid_at ?? payment?.createdAt ?? payment?.created_at;
    const paidAt = rawPaidAt ? new Date(rawPaidAt) : null;
    const invoiceDate = paidAt && !Number.isNaN(paidAt.getTime()) ? paidAt : null;
    const invoiceDateLabel = invoiceDate
      ? `${String(invoiceDate.getDate()).padStart(2, "0")}-${String(invoiceDate.getMonth() + 1).padStart(2, "0")}-${String(invoiceDate.getFullYear()).slice(2)}`
      : "—";
    const invoiceNumber = String(invoiceData.invoiceNumber ?? "").trim() || "—";
    const internName = String(intern?.name ?? "—").trim() || "—";
    const internEmail = String(intern?.email ?? "").trim();

    const originalAmountMinor = 249900;
    const discountAmountMinor = Number(payment?.discountAmountMinor ?? 0);
    const finalAmountMinor = originalAmountMinor - discountAmountMinor;
    
    const gstRate = 18;
    const subtotalMinor = Math.round((finalAmountMinor * 100) / (100 + gstRate));
    const gstMinor = finalAmountMinor - subtotalMinor;
    const totalWithGstMinor = subtotalMinor + gstMinor;
    
    const hasDiscount = discountAmountMinor > 0;
    const promoCode = payment?.promoCode ?? invoiceData.promoCode;

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
              <p className="text-sm text-slate-900 mt-1">{internName}</p>
              {internEmail ? <p className="text-sm text-slate-700">{internEmail}</p> : null}
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
              <tr className="border-b border-slate-200">
                <td className="px-3 py-3">
                  <p className="text-sm font-medium text-slate-900">Intern Account Activation Fee</p>
                </td>
                <td className="px-3 py-3 text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    ₹2499
                  </p>
                </td>
              </tr>
               {hasDiscount && (
              <tr className="border-b border-slate-200">
                <td className="px-3 py-3">
                  <p className="text-sm font-medium text-emerald-600">Promo Code Discount ({promoCode})</p>
                </td>
                <td className="px-3 py-3 text-right">
                  <p className="text-sm font-semibold text-emerald-600">
                    -₹{(discountAmountMinor / 100).toFixed(2)}
                  </p>
                </td>
              </tr>
              )}
              <tr className="border-b border-slate-200">
                <td className="px-3 py-2 text-sm font-semibold text-slate-900">SubTotal</td>
                <td className="px-3 py-2 text-right text-sm font-semibold text-slate-900">
                  ₹{(subtotalMinor / 100).toFixed(2)}
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-2 text-sm font-semibold text-slate-900">GST {gstRate}%</td>
                <td className="px-3 py-2 text-right text-sm font-semibold text-slate-900">
                  ₹{(gstMinor / 100).toFixed(2)}
                </td>
              </tr>
             
              <tr>
                <td className="px-3 py-2 text-sm font-bold text-slate-900">Total</td>
                <td className="px-3 py-2 text-right text-sm font-bold text-slate-900">
                  ₹{(finalAmountMinor / 100).toFixed(2)}
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
      title="Intern Invoices"
      description="View and manage intern payment invoices."
    >
      <div className="space-y-6">
        {error ? (
          <Card className="p-6 border-red-200 bg-red-50/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-800">Failed to load payments</p>
                <p className="text-xs text-red-600/80 mt-0.5">
                  {error instanceof Error ? error.message : "Please try again."}
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Intern Invoices</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Intern account activation payments
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-4 border-l-4 border-l-blue-500">
            <p className="text-xs text-muted-foreground uppercase">Total Payments</p>
            <p className="text-2xl font-bold">{isLoading ? "..." : totals.totalPayments}</p>
          </Card>
      
          <Card className="p-4 border-l-4 border-l-emerald-500">
            <p className="text-xs text-muted-foreground uppercase">Paid</p>
            <p className="text-2xl font-bold text-emerald-600">{isLoading ? "..." : formatCurrency(totals.paidAmount * 100, "INR")}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-yellow-500">
            <p className="text-xs text-muted-foreground uppercase">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{isLoading ? "..." : formatCurrency(totals.pendingAmount * 100, "INR")}</p>
          </Card>
        </div>

        {/* Payments Table */}
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-muted/10 to-transparent">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-semibold">All Payments</h2>
                  <p className="text-xs text-muted-foreground">
                    {filteredPayments.length} payment{filteredPayments.length !== 1 ? "s" : ""} found
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
                  placeholder="Search by intern name, email..."
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
                    Clear
                  </Button>
                )}
              </div>

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

            {/* Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : filteredPayments.length > 0 ? (
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-xs font-semibold">#</TableHead>
                      <TableHead className="text-xs font-semibold">Intern Name</TableHead>
                      <TableHead className="text-xs font-semibold hidden md:table-cell">Email</TableHead>
                      <TableHead className="text-xs font-semibold">Amount</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Date</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment, index) => (
                      <TableRow key={payment.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="text-xs py-3 font-medium text-muted-foreground">
                          {String(index + 1).padStart(2, "0")}
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="font-medium text-sm">{payment.internName || "-"}</span>
                        </TableCell>
                        <TableCell className="py-3 hidden md:table-cell text-sm text-muted-foreground">
                          {payment.email || "-"}
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="font-semibold text-sm">
                            {formatCurrency(payment.amountMinor, payment.currency)}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          {getStatusBadge(payment.status)}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-col text-xs">
                            <span>{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString("en-IN") : payment.createdAt ? new Date(payment.createdAt).toLocaleDateString("en-IN") : "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadInvoice(payment)}
                            className="h-8"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Invoice
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-sm font-medium text-muted-foreground">No payments found</h3>
                <p className="text-xs text-muted-foreground/70 mt-1 max-w-[260px]">
                  Try adjusting your filters or search query
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

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