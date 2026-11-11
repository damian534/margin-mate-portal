import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  brokerName?: string
  documentTitle?: string
  clientName?: string
  completedAt?: string
  documentUrl?: string
}

const Email = ({ brokerName, documentTitle = 'Loan document', clientName, completedAt, documentUrl = 'https://connect.margin.com.au/admin' }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>All parties have signed {documentTitle}.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Margin Connect</Text>
        <Heading style={heading}>Document fully signed</Heading>
        <Text>Hi {brokerName || 'there'},</Text>
        <Text>All parties have signed <strong>{documentTitle}</strong>{clientName ? <> for <strong>{clientName}</strong></> : null}.</Text>
        {completedAt ? <Text>Completed: {completedAt}</Text> : null}
        <Text>The signed document and signature certificate are available in Connect.</Text>
        <Button href={documentUrl} style={button}>View in Connect</Button>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) => `Fully signed: ${data.documentTitle || 'Loan document'}${data.clientName ? ` — ${data.clientName}` : ''}`,
  displayName: 'Document signed by all parties',
  previewData: { brokerName: 'Damian', documentTitle: 'Loan authority', clientName: 'Alex Smith', completedAt: '11 November 2026, 8:19 pm AEDT' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', color: '#1a1a1a', fontFamily: 'Poppins, Arial, sans-serif' }
const container = { maxWidth: '600px', padding: '32px 24px' }
const brand = { color: '#d72d27', fontSize: '18px', fontWeight: '600' }
const heading = { fontSize: '24px' }
const button = { backgroundColor: '#d72d27', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', marginTop: '16px' }