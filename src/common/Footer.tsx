export default function Footer() {
    return (
        <footer className="border-t border-slate-100 bg-slate-50/50 py-8 text-center mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm tracking-wide">Waiot FIUBA</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-xs text-slate-500 font-medium">Soluciones de Gemelo Digital</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                    Copyright © 2026 Waiot FIUBA. Todos los derechos reservados.
                </p>
            </div>
        </footer>
    )
}