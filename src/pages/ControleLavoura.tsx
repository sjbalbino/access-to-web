import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FiltroControle } from '@/components/controle-lavoura/FiltroControle';
import { PlantiosTab } from '@/components/controle-lavoura/PlantiosTab';
import { AplicacoesTab } from '@/components/controle-lavoura/AplicacoesTab';
import { ColheitasTab } from '@/components/controle-lavoura/ColheitasTab';
import { Sprout, Droplets, Bug, Leaf, Skull, SprayCan, Wheat } from 'lucide-react';

export default function ControleLavoura() {
  const [safraId, setSafraId] = useState<string | null>(null);
  const [lavouraId, setLavouraId] = useState<string | null>(null);

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Controle de Lavoura"
          description="Gerencie plantios, aplicações e colheitas por safra e lavoura"
        />

        <FiltroControle
          safraId={safraId}
          lavouraId={lavouraId}
          onSafraChange={setSafraId}
          onLavouraChange={setLavouraId}
        />

        <Tabs defaultValue="plantios" className="w-full">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
            <TabsTrigger value="plantios" className="gap-2">
              <Sprout className="h-4 w-4 hidden sm:inline" />
              <span>Plantios</span>
            </TabsTrigger>
            <TabsTrigger value="adubacao" className="gap-2">
              <Droplets className="h-4 w-4 hidden sm:inline" />
              <span>Adubação</span>
            </TabsTrigger>
            <TabsTrigger value="herbicidas" className="gap-2">
              <Leaf className="h-4 w-4 hidden sm:inline" />
              <span>Herbicidas</span>
            </TabsTrigger>
            <TabsTrigger value="fungicidas" className="gap-2">
              <Bug className="h-4 w-4 hidden sm:inline" />
              <span>Fungicidas</span>
            </TabsTrigger>
            <TabsTrigger value="inseticidas" className="gap-2">
              <Skull className="h-4 w-4 hidden sm:inline" />
              <span>Inseticidas</span>
            </TabsTrigger>
            <TabsTrigger value="dessecacao" className="gap-2">
              <SprayCan className="h-4 w-4 hidden sm:inline" />
              <span>Dessecação</span>
            </TabsTrigger>
            <TabsTrigger value="colheita" className="gap-2">
              <Wheat className="h-4 w-4 hidden sm:inline" />
              <span>Colheita</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plantios" className="mt-6">
            <PlantiosTab safraId={safraId} lavouraId={lavouraId} />
          </TabsContent>

          <TabsContent value="adubacao" className="mt-6">
            <AplicacoesTab tipo="adubacao" safraId={safraId} lavouraId={lavouraId} />
          </TabsContent>

          <TabsContent value="herbicidas" className="mt-6">
            <AplicacoesTab tipo="herbicida" safraId={safraId} lavouraId={lavouraId} />
          </TabsContent>

          <TabsContent value="fungicidas" className="mt-6">
            <AplicacoesTab tipo="fungicida" safraId={safraId} lavouraId={lavouraId} />
          </TabsContent>

          <TabsContent value="inseticidas" className="mt-6">
            <AplicacoesTab tipo="inseticida" safraId={safraId} lavouraId={lavouraId} />
          </TabsContent>

          <TabsContent value="dessecacao" className="mt-6">
            <AplicacoesTab tipo="dessecacao" safraId={safraId} lavouraId={lavouraId} />
          </TabsContent>

          <TabsContent value="colheita" className="mt-6">
            <ColheitasTab safraId={safraId} lavouraId={lavouraId} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
