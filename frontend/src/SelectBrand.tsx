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
  Briefcase 
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
        body: JSON.stringify({ name: localName.trim(), owner_username: currentUser })
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
          owner_username: currentUser 
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
                  className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all flex flex-col justify-between group"
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
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/dashboard?brandId=${brand.id}`)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] hover:bg-[#0044CC]/20 hover:text-[#6699FF] border border-white/[0.08] hover:border-[#0044CC]/40 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    <span>Entrar a la marca</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
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

            <form onSubmit={handleCreateLocal} className="flex gap-2 items-center">
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
                disabled={creatingLocal || !localName.trim()}
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:hover:bg-violet-600 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                {creatingLocal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Crear'}
              </button>
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
                        onClick={() => linkingAourumId === null && handleLinkAourum(brand)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors group"
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
                        <button className="p-1 rounded-lg hover:bg-[#0044CC]/20 text-slate-500 hover:text-[#6699FF] transition-colors shrink-0">
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
    </div>
  );
}
