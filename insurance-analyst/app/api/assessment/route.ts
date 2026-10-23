import { NextRequest, NextResponse } from "next/server";
import { calculateBasicAssessment, type BasicAssessment } from "@/lib/calculations";

export async function POST(request: NextRequest) {
  let input: BasicAssessment;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const result = calculateBasicAssessment(input);
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 400 });
  return NextResponse.json(result);
}