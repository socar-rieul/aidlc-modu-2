import { useState } from 'react';
import type { AdvertisementDto } from '@table-order/shared';
import { ConfirmDialog } from './ConfirmDialog';

export function AdBanner({ ad }: { ad: AdvertisementDto }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <button
        className="ad-banner"
        data-testid={`ad-${ad.id}`}
        onClick={() => setConfirm(true)}
        style={{ width: '100%' }}
      >
        모두의주차장 ✦ {ad.slot}
      </button>
      <ConfirmDialog
        open={confirm}
        title="외부 사이트로 이동합니다"
        body="광고주 사이트(모두의주차장)로 이동할까요?"
        confirmLabel="이동"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          window.open(ad.clickUrl, '_blank', 'noopener,noreferrer');
        }}
        testIdPrefix={`ad-${ad.id}-confirm`}
      />
    </>
  );
}
