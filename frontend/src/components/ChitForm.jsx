import { useState } from 'react';

const ChitForm = ({ onSubmit, loading }) => {
  const [form, setForm] = useState({
    group_name: '',
    chit_value: '',
    monthly_contribution: '',
    total_members: '',
    duration_months: '',
    commission_pct: '',
    start_date: new Date().toISOString().slice(0, 10),
    status: 'upcoming'
  });

  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <div className="grid md:grid-cols-2 gap-3">
        <input className="input" placeholder="Group Name" value={form.group_name} onChange={(e) => setForm((p) => ({ ...p, group_name: e.target.value }))} required />
        <input className="input" type="number" step="0.01" placeholder="Chit Value" value={form.chit_value} onChange={(e) => setForm((p) => ({ ...p, chit_value: e.target.value }))} required />
        <input className="input" type="number" step="0.01" placeholder="Monthly Contribution" value={form.monthly_contribution} onChange={(e) => setForm((p) => ({ ...p, monthly_contribution: e.target.value }))} required />
        <input className="input" type="number" placeholder="Total Members" value={form.total_members} onChange={(e) => setForm((p) => ({ ...p, total_members: e.target.value }))} required />
        <input className="input" type="number" placeholder="Duration Months" value={form.duration_months} onChange={(e) => setForm((p) => ({ ...p, duration_months: e.target.value }))} required />
        <input className="input" type="number" step="0.01" placeholder="Commission %" value={form.commission_pct} onChange={(e) => setForm((p) => ({ ...p, commission_pct: e.target.value }))} required />
        <input className="input" type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} required />
        <select className="input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
          <option value="upcoming">Upcoming</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <button disabled={loading} className="btn-primary" type="submit">
        {loading ? 'Creating...' : 'Create Chit Group'}
      </button>
    </form>
  );
};

export default ChitForm;
