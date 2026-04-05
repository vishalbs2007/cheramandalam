import moment from 'moment';

const DueToday = ({ rows = [] }) => {
  return (
    <div className="card overflow-x-auto">
      <h3 className="text-base font-bold mb-3">Due Today</h3>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="table-head">
            <th className="text-left p-2">Type</th>
            <th className="text-left p-2">Reference</th>
            <th className="text-left p-2">Customer</th>
            <th className="text-right p-2">Amount</th>
            <th className="text-left p-2">Due Date</th>
            <th className="text-left p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t border-slate-100">
              <td className="p-2 capitalize">{row.type}</td>
              <td className="p-2">{row.ref_no}</td>
              <td className="p-2">{row.customer_name}</td>
              <td className="p-2 text-right">Rs. {Number(row.amount_due).toLocaleString('en-IN')}</td>
              <td className="p-2">{moment(row.due_date).format('DD-MMM-YYYY')}</td>
              <td className="p-2">
                <span className={`status-badge status-${row.status}`}>{row.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="text-sm text-slate-500">No dues today.</p>}
    </div>
  );
};

export default DueToday;
