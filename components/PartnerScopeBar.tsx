import React, { useEffect, useState } from 'react';
import { ChevronDown, UserCog } from 'lucide-react';
import { PERSONAS, ROLE_LABEL, orgName, type PartnerPersona } from '../data/partnerRescueMockData';

const STORAGE_KEY = 'partner-rescue-persona';

export const getStoredPersona = (): PartnerPersona => {
  try {
    const id = sessionStorage.getItem(STORAGE_KEY);
    return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
  } catch {
    return PERSONAS[0];
  }
};

interface PartnerScopeBarProps {
  persona?: PartnerPersona;
  currentPersona?: PartnerPersona;
  onChange?: (p: PartnerPersona) => void;
  onPersonaChange?: (p: PartnerPersona) => void;
}

// Nút đổi người đăng nhập (demo), góc trái dưới.
const PartnerScopeBar: React.FC<PartnerScopeBarProps> = (props) => {
  const persona = props.persona ?? props.currentPersona ?? getStoredPersona();
  const onChange = props.onChange ?? props.onPersonaChange ?? (() => {});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, persona.id);
    } catch {
      /* ignore */
    }
  }, [persona.id]);

  const scopeText =
    persona.stationIds.length === 0
      ? 'Toàn quốc'
      : persona.stationIds.length === 1
        ? orgName(persona.stationIds[0])
        : `${persona.stationIds.length} trạm trong ${orgName(persona.orgNodeId)}`;

  return (
    <div className="fixed bottom-4 left-4 z-50 text-[11px]">
      {open && (
        <div className="mb-2 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 bg-amber-50 px-3 py-2 text-amber-900">
            <span className="font-bold">{persona.title}</span> · {ROLE_LABEL[persona.role]} · {scopeText}
          </div>
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
              className={`flex w-full flex-col items-start px-3 py-2 text-left hover:bg-amber-50 ${
                p.id === persona.id ? 'bg-amber-50' : ''
              }`}
            >
              <span className="font-bold text-gray-800">{p.label}</span>
              <span className="text-gray-500">{p.title}</span>
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Đổi người đăng nhập (demo)"
        className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1.5 font-bold text-amber-900 shadow-md hover:border-amber-500"
      >
        <UserCog size={14} />
        {persona.label}
        <ChevronDown size={12} className={open ? 'rotate-180' : ''} />
      </button>
    </div>
  );
};

export default PartnerScopeBar;
