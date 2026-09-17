import { faker } from '@faker-js/faker';
export const automationData = () => ({
  testCaseTitle: `AUTO Smoke ${faker.string.alphanumeric(8)}`,
  objective: faker.lorem.sentence(),
  module: faker.helpers.arrayElement(['CRM', 'Billing', 'Digital Channels']),
  owner: faker.person.fullName(),
  invalidEmail: faker.internet.email(),
  invalidPassword: faker.internet.password({ length: 16 }),
});
