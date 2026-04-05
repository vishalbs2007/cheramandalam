import moment from 'moment';

const EMIScheduleTable = ({ rows = [], onPay }) => {
  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="table-head">
            <th className="p-2 text-left">EMI #</th>
            <th className="p-2 text-left">Due Date</th>
            <th className="p-2 text-right">Principal</th>
            <th className="p-2 text-right">Interest</th>
            <th className="p-2 text-right">Amount</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id || row.emi_no}
              className={`border-t border-slate-100 ${row.status === 'overdue' ? 'bg-red-50' : ''}`}
            >
              <td className="p-2">{row.emi_no}</td>
              <td className="p-2">{moment(row.due_date).format('DD-MMM-YYYY')}</td>
              <td className="p-2 text-right">Rs. {Number(row.principal_due).toLocaleString('en-IN')}</td>
              <td className="p-2 text-right">Rs. {Number(row.interest_due).toLocaleString('en-IN')}</td>
              <td className="p-2 text-right">Rs. {Number(row.emi_amount).toLocaleString('en-IN')}</td>
              <td className="p-2">
                <span className={`status-badge status-${row.status}`}>{row.status}</span>
              </td>
              <td className="p-2">
                {row.status !== 'paid' && (
                  <button type="button" className="btn-primary !px-3 !py-1.5" onClick={() => onPay(row)}>
                    Pay
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EMIScheduleTable;
