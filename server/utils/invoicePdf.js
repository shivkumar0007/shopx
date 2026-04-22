const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

const escapePdfText = (value) =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, " ");

const formatCurrency = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const buildTextLine = (text, x, y, size = 11) =>
  `BT /F1 ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`;

const buildInvoiceLines = (order) => {
  const createdDate = new Date(order.createdAt || Date.now()).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  const headerLines = [
    buildTextLine("SHOPX AI", 50, 760, 26),
    buildTextLine("Premium order invoice", 50, 736, 12),
    buildTextLine(`Invoice No: ${order.invoiceNumber || "Pending"}`, 50, 700, 12),
    buildTextLine(`Order ID: ${order.razorpayOrderId || order._id}`, 50, 682, 12),
    buildTextLine(`Issued On: ${createdDate}`, 50, 664, 12),
    buildTextLine(`Status: ${order.orderStatus || "Processing"}`, 50, 646, 12),
    buildTextLine("Customer Details", 50, 614, 14),
    buildTextLine(`Name: ${order.user?.name || "SHOPX Customer"}`, 50, 594, 11),
    buildTextLine(`Email: ${order.user?.email || "Not provided"}`, 50, 578, 11),
    buildTextLine("Product Summary", 50, 548, 14)
  ];

  let currentY = 524;
  const itemLines = (order.items || []).flatMap((item, index) => {
    const productName = item.productName || item.product?.name || `Product ${index + 1}`;
    const quantity = Number(item.quantity || 1);
    const price = Number(item.price || 0);
    const total = quantity * price;

    const lines = [
      buildTextLine(`${index + 1}. ${productName}`, 60, currentY, 11),
      buildTextLine(`Qty: ${quantity}   Unit: ${formatCurrency(price)}   Line Total: ${formatCurrency(total)}`, 78, currentY - 16, 10)
    ];

    currentY -= 38;
    return lines;
  });

  const footerStart = Math.max(currentY - 6, 132);
  const footerLines = [
    buildTextLine("Order Total", 50, footerStart, 15),
    buildTextLine(formatCurrency(order.totalPrice), 50, footerStart - 22, 18),
    buildTextLine("Thank you for shopping with SHOPX AI.", 50, 88, 12),
    buildTextLine("This invoice was generated automatically after successful payment.", 50, 72, 10)
  ];

  return [...headerLines, ...itemLines, ...footerLines];
};

export const generateInvoicePdfBuffer = (order) => {
  const contentStream = buildInvoiceLines(order).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
};
