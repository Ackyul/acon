import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
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
  BarChart3,
  X,
  LogOut,
  ArrowLeft,
  Users,
  Sliders,
  PlusCircle,
  Calendar,
  Percent,
  Search
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001/api';

interface BrandDetails {
  id: number;
  aourum_brand_id: number | null;
  name: string;
  logo?: string;
  owner?: string;
  category?: string;
  owner_username: string;
  type: 'local' | 'aourum';
  role: 'owner' | 'collaborator';
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
  total: number;
  created_by: string;
  items: { product_name: string; unit_price: number; quantity: number }[];
}

interface SalesSection {
  id: number;
  name: string;
  created_by: string;
  created_at: string;
  sales_count: number;
  total_sales: number;
}

interface Collaborator {
  username: string;
  first_name: string;
  last_name: string;
}

type Tab = 'sales' | 'inventory';
type SalesSubTab = 'sections' | 'general_history';
type SectionSubTab = 'counter' | 'history';
type WarehouseSubTab = 'internal' | 'products' | 'collaborators';

const CATEGORY_COLORS: Record<string, string> = {
  Empaque:   'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/20',
  Marketing: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/20',
  Logística: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20',
  Otros:     'bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/20',
};

const PRODUCT_CATEGORIES = ['Ropa', 'Accesorios', 'Calzado', 'Joyas', 'Hogar', 'Otros'];

