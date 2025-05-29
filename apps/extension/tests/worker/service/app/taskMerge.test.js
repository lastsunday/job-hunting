import { handleMetadataMerge } from "@/entrypoints/offscreen/worker/service/app/taskMerge";
import { expect, test, vi } from "vitest";
import { parse } from "@/common/utils/date";
import * as modTaskDataMergeService from "@/entrypoints/offscreen/worker/service/taskDataMergeService";
import * as modFileService from "@/entrypoints/offscreen/worker/service/fileService";
test('handleMetadataMerge in correct logic', async () => {
  const taskDataMergeId = `2ea162d6-f5a5-4af4-8e70-ae5f48994a4c`;
  vi.spyOn(modTaskDataMergeService, '_taskDataMergeGetById').mockImplementation(async ({ param }) => {
    expect(param).toBe(taskDataMergeId);
    return {
      dataId: "a9e04172-804f-4b93-8352-e4aaa043acf0",
      typeId: "2",
      datetime: parse('2025-05-01')
    }
  });
  vi.spyOn(modFileService, '_fileGetById').mockImplementation(async ({ param }) => {
    expect(param).toBe("a9e04172-804f-4b93-8352-e4aaa043acf0");
    return {
      id: `a9e04172-804f-4b93-8352-e4aaa043acf0`,
      name: `metadata.json`,
      content: `ewogICJkYXRhIjogewogICAgInNvdXJjZSI6IFsKICAgICAgewogICAgICAgICJuYW1lIjogImxhc3RzdW5kYXnmlbDmja7mupAiLAogICAgICAgICJjb25maWciOiB7CiAgICAgICAgICAidGFza1R5cGVMaXN0IjogWwogICAgICAgICAgICB7CiAgICAgICAgICAgICAgIm5hbWUiOiAi5rex5Zyz6YG/6Zu35YWs5Y+45ZCN5Y2VIiwKICAgICAgICAgICAgICAidHlwZSI6ICJDT01QQU5ZX0NPTU1FTlRfRE9XTkxPQUQiLAogICAgICAgICAgICAgICJlbW90aW9uIjogIk5FR0FUSVZFIiwKICAgICAgICAgICAgICAiZmlsZU5hbWUiOiAibWluZV9maWVsZF9zaGVuemhlbiIsCiAgICAgICAgICAgICAgImRlc2NyaXB0aW9uIjogIuadpeiHque9kee7nOaUtumbhiIKICAgICAgICAgICAgfQogICAgICAgICAgXQogICAgICAgIH0sCiAgICAgICAgInJlcG9UeXBlIjogIkdJVEhVQiIsCiAgICAgICAgInJlcG9uYW1lIjogImpvYi1odW50aW5nLXNvdXJjZSIsCiAgICAgICAgInVzZXJuYW1lIjogImxhc3RzdW5kYXkiLAogICAgICAgICJkZXNjcmlwdGlvbiI6ICLljIXlkKvlhazlj7jor4TorroiCiAgICAgIH0KICAgIF0KICB9LAogICJpY29uIjogIjxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHdpZHRoPVwiMzJcIiBoZWlnaHQ9XCIzMlwiIHZpZXdCb3g9XCIwIDAgMzIgMzJcIj48ZyBmaWxsPVwiY3VycmVudENvbG9yXCI+PHBhdGggZD1cIk05LjgxOCA4LjU2MWExMS45IDExLjkgMCAwIDAtMi44MTQgMi4xMDlhMTMgMTMgMCAwIDAtLjg0Mi45NDJhMi41IDIuNSAwIDEgMSAzLjY1Ni0zLjA1bTE2LjAyIDMuMDVxLS4zODgtLjQ4LS44NDItLjk0MmExMS45IDExLjkgMCAwIDAtMi44MTQtMi4xMDlhMi41IDIuNSAwIDEgMSAzLjY1NiAzLjA1MU0xMiAxMy45NjlhMSAxIDAgMCAwLTEgMXYxYTEgMSAwIDAgMCAyIDB2LTFhMSAxIDAgMCAwLTEtMW04IDBhMSAxIDAgMCAwLTEgMXYxYTEgMSAwIDAgMCAyIDB2LTFhMSAxIDAgMCAwLTEtMW0tNC40NzQgNi44NTFsLTEuMDE0LS44MzRhLjcxNS43MTUgMCAwIDEgLjQ1My0xLjI2NGgyLjA3NGEuNzEzLjcxMyAwIDAgMSAuNDUzIDEuMjY0bC0xLjAxMy44MzNhLjc1Ljc1IDAgMCAxLS45NTMgMG0uNjUgMS4yMTNhLjQ5OC40OTggMCAwIDAtLjY2NC4zNTdjLS4wODQuMzM3LS4xOTYuNzQ1LS40MjcgMS4wNzNjLS4yMTIuMzAyLS41MjYuNTM4LTEuMDg1LjUzOGMtLjY1NCAwLTEtLjUzNC0xLTFhLjUuNSAwIDAgMC0xIDBjMCAuODY4LjY1NCAyIDIgMmMuOTI1IDAgMS41MjgtLjQzIDEuOTAzLS45NjJxLjA1LS4wNzMuMDk3LS4xNDhxLjA0NS4wNzYuMDk3LjE0OGMuMzc1LjUzMi45NzguOTYyIDEuOTAzLjk2MmMxLjM0NiAwIDItMS4xMzIgMi0yYS41LjUgMCAwIDAtMSAwYzAgLjQ2Ni0uMzQ2IDEtMSAxYy0uNTYgMC0uODczLS4yMzYtMS4wODUtLjUzOGMtLjIzMS0uMzI4LS4zNDMtLjczNi0uNDI3LTEuMDczYS41LjUgMCAwIDAtLjEzNC0uMjQyYS41LjUgMCAwIDAtLjE3OC0uMTE1XCIvPjxwYXRoIGQ9XCJNMTEuNDQyIDE4LjM2QTguMzQgOC4zNCAwIDAgMSAxNiAxN2E4LjM0IDguMzQgMCAwIDEgNC41NTggMS4zNkEzLjE5IDMuMTkgMCAwIDEgMjIgMjEuMDUzdi43NEE2LjExMyA2LjExMyAwIDAgMSAxNiAyOGE2LjExMyA2LjExMyAwIDAgMS02LTYuMjA3di0uNzRhMy4xOSAzLjE5IDAgMCAxIDEuNDQyLTIuNjkzbTguNTcxLjg0QTcuMzUgNy4zNSAwIDAgMCAxNiAxOGE3LjM0IDcuMzQgMCAwIDAtNC4wMTIgMS4xOThBMi4yMSAyLjIxIDAgMCAwIDExIDIxLjA1M3YuNzRBNS4xMDcgNS4xMDcgMCAwIDAgMTYgMjdhNS4xMDcgNS4xMDcgMCAwIDAgNS01LjIwN3YtLjc0YTIuMjEgMi4yMSAwIDAgMC0uOTg3LTEuODUzXCIvPjxwYXRoIGQ9XCJNNi4zNjkgMjguNzUzYy4xMzcuMDggMy40MzEgMS45NjggOS42MzEgMS45NjhjNi4xMzIgMCA5LjQyMi0xLjg0NyA5LjU2My0xLjkyNmwuMDAzLS4wMDJhOS43MSA5LjcxIDAgMCAwIDUuMjc1LTEwLjQ3NWExOC4yIDE4LjIgMCAwIDAtMS44MjYtNS42NjlBNS41IDUuNSAwIDAgMCAyMC43MyA1LjVhMTQuODUgMTQuODUgMCAwIDAtOS40NTkgMGE1LjUgNS41IDAgMCAwLTguMjg0IDcuMTRhMTggMTggMCAwIDAtMS44MiA1LjYzQTEwIDEwIDAgMCAwIDEgMjAuMDdhOS42MiA5LjYyIDAgMCAwIDUuMzY5IDguNjgzTTUuNTg3IDYuNTY5QTMuNSAzLjUgMCAwIDEgNy41IDZhMy40OSAzLjQ5IDAgMCAxIDIuNzE3IDEuMjlhMSAxIDAgMCAwIDEuMTM1LjNhMTIuODYgMTIuODYgMCAwIDEgOS4zIDBhLjk5Ljk5IDAgMCAwIDEuMTM0LS4zYTMuNSAzLjUgMCAxIDEgNS4yOTIgNC41NzdhMSAxIDAgMCAwLS4xMjkgMS4xNzdhMTYgMTYgMCAwIDEgMS45MTggNS42Yy4wODcuNDcuMTMyLjk0OC4xMzMgMS40MjZhNy42OSA3LjY5IDAgMCAxLTQuMzc2IDYuOTUxYy0uMDI5LjAyMS0zLjAxNCAxLjctOC42MjMgMS43Yy01LjU1NiAwLTguNTM3LTEuNjQ3LTguNjgyLTEuNzI3bC0uMDAzLS4wMDJBNy42NyA3LjY3IDAgMCAxIDMgMjAuMDQ5cS4wMDUtLjcyNy4xMzktMS40NDNhMTYgMTYgMCAwIDEgMS45MTEtNS41NjNhMSAxIDAgMCAwLS4xMjktMS4xNzdhMy41IDMuNSAwIDAgMSAuNjY2LTUuMjk3XCIvPjwvZz48L3N2Zz4iLAogICJuYW1lIjogIumihOiuvuaVsOaNrua6kCIsCiAgInR5cGUiOiAiR0lUX01FVEFEQVRBIiwKICAiY29uZmlnIjogewogICAgImNvbmZpZyI6IHsKICAgICAgInVybCI6ICJodHRwczovL2dpdGh1Yi5jb20vbGFzdHN1bmRheS9qb2ItaHVudGluZy1kYXRhLXNvdXJjZSIsCiAgICAgICJmaWxlUGF0aCI6ICJtZXRhZGF0YS5qc29uIgogICAgfQogIH0sCiAgImVuYWJsZSI6IHRydWUsCiAgImRlc2NyaXB0aW9uIjogIumihOiuvuaVsOaNrua6kCIsCiAgImF1dG9VcGRhdGVFbmFibGUiOiB0cnVlCn0K`
    };
  });
  vi.mock('@/entrypoints/offscreen/worker/service/baseService', async importActual => {
    const mockClass = vi.fn().mockReturnValue({
      _getById: async (param) => {
        expect(param).toBe("2");
        return {
          id: "2"
        };
      },
      _addOrUpdate: async (param) => {
        expect(param.id).toBe("2");
        expect(param.data).not.toBeNull();
      },
    });
    return {
      ...(await importActual()),
      BaseService: mockClass,
    }
  })
  const result = await handleMetadataMerge({ dataId: taskDataMergeId });
  expect(result).toBeNull();
});
