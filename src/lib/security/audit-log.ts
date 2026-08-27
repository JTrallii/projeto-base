import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";

export type AuditOutcome = "success" | "failure" | "denied";

export type AuditMetadata = Record<string, unknown>;

export type AuditEventInput = {
  eventType: string;

  outcome: AuditOutcome;

  actorUserId?: string | null;

  resourceType?: string | null;

  resourceId?: string | null;

  metadata?: AuditMetadata;
};

export type AuditEventResult =
  | {
      ok: true;
      eventId: string;
    }
  | {
      ok: false;
    };

const SENSITIVE_METADATA_KEY =
  /password|passwd|secret|token|authorization|cookie|captcha|api[-_]?key|access[-_]?token|refresh[-_]?token|session/i;

function sanitizeMetadataValue(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[MAX_DEPTH]";
  }

  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "string") {
    return value.length > 1000 ? `${value.slice(0, 1000)}[TRUNCATED]` : value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map((item) => sanitizeMetadataValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(
      0,
      30,
    );

    return Object.fromEntries(
      entries.map(([key, nestedValue]) => {
        if (SENSITIVE_METADATA_KEY.test(key)) {
          return [key, "[REDACTED]"];
        }

        return [key, sanitizeMetadataValue(nestedValue, depth + 1)];
      }),
    );
  }

  return String(value);
}

function sanitizeMetadata(metadata: AuditMetadata | undefined): AuditMetadata {
  if (!metadata) {
    return {};
  }

  return sanitizeMetadataValue(metadata) as AuditMetadata;
}

export async function recordAuditEvent(
  input: AuditEventInput,
): Promise<AuditEventResult> {
  const supabase = createAdminSupabase();

  const metadata = sanitizeMetadata(input.metadata);

  const { data, error } = await supabase.rpc("write_audit_event", {
    p_event_type: input.eventType,

    p_outcome: input.outcome,

    p_actor_user_id: input.actorUserId ?? null,

    p_resource_type: input.resourceType ?? null,

    p_resource_id: input.resourceId ?? null,

    p_metadata: metadata,
  });

  if (error) {
    console.error("Falha ao registrar audit log", {
      event: "audit.write_failed",
      auditEventType: input.eventType,
      errorCode: error.code,

      ...(process.env.NODE_ENV === "development"
        ? {
            errorMessage: error.message,
            errorDetails: error.details,
            errorHint: error.hint,
          }
        : {}),
    });

    return {
      ok: false,
    };
  }

  return {
    ok: true,
    eventId: String(data),
  };
}
