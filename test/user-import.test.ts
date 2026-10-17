import { describe, expect, it } from "vitest";
import { parseStaffList } from "@/lib/user-import";

describe("parseStaffList", () => {
  it("reads the common pasted formats and skips a header", () => {
    const { rows, problems } = parseStaffList(
      [
        "First name\tLast name\tEmail\tRole",
        "Dana\tWhitfield\tDWhitfield@example.org\tAdmin",
        "Kim Nguyen, kim.nguyen@example.org",
        "Mary Ann Lopez <mlopez@example.org>",
        "",
        "Lee, Jordan, jlee@example.org, user",
      ].join("\n"),
    );
    expect(problems).toEqual([]);
    expect(rows).toEqual([
      { first_name: "Dana", last_name: "Whitfield", email: "dwhitfield@example.org", role: "admin" },
      { first_name: "Kim", last_name: "Nguyen", email: "kim.nguyen@example.org", role: "user" },
      { first_name: "Mary Ann", last_name: "Lopez", email: "mlopez@example.org", role: "user" },
      { first_name: "Lee", last_name: "Jordan", email: "jlee@example.org", role: "user" },
    ]);
  });

  it("lists lines it can't use", () => {
    const { rows, problems } = parseStaffList("Prince, prince@example.org\nno email here\nKim Nguyen, kim@example.org\nKim N, KIM@example.org");
    expect(rows.map((r) => r.email)).toEqual(["kim@example.org"]);
    expect(problems.map((p) => [p.line, p.reason])).toEqual([
      [1, "Needs a first and last name"],
      [2, "No email address"],
      [4, "Same email as an earlier line"],
    ]);
  });
});
