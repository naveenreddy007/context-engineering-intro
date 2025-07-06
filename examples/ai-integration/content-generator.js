// AI-Assisted Content Generator for Event Management
// Demonstrates structured prompt engineering and JSON schema validation

class AIContentGenerator {
  constructor(apiKey, model = 'gpt-4') {
    this.apiKey = apiKey;
    this.model = model;
    this.schemas = this.initializeSchemas();
  }

  initializeSchemas() {
    return {
      taskGeneration: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', maxLength: 100 },
                description: { type: 'string', maxLength: 500 },
                category: { 
                  type: 'string', 
                  enum: ['food', 'decoration', 'lighting', 'venue', 'transportation', 'photography', 'communications', 'gifts', 'security', 'entertainment']
                },
                priority: { 
                  type: 'string', 
                  enum: ['low', 'medium', 'high', 'critical']
                },
                estimatedHours: { type: 'number', minimum: 0.5, maximum: 24 },
                requiredSkills: {
                  type: 'array',
                  items: { type: 'string' }
                },
                dependencies: {
                  type: 'array',
                  items: { type: 'string' }
                },
                materials: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      item: { type: 'string' },
                      quantity: { type: 'number' },
                      unit: { type: 'string' }
                    }
                  }
                }
              },
              required: ['name', 'category', 'priority', 'estimatedHours']
            }
          }
        },
        required: ['tasks']
      },

      menuGeneration: {
        type: 'object',
        properties: {
          menu: {
            type: 'object',
            properties: {
              appetizers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    cuisine: { type: 'string' },
                    dietary: {
                      type: 'array',
                      items: { 
                        type: 'string',
                        enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'non-vegetarian']
                      }
                    },
                    spiceLevel: {
                      type: 'string',
                      enum: ['mild', 'medium', 'spicy', 'very-spicy']
                    },
                    servingSize: { type: 'string' },
                    estimatedCost: { type: 'number' }
                  },
                  required: ['name', 'cuisine', 'dietary']
                }
              },
              mainCourse: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    cuisine: { type: 'string' },
                    dietary: {
                      type: 'array',
                      items: { 
                        type: 'string',
                        enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'non-vegetarian']
                      }
                    },
                    spiceLevel: {
                      type: 'string',
                      enum: ['mild', 'medium', 'spicy', 'very-spicy']
                    },
                    servingSize: { type: 'string' },
                    estimatedCost: { type: 'number' }
                  },
                  required: ['name', 'cuisine', 'dietary']
                }
              },
              desserts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    cuisine: { type: 'string' },
                    dietary: {
                      type: 'array',
                      items: { 
                        type: 'string',
                        enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free']
                      }
                    },
                    sweetness: {
                      type: 'string',
                      enum: ['light', 'medium', 'sweet', 'very-sweet']
                    },
                    servingSize: { type: 'string' },
                    estimatedCost: { type: 'number' }
                  },
                  required: ['name', 'cuisine', 'dietary']
                }
              }
            },
            required: ['appetizers', 'mainCourse', 'desserts']
          },
          totalEstimatedCost: { type: 'number' },
          servingCapacity: { type: 'number' },
          preparationTime: { type: 'string' }
        },
        required: ['menu', 'totalEstimatedCost', 'servingCapacity']
      },

      emailTemplate: {
        type: 'object',
        properties: {
          subject: { type: 'string', maxLength: 100 },
          body: { type: 'string', maxLength: 2000 },
          variables: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                required: { type: 'boolean' },
                defaultValue: { type: 'string' }
              },
              required: ['name', 'description', 'required']
            }
          },
          templateType: {
            type: 'string',
            enum: ['invitation', 'confirmation', 'reminder', 'update', 'thank-you', 'invoice']
          },
          language: {
            type: 'string',
            enum: ['english', 'hindi', 'telugu']
          }
        },
        required: ['subject', 'body', 'variables', 'templateType']
      }
    };
  }

  // Generate tasks for a specific event module
  async generateTasks(eventType, moduleCategory, requirements) {
    const prompt = this.buildTaskGenerationPrompt(eventType, moduleCategory, requirements);
    
    try {
      const response = await this.callAI(prompt, this.schemas.taskGeneration);
      return this.validateAndCleanResponse(response, 'taskGeneration');
    } catch (error) {
      console.error('Task generation failed:', error);
      return this.getFallbackTasks(moduleCategory);
    }
  }

  buildTaskGenerationPrompt(eventType, moduleCategory, requirements) {
    return `Generate detailed tasks for a ${eventType} event in the ${moduleCategory} category.

Event Requirements:
- Guest Count: ${requirements.guestCount || 'Not specified'}
- Budget Range: ${requirements.budget || 'Not specified'}
- Venue Type: ${requirements.venueType || 'Not specified'}
- Special Requirements: ${requirements.special || 'None'}
- Region: ${requirements.region || 'Andhra Pradesh/Hyderabad'}

Context for Indian Events:
- Consider traditional customs and practices
- Include regional preferences for ${requirements.region}
- Account for seasonal considerations
- Factor in vendor availability and logistics

For ${moduleCategory} category, generate 5-8 specific, actionable tasks that include:
1. Clear task names and descriptions
2. Realistic time estimates
3. Required skills and materials
4. Task dependencies
5. Priority levels

Return ONLY valid JSON matching the required schema. No additional text or explanations.

JSON Schema Requirements:
- Each task must have: name, category, priority, estimatedHours
- Priority levels: low, medium, high, critical
- Categories: food, decoration, lighting, venue, transportation, photography, communications, gifts, security, entertainment
- EstimatedHours: 0.5 to 24 hours
- Include materials array with item, quantity, unit
- Include dependencies array with task names
- Include requiredSkills array`;
  }

  // Generate menu for Indian events
  async generateMenu(eventType, preferences) {
    const prompt = this.buildMenuGenerationPrompt(eventType, preferences);
    
    try {
      const response = await this.callAI(prompt, this.schemas.menuGeneration);
      return this.validateAndCleanResponse(response, 'menuGeneration');
    } catch (error) {
      console.error('Menu generation failed:', error);
      return this.getFallbackMenu(eventType);
    }
  }

  buildMenuGenerationPrompt(eventType, preferences) {
    return `Generate a comprehensive Indian menu for a ${eventType} event.

Preferences:
- Guest Count: ${preferences.guestCount || 500}
- Dietary Restrictions: ${preferences.dietary?.join(', ') || 'Mixed (Veg & Non-Veg)'}
- Regional Cuisine: ${preferences.region || 'South Indian/Andhra Pradesh'}
- Budget per Person: ${preferences.budgetPerPerson || 'Rs. 300-500'}
- Meal Type: ${preferences.mealType || 'Lunch Buffet'}
- Special Occasions: ${preferences.occasion || 'Traditional ceremony'}

Menu Requirements:
- Include traditional ${preferences.region} dishes
- Balance of flavors and spice levels
- Accommodate dietary preferences
- Consider preparation time and logistics
- Include cost estimates in INR

Generate menu with:
1. Appetizers (3-5 items)
2. Main Course (6-8 items)
3. Desserts (3-4 items)

For each item include:
- Authentic name and description
- Cuisine type and dietary classification
- Spice level indication
- Serving size and estimated cost

Return ONLY valid JSON matching the required schema. No additional text.

Consider popular dishes like:
- Appetizers: Samosas, Pakoras, Kebabs, Paneer Tikka
- Main: Biryani, Dal varieties, Sabzi, Raita, Rotis
- Desserts: Gulab Jamun, Rasmalai, Payasam, Halwa`;
  }

  // Generate email templates
  async generateEmailTemplate(templateType, eventContext) {
    const prompt = this.buildEmailTemplatePrompt(templateType, eventContext);
    
    try {
      const response = await this.callAI(prompt, this.schemas.emailTemplate);
      return this.validateAndCleanResponse(response, 'emailTemplate');
    } catch (error) {
      console.error('Email template generation failed:', error);
      return this.getFallbackEmailTemplate(templateType);
    }
  }

  buildEmailTemplatePrompt(templateType, eventContext) {
    return `Generate a professional email template for ${templateType} in the context of Indian event management.

Event Context:
- Event Type: ${eventContext.eventType || 'Wedding'}
- Language: ${eventContext.language || 'English'}
- Tone: ${eventContext.tone || 'Professional and warm'}
- Region: ${eventContext.region || 'Andhra Pradesh'}

Template Requirements:
- Professional yet warm tone appropriate for Indian culture
- Include placeholder variables for personalization
- Respect cultural sensitivities
- Include relevant event details
- Clear call-to-action where appropriate

For ${templateType} template:
${this.getTemplateGuidelines(templateType)}

Return ONLY valid JSON with:
- subject: Email subject line
- body: Email body with {{variable}} placeholders
- variables: Array of variable definitions
- templateType: ${templateType}
- language: ${eventContext.language || 'english'}

No additional text or explanations.`;
  }

  getTemplateGuidelines(templateType) {
    const guidelines = {
      invitation: 'Include event details, venue, timing, dress code, RSVP instructions',
      confirmation: 'Confirm booking details, next steps, contact information',
      reminder: 'Gentle reminder with key details, preparation instructions',
      update: 'Clear information about changes, reasons, new details',
      'thank-you': 'Express gratitude, highlight memorable moments, future engagement',
      invoice: 'Professional billing details, payment terms, contact for queries'
    };
    return guidelines[templateType] || 'Standard professional communication';
  }

  // Mock AI API call (replace with actual OpenAI/Claude API)
  async callAI(prompt, schema) {
    // This would be replaced with actual API call
    // For demo purposes, returning mock responses
    
    if (prompt.includes('task')) {
      return this.getMockTaskResponse();
    } else if (prompt.includes('menu')) {
      return this.getMockMenuResponse();
    } else if (prompt.includes('email')) {
      return this.getMockEmailResponse();
    }
    
    throw new Error('Unsupported prompt type');
  }

  getMockTaskResponse() {
    return {
      tasks: [
        {
          name: 'Stage Decoration Setup',
          description: 'Design and setup main stage with traditional South Indian wedding decorations',
          category: 'decoration',
          priority: 'high',
          estimatedHours: 6,
          requiredSkills: ['floral arrangement', 'fabric draping', 'lighting coordination'],
          dependencies: ['venue_booking_confirmation'],
          materials: [
            { item: 'marigold flowers', quantity: 50, unit: 'kg' },
            { item: 'silk fabric', quantity: 20, unit: 'meters' },
            { item: 'LED string lights', quantity: 10, unit: 'sets' }
          ]
        },
        {
          name: 'Mandap Construction',
          description: 'Build traditional wedding mandap with pillars and canopy',
          category: 'decoration',
          priority: 'critical',
          estimatedHours: 8,
          requiredSkills: ['carpentry', 'traditional design', 'structural setup'],
          dependencies: ['venue_preparation'],
          materials: [
            { item: 'wooden pillars', quantity: 4, unit: 'pieces' },
            { item: 'decorative cloth', quantity: 15, unit: 'meters' },
            { item: 'coconut leaves', quantity: 100, unit: 'pieces' }
          ]
        }
      ]
    };
  }

  getMockMenuResponse() {
    return {
      menu: {
        appetizers: [
          {
            name: 'Vegetable Samosas',
            description: 'Crispy pastry filled with spiced potatoes and peas',
            cuisine: 'North Indian',
            dietary: ['vegetarian'],
            spiceLevel: 'medium',
            servingSize: '2 pieces per person',
            estimatedCost: 25
          },
          {
            name: 'Chicken 65',
            description: 'Spicy fried chicken appetizer with curry leaves',
            cuisine: 'South Indian',
            dietary: ['non-vegetarian'],
            spiceLevel: 'spicy',
            servingSize: '100g per person',
            estimatedCost: 45
          }
        ],
        mainCourse: [
          {
            name: 'Hyderabadi Biryani',
            description: 'Fragrant basmati rice with marinated mutton and saffron',
            cuisine: 'Hyderabadi',
            dietary: ['non-vegetarian'],
            spiceLevel: 'medium',
            servingSize: '250g per person',
            estimatedCost: 120
          },
          {
            name: 'Dal Tadka',
            description: 'Yellow lentils tempered with cumin and garlic',
            cuisine: 'North Indian',
            dietary: ['vegetarian', 'vegan'],
            spiceLevel: 'mild',
            servingSize: '150ml per person',
            estimatedCost: 30
          }
        ],
        desserts: [
          {
            name: 'Gulab Jamun',
            description: 'Soft milk dumplings in rose-flavored sugar syrup',
            cuisine: 'North Indian',
            dietary: ['vegetarian'],
            sweetness: 'very-sweet',
            servingSize: '2 pieces per person',
            estimatedCost: 35
          }
        ]
      },
      totalEstimatedCost: 255,
      servingCapacity: 500,
      preparationTime: '4-5 hours'
    };
  }

  getMockEmailResponse() {
    return {
      subject: 'Wedding Invitation - {{bride_name}} & {{groom_name}}',
      body: `Dear {{guest_name}},\n\nWe are delighted to invite you to the wedding ceremony of {{bride_name}} and {{groom_name}}.\n\nEvent Details:\nDate: {{wedding_date}}\nTime: {{wedding_time}}\nVenue: {{venue_name}}, {{venue_address}}\n\nYour presence would make our special day even more memorable.\n\nPlease confirm your attendance by {{rsvp_date}}.\n\nWith warm regards,\n{{family_name}}\n\nContact: {{contact_number}}`,
      variables: [
        { name: 'guest_name', description: 'Name of the invited guest', required: true },
        { name: 'bride_name', description: 'Name of the bride', required: true },
        { name: 'groom_name', description: 'Name of the groom', required: true },
        { name: 'wedding_date', description: 'Date of the wedding', required: true },
        { name: 'wedding_time', description: 'Time of the ceremony', required: true },
        { name: 'venue_name', description: 'Name of the venue', required: true },
        { name: 'venue_address', description: 'Full address of the venue', required: true },
        { name: 'rsvp_date', description: 'RSVP deadline date', required: true },
        { name: 'family_name', description: 'Name of the hosting family', required: true },
        { name: 'contact_number', description: 'Contact number for queries', required: true }
      ],
      templateType: 'invitation',
      language: 'english'
    };
  }

  validateAndCleanResponse(response, schemaType) {
    // In a real implementation, use a JSON schema validator like Ajv
    // For now, basic validation
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response format');
    }
    return response;
  }

  getFallbackTasks(category) {
    const fallbacks = {
      decoration: [
        { name: 'Basic decoration setup', category: 'decoration', priority: 'medium', estimatedHours: 4 }
      ],
      food: [
        { name: 'Menu planning', category: 'food', priority: 'high', estimatedHours: 2 }
      ]
    };
    return { tasks: fallbacks[category] || [] };
  }

  getFallbackMenu(eventType) {
    return {
      menu: {
        appetizers: [{ name: 'Mixed appetizers', cuisine: 'Indian', dietary: ['vegetarian'] }],
        mainCourse: [{ name: 'Traditional thali', cuisine: 'South Indian', dietary: ['vegetarian'] }],
        desserts: [{ name: 'Sweet selection', cuisine: 'Indian', dietary: ['vegetarian'] }]
      },
      totalEstimatedCost: 200,
      servingCapacity: 100
    };
  }

  getFallbackEmailTemplate(templateType) {
    return {
      subject: `${templateType} - {{event_name}}`,
      body: 'Standard template for {{event_name}}',
      variables: [{ name: 'event_name', description: 'Name of the event', required: true }],
      templateType,
      language: 'english'
    };
  }
}

// Example usage
const aiGenerator = new AIContentGenerator('your-api-key');

// Generate tasks for wedding decoration
const decorationTasks = aiGenerator.generateTasks('wedding', 'decoration', {
  guestCount: 500,
  budget: 'Rs. 50,000',
  venueType: 'marriage_hall',
  region: 'Hyderabad',
  special: 'Traditional South Indian style'
});

// Generate menu for birthday party
const birthdayMenu = aiGenerator.generateMenu('birthday', {
  guestCount: 50,
  dietary: ['vegetarian'],
  region: 'Andhra Pradesh',
  budgetPerPerson: 'Rs. 200',
  mealType: 'Evening snacks'
});

// Generate invitation email template
const invitationTemplate = aiGenerator.generateEmailTemplate('invitation', {
  eventType: 'Wedding',
  language: 'english',
  tone: 'formal',
  region: 'Hyderabad'
});

module.exports = { AIContentGenerator, aiGenerator };