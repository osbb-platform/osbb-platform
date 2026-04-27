import { getAdminEmployees } from "@/src/modules/employees/services/getAdminEmployees";

export type TaskAssigneeOption = {
  id: string;
  name: string;
};

export async function getTaskAssignees(): Promise<TaskAssigneeOption[]> {
  const employees = await getAdminEmployees();

  return employees
    .filter((employee) => employee.userId && employee.isActive)
    .map((employee) => ({
      id: employee.userId as string,
      name:
        employee.fullName?.trim() ||
        employee.email?.trim() ||
        "Співробітник без імені",
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "uk"));
}
