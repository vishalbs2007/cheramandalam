import { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';
import api from '../api/axios';
import StatCard from '../components/StatCard';
import DueToday from '../components/DueToday';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [dueToday, setDueToday] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const now = moment();
    try {
      const [s, d, t, m] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/due-today'),
        api.get('/dashboard/recent-transactions'),
        api.get(`/dashboard/monthly-report?year=${now.year()}&month=${now.month() + 1}`)
      ]);

      setSummary(s.data);
      setDueToday(d.data);
      setTransactions(t.data);
      setMonthly(m.data.map((x) => ({ ...x, day: moment(x.day).format('DD') })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const statCards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: 'Total Customers', value: summary.counts.totalCustomers },
      { label: 'Active Loans', value: summary.counts.activeLoans },
      { label: 'Active RDs', value: summary.counts.activeRDs },
      { label: 'Active FDs', value: summary.counts.activeFDs },
      { label: 'Active Chit Groups', value: summary.counts.activeChitGroups },
      {
        label: "Today's Collection",
        value: `Rs. ${Number(summary.todaysCollection).toLocaleString('en-IN')}`
      }
    ];
  }, [summary]);

  if (loading) {
    return <div className="card">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        {statCards.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card md:col-span-1">
          <h3 className="text-base font-bold mb-3">Alerts</h3>
          <div className="space-y-2 text-sm">
            <p>Overdue EMIs: <strong>{summary.alerts.overdueEmis}</strong></p>
            <p>Overdue RDs: <strong>{summary.alerts.overdueRDInstallments}</strong></p>
            <p>FDs maturing in 30 days: <strong>{summary.alerts.maturingFDIn30Days}</strong></p>
          </div>
        </div>
        <div className="card md:col-span-2 h-72">
          <h3 className="text-base font-bold mb-3">Monthly Collection</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="credits" fill="#1e3a5f" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <DueToday rows={dueToday} />

      <div className="card overflow-x-auto">
        <h3 className="text-base font-bold mb-3">Recent Transactions</h3>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="table-head">
              <th className="p-2 text-left">Txn No</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-right">Amount</th>
              <th className="p-2 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="p-2">{row.txn_no}</td>
                <td className="p-2">{row.txn_type}</td>
                <td className="p-2">{row.customer_name || '-'}</td>
                <td className="p-2 text-right">Rs. {Number(row.amount).toLocaleString('en-IN')}</td>
                <td className="p-2">{moment(row.txn_date).format('DD-MMM-YYYY')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
