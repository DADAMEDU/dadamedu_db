import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Building2, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function NewOrganizationButton() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> 신규등록
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>무엇을 등록하시겠어요?</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate("/organizations/new?type=BRANCH")}
              className="flex flex-col items-center gap-2 rounded-md border border-border p-4 hover:border-primary hover:bg-primary/5"
            >
              <Building2 className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">지사 등록</span>
            </button>
            <button
              onClick={() => navigate("/organizations/new?type=AGENCY")}
              className="flex flex-col items-center gap-2 rounded-md border border-border p-4 hover:border-primary hover:bg-primary/5"
            >
              <Building className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">지사기관 등록</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
