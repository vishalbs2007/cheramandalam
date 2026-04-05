const CalculatorPanel = ({ title, children, result }) => {
  return (
    <div className="card">
      <h3 className="text-base font-bold mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
      {result && (
        <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 p-3">
          {Object.entries(result).map(([key, val]) => (
            <p key={key} className="text-sm text-blue-900">
              <span className="capitalize font-semibold">{key.replace(/([A-Z])/g, ' $1')}: </span>
              {typeof val === 'number' ? `Rs. ${val.toLocaleString('en-IN')}` : val}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalculatorPanel;
