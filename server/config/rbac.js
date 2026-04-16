const ROLES = {
    ADMIN: 'admin',
    EMPLOYEE: 'employee',
    CLIENT: 'client',
    STUDENT: 'student'
};

const ROLE_CAPABILITIES = {
    [ROLES.ADMIN]: ['*'],
    [ROLES.EMPLOYEE]: [
        'assignments.review',
        'assignments.read',
        'courses.read',
        'lessons.read',
        'files.read'
    ],
    [ROLES.CLIENT]: [
        'courses.catalog',
        'orders.create',
        'orders.read',
        'payments.create',
        'payments.read'
    ],
    [ROLES.STUDENT]: [
        'courses.catalog',
        'learning.access',
        'assignments.submit',
        'assignments.read',
        'files.upload',
        'files.read'
    ]
};

const hasCapability = (role, capability) => {
    if (!role) return false;
    const capabilities = ROLE_CAPABILITIES[role] || [];
    return capabilities.includes('*') || capabilities.includes(capability);
};

module.exports = {
    ROLES,
    ROLE_CAPABILITIES,
    hasCapability
};
