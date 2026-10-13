import React, { useMemo, useState } from 'react';
import PartnerScopeBar, { getStoredPersona } from '../components/PartnerScopeBar';
import {
  VEHICLES,
  formatVnd,
  inScope,
  orgName,
  type PartnerPersona,
} from '../data/partnerRescueMockData';

type ReportTab = 'revenue' | 'cost' | 'workshop' | 'fleet' | 'order' | 'kpi';

const TABS: { id: ReportTab; label: string; ktOnly?: boolean }[] = [
  { id: 'revenue', label: 'Doanh thu & chứng từ' },
  { id: 'cost', label: 'Chi phí vận hành' },
  { id: 'workshop', label: 'Mang xe về xưởng' },
  { id: 'fleet', label: 'Đội xe theo chi nhánh' },
  { id: 'order', label: 'Phân tích lệnh' },
  { id: 'kpi', label: 'KPI lái xe' },
];

const PartnerReports: React.FC = () => {
  const [persona, setPersona] = useState<PartnerPersona>(getStoredPersona);
  const [tab, setTab] = useState<ReportTab>(persona.role === 'KT' ? 'cost' : 'fleet');

  const vehicles = useMemo(() => {
    let rows = VEHICLES.filter((v) => inScope(persona, v.stationId));
    if (persona.role === 'NVCH') rows = rows.filter((v) => v.id === 'v1');
    return rows;
  }, [persona]);

  const totalRev = vehicles.reduce((s, v) => s + v.revenueMonth, 0);

  return (
    <div>
      <PartnerScopeBar persona={persona} onChange={setPersona} />
      <h1 className="mb-1 text-lg font-black uppercase tracking-wide text-gray-800">Báo cáo</h1>
      <p className="mb-4 text-[12px] text-gray-500">Số liệu theo phạm vi người đăng nhập. KT ưu tiên màn tiền.</p>

      <div className="mb-4 flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-3 py-2 text-[11px] font-bold ${
              tab === t.id ? 'border-[#00A859] text-[#00A859]' : 'border-transparent text-gray-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'revenue' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Stat title="Doanh thu tháng (phạm vi)" value={formatVnd(totalRev)} />
            <Stat title="TB / xe" value={vehicles.length ? formatVnd(Math.round(totalRev / vehicles.length)) : '—'} />
            <Stat title="Kết nối DMS" value="Chờ tích hợp" muted />
          </div>
          <Table
            headers={['Xe', 'Trạm', 'DT tháng', 'HĐĐT']}
            rows={vehicles.map((v) => [v.plate, orgName(v.stationId), formatVnd(v.revenueMonth), 'Gửi nội dung HĐ'])}
          />
        </div>
      )}

      {tab === 'cost' && (
        <div className="space-y-3">
          <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
            OCR hóa đơn + ODO camera → lái xe xác nhận. Phí cầu đường đồng bộ VETC theo xe. Vai trò KT ngang NV cứu hộ, quản lý tiền.
          </p>
          <Table
            headers={['Xe', 'Nhiên liệu (demo)', 'Sửa chữa', 'Cầu đường VETC']}
            rows={vehicles.map((v) => [v.plate, '4.2 tr', v.runStatus === 'repair' ? '12.0 tr' : '0', '0.35 tr'])}
          />
        </div>
      )}

      {tab === 'workshop' && (
        <div className="space-y-3">
          <p className="text-[12px] text-gray-600">Mỗi lệnh chỉ 1 lựa chọn: Điều phối VETC <strong>hoặc</strong> lái xe cứu hộ.</p>
          <Table
            headers={['Lệnh', 'Xe', 'Cách mang về', 'Trạm nhận']}
            rows={[
              ['RS-2408-01', '29C12345', 'Lái xe cứu hộ', orgName(vehicles[0]?.stationId ?? 'tt-hm')],
              ['RS-2408-02', '29C67890', 'Điều phối VETC', orgName(vehicles[0]?.stationId ?? 'tt-hm')],
            ]}
          />
        </div>
      )}

      {tab === 'fleet' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Stat title="Tổng xe" value={String(vehicles.length)} />
            <Stat title="Đang hoạt động" value={String(vehicles.filter((v) => v.runStatus === 'active').length)} />
            <Stat title="Đang sửa / chờ" value={String(vehicles.filter((v) => v.runStatus === 'repair').length)} />
          </div>
          <Table
            headers={['Trạm', 'Xe', 'VETC RSA', 'Nội bộ']}
            rows={Array.from(new Set(vehicles.map((v) => v.stationId))).map((sid) => [
              orgName(sid),
              String(vehicles.filter((v) => v.stationId === sid).length),
              '12',
              '4',
            ])}
          />
        </div>
      )}

      {tab === 'order' && (
        <Table
          headers={['Chỉ số', 'Giá trị (demo)']}
          rows={[
            ['Thời gian phản hồi TB', '8 phút'],
            ['Thời gian tiếp cận TB', '22 phút'],
            ['% hoàn thành', '94%'],
            ['Cuốc đêm / cao tốc / thủy kích', '6 / 3 / 1'],
            ['Km tiếp cận / kéo / về xưởng', '12.4 / 18.1 / 9.2'],
            ['Heatmap', 'Xuất bản đồ nhiệt (phase sau)'],
          ]}
        />
      )}

      {tab === 'kpi' && (
        <div className="space-y-3">
          <p className="text-[11px] text-gray-500">CSV: đưa vận hành lên trước. Nguồn App + CSKH.</p>
          <Table
            headers={['Lái xe', 'Ca', 'Từ chối/hủy', 'CSAT', 'Khiếu nại']}
            rows={[
              ['Ngô Đức Anh', '42h', '2%', '4.8', '0'],
              ['Bùi Văn Tâm', '38h', '5%', '4.5', '1'],
            ]}
          />
        </div>
      )}
    </div>
  );
};

const Stat: React.FC<{ title: string; value: string; muted?: boolean }> = ({ title, value, muted }) => (
  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{title}</div>
    <div className={`mt-1 text-sm font-black ${muted ? 'text-gray-400' : 'text-gray-900'}`}>{value}</div>
  </div>
);

const Table: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto rounded-lg border border-gray-200">
    <table className="w-full text-left text-[12px]">
      <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-500">
        <tr>
          {headers.map((h) => (
            <th key={h} className="px-3 py-2">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-gray-100">
            {r.map((c, j) => (
              <td key={j} className="px-3 py-2 font-semibold text-gray-800">{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default PartnerReports;
