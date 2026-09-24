import { CommunicationService } from "@/domains/communication";
import { toErrorResponse } from "@/lib/auth-context";

const FOLDERS = new Set(["INBOX", "SENT", "DRAFTS", "ARCHIVE", "SPAM", "TRASH"]);
const SYSTEM_LABELS = new Set(["ANFRAGE", "LAUFEND", "PROMOTIONS", "RECHNUNG", "ANDERES"]);

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const folder = params.get("folder")?.toUpperCase();
    const category = params.get("category")?.toUpperCase();
    const search = params.get("search")?.trim().slice(0, 200);
    const requestStatus = params.get("request_status");
    const offsetParam = Number(params.get("offset"));
    const data = await CommunicationService.getInboxPageData({
      search: search || undefined,
      integrationId: params.get("integration_id") || undefined,
      folder: folder && FOLDERS.has(folder) ? folder : undefined,
      labelId: params.get("label_id") || undefined,
      unread: params.get("unread") === "true",
      requestStatus:
        requestStatus === "open" || requestStatus === "rejected" || requestStatus === "converted"
          ? requestStatus
          : undefined,
      offset: Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : undefined,
      category:
        category === "IMPORTANT"
          ? "important"
          : category && SYSTEM_LABELS.has(category)
            ? category
            : undefined,
    });
    return Response.json(data);
  } catch (e) {
    return toErrorResponse(e);
  }
}
