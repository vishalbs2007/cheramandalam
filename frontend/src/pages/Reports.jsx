import { useState } from 'react';
import moment from 'moment';
import toast from 'react-hot-toast';
import api from '../api/axios';

const Reports = () => {
  const [month, setMonth] = useState(moment().month() + 1);
  const [year, setYear] = useState(moment().year());
  const [monthly, setMonthly] = useState([]);
  const [overdues, setOverdues] = useState([]);

  const loadMonthly = async () => {
    try {
      const { data } = await api.get(`/dashboard/monthly-report?year=${year}&month=${month}`);
      setMonthly(data || []);
      toast.success('Monthly report loaded');
    } catch {
      toast.error('Failed to load monthly report');
    }
  };

  const loadOverdues = async () => {
    try {
      const { data } = await api.get('/loans/overdue');
      setOverdues(data || []);
      toast.success('Overdue report loaded');
    } catch {
      toast.error('Failed to load overdue report');
    }
  };

  const exportPdf = async () => {
    try {
      const response = await api.get(`/dashboard/monthly-report/pdf?year=${year}&month=${month}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `monthly-report-${year}-${month}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF exported');
    } catch {
      toast.error('Failed to export PDF');
    }
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-bold mb-3">Reports</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <input className="input w-28" type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} />
          <input className="input w-32" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
          <button className="btn-secondary" type="button" onClick={loadMonthly}>Monthly Collection Report</button>
          <button className="btn-secondary" type="button" onClick={loadOverdues}>Overdue Report</button>
          <button className="btn-primary" type="button" onClick={exportPdf}>Export to PDF</button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h3 className="font-bold mb-2">Monthly Collection Report</h3>
        <table className="min-w-full text-sm">
          <thead><tr className="table-head"><th className="p-2 text-left">Date</th><th className="p-2 text-right">Credits</th><th className="p-2 text-right">Debits</th><th className="p-2 text-right">Net</th></tr></thead>
          <tbody>
            {monthly.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{moment(r.day).format('DD-MMM-YYYY')}</td>
                <td className="p-2 text-right">Rs. {Number(r.credits).toLocaleString('en-IN')}</td>
                <td className="p-2 text-right">Rs. {Number(r.debits).toLocaleString('en-IN')}</td>
                <td className="p-2 text-right">Rs. {(Number(r.credits) - Number(r.debits)).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card overflow-x-auto">
        <h3 className="font-bold mb-2">Overdue Report</h3>
        <table className="min-w-full text-sm">
          <thead><tr className="table-head"><th className="p-2 text-left">Loan No</th><th className="p-2 text-left">Customer</th><th className="p-2">EMI #</th><th className="p-2 text-right">Amount</th><th className="p-2 text-left">Due Date</th></tr></thead>
          <tbody>
            {overdues.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-2">{o.loan_no}</td>
                <td className="p-2">{o.customer_name}</td>
                <td className="p-2">{o.emi_no}</td>
                <td className="p-2 text-right">Rs. {Number(o.emi_amount).toLocaleString('en-IN')}</td>
                <td className="p-2">{moment(o.due_date).format('DD-MMM-YYYY')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 className="font-bold">Customer Portfolio Report</h3>
        <p className="text-sm text-slate-600 mt-1">
          Use Customers and Customer Detail pages to review complete customer portfolio including loans, RD, FD, chits, and transactions.
        </p>
      </div>
    </div>
  );
};

export default Reports;
