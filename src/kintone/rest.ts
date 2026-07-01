import { KintoneRestAPIClient } from "@kintone/rest-api-client";

/**
 * Thin wrapper over @kintone/rest-api-client for the REST calls this plugin
 * makes (7.2). All calls run under the logged-in user's session; the plugin
 * never handles API tokens (common spec 6).
 */
export class KintoneGateway {
  private readonly client: KintoneRestAPIClient;

  constructor(client: KintoneRestAPIClient = new KintoneRestAPIClient()) {
    this.client = client;
  }

  /**
   * Whether the current user can edit the record. Uses records/acl/evaluate so
   * process-management "assignee only" restrictions are reflected (FR-2).
   *
   * rest-api-client has no binding for this endpoint, so kintone.api (the
   * official same-origin transport, not raw fetch) is used here.
   */
  async isRecordEditable(app: number, recordId: number): Promise<boolean> {
    const url = kintone.api.url("/k/v1/records/acl/evaluate", true);
    const res = (await kintone.api(url, "GET", { app, ids: [recordId] })) as {
      rights?: Array<{ record?: { editable?: boolean } }>;
    };
    const right = res.rights?.[0];
    return right?.record?.editable === true;
  }

  /** Download a file by fileKey and wrap it as a Blob with the given type. */
  async downloadFile(fileKey: string, contentType: string): Promise<Blob> {
    const data = (await this.client.file.downloadFile({ fileKey })) as ArrayBuffer;
    return new Blob([data], { type: contentType });
  }

  /** Upload a blob and return its registration fileKey. */
  async uploadFile(name: string, blob: Blob): Promise<string> {
    const res = await this.client.file.uploadFile({ file: { name, data: blob } });
    return res.fileKey;
  }

  /** Fetch the latest record (revision, attachment field, data field). */
  async getRecord(
    app: number,
    recordId: number,
  ): Promise<{ record: Record<string, { type: string; value: unknown }>; revision: string }> {
    const res = await this.client.record.getRecord({ app, id: recordId });
    const record = res.record as unknown as Record<string, { type: string; value: unknown }>;
    const revision = (record.$revision?.value as string) ?? "-1";
    return { record, revision };
  }

  /** Update a record with optimistic locking on revision. */
  async updateRecord(params: {
    app: number;
    recordId: number;
    revision: string;
    record: Record<string, { value: unknown }>;
  }): Promise<void> {
    await this.client.record.updateRecord({
      app: params.app,
      id: params.recordId,
      revision: params.revision,
      record: params.record,
    });
  }

  /** Form fields via the preview endpoint, for config validation (CF-2). */
  async getFormFields(
    app: number,
  ): Promise<Record<string, { type: string; code: string; label: string }>> {
    const res = await this.client.app.getFormFields({ app, preview: true });
    return res.properties as unknown as Record<
      string,
      { type: string; code: string; label: string }
    >;
  }
}

/** kintone conflict errors start with GAIA_CO (7.3, EC-7). */
export function isConflictError(error: unknown): boolean {
  const code = (error as { code?: string } | undefined)?.code;
  return typeof code === "string" && code.startsWith("GAIA_CO");
}
