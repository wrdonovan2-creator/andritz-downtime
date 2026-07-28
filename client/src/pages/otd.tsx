import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Save, Loader2 } from "lucide-react";

type OtdData = {
  year: number;
  goal: number | null;
  months: { month: number; percent: number | null }[];
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Otd() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const { toast } = useToast();
  const isManager = role === "plant_manager" || role === "production_manager";

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data, isLoading } = useQuery<OtdData>({
    queryKey: ["/api/otd", year],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/otd?year=${year}`);
      return res.json();
    },
  });

  const [goalInput, setGoalInput] = useState<string>("");
  const [monthInputs, setMonthInputs] = useState<string[]>(Array(12).fill(""));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setGoalInput(data.goal != null ? String(data.goal) : "");
      const arr = Array(12).fill("");
      for (const m of data.months) {
        if (m.percent != null) arr[m.month - 1] = String(m.percent);
      }
      setMonthInputs(arr);
    }
  }, [data]);

  const yearActual = useMemo(() => {
    const vals = monthInputs.map(parseFloat).filter((v) => !isNaN(v) && v > 0);
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  }, [monthInputs]);

  const maxHeight = 100;

  async function handleSave() {
    setSaving(true);
    try {
      const months = monthInputs.map((v, i) => ({ month: i + 1, percent: v.trim() === "" ? null : parseFloat(v) }));
      await apiRequest("POST", `/api/otd`, {
        year,
        goal: goalInput.trim() === "" ? null : parseFloat(goalInput),
        months,
      });
      toast({ title: t("otd.saved"), description: `${year} OTD updated.` });
      queryClient.invalidateQueries({ queryKey: ["/api/otd"] });
    } catch (e: any) {
      toast({ title: t("otd.saveFailed"), description: e?.message || "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t("otd.title")}
        subtitle={t("otd.subtitle")}
        action={
          <div className="flex items-center gap-2">
            <Label htmlFor="year-input" className="text-sm">{t("otd.year")}:</Label>
            <Input
              id="year-input"
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10) || currentYear)}
              className="w-24"
              data-testid="input-year"
            />
          </div>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{year} OTD By Item</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <div className="w-full overflow-x-auto">
              <div className="min-w-[900px]">
                {/* Chart area */}
                <div className="relative flex h-96 items-end gap-2 border-b border-l pb-2 pl-8 pr-2">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 flex h-full flex-col-reverse justify-between pb-2 text-xs text-muted-foreground">
                    {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => (
                      <div key={v} className="flex items-center gap-1">
                        <span className="w-6 text-right">{v}%</span>
                        <div className="h-px w-2 bg-border" />
                      </div>
                    ))}
                  </div>

                  {/* Bars */}
                  {/* Goal bar */}
                  <BarColumn
                    label={`${year} Goal`}
                    value={goalInput.trim() === "" ? null : parseFloat(goalInput)}
                    color="bg-blue-800"
                    maxHeight={maxHeight}
                  />
                  {/* YTD actual */}
                  <BarColumn
                    label={`${String(year).slice(2)} YTD ACT`}
                    value={yearActual}
                    color="bg-sky-400"
                    maxHeight={maxHeight}
                  />
                  {/* Monthly bars */}
                  {MONTH_LABELS.map((m, i) => {
                    const val = monthInputs[i].trim() === "" ? null : parseFloat(monthInputs[i]);
                    return (
                      <BarColumn
                        key={m}
                        label={`${String(year).slice(2)}-${m}`}
                        value={val}
                        color="bg-sky-400"
                        maxHeight={maxHeight}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isManager && (
        <Card data-testid="card-editor">
          <CardHeader>
            <CardTitle>{t("otd.editTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-xs">
              <Label htmlFor="goal">{year} {t("otd.goalPercent")}</Label>
              <Input
                id="goal"
                type="number"
                step="0.1"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="85"
                data-testid="input-goal"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
              {MONTH_LABELS.map((m, i) => (
                <div key={m}>
                  <Label htmlFor={`m-${i}`}>{m}</Label>
                  <Input
                    id={`m-${i}`}
                    type="number"
                    step="0.1"
                    value={monthInputs[i]}
                    onChange={(e) => {
                      const arr = [...monthInputs];
                      arr[i] = e.target.value;
                      setMonthInputs(arr);
                    }}
                    placeholder="—"
                    data-testid={`input-month-${i + 1}`}
                  />
                </div>
              ))}
            </div>
            <div>
              <Button onClick={handleSave} disabled={saving} data-testid="button-save-otd">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t("otd.save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BarColumn({
  label,
  value,
  color,
  maxHeight,
}: {
  label: string;
  value: number | null;
  color: string;
  maxHeight: number;
}) {
  const heightPct = value == null ? 0 : Math.max(0, Math.min(100, (value / maxHeight) * 100));
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <div className="relative flex h-full w-full items-end justify-center">
        <div
          className={`w-3/4 rounded-t ${color} transition-all`}
          style={{ height: `${heightPct}%` }}
          title={value == null ? "0%" : `${value}%`}
        >
          <div className="-mt-6 text-center text-xs font-bold">
            {value == null ? "0%" : `${Math.round(value)}%`}
          </div>
        </div>
      </div>
      <div className="whitespace-nowrap text-xs text-muted-foreground" style={{ transform: "rotate(-35deg)", transformOrigin: "top left", marginLeft: "50%", marginTop: "6px" }}>
        {label}
      </div>
    </div>
  );
}
