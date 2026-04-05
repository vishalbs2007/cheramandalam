const express = require('express');
const { protect } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validators');
const authController = require('../controllers/authController');
const dashboardController = require('../controllers/dashboardController');
const customerController = require('../controllers/customerController');
const loanController = require('../controllers/loanController');
const depositController = require('../controllers/depositController');
const chitController = require('../controllers/chitController');

const router = express.Router();

router.post(
	'/auth/login',
	validateRequest([
		{ field: 'email', type: 'email', required: true },
		{ field: 'password', type: 'string', required: true, minLength: 6 }
	]),
	authController.login
);

router.use(protect);

router.get('/auth/me', authController.me);
router.put(
	'/auth/change-password',
	validateRequest([
		{ field: 'currentPassword', type: 'string', required: true, minLength: 6 },
		{ field: 'newPassword', type: 'string', required: true, minLength: 8 }
	]),
	authController.changePassword
);

router.get('/dashboard/summary', dashboardController.getSummary);
router.get('/dashboard/recent-transactions', dashboardController.getRecentTransactions);
router.get('/dashboard/due-today', dashboardController.getDueToday);
router.get('/dashboard/monthly-report', dashboardController.getMonthlyReport);
router.get('/dashboard/monthly-report/pdf', dashboardController.exportMonthlyReportPdf);

router.get('/customers', customerController.listCustomers);
router.get(
	'/customers/:id',
	validateRequest([{ field: 'id', in: 'params', type: 'int', required: true, min: 1 }]),
	customerController.getCustomerById
);
router.post(
	'/customers',
	validateRequest([
		{ field: 'name', type: 'string', required: true, minLength: 2, maxLength: 120 },
		{ field: 'phone', type: 'string', required: true, minLength: 10, maxLength: 20 },
		{ field: 'email', type: 'email' }
	]),
	customerController.createCustomer
);
router.put(
	'/customers/:id',
	validateRequest([
		{ field: 'id', in: 'params', type: 'int', required: true, min: 1 },
		{ field: 'name', type: 'string', required: true, minLength: 2, maxLength: 120 },
		{ field: 'phone', type: 'string', required: true, minLength: 10, maxLength: 20 },
		{ field: 'email', type: 'email' }
	]),
	customerController.updateCustomer
);
router.delete(
	'/customers/:id',
	validateRequest([{ field: 'id', in: 'params', type: 'int', required: true, min: 1 }]),
	customerController.deleteCustomer
);

router.post(
	'/loans/calculate',
	validateRequest([
		{ field: 'principal_amount', type: 'number', required: true, min: 1 },
		{ field: 'interest_rate', type: 'number', required: true, min: 0 },
		{ field: 'interest_type', type: 'enum', required: true, values: ['flat', 'reducing'] },
		{ field: 'tenure_months', type: 'int', required: true, min: 1 },
		{ field: 'first_emi_date', type: 'date' }
	]),
	loanController.calculateLoan
);
router.get('/loans/overdue', loanController.getOverdueLoans);
router.get('/loans', loanController.listLoans);
router.get(
	'/loans/:id',
	validateRequest([{ field: 'id', in: 'params', type: 'int', required: true, min: 1 }]),
	loanController.getLoanById
);
router.post(
	'/loans',
	validateRequest([
		{ field: 'customer_id', type: 'int', required: true, min: 1 },
		{ field: 'loan_type', type: 'string', required: true, minLength: 2 },
		{ field: 'principal_amount', type: 'number', required: true, min: 1 },
		{ field: 'interest_rate', type: 'number', required: true, min: 0 },
		{ field: 'interest_type', type: 'enum', required: true, values: ['flat', 'reducing'] },
		{ field: 'tenure_months', type: 'int', required: true, min: 1 },
		{ field: 'disbursed_date', type: 'date', required: true },
		{ field: 'first_emi_date', type: 'date', required: true }
	]),
	loanController.createLoan
);
router.post(
	'/loans/:id/pay',
	validateRequest([
		{ field: 'id', in: 'params', type: 'int', required: true, min: 1 },
		{ field: 'amount', type: 'number', min: 1 },
		{ field: 'emi_no', type: 'int', min: 1 },
		{ field: 'paid_date', type: 'date' },
		{ field: 'payment_mode', type: 'enum', values: ['cash', 'upi', 'bank_transfer', 'card'] }
	]),
	loanController.payLoanEmi
);

