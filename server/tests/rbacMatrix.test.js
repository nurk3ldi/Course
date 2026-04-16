const test = require('node:test');
const assert = require('node:assert/strict');
const { hasCapability, ROLES } = require('../config/rbac');

test('admin has full access', () => {
    assert.equal(hasCapability(ROLES.ADMIN, 'orders.create'), true);
    assert.equal(hasCapability(ROLES.ADMIN, 'learning.access'), true);
});

test('employee can review assignments but cannot buy courses', () => {
    assert.equal(hasCapability(ROLES.EMPLOYEE, 'assignments.review'), true);
    assert.equal(hasCapability(ROLES.EMPLOYEE, 'orders.create'), false);
});

test('client can purchase but cannot learn', () => {
    assert.equal(hasCapability(ROLES.CLIENT, 'orders.create'), true);
    assert.equal(hasCapability(ROLES.CLIENT, 'learning.access'), false);
});

test('student can learn but cannot review assignments', () => {
    assert.equal(hasCapability(ROLES.STUDENT, 'learning.access'), true);
    assert.equal(hasCapability(ROLES.STUDENT, 'assignments.review'), false);
});
