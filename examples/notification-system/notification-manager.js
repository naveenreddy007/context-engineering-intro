// Notification System for Event Management
// Demonstrates email/SMS integration, template processing, and notification queuing

class NotificationManager {
  constructor(config) {
    this.emailProvider = config.emailProvider; // 'sendgrid' or 'mailgun'
    this.smsProvider = config.smsProvider; // 'twilio' or 'textlocal'
    this.whatsappProvider = config.whatsappProvider; // 'twilio' or 'whatsapp-business'
    this.apiKeys = config.apiKeys;
    this.templates = new Map();
    this.notificationQueue = [];
    this.deliveryStatus = new Map();
    this.initializeDefaultTemplates();
  }

  initializeDefaultTemplates() {
    // Email Templates
    this.addTemplate({
      id: 'wedding_invitation',
      type: 'email',
      subject: 'Wedding Invitation - {{bride_name}} & {{groom_name}}',
      body: `Dear {{guest_name}},

We are delighted to invite you to the wedding ceremony of {{bride_name}} and {{groom_name}}.

Event Details:
📅 Date: {{wedding_date}}
🕐 Time: {{wedding_time}}
📍 Venue: {{venue_name}}
       {{venue_address}}

Dress Code: {{dress_code}}
Meal: {{meal_type}}

Your presence would make our special day even more memorable.

Please confirm your attendance by {{rsvp_date}} by replying to this email or calling {{contact_number}}.

With warm regards,
{{family_name}}

For any queries, please contact:
📞 {{contact_number}}
📧 {{contact_email}}`,
      variables: ['guest_name', 'bride_name', 'groom_name', 'wedding_date', 'wedding_time', 'venue_name', 'venue_address', 'dress_code', 'meal_type', 'rsvp_date', 'family_name', 'contact_number', 'contact_email'],
      language: 'english'
    });

    this.addTemplate({
      id: 'task_assignment',
      type: 'email',
      subject: 'Task Assignment - {{event_name}}',
      body: `Dear {{vendor_name}},

You have been assigned the following task for the event: {{event_name}}

Task Details:
📋 Task: {{task_name}}
📝 Description: {{task_description}}
📅 Due Date: {{due_date}}
⏰ Estimated Time: {{estimated_hours}} hours
📍 Location: {{venue_name}}

Priority: {{priority}}

Required Materials:
{{materials_list}}

Please confirm receipt of this assignment and update the status in the system.

Event Manager: {{manager_name}}
Contact: {{manager_contact}}

Login to the system: {{system_url}}`,
      variables: ['vendor_name', 'event_name', 'task_name', 'task_description', 'due_date', 'estimated_hours', 'venue_name', 'priority', 'materials_list', 'manager_name', 'manager_contact', 'system_url'],
      language: 'english'
    });

    this.addTemplate({
      id: 'payment_reminder',
      type: 'email',
      subject: 'Payment Reminder - {{event_name}}',
      body: `Dear {{client_name}},

This is a friendly reminder regarding the pending payment for your event: {{event_name}}

Payment Details:
💰 Amount Due: ₹{{amount_due}}
📅 Due Date: {{payment_due_date}}
📋 Invoice Number: {{invoice_number}}

Event Details:
📅 Event Date: {{event_date}}
📍 Venue: {{venue_name}}

Payment Methods:
🏦 Bank Transfer: {{bank_details}}
💳 Online Payment: {{payment_link}}
📱 UPI: {{upi_id}}

Please make the payment at your earliest convenience to ensure smooth event execution.

For any queries, please contact:
{{contact_name}}
📞 {{contact_number}}
📧 {{contact_email}}

Thank you for your business!`,
      variables: ['client_name', 'event_name', 'amount_due', 'payment_due_date', 'invoice_number', 'event_date', 'venue_name', 'bank_details', 'payment_link', 'upi_id', 'contact_name', 'contact_number', 'contact_email'],
      language: 'english'
    });

    // SMS Templates
    this.addTemplate({
      id: 'task_reminder_sms',
      type: 'sms',
      body: 'Reminder: Task "{{task_name}}" for {{event_name}} is due on {{due_date}}. Please update status. - {{manager_name}}',
      variables: ['task_name', 'event_name', 'due_date', 'manager_name'],
      language: 'english'
    });

    this.addTemplate({
      id: 'event_confirmation_sms',
      type: 'sms',
      body: 'Event Confirmed! {{event_name}} on {{event_date}} at {{venue_name}}. Time: {{event_time}}. Contact: {{contact_number}} - {{company_name}}',
      variables: ['event_name', 'event_date', 'venue_name', 'event_time', 'contact_number', 'company_name'],
      language: 'english'
    });

    // WhatsApp Templates
    this.addTemplate({
      id: 'status_update_whatsapp',
      type: 'whatsapp',
      body: `🎉 *{{event_name}} Update*

📋 Module: {{module_name}}
✅ Status: {{status}}
📊 Progress: {{progress_percentage}}%

{{status_message}}

Next Steps: {{next_steps}}

📞 Contact: {{manager_name}} - {{contact_number}}`,
      variables: ['event_name', 'module_name', 'status', 'progress_percentage', 'status_message', 'next_steps', 'manager_name', 'contact_number'],
      language: 'english'
    });
  }

