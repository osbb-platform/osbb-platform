import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const read=(p:string)=>readFileSync(resolve(process.cwd(),p),"utf8");
describe("P09 T5c admin list city filtering",()=>{
  it("derives city scope",()=>{const s=read("src/modules/auth/services/getAdminCityScope.ts");expect(s).toContain('.eq("city_id", cityContext.cityId)');expect(s).toContain('.in("district_id", districtIds)');expect(s).not.toContain("houses.city_id");});
  it("scopes houses and districts",()=>{expect(read("src/modules/houses/services/getAdminHouses.ts")).toContain('.in("id", scope.houseIds)');expect(read("src/modules/houses/services/getAdminHouseById.ts")).toContain("typedData.district.city_id !== cityContext.cityId");expect(read("src/modules/districts/services/getAdminDistricts.ts")).toContain('.eq("city_id", scope.cityId)');});
  it("scopes employees",()=>expect(read("src/modules/employees/services/getAdminEmployees.ts")).toContain('.eq("city_id", cityContext.cityId)'));
  it("scopes tasks",()=>{expect(read("src/modules/tasks/services/getAdminTasksBoard.ts")).toContain("getAdminScopedTaskIds(");expect(read("src/modules/tasks/services/getActiveTasksCount.ts")).toContain("getAdminScopedTaskIds(");});
  it("scopes history",()=>{for(const p of ["src/modules/history/services/getPlatformChangeHistory.ts","src/modules/history/services/getPlatformHistoryFilterOptions.ts"]){const s=read(p);expect(s).toContain("metadata->>cityId.eq.");expect(s).toContain("metadata->>houseId.eq.");}});
  it("scopes analytics",()=>{for(const p of ["src/modules/analytics/services/getAnalyticsHouseOptions.ts","src/modules/analytics/services/getAnalyticsOverview.ts","src/modules/analytics/services/getAnalyticsBySection.ts","src/modules/analytics/services/getAnalyticsAccess.ts","src/modules/analytics/services/getAnalyticsRequests.ts"]){expect(read(p)).toContain("getAdminCityScope()");}});
  it("keeps public paths independent",()=>{expect(read("src/modules/houses/services/getHouseBySlug.ts")).not.toContain("getAdminCityScope");expect(read("src/modules/analytics/ingest/trackVisitorEvent.ts")).not.toContain("getAdminCityScope");});
});
