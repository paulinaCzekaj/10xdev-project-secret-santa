import type { PasswordRequirement } from "@/hooks/usePasswordValidation";

interface PasswordRequirementItemProps {
  requirement: PasswordRequirement;
}

export function PasswordRequirementItem({ requirement }: PasswordRequirementItemProps) {
  return (
    <li className={`flex items-center gap-2 ${requirement.met ? "text-green-600" : "text-gray-500"}`}>
      <span className={`text-xs ${requirement.met ? "text-green-600" : "text-gray-400"}`}>{requirement.icon}</span>
      {requirement.text}
    </li>
  );
}
