import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  });
