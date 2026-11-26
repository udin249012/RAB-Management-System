import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { RabDetail, ReportColumn, ReportDataset } from "@rab/shared-types";

function formatCurrencyText(amount: number, currency = "IDR"): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumberText(val: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(val);
}

function formatCellValue(
  raw: string | number | undefined,
  format: ReportColumn["format"] = "text",
  currency = "IDR",
): string {
  if (raw === undefined || raw === null) return "-";
  if (format === "currency" && typeof raw === "number") {
    return formatCurrencyText(raw, currency);
  }
  if (format === "number" && typeof raw === "number") {
    return formatNumberText(raw);
  }
  if (format === "percent" && typeof raw === "number") {
    return `${formatNumberText(raw)}%`;
  }
  return String(raw);
}

function collectPdfBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export async function generateReportPdfBuffer(dataset: ReportDataset): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 36,
  });

  const bufferPromise = collectPdfBuffer(doc);
  const pageWidth = doc.page.width - 72;
  const currency = dataset.companySnapshot.currency || "IDR";

  // Header
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .fillColor("#0f172a")
    .text(dataset.companySnapshot.companyName);
  doc
    .fontSize(8.5)
    .font("Helvetica")
    .fillColor("#475569")
    .text(
      `${dataset.companySnapshot.address} | Telp: ${dataset.companySnapshot.phone} | Email: ${dataset.companySnapshot.email}`,
    );

  doc.moveDown(0.5);
  doc
    .moveTo(36, doc.y)
    .lineTo(36 + pageWidth, doc.y)
    .strokeColor("#2563eb")
    .lineWidth(1.5)
    .stroke();
  doc.moveDown(0.6);

  doc.fontSize(13).font("Helvetica-Bold").fillColor("#1e293b").text(dataset.title);
  doc
    .fontSize(8.5)
    .font("Helvetica")
    .fillColor("#475569")
    .text(
      `No. Laporan: ${dataset.documentNumber}   |   Tanggal Cetak: ${dataset.generatedAt.slice(0, 10)}`,
    );

  const filterEntries = Object.entries(dataset.filtersApplied);
  if (filterEntries.length > 0) {
    doc.text(`Filter: ${filterEntries.map(([k, v]) => `${k}=${v}`).join(", ")}`);
  }

  doc.moveDown(0.8);

  const colCount = Math.max(1, dataset.columns.length);
  const colWidth = pageWidth / colCount;
  const rowHeight = 20;

  const drawTableHeader = (y: number) => {
    doc.rect(36, y, pageWidth, rowHeight).fill("#1d4ed8");
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#ffffff");
    dataset.columns.forEach((col, i) => {
      doc.text(col.label, 40 + i * colWidth, y + 6, {
        width: colWidth - 8,
        align: col.align ?? "left",
        ellipsis: true,
        lineBreak: false,
      });
    });
  };

  let cursorY = doc.y;
  drawTableHeader(cursorY);
  cursorY += rowHeight;

  if (dataset.rows.length === 0) {
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#64748b")
      .text("Tidak ada data untuk filter ini.", 36, cursorY + 8);
    cursorY += 26;
  } else {
    dataset.rows.forEach((row, rowIdx) => {
      if (cursorY + rowHeight > doc.page.height - 65) {
        doc.addPage();
        cursorY = 36;
        drawTableHeader(cursorY);
        cursorY += rowHeight;
      }

      if (rowIdx % 2 === 1) {
        doc.rect(36, cursorY, pageWidth, rowHeight).fill("#f8fafc");
      }

      doc.fontSize(7.8).font("Helvetica").fillColor("#0f172a");
      dataset.columns.forEach((col, i) => {
        const text = formatCellValue(row[col.key], col.format, currency);
        doc.text(text, 40 + i * colWidth, cursorY + 6, {
          width: colWidth - 8,
          align: col.align ?? "left",
          ellipsis: true,
          lineBreak: false,
        });
      });

      doc
        .moveTo(36, cursorY + rowHeight)
        .lineTo(36 + pageWidth, cursorY + rowHeight)
        .strokeColor("#e2e8f0")
        .lineWidth(0.5)
        .stroke();

      cursorY += rowHeight;
    });
  }

  if (dataset.summaryTotals.length > 0) {
    if (cursorY + 60 > doc.page.height - 40) {
      doc.addPage();
      cursorY = 36;
    }
    cursorY += 12;
    doc
      .fontSize(9.5)
      .font("Helvetica-Bold")
      .fillColor("#0f172a")
      .text("Ringkasan Total:", 36, cursorY);
    cursorY += 14;

    doc.fontSize(8.5).font("Helvetica");
    for (const total of dataset.summaryTotals) {
      const valText =
        typeof total.value === "number"
          ? formatCellValue(total.value, total.format ?? "number", currency)
          : String(total.value);
      doc.text(`${total.label}: ${valText}`, 36, cursorY);
      cursorY += 13;
    }
  }

  return bufferPromise;
}

