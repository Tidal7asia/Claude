import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dashboard = await prisma.dashboard.findUnique({ where: { id } });
  if (!dashboard) return NextResponse.json({ error: "Dashboard not found." }, { status: 404 });
  return NextResponse.json({ dashboard });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { name, tabs, filters, calculatedFields } = body ?? {};

  const dashboard = await prisma.dashboard.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(tabs !== undefined && { tabs }),
      ...(filters !== undefined && { filters }),
      ...(calculatedFields !== undefined && { calculatedFields }),
    },
  });

  return NextResponse.json({ dashboard });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.dashboard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
