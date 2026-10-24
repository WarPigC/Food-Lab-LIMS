export const mockUsers = [
  {
    _id: 'u-admin-1',
    name: 'Super Admin',
    email: 'admin@acropolis.com',
    role: 'ADMIN',
    branch: 'Main Branch',
  },
  {
    _id: 'u-officer-1',
    name: 'Officer Jane',
    email: 'officer@acropolis.com',
    role: 'ADMIN_OFFICER',
    branch: 'Main Branch',
  },
  {
    _id: 'u-head-1',
    name: 'Dr. Head Micro',
    email: 'head.micro@acropolis.com',
    role: 'HEAD',
    department: 'Micro',
    branch: 'Main Branch',
  },
  {
    _id: 'u-head-2',
    name: 'Dr. Head Chemical',
    email: 'head.chem@acropolis.com',
    role: 'HEAD',
    department: 'Chemical',
    branch: 'Main Branch',
  },
  {
    _id: 'u-asst-1',
    name: 'Analyst Alex',
    email: 'alex@acropolis.com',
    role: 'ASSISTANT',
    department: 'Micro',
    branch: 'Main Branch',
  },
  {
    _id: 'u-asst-2',
    name: 'Analyst Bob',
    email: 'bob@acropolis.com',
    role: 'ASSISTANT',
    department: 'Chemical',
    branch: 'Main Branch',
  },
];

export const mockJobs = [
  {
    _id: 'job-101',
    jobCode: '2604230001',
    clientName: 'Sunrise Organic Foods Ltd',
    sampleName: 'Refined Soybean Oil',
    received_date: '2026-04-20',
    batchNo: 'BAT-2026-X1',
    status: 'IN_PROGRESS',
    isRetest: false,
    distribution: {
      micro: {
        required: true,
        status: 'ASSIGNED_TO_ASSISTANT',
        assignedTo: 'u-asst-1',
      },
      chemical: {
        required: true,
        status: 'PENDING',
      },
    },
    parameters: [
      {
        _id: 'p-1',
        name: 'Total Plate Count',
        department: 'Micro',
        unit: 'cfu/g',
        standard: 'FSSAI',
      },
      {
        _id: 'p-2',
        name: 'Acid Value',
        department: 'Chemical',
        unit: 'mg KOH/g',
        standard: 'IS 548',
      },
    ],
    createdAt: '2026-04-20T10:00:00.000Z',
    updatedAt: '2026-04-21T12:00:00.000Z',
  },
  {
    _id: 'job-102',
    jobCode: '2604230002',
    clientName: 'Green Meadows Dairy',
    sampleName: 'Pasteurized Toned Milk',
    received_date: '2026-04-21',
    batchNo: 'MILK-889',
    status: 'COMPLETED',
    isRetest: false,
    distribution: {
      micro: {
        required: true,
        status: 'COMPLETED',
      },
      chemical: {
        required: false,
      },
    },
    parameters: [
      {
        _id: 'p-3',
        name: 'Coliform Count',
        department: 'Micro',
        unit: 'cfu/ml',
      },
    ],
    createdAt: '2026-04-21T09:30:00.000Z',
    updatedAt: '2026-04-22T15:30:00.000Z',
  },
];

export const mockInstances = [
  {
    _id: 'inst-201',
    testCode: '2604230001-1-a',
    jobId: 'job-101',
    job: mockJobs[0],
    department: 'Micro',
    status: 'PENDING',
    assignedTo: mockUsers[4], // Analyst Alex
    parameters: [
      {
        parameterId: 'p-1',
        name: 'Total Plate Count',
        unit: 'cfu/g',
        method: 'IS 5402',
        result: '',
      },
    ],
    createdAt: '2026-04-20T10:15:00.000Z',
    updatedAt: '2026-04-20T10:15:00.000Z',
  },
  {
    _id: 'inst-202',
    testCode: '2604230001-1-b',
    jobId: 'job-101',
    job: mockJobs[0],
    department: 'Micro',
    status: 'PENDING_HEAD_REVIEW',
    assignedTo: mockUsers[4],
    results: [
      {
        parameterId: 'Aldrin',
        name: 'Aldrin',
        unit: 'mg/kg',
        testMethod: 'USEPA 525.2',
        value: '0.02',
        specification: 'Max 0.03',
        isPanel: true,
        panelName: 'GCMSMS',
      },
    ],
    parameters: [
      {
        parameterId: 'Aldrin',
        name: 'Aldrin',
        unit: 'mg/kg',
        method: 'USEPA 525.2',
        result: '0.02',
      },
    ],
    createdAt: '2026-04-20T11:00:00.000Z',
    updatedAt: '2026-04-21T14:00:00.000Z',
  },
];

export const mockStats = {
  ongoingJobs: 14,
  completedJobs: 82,
  activeAnalysts: 3,
};

export const mockGroups = [
  {
    _id: 'grp-1',
    name: 'Dairy Products',
    subGroup: 'Pasteurized Milk',
    department: 'Micro',
    parameters: [
      {
        _id: 'gp-1',
        name: 'Total Plate Count',
        unit: 'cfu/ml',
        method: 'IS 5402',
      },
    ],
  },
  {
    _id: 'grp-2',
    name: 'Oils and Fats',
    subGroup: 'Edible Vegetable Oil',
    department: 'Chemical',
    parameters: [
      {
        _id: 'gp-2',
        name: 'Acid Value',
        unit: 'mg KOH/g',
        method: 'IS 548',
      },
    ],
  },
];

export const mockNotifications = [
  {
    _id: 'notif-1',
    title: 'New Job Assigned',
    message: 'Test instance 2604230001-1-a assigned to you.',
    type: 'TASK_ASSIGNED',
    isRead: false,
    createdAt: '2026-04-23T08:00:00.000Z',
  },
  {
    _id: 'notif-2',
    title: 'Review Approved',
    message: 'Review for Job 2604230002 has been finalized.',
    type: 'REVIEW_APPROVED',
    isRead: true,
    createdAt: '2026-04-22T17:00:00.000Z',
  },
];

export const mockTestMethods = [
  { _id: 'tm-1', name: 'IS 5402' },
  { _id: 'tm-2', name: 'IS 548' },
  { _id: 'tm-3', name: 'FSSAI Manual' },
];

export const mockUnits = ['cfu/g', 'cfu/ml', 'mg KOH/g', 'mg/kg', '%', 'N/A'];
