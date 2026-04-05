import { useEffect, useState } from 'react';
import api from '../api/axios';

const initial = {
  customer_id: '',
  loan_type: 'personal',
  principal_amount: '',
  interest_rate: '',
  interest_type: 'reducing',
  tenure_months: '',
  disbursed_date: new Date().toISOString().slice(0, 10),
  first_emi_date: new Date().toISOString().slice(0, 10),
  purpose: '',
  guarantor_name: '',
  collateral: '',
  payment_mode: 'bank_transfer'
};

const LoanForm = ({ customers = [], onSubmit, loading }) => {
  const [form, setForm] = useState(initial);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const run = async () => {
      if (!form.principal_amount || !form.interest_rate || !form.tenure_months) return;
      try {
        const { data } = await api.post('/loans/calculate', form);
        setPreview(data);
      } catch (error) {
        setPreview(null);
      }
    };

    run();
  }, [form.principal_amount, form.interest_rate, form.tenure_months, form.interest_type, form.first_emi_date]);

  const submit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="grid md:grid-cols-2 gap-3">
        <select className="input" value={form.customer_id} onChange={(e) => setForm((p) => ({ ...p, customer_id: e.target.value }))} required>
          <option value="">Select Customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{`${c.customer_code} - ${c.name}`}</option>
          ))}
        </select>
        <input className="input" placeholder="Loan Type" value={form.loan_type} onChange={(e) => setForm((p) => ({ ...p, loan_type: e.target.value }))} required />
        <input className="input" type="number" step="0.01" placeholder="Principal" value={form.principal_amount} onChange={(e) => setForm((p) => ({ ...p, principal_amount: e.target.value }))} required />
        <input className="input" type="number" step="0.01" placeholder="Interest Rate %" value={form.interest_rate} onChange={(e) => setForm((p) => ({ ...p, interest_rate: e.target.value }))} required />
        <select className="input" value={form.interest_type} onChange={(e) => setForm((p) => ({ ...p, interest_type: e.target.value }))}>
          <option value="reducing">Reducing</option>
          <option value="flat">Flat</option>
        </select>
        <input className="input" type="number" placeholder="Tenure Months" value={form.tenure_months} onChange={(e) => setForm((p) => ({ ...p, tenure_months: e.target.value }))} required />
        <input className="input" type="date" value={form.disbursed_date} onChange={(e) => setForm((p) => ({ ...p, disbursed_date: e.target.value }))} required />
        <input className="input" type="date" value={form.first_emi_date} onChange={(e) => setForm((p) => ({ ...p, first_emi_date: e.target.value }))} required />
      </div>
      <input className="input" placeholder="Purpose" value={form.purpose} onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))} />
      <input className="input" placeholder="Guarantor" value={form.guarantor_name} onChange={(e) => setForm((p) => ({ ...p, guarantor_name: e.target.value }))} />
      <input className="input" placeholder="Collateral" value={form.collateral} onChange={(e) => setForm((p) => ({ ...p, collateral: e.target.value }))} />

      {preview && (
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-sm text-blue-900">
          <p><strong>EMI:</strong> Rs. {Number(preview.emi).toLocaleString('en-IN')}</p>
          <p><strong>Total Interest:</strong> Rs. {Number(preview.totalInterest).toLocaleString('en-IN')}</p>
          <p><strong>Total Payable:</strong> Rs. {Number(preview.totalPayable).toLocaleString('en-IN')}</p>
        </div>
      )}

      <button disabled={loading} className="btn-primary" type="submit">
        {loading ? 'Creating...' : 'Create Loan'}
      </button>
    </form>
  );
};

export default LoanForm;
