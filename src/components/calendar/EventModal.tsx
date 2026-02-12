import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { CalendarEvent, EventType, EVENT_LABELS } from '../../types/calendar';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns'; // <--- IMPORTANTE: Importamos esto para arreglar la fecha

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialDate?: Date;
  editingEvent?: CalendarEvent | null;
}

export function EventModal({ isOpen, onClose, onSave, onDelete, initialDate, editingEvent }: EventModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    startTime: '10:00',
    endTime: '11:30',
    type: 'session' as EventType,
    location: 'Ibaia',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingEvent) {
        // MODO EDICIÓN
        setFormData({
          title: editingEvent.title,
          date: editingEvent.date,
          startTime: editingEvent.startTime,
          endTime: editingEvent.endTime,
          type: editingEvent.type,
          location: editingEvent.location,
          notes: editingEvent.notes || ''
        });
      } else {
        // MODO CREACIÓN
        // CORRECCIÓN: Usamos 'format' de date-fns en lugar de .toISOString()
        // Esto asegura que se use la fecha local seleccionada, no la de UTC (día anterior)
        const defaultDate = initialDate 
            ? format(initialDate, 'yyyy-MM-dd') 
            : format(new Date(), 'yyyy-MM-dd');

        setFormData({
          title: '',
          date: defaultDate, // <--- Aquí aplicamos la fecha correcta
          startTime: '10:00',
          endTime: '11:30',
          type: 'session',
          location: 'Ibaia',
          notes: ''
        });
      }
    }
  }, [isOpen, initialDate, editingEvent]);

  const handleTypeChange = (newType: EventType) => {
    let newLocation = ''; 
    
    if (newType === 'session') {
        newLocation = 'Ibaia';
    } else if (newType === 'video') {
        newLocation = 'Sala de Prensa';
    }
    
    setFormData(prev => ({
        ...prev,
        type: newType,
        location: newLocation
    }));
  };

  const isValid = 
    formData.title.trim() !== '' &&
    formData.date !== '' &&
    formData.startTime !== '' &&
    formData.endTime !== '' &&
    formData.location.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent || !onDelete) return;
    if (confirm("¿Seguro que quieres eliminar este evento?")) {
      setLoading(true);
      await onDelete(editingEvent.id);
      onClose();
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle className="text-[#0B2149]">
            {editingEvent ? 'Editar Actividad' : 'Nueva Actividad'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={formData.type} 
                onValueChange={(val) => handleTypeChange(val as EventType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {Object.entries(EVENT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Título</Label>
            <Input 
              placeholder="Ej: Activación + Partido" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Inicio</Label>
              <Input 
                type="time" 
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Fin</Label>
              <Input 
                type="time" 
                value={formData.endTime}
                onChange={(e) => setFormData({...formData, endTime: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Lugar</Label>
            <Input 
              placeholder="Ubicación..." 
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
                Nota Extra <span className="text-xs text-slate-400 font-normal">(Opcional)</span>
            </Label>
            <Textarea 
              placeholder="Detalles adicionales..." 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="resize-none h-20"
            />
          </div>

          <DialogFooter className="flex flex-row justify-between items-center mt-6 w-full">
            
            {/* LADO IZQUIERDO: Papelera ROJA visible */}
            <div>
                {editingEvent && onDelete && (
                    <Button 
                        type="button" 
                        onClick={handleDelete} 
                        disabled={loading}
                        size="icon"
                        title="Eliminar evento"
                        className="bg-red-500 hover:bg-red-600 text-white border-0 shadow-sm" 
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* LADO DERECHO: Botones de acción */}
            <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button 
                    type="submit" 
                    disabled={!isValid || loading} 
                    className={`${!isValid ? 'opacity-50 cursor-not-allowed' : ''} bg-[#0B2149] text-white`}
                >
                    {loading ? 'Guardando...' : 'Guardar'}
                </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}