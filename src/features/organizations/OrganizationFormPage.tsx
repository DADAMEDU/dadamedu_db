import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BranchCombobox } from "@/features/organizations/BranchCombobox";
import { buildOrganizationFormSchema, type OrganizationFormValues } from "@/features/organizations/schema";
import {
  createOrganization,
  getOrganization,
  isBranchCodeTaken,
  updateOrganization,
} from "@/features/organizations/api";
import { useToast } from "@/components/ui/toast";
import type { OrganizationType } from "@/types/database";
import { formatErrorMessage } from "@/lib/errors";

const UNSET_BUSINESS_TYPE = "__unset__";

const emptyDefaults = (type: OrganizationType): OrganizationFormValues => ({
  organization_type: type,
  parent_branch_id: null,
  branch_business_type: null,
  branch_code: "",
  organization_name: "",
  region: "",
  business_name: "",
  representative_name: "",
  business_registration_number: "",
  telephone: "",
  mobile: "",
  address: "",
  login_id: "",
  recommender: "",
  approval_status: "승인대기",
  join_date: "",
  bank: "",
  account_holder: "",
  account_number: "",
  note: "",
});

export function OrganizationFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = Boolean(id);
  const [loading, setLoading] = React.useState(isEdit);
  const [submitting, setSubmitting] = React.useState(false);

  const typeFromQuery = (searchParams.get("type") as OrganizationType) ?? "BRANCH";

  const formSchema = React.useMemo(() => buildOrganizationFormSchema(isEdit), [isEdit]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyDefaults(typeFromQuery),
  });

  const orgType = watch("organization_type");

  React.useEffect(() => {
    if (!id) return;
    let mounted = true;
    getOrganization(id)
      .then((org) => {
        if (!mounted) return;
        reset({
          organization_type: org.organization_type,
          parent_branch_id: org.parent_branch_id,
          branch_business_type: org.branch_business_type,
          branch_code: org.branch_code ?? "",
          organization_name: org.organization_name,
          region: org.region ?? "",
          business_name: org.business_name ?? "",
          representative_name: org.representative_name ?? "",
          business_registration_number: org.business_registration_number ?? "",
          telephone: org.telephone ?? "",
          mobile: org.mobile ?? "",
          address: org.address ?? "",
          login_id: org.login_id ?? "",
          recommender: org.recommender ?? "",
          approval_status: org.approval_status ?? "승인대기",
          join_date: org.join_date ?? "",
          bank: org.bank ?? "",
          account_holder: org.account_holder ?? "",
          account_number: org.account_number ?? "",
          note: org.note ?? "",
        });
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id, reset]);

  async function onSubmit(values: OrganizationFormValues) {
    const isBranch = values.organization_type === "BRANCH";
    const trimmedBranchCode = values.branch_code?.trim() || null;

    if (isBranch && trimmedBranchCode) {
      const taken = await isBranchCodeTaken(trimmedBranchCode, isEdit ? id : undefined);
      if (taken) {
        setError("branch_code", { type: "manual", message: "이미 사용 중인 지사코드입니다." });
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        ...values,
        parent_branch_id: isBranch ? null : values.parent_branch_id,
        branch_business_type: isBranch ? values.branch_business_type ?? null : null,
        branch_code: isBranch ? trimmedBranchCode : null,
        join_date: values.join_date || null,
      };
      if (isEdit && id) {
        await updateOrganization(id, payload);
        toast({ title: "수정되었습니다.", variant: "success" });
        navigate(`/organizations/${id}`);
      } else {
        const created = await createOrganization(payload);
        toast({ title: "등록되었습니다.", variant: "success" });
        navigate(`/organizations/${created.id}`);
      }
    } catch (e) {
      const message = formatErrorMessage(e);
      if (message.includes("uq_org_branch_code_normalized") || message.toLowerCase().includes("branch_code")) {
        setError("branch_code", { type: "manual", message: "이미 사용 중인 지사코드입니다." });
      } else {
        toast({ title: "저장에 실패했습니다.", description: message, variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">불러오는 중...</div>;
  }

  const label = orgType === "BRANCH" ? "지사" : "지사기관";

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> 뒤로
      </button>

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? `${label} 수정` : `${label} 신규등록`}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            {!isEdit && (
              <div className="col-span-2 flex gap-4 rounded-md bg-muted/50 p-3 text-sm">
                <span className="font-medium">구분</span>
                <span>{label}</span>
              </div>
            )}

            {orgType === "AGENCY" && (
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>
                  소속지사 <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={control}
                  name="parent_branch_id"
                  render={({ field }) => (
                    <BranchCombobox value={field.value ?? null} onChange={(id) => field.onChange(id)} />
                  )}
                />
                {errors.parent_branch_id && (
                  <p className="text-xs text-destructive">{errors.parent_branch_id.message}</p>
                )}
              </div>
            )}

            <Field label="권역" {...register("region")} />
            <Field
              label={orgType === "BRANCH" ? "지사명" : "기관명"}
              required
              error={errors.organization_name?.message}
              {...register("organization_name")}
            />

            {orgType === "BRANCH" && (
              <Field
                label="지사코드"
                required={!isEdit}
                placeholder="CJ001"
                error={errors.branch_code?.message}
                {...register("branch_code")}
              />
            )}

            {orgType === "BRANCH" && (
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>지사 운영구분</Label>
                <Controller
                  control={control}
                  name="branch_business_type"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? UNSET_BUSINESS_TYPE}
                      onValueChange={(v) => field.onChange(v === UNSET_BUSINESS_TYPE ? null : v)}
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNSET_BUSINESS_TYPE}>미설정</SelectItem>
                        <SelectItem value="EXISTING_ONLY">기존만</SelectItem>
                        <SelectItem value="NEW_ONLY">신규만</SelectItem>
                        <SelectItem value="BOTH">기존+신규</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  법인 업무 범위에 따른 지사 분류입니다. 지사기관에는 적용되지 않습니다.
                </p>
              </div>
            )}
            <Field label="사업자명" {...register("business_name")} />
            <Field label="이름(대표자)" {...register("representative_name")} />
            <Field label="사업자등록번호" placeholder="000-00-00000" {...register("business_registration_number")} />
            <Field label="전화번호" placeholder="02-000-0000" {...register("telephone")} />
            <Field label="휴대폰번호" placeholder="010-0000-0000" {...register("mobile")} />
            <Field label="아이디" {...register("login_id")} />
            <Field label="추천인" {...register("recommender")} />

            <div className="flex flex-col gap-1.5">
              <Label>승인여부</Label>
              <Controller
                control={control}
                name="approval_status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="승인완료">승인완료</SelectItem>
                      <SelectItem value="승인대기">승인대기</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <Field label="가입날짜" type="date" {...register("join_date")} />

            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>주소</Label>
              <Input {...register("address")} />
            </div>

            <Field label="은행" {...register("bank")} />
            <Field label="예금주" {...register("account_holder")} />
            <Field label="계좌번호" {...register("account_number")} />

            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>비고</Label>
              <Textarea {...register("note")} />
            </div>

            <div className="col-span-2 mt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                취소
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "저장 중..." : "저장"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

const Field = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean; error?: string }
>(({ label, required, error, ...props }, ref) => (
  <div className="flex flex-col gap-1.5">
    <Label>
      {label} {required && <span className="text-destructive">*</span>}
    </Label>
    <Input ref={ref} {...props} />
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
));
Field.displayName = "Field";
