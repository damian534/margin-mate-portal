import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InputSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  helperText?: string;
}

export function InputSection({ title, icon, children, helperText }: InputSectionProps) {
  return (
    <Card className="border-border/50 shadow-sm overflow-visible">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          {icon}
          {title}
        </CardTitle>
        {helperText && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4 overflow-visible">
        {children}
      </CardContent>
    </Card>
  );
}