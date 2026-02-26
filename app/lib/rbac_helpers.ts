import { User } from "@prisma/client";

export type AuthUserWithTeam = Omit<User, "organizationId"> & {
  organizationId: string;
  teamMembers: User[];
};

export function getSecureOwnershipFilter(dbUser: AuthUserWithTeam) {
  if (dbUser.role === "ADMIN") {
    return {}; // Admins get no employee-level restrictions
  }

  if (dbUser.role === "MANAGER") {
    const teamIds = dbUser.teamMembers.map((member) => member.id);
    return { employeeId: { in: [dbUser.id, ...teamIds] } };
  }

  return { employeeId: dbUser.id }; // Employees only get their own
}