  addTemplate(template) {
    this.templates.set(template.id, template);
  }

  getTemplate(templateId) {
    return this.templates.get(templateId);
  }

  // Process template with variables
  processTemplate(templateId, variables) {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    let processedSubject = template.subject || '';
    let processedBody = template.body;

    // Replace variables in subject and body
    template.variables.forEach(variable => {
      const value = variables[variable] || `{{${variable}}}`;
      const regex = new RegExp(`{{${variable}}}`, 'g');
      processedSubject = processedSubject.replace(regex, value);
      processedBody = processedBody.replace(regex, value);
    });

    return {
      type: template.type,
      subject: processedSubject,
      body: processedBody,
      language: template.language
    };
  }

  // Queue notification for sending
  queueNotification(notification) {
    const queuedNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...notification,
      status: 'queued',
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: 3
    };

    this.notificationQueue.push(queuedNotification);
    this.deliveryStatus.set(queuedNotification.id, queuedNotification);
    
    return queuedNotification.id;
  }

  // Send email notification
  async sendEmail(emailData) {
    const notificationId = this.queueNotification({
      type: 'email',
      to: emailData.to,
      subject: emailData.subject,
      body: emailData.body,
      attachments: emailData.attachments || [],
      priority: emailData.priority || 'normal',
      scheduledAt: emailData.scheduledAt || new Date()
    });

    try {
      await this.processEmailQueue();
      return notificationId;
    } catch (error) {
      console.error('Email sending failed:', error);
      this.updateDeliveryStatus(notificationId, 'failed', error.message);
      throw error;
    }
  }

  // Send SMS notification
  async sendSMS(smsData) {
    const notificationId = this.queueNotification({
      type: 'sms',
      to: smsData.to,
      body: smsData.body,
      priority: smsData.priority || 'normal',
      scheduledAt: smsData.scheduledAt || new Date()
    });

    try {
      await this.processSMSQueue();
      return notificationId;
    } catch (error) {
      console.error('SMS sending failed:', error);
      this.updateDeliveryStatus(notificationId, 'failed', error.message);
      throw error;
    }
  }

  // Send WhatsApp notification
  async sendWhatsApp(whatsappData) {
    const notificationId = this.queueNotification({
      type: 'whatsapp',
      to: whatsappData.to,
      body: whatsappData.body,
      mediaUrl: whatsappData.mediaUrl,
      priority: whatsappData.priority || 'normal',
      scheduledAt: whatsappData.scheduledAt || new Date()
    });

    try {
      await this.processWhatsAppQueue();
      return notificationId;
    } catch (error) {
      console.error('WhatsApp sending failed:', error);
      this.updateDeliveryStatus(notificationId, 'failed', error.message);
      throw error;
    }
  }

  // Send notification using template
  async sendTemplatedNotification(templateId, recipients, variables, options = {}) {
    const template = this.processTemplate(templateId, variables);
    const notificationIds = [];

    for (const recipient of recipients) {
      let notificationId;
      
      switch (template.type) {
        case 'email':
          notificationId = await this.sendEmail({
            to: recipient.email,
            subject: template.subject,
            body: template.body,
            priority: options.priority,
            scheduledAt: options.scheduledAt
          });
          break;
          
        case 'sms':
          notificationId = await this.sendSMS({
            to: recipient.phone,
            body: template.body,
            priority: options.priority,
            scheduledAt: options.scheduledAt
          });
          break;
          
        case 'whatsapp':
          notificationId = await this.sendWhatsApp({
            to: recipient.whatsapp || recipient.phone,
            body: template.body,
            priority: options.priority,
            scheduledAt: options.scheduledAt
          });
          break;
          
        default:
          throw new Error(`Unsupported notification type: ${template.type}`);
      }
      
      notificationIds.push(notificationId);
    }

    return notificationIds;
  }

  // Process email queue (mock implementation)
  async processEmailQueue() {
    const emailNotifications = this.notificationQueue.filter(
      n => n.type === 'email' && n.status === 'queued'
    );

    for (const notification of emailNotifications) {
      try {
        // Mock email sending
        await this.mockEmailSend(notification);
        this.updateDeliveryStatus(notification.id, 'sent');
      } catch (error) {
        notification.attempts++;
        if (notification.attempts >= notification.maxAttempts) {
          this.updateDeliveryStatus(notification.id, 'failed', error.message);
        } else {
          this.updateDeliveryStatus(notification.id, 'retry');
        }
      }
    }
  }

  // Process SMS queue (mock implementation)
  async processSMSQueue() {
    const smsNotifications = this.notificationQueue.filter(
      n => n.type === 'sms' && n.status === 'queued'
    );

    for (const notification of smsNotifications) {
      try {
        // Mock SMS sending
        await this.mockSMSSend(notification);
        this.updateDeliveryStatus(notification.id, 'sent');
      } catch (error) {
        notification.attempts++;
        if (notification.attempts >= notification.maxAttempts) {
          this.updateDeliveryStatus(notification.id, 'failed', error.message);
        } else {
          this.updateDeliveryStatus(notification.id, 'retry');
        }
      }
    }
  }

  // Process WhatsApp queue (mock implementation)
  async processWhatsAppQueue() {
    const whatsappNotifications = this.notificationQueue.filter(
      n => n.type === 'whatsapp' && n.status === 'queued'
    );

    for (const notification of whatsappNotifications) {
      try {
        // Mock WhatsApp sending
        await this.mockWhatsAppSend(notification);
        this.updateDeliveryStatus(notification.id, 'sent');
      } catch (error) {
        notification.attempts++;
        if (notification.attempts >= notification.maxAttempts) {
          this.updateDeliveryStatus(notification.id, 'failed', error.message);
        } else {
          this.updateDeliveryStatus(notification.id, 'retry');
        }
      }
    }
  }

  // Mock implementations (replace with actual API calls)
  async mockEmailSend(notification) {
    console.log(`📧 Sending email to: ${notification.to}`);
    console.log(`Subject: ${notification.subject}`);
    console.log(`Body: ${notification.body.substring(0, 100)}...`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate occasional failures
    if (Math.random() < 0.1) {
      throw new Error('Email delivery failed');
    }
  }

  async mockSMSSend(notification) {
    console.log(`📱 Sending SMS to: ${notification.to}`);
    console.log(`Message: ${notification.body}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulate occasional failures
    if (Math.random() < 0.05) {
      throw new Error('SMS delivery failed');
    }
  }

  async mockWhatsAppSend(notification) {
    console.log(`💬 Sending WhatsApp to: ${notification.to}`);
    console.log(`Message: ${notification.body}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simulate occasional failures
    if (Math.random() < 0.08) {
      throw new Error('WhatsApp delivery failed');
    }
  }

  updateDeliveryStatus(notificationId, status, errorMessage = null) {
    const notification = this.deliveryStatus.get(notificationId);
    if (notification) {
      notification.status = status;
      notification.updatedAt = new Date();
      if (errorMessage) {
        notification.errorMessage = errorMessage;
      }
    }
  }

  // Get delivery status
  getDeliveryStatus(notificationId) {
    return this.deliveryStatus.get(notificationId);
  }

  // Get notification statistics
  getNotificationStats(timeRange = '24h') {
    const now = new Date();
    const cutoff = new Date(now.getTime() - this.parseTimeRange(timeRange));
    
    const recentNotifications = Array.from(this.deliveryStatus.values())
      .filter(n => n.createdAt >= cutoff);

    const stats = {
      total: recentNotifications.length,
      sent: recentNotifications.filter(n => n.status === 'sent').length,
      failed: recentNotifications.filter(n => n.status === 'failed').length,
      queued: recentNotifications.filter(n => n.status === 'queued').length,
      retry: recentNotifications.filter(n => n.status === 'retry').length
    };

    stats.successRate = stats.total > 0 ? (stats.sent / stats.total * 100).toFixed(2) : 0;
    
    return stats;
  }

  parseTimeRange(timeRange) {
    const units = {
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000
    };
    
    const match = timeRange.match(/(\d+)([hdw])/);
    if (match) {
      const [, amount, unit] = match;
      return parseInt(amount) * units[unit];
    }
    
    return 24 * 60 * 60 * 1000; // Default to 24 hours
  }

  // Bulk notification sending
  async sendBulkNotifications(templateId, recipientList, variables, options = {}) {
    const batchSize = options.batchSize || 50;
    const delay = options.delayBetweenBatches || 1000;
    const results = [];

    for (let i = 0; i < recipientList.length; i += batchSize) {
      const batch = recipientList.slice(i, i + batchSize);
      
      try {
        const batchResults = await this.sendTemplatedNotification(
          templateId, 
          batch, 
          variables, 
          options
        );
        results.push(...batchResults);
        
        // Delay between batches to avoid rate limiting
        if (i + batchSize < recipientList.length) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, error);
      }
    }

    return results;
  }
}

