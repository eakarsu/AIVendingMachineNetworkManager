const test = require('node:test'); const assert = require('node:assert/strict'); const p = require('../src/domain/fulfillmentWorkflow');
test('stock is held before payment', () => assert.throws(() => p.validateOrder({ machineId: 'm', lines: [{ quantity: 2, unitPriceCents: 100, available: 1 }] }), /stock/));
test('integer pricing is accepted', () => assert.equal(p.validateOrder({ machineId: 'm', lines: [{ quantity: 1, unitPriceCents: 100, available: 1 }] }), true));
test('duplicate state jumps fail', () => assert.throws(() => p.transition({ status: 'paid', version: 1 }, 'paid'), /invalid/));
test('payment needs acknowledgement', () => assert.throws(() => p.transition({ status: 'payment_pending', version: 1 }, 'paid'), /receipt/));
test('refund cannot exceed paid total', () => assert.throws(() => p.transition({ status: 'refund_pending', version: 1, paidCents: 100 }, 'refunded', { refundReceipt: 'r', refundCents: 101 }), /bounded/));
test('provider failure can dead-letter', () => assert.equal(p.acceptDelivery({ provider: 'payment', idempotencyKey: 't:k', status: 'dead_letter' }), true));
test('customer subject is isolated',()=>assert.equal(p.assertScope({tenantId:'t',subjectId:'s'},{tenantId:'t',subjectId:'s',role:'customer'},['staff']),true));
test('other customer is hidden',()=>assert.throws(()=>p.assertScope({tenantId:'t',subjectId:'s'},{tenantId:'t',subjectId:'x',role:'customer'},['staff']),/subject/));
