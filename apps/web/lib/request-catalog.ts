import { PTCL_DEPARTMENT_CATALOG } from './departments';

export const REQUEST_PRODUCTS = [
  'Flash Fiber', 'Enterprise', 'Smart TV', 'Voice',
  'CRM', 'CBS', 'BI', 'Maximo', 'Meximo', 'One Window', 'Prisma', 'E-Ocean', 'Website', 'UPTCL App', 'EVAM', 'Other',
] as const;

const requestedDepartmentNames = [
  'CVM', 'PD Devices', 'PD Product Development', 'IPTV Team', 'Digital Team', 'CRM', 'CBS', 'IT Planning',
  'RA (Revenue Assurance)', 'IT Dev Team', 'CC (Contact Center)', 'BI Data Analyst', 'Marketing & Brand',
  'Product & Pricing', 'Customer Care', 'Contact Center', 'Network Operations', 'Finance', 'Human Resources',
  'Legal & Regulatory', 'Procurement', 'Cybersecurity', 'Digital Channels', 'Service Assurance', 'Wholesale',
  'Enterprise Business', 'Fiber / Access', 'Business Intelligence', 'Commercial Operations',
];

export const REQUEST_DEPARTMENTS = [...new Set([
  ...requestedDepartmentNames,
  ...PTCL_DEPARTMENT_CATALOG.flatMap(group => [group.name, ...group.teams]),
])];

export const REQUEST_SEGMENTS = [
  'Consumer', 'SME', 'Enterprise', 'Wholesale', 'Public Sector', 'Wireline', 'Wireless',
  'Customer Value Management (CVM)', 'Internal / Shared Services', 'PTCL Group', 'Other',
] as const;
