import { UsuarioForm } from './usuario-form'

export default function NuevoUsuarioPage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-extrabold text-[#1e293b]">👥 Nuevo usuario</h1>
      <div className="mt-5 rounded-3xl border-2 border-[#e2e8f0] bg-white p-8 shadow-lg shadow-slate-500/5">
        <UsuarioForm />
      </div>
    </div>
  )
}
