import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useProductivity } from "@/lib/hooks";
import { Save, Loader2 } from "lucide-react";

type S = string;
type Period = { ope: S; planned: S; confirmed: S; productivity: S };
const empty = (): Period => ({ ope: "", planned: "", confirmed: "", productivity: "" });

export default function Productivity() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const { toast } = useToast();
  const isManager = role === "plant_manager" || role === "production_manager";

  const { data, isLoading } = useProductivity();

  const [target, setTarget] = useState<S>("85");
  const [ytd, setYtd] = useState<Period>(empty());
  const [l30, setL30] = useState<Period>(empty());
  const [l7, setL7] = useState<Period>(empty());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const s = (v: number | null) => (v == null ? "" : String(v));
    setTarget(data.target != null ? String(data.target) : "85");
    setYtd({ ope: s(data.ytd.ope), planned: s(data.ytd.planned), confirmed: s(data.ytd.confirmed), productivity: s(data.ytd.productivity) });
    setL30({ ope: s(data.l30.ope), planned: s(data.l30.planned), confirmed: s(data.l30.confirmed), productivity: s(data.l30.productivity) });
    setL7({ ope: s(data.l7.ope), planned: s(data.l7.planned), confirmed: s(data.l7.confirmed), productivity: s(data.l7.productivity) });
  }, [data]);

  const num = (v: S): number | null => {
    const s = v.trim();
    if (!s) return null;
    // Strip commas and any trailing % or 'h' Celonis puts on values.
    const cleaned = s.replace(/,/g, "").replace(/[%hH\s]+$/, "");
    const n = parseFloat(cleaned);
    return Number.isNaN(n) ? null : n;
  };

  async function handleSave() {
    setSaving(true);
    try {
      await apiRequest("POST", "/api/productivity", {
        target: num(target),
        ytd: { ope: num(ytd.ope), planned: num(ytd.planned), confirmed: num(ytd.confirmed), productivity: num(ytd.productivity) },
        l30: { ope: num(l30.ope), planned: num(l30.planned), confirmed: num(l30.confirmed), productivity: num(l30.productivity) },
        l7:  { ope: num(l7.ope),  planned: num(l7.planned),  confirmed: num(l7.confirmed),  productivity: num(l7.productivity)  },
      });
      toast({ title: t("productivity.saved"), description: t("productivity.title") });
      queryClient.invalidateQueries({ queryKey: ["/api/productivity"] });
    } catch (e: any) {
      toast({ title: t("productivity.saveFailed"), description: e?.message || "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title={t("productivity.title")} subtitle={t("productivity.subtitle")} />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const Col = ({
    labelKey, p, setP, testPrefix,
  }: {
    labelKey: "ytd" | "l30" | "l7";
    p: Period;
    setP: (v: Period) => void;
    testPrefix: string;
  }) => (
    <div className="space-y-3">
      <div className="rounded-md bg-primary py-2 text-center text-lg font-semibold text-primary-foreground">
        {t(`productivity.${labelKey}`)}
      </div>
      <FieldBox label={t("productivity.ope")}       value={p.ope}         onChange={(v) => setP({ ...p, ope: v })}         testId={`input-${testPrefix}-ope`} />
      <FieldBox label={t("productivity.planned")}   value={p.planned}     onChange={(v) => setP({ ...p, planned: v })}     testId={`input-${testPrefix}-planned`} />
      <FieldBox label={t("productivity.confirmed")} value={p.confirmed}   onChange={(v) => setP({ ...p, confirmed: v })}   testId={`input-${testPrefix}-confirmed`} />
      <FieldBox label={t("productivity.pct")}       value={p.productivity} onChange={(v) => setP({ ...p, productivity: v })} testId={`input-${testPrefix}-pct`} suffix="%" highlight />
    </div>
  );

  return (
    <div>
      <PageHeader title={t("productivity.title")} subtitle={t("productivity.subtitle")} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("productivity.editTitle")}</CardTitle>
          <div className="flex items-center gap-3">
            <Label htmlFor="target" className="text-sm">{t("productivity.target")}</Label>
            <Input
              id="target"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={!isManager}
              data-testid="input-productivity-target"
              className="h-11 w-24 text-right"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Col labelKey="ytd" p={ytd} setP={setYtd} testPrefix="ytd" />
            <Col labelKey="l30" p={l30} setP={setL30} testPrefix="l30" />
            <Col labelKey="l7"  p={l7}  setP={setL7}  testPrefix="l7" />
          </div>

          {isManager && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} data-testid="button-save-productivity">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t("productivity.save")}
              </Button>
            </div>
          )}
          {data?.updatedAt && (
            <div className="text-right text-xs text-muted-foreground" data-testid="text-productivity-updated">
              {t("productivity.lastUpdated")}: {new Date(data.updatedAt).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FieldBox({
  label, value, onChange, testId, suffix, highlight,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testId: string;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-md border p-3 ${highlight ? "bg-accent/30" : "bg-card"}`}>
      <div className="text-center text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-center justify-center gap-1">
        <Input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testId}
          className={`h-12 text-center text-2xl font-bold tabular-nums ${highlight ? "border-primary" : ""}`}
        />
        {suffix && <span className="text-lg font-semibold text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
