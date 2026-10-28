import {
  mockUsers,
  mockJobs,
  mockInstances,
  mockStats,
  mockNotifications,
  mockTestMethods,
  mockUnits,
  mockSpecialProfiles,
} from './mockData.js';

/**
 * Creates a JWT token structure valid for client-side decoding in AuthContext.
 */
export const createMockToken = (user) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      _id: user._id || 'mock-id-1',
      role: user.role,
      name: user.name,
      email: user.email,
      department: user.department || 'Micro',
      branch: user.branch || 'Main Branch',
      exp: Math.floor(Date.now() / 1000) + 86400,
    })
  );
  return `${header}.${payload}.mockSignature`;
};

/**
 * Injects authenticated user credentials into localStorage before any script runs.
 */
export const loginAs = async (page, role, customUser = {}) => {
  const defaultUserMap = {
    ADMIN: mockUsers[0],
    ADMIN_OFFICER: mockUsers[1],
    HEAD: mockUsers[2],
    ASSISTANT: mockUsers[4],
  };

  const user = { ...defaultUserMap[role], ...customUser };
  const token = createMockToken(user);

  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token, user }
  );

  return user;
};

/**
 * Sets up Playwright route mocks for all common API endpoints.
 */
export const setupApiMocks = async (page, overrides = {}) => {
  // Mock API routes
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // Check custom overrides first
    for (const [pattern, handler] of Object.entries(overrides)) {
      if (url.includes(pattern)) {
        return handler(route);
      }
    }

    // Stats
    if (url.includes('/api/stats')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockStats),
      });
    }

    // Jobs
    if (url.includes('/api/jobs')) {
      if (method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jobs: mockJobs,
            hasMore: false,
            nextCursor: null,
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockJobs[0]),
      });
    }

    // Test instances
    if (url.includes('/api/tests/instances')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockInstances),
      });
    }

    // Users
    if (url.includes('/api/users')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUsers),
      });
    }

    // Notifications
    if (url.includes('/api/notifications')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockNotifications),
      });
    }

    // Groups
    if (url.includes('/api/parameter-groups') || url.includes('/api/groups')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            _id: 'grp-1',
            group: 'Dairy Products',
            subGroup: 'Pasteurized Milk',
            categories: ['Microbiology'],
            parameters: [
              {
                parameterId: { _id: 'p-1', name: 'Total Plate Count', type: 'Micro', unit: 'cfu/ml' },
                category: 'Microbiology',
                specification: 'Max 30000',
              },
            ],
          },
        ]),
      });
    }

    // Parameters
    if (url.includes('/api/parameters')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { _id: 'p-1', name: 'Total Plate Count', type: 'Micro', unit: 'cfu/ml' },
          { _id: 'p-2', name: 'Acid Value', type: 'Chemical', unit: 'mg KOH/g' },
        ]),
      });
    }

    // Test Methods
    if (url.includes('/api/test-methods')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTestMethods),
      });
    }

    // Units
    if (url.includes('/api/units')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockUnits),
      });
    }

    // Bug Reports
    if (url.includes('/api/bug-reports')) {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Feedback submitted successfully' }),
      });
    }

    // Sample Transfers
    if (url.includes('/api/sample-transfers')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }

    // Serial settings
    if (url.includes('/api/serial')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ serial: 100 }),
      });
    }

    // Special profiles
    if (url.includes('/api/special-profiles')) {
      if (method === 'PUT') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Profile parameters updated successfully' }),
        });
      }
      // Check if fetching single profile by key
      const match = url.match(/\/api\/special-profiles\/([a-zA-Z0-9_-]+)/);
      if (match) {
        const key = match[1];
        const profile = mockSpecialProfiles.find((p) => p.key === key) || mockSpecialProfiles[0];
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(profile),
        });
      }
      // Summary list
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          mockSpecialProfiles.map((p) => ({
            key: p.key,
            label: p.label,
            description: p.description,
            isExclusive: p.isExclusive,
            parameterCount: p.parameterCount,
            variants: p.variants?.map((v) => ({
              key: v.key,
              label: v.label,
              parameterCount: v.parameterCount,
            })),
          }))
        ),
      });
    }

    // Profile update
    if (url.includes('/api/auth/update-profile')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Profile updated successfully' }),
      });
    }

    // Fallback for unhandled API calls
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
};
