/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'AgroGestão'
const APP_URL = 'https://sisagro.app/auth'

interface Props {
  nome?: string
  empresa?: string
  nivel?: string
}

const AcessoLiberado = ({ nome, empresa, nivel }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu acesso ao {SITE_NAME} foi liberado</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>
          {nome ? `Bem-vindo(a), ${nome}!` : 'Bem-vindo(a)!'}
        </Heading>
        <Text style={text}>
          Seu acesso ao <strong>{SITE_NAME}</strong> — Sistema de Gerenciamento
          Agropecuário foi <strong>liberado</strong>. Você já pode entrar
          no sistema.
        </Text>

        <Section style={card}>
          <Text style={cardLabel}>Empresa</Text>
          <Text style={cardValue}>{empresa || '—'}</Text>
          <Text style={cardLabel}>Perfil de acesso</Text>
          <Text style={cardValue}>{nivel || '—'}</Text>
        </Section>

        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={APP_URL} style={button}>
            Acessar o sistema
          </Button>
        </Section>

        <Text style={textMuted}>
          Ou copie e cole este endereço no navegador:<br />
          <span style={{ color: '#16a34a' }}>{APP_URL}</span>
        </Text>

        <Text style={text}>
          Em caso de dúvidas sobre permissões ou o uso do sistema, entre em
          contato com o administrador da sua empresa.
        </Text>

        <Text style={footer}>Boas colheitas!<br />Equipe {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AcessoLiberado,
  subject: 'Seu acesso ao AgroGestão foi liberado',
  displayName: 'Acesso liberado',
  previewData: {
    nome: 'João Silva',
    empresa: 'Fazenda Boa Vista',
    nivel: 'Operador',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const brandBar = { height: '4px', backgroundColor: '#16a34a', borderRadius: '4px', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#14532d', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const textMuted = { fontSize: '12px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 20px', wordBreak: 'break-all' as const }
const card = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '0 0 20px',
}
const cardLabel = { fontSize: '11px', color: '#15803d', textTransform: 'uppercase' as const, fontWeight: 'bold', letterSpacing: '0.5px', margin: '0 0 2px' }
const cardValue = { fontSize: '15px', color: '#111827', margin: '0 0 12px', fontWeight: 500 }
const button = {
  backgroundColor: '#16a34a',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '15px',
  fontWeight: 'bold',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#9ca3af', margin: '32px 0 0' }
