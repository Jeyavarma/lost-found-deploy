import emailjs from '@emailjs/browser'

interface EmailNotification {
  to: string
  toName: string
  subject: string
  message: string
  itemTitle?: string
  itemId?: string
  matchScore?: number
}

export class EmailService {
  private static instance: EmailService
  private initialized = false

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  async initialize() {
    if (this.initialized) return

    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY

    if (!serviceId || !publicKey) {
      console.warn('EmailJS not configured - email notifications disabled')
      return
    }

    emailjs.init(publicKey)
    this.initialized = true
  }

  async sendMatchNotification(notification: EmailNotification): Promise<boolean> {
    await this.initialize()
    if (!this.initialized) return false

    try {
      const templateParams = {
        to_email: notification.to,
        to_name: notification.toName,
        subject: notification.subject,
        message: notification.message,
        item_title: notification.itemTitle,
        item_id: notification.itemId,
        match_score: notification.matchScore,
        app_url: window.location.origin
      }

      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
        templateParams
      )

      return true
    } catch (error) {
      console.error('Failed to send email notification:', error)
      return false
    }
  }

  async sendItemMatchAlert(userEmail: string, userName: string, matchedItem: any): Promise<boolean> {
    return this.sendMatchNotification({
      to: userEmail,
      toName: userName,
      subject: `Potential Match Found for Your ${matchedItem.status} Item`,
      message: `We found a potential match for your ${matchedItem.status} item "${matchedItem.title}". Check your dashboard to view details and contact the reporter.`,
      itemTitle: matchedItem.title,
      itemId: matchedItem._id,
      matchScore: matchedItem.matchScore
    })
  }

  async sendClaimNotification(userEmail: string, userName: string, claimedItem: any): Promise<boolean> {
    return this.sendMatchNotification({
      to: userEmail,
      toName: userName,
      subject: `Someone Claimed Your Found Item`,
      message: `Someone has claimed your found item "${claimedItem.title}". Please check your dashboard to coordinate the return.`,
      itemTitle: claimedItem.title,
      itemId: claimedItem._id
    })
  }

  async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    return this.sendMatchNotification({
      to: userEmail,
      toName: userName,
      subject: 'Welcome to MCC Lost & Found',
      message: `Welcome to the MCC Lost & Found system! You can now report lost items, browse found items, and get notified about potential matches.`
    })
  }
}

export const emailService = EmailService.getInstance()