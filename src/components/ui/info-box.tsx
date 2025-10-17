import { Info, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoBoxProps {
  variant?: "info" | "warning" | "error";
  title: string;
  description: string;
  className?: string;
}

const variantStyles = {
  info: {
    container: "bg-pink-50 border-pink-200",
    icon: "text-red-500",
    IconComponent: Info,
  },
  warning: {
    container: "bg-yellow-50 border-yellow-200",
    icon: "text-yellow-600",
    IconComponent: AlertTriangle,
  },
  error: {
    container: "bg-red-50 border-red-200",
    icon: "text-red-600",
    IconComponent: AlertCircle,
  },
};

/**
 * Reusable InfoBox component for displaying informational messages
 * Supports three variants: info (pink), warning (yellow), error (red)
 */
export function InfoBox({
  variant = "info",
  title,
  description,
  className,
}: InfoBoxProps) {
  const styles = variantStyles[variant];
  const Icon = styles.IconComponent;

  return (
    <div
      className={cn(
        "border rounded-lg p-4",
        styles.container,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Icon className={cn("w-5 h-5", styles.icon)} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {title}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
