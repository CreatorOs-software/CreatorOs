import type { FieldApi, ReactFormExtendedApi, DeepValue } from "@tanstack/react-form";
import type { DealFormValues } from "./deal-form.schema";

export type DealForm = ReactFormExtendedApi<
  DealFormValues,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any, any, any, any, any, any, any, any, any, any, any
>;

export type StepErrors = Partial<Record<keyof DealFormValues, string>>;

export type DealField<TName extends keyof DealFormValues & string> = FieldApi<
  DealFormValues,
  TName,
  DeepValue<DealFormValues, TName>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any, any, any, any, any, any, any, any, any,
  any, any, any, any, any, any, any, any, any, any, any
>;

export type BrandOption = {
  id: string;
  company_name: string;
  color: string;
  short_code: string;
};

export type CreatorOption = {
  id: string;
  full_name: string;
  color: string;
  initials: string;
};
