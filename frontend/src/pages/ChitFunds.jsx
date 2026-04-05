import { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import toast from 'react-hot-toast';
import api from '../api/axios';
import ChitForm from '../components/ChitForm';

const ChitFunds = () => {
  const [groups, setGroups] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const [memberForm, setMemberForm] = useState({ customer_id: '', ticket_no: '', join_date: new Date().toISOString().slice(0, 10) });
  const [collectionForm, setCollectionForm] = useState({ chit_member_id: '', month_no: '', amount: '', paid_date: new Date().toISOString().slice(0, 10), payment_mode: 'cash' });
  const [auctionForm, setAuctionForm] = useState({ winner_member_id: '', month_no: '', bid_amount: '', auction_date: new Date().toISOString().slice(0, 10) });

  const load = async () => {
    try {
      const [g, c] = await Promise.all([
        api.get(`/chits?status=${status}`),
        api.get('/customers?page=1&limit=1000')
      ]);
      setGroups(g.data || []);
      setCustomers(c.data?.data || []);
    } catch {
      toast.error('Failed to load chit groups');
    }
  };

  const loadDetail = async (id) => {
    try {
      const { data } = await api.get(`/chits/${id}`);
      setDetail(data);
      setSelected(id);
    } catch {
      toast.error('Failed to load group detail');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectedGroup = useMemo(() => groups.find((x) => x.id === selected), [groups, selected]);

  const createGroup = async (payload) => {
    setSaving(true);
    try {
      await api.post('/chits', payload);
      toast.success('Group created');
      setShowCreate(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const addMember = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/chits/${selected}/members`, memberForm);
      toast.success('Member added');
      setMemberForm({ customer_id: '', ticket_no: '', join_date: new Date().toISOString().slice(0, 10) });
      loadDetail(selected);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add member');
    }
  };

  const recordCollection = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/chits/${selected}/collection`, collectionForm);
      toast.success('Collection recorded');
      loadDetail(selected);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record collection');
    }
  };

  const recordAuction = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/chits/${selected}/auction`, auctionForm);
      toast.success('Auction recorded');
      loadDetail(selected);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record auction');
    }
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <h2 className="text-xl font-bold">Chit Funds</h2>
        <div className="flex gap-2">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <button className="btn-secondary" type="button" onClick={load}>Filter</button>
          <button className="btn-primary" type="button" onClick={() => setShowCreate(true)}>Create Group</button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card overflow-x-auto md:col-span-1">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="table-head"><th className="p-2 text-left">Group</th><th className="p-2 text-left">Status</th></tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} className="border-t cursor-pointer hover:bg-slate-50" onClick={() => loadDetail(g.id)}>
                  <td className="p-2">{g.group_name}</td>
                  <td className="p-2"><span className={`status-badge status-${g.status}`}>{g.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:col-span-2 space-y-4">
          {!detail ? <div className="card">Select a group to view details.</div> : (
            <>
              <div className="card">
                <h3 className="text-lg font-bold">{selectedGroup?.group_name}</h3>
                <p className="text-sm text-slate-600">Members: {detail.members.length} / {selectedGroup?.total_members}</p>
              </div>

              <div className="card overflow-x-auto">
                <h4 className="font-bold mb-2">Members</h4>
                <table className="min-w-full text-sm mb-3">
                  <thead><tr className="table-head"><th className="p-2 text-left">Ticket</th><th className="p-2 text-left">Customer</th><th className="p-2 text-left">Received</th></tr></thead>
                  <tbody>{detail.members.map((m) => <tr key={m.id} className="border-t"><td className="p-2">{m.ticket_no}</td><td className="p-2">{m.customer_name}</td><td className="p-2">{m.has_received ? 'Yes' : 'No'}</td></tr>)}</tbody>
                </table>

                <form className="grid md:grid-cols-4 gap-2" onSubmit={addMember}>
                  <select className="input" value={memberForm.customer_id} onChange={(e) => setMemberForm((p) => ({ ...p, customer_id: e.target.value }))} required>
                    <option value="">Select Customer</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{`${c.customer_code} - ${c.name}`}</option>)}
                  </select>
                  <input className="input" placeholder="Ticket No" value={memberForm.ticket_no} onChange={(e) => setMemberForm((p) => ({ ...p, ticket_no: e.target.value }))} required />
                  <input className="input" type="date" value={memberForm.join_date} onChange={(e) => setMemberForm((p) => ({ ...p, join_date: e.target.value }))} required />
                  <button className="btn-primary" type="submit">Add Member</button>
                </form>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="card">
                  <h4 className="font-bold mb-2">Record Collection</h4>
                  <form className="space-y-2" onSubmit={recordCollection}>
                    <select className="input" value={collectionForm.chit_member_id} onChange={(e) => setCollectionForm((p) => ({ ...p, chit_member_id: e.target.value }))} required>
                      <option value="">Member</option>
                      {detail.members.map((m) => <option key={m.id} value={m.id}>{`${m.ticket_no} - ${m.customer_name}`}</option>)}
                    </select>
                    <input className="input" type="number" placeholder="Month No" value={collectionForm.month_no} onChange={(e) => setCollectionForm((p) => ({ ...p, month_no: e.target.value }))} required />
                    <input className="input" type="number" step="0.01" placeholder="Amount" value={collectionForm.amount} onChange={(e) => setCollectionForm((p) => ({ ...p, amount: e.target.value }))} required />
                    <input className="input" type="date" value={collectionForm.paid_date} onChange={(e) => setCollectionForm((p) => ({ ...p, paid_date: e.target.value }))} required />
                    <button className="btn-primary" type="submit">Save Collection</button>
                  </form>
                </div>

                <div className="card">
                  <h4 className="font-bold mb-2">Record Auction</h4>
                  <form className="space-y-2" onSubmit={recordAuction}>
                    <select className="input" value={auctionForm.winner_member_id} onChange={(e) => setAuctionForm((p) => ({ ...p, winner_member_id: e.target.value }))} required>
                      <option value="">Winner Member</option>
                      {detail.members.map((m) => <option key={m.id} value={m.id}>{`${m.ticket_no} - ${m.customer_name}`}</option>)}
                    </select>
                    <input className="input" type="number" placeholder="Month No" value={auctionForm.month_no} onChange={(e) => setAuctionForm((p) => ({ ...p, month_no: e.target.value }))} required />
                    <input className="input" type="number" step="0.01" placeholder="Bid Amount" value={auctionForm.bid_amount} onChange={(e) => setAuctionForm((p) => ({ ...p, bid_amount: e.target.value }))} required />
                    <input className="input" type="date" value={auctionForm.auction_date} onChange={(e) => setAuctionForm((p) => ({ ...p, auction_date: e.target.value }))} required />
                    <button className="btn-primary" type="submit">Save Auction</button>
                  </form>
                </div>
              </div>

              <div className="card overflow-x-auto">
                <h4 className="font-bold mb-2">Auction Results</h4>
                <table className="min-w-full text-sm">
                  <thead><tr className="table-head"><th className="p-2 text-left">Month</th><th className="p-2 text-left">Winner</th><th className="p-2 text-right">Bid</th><th className="p-2 text-right">Dividend/Member</th></tr></thead>
                  <tbody>
                    {detail.auctions.map((a) => (
                      <tr key={a.id} className="border-t">
                        <td className="p-2">{a.month_no}</td>
                        <td className="p-2">{a.winner_name}</td>
                        <td className="p-2 text-right">Rs. {Number(a.bid_amount).toLocaleString('en-IN')}</td>
                        <td className="p-2 text-right">Rs. {Number(a.dividend_per_member).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card overflow-x-auto">
                <h4 className="font-bold mb-2">Monthly Collection Grid</h4>
                <table className="min-w-full text-sm">
                  <thead><tr className="table-head"><th className="p-2 text-left">Month</th><th className="p-2 text-left">Member</th><th className="p-2 text-right">Due</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Paid Date</th></tr></thead>
                  <tbody>
                    {detail.collections.slice(0, 200).map((c) => (
                      <tr key={c.id} className="border-t">
                        <td className="p-2">{c.month_no}</td>
                        <td className="p-2">{c.customer_name}</td>
                        <td className="p-2 text-right">Rs. {Number(c.amount_due).toLocaleString('en-IN')}</td>
                        <td className="p-2"><span className={`status-badge status-${c.status}`}>{c.status}</span></td>
                        <td className="p-2">{c.paid_date ? moment(c.paid_date).format('DD-MMM-YYYY') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl mx-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Create Chit Group</h3>
              <button className="btn-secondary" type="button" onClick={() => setShowCreate(false)}>Close</button>
            </div>
            <ChitForm onSubmit={createGroup} loading={saving} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChitFunds;
