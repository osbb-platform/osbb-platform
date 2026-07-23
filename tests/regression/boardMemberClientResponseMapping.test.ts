import { describe, expect, it } from "vitest";

import { mapBoardMemberCommandResponse } from "../../src/modules/houses/components/boardMemberClientMapper";

describe("board member command response mapping", () => {
  it("maps a raw snake_case update response without losing leadership status", () => {
    expect(
      mapBoardMemberCommandResponse({
        id: "vice-1",
        house_id: "house-1",
        role_status: "vice_chairman",
        name: "Нова заступниця",
        role: "Заступник голови правління",
        phone: "+380 67 000 00 00",
        email: "vice@example.com",
        office_hours: "Пн–Пт",
        description: "",
        sort_order: 2,
        lock_version: 5,
        created_at: "2026-05-26T09:21:15.651307+00:00",
        updated_at: "2026-07-23T11:06:25.077+00:00",
      }),
    ).toMatchObject({
      id: "vice-1",
      status: "vice_chairman",
      officeHours: "Пн–Пт",
      sortOrder: 2,
      lockVersion: 5,
    });
  });

  it("maps chairman responses using the same leadership contract", () => {
    expect(
      mapBoardMemberCommandResponse({
        id: "chair-1",
        roleStatus: "chairman",
        name: "Голова",
        role: "Голова правління",
        phone: "",
        email: "",
        officeHours: "",
        description: "",
        sortOrder: 0,
        lockVersion: 3,
      }),
    ).toMatchObject({
      id: "chair-1",
      status: "chairman",
      lockVersion: 3,
    });
  });

  it("keeps multiple ordinary-member responses valid", () => {
    expect(
      mapBoardMemberCommandResponse({
        id: "member-3",
        role_status: "member",
        name: "Член правління",
        role: "Члени правління",
        phone: "",
        email: "",
        office_hours: "",
        description: "",
        sort_order: 7,
        lock_version: 1,
      }),
    ).toMatchObject({
      status: "member",
      sortOrder: 7,
      lockVersion: 1,
    });
  });
});
