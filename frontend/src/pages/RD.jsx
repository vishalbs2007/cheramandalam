import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import RDForm from '../components/RDForm';
import PaymentModal from '../components/PaymentModal';
import CalculatorPanel from '../components/CalculatorPanel';

const RD = () => {
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [calcInput, setCalcInput] = useState({ monthly_amount: '', interest_rate: '', tenure_months: '' });
  const [calcResult, setCalcResult] = useState(null);

  const load = async () => {
    try {
      const [r, c] = await Promise.all([
        api.get(`/rd?status=${status}`),
        api.get('/customers?page=1&limit=1000')
      ]);
      setRows(r.data || []);
      setCustomers(c.data?.data || []);
    } catch {
      toast.error('Failed to load RD data');
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!calcInput.monthly_amount || !calcInput.interest_rate || !calcInput.tenure_months) return;
      try {
        const { data } = await api.post('/rd/calculate', calcInput);
        setCalcResult(data);
      } catch {
        setCalcResult(null);
      }
    };
    run();
  }, [calcInput]);

  const create = async (payload) => {
    setSaving(true);
    try {
      await api.post('/rd', payload);
      toast.success('RD created');
      setShowModal(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const pay = async (payload) => {
    try {
      await api.post(`/rd/${payTarget.id}/pay`, payload);
      toast.success('Installment paid');
      setPayTarget(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Payment failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card md:col-span-2 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Recurring Deposits</h2>
            <div className="flex gap-2">
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="matured">Matured</option>
              </select>
              <button className="btn-secondary" type="button" onClick={load}>Filter</button>
              <button className="btn-primary" type="button" onClick={() => setShowModal(true)}>Create RD</button>
            </div>
          </div>

          <table className="min-w-full text-sm">
            <thead>
              <tr className="table-head">
                <th className="p-2 text-left">RD No</th>
                <th className="p-2 text-left">Customer</th>
                <th className="p-2 text-right">Monthly</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-2">{row.rd_no}</td>
                  <td className="p-2">{row.customer_name}</td>
                  <td className="p-2 text-right">Rs. {Number(row.monthly_amount).toLocaleString('en-IN')}</td>
                  <td className="p-2"><span className={`status-badge status-${row.rd_status}`}>{row.rd_status}</span></td>
                  <td className="p-2">
                    {row.rd_status === 'active' && (
                      <button className="btn-primary !px-3 !py-1.5" onClick={() => setPayTarget(row)} type="button">
                        Pay Installment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <CalculatorPanel title="RD Calculator" result={calcResult}>
          <input className="input" type="number" placeholder="Monthly Amount" value={calcInput.monthly_amount} onChange={(e) => setCalcInput((p) => ({ ...p, monthly_amount: e.target.value }))} />
          <input className="input" type="number" placeholder="Rate %" value={calcInput.interest_rate} onChange={(e) => setCalcInput((p) => ({ ...p, interest_rate: e.target.value }))} />
          <input className="input" type="number" placeholder="Tenure months" value={calcInput.tenure_months} onChange={(e) => setCalcInput((p) => ({ ...p, tenure_months: e.target.value }))} />
        </CalculatorPanel>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl mx-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Create RD</h3>
              <button className="btn-secondary" type="button" onClick={() => setShowModal(false)}>Close</button>
            </div>
            <RDForm customers={customers} onSubmit={create} loading={saving} />
          </div>
        </div>
      )}

      <PaymentModal
        open={Boolean(payTarget)}
        title={`Pay RD - ${payTarget?.rd_no || ''}`}
        onClose={() => setPayTarget(null)}
        onSubmit={pay}
      />
    </div>
  );
};

export default RD;
