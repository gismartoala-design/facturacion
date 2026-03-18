import { CardDescription, CardTitle } from "@/components/ui/card";

type DocumentWorkspaceHeaderProps = {
  title: string;
  description: string;
};

export function DocumentWorkspaceHeader({
  title,
  description,
}: DocumentWorkspaceHeaderProps) {
  return (
    <div className="p-4">
      <div className="space-y-1">
        <CardTitle className="text-[#4a3c58]">{title}</CardTitle>
        <CardDescription className="max-w-2xl text-[#4a3c58]/68">
          {description}
        </CardDescription>
      </div>
    </div>
  );
}
