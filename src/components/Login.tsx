
import { useState } from 'react';
import { ArrowRight, Shield, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface LoginProps {
  onLogin: (name: string, role: 'player' | 'staff') => void;
}

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
  const [isStaffLogin, setIsStaffLogin] = useState(false); // ¿Está intentando entrar el staff?
  const [selectedName, setSelectedName] = useState("");
  const [password, setPassword] = useState("");

  const handlePlayerLogin = () => {
    if (selectedName) {
      onLogin(selectedName, 'player');
    }
  };

  const handleStaffLogin = () => {
    // AQUÍ DEFINES LA CONTRASEÑA DEL STAFF
    if (password === "1921") {
      onLogin("Mister", 'staff');
    } else {
      toast.error("Contraseña incorrecta");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B2149] flex flex-col items-center justify-center p-6 text-center">
      
      {/* Escudo */}
      <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-8 backdrop-blur-sm border border-white/20">
        {isStaffLogin ? <Lock className="w-10 h-10 text-white" /> : <Shield className="w-12 h-12 text-white" />}
      </div>

      <h1 className="text-white text-3xl font-bold mb-2">
        {isStaffLogin ? "Acceso Staff" : "Bienvenida"}
      </h1>
      <p className="text-blue-200 mb-8">
        {isStaffLogin ? "Introduce el código de acceso" : "Selecciona tu nombre para entrar"}
      </p>

      <div className="w-full max-w-xs space-y-4">
        
        {/* FORMULARIO JUGADORA */}
        {!isStaffLogin && (
          <>
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
              onClick={handlePlayerLogin}
              disabled={!selectedName}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                selectedName 
                  ? 'bg-[#10B981] text-white shadow-lg active:scale-95' 
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              <span>Entrar como Jugadora</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* FORMULARIO STAFF */}
        {isStaffLogin && (
          <>
            <input 
              type="password"
              placeholder="Código de acceso"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 rounded-xl bg-white text-[#0B2149] font-medium focus:outline-none text-center placeholder:text-gray-400"
            />
            <button
              onClick={handleStaffLogin}
              className="w-full py-4 rounded-xl font-bold bg-white text-[#0B2149] shadow-lg active:scale-95 hover:bg-gray-50 transition-colors"
            >
              Entrar al Panel
            </button>
          </>
        )}

        {/* BOTÓN PARA CAMBIAR ENTRE MODOS */}
        <button 
          onClick={() => {
            setIsStaffLogin(!isStaffLogin);
            setPassword("");
            setSelectedName("");
          }}
          className="text-white/40 text-sm hover:text-white mt-6 underline decoration-dashed underline-offset-4"
        >
          {isStaffLogin ? "Soy jugadora" : "¿Eres del cuerpo técnico?"}
        </button>

      </div>
    </div>
  );
}