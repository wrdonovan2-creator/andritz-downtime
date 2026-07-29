import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";
import { API_BASE } from "./api";
import type { Asset, Reason, Employee, Assignment, Delay, DashboardData, WeeklyRow, ReasonRow, Schedule, Holiday, SafetyConcern, SafetyResponse, OpenSafetyConcern, Birthday, UpcomingBirthday, ToolboxTalk } from "./api";

// Custom queryFns via apiRequest so query params work through the proxy.
function jsonGetter(url: string) {
  return async () => {
    const res = await apiRequest("GET", url);
    return res.json();
  };
}

const YEAR = new Date().getFullYear();

export function useAssets() {
  return useQuery<Asset[]>({ queryKey: ["/api/assets"], queryFn: jsonGetter("/api/assets") });
}
export function useReasons() {
  return useQuery<Reason[]>({ queryKey: ["/api/reasons"], queryFn: jsonGetter("/api/reasons") });
}
export function useEmployees() {
  return useQuery<Employee[]>({ queryKey: ["/api/employees"], queryFn: jsonGetter("/api/employees") });
}
export function useAssignments() {
  return useQuery<Assignment[]>({ queryKey: ["/api/assignments"], queryFn: jsonGetter("/api/assignments") });
}
export function useDelays(refetchInterval?: number) {
  return useQuery<Delay[]>({
    queryKey: ["/api/delays", YEAR],
    queryFn: jsonGetter(`/api/delays?year=${YEAR}`),
    refetchInterval,
  });
}
export function useDashboard(refetchInterval?: number) {
  return useQuery<DashboardData>({
    queryKey: ["/api/rollups/dashboard", YEAR],
    queryFn: jsonGetter(`/api/rollups/dashboard?year=${YEAR}`),
    refetchInterval,
  });
}
export function useWeekly() {
  return useQuery<WeeklyRow[]>({
    queryKey: ["/api/rollups/weekly", YEAR],
    queryFn: jsonGetter(`/api/rollups/weekly?year=${YEAR}`),
  });
}
export function useSchedule() {
  return useQuery<Schedule[]>({ queryKey: ["/api/schedule"], queryFn: jsonGetter("/api/schedule") });
}
export function useHolidays(year?: number) {
  const q = year ? `?year=${year}` : "";
  return useQuery<Holiday[]>({ queryKey: ["/api/holidays", year ?? "all"], queryFn: jsonGetter(`/api/holidays${q}`) });
}
export function useDlh() {
  return useQuery<{ dlhPercent: number }>({ queryKey: ["/api/settings/dlh"], queryFn: jsonGetter("/api/settings/dlh") });
}
export function useByReason(refetchInterval?: number) {
  return useQuery<ReasonRow[]>({
    queryKey: ["/api/rollups/by-reason", YEAR],
    queryFn: jsonGetter(`/api/rollups/by-reason?year=${YEAR}`),
    refetchInterval,
  });
}

// Invalidate everything that depends on delays after a mutation.
export function invalidateAll() {
  queryClient.invalidateQueries({ queryKey: ["/api/delays", YEAR] });
  queryClient.invalidateQueries({ queryKey: ["/api/rollups/dashboard", YEAR] });
  queryClient.invalidateQueries({ queryKey: ["/api/rollups/weekly", YEAR] });
  queryClient.invalidateQueries({ queryKey: ["/api/rollups/by-reason", YEAR] });
}

// Invalidate everything after a schedule/holiday/DLH change (affects all cost math).
export function invalidateScheduleDeps() {
  queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
  queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
  queryClient.invalidateQueries({ queryKey: ["/api/settings/dlh"] });
  invalidateAll();
}

// ---- Safety / Birthdays / Toolbox ----
export function useSafetyConcerns() {
  return useQuery<SafetyConcern[]>({ queryKey: ["/api/safety/concerns"], queryFn: jsonGetter("/api/safety/concerns") });
}
export function useRecentResponses(refetchInterval?: number) {
  return useQuery<SafetyResponse[]>({
    queryKey: ["/api/safety/recent-responses"],
    queryFn: jsonGetter("/api/safety/recent-responses"),
    refetchInterval,
  });
}
export function useOpenConcerns(refetchInterval?: number) {
  return useQuery<OpenSafetyConcern[]>({
    queryKey: ["/api/safety/open-concerns"],
    queryFn: jsonGetter("/api/safety/open-concerns"),
    refetchInterval,
  });
}
export function useBirthdays() {
  return useQuery<Birthday[]>({ queryKey: ["/api/birthdays"], queryFn: jsonGetter("/api/birthdays") });
}
export function useUpcomingBirthdays(refetchInterval?: number) {
  return useQuery<UpcomingBirthday[]>({
    queryKey: ["/api/birthdays/upcoming"],
    queryFn: jsonGetter("/api/birthdays/upcoming"),
    refetchInterval,
  });
}
export function useProductionOrders(refetchInterval?: number) {
  return useQuery<any[]>({
    queryKey: ["/api/production-orders"],
    queryFn: jsonGetter("/api/production-orders"),
    refetchInterval,
  });
}

export function useOtd(year: number, refetchInterval?: number) {
  return useQuery<{ year: number; goal: number | null; months: { month: number; percent: number | null }[] }>({
    queryKey: ["/api/otd", year],
    queryFn: jsonGetter(`/api/otd?year=${year}`),
    refetchInterval,
  });
}

export interface ProductivityPeriod {
  ope: number | null;
  planned: number | null;
  confirmed: number | null;
  productivity: number | null;
}
export interface ProductivityKpi {
  target: number;
  ytd: ProductivityPeriod;
  l30: ProductivityPeriod;
  l7: ProductivityPeriod;
  updatedAt: string | null;
}
export function useProductivity(refetchInterval?: number) {
  return useQuery<ProductivityKpi>({
    queryKey: ["/api/productivity"],
    queryFn: jsonGetter("/api/productivity"),
    refetchInterval,
  });
}

export function useToolbox(refetchInterval?: number) {
  return useQuery<ToolboxTalk | null>({
    queryKey: ["/api/toolbox"],
    queryFn: jsonGetter("/api/toolbox"),
    refetchInterval,
  });
}

export const CURRENT_YEAR = YEAR;

// Trigger a browser download of the Excel export through the backend.
export function downloadExcel() {
  window.open(`${API_BASE}/api/export/excel?year=${YEAR}`, "_blank");
}
