import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Server-backed dashboard persistence (opt-in). Requires DATABASE_URL to be configured and
// `prisma migrate dev` to have run. The UI defaults to localStorage (see lib/store/persistence.ts);
// point it at these routes instead to persist dashboards centrally.

export async function GET() {
  const dashboards = await prisma.dashboard.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, datasetFileName: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({ dashboards });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, datasetFileName, tabs, filters, calculatedFields } = body ?? {};

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "A dashboard name is required." }, { status: 400 });
  }

  const dashboard = await prisma.dashboard.create({
    data: {
      name,
      datasetFileName: datasetFileName ?? "Untitled dataset",
      tabs: tabs ?? [],
      filters: filters ?? [],
      calculatedFields: calculatedFields ?? [],
    },
  });

  return NextResponse.json({ dashboard }, { status: 201 });
}
