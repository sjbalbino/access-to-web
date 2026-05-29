/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'AgroGestão'
const APP_URL = 'https://sisagro.app/usuarios'

interface Props {
  adminNome?: string
  usuarioNome?: string
  usuarioEmail?: string
}

const CadastroRecebidoAdmin = ({ adminNome, usuarioNome, usuarioEmail }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Novo cadastro aguardando liberação no {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>
          {adminNome ? `Olá, ${adminNome}` : 'Olá, Administrador'}
        </Heading>
        <Text style={text}>
          Um novo usuário se cadastrou no <strong>{SITE_NAME}</strong> e está
          aguardando sua liberação.
        </Text>

        <Section style={card}>
          <Text style={cardLabel}>Nome</Text>
          <Text style={cardValue}>{usuarioNome || '(não informado)'}</Text>
          <Text style={cardLabel}>E-mail</Text>
          <Text style={cardValue}>{usuarioEmail || '—'}</Text>
        </Section>

        <Text style={text}>
          Acesse o painel de usuários para definir a empresa (tenant) e o
          perfil de acesso (Visualizador, Operador, Gerente ou Administrador).
        </Text>

        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={APP_URL} style={button}>
            Liberar acesso
          </Button>
        </Section>

        <Text style={textMuted}>
          Ou copie e cole este endereço no navegador:<br />
          <span style={{ color: '#16a34a' }}>{APP_URL}</span>
        </Text>

        <Text style={footer}>Equipe {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CadastroRecebidoAdmin,
  subject: 'Novo cadastro aguardando liberação no AgroGestão',
  displayName: 'Novo cadastro (admin)',
  previewData: {
    adminNome: 'Maria',
    usuarioNome: 'João Silva',
    usuarioEmail: 'joao@exemplo.com',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const brandBar = { height: '4px', backgroundColor: '#16a34a', borderRadius: '4px', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#14532d', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const textMuted = { fontSize: '12px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 16px', wordBreak: 'break-all' as const }
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
