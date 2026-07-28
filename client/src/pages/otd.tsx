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
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LabelList, Cell, ReferenceLine,
} from "recharts";

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

  const goalNum = goalInput.trim() === "" ? null : parseFloat(goalInput);

  const yearActual = useMemo(() => {
    const vals = monthInputs.map(parseFloat).filter((v) => !isNaN(v) && v > 0);
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  }, [monthInputs]);

  const yy = String(year).slice(2);

  const chartData = useMemo(() => {
    const rows: { name: string; value: number; isGoal?: boolean; isYtd?: boolean }[] = [];
    rows.push({ name: `${year} Goal`, value: goalNum ?? 0, isGoal: true });
    rows.push({ name: `${yy} YTD`, value: yearActual ?? 0, isYtd: true });
    for (let i = 0; i < 12; i++) {
      const v = monthInputs[i].trim() === "" ? 0 : parseFloat(monthInputs[i]);
      rows.push({ name: `${yy}-${MONTH_LABELS[i]}`, value: isNaN(v) ? 0 : v });
    }
    return rows;
  }, [year, yy, goalNum, yearActual, monthInputs]);

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
            <div className="w-full">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={chartData}
                  margin={{ top: 24, right: 8, left: 0, bottom: 60 }}
                  barCategoryGap="15%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 20, 40, 60, 80, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${Math.round(v)}%`, "OTD"]}
                  />
                  {goalNum != null && (
                    <ReferenceLine
                      y={goalNum}
                      stroke="#1e40af"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                  )}
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {chartData.map((row, idx) => (
                      <Cell
                        key={idx}
                        fill={row.isGoal ? "#1e40af" : row.isYtd ? "#0284c7" : "#38bdf8"}
                      />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="top"
                      formatter={(v: number) => (v > 0 ? `${Math.round(v)}%` : "")}
                      style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#1e40af" }} />
                  <span>{year} Goal</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#0284c7" }} />
                  <span>{yy} YTD</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#38bdf8" }} />
                  <span>Monthly Actual</span>
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
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
