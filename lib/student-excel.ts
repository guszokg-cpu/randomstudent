"use client";

import type { Classroom, Group, Student } from "@/lib/types";
import { STUDENT_EXCEL_HEADERS, type StudentExcelKey, type StudentImportRow } from "@/lib/student-import";

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-");
}

function cellText(value: unknown) {
  if (value == null) return "";
  if (typeof value === "object") {
    const maybe = value as { text?: string; result?: unknown; richText?: Array<{ text: string }> };
    if (typeof maybe.text === "string") return maybe.text.trim();
    if (maybe.result != null) return cellText(maybe.result);
    if (Array.isArray(maybe.richText)) return maybe.richText.map((part) => part.text).join("").trim();
  }
  return String(value).trim();
}

function numberCell(value: unknown) {
  if (typeof value === "number") return value;
  const parsed = Number(cellText(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export async function downloadStudentExcelTemplate({
  classroom,
  students,
  groups
}: {
  classroom: Classroom;
  students: Student[];
  groups: Group[];
}) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "สุ่มสนุก ดาวนักคิด";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("รายชื่อนักเรียน", {
    views: [{ state: "frozen", ySplit: 3 }]
  });
  const optionsSheet = workbook.addWorksheet("ตัวเลือก");

  sheet.mergeCells("A1:H1");
  sheet.getCell("A1").value = `แบบฟอร์มนำเข้ารายชื่อนักเรียน ${classroom.name}`;
  sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4C1D95" } };

  sheet.mergeCells("A2:H2");
  sheet.getCell("A2").value = "แก้ไขชื่อ ชื่อเล่น เลขที่ กลุ่ม หรือสถานะได้ โดยอย่าลบคอลัมน์ student_id ถ้าต้องการอัปเดตนักเรียนเดิมและรักษาดาวสะสม";
  sheet.getCell("A2").font = { bold: true, color: { argb: "FF6D28D9" } };
  sheet.getCell("A2").alignment = { wrapText: true };

  sheet.addRow(STUDENT_EXCEL_HEADERS.map((header) => header.label));
  const headerRow = sheet.getRow(3);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C3AED" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  sheet.columns = STUDENT_EXCEL_HEADERS.map((header) => ({
    key: header.key,
    header: header.label,
    width:
      header.key === "full_name"
        ? 28
        : header.key === "nickname" || header.key === "group_name"
          ? 16
          : header.key === "student_code"
            ? 22
            : 14,
    hidden: "hidden" in header ? header.hidden : false
  }));

  students
    .slice()
    .sort((a, b) => a.student_number - b.student_number)
    .forEach((student) => {
      const group = groups.find((item) => item.id === student.group_id);
      sheet.addRow({
        student_id: student.id,
        student_code: student.student_code,
        student_number: student.student_number,
        full_name: student.full_name,
        nickname: student.nickname,
        group_name: group?.name ?? "",
        group_id: group?.id ?? "",
        status: student.status
      });
    });

  for (let rowNumber = 4; rowNumber <= 203; rowNumber += 1) {
    sheet.getCell(`C${rowNumber}`).dataValidation = {
      type: "whole",
      operator: "greaterThan",
      formulae: [0],
      showErrorMessage: true,
      errorTitle: "เลขที่ไม่ถูกต้อง",
      error: "กรุณาใส่เลขที่เป็นตัวเลขตั้งแต่ 1 ขึ้นไป"
    };
    sheet.getCell(`F${rowNumber}`).dataValidation = {
      type: "list",
      formulae: ["'ตัวเลือก'!$A$2:$A$100"],
      allowBlank: true
    };
    sheet.getCell(`H${rowNumber}`).dataValidation = {
      type: "list",
      formulae: ['"active,inactive"'],
      allowBlank: false
    };
  }

  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE9D5FF" } },
        bottom: { style: "thin", color: { argb: "FFE9D5FF" } }
      };
      cell.alignment = { vertical: "middle", wrapText: true };
    });
  });

  optionsSheet.getCell("A1").value = "กลุ่ม";
  optionsSheet.getCell("B1").value = "group_id";
  optionsSheet.getRow(1).font = { bold: true };
  groups.forEach((group, index) => {
    optionsSheet.getCell(index + 2, 1).value = group.name;
    optionsSheet.getCell(index + 2, 2).value = group.id;
  });
  optionsSheet.state = "veryHidden";

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `แบบฟอร์มนักเรียน-${safeFileName(classroom.name)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function parseStudentExcelFile(file: File): Promise<StudentImportRow[]> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.getWorksheet("รายชื่อนักเรียน") ?? workbook.worksheets[0];
  if (!sheet) throw new Error("ไม่พบชีตในไฟล์ Excel");

  let headerRowNumber = 0;
  const headerMap = new Map<StudentExcelKey, number>();

  sheet.eachRow((row, rowNumber) => {
    if (headerRowNumber) return;
    const labels = row.values as unknown[];
    STUDENT_EXCEL_HEADERS.forEach((header) => {
      const foundIndex = labels.findIndex((value) => cellText(value) === header.label);
      if (foundIndex > 0) headerMap.set(header.key, foundIndex);
    });
    if (headerMap.has("student_number") && headerMap.has("full_name")) {
      headerRowNumber = rowNumber;
    } else {
      headerMap.clear();
    }
  });

  if (!headerRowNumber) {
    throw new Error("ไฟล์นี้ไม่มีหัวตารางตามแบบฟอร์ม กรุณาโหลดแบบฟอร์มใหม่จากระบบ");
  }

  const rows: StudentImportRow[] = [];
  for (let rowNumber = headerRowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const read = (key: StudentExcelKey) => cellText(row.getCell(headerMap.get(key) ?? 0).value);
    const studentNumber = numberCell(row.getCell(headerMap.get("student_number") ?? 0).value);
    rows.push({
      rowNumber,
      student_id: read("student_id"),
      student_code: read("student_code"),
      student_number: studentNumber,
      full_name: read("full_name"),
      nickname: read("nickname"),
      group_name: read("group_name"),
      group_id: read("group_id"),
      status: read("status") as StudentImportRow["status"]
    });
  }

  return rows;
}
