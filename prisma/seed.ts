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
      { code: 'view_business_overview', label: 'View Business Overview', sortOrder: 1 },
      { code: 'edit_business_overview', label: 'Edit Business Overview', sortOrder: 2 },
      { code: 'view_business_summary', label: 'View Business Summary', sortOrder: 3 },
      { code: 'view_business_statistics', label: 'View Business Statistics', sortOrder: 4 },
      { code: 'view_user_statistics', label: 'View User Statistics', sortOrder: 5 },
    ],
  },
  {
    code: 'people_management',
    title: 'People Management',
    sortOrder: 2,
    permissions: [
      { code: 'manage_people', label: 'Manage People', sortOrder: 1 },
      { code: 'accept_reject_join_requests', label: 'Accept/Reject Join Requests', sortOrder: 2 },
      { code: 'manage_team_members', label: 'Manage Team Members', sortOrder: 3 },
      { code: 'view_employee_profiles', label: 'View Employee Profiles', sortOrder: 4 },
      { code: 'edit_employee_profiles', label: 'Edit Employee Profiles', sortOrder: 5 },
      { code: 'handle_onboarding', label: 'Handle Onboarding', sortOrder: 6 },
      { code: 'report_assistance_issues', label: 'Report Assistance Issues', sortOrder: 7 },
    ],
  },
  {
    code: 'job_management',
    title: 'Job Management',
    sortOrder: 3,
    permissions: [
      { code: 'manage_jobs', label: 'Manage Jobs', sortOrder: 1 },
      { code: 'post_jobs', label: 'Post Jobs', sortOrder: 2 },
      { code: 'view_jobs', label: 'View Jobs', sortOrder: 3 },
      { code: 'edit_jobs', label: 'Edit Jobs', sortOrder: 4 },
      { code: 'delete_jobs', label: 'Delete Jobs', sortOrder: 5 },
      { code: 'view_job_applications', label: 'View Job Applications', sortOrder: 6 },
    ],
  },
  {
    code: 'shift_schedule',
    title: 'Shift & Schedule',
    sortOrder: 4,
    permissions: [
      { code: 'manage_schedule', label: 'Manage Schedule', sortOrder: 1 },
      { code: 'view_schedule', label: 'View Schedule', sortOrder: 2 },
      { code: 'create_schedule', label: 'Create Schedule', sortOrder: 3 },
      { code: 'edit_schedule', label: 'Edit Schedule', sortOrder: 4 },
      { code: 'create_edit_schedule_templates', label: 'Create/Edit Schedule Templates', sortOrder: 5 },
      { code: 'mark_late_missed_attendance', label: 'Mark Late / Missed Attendance', sortOrder: 6 },
      { code: 'create_remove_holidays', label: 'Create / Remove Holidays', sortOrder: 7 },
    ],
  },
  {
    code: 'leave_management',
    title: 'Leave Management',
    sortOrder: 5,
    permissions: [
      { code: 'request_leave', label: 'Request Leave', sortOrder: 1 },
      { code: 'approve_leave', label: 'Approve Leave', sortOrder: 2 },
      { code: 'view_leave_history', label: 'View Leave History', sortOrder: 3 },
    ],
  },
  {
    code: 'overtime_management',
    title: 'Overtime Management',
    sortOrder: 6,
    permissions: [
      { code: 'request_overtime', label: 'Request Overtime', sortOrder: 1 },
      { code: 'approve_overtime', label: 'Approve Overtime', sortOrder: 2 },
      { code: 'view_overtime_requests', label: 'View Overtime Requests', sortOrder: 3 },
    ],
  },
  {
    code: 'swap_requests',
    title: 'Swap Requests',
    sortOrder: 7,
    permissions: [
      { code: 'create_swap_request', label: 'Create Swap Request', sortOrder: 1 },
      { code: 'approve_swap_request', label: 'Approve Swap Request', sortOrder: 2 },
      { code: 'view_swap_requests', label: 'View Swap Requests', sortOrder: 3 },
    ],
  },
  {
    code: 'shift_operations',
    title: 'Shift Operations',
    sortOrder: 8,
    permissions: [
      { code: 'clock_in_out', label: 'Clock In/Out', sortOrder: 1 },
      { code: 'view_own_shifts', label: 'View Own Shifts', sortOrder: 2 },
      { code: 'view_all_shifts', label: 'View All Shifts', sortOrder: 3 },
      { code: 'create_shifts', label: 'Create Shifts', sortOrder: 4 },
      { code: 'assign_shifts', label: 'Assign Shifts', sortOrder: 5 },
      { code: 'report_shift_issues', label: 'Report Shift Issues', sortOrder: 6 },
      { code: 'submit_shift_summary', label: 'Submit Shift Summary', sortOrder: 7 },
    ],
  },
  {
    code: 'attendance_hours',
    title: 'Attendance & Hours',
    sortOrder: 9,
    permissions: [
      { code: 'view_own_attendance', label: 'View Own Attendance', sortOrder: 1 },
      { code: 'view_all_attendance', label: 'View All Attendance', sortOrder: 2 },
      { code: 'track_hours', label: 'Track Hours', sortOrder: 3 },
    ],
  },
  {
    code: 'business_management',
    title: 'Business Management',
    sortOrder: 10,
    permissions: [
      { code: 'create_business', label: 'Create Business', sortOrder: 1 },
      { code: 'edit_business', label: 'Edit Business', sortOrder: 2 },
      { code: 'delete_business', label: 'Delete Business', sortOrder: 3 },
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
