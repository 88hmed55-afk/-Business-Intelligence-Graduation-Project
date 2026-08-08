import type { ReactNode } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface BaseFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

export function FormField({
  label,
  error,
  required,
  className,
  children,
}: BaseFieldProps & { children: ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label className={cn(error && "text-destructive")}>
          {label}
          {required && <span className="ms-0.5 text-destructive">*</span>}
        </Label>
      )}
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

interface FormInputProps extends BaseFieldProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  min?: number | string;
  max?: number | string;
  step?: string;
}

export function FormInput({
  label,
  error,
  required,
  className,
  value,
  onChange,
  ...rest
}: FormInputProps) {
  return (
    <FormField label={label} error={error} required={required} className={className}>
      <Input
        {...rest}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className={cn(error && "border-destructive focus-visible:ring-destructive")}
        aria-invalid={Boolean(error)}
      />
    </FormField>
  );
}

interface FormSelectProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>
  extends BaseFieldProps {
  control: Control<TFieldValues>;
  name: TName;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
}

export function FormSelect<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  label,
  error,
  required,
  className,
  control,
  name,
  placeholder,
  options,
  disabled,
  onValueChange,
}: FormSelectProps<TFieldValues, TName>) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t("nav:forms.selectPlaceholder");
  return (
    <FormField label={label} error={error} required={required} className={className}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            value={field.value ?? undefined}
            onValueChange={(value) => {
              field.onChange(value);
              onValueChange?.(value);
            }}
            disabled={disabled}
          >
            <SelectTrigger className={cn(error && "border-destructive")} aria-invalid={Boolean(error)}>
              <SelectValue placeholder={resolvedPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </FormField>
  );
}

interface FormTextareaProps extends BaseFieldProps {
  placeholder?: string;
  rows?: number;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxLength?: number;
}

export function FormTextarea({
  label,
  error,
  required,
  className,
  value,
  onChange,
  ...rest
}: FormTextareaProps) {
  return (
    <FormField label={label} error={error} required={required} className={className}>
      <Textarea
        {...rest}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className={cn(error && "border-destructive focus-visible:ring-destructive")}
        aria-invalid={Boolean(error)}
      />
    </FormField>
  );
}

interface FormSwitchProps extends BaseFieldProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  labelPlacement?: "inline" | "top";
  disabled?: boolean;
}

export function FormSwitch({
  label,
  error,
  className,
  checked,
  onCheckedChange,
  disabled,
}: FormSwitchProps) {
  return (
    <div className={cn("flex items-center justify-between rounded-lg border p-3", className)}>
      {label && <Label className="cursor-pointer">{label}</Label>}
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
