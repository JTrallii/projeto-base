import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0b1120]/50 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm text-white/40">
            &copy; {new Date().getFullYear()} Template. Todos os direitos reservados.
          </p>
          <p className="text-sm text-white/30 flex items-center gap-1">
            Feito com <Heart size={14} className="text-red-400" /> usando Next.js + Supabase
          </p>
        </div>
      </div>
    </footer>
  );
}