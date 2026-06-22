import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Plus, 
  Link2, 
  Loader2, 
  ArrowRight, 
  AlertCircle, 
  Search, 
  LogOut, 
  Briefcase,
  Trash2,
  Settings,
  X
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001/api';

interface Brand {
  id: number;
  aourum_brand_id: number | null;
  name: string;
  logo?: string;
  owner?: string;
  category?: string;
  type: 'local' | 'aourum';
  role: 'owner' | 'collaborator';
  sales_enabled: boolean;
  inventory_enabled: boolean;
}

interface AourumBrand {
  id: number;
  name: string;
  logo?: string;
  owner?: string;
  category?: string;
}

export default function SelectBrand() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentFullName, setCurrentFullName] = useState<string | null>(null);
  
  // Brand list owned by the user
  const [myBrands, setMyBrands] = useState<Brand[]>([]);
  const [loadingMy, setLoadingMy] = useState(true);

  // Local brand creation
  const [localName, setLocalName] = useState('');
  const [creatingLocal, setCreatingLocal] = useState(false);

  // Aourum brand linking
  const [searchTerm, setSearchTerm] = useState('');
  const [aourumBrands, setAourumBrands] = useState<AourumBrand[]>([]);
  const [loadingAourum, setLoadingAourum] = useState(false);
  const [linkingAourumId, setLinkingAourumId] = useState<number | null>(null);

  const [error, setError] = useState('');

  // Module preferences (sales tracking vs warehouse/inventory)
  const [localSalesEnabled, setLocalSalesEnabled] = useState(true);
  const [localInventoryEnabled, setLocalInventoryEnabled] = useState(true);
  const [aourumSalesEnabled, setAourumSalesEnabled] = useState(true);
  const [aourumInventoryEnabled, setAourumInventoryEnabled] = useState(true);

  // Editing brand modules configuration states
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editSalesEnabled, setEditSalesEnabled] = useState(true);
  const [editInventoryEnabled, setEditInventoryEnabled] = useState(true);
  
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem('acon_user');
    const name = localStorage.getItem('acon_user_name');
    if (!user) {
      navigate('/auth');
    } else {
      setCurrentUser(user);
      setCurrentFullName(name || user);
      fetchMyBrands(user);
      fetchAourumBrands();
    }
  }, []);

  const fetchMyBrands = async (user: string) => {
    setLoadingMy(true);
    try {
      const res = await fetch(`${API_BASE}/brands/my?username=${user}`);
      if (res.ok) {
        setMyBrands(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMy(false);
    }
  };

  const fetchAourumBrands = async () => {
    setLoadingAourum(true);
    try {
      const res = await fetch(`${API_BASE}/brands`);
      if (res.ok) {
        setAourumBrands(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAourum(false);
    }
  };

  const handleCreateLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localName.trim() || !currentUser) return;

    setCreatingLocal(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/brands/create-local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: localName.trim(), 
          owner_username: currentUser,
          sales_enabled: localSalesEnabled,
          inventory_enabled: localInventoryEnabled
        })
      });
      const data = await res.json();
      if (res.ok) {
        setLocalName('');
        fetchMyBrands(currentUser);
      } else {
        setError(data.error || 'Error al crear marca local.');
      }
    } catch (e) {
      setError('Error de red al crear marca.');
    } finally {
      setCreatingLocal(false);
    }
  };

  const handleLinkAourum = async (brand: AourumBrand) => {
    if (!currentUser) return;
    setLinkingAourumId(brand.id);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/brands/link-aourum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          aourum_brand_id: brand.id, 
          name: brand.name, 
          owner_username: currentUser,
          sales_enabled: aourumSalesEnabled,
          inventory_enabled: aourumInventoryEnabled
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSearchTerm('');
        fetchMyBrands(currentUser);
        fetchAourumBrands(); // Reload list to filter out the newly linked one
      } else {
        setError(data.error || 'Error al vincular marca de Aourum.');
      }
    } catch (e) {
      setError('Error de red al vincular marca.');
    } finally {
      setLinkingAourumId(null);
    }
  };

  const handleDeleteBrand = async (brand: Brand) => {
    if (!currentUser) return;
    const confirmMessage = brand.type === 'aourum'
      ? `¿Seguro que deseas desvincular y eliminar la marca "${brand.name}"? Volverá a estar disponible para que otros usuarios la vinculen.`
      : `¿Seguro que deseas eliminar la marca "${brand.name}"? Esta acción borrará permanentemente sus productos, ventas e insumos.`;

    if (!window.confirm(confirmMessage)) return;

    setError('');
    try {
      const res = await fetch(`${API_BASE}/brands/${brand.id}?owner_username=${currentUser}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        fetchMyBrands(currentUser);
        fetchAourumBrands(); // reload list of available Aourum brands
      } else {
        setError(data.error || 'Error al eliminar la marca.');
      }
    } catch (e) {
      setError('Error de red al eliminar la marca.');
    }
  };

  const handleStartEditFeatures = (brand: Brand) => {
    setEditingBrand(brand);
    setEditSalesEnabled(brand.sales_enabled);
    setEditInventoryEnabled(brand.inventory_enabled);
  };

  const handleSaveFeatures = async (brand: Brand) => {
    if (!currentUser) return;
    setError('');
    try {
      const res = await fetch(`${API_BASE}/brands/${brand.id}/features`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_username: currentUser,
          sales_enabled: editSalesEnabled,
          inventory_enabled: editInventoryEnabled,
        })
      });
      const data = await res.json();
      if (res.ok) {
        setEditingBrand(null);
        fetchMyBrands(currentUser);
      } else {
        setError(data.error || 'Error al actualizar las características.');
      }
    } catch (e) {
      setError('Error de red al actualizar las características.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('acon_user');
    localStorage.removeItem('acon_user_name');
    navigate('/auth');
  };

  const filteredAourum = aourumBrands.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      className="min-h-screen bg-[#080A10] text-slate-100 flex flex-col p-6 md:p-10 relative overflow-hidden"
      style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
    >
      {/* ── Ambient blobs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #0044CC 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Top Header ── */}
      <header className="relative z-10 max-w-5xl w-full mx-auto flex items-center justify-between mb-10 pb-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl flex items-center justify-center font-black text-base text-white select-none"
            style={{ background: 'linear-gradient(135deg, #0044CC 0%, #2266FF 100%)', boxShadow: '0 0 20px rgba(0,68,204,0.4)' }}>
            A
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-[0.15em] text-white leading-tight">ACON</p>
            <p className="text-[10px] text-slate-500 tracking-wide leading-tight">A-CONTAR · PANEL</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/[0.05] bg-white/[0.02] text-xs text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{currentFullName}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] hover:border-red-500/30 bg-white/[0.02] hover:bg-red-500/10 text-slate-400 hover:text-red-400 text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="relative z-10 max-w-5xl w-full mx-auto space-y-10">
        
        {/* Error Notification */}
        {error && (
          <div className="flex items-start gap-2.5 p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm leading-normal max-w-md mx-auto">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* ── TUS MARCAS ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#6699FF]" />
            <h2 className="text-lg font-bold text-white">Tus Marcas de Trabajo</h2>
          </div>

          {loadingMy ? (
            <div className="flex items-center gap-2.5 py-12 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin text-[#2266FF]" />
              <span className="text-sm">Cargando tus marcas...</span>
            </div>
          ) : myBrands.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center max-w-md">
              <Building2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Aún no tienes marcas agregadas</p>
              <p className="text-xs text-slate-600 mt-1">Crea una marca local o vincula una marca externa de Aourum abajo para comenzar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myBrands.map((brand) => (
                <div
                  key={brand.id}
                  className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all flex flex-col justify-between group min-h-[200px]"
                >
                  <div className="flex items-start gap-4.5 mb-5">
                    {brand.logo ? (
                      <img src={brand.logo} alt={brand.name} className="w-12 h-12 rounded-2xl object-cover ring-1 ring-white/10 shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg text-[#6699FF] shrink-0"
                        style={{ background: brand.type === 'aourum' ? 'rgba(0,68,204,0.15)' : 'rgba(124,58,237,0.15)' }}>
                        {brand.name[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-base truncate group-hover:text-[#6699FF] transition-colors">{brand.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{brand.category || (brand.type === 'local' ? 'Marca Local' : 'Sin categoría')}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide uppercase
                          ${brand.type === 'aourum' 
                            ? 'bg-[#0044CC]/20 text-[#6699FF] ring-1 ring-[#0044CC]/35' 
                            : 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/20'}`}
                        >
                          {brand.type === 'aourum' ? 'Aourum' : 'Local'}
                        </span>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide uppercase
                          ${brand.role === 'owner' 
                            ? 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20' 
                            : 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20'}`}
                        >
                          {brand.role === 'owner' ? 'Propietario' : 'Colaborador'}
                        </span>
                        {brand.sales_enabled && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide uppercase bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20">
                            Ventas
                          </span>
                        )}
                        {brand.inventory_enabled && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide uppercase bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20">
                            Almacén
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full mt-auto">
                    <button
                      onClick={() => navigate(`/dashboard?brandId=${brand.id}`)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] hover:bg-[#0044CC]/20 hover:text-[#6699FF] border border-white/[0.08] hover:border-[#0044CC]/40 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      <span>Entrar a la marca</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    {brand.role === 'owner' && (
                      <>
                        <button
                          onClick={() => handleStartEditFeatures(brand)}
                          className="px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-slate-400 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
                          title="Configurar características"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBrand(brand)}
                          className="px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 transition-all cursor-pointer flex items-center justify-center shrink-0"
                          title="Eliminar marca"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── ACCIONES / CREACIÓN / VINCULACIÓN ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5">
          
          {/* CREAR MARCA LOCAL */}
          <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.015] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-violet-400" />
                </div>
                <h3 className="font-bold text-white text-sm">Crear Nueva Marca (Local)</h3>
              </div>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Registra una marca local en ACON. Podrás ponerle un nombre personalizado y añadir tus propios productos manualmente en el almacén.
              </p>
            </div>

            <form onSubmit={handleCreateLocal} className="flex flex-col gap-3">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  placeholder="Nombre de la marca"
                  className="flex-1 bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/40 transition-colors"
                  disabled={creatingLocal}
                />
                <button
                  type="submit"
                  disabled={creatingLocal || !localName.trim() || (!localSalesEnabled && !localInventoryEnabled)}
                  className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:hover:bg-violet-600 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  {creatingLocal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Crear'}
                </button>
              </div>

              <div className="flex gap-4 items-center pl-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={localSalesEnabled}
                    onChange={(e) => setLocalSalesEnabled(e.target.checked)}
                    className="accent-violet-600 rounded border-white/20 bg-white/[0.03] w-4 h-4"
                  />
                  <span>Conteo de Ventas</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={localInventoryEnabled}
                    onChange={(e) => setLocalInventoryEnabled(e.target.checked)}
                    className="accent-violet-600 rounded border-white/20 bg-white/[0.03] w-4 h-4"
                  />
                  <span>Almacén / Inventario</span>
                </label>
              </div>
            </form>
          </div>

          {/* VINCULAR MARCA DE AOURUM */}
          <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.015] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#0044CC]/15 flex items-center justify-center">
                  <Link2 className="w-4 h-4 text-[#6699FF]" />
                </div>
                <h3 className="font-bold text-white text-sm">Vincular Marca de Aourum</h3>
              </div>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Asigna una marca del catálogo central de Aourum a tu cuenta. Solo un usuario de Acon puede poseer y vender productos de cada marca.
              </p>
            </div>

            <div className="space-y-3">
              {/* Opciones de módulos para Aourum */}
              <div className="flex gap-4 items-center pl-1 pb-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={aourumSalesEnabled}
                    onChange={(e) => setAourumSalesEnabled(e.target.checked)}
                    className="accent-[#0044CC] rounded border-white/20 bg-white/[0.03] w-4 h-4"
                  />
                  <span>Conteo de Ventas</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={aourumInventoryEnabled}
                    onChange={(e) => setAourumInventoryEnabled(e.target.checked)}
                    className="accent-[#0044CC] rounded border-white/20 bg-white/[0.03] w-4 h-4"
                  />
                  <span>Almacén / Inventario</span>
                </label>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute inset-y-0 left-3 flex items-center text-slate-600 w-3.5 h-3.5 my-auto" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Escribe el nombre para buscar..."
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#0044CC]/40 transition-colors"
                />
              </div>

              {/* Hides list until typing */}
              {searchTerm.trim() !== '' && (
                <div className="border border-white/[0.06] rounded-xl max-h-[160px] overflow-y-auto p-1 bg-black/40 space-y-1">
                  {loadingAourum ? (
                    <div className="flex items-center justify-center py-4 text-slate-500 gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2266FF]" />
                      <span className="text-[10px]">Cargando marcas...</span>
                    </div>
                  ) : filteredAourum.length === 0 ? (
                    <div className="text-center py-4 text-slate-600 text-[10px]">
                      No se encontraron marcas de Aourum disponibles
                    </div>
                  ) : (
                    filteredAourum.map((brand) => (
                      <div
                        key={brand.id}
                        onClick={() => 
                          linkingAourumId === null && 
                          (aourumSalesEnabled || aourumInventoryEnabled) && 
                          handleLinkAourum(brand)
                        }
                        className={`flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] transition-colors group
                          ${(!aourumSalesEnabled && !aourumInventoryEnabled) ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {brand.logo ? (
                            <img src={brand.logo} alt="" className="w-6.5 h-6.5 rounded-lg object-cover ring-1 ring-white/10" />
                          ) : (
                            <div className="w-6.5 h-6.5 rounded-lg bg-[#0044CC]/20 flex items-center justify-center text-[10px] font-bold text-[#6699FF]">
                              {brand.name[0]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate group-hover:text-[#6699FF] transition-colors">{brand.name}</p>
                            <p className="text-[9px] text-slate-500 truncate">{brand.category || 'Sin categoría'}</p>
                          </div>
                        </div>
                        <button 
                          disabled={!aourumSalesEnabled && !aourumInventoryEnabled}
                          className="p-1 rounded-lg hover:bg-[#0044CC]/20 text-slate-500 hover:text-[#6699FF] transition-colors shrink-0 disabled:opacity-40"
                        >
                          {linkingAourumId === brand.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── Personalization Modal ── */}
      {editingBrand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0C0F16] p-6 space-y-6 relative overflow-hidden"
               style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.7)' }}>
            
            {/* Ambient blob inside modal */}
            <div className="pointer-events-none absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-[0.15]"
              style={{ background: 'radial-gradient(circle, #0044CC 0%, transparent 70%)' }} />

            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Settings className="w-4.5 h-4.5 text-[#6699FF]" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider">Personalización</h3>
              </div>
              <button
                onClick={() => setEditingBrand(null)}
                className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Selecciona qué módulos deseas habilitar para la marca <strong className="text-white">"{editingBrand.name}"</strong>:
              </p>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.03] transition-colors cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editSalesEnabled}
                    onChange={(e) => setEditSalesEnabled(e.target.checked)}
                    className="accent-[#0044CC] rounded border-white/20 bg-white/[0.03] w-4.5 h-4.5 shrink-0"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">Conteo de Ventas</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Controla transacciones, ferias, stands y ve el historial de ganancias.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.03] transition-colors cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editInventoryEnabled}
                    onChange={(e) => setEditInventoryEnabled(e.target.checked)}
                    className="accent-[#0044CC] rounded border-white/20 bg-white/[0.03] w-4.5 h-4.5 shrink-0"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">Almacén / Inventario</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Administra los productos de catálogo central y controla los insumos internos.</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditingBrand(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSaveFeatures(editingBrand)}
                disabled={!editSalesEnabled && !editInventoryEnabled}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#0044CC] to-[#2266FF] text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
