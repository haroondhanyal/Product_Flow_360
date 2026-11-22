import { PTCL_DEPARTMENT_CATALOG } from './departments';

export type DemoAccountDefinition = {
  fullName: string;
  employeeNo: string;
  designation: string;
  department: string;
  departmentCategory: string;
  departmentTeam: string;
  email: string;
  mobile: string;
};

const demoNames = ['Hamza Khan', 'Ayesha Noor', 'Bilal Ahmed', 'Sara Ali'];
const teamTitles = ['Team Lead', 'Product Manager', 'Business Analyst', 'Project Coordinator'];
const departmentTitles = ['Department Lead', 'Department Manager', 'Principal Business Analyst', 'Portfolio Coordinator'];
const slug = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function createDemoAccountDefinitions(): DemoAccountDefinition[] {
  const definitions: DemoAccountDefinition[] = [];
  for (const group of PTCL_DEPARTMENT_CATALOG) {
    const units = [{name:'Department Office',titles:departmentTitles}, ...group.teams.map(name=>({name,titles:teamTitles}))];
    for (const unit of units) for (let index=0;index<4;index++) {
      const key=`${slug(group.name)}-${slug(unit.name)}`;
      const accountNumber=definitions.length+1;
      definitions.push({
        fullName:`${demoNames[index]} · Demo ${String(accountNumber).padStart(3,'0')}`,
        employeeNo:`DEMO-PTCL-${String(accountNumber).padStart(4,'0')}`,
        designation:unit.titles[index],
        department:unit.name==='Department Office'?`${group.name} / Department Office`:`${group.name} / ${unit.name}`,
        departmentCategory:group.name,
        departmentTeam:unit.name,
        email:`demo.${key}.${String(index+1).padStart(2,'0')}@example.com`,
        mobile:`DEMO-ONLY-${String(definitions.length+1).padStart(4,'0')}`,
      });
    }
  }
  return definitions;
}

export function formatDemoCredentials(credentials: Record<string,string> = {}): string {
  const definitions=createDemoAccountDefinitions();
  let lastCategory='';
  const lines=[
    'PRODUCTFLOW 360 — SYNTHETIC DEMO ACCOUNTS',
    'Generated for local demonstration only. These are fictional identities, not PTCL employee accounts.',
    'All email addresses use the reserved example.com domain. Do not use these credentials in production.',
    `Account count: ${definitions.length}`,
    '',
  ];
  for(const account of definitions){
    if(account.departmentCategory!==lastCategory){lastCategory=account.departmentCategory;lines.push('',`=== ${lastCategory} ===`)}
    lines.push(`Team: ${account.departmentTeam}`,`Name: ${account.fullName}`,`Designation: ${account.designation}`,`Employee ID: ${account.employeeNo}`,`Email: ${account.email}`,`Password: ${credentials[account.email.toLowerCase()] ?? 'Not available for an account provisioned before credential export was enabled.'}`,`Phone: ${account.mobile}`,'');
  }
  lines.push('','=== Demo Administrator ===','Email: admin@ptcl.com',`Password: ${credentials['admin@ptcl.com'] ?? 'Use the existing local admin password; new installations generate one on first run.'}`);
  return lines.join('\n');
}
