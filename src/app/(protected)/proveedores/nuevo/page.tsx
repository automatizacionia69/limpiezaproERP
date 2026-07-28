import { ProveedorForm } from './proveedor-form'

export default function NuevoProveedorPage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold text-[#1e293b]">Agregar proveedor</h1>
      <div className="mt-5 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,.06)]">
        <ProveedorForm />
      </div>
    </div>
  )
}
