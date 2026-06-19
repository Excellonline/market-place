import type { IpcMain } from 'electron';
import { IPC } from '@shared/types/ipc';
import type { AdDraft } from '@shared/types/ad';
import type { PlatformId } from '@shared/types/platform';
import { draftsRepo } from '../db/repos';
import { publishDraft } from '../platforms/actions';

export function registerComposeIpc(ipc: IpcMain) {
  ipc.handle(IPC.ComposeSave, async (_e, draft: AdDraft) => draftsRepo.save(draft));

  ipc.handle(IPC.ComposeList, async () => draftsRepo.list());

  ipc.handle(IPC.ComposeGet, async (_e, id: string) => draftsRepo.findById(id));

  ipc.handle(IPC.ComposeDelete, async (_e, id: string) => {
    draftsRepo.delete(id);
  });

  ipc.handle(IPC.ComposePublish, async (_e, payload: { draftId: string; platforms: PlatformId[] }) => {
    return publishDraft(payload.draftId, payload.platforms);
  });
}
