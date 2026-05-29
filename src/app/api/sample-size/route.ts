import { NextRequest, NextResponse } from "next/server";
import {
  CalcType,
  inflateForDropout,
  nCompareMeans,
  nCompareProportions,
  nMeanPrecision,
  nProportionPrecision,
  SampleSizeResult,
  Tail,
} from "@/lib/stats";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const type = body.type as CalcType;
  const num = (k: string, d?: number) => {
    const v = Number(body[k]);
    return Number.isFinite(v) ? v : (d as number);
  };
  const tail = (body.tail as Tail) || "two-sided";

  try {
    let result: SampleSizeResult;
    switch (type) {
      case "compareMeans":
        result = nCompareMeans({
          mean1: num("mean1"),
          mean2: num("mean2"),
          sd: num("sd"),
          alpha: num("alpha", 0.05),
          power: num("power", 0.8),
          tail,
          allocationRatio: num("allocationRatio", 1),
        });
        break;
      case "compareProportions":
        result = nCompareProportions({
          p1: num("p1"),
          p2: num("p2"),
          alpha: num("alpha", 0.05),
          power: num("power", 0.8),
          tail,
        });
        break;
      case "meanPrecision":
        result = nMeanPrecision({
          sd: num("sd"),
          marginOfError: num("marginOfError"),
          confidence: num("confidence", 0.95),
        });
        break;
      case "proportionPrecision":
        result = nProportionPrecision({
          p: num("p"),
          marginOfError: num("marginOfError"),
          confidence: num("confidence", 0.95),
        });
        break;
      default:
        return NextResponse.json(
          { error: "Unknown calculation type." },
          { status: 400 },
        );
    }

    const dropout = num("dropout", 0);
    if (dropout > 0) {
      const adjPerGroup = inflateForDropout(result.perGroup, dropout);
      const adjTotal = inflateForDropout(result.total, dropout);
      result.notes.push(
        `Adjusted for ${(dropout * 100).toFixed(0)}% dropout → ${adjPerGroup} per group, ${adjTotal} total.`,
      );
      result.perGroup = adjPerGroup;
      result.total = adjTotal;
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Calculation failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
