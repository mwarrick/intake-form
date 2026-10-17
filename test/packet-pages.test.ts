import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageType } from "@/lib/extract";

// Model answers by step, keyed by the JSON schema name each call asks for.
const answers: Record<string, unknown> = {};
const calls: string[] = [];
vi.mock("openai", () => ({
  default: class {
    responses = {
      create: async (req: { text: { format: { name: string } } }) => {
        const name = req.text.format.name;
        calls.push(name);
        if (!(name in answers)) throw new Error(`unexpected model call: ${name}`);
        return { status: "completed", output_text: JSON.stringify(answers[name]), usage: { input_tokens: 1, output_tokens: 1 } };
      },
    };
  },
}));

const { runPipeline } = await import("@/lib/extract");
const { groupPages } = await import("@/lib/extract-docs");
const { turnFor, turnImage } = await import("@/lib/upright");

/** A wide test page: 40 x 20 pixels. */
async function page(pageNumber: number) {
  const png = await sharp({ create: { width: 40, height: 20, channels: 3, background: "#fff" } }).png().toBuffer();
  return { pageNumber, dataUrl: `data:image/png;base64,${png.toString("base64")}` };
}

async function size(dataUrl: string) {
  const meta = await sharp(Buffer.from(dataUrl.split(",")[1], "base64")).metadata();
  return [meta.width, meta.height, meta.format];
}

beforeEach(() => {
  for (const k of Object.keys(answers)) delete answers[k];
  calls.length = 0;
});

describe("turning pages upright", () => {
  it("turns each orientation clockwise by the right amount", () => {
    expect(turnFor("upright")).toBe(0);
    expect(turnFor("reads_bottom_to_top")).toBe(90);
    expect(turnFor("upside_down")).toBe(180);
    expect(turnFor("reads_top_to_bottom")).toBe(270);
  });

  it("keeps the image format and swaps width and height for a quarter turn", async () => {
    const p = await page(1);
    expect(await size(await turnImage(p.dataUrl, 90))).toEqual([20, 40, "png"]);
    expect(await turnImage(p.dataUrl, 0)).toBe(p.dataUrl);
  });
});

describe("packets without a referral form", () => {
  it("leaves the form blank instead of reading every page as the form", async () => {
    answers.page_types = {
      notes: "Fax cover, face sheet and H&P; no referral form.",
      pages: [
        { page: 1, type: "other", orientation: "upright" },
        { page: 2, type: "demographics", orientation: "upright" },
        { page: 3, type: "history_physical", orientation: "upright" },
      ],
    };
    const result = await runPipeline([await page(1), await page(2), await page(3)]);
    expect(calls).toEqual(["page_types"]);
    expect(result.pipeline.noForm).toBe(true);
    expect(result.pipeline.formPages).toEqual([]);
    expect(Object.values(result.data).every((v) => v === null || (Array.isArray(v) && !v.length))).toBe(true);
    expect(result.pipeline.pageTypes?.map((p) => p.type)).toEqual(["other", "demographics", "history_physical"]);
  });
});

describe("sideways and upside-down pages", () => {
  it("turns them upright and corrects one turned the wrong way", async () => {
    answers.page_types = {
      notes: "Packet with sideways pages.",
      pages: [
        { page: 1, type: "other", orientation: "upright" },
        { page: 2, type: "medications", orientation: "reads_top_to_bottom" },
        { page: 3, type: "therapy_notes", orientation: "upside_down" },
      ],
    };
    // The check after turning says page 2 is now upside down: it should have been turned the other way.
    answers.page_orientation = {
      pages: [
        { page: 2, orientation: "upside_down" },
        { page: 3, orientation: "upright" },
      ],
    };
    const result = await runPipeline([await page(1), await page(2), await page(3)]);
    expect(calls).toEqual(["page_types", "page_orientation"]);
    expect(result.pipeline.turned).toEqual([
      { page: 2, degrees: 90 },
      { page: 3, degrees: 180 },
    ]);
    expect(await size(result.pages[0].dataUrl)).toEqual([40, 20, "png"]);
    expect(await size(result.pages[1].dataUrl)).toEqual([20, 40, "png"]);
    expect(await size(result.pages[2].dataUrl)).toEqual([40, 20, "png"]);
  });
});

describe("grouping packet pages into documents", () => {
  const types = (list: string[]) => list.map((type, i) => ({ page: i + 1, type }) as PageType);

  it("keeps an authorization split by other pages as one document", () => {
    const groups = groupPages(types(["other", "authorization", "demographics", "authorization", "medications"]));
    expect(groups.map((g) => [g.type.id, g.pages])).toEqual([
      ["authorization", [2, 4]],
      ["demographics", [3]],
      ["medications", [5]],
    ]);
  });

  it("still keeps separate runs of notes apart", () => {
    const groups = groupPages(types(["progress_notes", "progress_notes", "vitals", "progress_notes"]));
    expect(groups.map((g) => [g.type.id, g.pages])).toEqual([
      ["progress_notes", [1, 2]],
      ["vitals", [3]],
      ["progress_notes", [4]],
    ]);
  });
});
