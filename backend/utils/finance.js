const moment = require('moment');

const round2 = (num) => Number((num || 0).toFixed(2));

const addMonths = (date, months) => moment(date).add(months, 'months').format('YYYY-MM-DD');

const generateCode = (prefix, id) => `${prefix}${String(id).padStart(6, '0')}`;

const calcFlatLoanEMI = (principal, rate, months) => {
  const totalInterest = (principal * rate * months) / 1200;
  const emi = (principal + totalInterest) / months;
  const totalPayable = principal + totalInterest;

  return {
    emi: round2(emi),
    totalInterest: round2(totalInterest),
    totalPayable: round2(totalPayable)
  };
};

const calcReducingLoanEMI = (principal, rate, months) => {
  const r = rate / 1200;
  const factor = Math.pow(1 + r, months);
  const emi = (principal * r * factor) / (factor - 1);
  const totalPayable = emi * months;
  const totalInterest = totalPayable - principal;

  return {
    emi: round2(emi),
    totalInterest: round2(totalInterest),
    totalPayable: round2(totalPayable)
  };
};

const generateEMISchedule = ({
  principal,
  rate,
  months,
  interestType,
  firstEmiDate,
  penaltyRatePerMonth = 2
}) => {
  const schedule = [];
  let remaining = principal;

  if (interestType === 'flat') {
    const { emi, totalInterest } = calcFlatLoanEMI(principal, rate, months);
    const monthlyInterest = totalInterest / months;
    const monthlyPrincipal = principal / months;

    for (let i = 1; i <= months; i += 1) {
      remaining -= monthlyPrincipal;
      schedule.push({
        emi_no: i,
        due_date: addMonths(firstEmiDate, i - 1),
        principal_due: round2(monthlyPrincipal),
        interest_due: round2(monthlyInterest),
        emi_amount: round2(emi),
        amount_paid: 0,
        penalty: 0,
        balance: round2(Math.max(remaining, 0)),
        status: 'pending',
        payment_mode: null,
        penalty_rate_per_month: penaltyRatePerMonth
      });
    }
  } else {
    const { emi } = calcReducingLoanEMI(principal, rate, months);
    const monthlyRate = rate / 1200;

    for (let i = 1; i <= months; i += 1) {
      const interest = remaining * monthlyRate;
      const principalComponent = emi - interest;
      remaining -= principalComponent;

      schedule.push({
        emi_no: i,
        due_date: addMonths(firstEmiDate, i - 1),
        principal_due: round2(principalComponent),
        interest_due: round2(interest),
        emi_amount: round2(emi),
        amount_paid: 0,
        penalty: 0,
        balance: round2(Math.max(remaining, 0)),
        status: 'pending',
        payment_mode: null,
        penalty_rate_per_month: penaltyRatePerMonth
      });
    }
  }

  return schedule;
};

const calcRDMaturity = (monthlyAmount, annualRate, tenureMonths) => {
  const r = annualRate / 400;
  let maturity = 0;

  for (let i = 1; i <= tenureMonths; i += 1) {
    const monthsRemaining = tenureMonths - i;
    const remainingQuarters = monthsRemaining / 3;
    maturity += monthlyAmount * Math.pow(1 + r, remainingQuarters);
  }

  return round2(maturity);
};

const generateRDSchedule = ({ startDate, tenureMonths, monthlyAmount }) => {
  const items = [];
  for (let i = 1; i <= tenureMonths; i += 1) {
    items.push({
      installment_no: i,
      due_date: addMonths(startDate, i - 1),
      amount_due: round2(monthlyAmount),
      amount_paid: 0,
      status: 'pending',
      payment_mode: null
    });
  }
  return items;
};

const calcFDMaturity = ({ principal, rate, tenureMonths, compounding }) => {
  const t = tenureMonths / 12;
  const r = rate / 100;
  let maturity = principal;

  if (compounding === 'simple') {
    maturity = principal * (1 + (r * t));
  } else {
    let n = 1;
    if (compounding === 'quarterly') n = 4;
    if (compounding === 'half_yearly') n = 2;
    if (compounding === 'yearly') n = 1;

    maturity = principal * Math.pow(1 + (r / n), n * t);
  }

  return {
    maturityAmount: round2(maturity),
    interestEarned: round2(maturity - principal)
  };
};

const calcChitAuction = ({ chitValue, commissionPct, bidAmount, totalMembers }) => {
  const commission = (chitValue * commissionPct) / 100;
  const netToWinner = bidAmount - commission;
  const dividendPerMember = (chitValue - bidAmount) / totalMembers;

  return {
    commission: round2(commission),
    netToWinner: round2(netToWinner),
    dividendPerMember: round2(dividendPerMember)
  };
};

const calcPenalty = ({ overdueAmount, daysLate, penaltyRatePerMonth = 2 }) => {
  const dailyRate = penaltyRatePerMonth / (30 * 100);
  const penalty = overdueAmount * dailyRate * daysLate;
  return round2(penalty);
};

module.exports = {
  calcFlatLoanEMI,
  calcReducingLoanEMI,
  generateEMISchedule,
  calcRDMaturity,
  generateRDSchedule,
  calcFDMaturity,
  calcChitAuction,
  calcPenalty,
  generateCode,
  addMonths
};
