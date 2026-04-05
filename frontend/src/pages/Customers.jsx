import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import CustomerForm from '../components/CustomerForm';

const Customers = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/customers?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`);
      setRows(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/customers?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`);
        setRows(data.data || []);
        setTotal(data.total || 0);
      } catch (error) {
        toast.error('Failed to load customers');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [page]);

  const createCustomer = async (payload) => {
    setSaving(true);
    try {
      await api.post('/customers', payload);
      toast.success('Customer created');
      setShowModal(false);
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <h2 className="text-xl font-bold">Customers</h2>
        <div className="flex gap-2 w-full md:w-auto">
          <input
            className="input"
            placeholder="Search by name, phone, code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className="btn-secondary"
            onClick={() => {
              setPage(1);
              fetchCustomers();
            }}
            type="button"
          >
            Search
          </button>
          <button className="btn-primary" onClick={() => setShowModal(true)} type="button">Add Customer</button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p>Loading customers...</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="table-head">
                <th className="p-2 text-left">Code</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Phone</th>
                <th className="p-2 text-center">Loans</th>
                <th className="p-2 text-center">RDs</th>
                <th className="p-2 text-center">FDs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-slate-100 cursor-pointer hover:bg-slate-50"
                  onClick={() => navigate(`/customers/${row.id}`)}
                >
                  <td className="p-2">{row.customer_code}</td>
                  <td className="p-2">{row.name}</td>
                  <td className="p-2">{row.phone}</td>
                  <td className="p-2 text-center">{row.active_loans}</td>
                  <td className="p-2 text-center">{row.active_rds}</td>
                  <td className="p-2 text-center">{row.active_fds}</td>
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
          <div className="bg-white rounded-2xl max-w-4xl mx-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Add Customer</h3>
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Close</button>
            </div>
            <CustomerForm onSubmit={createCustomer} loading={saving} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
