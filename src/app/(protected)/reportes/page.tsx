import Link from 'next/link'
import { requierePermiso } from '@/lib/permisos'

const REPORTES = [
  {
    href: '/reportes/inventario',
    titulo: 'Inventario valorizado',
    descripcion: 'Todos los productos con stock, costo unitario y valor total del inventario.',
    emoji: '📦',
    gradiente: 'from-indigo-500 to-violet-500',
  },
  {
    href: '/reportes/movimientos',
    titulo: 'Movimientos',
    descripcion: 'Entradas, salidas y ajustes en un rango de fechas, con saldo valorizado.',
    emoji: '🔄',
    gradiente: 'from-amber-500 to-orange-500',
  },
]

export default async function ReportesPage() {
  await requierePermiso('reportes')
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">📈 Reportes</h1>
      <p className="mt-1 text-sm font-medium text-[#64748b] dark:text-slate-400">
        Exporta o imprime la información de tu inventario.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {REPORTES.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="group overflow-hidden rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] shadow-lg shadow-slate-500/5 transition-all hover:-translate-y-1 hover:shadow-xl"
          >
            <div className={`h-2 bg-gradient-to-r ${r.gradiente}`} />
            <div className="p-7">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${r.gradiente} text-2xl text-white shadow-md`}
              >
                {r.emoji}
              </div>
              <h2 className="mt-4 text-lg font-extrabold text-[#1e293b] dark:text-slate-100">{r.titulo}</h2>
              <p className="mt-1 text-sm text-[#64748b] dark:text-slate-400">{r.descripcion}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
