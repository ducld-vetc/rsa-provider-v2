import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  ACCEPTED_VEHICLE_LABEL,
  PARTNER_STAFF,
  RESCUE_CAPABILITY_LABEL,
  VEHICLE_AUDIT_LOGS,
  VEHICLE_DOCUMENTS,
  orgName,
  standardQtyOf,
  toolConditionOf,
  toolQtyOf,
  type AcceptedVehicleKind,
  type RescueCapability,
  type VehicleAuditLog,
  type VehicleRecord,
} from '../data/partnerRescueMockData';
import { fleetRowOf, kgToTon } from '../pages/vehicleFleetView';

const TABS = [
  ['reg', 'Hồ sơ đăng kiểm'],
  ['cap', 'Năng lực cứu hộ'],
  ['ops', 'Vận hành & tài xế'],
  ['docs', 'Giấy tờ & nhắc hạn'],
  ['maint', 'Bảo dưỡng'],
  ['tools', 'Công cụ'],
  ['hist', 'Lịch sử'],
] as const;

type TabId = (typeof TABS)[number][0];

const chip = (text: string, tone: 'green' | 'amber' | 'red' | 'grey' | 'blue') => {
  const map = {
    green: 'bg-emerald-50 text-emerald-800',
    amber: 'bg-amber-50 text-amber-800',
    red: 'bg-red-50 text-red-700',
    grey: 'bg-gray-100 text-gray-600',
    blue: 'bg-blue-50 text-blue-800',
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${map[tone]}`}>{text}</span>;
};

type Props = {
  vehicle: VehicleRecord;
  gpsLost: boolean;
  gpsText: string;
  lastLoc: string;
  onClose: () => void; // quay lại danh sách
  onEdit: () => void;
  onTransfer: () => void;
  onPair: () => void;
  onStatus: () => void;
  onMaint: () => void;
};

const PartnerVehiclePreview: React.FC<Props> = ({
  vehicle: v,
  gpsLost,
  gpsText,
  lastLoc,
  onClose,
  onEdit,
  onTransfer,
  onPair,
  onStatus,
  onMaint,
}) => {
  const [tab, setTab] = useState<TabId>('reg');
  const [hist, setHist] = useState<'audit' | 'orders'>('audit');
  const row = fleetRowOf(v, gpsLost);
  const docs = VEHICLE_DOCUMENTS[v.id] ?? [];
  const audits = VEHICLE_AUDIT_LOGS[v.id] ?? [];
  const assignedIds = v.driverIds?.length ? v.driverIds : v.driverId ? [v.driverId] : [];
  const assignedStaff = assignedIds
    .map((id) => PARTNER_STAFF.find((s) => s.id === id))
    .filter((s): s is (typeof PARTNER_STAFF)[number] => Boolean(s));
  const caps = Object.keys(RESCUE_CAPABILITY_LABEL) as RescueCapability[];
  const accepts = Object.keys(ACCEPTED_VEHICLE_LABEL) as AcceptedVehicleKind[];

  return (
    <div className="space-y-4 pb-10">
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
        <button type="button" onClick={onClose} className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-[#0B6B37]">
          <ArrowLeft size={14} />
          Danh sách phương tiện
        </button>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[22px] font-extrabold text-gray-900">{v.plate}</h2>
                {chip(row.statusLabel, row.statusLabel === 'Sẵn sàng' ? 'green' : row.statusLabel === 'Sửa chữa' ? 'amber' : 'grey')}
                {chip(row.eligText, row.eligible ? 'green' : row.blocked ? 'red' : 'amber')}
              </div>
              <p className="mt-1 text-[13px] text-gray-500">
                Mã {v.hnl} · {v.brand} {v.modelLine} · {orgName(v.stationId)} · {v.ownership ?? 'Công ty'}
              </p>
            </div>
          </div>
          {row.blocked && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              Xe đang bị chặn nhận đơn. Lý do: {row.reasons.join(' · ')}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Action onClick={onEdit}>Sửa hồ sơ</Action>
            <Action onClick={onTransfer}>Điều chuyển trạm</Action>
            <Action onClick={onPair}>Ghép tài xế</Action>
            <Action onClick={onStatus}>Đổi trạng thái</Action>
            <Action onClick={onMaint}>Tạo lệnh bảo dưỡng</Action>
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`whitespace-nowrap border-b-[3px] px-3 py-2 text-sm ${tab === id ? 'border-[#0E8F47] font-bold text-[#0B6B37]' : 'border-transparent font-medium text-gray-500'}`}
              >
                {label}
              </button>
            ))}
          </div>
      </div>

      <div className="space-y-4">
          {tab === 'reg' && (
            <Card title="Hồ sơ đăng kiểm">
              <p className="mb-3 text-[13px] text-gray-600">Dữ liệu lấy từ giấy chứng nhận kiểm định. Khối lượng dùng cho ghép đơn lấy cột CP.</p>
              <Grid>
                <Field label="Biển đăng ký" value={v.plate} />
                <Field label="Số quản lý" value={v.mgmtNo || String(v.hnl)} />
                <Field label="Mã xe" value={String(v.hnl)} />
                <Field label="Loại phương tiện" value={v.legalType || 'Ô tô cứu hộ giao thông'} />
                <Field label="Nhãn hiệu · Số loại" value={`${v.brand} · ${v.modelLine}`} />
                <Field label="Nước sản xuất" value={v.country || '—'} />
                <Field label="Số khung" value={v.chassis} />
                <Field label="Số máy" value={v.engineNo} />
                <Field label="Năm sản xuất" value={String(v.year)} />
                <Field label="Ngày đăng ký" value={v.registrationDate || '—'} />
                <Field label="Hiệu lực đăng kiểm" value={v.inspectionValidUntil || '—'} />
                <Field label="Niên hạn sử dụng" value={v.nienHan || '—'} />
                <Field label="Cải hoán" value={v.caiTao || 'Không'} />
                <Field label="Kinh doanh vận tải" value={v.kdvt || '—'} />
                <Field label="Loại nhiên liệu" value={v.fuel || 'Diesel'} />
                <Field label="Sở hữu" value={v.ownership || 'Công ty'} />
                <Field label="Kích thước bao (D×R×C)" value={v.outerSize || '—'} />
                <Field label="Công thức bánh xe" value={v.wheelFormula || '—'} />
                <Field label="Kích thước lòng sàn (D×R)" value={row.bed === '—' ? '—' : `${row.bed} mm`} />
                <Field label="Số người cho phép chở" value={v.seats ? `${v.seats} người` : '—'} />
                <Field label="Nhận xe gầm thấp" value={v.lowClearance ? 'Có' : 'Không'} />
              </Grid>
              <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Chỉ tiêu</th>
                      <th className="px-3 py-2">Thiết kế (TK)</th>
                      <th className="px-3 py-2">Cho phép TGGT (CP)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Khối lượng bản thân', v.weightTkKg, v.weightCpKg],
                      ['Hàng chuyên chở', v.cargoTkKg, v.cargoCpKg],
                      ['Kéo theo', v.towTkKg, v.towCpKg],
                      ['Toàn bộ', v.totalTkKg, v.totalCpKg],
                    ].map(([name, tk, cp]) => (
                      <tr key={name} className="border-t border-gray-100">
                        <td className="px-3 py-2">{name}</td>
                        <td className="px-3 py-2 tabular-nums">{tk || '—'}</td>
                        <td className="px-3 py-2 font-semibold tabular-nums">{cp || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[12px] text-gray-500">Mọi quy tắc ghép đơn chỉ dùng cột CP TGGT. Cột TK lưu để tham khảo.</p>
            </Card>
          )}

          {tab === 'cap' && (
            <Card title="Năng lực cứu hộ">
              <p className="mb-2 text-[12px] font-semibold text-gray-500">Loại cứu hộ</p>
              <div className="flex flex-wrap gap-2">
                {caps.map((key) => {
                  const on = (v.rescueCapabilities ?? []).includes(key);
                  return chip(`${on ? '✓ ' : ''}${RESCUE_CAPABILITY_LABEL[key]}`, on ? 'green' : 'grey');
                })}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Field label="Tải sàn tối đa" value={row.cargoT} hint="Hàng chuyên chở CP TGGT" />
                <Field label="Sức kéo tối đa" value={row.towT} hint="Kéo theo CP TGGT" />
                <Field label="Sức nâng cẩu" value={row.craneT} hint="GCN kiểm định thiết bị nâng" />
                <Field label="Lòng sàn (D×R)" value={row.bed} hint="mm · đăng kiểm" />
                <Field label="Kích thước bao" value={v.outerSize || '—'} hint="D×R×C mm" />
                <Field label="Công thức bánh" value={v.wheelFormula || '—'} />
                <Field label="Gầm thấp" value={v.lowClearance ? 'Có nhận' : 'Không'} />
              </div>
              <p className="mb-2 mt-4 text-[12px] font-semibold text-gray-500">Loại xe nhận được</p>
              <div className="flex flex-wrap gap-2">
                {accepts.map((key) => {
                  const on = (v.acceptedVehicles ?? []).includes(key);
                  return chip(`${on ? '✓ ' : ''}${ACCEPTED_VEHICLE_LABEL[key]}`, on ? 'green' : 'grey');
                })}
              </div>
              <p className="mt-4 text-[13px] text-gray-600">
                Ghép đơn: chở trên sàn khi khối lượng xe khách ≤ {kgToTon(v.cargoCpKg)} và lọt sàn {row.bed} mm · kéo khi ≤ {kgToTon(v.towCpKg)}.
              </p>
            </Card>
          )}

          {tab === 'ops' && (
            <Card title="Vận hành và tài xế">
              <Grid>
                <Field label="Trạm quản lý" value={orgName(v.stationId)} />
                <Field label="Vị trí mặc định" value={v.parkAddress || '—'} hint="Dùng tính ETA khi mất GPS" />
                <Field label="Vị trí gần nhất" value={lastLoc} hint={gpsText} />
                <Field label="Số km (ODO)" value={v.odoKm ? `${Number(v.odoKm).toLocaleString('vi-VN')} km` : '—'} />
                <Field label="Thiết bị GPS (IMEI)" value={v.imei || 'Chưa khai báo'} />
                <Field label="Camera hành trình" value="Camera hành trình" />
              </Grid>
              <div className="mt-4 overflow-x-auto">
                <p className="mb-2 text-[12px] font-semibold text-gray-500">Tài xế được gán</p>
                {assignedStaff.length === 0 ? (
                  <p className="text-sm text-red-700">Chưa gán tài xế chính. Xe không được nhận đơn cho đến khi gán.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="text-left text-gray-500">
                      <tr>
                        <th className="py-2">Vai trò</th>
                        <th>Họ tên</th>
                        <th>Hạng GPLX</th>
                        <th>Hết hạn</th>
                        <th>Chứng chỉ cẩu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignedStaff.map((s) => (
                        <tr key={s.id} className="border-t border-gray-100">
                          <td className="py-2">{s.id === v.driverId ? 'Chính' : 'Phụ'}</td>
                          <td className="font-semibold">{s.fullname}</td>
                          <td>{s.licenseType || '—'}</td>
                          <td>{s.licenseExpiry || '—'}</td>
                          <td>{s.craneCert ? 'Có' : 'Không'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          )}

          {tab === 'docs' && (
            <Card title="Giấy tờ và nhắc hạn">
              <p className="mb-3 text-[12px] text-gray-500">Nhắc trước 30 / 15 / 7 ngày · Người nhận: Trưởng trạm, BĐH</p>
              {docs.length === 0 ? (
                <p className="text-sm text-gray-400">Chưa có giấy tờ đính kèm</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="text-left text-gray-500">
                    <tr>
                      <th className="py-2">Loại giấy tờ</th>
                      <th>Nhóm</th>
                      <th>Số</th>
                      <th>Ngày cấp</th>
                      <th>Hết hạn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((d) => (
                      <tr key={d.id} className="border-t border-gray-100">
                        <td className="py-2">{d.name}</td>
                        <td>{d.type || '—'}</td>
                        <td>{d.number || '—'}</td>
                        <td>{d.issuedAt || '—'}</td>
                        <td>{d.expiryAt || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}

          {tab === 'maint' && (
            <Card title="Bảo dưỡng">
              <Grid>
                <Field label="Chu kỳ" value={v.maintenanceCycleKm ? `${Number(v.maintenanceCycleKm).toLocaleString('vi-VN')} km` : '—'} hint="Mốc nào đến trước thì áp dụng" />
                <Field label="Lần gần nhất" value={v.maintenanceLastAt || '—'} />
                <Field label="Lần tiếp theo" value={v.maintenanceNextAt || '—'} />
                <Field label="Trạng thái" value={row.maintLabel} />
                <Field label="ODO" value={v.odoKm ? `${Number(v.odoKm).toLocaleString('vi-VN')} km` : '—'} />
              </Grid>
              <p className="mb-2 mt-4 text-[12px] font-semibold text-gray-500">Luồng bảo trì</p>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                {['Đến hạn', 'Tạo lệnh', 'Đang sửa chữa', 'Nghiệm thu', 'Sẵn sàng'].map((step, i) => (
                  <span key={step} className={`rounded-full px-3 py-1.5 ${i === (row.statusLabel === 'Sửa chữa' ? 2 : row.maintDue ? 0 : 4) ? 'bg-[#0E8F47] text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {i + 1}. {step}
                  </span>
                ))}
              </div>
              <p className="mb-2 mt-4 text-[12px] font-semibold text-gray-500">Lịch sử bảo dưỡng</p>
              {(v.maintenanceHistory ?? []).length === 0 ? (
                <p className="text-sm text-gray-400">Chưa có lịch sử</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="text-left text-gray-500"><tr><th className="py-2">Ngày</th><th>ODO</th><th>Nội dung</th><th>Chi phí</th></tr></thead>
                  <tbody>
                    {v.maintenanceHistory!.map((h) => (
                      <tr key={h.id} className="border-t border-gray-100">
                        <td className="py-2">{h.at}</td>
                        <td>{h.odoKm}</td>
                        <td>{h.content}</td>
                        <td>{h.costVnd ? `${h.costVnd} đ` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}

          {tab === 'tools' && (
            <Card title={`Công cụ theo xe · ${row.toolLabel}`}>
              <table className="w-full text-xs">
                <thead className="text-left text-gray-500">
                  <tr>
                    <th className="py-2">Công cụ</th>
                    <th>Bắt buộc</th>
                    <th>Mã tài sản</th>
                    <th>Thực tế / Định mức</th>
                    <th>Tình trạng</th>
                    <th>Hết hạn</th>
                  </tr>
                </thead>
                <tbody>
                  {v.tools.map((t) => (
                    <tr key={t.id} className="border-t border-gray-100">
                      <td className="py-2">{t.name}</td>
                      <td>{t.required || standardQtyOf(t.name) > 0 ? 'Có' : 'Không'}</td>
                      <td>{t.assetCode || '—'}</td>
                      <td>{toolQtyOf(t)} / {standardQtyOf(t.name)}</td>
                      <td>{toolConditionOf(t) === 'GOOD' ? 'Tốt' : toolConditionOf(t) === 'BROKEN' ? 'Hỏng' : 'Thiếu'}</td>
                      <td>{t.expiryAt || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[12px] text-red-700">Công cụ bắt buộc bị hỏng hoặc thiếu sẽ chặn xe nhận đơn.</p>
            </Card>
          )}

          {tab === 'hist' && (
            <Card title="Lịch sử">
              <div className="mb-3 flex gap-2">
                <button type="button" onClick={() => setHist('audit')} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${hist === 'audit' ? 'border-[#0E8F47] bg-[#0E8F47] text-white' : 'border-gray-300 bg-white'}`}>Thay đổi hồ sơ</button>
                <button type="button" onClick={() => setHist('orders')} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${hist === 'orders' ? 'border-[#0E8F47] bg-[#0E8F47] text-white' : 'border-gray-300 bg-white'}`}>Đơn cứu hộ</button>
              </div>
              {hist === 'audit' ? (
                <HistTable rows={audits.filter((a) => a.actionCode !== 'RESCUE')} empty="Chưa có thay đổi hồ sơ." />
              ) : (
                <HistTable rows={audits.filter((a) => a.actionCode === 'RESCUE')} empty={`Chưa có đơn cứu hộ ghi trên xe ${v.plate}.`} />
              )}
            </Card>
          )}
      </div>
    </div>
  );
};

const Action: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50">
    {children}
  </button>
);

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="rounded-xl border border-gray-200 bg-white p-4">
    <h3 className="mb-3 text-sm font-bold text-gray-900">{title}</h3>
    {children}
  </section>
);

const Grid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
);

const HistTable: React.FC<{ rows: VehicleAuditLog[]; empty: string }> = ({ rows, empty }) => {
  if (rows.length === 0) return <p className="text-sm text-gray-500">{empty}</p>;
  return (
    <table className="w-full text-xs">
      <thead className="text-left text-gray-500">
        <tr>
          <th className="py-2">Thời điểm</th>
          <th>Người thực hiện</th>
          <th>Hành động</th>
          <th>Trước</th>
          <th>Sau</th>
          <th>Lý do</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a) => (
          <tr key={a.id} className="border-t border-gray-100 align-top">
            <td className="py-2 whitespace-nowrap">{a.actedAt}</td>
            <td>{a.actorName}</td>
            <td>{a.actionLabel}</td>
            <td>{a.oldValue || '—'}</td>
            <td>{a.newValue || '—'}</td>
            <td>{a.reason || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const Field: React.FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <div>
    <p className="text-[11px] font-semibold uppercase text-gray-500">{label}</p>
    <div className="text-sm font-semibold text-gray-900">{value}</div>
    {hint && <p className="text-[12px] text-gray-500">{hint}</p>}
  </div>
);

export default PartnerVehiclePreview;
