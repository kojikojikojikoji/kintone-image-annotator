/**
 * Minimal global typings for the kintone JavaScript API used by this plugin.
 * Only the members this plugin touches are declared.
 */

interface KintoneFileValue {
  contentType: string;
  fileKey: string;
  name: string;
  size: string;
}

interface KintoneEventRecord {
  [fieldCode: string]:
    | { type: string; value: unknown }
    | { type: "FILE"; value: KintoneFileValue[] }
    | { type: "MULTI_LINE_TEXT"; value: string }
    | undefined;
}

interface KintoneRecordEvent {
  appId: number;
  recordId: number;
  record: KintoneEventRecord;
  type: string;
}

interface KintoneLoginUser {
  id: string;
  code: string;
  name: string;
  timeZone: string;
}

declare namespace kintone {
  namespace app {
    function getId(): number | null;
    namespace record {
      function get(): { record: KintoneEventRecord } | undefined;
      function getFieldElement(fieldCode: string): HTMLElement | null;
      function getSpaceElement(elementId: string): HTMLElement | null;
    }
  }
  namespace events {
    function on(
      events: string | string[],
      handler: (event: KintoneRecordEvent) => KintoneRecordEvent | Promise<KintoneRecordEvent>,
    ): void;
  }
  namespace plugin {
    namespace app {
      function getConfig(pluginId: string): { [key: string]: string };
      function setConfig(config: { [key: string]: string }, callback?: () => void): void;
    }
  }
  namespace proxy {
    // not used
  }
  function getLoginUser(): KintoneLoginUser;
  function getRequestToken(): string;
  // kintone's official transport helper (same-origin, session-authenticated).
  function api(pathOrUrl: string, method: string, params: unknown): Promise<unknown>;
  namespace api {
    function url(path: string, detectGuestSpace?: boolean): string;
  }
  // Provided by kintone on the plugin config screen.
  const $PLUGIN_ID: string;
}
