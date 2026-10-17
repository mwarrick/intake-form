import { describe, expect, it } from "vitest";
import { assessmentGaps, prefillAssessment } from "@/lib/assessment";
import { chronicStatus } from "@/lib/housing";

const street = "Place not meant for habitation (street, car, encampment)";

describe("chronicStatus", () => {
  it("needs a disabling condition and street, shelter or safe haven", () => {
    expect(chronicStatus({}).status).toBe("unknown");
    expect(chronicStatus({ disabling_condition: "No", prior_living_situation: street }).status).toBe("no");
    expect(chronicStatus({ disabling_condition: "Yes", prior_living_situation: "Staying with family or friends" }).status).toBe("no");
  });

  it("counts a year continuously, or four episodes totalling 12 months", () => {
    const base = { disabling_condition: "Yes", prior_living_situation: "Emergency shelter" };
    expect(chronicStatus({ ...base, length_of_stay_prior: "1 year or longer" }).status).toBe("yes");
    expect(chronicStatus({ ...base, length_of_stay_prior: "1 to 3 months", times_homeless_3yrs: "Four or more times", months_homeless_3yrs: 12 }).status).toBe("yes");
    expect(chronicStatus({ ...base, length_of_stay_prior: "1 to 3 months", times_homeless_3yrs: "Four or more times", months_homeless_3yrs: 8 }).status).toBe("no");
    expect(chronicStatus({ ...base, length_of_stay_prior: "1 to 3 months", times_homeless_3yrs: "Four or more times" }).status).toBe("unknown");
    expect(chronicStatus({ ...base, length_of_stay_prior: "1 to 3 months", times_homeless_3yrs: "Two times" }).status).toBe("no");
  });
});

describe("prefillAssessment", () => {
  it("carries over what the referral and records already say", () => {
    const a = prefillAssessment(
      { housing_situation: ["Currently Unhoused", "4+ episodes of homelessness in the past 3 years"], diabetes: "Yes", assistive_device: "Yes", behavioral_flags: ["Mental Health DX"], mental_health_dx_type: "PTSD", insurance: "Medi-Cal" },
      { insurance: "CalOptima Health (Medi-Cal)", phone: "(714) 555-0100", substanceUse: "Methamphetamine, last use 3 months ago" },
    );
    expect(a).toMatchObject({
      times_homeless_3yrs: "Four or more times",
      health_insurance: "CalOptima Health (Medi-Cal)",
      client_phone: "(714) 555-0100",
      disabling_condition: "Yes",
      conditions: ["Physical disability", "Chronic health condition", "Mental health disorder", "Substance use disorder"],
      conditions_explain: "PTSD",
    });
    expect(prefillAssessment({}, { substanceUse: "Denies." }).conditions).toEqual([]);
  });

  it("lists required answers left, including ones a Yes makes required", () => {
    const gaps = assessmentGaps({ has_pcp: "Yes", has_income: "No" });
    expect(gaps).toContain("Primary care provider / clinic");
    expect(gaps).not.toContain("Income sources");
  });
});
