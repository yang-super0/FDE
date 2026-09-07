import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { I18nProvider } from './i18n';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import Dashboard from './pages/Dashboard/Dashboard';
import DepartmentTargetsPage from './pages/Dashboard/DepartmentTargetsPage';
import Customers from './pages/Customers/Customers';
import Advertising from './pages/Advertising/Advertising';
import AdvertisingDetail from './pages/Advertising/AdvertisingDetail';
import Video from './pages/Video/Video';
import VideoDetail from './pages/Video/VideoDetail';
import VideoOrdersPage from './pages/Video/VideoOrdersPage';
import VideoProjectsPage from './pages/Video/VideoProjectsPage';
import VideoActorsPage from './pages/Video/VideoActorsPage';
import VideoOutsourcingPage from './pages/Video/VideoOutsourcingPage';
import VideoCommissionsPage from './pages/Video/VideoCommissionsPage';
import VideoShootingExpensesPage from './pages/Video/VideoShootingExpensesPage';
import VideoVenueExpensesPage from './pages/Video/VideoVenueExpensesPage';
import VideoSamplesPage from './pages/Video/VideoSamplesPage';
import Contracts from './pages/Contracts/Contracts';
import ContractTemplatesPage from './pages/Contracts/ContractTemplatesPage';
import ContractExpensesPage from './pages/Contracts/ContractExpensesPage';
import Finance from './pages/Finance/Finance';
import Hr from './pages/Hr/Hr';
import Admin from './pages/Admin/Admin';
import Tasks from './pages/Tasks/Tasks';
import System from './pages/System/System';
import Support from './pages/Support/Support';
import ReportCenter from './pages/Reports/ReportCenter';
import PublicPoolPage from './pages/CustomerPool/PublicPoolPage';
import InvalidPoolPage from './pages/CustomerPool/InvalidPoolPage';
import PoolAnalyticsPage from './pages/CustomerPool/PoolAnalyticsPage';
import LeadsPage from './pages/CustomerPool/LeadsPage';
import AccountApplicationsPage from './pages/AdsBusiness/AccountApplicationsPage';
import AdAccountsPage from './pages/AdsBusiness/AdAccountsPage';
import AdFilingsPage from './pages/AdsBusiness/AdFilingsPage';
import AdTransfersPage from './pages/AdsBusiness/AdTransfersPage';
import CommissionRulesPage from './pages/AdsBusiness/CommissionRulesPage';
import CommissionRecordsPage from './pages/AdsBusiness/CommissionRecordsPage';
import FinanceAccountsPage from './pages/Finance/FinanceAccountsPage';
import FinanceReceiptsPage from './pages/Finance/FinanceReceiptsPage';
import FinancePaymentsPage from './pages/Finance/FinancePaymentsPage';
import FinanceInvoicesPage from './pages/Finance/FinanceInvoicesPage';
import FinanceCostsPage from './pages/Finance/FinanceCostsPage';
import { FinanceReportsPage } from './pages/Finance/FinanceReportsPage';
import FinanceFundsPage from './pages/Finance/FinanceFundsPage';
import FinanceRebatesPage from './pages/Finance/FinanceRebatesPage';
import FinanceAdvancesPage from './pages/Finance/FinanceAdvancesPage';
import FinanceExpensesPage from './pages/Finance/FinanceExpensesPage';
import HrRecruitmentPage from './pages/Hr/HrRecruitmentPage';
import HrStaffPage from './pages/Hr/HrStaffPage';
import HrCompensationPage from './pages/Hr/HrCompensationPage';
import HrAttendancePage from './pages/Hr/HrAttendancePage';
import AdminProcurementPage from './pages/Admin/AdminProcurementPage';
import AdminAssetInventoryPage from './pages/Admin/AdminAssetInventoryPage';
import AdminWarehousePage from './pages/Admin/AdminWarehousePage';

const RoutesComponent = () => {
  return (
    <I18nProvider>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
      <Route path="workbench/targets" element={<DepartmentTargetsPage />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/public-pool" element={<PublicPoolPage />} />
        <Route
          path="customers/public-pool/invalid"
          element={<InvalidPoolPage />}
        />
        <Route
          path="customers/public-pool/analytics"
          element={<PoolAnalyticsPage />}
        />
        <Route path="customers/leads" element={<LeadsPage />} />
        <Route
          path="ads/account-applications"
          element={<AccountApplicationsPage />}
        />
        <Route path="ads/accounts" element={<AdAccountsPage />} />
        <Route path="ads/filings" element={<AdFilingsPage />} />
        <Route path="ads/transfers" element={<AdTransfersPage />} />
        <Route path="ads/commission-rules" element={<CommissionRulesPage />} />
        <Route
          path="ads/commission-records"
          element={<CommissionRecordsPage />}
        />
        <Route path="advertising" element={<Advertising />} />
        <Route path="advertising/:id" element={<AdvertisingDetail />} />
        <Route path="video" element={<Video />} />
        <Route path="video/:id" element={<VideoDetail />} />
        <Route path="video/orders" element={<VideoOrdersPage />} />
        <Route path="video/projects" element={<VideoProjectsPage />} />
        <Route path="video/actors" element={<VideoActorsPage />} />
        <Route path="video/outsourcing" element={<VideoOutsourcingPage />} />
        <Route path="video/commissions" element={<VideoCommissionsPage />} />
        <Route path="video/shooting-expenses" element={<VideoShootingExpensesPage />} />
        <Route path="video/venue-expenses" element={<VideoVenueExpensesPage />} />
        <Route path="video/samples" element={<VideoSamplesPage />} />
        <Route path="contracts" element={<Contracts />} />
        <Route path="contracts/templates" element={<ContractTemplatesPage />} />
        <Route path="contracts/expenses" element={<ContractExpensesPage />} />
        <Route path="finance" element={<Finance />} />
        <Route path="finance/accounts" element={<FinanceAccountsPage />} />
        <Route path="finance/receipts" element={<FinanceReceiptsPage />} />
        <Route path="finance/payments" element={<FinancePaymentsPage />} />
        <Route path="finance/invoices" element={<FinanceInvoicesPage />} />
        <Route path="finance/costs" element={<FinanceCostsPage />} />
        <Route path="finance/reports" element={<FinanceReportsPage />} />
        <Route path="finance/funds" element={<FinanceFundsPage />} />
        <Route path="finance/rebates" element={<FinanceRebatesPage />} />
        <Route path="finance/advances" element={<FinanceAdvancesPage />} />
        <Route path="finance/expenses" element={<FinanceExpensesPage />} />
        <Route path="hr" element={<Hr />} />
        <Route path="hr/recruitment" element={<HrRecruitmentPage />} />
        <Route path="hr/staff" element={<HrStaffPage />} />
        <Route path="hr/compensation" element={<HrCompensationPage />} />
        <Route path="hr/attendance-manage" element={<HrAttendancePage />} />
        <Route path="admin" element={<Admin />} />
        <Route path="admin/procurement" element={<AdminProcurementPage />} />
        <Route path="admin/asset-inventory" element={<AdminAssetInventoryPage />} />
        <Route path="admin/warehouse" element={<AdminWarehousePage />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="system" element={<System />} />
        <Route path="support" element={<Support />} />
        <Route path="reports" element={<ReportCenter />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
    </I18nProvider>
  );
};

export default RoutesComponent;