router.post(
	'/rd/calculate',
	validateRequest([
		{ field: 'monthly_amount', type: 'number', required: true, min: 1 },
		{ field: 'interest_rate', type: 'number', required: true, min: 0 },
		{ field: 'tenure_months', type: 'int', required: true, min: 1 }
	]),
	depositController.calculateRD
);
router.get('/rd', depositController.listRD);
router.get(
	'/rd/:id',
	validateRequest([{ field: 'id', in: 'params', type: 'int', required: true, min: 1 }]),
	depositController.getRDById
);
router.post(
	'/rd',
	validateRequest([
		{ field: 'customer_id', type: 'int', required: true, min: 1 },
		{ field: 'monthly_amount', type: 'number', required: true, min: 1 },
		{ field: 'interest_rate', type: 'number', required: true, min: 0 },
		{ field: 'tenure_months', type: 'int', required: true, min: 1 },
		{ field: 'start_date', type: 'date', required: true }
	]),
	depositController.createRD
);
router.post(
	'/rd/:id/pay',
	validateRequest([
		{ field: 'id', in: 'params', type: 'int', required: true, min: 1 },
		{ field: 'amount', type: 'number', min: 1 },
		{ field: 'installment_no', type: 'int', min: 1 },
		{ field: 'paid_date', type: 'date' },
		{ field: 'payment_mode', type: 'enum', values: ['cash', 'upi', 'bank_transfer', 'card'] }
	]),
	depositController.payRDInstallment
);

router.post(
	'/fd/calculate',
	validateRequest([
		{ field: 'principal_amount', type: 'number', required: true, min: 1 },
		{ field: 'interest_rate', type: 'number', required: true, min: 0 },
		{ field: 'tenure_months', type: 'int', required: true, min: 1 },
		{ field: 'compounding', type: 'enum', required: true, values: ['simple', 'quarterly', 'half_yearly', 'yearly'] }
	]),
	depositController.calculateFD
);
router.get('/fd/maturing', depositController.getMaturingFD);
router.get('/fd', depositController.listFD);
router.post(
	'/fd',
	validateRequest([
		{ field: 'customer_id', type: 'int', required: true, min: 1 },
		{ field: 'principal_amount', type: 'number', required: true, min: 1 },
		{ field: 'interest_rate', type: 'number', required: true, min: 0 },
		{ field: 'compounding', type: 'enum', required: true, values: ['simple', 'quarterly', 'half_yearly', 'yearly'] },
		{ field: 'tenure_months', type: 'int', required: true, min: 1 },
		{ field: 'deposit_date', type: 'date', required: true }
	]),
	depositController.createFD
);

router.get('/chits', chitController.listChits);
router.get(
	'/chits/:id',
	validateRequest([{ field: 'id', in: 'params', type: 'int', required: true, min: 1 }]),
	chitController.getChitById
);
router.post(
	'/chits',
	validateRequest([
		{ field: 'group_name', type: 'string', required: true, minLength: 2 },
		{ field: 'chit_value', type: 'number', required: true, min: 1 },
		{ field: 'monthly_contribution', type: 'number', required: true, min: 1 },
		{ field: 'total_members', type: 'int', required: true, min: 2 },
		{ field: 'duration_months', type: 'int', required: true, min: 1 },
		{ field: 'commission_pct', type: 'number', required: true, min: 0 },
		{ field: 'start_date', type: 'date', required: true },
		{ field: 'status', type: 'enum', values: ['upcoming', 'active', 'completed'] }
	]),
	chitController.createChit
);
router.post(
	'/chits/:id/members',
	validateRequest([
		{ field: 'id', in: 'params', type: 'int', required: true, min: 1 },
		{ field: 'customer_id', type: 'int', required: true, min: 1 },
		{ field: 'ticket_no', type: 'string', required: true, minLength: 1 },
		{ field: 'join_date', type: 'date' }
	]),
	chitController.addChitMember
);
router.post(
	'/chits/:id/collection',
	validateRequest([
		{ field: 'id', in: 'params', type: 'int', required: true, min: 1 },
		{ field: 'chit_member_id', type: 'int', required: true, min: 1 },
		{ field: 'month_no', type: 'int', required: true, min: 1 },
		{ field: 'amount', type: 'number', min: 1 },
		{ field: 'paid_date', type: 'date' },
		{ field: 'payment_mode', type: 'enum', values: ['cash', 'upi', 'bank_transfer', 'card'] }
	]),
	chitController.recordChitCollection
);
router.post(
	'/chits/:id/auction',
	validateRequest([
		{ field: 'id', in: 'params', type: 'int', required: true, min: 1 },
		{ field: 'month_no', type: 'int', required: true, min: 1 },
		{ field: 'winner_member_id', type: 'int', required: true, min: 1 },
		{ field: 'bid_amount', type: 'number', required: true, min: 1 },
		{ field: 'auction_date', type: 'date' }
	]),
	chitController.recordChitAuction
);

module.exports = router;
