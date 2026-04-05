import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import LoanForm from '../components/LoanForm';

const Loans = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [loansRes, customersRes] = await Promise.all([
        api.get(`/loans?status=${status}&search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`),
        api.get('/customers?page=1&limit=1000')
      ]);
      setRows(loansRes.data?.data || []);
      setTotal(loansRes.data?.total || 0);
      setCustomers(customersRes.data?.data || []);
    } catch (error) {
      toast.error('Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  const createLoan = async (payload) => {
    setSaving(true);
    try {
      await api.post('/loans', payload);
      toast.success('Loan created');
      setShowModal(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <h2 className="text-xl font-bold">Loans</h2>
        <div className="flex flex-wrap gap-2">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="defaulted">Defaulted</option>
            <option value="overdue">Overdue</option>
          </select>
          <input className="input" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button
            className="btn-secondary"
            onClick={() => {
              setPage(1);
              load();
            }}
            type="button"
          >
            Filter
          </button>
          <button className="btn-primary" onClick={() => setShowModal(true)} type="button">Add Loan</button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {loading ? <p>Loading loans...</p> : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="table-head">
                <th className="p-2 text-left">Loan No</th>
                <th className="p-2 text-left">Customer</th>
                <th className="p-2 text-right">Principal</th>
                <th className="p-2 text-right">EMI</th>
                <th className="p-2 text-center">Overdue</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/loans/${row.id}`)}>
                  <td className="p-2">{row.loan_no}</td>
                  <td className="p-2">{row.customer_name}</td>
                  <td className="p-2 text-right">Rs. {Number(row.principal_amount).toLocaleString('en-IN')}</td>
                  <td className="p-2 text-right">Rs. {Number(row.emi_amount).toLocaleString('en-IN')}</td>
                  <td className="p-2 text-center">{row.overdue_count}</td>
                  <td className="p-2"><span className={`status-badge status-${row.loan_status}`}>{row.loan_status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Page {page} of {Math.max(1, Math.ceil(total / limit))}
        </p>
        <div className="flex gap-2">
          <button className="btn-secondary" type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <button
            className="btn-secondary"
            type="button"
            disabled={page >= Math.ceil(total / limit)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl mx-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Create Loan</h3>
              <button className="btn-secondary" type="button" onClick={() => setShowModal(false)}>Close</button>
            </div>
            <LoanForm customers={customers} onSubmit={createLoan} loading={saving} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Loans;
