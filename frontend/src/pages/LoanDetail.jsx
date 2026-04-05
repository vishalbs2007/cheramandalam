import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import EMIScheduleTable from '../components/EMIScheduleTable';
import PaymentModal from '../components/PaymentModal';

const LoanDetail = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmi, setSelectedEmi] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/loans/${id}`);
      setData(res.data);
    } catch (error) {
      toast.error('Failed to load loan details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const pay = async (payload) => {
    try {
      await api.post(`/loans/${id}/pay`, {
        ...payload,
        emi_no: selectedEmi.emi_no
      });
      toast.success('Payment recorded');
      setSelectedEmi(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  if (loading) return <div className="card">Loading loan...</div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="card grid md:grid-cols-4 gap-3">
        <div>
          <p className="text-xs text-slate-500">Loan No</p>
          <p className="font-bold">{data.loan.loan_no}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Customer</p>
          <p className="font-bold">{data.loan.customer_name}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Principal</p>
          <p className="font-bold">Rs. {Number(data.loan.principal_amount).toLocaleString('en-IN')}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Status</p>
          <span className={`status-badge status-${data.loan.loan_status}`}>{data.loan.loan_status}</span>
        </div>
      </div>

      <EMIScheduleTable rows={data.schedule} onPay={setSelectedEmi} />

      <PaymentModal
        open={Boolean(selectedEmi)}
        title={`Pay EMI #${selectedEmi?.emi_no || ''}`}
        defaultAmount={selectedEmi?.emi_amount || ''}
        onClose={() => setSelectedEmi(null)}
        onSubmit={pay}
      />
    </div>
  );
};

export default LoanDetail;
