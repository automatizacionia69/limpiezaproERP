import { requiereAdmin } from '@/lib/permisos'
import { UsuarioForm } from './usuario-form'

export default async function NuevoUsuarioPage() {
  await requiereAdmin()
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-[#1e293b] dark:text-slate-100">👥 Nuevo usuario</h1>
      <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] dark:border-slate-700 bg-white dark:bg-[#141a2e] p-8 shadow-lg shadow-slate-500/5">
        <UsuarioForm />
      </div>
    </div>
  )
}
