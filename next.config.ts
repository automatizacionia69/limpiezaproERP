import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        // Consulta de Cotizaciones carga esta página en un iframe oculto
        // (mismo origen) para descargar/imprimir sin abrir pestaña nueva —
        // X-Frame-Options:DENY se lo bloqueaba incluso siendo el propio
        // origen. Se relaja solo aquí a SAMEORIGIN: sigue bloqueando que
        // CUALQUIER OTRO sitio la enmarque (la protección contra
        // clickjacking se mantiene), solo permite que la propia app lo haga.
        source: "/cotizaciones/:id",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
};

export default nextConfig;
