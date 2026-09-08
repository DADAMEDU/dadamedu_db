import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

const STEP_LABELS = [
  "파일 선택",
  "컬럼 매핑",
  "데이터 미리보기",
  "오류·중복 검사",
  "관계 확인",
  "최종 등록",
];

export function WizardStepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {STEP_LABELS.map((label, idx) => {
        const stepNum = idx + 1;
        const active = stepNum === current;
        const done = stepNum < current;
        return (
          <div key={label} className="flex shrink-0 items-center gap-1">
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                active && "bg-primary text-primary-foreground",
                done && "bg-primary/10 text-primary",
                !active && !done && "bg-muted text-muted-foreground"
              )}
            >
              {done ? <Check className="h-3 w-3" /> : <span>{stepNum}</span>}
              {label}
            </div>
            {idx < STEP_LABELS.length - 1 && <div className="h-px w-4 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}
