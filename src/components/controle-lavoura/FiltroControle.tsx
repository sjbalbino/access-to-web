import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useSafras } from "@/hooks/useSafras";
import { useLavouras } from "@/hooks/useLavouras";

interface FiltroControleProps {
  safraId: string | null;
  lavouraId: string | null;
  onSafraChange: (value: string | null) => void;
  onLavouraChange: (value: string | null) => void;
}

export function FiltroControle({ safraId, lavouraId, onSafraChange, onLavouraChange }: FiltroControleProps) {
  const { data: safras } = useSafras();
  const { data: lavouras } = useLavouras();

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-lg border">
      <div className="flex-1 space-y-2">
        <Label htmlFor="safra-filter">Safra</Label>
        <Select 
          value={safraId || "all"} 
          onValueChange={(value) => onSafraChange(value === "all" ? null : value)}
        >
          <SelectTrigger id="safra-filter">
            <SelectValue placeholder="Todas as safras" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as safras</SelectItem>
            {safras?.map((safra) => (
              <SelectItem key={safra.id} value={safra.id}>
                {safra.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 space-y-2">
        <Label htmlFor="lavoura-filter">Lavoura</Label>
        <Select 
          value={lavouraId || "all"} 
          onValueChange={(value) => onLavouraChange(value === "all" ? null : value)}
        >
          <SelectTrigger id="lavoura-filter">
            <SelectValue placeholder="Todas as lavouras" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as lavouras</SelectItem>
            {lavouras?.map((lavoura) => (
              <SelectItem key={lavoura.id} value={lavoura.id}>
                {lavoura.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
