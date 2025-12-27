import { UserRole } from "../enums/roles.enum";
import { Permission } from "../enums/permissions.enum";

export type RolePermissions = {
  [key in UserRole]: Permission[];
};
