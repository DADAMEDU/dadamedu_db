import { z } from "zod";

const baseOrganizationFields = {
  organization_type: z.enum(["BRANCH", "AGENCY"]),
  parent_branch_id: z.string().uuid().nullable().optional(),
  branch_business_type: z.enum(["EXISTING_ONLY", "NEW_ONLY", "BOTH"]).nullable().optional(),
  branch_code: z.string().optional(),
  organization_name: z.string().min(1, "명칭을 입력하세요."),
  region: z.string().optional(),
  business_name: z.string().optional(),
  representative_name: z.string().optional(),
  business_registration_number: z.string().optional(),
  telephone: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  login_id: z.string().optional(),
  recommender: z.string().optional(),
  approval_status: z.string().optional(),
  join_date: z.string().optional(),
  bank: z.string().optional(),
  account_holder: z.string().optional(),
  account_number: z.string().optional(),
  note: z.string().optional(),
};

/**
 * isEdit=false(신규등록)이고 BRANCH일 때만 지사코드를 필수로 강제한다.
 * 기존에 지사코드 없이 등록된 지사(레거시 데이터)는 수정 화면에서 다른 필드만
 * 고치는 경우에도 코드 입력을 강제하지 않는다 — 실제 운영 데이터에 임의로
 * 코드를 만들어 넣지 않는다는 원칙과 일치시키기 위함.
 */
export function buildOrganizationFormSchema(isEdit: boolean) {
  return z.object(baseOrganizationFields).superRefine((val, ctx) => {
    if (val.organization_type === "AGENCY" && !val.parent_branch_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parent_branch_id"],
        message: "소속지사를 선택하세요.",
      });
    }
    if (!isEdit && val.organization_type === "BRANCH" && !val.branch_code?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["branch_code"],
        message: "지사코드를 입력하세요.",
      });
    }
  });
}

// 기본값(신규등록 기준) — 기존 코드 호환용
export const organizationFormSchema = buildOrganizationFormSchema(false);

export type OrganizationFormValues = z.infer<ReturnType<typeof buildOrganizationFormSchema>>;
