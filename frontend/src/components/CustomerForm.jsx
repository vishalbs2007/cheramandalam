import { useState } from 'react';

const initial = {
  name: '',
  father_name: '',
  phone: '',
  alt_phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  aadhar_no: '',
  pan_no: '',
  date_of_birth: '',
  occupation: '',
  nominee_name: '',
  nominee_relation: '',
  nominee_phone: ''
};

const CustomerForm = ({ onSubmit, loading }) => {
  const [form, setForm] = useState(initial);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="grid md:grid-cols-2 gap-3">
        <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
        <input className="input" placeholder="Father Name" value={form.father_name} onChange={(e) => setForm((p) => ({ ...p, father_name: e.target.value }))} />
        <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} required />
        <input className="input" placeholder="Alt Phone" value={form.alt_phone} onChange={(e) => setForm((p) => ({ ...p, alt_phone: e.target.value }))} />
        <input className="input" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        <input className="input" placeholder="DOB" type="date" value={form.date_of_birth} onChange={(e) => setForm((p) => ({ ...p, date_of_birth: e.target.value }))} />
        <input className="input" placeholder="Occupation" value={form.occupation} onChange={(e) => setForm((p) => ({ ...p, occupation: e.target.value }))} />
        <input className="input" placeholder="City" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
        <input className="input" placeholder="State" value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} />
        <input className="input" placeholder="Pincode" value={form.pincode} onChange={(e) => setForm((p) => ({ ...p, pincode: e.target.value }))} />
        <input className="input" placeholder="Aadhar" value={form.aadhar_no} onChange={(e) => setForm((p) => ({ ...p, aadhar_no: e.target.value }))} />
        <input className="input" placeholder="PAN" value={form.pan_no} onChange={(e) => setForm((p) => ({ ...p, pan_no: e.target.value }))} />
        <input className="input" placeholder="Nominee Name" value={form.nominee_name} onChange={(e) => setForm((p) => ({ ...p, nominee_name: e.target.value }))} />
        <input className="input" placeholder="Nominee Relation" value={form.nominee_relation} onChange={(e) => setForm((p) => ({ ...p, nominee_relation: e.target.value }))} />
        <input className="input" placeholder="Nominee Phone" value={form.nominee_phone} onChange={(e) => setForm((p) => ({ ...p, nominee_phone: e.target.value }))} />
      </div>
      <textarea className="input" placeholder="Address" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
      <button disabled={loading} className="btn-primary" type="submit">
        {loading ? 'Saving...' : 'Save Customer'}
      </button>
    </form>
  );
};

export default CustomerForm;