export async function generateReportExcelBuffer(dataset: ReportDataset): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(dataset.title.slice(0, 30));

  sheet.addRow([dataset.companySnapshot.companyName]).font = { bold: true, size: 14 };
  sheet.addRow([
    `${dataset.companySnapshot.address} | Telp: ${dataset.companySnapshot.phone} | Email: ${dataset.companySnapshot.email}`,
  ]);
  sheet.addRow([dataset.title]).font = { bold: true, size: 12 };
  sheet.addRow([
    `No. Laporan: ${dataset.documentNumber}`,
    `Tanggal: ${dataset.generatedAt.slice(0, 10)}`,
  ]);
  sheet.addRow([]);

  const headerRow = sheet.addRow(dataset.columns.map((c) => c.label));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
  });

  for (const row of dataset.rows) {
    sheet.addRow(dataset.columns.map((c) => row[c.key] ?? "-"));
  }

  if (dataset.summaryTotals.length > 0) {
    sheet.addRow([]);
    sheet.addRow(["RINGKASAN TOTAL"]).font = { bold: true };
    for (const total of dataset.summaryTotals) {
      sheet.addRow([total.label, total.value]);
    }
  }

  dataset.columns.forEach((col, idx) => {
    const column = sheet.getColumn(idx + 1);
    column.width = Math.max(col.label.length + 6, 18);
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function generateSingleRabPdfBuffer(detail: RabDetail): Promise<Buffer> {
  const company = detail.companySnapshot ?? {
    companyName: "PT Perusahaan Konstruksi Indonesia",
    address: "-",
    phone: "-",
    email: "-",
    currency: "IDR",
  };

  const dataset: ReportDataset = {
    reportType: "rab",
    title: `RENCANA ANGGARAN BIAYA (RAB) — ${detail.title}`,
    documentNumber: detail.documentNumber,
    generatedAt: detail.documentDate,
    companySnapshot: company,
    filtersApplied: {
      Proyek: detail.project ? `${detail.project.code} - ${detail.project.name}` : detail.projectId,
      Status: detail.status,
      Versi: `v${detail.version}`,
    },
    columns: [
      { key: "no", label: "No", align: "center", format: "number" },
      { key: "sectionName", label: "Kategori", align: "left", format: "text" },
      { key: "name", label: "Uraian Pekerjaan", align: "left", format: "text" },
      { key: "volume", label: "Volume", align: "right", format: "number" },
      { key: "unit", label: "Satuan", align: "left", format: "text" },
      { key: "unitPrice", label: "Harga Satuan", align: "right", format: "currency" },
      { key: "subtotal", label: "Jumlah Harga", align: "right", format: "currency" },
    ],
    rows: detail.items.map((item, idx) => ({
      no: idx + 1,
      sectionName: item.sectionName,
      name: item.name,
      volume: item.volume,
      unit: item.unitSnapshot,
      unitPrice: item.unitPriceSnapshot,
      subtotal: item.subtotal,
    })),
    summaryTotals: [
      { label: "Subtotal Pekerjaan", value: detail.subtotal, format: "currency" },
      {
        label: `Overhead (${detail.overheadPercent}%)`,
        value: detail.overheadAmount,
        format: "currency",
      },
      {
        label: `Profit (${detail.profitPercent}%)`,
        value: detail.profitAmount,
        format: "currency",
      },
      { label: "Biaya Tambahan", value: detail.additionalCostsTotal, format: "currency" },
      { label: `Pajak (${detail.taxPercent}%)`, value: detail.taxAmount, format: "currency" },
      { label: "Grand Total RAB", value: detail.grandTotal, format: "currency" },
    ],
  };

  return generateReportPdfBuffer(dataset);
}

export async function generateSingleRabExcelBuffer(detail: RabDetail): Promise<Buffer> {
  const company = detail.companySnapshot ?? {
    companyName: "PT Perusahaan Konstruksi Indonesia",
    address: "-",
    phone: "-",
    email: "-",
    currency: "IDR",
  };

  const dataset: ReportDataset = {
    reportType: "rab",
    title: `RAB - ${detail.title}`,
    documentNumber: detail.documentNumber,
    generatedAt: detail.documentDate,
    companySnapshot: company,
    filtersApplied: {
      Proyek: detail.project ? `${detail.project.code} - ${detail.project.name}` : detail.projectId,
      Status: detail.status,
      Versi: `v${detail.version}`,
    },
    columns: [
      { key: "no", label: "No", format: "number" },
      { key: "sectionName", label: "Kategori", format: "text" },
      { key: "name", label: "Uraian Pekerjaan", format: "text" },
      { key: "mode", label: "Metode", format: "text" },
      { key: "volume", label: "Volume", format: "number" },
      { key: "unit", label: "Satuan", format: "text" },
      { key: "unitPrice", label: "Harga Satuan", format: "currency" },
      { key: "subtotal", label: "Jumlah Harga", format: "currency" },
    ],
    rows: detail.items.map((item, idx) => ({
      no: idx + 1,
      sectionName: item.sectionName,
      name: item.name,
      mode: item.mode,
      volume: item.volume,
      unit: item.unitSnapshot,
      unitPrice: item.unitPriceSnapshot,
      subtotal: item.subtotal,
    })),
    summaryTotals: [
      { label: "Subtotal Pekerjaan", value: detail.subtotal, format: "currency" },
      {
        label: `Overhead (${detail.overheadPercent}%)`,
        value: detail.overheadAmount,
        format: "currency",
      },
      {
        label: `Profit (${detail.profitPercent}%)`,
        value: detail.profitAmount,
        format: "currency",
      },
      { label: "Biaya Tambahan", value: detail.additionalCostsTotal, format: "currency" },
      { label: `Pajak (${detail.taxPercent}%)`, value: detail.taxAmount, format: "currency" },
      { label: "Grand Total RAB", value: detail.grandTotal, format: "currency" },
    ],
  };

  return generateReportExcelBuffer(dataset);
}
