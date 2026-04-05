import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import moment from 'moment';
import toast from 'react-hot-toast';
import api from '../api/axios';

const tabs = ['Loans', 'RD', 'FD', 'Chit', 'Transactions'];

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Loans');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/customers/${id}`);
      setData(res.data);
    } catch (error) {
      toast.error('Failed to load customer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const softDelete = async () => {
    if (!window.confirm('Deactivate this customer?')) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success('Customer deactivated');
      navigate('/customers');
    } catch (error) {
      toast.error('Failed to deactivate');
    }
  };

  if (loading) return <div className="card">Loading customer...</div>;
  if (!data) return null;

  const { customer } = data;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{customer.name}</h2>
            <p className="text-sm text-slate-500">{customer.customer_code} | {customer.phone}</p>
          </div>
          <button type="button" className="btn-secondary" onClick={softDelete}>Deactivate</button>
        </div>
        <div className="grid md:grid-cols-3 gap-3 mt-4 text-sm">
          <p><strong>Email:</strong> {customer.email || '-'}</p>
          <p><strong>City:</strong> {customer.city || '-'}</p>
          <p><strong>Occupation:</strong> {customer.occupation || '-'}</p>
          <p><strong>Nominee:</strong> {customer.nominee_name || '-'}</p>
          <p><strong>Aadhar:</strong> {customer.aadhar_no || '-'}</p>
          <p><strong>PAN:</strong> {customer.pan_no || '-'}</p>
        </div>
      </div>

      <div className="card">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? 'btn-primary !py-1.5' : 'btn-secondary !py-1.5'}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto">
          {activeTab === 'Loans' && (
            <table className="min-w-full text-sm">
              <thead><tr className="table-head"><th className="p-2 text-left">Loan</th><th className="p-2 text-right">Principal</th><th className="p-2 text-left">Status</th></tr></thead>
              <tbody>{data.loans.map((x) => <tr key={x.id} className="border-t"><td className="p-2">{x.loan_no}</td><td className="p-2 text-right">Rs. {Number(x.principal_amount).toLocaleString('en-IN')}</td><td className="p-2"><span className={`status-badge status-${x.loan_status}`}>{x.loan_status}</span></td></tr>)}</tbody>
            </table>
          )}
          {activeTab === 'RD' && (
            <table className="min-w-full text-sm">
              <thead><tr className="table-head"><th className="p-2 text-left">RD</th><th className="p-2 text-right">Monthly</th><th className="p-2 text-left">Status</th></tr></thead>
              <tbody>{data.recurringDeposits.map((x) => <tr key={x.id} className="border-t"><td className="p-2">{x.rd_no}</td><td className="p-2 text-right">Rs. {Number(x.monthly_amount).toLocaleString('en-IN')}</td><td className="p-2"><span className={`status-badge status-${x.rd_status}`}>{x.rd_status}</span></td></tr>)}</tbody>
            </table>
          )}
          {activeTab === 'FD' && (
            <table className="min-w-full text-sm">
              <thead><tr className="table-head"><th className="p-2 text-left">FD</th><th className="p-2 text-right">Principal</th><th className="p-2 text-left">Status</th></tr></thead>
              <tbody>{data.fixedDeposits.map((x) => <tr key={x.id} className="border-t"><td className="p-2">{x.fd_no}</td><td className="p-2 text-right">Rs. {Number(x.principal_amount).toLocaleString('en-IN')}</td><td className="p-2"><span className={`status-badge status-${x.fd_status}`}>{x.fd_status}</span></td></tr>)}</tbody>
            </table>
          )}
          {activeTab === 'Chit' && (
            <table className="min-w-full text-sm">
              <thead><tr className="table-head"><th className="p-2 text-left">Group</th><th className="p-2 text-left">Ticket</th><th className="p-2 text-left">Status</th></tr></thead>
              <tbody>{data.chits.map((x) => <tr key={x.id} className="border-t"><td className="p-2">{x.group_name}</td><td className="p-2">{x.ticket_no}</td><td className="p-2"><span className={`status-badge status-${x.status}`}>{x.status}</span></td></tr>)}</tbody>
            </table>
          )}
          {activeTab === 'Transactions' && (
            <table className="min-w-full text-sm">
              <thead><tr className="table-head"><th className="p-2 text-left">Txn</th><th className="p-2 text-left">Type</th><th className="p-2 text-right">Amount</th><th className="p-2 text-left">Date</th></tr></thead>
              <tbody>{data.transactions.map((x) => <tr key={x.id} className="border-t"><td className="p-2">{x.txn_no}</td><td className="p-2">{x.txn_type}</td><td className="p-2 text-right">Rs. {Number(x.amount).toLocaleString('en-IN')}</td><td className="p-2">{moment(x.txn_date).format('DD-MMM-YYYY')}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