// Example usage
const notificationManager = new NotificationManager({
  emailProvider: 'sendgrid',
  smsProvider: 'twilio',
  whatsappProvider: 'twilio',
  apiKeys: {
    sendgrid: 'your-sendgrid-api-key',
    twilio: 'your-twilio-api-key'
  }
});

// Send wedding invitation
const weddingInvitation = async () => {
  const recipients = [
    { email: 'guest1@example.com', phone: '+919876543210' },
    { email: 'guest2@example.com', phone: '+919876543211' }
  ];

  const variables = {
    guest_name: 'Mr. & Mrs. Sharma',
    bride_name: 'Priya',
    groom_name: 'Rajesh',
    wedding_date: 'February 15, 2024',
    wedding_time: '10:00 AM',
    venue_name: 'Grand Palace',
    venue_address: 'Banjara Hills, Hyderabad',
    dress_code: 'Traditional Indian',
    meal_type: 'Lunch',
    rsvp_date: 'February 10, 2024',
    family_name: 'Sharma & Gupta Families',
    contact_number: '+919876543200',
    contact_email: 'wedding@example.com'
  };

  try {
    const notificationIds = await notificationManager.sendTemplatedNotification(
      'wedding_invitation',
      recipients,
      variables,
      { priority: 'high' }
    );
    
    console.log('Wedding invitations sent:', notificationIds);
  } catch (error) {
    console.error('Failed to send invitations:', error);
  }
};

// Send task assignment
const taskAssignment = async () => {
  const vendor = { email: 'decorator@example.com', phone: '+919876543220' };
  
  const variables = {
    vendor_name: 'Floral Decorators Ltd',
    event_name: 'Rajesh & Priya Wedding',
    task_name: 'Stage Decoration Setup',
    task_description: 'Design and setup main stage with traditional South Indian wedding decorations',
    due_date: 'February 14, 2024 6:00 PM',
    estimated_hours: '6',
    venue_name: 'Grand Palace, Banjara Hills',
    priority: 'High',
    materials_list: '• Marigold flowers (50kg)\n• Silk fabric (20 meters)\n• LED string lights (10 sets)',
    manager_name: 'Suresh Kumar',
    manager_contact: '+919876543200',
    system_url: 'https://celebrationpro.com/login'
  };

  try {
    const notificationIds = await notificationManager.sendTemplatedNotification(
      'task_assignment',
      [vendor],
      variables
    );
    
    console.log('Task assignment sent:', notificationIds);
  } catch (error) {
    console.error('Failed to send task assignment:', error);
  }
};

module.exports = { NotificationManager, notificationManager, weddingInvitation, taskAssignment };