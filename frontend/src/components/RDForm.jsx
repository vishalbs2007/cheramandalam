import { useEffect, useState } from 'react';
import api from '../api/axios';

const RDForm = ({ customers = [], onSubmit, loading }) => {
  const [form, setForm] = useState({
    customer_id: '',
    monthly_amount: '',
    interest_rate: '',
    tenure_months: '',
    start_date: new Date().toISOString().slice(0, 10)
  });
  const [calc, setCalc] = useState(null);

  useEffect(() => {
    const run = async () => {
      if (!form.monthly_amount || !form.interest_rate || !form.tenure_months) return;
      try {
        const { data } = await api.post('/rd/calculate', form);
        setCalc(data);
      } catch (error) {
        setCalc(null);
      }
    };
    run();
  }, [form.monthly_amount, form.interest_rate, form.tenure_months]);

  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <div className="grid md:grid-cols-2 gap-3">
        <select className="input" value={form.customer_id} onChange={(e) => setForm((p) => ({ ...p, customer_id: e.target.value }))} required>
          <option value="">Select Customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{`${c.customer_code} - ${c.name}`}</option>
          ))}
        </select>
        <input className="input" type="number" step="0.01" placeholder="Monthly Amount" value={form.monthly_amount} onChange={(e) => setForm((p) => ({ ...p, monthly_amount: e.target.value }))} required />
        <input className="input" type="number" step="0.01" placeholder="Interest Rate %" value={form.interest_rate} onChange={(e) => setForm((p) => ({ ...p, interest_rate: e.target.value }))} required />
        <input className="input" type="number" placeholder="Tenure Months" value={form.tenure_months} onChange={(e) => setForm((p) => ({ ...p, tenure_months: e.target.value }))} required />
        <input className="input" type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} required />
      </div>
      {calc && (
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-sm text-blue-900">
          <p><strong>Maturity Amount:</strong> Rs. {Number(calc.maturityAmount).toLocaleString('en-IN')}</p>
          <p><strong>Total Deposit:</strong> Rs. {Number(calc.totalDeposited).toLocaleString('en-IN')}</p>
        </div>
      )}
      <button disabled={loading} className="btn-primary" type="submit">
        {loading ? 'Creating...' : 'Create RD'}
      </button>
    </form>
  );
};

export default RDForm;
