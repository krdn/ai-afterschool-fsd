declare module "resend" {
  type SendEmailOptions = {
    from: string
    to: string | string[]
    subject: string
    html?: string
    text?: string
  }

  export class Resend {
    constructor(apiKey?: string)
    emails: {
      send(options: SendEmailOptions): Promise<unknown>
    }
  }
}
