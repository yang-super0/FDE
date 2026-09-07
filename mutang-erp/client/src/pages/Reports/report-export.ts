import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';

export async function exportReportExcelRows(
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
): Promise<number> {
  const recordRows: Record<string, string>[] = rows.map(
    (row: (string | number)[]): Record<string, string> => {
      const record: Record<string, string> = {};
      headers.forEach((header: string, idx: number): void => {
        const cell: string | number | undefined = row[idx];
        record[header] = cell === undefined || cell === null ? '' : String(cell);
      });
      return record;
    },
  );
  return exportRowsToExcel(recordRows, headers, sheetName, sheetName);
}

export async function exportReportPdf(
  element: HTMLElement,
  fileName: string,
): Promise<void> {
  const canvas: HTMLCanvasElement = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
  });
  const pdf: jsPDF = new jsPDF('p', 'mm', 'a4');
  const pageWidth: number = pdf.internal.pageSize.getWidth();
  const pageHeight: number = pdf.internal.pageSize.getHeight();
  const margin: number = 5;
  const imgWidth: number = pageWidth - margin * 2;
  const ratio: number = imgWidth / canvas.width;
  const pxPerPage: number = (pageHeight - margin * 2) / ratio;

  let renderedHeight: number = 0;
  let pageIndex: number = 0;
  while (renderedHeight < canvas.height - 1) {
    const sliceHeightPx: number = Math.min(
      pxPerPage,
      canvas.height - renderedHeight,
    );
    const slice: HTMLCanvasElement = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = Math.ceil(sliceHeightPx);
    const ctx: CanvasRenderingContext2D | null = slice.getContext('2d');
    if (!ctx) {
      throw new Error('无法创建画布上下文，PDF 导出失败');
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(
      canvas,
      0,
      renderedHeight,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      canvas.width,
      sliceHeightPx,
    );
    const dataUrl: string = slice.toDataURL('image/jpeg', 0.95);
    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(dataUrl, 'JPEG', margin, margin, imgWidth, sliceHeightPx * ratio);
    renderedHeight += sliceHeightPx;
    pageIndex += 1;
  }
  pdf.save(`${fileName}_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`);
}
