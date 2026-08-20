import { NextRequest } from "next/server";
import { toErrorResponse } from "@/lib/auth-context";
import { InvoiceService } from "@/domains/invoices";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: creatorId } = await params;
    const invoices = await InvoiceService.getInvoicesByCreator(creatorId);
    return Response.json({ invoices });
  } catch (e) {
    return toErrorResponse(e);
  }
}
