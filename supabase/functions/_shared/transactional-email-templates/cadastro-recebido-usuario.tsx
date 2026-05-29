/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'AgroGestão'

interface Props {
  nome?: string
}

const CadastroRecebidoUsuario = ({ nome }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Recebemos seu cadastro no {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>
          {nome ? `Olá, ${nome}!` : 'Olá!'}
        </Heading>
        <Text style={text}>
          Recebemos seu cadastro no <strong>{SITE_NAME}</strong> — Sistema de
          Gerenciamento Agropecuário.
        </Text>
        <Text style={text}>
          Seu acesso está <strong>aguardando liberação</strong> por um
          administrador. Assim que sua conta for aprovada, você receberá um
          novo e-mail com a confirmação e poderá entrar no sistema.
        </Text>
        <Text style={textMuted}>
          Não é necessária nenhuma ação da sua parte neste momento.
        </Text>
        <Text style={footer}>Atenciosamente,<br />Equipe {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CadastroRecebidoUsuario,
  subject: 'Cadastro recebido — aguardando liberação',
  displayName: 'Cadastro recebido (usuário)',
  previewData: { nome: 'João Silva' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const brandBar = { height: '4px', backgroundColor: '#16a34a', borderRadius: '4px', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#14532d', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 16px' }
const textMuted = { fontSize: '13px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 24px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '32px 0 0' }
