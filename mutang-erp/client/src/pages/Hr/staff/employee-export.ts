import dayjs from 'dayjs';
import type { HrEmployee } from '@shared/api.interface';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';

const HR_STAFF_EXPORT_HEADERS: string[] = [
  '员工编号', '姓名', '性别', '部门', '岗位', '职级', '入职日期',
  '转正日期', '状态', '离职日期', '手机号', '邮箱',
];

/** 将员工列表导出为 Excel，返回导出的行数 */
export async function exportEmployeesToExcel(
  employees: HrEmployee[],
): Promise<number> {
  const rows: Record<string, string>[] = employees.map((item: HrEmployee) => ({
    员工编号: item.employeeNo,
    姓名: item.name,
    性别: item.gender,
    部门: item.department,
    岗位: item.position,
    职级: item.level,
    入职日期: item.entryDate ? dayjs(item.entryDate).format('YYYY-MM-DD') : '',
    转正日期: item.regularDate ? dayjs(item.regularDate).format('YYYY-MM-DD') : '',
    状态: item.status,
    离职日期: item.leaveDate ? dayjs(item.leaveDate).format('YYYY-MM-DD') : '',
    手机号: item.phone,
    邮箱: item.email,
  }));
  return exportRowsToExcel(rows, HR_STAFF_EXPORT_HEADERS, '员工档案', '员工档案');
}
