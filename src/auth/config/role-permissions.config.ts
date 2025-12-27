// src/auth/config/role-permissions.config.ts
import { UserRole } from '../enums/roles.enum';
import { Permission } from '../enums/permissions.enum';
import { RolePermissions } from '../types/role-permissions.type';

export const ROLE_PERMISSIONS: RolePermissions = {
  // ==================== OWNER ====================
  [UserRole.OWNER]: [
    // Business Overview - Full Access
    Permission.VIEW_BUSINESS_OVERVIEW,
    Permission.EDIT_BUSINESS_OVERVIEW,
    Permission.VIEW_BUSINESS_SUMMARY,
    Permission.VIEW_BUSINESS_STATISTICS,
    Permission.VIEW_USER_STATISTICS,

    // People Management - Full Access
    Permission.MANAGE_PEOPLE,
    Permission.ACCEPT_REJECT_JOIN_REQUESTS,
    Permission.MANAGE_TEAM_MEMBERS,
    Permission.VIEW_EMPLOYEE_PROFILES,
    Permission.EDIT_EMPLOYEE_PROFILES,
    Permission.HANDLE_ONBOARDING,
    Permission.REPORT_ASSISTANCE_ISSUES,

    // Job Management - Full Access
    Permission.MANAGE_JOBS,
    Permission.POST_JOBS,
    Permission.VIEW_JOBS,
    Permission.EDIT_JOBS,
    Permission.DELETE_JOBS,
    Permission.VIEW_JOB_APPLICATIONS,

    // Shift & Schedule - Full Access
    Permission.MANAGE_SCHEDULE,
    Permission.VIEW_SCHEDULE,
    Permission.CREATE_SCHEDULE,
    Permission.EDIT_SCHEDULE,
    Permission.CREATE_EDIT_SCHEDULE_TEMPLATES,
    Permission.MARK_LATE_MISSED_ATTENDANCE,
    Permission.CREATE_REMOVE_HOLIDAYS,

    // Leave & Overtime - Full Access
    Permission.REQUEST_LEAVE,
    Permission.APPROVE_LEAVE,
    Permission.VIEW_LEAVE_HISTORY,
    Permission.REQUEST_OVERTIME,
    Permission.APPROVE_OVERTIME,
    Permission.VIEW_OVERTIME_REQUESTS,

    // Swap Requests - Full Access
    Permission.CREATE_SWAP_REQUEST,
    Permission.APPROVE_SWAP_REQUEST,
    Permission.VIEW_SWAP_REQUESTS,

    // Shift Operations - Full Access
    Permission.CLOCK_IN_OUT,
    Permission.VIEW_OWN_SHIFTS,
    Permission.VIEW_ALL_SHIFTS,
    Permission.CREATE_SHIFTS,
    Permission.ASSIGN_SHIFTS,
    Permission.REPORT_SHIFT_ISSUES,
    Permission.SUBMIT_SHIFT_SUMMARY,

    // Attendance - Full Access
    Permission.VIEW_OWN_ATTENDANCE,
    Permission.VIEW_ALL_ATTENDANCE,
    Permission.TRACK_HOURS,

    // Business Management
    Permission.CREATE_BUSINESS,
    Permission.EDIT_BUSINESS,
    Permission.DELETE_BUSINESS,
  ],

  // ==================== MANAGER ====================
  [UserRole.MANAGER]: [
    // Business Overview - Full Access
    Permission.VIEW_BUSINESS_OVERVIEW,
    Permission.EDIT_BUSINESS_OVERVIEW,
    Permission.VIEW_BUSINESS_SUMMARY,
    Permission.VIEW_BUSINESS_STATISTICS,
    Permission.VIEW_USER_STATISTICS,

    // People Management - Full Access
    Permission.MANAGE_PEOPLE,
    Permission.ACCEPT_REJECT_JOIN_REQUESTS,
    Permission.MANAGE_TEAM_MEMBERS,
    Permission.VIEW_EMPLOYEE_PROFILES,
    Permission.EDIT_EMPLOYEE_PROFILES,
    Permission.HANDLE_ONBOARDING,
    Permission.REPORT_ASSISTANCE_ISSUES,

    // Job Management - Full Access
    Permission.MANAGE_JOBS,
    Permission.POST_JOBS,
    Permission.VIEW_JOBS,
    Permission.EDIT_JOBS,
    Permission.DELETE_JOBS,
    Permission.VIEW_JOB_APPLICATIONS,

    // Shift & Schedule - Full Access
    Permission.MANAGE_SCHEDULE,
    Permission.VIEW_SCHEDULE,
    Permission.CREATE_SCHEDULE,
    Permission.EDIT_SCHEDULE,
    Permission.CREATE_EDIT_SCHEDULE_TEMPLATES,
    Permission.MARK_LATE_MISSED_ATTENDANCE,
    Permission.CREATE_REMOVE_HOLIDAYS,

    // Leave & Overtime - Approval Access
    Permission.REQUEST_LEAVE,
    Permission.APPROVE_LEAVE,
    Permission.VIEW_LEAVE_HISTORY,
    Permission.REQUEST_OVERTIME,
    Permission.APPROVE_OVERTIME,
    Permission.VIEW_OVERTIME_REQUESTS,

    // Swap Requests - Approval Access
    Permission.CREATE_SWAP_REQUEST,
    Permission.APPROVE_SWAP_REQUEST,
    Permission.VIEW_SWAP_REQUESTS,

    // Shift Operations
    Permission.CLOCK_IN_OUT,
    Permission.VIEW_OWN_SHIFTS,
    Permission.VIEW_ALL_SHIFTS,
    Permission.CREATE_SHIFTS,
    Permission.ASSIGN_SHIFTS,
    Permission.REPORT_SHIFT_ISSUES,
    Permission.SUBMIT_SHIFT_SUMMARY,

    // Attendance
    Permission.VIEW_OWN_ATTENDANCE,
    Permission.VIEW_ALL_ATTENDANCE,
    Permission.TRACK_HOURS,
  ],

  // ==================== CASHIER ====================
  [UserRole.CASHIER]: [
    // Business Overview - View Only
    Permission.VIEW_BUSINESS_OVERVIEW,
    Permission.VIEW_BUSINESS_SUMMARY,
    Permission.VIEW_BUSINESS_STATISTICS,
    Permission.VIEW_USER_STATISTICS,

    // People Management - View Only
    Permission.VIEW_EMPLOYEE_PROFILES,
    Permission.REPORT_ASSISTANCE_ISSUES,

    // Job Management - No Access (based on image)
    Permission.VIEW_JOBS,

    // Shift & Schedule - View Only
    Permission.VIEW_SCHEDULE,

    // Leave & Overtime - Request Only
    Permission.REQUEST_LEAVE,
    Permission.VIEW_LEAVE_HISTORY,
    Permission.REQUEST_OVERTIME,
    Permission.VIEW_OVERTIME_REQUESTS,

    // Swap Requests
    Permission.CREATE_SWAP_REQUEST,
    Permission.VIEW_SWAP_REQUESTS,

    // Shift Operations - Own Only
    Permission.CLOCK_IN_OUT,
    Permission.VIEW_OWN_SHIFTS,
    Permission.REPORT_SHIFT_ISSUES,
    Permission.SUBMIT_SHIFT_SUMMARY,

    // Attendance - Own Only
    Permission.VIEW_OWN_ATTENDANCE,
    Permission.TRACK_HOURS,
  ],

  // ==================== BARTENDER ====================
  [UserRole.BARTENDER]: [
    // Business Overview - View Only
    Permission.VIEW_BUSINESS_OVERVIEW,
    Permission.VIEW_BUSINESS_SUMMARY,
    Permission.VIEW_BUSINESS_STATISTICS,
    Permission.VIEW_USER_STATISTICS,

    // People Management - View Only
    Permission.VIEW_EMPLOYEE_PROFILES,
    Permission.REPORT_ASSISTANCE_ISSUES,

    // Job Management - View Only
    Permission.VIEW_JOBS,

    // Shift & Schedule - View Only
    Permission.VIEW_SCHEDULE,

    // Leave & Overtime - Request Only
    Permission.REQUEST_LEAVE,
    Permission.VIEW_LEAVE_HISTORY,
    Permission.REQUEST_OVERTIME,
    Permission.VIEW_OVERTIME_REQUESTS,

    // Swap Requests
    Permission.CREATE_SWAP_REQUEST,
    Permission.VIEW_SWAP_REQUESTS,

    // Shift Operations - Own Only
    Permission.CLOCK_IN_OUT,
    Permission.VIEW_OWN_SHIFTS,
    Permission.REPORT_SHIFT_ISSUES,
    Permission.SUBMIT_SHIFT_SUMMARY,

    // Attendance - Own Only
    Permission.VIEW_OWN_ATTENDANCE,
    Permission.TRACK_HOURS,
  ],

  // ==================== HOUSEKEEPING STAFF ====================
  [UserRole.HOUSEKEEPING_STAFF]: [
    // Business Overview - No Access
    // (empty based on image)

    // People Management - Limited
    Permission.REPORT_ASSISTANCE_ISSUES,

    // Job Management - No Access
    Permission.VIEW_JOBS,

    // Shift & Schedule - View Only
    Permission.VIEW_SCHEDULE,

    // Leave & Overtime - Request Only
    Permission.REQUEST_LEAVE,
    Permission.VIEW_LEAVE_HISTORY,
    Permission.REQUEST_OVERTIME,
    Permission.VIEW_OVERTIME_REQUESTS,

    // Swap Requests
    Permission.CREATE_SWAP_REQUEST,
    Permission.VIEW_SWAP_REQUESTS,

    // Shift Operations - Own Only
    Permission.CLOCK_IN_OUT,
    Permission.VIEW_OWN_SHIFTS,
    Permission.REPORT_SHIFT_ISSUES,
    Permission.SUBMIT_SHIFT_SUMMARY,

    // Attendance - Own Only
    Permission.VIEW_OWN_ATTENDANCE,
    Permission.TRACK_HOURS,
  ],

  // ==================== WAITER ====================
  [UserRole.WAITER]: [
    // Business Overview - View Only
    Permission.VIEW_BUSINESS_OVERVIEW,
    Permission.VIEW_BUSINESS_SUMMARY,

    // People Management - View Only
    Permission.VIEW_EMPLOYEE_PROFILES,
    Permission.REPORT_ASSISTANCE_ISSUES,

    // Job Management - No Access
    Permission.VIEW_JOBS,

    // Shift & Schedule - View Only
    Permission.VIEW_SCHEDULE,

    // Leave & Overtime - Request Only
    Permission.REQUEST_LEAVE,
    Permission.VIEW_LEAVE_HISTORY,
    Permission.REQUEST_OVERTIME,
    Permission.VIEW_OVERTIME_REQUESTS,

    // Swap Requests
    Permission.CREATE_SWAP_REQUEST,
    Permission.VIEW_SWAP_REQUESTS,

    // Shift Operations - Own Only
    Permission.CLOCK_IN_OUT,
    Permission.VIEW_OWN_SHIFTS,
    Permission.REPORT_SHIFT_ISSUES,
    Permission.SUBMIT_SHIFT_SUMMARY,

    // Attendance - Own Only
    Permission.VIEW_OWN_ATTENDANCE,
    Permission.TRACK_HOURS,
  ],

  // ==================== DISHWASHER ====================
  [UserRole.DISHWASHER]: [
    // Business Overview - No Access
    // (empty based on image)

    // People Management - Limited
    Permission.REPORT_ASSISTANCE_ISSUES,

    // Job Management - No Access
    Permission.VIEW_JOBS,

    // Shift & Schedule - View Only
    Permission.VIEW_SCHEDULE,

    // Leave & Overtime - Request Only
    Permission.REQUEST_LEAVE,
    Permission.VIEW_LEAVE_HISTORY,
    Permission.REQUEST_OVERTIME,
    Permission.VIEW_OVERTIME_REQUESTS,

    // Swap Requests
    Permission.CREATE_SWAP_REQUEST,
    Permission.VIEW_SWAP_REQUESTS,

    // Shift Operations - Own Only
    Permission.CLOCK_IN_OUT,
    Permission.VIEW_OWN_SHIFTS,
    Permission.REPORT_SHIFT_ISSUES,
    Permission.SUBMIT_SHIFT_SUMMARY,

    // Attendance - Own Only
    Permission.VIEW_OWN_ATTENDANCE,
    Permission.TRACK_HOURS,
  ],

  // ==================== GENERIC EMPLOYEE ====================
  [UserRole.EMPLOYEE]: [
    // Basic employee permissions
    Permission.VIEW_OWN_SHIFTS,
    Permission.CLOCK_IN_OUT,
    Permission.VIEW_OWN_ATTENDANCE,
    Permission.TRACK_HOURS,
    Permission.REQUEST_LEAVE,
    Permission.VIEW_LEAVE_HISTORY,
    Permission.REQUEST_OVERTIME,
    Permission.VIEW_OVERTIME_REQUESTS,
    Permission.CREATE_SWAP_REQUEST,
    Permission.VIEW_SWAP_REQUESTS,
    Permission.REPORT_SHIFT_ISSUES,
    Permission.SUBMIT_SHIFT_SUMMARY,
    Permission.VIEW_SCHEDULE,
    Permission.VIEW_JOBS,
  ],
};

// Helper function to check if a role has a specific permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

// Helper function to get all permissions for a role
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}