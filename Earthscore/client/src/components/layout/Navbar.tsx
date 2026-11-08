import { Globe, Headphones, Info } from "lucide-react";

function Navbar() {
  return (
    <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
      <div className="flex items-center gap-2">
        <Globe className="text-cyan-400" size={28} />
        <h1 className="text-xl font-bold text-white">
          Earth<span className="text-cyan-400">Jukebox</span>
        </h1>
      </div>

      <div className="flex gap-8 text-gray-300">
        <a href="#" className="hover:text-cyan-400">Explore</a>
        <a href="#" className="hover:text-cyan-400 flex gap-2">
          <Headphones size={18} /> Sonification
        </a>
        <a href="#" className="hover:text-cyan-400 flex gap-2">
          <Info size={18} /> About
        </a>
      </div>
    </nav>
  );
}

export default Navbar;