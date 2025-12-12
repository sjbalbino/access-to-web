import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CabecalhoControle } from '@/components/controle-lavoura/CabecalhoControle';
import { PlantiosTab } from '@/components/controle-lavoura/PlantiosTab';
import { AplicacoesTab } from '@/components/controle-lavoura/AplicacoesTab';
import { ColheitasTab } from '@/components/controle-lavoura/ColheitasTab';
import { InsetosTab } from '@/components/controle-lavoura/InsetosTab';
import { ChuvasTab } from '@/components/controle-lavoura/ChuvasTab';
import { PlantasInvasorasTab } from '@/components/controle-lavoura/PlantasInvasorasTab';
import { FloracaoTab } from '@/components/controle-lavoura/FloracaoTab';
import { AnaliseTab } from '@/components/controle-lavoura/AnaliseTab';
import { PivosTab } from '@/components/controle-lavoura/PivosTab';
import { ControleLavoura as ControleLavouraType } from '@/hooks/useControleLavouras';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Wheat, Sprout, Droplets, Leaf, Bug, Skull, SprayCan, 
  Beaker, Pill, FlaskConical, Mountain, BugOff, CloudRain, 
  TreeDeciduous, Flower2, TestTube, CircleDot 
} from 'lucide-react';

export default function ControleLavoura() {
  const { canEdit } = useAuth();
  const [safraId, setSafraId] = useState<string | null>(null);
  const [lavouraId, setLavouraId] = useState<string | null>(null);
  const [controleLavoura, setControleLavoura] = useState<ControleLavouraType | null>(null);

  const controleLavouraId = controleLavoura?.id || null;

  return (
    <AppLayout>
      <div className="space-y-4">
        <PageHeader
          title="Controle de Lavoura"
          description="Gerencie plantios, aplicações e colheitas por safra e lavoura"
        />

        {/* Cabeçalho Mestre */}
        <CabecalhoControle
          safraId={safraId}
          lavouraId={lavouraId}
          onSafraChange={setSafraId}
          onLavouraChange={setLavouraId}
          controleLavoura={controleLavoura}
          onControleLavouraChange={setControleLavoura}
          canEdit={canEdit}
        />

        {/* Abas de Detalhes */}
        <Tabs defaultValue="colheita" className="w-full">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex h-10 w-max">
              <TabsTrigger value="colheita" className="gap-1.5 text-xs">
                <Wheat className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Colheita</span>
              </TabsTrigger>
              <TabsTrigger value="plantios" className="gap-1.5 text-xs">
                <Sprout className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Plantios</span>
              </TabsTrigger>
              <TabsTrigger value="adubacao" className="gap-1.5 text-xs">
                <Droplets className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Adubos</span>
              </TabsTrigger>
              <TabsTrigger value="herbicidas" className="gap-1.5 text-xs">
                <Leaf className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Herbicidas</span>
              </TabsTrigger>
              <TabsTrigger value="fungicidas" className="gap-1.5 text-xs">
                <Bug className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Fungicidas</span>
              </TabsTrigger>
              <TabsTrigger value="inseticidas" className="gap-1.5 text-xs">
                <Skull className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Inseticidas</span>
              </TabsTrigger>
              <TabsTrigger value="adjuvantes" className="gap-1.5 text-xs">
                <Beaker className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Adjuvantes</span>
              </TabsTrigger>
              <TabsTrigger value="micronutrientes" className="gap-1.5 text-xs">
                <Pill className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Micronut.</span>
              </TabsTrigger>
              <TabsTrigger value="inoculantes" className="gap-1.5 text-xs">
                <FlaskConical className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Inoculantes</span>
              </TabsTrigger>
              <TabsTrigger value="calcarios" className="gap-1.5 text-xs">
                <Mountain className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Calcários</span>
              </TabsTrigger>
              <TabsTrigger value="insetos" className="gap-1.5 text-xs">
                <BugOff className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Insetos</span>
              </TabsTrigger>
              <TabsTrigger value="chuvas" className="gap-1.5 text-xs">
                <CloudRain className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Chuvas</span>
              </TabsTrigger>
              <TabsTrigger value="invasoras" className="gap-1.5 text-xs">
                <TreeDeciduous className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Pl.Invasoras</span>
              </TabsTrigger>
              <TabsTrigger value="floracao" className="gap-1.5 text-xs">
                <Flower2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Floração</span>
              </TabsTrigger>
              <TabsTrigger value="analise" className="gap-1.5 text-xs">
                <TestTube className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Análise</span>
              </TabsTrigger>
              <TabsTrigger value="pivos" className="gap-1.5 text-xs">
                <CircleDot className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Pivôs</span>
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <div className="mt-4">
            <TabsContent value="colheita">
              <ColheitasTab safraId={safraId} lavouraId={lavouraId} />
            </TabsContent>
            <TabsContent value="plantios">
              <PlantiosTab safraId={safraId} lavouraId={lavouraId} />
            </TabsContent>
            <TabsContent value="adubacao">
              <AplicacoesTab tipo="adubacao" safraId={safraId} lavouraId={lavouraId} />
            </TabsContent>
            <TabsContent value="herbicidas">
              <AplicacoesTab tipo="herbicida" safraId={safraId} lavouraId={lavouraId} />
            </TabsContent>
            <TabsContent value="fungicidas">
              <AplicacoesTab tipo="fungicida" safraId={safraId} lavouraId={lavouraId} />
            </TabsContent>
            <TabsContent value="inseticidas">
              <AplicacoesTab tipo="inseticida" safraId={safraId} lavouraId={lavouraId} />
            </TabsContent>
            <TabsContent value="adjuvantes">
              <AplicacoesTab tipo="adjuvante" safraId={safraId} lavouraId={lavouraId} />
            </TabsContent>
            <TabsContent value="micronutrientes">
              <AplicacoesTab tipo="micronutriente" safraId={safraId} lavouraId={lavouraId} />
            </TabsContent>
            <TabsContent value="inoculantes">
              <AplicacoesTab tipo="inoculante" safraId={safraId} lavouraId={lavouraId} />
            </TabsContent>
            <TabsContent value="calcarios">
              <AplicacoesTab tipo="calcario" safraId={safraId} lavouraId={lavouraId} />
            </TabsContent>
            <TabsContent value="insetos">
              <InsetosTab controleLavouraId={controleLavouraId} canEdit={canEdit} />
            </TabsContent>
            <TabsContent value="chuvas">
              <ChuvasTab controleLavouraId={controleLavouraId} canEdit={canEdit} />
            </TabsContent>
            <TabsContent value="invasoras">
              <PlantasInvasorasTab controleLavouraId={controleLavouraId} canEdit={canEdit} />
            </TabsContent>
            <TabsContent value="floracao">
              <FloracaoTab controleLavouraId={controleLavouraId} canEdit={canEdit} />
            </TabsContent>
            <TabsContent value="analise">
              <AnaliseTab controleLavouraId={controleLavouraId} canEdit={canEdit} />
            </TabsContent>
            <TabsContent value="pivos">
              <PivosTab controleLavouraId={controleLavouraId} canEdit={canEdit} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AppLayout>
  );
}
