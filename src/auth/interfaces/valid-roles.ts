export enum ValidRoles {
  admin = 'admin',
  superUser = 'super-user',
  user = 'user',
}

export type AssignableRole = Exclude<ValidRoles, ValidRoles.superUser>;
