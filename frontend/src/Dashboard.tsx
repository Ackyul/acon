import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  ShoppingBag,
  History,
  Boxes,
  Plus,
  Minus,
  Check,
  Package,
  AlertCircle,
  Loader2,
  Trash2,
  ChevronRight,
  Receipt,
  Sparkles,
  BarChart3,
  X,
  LogOut,
} from 'lucide-react';


const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001/api';

interface AourumBrand {
  id: number;
  name: string;
  logo?: string;
  owner?: string;
  category?: string;
}

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  image?: string;
  category?: string;
}

interface InternalItem {
  id: number;
  name: string;
  stock: number;
  category: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Sale {
  id: string;
  date: string;
  items: { product_name: string; unit_price: number; quantity: number }[];
  total: number;
}

type Tab = 'sales' | 'inventory' | 'history';

const NAV_ITEMS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'sales',     label: 'Ventas',    icon: ShoppingBag },
  { id: 'inventory', label: 'Almacén',   icon: Boxes       },
  { id: 'history',   label: 'Historial', icon: History     },
];

const CATEGORY_COLORS: Record<string, string> = {
  Empaque:   'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/20',
  Marketing: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/20',
  Logística: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20',
  Otros:     'bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/20',
};

function Dashboard() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('sales');
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [aourumBrands, setAourumBrands] = useState<AourumBrand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<AourumBrand | null>(null);
  const [aconBrandId, setAconBrandId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [internalInventory, setInternalInventory] = useState<InternalItem[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemStock, setNewItemStock] = useState<number>(0);
  const [newItemCategory, setNewItemCategory] = useState('Empaque');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem('acon_user');
    const name = localStorage.getItem('acon_user_name');
    if (!user) {
      navigate('/auth');
    } else {
      setCurrentUser(name || user);
      fetchBrands();
    }
  }, []);

  const fetchBrands = async () => {
    setLoadingBrands(true);
    try {
      const res = await fetch(`${API_BASE}/brands`);
      if (res.ok) setAourumBrands(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingBrands(false); }
  };

  const fetchProducts = async (brandId: number) => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${API_BASE}/products?brand_id=${brandId}`);
      if (res.ok) setProducts(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingProducts(false); }
  };

  const linkBrand = async (aourumBrand: AourumBrand) => {
    try {
      const res = await fetch(`${API_BASE}/brands/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aourum_brand_id: aourumBrand.id, name: aourumBrand.name })
      });
      if (res.ok) {
        const linked = await res.json();
        return linked.id;
      }
    } catch (e) {
      console.error('Error linking brand:', e);
    }
    return null;
  };

  const fetchSalesHistory = async (localBrandId: number) => {
    try {
      const res = await fetch(`${API_BASE}/sales?acon_brand_id=${localBrandId}`);
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map((sale: any) => ({
          id: `SALE-${sale.id}`,
          date: new Date(sale.created_at).toLocaleString('es-PE'),
          total: Number(sale.total),
          items: sale.items.map((item: any) => ({
            product_name: item.product_name,
            unit_price: Number(item.unit_price),
            quantity: item.quantity
          }))
        }));
        setSalesHistory(formatted);
      }
    } catch (e) {
      console.error('Error fetching sales:', e);
    }
  };

  const fetchInternalInventory = async (localBrandId: number) => {
    try {
      const res = await fetch(`${API_BASE}/internal-items?acon_brand_id=${localBrandId}`);
      if (res.ok) {
        setInternalInventory(await res.json());
      }
    } catch (e) {
      console.error('Error fetching internal inventory:', e);
    }
  };

  const handleSelectBrand = async (brand: AourumBrand) => {
    setSelectedBrand(brand);
    setBrandDropdownOpen(false);
    setSearchTerm('');
    setProducts([]);
    setSalesHistory([]);
    setInternalInventory([]);
    setCart([]);

    fetchProducts(brand.id);
    const localId = await linkBrand(brand);
    if (localId) {
      setAconBrandId(localId);
      fetchSalesHistory(localId);
      fetchInternalInventory(localId);
    }
  };

  const handleDeselectBrand = () => {
    setSelectedBrand(null);
    setAconBrandId(null);
    setProducts([]);
    setSalesHistory([]);
    setInternalInventory([]);
    setCart([]);
    setBrandDropdownOpen(false);
    setSearchTerm('');
  };

  const handleLogout = () => {
    localStorage.removeItem('acon_user');
    localStorage.removeItem('acon_user_name');
    navigate('/auth');
  };

  const addToCart = (product: Product) =>
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      return ex
        ? prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { product, quantity: 1 }];
    });

  const removeFromCart = (productId: number) =>
    setCart(prev => {
      const ex = prev.find(i => i.product.id === productId);
      if (ex && ex.quantity > 1)
        return prev.map(i => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i);
      return prev.filter(i => i.product.id !== productId);
    });

  const checkout = async () => {
    if (!cart.length || !aconBrandId) return;
    const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
    const salePayload = {
      acon_brand_id: aconBrandId,
      created_by: currentUser || 'Vendedor',
      total,
      items: cart.map(i => ({
        aourum_product_id: i.product.id,
        product_name: i.product.name,
        unit_price: i.product.price,
        quantity: i.quantity
      }))
    };

    try {
      const res = await fetch(`${API_BASE}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload)
      });
      if (res.ok) {
        setCart([]);
        setCheckoutSuccess(true);
        setTimeout(() => setCheckoutSuccess(false), 2800);
        fetchSalesHistory(aconBrandId);
      } else {
        alert('Error al registrar la venta');
      }
    } catch (e) {
      console.error(e);
      alert('Error de red al registrar la venta');
    }
  };

  const addInternalItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !aconBrandId) return;

    try {
      const res = await fetch(`${API_BASE}/internal-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acon_brand_id: aconBrandId,
          name: newItemName,
          category: newItemCategory,
          stock: newItemStock
        })
      });
      if (res.ok) {
        setNewItemName('');
        setNewItemStock(0);
        fetchInternalInventory(aconBrandId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateInternalStock = async (id: number, currentStock: number, delta: number) => {
    if (!aconBrandId) return;
    const newStock = Math.max(0, currentStock + delta);
    try {
      const res = await fetch(`${API_BASE}/internal-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock })
      });
      if (res.ok) {
        fetchInternalInventory(aconBrandId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteInternalItem = async (id: number) => {
    if (!aconBrandId || !window.confirm('¿Seguro que deseas eliminar este insumo?')) return;
    try {
      const res = await fetch(`${API_BASE}/internal-items/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchInternalInventory(aconBrandId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const cartTotal    = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const historyTotal = salesHistory.reduce((s, i) => s + i.total, 0);

  return (
    <div className="min-h-screen bg-[#080A10] text-slate-100 flex flex-col" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>

      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #0044CC 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #2266FF 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #0033AA 0%, transparent 70%)' }} />
      </div>

      {/* Topbar */}
      <header className="relative z-40 border-b border-white/[0.06] backdrop-blur-xl px-6 py-3.5 flex items-center justify-between"
        style={{ background: 'rgba(8,10,16,0.85)' }}>
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl flex items-center justify-center font-black text-base text-white tracking-widest select-none"
            style={{ background: 'linear-gradient(135deg, #0044CC 0%, #2266FF 100%)', boxShadow: '0 0 20px rgba(0,68,204,0.5)' }}>
            A
            <div className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%)' }} />
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-[0.15em] text-white leading-tight">ACON</p>
            <p className="text-[10px] text-slate-500 tracking-wide leading-tight">VENTAS · ALMACÉN</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {currentUser && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/[0.05] bg-white/[0.02] text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{currentUser}</span>
            </div>
          )}

          {/* Brand picker dropdown */}
          <div className="relative">
            {/* Trigger */}
            <button
              onClick={() => setBrandDropdownOpen(o => !o)}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm border transition-all cursor-pointer"
              style={selectedBrand
                ? { background: 'rgba(0,68,204,0.08)', borderColor: 'rgba(0,68,204,0.25)' }
                : { background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)' }
              }>
              {selectedBrand ? (
                <>
                  {selectedBrand.logo
                    ? <img src={selectedBrand.logo} alt="" className="w-5 h-5 rounded-full object-cover ring-1 ring-white/10" />
                    : <div className="w-5 h-5 rounded-full bg-[#0044CC]/30 flex items-center justify-center text-[#6699FF] text-[10px] font-bold">
                        {selectedBrand.name[0]}
                      </div>
                  }
                  <span className="font-medium text-slate-200 max-w-[150px] truncate">{selectedBrand.name}</span>
                  <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${brandDropdownOpen ? 'rotate-90' : ''}`} />
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-amber-400 font-medium">Vincular catálogo</span>
                  <ChevronRight className={`w-3.5 h-3.5 text-amber-400/60 transition-transform ${brandDropdownOpen ? 'rotate-90' : ''}`} />
                </>
              )}
            </button>

          {/* Dropdown panel */}
          {brandDropdownOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-[340px] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden z-50"
              style={{ background: 'rgba(12,14,20,0.97)', backdropFilter: 'blur(20px)' }}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#6699FF]" />
                  <span className="text-xs font-semibold text-slate-300 tracking-wide">Vincular catálogo de Aourum</span>
                </div>
                <button onClick={() => setBrandDropdownOpen(false)}
                  className="w-5 h-5 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Search input */}
              <div className="px-3 py-2 border-b border-white/[0.04]">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Escribe el nombre de la marca..."
                  className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#0044CC]/50 transition-colors"
                  autoFocus
                />
              </div>

              {/* Brand list */}
              <div className="p-2 max-h-[260px] overflow-y-auto space-y-1">
                {loadingBrands ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-[#2266FF]" />
                    <span className="text-xs">Conectando con Aourum...</span>
                  </div>
                ) : searchTerm.trim() === '' ? (
                  <div className="text-center py-8 text-slate-600">
                    <Building2 className="w-8 h-8 text-slate-800 mx-auto mb-2" />
                    <p className="text-xs font-medium">Escribe para buscar una marca...</p>
                  </div>
                ) : (() => {
                  const filteredBrands = aourumBrands.filter(brand =>
                    brand.name.toLowerCase().includes(searchTerm.toLowerCase())
                  );
                  if (filteredBrands.length === 0) {
                    return (
                      <div className="text-center py-8 text-slate-600">
                        <Building2 className="w-8 h-8 text-slate-800 mx-auto mb-2" />
                        <p className="text-xs">No se encontraron marcas parecidas</p>
                      </div>
                    );
                  }
                  return filteredBrands.map(brand => {
                    const active = selectedBrand?.id === brand.id;
                    return (
                      <div key={brand.id}
                        onClick={() => handleSelectBrand(brand)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all group"
                        style={{
                          background: active ? 'rgba(0,68,204,0.12)' : 'transparent',
                          border: active ? '1px solid rgba(0,68,204,0.3)' : '1px solid transparent',
                        }}>
                        {brand.logo
                          ? <img src={brand.logo} alt={brand.name} className="w-9 h-9 rounded-xl object-cover ring-1 ring-white/10 shrink-0" />
                          : <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base shrink-0"
                              style={{ background: 'rgba(0,68,204,0.15)', color: '#6699FF' }}>
                              {brand.name[0]}
                            </div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-[#6699FF] transition-colors">{brand.name}</p>
                          <p className="text-[10px] text-slate-500">{brand.category || 'Sin categoría'} · ID #{brand.id}</p>
                        </div>
                        {active && (
                          <div className="w-5 h-5 rounded-full bg-[#0044CC] flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Footer: desvincular */}
              {selectedBrand && (
                <div className="px-4 py-3 border-t border-white/[0.06]">
                  <button onClick={handleDeselectBrand}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-red-500/20 hover:bg-red-500/10 text-red-400 text-xs font-medium transition-all cursor-pointer">
                    <X className="w-3 h-3" /> Desvincular marca
                  </button>
                </div>
              )}
            </div>
          )}
          </div>

          {currentUser && (
            <button
              onClick={handleLogout}
              className="flex items-center justify-center p-2 rounded-xl border border-white/[0.08] hover:border-red-500/30 bg-white/[0.02] hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Layout */}
      <div className="relative z-10 flex flex-1 max-w-[1280px] w-full mx-auto p-4 md:p-6 gap-5">

        {/* Sidebar */}
        <aside className="w-[200px] shrink-0 flex flex-col gap-1 pt-1">
          {selectedBrand && (
            <div className="mb-4 p-4 rounded-2xl border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Resumen</p>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] text-slate-500">Recaudado</p>
                  <p className="text-xl font-black text-white">S/. {historyTotal.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Transacciones</p>
                  <p className="text-xl font-black text-white">{salesHistory.length}</p>
                </div>
              </div>
            </div>
          )}

          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold px-3 mb-1">Módulos</p>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            const isDisabled = !selectedBrand;
            return (
              <button key={id} onClick={() => !isDisabled && setActiveTab(id)} disabled={isDisabled}
                className={`group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer text-left
                  ${isDisabled ? 'opacity-25 cursor-not-allowed' : ''}
                  ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'}`}
                style={isActive ? {
                  background: 'linear-gradient(135deg, rgba(0,68,204,0.35) 0%, rgba(34,102,255,0.15) 100%)',
                  boxShadow: 'inset 0 0 0 1px rgba(0,68,204,0.4)',
                } : {}}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all
                  ${isActive ? 'bg-[#0044CC] shadow-lg shadow-[#0044CC]/30' : 'bg-white/[0.04] group-hover:bg-white/[0.07]'}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#6699FF]" />}
              </button>
            );
          })}
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 rounded-2xl border border-white/[0.06] p-6 min-h-[600px]"
          style={{ background: 'rgba(255,255,255,0.015)', backdropFilter: 'blur(8px)' }}>


          {/* ── SALES ── */}
          {activeTab === 'sales' && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 h-full">
              {/* Product grid */}
              <div className="flex flex-col gap-5 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#0044CC]/20 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4 text-[#6699FF]" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-white">
                      Catálogo · <span className="text-[#6699FF]">{selectedBrand?.name}</span>
                    </h2>
                    <p className="text-xs text-slate-500">Toca un producto para agregarlo a la venta activa</p>
                  </div>
                </div>

                {loadingProducts ? (
                  <div className="flex flex-col items-center gap-3 py-20 text-slate-500">
                    <Loader2 className="w-7 h-7 animate-spin text-[#2266FF]" />
                    <p className="text-sm">Cargando catálogo...</p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
                    <Package className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">Sin productos cargados</p>
                    <p className="text-xs text-slate-600 mt-1">Esta marca no tiene productos en Aourum aún</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto">
                    {products.map(product => {
                      const inCart = cart.find(i => i.product.id === product.id);
                      return (
                        <div key={product.id} onClick={() => addToCart(product)}
                          className="group relative flex items-center gap-3.5 p-3.5 rounded-xl border border-white/[0.06] hover:border-[#0044CC]/40 transition-all duration-200 cursor-pointer overflow-hidden"
                          style={{ background: inCart ? 'rgba(0,68,204,0.06)' : 'rgba(255,255,255,0.02)' }}>
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: 'linear-gradient(135deg, rgba(0,68,204,0.06) 0%, transparent 70%)' }} />
                          {product.image
                            ? <img src={product.image} alt={product.name}
                                className="relative w-12 h-12 rounded-xl object-cover ring-1 ring-white/10 shrink-0" />
                            : <div className="relative w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: 'rgba(0,68,204,0.12)' }}>
                                <Package className="w-5 h-5 text-[#2266FF]" />
                              </div>
                          }
                          <div className="relative flex-1 min-w-0">
                            <p className="font-semibold text-sm text-white leading-tight truncate group-hover:text-[#6699FF] transition-colors">
                              {product.name}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">{product.category || 'Sin categoría'}</p>
                            <p className="text-sm font-bold mt-1 text-[#6699FF]">S/. {Number(product.price).toFixed(2)}</p>
                          </div>
                          <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200
                            ${inCart
                              ? 'text-white shadow-lg shadow-[#0044CC]/30'
                              : 'bg-white/[0.04] text-slate-500 group-hover:text-white group-hover:bg-[#0044CC]/40'}`}
                            style={inCart ? { background: 'linear-gradient(135deg,#0044CC,#2266FF)' } : {}}>
                            {inCart ? <span className="text-xs font-bold">{inCart.quantity}</span> : <Plus className="w-4 h-4" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cart panel */}
              <div className="flex flex-col rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#6699FF]" />
                    <span className="font-semibold text-white text-sm">Venta activa</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#0044CC]/15 text-[#6699FF]">Feria</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-16 text-slate-600">
                      <ShoppingBag className="w-10 h-10 opacity-20 mb-3" />
                      <p className="text-sm font-medium text-slate-500">Canasta vacía</p>
                      <p className="text-xs text-slate-600 mt-1 text-center">Selecciona productos del catálogo</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.product.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02]">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white leading-tight truncate">{item.product.name}</p>
                          <p className="text-[11px] text-slate-500">S/. {Number(item.product.price).toFixed(2)} c/u</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => removeFromCart(item.product.id)}
                            className="w-6 h-6 rounded-lg bg-white/[0.05] hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center text-sm font-bold text-white">{item.quantity}</span>
                          <button onClick={() => addToCart(item.product)}
                            className="w-6 h-6 rounded-lg bg-white/[0.05] hover:bg-[#0044CC]/40 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 border-t border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Total</span>
                    <span className="text-2xl font-black text-white">S/. {cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setCart([])} disabled={!cart.length}
                      className="flex items-center justify-center py-2.5 rounded-xl border border-red-500/20 hover:bg-red-500/10 text-red-400 text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={checkout} disabled={!cart.length}
                      className="col-span-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer relative overflow-hidden"
                      style={{ background: 'linear-gradient(135deg, #0044CC 0%, #2266FF 100%)', boxShadow: cart.length ? '0 4px 20px rgba(0,68,204,0.35)' : 'none' }}>
                      {checkoutSuccess
                        ? <span className="flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> Registrado</span>
                        : 'Registrar venta'
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── INVENTORY ── */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#0044CC]/20 flex items-center justify-center">
                  <Boxes className="w-4 h-4 text-[#6699FF]" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-white">Insumos de Almacén</h2>
                  <p className="text-xs text-slate-500">Controla stock de stickers, sobres, empaques y materiales logísticos</p>
                </div>
              </div>
              <form onSubmit={addInternalItem}
                className="flex flex-col sm:flex-row gap-3 items-end p-4 rounded-2xl border border-white/[0.06]"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex-1 w-full">
                  <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">Nombre</label>
                  <input type="text" placeholder="Ej. Sobres de Envío Kraft" value={newItemName} onChange={e => setNewItemName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#0044CC]/50 transition-colors" />
                </div>
                <div className="w-full sm:w-28">
                  <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">Stock</label>
                  <input type="number" value={newItemStock} onChange={e => setNewItemStock(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#0044CC]/50 transition-colors" />
                </div>
                <div className="w-full sm:w-36">
                  <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">Categoría</label>
                  <select value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#0044CC]/50 transition-colors cursor-pointer">
                    {Object.keys(CATEGORY_COLORS).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <button type="submit"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all cursor-pointer shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0044CC 0%, #2266FF 100%)', boxShadow: '0 4px 16px rgba(0,68,204,0.3)' }}>
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </form>
              <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[10px] text-slate-600 uppercase tracking-widest font-semibold"
                      style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <th className="px-5 py-3.5">Insumo</th>
                      <th className="px-5 py-3.5">Categoría</th>
                      <th className="px-5 py-3.5">Stock</th>
                      <th className="px-5 py-3.5 text-right">Eliminar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {internalInventory.map((item, idx) => (
                      <tr key={item.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                        style={idx === internalInventory.length - 1 ? { borderBottom: 'none' } : {}}>
                        <td className="px-5 py-4 font-medium text-slate-200 text-sm">{item.name}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Otros']}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateInternalStock(item.id, item.stock, -1)}
                              className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className={`text-sm font-bold min-w-[28px] text-center ${item.stock < 10 ? 'text-red-400' : 'text-white'}`}>
                              {item.stock}
                            </span>
                            <button onClick={() => updateInternalStock(item.id, item.stock, 1)}
                              className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-[#0044CC]/30 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => deleteInternalItem(item.id)}
                            className="w-8 h-8 rounded-xl bg-red-500/[0.08] hover:bg-red-500/20 flex items-center justify-center text-red-500/60 hover:text-red-400 transition-all cursor-pointer ml-auto">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── HISTORY ── */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#0044CC]/20 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-[#6699FF]" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-white">Historial de ventas</h2>
                    <p className="text-xs text-slate-500">Auditoría completa de transacciones registradas</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="px-4 py-3 rounded-xl border border-white/[0.06] text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Total acumulado</p>
                    <p className="text-xl font-black text-white mt-0.5">S/. {historyTotal.toFixed(2)}</p>
                  </div>
                  <div className="px-4 py-3 rounded-xl border border-white/[0.06] text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Ventas</p>
                    <p className="text-xl font-black text-white mt-0.5">{salesHistory.length}</p>
                  </div>
                </div>
              </div>

              {salesHistory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-16 text-center">
                  <History className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">Sin ventas registradas</p>
                  <p className="text-xs text-slate-600 mt-1">Las ventas de la pestaña «Ventas» aparecerán aquí</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {salesHistory.map(sale => (
                    <div key={sale.id} className="p-4 rounded-2xl border border-white/[0.06] hover:border-white/[0.1] transition-all"
                      style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#0044CC]/15 flex items-center justify-center">
                            <Receipt className="w-3.5 h-3.5 text-[#6699FF]" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{sale.id}</p>
                            <p className="text-[11px] text-slate-500">{sale.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-[#6699FF]">S/. {sale.total.toFixed(2)}</p>
                          <p className="text-[10px] text-slate-600">{sale.items.length} producto{sale.items.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5 pt-3 border-t border-white/[0.05]">
                        {sale.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-slate-500">
                            <span>{item.product_name} <span className="text-slate-600">×{item.quantity}</span></span>
                            <span className="text-slate-400">S/. {(item.unit_price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] py-5 text-center">
        <p className="text-[11px] text-slate-700 tracking-wide">
          © 2026 Acon · Plataforma de ventas e inventario para marcas independientes
        </p>
      </footer>

    </div>
  );

}

export default Dashboard;
