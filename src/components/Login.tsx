import { useState } from 'react';
import { ArrowRight, Shield } from 'lucide-react';

interface LoginProps {
  onLogin: (name: string) => void;
}

// LISTA DE JUGADORAS (Puedes editar esto con los nombres reales de tu equipo)
const PLAYERS = [
  "Eider Egaña",
  "Helene Altuna",
  "Paula Rubio",
  "Ainhize Antolín",
  "Aintzane Fernándes",
  "Maialen Gómez",
  "Estrella Lorente",
  "Carla Cerain",
  "Iraide Revuelta",
  "Aiala Mugueta",
  "Maialen Garlito",
  "Izaro Rubio",
  "Naroa García",
  "Irati Collantes",
  "Irati Martínez",
  "Ariadna Nayaded",
  "Izaro Tores",
  "Iratxe Balanzategui",
  "Naiara Óliver",
  "Lucía Daisa",
  "Jennifer Ngo",
  "Sofía Martínez",
  "Rania Zaaboul",
  "Erika Nicole",
  "Andrea Egea"
];

export function Login({ onLogin }: LoginProps) {
  const [selectedName, setSelectedName] = useState("");

  const handleSubmit = () => {
    if (selectedName) {
      onLogin(selectedName);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B2149] flex flex-col items-center justify-center p-6 text-center">
      
      {/* Logo / Escudo (Simulado con un icono por ahora) */}
      <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-8 backdrop-blur-sm">
        <Shield className="w-12 h-12 text-white" />
      </div>

      <h1 className="text-white text-3xl font-bold mb-2">Bienvenida</h1>
      <p className="text-blue-200 mb-8">Selecciona tu nombre para entrar</p>

      {/* Selector de Nombre */}
      <div className="w-full max-w-xs space-y-4">
        <select 
          value={selectedName}
          onChange={(e) => setSelectedName(e.target.value)}
          className="w-full p-4 rounded-xl bg-white text-[#0B2149] font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/50 appearance-none text-center"
          style={{ textAlignLast: 'center' }}
        >
          <option value="" disabled>-- Elige tu nombre --</option>
          {PLAYERS.map(player => (
            <option key={player} value={player}>
              {player}
            </option>
          ))}
        </select>

        <button
          onClick={handleSubmit}
          disabled={!selectedName}
          className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            selectedName 
              ? 'bg-[#10B981] text-white shadow-lg active:scale-95' 
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          <span>Entrar</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      <p className="fixed bottom-8 text-white/20 text-xs">
        Deportivo Alavés - Performance Tracker
      </p>
    </div>
  );
}