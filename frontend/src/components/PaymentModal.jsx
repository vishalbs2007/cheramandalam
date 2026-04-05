import { useState } from 'react';

const PaymentModal = ({ open, title = 'Record Payment', onClose, onSubmit, defaultAmount = '' }) => {
  const [form, setForm] = useState({
    amount: defaultAmount,
    paid_date: new Date().toISOString().slice(0, 10),
    payment_mode: 'cash',
    reference: ''
  });

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <form className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3" onSubmit={handleSubmit}>
        <h3 className="text-lg font-bold">{title}</h3>
        <input
          className="input"
          type="number"
          step="0.01"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
          required
        />
        <input
          className="input"
          type="date"
          value={form.paid_date}
          onChange={(e) => setForm((p) => ({ ...p, paid_date: e.target.value }))}
          required
        />
        <select
          className="input"
          value={form.payment_mode}
          onChange={(e) => setForm((p) => ({ ...p, payment_mode: e.target.value }))}
        >
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="card">Card</option>
        </select>
        <input
          className="input"
          placeholder="Reference"
          value={form.reference}
          onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
        />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Submit
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentModal;
