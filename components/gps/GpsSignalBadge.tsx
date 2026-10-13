import React from 'react';
import {
  MATCH_STATE_LABELS,
  type GpsFreshness,
  type GpsMatchState,
  type GpsSignalInfo,
} from '../../data/gpsTrackingMockData';

/** Badge hiển thị trạng thái khớp GPS của xe (BR-07) */
export const GpsMatchBadge: React.FC<{ matchState: GpsMatchState; className?: string }> = ({
  matchState,
  className = '',
}) => {
  const item = MATCH_STATE_LABELS[matchState] ?? MATCH_STATE_LABELS.UNMATCHED;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${item.bg} ${item.color} ${item.border} ${className}`}
    >
      {item.label}
    </span>
  );
};

/** Badge hiển thị Độ mới tín hiệu (UI-15.13 / BR-08) */
export const GpsFreshnessBadge: React.FC<{ freshness: GpsFreshness; signalLost?: boolean }> = ({
  freshness,
  signalLost,
}) => {
  if (signalLost) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-50 text-red-700 border-red-200">
        Mất tín hiệu
      </span>
    );
  }
  switch (freshness) {
    case 'FRESH':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
          Mới
        </span>
      );
    case 'STALE':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-200">
          Cũ
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-gray-100 text-gray-500 border-gray-200">
          Không rõ
        </span>
      );
  }
};

/** Component hiển thị cột GPS / Tín hiệu 2 dòng theo UI-15.11 */
export const GpsSignalDisplay: React.FC<{
  imei?: string | null;
  signal?: GpsSignalInfo | null;
  matchState?: GpsMatchState;
}> = ({ imei, signal, matchState }) => {
  if (!imei || matchState === 'UNMATCHED') {
    return (
      <div className="flex flex-col text-left">
        <span className="font-semibold text-gray-400 text-xs">Chưa gắn thiết bị</span>
        <span className="text-[10px] text-gray-400">Không có tín hiệu</span>
      </div>
    );
  }

  // Chấm màu theo độ mới & mất tín hiệu (BR-08)
  let dotColor = 'bg-gray-300';
  let dotRing = '';
  if (signal?.signalLost) {
    dotColor = 'bg-red-500 animate-pulse';
    dotRing = 'ring-2 ring-red-200';
  } else if (signal?.freshness === 'FRESH') {
    dotColor = 'bg-emerald-500';
    dotRing = 'ring-2 ring-emerald-200';
  } else if (signal?.freshness === 'STALE') {
    dotColor = 'bg-amber-500';
    dotRing = 'ring-2 ring-amber-200';
  }

  return (
    <div className="flex flex-col text-left">
      <div className="flex items-center gap-1.5">
        <span className="font-mono font-bold text-gray-800 text-xs tracking-tight" title={imei}>
          {imei}
        </span>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-gray-600 mt-0.5 flex-wrap">
        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dotColor} ${dotRing}`} />
        <span className="font-medium text-gray-700">
          {signal?.signalLost ? 'Mất tín hiệu' : signal?.freshnessLabel ?? 'Mới'}
        </span>
        {signal?.lastSeenAt && signal.lastSeenAt !== '—' && (
          <>
            <span className="text-gray-400">·</span>
            <span className="text-gray-500 font-mono text-[10px]">{signal.lastSeenAt}</span>
          </>
        )}
        {signal?.reason && (
          <>
            <span className="text-gray-400">·</span>
            <span className={signal.signalLost ? 'text-red-600 font-semibold' : 'text-gray-600'}>
              {signal.reason}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
