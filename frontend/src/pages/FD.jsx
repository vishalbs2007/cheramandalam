import { useEffect, useState } from 'react';
import moment from 'moment';
import toast from 'react-hot-toast';
import api from '../api/axios';
import FDForm from '../components/FDForm';
import CalculatorPanel from '../components/CalculatorPanel';

const FD = () => {
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calcInput, setCalcInput] = useState({ principal_amount: '', interest_rate: '', tenure_months: '', compounding: 'quarterly' });
  const [calcResult, setCalcResult] = useState(null);

  const load = async () => {
    try {
      const [f, c] = await Promise.all([api.get('/fd'), api.get('/customers?page=1&limit=1000')]);
      setRows(f.data || []);
      setCustomers(c.data?.data || []);
    } catch {
      toast.error('Failed to load FD data');
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!calcInput.principal_amount || !calcInput.interest_rate || !calcInput.tenure_months) return;
      try {
        const { data } = await api.post('/fd/calculate', calcInput);
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
      await api.post('/fd', payload);
      toast.success('FD created');
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
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card md:col-span-2 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Fixed Deposits</h2>
            <button className="btn-primary" type="button" onClick={() => setShowModal(true)}>Create FD</button>
          </div>

          <table className="min-w-full text-sm">
            <thead>
              <tr className="table-head">
                <th className="p-2 text-left">FD No</th>
                <th className="p-2 text-left">Customer</th>
                <th className="p-2 text-right">Principal</th>
                <th className="p-2 text-right">Maturity</th>
                <th className="p-2 text-center">Days Left</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={`border-t ${Number(row.days_to_maturity) <= 30 ? 'bg-yellow-50' : ''}`}>
                  <td className="p-2">{row.fd_no}</td>
                  <td className="p-2">{row.customer_name}</td>
                  <td className="p-2 text-right">Rs. {Number(row.principal_amount).toLocaleString('en-IN')}</td>
                  <td className="p-2 text-right">Rs. {Number(row.maturity_amount).toLocaleString('en-IN')}</td>
                  <td className="p-2 text-center">{row.days_to_maturity}</td>
                  <td className="p-2"><span className={`status-badge status-${row.fd_status}`}>{row.fd_status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <CalculatorPanel title="FD Calculator" result={calcResult}>
          <input className="input" type="number" placeholder="Principal" value={calcInput.principal_amount} onChange={(e) => setCalcInput((p) => ({ ...p, principal_amount: e.target.value }))} />
          <input className="input" type="number" placeholder="Rate %" value={calcInput.interest_rate} onChange={(e) => setCalcInput((p) => ({ ...p, interest_rate: e.target.value }))} />
          <input className="input" type="number" placeholder="Tenure months" value={calcInput.tenure_months} onChange={(e) => setCalcInput((p) => ({ ...p, tenure_months: e.target.value }))} />
          <select className="input" value={calcInput.compounding} onChange={(e) => setCalcInput((p) => ({ ...p, compounding: e.target.value }))}>
            <option value="simple">Simple</option>
            <option value="quarterly">Quarterly</option>
            <option value="half_yearly">Half Yearly</option>
            <option value="yearly">Yearly</option>
          </select>
        </CalculatorPanel>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl mx-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Create FD</h3>
              <button className="btn-secondary" type="button" onClick={() => setShowModal(false)}>Close</button>
            </div>
            <FDForm customers={customers} onSubmit={create} loading={saving} />
          </div>
        </div>
      )}
    </div>
  );
};

export default FD;