export default function Dashboard() {
  const navigate = useNavigate();
  
  // Brand & User identity
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentFullName, setCurrentFullName] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brand, setBrand] = useState<BrandDetails | null>(null);
  const [loadingBrand, setLoadingBrand] = useState(true);
  const [error, setError] = useState('');

  // Active navigation states
  const [activeTab, setActiveTab] = useState<Tab>('sales');
  const [salesSubTab, setSalesSubTab] = useState<SalesSubTab>('sections');
  const [warehouseSubTab, setWarehouseSubTab] = useState<WarehouseSubTab>('internal');
  const [searchQuery, setSearchQuery] = useState('');
  const [configSearchQuery, setConfigSearchQuery] = useState('');

  // Business state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [internalInventory, setInternalInventory] = useState<InternalItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Sections (Ferias) State
  const [sections, setSections] = useState<SalesSection[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [selectedSection, setSelectedSection] = useState<SalesSection | null>(null);
  const [sectionSubTab, setSectionSubTab] = useState<SectionSubTab>('counter');
  
  // Section Active Products Configuration
  const [sectionProductIds, setSectionProductIds] = useState<number[]>([]);
  const [activeSectionProducts, setActiveSectionProducts] = useState<Product[]>([]);
  const [configuringCatalog, setConfiguringCatalog] = useState(false);
  const [savingCatalog, setSavingCatalog] = useState(false);
  
  // Collaborators State
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [newCollaboratorUsername, setNewCollaboratorUsername] = useState('');
  const [addingCollaborator, setAddingCollaborator] = useState(false);
  const [collaboratorError, setCollaboratorError] = useState('');
  const [collaboratorSuccess, setCollaboratorSuccess] = useState('');

  // Form Section creation
  const [newSectionName, setNewSectionName] = useState('');
  const [creatingSection, setCreatingSection] = useState(false);

  // Forms - Internal Items
  const [newItemName, setNewItemName] = useState('');
  const [newItemStock, setNewItemStock] = useState<number>(0);
  const [newItemCategory, setNewItemCategory] = useState('Empaque');
  const [creatingInternal, setCreatingInternal] = useState(false);

  // Forms - Local Products
  const [newProdName, setNewProdName] = useState('');
  const [newProdDescription, setNewProdDescription] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState<number>(0);
  const [newProdCategory, setNewProdCategory] = useState('Otros');
  const [creatingProduct, setCreatingProduct] = useState(false);

  // Cart & Success Feedback
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [showCartMobile, setShowCartMobile] = useState(false);

  // Initial Auth & Brand Check
  useEffect(() => {
    const user = localStorage.getItem('acon_user');
    const name = localStorage.getItem('acon_user_name');
    const searchParams = new URLSearchParams(window.location.search);
    const bId = searchParams.get('brandId');

    if (!user) {
      navigate('/auth');
      return;
    }

    setCurrentUser(user);
    setCurrentFullName(name || user);

    if (!bId) {
      navigate('/select-brand');
      return;
    }

    setBrandId(bId);
    fetchBrandDetails(bId, user);
  }, []);

  // Sync data depending on active views
  useEffect(() => {
    if (!brandId) return;
    
    if (activeTab === 'sales') {
      if (salesSubTab === 'sections') {
        fetchSections(brandId);
      } else if (salesSubTab === 'general_history') {
        fetchSalesHistory(brandId); // General global history
        fetchSections(brandId); // To display per-section sales contribution
      }
    } else if (activeTab === 'inventory') {
      fetchInternalInventory(brandId);
      if (brand?.type === 'local') {
        fetchProducts(brandId);
      }
      if (brand?.role === 'owner') {
        fetchCollaborators(brandId);
      }
    }
  }, [activeTab, salesSubTab, brandId, brand?.type, brand?.role]);

  // Sync section sales history & active products when entering a section
  useEffect(() => {
    if (!selectedSection) return;
    fetchSectionProducts(String(selectedSection.id));
    fetchSectionSalesHistory(String(selectedSection.id));
  }, [selectedSection]);

  const fetchBrandDetails = async (id: string, user: string) => {
    setLoadingBrand(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/brands/detail/${id}?username=${user}`);
      if (!res.ok) {
        throw new Error('No se pudo encontrar la marca seleccionada.');
      }
      const data = await res.json();
      setBrand(data);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor.');
      setTimeout(() => navigate('/select-brand'), 3000);
    } finally {
      setLoadingBrand(false);
    }
  };

  const fetchProducts = async (id: string) => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${API_BASE}/brands/${id}/products`);
      if (res.ok) {
        setProducts(await res.json());
      }
    } catch (e) {
      console.error('Error fetching products:', e);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchSections = async (id: string) => {
    setLoadingSections(true);
    try {
      const res = await fetch(`${API_BASE}/brands/${id}/sections`);
      if (res.ok) {
        setSections(await res.json());
      }
    } catch (e) {
      console.error('Error fetching sections:', e);
    } finally {
      setLoadingSections(false);
    }
  };

  const fetchSectionProducts = async (sectionId: string) => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${API_BASE}/sections/${sectionId}/products`);
      if (res.ok) {
        const data = await res.json();
        setActiveSectionProducts(data.active || []);
        setSectionProductIds(data.allIds || []);
        
        // If no products selected yet, automatically open catalog selection checklist
        if (!data.allIds || data.allIds.length === 0) {
          if (brandId) {
            const prodRes = await fetch(`${API_BASE}/brands/${brandId}/products`);
            if (prodRes.ok) {
              setProducts(await prodRes.json());
            }
          }
          setConfiguringCatalog(true);
        }
      }
    } catch (e) {
      console.error('Error fetching section products:', e);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCollaborators = async (id: string) => {
    setLoadingCollaborators(true);
    try {
      const res = await fetch(`${API_BASE}/brands/${id}/collaborators`);
      if (res.ok) {
        setCollaborators(await res.json());
      }
    } catch (e) {
      console.error('Error fetching collaborators:', e);
    } finally {
      setLoadingCollaborators(false);
    }
  };

  const fetchInternalInventory = async (id: string) => {
    setLoadingInventory(true);
    try {
      const res = await fetch(`${API_BASE}/internal-items?acon_brand_id=${id}`);
      if (res.ok) {
        setInternalInventory(await res.json());
      }
    } catch (e) {
      console.error('Error fetching internal items:', e);
    } finally {
      setLoadingInventory(false);
    }
  };

  const fetchSalesHistory = async (id: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/sales?acon_brand_id=${id}`);
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map((sale: any) => ({
          id: `SALE-${sale.id}`,
          date: new Date(sale.created_at).toLocaleString('es-PE'),
          total: Number(sale.total),
          created_by: sale.created_by,
          items: sale.items.map((item: any) => ({
            product_name: item.product_name,
            unit_price: Number(item.unit_price),
            quantity: item.quantity
          }))
        }));
        setSalesHistory(formatted);
      }
    } catch (e) {
      console.error('Error fetching general sales history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchSectionSalesHistory = async (sectionId: string) => {
    if (!brandId) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/sales?acon_brand_id=${brandId}&section_id=${sectionId}`);
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map((sale: any) => ({
          id: `SALE-${sale.id}`,
          date: new Date(sale.created_at).toLocaleString('es-PE'),
          total: Number(sale.total),
          created_by: sale.created_by,
          items: sale.items.map((item: any) => ({
            product_name: item.product_name,
            unit_price: Number(item.unit_price),
            quantity: item.quantity
          }))
        }));
        setSalesHistory(formatted);
      }
    } catch (e) {
      console.error('Error fetching section sales history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('acon_user');
    localStorage.removeItem('acon_user_name');
    navigate('/auth');
  };

  // Cart operations
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item =>
          item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prev.filter(item => item.product.id !== productId);
    });
  };

  const handleCheckout = async () => {
    if (!cart.length || !brand || !selectedSection) return;
    setCheckoutError('');
    const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
    const salePayload = {
      acon_brand_id: brand.id,
      section_id: selectedSection.id,
      created_by: currentFullName || currentUser || 'Vendedor',
      total,
      items: cart.map(i => ({
        aourum_product_id: brand.type === 'aourum' ? i.product.id : null,
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
        setShowCartMobile(false);
        setTimeout(() => setCheckoutSuccess(false), 3000);
        fetchSectionSalesHistory(String(selectedSection.id));
      } else {
        const errData = await res.json();
        setCheckoutError(errData.error || 'Error al registrar la venta');
      }
    } catch (e) {
      setCheckoutError('Error de red al registrar la venta');
    }
  };

  // Add Internal Item
  const handleAddInternalItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !brand) return;

    setCreatingInternal(true);
    try {
      const res = await fetch(`${API_BASE}/internal-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acon_brand_id: brand.id,
          name: newItemName.trim(),
          category: newItemCategory,
          stock: newItemStock
        })
      });
      if (res.ok) {
        setNewItemName('');
        setNewItemStock(0);
        fetchInternalInventory(String(brand.id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingInternal(false);
    }
  };

  const handleUpdateInternalStock = async (id: number, currentStock: number, delta: number) => {
    if (!brand) return;
    const newStock = Math.max(0, currentStock + delta);
    try {
      const res = await fetch(`${API_BASE}/internal-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock })
      });
      if (res.ok) {
        fetchInternalInventory(String(brand.id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteInternalItem = async (id: number) => {
    if (!brand || !window.confirm('¿Seguro que deseas eliminar este insumo?')) return;
    try {
      const res = await fetch(`${API_BASE}/internal-items/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchInternalInventory(String(brand.id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add Custom Product (Local Brands)
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdPrice || !brand) return;

    const parsedPrice = parseFloat(newProdPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert('El precio debe ser un número mayor a 0');
      return;
    }

    setCreatingProduct(true);
    try {
      const res = await fetch(`${API_BASE}/brands/${brand.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProdName.trim(),
          description: newProdDescription.trim(),
          price: parsedPrice,
          stock: newProdStock,
          category: newProdCategory
        })
      });
      if (res.ok) {
        setNewProdName('');
        setNewProdDescription('');
        setNewProdPrice('');
        setNewProdStock(0);
        setNewProdCategory('Otros');
        fetchProducts(String(brand.id));
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al agregar producto');
      }
    } catch (e) {
      console.error(e);
      alert('Error de red al agregar producto');
    } finally {
      setCreatingProduct(false);
    }
  };

  // Collaborator Management
  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollaboratorUsername.trim() || !brand || !currentUser) return;
    
    setAddingCollaborator(true);
    setCollaboratorError('');
    setCollaboratorSuccess('');
    try {
      const res = await fetch(`${API_BASE}/brands/${brand.id}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newCollaboratorUsername.trim().toLowerCase(),
          owner_username: currentUser
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCollaboratorSuccess(`¡Se agregó a ${newCollaboratorUsername} como colaborador!`);
        setNewCollaboratorUsername('');
        fetchCollaborators(String(brand.id));
      } else {
        setCollaboratorError(data.error || 'Error al agregar colaborador');
      }
    } catch (e) {
      setCollaboratorError('Error de red al agregar colaborador.');
    } finally {
      setAddingCollaborator(false);
    }
  };

  const handleRemoveCollaborator = async (collabUsername: string) => {
    if (!brand || !currentUser || !window.confirm(`¿Seguro que deseas remover a ${collabUsername} del equipo?`)) return;
    
    setCollaboratorError('');
    setCollaboratorSuccess('');
    try {
      const res = await fetch(`${API_BASE}/brands/${brand.id}/collaborators/${collabUsername}?owner_username=${currentUser}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCollaboratorSuccess('Colaborador removido con éxito.');
        fetchCollaborators(String(brand.id));
      } else {
        const data = await res.json();
        setCollaboratorError(data.error || 'Error al remover colaborador.');
      }
    } catch (e) {
      setCollaboratorError('Error de red.');
    }
  };

  // Section (Feria) Creation
  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim() || !brand || !currentUser) return;

    setCreatingSection(true);
    try {
      const res = await fetch(`${API_BASE}/brands/${brand.id}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSectionName.trim(),
          created_by: currentFullName || currentUser
        })
      });
      if (res.ok) {
        setNewSectionName('');
        fetchSections(String(brand.id));
      }
    } catch (e) {
      console.error('Error creating section:', e);
    } finally {
      setCreatingSection(false);
    }
  };

  const handleDeleteSection = async (sectionId: number) => {
    if (!brand || !window.confirm('¿Seguro que deseas eliminar esta sección de venta? Se borrarán todas sus ventas asociadas.')) return;
    try {
      const res = await fetch(`${API_BASE}/sections/${sectionId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchSections(String(brand.id));
      } else {
        const errData = await res.json();
        alert(errData.error || 'Error al eliminar la sección.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de red al eliminar la sección.');
    }
  };

  // Section Catalog Active List persist
  const handleSaveSectionCatalog = async () => {
    if (!selectedSection) return;
    setSavingCatalog(true);
    try {
      const res = await fetch(`${API_BASE}/sections/${selectedSection.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: sectionProductIds })
      });
      if (res.ok) {
        setConfiguringCatalog(false);
        fetchSectionProducts(String(selectedSection.id));
      } else {
        alert('Error al guardar selección.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de red.');
    } finally {
      setSavingCatalog(false);
    }
  };

  // Toggling products in the configure checklist
  const toggleCatalogProduct = (pId: number) => {
    setSectionProductIds(prev => 
      prev.includes(pId) ? prev.filter(id => id !== pId) : [...prev, pId]
    );
  };

  const handleOpenCatalogConfig = async () => {
    if (!brandId) return;
    // We must load ALL general products of the brand to show in checklist
    setLoadingProducts(true);
    try {
      const res = await fetch(`${API_BASE}/brands/${brandId}/products`);
      if (res.ok) {
        setProducts(await res.json());
        setConfiguringCatalog(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProducts(false);
    }
  };

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const historyTotal = salesHistory.reduce((s, i) => s + i.total, 0);

  if (loadingBrand) {
    return (
      <div className="min-h-screen bg-[#080A10] text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#2266FF]" />
          <p className="text-slate-400 text-sm font-medium">Iniciando espacio de trabajo...</p>
        </div>
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="min-h-screen bg-[#080A10] text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h2 className="text-lg font-bold text-white">Error de Carga</h2>
          <p className="text-slate-400 text-sm">{error || 'La marca seleccionada no es válida o no tienes acceso.'}</p>
          <p className="text-[11px] text-slate-600">Redirigiendo a la selección de marca...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#080A10] text-slate-100 flex flex-col relative overflow-hidden pb-20 md:pb-6"
      style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
    >
      {/* ── Ambient blobs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #0044CC 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #0044CC 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* ── Top Header ── */}
      <header className="relative z-40 border-b border-white/[0.06] backdrop-blur-xl px-4 md:px-6 py-3.5 flex items-center justify-between bg-black/40">
        
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => navigate('/select-brand')}
            className="p-2 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Volver a la selección de marca"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="h-6 w-px bg-white/[0.08]" />

          <div className="flex items-center gap-2.5">
            {brand.logo ? (
              <img src={brand.logo} alt="" className="w-8.5 h-8.5 rounded-xl object-cover ring-1 ring-white/10 shrink-0" />
            ) : (
              <div className="w-8.5 h-8.5 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                style={{ background: brand.type === 'aourum' ? 'rgba(0,68,204,0.15)' : 'rgba(124,58,237,0.15)', color: brand.type === 'aourum' ? '#6699FF' : '#C084FC' }}>
                {brand.name[0]}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="font-bold text-white text-sm md:text-base leading-tight truncate max-w-[120px] sm:max-w-none">{brand.name}</h1>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide uppercase leading-none
                  ${brand.type === 'aourum' 
                    ? 'bg-[#0044CC]/20 text-[#6699FF] ring-1 ring-[#0044CC]/35' 
                    : 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/20'}`}
                >
                  {brand.type === 'aourum' ? 'Aourum' : 'Local'}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide uppercase leading-none
                  ${brand.role === 'owner' 
                    ? 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20' 
                    : 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20'}`}
                >
                  {brand.role === 'owner' ? 'Owner' : 'Staff'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/[0.05] bg-white/[0.02] text-xs text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{currentFullName}</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center p-2 rounded-xl border border-white/[0.08] hover:border-red-500/30 bg-white/[0.02] hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Main Layout Container ── */}
      <div className="relative z-10 flex flex-1 flex-col md:flex-row max-w-7xl w-full mx-auto p-3 md:p-6 gap-6">
        
        {/* Sidebar Navigation - Hidden on Mobile */}
        <aside className="hidden md:flex w-[240px] shrink-0 flex-col gap-1">
          
          {/* Workspace Stats Quick Summary */}
          <div className="mb-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.015]" style={{ backdropFilter: 'blur(10px)' }}>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">WORKSPACE INFO</p>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-slate-500 leading-none">Mi rol</p>
                <p className="text-sm font-bold text-white mt-1 uppercase tracking-wider">
                  {brand.role === 'owner' ? 'Propietario' : 'Colaborador'}
                </p>
              </div>
              <div className="h-px bg-white/[0.05]" />
              <div>
                <p className="text-[10px] text-slate-500 leading-none">Ferias / Secciones</p>
                <p className="text-sm font-bold text-white mt-1">{sections.length} secciones</p>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold px-3 mb-1.5">Módulos</p>
          
          {/* Tab Button 1: Conteo de Ventas */}
          <button
            onClick={() => setActiveTab('sales')}
            className={`group w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all duration-200 cursor-pointer text-left
              ${activeTab === 'sales' ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'}`}
            style={activeTab === 'sales' ? {
              background: brand.type === 'aourum'
                ? 'linear-gradient(135deg, rgba(0,68,204,0.3) 0%, rgba(34,102,255,0.1) 100%)'
                : 'linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(167,139,250,0.1) 100%)',
              boxShadow: brand.type === 'aourum'
                ? 'inset 0 0 0 1px rgba(0,68,204,0.35)'
                : 'inset 0 0 0 1px rgba(124,58,237,0.35)'
            } : {}}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all
              ${activeTab === 'sales' 
                ? brand.type === 'aourum' ? 'bg-[#0044CC] text-white' : 'bg-violet-600 text-white'
                : 'bg-white/[0.04] group-hover:bg-white/[0.08]'}`}>
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="flex-1">Conteo de Ventas</span>
            {activeTab === 'sales' && (
              <ChevronRight className={`w-3.5 h-3.5 ${brand.type === 'aourum' ? 'text-[#6699FF]' : 'text-violet-400'}`} />
            )}
          </button>

          {/* Tab Button 2: Almacén */}
          <button
            onClick={() => setActiveTab('inventory')}
            className={`group w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all duration-200 cursor-pointer text-left
              ${activeTab === 'inventory' ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'}`}
            style={activeTab === 'inventory' ? {
              background: brand.type === 'aourum'
                ? 'linear-gradient(135deg, rgba(0,68,204,0.3) 0%, rgba(34,102,255,0.1) 100%)'
                : 'linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(167,139,250,0.1) 100%)',
              boxShadow: brand.type === 'aourum'
                ? 'inset 0 0 0 1px rgba(0,68,204,0.35)'
                : 'inset 0 0 0 1px rgba(124,58,237,0.35)'
            } : {}}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all
              ${activeTab === 'inventory'
                ? brand.type === 'aourum' ? 'bg-[#0044CC] text-white' : 'bg-violet-600 text-white'
                : 'bg-white/[0.04] group-hover:bg-white/[0.08]'}`}>
              <Boxes className="w-4 h-4" />
            </div>
            <span className="flex-1">Almacén</span>
            {activeTab === 'inventory' && (
              <ChevronRight className={`w-3.5 h-3.5 ${brand.type === 'aourum' ? 'text-[#6699FF]' : 'text-violet-400'}`} />
            )}
          </button>
        </aside>

        {/* ── Main View Workspace Area ── */}
        <main className="flex-1 min-w-0 rounded-2xl border border-white/[0.06] bg-white/[0.01] p-3 md:p-6"
          style={{ backdropFilter: 'blur(12px)' }}>
          
          {/* ──────────────────────────────────────────────────────── */}
          {/* VIEW: CONTEO DE VENTAS                                   */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              
              {/* If no Section (Feria) selected, display section manager */}
              {!selectedSection ? (
                <div className="space-y-6">
                  {/* Internal Subtabs: Secciones vs Historial General */}
                  <div className="flex border-b border-white/[0.06] pb-3 gap-2">
                    <button
                      onClick={() => setSalesSubTab('sections')}
                      className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
                        ${salesSubTab === 'sections'
                          ? brand.type === 'aourum'
                            ? 'bg-[#0044CC]/20 text-[#6699FF] border border-[#0044CC]/30'
                            : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                          : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/[0.02]'}`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Ferias / Secciones</span>
                    </button>
                    <button
                      onClick={() => setSalesSubTab('general_history')}
                      className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
                        ${salesSubTab === 'general_history'
                          ? brand.type === 'aourum'
                            ? 'bg-[#0044CC]/20 text-[#6699FF] border border-[#0044CC]/30'
                            : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                          : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/[0.02]'}`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Historial General</span>
                    </button>
                  </div>

                  {salesSubTab === 'sections' && (
                    <div className="space-y-6">
                      
                      {/* Section creation card */}
                      <div className="p-4 rounded-xl border border-white/[0.05] bg-white/[0.015]">
                        <div className="flex items-center gap-2 mb-3">
                          <PlusCircle className="w-4 h-4 text-[#6699FF]" />
                          <h3 className="font-bold text-white text-xs uppercase tracking-wider">Crear Nueva Sección de Venta</h3>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
                          Crea un espacio (ej. "Feria Barranco", "Feria Jockey") para agrupar las ventas de ese evento, registrar vendedores y asignar un catálogo filtrado.
                        </p>
                        
                        <form onSubmit={handleCreateSection} className="flex gap-2 items-center">
                          <input 
                            type="text"
                            placeholder="Nombre de la feria (ej. Feria de Barranco - Stand 5)"
                            value={newSectionName}
                            onChange={e => setNewSectionName(e.target.value)}
                            required
                            className="flex-1 bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#0044CC]/50 transition-colors"
                          />
                          <button
                            type="submit"
                            disabled={creatingSection || !newSectionName.trim()}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0044CC] to-[#2266FF] text-white text-xs font-bold cursor-pointer shrink-0 disabled:opacity-40 transition-colors"
                          >
                            {creatingSection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Crear'}
                          </button>
                        </form>
                      </div>

                      {/* Active sections list */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Selecciona la Sección Activa</h3>
                        
                        {loadingSections ? (
                          <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
                            <Loader2 className="w-6 h-6 animate-spin text-[#2266FF]" />
                            <p className="text-xs">Cargando secciones...</p>
                          </div>
                        ) : sections.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-white/10 p-12 text-center bg-white/[0.01]">
                            <Calendar className="w-8 h-8 text-slate-800 mx-auto mb-2" />
                            <p className="text-slate-400 text-xs font-medium">Aún no hay ferias o secciones creadas</p>
                            <p className="text-[10px] text-slate-600 mt-1">Crea una sección arriba para comenzar a vender en ferias.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {sections.map(sec => (
                              <div
                                key={sec.id}
                                className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all flex flex-col justify-between group"
                              >
                                <div>
                                  <div className="flex justify-between items-start gap-2 mb-2">
                                    <h4 className="font-bold text-sm text-white group-hover:text-[#6699FF] transition-colors truncate">{sec.name}</h4>
                                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#0044CC]/10 text-[#6699FF] border border-[#0044CC]/20">
                                      Stand Activo
                                    </span>
                                  </div>
                                  <div className="space-y-1 text-[10px] text-slate-500 mb-4">
                                    <p>Creado por: {sec.created_by}</p>
                                    <p>Fecha: {new Date(sec.created_at).toLocaleDateString('es-PE')}</p>
                                  </div>
                                </div>

                                <div className="border-t border-white/[0.04] pt-3 flex items-center justify-between gap-4 mt-auto">
                                  <div>
                                    <p className="text-[9px] text-slate-500 uppercase font-bold leading-none">Recaudado</p>
                                    <p className="text-sm font-black text-emerald-400 mt-1">S/. {sec.total_sales.toFixed(2)}</p>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    {brand?.role === 'owner' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteSection(sec.id);
                                        }}
                                        className="flex items-center justify-center p-2 rounded-xl border border-white/[0.08] hover:border-red-500/30 bg-white/[0.02] hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                                        title="Eliminar sección"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setSelectedSection(sec)}
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0044CC] hover:bg-[#2266FF] text-white text-xs font-bold transition-all cursor-pointer"
                                    >
                                      <span>Vender aquí</span>
                                      <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUBVIEW: HISTORIAL GENERAL (Global audit) */}
                  {salesSubTab === 'general_history' && (
                    <div className="space-y-6">
                      
                      {/* Brand sales statistics */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.015]">
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Ventas Totales (Marca)</p>
                          <p className="text-2xl font-black text-white mt-1">S/. {historyTotal.toFixed(2)}</p>
                        </div>
                        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.015]">
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Transacciones</p>
                          <p className="text-2xl font-black text-white mt-1">{salesHistory.length}</p>
                        </div>
                        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.015] sm:col-span-2 lg:col-span-1">
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Promedio por Venta</p>
                          <p className="text-2xl font-black text-emerald-400 mt-1">
                            S/. {salesHistory.length ? (historyTotal / salesHistory.length).toFixed(2) : '0.00'}
                          </p>
                        </div>
                      </div>

                      {/* Contribution per section */}
                      <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.015] space-y-4">
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-violet-400" />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Desglose de Ventas por Feria</h4>
                        </div>
                        
                        <div className="space-y-3">
                          {sections.length === 0 ? (
                            <p className="text-[10px] text-slate-500">No hay datos de secciones disponibles.</p>
                          ) : (
                            sections.map(sec => {
                              const pct = historyTotal > 0 ? (sec.total_sales / historyTotal) * 100 : 0;
                              return (
                                <div key={sec.id} className="space-y-1.5">
                                  <div className="flex justify-between text-xs font-medium">
                                    <span className="text-slate-200">{sec.name}</span>
                                    <span className="text-slate-400 font-bold">S/. {sec.total_sales.toFixed(2)} ({pct.toFixed(1)}%)</span>
                                  </div>
                                  <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-violet-600 to-[#2266FF] rounded-full" 
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Audit sales list */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Auditoría de Ventas Globales</h4>
                        
                        {loadingHistory ? (
                          <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
                            <Loader2 className="w-6 h-6 animate-spin text-[#2266FF]" />
                            <p className="text-xs">Cargando auditoría...</p>
                          </div>
                        ) : salesHistory.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-white/10 p-12 text-center">
                            <History className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                            <p className="text-slate-400 text-xs font-semibold">Sin transacciones registradas</p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                            {salesHistory.map(sale => (
                              <div key={sale.id} className="p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.015]">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <p className="text-xs font-bold text-white">{sale.id}</p>
                                    <p className="text-[9px] text-slate-500">{sale.date} · Por {sale.created_by}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-black text-emerald-400">S/. {sale.total.toFixed(2)}</p>
                                    <p className="text-[9px] text-slate-500">{sale.items.length} item{sale.items.length !== 1 ? 's' : ''}</p>
                                  </div>
                                </div>
                                <div className="pt-2 border-t border-white/[0.04] space-y-1">
                                  {sale.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-[11px] text-slate-400">
                                      <span>{item.product_name} <span className="text-slate-600">×{item.quantity}</span></span>
                                      <span className="text-slate-300">S/. {(item.unit_price * item.quantity).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                /* ── SECTION IS ACTIVE (CASHIER INSIDE FERIA) ── */
                <div className="space-y-5">
                  
                  {/* Section Active Header */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex-wrap gap-3">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-[#6699FF]" />
                      <div>
                        <h3 className="font-bold text-white text-xs md:text-sm truncate max-w-[200px] sm:max-w-none">{selectedSection.name}</h3>
                        <p className="text-[9px] text-slate-500">Sección activa para conteo de ventas</p>
                      </div>
                    </div>

                    <button
                      onClick={() => { setSelectedSection(null); setCart([]); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-all ml-auto"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Volver a Ferias</span>
                    </button>
                  </div>

                  {/* Section sub navigation tabs */}
                  <div className="flex border-b border-white/[0.06] pb-3 gap-2">
                    <button
                      onClick={() => setSectionSubTab('counter')}
                      className={`flex items-center gap-2 px-4.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
                        ${sectionSubTab === 'counter'
                          ? brand.type === 'aourum'
                            ? 'bg-[#0044CC]/20 text-[#6699FF] border border-[#0044CC]/30'
                            : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                          : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/[0.02]'}`}
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Caja Mostrador</span>
                    </button>
                    <button
                      onClick={() => setSectionSubTab('history')}
                      className={`flex items-center gap-2 px-4.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
                        ${sectionSubTab === 'history'
                          ? brand.type === 'aourum'
                            ? 'bg-[#0044CC]/20 text-[#6699FF] border border-[#0044CC]/30'
                            : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                          : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/[0.02]'}`}
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Historial de Feria</span>
                    </button>
                  </div>

                  {sectionSubTab === 'counter' && (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                      
                      {/* Catalog view */}
                      <div className="space-y-4">
                        
                        {/* Configurator Checklist overlay view */}
                        {configuringCatalog ? (
                          <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.015] space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-bold text-white text-xs uppercase tracking-wider">Ajustar Catálogo de Feria</h3>
                                <p className="text-[10px] text-slate-500">Selecciona los productos que llevarás a esta feria para agilizar la caja.</p>
                              </div>
                              
                              <button 
                                onClick={() => { setConfiguringCatalog(false); setConfigSearchQuery(''); }}
                                className="p-1 rounded bg-white/[0.04] text-slate-400 hover:text-white cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="w-3.5 h-3.5 text-slate-500" />
                              </span>
                              <input
                                type="text"
                                placeholder="Buscar en catálogo general..."
                                value={configSearchQuery}
                                onChange={e => setConfigSearchQuery(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0044CC]/50 transition-colors"
                              />
                            </div>

                            {loadingProducts ? (
                              <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
                                <Loader2 className="w-6 h-6 animate-spin text-[#2266FF]" />
                                <p className="text-xs">Cargando catálogo general...</p>
                              </div>
                            ) : products.length === 0 ? (
                              <p className="text-xs text-slate-500 text-center py-6">El catálogo general de la marca está vacío.</p>
                            ) : (
                              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                {(() => {
                                  const filtered = products.filter(p => 
                                    p.name.toLowerCase().includes(configSearchQuery.toLowerCase()) || 
                                    (p.category && p.category.toLowerCase().includes(configSearchQuery.toLowerCase()))
                                  );
                                  if (filtered.length === 0) {
                                    return <p className="text-[11px] text-slate-500 text-center py-6">No se encontraron productos.</p>;
                                  }
                                  return filtered.map(p => {
                                    const isChecked = sectionProductIds.includes(p.id);
                                    return (
                                      <div
                                        key={p.id}
                                        onClick={() => toggleCatalogProduct(p.id)}
                                        className="flex items-center justify-between p-2.5 rounded-lg border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className={`w-4 h-4 rounded border flex items-center justify-center
                                            ${isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'}`}
                                          >
                                            {isChecked && <Check className="w-3 h-3 text-white" />}
                                          </div>
                                          <span className="text-xs text-slate-200 font-semibold">{p.name}</span>
                                        </div>
                                        <span className="text-xs text-slate-500">S/. {p.price}</span>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.05]">
                              <button
                                onClick={() => setConfiguringCatalog(false)}
                                className="px-4 py-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.04] text-xs font-semibold text-slate-300 cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={handleSaveSectionCatalog}
                                disabled={savingCatalog}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-40"
                              >
                                {savingCatalog ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar Catálogo'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Standard grid view */
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold shrink-0">Catálogo Feria</span>
                              
                              <div className="relative flex-1 max-w-xs">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <Search className="w-3.5 h-3.5 text-slate-500" />
                                </span>
                                <input
                                  type="text"
                                  placeholder="Buscar producto..."
                                  value={searchQuery}
                                  onChange={e => setSearchQuery(e.target.value)}
                                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0044CC]/50 transition-colors"
                                />
                              </div>

                              <button
                                onClick={handleOpenCatalogConfig}
                                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-[10px] text-slate-300 hover:text-white transition-all cursor-pointer font-semibold shrink-0"
                              >
                                <Sliders className="w-3 h-3" />
                                <span>Ajustar Catálogo ({activeSectionProducts.length} activos)</span>
                              </button>
                            </div>

                            {loadingProducts ? (
                              <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
                                <Loader2 className="w-6 h-6 animate-spin text-[#2266FF]" />
                                <p className="text-xs font-medium">Cargando catálogo...</p>
                              </div>
                            ) : activeSectionProducts.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-white/10 p-12 text-center bg-white/[0.01]">
                                <Package className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                                <p className="text-slate-400 text-xs font-semibold">No hay productos en esta feria</p>
                                <p className="text-[10px] text-slate-500 mt-1">Haz clic en "Ajustar Catálogo" arriba para activar productos en esta feria.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                                {(() => {
                                  const filtered = activeSectionProducts.filter(p =>
                                    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
                                  );
                                  if (filtered.length === 0) {
                                    return <p className="text-xs text-slate-500 text-center py-12">No se encontraron productos coincidentes.</p>;
                                  }
                                  return filtered.map(product => {
                                    const inCart = cart.find(i => i.product.id === product.id);
                                    const isLocal = brand.type === 'local';
                                    return (
                                      <div
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="group relative flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 cursor-pointer overflow-hidden"
                                        style={{ 
                                          background: inCart 
                                            ? isLocal ? 'rgba(124,58,237,0.06)' : 'rgba(0,68,204,0.06)' 
                                            : 'rgba(255,255,255,0.015)' 
                                        }}
                                      >
                                        {product.image ? (
                                          <img src={product.image} alt={product.name} className="w-11 h-11 rounded-lg object-cover ring-1 ring-white/10 shrink-0" />
                                        ) : (
                                          <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ background: isLocal ? 'rgba(124,58,237,0.12)' : 'rgba(0,68,204,0.12)' }}>
                                            <Package className={`w-4.5 h-4.5 ${isLocal ? 'text-violet-400' : 'text-[#6699FF]'}`} />
                                          </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                          <h4 className="font-semibold text-xs text-white truncate leading-tight group-hover:text-[#6699FF] transition-colors">{product.name}</h4>
                                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{product.category || 'Otros'}</p>
                                          <p className={`text-xs font-bold mt-1 ${isLocal ? 'text-violet-400' : 'text-[#6699FF]'}`}>S/. {Number(product.price).toFixed(2)}</p>
                                        </div>
                                        <div 
                                          className="flex items-center gap-1 shrink-0"
                                          onClick={e => e.stopPropagation()}
                                        >
                                          {inCart ? (
                                            <div className="flex items-center bg-black/40 border border-white/[0.08] rounded-xl p-0.5 gap-0.5 shadow-inner">
                                              <button
                                                onClick={() => removeFromCart(product.id)}
                                                className="w-6.5 h-6.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                                              >
                                                <Minus className="w-2.5 h-2.5" />
                                              </button>
                                              <span className="w-5 text-center text-[10px] font-black text-white">{inCart.quantity}</span>
                                              <button
                                                onClick={() => addToCart(product)}
                                                className="w-6.5 h-6.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
                                              >
                                                <Plus className="w-2.5 h-2.5" />
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => addToCart(product)}
                                              className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer
                                                bg-white/[0.04] text-slate-500 group-hover:text-white group-hover:bg-white/[0.08]`}
                                            >
                                              <Plus className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right Side: Cart active Checkout - Hidden on Mobile, drawer on desktop */}
                      <div className="hidden lg:flex flex-col rounded-2xl border border-white/[0.07] bg-white/[0.015] overflow-hidden" style={{ minHeight: '340px' }}>
                        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-[#6699FF]" />
                            <span className="font-bold text-white text-xs uppercase tracking-wider">Venta activa</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider
                            ${brand.type === 'aourum' ? 'bg-[#0044CC]/20 text-[#6699FF]' : 'bg-violet-500/20 text-violet-300'}`}
                          >
                            {selectedSection.name}
                          </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                          {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-12 text-center text-slate-500">
                              <ShoppingBag className="w-8 h-8 opacity-20 mb-2.5" />
                              <p className="text-xs font-semibold text-slate-400">Canasta vacía</p>
                              <p className="text-[10px] text-slate-600 mt-1">Selecciona productos para registrar venta</p>
                            </div>
                          ) : (
                            cart.map(item => (
                              <div key={item.product.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02]">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-white leading-tight truncate">{item.product.name}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">S/. {Number(item.product.price).toFixed(2)} c/u</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button onClick={() => removeFromCart(item.product.id)}
                                    className="w-6 h-6 rounded-lg bg-white/[0.05] hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer">
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="w-4 text-center text-xs font-bold text-white">{item.quantity}</span>
                                  <button onClick={() => addToCart(item.product)}
                                    className="w-6 h-6 rounded-lg bg-white/[0.05] hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer">
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {checkoutError && (
                          <div className="mx-3 my-2 p-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-[10px] flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{checkoutError}</span>
                          </div>
                        )}

                        <div className="p-4 border-t border-white/[0.06] space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Venta</span>
                            <span className="text-xl font-black text-white">S/. {cartTotal.toFixed(2)}</span>
                          </div>

                          <div className="grid grid-cols-4 gap-2">
                            <button
                              onClick={() => setCart([])}
                              disabled={!cart.length}
                              className="flex items-center justify-center py-2.5 rounded-xl border border-red-500/20 hover:bg-red-500/10 text-red-400 text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={handleCheckout}
                              disabled={!cart.length}
                              className="col-span-3 py-2.5 rounded-xl text-white text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer relative overflow-hidden flex items-center justify-center gap-1.5"
                              style={{
                                background: brand.type === 'aourum'
                                  ? 'linear-gradient(135deg, #0044CC 0%, #2266FF 100%)'
                                  : 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
                                boxShadow: cart.length
                                  ? brand.type === 'aourum' ? '0 4px 16px rgba(0,68,204,0.3)' : '0 4px 16px rgba(124,58,237,0.3)'
                                  : 'none'
                              }}
                            >
                              {checkoutSuccess ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Registrado</span>
                                </>
                              ) : (
                                <span>Registrar Venta</span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Section specific Sales history list */}
                  {sectionSubTab === 'history' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Historial de la Sección</h4>
                        <span className="text-[10px] text-slate-500">Recaudado aquí: S/. {historyTotal.toFixed(2)}</span>
                      </div>

                      {loadingHistory ? (
                        <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
                          <Loader2 className="w-6 h-6 animate-spin text-[#2266FF]" />
                          <p className="text-xs">Cargando ventas...</p>
                        </div>
                      ) : salesHistory.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/10 p-16 text-center">
                          <History className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                          <p className="text-slate-400 text-xs font-semibold">No se han registrado ventas en esta feria.</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                          {salesHistory.map(sale => (
                            <div key={sale.id} className="p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.015]">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="text-xs font-bold text-white">{sale.id}</p>
                                  <p className="text-[9px] text-slate-500">{sale.date} · Por {sale.created_by}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-black text-emerald-400">S/. {sale.total.toFixed(2)}</p>
                                  <p className="text-[9px] text-slate-500">{sale.items.length} item{sale.items.length !== 1 ? 's' : ''}</p>
                                </div>
                              </div>
                              <div className="pt-2 border-t border-white/[0.04] space-y-1">
                                {sale.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-[11px] text-slate-400">
                                    <span>{item.product_name} <span className="text-slate-600">×{item.quantity}</span></span>
                                    <span className="text-slate-300">S/. {(item.unit_price * item.quantity).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* VIEW: ALMACÉN                                            */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              
              {/* Internal Subtabs Navigation for Warehouse */}
              <div className="flex border-b border-white/[0.06] pb-3 overflow-x-auto gap-2">
                <button
                  onClick={() => setWarehouseSubTab('internal')}
                  className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer
                    ${warehouseSubTab === 'internal'
                      ? brand.type === 'aourum'
                        ? 'bg-[#0044CC]/20 text-[#6699FF] border border-[#0044CC]/30'
                        : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                      : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/[0.02]'}`}
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Insumos Internos</span>
                </button>
                
                {brand.type === 'local' && (
                  <button
                    onClick={() => setWarehouseSubTab('products')}
                    className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer
                      ${warehouseSubTab === 'products'
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                        : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/[0.02]'}`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Gestión de Productos</span>
                  </button>
                )}

                {brand.role === 'owner' && (
                  <button
                    onClick={() => setWarehouseSubTab('collaborators')}
                    className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer
                      ${warehouseSubTab === 'collaborators'
                        ? brand.type === 'aourum'
                          ? 'bg-[#0044CC]/20 text-[#6699FF] border border-[#0044CC]/30'
                          : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                        : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/[0.02]'}`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Mi Equipo</span>
                  </button>
                )}
              </div>

              {/* Subview 1: Insumos Internos */}
              {warehouseSubTab === 'internal' && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-[#6699FF]" />
                    <div>
                      <h3 className="font-bold text-white text-xs uppercase tracking-wider">Insumos de Almacén</h3>
                      <p className="text-[10px] text-slate-500">Control de embalajes, etiquetas y materiales logísticos internos</p>
                    </div>
                  </div>

                  {/* Add Insumo Form */}
                  <form onSubmit={handleAddInternalItem} className="flex flex-col sm:flex-row gap-3 items-end p-4 rounded-xl border border-white/[0.05] bg-white/[0.01]">
                    <div className="flex-1 w-full">
                      <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">Nombre Insumo</label>
                      <input 
                        type="text" 
                        placeholder="Ej. Etiquetas Adhesivas" 
                        value={newItemName} 
                        onChange={e => setNewItemName(e.target.value)}
                        required
                        className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#0044CC]/50 transition-colors" 
                      />
                    </div>
                    <div className="w-full sm:w-28">
                      <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">Stock Inicial</label>
                      <input 
                        type="number" 
                        value={newItemStock} 
                        onChange={e => setNewItemStock(Math.max(0, parseInt(e.target.value) || 0))}
                        required
                        className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0044CC]/50 transition-colors" 
                      />
                    </div>
                    <div className="w-full sm:w-36">
                      <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">Categoría</label>
                      <select 
                        value={newItemCategory} 
                        onChange={e => setNewItemCategory(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0044CC]/50 transition-colors cursor-pointer"
                      >
                        {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <button 
                      type="submit"
                      disabled={creatingInternal || !newItemName.trim()}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all cursor-pointer shrink-0 disabled:opacity-40"
                      style={{
                        background: brand.type === 'aourum'
                          ? 'linear-gradient(135deg, #0044CC 0%, #2266FF 100%)'
                          : 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                    >
                      {creatingInternal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>Agregar</span>
                    </button>
                  </form>

                  {/* Insumos Table */}
                  {loadingInventory ? (
                    <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin text-[#2266FF]" />
                      <p className="text-xs">Cargando insumos...</p>
                    </div>
                  ) : internalInventory.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/10 p-12 text-center bg-white/[0.01]">
                      <Boxes className="w-8 h-8 text-slate-800 mx-auto mb-2" />
                      <p className="text-slate-400 text-xs font-medium">Sin insumos registrados</p>
                      <p className="text-[10px] text-slate-600 mt-1">Agrega materiales arriba para monitorear sus existencias.</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/[0.06] overflow-x-auto bg-black/25">
                      <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                        <thead>
                          <tr className="border-b border-white/[0.06] text-[9px] text-slate-500 uppercase tracking-widest font-bold bg-white/[0.02]">
                            <th className="px-4 py-3">Insumo</th>
                            <th className="px-4 py-3">Categoría</th>
                            <th className="px-4 py-3">Existencia</th>
                            <th className="px-4 py-3 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {internalInventory.map((item) => (
                            <tr key={item.id} className="border-b border-white/[0.04] hover:bg-white/[0.01] transition-colors">
                              <td className="px-4 py-3 font-semibold text-slate-200">{item.name}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Otros']}`}>
                                  {item.category}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => handleUpdateInternalStock(item.id, item.stock, -1)}
                                    className="w-6.5 h-6.5 rounded-lg bg-white/[0.05] hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className={`font-black min-w-[20px] text-center text-sm ${item.stock < 10 ? 'text-amber-400 animate-pulse' : 'text-white'}`}>
                                    {item.stock}
                                  </span>
                                  <button 
                                    onClick={() => handleUpdateInternalStock(item.id, item.stock, 1)}
                                    className="w-6.5 h-6.5 rounded-lg bg-white/[0.05] hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button 
                                  onClick={() => handleDeleteInternalItem(item.id)}
                                  className="w-7 h-7 rounded-lg bg-red-500/[0.08] hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-all cursor-pointer ml-auto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Subview 2: Gestión de Productos (Sólo local) */}
              {brand.type === 'local' && warehouseSubTab === 'products' && (
                <div className="space-y-6">
                  
                  {/* Title */}
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-violet-400" />
                    <div>
                      <h3 className="font-bold text-white text-xs uppercase tracking-wider">Gestión de Catálogo Local</h3>
                      <p className="text-[10px] text-slate-500">Crea y edita productos para la marca independiente "{brand.name}"</p>
                    </div>
                  </div>

                  {/* Add Product Form */}
                  <form onSubmit={handleAddProduct} className="p-5 rounded-xl border border-white/[0.05] bg-white/[0.015] space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      
                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">Nombre del Producto</label>
                        <input 
                          type="text" 
                          placeholder="Ej. Polo Over-sized" 
                          value={newProdName} 
                          onChange={e => setNewProdName(e.target.value)}
                          required
                          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors" 
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">Precio (S/.)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00" 
                          value={newProdPrice} 
                          onChange={e => setNewProdPrice(e.target.value)}
                          required
                          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors" 
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">Categoría</label>
                        <select 
                          value={newProdCategory} 
                          onChange={e => setNewProdCategory(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50 transition-colors cursor-pointer"
                        >
                          {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      
                      <div className="sm:col-span-2">
                        <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">Descripción (Opcional)</label>
                        <input 
                          type="text" 
                          placeholder="Ej. Algodón peruano premium..." 
                          value={newProdDescription} 
                          onChange={e => setNewProdDescription(e.target.value)}
                          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors" 
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">Stock Inicial</label>
                        <input 
                          type="number" 
                          value={newProdStock} 
                          onChange={e => setNewProdStock(Math.max(0, parseInt(e.target.value) || 0))}
                          required
                          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50 transition-colors" 
                        />
                      </div>

                    </div>

                    <div className="flex justify-end pt-2">
                      <button 
                        type="submit"
                        disabled={creatingProduct || !newProdName.trim() || !newProdPrice}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer"
                        style={{ boxShadow: '0 4px 16px rgba(124,58,237,0.35)' }}
                      >
                        {creatingProduct ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        <span>Crear Producto</span>
                      </button>
                    </div>
                  </form>

                  {/* Products List Table */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Productos Registrados</h4>

                    {loadingProducts ? (
                      <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin text-[#2266FF]" />
                        <p className="text-xs">Cargando productos...</p>
                      </div>
                    ) : products.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 p-12 text-center bg-white/[0.01]">
                        <Package className="w-8 h-8 text-slate-800 mx-auto mb-2" />
                        <p className="text-slate-400 text-xs font-medium">Aún no hay productos locales creados</p>
                        <p className="text-[10px] text-slate-600 mt-1">Completa el formulario de arriba para poblar el catálogo de ventas.</p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-white/[0.06] overflow-x-auto bg-black/25">
                        <table className="w-full text-left border-collapse text-xs min-w-[550px]">
                          <thead>
                            <tr className="border-b border-white/[0.06] text-[9px] text-slate-500 uppercase tracking-widest font-bold bg-white/[0.02]">
                              <th className="px-4 py-3">Nombre</th>
                              <th className="px-4 py-3">Categoría</th>
                              <th className="px-4 py-3">Precio</th>
                              <th className="px-4 py-3">Stock</th>
                              <th className="px-4 py-3">Descripción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {products.map((prod) => (
                              <tr key={prod.id} className="border-b border-white/[0.04] hover:bg-white/[0.01] transition-colors">
                                <td className="px-4 py-3 font-semibold text-slate-200">{prod.name}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.07] text-[10px] text-slate-300">
                                    {prod.category || 'Otros'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-bold text-violet-300">S/. {Number(prod.price).toFixed(2)}</td>
                                <td className="px-4 py-3 font-semibold text-white">{prod.stock ?? 0} u.</td>
                                <td className="px-4 py-3 text-slate-500 italic max-w-[200px] truncate">{prod.description || 'Sin descripción'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* Subview 3: Equipo de colaboradores (Owner only) */}
              {brand.role === 'owner' && warehouseSubTab === 'collaborators' && (
                <div className="space-y-6">
                  
                  {/* Title */}
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#6699FF]" />
                    <div>
                      <h3 className="font-bold text-white text-xs uppercase tracking-wider">Equipo de la Marca</h3>
                      <p className="text-[10px] text-slate-500">Agrega personal (staff) que podrá registrar ventas y gestionar el almacén.</p>
                    </div>
                  </div>

                  {/* Feedback notifications */}
                  {collaboratorError && (
                    <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{collaboratorError}</span>
                    </div>
                  )}
                  {collaboratorSuccess && (
                    <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs flex items-center gap-1.5">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{collaboratorSuccess}</span>
                    </div>
                  )}

                  {/* Add collaborator form */}
                  <form onSubmit={handleAddCollaborator} className="flex gap-2 items-end p-4 rounded-xl border border-white/[0.05] bg-white/[0.01]">
                    <div className="flex-1">
                      <label className="block text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">Nombre de Usuario Acon</label>
                      <input 
                        type="text" 
                        placeholder="Ej. pedroperez" 
                        value={newCollaboratorUsername} 
                        onChange={e => setNewCollaboratorUsername(e.target.value)}
                        required
                        className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#0044CC]/50 transition-colors" 
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={addingCollaborator || !newCollaboratorUsername.trim()}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0044CC] to-[#2266FF] text-white text-xs font-bold cursor-pointer shrink-0 disabled:opacity-40 transition-all"
                    >
                      {addingCollaborator ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>Agregar</span>
                    </button>
                  </form>

                  {/* Collaborators List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Colaboradores Activos</h4>

                    {loadingCollaborators ? (
                      <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin text-[#2266FF]" />
                        <p className="text-xs font-medium">Cargando equipo...</p>
                      </div>
                    ) : collaborators.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-4">Aún no has agregado colaboradores a tu equipo.</p>
                    ) : (
                      <div className="rounded-xl border border-white/[0.06] overflow-x-auto bg-black/25">
                        <table className="w-full text-left border-collapse text-xs min-w-[400px]">
                          <thead>
                            <tr className="border-b border-white/[0.06] text-[9px] text-slate-500 uppercase tracking-widest font-bold bg-white/[0.02]">
                              <th className="px-4 py-3">Nombre</th>
                              <th className="px-4 py-3">Usuario</th>
                              <th className="px-4 py-3 text-right">Remover</th>
                            </tr>
                          </thead>
                          <tbody>
                            {collaborators.map((collab) => (
                              <tr key={collab.username} className="border-b border-white/[0.04] hover:bg-white/[0.01] transition-colors">
                                <td className="px-4 py-3 font-semibold text-slate-200">{collab.first_name} {collab.last_name}</td>
                                <td className="px-4 py-3 text-slate-400 font-mono">@{collab.username}</td>
                                <td className="px-4 py-3 text-right">
                                  <button 
                                    onClick={() => handleRemoveCollaborator(collab.username)}
                                    className="w-7 h-7 rounded-lg bg-red-500/[0.08] hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-all cursor-pointer ml-auto"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          )}

        </main>
      </div>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0C0F16]/95 border-t border-white/[0.08] backdrop-blur-xl px-6 py-2 flex items-center justify-around">
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer
            ${activeTab === 'sales' ? 'text-[#6699FF]' : 'text-slate-400'}`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Ventas</span>
        </button>
        
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer
            ${activeTab === 'inventory' ? 'text-[#6699FF]' : 'text-slate-400'}`}
        >
          <Boxes className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Almacén</span>
        </button>
      </nav>

      {/* ── Floating Mobile Cart Drawer Trigger ── */}
      {cart.length > 0 && activeTab === 'sales' && selectedSection && !configuringCatalog && (
        <div className="lg:hidden fixed bottom-16 left-4 right-4 z-40">
          <button
            onClick={() => setShowCartMobile(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-white font-bold text-xs shadow-lg flex-row cursor-pointer"
            style={{
              background: brand.type === 'aourum'
                ? 'linear-gradient(135deg, #0044CC 0%, #2266FF 100%)'
                : 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
            }}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-4.5 h-4.5" />
              <span>{cart.reduce((sum, item) => sum + item.quantity, 0)} items en canasta</span>
            </span>
            <span className="bg-white/15 px-3 py-1 rounded-xl shrink-0">
              Ver canasta · S/. {cartTotal.toFixed(2)}
            </span>
          </button>
        </div>
      )}

      {/* ── Mobile Cart Drawer Sheet ── */}
      {showCartMobile && (
        <div className="lg:hidden fixed inset-0 z-50 overflow-hidden flex items-end">
          {/* Backdrop overlay */}
          <div 
            onClick={() => setShowCartMobile(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
          />
          
          {/* Drawer Sheet */}
          <div 
            className="relative w-full max-h-[85vh] rounded-t-3xl border-t border-white/[0.1] bg-[#0A0D14] p-4 flex flex-col overflow-y-auto space-y-4 transition-transform duration-300 z-10"
            style={{ boxShadow: '0 -10px 40px rgba(0,0,0,0.6)' }}
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#6699FF]" />
                <span className="font-bold text-white text-xs uppercase tracking-wider">Venta activa</span>
              </div>
              <button 
                onClick={() => setShowCartMobile(false)}
                className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px]">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.05] bg-white/[0.02]">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white leading-tight truncate">{item.product.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">S/. {Number(item.product.price).toFixed(2)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => removeFromCart(item.product.id)}
                      className="w-7.5 h-7.5 rounded-lg bg-white/[0.05] flex items-center justify-center text-slate-400 transition-all">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-4 text-center text-xs font-bold text-white">{item.quantity}</span>
                    <button onClick={() => addToCart(item.product)}
                      className="w-7.5 h-7.5 rounded-lg bg-white/[0.05] flex items-center justify-center text-slate-400 transition-all">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {checkoutError && (
              <div className="p-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-[10px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            <div className="border-t border-white/[0.08] pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Venta</span>
                <span className="text-xl font-black text-white">S/. {cartTotal.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => { setCart([]); setShowCartMobile(false); }}
                  className="flex items-center justify-center py-3 rounded-xl border border-red-500/20 text-red-400 text-xs font-medium cursor-pointer"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
                
                <button
                  onClick={handleCheckout}
                  className="col-span-3 py-3 rounded-xl text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
                  style={{
                    background: brand.type === 'aourum'
                      ? 'linear-gradient(135deg, #0044CC 0%, #2266FF 100%)'
                      : 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
                  }}
                >
                  {checkoutSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Registrado</span>
                    </>
                  ) : (
                    <span>Registrar Venta</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.04] py-5 text-center mt-10">
        <p className="text-[11px] text-slate-700 tracking-wide">
          © 2026 Acon · Plataforma de ventas e inventario para marcas independientes
        </p>
      </footer>
    </div>
  );
}
