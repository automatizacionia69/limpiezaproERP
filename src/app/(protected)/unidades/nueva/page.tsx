import { requierePermiso } from '@/lib/permisos'
import { UnidadForm } from './unidad-form'

export default async function NuevaUnidadPage() {
  await requierePermiso('productos')
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">📏 Nueva unidad de medida</h1>
      <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-8 shadow-lg shadow-slate-500/5">
        <UnidadForm />
      </div>
    </div>
  )
}
