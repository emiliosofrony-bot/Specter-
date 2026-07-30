export const queryKeys = {
  profile: ['profile'] as const,
  casos: ['casos'] as const,
  caso: (id: string) => ['casos', id] as const,
  documentosByCaso: (casoId: string) => ['documentos', 'byCaso', casoId] as const,
  documento: (id: string) => ['documentos', id] as const,
  signedPdfUrl: (path: string) => ['documentos', 'signedUrl', path] as const,
  pagos: ['pagos'] as const,
  pago: (id: string) => ['pagos', id] as const,
  expedientes: ['expedientes'] as const,
  invitaciones: ['invitaciones'] as const,
}
