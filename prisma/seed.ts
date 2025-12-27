import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const catalog = [
  {
    code: 'business_overview',
    title: 'Business Overview',
    sortOrder: 1,
    permissions: [
      { code: 'view_business_summary', label: 'View Business Summary', sortOrder: 1 },
      { code: 'view_business_statistics', label: 'View Business Statistics', sortOrder: 2 },
      { code: 'view_user_statistics', label: 'View User Statistics', sortOrder: 3 },
    ],
  },
  {
    code: 'people_management',
    title: 'People Management',
    sortOrder: 2,
    permissions: [
      { code: 'accept_reject_job_requests', label: 'Accept/Reject Job Requests', sortOrder: 1 },
      { code: 'manage_team_members', label: 'Manage Team Members', sortOrder: 2 },
      { code: 'view_employee_profiles', label: 'View Employee Profiles', sortOrder: 3 },
      { code: 'handle_onboarding', label: 'Handle Onboarding', sortOrder: 4 },
      { code: 'report_absistance_issues', label: 'Report Absistance Issues', sortOrder: 5 },
    ],
  },
  {
    code: 'job_management',
    title: 'Job Management',
    sortOrder: 3,
    permissions: [
      { code: 'post_jobs', label: 'Post Jobs', sortOrder: 1 },
    ],
  },
  {
    code: 'shift_schedule',
    title: 'Shift & Schedule',
    sortOrder: 4,
    permissions: [
      { code: 'view_schedule', label: 'View Schedule', sortOrder: 1 },
      { code: 'manage_schedule_templates', label: 'Create/Edit Schedule Templates', sortOrder: 2 },
      { code: 'mark_late_missed_attendance', label: 'Mark Late / Missed Attendance', sortOrder: 3 },
      { code: 'manage_holidays', label: 'Create / Remove Holidays', sortOrder: 4 },
    ],
  },
];

async function main() {
  // Test seed: business + users + roles (idempotent via upserts)
  const testUsers = [
    { id: 'owner-1', email: 'owner@paradise.com', fullName: 'John Owner', password: 'Owner123!' },
    { id: 'manager-1', email: 'manager@paradise.com', fullName: 'Sarah Manager', password: 'Manager123!' },
    { id: 'cashier-1', email: 'cashier@paradise.com', fullName: 'Mike Cashier', password: 'Cashier123!' },
    { id: 'waiter-1', email: 'waiter@paradise.com', fullName: 'Tom Waiter', password: 'Waiter123!' },
    { id: 'house-1', email: 'house@paradise.com', fullName: 'Anna House', password: 'House123!' },
  ] as const;

  for (const user of testUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        fullName: user.fullName,
        password: hashedPassword,
        isVerified: true,
        isActive: true,
      },
      create: {
        id: user.id,
        email: user.email,
        password: hashedPassword,
        fullName: user.fullName,
        isVerified: true,
        isActive: true,
      },
    });
  }

  await prisma.business.upsert({
    where: { id: 'test-business-1' },
    update: { name: 'Paradise Hotel', type: 'hotel', ownerId: 'owner-1' },
    create: { id: 'test-business-1', name: 'Paradise Hotel', type: 'hotel', ownerId: 'owner-1' },
  });

  const roleAssignments = [
    { userId: 'owner-1', role: 'owner' },
    { userId: 'manager-1', role: 'manager' },
    { userId: 'cashier-1', role: 'cashier' },
    { userId: 'waiter-1', role: 'waiter' },
    { userId: 'house-1', role: 'housekeeping_staff' },
  ] as const;

  for (const assignment of roleAssignments) {
    await prisma.userBusiness.upsert({
      where: {
        userId_businessId: {
          userId: assignment.userId,
          businessId: 'test-business-1',
        },
      },
      update: { role: assignment.role, isSelected: true },
      create: {
        id: `ub-${assignment.userId}-test-business-1`,
        userId: assignment.userId,
        businessId: 'test-business-1',
        role: assignment.role,
        isSelected: true,
      },
    });
  }

  for (const section of catalog) {
    const savedSection = await prisma.permissionSection.upsert({
      where: { code: section.code },
      update: { title: section.title, sortOrder: section.sortOrder },
      create: { code: section.code, title: section.title, sortOrder: section.sortOrder },
    });

    for (const permission of section.permissions) {
      await prisma.permissionAction.upsert({
        where: {
          sectionId_code: {
            sectionId: savedSection.id,
            code: permission.code,
          },
        },
        update: { label: permission.label, sortOrder: permission.sortOrder },
        create: {
          sectionId: savedSection.id,
          code: permission.code,
          label: permission.label,
          sortOrder: permission.sortOrder,
        },
      });
    }
  }
}

main()
  .catch(async error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
