const StatCard = ({ label, value, subLabel }) => {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <h3 className="text-2xl font-extrabold mt-1 text-slate-800">{value}</h3>
      {subLabel && <p className="text-xs text-slate-500 mt-2">{subLabel}</p>}
    </div>
  );
};

export default StatCard;
