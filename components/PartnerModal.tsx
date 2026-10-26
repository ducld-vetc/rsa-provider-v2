import React from 'react';
import { Upload, X } from 'lucide-react';

/** Tasco DLS v1.2 — Text field */
export const partnerInputClass =
  'w-full h-12 rounded-xl border border-[#e3e4e6] bg-[#f5f6f7] px-4 text-sm font-medium text-[#091b37] outline-none placeholder:text-[#8f9098] focus:border-[#25a55e] focus:bg-white focus:shadow-[0_0_0_3px_rgba(37,165,94,0.15)]';

/** Tasco DLS v1.2 — Label (Base / Semi Bold) */
export const partnerLabelClass = 'mb-1 block text-base font-semibold leading-6 text-[#091b37]';

/** Tasco DLS v1.2 — Neutral button */
export const partnerBtnNeutral =
  'flex-1 inline-flex items-center justify-center min-h-12 px-4 rounded-xl border border-[#c6c8cc] bg-white text-base font-semibold text-[#091b37]';

/** Tasco DLS v1.2 — Brand button Large / Filled */
export const partnerBtnBrand =
  'flex-1 inline-flex items-center justify-center min-h-12 px-4 rounded-xl border-0 bg-gradient-to-b from-[#2cb366] to-[#25a55e] text-base font-semibold text-white shadow-[0_2px_8px_rgba(37,165,94,0.35)] disabled:cursor-not-allowed disabled:opacity-50';

/** Tasco DLS v1.2 — Danger (global/red/50) */
export const partnerBtnDanger =
  'flex-1 inline-flex items-center justify-center min-h-12 px-4 rounded-xl border-0 bg-[#da2c39] text-base font-semibold text-white';

export const PartnerModal: React.FC<{
  open: boolean;
  title: string;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  wide?: boolean;
  xl?: boolean;
  compact?: boolean;
}> = ({ open, title, icon, onClose, children, footer, wide, xl, compact }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-6"
      style={{ background: 'rgba(9, 27, 55, 0.45)' }}
      onClick={onClose}
    >
      <div
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(9,27,55,0.12)] ${xl ? 'max-w-5xl' : wide ? 'max-w-2xl' : 'max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid shrink-0 grid-cols-[32px_1fr_32px] items-center px-4 pt-4 pb-3">
          <span />
          <div className="col-start-2 flex items-center justify-center gap-2">
            {icon ? <span className="text-[#091b37]">{icon}</span> : null}
            <h3 className={`m-0 text-center font-semibold text-[#091b37] ${compact ? 'text-[13px] leading-5' : 'text-base leading-6'}`}>{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="col-start-3 flex h-8 w-8 items-center justify-center justify-self-end rounded-full text-[#8f9098] hover:bg-[#f5f6f7]"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-4">{children}</div>
        <div className="flex gap-2 border-t border-[#e3e4e6] p-4">{footer}</div>
      </div>
    </div>
  );
};

export const FileDrop: React.FC<{
  accept: string;
  file: File | null;
  hint?: string;
  onFile: (file: File | null) => void;
}> = ({ accept, file, hint, onFile }) => (
  <label
    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#c6c8cc] bg-[#f5f6f7] px-4 py-6 text-center hover:border-[#25a55e]"
    onDragOver={(e) => e.preventDefault()}
    onDrop={(e) => {
      e.preventDefault();
      onFile(e.dataTransfer.files?.[0] ?? null);
    }}
  >
    <Upload size={22} className="text-[#25a55e]" />
    <span className="text-sm font-semibold text-[#091b37]">{file ? file.name : 'Chọn hoặc kéo thả file'}</span>
    <span className="text-xs text-[#8f9098]">{hint ?? 'JPG, PNG hoặc PDF'}</span>
    <input
      type="file"
      accept={accept}
      className="hidden"
      onChange={(e) => onFile(e.target.files?.[0] ?? null)}
    />
  </label>
);
