import { useVersionCheck } from '@/hooks/useVersionCheck';
import { UpdateBanner } from '@/components/UpdateBanner';
import { HardUpdateModal } from '@/components/HardUpdateModal';

export function VersionChecker() {
  const {
    showSoftBanner,
    showHardModal,
    hasUnsavedWork,
    messageTh,
    messageEn,
    hardDeferred,
    updating,
    performUpdate,
    dismissUpdate,
    deferHardUpdate,
  } = useVersionCheck();

  return (
    <>
      {showSoftBanner && (
        <UpdateBanner
          messageTh={messageTh}
          messageEn={messageEn}
          hasUnsavedWork={hasUnsavedWork}
          onUpdate={performUpdate}
          onDismiss={dismissUpdate}
          isUpdating={updating}
        />
      )}

      {showHardModal && (
        <HardUpdateModal
          messageTh={messageTh}
          messageEn={messageEn}
          hasUnsavedWork={hasUnsavedWork}
          onUpdate={performUpdate}
          onDefer={deferHardUpdate}
          canDefer={!hardDeferred}
          isUpdating={updating}
        />
      )}
    </>
  );
}
