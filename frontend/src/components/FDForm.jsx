import { useEffect, useState } from 'react';
import api from '../api/axios';

const FDForm = ({ customers = [], onSubmit, loading }) => {
  const [form, setForm] = useState({
    customer_id: '',
    principal_amount: '',
    interest_rate: '',
    tenure_months: '',
    compounding: 'quarterly',
    deposit_date: new Date().toISOString().slice(0, 10),
    payout_type: 'on_maturity',
    auto_renew: false,
    payment_mode: 'bank_transfer'
  });
  const [calc, setCalc] = useState(null);

  useEffect(() => {
    const run = async () => {
      if (!form.principal_amount || !form.interest_rate || !form.tenure_months) return;
      try {
        const { data } = await api.post('/fd/calculate', form);
        setCalc(data);
      } catch (error) {
        setCalc(null);
      }
    };
    run();
  }, [form.principal_amount, form.interest_rate, form.tenure_months, form.compounding]);

  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <div className="grid md:grid-cols-2 gap-3">
        <select className="input" value={form.customer_id} onChange={(e) => setForm((p) => ({ ...p, customer_id: e.target.value }))} required>
          <option value="">Select Customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{`${c.customer_code} - ${c.name}`}</option>
          ))}
        </select>
        <input className="input" type="number" step="0.01" placeholder="Principal" value={form.principal_amount} onChange={(e) => setForm((p) => ({ ...p, principal_amount: e.target.value }))} required />
        <input className="input" type="number" step="0.01" placeholder="Interest Rate %" value={form.interest_rate} onChange={(e) => setForm((p) => ({ ...p, interest_rate: e.target.value }))} required />
        <input className="input" type="number" placeholder="Tenure Months" value={form.tenure_months} onChange={(e) => setForm((p) => ({ ...p, tenure_months: e.target.value }))} required />
        <select className="input" value={form.compounding} onChange={(e) => setForm((p) => ({ ...p, compounding: e.target.value }))}>
          <option value="simple">Simple</option>
          <option value="quarterly">Quarterly</option>
          <option value="half_yearly">Half Yearly</option>
          <option value="yearly">Yearly</option>
        </select>
        <input className="input" type="date" value={form.deposit_date} onChange={(e) => setForm((p) => ({ ...p, deposit_date: e.target.value }))} required />
      </div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.auto_renew} onChange={(e) => setForm((p) => ({ ...p, auto_renew: e.target.checked }))} />
        Auto Renew
      </label>
      {calc && (
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-sm text-blue-900">
          <p><strong>Maturity Amount:</strong> Rs. {Number(calc.maturityAmount).toLocaleString('en-IN')}</p>
          <p><strong>Interest Earned:</strong> Rs. {Number(calc.interestEarned).toLocaleString('en-IN')}</p>
        </div>
      )}
      <button disabled={loading} className="btn-primary" type="submit">
        {loading ? 'Creating...' : 'Create FD'}
      </button>
    </form>
  );
};

export default FDForm;
