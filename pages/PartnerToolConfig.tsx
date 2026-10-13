import React, { useMemo, useState } from 'react';
import {
  Check,
  Edit,
  Eye,
  Filter,
  Package,
  Plus,
  Power,
  Search,
  Settings2,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import PartnerScopeBar, { getStoredPersona } from '../components/PartnerScopeBar';
import {
  MASTER_TOOL_CATALOG,
  SERVICE_REQUIRED_TOOLS,
  STATION_OPTIONS,
  VEHICLES,
  type MasterToolItem,
  type PartnerPersona,
  type ServiceRequiredTool,
  standardQtyOf,
} from '../data/partnerRescueMockData';

const SectionHeader = ({ title, icon }: { title: string; icon?: React.ReactNode }) => (
  <div className="bg-[#00A859] text-white px-4 py-2.5 flex items-center justify-between font-bold text-sm uppercase tracking-wide">
    <div className="flex items-center space-x-2">
      {icon}
      <span>{title}</span>
    </div>
  </div>
);

const fieldClass =
  'flex-1 border rounded px-3 py-1.5 text-xs outline-none focus:border-[#00A859] bg-white text-gray-700';

const PartnerToolConfig: React.FC = () => {
  const [persona, setPersona] = useState<PartnerPersona>(getStoredPersona);
  // FDD FL-M1-02 BR-T07: Quản lý đơn vị (BDH, GDM, GDCN, QLVUNG) thêm / sửa; Trưởng trạm (GDTT) chỉ xem
  const isStationManager = persona.role === 'GDTT';
  const canManageCatalog = !isStationManager && persona.role !== 'NVCH' && persona.role !== 'KT';

  const [activeTab, setActiveTab] = useState<'catalog' | 'service_required'>('catalog');

  // Tab 1 state: Catalog
  const [catalogItems, setCatalogItems] = useState<MasterToolItem[]>(MASTER_TOOL_CATALOG);
  const [searchCodeName, setSearchCodeName] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all');

  // UI-T06: Lọc theo trạm (mặc định Tất cả trạm; Trưởng trạm cố định trạm mình - BR-T17)
  const defaultStationFilter = isStationManager && persona.stationIds.length > 0 ? persona.stationIds[0] : 'all';
  const [stationFilter, setStationFilter] = useState<string>(defaultStationFilter);

  // DLG-T01: Thêm / Sửa công cụ danh mục (FDD DLG-T01)
  const [dlgT01Open, setDlgT01Open] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterToolItem | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formUnit, setFormUnit] = useState('Cái');
  const [formStandardQty, setFormStandardQty] = useState('1');
  const [formSortOrder, setFormSortOrder] = useState('1');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formError, setFormError] = useState('');

  // Tab 2 state: Service required tools (SCR-06)
  const [serviceRules, setServiceRules] = useState<ServiceRequiredTool[]>(SERVICE_REQUIRED_TOOLS);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(SERVICE_REQUIRED_TOOLS[0]?.serviceId ?? '');
  // State nháp cho tab Bắt buộc: chỉ ghi khi bấm Lưu cấu hình (UI-T13, EVT-T05)
  const [draftRules, setDraftRules] = useState<ServiceRequiredTool[]>(SERVICE_REQUIRED_TOOLS);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // DLG-T03: Thêm công cụ bắt buộc cho dịch vụ (FDD DLG-T03)
  const [dlgT03Open, setDlgT03Open] = useState(false);
  const [toolToAddId, setToolToAddId] = useState('');
  const [toolToAddQty, setToolToAddQty] = useState('1');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Tính số xe đang gán công cụ theo trạm đang lọc (BR-T17)
  const getAssignedCountByStation = (toolName: string, selectedStn: string): number => {
    const relevantVehicles = selectedStn === 'all'
      ? VEHICLES
      : VEHICLES.filter((v) => v.stationId === selectedStn);

    return relevantVehicles.filter((v) =>
      (v.tools || []).some((t) => t.name.toLowerCase() === toolName.toLowerCase())
    ).length;
  };

  const filteredCatalog = useMemo(() => {
    return catalogItems.filter((item) => {
      const matchKeyword =
        !searchCodeName.trim() ||
        item.name.toLowerCase().includes(searchCodeName.toLowerCase()) ||
        item.code.toLowerCase().includes(searchCodeName.toLowerCase());
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchKeyword && matchStatus;
    });
  }, [catalogItems, searchCodeName, statusFilter]);

  const currentDraftServiceRule = useMemo(() => {
    return draftRules.find((r) => r.serviceId === selectedServiceId) ?? draftRules[0];
  }, [draftRules, selectedServiceId]);

  // Open DLG-T01 for Create (Mã người dùng tự nhập, không tự sinh TB-xxxx - VAL-T01)
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormCode('');
    setFormName('');
    setFormUnit('Cái');
    setFormStandardQty('1');
    setFormSortOrder(String(catalogItems.length + 1));
    setFormStatus('ACTIVE');
    setFormError('');
    setDlgT01Open(true);
  };

  // Open DLG-T01 for Edit (Mã khóa khi sửa - VAL-T01)
  const handleOpenEditModal = (item: MasterToolItem) => {
    setEditingItem(item);
    setFormCode(item.code);
    setFormName(item.name);
    setFormUnit(item.unit);
    setFormStandardQty(String(item.standardQty ?? standardQtyOf(item.name)));
    setFormSortOrder(String(item.sortOrder));
    setFormStatus(item.status);
    setFormError('');
    setDlgT01Open(true);
  };

  // Save DLG-T01 (EVT-T03)
  const handleSaveDlgT01 = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = formCode.trim().toUpperCase();
    if (!cleanCode) {
      setFormError('Vui lòng nhập mã công cụ');
      return;
    }
    // VAL-T01: định dạng mã [A-Z0-9_-]{2,20}
    if (!/^[A-Z0-9_-]{2,20}$/.test(cleanCode)) {
      setFormError('Mã công cụ từ 2–20 ký tự (chữ hoa không dấu, số, gạch nối hoặc gạch dưới)');
      return;
    }
    // VAL-T01: kiểm tra trùng mã khi tạo mới
    if (!editingItem && catalogItems.some((it) => it.code.toUpperCase() === cleanCode)) {
      setFormError('Mã công cụ đã tồn tại');
      return;
    }
    if (!formName.trim()) {
      setFormError('Vui lòng nhập tên công cụ');
      return;
    }
    if (!formUnit.trim()) {
      setFormError('Vui lòng nhập đơn vị tính');
      return;
    }
    const stdQty = Number(formStandardQty);
    if (!stdQty || stdQty < 1 || stdQty > 99) {
      setFormError('Số lượng tiêu chuẩn từ 1 đến 99');
      return;
    }

    if (editingItem) {
      setCatalogItems((prev) =>
        prev.map((it) =>
          it.id === editingItem.id
            ? {
                ...it,
                name: formName.trim(),
                unit: formUnit.trim() || 'Cái',
                standardQty: stdQty,
                sortOrder: Number(formSortOrder) || it.sortOrder,
                status: formStatus,
              }
            : it
        )
      );
      showToast(`Đã cập nhật công cụ "${formName.trim()}"`);
    } else {
      const newItem: MasterToolItem = {
        id: `mt-${Date.now()}`,
        code: cleanCode,
        name: formName.trim(),
        unit: formUnit.trim() || 'Cái',
        standardQty: stdQty,
        sortOrder: Number(formSortOrder) || catalogItems.length + 1,
        status: formStatus,
        assignedVehiclesCount: 0,
      };
      setCatalogItems((prev) => [...prev, newItem]);
      showToast(`Đã thêm mới công cụ "${formName.trim()}" vào danh mục`);
    }
    setDlgT01Open(false);
  };

  // EVT-T09: Đổi trạng thái công cụ (Đang dùng / Ngừng dùng)
  const handleToggleStatus = (item: MasterToolItem) => {
    const nextStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setCatalogItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, status: nextStatus } : it))
    );
    showToast(`Đã đổi trạng thái công cụ "${item.name}" sang ${nextStatus === 'ACTIVE' ? 'Đang dùng' : 'Ngừng dùng'}`);
  };

  // Tab 2 actions: Cập nhật nháp vào draftRules (áp dụng khi bấm Lưu cấu hình - UI-T13)
  const handleRemoveRequiredTool = (toolId: string) => {
    if (!currentDraftServiceRule) return;
    setDraftRules((prev) =>
      prev.map((rule) => {
        if (rule.serviceId !== currentDraftServiceRule.serviceId) return rule;
        return {
          ...rule,
          requiredTools: rule.requiredTools.filter((t) => t.toolId !== toolId),
        };
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleUpdateMinQuantity = (toolId: string, minQty: number) => {
    if (!currentDraftServiceRule) return;
    const cleanQty = Math.max(1, Math.min(99, minQty));
    setDraftRules((prev) =>
      prev.map((rule) => {
        if (rule.serviceId !== currentDraftServiceRule.serviceId) return rule;
        return {
          ...rule,
          requiredTools: rule.requiredTools.map((t) =>
            t.toolId === toolId ? { ...t, minQuantity: cleanQty } : t
          ),
        };
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleAddToolToService = () => {
    if (!toolToAddId || !currentDraftServiceRule) return;
    const qty = Math.max(1, Math.min(99, Number(toolToAddQty) || 1));
    setDraftRules((prev) =>
      prev.map((rule) => {
        if (rule.serviceId !== currentDraftServiceRule.serviceId) return rule;
        const exists = rule.requiredTools.find((t) => t.toolId === toolToAddId);
        if (exists) {
          return {
            ...rule,
            requiredTools: rule.requiredTools.map((t) =>
              t.toolId === toolToAddId ? { ...t, minQuantity: qty } : t
            ),
          };
        }
        return {
          ...rule,
          requiredTools: [...rule.requiredTools, { toolId: toolToAddId, minQuantity: qty }],
        };
      })
    );
    setHasUnsavedChanges(true);
    setDlgT03Open(false);
    setToolToAddId('');
    setToolToAddQty('1');
  };

  // EVT-T05: Lưu cấu hình định mức (UI-T13)
  const handleSaveServiceConfig = () => {
    setServiceRules(JSON.parse(JSON.stringify(draftRules)));
    setHasUnsavedChanges(false);
    showToast('Cấu hình định mức công cụ đã được lưu thành công');
  };

  const availableToolsToAdd = useMemo(() => {
    if (!currentDraftServiceRule) return [];
    const usedIds = new Set(currentDraftServiceRule.requiredTools.map((t) => t.toolId));
    return catalogItems.filter((it) => it.status === 'ACTIVE' && !usedIds.has(it.id));
  }, [catalogItems, currentDraftServiceRule]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300 w-full min-w-0 max-w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg animate-in slide-in-from-bottom-2">
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-black text-gray-800 uppercase tracking-tight">
            Quản lý công cụ
          </h1>
          <p className="text-xs text-gray-500">
            Danh mục công cụ cứu hộ và định mức công cụ bắt buộc theo từng dịch vụ
          </p>
        </div>
      </div>

      <PartnerScopeBar persona={persona} onChange={setPersona} />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-lg px-3 pt-2 shadow-sm gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'catalog'
              ? 'border-[#00A859] text-[#00A859] bg-green-50/50 rounded-t'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Package size={15} />
          <span>Danh mục</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600">
            {catalogItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('service_required')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'service_required'
              ? 'border-[#00A859] text-[#00A859] bg-green-50/50 rounded-t'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings2 size={15} />
          <span>Bắt buộc theo dịch vụ</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600">
            {serviceRules.length} dịch vụ
          </span>
          {hasUnsavedChanges && (
            <span className="ml-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Có thay đổi chưa lưu" />
          )}
        </button>
      </div>

      {/* TAB 1: DANH MỤC THIẾT BỊ (SCR-05) */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Card Tra cứu & Bộ lọc */}
          <div className="border rounded-lg shadow-sm overflow-hidden bg-white">
            <SectionHeader title="Tra cứu danh mục công cụ" icon={<Search size={16} />} />
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* UI-T01: Từ khóa */}
                <div className="flex items-center gap-2">
                  <label className="w-20 shrink-0 text-xs font-semibold text-gray-600">Từ khóa</label>
                  <input
                    type="text"
                    value={searchCodeName}
                    onChange={(e) => setSearchCodeName(e.target.value)}
                    placeholder="Mã hoặc tên công cụ..."
                    className={fieldClass}
                  />
                </div>

                {/* UI-T02: Trạng thái (Đang dùng / Ngừng dùng) */}
                <div className="flex items-center gap-2">
                  <label className="w-20 shrink-0 text-xs font-semibold text-gray-600">Trạng thái</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                    className={fieldClass}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="ACTIVE">Đang dùng</option>
                    <option value="INACTIVE">Ngừng dùng</option>
                  </select>
                </div>

                {/* UI-T06: Lọc theo trạm (BR-T17) */}
                <div className="flex items-center gap-2">
                  <label className="w-16 shrink-0 text-xs font-semibold text-gray-600">Trạm</label>
                  <select
                    value={stationFilter}
                    disabled={isStationManager}
                    onChange={(e) => setStationFilter(e.target.value)}
                    className={`${fieldClass} ${isStationManager ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                    title={isStationManager ? 'Trưởng trạm chỉ xem dữ liệu theo trạm mình' : undefined}
                  >
                    <option value="all">Tất cả trạm</option>
                    {STATION_OPTIONS.map((stn) => (
                      <option key={stn.id} value={stn.id}>
                        {stn.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* UI-T04: Nút thêm công cụ */}
                <div className="flex items-center justify-end gap-2">
                  {canManageCatalog ? (
                    <button
                      type="button"
                      onClick={handleOpenCreateModal}
                      className="flex items-center gap-1.5 bg-[#00A859] text-white px-4 py-2 rounded text-xs font-bold hover:bg-green-700 transition shadow-sm"
                    >
                      <Plus size={15} />
                      <span>Thêm công cụ</span>
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Chỉ xem danh mục</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bảng danh mục công cụ (UI-T03) */}
          <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
            <div className="bg-[#00A859] text-white px-4 py-2 flex items-center justify-between font-bold text-xs uppercase tracking-wide">
              <span>Danh sách công cụ ({filteredCatalog.length})</span>
              <span className="font-normal lowercase">Áp dụng cho cấu hình phương tiện và đơn hàng</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b text-gray-600">
                    <th className="px-3 py-2.5 text-center w-12 font-bold border-r">STT</th>
                    <th className="px-3 py-2.5 text-left font-bold border-r w-32">Mã công cụ</th>
                    <th className="px-3 py-2.5 text-left font-bold border-r">Tên công cụ</th>
                    <th className="px-3 py-2.5 text-center font-bold border-r w-24">Đơn vị</th>
                    <th className="px-3 py-2.5 text-center font-bold border-r w-28">SL tiêu chuẩn</th>
                    <th className="px-3 py-2.5 text-center font-bold border-r w-20">Thứ tự</th>
                    <th className="px-3 py-2.5 text-center font-bold border-r w-28">
                      Số xe gán {stationFilter !== 'all' ? `(${STATION_OPTIONS.find((s) => s.id === stationFilter)?.name.split(' - ').pop() || ''})` : ''}
                    </th>
                    <th className="px-3 py-2.5 text-center font-bold border-r w-32">Trạng thái</th>
                    <th className="px-3 py-2.5 text-center font-bold w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCatalog.map((item, idx) => {
                    const assignedCount = getAssignedCountByStation(item.name, stationFilter);
                    const stdQty = item.standardQty ?? standardQtyOf(item.name);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-3 py-2.5 text-center border-r text-gray-500 font-medium">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2.5 border-r font-mono font-bold text-gray-800">
                          {item.code}
                        </td>
                        <td className="px-3 py-2.5 border-r font-semibold text-gray-800">
                          {item.name}
                        </td>
                        <td className="px-3 py-2.5 border-r text-center text-gray-600">
                          {item.unit}
                        </td>
                        <td className="px-3 py-2.5 border-r text-center font-mono font-bold text-gray-800">
                          {stdQty}
                        </td>
                        <td className="px-3 py-2.5 border-r text-center text-gray-500 font-mono">
                          {item.sortOrder}
                        </td>
                        <td className="px-3 py-2.5 border-r text-center font-bold text-blue-600">
                          {assignedCount} xe
                        </td>
                        <td className="px-3 py-2.5 border-r text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-gray-100 text-gray-500 border border-gray-200'
                            }`}
                          >
                            {item.status === 'ACTIVE' ? 'Đang dùng' : 'Ngừng dùng'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {canManageCatalog ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Sửa công cụ"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(item)}
                                className={`p-1 rounded transition ${
                                  item.status === 'ACTIVE'
                                    ? 'text-amber-600 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={item.status === 'ACTIVE' ? 'Ngừng dùng' : 'Kích hoạt lại'}
                              >
                                <Power size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400">Chỉ xem</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCatalog.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-400">
                        Không tìm thấy công cụ nào phù hợp tiêu chí tra cứu.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: THIẾT BỊ BẮT BUỘC THEO DỊCH VỤ (SCR-06) */}
      {activeTab === 'service_required' && (
        <div className="space-y-4">
          <div className="border rounded-lg shadow-sm bg-white overflow-hidden p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold uppercase text-gray-700 shrink-0">
                  Chọn dịch vụ cứu hộ:
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="border rounded px-3 py-1.5 text-xs font-semibold text-gray-800 outline-none focus:border-[#00A859] bg-white min-w-[280px]"
                >
                  {draftRules.map((rule) => (
                    <option key={rule.serviceId} value={rule.serviceId}>
                      {rule.serviceName}
                    </option>
                  ))}
                </select>
              </div>

              {canManageCatalog && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDlgT03Open(true)}
                    className="flex items-center gap-1.5 bg-[#00A859] text-white px-3.5 py-1.5 rounded text-xs font-bold hover:bg-green-700 transition shadow-sm"
                  >
                    <Plus size={14} />
                    <span>Thêm công cụ bắt buộc</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveServiceConfig}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold transition shadow-sm ${
                      hasUnsavedChanges
                        ? 'bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Check size={14} />
                    <span>Lưu cấu hình</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bảng công cụ yêu cầu của dịch vụ (UI-T11) */}
          {currentDraftServiceRule && (
            <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
              <div className="bg-[#00A859] text-white px-4 py-2 flex items-center justify-between font-bold text-xs uppercase tracking-wide">
                <span>Công cụ bắt buộc cho "{currentDraftServiceRule.serviceName}"</span>
                <span className="font-normal lowercase">
                  Xe muốn nhận cuốc dịch vụ này phải trang bị tối thiểu số lượng dưới đây
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b text-gray-600">
                      <th className="px-3 py-2.5 text-center w-12 font-bold border-r">STT</th>
                      <th className="px-3 py-2.5 text-left font-bold border-r w-32">Mã công cụ</th>
                      <th className="px-3 py-2.5 text-left font-bold border-r">Tên công cụ</th>
                      <th className="px-3 py-2.5 text-center font-bold border-r w-24">Đơn vị</th>
                      <th className="px-3 py-2.5 text-center font-bold border-r w-40">Số lượng tối thiểu</th>
                      <th className="px-3 py-2.5 text-center font-bold w-24">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentDraftServiceRule.requiredTools.map((req, idx) => {
                      const tool = catalogItems.find((c) => c.id === req.toolId);
                      return (
                        <tr key={req.toolId} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-3 py-2.5 text-center border-r text-gray-500 font-medium">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2.5 border-r font-mono font-bold text-gray-800">
                            {tool?.code ?? '—'}
                          </td>
                          <td className="px-3 py-2.5 border-r font-semibold text-gray-800">
                            {tool?.name ?? 'Công cụ không xác định'}
                          </td>
                          <td className="px-3 py-2.5 border-r text-center text-gray-600">
                            {tool?.unit ?? 'Cái'}
                          </td>
                          <td className="px-3 py-2.5 border-r text-center">
                            <input
                              type="number"
                              min={1}
                              max={99}
                              value={req.minQuantity}
                              disabled={!canManageCatalog}
                              onChange={(e) => handleUpdateMinQuantity(req.toolId, Number(e.target.value))}
                              className="w-20 border rounded px-2 py-1 text-center font-bold text-gray-800 focus:border-[#00A859] outline-none disabled:bg-gray-50 disabled:text-gray-600"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {canManageCatalog ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveRequiredTool(req.toolId)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded transition"
                                title="Xóa khỏi danh sách bắt buộc"
                              >
                                <Trash2 size={14} />
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-400">Chỉ xem</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {currentDraftServiceRule.requiredTools.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          Chưa cấu hình công cụ bắt buộc cho dịch vụ này. Nhấn "+ Thêm công cụ bắt buộc" để bổ sung.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DLG-T01: Modal Thêm / Sửa công cụ danh mục (FDD DLG-T01) */}
      {dlgT01Open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl overflow-hidden border">
            <div className="bg-[#00A859] px-4 py-3 text-white flex items-center justify-between font-bold text-sm">
              <div className="flex items-center gap-2">
                <Wrench size={16} />
                <span>{editingItem ? 'Sửa công cụ danh mục' : 'Thêm công cụ mới'}</span>
              </div>
              <button
                type="button"
                onClick={() => setDlgT01Open(false)}
                className="text-white/80 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDlgT01} className="p-4 space-y-3.5 text-xs">
              {formError && (
                <div className="rounded bg-red-50 border border-red-200 p-2 text-red-700 text-xs">
                  {formError}
                </div>
              )}

              {/* Mã công cụ (VAL-T01: người dùng nhập khi tạo, khóa khi sửa) */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                  Mã công cụ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  disabled={!!editingItem}
                  title={editingItem ? 'Mã công cụ không sửa được sau khi tạo' : undefined}
                  placeholder="VD: KICH, TB-XICH"
                  className="w-full border rounded px-3 py-1.5 outline-none focus:border-[#00A859] font-mono text-gray-800 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              {/* Tên công cụ (VAL-T02) */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                  Tên công cụ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="VD: Dây xích chịu lực 5T"
                  className="w-full border rounded px-3 py-1.5 outline-none focus:border-[#00A859] text-gray-800"
                />
              </div>

              {/* Đơn vị tính & Số lượng tiêu chuẩn (VAL-T07, BR-T14) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                    Đơn vị tính <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="VD: Cái, Bộ, Sợi..."
                    className="w-full border rounded px-3 py-1.5 outline-none focus:border-[#00A859] text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                    Số lượng tiêu chuẩn <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={formStandardQty}
                    onChange={(e) => setFormStandardQty(e.target.value)}
                    className="w-full border rounded px-3 py-1.5 outline-none focus:border-[#00A859] text-gray-800 font-bold"
                  />
                </div>
              </div>

              {/* Thứ tự hiển thị & Trạng thái */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                    Thứ tự hiển thị
                  </label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(e.target.value)}
                    className="w-full border rounded px-3 py-1.5 outline-none focus:border-[#00A859] text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full border rounded px-3 py-1.5 outline-none focus:border-[#00A859] bg-white text-gray-800 font-semibold"
                  >
                    <option value="ACTIVE">Đang dùng</option>
                    <option value="INACTIVE">Ngừng dùng</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDlgT01Open(false)}
                  className="px-4 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#00A859] text-white font-bold hover:bg-green-700 shadow-sm"
                >
                  {editingItem ? 'Lưu thay đổi' : 'Thêm công cụ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DLG-T03: Modal Thêm công cụ bắt buộc cho dịch vụ (FDD DLG-T03) */}
      {dlgT03Open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl overflow-hidden border">
            <div className="bg-[#00A859] px-4 py-3 text-white flex items-center justify-between font-bold text-sm">
              <div className="flex items-center gap-2">
                <Plus size={16} />
                <span>Thêm công cụ bắt buộc cho dịch vụ</span>
              </div>
              <button
                type="button"
                onClick={() => setDlgT03Open(false)}
                className="text-white/80 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                  Chọn công cụ từ danh mục <span className="text-red-500">*</span>
                </label>
                <select
                  value={toolToAddId}
                  onChange={(e) => setToolToAddId(e.target.value)}
                  className="w-full border rounded px-3 py-1.5 outline-none focus:border-[#00A859] bg-white text-gray-800"
                >
                  <option value="">-- Chọn công cụ --</option>
                  {availableToolsToAdd.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.code} - {it.name} ({it.unit})
                    </option>
                  ))}
                </select>
                {availableToolsToAdd.length === 0 && (
                  <p className="mt-1 text-[11px] text-amber-600">
                    Tất cả công cụ trong danh mục đã được gán vào dịch vụ này.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                  Số lượng tối thiểu <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={toolToAddQty}
                  onChange={(e) => setToolToAddQty(e.target.value)}
                  className="w-full border rounded px-3 py-1.5 outline-none focus:border-[#00A859] text-gray-800 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDlgT03Open(false)}
                  className="px-4 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!toolToAddId}
                  onClick={handleAddToolToService}
                  className="px-4 py-1.5 rounded bg-[#00A859] text-white font-bold hover:bg-green-700 shadow-sm disabled:opacity-50"
                >
                  Thêm vào dịch vụ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerToolConfig;
