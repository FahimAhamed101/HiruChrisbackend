export enum Permission {
  // Business Overview
  VIEW_BUSINESS_OVERVIEW = 'view_business_overview',
  EDIT_BUSINESS_OVERVIEW = 'edit_business_overview',
  VIEW_BUSINESS_SUMMARY = 'view_business_summary',
  VIEW_BUSINESS_STATISTICS = 'view_business_statistics',
  VIEW_USER_STATISTICS = 'view_user_statistics',

  // People Management
  MANAGE_PEOPLE = 'manage_people',
  ACCEPT_REJECT_JOIN_REQUESTS = 'accept_reject_join_requests',
  MANAGE_TEAM_MEMBERS = 'manage_team_members',
  VIEW_EMPLOYEE_PROFILES = 'view_employee_profiles',
  EDIT_EMPLOYEE_PROFILES = 'edit_employee_profiles',
  HANDLE_ONBOARDING = 'handle_onboarding',
  REPORT_ASSISTANCE_ISSUES = 'report_assistance_issues',

  // Job Management
  MANAGE_JOBS = 'manage_jobs',
  POST_JOBS = 'post_jobs',
  VIEW_JOBS = 'view_jobs',
  EDIT_JOBS = 'edit_jobs',
  DELETE_JOBS = 'delete_jobs',
  VIEW_JOB_APPLICATIONS = 'view_job_applications',

  // Shift & Schedule
  MANAGE_SCHEDULE = 'manage_schedule',
  VIEW_SCHEDULE = 'view_schedule',
  CREATE_SCHEDULE = 'create_schedule',
  EDIT_SCHEDULE = 'edit_schedule',
  CREATE_EDIT_SCHEDULE_TEMPLATES = 'create_edit_schedule_templates',
  MARK_LATE_MISSED_ATTENDANCE = 'mark_late_missed_attendance',
  CREATE_REMOVE_HOLIDAYS = 'create_remove_holidays',

  // Leave Management
  REQUEST_LEAVE = 'request_leave',
  APPROVE_LEAVE = 'approve_leave',
  VIEW_LEAVE_HISTORY = 'view_leave_history',

  // Overtime Management
  REQUEST_OVERTIME = 'request_overtime',
  APPROVE_OVERTIME = 'approve_overtime',
  VIEW_OVERTIME_REQUESTS = 'view_overtime_requests',

  // Swap Requests
  CREATE_SWAP_REQUEST = 'create_swap_request',
  APPROVE_SWAP_REQUEST = 'approve_swap_request',
  VIEW_SWAP_REQUESTS = 'view_swap_requests',

  // Shift Operations
  CLOCK_IN_OUT = 'clock_in_out',
  VIEW_OWN_SHIFTS = 'view_own_shifts',
  VIEW_ALL_SHIFTS = 'view_all_shifts',
  CREATE_SHIFTS = 'create_shifts',
  ASSIGN_SHIFTS = 'assign_shifts',
  REPORT_SHIFT_ISSUES = 'report_shift_issues',
  SUBMIT_SHIFT_SUMMARY = 'submit_shift_summary',

  // Attendance & Hours
  VIEW_OWN_ATTENDANCE = 'view_own_attendance',
  VIEW_ALL_ATTENDANCE = 'view_all_attendance',
  TRACK_HOURS = 'track_hours',

  // Business Management
  CREATE_BUSINESS = 'create_business',
  EDIT_BUSINESS = 'edit_business',
  DELETE_BUSINESS = 'delete_business',
}