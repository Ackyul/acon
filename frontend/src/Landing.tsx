import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ShoppingBag,
  Boxes,
  BarChart3,
  Link2,
  Sparkles,
  Check,
} from 'lucide-react';

const FEATURES = [
  {
    icon: ShoppingBag,
    title: 'Ventas en Feria',
    desc: 'Registra ventas en tiempo real durante ferias y eventos. Carrito rápido con catálogo de tu marca.',
    color: '#0044CC',
    glow: 'rgba(0,68,204,0.15)',
  },
  {
    icon: Boxes,
    title: 'Almacén & Insumos',
    desc: 'Controla stickers, sobres, empaques y materiales logísticos de tu operación día a día.',
    color: '#7C3AED',
    glow: 'rgba(124,58,237,0.15)',
  },
  {
    icon: BarChart3,
    title: 'Historial & Reportes',
    desc: 'Consulta el historial de ventas, totales acumulados y métricas por sesión de feria.',
    color: '#059669',
    glow: 'rgba(5,150,105,0.15)',
  },
  {
    icon: Link2,
    title: 'Catálogo de Aourum',
    desc: 'Conecta tu marca de Aourum al instante. Sin crear una cuenta adicional, solo vincula con un clic.',
    color: '#D97706',
    glow: 'rgba(217,119,6,0.15)',
  },
];

const PERKS = [
  'Sin cuenta de Aourum requerida',
  'Catálogo en tiempo real',
  'Control de insumos de almacén',
  'Historial de ventas por sesión',
  'Diseño optimizado para feria',
  'Funciona con cualquier marca',
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen bg-[#080A10] text-slate-100 flex flex-col overflow-x-hidden"
      style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
    >
      {/* ── Ambient blobs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-60 -left-60 w-[800px] h-[800px] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #0044CC 0%, transparent 65%)' }}
        />
        <div
          className="absolute top-1/3 -right-80 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #2266FF 0%, transparent 65%)' }}
        />
        <div
          className="absolute -bottom-60 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 65%)' }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Navbar ── */}
      <header
        className="relative z-40 border-b border-white/[0.05] backdrop-blur-xl px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full"
        style={{ background: 'transparent' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="relative w-9 h-9 rounded-xl flex items-center justify-center font-black text-base text-white select-none"
            style={{
              background: 'linear-gradient(135deg, #0044CC 0%, #2266FF 100%)',
              boxShadow: '0 0 24px rgba(0,68,204,0.5)',
            }}
          >
            A
            <div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%)' }}
            />
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-[0.15em] text-white leading-tight">ACON</p>
            <p className="text-[10px] text-slate-500 tracking-wide leading-tight">VENTAS · ALMACÉN</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/auth')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer"
          style={{
            background: 'rgba(0,68,204,0.15)',
            border: '1px solid rgba(0,68,204,0.35)',
          }}
        >
          Ingresar
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 max-w-4xl mx-auto w-full">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium mb-8 border"
          style={{
            background: 'rgba(0,68,204,0.08)',
            borderColor: 'rgba(0,68,204,0.3)',
            color: '#6699FF',
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Plataforma de control para marcas independientes
        </div>

        {/* Headline */}
        <h1
          className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6"
          style={{
            background: 'linear-gradient(135deg, #ffffff 30%, rgba(255,255,255,0.5) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Controla tus ventas<br />
          <span
            style={{
              background: 'linear-gradient(135deg, #2266FF 0%, #6699FF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            desde cualquier feria.
          </span>
        </h1>

        <p className="text-base md:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed mb-10">
          Acon conecta el catálogo de tu marca con un sistema de ventas en tiempo real e inventario de insumos — todo en un solo lugar, sin complicaciones.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            id="cta-enter"
            onClick={() => navigate('/auth')}
            className="group flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold text-base transition-all duration-200 cursor-pointer relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #0044CC 0%, #2266FF 100%)',
              boxShadow: '0 8px 40px rgba(0,68,204,0.4)',
            }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 60%)' }}
            />
            <span className="relative">Ingresar a ACON</span>
            <ArrowRight className="relative w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <p className="text-xs text-slate-600">Sin tarjeta. Sin Aourum account.</p>
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section className="relative z-10 max-w-6xl mx-auto w-full px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {FEATURES.map(({ icon: Icon, title, desc, color, glow }) => (
            <div
              key={title}
              className="p-5 rounded-2xl border border-white/[0.06] hover:border-white/[0.1] transition-all group"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: glow }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <h3 className="font-bold text-white text-sm mb-1.5">{title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Perks strip */}
        <div
          className="rounded-2xl border border-white/[0.06] p-6"
          style={{ background: 'rgba(0,68,204,0.04)' }}
        >
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-4 text-center">
            Incluido en Acon
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PERKS.map((perk) => (
              <div key={perk} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#0044CC]/20 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-[#6699FF]" />
                </div>
                <span className="text-xs text-slate-400">{perk}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.04] py-6 text-center">
        <p className="text-[11px] text-slate-600 tracking-wide">
          © 2026 Acon · Plataforma de ventas e inventario para marcas independientes
        </p>
        <p className="text-[11px] text-slate-500 tracking-wide mt-1.5">
          Creado por{' '}
          <a
            href="https://ackyul.github.io/yoshuanunez.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-300 hover:text-white font-semibold underline underline-offset-2 transition-colors"
          >
            Yoshua Josafat Núñez Huaccoto
          </a>{' '}
          ·{' '}
          <a
            href="https://ackyul.github.io/yoshuanunez.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D97706] hover:text-[#F59E0B] font-semibold transition-colors"
          >
            Ackyul
          </a>
        </p>
        <p className="text-[10px] text-slate-600 tracking-wide mt-1">
          Arequipa, Perú
        </p>
      </footer>
    </div>
  );
}
