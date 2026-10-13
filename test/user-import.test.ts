import { describe, expect, it } from "vitest";
import { parseStaffList, staffEmail } from "@/lib/user-import";

describe("staffEmail", () => {
  it("runs the full name together at the staff domain", () => {
    expect(staffEmail("Dana", "Whitfield")).toBe("danawhitfield@illuminationhealthhome.org");
    expect(staffEmail("Mary Ann", "O'Brien-Lopez")).toBe("maryannobrienlopez@illuminationhealthhome.org");
    expect(staffEmail("José", "Núñez")).toBe("josenunez@illuminationhealthhome.org");
  });
});

describe("parseStaffList", () => {
  it("reads firstname, lastname, email columns with a header, generating blank emails", () => {
    const { rows, problems } = parseStaffList(
      ["firstname,lastname,email,role", "Dana,Whitfield,,admin", "Kim,Nguyen,KNguyen@example.org", '"Lopez, Jr.",Mary,,'].join("\n"),
    );
    expect(problems).toEqual([]);
    expect(rows).toEqual([
      { first_name: "Dana", last_name: "Whitfield", email: "danawhitfield@illuminationhealthhome.org", role: "admin", generatedEmail: true },
      { first_name: "Kim", last_name: "Nguyen", email: "knguyen@example.org", role: "user" },
      { first_name: "Lopez, Jr.", last_name: "Mary", email: "lopezjrmary@illuminationhealthhome.org", role: "user", generatedEmail: true },
    ]);
  });

  it("reads clinical roles under their common names", () => {
    const roles = parseStaffList("Ana,Ruiz,,LVN\nBo,Li,,nurse\nCy,Do,,Clinical\nDi,Ek,,staff").rows.map((r) => r.role);
    expect(roles).toEqual(["clinical", "clinical", "clinical", "user"]);
  });

  it("finds columns by header name in any order, and reads tab-separated rows without a header", () => {
    expect(parseStaffList("Email\tLast Name\tFirst Name\n\tWhitfield\tDana").rows[0]).toMatchObject({
      first_name: "Dana",
      last_name: "Whitfield",
      email: "danawhitfield@illuminationhealthhome.org",
    });
    expect(parseStaffList("Kim\tNguyen").rows[0]).toMatchObject({ first_name: "Kim", last_name: "Nguyen", email: "kimnguyen@illuminationhealthhome.org" });
  });

  it("lists lines it can't use", () => {
    const { rows, problems } = parseStaffList("firstname,lastname,email\nPrince,,\nKim,Nguyen,\nKim,Nguyen,\nAl,Smith,not-an-email");
    expect(rows.map((r) => r.email)).toEqual(["kimnguyen@illuminationhealthhome.org"]);
    expect(problems.map((p) => [p.line, p.reason])).toEqual([
      [2, "Needs a first and last name"],
      [4, "Same email as an earlier line (kimnguyen@illuminationhealthhome.org)"],
      [5, "Email address isn't valid"],
    ]);
  });
});
